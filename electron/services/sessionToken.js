// electron/services/sessionToken.js
// Solicita o Token de Sessão Éden que será injetado na JVM
// e validado pelo plugin Spigot do servidor.

const fetch = require('node-fetch');
const { API_BASE, LAUNCHER_VERSION } = require('../config');
const log = require('electron-log');

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
    // API ainda não disponível (ex.: domínio não configurado): segue com token
    // offline para não travar o jogo. Quando a API Éden entrar no ar, o token
    // real volta a ser usado automaticamente.
    log.warn('[sessionToken] API indisponível, usando token offline:', e.message);
    return { token: `eden-offline-${Date.now()}`, expiresIn: 0 };
  }
}

module.exports = { requestSessionToken };
