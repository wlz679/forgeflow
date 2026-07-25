#!/usr/bin/env node
// P69 — CI CJK preservation guard for zh BLOG pages (closes the bug
// discovered during P69 pre-flight inspection).
//
// Why this exists:
//   Pre-P69 inspection of `dist/zh/blog/<slug>/index.html` revealed
//   100/101 zh blog pages had pure English h1s — bug caused by
//   `src/pages/[lang]/blog/[slug].astro` using lang-agnostic `post.title`
//   instead of `t(\`blog.${slug}.title\`, lang)`. P69 fixed the template
//   + added 200 zh translations to translations.ts. This test provides
//   symmetric defense-in-depth: walks the 100 zh blog pages and asserts
//   each <h1> contains CJK. If a future refactor strips CJK from zh blog
//   h1s (e.g. wrong t() key, hardcoded English fallback, removal of
//   translations.ts entries), this test fails in CI before the regression
//   reaches users.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     10 existing build-dep tests = 11 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.
//   - Walks dist/zh/blog/best-*/index.html (100 blog pages).

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

// Run `pnpm build` if dist/zh/blog/ missing or empty.
function ensureBuilt(): void {
  const distZhBlog = resolve(root, 'dist', 'zh', 'blog');
  if (!existsSync(distZhBlog)) {
    console.log('[p69-zh] dist/zh/blog missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
    return;
  }
  const probe = resolve(distZhBlog, 'best-solopreneur-mrr-calculator', 'index.html');
  if (!existsSync(probe)) {
    console.log('[p69-zh] dist/zh/blog best-* pages missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
  }
}

// Walk dist/zh/blog/ and collect blog post pages (best-* subdirs).
function getBlogPages(): Array<{ slug: string; html: string }> {
  const distZhBlog = resolve(root, 'dist', 'zh', 'blog');
  const pages: Array<{ slug: string; html: string }> = [];
  for (const entry of readdirSync(distZhBlog, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('best-')) continue;
    const indexPath = resolve(distZhBlog, entry.name, 'index.html');
    if (!existsSync(indexPath)) continue;
    pages.push({
      slug: entry.name,
      html: readFileSync(indexPath, 'utf8'),
    });
  }
  return pages;
}

// Broader CJK regex (matches all previous CJK tests).
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('zh blog pages CONTAIN CJK in <h1> (preservation)', () => {
  ensureBuilt();
  const pages = getBlogPages();
  assert.equal(
    pages.length,
    100,
    `expected 100 zh blog pages in dist/zh/blog/best-*/, got ${pages.length}`
  );

  const violations: Array<{ slug: string; location: string; text: string }> = [];

  for (const { slug, html } of pages) {
    // <h1> text — must contain CJK. If <h1> missing → DOM regression.
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
    `CJK missing from ${violations.length} zh blog page(s):\n` +
      violations.map(v => `  - ${v.slug} [${v.location}]: ${v.text}`).join('\n') +
      `\n\nThis indicates zh blog pages were over-cleansed. Check src/i18n/translations.ts ` +
      `blog.${'<slug>'}.title.zh field and src/pages/[lang]/blog/[slug].astro template.`
  );
});