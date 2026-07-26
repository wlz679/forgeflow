#!/usr/bin/env node
// P93 — CI guard for JSON-LD / structured data field completeness.
//
// Why this exists:
//   P92 (json-ld-guard) verifies each page has JSON-LD with the right @type.
//   This test complements P92 by verifying the FIELDS within each @type
//   are complete per schema.org best practices. Missing required fields
//   reduce rich snippet eligibility and can cause Google Search Console
//   warnings.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     20 existing build-dep tests = 21 build-dep suites now)
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
  console.log('[p93] dist/ missing — running pnpm build...');
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

interface JsonLdItem {
  '@type'?: string;
  [key: string]: unknown;
}

function extractJsonLdItems(html: string): JsonLdItem[] {
  const out: JsonLdItem[] = [];
  const re = /<script\s+type="application\/ld\+json">([\s\S]*?)<\/script>/g;
  for (const m of html.matchAll(re)) {
    try {
      const data = JSON.parse(m[1]!);
      if (data && typeof data === 'object') {
        if (Array.isArray(data['@graph'])) {
          for (const item of data['@graph']) {
            if (item && typeof item === 'object') out.push(item as JsonLdItem);
          }
        } else if (data['@type']) {
          out.push(data as JsonLdItem);
        }
      }
    } catch {
      // skip parse errors (caught by P92 guard)
    }
  }
  return out;
}

test('every JSON-LD @type has its required fields (Article, FAQPage, BreadcrumbList, etc.)', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  // Required fields per @type (per schema.org best practices)
  const requiredFields: Record<string, string[]> = {
    'Article': ['headline', 'image', 'datePublished', 'author'],
    'FAQPage': ['mainEntity'],
    'BreadcrumbList': ['itemListElement'],
    'SoftwareApplication': ['name', 'description'],
    'WebPage': ['name', 'url'],
    'CollectionPage': ['name', 'url'],
    'AboutPage': [],
    'WebSite': ['name', 'url'],
  };

  const violations: string[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const items = extractJsonLdItems(html);
    if (items.length === 0) return; // P92 guard catches missing JSON-LD

    for (const item of items) {
      const type = item['@type'];
      if (!type) continue;
      const required = requiredFields[type];
      if (required === undefined) continue; // unknown type, skip
      for (const field of required) {
        const v = item[field];
        const isMissing =
          v === undefined ||
          v === null ||
          v === '' ||
          (Array.isArray(v) && v.length === 0);
        if (isMissing) {
          violations.push(`${lang}/${rel}: ${type} missing required field "${field}"`);
        }
      }
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `JSON-LD field violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates JSON-LD is missing required fields per schema.org. ` +
      `Check src/lib/seo-factory.ts and per-page structured data emission.`
  );
});