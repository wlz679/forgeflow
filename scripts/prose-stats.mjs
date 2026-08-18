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
const stats = [];

for (const fn of files) {
  const text = readFileSync(resolve(PROSE_DIR, fn), 'utf8');
  const slug = fn.replace(/\.zh\.md$/, '').replace(/\.md$/, '');
  const lang = fn.endsWith('.zh.md') ? 'zh' : 'en';
  const tier = T1.has(slug) ? 1 : T2.has(slug) ? 2 : 3;
  const body = parseFrontmatter(text);
  const total = chars(body);
  const h2s = extractH2Bodies(body).map(chars);
  const minH2 = h2s.length ? Math.min(...h2s) : 0;
  stats.push({ slug, lang, tier, total, minH2 });
}

const pct = (arr, p) => {
  const sorted = [...arr].sort((a, b) => a - b);
  const i = Math.floor(sorted.length * p);
  return sorted[Math.min(i, sorted.length - 1)];
};

const groups = {};
for (const s of stats) {
  const k = `t${s.tier}-${s.lang}`;
  if (!groups[k]) groups[k] = [];
  groups[k].push(s);
}

console.log('| Group | n | total p10/p25/p50/p75/p90 | minH2 p10/p25/p50/p75/p90 |');
console.log('|-------|---|--------------------------|---------------------------|');
for (const k of Object.keys(groups).sort()) {
  const arr = groups[k];
  const totals = arr.map(s => s.total);
  const minH2s = arr.map(s => s.minH2);
  console.log(`| ${k} | ${arr.length} | ${pct(totals, 0.1)}/${pct(totals, 0.25)}/${pct(totals, 0.5)}/${pct(totals, 0.75)}/${pct(totals, 0.9)} | ${pct(minH2s, 0.1)}/${pct(minH2s, 0.25)}/${pct(minH2s, 0.5)}/${pct(minH2s, 0.75)}/${pct(minH2s, 0.9)} |`);
}

const worst = [...stats].sort((a, b) => a.minH2 - b.minH2).slice(0, 12);
console.log('\nWorst minH2 offenders:');
for (const s of worst) {
  console.log(`  ${s.slug}.${s.lang} (t${s.tier}): minH2=${s.minH2}, total=${s.total}`);
}

// Tier-1 zh current threshold = 150 perH2; what's the lowest tier-1 zh file?
console.log('\nTier-1 zh files (current threshold = 150 perH2, 600 total):');
const t1zh = stats.filter(s => s.tier === 1 && s.lang === 'zh').sort((a, b) => a.minH2 - b.minH2);
for (const s of t1zh) {
  console.log(`  ${s.slug}: minH2=${s.minH2}, total=${s.total}`);
}