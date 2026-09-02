// electron/main.js
// Processo principal do Éden Launcher.
// - Splash window (3s) → Main window
// - Auto-updater
// - IPC: store, dialog, logs, auth, modpack, launch, updater

// ── Load .env FIRST (before any other require) ────────────────────────────────
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const log = require('electron-log');
const path = require('path');
const fs = require('fs');
const os = require('os');

const paths = require('./services/paths');
const auth = require('./services/auth');
const modpack = require('./services/modpack');
const launcher = require('./services/launcher');
const skins = require('./services/skins');

// Configurar log
log.transports.file.resolvePathFn = () => path.join(paths.logsDir(), 'launcher.log');
autoUpdater.logger = log;
autoUpdater.autoDownload = true;

const isDev = process.env.NODE_ENV === 'development';
const RENDERER_DEV_URL = 'http://localhost:5173';
// Em build de release o dist/ fica FORA do asar (asarUnpack): o Electron 31 não
// carrega URLs file:// de dentro do próprio app.asar. Usamos o caminho real.
const UNPACKED_RENDERER = path.join(process.resourcesPath || '', 'app.asar.unpacked', 'dist', 'index.html');
const RENDERER_PROD_FILE = (!isDev && fs.existsSync(UNPACKED_RENDERER))
  ? UNPACKED_RENDERER
  : path.join(__dirname, '..', 'dist', 'index.html');

let splashWindow = null;
let mainWindow = null;

// Envia IPC ao renderer sem estourar se a janela já foi destruída
// (ex.: durante auto-update/quit — "Object has been destroyed")
function sendToMain(channel, ...args) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, ...args);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────
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

// ── Store simples ─────────────────────────────────────────────────────────────
const storeFile = () => path.join(app.getPath('userData'), 'eden-store.json');
function loadStore() {
  try { return JSON.parse(fs.readFileSync(storeFile(), 'utf-8')); }
  catch { return {}; }
}
function saveStore(d) {
  fs.writeFileSync(storeFile(), JSON.stringify(d, null, 2));
  return true;
}

// ── Carregar renderer ─────────────────────────────────────────────────────────
function loadRenderer(win, route = '') {
  if (isDev) {
    win.loadURL(RENDERER_DEV_URL + (route ? `#${route}` : ''));
  } else {
    // Electron 31: loadFile com a opcao { hash } falha (ERR_FILE_NOT_FOUND) para
    // arquivos dentro do app.asar — por isso montamos a URL file:// manualmente.
    const fileUrl = encodeURI('file:///' + RENDERER_PROD_FILE.replace(/\\/g, '/')) + (route ? `#${route}` : '');
    win.loadURL(fileUrl);
  }
}

// ── Splash ────────────────────────────────────────────────────────────────────
function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 520, height: 320,
    frame: false, resizable: false, transparent: true,
    alwaysOnTop: true, show: false, backgroundColor: '#00000000',
    icon: path.join(__dirname, '..', 'icon', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      // file:// + ES modules sempre pedem CORS e o Chromium bloqueia origin null;
      // a UI carrega apenas arquivos locais embutidos, então liberamos o webSecurity
      webSecurity: false,
    },
  });
  loadRenderer(splashWindow, '/splash');
  splashWindow.once('ready-to-show', () => splashWindow.show());
}

// ── Main window ───────────────────────────────────────────────────────────────
function createMainWindow() {
  const storeData = loadStore();
  const settings = storeData?.settings || {};
  let w = 1280, h = 800;

  if (settings.resolution) {
    const [resW, resH] = settings.resolution.split('x').map(Number);
    if (resW && resH) {
      w = resW;
      h = resH;
    }
  }

  mainWindow = new BrowserWindow({
    width: w, height: h, minWidth: 1100, minHeight: 720,
    show: false, backgroundColor: '#0A0A0A',
    title: 'Éden Launcher', autoHideMenuBar: true,
    maximizable: false, fullscreenable: false,
    icon: path.join(__dirname, '..', 'icon', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true, nodeIntegration: false,
      // file:// + ES modules sempre pedem CORS e o Chromium bloqueia origin null;
      // a UI carrega apenas arquivos locais embutidos, então liberamos o webSecurity
      webSecurity: false,
    },
  });
  loadRenderer(mainWindow, '/');
  mainWindow.once('ready-to-show', () => {
    setTimeout(() => {
      // Janelas podem ter sido destruídas durante o timeout (quit/update)
      if (splashWindow && !splashWindow.isDestroyed()) {
        splashWindow.close();
        splashWindow = null;
      }
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
      }
    }, 3000);
  });
  mainWindow.webContents.on('console-message', (event, level, message, line, sourceId) => {
    console.log(`[RENDERER] ${message} (line: ${line}, source: ${sourceId})`);
  });
  mainWindow.on('closed', () => { mainWindow = null; });
}

