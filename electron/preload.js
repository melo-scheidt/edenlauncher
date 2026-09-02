// electron/preload.js
// Bridge segura entre o processo principal e o renderer.
// contextBridge.exposeInMainWorld garante que o renderer não acesse Node diretamente.

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('eden', {
  isElectron: true,

  store: {
    get: (k)    => ipcRenderer.invoke('store:get', k),
    set: (k, v) => ipcRenderer.invoke('store:set', k, v),
  },

  dialog: {
    pickJava: () => ipcRenderer.invoke('dialog:pick-java'),
  },

  logs: {
    read:       () => ipcRenderer.invoke('logs:read'),
    openFolder: () => ipcRenderer.invoke('logs:open-folder'),
  },

  shell: {
    openExternal: (url) => ipcRenderer.invoke('shell:open-external', url),
  },

  app: {
    getInfo: () => ipcRenderer.invoke('app:get-info'),
    resize:  (w, h) => ipcRenderer.invoke('app:resize', w, h),
  },

  auth: {
    login:    (nick, pass, email)   => ipcRenderer.invoke('auth:login',    nick, pass, email),
    register: (nick, pass, email)   => ipcRenderer.invoke('auth:register', nick, pass, email),
    current:  ()           => ipcRenderer.invoke('auth:current'),
    logout:   ()           => ipcRenderer.invoke('auth:logout'),
  },

  modpack: {
    fetchManifest: ()  => ipcRenderer.invoke('modpack:fetch-manifest'),
    // Alias both names for backwards compatibility
    cached:        ()  => ipcRenderer.invoke('modpack:cached'),
    fetchCached:   ()  => ipcRenderer.invoke('modpack:cached'),
    sync:          (m) => ipcRenderer.invoke('modpack:sync', m),
    onProgress:    (cb) => ipcRenderer.on('modpack:progress', (_, p) => cb(p)),
  },

  launch: {
    start:   (payload) => ipcRenderer.invoke('launch:start', payload),
    onEvent: (cb)      => ipcRenderer.on('launch:event', (_, e) => cb(e)),
    isInstalled: (opts) => ipcRenderer.invoke('launch:is-installed', opts),
    uninstall: (opts) => ipcRenderer.invoke('launch:uninstall', opts),
  },

  skins: {
    pick:     (nickname) => ipcRenderer.invoke('dialog:pick-skin', nickname),
    getLocal: (nickname) => ipcRenderer.invoke('skins:get-local', nickname),
  },

  mods: {
    listAll:            ()                    => ipcRenderer.invoke('mods:list-all'),
    listLocal:          ()                    => ipcRenderer.invoke('mods:list-local'),
    toggleLocal:        (filename, isEnabled) => ipcRenderer.invoke('mods:toggle-local', { filename, isEnabled }),
  },

  shaders: {
    listCatalog: ()        => ipcRenderer.invoke('shaders:list-catalog'),
    select:      (opts)    => ipcRenderer.invoke('shaders:select', opts),
    remove:      (opts)    => ipcRenderer.invoke('shaders:remove', opts),
    listLocal:   ()        => ipcRenderer.invoke('shaders:list-local'),
  },

  resourcepacks: {
    listLocal:  () => ipcRenderer.invoke('resourcepacks:list-local'),
  },

  updater: {
    check:       ()   => ipcRenderer.invoke('updater:check'),
    install:     ()   => ipcRenderer.invoke('updater:install'),
    onAvailable: (cb) => ipcRenderer.on('updater:available', (_, i) => cb(i)),
    onProgress:  (cb) => ipcRenderer.on('updater:progress',  (_, p) => cb(p)),
    onReady:     (cb) => ipcRenderer.on('updater:ready',     ()     => cb()),
    onError:     (cb) => ipcRenderer.on('updater:error',     (_, e) => cb(e)),
  },
});
