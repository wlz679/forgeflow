#!/usr/bin/env node
// P140f-T7b: Build-dep guard for Topic Benchmark page structure.
// Verifies every Tier 1 anchor Topic Benchmark has the 4 mandatory H2
// sections + data table + JSON-LD Dataset schema + breadcrumb.

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
  en: ['What we measure', 'benchmarks', 'How to use', 'Sources'],
  zh: ['测量指标', '行业基准', '如何使用', '来源'],
};

test('every Tier 1 Topic Benchmark has 4 mandatory H2 sections + Dataset schema + data table', () => {
  buildWithEnv({});

  const violations: string[] = [];
  for (const lang of LANGS) {
    const markers = REQUIRED_H2_MARKERS[lang];
    for (const topic of TOPICS.filter((t) => t.tier === 1)) {
      const cat = categories.find((c) => c.id === topic.letterId);
      const letterSlug = cat ? cat.slug : topic.letterId;
      const htmlPath = resolve(root, 'dist', lang, letterSlug, `${topic.id}-benchmark`, 'index.html');
      if (!existsSync(htmlPath)) {
        violations.push(`${lang}/${letterSlug}/${topic.id}-benchmark: file missing`);
        continue;
      }
      const html = readFileSync(htmlPath, 'utf-8');

      for (const marker of markers) {
        if (!html.includes(marker)) {
          violations.push(`${lang}/${letterSlug}/${topic.id}-benchmark: missing H2 containing "${marker}"`);
        }
      }
      if (!html.includes('"@type":"Dataset"')) {
        violations.push(`${lang}/${letterSlug}/${topic.id}-benchmark: missing JSON-LD Dataset schema`);
      }
      if (!html.includes('<table')) {
        violations.push(`${lang}/${letterSlug}/${topic.id}-benchmark: missing <table> element`);
      }
      if (!html.includes('aria-label="Breadcrumb"')) {
        violations.push(`${lang}/${letterSlug}/${topic.id}-benchmark: missing Breadcrumb component`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Topic Benchmark shape issues (${violations.length}):\n` +
      violations.slice(0, 20).map((v) => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : ''),
  );
});