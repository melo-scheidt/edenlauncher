-- ============================================================
-- EDEN LAUNCHER — Apagar contas registradas no Supabase Auth
--
-- COMO USAR:
--   1. Abra o painel do Supabase > SQL Editor > New query
--   2. Cole TODO este script e clique em Run
--   3. Confira os contagens impressas antes e depois
--
-- O que ele faz:
--   - Mostra quantas contas existem (antes)
--   - Apaga TODAS as contas de auth.users
--   - profiles, friends_friendships e friends_messages são
--     limpos automaticamente (FKs com ON DELETE CASCADE)
--   - Mostra o resultado (depois)
--
-- ⚠️  PERMANENTE — não dá para desfazer. Se quiser apagar só
--     UMA conta, use a seção opcional no final (comentada).
-- ============================================================

begin;

-- ── Antes: quantas contas existem? ──────────────────────────
select 'ANTES' as etapa, count(*) as total_contas
from auth.users;

select email, created_at
from auth.users
order by created_at;

-- ── Apaga TODAS as contas ───────────────────────────────────
delete from auth.users;

-- ── Depois: confere (deve ser 0 em tudo) ────────────────────
select 'DEPOIS' as etapa,
       (select count(*) from auth.users)            as total_contas,
       (select count(*) from public.profiles)       as profiles,
       (select count(*) from public.friends_friendships) as amizades,
       (select count(*) from public.friends_messages)    as mensagens;

commit;

-- ============================================================
-- OPCIONAL — apagar apenas UMA conta por e-mail
-- (descomente e rode em vez do "delete from auth.users" acima)
--
-- delete from auth.users where email = 'exemplo@dominio.com';
-- ============================================================
