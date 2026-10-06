#!/usr/bin/env node
// scripts/supabase-delete-users.js
// Apaga contas registradas no Supabase Auth via Admin API.
//
// ⚠️  Requer a SERVICE ROLE KEY (bypassa RLS) — NUNCA use a anon key aqui,
//     e nunca inclua a service_role no launcher/desktop.
//
// Setup (uma vez):
//   Supabase Dashboard → Project Settings → API →
//     "service_role" (secret) → copie e salve no .env como:
//       SUPABASE_SERVICE_ROLE_KEY=eyJ...
//
// Uso (rode na raiz do projeto):
//   node scripts/supabase-delete-users.js --list
//   node scripts/supabase-delete-users.js --email usuario@dominio.com
//   node scripts/supabase-delete-users.js --all          # pede confirmação
//   node scripts/supabase-delete-users.js --all --yes    # sem confirmação

require('dotenv').config();

const readline = require('readline');
const config = require('../electron/config');

const SUPABASE_URL =
  process.env.EDEN_SUPABASE_URL || config.SUPABASE_URL;
const SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.EDEN_SUPABASE_SERVICE_ROLE_KEY || '';

const args = process.argv.slice(2);
const has = (flag) => args.includes(flag);
const getOpt = (flag) => {
  const i = args.indexOf(flag);
  return i !== -1 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

async function confirm(question) {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  const answer = await new Promise((res) => rl.question(`${question} `, res));
  rl.close();
  return /^s(im)?$/i.test(answer.trim());
}

async function main() {
  if (!SUPABASE_URL) die('EDEN_SUPABASE_URL não configurada (.env).');
  if (!SERVICE_ROLE_KEY) {
    die(
      'SUPABASE_SERVICE_ROLE_KEY não configurada.\n' +
      '   Dashboard → Project Settings → API keys → "Secret keys"\n' +
      '   Copie a chave sb_secret_... e adicione ao .env:\n' +
      '   SUPABASE_SERVICE_ROLE_KEY=sb_secret_...'
    );
  }

  // Cliente admin — sem sessão persistida, sem refresh.
  if (typeof globalThis.WebSocket === 'undefined') {
    globalThis.WebSocket = require('ws');
  }
  const { createClient } = require('@supabase/supabase-js');
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false },
  });

  const listAll = async () => {
    const out = [];
    let page = 1;
    for (;;) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 1000 });
      if (error) throw error;
      out.push(...data.users);
      if (data.users.length < 1000) break;
      page += 1;
    }
    return out;
  };

  const deleteUser = async (u) => {
    const { error } = await admin.auth.admin.deleteUser(u.id);
    if (error) throw error;
  };

  // ── --list ──────────────────────────────────────────────────────────────────
  if (has('--list')) {
    const users = await listAll();
    if (!users.length) return console.log('\nNenhum usuário registrado.\n');
    console.log(`\n${users.length} usuário(s):\n`);
    for (const u of users) {
      console.log(`  • ${u.email || u.id}   (criado em ${u.created_at?.slice(0, 10) || '?'})`);
    }
    console.log('');
    return;
  }

  // ── --email <addr> ──────────────────────────────────────────────────────────
  const email = getOpt('--email');
  if (email) {
    const users = await listAll();
    const target = users.find((u) => (u.email || '').toLowerCase() === email.toLowerCase());
    if (!target) die(`Usuário "${email}" não encontrado.`);
    await deleteUser(target);
    console.log(`\n✅ Conta apagada: ${target.email || target.id}\n`);
    return;
  }

  // ── --all ───────────────────────────────────────────────────────────────────
  if (has('--all')) {
    const users = await listAll();
    if (!users.length) return console.log('\nNenhum usuário para apagar.\n');

    console.log(`\n⚠️  Isto apaga PERMANENTEMENTE ${users.length} conta(s):`);
    for (const u of users) console.log(`  • ${u.email || u.id}`);

    if (!has('--yes')) {
      const ok = await confirm('\nDigite "sim" para confirmar:');
      if (!ok) return console.log('\nCancelado — nada foi apagado.\n');
    }

    let ok = 0;
    const fails = [];
    for (const u of users) {
      try {
        await deleteUser(u);
        ok += 1;
        console.log(`  ✅ ${u.email || u.id}`);
      } catch (e) {
        fails.push({ user: u.email || u.id, error: e.message });
        console.error(`  ❌ ${u.email || u.id}: ${e.message}`);
      }
    }

    console.log(`\nConcluído: ${ok} apagada(s), ${fails.length} falha(s).\n`);
    if (fails.length) process.exit(2);
    return;
  }

  // ── ajuda ───────────────────────────────────────────────────────────────────
  console.log(`
Uso:
  node scripts/supabase-delete-users.js --list
      Lista todas as contas registradas.

  node scripts/supabase-delete-users.js --email usuario@dominio.com
      Apaga uma conta específica.

  node scripts/supabase-delete-users.js --all [--yes]
      Apaga TODAS as contas (--yes pula a confirmação).
`);
}

main().catch((e) => die(e.message));
