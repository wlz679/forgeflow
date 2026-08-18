#!/usr/bin/env node
// P140c-T4: Build-dep CI guard enforcing per-tier length thresholds for the
// 200 prose files in src/content/tools/. Tier assignments come from
// src/data/prose-tiers.ts (P140c-T1).
//
// Thresholds (P140d C3 — +70% over P140c):
//   Tier-1 (15 anchors): en perH2 ≥ 340 / total ≥ 1400; zh perH2 ≥ 255 / total ≥ 1000
//   Tier-2 (35):         en perH2 ≥ 220 / total ≥  850; zh perH2 ≥ 150 / total ≥  595
//   Tier-3 (50):         en perH2 ≥ 170 / total ≥  680; zh perH2 ≥ 120 / total ≥  425
//
// Build dependency: RUN_BUILD_TESTS=1 required (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { TIER_1_SLUGS, TIER_2_SLUGS, TIER_3_SLUGS, getTier } from '../src/data/prose-tiers.ts';

const root = resolve(import.meta.dirname, '..');

// P23b skip-guard
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const PROSE_DIR = resolve(root, 'src/content/tools');

const TIER_THRESHOLDS = {
  1: { en: { perH2: 340, total: 1400 }, zh: { perH2: 255, total: 1000 } },
  2: { en: { perH2: 220, total: 850 },  zh: { perH2: 150, total: 595 } },
  3: { en: { perH2: 170, total: 680 },  zh: { perH2: 120, total: 425 } },
} as const;

type Lang = 'en' | 'zh';

interface ProseFile { filename: string; lang: Lang; body: string; }

function parseFrontmatter(text: string): { body: string } {
  const m = text.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return { body: m ? m[1] : text };
}

function listProseFiles(): ProseFile[] {
  if (!existsSync(PROSE_DIR)) return [];
  return readdirSync(PROSE_DIR)
    .filter(n => n.endsWith('.md') && n !== '_README.md')
    .map((filename) => {
      const text = readFileSync(resolve(PROSE_DIR, filename), 'utf8');
      const isZh = filename.endsWith('.zh.md');
      const { body } = parseFrontmatter(text);
      return { filename, lang: (isZh ? 'zh' : 'en') as Lang, body };
    });
}

function extractH2Bodies(body: string): string[] {
  // Split body at ## H2 starts; return content of each H2 (between current and next H2).
  const sections = body.split(/\n(?=## )/);
  return sections.slice(1).map(s => {
    const headerEnd = s.indexOf('\n');
    return headerEnd >= 0 ? s.slice(headerEnd + 1).trim() : '';
  });
}

function slugFromFilename(filename: string): string {
  return filename.replace(/\.zh\.md$/, '').replace(/\.md$/, '');
}

test('every prose file meets per-tier length thresholds', () => {
  const files = listProseFiles();
  const failures: string[] = [];
  // Index files by slug → lang → file
  const bySlug = new Map<string, Partial<Record<Lang, ProseFile>>>();
  for (const f of files) {
    const slug = slugFromFilename(f.filename);
    if (!bySlug.has(slug)) bySlug.set(slug, {});
    bySlug.get(slug)![f.lang] = f;
  }
  for (const [slug, langs] of bySlug) {
    const tier = getTier(slug);
    const t = TIER_THRESHOLDS[tier];
    for (const lang of ['en', 'zh'] as Lang[]) {
      const f = langs[lang];
      if (!f) {
        failures.push(`${slug}.${lang}: missing prose file (tier ${tier})`);
        continue;
      }
      const h2Bodies = extractH2Bodies(f.body);
      const totalChars = f.body.replace(/\s+/g, ' ').trim().length;
      if (totalChars < t[lang].total) {
        failures.push(`${slug}.${lang} (tier ${tier}): total ${totalChars} < ${t[lang].total}`);
      }
      for (let i = 0; i < h2Bodies.length; i++) {
        const chars = h2Bodies[i].replace(/\s+/g, ' ').trim().length;
        if (chars < t[lang].perH2) {
          failures.push(`${slug}.${lang} (tier ${tier}) H2[${i}]: ${chars} < ${t[lang].perH2}`);
        }
      }
    }
  }
  assert.equal(
    failures.length,
    0,
    `Tier-prose threshold violations (${failures.length}):\n` +
      failures.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (failures.length > 20 ? `\n  ... and ${failures.length - 20} more` : '')
  );
});

// Sanity check: tier counts match spec
test('tier slug counts match spec (15 + 35 + 50 = 100)', () => {
  assert.equal(TIER_1_SLUGS.length, 15, 'TIER_1_SLUGS must have exactly 15 entries');
  assert.equal(TIER_2_SLUGS.length, 35, 'TIER_2_SLUGS must have exactly 35 entries');
  assert.equal(TIER_3_SLUGS.length, 50, 'TIER_3_SLUGS must have exactly 50 entries');
  const all = new Set([...TIER_1_SLUGS, ...TIER_2_SLUGS, ...TIER_3_SLUGS]);
  assert.equal(all.size, 100, 'tier slug union must have exactly 100 unique slugs');
});