// ── App ready ─────────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  createSplashWindow();
  createMainWindow();

  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify().catch((e) => log.warn('updater', e));
  }
  autoUpdater.on('update-available', (i) => sendToMain('updater:available', i));
  autoUpdater.on('download-progress', (p) => sendToMain('updater:progress', p));
  autoUpdater.on('update-downloaded', () => sendToMain('updater:ready'));
  autoUpdater.on('error', (e) => sendToMain('updater:error', String(e?.message || e)));

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// ── IPC: Store ────────────────────────────────────────────────────────────────
ipcMain.handle('store:get', (_e, key) => { const d = loadStore(); return key ? d[key] : d; });
ipcMain.handle('store:set', (_e, key, value) => { const d = loadStore(); d[key] = value; return saveStore(d); });

// ── IPC: Dialog / Logs / Shell / App ─────────────────────────────────────────
ipcMain.handle('dialog:pick-java', async () => {
  const r = await dialog.showOpenDialog({
    title: 'Selecionar executável Java',
    properties: ['openFile'],
    filters: [{ name: 'Java', extensions: process.platform === 'win32' ? ['exe'] : ['*'] }],
  });
  return r.canceled || !r.filePaths.length ? null : r.filePaths[0];
});
ipcMain.handle('dialog:pick-skin', async (_e, nickname) => {
  try {
    log.info('[skins] pick-skin chamado para:', nickname);
    const result = await skins.pickAndApplySkin(nickname);
    log.info('[skins] pick-skin resultado:', result?.ok, result?.error || '');
    return result;
  } catch (e) {
    log.error('[skins] pick-skin falhou:', e);
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('skins:get-local', async (_e, nickname) => {
  return skins.getLocalSkinBase64(nickname);
});
ipcMain.handle('logs:open-folder', () => shell.openPath(paths.logsDir()));
ipcMain.handle('logs:read', () => {
  const f = path.join(paths.logsDir(), 'launcher.log');
  return fs.existsSync(f) ? fs.readFileSync(f, 'utf-8') : '(sem logs ainda)';
});
ipcMain.handle('shell:open-external', (_e, url) => shell.openExternal(url));
ipcMain.handle('app:get-info', () => ({
  version: app.getVersion(), platform: process.platform, arch: process.arch,
  totalMemGB: +(os.totalmem() / 1e9).toFixed(1),
  userData: app.getPath('userData'), logsDir: paths.logsDir(),
}));
ipcMain.handle('app:resize', (_e, width, height) => {
  if (mainWindow && !mainWindow.isMaximized()) {
    mainWindow.setSize(width, height);
    mainWindow.center();
  }
});
// ── IPC: Auth ─────────────────────────────────────────────────────────────────
ipcMain.handle('auth:login', async (_e, nick, pass, email) => {
  try   { return { ok: true,  session: await auth.loginAccount(nick, pass, email) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('auth:register', async (_e, nick, pass, email) => {
  try   { return { ok: true,  session: await auth.registerAccount(nick, pass, email) }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('auth:current', () => auth.loadSession());
ipcMain.handle('auth:logout',  () => { auth.clearSession(); return true; });

// ── IPC: Modpack ──────────────────────────────────────────────────────────────
ipcMain.handle('modpack:fetch-manifest', async () => {
  try { return { ok: true, manifest: await modpack.fetchManifest() }; }
  catch (e) { return { ok: false, error: e.message }; }
});
ipcMain.handle('modpack:cached', () => modpack.loadCachedManifest());
ipcMain.handle('modpack:sync', async (_e, manifest) => {
  try {
    await modpack.syncModpack(manifest, (p) => sendToMain('modpack:progress', p));
    return { ok: true };
  } catch (e) { return { ok: false, error: e.message }; }
});

// ── IPC: Launch ───────────────────────────────────────────────────────────────
ipcMain.handle('launch:start', async (_e, { profile, settings, manifest }) => {
  try {
    settings = settings || {};
    const storeData = loadStore();
    if (storeData?.mods?.enabled) {
      settings.modsEnabled = { ...(storeData.mods.enabled || {}), ...(settings.modsEnabled || {}) };
    }
    if (storeData?.mods?.shader) {
      settings.shader = storeData.mods.shader;
    }
    const r = await launcher.launch({
      profile, settings, manifest,
      onEvent: (evt) => sendToMain('launch:event', evt),
    });
    return { ok: true, ...r };
  } catch (e) {
    log.error('launch', e);
    return { ok: false, error: e.message };
  }
});
ipcMain.handle('launch:is-installed', async (_e, { manifest } = {}) => {
  try {
    const mcVersion = manifest?.minecraft || '1.21.5';
    let fabricVersion = manifest?.loader?.type === 'fabric' ? manifest.loader.version : MIN_FABRIC_VERSION;
    if (fabricVersion && compareVersions(fabricVersion, MIN_FABRIC_VERSION) < 0) {
      fabricVersion = MIN_FABRIC_VERSION;
    }
    const versionId = manifest?.versionId || (fabricVersion ? `${mcVersion}-fabric` : mcVersion);
    // Check both the merged version JSON and the copied client JAR
    const versionJsonPath = path.join(paths.versionsDir(), versionId, `${versionId}.json`);
    const versionJarPath  = path.join(paths.versionsDir(), versionId, `${versionId}.jar`);
    return fs.existsSync(versionJsonPath) && fs.existsSync(versionJarPath);
  } catch {
    return false;
  }
});
ipcMain.handle('launch:uninstall', async (_e, { manifest } = {}) => {
  try {
    const mcVersion = manifest?.minecraft || '1.21.5';
    let fabricVersion = manifest?.loader?.type === 'fabric' ? manifest.loader.version : MIN_FABRIC_VERSION;
    if (fabricVersion && compareVersions(fabricVersion, MIN_FABRIC_VERSION) < 0) {
      fabricVersion = MIN_FABRIC_VERSION;
    }
    const versionId = manifest?.versionId || (fabricVersion ? `${mcVersion}-fabric` : mcVersion);
    // Remove the merged profile dir (e.g. 1.21.5-fabric)
    const versionDir = path.join(paths.versionsDir(), versionId);
    if (fs.existsSync(versionDir)) {
      fs.rmSync(versionDir, { recursive: true, force: true });
      log.info('[uninstall] Removido:', versionDir);
    }
    // Also remove the base vanilla dir (e.g. 1.21.5) to force full re-download
    const baseDir = path.join(paths.versionsDir(), mcVersion);
    if (fs.existsSync(baseDir)) {
      fs.rmSync(baseDir, { recursive: true, force: true });
      log.info('[uninstall] Removido base:', baseDir);
    }
    return { ok: true };
  } catch (e) {
    log.error('[uninstall]', e);
    return { ok: false, error: e.message };
  }
});

// ── IPC: Local Mods / Shaders / Resourcepacks ────────────────────────────────
ipcMain.handle('mods:list-all', async () => {
  try {
    const storeData = loadStore();
    const userMods = storeData?.mods?.enabled || {};
    const mandatory = modpack.getMandatoryMods();
    const optional = modpack.getOptionalMods();

    const optionalWithStatus = optional.map((mod) => {
      // Store é a fonte de verdade para o estado enabled/disabled
      let isEnabled = true;
      if (userMods[mod.baseFilename] !== undefined) {
        isEnabled = !!userMods[mod.baseFilename];
      } else {
        isEnabled = mod.isEnabledByDefault ?? true;
      }

      return {
        ...mod,
        isEnabled,
      };
    });

    return {
      mandatory,
      optional: optionalWithStatus,
    };
  } catch (e) {
    log.warn('[mods:list-all] error', e);
    return { mandatory: [], optional: [] };
  }
});

ipcMain.handle('mods:list-local', async () => {
  try {
    const storeData = loadStore();
    const userMods = storeData?.mods?.enabled || {};
    const optional = modpack.getOptionalMods();

    return optional.map((mod) => {
      // Store é a fonte de verdade
      let isEnabled = true;
      if (userMods[mod.baseFilename] !== undefined) {
        isEnabled = !!userMods[mod.baseFilename];
      } else {
        isEnabled = mod.isEnabledByDefault ?? true;
      }

      return {
        filename: mod.filename,
        baseFilename: mod.baseFilename,
        isEnabled,
        size: mod.size,
        mtime: mod.mtime,
      };
    });
  } catch (e) {
    log.warn('[mods:list-local] error', e);
    return [];
  }
});

ipcMain.handle('mods:toggle-local', async (_e, { filename, isEnabled }) => {
  try {
    const dir = paths.modsDir();
    const baseFilename = filename ? filename.replace(/\.disabled$/, '') : '';
    const activePath = path.join(dir, baseFilename);
    const disabledPath = path.join(dir, `${baseFilename}.disabled`);

    log.info('[mods:toggle-local] baseFilename:', baseFilename, 'isEnabled:', isEnabled);
    log.info('[mods:toggle-local] activePath exists:', fs.existsSync(activePath));

    // Atualiza store
    const storeData = loadStore();
    storeData.mods = storeData.mods || {};
    storeData.mods.enabled = storeData.mods.enabled || {};
    storeData.mods.enabled[baseFilename] = isEnabled;
    saveStore(storeData);
    log.info('[mods:toggle-local] store updated:', JSON.stringify(storeData.mods.enabled));

    // Remove qualquer arquivo .disabled da pasta mods
    if (fs.existsSync(disabledPath)) {
      try { fs.unlinkSync(disabledPath); } catch {}
    }

    if (isEnabled) {
      // Se ativado: garante a presença do arquivo .jar na pasta de mods
      if (!fs.existsSync(activePath)) {
        const optionalMods = modpack.getOptionalMods();
        const found = optionalMods.find((m) => m.baseFilename === baseFilename);
        let copied = false;
        if (found && fs.existsSync(found.fullPath)) {
          fs.copyFileSync(found.fullPath, activePath);
          log.info('[mods:toggle-local] Mod ativado e copiado para a pasta de mods:', baseFilename);
          copied = true;
        } else {
          const backupPath = path.join(paths.optionalModsDir(), baseFilename);
          if (fs.existsSync(backupPath)) {
            fs.copyFileSync(backupPath, activePath);
            log.info('[mods:toggle-local] Mod ativado a partir de optionalModsDir:', baseFilename);
            copied = true;
          }
        }
        if (!copied) {
          log.error('[mods:toggle-local] Arquivo do mod não encontrado para ativar:', baseFilename);
          return { ok: false, error: `Arquivo do mod não encontrado: ${baseFilename}` };
        }
      }
    } else {
      // Se desativado: REMOVE totalmente o arquivo .jar da pasta de mods
      if (fs.existsSync(activePath)) {
        try {
          fs.unlinkSync(activePath);
          log.info('[mods:toggle-local] Mod desativado e removido da pasta de mods:', baseFilename);
        } catch (err) {
          log.warn('[mods:toggle-local] Erro ao remover mod desativado:', activePath, err.message);
          return { ok: false, error: `Erro ao remover mod: ${err.message}` };
        }
      }
    }

    return { ok: true, filename: baseFilename, isEnabled };
  } catch (e) {
    log.error('[mods:toggle-local] error', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('shaders:list-local', async () => {
  try {
    const dir = paths.shaderpacksDir();
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir);
    return entries.filter((e) => e.endsWith('.zip') || fs.statSync(path.join(dir, e)).isDirectory());
  } catch (e) {
    return [];
  }
});

// ── IPC: Shaders do catálogo oficial (instalação e seleção) ──────────────────
ipcMain.handle('shaders:list-catalog', () => {
  try {
    const installedDir = paths.shaderpacksDir();
    const installed = new Set(fs.existsSync(installedDir) ? fs.readdirSync(installedDir) : []);
    const catalog = modpack.getShaders().map((s) => ({
      filename: s.filename,
      size: s.size,
      installed: installed.has(s.filename),
    }));
    return { ok: true, catalog };
  } catch (e) {
    log.warn('[shaders:list-catalog] error', e);
    return { ok: false, catalog: [] };
  }
});

ipcMain.handle('shaders:select', (_e, { filename } = {}) => {
  try {
    if (!filename) {
      const storeData = loadStore();
      if (storeData?.mods) { storeData.mods.shader = ''; saveStore(storeData); }
      return { ok: true, active: '' };
    }
    const src = modpack.getShaders().find((s) => s.filename === filename);
    if (!src) return { ok: false, error: 'Shader não encontrado no catálogo oficial' };
    const destDir = paths.shaderpacksDir();
    const dest = path.join(destDir, filename);
    fs.mkdirSync(destDir, { recursive: true });
    if (!fs.existsSync(dest) || fs.statSync(dest).size !== src.size) {
      fs.copyFileSync(src.fullPath, dest);
      log.info('[shaders] Instalado:', filename);
    }
    const storeData = loadStore();
    storeData.mods = storeData.mods || {};
    storeData.mods.shader = filename;
    saveStore(storeData);
    return { ok: true, active: filename };
  } catch (e) {
    log.error('[shaders:select]', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('shaders:remove', (_e, { filename } = {}) => {
  try {
    if (!filename) return { ok: false, error: 'filename não informado' };
    const dest = path.join(paths.shaderpacksDir(), filename);
    if (fs.existsSync(dest)) fs.unlinkSync(dest);
    const storeData = loadStore();
    if (storeData?.mods?.shader === filename) {
      storeData.mods.shader = '';
      saveStore(storeData);
    }
    return { ok: true };
  } catch (e) {
    log.error('[shaders:remove]', e);
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('resourcepacks:list-local', async () => {
  try {
    const dir = paths.resourcepacksDir();
    if (!fs.existsSync(dir)) return [];
    const entries = fs.readdirSync(dir);
    return entries.filter((e) => e.endsWith('.zip') || fs.statSync(path.join(dir, e)).isDirectory());
  } catch (e) {
    return [];
  }
});

// ── IPC: Updater ──────────────────────────────────────────────────────────────
ipcMain.handle('updater:check', () => autoUpdater.checkForUpdates());
ipcMain.handle('updater:install', () => autoUpdater.quitAndInstall());

