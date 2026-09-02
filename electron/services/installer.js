// electron/services/installer.js
// Instala automaticamente o ambiente Minecraft + Fabric antes do lançamento.
//
// Fluxo:
//   1. GET version_manifest.json → encontrar URL do versionId
//   2. GET {version}.json → salvar em versions/{id}/{id}.json
//   3. GET client JAR → versions/{id}/{id}.jar  (SHA-1 verificado)
//   4. Para cada library: filtrar por OS rules → baixar → extrair natives
//   5. GET assetIndex.json → assets/indexes/{id}.json
//   6. Para cada asset: baixar para assets/objects/{h[:2]}/{h}
//   7. Se Fabric: GET meta.fabricmc.net profile → merge com base JSON
//
// emit(phase, extra) reporta progresso ao caller via onEvent.

'use strict';

const fs      = require('fs');
const path    = require('path');
const crypto  = require('crypto');
const fetch   = require('node-fetch');
const AdmZip  = require('adm-zip');
const log     = require('electron-log');
const paths   = require('./paths');

// ── Helpers ──────────────────────────────────────────────────────────────────

function sha1File(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha1');
    const s = fs.createReadStream(filePath);
    s.on('data', (c) => h.update(c));
    s.on('end',  () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

async function downloadFile(url, dest, { expectedSha1, onProgress } = {}) {
  // If file already exists and hash matches, skip download
  if (expectedSha1 && fs.existsSync(dest)) {
    try {
      const got = await sha1File(dest);
      if (got.toLowerCase() === expectedSha1.toLowerCase()) return; // already good
    } catch { /* fall through to download */ }
  }

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  const res = await fetch(url, { timeout: 30000 });
  if (!res.ok) throw new Error(`Download falhou ${url} → ${res.status}`);

  const total    = Number(res.headers.get('content-length') || 0);
  let received   = 0;

  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.body.on('data', (chunk) => {
      received += chunk.length;
      if (onProgress && total) onProgress(received / total);
    });
    res.body.pipe(out);
    res.body.on('error', reject);
    out.on('finish', resolve);
    out.on('error', reject);
  });

  // Verify SHA-1 if provided
  if (expectedSha1) {
    const got = await sha1File(dest);
    if (got.toLowerCase() !== expectedSha1.toLowerCase()) {
      try { fs.unlinkSync(dest); } catch {}
      throw new Error(`SHA-1 inválido em ${path.basename(dest)} (esperado: ${expectedSha1}, obtido: ${got})`);
    }
  }
}

// ── OS rule evaluation (same as PrismLauncher / Mojang launcher) ──────────────

const CURRENT_OS = process.platform === 'win32' ? 'windows'
                 : process.platform === 'darwin' ? 'osx'
                 : 'linux';

function evaluateRules(rules, enabledFeatures = {}) {
  if (!rules || rules.length === 0) return true;
  let allow = false;
  for (const rule of rules) {
    let matchesOs = !rule.os || rule.os.name === CURRENT_OS;
    let matchesFeatures = true;

    if (rule.features) {
      for (const [featureName, featureValue] of Object.entries(rule.features)) {
        // If a feature is not explicitly enabled/disabled, treat it as false
        const isEnabled = !!enabledFeatures[featureName];
        if (isEnabled !== featureValue) {
          matchesFeatures = false;
          break;
        }
      }
    }

    if (matchesOs && matchesFeatures) {
      allow = rule.action === 'allow';
    }
  }
  return allow;
}

// ── Maven coordinate → relative path ─────────────────────────────────────────
// "com.mojang:authlib:4.0.43" → "com/mojang/authlib/4.0.43/authlib-4.0.43.jar"
// "org.lwjgl:lwjgl:3.3.1:natives-windows" → "org/lwjgl/lwjgl/3.3.1/lwjgl-3.3.1-natives-windows.jar"

function mavenToPath(name) {
  const parts = name.split(':');
  const group    = parts[0].replace(/\./g, '/');
  const artifact = parts[1];
  const version  = parts[2];
  const classifier = parts[3] ? `-${parts[3]}` : '';
  return `${group}/${artifact}/${version}/${artifact}-${version}${classifier}.jar`;
}

// ── Step 1 + 2: Resolve and download version JSON ────────────────────────────

const VERSION_MANIFEST_URL = 'https://piston-meta.mojang.com/mc/game/version_manifest_v2.json';

