/**
 * Shared build helper for sync (P3-2) snapshot tests.
 *
 * Why this exists:
 *   - `pnpm build` on Windows leaves stale .mjs modules in dist/ when run
 *     back-to-back. Each subsequent build errors on stale module paths.
 *   - pnpm build takes ~10s. Re-running per test is wasteful.
 *
 * Strategy:
 *   - Build once with the given env variant and cache the output in
 *     module-level state keyed by the env signature.
 *   - Subsequent calls with the same env signature return cached output
 *     (no rebuild).
 *   - Always `rm -rf dist/` before each build to avoid stale module paths.
 *
 * Mirrors `tests/_clerk-build-helper.ts` (P3-1) but takes a generic
 * env object (not hard-coded to Clerk) so we can test all combinations
 * of Clerk + Supabase presence.
 *
 * Used by tests/header-sync-ui.test.ts and tests/baselayout-sync-script.test.ts.
 */
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const root = resolve(import.meta.dirname, '..');
const distPath = resolve(root, 'dist');

interface CacheEntry { sig: string; en: string; zh: string }
const cache: CacheEntry | null = null;

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

function envSig(env: Record<string, string>): string {
  // Stable, sorted signature so different env objects with the same values
  // hit the cache.
  return Object.keys(env).sort().map(k => `${k}=${env[k]}`).join('|');
}

/**
 * Build (or return cached) the en + zh index.html for the given env.
 * Always returns the freshest dist state for the env.
 */
export function buildWithEnv(env: Record<string, string>): { en: string; zh: string } {
  const sig = envSig(env);
  // Per-process cache keyed by env signature.
  // (Test runs are short-lived; one build per env combination is enough.)
  const cacheKey = `_p32_${sig}`;
  const cached = (globalThis as any)[cacheKey] as { en: string; zh: string } | undefined;
  if (cached) return cached;

  runBuild(env);
  const en = readFileSync(resolve(distPath, 'en', 'index.html'), 'utf8');
  const zh = readFileSync(resolve(distPath, 'zh', 'index.html'), 'utf8');
  const result = { en, zh };
  (globalThis as any)[cacheKey] = result;
  return result;
}

export const ROOT = root;

export function getDistAstroDir(): string {
  return resolve(distPath, '_astro');
}

export function readAllHoistedChunks(): string {
  const astroDir = getDistAstroDir();
  const fs = require('node:fs') as typeof import('node:fs');
  const files = fs.readdirSync(astroDir).filter(f => f.startsWith('hoisted.') && f.endsWith('.js'));
  return files.map(f => fs.readFileSync(resolve(astroDir, f), 'utf8')).join('\n');
}
