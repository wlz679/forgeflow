import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildWithEnv } from './_supabase-build-helper.ts';

test('Header: sync menu rendered when both Clerk and Supabase envs present', () => {
  const { en } = buildWithEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz',
    VITE_SUPABASE_URL: 'https://abc.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  });
  assert.match(en, /data-sync-menu/, 'sync menu attribute should be present');
  assert.match(en, /data-sync-now/, 'sync now button should be present');
  assert.match(en, /data-sync-export/, 'export button should be present');
  assert.match(en, /data-sync-delete/, 'delete button should be present');
});

test('Header: sync menu NOT rendered when only Clerk env present', () => {
  const { en } = buildWithEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz',
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
  });
  assert.doesNotMatch(en, /data-sync-menu/, 'sync menu should NOT be present without Supabase env');
  // Clerk block should still be present
  assert.match(en, /data-clerk-mount/, 'clerk mount should still be present');
});

test('Header: sync menu NOT rendered when only Supabase env present', () => {
  const { en } = buildWithEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: '',
    VITE_SUPABASE_URL: 'https://abc.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  });
  assert.doesNotMatch(en, /data-sync-menu/);
  assert.doesNotMatch(en, /data-clerk-mount/);
});
