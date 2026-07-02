/**
 * P3-2 holistic review fix-wave: real click-behavior tests for the
 * Header sync menu UI wiring.
 *
 * Pre-fix-wave state: sync-init.client.ts never queried the data-sync-*
 * elements. Buttons existed in HTML but had no click handlers — dead-end UI.
 *
 * Post-fix-wave: wireSyncMenu() (in sync-init.client.ts) is called from
 * pollForAuthAndPull() once Clerk reports a signed-in user, and it:
 *   1. removes the `hidden` attribute from [data-sync-menu]
 *   2. binds click handlers on [data-sync-now] / [data-sync-export] / [data-sync-delete]
 *
 * These tests exercise the wired behavior end-to-end via a child-process
 * harness (`tests/_sync-menu-child.ts`) that stubs DOM + Clerk + fetch so
 * we can both (a) observe the wiring state, and (b) actually click buttons
 * and observe fetch invocations.
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_sync-menu-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): { ok: boolean; error?: string; result: any } {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  const stdout = r.stdout?.toString() ?? '';
  const stderr = r.stderr?.toString() ?? '';
  let result: any = {};
  try {
    const lastLine = stdout.trim().split('\n').filter(Boolean).pop() ?? '{}';
    result = JSON.parse(lastLine);
  } catch {
    result = { raw: stdout };
  }
  return {
    ok: r.status === 0,
    error: r.status === 0 ? undefined : stderr || stdout,
    result,
  };
}

const SUPABASE_ENV = {
  VITE_SUPABASE_URL: 'https://test.supabase.co',
  VITE_SUPABASE_ANON_KEY: 'anon-test-key',
  PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123',
};

test('wireSyncMenu: when signed in, removes hidden + binds 3 click listeners', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'wires-buttons-when-signed-in',
    LOGGED_IN: '1',
    LANG_PREFIX: '/en/',
    ...SUPABASE_ENV,
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.menuHidden, false, 'data-sync-menu should not be hidden after wire');
  assert.equal(result.nowClickListeners, 1, 'data-sync-now should have 1 click listener');
  assert.equal(result.exportClickListeners, 1, 'data-sync-export should have 1 click listener');
  assert.equal(result.deleteClickListeners, 1, 'data-sync-delete should have 1 click listener');
});

test('wireSyncMenu: when NOT signed in, menu stays hidden and no listeners bound', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'no-wire-when-not-signed-in',
    LOGGED_IN: '',
    LANG_PREFIX: '/en/',
    ...SUPABASE_ENV,
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.menuHidden, true, 'data-sync-menu should remain hidden when not signed in');
  assert.equal(result.wired, false, 'no click listeners should be bound when not signed in');
  assert.equal(result.nowClickListeners, 0);
});

test('click [data-sync-now] → syncNow fetches all 3 collections (pull+push)', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'sync-now',
    LOGGED_IN: '1',
    LANG_PREFIX: '/en/',
    ...SUPABASE_ENV,
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.menuHidden, false, 'menu should be visible after sync triggered');
  // syncNow: 3 pulls (GET) + 3 pushes (POST) = 6 fetch calls
  assert.equal(result.fetchCalls, 6, `expected 6 fetch calls (3 pull + 3 push), got ${result.fetchCalls}`);
  assert.equal(result.pullCalls, 3, 'expected 3 pull (GET) calls');
  assert.equal(result.pushCalls, 3, 'expected 3 push (POST) calls');
});

test('click [data-sync-export] → exportAll fetches 3 pulls then triggers download', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'export-all',
    LOGGED_IN: '1',
    LANG_PREFIX: '/en/',
    ...SUPABASE_ENV,
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.menuHidden, false);
  // exportAll: 3 pulls (GET) only — no pushes
  assert.equal(result.fetchCalls, 3, `expected 3 fetch calls, got ${result.fetchCalls}`);
  assert.equal(result.allPulls, true, 'all calls should be GET pulls');
});

test('click [data-sync-delete] with confirm=true → 3 DELETE calls', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'delete',
    LOGGED_IN: '1',
    LANG_PREFIX: '/en/',
    CONFIRM_RETURN: '1',
    ...SUPABASE_ENV,
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.menuHidden, false);
  // deleteCloudData: 3 DELETE calls
  assert.equal(result.fetchCalls, 3, `expected 3 delete calls, got ${result.fetchCalls}`);
  assert.equal(result.deleteCalls, 3, 'expected 3 DELETE method calls');
});

test('click [data-sync-delete] with confirm=false → no fetch (user cancelled)', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'delete-cancelled',
    LOGGED_IN: '1',
    LANG_PREFIX: '/en/',
    CONFIRM_RETURN: '',  // confirm() returns false → cancel
    ...SUPABASE_ENV,
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.fetchCalls, 0, 'no fetch should happen when user cancels confirm');
});
