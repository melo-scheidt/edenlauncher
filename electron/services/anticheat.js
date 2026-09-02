// electron/services/anticheat.js
// Varre o diretório do cliente antes de cada launch em busca de:
//   - .jar não autorizados em mods/
//   - hashes em blacklist (cheats conhecidos)
//   - argumentos JVM proibidos (-javaagent, etc.)

const fs = require('fs');
const path = require('path');
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

module.exports = { scan, validateJvmArgs, FORBIDDEN_JVM_ARGS };
