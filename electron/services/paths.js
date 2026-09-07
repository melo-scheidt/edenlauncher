// electron/services/paths.js
// Diretórios canônicos do launcher Éden.
// Os arquivos do jogo ficam em uma pasta OCULTA de caminho específico no
// LocalAppData — fora das pastas usuais, só acessível por quem conhece o
// caminho. Na primeira execução, a raiz antiga (visível) é migrada para lá.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const HIDDEN_PARENT = 'EdenRuntime';
const GAME_ROOT = path.join(
  process.env.LOCALAPPDATA || app.getPath('userData'),
  HIDDEN_PARENT,
  '.gamedata'
);

const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); return p; };

// Oculta as pastas no Windows (attrib +h) — quem não sabe o caminho não vê
function hideOnWindows() {
  try {
    const base = process.env.LOCALAPPDATA;
    if (!base) return;
    const parent = path.join(base, HIDDEN_PARENT);
    require('child_process').exec(`attrib +h "${parent}" & attrib +h "${GAME_ROOT}"`);
  } catch { /* atrib indisponível — segue sem ocultar */ }
}

// Migração única: move a raiz antiga (userData\eden) para o local oculto
function migrateOldRoot() {
  try {
    const oldRoot = path.join(app.getPath('userData'), 'eden');
    if (fs.existsSync(oldRoot) && !fs.existsSync(GAME_ROOT)) {
      fs.mkdirSync(path.dirname(GAME_ROOT), { recursive: true });
      try {
        fs.renameSync(oldRoot, GAME_ROOT);
      } catch {
        // unidade diferente: copia e remove
        fs.cpSync(oldRoot, GAME_ROOT, { recursive: true });
        fs.rmSync(oldRoot, { recursive: true, force: true });
      }
    }
  } catch { /* em caso de falha, segue com a raiz nova */ }
}

let rootInitialized = false;
const root = () => {
  if (!rootInitialized) {
    rootInitialized = true;
    migrateOldRoot();
    const p = ensure(GAME_ROOT);
    hideOnWindows();
    return p;
  }
  return ensure(GAME_ROOT);
};

module.exports = {
  root:             () => ensure(root()),
  gameDir:          () => ensure(path.join(root(), 'minecraft')),
  modsDir:          () => ensure(path.join(root(), 'minecraft', 'mods')),
  optionalModsDir:  () => ensure(path.join(root(), 'minecraft', 'mods-optional')),
  shaderpacksDir:   () => ensure(path.join(root(), 'minecraft', 'shaderpacks')),
  resourcepacksDir: () => ensure(path.join(root(), 'minecraft', 'resourcepacks')),
  configDir:        () => ensure(path.join(root(), 'minecraft', 'config')),
  versionsDir:      () => ensure(path.join(root(), 'versions')),
  librariesDir:     () => ensure(path.join(root(), 'libraries')),
  assetsDir:        () => ensure(path.join(root(), 'assets')),
  javaDir:          () => ensure(path.join(root(), 'runtime')),
  cacheDir:         () => ensure(path.join(root(), 'cache')),
  logsDir:          () => ensure(path.join(app.getPath('userData'), 'logs')),
  manifestFile:     () => path.join(root(), 'modpack-manifest.json'),
  authFile:         () => path.join(root(), 'auth.json'),
};
