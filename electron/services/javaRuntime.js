// electron/services/javaRuntime.js
// Baixa e instala automaticamente o Java 21 (Adoptium Temurin) no diretório
// de runtime do launcher caso ainda não exista.
//
// O Java é extraído em: <userData>/eden/runtime/
// O executável final fica em:
//   Windows: <userData>/eden/runtime/bin/java.exe
//   Linux:   <userData>/eden/runtime/bin/java
//   macOS:   <userData>/eden/runtime/bin/java

'use strict';

const fs     = require('fs');
const path   = require('path');
const fetch  = require('node-fetch');
const AdmZip = require('adm-zip');
const log    = require('electron-log');
const paths  = require('./paths');

// ── Adoptium API ──────────────────────────────────────────────────────────────
// https://api.adoptium.net/docs/swagger
const ADOPTIUM_API = 'https://api.adoptium.net/v3';
const JAVA_MAJOR   = 21; // Required by Minecraft 1.21+

const OS_MAP = {
  win32:  'windows',
  darwin: 'mac',
  linux:  'linux',
};

const ARCH_MAP = {
  x64:   'x64',
  arm64: 'aarch64',
  ia32:  'x32',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

async function downloadWithProgress(url, dest, emit) {
  const res = await fetch(url, { timeout: 60000, follow: 5 });
  if (!res.ok) throw new Error(`HTTP ${res.status} ao baixar Java de ${url}`);

  const total    = Number(res.headers.get('content-length') || 0);
  let   received = 0;

  fs.mkdirSync(path.dirname(dest), { recursive: true });

  await new Promise((resolve, reject) => {
    const out = fs.createWriteStream(dest);
    res.body.on('data', (chunk) => {
      received += chunk.length;
      if (emit && total) emit({ progress: received / total, received, total });
    });
    res.body.pipe(out);
    res.body.on('error', reject);
    out.on('finish', resolve);
    out.on('error', reject);
  });
}

function extractArchive(archivePath, destDir, emit) {
  if (emit) emit({ msg: 'Extraindo Java…' });
  fs.mkdirSync(destDir, { recursive: true });

  const zip = new AdmZip(archivePath);
  const entries = zip.getEntries();
  const total = entries.length;
  let done = 0;

  // The zip contains a single top-level dir like jdk-21.0.x+XX/
  // We strip that prefix so the contents land directly in destDir
  let topDir = '';
  const firstEntry = entries[0]?.entryName || '';
  const sep = firstEntry.indexOf('/');
  if (sep !== -1) topDir = firstEntry.slice(0, sep + 1);

  for (const entry of entries) {
    done++;
    if (entry.isDirectory) continue;
    const relPath = entry.entryName.startsWith(topDir)
      ? entry.entryName.slice(topDir.length)
      : entry.entryName;
    if (!relPath) continue;
    const outPath = path.join(destDir, relPath);
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, entry.getData());

    if (done % 200 === 0 || done === total) {
      if (emit) emit({ msg: `Extraindo Java… (${done}/${total})`, done, total });
    }
  }

  // On Linux/macOS make the java binary executable
  const javaBin = path.join(destDir, 'bin', 'java');
  if (fs.existsSync(javaBin)) {
    try { fs.chmodSync(javaBin, 0o755); } catch {}
  }
}

// ── Main export ───────────────────────────────────────────────────────────────

/**
 * ensureJava21({ onEvent })
 *
 * Checks if Java 21 is already bundled. If not, downloads it from Adoptium.
 * Returns the absolute path to the java executable.
 *
 * @param {object} [opts]
 * @param {function} [opts.onEvent] - progress callback: ({ phase, msg, progress, done, total })
 * @returns {Promise<string>} path to java executable
 */
