#!/usr/bin/env node
// P74 — CI guard against hardcoded English strings on zh pages.
//
// Why this exists:
//   The P72 i18n audit found 6 user-visible defects where zh pages
//   rendered English text. P72 T2-A + P73 fixed those defects. This
//   test provides defense-in-depth: walks dist/zh/**/index.html,
//   strips <script>/<style>/JSON-LD blocks, and asserts that a focused
//   list of known-leaked English UI strings does NOT appear in the
//   remaining HTML body. If a future refactor reintroduces any of these
//   strings (e.g., hardcoding a new EN string into a zh page), this
//   test fails in CI before the regression reaches users.
//
//   The list is INTENTIONALLY FOCUSED — it covers only strings that the
//   P72 audit confirmed as user-visible leaks. Adding more strings
//   risks false positives (e.g., brand names, calculator type names).
//   Extend the list only after a confirmed new defect, not proactively.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     13 existing build-dep tests = 14 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.
//   - Walks dist/zh/**/index.html.

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

// Run `pnpm build` if dist/zh/ missing.
function ensureBuilt(): void {
  const distZh = resolve(root, 'dist', 'zh');
  if (!existsSync(distZh)) {
    console.log('[p74] dist/zh missing — running pnpm build...');
    const r = spawnSync('pnpm', ['build'], {
      cwd: root,
      stdio: 'inherit',
      shell: process.platform === 'win32',
    });
    assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
  }
}

// Known-leaked English UI strings from P72 audit. Each string was a
// user-visible defect on zh pages. Extend with caution — false positives
// will block CI on every commit.
const HARDCODED_EN_IN_ZH = [
  // P73 fixed: legal pages
  'Privacy Policy',           // privacy-policy.astro h1
  'Terms & Conditions',       // terms.astro h1
  'Information We Collect',   // privacy-policy.astro section heading
  'Cookies and Tracking',     // privacy-policy.astro section heading
  'Third-Party Services',     // privacy-policy.astro section heading
  'Acceptance of Terms',      // terms.astro section heading
  'Use of the Service',       // terms.astro section heading
  'Intellectual Property',    // terms.astro section heading
  'Last updated:',             // legal pages last-updated text
  // P72 T2-A fixed: CategoryGuides
  'Guides & Articles',         // CategoryGuides.astro h2
  'Related Articles',          // CategoryGuides.astro h3
];

// Walk dist/zh/ and collect all index.html pages.
function getZhPages(): Array<{ rel: string; html: string }> {
  const distZhDir = resolve(root, 'dist', 'zh');
  const pages: Array<{ rel: string; html: string }> = [];
  function walk(dir: string, relBase: string): void {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel);
      else if (entry.name === 'index.html') {
        pages.push({ rel, html: readFileSync(full, 'utf8') });
      }
    }
  }
  walk(distZhDir, '');
  return pages;
}

// Strip <script>, <style>, JSON-LD blocks — same as P72 audit filter.
function stripNonBody(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
}

test('dist/zh pages contain no hardcoded English UI strings (P72 audit defense)', () => {
  ensureBuilt();
  const pages = getZhPages();
  assert.ok(pages.length > 0, 'expected dist/zh to have at least 1 index.html');

  const violations: Array<{ page: string; string: string; count: number }> = [];

  for (const { rel, html } of pages) {
    const stripped = stripNonBody(html);
    for (const en of HARDCODED_EN_IN_ZH) {
      // Word-boundary match: avoid "Cookies" matching inside "Cookies and..."
      // We want exact phrase matches with non-letter context.
      const escaped = en.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const re = new RegExp(`(?<![A-Za-z])${escaped}(?![A-Za-z])`, 'g');
      const matches = stripped.match(re);
      if (matches && matches.length > 0) {
        violations.push({ page: rel, string: en, count: matches.length });
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Hardcoded English found in ${violations.length} dist/zh page(s):\n` +
      violations.slice(0, 30).map(v => `  - ${v.page}: "${v.string}" (${v.count} hits)`).join('\n') +
      (violations.length > 30 ? `\n  ... and ${violations.length - 30} more` : '') +
      `\n\nThis indicates a regression of the P72 audit fixes (D1-D5). ` +
      `Check src/i18n/translations.ts zh fields and ensure the page template uses t() lookup.`
  );
});