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

// Candidate thresholds — different combinations
const CANDIDATES = [
  { name: 'A modest +20%', t1zhPerH2: 180, t1zhTotal: 720, t1enPerH2: 240, t1enTotal: 1000,
    t2zhPerH2: 110, t2zhTotal: 420, t2enPerH2: 160, t2enTotal: 600,
    t3zhPerH2: 85, t3zhTotal: 300, t3enPerH2: 120, t3enTotal: 500 },
  { name: 'B mid +35%',     t1zhPerH2: 200, t1zhTotal: 810, t1enPerH2: 270, t1enTotal: 1100,
    t2zhPerH2: 120, t2zhTotal: 470, t2enPerH2: 175, t2enTotal: 680,
    t3zhPerH2: 95, t3zhTotal: 340, t3enPerH2: 135, t3enTotal: 540 },
  { name: 'C1 strong +50%', t1zhPerH2: 225, t1zhTotal: 900, t1enPerH2: 300, t1enTotal: 1200,
    t2zhPerH2: 135, t2zhTotal: 525, t2enPerH2: 195, t2enTotal: 750,
    t3zhPerH2: 105, t3zhTotal: 375, t3enPerH2: 150, t3enTotal: 600 },
  { name: 'C2 stronger +60%', t1zhPerH2: 240, t1zhTotal: 960, t1enPerH2: 320, t1enTotal: 1300,
    t2zhPerH2: 145, t2zhTotal: 560, t2enPerH2: 210, t2enTotal: 800,
    t3zhPerH2: 115, t3zhTotal: 400, t3enPerH2: 160, t3enTotal: 650 },
  { name: 'C3 max +70%', t1zhPerH2: 255, t1zhTotal: 1000, t1enPerH2: 340, t1enTotal: 1400,
    t2zhPerH2: 150, t2zhTotal: 600, t2enPerH2: 220, t2enTotal: 850,
    t3zhPerH2: 120, t3zhTotal: 425, t3enPerH2: 170, t3enTotal: 680 },
];

function countFailures(c) {
  const counts = { t1: { en: 0, zh: 0 }, t2: { en: 0, zh: 0 }, t3: { en: 0, zh: 0 } };
  const h2Failures = { t1: { en: 0, zh: 0 }, t2: { en: 0, zh: 0 }, t3: { en: 0, zh: 0 } };
  for (const s of stats) {
    const cfg = s.tier === 1 ? { perH2: c.t1zhPerH2, total: c.t1zhTotal, enP: c.t1enPerH2, enT: c.t1enTotal }
              : s.tier === 2 ? { perH2: c.t2zhPerH2, total: c.t2zhTotal, enP: c.t2enPerH2, enT: c.t2enTotal }
              : { perH2: c.t3zhPerH2, total: c.t3zhTotal, enP: c.t3enPerH2, enT: c.t3enTotal };
    const thPerH2 = s.lang === 'zh' ? cfg.perH2 : cfg.enP;
    const thTotal = s.lang === 'zh' ? cfg.total : cfg.enT;
    const tKey = `t${s.tier}`;
    if (s.total < thTotal) counts[tKey][s.lang]++;
    if (s.minH2 < thPerH2) h2Failures[tKey][s.lang]++;
  }
  return { counts, h2Failures };
}

console.log('| Candidate | T1 en fail (perH2/total) | T1 zh | T2 en | T2 zh | T3 en | T3 zh | TOTAL files | TOTAL H2s |');
console.log('|-----------|---------------------------|-------|-------|-------|-------|-------|-------------|-----------|');
for (const c of CANDIDATES) {
  const { counts, h2Failures } = countFailures(c);
  let totalF = 0, totalH = 0;
  for (const t of ['t1','t2','t3']) {
    totalF += counts[t].en + counts[t].zh;
    totalH += h2Failures[t].en + h2Failures[t].zh;
  }
  console.log(`| ${c.name} | ${counts.t1.en}/${counts.t1.zh} | ${counts.t1.en}/${counts.t1.zh} | ${counts.t2.en}/${counts.t2.zh} | ${counts.t2.en}/${counts.t2.zh} | ${counts.t3.en}/${counts.t3.zh} | ${counts.t3.en}/${counts.t3.zh} | ${totalF} | ${totalH} |`);
}

// For C1 strong, list worst T2 zh files
console.log('\n=== C1 strong detail (T2 zh perH2=135, total=525) ===');
const c1 = CANDIDATES[2];
const t2zh = stats.filter(s => s.tier === 2 && s.lang === 'zh').sort((a, b) => a.minH2 - b.minH2);
console.log(`Files with minH2 < ${c1.t2zhPerH2}:`);
for (const s of t2zh.filter(s => s.minH2 < c1.t2zhPerH2)) {
  console.log(`  ${s.slug}: minH2=${s.minH2}, total=${s.total}`);
}
console.log(`Files with total < ${c1.t2zhTotal}:`);
for (const s of t2zh.filter(s => s.total < c1.t2zhTotal)) {
  console.log(`  ${s.slug}: minH2=${s.minH2}, total=${s.total}`);
}