async function ensureJava21({ onEvent = () => {} } = {}) {
  const emit = (extra) => {
    log.info('[java]', extra.msg || extra.phase || '');
    onEvent({ phase: 'java:' + (extra.phase || 'progress'), ...extra });
  };

  const runtimeDir = paths.javaDir();
  const javaExe = path.join(
    runtimeDir, 'bin',
    process.platform === 'win32' ? 'java.exe' : 'java'
  );

  // Already installed?
  if (fs.existsSync(javaExe)) {
    log.info('[java] Java 21 já instalado em', javaExe);
    return javaExe;
  }

  // ── Resolve latest release asset URL from Adoptium API ─────────────────────
  const os   = OS_MAP[process.platform]   || 'linux';
  const arch = ARCH_MAP[process.arch]     || 'x64';
  const imageType = 'jre'; // We only need the JRE, not the full JDK

  emit({ phase: 'resolve', msg: `Buscando Java ${JAVA_MAJOR} (${os}/${arch})…` });

  const apiUrl = `${ADOPTIUM_API}/assets/latest/${JAVA_MAJOR}/hotspot` +
                 `?os=${os}&architecture=${arch}&image_type=${imageType}&vendor=eclipse`;

  log.info('[java] Consultando Adoptium:', apiUrl);
  const apiRes = await fetch(apiUrl);
  if (!apiRes.ok) throw new Error(`Adoptium API: ${apiRes.status}`);

  const assets = await apiRes.json();
  if (!Array.isArray(assets) || assets.length === 0) {
    throw new Error(`Nenhum asset Java ${JAVA_MAJOR} encontrado para ${os}/${arch}`);
  }

  // Prefer .zip on Windows, .tar.gz otherwise (but AdmZip only handles .zip)
  // Adoptium provides .zip for Windows, so pick accordingly
  const asset = assets.find((a) => {
    const ext = a.binary?.package?.name || '';
    return process.platform === 'win32' ? ext.endsWith('.zip') : ext.endsWith('.tar.gz') || ext.endsWith('.zip');
  }) || assets[0];

  const pkg  = asset.binary?.package;
  if (!pkg?.link) throw new Error('Link de download Java não encontrado na resposta Adoptium');

  const dlUrl  = pkg.link;
  const dlName = pkg.name || `java21.zip`;
  const tmpFile = path.join(paths.cacheDir(), dlName);

  emit({ phase: 'download', msg: `Baixando Java 21 JRE (${Math.round((pkg.size || 0) / 1024 / 1024)} MB)…` });
  log.info('[java] Baixando:', dlUrl);

  await downloadWithProgress(dlUrl, tmpFile, (p) =>
    emit({ phase: 'download', msg: `Java 21 JRE`, progress: p.progress })
  );

  // ── Extract ─────────────────────────────────────────────────────────────────
  if (dlName.endsWith('.zip')) {
    extractArchive(tmpFile, runtimeDir, (e) => emit({ phase: 'extract', ...e }));
  } else {
    // .tar.gz — use tar (available on modern Windows 10+ via built-in bsdtar)
    emit({ phase: 'extract', msg: 'Extraindo Java (.tar.gz)…' });
    const { execFileSync } = require('child_process');
    try {
      execFileSync('tar', ['-xzf', tmpFile, '-C', runtimeDir, '--strip-components=1'], {
        stdio: 'pipe',
      });
      const javaBin = path.join(runtimeDir, 'bin', 'java');
      try { fs.chmodSync(javaBin, 0o755); } catch {}
    } catch (e) {
      throw new Error(`Falha ao extrair Java: ${e.message}`);
    }
  }

  // Clean up archive
  try { fs.unlinkSync(tmpFile); } catch {}

  if (!fs.existsSync(javaExe)) {
    throw new Error(`Extração concluída mas java.exe não encontrado em ${javaExe}`);
  }

  emit({ phase: 'done', msg: 'Java 21 instalado com sucesso!' });
  log.info('[java] Pronto:', javaExe);
  return javaExe;
}

module.exports = { ensureJava21 };
