import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { buildWithEnvSet, buildWithEnvMissing } from './_clerk-build-helper';

test('Header renders Clerk mount block when env set', () => {
  const html = buildWithEnvSet('en');
  assert.match(html, /data-clerk-mount/);
  assert.match(html, /Login/);
});

test('Header does NOT render Clerk mount block when env missing', () => {
  const html = buildWithEnvMissing('en');
  assert.doesNotMatch(html, /data-clerk-mount/);
});

test('Header Clerk block consistent across en + zh', () => {
  const enHtml = buildWithEnvSet('en');
  const zhHtml = buildWithEnvSet('zh');
  assert.match(enHtml, /data-clerk-mount/);
  assert.match(zhHtml, /data-clerk-mount/);
  assert.match(enHtml, /Login/);
  assert.match(zhHtml, /Login/);
});
