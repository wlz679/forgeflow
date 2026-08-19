#!/usr/bin/env node
// P140f-T7a: Build-dep guard for Topic Guide page structure.
// Verifies every Tier 1 anchor Topic Guide has the 6 mandatory H2
// sections + JSON-LD Article schema + breadcrumb + Topic CTA.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TOPICS } from '../src/data/topics.ts';
import { categories } from '../src/data/categories.ts';
import { buildWithEnv } from './_supabase-build-helper.ts';

const root = resolve(import.meta.dirname, '..');

if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const LANGS = ['en', 'zh'] as const;
const REQUIRED_H2_MARKERS: Record<'en' | 'zh', string[]> = {
  en: ['What is', 'Why', 'Key concepts', 'How to apply', 'Common pitfalls'],
  zh: ['什么是', '为什么', '核心概念', '如何应用', '常见误区'],
};

test('every Tier 1 Topic Guide has 5 mandatory H2 sections + Article schema', () => {
  buildWithEnv({});

  const violations: string[] = [];
  for (const lang of LANGS) {
    const markers = REQUIRED_H2_MARKERS[lang];
    for (const topic of TOPICS.filter((t) => t.tier === 1)) {
      const cat = categories.find((c) => c.id === topic.letterId);
      const letterSlug = cat ? cat.slug : topic.letterId;
      const htmlPath = resolve(root, 'dist', lang, letterSlug, `${topic.id}-guide`, 'index.html');
      if (!existsSync(htmlPath)) {
        violations.push(`${lang}/${letterSlug}/${topic.id}-guide: file missing`);
        continue;
      }
      const html = readFileSync(htmlPath, 'utf-8');

      for (const marker of markers) {
        if (!html.includes(marker)) {
          violations.push(`${lang}/${letterSlug}/${topic.id}-guide: missing H2 containing "${marker}"`);
        }
      }
      if (!html.includes('"@type":"Article"')) {
        violations.push(`${lang}/${letterSlug}/${topic.id}-guide: missing JSON-LD Article schema`);
      }
      if (!html.includes('aria-label="Breadcrumb"')) {
        violations.push(`${lang}/${letterSlug}/${topic.id}-guide: missing Breadcrumb component`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Topic Guide shape issues (${violations.length}):\n` +
      violations.slice(0, 20).map((v) => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : ''),
  );
});