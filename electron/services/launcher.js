// electron/services/launcher.js
// Orquestra: instalação → sync de modpack → anti-cheat → integrity hash
//            → token de sessão → spawn JVM
//
// Fluxo completo baseado na arquitetura do PrismLauncher:
//   1. installEnvironment  — garante que MC+Fabric estejam instalados
//   2. syncModpack         — baixa/repara mods faltantes/corrompidos
//   3. anti-cheat scan     — bloqueia mods não autorizados
//   4. integrity hash      — SHA-256 agregado dos mods
//   5. session token       — JWT do servidor Éden
//   6. spawn JVM           — java com args completos

'use strict';

const { spawn } = require('child_process');
const path   = require('path');
const fs     = require('fs');
const crypto = require('crypto');
const log    = require('electron-log');
const paths  = require('./paths');
const ac     = require('./anticheat');
const mp     = require('./modpack');
const session = require('./sessionToken');
const installer = require('./installer');
const javaRuntime = require('./javaRuntime');
const { SERVER_HOST, SERVER_PORT, LAUNCHER_VERSION } = require('../config');

function compareVersions(v1, v2) {
  const p1 = (v1 || '0').split('.').map(Number);
  const p2 = (v2 || '0').split('.').map(Number);
  for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
    const n1 = p1[i] || 0;
    const n2 = p2[i] || 0;
    if (n1 > n2) return 1;
    if (n1 < n2) return -1;
  }
  return 0;
}

// ── Java detection ────────────────────────────────────────────────────────────

function detectJava(custom) {
  if (custom && fs.existsSync(custom)) return custom;
  // 1) runtime embutido pelo launcher
  const bundled = path.join(
    paths.javaDir(),
    process.platform === 'win32' ? 'bin/java.exe' : 'bin/java'
  );
  if (fs.existsSync(bundled)) return bundled;
  // 2) JAVA_HOME
  if (process.env.JAVA_HOME) {
    const p = path.join(
      process.env.JAVA_HOME, 'bin',
      process.platform === 'win32' ? 'java.exe' : 'java'
    );
    if (fs.existsSync(p)) return p;
  }
  // 3) PATH fallback
  return process.platform === 'win32' ? 'java.exe' : 'java';
}

// ── Placeholder substitution ──────────────────────────────────────────────────

function resolvePlaceholders(template, vars) {
  return template.replace(/\$\{([^}]+)\}/g, (_, key) => {
    return key in vars ? vars[key] : `\${${key}}`;
  });
}

// ── Build classpath from version JSON ─────────────────────────────────────────

function buildClasspath(vj, versionId) {
  const cp = [];
  const seen = new Set();
  for (const lib of vj.libraries || []) {
    // Skip libs that don't pass OS rules
    if (!installer.evaluateRules(lib.rules)) continue;

    // Prefer downloads.artifact path if available
    if (lib.downloads?.artifact?.path) {
      const p = path.join(paths.librariesDir(), lib.downloads.artifact.path);
      if (fs.existsSync(p) && !seen.has(p)) { seen.add(p); cp.push(p); }
      continue;
    }

    // Fabric libs use `name` without a `downloads` block
    if (lib.name) {
      const relPath = installer.mavenToPath(lib.name);
      const p = path.join(paths.librariesDir(), relPath);
      if (fs.existsSync(p) && !seen.has(p)) { seen.add(p); cp.push(p); }
    }
  }

  // Client JAR always last
  const clientJar = path.join(paths.versionsDir(), versionId, `${versionId}.jar`);
  cp.push(clientJar);

  return cp.join(path.delimiter);
}

// ── Build JVM + game args from version JSON (modern ≥1.13 format) ─────────────

function buildArgs(vj, vars) {
  const jvmArgs  = [];
  const gameArgs = [];

  const enabledFeatures = {
    is_demo_user: false,
    has_custom_resolution: !!(vars.resolution_width && vars.resolution_height)
  };

  if (vj.arguments) {
    // Modern format: { arguments: { jvm: [...], game: [...] } }
    const processArgList = (list) => {
      if (!Array.isArray(list)) return [];
      const result = [];
      for (const entry of list) {
        if (typeof entry === 'string') {
          result.push(resolvePlaceholders(entry, vars));
        } else if (entry && typeof entry === 'object') {
          if (installer.evaluateRules(entry.rules, enabledFeatures)) {
            const val = entry.value;
            if (Array.isArray(val)) {
              result.push(...val.map((v) => resolvePlaceholders(v, vars)));
            } else if (val) {
              result.push(resolvePlaceholders(val, vars));
            }
          }
        }
      }
      return result;
    };
    jvmArgs.push(...processArgList(vj.arguments.jvm));
    gameArgs.push(...processArgList(vj.arguments.game));
  } else if (vj.minecraftArguments) {
    // Legacy format: flat string
    gameArgs.push(
      ...vj.minecraftArguments.split(' ').map((a) => resolvePlaceholders(a, vars))
    );
    // Legacy JVM args (minimal set)
    jvmArgs.push(
      `-Djava.library.path=${vars.natives_directory}`,
      `-cp`, vars.classpath,
    );
  }

  return { jvmArgs, gameArgs };
}

