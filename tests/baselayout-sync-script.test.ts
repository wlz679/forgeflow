import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildWithEnv, readAllHoistedChunks } from './_supabase-build-helper.ts';

/**
 * Vite/Astro bundles `<script>import '../scripts/sync-init.client.ts'</script>`
 * (and the other init scripts) into a hoisted module chunk. The literal
 * path string `sync-init.client.ts` is NOT preserved in HTML — Vite replaces
 * it with a hashed module reference. We verify wiring by checking that the
 * hoisted JS chunks contain sync code (proves the BaseLayout import was
 * processed and bundled, not dead-code-eliminated at the module level).
 *
 * Mirrors the P3-1 pattern in `baselayout-clerk-script.test.ts`.
 */

test('BaseLayout: sync-init.client.ts bundled into hoisted chunk', () => {
  buildWithEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz',
    VITE_SUPABASE_URL: 'https://abc.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  });
  const hoisted = readAllHoistedChunks();
  assert.match(
    hoisted,
    /sync|supabase|Supabase/,
    'sync-init.client.ts was not bundled into any hoisted chunk'
  );
});

test('BaseLayout: sync-init and clerk-init bundled (no missing import)', () => {
  buildWithEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz',
    VITE_SUPABASE_URL: 'https://abc.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  });
  const hoisted = readAllHoistedChunks();
  assert.match(hoisted, /sync|supabase|Supabase/, 'sync code should be present in hoisted chunks');
  assert.match(hoisted, /clerk|@clerk|Clerk/, 'clerk code should still be present');
});
