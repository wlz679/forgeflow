#!/usr/bin/env node
// P69 — CI CJK leak guard for en BLOG pages.
//
// Why this exists:
//   Page-level CJK guard matrix extension. P63/P67b/P68 cover category
//   pages (en + zh) and tool pages (en + zh). This file + the matching
//   blog-zh-cjk-preservation test complete the 3rd page-type layer
//   (blog posts at /en/blog/<slug>/ + /zh/blog/<slug>/).
//
//   P69 also discovered (via pre-test inspection) that 100/101 zh blog
//   pages had English h1s — bug caused by `src/pages/[lang]/blog/[slug].astro`
//   using lang-agnostic `post.title` instead of `t(\`blog.${slug}.title\`, lang)`.
//   P69 fixed the template + added 200 zh translations to translations.ts.
//   This test now provides regression defense: any future refactor that
//   reintroduces CJK into en blog h1s (or strips zh from zh blog h1s via
//   the matching preservation test) will fail in CI.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     9 existing build-dep tests = 10 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.
//   - Walks dist/en/blog/best-*/index.html (100 blog pages).

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

// Run `pnpm build` if dist/en/blog/ missing or empty.
function ensureBuilt(): void {
  const distEnBlog = resolve(root, 'dist', 'en', 'blog');
  if (!existsSync(distEnBlog)) {
    console.log('[p69-en] dist/en/blog missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
    return;
  }
  const probe = resolve(distEnBlog, 'best-solopreneur-mrr-calculator', 'index.html');
  if (!existsSync(probe)) {
    console.log('[p69-en] dist/en/blog best-* pages missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
  }
}

// Walk dist/en/blog/ and collect blog post pages (best-* subdirs).
function getBlogPages(): Array<{ slug: string; html: string }> {
  const distEnBlog = resolve(root, 'dist', 'en', 'blog');
  const pages: Array<{ slug: string; html: string }> = [];
  for (const entry of readdirSync(distEnBlog, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.startsWith('best-')) continue;
    const indexPath = resolve(distEnBlog, entry.name, 'index.html');
    if (!existsSync(indexPath)) continue;
    pages.push({
      slug: entry.name,
      html: readFileSync(indexPath, 'utf8'),
    });
  }
  return pages;
}

// Broader CJK regex (matches P63 / P66b / P67b / P68 / P62 purity tests).
const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('en blog pages contain NO CJK in <h1> (anti-leak)', () => {
  ensureBuilt();
  const pages = getBlogPages();
  assert.equal(
    pages.length,
    100,
    `expected 100 en blog pages in dist/en/blog/best-*/, got ${pages.length}`
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
    `CJK found in ${violations.length} en blog page(s):\n` +
      violations.map(v => `  - ${v.slug} [${v.location}]: ${v.text}`).join('\n') +
      `\n\nThis indicates a CJK leak regression. Check src/i18n/translations.ts ` +
      `blog.${'<slug>'}.title.en field.`
  );
});