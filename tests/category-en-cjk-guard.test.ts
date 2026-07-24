#!/usr/bin/env node
// P63 — CI CJK drift guard for English category landing pages.
//
// Why this exists:
//   P62 closed a user-reported bug where en pages for O/S/K showed
//   bilingual strings ("Operations / 库存运营", "Sales / 销售管理",
//   "Knowledge / 知识库"). P62 fixed the bug at 3 layers: categories.ts
//   source, translations.ts en field, and 9 path-B page migrations.
//   This test provides build-time defense-in-depth: walks the 15 en
//   category landing pages and asserts the <h1> and breadcrumb
//   category-link text contain no CJK characters. If a future refactor
//   reintroduces the bug (e.g. reverting one of the 3 P62 commits, or
//   hardcoding a new bilingual name), this test fails in CI before
//   the broken page reaches users.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches
//     the 5 existing build-dep tests in this project)
//   - Spawns `pnpm build` directly via spawnSync. Does NOT use
//     _clerk-build-helper because this test has no Clerk env requirement.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set (local dev w/o RUN_BUILD_TESTS)
// Match existing build-dep test pattern (baselayout-clerk-script.test.ts et al.)
if (!process.env.RUN_BUILD_TESTS) {
  // silent skip — no test() registered
  process.exit(0);
}

// Run `pnpm build` if dist/en/ missing or empty. ~3min cost; CI budget accommodates.
function ensureBuilt(): void {
  const distEn = resolve(root, 'dist', 'en');
  if (existsSync(distEn) && readdirSync(distEn).length > 0) {
    return; // already built (test runner's prior build-dep test left dist/ populated)
  }
  console.log('[p63] dist/en missing or empty — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Read category slugs from categories.ts (single source of truth)
function getCategorySlugs(): string[] {
  const src = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf8');
  // matches `slug: 'value',` lines inside the categories[] array
  const matches = src.matchAll(/slug:\s*'([^']+)'/g);
  return Array.from(matches, m => m[1]!);
}

// Broader CJK regex (covers Unified Ideographs + Ext A + Fullwidth Forms)
// Matches the regex in tests/category-i18n-purity.test.ts for consistency.
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('en category landing pages contain no CJK in <h1> or breadcrumb', () => {
  ensureBuilt();
  const slugs = getCategorySlugs();
  assert.equal(slugs.length, 15, `expected 15 category slugs in src/data/categories.ts, got ${slugs.length}`);

  const violations: Array<{ slug: string; location: string; text: string }> = [];

  for (const slug of slugs) {
    const htmlPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(htmlPath)) {
      violations.push({ slug, location: '<missing dist file>', text: htmlPath });
      continue;
    }
    const html = readFileSync(htmlPath, 'utf8');

    // 1. <h1> text (the main page title)
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (h1Match) {
      const text = h1Match[1]!;
      if (CJK.test(text)) {
        violations.push({ slug, location: 'h1', text: text.slice(0, 80) });
      }
    }

    // 2. Breadcrumb category link text — <a> wrapping short category-name text
    //    (heuristic: skip long nav strings; the breadcrumb uses <a href="/en/<slug>/">)
    const breadcrumbLinkRe = new RegExp(
      `<a[^>]*href="/en/${slug}/"[^>]*>\\s*([^<]+?)\\s*</a>`,
      'g'
    );
    for (const m of html.matchAll(breadcrumbLinkRe)) {
      const text = m[1]!.trim();
      if (CJK.test(text)) {
        violations.push({ slug, location: 'breadcrumb', text: text.slice(0, 80) });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `CJK found in ${violations.length} en category page(s):\n` +
      violations.map(v => `  - ${v.slug} [${v.location}]: ${v.text}`).join('\n') +
      `\n\nThis indicates a regression of the P62 fix. Check src/data/categories.ts ` +
      `and src/i18n/translations.ts en fields.`
  );
});
