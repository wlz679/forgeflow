import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_sync-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): { ok: boolean; error?: string; stdout: string } {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  return {
    ok: r.status === 0,
    error: r.stderr?.toString(),
    stdout: r.stdout?.toString() ?? '',
  };
}

test('sync-init child: pull-once action with user ID invokes 3 pull calls', () => {
  const r = runChild({
    __TEST_ACTION: 'pull-once',
    __TEST_CLERK_USER_ID: 'user_abc',
    VITE_SUPABASE_URL: 'https://test.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  });
  assert.equal(r.ok, true, `stderr: ${r.error}\nstdout: ${r.stdout}`);
  const parsed = JSON.parse(r.stdout.trim());
  assert.equal(parsed.ok, true);
  assert.equal(parsed.action, 'pull-once');
});

test('sync-init child: noop action when no Clerk user', () => {
  const r = runChild({
    __TEST_ACTION: 'noop',
    __TEST_CLERK_USER_ID: '',
  });
  assert.equal(r.ok, true);
  const parsed = JSON.parse(r.stdout.trim());
  assert.equal(parsed.action, 'noop');
});

test('sync-init module: self-invokes startSync on import (has EOF IIFE)', async () => {
  // Indirectly verified by checking the source file ends with the self-call block.
  const fs = await import('node:fs');
  const src = fs.readFileSync(resolve(root, 'src/scripts/sync-init.client.ts'), 'utf8');
  assert.match(src, /if \(typeof document !== 'undefined'\)/, 'must have document guard');
  assert.match(src, /startSync\(\)/, 'must call startSync at EOF');
  // Check it's at the end of the file (last 500 chars)
  const tail = src.slice(-500);
  assert.match(tail, /startSync\(\)/, 'startSync call must be near EOF');
});

test('sync-init: import.meta.env guards prevent build-time crash', async () => {
  // The module reads getSupabaseConfig() at call time, not at import time.
  // Verify by importing the module in a context without env vars.
  const r = runChild({
    __TEST_ACTION: 'noop',
    VITE_SUPABASE_URL: '',
    VITE_SUPABASE_ANON_KEY: '',
  });
  assert.equal(r.ok, true);
});
