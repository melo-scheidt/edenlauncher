// electron/services/anticheat.js
// Varre o diretório do cliente antes de cada launch em busca de:
//   - .jar não autorizados em mods/
//   - hashes em blacklist (cheats conhecidos)
//   - argumentos JVM proibidos (-javaagent, etc.)
//   - DLLs proxy de injeção nativa ao lado do executável
// E enquanto o jogo roda: watchdog que detecta módulos (DLLs) estrangeiros
// injetados no processo do Minecraft, encerrando o jogo.

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const log = require('electron-log');
const paths = require('./paths');
const { sha256File, getMandatoryMods, getOptionalMods } = require('./modpack');

// Hashes SHA-256 de cheats conhecidos
const CHEAT_HASHES = new Set([
  // Ex: 'a1b2c3d4...': 'Wurst 7.x'
]);

// Substrings suspeitas em nomes de arquivo (filtro rápido por nome)
const SUSPICIOUS_NAMES = [
  'wurst', 'impact', 'aristois', 'meteor', 'liquidbounce',
  'sigma', 'inertia', 'pyro', 'rusherhack', 'xaero-hack',
];

// Args JVM proibidos (prevenção de injeção de agentes)
const FORBIDDEN_JVM_ARGS = ['-javaagent', '-agentlib', '-agentpath'];

async function scan(manifest) {
  const issues = [];
  const mandatory = getMandatoryMods();
  const optional = getOptionalMods();

  const allowed = new Set([
    ...mandatory.map((m) => m.baseFilename.toLowerCase()),
    ...optional.map((o) => o.baseFilename.toLowerCase()),
    ...(manifest?.files || [])
      .filter((f) => f.path.startsWith('mods/'))
      .map((f) => path.basename(f.path).toLowerCase()),
  ]);

  const modsDir = paths.modsDir();
  if (!fs.existsSync(modsDir)) return issues;

  for (const entry of fs.readdirSync(modsDir)) {
    const lower = entry.toLowerCase();
    const baseName = lower.replace(/\.disabled$/, '');
    const full = path.join(modsDir, entry);
    if (!entry.endsWith('.jar') && !entry.endsWith('.jar.disabled')) continue;

    if (!allowed.has(baseName)) {
      issues.push({ severity: 'block', type: 'unauthorized_mod', file: entry });
      continue;
    }
    if (SUSPICIOUS_NAMES.some((s) => lower.includes(s))) {
      issues.push({ severity: 'block', type: 'suspicious_name', file: entry });
    }
    try {
      const hash = await sha256File(full);
      if (CHEAT_HASHES.has(hash)) {
        issues.push({ severity: 'block', type: 'blacklist_hash', file: entry, hash });
      }
    } catch {}
  }
  return issues;
}

function validateJvmArgs(argString) {
  const lower = (argString || '').toLowerCase();
  return FORBIDDEN_JVM_ARGS.filter((a) => lower.includes(a));
}

// ── Injeção nativa: DLLs proxy ────────────────────────────────────────────────

// DLLs proxy clássicas: o injector dropa uma DLL com esses nomes ao lado do
// executável (ou no cwd) e o Windows carrega ela no lugar da do sistema.
const PROXY_DLL_NAMES = new Set([
  'dxgi.dll', 'd3d9.dll', 'd3d10.dll', 'd3d11.dll', 'd3d12.dll',
  'opengl32.dll', 'version.dll', 'winmm.dll', 'dinput8.dll',
  'xinput1_3.dll', 'xinput1_4.dll', 'dsound.dll', 'dwrite.dll',
  'uxtheme.dll', 'dbghelp.dll', 'iphlpapi.dll', 'ws2_32.dll',
]);

function scanProxyDlls(dirs) {
  const found = [];
  for (const dir of dirs) {
    if (!dir || !fs.existsSync(dir)) continue;
    for (const entry of fs.readdirSync(dir)) {
      if (PROXY_DLL_NAMES.has(entry.toLowerCase())) found.push(entry);
    }
  }
  return found;
}

