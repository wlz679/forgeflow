#!/usr/bin/env node
// P71 — Cross-link CJK guards for BLOG pages.
//
// Why this exists:
//   Same as tool-cross-link-cjk-guard but for blog pages. Blog pages at
//   /en/blog/best-<slug>/ and /zh/blog/best-<slug>/ ALSO contain cross-links
//   to category pages (CategoryOtherNav grid + footer), backed by
//   `t(\`category.${id}.name\`, lang)`. P71 walks 100 en + 100 zh blog
//   pages and asserts:
//     - en: NO CJK in any cross-link body (anti-leak defense)
//     - zh: HAS CJK in each cross-link body (preservation defense)
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     12 existing build-dep tests = 13 build-dep suites now)

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

// Run `pnpm build` if dist/en blog pages missing.
function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'blog', 'best-solopreneur-mrr-calculator', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p71-blog] dist/ blog pages missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Read category slugs from categories.ts (single source of truth).
function getCategorySlugs(): string[] {
  const src = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf8');
  const matches = src.matchAll(/slug:\s*'([^']+)'/g);
  return Array.from(matches, m => m[1]!);
}

// Walk dist/<lang>/blog/best-*/index.html and collect all blog post pages.
function getBlogPages(lang: 'en' | 'zh'): Array<{ slug: string; html: string }> {
  const dir = resolve(root, 'dist', lang, 'blog');
  const pages: Array<{ slug: string; html: string }> = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('best-')) continue;
    const indexPath = resolve(dir, entry.name, 'index.html');
    if (!existsSync(indexPath)) continue;
    pages.push({ slug: entry.name, html: readFileSync(indexPath, 'utf8') });
  }
  return pages;
}

// Broader CJK regex.
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('en blog pages contain NO CJK in <a href="/en/<category>/"> cross-link bodies (anti-leak)', () => {
  ensureBuilt();
  const categorySlugs = getCategorySlugs();
  const pages = getBlogPages('en');
  assert.equal(pages.length, 100, `expected 100 en blog pages, got ${pages.length}`);

  const violations: Array<{ slug: string; target: string; text: string }> = [];

  for (const { slug, html } of pages) {
    for (const catSlug of categorySlugs) {
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
    `CJK found in ${violations.length} en blog page cross-link(s):\n` +
      violations.slice(0, 20).map(v => `  - ${v.slug} → /en/${v.target}/: ${v.text}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a CJK leak in blog page cross-links. Check src/i18n/translations.ts ` +
      `category.*.name.en fields.`
  );
});

test('zh blog pages contain CJK in <a href="/zh/<category>/"> cross-link bodies (preservation)', () => {
  ensureBuilt();
  const categorySlugs = getCategorySlugs();
  const pages = getBlogPages('zh');
  assert.equal(pages.length, 100, `expected 100 zh blog pages, got ${pages.length}`);

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
    `CJK missing from ${violations.length} zh blog page cross-link(s):\n` +
      violations.slice(0, 20).map(v => `  - ${v.slug} → /zh/${v.target}/: ${v.text}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates zh blog page cross-links lost CJK. Check src/i18n/translations.ts ` +
      `category.*.name.zh fields.`
  );
});