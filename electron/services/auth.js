// electron/services/auth.js
// Autenticação do launcher Éden.
// - Central: Supabase (e-mail + senha) quando EDEN_SUPABASE_URL/ANON_KEY estão no .env.
// - Local:   contas offline por máquina (fallback, 100% offline).

const fs     = require('fs');
const crypto = require('crypto');
const paths  = require('./paths');
const { SUPABASE_URL, SUPABASE_ANON_KEY } = require('../config');

// ── Supabase (opcional) ───────────────────────────────────────────────────────
let supabase = null;
let supabaseTried = false;

function getSupabase() {
  if (supabase) return supabase;
  if (supabaseTried) return null;
  supabaseTried = true;
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) return null;
  try {
    // Electron 31 roda Node 20 no main (sem WebSocket nativo) — polyfill exigido pelo supabase-js
    if (typeof globalThis.WebSocket === 'undefined') {
      globalThis.WebSocket = require('ws');
    }
    const { createClient } = require('@supabase/supabase-js');
    supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.warn('[auth] Falha ao iniciar Supabase, usando contas locais:', e.message);
    return null;
  }
  return supabase;
}

function getAuthMode() {
  return getSupabase() ? 'central' : 'local';
}

// ── Utilitários ───────────────────────────────────────────────────────────────
function offlineUuid(nick) {
  const hash = crypto.createHash('md5').update('OfflinePlayer:' + nick).digest();
  hash[6] = (hash[6] & 0x0f) | 0x30;
  hash[8] = (hash[8] & 0x3f) | 0x80;
  const hex = hash.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

function hashPassword(p) { return crypto.createHash('sha256').update(p).digest('hex'); }
function isValidEmail(e) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(e || '').trim()); }

function mapSupabaseError(msg) {
  const m = String(msg || '');
  if (m.includes('Invalid login credentials')) return 'E-mail ou senha incorretos';
  if (m.includes('User already registered'))   return 'Este e-mail já possui uma conta';
  if (m.includes('at least 6 characters'))     return 'A senha deve ter no mínimo 6 caracteres';
  if (m.includes('Email not confirmed'))       return 'Confirme seu e-mail antes de entrar';
  if (m.toLowerCase().includes('rate limit'))  return 'Muitas tentativas. Aguarde um momento e tente novamente';
  return m;
}

function saveSession(s)  { fs.mkdirSync(require('path').dirname(paths.authFile()), { recursive: true }); fs.writeFileSync(paths.authFile(), JSON.stringify(s, null, 2)); }
function loadSession()   {
  try {
    const s = JSON.parse(fs.readFileSync(paths.authFile(), 'utf-8'));
    if (s && s.type === 'offline' && (!s.accessToken || s.accessToken === '0')) {
      s.accessToken = crypto.randomBytes(32).toString('hex');
      saveSession(s);
    }
    if (s && !s.role) {
      s.role = 'player';
      saveSession(s);
    }
    return s;
  } catch { return null; }
}
function clearSession()  { try { fs.unlinkSync(paths.authFile()); } catch {} }
function loadAccounts()  { try { return JSON.parse(fs.readFileSync(paths.offlineAccountsFile(), 'utf-8')); } catch { return {}; } }
function saveAccounts(d) { fs.mkdirSync(require('path').dirname(paths.offlineAccountsFile()), { recursive: true }); fs.writeFileSync(paths.offlineAccountsFile(), JSON.stringify(d, null, 2)); }

const VALID_ROLES = ['player', 'mod', 'admin'];

// ── Registrar conta ───────────────────────────────────────────────────────────
async function registerAccount(nickname, password, email) {
  const nick = (nickname || '').trim();
  if (!/^[A-Za-z0-9_]{3,16}$/.test(nick)) throw new Error('Nickname: 3–16 caracteres (letras, números ou _)');

  const sb = getSupabase();

  if (!sb) {
    // Modo local — contas ficam salvas nesta máquina
    if (!password || password.length < 4) throw new Error('Senha deve ter pelo menos 4 caracteres');

    const accounts = loadAccounts();
    const key = nick.toLowerCase();
    if (accounts[key]) throw new Error('Nickname já cadastrado. Faça login.');

    accounts[key] = { nickname: nick, passwordHash: hashPassword(password), role: 'player' };
    saveAccounts(accounts);
    return _buildSession(nick, 'player');
  }

  // Modo central — senha validada no servidor (hash gerenciado pelo Supabase)
  if (!isValidEmail(email))          throw new Error('Informe um e-mail válido');
  if (!password || password.length < 6) throw new Error('A senha deve ter no mínimo 6 caracteres');

  const { data, error } = await sb.auth.signUp({
    email: email.trim(),
    password,
    options: { data: { nickname: nick } },
  });
  if (error) throw new Error(mapSupabaseError(error.message));

  if (!data?.session) {
    // Projeto com confirmação de e-mail ativada no painel do Supabase
    throw new Error('Conta criada! Confirme seu e-mail e faça login.');
  }

  return _buildSession(nick, 'player', data.session.access_token);
}

// ── Atribuir tag (player | mod | admin) — somente modo local ──────────────────
function setRole(nickname, role) {
  const nick = (nickname || '').trim();
  if (!VALID_ROLES.includes(role)) throw new Error('Tag inválida. Use: player, mod ou admin');

  const accounts = loadAccounts();
  const account = accounts[nick.toLowerCase()];
  if (!account) throw new Error('Conta não encontrada');

  account.role = role;
  saveAccounts(accounts);
  return { nickname: account.nickname, role };
}

// ── Login ─────────────────────────────────────────────────────────────────────
async function loginAccount(nickname, password, email) {
  const sb = getSupabase();

  if (!sb) {
    // Modo local
    const nick = (nickname || '').trim();
    if (!nick)     throw new Error('Nickname não informado');
    if (!password) throw new Error('Senha não informada');

    const accounts = loadAccounts();
    const account  = accounts[nick.toLowerCase()];

    if (!account)                                        throw new Error('Conta não encontrada. Crie sua conta primeiro.');
    if (account.passwordHash !== hashPassword(password)) throw new Error('Senha incorreta');

    return _buildSession(account.nickname, account.role || 'player');
  }

  // Modo central
  if (!isValidEmail(email)) throw new Error('Informe um e-mail válido');
  if (!password)            throw new Error('Senha não informada');

  const { data, error } = await sb.auth.signInWithPassword({ email: email.trim(), password });
  if (error) throw new Error(mapSupabaseError(error.message));

  const user = data?.user;
  const meta = user?.user_metadata || {};
  const nick = meta.nickname || (nickname || '').trim() || (email || '').split('@')[0] || 'Jogador';

  // accessToken = JWT do Supabase (pode ser validado pelo plugin do servidor)
  return _buildSession(nick, meta.role || 'player', data.session.access_token);
}

function _buildSession(nick, role, accessToken = null) {
  // Gera um token válido — necessário para evitar o modo demo.
  // O Minecraft entra em demo quando recebe accessToken '0' ou inválido.
  const session = {
    type:        'offline',
    nickname:    nick,
    uuid:        offlineUuid(nick),
    accessToken: accessToken || crypto.randomBytes(32).toString('hex'),
    expiresAt:   0,
    role:        role || 'player',
  };
  saveSession(session);
  return session;
}

module.exports = { registerAccount, loginAccount, loadSession, clearSession, offlineUuid, setRole, getAuthMode };
