#!/usr/bin/env node
/**
 * Apply ZH terminology fixes to src/i18n/translations.ts.
 * Reads scripts/.scratch/zh-terminology-audit-curated.json (curated, post-review).
 *
 * Usage: node scripts/fix-zh-terminology.mjs
 *
 * Input format: array of { key, forbidden, canonical }
 *   e.g., [{ "key": "tools.x.input.y.label", "forbidden": "管线", "canonical": "销售渠道" }]
 *
 * P18-3: closes the audit loop.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { replaceZhValue } from './lib/zh-parser.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');
const auditJsonPath = resolve(root, 'scripts/.scratch/zh-terminology-audit-curated.json');

let fixes;
try {
  fixes = JSON.parse(readFileSync(auditJsonPath, 'utf-8'));
} catch (err) {
  console.error(`ERROR: could not read curated audit JSON at ${auditJsonPath}.`);
  console.error(`  ${err.message}`);
  console.error(`  Run audit (Step 3) and curate (Step 5) first; this is an apply-only step.`);
  process.exit(1);
}

if (!Array.isArray(fixes) || fixes.length === 0) {
  console.error(`ERROR: curated audit JSON is empty or malformed.`);
  process.exit(1);
}

let src = readFileSync(translationsPath, 'utf-8');
let applied = 0;

for (const fix of fixes) {
  if (!fix || typeof fix.key !== 'string' || typeof fix.forbidden !== 'string' || typeof fix.canonical !== 'string') {
    console.error(`Skipping malformed fix entry: ${JSON.stringify(fix)}`);
    continue;
  }
  // Use the canonical state-machine replacer from P18-1 (scripts/lib/zh-parser.mjs).
  // We don't ship a local copy here — single source of truth avoids drift.
  const escapedKey = fix.key.replace(/\./g, '\\.');
  const keyRe = new RegExp(`'${escapedKey}':\\s*\\{`, 'g');
  const km = keyRe.exec(src);
  if (!km) {
    console.error(`Key not found: ${fix.key}`);
    continue;
  }
  const objStart = km.index;
  const objEnd = src.indexOf('}', objStart);
  if (objEnd === -1) continue;
  const obj = src.substring(objStart, objEnd + 1);
  const zhKw = obj.match(/zh:\s*/);
  if (!zhKw) continue;
  let zi = obj.indexOf(zhKw[0]) + zhKw[0].length;
  while (zi < obj.length && /\s/.test(obj[zi])) zi++;
  if (zi >= obj.length) continue;
  // Extract raw zh (with escapes) via simple walk (string is single-quoted, escapes are \' \\)
  const quote = obj[zi];
  let j = zi + 1;
  let raw = '';
  while (j < obj.length) {
    if (obj[j] === '\\') {
      raw += obj[j] + obj[j + 1];
      j += 2;
      continue;
    }
    if (obj[j] === quote) break;
    raw += obj[j];
    j++;
  }
  // Unescape, replace, hand to replaceZhValue (which re-escapes on the way out)
  const unescaped = raw.replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
  if (!unescaped.includes(fix.forbidden)) continue;
  const updated = unescaped.split(fix.forbidden).join(fix.canonical);
  const before = src;
  src = replaceZhValue(src, fix.key, updated);
  if (src !== before) applied++;
}

writeFileSync(translationsPath, src);
console.log(`Applied ${applied} terminology fixes (out of ${fixes.length} audited).`);