// Idempotent font downloader. Safe to re-run.
// Downloads og:image fonts to scripts/fonts/. Committed to git so CI is offline-safe.
//
// Sources (stable GitHub-hosted):
//   - Inter (rsms/inter v4.1 release): the static OTF files were moved out of
//     `docs/font-files/` in v4.x. We fetch the official release ZIP and extract
//     three weights from extras/otf/. This is the upstream distribution.
//   - Noto Sans SC (notofonts/noto-cjk Sans2.004 release): the per-script asset
//     `18_NotoSansSC.zip` is ~48 MB; we extract NotoSansSC-Regular.otf from it.
//     The raw github.com endpoint is heavily rate-limited in CI, so the release
//     asset path (which goes through objects.githubusercontent.com) is much
//     more reliable.
//
// Noto Color Emoji is intentionally NOT in the FONTS list — satori 0.26 cannot
// load COLR/CBDT color fonts (NotoColorEmoji.ttf is a COLRv1 file), and we
// substitute Twemoji PNGs via satori's `graphemeImages` option at build time
// instead. See the header comment in scripts/build-og-images.ts for details.
//
// Re-runs are no-ops: any font file already in scripts/fonts/ is left untouched.

import { mkdirSync, existsSync, createWriteStream, renameSync, readdirSync } from 'node:fs';
import { dirname, join, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { get } from 'node:https';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FONTS_DIR = join(__dirname, 'fonts');

const USER_AGENT = 'forgeflowkit-og-fonts';

// Release assets (preferred — they bypass the github.com raw rate limiter).
const INTER_RELEASE_URL = 'https://github.com/rsms/inter/releases/download/v4.1/Inter-4.1.zip';
const INTER_WEIGHTS = ['Regular', 'Bold', 'Black']; // extracted from extras/otf/

const NOTO_SC_RELEASE_URL = 'https://github.com/notofonts/noto-cjk/releases/download/Sans2.004/18_NotoSansSC.zip';
const NOTO_SC_FILE = 'NotoSansSC-Regular.otf'; // extracted from top-level

function downloadToFile(url, dest) {
  return new Promise((resolve, reject) => {
    const attempt = (url) => {
      get(url, { headers: { 'User-Agent': USER_AGENT } }, (res) => {
        if (res.statusCode === 302 || res.statusCode === 301) {
          res.resume();
          return setTimeout(() => attempt(res.headers.location), 50);
        }
        if (res.statusCode !== 200) {
          return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        }
        const stream = createWriteStream(dest);
        res.pipe(stream);
        stream.on('finish', () => stream.close(resolve));
        stream.on('error', reject);
      }).on('error', reject);
    };
    attempt(url);
  });
}

// Use the system `unzip` if available — keeps the script dependency-free and
// the bulk of the heavy lifting (central directory parsing, large-file handling)
// out of this file. On Windows Git Bash, `unzip` ships with the MSYS runtime.
function unzipToDir(zipPath, destDir) {
  const res = spawnSync('unzip', ['-o', '-q', zipPath, '-d', destDir], {
    stdio: ['ignore', 'inherit', 'inherit'],
  });
  if (res.status !== 0) {
    throw new Error(`unzip exited ${res.status}`);
  }
}

function listZipEntries(zipPath) {
  const res = spawnSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' });
  if (res.status !== 0) throw new Error(`unzip -Z1 exited ${res.status}`);
  return res.stdout.split(/\r?\n/).filter(Boolean);
}

async function downloadAndExtractZip(zipUrl, tmpZip, workDir, entriesToExtract) {
  console.log(`↓ Downloading ZIP: ${zipUrl}`);
  await downloadToFile(zipUrl, tmpZip);
  const entries = listZipEntries(tmpZip);
  const present = new Set(entries);
  for (const e of entriesToExtract) {
    if (!present.has(e)) {
      throw new Error(`ZIP ${tmpZip} is missing expected entry: ${e}`);
    }
  }
  console.log(`↓ Extracting ${entriesToExtract.length} entries to ${workDir}`);
  unzipToDir(tmpZip, workDir);
}

async function main() {
  mkdirSync(FONTS_DIR, { recursive: true });

  const wantInter = INTER_WEIGHTS.map((w) => `Inter-${w}.otf`);
  const needInter = wantInter.filter((n) => !existsSync(join(FONTS_DIR, n)));

  if (needInter.length > 0) {
    // Extract each needed weight to a staging dir under scripts/fonts/.staging
    // then move into place. Avoids name collisions (different releases may
    // share basenames like Inter-Regular.otf).
    const staging = join(FONTS_DIR, '.staging-inter');
    mkdirSync(staging, { recursive: true });
    const tmpZip = join(FONTS_DIR, '.staging-inter.zip');
    try {
      await downloadAndExtractZip(INTER_RELEASE_URL, tmpZip, staging,
        needInter.map((n) => `extras/otf/${n}`));
      for (const name of needInter) {
        const src = join(staging, 'extras', 'otf', name);
        const dest = join(FONTS_DIR, name);
        renameSync(src, dest);
        console.log(`✓ ${name}`);
      }
    } finally {
      // Best-effort cleanup of staging dir + tmp zip.
      try { spawnSync('rm', ['-rf', staging]); } catch { /* ignore */ }
      try { if (existsSync(tmpZip)) spawnSync('rm', [tmpZip]); } catch { /* ignore */ }
    }
  } else {
    for (const n of wantInter) console.log(`✓ ${n} already exists, skipping`);
  }

  // Noto Sans SC: download the SC-only release zip, extract the one Regular OTF.
  if (!existsSync(join(FONTS_DIR, NOTO_SC_FILE))) {
    const staging = join(FONTS_DIR, '.staging-notosc');
    mkdirSync(staging, { recursive: true });
    const tmpZip = join(FONTS_DIR, '.staging-notosc.zip');
    try {
      await downloadAndExtractZip(NOTO_SC_RELEASE_URL, tmpZip, staging, [NOTO_SC_FILE]);
      // The release zip places files at the top level.
      const src = join(staging, NOTO_SC_FILE);
      if (!existsSync(src)) {
        // Fallback: find the file anywhere in the staging tree (in case a future
        // release nests it under OTF/SubsetOTF/SC/...).
        const found = readdirSync(staging, { recursive: true })
          .find((p) => basename(String(p)) === NOTO_SC_FILE);
        if (!found) throw new Error(`Could not locate ${NOTO_SC_FILE} in extracted ZIP`);
        renameSync(String(found), join(FONTS_DIR, NOTO_SC_FILE));
      } else {
        renameSync(src, join(FONTS_DIR, NOTO_SC_FILE));
      }
      console.log(`✓ ${NOTO_SC_FILE}`);
    } finally {
      try { spawnSync('rm', ['-rf', staging]); } catch { /* ignore */ }
      try { if (existsSync(tmpZip)) spawnSync('rm', [tmpZip]); } catch { /* ignore */ }
    }
  } else {
    console.log(`✓ ${NOTO_SC_FILE} already exists, skipping`);
  }

  console.log('\nAll fonts ready in scripts/fonts/.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
