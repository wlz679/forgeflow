#!/usr/bin/env node
// P89 — CI guard for sitemap URL coverage parity.
//
// Why this exists:
//   P87 (sitemap-hreflang-guard) verifies each URL has hreflang annotations.
//   This test complements P87 by verifying the en/zh PARITY: every zh page
//   should have a corresponding en page (and vice versa). A missing sibling
//   means users in one language can't navigate to the same content in the
//   other — a real UX defect even if hreflang tags are present.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     16 existing build-dep tests = 17 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// Run `pnpm build` if dist/ missing.
function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p89] dist/ missing — running pnpm build...');
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
  return pages.sort();
}

// Convert page path to en↔zh sibling path.
// e.g., "about/index.html" <-> "about/index.html" (no lang prefix in path)
function siblingPath(page: string, _targetLang: 'en' | 'zh'): string {
  // Paths in dist are like "about/index.html" — they don't include the lang
  // prefix because we walked from dist/en/ or dist/zh/. So sibling is same path.
  return page;
}

test('every zh page has en sibling + every en page has zh sibling (full parity)', () => {
  ensureBuilt();
  const enPages = new Set(getPages('en'));
  const zhPages = new Set(getPages('zh'));

  const violations: string[] = [];

  // zh pages without en sibling
  for (const zhPage of zhPages) {
    const enSibling = siblingPath(zhPage, 'en');
    if (!enPages.has(enSibling)) {
      violations.push(`zh/${zhPage} has NO en sibling`);
    }
  }

  // en pages without zh sibling
  for (const enPage of enPages) {
    const zhSibling = siblingPath(enPage, 'zh');
    if (!zhPages.has(zhSibling)) {
      violations.push(`en/${enPage} has NO zh sibling`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Sitemap URL coverage parity violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a missing en/zh sibling for one or more pages. ` +
      `Every page must exist in both languages for i18n navigation.`
  );
});