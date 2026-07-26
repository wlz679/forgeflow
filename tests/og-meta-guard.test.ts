#!/usr/bin/env node
// P91 — CI guard for OpenGraph (og:) and Twitter (twitter:) meta tags.
//
// Why this exists:
//   BaseLayout.astro:140-148 emits og:title/og:description/og:image/og:type/
//   twitter:card/twitter:title/twitter:description for every page. This test
//   verifies:
//     1. Required og:* tags present on every page (title, description, image, type)
//     2. og:locale matches the page language (en → en_US, zh → zh_CN)
//     3. og:image uses the forgeflowkit.com domain
//   Misconfigured OG/Twitter tags reduce social media share previews and
//   impact CTR from social referrals.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     18 existing build-dep tests = 19 build-dep suites now)
//   - Spawns `pnpm build` directly via spawnSync.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');
const EXPECTED_DOMAIN = 'https://forgeflowkit.com';
const EXPECTED_OG_LOCALE: Record<string, string> = { en: 'en_US', zh: 'zh_CN' };

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// Run `pnpm build` if dist/ missing.
function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p91] dist/ missing — running pnpm build...');
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

// Extract og: and twitter: meta tag values.
function parseMeta(html: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<meta\s+(?:property|name)="([^"]+)"\s+content="([^"]+)"\s*\/?>/g;
  for (const m of html.matchAll(re)) {
    out[m[1]!] = m[2]!;
  }
  return out;
}

test('every page has complete og:* + twitter:* meta tags (i18n-correct)', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const meta = parseMeta(html);

    // Required og: tags per BaseLayout.astro:140-143
    const requiredOg = ['og:title', 'og:description', 'og:image', 'og:type'];
    for (const tag of requiredOg) {
      if (!meta[tag]) {
        violations.push(`${lang}/${rel}: missing <meta property="${tag}">`);
      }
    }

    // Required twitter: tags per BaseLayout.astro:144-146
    const requiredTwitter = ['twitter:card', 'twitter:title', 'twitter:description'];
    for (const tag of requiredTwitter) {
      if (!meta[tag]) {
        violations.push(`${lang}/${rel}: missing <meta name="${tag}">`);
      }
    }

    // og:locale must match page language
    const expectedLocale = EXPECTED_OG_LOCALE[lang];
    if (meta['og:locale'] && meta['og:locale'] !== expectedLocale) {
      violations.push(`${lang}/${rel}: og:locale = ${meta['og:locale']} (expected ${expectedLocale})`);
    }
    if (!meta['og:locale']) {
      violations.push(`${lang}/${rel}: missing og:locale (expected ${expectedLocale})`);
    }

    // og:image must use forgeflowkit.com domain
    if (meta['og:image'] && !meta['og:image'].startsWith(EXPECTED_DOMAIN)) {
      violations.push(`${lang}/${rel}: og:image points to wrong domain: ${meta['og:image']}`);
    }

    // og:type should be one of the OpenGraph standard values
    // (per https://ogp.me/#types): website, article, product, profile, etc.
    // This project uses: website (category/static pages), product (tool pages).
    const validTypes = new Set(['website', 'article', 'product', 'profile', 'book', 'music.song']);
    if (meta['og:type'] && !validTypes.has(meta['og:type'])) {
      violations.push(`${lang}/${rel}: og:type = ${meta['og:type']} (not a standard OpenGraph type)`);
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `OG/Twitter meta tag violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a regression of BaseLayout.astro og/twitter meta emission. ` +
      `Check src/layouts/BaseLayout.astro:140-148 and re-build.`
  );
});