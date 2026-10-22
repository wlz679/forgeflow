import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildWithEnv, ROOT } from './_supabase-build-helper.ts';

/**
 * P3-2 privacy disclosure: the new Supabase-backed cross-device sync
 * must be disclosed to users in the bilingual privacy policy. Tests
 * verify the rendered HTML (post-build) contains the Supabase section
 * in both English and Chinese, plus the updated wording in the existing
 * favorites / recently-viewed / history sections.
 *
 * Build helper returns { en, zh } (index.html strings). Privacy-policy
 * is a separate static page, so we read dist/{lang}/privacy-policy/
 * index.html directly via fs after triggering the build.
 */

// P23b: skip-guard for build-dependent tests. Wall-clock budget per
// pnpm build invocation is unbounded; CI runs these with
// RUN_BUILD_TESTS=1 (via `pnpm test:build`). Local dev skips them.
const skipIfNoBuildTests = (): boolean => !process.env.RUN_BUILD_TESTS;

test('privacy-policy: English Supabase section present in dist', () => {
  if (skipIfNoBuildTests()) return; // P23b: gate build-dependent test
  // Trigger build (cache-per-env means first test in this suite pays
  // the cost, subsequent tests hit the globalThis cache).
  buildWithEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz',
    VITE_SUPABASE_URL: 'https://abc.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  });
  const htmlPath = resolve(ROOT, 'dist/en/privacy-policy/index.html');
  assert.ok(existsSync(htmlPath), `Expected ${htmlPath}`);
  const html = readFileSync(htmlPath, 'utf8');
  assert.match(html, /Data Sync \(Supabase\)/, 'en: "Data Sync (Supabase)" heading missing');
  assert.match(html, /synced across your signed-in devices/, 'en: sync wording missing');
  assert.match(html, /supabase\.com/, 'en: supabase.com link missing');
  // Updated existing sections must reflect new sync-aware wording
  assert.match(html, /Stays on your device and syncs/, 'en: favorites string not updated');
  assert.match(html, /Is stored locally and synced/, 'en: recent/history string not updated');
});

test('privacy-policy: Chinese Supabase section present in dist', () => {
  // P153-E2: this test was missing the P23b skip-guard that its sibling
  // above has. Without RUN_BUILD_TESTS it therefore ran anyway and read
  // whatever happened to be sitting in dist/ — which made the result depend
  // on the last local build (e.g. a build without the Supabase env vars
  // produces a page with no "数据同步（Supabase）" section, so the suite
  // flipped to red the moment dist/ was rebuilt locally). With the guard,
  // the suite is skipped by default and, when opted in, reads the build
  // that the first test in this file performs with the right env.
  if (skipIfNoBuildTests()) return; // P23b: gate build-dependent test
  buildWithEnv({
    PUBLIC_CLERK_PUBLISHABLE_KEY: 'pk_test_xyz',
    VITE_SUPABASE_URL: 'https://abc.supabase.co',
    VITE_SUPABASE_ANON_KEY: 'anon-key',
  });
  const htmlPath = resolve(ROOT, 'dist/zh/privacy-policy/index.html');
  assert.ok(existsSync(htmlPath), `Expected ${htmlPath}`);
  const html = readFileSync(htmlPath, 'utf8');
  assert.match(html, /数据同步（Supabase）/, 'zh: "数据同步（Supabase）" heading missing');
  assert.match(html, /在你登录的设备之间同步/, 'zh: sync wording missing');
  // Updated existing sections must reflect new sync-aware wording
  assert.match(html, /保存在你的设备上，并在你登录的设备之间同步/, 'zh: favorites string not updated');
  assert.match(html, /本地存储，并在你登录的设备之间同步/, 'zh: recent string not updated');
  assert.match(html, /本地存储，并通过 Supabase 在你登录的设备之间同步/, 'zh: history string not updated');
});
