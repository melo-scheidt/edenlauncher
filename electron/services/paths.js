// electron/services/paths.js
// Diretórios canônicos do launcher Éden.
const { app } = require('electron');
const path = require('path');
const fs = require('fs');

const root = () => path.join(app.getPath('userData'), 'eden');
const ensure = (p) => { if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true }); return p; };

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
  offlineAccountsFile: () => path.join(root(), 'offline_accounts.json'),
};
