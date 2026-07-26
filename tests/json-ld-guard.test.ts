#!/usr/bin/env node
// P92 — CI guard for JSON-LD / structured data (schema.org).
//
// Why this exists:
//   BaseLayout.astro + per-page templates emit JSON-LD via
//   <script type="application/ld+json"> blocks. Schema.org structured data
//   helps search engines understand page content (rich snippets, knowledge
//   graph, etc.). This test verifies:
//     1. Every page has at least 1 valid JSON-LD block
//     2. JSON-LD is valid JSON (parseable)
//     3. JSON-LD URLs use forgeflowkit.com domain
//     4. Each page type emits the right @type (tool → SoftwareApplication, blog → Article, etc.)
//   Missing or broken JSON-LD reduces rich snippet eligibility.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     19 existing build-dep tests = 20 build-dep suites now)
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
  console.log('[p92] dist/ missing — running pnpm build...');
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

// Extract JSON-LD blocks. Returns array of parsed JSON objects (or null on parse error).
function extractJsonLd(html: string): Array<Record<string, unknown>> {
  const out: Array<Record<string, unknown>> = [];
  const re = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(re)) {
    try {
      const data = JSON.parse(m[1]!);
      if (data && typeof data === 'object') out.push(data as Record<string, unknown>);
    } catch {
      // Parse error — return null to flag
      out.push({ __parseError: m[1] });
    }
  }
  return out;
}

// Walk JSON-LD and collect all @type values.
function collectTypes(data: Record<string, unknown>): string[] {
  const types: string[] = [];
  if (data['__parseError']) types.push('__parseError__');
  if (data['@type']) types.push(String(data['@type']));
  if (Array.isArray(data['@graph'])) {
    for (const item of data['@graph']) {
      if (item && typeof item === 'object') types.push(...collectTypes(item as Record<string, unknown>));
    }
  }
  return types;
}

// Find URLs in JSON-LD and verify they use EXPECTED_DOMAIN.
function hasOffDomainUrl(data: unknown): boolean {
  if (data && typeof data === 'object') {
    for (const [k, v] of Object.entries(data as Record<string, unknown>)) {
      if (k === '@id' || k === 'url' || k === '@graph' || k === 'mainEntity') {
        if (typeof v === 'string' && v.startsWith('http') && !v.startsWith(EXPECTED_DOMAIN)) {
          return true;
        }
        if (Array.isArray(v) || typeof v === 'object') {
          if (hasOffDomainUrl(v)) return true;
        }
      } else if (typeof v === 'object' && v !== null) {
        if (hasOffDomainUrl(v)) return true;
      }
    }
  }
  return false;
}

test('every page has valid JSON-LD with correct @type per page kind + no off-domain URLs', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];

  // Map page path patterns to expected @type presence
  function expectedTypes(rel: string): string[] {
    if (rel.startsWith('blog/best-')) return ['WebSite', 'Article'];
    if (rel.startsWith('blog/')) return ['WebSite'];  // blog index
    if (rel.startsWith('solopreneur-')) return ['WebSite', 'SoftwareApplication'];
    if (rel.includes('-') && !rel.startsWith('blog/') && !rel.startsWith('solopreneur-')) {
      // category page like "saas-metrics" — typically CollectionPage
      return ['WebSite'];
    }
    return ['WebSite'];  // about, contact, privacy, terms, etc.
  }

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const blocks = extractJsonLd(html);

    // 1. Every page must have at least 1 JSON-LD block
    if (blocks.length === 0) {
      violations.push(`${lang}/${rel}: no <script type="application/ld+json">`);
      return;
    }

    // 2. Every block must be valid JSON (no parse error)
    for (const block of blocks) {
      if (block['__parseError']) {
        violations.push(`${lang}/${rel}: JSON-LD parse error`);
        return;
      }
    }

    // 3. URLs in JSON-LD must use EXPECTED_DOMAIN
    for (const block of blocks) {
      if (hasOffDomainUrl(block)) {
        violations.push(`${lang}/${rel}: JSON-LD has off-domain URL`);
        return;
      }
    }

    // 4. Check expected @type presence for known page patterns
    const allTypes = blocks.flatMap(b => collectTypes(b));
    for (const expected of expectedTypes(rel)) {
      if (!allTypes.includes(expected)) {
        violations.push(`${lang}/${rel}: missing @type "${expected}" (has: ${allTypes.join(', ')})`);
        return;
      }
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `JSON-LD violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates a regression of JSON-LD emission. ` +
      `Check schema.org structured data in src/layouts/BaseLayout.astro and per-page templates.`
  );
});