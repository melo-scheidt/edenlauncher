// electron/services/friends.js
// Sistema de Amigos do Éden Launcher — amizades, bloqueios e mensagens
// diretas sobre o Supabase (PostgreSQL + RLS + Realtime). As regras de
// bloqueio são aplicadas também no banco (políticas RLS), então nenhum
// cliente consegue burlar pelo cliente.

const log = require('electron-log');
const sbClient = require('./supabaseClient');
const auth = require('./auth');

function coded(code, detail) {
  const e = new Error(code);
  e.code = code;
  if (detail) e.detail = detail;
  return e;
}

// ── Sessão / realtime ─────────────────────────────────────────────────────────

let emitter = null;
let channels = [];
let authedToken = null;
let lastProfileUpsert = '';

function setEmitter(fn) {
  emitter = fn;
}

function emit(evt) {
  try {
    if (emitter) emitter(evt);
  } catch (e) {
    log.warn('[friends] emit falhou:', e.message);
  }
}

async function nickFor(sb, userId) {
  try {
    const { data } = await sb.from('profiles').select('nickname').eq('id', userId).maybeSingle();
    return data?.nickname || null;
  } catch {
    return null;
  }
}

function ensureRealtime(sb, me) {
  if (channels.length) return;

  const ch = sb
    .channel('eden-friends')
    .on('postgres_changes', { event: '*', schema: 'public', table: 'friends_friendships' }, async (payload) => {
      const row = payload.new || payload.old || {};
      if (row.requester_id !== me && row.addressee_id !== me) return;
      emit({ type: 'friends-changed' });
      if (payload.eventType === 'INSERT' && row.requester_id !== me) {
        const nick = await nickFor(sb, row.requester_id);
        emit({ type: 'friend-request', userId: row.requester_id, nick });
      }
      if (payload.eventType === 'UPDATE' && row.status === 'accepted') {
        const other = row.requester_id === me ? row.addressee_id : row.requester_id;
        const nick = await nickFor(sb, other);
        emit({ type: 'friend-accepted', userId: other, nick, byMe: row.addressee_id === me });
      }
    })
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'friends_messages' }, async (payload) => {
      const m = payload.new;
      if (!m) return;
      if (m.sender_id !== me && m.recipient_id !== me) return;
      emit({ type: 'friends-changed' });
      if (m.recipient_id === me && m.sender_id !== me) {
        const nick = await nickFor(sb, m.sender_id);
        emit({ type: 'message', message: m, fromNick: nick });
      }
    })
    .subscribe();

  const presence = sb.channel('eden-online', { config: { presence: { key: me } } });
  presence.on('presence', { event: 'sync' }, () => {
    try {
      emit({ type: 'presence', online: Object.keys(presence.presenceState()) });
    } catch (e) {
      log.warn('[friends] presence sync falhou:', e.message);
    }
  });
  presence.subscribe(async (status) => {
    if (status === 'SUBSCRIBED') {
      try {
        await presence.track({ online_at: new Date().toISOString() });
      } catch (e) {
        log.warn('[friends] presence track falhou:', e.message);
      }
    }
  });

  channels.push(ch, presence);
}

async function reset() {
  for (const ch of channels) {
    try {
      await ch.unsubscribe();
    } catch {}
  }
  channels = [];
  authedToken = null;
  lastProfileUpsert = '';
}

async function currentUser(sb) {
  try {
    const r = await sb.auth.getUser();
    return r?.user || null;
  } catch {
    return null;
  }
}

async function ensureAuthed() {
  const sb = sbClient.getClient();
  if (!sb) throw coded('FRIENDS_OFFLINE');
  let session = auth.loadSession();
  if (!session?.accessToken) throw coded('FRIENDS_NO_SESSION');

  if (authedToken !== session.accessToken) {
    await reset();
    try {
      await sb.auth.setSession({
        access_token: session.accessToken,
      });
    } catch (e) {
      throw coded('FRIENDS_TOKEN');
    }
    authedToken = session.accessToken;
  }

  let user = await currentUser(sb);
  if (!user) {
    authedToken = null;
    throw coded('FRIENDS_TOKEN');
  }

  // garante meu perfil público (para outros me acharem pelo nick)
  const myNick = session.nickname;
  if (myNick && lastProfileUpsert !== `${user.id}:${myNick}`) {
    try {
      await sb.from('profiles').upsert({ id: user.id, nickname: myNick }, { onConflict: 'id' });
      lastProfileUpsert = `${user.id}:${myNick}`;
    } catch (e) {
      log.warn('[friends] upsert de perfil falhou:', e.message);
    }
  }

  ensureRealtime(sb, user.id);
  return { sb, me: user.id };
}

