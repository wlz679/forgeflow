#!/usr/bin/env node
// P106 — CI guard for JS bundle size (closes performance dimension).
//
// Why this exists:
//   Performance budget: each page should ship ≤ 100 KB of inline JS to keep
//   first-paint fast. Current baseline (2026-07-27):
//     - max: 65 KB (solopreneur-revenue-projector)
//     - p95: 60 KB
//     - avg: 29 KB
//     - median: 7 KB (most pages have small customFn scripts)
//   Setting threshold at 100 KB allows ~50% growth before failing. Heavy
//   pages (AI cost engines, complex valuation engines) approach the limit
//   already; this guard catches regression when adding new customFn code.
//
// What it measures:
//   - Inline `<script>...</script>` content only (NOT external src= scripts,
//     which are Astro-generated and not engineer-controlled)
//   - Per-page total (sum of all inline scripts)
//   - Both en and zh versions checked (448 pages total)
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 27th build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// Performance budget: max inline JS per page (bytes). 100 KB allows ~50%
// growth from current 65 KB max. If a future batch pushes above this,
// the guard catches it before shipping.
const MAX_INLINE_JS_BYTES = 100 * 1024;

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p106] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function getPages(lang: 'en' | 'zh'): string[] {
  const dir = resolve(root, 'dist', lang);
  const pages: string[] = [];
  function walk(d: string, relBase: string, depth: number = 0): void {
    if (depth > 10) return;
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel, depth + 1);
      else if (entry.name === 'index.html') pages.push(rel);
    }
  }
  walk(dir, '');
  return pages;
}

// Extract total inline JS bytes from a page. Excludes <script src="..."> (external).
function inlineJsBytes(html: string): number {
  let total = 0;
  // Match inline scripts only — those without src= attribute
  const re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  for (const m of html.matchAll(re)) {
    total += m[1].length;
  }
  return total;
}

test('no page exceeds inline JS budget (100 KB)', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];
  const sizes: number[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const bytes = inlineJsBytes(html);
    sizes.push(bytes);
    if (bytes > MAX_INLINE_JS_BYTES) {
      violations.push(
        `${lang}/${rel}: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB) > ${MAX_INLINE_JS_BYTES} bytes (100 KB)`,
      );
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  sizes.sort((a, b) => a - b);
  const n = sizes.length;
  const median = n > 0 ? sizes[Math.floor(n / 2)] : 0;
  const p95 = n > 0 ? sizes[Math.floor(n * 0.95)] : 0;
  const max = n > 0 ? sizes[n - 1] : 0;

  console.log(`[p106] Checked ${n} pages. Max: ${(max / 1024).toFixed(1)} KB | p95: ${(p95 / 1024).toFixed(1)} KB | Median: ${(median / 1024).toFixed(1)} KB`);

  assert.equal(
    violations.length,
    0,
    `JS bundle size violations (${violations.length}, threshold ${MAX_INLINE_JS_BYTES / 1024} KB):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nInline JS budget is 100 KB per page. Heavy customFn scripts push some pages close to this limit. ` +
      `Options: (1) extract code to external script, (2) minify customFn further, (3) lazy-load sections.`,
  );
});