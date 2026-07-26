#!/usr/bin/env node
// P88 — CI guard for HTML <head> hreflang annotations.
//
// Why this exists:
//   BaseLayout.astro:137-139 emits <link rel="alternate" hreflang="en/zh/x-default">
//   for every page. P87 added CI guard for sitemap hreflang (P86 emission).
//   This test covers the *HTML head* side — if BaseLayout template regresses,
//   search engines lose i18n SEO benefit even though sitemap is correct.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     15 existing build-dep tests = 16 build-dep suites now)
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

// Run `pnpm build` if dist/ missing.
function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'saas-metrics', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p88] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// Walk dist/<lang>/**/index.html pages.
function getPages(lang: 'en' | 'zh'): string[] {
  const dir = resolve(root, 'dist', lang);
  const pages: string[] = [];
  function walk(d: string, relBase: string): void {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      // Build relative path without leading slash (avoids /about/ vs about/)
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === 'index.html') pages.push(rel);
    }
  }
  walk(dir, '');
  return pages;
}

// Extract hreflang entries from a single HTML file.
function parseHreflangs(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/?>/g;
  for (const m of html.matchAll(re)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

test('every HTML page emits en/zh/x-default hreflang + siblings exist', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');
  assert.equal(enPages.length, zhPages.length, `en/zh page count mismatch: ${enPages.length} vs ${zhPages.length}`);

  // Build set of all en page paths for sibling verification
  const enPaths = new Set(enPages);
  const zhPaths = new Set(zhPages);

  const violations: string[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const hreflangs = parseHreflangs(html);

    // 1. Each page must have en, zh, x-default hreflang
    for (const expected of ['en', 'zh', 'x-default']) {
      if (!hreflangs[expected]) {
        violations.push(`${lang}/${rel}: missing hreflang="${expected}"`);
      }
    }

    // 2. Each hreflang URL's path must exist as its own sibling page
    for (const [hl, url] of Object.entries(hreflangs)) {
      if (hl === 'x-default') continue; // x-default is typically the en URL
      const u = new URL(url);
      // hreflang URLs are like /en/about/ — strip leading lang prefix + trailing /
      // to match our page Set shape (e.g., "about/index.html")
      let path = u.pathname.replace(/^\/(en|zh)\//, '').replace(/\/$/, '');
      // Convert "about" → "about/index.html", "" → "index.html"
      const rel = path ? `${path}/index.html` : 'index.html';
      if (hl === 'en' && !enPaths.has(rel)) {
        violations.push(`${lang}/${rel}: hreflang en → ${url} (not in dist/en/)`);
      }
      if (hl === 'zh' && !zhPaths.has(rel)) {
        violations.push(`${lang}/${rel}: hreflang zh → ${url} (not in dist/zh/)`);
      }
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `HTML hreflang violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a regression of BaseLayout.astro hreflang emission. ` +
      `Check src/layouts/BaseLayout.astro:137-139 and re-build.`
  );
});