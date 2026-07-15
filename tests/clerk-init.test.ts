import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const child = resolve(root, 'tests', '_clerk-init-child.ts');
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');

function runChild(env: Record<string, string>): any {
  const r = spawnSync(tsxBin, [child], {
    cwd: root,
    env: {
      ...process.env,
      PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_mock',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  });
  if (r.status !== 0) {
    console.error('[test] child stderr:', r.stderr?.toString());
    throw new Error(`child exited ${r.status}`);
  }
  return JSON.parse(r.stdout.toString().trim());
}

test('initClerk noop when no mount element', () => {
  const r = runChild({ HAS_MOUNT: '0' });
  assert.equal(r.instanceExists, false);
  assert.equal(r.innerHTML, '');
});

test('initClerk noop when no publishable key', () => {
  const r = runChild({ HAS_MOUNT: '1', PUBLIC_CLERK_PUBLISHABLE_KEY: '' });
  // Should return early without mounting
  assert.equal(r.instanceExists, false);
  assert.equal(r.innerHTML, '');
});

test('initClerk calls Clerk load with publishable key', () => {
  // Verify by checking instance was created
  const r = runChild({ HAS_MOUNT: '1', PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_abc' });
  assert.equal(r.instanceExists, true);
});

test('initClerk on load failure clears mount and logs error', () => {
  const r = runChild({ HAS_MOUNT: '1', LOAD_FAIL: '1' });
  // mountEl.innerHTML should be empty (silent failure)
  assert.equal(r.innerHTML, '');
  assert.equal(r.instanceExists, false);
});

test('initClerk on logged-in user mounts UserButton', () => {
  const r = runChild({ HAS_MOUNT: '1', LOGGED_IN: '1' });
  assert.equal(r.mountUserButtonCalled, true);
});

test('initClerk on logged-out user does not mount UserButton', () => {
  const r = runChild({ HAS_MOUNT: '1', LOGGED_IN: '0' });
  assert.equal(r.mountUserButtonCalled, false);
});

test('handleLoginClick calls openSignIn when clicked', () => {
  const r = runChild({ HAS_MOUNT: '1', FIRE_CLICK: '1' });
  assert.equal(r.openSignInCalled, true);
});

test('handleLoginClick is no-op when clerk instance null', () => {
  // If init failed, click should not throw or call openSignIn
  const r = runChild({ HAS_MOUNT: '1', LOAD_FAIL: '1', FIRE_CLICK: '1' });
  assert.equal(r.openSignInCalled, false);
  assert.equal(r.innerHTML, '');
});
