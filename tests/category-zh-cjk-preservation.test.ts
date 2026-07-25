#!/usr/bin/env node
// P66b — CI CJK preservation guard for zh category landing pages.
//
// Why this exists:
//   P63 added a CI guard that English category landing pages must NOT
//   contain CJK (closing the P62 user-reported leak: "Operations /
//   库存运营" etc. showed on en pages). P63 defends against re-introducing
//   the bug, but does NOT defend against the opposite regression: a
//   future refactor over-cleanses and accidentally removes CJK from the
//   Chinese pages too. This test provides the symmetric defense-in-depth:
//   walks the 15 zh category landing pages and asserts the <h1> and
//   category-link text CONTAIN CJK characters. If a future refactor
//   accidentally strips CJK from zh pages (e.g. wrong t() lookup key, or
//   hardcoded English fallback that bypasses i18n), this test fails in
//   CI before the regression reaches users.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     6 existing build-dep tests + P63 en-guard = 7 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync. Does NOT use
//     _clerk-build-helper because this test has no Clerk env requirement.
//   - Walks dist/zh/ in parallel with dist/en/ via two separate ensureBuilt() calls.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set (local dev w/o RUN_BUILD_TESTS).
// Matches P63 pattern: file-level process.exit(0) means zero tests registered.
if (!process.env.RUN_BUILD_TESTS) {
  // silent skip — no test() registered
  process.exit(0);
}

// Run `pnpm build` if dist/zh/ missing or empty. The earlier P63 en-guard
// test (run before this one due to alphabetical ordering of test files)
// may have left dist/ populated, but we still verify zh dir specifically
// to handle the edge case where only en was rebuilt.
function ensureBuilt(): void {
  const distZh = resolve(root, 'dist', 'zh');
  if (existsSync(distZh) && readdirSync(distZh).length > 0) {
    return;
  }
  console.log('[p66b] dist/zh missing or empty — running pnpm build...');
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
  const matches = src.matchAll(/slug:\s*'([^']+)'/g);
  return Array.from(matches, m => m[1]!);
}

// Broader CJK regex (matches P63 + P62 + tests/category-i18n-purity.test.ts)
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('zh category landing pages CONTAIN CJK in <h1> and category-link text (preservation)', () => {
  ensureBuilt();
  const slugs = getCategorySlugs();
  assert.equal(slugs.length, 15, `expected 15 category slugs in src/data/categories.ts, got ${slugs.length}`);

  // Walk every zh dist page once (mirrors P63 strategy).
  const distZhDir = resolve(root, 'dist', 'zh');
  const zhPages: Array<{ rel: string; html: string }> = [];
  function walk(dir: string, relBase: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === 'index.html') zhPages.push({ rel, html: readFileSync(full, 'utf8') });
    }
  }
  walk(distZhDir, '');

  const violations: Array<{ slug: string; location: string; text: string }> = [];

  for (const slug of slugs) {
    // 1. <h1> text in the category's own zh page. Must contain CJK.
    //    If <h1> missing → DOM regression, fail loudly.
    const selfPage = zhPages.find(p => p.rel === `${slug}/index.html`);
    if (!selfPage) {
      violations.push({ slug, location: '<missing dist file>', text: `dist/zh/${slug}/index.html` });
      continue;
    }
    const h1Match = selfPage.html.match(/<h1[^>]*>([^<]+)<\/h1>/);
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

    // 2. Cross-page category-link text. <a href="/zh/<slug>/"> bodies must
    //    contain CJK (zh pages link to other zh categories in zh). If no
    //    page references the slug at all, the cross-category nav has
    //    regressed (DOM structure change) — fail loudly.
    const linkRe = new RegExp(`<a[^>]*href="/zh/${slug}/"[^>]*>([\\s\\S]*?)</a>`, 'g');
    let crossRefCount = 0;
    for (const { rel, html } of zhPages) {
      for (const m of html.matchAll(linkRe)) {
        crossRefCount++;
        const body = m[1]!;
        const text = body
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;|&#\d+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!CJK.test(text)) {
          violations.push({
            slug,
            location: `cross-link-no-cjk in ${rel}`,
            text: text.slice(0, 80),
          });
        }
      }
    }
    if (crossRefCount === 0) {
      violations.push({
        slug,
        location: 'cross-link-missing',
        text: 'failed to locate any <a href="/zh/<slug>/"> reference across dist/zh — DOM structure may have changed',
      });
    }
  }

  assert.equal(
    violations.length,
    0,
    `CJK missing from ${violations.length} zh category page(s):\n` +
      violations.map(v => `  - ${v.slug} [${v.location}]: ${v.text}`).join('\n') +
      `\n\nThis indicates zh pages were over-cleansed. Check src/i18n/translations.ts ` +
      `zh fields and src/pages/[lang]/*.astro t() lookup pattern.`
  );
});