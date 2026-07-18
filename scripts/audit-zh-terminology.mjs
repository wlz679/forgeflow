#!/usr/bin/env node
/**
 * Audit src/i18n/translations.ts for ZH terminology mismatches against docs/i18n/zh-terminology.md.
 * Outputs flagged entries as JSON for human/scripted review.
 *
 * Usage: node scripts/audit-zh-terminology.mjs [--fix-dry-run]
 *
 * P18-3: closes the cross-batch ZH terminology drift flagged by P17b Task 5 reviewer.
 */
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');
const glossaryPath = resolve(root, 'docs/i18n/zh-terminology.md');

const src = readFileSync(translationsPath, 'utf-8');
const glossary = readFileSync(glossaryPath, 'utf-8');

// Parse glossary table: rows of `| EN | ZH | Domain | Notes |`
const glossaryRows = glossary.split('\n').filter(l => l.startsWith('|') && !l.includes('---') && !l.includes('EN | ZH'));
const glossaryMap = new Map(); // forbidden-ZH → canonical-ZH (lowercase keys)
for (const row of glossaryRows) {
  const cols = row.split('|').map(c => c.trim()).filter(Boolean);
  if (cols.length < 2) continue;
  const en = cols[0];
  const zh = cols[1];
  // Notes column may list "NOT xxx" — collect forbidden ZH variants
  const notesCol = cols.slice(3).join(' ');
  const notMatches = [...notesCol.matchAll(/NOT\s+([^，,。\s]+)/g)].map(m => m[1]);
  for (const forbidden of notMatches) {
    glossaryMap.set(forbidden, { canonical: zh, en, context: notesCol });
  }
}

// Walk translations.ts — find each 'key': { en: ..., zh: ... } entry
const entryRe = /'([^']+)':\s*\{\s*en:\s*'([^']*)',\s*zh:\s*'((?:[^'\\]|\\.)*)'\s*\}/g;
const findings = [];
let m;
while ((m = entryRe.exec(src)) !== null) {
  const [, key, en, zhRaw] = m;
  // Unescape zh
  const zh = zhRaw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  for (const [forbidden, info] of glossaryMap) {
    if (zh.includes(forbidden)) {
      findings.push({ key, en, zh, forbidden, canonical: info.canonical, contextEN: info.en });
    }
  }
}

console.log(JSON.stringify(findings, null, 2));
console.error(`\nTotal flagged: ${findings.length}`);