#!/usr/bin/env node
// P96 — CI guard for HTML page size (performance dimension).
//
// Why this exists:
//   SEO 8/8 (P87-P94) + i18n + a11y covered. P96 opens performance
//   dimension. Page size correlates with:
//     - Time to First Byte (TTFB) + Total Blocking Time (TBT)
//     - Mobile data cost (critical for 3G/4G users)
//     - Search ranking (Google Page Experience signals)
//   Threshold: 200 KB per page (Google recommends < 1.6 MB for
//   Largest Contentful Paint target, but smaller is always better;
//   200 KB is a reasonable per-page target for a calculator SPA).
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     23 existing build-dep tests = 24 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const MAX_PAGE_SIZE_KB = 200; // per-page threshold
const MAX_ROOT_SIZE_KB = 500;  // root page is allowed larger (lists all tools)

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p96] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function getPages(lang: 'en' | 'zh'): Array<{ rel: string; path: string; size: number }> {
  const dir = resolve(root, 'dist', lang);
  const pages: Array<{ rel: string; path: string; size: number }> = [];
  function walk(d: string, relBase: string): void {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === 'index.html') {
        pages.push({ rel, path: full, size: statSync(full).size });
      }
    }
  }
  walk(dir, '');
  return pages;
}

test('performance: every page is under size threshold (non-root ≤ 200 KB, root ≤ 500 KB)', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: Array<{ page: string; size: number; limit: number }> = [];
  let totalBytes = 0;
  let totalPages = 0;

  function checkPage(rel: string, size: number): void {
    const isRoot = rel === 'index.html';
    const limit = isRoot ? MAX_ROOT_SIZE_KB : MAX_PAGE_SIZE_KB;
    const sizeKB = size / 1024;
    if (sizeKB > limit) {
      violations.push({ page: rel, size: Math.round(sizeKB), limit });
    }
  }

  for (const { rel, size } of enPages) {
    checkPage(rel, size);
    totalBytes += size;
    totalPages++;
  }
  for (const { rel, size } of zhPages) {
    checkPage(rel, size);
    totalBytes += size;
    totalPages++;
  }

  const avgKB = Math.round(totalBytes / totalPages / 1024);
  const totalMB = (totalBytes / 1024 / 1024).toFixed(2);

  assert.equal(
    violations.length,
    0,
    `Page size violations (${violations.length} of ${totalPages} pages):\n` +
      violations.slice(0, 10).map(v => `  - ${v.page}: ${v.size} KB (limit: ${v.limit} KB)`).join('\n') +
      (violations.length > 10 ? `\n  ... and ${violations.length - 10} more` : '') +
      `\n\nTotal dist size: ${totalMB} MB across ${totalPages} pages (avg: ${avgKB} KB).`
  );
});