// ── Main launch function ──────────────────────────────────────────────────────

async function launch({ profile, settings, manifest, onEvent = () => {} }) {
  settings = settings || {};
  manifest = manifest || {};

  const emit = (phase, data = {}) => {
    log.info(`[launch] ${phase}`, data);
    onEvent({ phase, ...data });
  };

  // ── 1. Install Minecraft environment ───────────────────────────────────────
  const MIN_FABRIC_VERSION = '0.16.14';
  const mcVersion     = manifest.minecraft || '1.21.5';
  let fabricVersion   = manifest.loader?.type === 'fabric' ? manifest.loader.version : MIN_FABRIC_VERSION;
  if (fabricVersion && compareVersions(fabricVersion, MIN_FABRIC_VERSION) < 0) {
    log.info(`[launch] Forçando atualização do Fabric Loader de ${fabricVersion} para ${MIN_FABRIC_VERSION}`);
    fabricVersion = MIN_FABRIC_VERSION;
  }
  const versionId     = manifest.versionId || (fabricVersion ? `${mcVersion}-fabric` : mcVersion);

  emit('install:start', { msg: 'Verificando ambiente Minecraft…' });

  // ── 0. Ensure Java 21 is bundled (required by MC 1.21+) ─────────────────────────
  let bundledJavaPath;
  try {
    bundledJavaPath = await javaRuntime.ensureJava21({
      onEvent: (evt) => emit(evt.phase, evt),
    });
  } catch (e) {
    log.error('[launch] ensureJava21 failed', e);
    throw new Error(`Falha ao instalar Java 21: ${e.message}`);
  }

  let versionJson;
  try {
    versionJson = await installer.installEnvironment({
      mcVersion,
      fabricVersion,
      versionId,
      onEvent: (evt) => emit(evt.phase, evt),
    });
  } catch (e) {
    log.error('[launch] installEnvironment failed', e);
    throw new Error(`Falha na instalação do ambiente: ${e.message}`);
  }
  emit('install:complete');

  // ── 2. Sync modpack (Obrigatórios + Opcionais escolhidos) ─────────────────
  emit('modpack:start');
  const userModsEnabled = settings.modsEnabled || {};
  log.info('[launcher] userModsEnabled passed to syncModpack:', JSON.stringify(userModsEnabled));
  await mp.syncModpack(manifest, (p) => emit('download', p), userModsEnabled);
  emit('modpack:done');

  // ── 3. Anti-cheat ─────────────────────────────────────────────────────────
  emit('anticheat:start');
  const issues = await ac.scan(manifest);
  if (issues.some((i) => i.severity === 'block')) {
    throw new Error(
      'Anti-cheat bloqueou: ' + issues.map((i) => `${i.type}:${i.file}`).join(', ')
    );
  }
  const badArgs = ac.validateJvmArgs(settings.launchArgs);
  if (badArgs.length) throw new Error('Argumentos JVM proibidos: ' + badArgs.join(', '));
  emit('anticheat:ok');

  // ── 4. Integrity hash ──────────────────────────────────────────────────────
  emit('integrity:start');
  const integrityHash = await mp.clientIntegrityHash(manifest);
  emit('integrity:ok', { integrityHash });

  // ── 5. Session token ───────────────────────────────────────────────────────
  emit('token:start');
  const tok = await session.requestSessionToken({
    uuid:         profile.uuid,
    nickname:     profile.nickname,
    accountType:  profile.type || 'offline',
    integrityHash,
  });
  emit('token:ok');

  // ── 6. Build JVM + game args ────────────────────────────────────────────────────
  // Prefer: custom path > bundled Java 21 > system JAVA_HOME > PATH
  const javaPath = detectJava(settings.javaPath) !== (process.platform === 'win32' ? 'java.exe' : 'java')
    ? detectJava(settings.javaPath)
    : bundledJavaPath;
  const ramMb     = (settings.ramGb || 4) * 1024;
  const [w, h]    = (settings.resolution || '1920x1080').split('x');
  const nativesDir = path.join(paths.versionsDir(), versionId, 'natives');
  const classpath  = buildClasspath(versionJson, versionId);

  // Placeholder map (all variables the version JSON might reference)
  const vars = {
    natives_directory:  nativesDir,
    launcher_name:      'EdenLauncher',
    launcher_version:   LAUNCHER_VERSION,
    classpath,
    classpath_separator: path.delimiter,
    library_directory:  paths.librariesDir(),
    auth_player_name:   profile.nickname,
    version_name:       versionId,
    game_directory:     paths.gameDir(),
    assets_root:        paths.assetsDir(),
    assets_index_name:  versionJson.assetIndex?.id || mcVersion,
    auth_uuid:          profile.uuid.replace(/-/g, ''),
    auth_access_token:  profile.accessToken || crypto.randomBytes(32).toString('hex'),
    auth_xuid:          '0',
    auth_type:          profile.type === 'microsoft' ? 'msa' : 'legacy',
    user_type:          profile.type === 'microsoft' ? 'msa' : 'legacy',
    version_type:       versionJson.type || 'release',
    resolution_width:   w,
    resolution_height:  h,
    game_assets:        path.join(paths.assetsDir(), 'virtual', 'legacy'),
    user_properties:    '{}',
  };

  const { jvmArgs: vjvmArgs, gameArgs: vgameArgs } = buildArgs(versionJson, vars);

  // Our custom JVM args (memory, session token, custom user args)
  const userArgs = (settings.launchArgs || '').split(/\s+/).filter(Boolean);
  const baseJvmArgs = [
    `-Xmx${ramMb}M`,
    `-Xms${Math.min(1024, ramMb)}M`,
    `-Deden.session=${tok.token}`,
    `-Deden.launcher=true`,
    ...userArgs,
  ];

  // If version JSON didn't give us -cp (legacy mode), we add it ourselves
  const allJvmArgs = [...baseJvmArgs, ...vjvmArgs];
  if (!allJvmArgs.includes('-cp') && !allJvmArgs.includes('-classpath')) {
    allJvmArgs.push('-cp', classpath);
  }

  // Éden-specific game args (server auto-connect, etc.)
  const edenGameArgs = [
    '--server', SERVER_HOST, '--port', String(SERVER_PORT),
  ];
  if (settings.fullscreen) edenGameArgs.push('--fullscreen');

  // Apply options.txt settings
  try {
    const optionsPath = path.join(paths.gameDir(), 'options.txt');
    let content = fs.existsSync(optionsPath) ? fs.readFileSync(optionsPath, 'utf-8') : '';
    const map = new Map();
    content.split('\n').forEach((line) => {
      const [k, ...v] = line.split(':');
      if (k && v.length) map.set(k.trim(), v.join(':').trim());
    });
    map.set('enableVsync', settings.vsync ? 'true' : 'false');
    map.set('fullscreen',  settings.fullscreen ? 'true' : 'false');
    map.set('overrideWidth',  w);
    map.set('overrideHeight', h);
    // Force enable the custom skin resource pack if it's not there
    const rpLine = map.get('resourcePacks') || '["vanilla"]';
    if (!rpLine.includes('file/EdenCustomSkin')) {
      try {
        const parsed = JSON.parse(rpLine);
        if (Array.isArray(parsed) && !parsed.includes('file/EdenCustomSkin')) {
          parsed.push('file/EdenCustomSkin');
          map.set('resourcePacks', JSON.stringify(parsed));
        }
      } catch {
        map.set('resourcePacks', '["vanilla","file/EdenCustomSkin"]');
      }
    }

    // Aplica o shader selecionado no catálogo (Iris lê estas chaves do options.txt)
    if (settings.shader) {
      map.set('shaderPack', settings.shader);
      map.set('enableShaders', 'true');
    }

    fs.mkdirSync(paths.gameDir(), { recursive: true });
    fs.writeFileSync(optionsPath, [...map.entries()].map(([k, v]) => `${k}:${v}`).join('\n'));
  } catch (e) {
    log.warn('[launch] Falha ao aplicar options.txt', e);
  }

  const finalArgs = [
    ...allJvmArgs,
    versionJson.mainClass,
    ...vgameArgs,
    ...edenGameArgs,
  ];

  emit('jvm:spawn', { java: javaPath, mainClass: versionJson.mainClass });
  log.info('[launch] spawn:', javaPath, finalArgs.join(' '));

  const child = spawn(javaPath, finalArgs, {
    cwd:      paths.gameDir(),
    detached: false,
    stdio:    ['ignore', 'pipe', 'pipe'],
  });

  child.stdout.on('data', (d) => log.info('[mc]',     d.toString().trimEnd()));
  child.stderr.on('data', (d) => log.warn('[mc:err]', d.toString().trimEnd()));
  child.on('exit',  (code) => emit('jvm:exit',  { code }));
  child.on('error', (err)  => emit('jvm:error', { error: err.message }));

  return { pid: child.pid };
}

module.exports = { launch };
