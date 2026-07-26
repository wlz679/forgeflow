#!/usr/bin/env node
// P95 — CI guard for foundational accessibility (a11y) checks.
//
// Why this exists:
//   SEO 8/8 covered in P87-P94. New dimension defense: a11y. Catches:
//     1. Pages with no h1 (or multiple h1) — breaks screen reader nav
//     2. Images without alt attribute — breaks screen reader image description
//     3. Buttons without text or aria-label — breaks screen reader nav
//     4. Heading level skipping (h1 → h3) — breaks doc outline
//   These are W3C WCAG 2.1 basic failures. Affects SEO + a11y compliance.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     22 existing build-dep tests = 23 build-dep suites now)
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

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p95] dist/ missing — running pnpm build...');
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

// Strip <script>, <style>, JSON-LD, comments before checking structural elements
// (a11y checks should focus on user-visible DOM, not scripts/metadata).
function stripNonBody(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
}

test('a11y: exactly 1 h1 per page, images have alt, buttons have text/aria-label, no heading-level skip', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const stripped = stripNonBody(html);

    // 1. Exactly 1 h1 per page (multiple h1 is bad — only 1 main heading)
    const h1Matches = [...stripped.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)];
    if (h1Matches.length === 0) {
      violations.push(`${lang}/${rel}: no <h1>`);
    } else if (h1Matches.length > 1) {
      violations.push(`${lang}/${rel}: ${h1Matches.length} <h1> (expected 1)`);
    }

    // 2. All <img> tags have alt attribute (or are decorative with alt="")
    const imgMatches = [...stripped.matchAll(/<img\b[^>]*\/?>/g)];
    for (const m of imgMatches) {
      const tag = m[0];
      if (!/\balt\s*=/.test(tag)) {
        violations.push(`${lang}/${rel}: <img> missing alt attribute: ${tag.slice(0, 80)}`);
      }
    }

    // 3. All <button> tags have text content OR aria-label
    const buttonMatches = [...stripped.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/g)];
    for (const m of buttonMatches) {
      const tag = m[0];
      const body = (m[1] || '').replace(/<[^>]+>/g, '').trim();
      const hasAriaLabel = /\baria-label\s*=/.test(tag) || /\baria-labelledby\s*=/.test(tag);
      if (body.length === 0 && !hasAriaLabel) {
        violations.push(`${lang}/${rel}: <button> without text or aria-label: ${tag.slice(0, 80)}`);
      }
    }

    // 4. No heading-level skip (h1 → h3 without h2)
    const headingLevels: number[] = [];
    for (const m of stripped.matchAll(/<h([1-6])\b/g)) {
      headingLevels.push(parseInt(m[1]!, 10));
    }
    // Sort and find any gaps (h1 → h3 = skip h2)
    const seen = new Set<number>();
    for (const lvl of headingLevels) {
      // Only check first occurrence per level (avoid repeated h2 flagging)
      if (seen.has(lvl)) continue;
      seen.add(lvl);
      // After h1, next level should be h2 (or h1 again). Skip from h1 → h3 is a defect.
      // We check: if h1 seen and h3 seen before h2, that's a skip.
      if (lvl >= 3 && !seen.has(2) && seen.has(1)) {
        // Only flag if there's no h2 anywhere in the page
        if (!headingLevels.includes(2)) {
          violations.push(`${lang}/${rel}: heading level skip — h1 to h${lvl} without h2`);
        }
      }
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `a11y violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a11y defects per W3C WCAG 2.1. ` +
      `Check src/components/ and per-page templates for missing alt/aria-label/heading levels.`
  );
});