/**
 * P3-3 integration tests for src/scripts/migration.client.ts maybeMigrate().
 *
 * 5 scenarios — all via child-process isolation per P3-1 / P3-2 lesson
 * (no jsdom; per-test child process gives fresh module state, fresh Clerk
 * mock, fresh fetch mock).
 *
 * Run with `--test-concurrency=1` for Windows stability (P3-1 Task 4 lesson).
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_migration-child.ts');
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

test('migration: empty LS + empty cloud → 6 fetches but no toast (cross-device still pulls)', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'empty-ls-empty-cloud-skips',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, true, 'migrated should be true (cross-device case still runs pullAndMerge)');
  // pullAndMerge does 3 GETs + 3 POSTs = 6 fetches
  assert.equal(result.fetchCallCount, 6, `expected 6 fetches (3 GET + 3 POST), got ${result.fetchCallCount}`);
  assert.equal(result.alertCount, 0, 'no alert should fire when nothing was imported (empty LS)');
  assert.equal(result.ssSet, true, 'sessionStorage flag should be set after migration completes');
  assert.equal(result.lsMigrationFlagSet, true, 'LS flag should be set after migration completes');
});

test('migration: LS-only with items + empty cloud → 3 pushes, toast fires, both flags set', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'ls-only-pushes-to-empty-cloud',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, true, 'migrated should be true');
  // pullAndMerge does 3 GETs + 3 POSTs = 6 fetches
  assert.equal(result.fetchCallCount, 6, `expected 6 fetches (3 GET + 3 POST), got ${result.fetchCallCount}`);
  assert.equal(result.pullCalls, 3, 'expected 3 pull calls');
  assert.equal(result.pushCalls, 3, 'expected 3 push calls');
  assert.equal(result.alertCount, 1, 'toast should fire when items present');
  assert.match(result.alertText ?? '', /imported/i, 'English toast should mention "imported"');
  assert.equal(result.ssSet, true, 'sessionStorage flag should be set after successful migration');
  assert.equal(result.lsMigrationFlagSet, true, 'LS migration flag should be set after successful migration');
  assert.match(result.lsFlagValue ?? '', /^\d{4}-\d{2}-\d{2}T/, 'LS flag value should be ISO timestamp');
});

test('migration: both guards pre-set → no fetch (idempotent re-run)', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'idempotent-rerun-skips',
    LANG_PREFIX: '/en/',
    MIGRATION_PRE_SS_PULL: '1',
    MIGRATION_PRE_LS_MIGRATION: '1',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, false, 'migrated should be false (idempotent skip)');
  assert.equal(result.fetchCallCount, 0, 'no fetch should occur when guards are set');
  assert.equal(result.alertCount, 0, 'no toast on skip');
});

test('migration: toast text contains correct counts after merge', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'toast-fires-on-items',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, true);
  assert.equal(result.alertCount, 1);
  assert.match(result.alertText ?? '', /3 favorites/, 'toast should mention 3 favorites');
  assert.match(result.alertText ?? '', /1 recent/, 'toast should mention 1 recent item');
  assert.match(result.alertText ?? '', /0 history/, 'toast should mention 0 history');
});

test('migration: empty LS → runs pullAndMerge (cross-device) but no toast', () => {
  const { ok, error, result } = runChild({
    __TEST_SCENARIO: 'silent-on-empty',
    LANG_PREFIX: '/en/',
  });
  assert.equal(ok, true, `child failed: ${error}`);
  assert.equal(result.migrated, true, 'cross-device empty-LS case still runs pullAndMerge');
  assert.equal(result.fetchCallCount, 6, `expected 6 fetches (3 GET + 3 POST), got ${result.fetchCallCount}`);
  assert.equal(result.alertCount, 0, 'no toast when nothing was imported (empty LS)');
});