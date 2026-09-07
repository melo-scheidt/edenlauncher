// electron/services/serverStatus.js
// Ping direto no protocolo do Minecraft (Server List Ping) a partir do
// próprio launcher — contagem de players em tempo real, sem depender de
// serviços de terceiros. Usado pelo IPC 'server:status'.

const net = require('net');
const { SERVER_HOST, SERVER_PORT } = require('../config');
const log = require('electron-log');

// ── VarInt / pacotes do protocolo ─────────────────────────────────────────────

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

// ── Ping SLP ──────────────────────────────────────────────────────────────────

function pingMinecraft(host, port, timeoutMs = 5000) {
  return new Promise((resolve, reject) => {
    const socket = net.connect({ host, port });
    const chunks = [];
    let settled = false;

    const done = (fn, arg) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      socket.destroy();
      fn(arg);
    };

    const timer = setTimeout(
      () => done(reject, new Error('timeout ao pingar o servidor')),
      timeoutMs
    );

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

// ── Status normalizado (nunca lança — offline vira online:false) ──────────────

async function status() {
  try {
    const raw = await pingMinecraft(SERVER_HOST, SERVER_PORT);
    return {
      online: true,
      players: {
        online: raw?.players?.online ?? 0,
        max: raw?.players?.max ?? 0,
      },
      version: raw?.version?.name || null,
      motd: typeof raw?.description === 'string'
        ? raw.description
        : (raw?.description?.text || null),
    };
  } catch (e) {
    log.warn('[serverStatus] ping falhou (' + SERVER_HOST + ':' + SERVER_PORT + '):', e.message);
    return { online: false, players: { online: 0, max: 0 }, version: null };
  }
}

module.exports = { status };
