// scripts/afterPack.js
// Executado pelo electron-builder após empacotar o app (antes do instalador).
// Liga os fuses de segurança do Electron no exe:
//  - Validação de integridade do app.asar: se alguém alterar qualquer arquivo
//    do app, o launcher não abre (só reinstalando ou via auto-update)
//  - O app só carrega a partir do asar (impede execução de código solto)
//  - Bloqueia ELECTRON_RUN_AS_NODE, NODE_OPTIONS e --inspect (anti-engenharia reversa leve)
const fs = require('fs');
const path = require('path');
const { flipFuses, FuseVersion, FuseV1Options } = require('@electron/fuses');

module.exports = async function afterPack(context) {
  const appOutDir = context.appOutDir;
  const exeName = fs.readdirSync(appOutDir).find((f) => f.endsWith('.exe'));
  if (!exeName) throw new Error('afterPack: exe não encontrado em ' + appOutDir);
  const exePath = path.join(appOutDir, exeName);

  await flipFuses(exePath, {
    version: FuseVersion.V1,
    [FuseV1Options.RunAsNode]: false,
    [FuseV1Options.EnableCookieEncryption]: false,
    [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
    [FuseV1Options.EnableNodeCliInspectArguments]: false,
    [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
    [FuseV1Options.OnlyLoadAppFromAsar]: true,
    [FuseV1Options.LoadBrowserProcessSpecificV8Snapshot]: false,
    [FuseV1Options.GrantFileProtocolExtraPrivileges]: false,
  });

  console.log(`  • fuses de segurança aplicados em ${exeName} (integridade do asar ativada)`);
};
