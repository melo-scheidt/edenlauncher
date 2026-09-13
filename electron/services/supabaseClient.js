// electron/services/supabaseClient.js
// Cliente Supabase compartilhado (auth + friends). Singleton preguiçoso —
// retorna null quando as chaves não estão configuradas (modo offline).

const config = require('../config');

let supabase = null;

function getClient() {
  if (supabase) return supabase;
  const url = process.env.EDEN_SUPABASE_URL || config.SUPABASE_URL;
  const key = process.env.EDEN_SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  try {
    // Electron 31 roda Node 20 no main (sem WebSocket nativo) — polyfill exigido pelo supabase-js
    if (typeof globalThis.WebSocket === 'undefined') {
      globalThis.WebSocket = require('ws');
    }
    const { createClient } = require('@supabase/supabase-js');
    // Sessão manual (o launcher guarda os tokens no próprio authFile):
    // sem persistência e sem auto-refresh — o friends.js renova sob demanda.
    supabase = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
  } catch (e) {
    console.warn('[supabase] Falha ao iniciar cliente:', e.message);
    return null;
  }
  return supabase;
}

function isConfigured() {
  const url = process.env.EDEN_SUPABASE_URL || config.SUPABASE_URL;
  const key = process.env.EDEN_SUPABASE_ANON_KEY || config.SUPABASE_ANON_KEY;
  return Boolean(url && key);
}

module.exports = { getClient, isConfigured };
