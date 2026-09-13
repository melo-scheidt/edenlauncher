// electron/services/paths.js
// Diretórios canônicos do launcher Éden.
// Os arquivos do jogo ficam em uma pasta OCULTA de caminho específico,
// dentro da pasta de sistema do Windows no perfil do usuário, com nome
// de pasta de sistema (parece caminho interno do Windows, mas é gravável
// sem permissão de administrador):
//   AppData\Local\Microsoft\Windows\System32
// As pastas Microsoft/Windows de verdade não são alteradas. As raízes
// antigas são migradas automaticamente na primeira execução.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const GAME_ROOT = path.join(
  process.env.LOCALAPPDATA || app.getPath('userData'),
  'Microsoft', 'Windows', 'System32'
);

const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); return p; };

// Oculta a nossa pasta System32 no Windows (attrib +h) — as pastas
// Microsoft/Windows de verdade não são alteradas, só a nossa subpasta
function hideOnWindows() {
  try {
    require('child_process').exec(`attrib +h "${GAME_ROOT}"`);
  } catch { /* attrib indisponível — segue sem ocultar */ }
}

// Migração única: move a primeira raiz antiga existente para o local novo.
// Ordem: .boot (0.5.20+), EdenRuntime\.gamedata (0.5.18-19) e o original
// userData\eden (versões anteriores).
function migrateOldRoot() {
  if (fs.existsSync(GAME_ROOT)) return;
  const base = process.env.LOCALAPPDATA || '';
  const oldRoots = [
    path.join(base, 'Microsoft', 'Windows', '.boot'),
    path.join(base, 'EdenRuntime', '.gamedata'),
    path.join(app.getPath('userData'), 'eden'),
  ];
  for (const old of oldRoots) {
    try {
      if (!old || !fs.existsSync(old)) continue;
      fs.mkdirSync(path.dirname(GAME_ROOT), { recursive: true });
      try {
        fs.renameSync(old, GAME_ROOT);
      } catch {
        // unidade diferente: copia e remove
        fs.cpSync(old, GAME_ROOT, { recursive: true });
        fs.rmSync(old, { recursive: true, force: true });
      }
      // remove as pastas legadas que ficaram vazias
      // (.boot da 0.5.20 e EdenRuntime da 0.5.18)
      try {
        const base2 = process.env.LOCALAPPDATA || '';
        for (const legacy of [
          path.join(base2, 'Microsoft', 'Windows', '.boot'),
          path.join(base2, 'EdenRuntime'),
        ]) {
          if (fs.existsSync(legacy) && fs.readdirSync(legacy).length === 0) {
            fs.rmdirSync(legacy);
          }
        }
      } catch {}
      return;
    } catch { /* tenta a próxima raiz antiga */ }
  }
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
