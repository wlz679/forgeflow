import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildWithEnvSet, readAllHoistedChunks } from './_clerk-build-helper';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

/**
 * Vite/Astro bundles `<script>import '../scripts/clerk-init.client.ts'</script>`
 * (and the other 3 init scripts) into a hoisted module chunk. The literal
 * path string `clerk-init.client` is NOT preserved in HTML — Vite replaces
 * it with a hashed module reference. We verify wiring by checking that the
 * hoisted JS chunks contain Clerk SDK code (proves the BaseLayout import
 * was processed and bundled, not dead-code-eliminated at the module level).
 */

// P15 polish: skip cleanly when env not set (local dev without Clerk config)
const skipIfNoClerkEnv = () => {
  if (!process.env.PUBLIC_CLERK_PUBLISHABLE_KEY) return true;
  return false;
};

// P23b: skip-guard for build-dependent tests. Wall-clock budget per
// pnpm build invocation is unbounded; CI runs these with
// RUN_BUILD_TESTS=1 (via `pnpm test:build`). Local dev skips them.
const skipIfNoBuildTests = (): boolean => !process.env.RUN_BUILD_TESTS;

test('BaseLayout injects clerk-init.client.ts script', () => {
  if (skipIfNoClerkEnv()) return; // skip when env missing
  if (skipIfNoBuildTests()) return; // P23b: gate build-dependent test
  // Trigger build (cached).
  buildWithEnvSet('en');
  const hoisted = readAllHoistedChunks();
  assert.match(
    hoisted,
    /clerk|@clerk|Clerk/,
    'clerk-init.client.ts was not bundled into any hoisted chunk'
  );
});

test('BaseLayout does not duplicate clerk-init script', () => {
  if (skipIfNoClerkEnv()) return; // skip when env missing
  if (skipIfNoBuildTests()) return; // P23b: gate build-dependent test
  buildWithEnvSet('en');
  const astroDir = resolve(root, 'dist', '_astro');
  const files = readdirSync(astroDir).filter(f => f.startsWith('hoisted.') && f.endsWith('.js'));
  const chunksWithClerk = files.filter(f =>
    /clerk|@clerk|Clerk/.test(readFileSync(resolve(astroDir, f), 'utf8'))
  );
  assert.ok(chunksWithClerk.length >= 1, 'no chunk contains clerk code');
  assert.ok(
    chunksWithClerk.length <= 2,
    `clerk-init duplicated across ${chunksWithClerk.length} chunks: ${chunksWithClerk.join(', ')}`
  );
});
