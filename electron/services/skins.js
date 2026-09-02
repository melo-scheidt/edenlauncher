'use strict';

const fs = require('fs');
const path = require('path');
const { dialog } = require('electron');
const paths = require('./paths');

// Paths for 1.21.5 resource pack (modern MC has 9 default skins)
const DEFAULT_SKINS = [
  'assets/minecraft/textures/entity/player/wide/steve.png',
  'assets/minecraft/textures/entity/player/slim/alex.png',
  'assets/minecraft/textures/entity/player/wide/ari.png',
  'assets/minecraft/textures/entity/player/slim/efe.png',
  'assets/minecraft/textures/entity/player/wide/guene.png',
  'assets/minecraft/textures/entity/player/slim/makena.png',
  'assets/minecraft/textures/entity/player/slim/noor.png',
  'assets/minecraft/textures/entity/player/wide/sunny.png',
  'assets/minecraft/textures/entity/player/wide/zuri.png',
  // Legacy paths
  'assets/minecraft/textures/entity/steve.png',
  'assets/minecraft/textures/entity/alex.png',
];

async function pickAndApplySkin(nickname) {
  const result = await dialog.showOpenDialog({
    title: 'Selecione sua Skin',
    properties: ['openFile'],
    filters: [{ name: 'Imagens (PNG)', extensions: ['png'] }],
  });

  if (result.canceled || result.filePaths.length === 0) {
    return { ok: false, error: 'Cancelado' };
  }

  const skinPath = result.filePaths[0];
  
  // Create skins dir
  const skinsDir = path.join(paths.root(), 'skins');
  if (!fs.existsSync(skinsDir)) fs.mkdirSync(skinsDir, { recursive: true });
  
  const destPath = path.join(skinsDir, `${nickname}.png`);
  fs.copyFileSync(skinPath, destPath);

  // Generate Resource Pack
  const rpDir = path.join(paths.resourcepacksDir(), 'EdenCustomSkin');
  if (!fs.existsSync(rpDir)) fs.mkdirSync(rpDir, { recursive: true });

  const packMeta = {
    pack: {
      pack_format: 46, // 1.21.5 format
      description: "Éden Launcher - Sua Skin Customizada (Offline)"
    }
  };
  fs.writeFileSync(path.join(rpDir, 'pack.mcmeta'), JSON.stringify(packMeta, null, 2));

  // Copy skin to all possible default paths
  for (const t of DEFAULT_SKINS) {
    const p = path.join(rpDir, t);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.copyFileSync(skinPath, p);
  }

  // Read as base64 to send to renderer
  const base64 = fs.readFileSync(skinPath, 'base64');
  return { ok: true, base64: `data:image/png;base64,${base64}` };
}

function getLocalSkinBase64(nickname) {
  const destPath = path.join(paths.root(), 'skins', `${nickname}.png`);
  if (fs.existsSync(destPath)) {
    const base64 = fs.readFileSync(destPath, 'base64');
    return { ok: true, base64: `data:image/png;base64,${base64}` };
  }
  return { ok: false };
}

module.exports = { pickAndApplySkin, getLocalSkinBase64 };