function status() {
  return {
    available: sbClient.isConfigured(),
    loggedIn: Boolean(auth.loadSession()?.accessToken),
  };
}

// ── Consultas ─────────────────────────────────────────────────────────────────

function pairOr(a, b) {
  return `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`;
}

async function getPair(sb, me, otherId) {
  const { data, error } = await sb
    .from('friends_friendships')
    .select('*')
    .or(pairOr(me, otherId))
    .maybeSingle();
  if (error && error.code !== 'PGRST116') throw new Error(error.message);
  return data || null;
}

async function resolveNick(nick) {
  const { sb, me } = await ensureAuthed();
  const clean = String(nick || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(clean)) throw coded('FRIENDS_NICK_INVALID');
  const { data, error } = await sb
    .from('profiles')
    .select('id,nickname')
    .eq('nickname_lower', clean.toLowerCase())
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw coded('FRIENDS_NICK_NOT_FOUND');
  if (data.id === me) throw coded('FRIENDS_SELF');
  return { userId: data.id, nick: data.nickname };
}

async function list() {
  const { sb, me } = await ensureAuthed();
  const { data: rows, error } = await sb
    .from('friends_friendships')
    .select('id,requester_id,addressee_id,status,created_at,updated_at')
    .or(`requester_id.eq.${me},addressee_id.eq.${me}`)
    .order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);

  const otherIds = [
    ...new Set(
      (rows || []).flatMap((r) => [r.requester_id, r.addressee_id]).filter((id) => id !== me)
    ),
  ];
  const nicks = {};
  if (otherIds.length) {
    const { data: profs } = await sb.from('profiles').select('id,nickname').in('id', otherIds);
    (profs || []).forEach((p) => {
      nicks[p.id] = p.nickname;
    });
  }

  const norm = (r) => {
    const out = r.requester_id === me;
    const otherId = out ? r.addressee_id : r.requester_id;
    return {
      id: r.id,
      userId: otherId,
      nick: nicks[otherId] || '?',
      direction: out ? 'out' : 'in',
      status: r.status,
      updatedAt: r.updated_at,
    };
  };

  const friends = [];
  const pendingIn = [];
  const pendingOut = [];
  const blocked = [];
  const blockedMeIds = [];
  for (const r of rows || []) {
    const n = norm(r);
    if (r.status === 'accepted') friends.push(n);
    else if (r.status === 'pending') (n.direction === 'in' ? pendingIn : pendingOut).push(n);
    else if (r.status === 'blocked') {
      if (r.requester_id === me) blocked.push(n);
      else blockedMeIds.push(n.userId);
    }
  }

  const { data: unreadRows } = await sb
    .from('friends_messages')
    .select('sender_id')
    .eq('recipient_id', me)
    .is('read_at', null);
  const unread = {};
  (unreadRows || []).forEach((m) => {
    unread[m.sender_id] = (unread[m.sender_id] || 0) + 1;
  });

  return { me, friends, pendingIn, pendingOut, blocked, blockedMeIds, unread };
}

// ── Ações de amizade ──────────────────────────────────────────────────────────

async function request(nick) {
  const { sb, me } = await ensureAuthed();
  const { userId } = await resolveNick(nick);

  const existing = await getPair(sb, me, userId);
  if (existing) {
    if (existing.status === 'accepted') throw coded('FRIENDS_ALREADY');
    if (existing.status === 'pending') {
      throw coded(existing.requester_id === me ? 'FRIENDS_PENDING_OUT' : 'FRIENDS_PENDING_IN');
    }
    if (existing.status === 'blocked') {
      throw coded(existing.requester_id === me ? 'FRIENDS_BLOCKED_BY_ME' : 'FRIENDS_BLOCKED_BY_THEM');
    }
  }

  const { data, error } = await sb
    .from('friends_friendships')
    .insert({ requester_id: me, addressee_id: userId, status: 'pending' })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') throw coded('FRIENDS_EXISTS');
    if (/row-level|policy|permission/i.test(error.message)) throw coded('FRIENDS_BLOCKED_BY_THEM');
    throw new Error(error.message);
  }
  emit({ type: 'friends-changed' });
  return { friendship: data };
}

