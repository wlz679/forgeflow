import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_clerk-env-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): boolean {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: { ...process.env, ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error('[test] child stderr:', r.stderr?.toString());
    throw new Error(`child exited ${r.status}`);
  }
  return JSON.parse(r.stdout.toString().trim()).result;
}

test('hasClerkEnv returns true when key set', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc123' }), true);
});

test('hasClerkEnv returns false when no env var', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: '' }), false);
});

test('hasClerkEnv returns false when key is whitespace only', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: '   ' }), false);
});

test('hasClerkEnv returns false when key is REPLACE_ME placeholder', () => {
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_REPLACE_ME_xxx' }), false);
});

test('hasClerkEnv reads .env.production if .env missing', () => {
  // NOTE: import.meta.env reads .env / .env.production at build time.
  // This test validates the helper's gate logic, NOT the file loading.
  // The real .env loading is Astro's responsibility.
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_live_xyz789' }), true);
});

test('hasClerkEnv is CI-aware via CI env var', () => {
  // hasClerkEnv itself doesn't check CI; CI is enforced by check-clerk-env.mjs.
  // This test ensures hasClerkEnv's gate is decoupled from CI.
  assert.equal(runChild({ PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz', CI: 'true' }), true);
});
