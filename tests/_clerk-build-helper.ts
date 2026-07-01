/**
 * Shared build helper for snapshot tests in P3-1 Task 4.
 *
 * Why this exists:
 *   - `pnpm build` on Windows leaves stale .mjs modules in dist/ when run
 *     back-to-back. Each subsequent build errors on stale module paths.
 *   - pnpm build takes ~10s. Re-running per test is wasteful.
 *
 * Strategy:
 *   - Build once with `PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xyz` and cache
 *     the output in module-level state.
 *   - Subsequent calls return cached output (no rebuild).
 *   - Always `rm -rf dist/` before each build to avoid stale module paths.
 *
 * Used by tests/header-clerk-render.test.ts and tests/baselayout-clerk-script.test.ts.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { readFileSync, existsSync, rmSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');
const distPath = resolve(root, 'dist');

let cachedEn: string | null = null;
let cachedZh: string | null = null;

function cleanDist(): void {
  if (existsSync(distPath)) {
    try {
      rmSync(distPath, { recursive: true, force: true });
    } catch {
      // Windows file lock race — try again on next call.
    }
  }
}

function runBuild(env: Record<string, string>): void {
  cleanDist();
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    env: {
      ...process.env,
      ...env,
      FORCE_COLOR: '0',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    throw new Error(`build failed: ${r.stderr?.toString()}`);
  }
}

export function buildWithEnvSet(lang: 'en' | 'zh'): string {
  const distIndex = resolve(distPath, lang, 'index.html');
  if (lang === 'en' && cachedEn && existsSync(distIndex)) return cachedEn;
  if (lang === 'zh' && cachedZh && existsSync(distIndex)) return cachedZh;

  runBuild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz' });
  const html = readFileSync(distIndex, 'utf8');
  if (lang === 'en') cachedEn = html;
  else cachedZh = html;
  return html;
}

export function buildWithEnvMissing(lang: 'en' | 'zh' = 'en'): string {
  const envPath = resolve(root, '.env.test-tmp');
  const fs = require('node:fs') as typeof import('node:fs');
  fs.writeFileSync(envPath, 'PUBLIC_CLERK_PUBLISHABLE_KEY=');
  try {
    runBuild({ PUBLIC_CLERK_PUBLISHABLE_KEY: '' });
    return readFileSync(resolve(distPath, lang, 'index.html'), 'utf8');
  } finally {
    if (existsSync(envPath)) fs.unlinkSync(envPath);
  }
}

export function getDistAstroDir(): string {
  return resolve(distPath, '_astro');
}

export function readAllHoistedChunks(): string {
  const astroDir = getDistAstroDir();
  const fs = require('node:fs') as typeof import('node:fs');
  const files = fs.readdirSync(astroDir).filter(f => f.startsWith('hoisted.') && f.endsWith('.js'));
  return files.map(f => fs.readFileSync(resolve(astroDir, f), 'utf8')).join('\n');
}