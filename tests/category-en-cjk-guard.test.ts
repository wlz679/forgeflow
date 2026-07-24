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
//     the 5 existing build-dep tests in this project — this file is the
//     6th build-dep suite; tests/run.mjs skip-mode summary updated
//     accordingly)
//   - Spawns `pnpm build` directly via spawnSync. Does NOT use
//     _clerk-build-helper because this test has no Clerk env requirement.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set (local dev w/o RUN_BUILD_TESTS).
// Uses file-level process.exit(0) (not `return` inside a test() callback).
// This works because tests/run.mjs spawns each .test.ts file in its own
// Node process via `tsx`, so exiting here means zero tests run for this
// file — no phantom test() registrations needed.
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

test('en category landing pages contain no CJK in <h1> or category-link text', () => {
  ensureBuilt();
  const slugs = getCategorySlugs();
  assert.equal(slugs.length, 15, `expected 15 category slugs in src/data/categories.ts, got ${slugs.length}`);

  // Walk every en dist page once (small build output, ~314 files) and index
  // category-link href → source page. self-pages don't link to themselves,
  // but other pages (cross-category grid, breadcrumb) do link to /en/<slug>/.
  // We also use the aggregated set to detect DOM structure changes: if NO
  // page references a category, that's a structural regression worth failing.
  const distEnDir = resolve(root, 'dist', 'en');
  const enPages: Array<{ rel: string; html: string }> = [];
  function walk(dir: string, relBase: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === 'index.html') enPages.push({ rel, html: readFileSync(full, 'utf8') });
    }
  }
  walk(distEnDir, '');

  const violations: Array<{ slug: string; location: string; text: string }> = [];

  for (const slug of slugs) {
    // 1. <h1> text in the category's own page. If the regex doesn't match,
    //    the page DOM has changed (e.g. <h1> now wraps nested elements) and
    //    the CJK scan would be silently skipped — surface as a violation.
    const selfPage = enPages.find(p => p.rel === `${slug}/index.html`);
    if (!selfPage) {
      violations.push({ slug, location: '<missing dist file>', text: `dist/en/${slug}/index.html` });
    } else {
      const h1Match = selfPage.html.match(/<h1[^>]*>([^<]+)<\/h1>/);
      if (!h1Match) {
        violations.push({
          slug,
          location: 'h1-missing',
          text: 'failed to locate <h1> in HTML — DOM structure may have changed',
        });
      } else {
        const text = h1Match[1]!;
        if (CJK.test(text)) {
          violations.push({ slug, location: 'h1', text: text.slice(0, 80) });
        }
      }
    }

    // 2. Cross-page category-link text. Look at every en page's <a href="/en/<slug>/">
    //    links (breadcrumbs + "Explore Other Categories" grid). This catches
    //    any page introducing a bilingual category name like "Knowledge / 知识库".
    //    If no page references the slug at all, the cross-category nav has
    //    regressed (DOM structure change) — fail loudly instead of silent pass.
    const linkRe = new RegExp(`<a[^>]*href="/en/${slug}/"[^>]*>([\\s\\S]*?)</a>`, 'g');
    let crossRefCount = 0;
    for (const { rel, html } of enPages) {
      // Some <a> blocks wrap text in nested <div>s (cross-category grid); flatten
      // by stripping tags from the captured body before text check.
      for (const m of html.matchAll(linkRe)) {
        crossRefCount++;
        const body = m[1]!;
        // Concatenate visible text only (strip nested tags + entities)
        const text = body
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;|&#\d+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (CJK.test(text)) {
          violations.push({
            slug,
            location: `cross-link in ${rel}`,
            text: text.slice(0, 80),
          });
        }
      }
    }
    if (crossRefCount === 0) {
      violations.push({
        slug,
        location: 'cross-link-missing',
        text: 'failed to locate any <a href="/en/<slug>/"> reference across dist/en — DOM structure may have changed',
      });
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
