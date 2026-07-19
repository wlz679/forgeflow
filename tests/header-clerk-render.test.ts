import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildWithEnvSet, buildWithEnvMissing } from './_clerk-build-helper';

// P23b: skip-guard for build-dependent tests. Wall-clock budget per
// pnpm build invocation is unbounded; CI runs these with
// RUN_BUILD_TESTS=1 (via `pnpm test:build`). Local dev skips them.
const skipIfNoBuildTests = (): boolean => !process.env.RUN_BUILD_TESTS;

test('Header renders Clerk mount block when env set', () => {
  if (skipIfNoBuildTests()) return; // P23b: gate build-dependent test
  const html = buildWithEnvSet('en');
  assert.match(html, /data-clerk-mount/);
  assert.match(html, /Login/);
});

test('Header does NOT render Clerk mount block when env missing', () => {
  if (skipIfNoBuildTests()) return; // P23b: gate build-dependent test
  const html = buildWithEnvMissing('en');
  assert.doesNotMatch(html, /data-clerk-mount/);
});

test('Header Clerk block consistent across en + zh', () => {
  if (skipIfNoBuildTests()) return; // P23b: gate build-dependent test
  const enHtml = buildWithEnvSet('en');
  const zhHtml = buildWithEnvSet('zh');
  assert.match(enHtml, /data-clerk-mount/);
  assert.match(zhHtml, /data-clerk-mount/);
  assert.match(enHtml, /Login/);
  assert.match(zhHtml, /Login/);
});
