#!/usr/bin/env node
// P97 — CI guard for JSON-LD BreadcrumbList position validation.
//
// Why this exists:
//   P92-P94 verify JSON-LD presence + field completeness. P97 verifies
//   the structural integrity of BreadcrumbList.itemListElement:
//     1. Must be non-empty array
//     2. Each item has @type=ListItem
//     3. Positions are 1, 2, 3, ... (consecutive starting from 1)
//     4. Each item has name + item (URL)
//   Per schema.org BreadcrumbList spec, Google displays breadcrumbs in
//   SERPs only when positions are correct. Wrong positions = no rich snippet.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     24 existing build-dep tests = 25 build-dep suites now)
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
  console.log('[p97] dist/ missing — running pnpm build...');
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
  // Use depth counter to prevent stack overflow from symlink cycles
  function walk(d: string, relBase: string, depth: number = 0): void {
    if (depth > 10) return; // safety: dist/ has at most ~5 levels
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

test('every BreadcrumbList has itemListElement with sequential position 1, 2, 3...', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const items = extractJsonLdItems(html);

    for (const item of items) {
      if (item['@type'] !== 'BreadcrumbList') continue;

      // 1. itemListElement must be non-empty array
      const li = item['itemListElement'];
      if (!Array.isArray(li) || li.length === 0) {
        violations.push(`${lang}/${rel}: BreadcrumbList itemListElement is empty or not array`);
        continue;
      }

      // 2. Each item must have @type=ListItem + position + name + item
      const positions: number[] = [];
      for (let i = 0; i < li.length; i++) {
        const entry = li[i] as Record<string, unknown>;
        if (entry['@type'] !== 'ListItem') {
          violations.push(`${lang}/${rel}: BreadcrumbList itemListElement[${i}] @type is ${entry['@type']} (expected ListItem)`);
        }
        if (typeof entry['position'] !== 'number') {
          violations.push(`${lang}/${rel}: BreadcrumbList itemListElement[${i}] missing or non-numeric position`);
          continue;
        }
        positions.push(entry['position']);
        if (typeof entry['name'] !== 'string' || entry['name'] === '') {
          violations.push(`${lang}/${rel}: BreadcrumbList itemListElement[${i}] missing name`);
        }
        if (typeof entry['item'] !== 'string' || entry['item'] === '') {
          violations.push(`${lang}/${rel}: BreadcrumbList itemListElement[${i}] missing item (URL)`);
        }
      }

      // 3. Positions must be 1, 2, 3, ... (sequential starting from 1)
      for (let i = 0; i < positions.length; i++) {
        if (positions[i] !== i + 1) {
          violations.push(`${lang}/${rel}: BreadcrumbList position[${i}] = ${positions[i]} (expected ${i + 1})`);
        }
      }
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `BreadcrumbList position violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates BreadcrumbList JSON-LD has wrong position values per schema.org. ` +
      `Check src/lib/seo-factory.ts createBreadcrumb3 function.`
  );
});