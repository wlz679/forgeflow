import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const script = resolve(root, 'scripts', 'check-clerk-env.mjs');

function runScript(env: Record<string, string>): { status: number; stdout: string; stderr: string } {
  const r = spawnSync('node', [script], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  return {
    status: r.status ?? -1,
    stdout: r.stdout?.toString() ?? '',
    stderr: r.stderr?.toString() ?? '',
  };
}

test('exit 0 when valid key in env', () => {
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_real_key', CI: 'true' });
  assert.equal(r.status, 0, `stderr: ${r.stderr}`);
});

test('exit 1 when CI=true and no env var', () => {
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: '', CI: 'true' });
  assert.equal(r.status, 1);
  assert.match(r.stderr, /missing|invalid/i);
});

test('exit 0 when local (CI unset) and no env var', () => {
  // Local dev: warning, not failure
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: '', CI: '' });
  assert.equal(r.status, 0);
});

test('exit 1 when CI=true and key contains REPLACE_ME', () => {
  const r = runScript({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_REPLACE_ME_xxx', CI: 'true' });
  assert.equal(r.status, 1);
});
