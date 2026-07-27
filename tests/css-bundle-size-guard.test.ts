#!/usr/bin/env node
// P107 — CI guard for CSS bundle size (extends performance dimension).
//
// Why this exists:
//   Performance budget: the project ships ONE shared Astro-generated CSS file
//   (Tailwind output, currently 37 KB) + small per-page inline <style> blocks
//   from scoped component styles (~0.1 KB each). This guard catches:
//     1. Tailwind config bloat — adding too many utility classes / design
//        tokens makes the shared CSS grow, hurting every page's first paint
//     2. Inline-style regression — a page accidentally inlines a large
//        `<style>` block (e.g. a copy-pasted design system)
//
//   P106 covers inline JS budget per page (100 KB). P107 covers the symmetric
//   CSS dimension. Together they close the performance dimension of
//   defense-in-depth.
//
// Current baseline (2026-07-27):
//   - External CSS file (dist/_astro/_slug_.uFyEqGuJ.css): 37 KB
//   - Per-page inline <style>: max 0.1 KB, p95 0.1 KB, median 0.1 KB
//   - 200 of 448 pages have inline <style> (Astro-scoped styles)
//   - 448 of 448 pages link the external CSS
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 28th build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// External CSS budget: 60 KB. Current baseline is 37 KB, so 60 KB allows ~60%
// growth before failing. Tailwind config additions / design system changes
// should be reviewed against this budget.
const MAX_EXTERNAL_CSS_BYTES = 60 * 1024;

// Inline CSS per-page budget: 5 KB. Current baseline max is 0.1 KB, so 5 KB
// is 50x headroom. Catches accidental copy-paste of large design systems
// into a page's scoped <style> block.
const MAX_INLINE_CSS_BYTES_PER_PAGE = 5 * 1024;

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p107] dist/ missing — running pnpm build...');
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

// Extract total inline CSS bytes from a page (sum of all <style>...</style>
// blocks that are NOT inside <head>'s scoped-component declarations with
// type="text/css" hidden ones — actually, just count ALL <style> content).
function inlineCssBytes(html: string): number {
  let total = 0;
  const re = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  for (const m of html.matchAll(re)) {
    total += m[1].length;
  }
  return total;
}

// Find all .css files under dist/_astro/ and return their paths + sizes.
function getExternalCssFiles(): { rel: string; bytes: number }[] {
  const astroDir = resolve(root, 'dist', '_astro');
  if (!existsSync(astroDir)) return [];
  const result: { rel: string; bytes: number }[] = [];
  for (const entry of readdirSync(astroDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.css')) {
      const full = resolve(astroDir, entry.name);
      result.push({ rel: entry.name, bytes: statSync(full).size });
    }
  }
  return result;
}

test('external CSS bundle stays under budget (60 KB total)', () => {
  ensureBuilt();
  const cssFiles = getExternalCssFiles();

  // Astro generates exactly 1 CSS file in dist/_astro/ for this project
  // (Tailwind output, hashed filename). Guard against either:
  //   - The single file growing past budget (Tailwind bloat)
  //   - Multiple CSS files appearing (style fragmentation regression)
  assert.ok(
    cssFiles.length >= 1,
    'Expected at least one CSS file in dist/_astro/. Run pnpm build first.',
  );

  const violations: string[] = [];
  let totalBytes = 0;
  for (const f of cssFiles) {
    totalBytes += f.bytes;
    if (f.bytes > MAX_EXTERNAL_CSS_BYTES) {
      violations.push(
        `${f.rel}: ${f.bytes} bytes (${(f.bytes / 1024).toFixed(1)} KB) > ${MAX_EXTERNAL_CSS_BYTES} bytes (60 KB)`,
      );
    }
  }

  console.log(
    `[p107] External CSS: ${cssFiles.length} file(s), total ${(totalBytes / 1024).toFixed(1)} KB` +
      (cssFiles.length === 1 ? ` (${cssFiles[0].rel})` : ''),
  );

  assert.equal(
    violations.length,
    0,
    `External CSS bundle violations (${violations.length}, threshold ${MAX_EXTERNAL_CSS_BYTES / 1024} KB):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      `\n\nExternal CSS is shared across all 448 pages. Adding Tailwind utilities / ` +
      `design tokens affects every page's first paint. Review the diff against ` +
      `tailwind.config and any new CSS imports.`,
  );
});

test('no page exceeds inline CSS budget (5 KB per page)', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];
  const sizes: number[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const bytes = inlineCssBytes(html);
    sizes.push(bytes);
    if (bytes > MAX_INLINE_CSS_BYTES_PER_PAGE) {
      violations.push(
        `${lang}/${rel}: ${bytes} bytes (${(bytes / 1024).toFixed(1)} KB) > ${MAX_INLINE_CSS_BYTES_PER_PAGE} bytes (5 KB)`,
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
  const pagesWithInline = sizes.filter(s => s > 0).length;

  console.log(
    `[p107] Inline CSS per page: max ${(max / 1024).toFixed(1)} KB | p95 ${(p95 / 1024).toFixed(1)} KB | median ${(median / 1024).toFixed(1)} KB | ${pagesWithInline}/${n} pages have inline <style>`,
  );

  assert.equal(
    violations.length,
    0,
    `Inline CSS violations (${violations.length}, threshold ${MAX_INLINE_CSS_BYTES_PER_PAGE / 1024} KB):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nInline <style> blocks should stay tiny — scoped component styles only. ` +
      `If a page needs more, extract to the shared Tailwind config or a separate CSS file.`,
  );
});