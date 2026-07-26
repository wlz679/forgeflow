#!/usr/bin/env node
// P94 — CI guard for JSON-LD FAQPage deep validation.
//
// Why this exists:
//   P92/P93 verify JSON-LD @type presence and field completeness. P94
//   complements them with deep validation of FAQPage structure:
//     - mainEntity must be non-empty array
//     - Each item must have @type=Question
//     - Each Question must have name (question text)
//     - Each acceptedAnswer must have @type=Answer and text (answer text)
//   These fields are required by Google for rich FAQ snippets in search
//   results. Missing fields = no rich snippet = lower CTR.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, matches the
//     21 existing build-dep tests = 22 build-dep suites now)
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
  console.log('[p94] dist/ missing — running pnpm build...');
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

function isNonEmpty(v: unknown): boolean {
  return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && v.length === 0);
}

test('every FAQPage has mainEntity array of Question items with name + acceptedAnswer.text', () => {
  ensureBuilt();
  const enPages = getPages('en');
  const zhPages = getPages('zh');

  const violations: string[] = [];

  function checkPage(rel: string, lang: 'en' | 'zh'): void {
    const html = readFileSync(resolve(root, 'dist', lang, rel), 'utf-8');
    const items = extractJsonLdItems(html);

    for (const item of items) {
      if (item['@type'] !== 'FAQPage') continue;

      // 1. mainEntity must be non-empty array
      const me = item['mainEntity'];
      if (!Array.isArray(me) || me.length === 0) {
        violations.push(`${lang}/${rel}: FAQPage mainEntity is empty or not array`);
        continue;
      }

      // 2. Each item must have @type=Question, name, and acceptedAnswer
      for (let i = 0; i < me.length; i++) {
        const q = me[i] as Record<string, unknown>;
        if (q['@type'] !== 'Question') {
          violations.push(`${lang}/${rel}: FAQPage mainEntity[${i}] @type is ${q['@type']} (expected Question)`);
        }
        if (!isNonEmpty(q['name'])) {
          violations.push(`${lang}/${rel}: FAQPage mainEntity[${i}] missing name (question text)`);
        }
        if (!isNonEmpty(q['acceptedAnswer'])) {
          violations.push(`${lang}/${rel}: FAQPage mainEntity[${i}] missing acceptedAnswer`);
          continue;
        }
        // 3. acceptedAnswer must have @type=Answer and text
        const a = q['acceptedAnswer'] as Record<string, unknown>;
        if (a['@type'] !== 'Answer') {
          violations.push(`${lang}/${rel}: FAQPage mainEntity[${i}].acceptedAnswer @type is ${a['@type']} (expected Answer)`);
        }
        if (!isNonEmpty(a['text'])) {
          violations.push(`${lang}/${rel}: FAQPage mainEntity[${i}].acceptedAnswer missing text`);
        }
      }
    }
  }

  for (const rel of enPages) checkPage(rel, 'en');
  for (const rel of zhPages) checkPage(rel, 'zh');

  assert.equal(
    violations.length,
    0,
    `FAQPage deep validation violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThis indicates FAQPage JSON-LD is missing required fields per schema.org FAQPage spec. ` +
      `Check FAQ emission in engine files and seo-factory.ts.`
  );
});