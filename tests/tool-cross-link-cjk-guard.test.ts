#!/usr/bin/env node
// P71 — Cross-link CJK guards for TOOL pages.
//
// Why this exists:
//   P63/P66b assert h1 + cross-link CJK on category pages only. Tool pages
//   (e.g. /en/solopreneur-mrr-calculator/) ALSO contain cross-links to
//   category pages (the CategoryOtherNav grid in footer renders all 15
//   categories), but P63/P66b never walked the tool pages themselves.
//   P71 closes this gap: walks the 100 en + 100 zh tool pages, finds all
//   `<a href="/<lang>/<category-slug>/">` cross-link bodies, and asserts:
//     - en: NO CJK in any body (anti-leak defense)
//     - zh: HAS CJK in each body (preservation defense)
//   If a future refactor breaks the i18n lookup that backs these
//   cross-link texts (the `t(\`category.${id}.name\`, lang)` chain), this
//   test fails in CI before the regression reaches users.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     11 existing build-dep tests = 12 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.

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

// Run `pnpm build` if dist/en or dist/zh tool pages missing.
function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'solopreneur-mrr-calculator', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p71-tool] dist/ tool pages missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Read category slugs from categories.ts (single source of truth).
// Cross-link hrefs in tool pages always point to /<lang>/<category-slug>/.
function getCategorySlugs(): string[] {
  const src = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf8');
  const matches = src.matchAll(/slug:\s*'([^']+)'/g);
  return Array.from(matches, m => m[1]!);
}

// Walk dist/<lang>/solopreneur-*/index.html and collect all tool pages.
function getToolPages(lang: 'en' | 'zh'): Array<{ slug: string; html: string }> {
  const dir = resolve(root, 'dist', lang);
  const pages: Array<{ slug: string; html: string }> = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('solopreneur-')) continue;
    const indexPath = resolve(dir, entry.name, 'index.html');
    if (!existsSync(indexPath)) continue;
    pages.push({ slug: entry.name, html: readFileSync(indexPath, 'utf8') });
  }
  return pages;
}

// Broader CJK regex (matches all previous CJK tests).
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('en tool pages contain NO CJK in <a href="/en/<category>/"> cross-link bodies (anti-leak)', () => {
  ensureBuilt();
  const categorySlugs = getCategorySlugs();
  const pages = getToolPages('en');
  assert.equal(pages.length, 100, `expected 100 en tool pages, got ${pages.length}`);

  const violations: Array<{ slug: string; target: string; text: string }> = [];

  for (const { slug, html } of pages) {
    for (const catSlug of categorySlugs) {
      // Cross-link to category pages on en tool pages
      const linkRe = new RegExp(
        `<a[^>]*href="/en/${catSlug}/"[^>]*>([\\s\\S]*?)</a>`,
        'g'
      );
      for (const m of html.matchAll(linkRe)) {
        const body = m[1]!;
        const text = body
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;|&#\d+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (CJK.test(text)) {
          violations.push({ slug, target: catSlug, text: text.slice(0, 80) });
        }
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `CJK found in ${violations.length} en tool page cross-link(s):\n` +
      violations.slice(0, 20).map(v => `  - ${v.slug} → /en/${v.target}/: ${v.text}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a CJK leak in tool page cross-links. Check src/i18n/translations.ts ` +
      `category.*.name.en fields.`
  );
});

test('zh tool pages contain CJK in <a href="/zh/<category>/"> cross-link bodies (preservation)', () => {
  ensureBuilt();
  const categorySlugs = getCategorySlugs();
  const pages = getToolPages('zh');
  assert.equal(pages.length, 100, `expected 100 zh tool pages, got ${pages.length}`);

  const violations: Array<{ slug: string; target: string; text: string }> = [];

  for (const { slug, html } of pages) {
    for (const catSlug of categorySlugs) {
      const linkRe = new RegExp(
        `<a[^>]*href="/zh/${catSlug}/"[^>]*>([\\s\\S]*?)</a>`,
        'g'
      );
      for (const m of html.matchAll(linkRe)) {
        const body = m[1]!;
        const text = body
          .replace(/<[^>]+>/g, ' ')
          .replace(/&[a-z]+;|&#\d+;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();
        if (!CJK.test(text)) {
          violations.push({ slug, target: catSlug, text: text.slice(0, 80) });
        }
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `CJK missing from ${violations.length} zh tool page cross-link(s):\n` +
      violations.slice(0, 20).map(v => `  - ${v.slug} → /zh/${v.target}/: ${v.text}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates zh tool page cross-links lost CJK. Check src/i18n/translations.ts ` +
      `category.*.name.zh fields.`
  );
});