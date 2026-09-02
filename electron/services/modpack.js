// electron/services/modpack.js
// Gerencia mods obrigatórios e opcionais locais e remotos, integridade SHA-256 e sincronização.

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const fetch = require('node-fetch');
const { app } = require('electron');
const log = require('electron-log');
const { MODPACK_MANIFEST_URL } = require('../config');
const paths = require('./paths');

const MIN_FABRIC_VERSION = '0.16.14';

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

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(filePath);
    s.on('data', (c) => h.update(c));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

// ── Localização de Pastas de Mods Bundled / Locais ────────────────────────────

function getSourceMandatoryModsDir() {
  const appPath = (app && typeof app.getAppPath === 'function') ? app.getAppPath() : path.join(__dirname, '..', '..');
  const candidates = [
    path.join(__dirname, '..', '..', 'mod  obrigatorio'),
    path.join(__dirname, '..', '..', 'mod obrigatorio'),
    path.join(__dirname, '..', '..', 'mods obrigatorios'),
    path.join(__dirname, '..', '..', 'mods-obrigatorios'),
    path.join(appPath, 'mod  obrigatorio'),
    path.join(appPath, 'mod obrigatorio'),
    path.join(appPath, 'mods obrigatorios'),
    path.join(appPath, 'mods-obrigatorios'),
    path.join(process.resourcesPath || '', 'mod  obrigatorio'),
    path.join(process.resourcesPath || '', 'mod obrigatorio'),
    path.join(process.resourcesPath || '', 'mods obrigatorios'),
    path.join(process.resourcesPath || '', 'mods-obrigatorios'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getSourceOptionalModsDir() {
  const appPath = (app && typeof app.getAppPath === 'function') ? app.getAppPath() : path.join(__dirname, '..', '..');
  const candidates = [
    path.join(__dirname, '..', '..', 'mods opcionais'),
    path.join(__dirname, '..', '..', 'mods-opcionais'),
    path.join(appPath, 'mods opcionais'),
    path.join(appPath, 'mods-opcionais'),
    path.join(process.resourcesPath || '', 'mods opcionais'),
    path.join(process.resourcesPath || '', 'mods-opcionais'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

// ── Lista de Mods Locais ──────────────────────────────────────────────────────

function getMandatoryMods() {
  const src = getSourceMandatoryModsDir();
  if (!src || !fs.existsSync(src)) return [];
  const entries = fs.readdirSync(src);
  return entries
    .filter((e) => e.endsWith('.jar'))
    .map((filename) => {
      const fullPath = path.join(src, filename);
      const stat = fs.statSync(fullPath);
      return {
        filename,
        baseFilename: filename,
        fullPath,
        size: stat.size,
        mtime: stat.mtimeMs,
        required: true,
      };
    });
}

function getOptionalMods() {
  const src = getSourceOptionalModsDir();
  if (!src || !fs.existsSync(src)) return [];
  const entries = fs.readdirSync(src);
  return entries
    .filter((e) => e.endsWith('.jar') || e.endsWith('.jar.disabled'))
    .map((entry) => {
      const isEnabledByDefault = !entry.endsWith('.disabled');
      const baseFilename = entry.replace(/\.disabled$/, '');
      const fullPath = path.join(src, entry);
      const stat = fs.statSync(fullPath);
      return {
        filename: entry,
        baseFilename,
        fullPath,
        size: stat.size,
        mtime: stat.mtimeMs,
        required: false,
        isEnabledByDefault,
      };
    });
}

// ── Shaders Embutidos (catálogo oficial) ──────────────────────────────────────

function getSourceShadersDir() {
  const appPath = (app && typeof app.getAppPath === 'function') ? app.getAppPath() : path.join(__dirname, '..', '..');
  const candidates = [
    path.join(__dirname, '..', '..', 'shaders opcionais'),
    path.join(__dirname, '..', '..', 'shaders-opcionais'),
    path.join(appPath, 'shaders opcionais'),
    path.join(appPath, 'shaders-opcionais'),
    path.join(process.resourcesPath || '', 'shaders opcionais'),
    path.join(process.resourcesPath || '', 'shaders-opcionais'),
  ];
  for (const p of candidates) {
    if (p && fs.existsSync(p)) return p;
  }
  return null;
}

function getShaders() {
  const src = getSourceShadersDir();
  if (!src || !fs.existsSync(src)) return [];
  return fs.readdirSync(src)
    .filter((e) => e.endsWith('.zip'))
    .map((filename) => {
      const fullPath = path.join(src, filename);
      const stat = fs.statSync(fullPath);
      return { filename, fullPath, size: stat.size };
    });
}

// ── Construção Dinâmica de Manifesto Local ───────────────────────────────────

async function buildLocalManifest() {
  const mandatory = getMandatoryMods();
  const optional = getOptionalMods();
  const files = [];

  for (const m of mandatory) {
    let sha256 = '';
    try { sha256 = await sha256File(m.fullPath); } catch {}
    files.push({
      path: `mods/${m.baseFilename}`,
      url: `file://${m.fullPath.replace(/\\/g, '/')}`,
      sha256,
      required: true,
      size: m.size,
    });
  }

  for (const o of optional) {
    let sha256 = '';
    try { sha256 = await sha256File(o.fullPath); } catch {}
    files.push({
      path: `mods/${o.baseFilename}`,
      url: `file://${o.fullPath.replace(/\\/g, '/')}`,
      sha256,
      required: false,
      size: o.size,
      defaultEnabled: true,
    });
  }

  return {
    version: '1.4.2',
    minecraft: '1.21.5',
    versionId: '1.21.5-fabric',
    loader: { type: 'fabric', version: '0.16.14' },
    files,
    blacklist: [],
  };
}

// ── Fonte local (file:// ou caminho absoluto) ────────────────────────────────

function isLocalSource(url) {
  return typeof url === 'string' && (
    url.startsWith('file://') ||
    /^[A-Za-z]:[\\/]/.test(url) ||
    url.startsWith('\\\\')
  );
}

function localPathFromUrl(url) {
  let p = url;
  if (p.startsWith('file://')) {
    p = p.slice('file://'.length);
    if (p.startsWith('/')) p = p.slice(1);
  }
  return decodeURIComponent(p);
}

async function fetchManifest() {
  let manifest = null;
  try {
    if (isLocalSource(MODPACK_MANIFEST_URL)) {
      const loc = localPathFromUrl(MODPACK_MANIFEST_URL);
      if (fs.existsSync(loc)) {
        manifest = JSON.parse(fs.readFileSync(loc, 'utf-8'));
      }
    } else {
      const res = await fetch(MODPACK_MANIFEST_URL, { timeout: 4000 });
      if (res.ok) {
        manifest = await res.json();
      }
    }
  } catch (e) {
    log.warn('[modpack] Falha ao obter manifesto remoto/configurado, usando manifesto local:', e.message);
  }

  if (!manifest || !manifest.files || manifest.files.length === 0) {
    manifest = await buildLocalManifest();
  }

  try {
    fs.writeFileSync(paths.manifestFile(), JSON.stringify(manifest, null, 2));
  } catch {}

  return manifest;
}

function loadCachedManifest() {
  try {
    const cached = JSON.parse(fs.readFileSync(paths.manifestFile(), 'utf-8'));
    if (cached?.loader?.type === 'fabric') {
      const ver = cached.loader.version;
      if (!ver || compareVersions(ver, MIN_FABRIC_VERSION) < 0) {
        cached.loader.version = MIN_FABRIC_VERSION;
        try {
          fs.writeFileSync(paths.manifestFile(), JSON.stringify(cached, null, 2));
        } catch {}
      }
    }
    return cached;
  } catch {
    return null;
  }
}

async function downloadFile(url, dest, onProgress) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });

  if (isLocalSource(url)) {
    fs.copyFileSync(localPathFromUrl(url), dest);
    return;
  }

  const res = await fetch(url, { timeout: 30000 });
  if (!res.ok) throw new Error(`Download ${url}: ${res.status}`);
  const total = Number(res.headers.get('content-length') || 0);
  let received = 0;
  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.body.on('data', (c) => {
      received += c.length;
      if (onProgress && total) onProgress(received / total);
    });
    res.body.pipe(out);
    res.body.on('error', reject);
    out.on('finish', resolve);
  });
}

// ── Sincronização Completa de Mods (Obrigatórios + Opcionais) ──────────────────

async function syncLocalMods(userEnabledMap = {}) {
  const modsDir = paths.modsDir();
  const optionalDir = paths.optionalModsDir();
  fs.mkdirSync(modsDir, { recursive: true });
  fs.mkdirSync(optionalDir, { recursive: true });

  // ── Carrega preferências de mods diretamente do store do Electron ─────────
  // Isso é a FONTE DE VERDADE — mesmo que userEnabledMap esteja vazio,
  // as preferências salvas pelo toggle na aba Mods são respeitadas.
  let storeEnabledMap = {};
  try {
    const { app: electronApp } = require('electron');
    const storePath = path.join(electronApp.getPath('userData'), 'eden-store.json');
    if (fs.existsSync(storePath)) {
      const storeData = JSON.parse(fs.readFileSync(storePath, 'utf-8'));
      storeEnabledMap = storeData?.mods?.enabled || {};
    }
  } catch (e) {
    log.warn('[modpack] Erro ao ler store de mods:', e.message);
  }

  log.info('[modpack] storeEnabledMap:', JSON.stringify(storeEnabledMap));
  log.info('[modpack] userEnabledMap:', JSON.stringify(userEnabledMap));

  // Merge: userEnabledMap (passado pelo launch) tem prioridade, depois store
  const mergedEnabled = { ...storeEnabledMap, ...userEnabledMap };
  log.info('[modpack] mergedEnabled:', JSON.stringify(mergedEnabled));

  // 1. Instala / Atualiza TODOS os Mods Obrigatórios em mods/
  const mandatory = getMandatoryMods();
  for (const mod of mandatory) {
    const targetFile = path.join(modsDir, mod.baseFilename);
    const disabledFile = path.join(modsDir, `${mod.baseFilename}.disabled`);

    // Remove versão .disabled se existir para mod obrigatório
    if (fs.existsSync(disabledFile)) {
      try { fs.unlinkSync(disabledFile); } catch {}
    }

    // Copia ou sobrescreve se o arquivo não existir ou tamanho diferir
    if (!fs.existsSync(targetFile) || fs.statSync(targetFile).size !== mod.size) {
      log.info('[modpack] Instalando mod obrigatório:', mod.baseFilename);
      fs.copyFileSync(mod.fullPath, targetFile);
    }
  }

  // 2. Guarda cópias de referência dos mods opcionais em optionalModsDir
  const mandatoryBaseNames = new Set(mandatory.map((m) => m.baseFilename.toLowerCase().replace(/[^a-z]/g, '')));
  const optional = getOptionalMods();

  for (const mod of optional) {
    const cleanName = mod.baseFilename.toLowerCase().replace(/[^a-z]/g, '');
    // Se o mod já for obrigatório (ex: voicechat), ignora a versão opcional para evitar crash por duplicação no Fabric
    if (cleanName.includes('voicechat') && mandatoryBaseNames.has('voicechat')) {
      continue;
    }

    const backupTarget = path.join(optionalDir, mod.baseFilename);
    if (!fs.existsSync(backupTarget) || fs.statSync(backupTarget).size !== mod.size) {
      fs.copyFileSync(mod.fullPath, backupTarget);
    }

    // 3. Aplica o estado escolhido pelo usuário para cada mod opcional
    // Se o mod está no mergedEnabled, usa esse valor; senão, default = true (primeira vez)
    const isEnabled = mergedEnabled[mod.baseFilename] !== undefined
      ? !!mergedEnabled[mod.baseFilename]
      : (mergedEnabled[mod.filename] !== undefined ? !!mergedEnabled[mod.filename] : true);

    const activeInMods = path.join(modsDir, mod.baseFilename);
    const disabledInMods = path.join(modsDir, `${mod.baseFilename}.disabled`);

    // Sempre limpa arquivos .disabled (não usamos mais esse sistema)
    if (fs.existsSync(disabledInMods)) {
      try { fs.unlinkSync(disabledInMods); } catch {}
    }

    if (isEnabled) {
      // Deve estar ativo (.jar) em mods/
      if (!fs.existsSync(activeInMods) || fs.statSync(activeInMods).size !== mod.size) {
        log.info('[modpack] Ativando mod opcional:', mod.baseFilename);
        fs.copyFileSync(mod.fullPath, activeInMods);
      }
    } else {
      // Deve estar REMOVIDO de mods/
      if (fs.existsSync(activeInMods)) {
        log.info('[modpack] Removendo mod opcional desativado:', mod.baseFilename);
        try { fs.unlinkSync(activeInMods); } catch {}
      }
    }
  }
}

// ── Garante que shaderpacks/ contenha SOMENTE shaders do catálogo oficial ────

function enforceShadersFolder() {
  const dir = paths.shaderpacksDir();
  if (!fs.existsSync(dir)) return;
  const allowed = new Set(getShaders().map((s) => s.filename.toLowerCase()));
  for (const entry of fs.readdirSync(dir)) {
    if (!entry.toLowerCase().endsWith('.zip')) continue;
    if (!allowed.has(entry.toLowerCase())) {
      log.warn('[modpack] Removendo shader não autorizado:', entry);
      try { fs.unlinkSync(path.join(dir, entry)); } catch {}
    }
  }
}

// ── Sincroniza Modpack Geral ──────────────────────────────────────────────────

async function syncModpack(manifest, onProgress = () => {}, userEnabledMap = {}) {
  // Sincroniza mods locais primeiro
  await syncLocalMods(userEnabledMap);

  const root = paths.gameDir();
  const files = manifest?.files || [];
  const total = files.length;
  let done = 0;
  const report = (extra) => onProgress({ done, total, ...extra });

  for (const f of files) {
    const dest = path.join(root, f.path);
    const destDisabled = dest + '.disabled';
    let need = true;

    // Skip optional mods that user has explicitly disabled
    if (!f.required && f.path.startsWith('mods/')) {
      const modName = path.basename(f.path);
      const isEnabled = userEnabledMap[modName] !== undefined
        ? !!userEnabledMap[modName]
        : (userEnabledMap[f.path] !== undefined ? !!userEnabledMap[f.path] : true);
      if (!isEnabled) {
        log.info('[modpack] Pulando mod opcional desativado:', modName);
        need = false;
        // Ensure disabled mod is removed from mods folder
        if (fs.existsSync(dest)) {
          try { fs.unlinkSync(dest); } catch {}
        }
      }
    }

    if (need && fs.existsSync(dest)) {
      if (!f.sha256) need = false;
      else {
        const got = await sha256File(dest);
        if (got.toLowerCase() === String(f.sha256).toLowerCase()) need = false;
      }
    } else if (need && fs.existsSync(destDisabled)) {
      if (!f.sha256) need = false;
      else {
        const got = await sha256File(destDisabled);
        if (got.toLowerCase() === String(f.sha256).toLowerCase()) need = false;
      }
    }

    if (need && f.url) {
      report({ phase: 'download', file: f.path, fileProgress: 0 });
      try {
        await downloadFile(f.url, dest, (p) =>
          report({ phase: 'download', file: f.path, fileProgress: p })
        );
        if (f.sha256) {
          const got = await sha256File(dest);
          if (got.toLowerCase() !== String(f.sha256).toLowerCase()) {
            try { fs.unlinkSync(dest); } catch {}
            throw new Error(`Hash inválido em ${f.path}`);
          }
        }
      } catch (e) {
        log.warn('[modpack] Erro ao baixar arquivo do manifesto:', f.path, e.message);
      }
    }
    done++;
    report({ phase: 'verify', file: f.path });
  }

  await enforceModsFolder(manifest, userEnabledMap);
  enforceShadersFolder();
  report({ phase: 'done' });
  return { ok: true, version: manifest.version };
}

// ── Garante que mods/ contenha SOMENTE os mods autorizados ───────────────────

async function enforceModsFolder(manifest, userEnabledMap = {}) {
  const modsDir = paths.modsDir();
  if (!fs.existsSync(modsDir)) return;

  const mandatory = getMandatoryMods();
  const optional = getOptionalMods();

  const allowedNames = new Set([
    ...mandatory.map((m) => m.baseFilename.toLowerCase()),
    ...optional
      .filter((o) => {
        const isEnabled = userEnabledMap[o.baseFilename] !== undefined
          ? !!userEnabledMap[o.baseFilename]
          : (userEnabledMap[o.filename] !== undefined ? !!userEnabledMap[o.filename] : true);
        return isEnabled;
      })
      .map((o) => o.baseFilename.toLowerCase()),
    ...(manifest?.files || [])
      .filter((f) => f.path.startsWith('mods/') && f.required)
      .map((f) => path.basename(f.path).toLowerCase()),
  ]);

  for (const entry of fs.readdirSync(modsDir)) {
    if (!entry.endsWith('.jar') && !entry.endsWith('.jar.disabled')) continue;
    const baseName = entry.replace(/\.disabled$/, '').toLowerCase();
    if (!allowedNames.has(baseName)) {
      log.warn('[modpack] Removendo mod não autorizado ou órfão:', entry);
      try { fs.unlinkSync(path.join(modsDir, entry)); } catch {}
    }
  }
}

// ── Hash Agregado do Cliente ──────────────────────────────────────────────────

async function clientIntegrityHash(manifest) {
  const h = crypto.createHash('sha256');
  const mandatory = getMandatoryMods();
  const sorted = [...mandatory].sort((a, b) => a.baseFilename.localeCompare(b.baseFilename));

  for (const m of sorted) {
    const dest = path.join(paths.modsDir(), m.baseFilename);
    if (!fs.existsSync(dest)) {
      h.update(`mods/${m.baseFilename}:MISSING`);
      continue;
    }
    const fileHash = await sha256File(dest);
    h.update(`mods/${m.baseFilename}:${fileHash}`);
  }

  return h.digest('hex');
}

module.exports = {
  fetchManifest,
  loadCachedManifest,
  buildLocalManifest,
  syncModpack,
  syncLocalMods,
  clientIntegrityHash,
  sha256File,
  getMandatoryMods,
  getOptionalMods,
  getShaders,
  getSourceMandatoryModsDir,
  getSourceOptionalModsDir,
  getSourceShadersDir,
  enforceShadersFolder,
};
