-- ============================================================
-- EDEN LAUNCHER — Sistema de Amigos e Mensagens (v1)
-- Banco: Supabase (PostgreSQL + Realtime + RLS)
--
-- COMO APLICAR (uma única vez):
--   1. Abra o painel do Supabase > SQL Editor > New query
--   2. Cole TODO este arquivo e clique em Run
--   3. Verifique a mensagem de sucesso no final
--
-- O que é criado:
--   - public.profiles ........................ nick <-> conta
--   - public.friends_friendships ............. pedidos, amizades e bloqueios
--   - public.friends_messages ................ mensagens diretas
--   - Políticas RLS (ninguém vê nada de ninguém; bloqueio é
--     aplicado no próprio banco — impossível burlar pelo cliente)
--   - Realtime ativado nas 3 tabelas (entrega instantânea)
-- ============================================================

-- ── 1. Perfis públicos (nick -> conta) ──────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nickname text not null,
  nickname_lower text generated always as (lower(nickname)) stored,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists profiles_nickname_lower_uidx
  on public.profiles (nickname_lower);

-- ── 2. Amizades / bloqueios ─────────────────────────────────
create table if not exists public.friends_friendships (
  id bigint generated always as identity primary key,
  requester_id uuid not null references auth.users(id) on delete cascade,
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'blocked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint no_self_friend check (requester_id <> addressee_id)
);

-- no máximo UMA linha por par (qualquer direção)
create unique index if not exists friendships_pair_uidx
  on public.friends_friendships
  (least(requester_id, addressee_id), greatest(requester_id, addressee_id));

-- ── 3. Mensagens diretas ────────────────────────────────────
create table if not exists public.friends_messages (
  id bigint generated always as identity primary key,
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 2000),
  read_at timestamptz,
  created_at timestamptz not null default now(),
  constraint no_self_message check (sender_id <> recipient_id)
);

create index if not exists messages_conversation_idx
  on public.friends_messages
  (least(sender_id, recipient_id), greatest(sender_id, recipient_id), created_at desc);

create index if not exists messages_unread_idx
  on public.friends_messages (recipient_id, created_at)
  where read_at is null;

-- ── 4. Função auxiliar (checa bloqueio, sem recursão de RLS) ─
create or replace function public.is_blocked(p_blocker uuid, p_blocked uuid)
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.friends_friendships
    where requester_id = p_blocker
      and addressee_id = p_blocked
      and status = 'blocked'
  );
$$;

grant execute on function public.is_blocked(uuid, uuid) to authenticated;

-- ── 5. RLS ──────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.friends_friendships enable row level security;
alter table public.friends_messages enable row level security;

-- profiles: qualquer autenticado lê (resolver nicks); cada um edita a própria
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select to authenticated using (true);

drop policy if exists "profiles_upsert" on public.profiles;
create policy "profiles_upsert" on public.profiles
  for insert to authenticated with check (id = auth.uid());

drop policy if exists "profiles_update" on public.profiles;
create policy "profiles_update" on public.profiles
  for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- friendships: só vejo linhas onde sou requester ou addressee
drop policy if exists "friendships_select" on public.friends_friendships;
create policy "friendships_select" on public.friends_friendships
  for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- criar pedido/bloqueio: só como requester; pedido só se não fui bloqueado
drop policy if exists "friendships_insert" on public.friends_friendships;
create policy "friendships_insert" on public.friends_friendships
  for insert to authenticated
  with check (
    requester_id = auth.uid()
    and status in ('pending', 'blocked')
    and (status <> 'pending' or not public.is_blocked(addressee_id, auth.uid()))
  );

-- atualizar (aceitar/recusar/cancelar): só quem participa
drop policy if exists "friendships_update" on public.friends_friendships;
create policy "friendships_update" on public.friends_friendships
  for update to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid())
  with check (requester_id = auth.uid() or addressee_id = auth.uid());

-- remover (cancelar/desfazer/bloquear/desbloquear): só quem participa
drop policy if exists "friendships_delete" on public.friends_friendships;
create policy "friendships_delete" on public.friends_friendships
  for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());

-- messages: só vejo as minhas (enviadas ou recebidas)
drop policy if exists "messages_select" on public.friends_messages;
create policy "messages_select" on public.friends_messages
  for select to authenticated
  using (sender_id = auth.uid() or recipient_id = auth.uid());

-- enviar: só como remetente E sem bloqueio em nenhum dos sentidos
-- (nem eu bloqueei ele, nem ele me bloqueou — aplicado no banco)
drop policy if exists "messages_insert" on public.friends_messages;
create policy "messages_insert" on public.friends_messages
  for insert to authenticated
  with check (
    sender_id = auth.uid()
    and not public.is_blocked(auth.uid(), recipient_id)
    and not public.is_blocked(recipient_id, auth.uid())
  );

-- marcar como lida: só o destinatário
drop policy if exists "messages_update" on public.friends_messages;
create policy "messages_update" on public.friends_messages
  for update to authenticated
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- ── 6. Realtime nas 3 tabelas (idempotente) ─────────────────
do $$
begin
  alter publication supabase_realtime add table public.profiles;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friends_friendships;
exception when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.friends_messages;
exception when duplicate_object then null;
end $$;

select 'friends_ok' as eden_friends_migration;
