#!/usr/bin/env node
// P90 — CI guard for HTML <link rel="canonical"> URL.
//
// Why this exists:
//   BaseLayout.astro:136 emits <link rel="canonical" href="...">. This test
//   verifies:
//     1. Every page has exactly 1 canonical link
//     2. Canonical href points to the SAME page (self-referential, not a redirect)
//     3. Canonical href uses the forgeflowkit.com domain (no cross-domain pointing)
//   A misconfigured canonical can cause search engines to consolidate multiple
//   pages under one URL — suppressing en/zh variants from search results.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     17 existing build-dep tests = 18 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const EXPECTED_DOMAIN = 'https://forgeflowkit.com';

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// Run `pnpm build` if dist/ missing.
function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p90] dist/ missing — running pnpm build...');
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
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === 'index.html') pages.push(rel);
    }
  }
  walk(dir, '');
  return pages;
}

test('every page has exactly 1 canonical link pointing to itself on forgeflowkit.com', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');

    // Count canonical link occurrences (should be exactly 1)
    const canonicalMatches = [...html.matchAll(/<link\s+rel="canonical"\s+href="([^"]+)"\s*\/?>/g)];

    if (canonicalMatches.length === 0) {
      violations.push(`${lang}/${rel}: no <link rel="canonical">`);
      return;
    }
    if (canonicalMatches.length > 1) {
      violations.push(`${lang}/${rel}: ${canonicalMatches.length} canonical links (expected 1)`);
      return;
    }

    const canonicalHref = canonicalMatches[0]![1]!;

    // 1. Canonical href must be on forgeflowkit.com (no cross-domain)
    if (!canonicalHref.startsWith(EXPECTED_DOMAIN)) {
      violations.push(`${lang}/${rel}: canonical href points to wrong domain: ${canonicalHref}`);
    }

    // 2. Canonical href must point to the SAME page (self-referential)
    //    Page is at /<lang>/<rel> where rel is like "about/index.html" OR
    //    just "index.html" (root). Astro.url.pathname emits the directory form:
    //    /<lang>/<about>/ (no index.html) for non-root, /<lang>/ for root.
    //    So canonical should be https://forgeflowkit.com/<lang>/<about-dir>/.
    //    Strip both /index.html and bare index.html from rel.
    const dir = rel.replace(/^index\.html$/, '').replace(/\/index\.html$/, '');
    const expectedCanonical = `${EXPECTED_DOMAIN}/${lang}/${dir}`;
    // Allow trailing / to be optional (some canonicals end with /, some don't)
    const canonicalNoTrailSlash = canonicalHref.replace(/\/$/, '');
    const expectedNoTrailSlash = expectedCanonical.replace(/\/$/, '');
    if (canonicalNoTrailSlash !== expectedNoTrailSlash) {
      violations.push(`${lang}/${rel}: canonical points to ${canonicalHref} (expected ${expectedCanonical})`);
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `Canonical URL violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a regression of BaseLayout.astro canonical emission. ` +
      `Check src/layouts/BaseLayout.astro:136 and re-build.`
  );
});