async function resolveVersionJson(mcVersion, emit) {
  const versionJsonPath = path.join(paths.versionsDir(), mcVersion, `${mcVersion}.json`);

  // Already installed? Skip
  if (fs.existsSync(versionJsonPath)) {
    log.info('[installer] version JSON já existe, pulando download base');
    return JSON.parse(fs.readFileSync(versionJsonPath, 'utf-8'));
  }

  emit('install:manifest', { msg: 'Baixando manifesto de versões Mojang…' });
  const manifestRes = await fetch(VERSION_MANIFEST_URL);
  if (!manifestRes.ok) throw new Error(`Version manifest: ${manifestRes.status}`);
  const manifest = await manifestRes.json();

  const vEntry = manifest.versions.find((v) => v.id === mcVersion);
  if (!vEntry) throw new Error(`Versão ${mcVersion} não encontrada no manifesto Mojang`);

  emit('install:version-json', { msg: `Baixando JSON da versão ${mcVersion}…` });
  const vjRes = await fetch(vEntry.url);
  if (!vjRes.ok) throw new Error(`Version JSON: ${vjRes.status}`);
  const vj = await vjRes.json();

  fs.mkdirSync(path.dirname(versionJsonPath), { recursive: true });
  fs.writeFileSync(versionJsonPath, JSON.stringify(vj, null, 2));
  return vj;
}

// ── Step 3: Client JAR ────────────────────────────────────────────────────────

async function downloadClientJar(vj, mcVersion, emit) {
  const clientJarPath = path.join(paths.versionsDir(), mcVersion, `${mcVersion}.jar`);
  const dl = vj.downloads?.client;
  if (!dl) return; // Some modded versions don't have a client dl entry

  emit('install:client-jar', { msg: `Baixando Minecraft ${mcVersion}.jar…` });
  await downloadFile(dl.url, clientJarPath, {
    expectedSha1: dl.sha1,
    onProgress: (p) => emit('install:client-jar', { msg: `Minecraft ${mcVersion}.jar`, progress: p }),
  });
}

// ── Step 4: Libraries + Natives ───────────────────────────────────────────────

async function downloadLibraries(vj, versionId, emit) {
  const libs = vj.libraries || [];
  const nativesDir = path.join(paths.versionsDir(), versionId, 'natives');
  fs.mkdirSync(nativesDir, { recursive: true });

  let done = 0;
  const total = libs.length;

  for (const lib of libs) {
    done++;
    if (!evaluateRules(lib.rules)) continue;

    const downloads = lib.downloads;
    if (!downloads) continue;

    // ── Normal artifact
    if (downloads.artifact) {
      const art  = downloads.artifact;
      const dest = path.join(paths.librariesDir(), art.path);
      if (!fs.existsSync(dest)) {
        emit('install:library', { msg: `Library: ${path.basename(art.path)}`, done, total });
        await downloadFile(art.url, dest, { expectedSha1: art.sha1 });
      }
    }

    // ── Natives classifier
    const classifiers = downloads.classifiers;
    if (classifiers) {
      const nativeKey = lib.natives?.[CURRENT_OS]
        ?.replace('${arch}', process.arch === 'x64' ? '64' : '32');
      if (nativeKey && classifiers[nativeKey]) {
        const nat  = classifiers[nativeKey];
        const dest = path.join(paths.librariesDir(), nat.path);
        if (!fs.existsSync(dest)) {
          emit('install:natives', { msg: `Natives: ${path.basename(nat.path)}`, done, total });
          await downloadFile(nat.url, dest, { expectedSha1: nat.sha1 });
        }
        // Extract natives to versions/{id}/natives/
        emit('install:extract-natives', { msg: `Extraindo natives de ${path.basename(nat.path)}…` });
        try {
          const zip = new AdmZip(dest);
          for (const entry of zip.getEntries()) {
            const name = entry.entryName;
            if (entry.isDirectory) continue;
            // Only extract native shared libraries
            if (!name.endsWith('.so') && !name.endsWith('.dll') && !name.endsWith('.dylib')) continue;
            // Skip META-INF
            if (name.startsWith('META-INF')) continue;
            const outPath = path.join(nativesDir, path.basename(name));
            fs.writeFileSync(outPath, entry.getData());
          }
        } catch (e) {
          log.warn('[installer] Falha ao extrair natives de', nat.path, e.message);
        }
      }
    }
  }
}