async function respond(id, accept) {
  const { sb, me } = await ensureAuthed();
  const { data: row, error } = await sb
    .from('friends_friendships')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row || row.addressee_id !== me || row.status !== 'pending') throw coded('FRIENDS_NOT_PENDING');

  if (accept) {
    const { error: upErr } = await sb
      .from('friends_friendships')
      .update({ status: 'accepted', updated_at: new Date().toISOString() })
      .eq('id', id);
    if (upErr) throw new Error(upErr.message);
  } else {
    const { error: delErr } = await sb.from('friends_friendships').delete().eq('id', id);
    if (delErr) throw new Error(delErr.message);
  }
  emit({ type: 'friends-changed' });
  return { ok: true };
}

async function cancel(id) {
  const { sb, me } = await ensureAuthed();
  const { data: row, error } = await sb
    .from('friends_friendships')
    .select('*')
    .eq('id', id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!row || row.requester_id !== me || row.status !== 'pending') throw coded('FRIENDS_NOT_PENDING');
  const { error: delErr } = await sb.from('friends_friendships').delete().eq('id', id);
  if (delErr) throw new Error(delErr.message);
  emit({ type: 'friends-changed' });
  return { ok: true };
}

async function block(userId) {
  const { sb, me } = await ensureAuthed();
  if (userId === me) throw coded('FRIENDS_SELF');
  const { error: delErr } = await sb
    .from('friends_friendships')
    .delete()
    .or(`and(requester_id.eq.${me},addressee_id.eq.${userId}),and(requester_id.eq.${userId},addressee_id.eq.${me})`);
  if (delErr) throw new Error(delErr.message);
  const { error: insErr } = await sb
    .from('friends_friendships')
    .insert({ requester_id: me, addressee_id: userId, status: 'blocked' });
  if (insErr) throw new Error(insErr.message);
  emit({ type: 'friends-changed' });
  return { ok: true };
}

async function unblock(userId) {
  const { sb, me } = await ensureAuthed();
  const { error } = await sb
    .from('friends_friendships')
    .delete()
    .eq('requester_id', me)
    .eq('addressee_id', userId)
    .eq('status', 'blocked');
  if (error) throw new Error(error.message);
  emit({ type: 'friends-changed' });
  return { ok: true };
}

// ── Mensagens ─────────────────────────────────────────────────────────────────

async function send(userId, body) {
  const { sb, me } = await ensureAuthed();
  const text = String(body || '').trim().slice(0, 1000);
  if (!text) throw coded('FRIENDS_EMPTY');

  const pair = await getPair(sb, me, userId);
  if (pair?.status === 'blocked') {
    throw coded(
      pair.requester_id === me ? 'FRIENDS_BLOCKED_BY_ME_SEND' : 'FRIENDS_BLOCKED_BY_THEM'
    );
  }
  if (!pair || pair.status !== 'accepted') throw coded('FRIENDS_NOT_FRIENDS');

  const { data, error } = await sb
    .from('friends_messages')
    .insert({ sender_id: me, recipient_id: userId, body: text })
    .select()
    .single();
  if (error) {
    if (/row-level|policy|permission/i.test(error.message)) throw coded('FRIENDS_BLOCKED_SEND');
    throw new Error(error.message);
  }
  return { message: data };
}

async function messages(userId, limit = 100) {
  const { sb, me } = await ensureAuthed();
  const { data, error } = await sb
    .from('friends_messages')
    .select('id,sender_id,recipient_id,body,read_at,created_at')
    .or(
      `and(sender_id.eq.${me},recipient_id.eq.${userId}),` +
        `and(sender_id.eq.${userId},recipient_id.eq.${me})`
    )
    .order('created_at', { ascending: true })
    .limit(Math.min(Math.max(Number(limit) || 100, 1), 200));
  if (error) throw new Error(error.message);
  return { me, messages: data || [] };
}

async function markRead(userId) {
  const { sb, me } = await ensureAuthed();
  const { data, error } = await sb
    .from('friends_messages')
    .update({ read_at: new Date().toISOString() })
    .eq('sender_id', userId)
    .eq('recipient_id', me)
    .is('read_at', null)
    .select('id');
  if (error) throw new Error(error.message);
  return { ok: true, marked: (data || []).length };
}

module.exports = {
  setEmitter,
  reset,
  status,
  list,
  resolveNick,
  request,
  respond,
  cancel,
  block,
  unblock,
  send,
  messages,
  markRead,
};
