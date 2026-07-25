#!/usr/bin/env node
// P68 — CI CJK leak guard for en TOOL pages (completes the page-level matrix).
//
// Why this exists:
//   The page-level CJK guard matrix is now:
//     - en category pages (P63): assert NO CJK in h1 + cross-link
//     - zh category pages (P66b): assert HAS CJK in h1 + cross-link (symmetric)
//     - zh tool pages (P67b): assert HAS CJK in h1
//     - en tool pages (P68, this file): assert NO CJK in h1 (symmetric to P67b)
//
//   P68 closes the last gap: en tool page h1 content comes from
//   `t(\`tools.${slug}.title\`, 'en')`. A future refactor could accidentally
//   inject CJK into an en tool title (e.g. wrong fallback chain, hardcoded
//   bilingual string like "Operations / 库存运营" that the P62 fix didn't
//   catch because the bug was only in category pages, not tool pages).
//   This test walks the 100 en tool pages and asserts each <h1> contains
//   NO CJK characters. Defense-in-depth symmetric to P67b.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     8 existing build-dep tests = 9 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync. Does NOT use
//     _clerk-build-helper because this test has no Clerk env requirement.
//   - Walks dist/en/solopreneur-*/index.html (100 tool pages).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// Run `pnpm build` if dist/en/solopreneur-*/index.html is missing.
// Earlier build-dep tests usually leave dist/ populated, but verify
// specifically to handle the edge case where dist was cleared.
function ensureBuilt(): void {
  const distEn = resolve(root, 'dist', 'en');
  if (!existsSync(distEn)) {
    console.log('[p68] dist/en missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
    return;
  }
  const probe = resolve(distEn, 'solopreneur-mrr-calculator', 'index.html');
  if (!existsSync(probe)) {
    console.log('[p68] dist/en tool pages missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
  }
}

// Walk dist/en/ and collect all tool pages (solopreneur-* subdirs).
function getToolPages(): Array<{ slug: string; html: string }> {
  const distEnDir = resolve(root, 'dist', 'en');
  const toolPages: Array<{ slug: string; html: string }> = [];
  for (const entry of readdirSync(distEnDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('solopreneur-')) continue;
    const indexPath = resolve(distEnDir, entry.name, 'index.html');
    if (!existsSync(indexPath)) continue;
    toolPages.push({
      slug: entry.name,
      html: readFileSync(indexPath, 'utf8'),
    });
  }
  return toolPages;
}

// Broader CJK regex (matches P63 / P66b / P67b / P62 purity tests).
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('en tool pages contain NO CJK in <h1> (anti-leak)', () => {
  ensureBuilt();
  const pages = getToolPages();
  assert.equal(
    pages.length,
    100,
    `expected 100 en tool pages in dist/en/solopreneur-*/, got ${pages.length}`
  );

  const violations: Array<{ slug: string; location: string; text: string }> = [];

  for (const { slug, html } of pages) {
    // <h1> text — must NOT contain CJK. If <h1> missing → DOM regression.
    const h1Match = html.match(/<h1[^>]*>([^<]+)<\/h1>/);
    if (!h1Match) {
      violations.push({
        slug,
        location: 'h1-missing',
        text: 'failed to locate <h1> in HTML — DOM structure may have changed',
      });
      continue;
    }
    const h1Text = h1Match[1]!;
    if (CJK.test(h1Text)) {
      violations.push({ slug, location: 'h1-cjk-leak', text: h1Text.slice(0, 80) });
    }
  }

  assert.equal(
    violations.length,
    0,
    `CJK found in ${violations.length} en tool page(s):\n` +
      violations.map(v => `  - ${v.slug} [${v.location}]: ${v.text}`).join('\n') +
      `\n\nThis indicates a CJK leak regression. Check src/i18n/translations.ts ` +
      `tools.${'<slug>'}.title.en field.`
  );
});