// ── Watchdog de módulos enquanto o jogo roda ──────────────────────────────────

// Módulos que podem aparecer depois do boot sem serem injeção (drivers de
// vídeo, overlays legítimos, DLLs de sistema carregadas tardiamente)
const SAFE_MODULE_PATTERNS = [
  'nv', 'ati', 'amd', 'intel', 'razer', 'logi', 'corsair', 'steelseries',
  'steam', 'gameoverlay', 'discord', 'rtss', 'msvcp', 'vcruntime', 'ucrtbase',
  'dxgi', 'd3d', 'dcomp', 'd2d', 'dwrite', 'msctf', 'textinputframework',
  'coremessaging', 'uiautomation', 'inputhost', 'wintab', 'ole32', 'oleaut',
  'rpcrt', 'crypt32', 'wintrust', 'setupapi', 'devobj', 'cfgmgr', 'powrprof',
  'dwmapi', 'uxtheme', 'shcore', 'wtsapi', 'secur32', 'sspicli', 'userenv',
  'profapi', 'cryptbase', 'bcrypt', 'ncrypt', 'dbghelp', 'dbgcore', 'dnsapi',
  'winhttp', 'webio', 'dhcpcsvc', 'msimg', 'gdiplus', 'shell32', 'shlwapi',
  'imm32', 'javaw', 'java', 'jvm', 'lwjgl', 'jfx', 'prism', 'glass',
  'decoration', 'awt', 'freetype', 'harfbuzz', 'fontmanager', 'sunmscapi',
];

function listProcessModules(pid) {
  return new Promise((resolve) => {
    const p = spawn('tasklist', ['/m', '/fi', `PID eq ${pid}`, '/fo', 'CSV'], {
      windowsHide: true,
    });
    let out = '';
    p.stdout.on('data', (d) => (out += d));
    p.on('error', () => resolve(null));
    p.on('close', () => {
      try {
        const lines = out.split('\r\n').filter((l) => l.startsWith('"'));
        // a linha de cabeçalho também começa com aspas — só vale a linha cujo
        // segundo campo é o PID numérico do processo
        for (const line of lines) {
          const m = line.match(/^"([^"]*)","([^"]*)","(.*)"$/);
          if (!m || m[2] !== String(pid)) continue;
          const mods = m[3]
            .split(',')
            .map((s) => s.trim().replace(/^"+|"+$/g, '').toLowerCase())
            .filter(Boolean);
          return resolve(mods.includes('n/a') ? null : mods);
        }
        resolve(null);
      } catch {
        resolve(null);
      }
    });
  });
}

// Monitora o processo do Minecraft: captura a lista de módulos ~15s após o
// spawn (baseline) e re-verifica a cada 20s. Qualquer DLL nova que não seja
// da baseline nem da lista segura = injeção → encerra o jogo.
function startInjectionWatchdog(child, onViolation) {
  let baseline = null;
  let stopped = false;
  const stop = () => {
    if (stopped) return;
    stopped = true;
    clearInterval(tick);
    clearTimeout(first);
  };

  const check = async () => {
    if (stopped || child.exitCode !== null || !child.pid) return;
    const mods = await listProcessModules(child.pid);
    if (!mods) return;
    if (baseline === null) {
      baseline = mods;
      return;
    }
    const foreign = mods.filter(
      (m) => !baseline.includes(m) && !SAFE_MODULE_PATTERNS.some((pat) => m.includes(pat))
    );
    if (foreign.length) {
      log.warn('[anticheat] Injeção detectada no processo do jogo:', foreign.join(', '));
      onViolation(foreign);
      stop();
    }
  };

  const first = setTimeout(check, 15000);
  const tick = setInterval(check, 20000);
  child.on('exit', stop);
  return stop;
}

module.exports = {
  scan,
  validateJvmArgs,
  FORBIDDEN_JVM_ARGS,
  scanProxyDlls,
  startInjectionWatchdog,
};
