#!/usr/bin/env node
// P87 — CI guard for sitemap hreflang annotations.
//
// Why this exists:
//   P86 added hreflang annotations to sitemap-0.xml so search engines can
//   serve the right language version. This test verifies:
//     1. Every <url> in sitemap has 3 hreflang children: en, zh, x-default
//     2. The hreflang values point to REAL pages (each URL's en/zh sibling
//        exists as its own <url> entry)
//   A regression here means search engines lose i18n SEO benefit.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     14 existing build-dep tests = 15 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// Run `pnpm build` if dist/sitemap-0.xml missing.
function ensureBuilt(): void {
  const sitemap = resolve(root, 'dist', 'sitemap-0.xml');
  if (existsSync(sitemap)) return;
  console.log('[p87] dist/sitemap-0.xml missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

interface UrlEntry {
  loc: string;
  hreflangs: Record<string, string>; // lang code → URL
}

function parseSitemap(xml: string): UrlEntry[] {
  const entries: UrlEntry[] = [];
  const urlRe = /<url>([\s\S]*?)<\/url>/g;
  for (const m of xml.matchAll(urlRe)) {
    const block = m[1]!;
    const locMatch = block.match(/<loc>([^<]+)<\/loc>/);
    if (!locMatch) continue;
    const loc = locMatch[1]!;
    const hreflangs: Record<string, string> = {};
    const linkRe = /<xhtml:link\s+rel="alternate"\s+hreflang="([^"]+)"\s+href="([^"]+)"\s*\/>/g;
    for (const lm of block.matchAll(linkRe)) {
      hreflangs[lm[1]!] = lm[2]!;
    }
    entries.push({ loc, hreflangs });
  }
  return entries;
}

test('sitemap-0.xml has complete hreflang annotations (every URL has en/zh/x-default + siblings exist)', () => {
  ensureBuilt();
  const xml = readFileSync(resolve(root, 'dist', 'sitemap-0.xml'), 'utf-8');
  const entries = parseSitemap(xml);

  assert.ok(entries.length > 0, 'sitemap should have at least 1 URL entry');

  // Build set of all <loc> values for sibling verification.
  const allLocs = new Set(entries.map(e => e.loc));

  const violations: string[] = [];

  for (const { loc, hreflangs } of entries) {
    // 1. Each URL must have en, zh, x-default hreflang
    const requiredLangs = ['en', 'zh', 'x-default'];
    for (const lang of requiredLangs) {
      if (!hreflangs[lang]) {
        violations.push(`${loc}: missing hreflang="${lang}"`);
      }
    }

    // 2. en + zh siblings must each exist as their own <url> entries
    if (hreflangs['en'] && !allLocs.has(hreflangs['en'])) {
      violations.push(`${loc}: hreflang en → ${hreflangs['en']} (not in sitemap)`);
    }
    if (hreflangs['zh'] && !allLocs.has(hreflangs['zh'])) {
      violations.push(`${loc}: hreflang zh → ${hreflangs['zh']} (not in sitemap)`);
    }
    if (hreflangs['x-default'] && !allLocs.has(hreflangs['x-default'])) {
      violations.push(`${loc}: hreflang x-default → ${hreflangs['x-default']} (not in sitemap)`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Sitemap hreflang violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a regression of P86 hreflang emission. ` +
      `Check astro.config.mjs sitemap serialize() and re-build.`
  );
});