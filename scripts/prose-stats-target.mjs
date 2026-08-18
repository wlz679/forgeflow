#!/usr/bin/env node
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { TIER_1_SLUGS, TIER_2_SLUGS } from '../src/data/prose-tiers.ts';

const ROOT = process.cwd();
const PROSE_DIR = resolve(ROOT, 'src/content/tools');

const T1 = new Set(TIER_1_SLUGS);
const T2 = new Set(TIER_2_SLUGS);

function parseFrontmatter(text) {
  const m = text.match(/^---\n[\s\S]*?\n---\n?([\s\S]*)$/);
  return m ? m[1] : text;
}
function extractH2Bodies(body) {
  const sections = body.split(/\n(?=## )/);
  return sections.slice(1).map(s => {
    const headerEnd = s.indexOf('\n');
    return headerEnd >= 0 ? s.slice(headerEnd + 1).trim() : '';
  });
}
function chars(s) { return s.replace(/\s+/g, ' ').trim().length; }

const files = readdirSync(PROSE_DIR).filter(n => n.endsWith('.md') && n !== '_README.md');
const data = [];
for (const fn of files) {
  const text = readFileSync(resolve(PROSE_DIR, fn), 'utf8');
  const slug = fn.replace(/\.zh\.md$/, '').replace(/\.md$/, '');
  const lang = fn.endsWith('.zh.md') ? 'zh' : 'en';
  const tier = T1.has(slug) ? 1 : T2.has(slug) ? 2 : 3;
  const body = parseFrontmatter(text);
  const total = chars(body);
  const h2s = extractH2Bodies(body).map(chars);
  data.push({ slug, lang, tier, total, h2s });
}

// C3 thresholds (+70%)
const TH = {
  1: { en: { perH2: 340, total: 1400 }, zh: { perH2: 255, total: 1000 } },
  2: { en: { perH2: 220, total: 850 },  zh: { perH2: 150, total: 595 } },
  3: { en: { perH2: 170, total: 680 },  zh: { perH2: 120, total: 425 } },
};

const h2Failures = [];
for (const f of data) {
  const t = TH[f.tier][f.lang];
  for (let i = 0; i < f.h2s.length; i++) {
    if (f.h2s[i] < t.perH2) {
      h2Failures.push({ slug: f.slug, lang: f.lang, tier: f.tier, h2Idx: i, chars: f.h2s[i], threshold: t.perH2, need: t.perH2 - f.h2s[i] });
    }
  }
  if (f.total < t.total) {
    h2Failures.push({ slug: f.slug, lang: f.lang, tier: f.tier, h2Idx: -1, chars: f.total, threshold: t.total, need: t.total - f.total });
  }
}

h2Failures.sort((a, b) => a.tier - b.tier || a.lang.localeCompare(b.lang) || a.need - b.need);

console.log(`Total H2 failures at C3: ${h2Failures.length}`);
console.log('| Tier | Lang | Slug | H2 idx | Chars | Threshold | Need to add |');
console.log('|------|------|------|--------|-------|-----------|-------------|');
for (const f of h2Failures) {
  const where = f.h2Idx === -1 ? '(total)' : `H2[${f.h2Idx}]`;
  console.log(`| T${f.tier} | ${f.lang} | ${f.slug} | ${where} | ${f.chars} | ${f.threshold} | +${f.need} |`);
}

const totalCharsToAdd = h2Failures.reduce((s, f) => s + f.need, 0);
console.log(`\nTotal characters to add: ${totalCharsToAdd}`);