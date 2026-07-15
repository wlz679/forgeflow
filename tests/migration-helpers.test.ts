/**
 * P3-3 unit tests for src/lib/migration.ts idempotency helpers.
 *
 * Pure unit tests — no fetch, no DOM, no child process. Stubs `globalThis.localStorage`
 * via a simple Map-backed shim that survives across tests (Node `node:test` runs
 * all tests in one process unless --test-concurrency=1 is set AND each is in a
 * separate file; we rely on per-test setup that clears the Map).
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  hasMigrated,
  setMigrated,
  clearMigrated,
  MIGRATION_KEY_PREFIX_TEST,
} from '../src/lib/migration.ts';

// Per-test storage Map (Map-backed shim that implements the LS interface we use).
const lsStore = new Map<string, string>();
(globalThis as any).localStorage = {
  getItem: (k: string) => (lsStore.has(k) ? lsStore.get(k)! : null),
  setItem: (k: string, v: string) => { lsStore.set(k, v); },
  removeItem: (k: string) => { lsStore.delete(k); },
  clear: () => { lsStore.clear(); },
  key: (i: number) => Array.from(lsStore.keys())[i] ?? null,
  get length() { return lsStore.size; },
} as any;

// Each test starts with a clean LS to avoid cross-test pollution.
test.beforeEach(() => { lsStore.clear(); });

test('hasMigrated returns false when no flag set', () => {
  assert.equal(hasMigrated('user_abc'), false);
});

test('setMigrated writes ISO timestamp under correct key', () => {
  const before = new Date().toISOString();
  setMigrated('user_abc');
  const key = MIGRATION_KEY_PREFIX_TEST + 'user_abc';
  assert.ok(lsStore.has(key), `expected ${key} to exist in localStorage`);
  const stamp = lsStore.get(key)!;
  assert.match(stamp, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/, 'should be ISO timestamp');
  assert.ok(stamp >= before, 'stamp should be >= before-time');
});

test('hasMigrated returns true after setMigrated', () => {
  setMigrated('user_abc');
  assert.equal(hasMigrated('user_abc'), true);
});

test('clearMigrated removes the flag', () => {
  setMigrated('user_abc');
  assert.equal(hasMigrated('user_abc'), true);
  clearMigrated('user_abc');
  assert.equal(hasMigrated('user_abc'), false);
});

test('different userIds get independent flags', () => {
  setMigrated('user_a');
  assert.equal(hasMigrated('user_a'), true);
  assert.equal(hasMigrated('user_b'), false, 'user_b should not see user_a flag');
  setMigrated('user_b');
  assert.equal(hasMigrated('user_b'), true);
  // user_a unchanged after user_b set
  assert.equal(hasMigrated('user_a'), true);
});

test('safe when localStorage is unavailable', () => {
  const orig = (globalThis as any).localStorage;
  delete (globalThis as any).localStorage;
  try {
    assert.equal(hasMigrated('user_abc'), false, 'hasMigrated should be safe');
    setMigrated('user_abc'); // should not throw
    clearMigrated('user_abc'); // should not throw
  } finally {
    (globalThis as any).localStorage = orig;
  }
});