// ── Step 5 + 6: Assets ────────────────────────────────────────────────────────

const RESOURCES_URL = 'https://resources.download.minecraft.net';

async function downloadAssets(vj, emit) {
  const assetIndexInfo = vj.assetIndex;
  if (!assetIndexInfo) { log.warn('[installer] Sem assetIndex no version JSON'); return; }

  const indexDir  = path.join(paths.assetsDir(), 'indexes');
  const indexFile = path.join(indexDir, `${assetIndexInfo.id}.json`);
  fs.mkdirSync(indexDir, { recursive: true });

  // Download asset index
  if (!fs.existsSync(indexFile)) {
    emit('install:asset-index', { msg: `Baixando índice de assets ${assetIndexInfo.id}…` });
    await downloadFile(assetIndexInfo.url, indexFile, { expectedSha1: assetIndexInfo.sha1 });
  }

  const index   = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));
  const objects = index.objects || {};
  const keys    = Object.keys(objects);
  const total   = keys.length;
  let done      = 0;

  emit('install:assets-start', { msg: `Verificando ${total} assets…`, done: 0, total });

  for (const key of keys) {
    done++;
    const { hash, size } = objects[key];
    const prefix  = hash.slice(0, 2);
    const objDir  = path.join(paths.assetsDir(), 'objects', prefix);
    const objFile = path.join(objDir, hash);

    if (fs.existsSync(objFile) && fs.statSync(objFile).size === size) continue; // already have it

    const url = `${RESOURCES_URL}/${prefix}/${hash}`;
    fs.mkdirSync(objDir, { recursive: true });
    await downloadFile(url, objFile);

    if (done % 50 === 0 || done === total) {
      emit('install:assets', { msg: `Assets: ${done}/${total}`, done, total });
    }
  }
}

// ── Step 7: Fabric ────────────────────────────────────────────────────────────

async function installFabric(mcVersion, fabricVersion, versionId, baseVj, emit) {
  const fabricJsonPath = path.join(paths.versionsDir(), versionId, `${versionId}.json`);
  if (fs.existsSync(fabricJsonPath)) {
    try {
      const existing = JSON.parse(fs.readFileSync(fabricJsonPath, 'utf-8'));
      const existingFabricLib = (existing.libraries || []).find((l) => l.name && l.name.startsWith('net.fabricmc:fabric-loader:'));
      const existingVer = existingFabricLib ? existingFabricLib.name.split(':')[2] : null;
      if (existingVer && existingVer === fabricVersion) {
        log.info('[installer] Fabric JSON já existe e está atualizado, pulando');
        return existing;
      }
      log.info(`[installer] Atualizando Fabric Loader de ${existingVer || 'desconhecido'} para ${fabricVersion}`);
    } catch (e) {
      log.warn('[installer] Erro ao ler Fabric JSON local, baixando novamente:', e.message);
    }
  }

  emit('install:fabric', { msg: `Baixando Fabric ${fabricVersion} para MC ${mcVersion}…` });

  const url = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${fabricVersion}/profile/json`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fabric meta: ${res.status}`);
  const fabricProfile = await res.json();

  // Merge: Fabric profile libs come first, then base libs.
  // Dedupe by group:artifact so newer Fabric libs (e.g. ASM 9.7.1) replace
  // older base MC libs (e.g. ASM 9.6) — duplicates crash the classpath check.
  const fabricLibs = fabricProfile.libraries || [];
  const fabricKeys = new Set(fabricLibs.map((l) => (l.name || '').split(':').slice(0, 2).join(':')));
  const baseLibs   = (baseVj.libraries || []).filter((l) => {
    const key = (l.name || '').split(':').slice(0, 2).join(':');
    return key && !fabricKeys.has(key);
  });

  const mergedLibraries = [
    ...fabricLibs,
    ...baseLibs,
  ];

  const merged = {
    ...baseVj,
    ...fabricProfile,
    id: versionId,
    libraries: mergedLibraries,
    // Keep base assetIndex and assets
    assetIndex: baseVj.assetIndex,
    assets: baseVj.assets,
  };

  fs.mkdirSync(path.dirname(fabricJsonPath), { recursive: true });
  fs.writeFileSync(fabricJsonPath, JSON.stringify(merged, null, 2));
  return merged;
}

