// electron/config.js
// Endpoints e constantes centralizadas.
// Em build de release, sobrescreva via variáveis de ambiente.
module.exports = {
  API_BASE:             process.env.EDEN_API_BASE      || 'https://api.eden.net',
  MODPACK_MANIFEST_URL: process.env.EDEN_MODPACK_URL   || 'https://api.eden.net/modpack/manifest.json',
  UPDATE_FEED_URL:      'https://updates.eden.net/launcher',
  SERVER_HOST:          'jogar.eden.net',
  SERVER_PORT:          25565,
  get MS_CLIENT_ID() { return process.env.EDEN_MS_CLIENT_ID || '00000000-0000-0000-0000-000000000000'; },
  get SUPABASE_URL() { return process.env.EDEN_SUPABASE_URL || ''; },
  get SUPABASE_ANON_KEY() { return process.env.EDEN_SUPABASE_ANON_KEY || ''; },
  MS_REDIRECT_URI:      'https://login.microsoftonline.com/common/oauth2/nativeclient',
  LAUNCHER_VERSION:     require('../package.json').version,
};
