// server/status-server.js
// ─────────────────────────────────────────────────────────────────────────────
// API de status do servidor Éden — contabiliza players online e detecta se o
// servidor está desligado.
//
// COMO USAR (na máquina do servidor Minecraft, ou qualquer máquina com acesso):
//   1. Instale o Node.js 18+ (https://nodejs.org)
//   2. Copie este arquivo para o servidor
//   3. Rode:    node status-server.js
//      Endpoint: http://localhost:3001/status
//   4. Teste:   curl http://localhost:3001/status
//   5. Libere a porta 3001 no firewall para o launcher consultar de fora
//      ex.: http://SEU-IP:3001/status
//
// Checagem única (imprime o JSON e sai — útil para agendador/cron):
//   node status-server.js --once
//
// Configuração por variáveis de ambiente:
//   MC_HOST   (padrão: jogar.eden.net)
//   MC_PORT   (padrão: 25565)
//   HTTP_PORT (padrão: 3001)
//   CACHE_MS  (padrão: 10000)
//
// Manter rodando 24/7:
//   Windows:  nssm install EdenStatus "node" "C:\caminho\status-server.js"
//             (ou Atalho na pasta Inicializar do Windows)
//   Linux:    pm2 start status-server.js --name eden-status
//
// Sem dependências externas — apenas Node puro.
// ─────────────────────────────────────────────────────────────────────────────

const net = require('net');
const http = require('http');

const MC_HOST = process.env.MC_HOST || 'jogar.eden.net';
const MC_PORT = Number(process.env.MC_PORT || 25565);
const HTTP_PORT = Number(process.env.HTTP_PORT || 3001);
const CACHE_MS = Number(process.env.CACHE_MS || 10000);
const PING_TIMEOUT_MS = 5000;

// ── Protocolo Server List Ping (SLP) do Minecraft ────────────────────────────

function writeVarInt(value) {
  const bytes = [];
  let v = value >>> 0;
  do {
    let b = v & 0x7f;
    v = v >>> 7;
    if (v !== 0) b |= 0x80;
    bytes.push(b);
  } while (v !== 0);
  return Buffer.from(bytes);
}

function readVarInt(buf, offset) {
  let value = 0;
  let shift = 0;
  let pos = offset;
  let byte;
  do {
    byte = buf[pos++];
    value |= (byte & 0x7f) << shift;
    shift += 7;
    if (shift > 35) throw new Error('VarInt grande demais');
  } while (byte & 0x80);
  return { value: value >>> 0, pos };
}

function encodeString(s) {
  const strBuf = Buffer.from(s, 'utf8');
  return Buffer.concat([writeVarInt(strBuf.length), strBuf]);
}

function framePacket(body) {
  return Buffer.concat([writeVarInt(body.length), body]);
}

function pingMinecraft(host, port) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    let chunks = [];
    let settled = false;

    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn(arg);
    };

    const timer = setTimeout(() => done(reject, new Error('timeout ao pingar o servidor')), PING_TIMEOUT_MS);

    socket.on('error', (e) => done(reject, e));

    socket.on('connect', () => {
      const handshake = framePacket(Buffer.concat([
        writeVarInt(0x00),
        writeVarInt(-1),
        encodeString(host),
        Buffer.from([(port >> 8) & 0xff, port & 0xff]),
        writeVarInt(1),
      ]));
      const statusRequest = Buffer.concat([writeVarInt(1), writeVarInt(0x00)]);
      socket.write(handshake);
      socket.write(statusRequest);
    });

    socket.on('data', (d) => {
      chunks.push(d);
      const buf = Buffer.concat(chunks);
      try {
        const total = readVarInt(buf, 0);
        if (buf.length < total.pos + total.value) return;
        const pkt = readVarInt(buf, total.pos);
        if (pkt.value !== 0x00) throw new Error('resposta_sli');
        const str = readVarInt(buf, pkt.pos);
        if (buf.length < str.pos + str.value) return;
        const json = JSON.parse(buf.slice(str.pos, str.pos + str.value).toString('utf8'));
        done(resolve, json);
      } catch (e) {
        if (e.message === 'resposta_sli') done(reject, e);
      }
    });
  });
}

// ── Status normalizado + cache ────────────────────────────────────────────────

let cache = { at: 0, data: null };

function normalizeOnline(raw) {
  return {
    online: true,
    host: `${MC_HOST}:${MC_PORT}`,
    players: {
      online: raw?.players?.online ?? 0,
      max: raw?.players?.max ?? 0,
      sample: (raw?.players?.sample || []).map((p) => p.name),
    },
    version: raw?.version?.name || null,
    motd: typeof raw?.description === 'string' ? raw.description : (raw?.description?.text || null),
    checkedAt: new Date().toISOString(),
  };
}

function normalizeOffline() {
  return {
    online: false,
    host: `${MC_HOST}:${MC_PORT}`,
    players: { online: 0, max: 0, sample: [] },
    version: null,
    motd: null,
    checkedAt: new Date().toISOString(),
  };
}

async function getStatus() {
  const now = Date.now();
  if (cache.data && now - cache.at < CACHE_MS) return cache.data;
  let data;
  try {
    data = normalizeOnline(await pingMinecraft(MC_HOST, MC_PORT));
  } catch {
    data = normalizeOffline();
  }
  cache = { at: now, data };
  return data;
}

// ── Modo --once: imprime o status e sai ───────────────────────────────────────

if (process.argv.includes('--once')) {
  getStatus().then((d) => {
    console.log(JSON.stringify(d, null, 2));
    process.exit(0);
  });
  return;
}

// ── Servidor HTTP ─────────────────────────────────────────────────────────────

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const url = (req.url || '/').split('?')[0];
  if (url === '/' || url === '/status') {
    const data = await getStatus();
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(data));
    return;
  }
  res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify({ error: 'rota nao encontrada', rotas: ['/status'] }));
});

server.listen(HTTP_PORT, () => {
  console.log(`[eden-status] Monitorando ${MC_HOST}:${MC_PORT}`);
  console.log(`[eden-status] Endpoint: http://localhost:${HTTP_PORT}/status`);
});