// Download Fabric libraries (they use a different URL format — Maven, not Mojang CDN)
async function downloadFabricLibraries(fabricProfile, emit) {
  const repos = [
    'https://maven.fabricmc.net/',
    'https://maven.minecraftforge.net/',
    'https://repo1.maven.org/maven2/',
  ];

  const libs  = fabricProfile.libraries || [];
  let done    = 0;
  const total = libs.length;

  for (const lib of libs) {
    done++;
    // Fabric uses { name, url } format
    if (!lib.name || !lib.url) continue;

    const relPath = mavenToPath(lib.name);
    const dest    = path.join(paths.librariesDir(), relPath);

    if (fs.existsSync(dest)) continue; // already have it

    const baseUrl = lib.url.endsWith('/') ? lib.url : lib.url + '/';
    const url     = baseUrl + relPath;

    emit('install:fabric-lib', { msg: `Fabric lib: ${lib.name.split(':')[1]}`, done, total });
    try {
      await downloadFile(url, dest);
    } catch (e) {
      // Try fallback repos
      let downloaded = false;
      for (const repo of repos) {
        try {
          await downloadFile(repo + relPath, dest);
          downloaded = true;
          break;
        } catch {}
      }
      if (!downloaded) log.warn('[installer] Não foi possível baixar lib Fabric:', lib.name, e.message);
    }
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * installEnvironment({ mcVersion, fabricVersion, versionId, onEvent })
 *
 * Downloads and installs the full Minecraft + Fabric environment.
 * Emits progress events via onEvent({ phase, msg, done, total, progress }).
 * Returns the final merged version JSON.
 *
 * @param {object} opts
 * @param {string} opts.mcVersion      - e.g. "1.20.1"
 * @param {string} [opts.fabricVersion] - e.g. "0.15.11" (omit for vanilla)
 * @param {string} opts.versionId      - e.g. "1.20.1-fabric" (dir name)
 * @param {function} [opts.onEvent]    - progress callback
 * @returns {Promise<object>} final version JSON
 */
async function installEnvironment({ mcVersion, fabricVersion, versionId, onEvent = () => {} }) {
  const emit = (phase, extra = {}) => {
    log.info('[installer]', phase, extra.msg || '');
    onEvent({ phase, ...extra });
  };

  // 1 + 2. Version JSON (base MC version)
  const baseVj = await resolveVersionJson(mcVersion, emit);

  // 3. Client JAR
  await downloadClientJar(baseVj, mcVersion, emit);

  let finalVj = baseVj;

  // 7. Fabric (if requested) — must happen before library download
  if (fabricVersion) {
    const fabricProfile = await installFabric(mcVersion, fabricVersion, versionId, baseVj, emit);
    finalVj = fabricProfile;
    // Download Fabric-specific libs (they use lib.url instead of Mojang CDN)
    const fabricOnlyLibs = (fabricProfile.libraries || []).filter((l) => l.url);
    await downloadFabricLibraries({ libraries: fabricOnlyLibs }, emit);
  } else {
    // For vanilla, copy MC json as versionId.json
    const vjPath = path.join(paths.versionsDir(), versionId, `${versionId}.json`);
    if (!fs.existsSync(vjPath)) {
      fs.mkdirSync(path.dirname(vjPath), { recursive: true });
      fs.writeFileSync(vjPath, JSON.stringify(baseVj, null, 2));
    }
  }

  // Copy base JAR to versionId JAR for both Vanilla and Fabric
  const srcJar  = path.join(paths.versionsDir(), mcVersion, `${mcVersion}.jar`);
  const destJar = path.join(paths.versionsDir(), versionId, `${versionId}.jar`);
  if (fs.existsSync(srcJar) && !fs.existsSync(destJar)) {
    fs.mkdirSync(path.dirname(destJar), { recursive: true });
    fs.copyFileSync(srcJar, destJar);
  }

  // 4. Libraries + Natives (using final merged vj)
  await downloadLibraries(finalVj, versionId, emit);

  // 5 + 6. Assets
  await downloadAssets(baseVj, emit);

  emit('install:done', { msg: 'Ambiente Minecraft instalado com sucesso!' });
  return finalVj;
}

module.exports = { installEnvironment, mavenToPath, evaluateRules, CURRENT_OS };
