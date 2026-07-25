#!/usr/bin/env node
// P67b — CI CJK preservation guard for zh TOOL pages (extends P66b).
//
// Why this exists:
//   P66b added a CI guard for zh CATEGORY landing pages (the 15 category
//   index pages like /zh/operations-inventory/). P66b defends against
//   over-cleansing of category titles, but does NOT cover the 100 tool
//   pages like /zh/solopreneur-mrr-calculator/. Tool page h1 content is
//   a separate i18n lookup (`tools.${slug}.title`) — a future refactor
//   could break tool titles without affecting category titles (and vice
//   versa). This test provides symmetric defense-in-depth for tool
//   pages: walks the 100 zh tool pages and asserts each <h1> contains
//   CJK. If a future refactor accidentally strips CJK from a tool page
//   h1 (e.g. wrong t() key, hardcoded English fallback), this test fails
//   in CI before the regression reaches users.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     7 existing build-dep tests = 8 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync. Does NOT use
//     _clerk-build-helper because this test has no Clerk env requirement.
//   - Walks dist/zh/solopreneur-*/index.html (100 tool pages).

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

// Run `pnpm build` if dist/zh/solopreneur-*/index.html is missing.
// Earlier build-dep tests (P63/P66b) usually leave dist/ populated, but
// verify specifically to handle the edge case where dist was cleared.
function ensureBuilt(): void {
  const distZh = resolve(root, 'dist', 'zh');
  if (!existsSync(distZh)) {
    console.log('[p67b] dist/zh missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
    return;
  }
  // Probe for at least one tool page to confirm dist/zh/ has the 100 tool pages
  const probe = resolve(distZh, 'solopreneur-mrr-calculator', 'index.html');
  if (!existsSync(probe)) {
    console.log('[p67b] dist/zh tool pages missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
  }
}

// Walk dist/zh/ and collect all tool pages (solopreneur-* subdirs).
// Returns array of { slug, html } objects.
function getToolPages(): Array<{ slug: string; html: string }> {
  const distZhDir = resolve(root, 'dist', 'zh');
  const toolPages: Array<{ slug: string; html: string }> = [];
  for (const entry of readdirSync(distZhDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('solopreneur-')) continue;
    const indexPath = resolve(distZhDir, entry.name, 'index.html');
    if (!existsSync(indexPath)) continue;
    toolPages.push({
      slug: entry.name,
      html: readFileSync(indexPath, 'utf8'),
    });
  }
  return toolPages;
}

// Broader CJK regex (matches P63 / P66b / P62 purity tests).
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('zh tool pages CONTAIN CJK in <h1> (preservation)', () => {
  ensureBuilt();
  const pages = getToolPages();
  assert.equal(
    pages.length,
    100,
    `expected 100 zh tool pages in dist/zh/solopreneur-*/, got ${pages.length}`
  );

  const violations: Array<{ slug: string; location: string; text: string }> = [];

  for (const { slug, html } of pages) {
    // 1. <h1> text — must contain CJK. If <h1> missing → DOM regression.
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
    if (!CJK.test(h1Text)) {
      violations.push({ slug, location: 'h1-no-cjk', text: h1Text.slice(0, 80) });
    }
  }

  assert.equal(
    violations.length,
    0,
    `CJK missing from ${violations.length} zh tool page(s):\n` +
      violations.map(v => `  - ${v.slug} [${v.location}]: ${v.text}`).join('\n') +
      `\n\nThis indicates zh tool pages were over-cleansed. Check src/i18n/translations.ts ` +
      `tools.${'<slug>'}.title.zh fields.`
  );
});