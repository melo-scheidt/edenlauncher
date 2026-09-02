// electron/services/sessionToken.js
// Solicita o Token de Sessão Éden que será injetado na JVM
// e validado pelo plugin Spigot do servidor.

const fetch = require('node-fetch');
const { API_BASE, LAUNCHER_VERSION } = require('../config');
const log = require('electron-log');

const isDev = process.env.NODE_ENV === 'development';

async function requestSessionToken({ uuid, nickname, accountType, integrityHash }) {
  const payload = {
    uuid,
    nickname,
    accountType,
    integrityHash,
    timestamp: Date.now(),
    launcherVersion: LAUNCHER_VERSION,
  };

  try {
    const res = await fetch(`${API_BASE}/launcher/session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const txt = await res.text();
      throw new Error(`Token de sessão recusado (${res.status}): ${txt}`);
    }
    const data = await res.json();
    if (!data.token) throw new Error('Resposta sem token');
    return data; // { token, expiresIn }
  } catch (e) {
    if (isDev) {
      // Em modo de desenvolvimento, usa token mock para não travar o fluxo
      log.warn('[sessionToken] API indisponível, usando token mock (dev only):', e.message);
      return { token: `dev-mock-token-${Date.now()}`, expiresIn: 86400 };
    }
    throw e;
  }
}

module.exports = { requestSessionToken };
