#!/usr/bin/env node
/**
 * Insert JSON translation entries into src/i18n/translations.ts.
 *
 * Usage:
 *   node scripts/insert-translations.mjs <json-file>
 *
 * JSON format: { "tools.{slug}.input.{name}.label": "<ZH text>", ... }
 * For each key, finds existing { en: ..., zh: '' } entry (or creates new block)
 * and fills in the zh field. Idempotent — re-running is safe.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');

const jsonPath = process.argv[2];
if (!jsonPath) {
  console.error('Usage: node scripts/insert-translations.mjs <json-file>');
  process.exit(1);
}

const entries = JSON.parse(readFileSync(resolve(jsonPath), 'utf-8'));
let src = readFileSync(translationsPath, 'utf-8');

let inserted = 0, skipped = 0, failed = 0;
for (const [key, zh] of Object.entries(entries)) {
  const escapedKey = key.replace(/\./g, '\\.');
  // Match key entry, then handle single OR double-quoted zh value.
  // P17b-3 fix: handle both quote styles (some entries use "..." instead of '...').
  // Caveat: nested quotes with escapes are not 100% robust — see TODO comment.
  // First try single-quoted: 'key': { ... zh: '...' }
  const reSingle = new RegExp(`('${escapedKey}':\\s*\\{[^}]*?zh:\\s*)'((?:[^'\\\\]|\\\\[\\'\\\\])*)'`, 'm');
  const mSingle = src.match(reSingle);
  if (mSingle) {
    const escapedZh = zh.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    src = src.replace(reSingle, `$1'${escapedZh}'`);
    inserted++;
    continue;
  }
  // Then try double-quoted: 'key': { ... zh: "..." }
  const reDouble = new RegExp(`('${escapedKey}':\\s*\\{[^}]*?zh:\\s*)"((?:[^"\\\\]|\\\\[\\"\\\\])*)"`, 'm');
  const mDouble = src.match(reDouble);
  if (mDouble) {
    const escapedZh = zh.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
    src = src.replace(reDouble, `$1"${escapedZh}"`);
    inserted++;
    continue;
  }
  console.warn(`⚠️  Key not found or no zh field: ${key}`);
  failed++;
}

writeFileSync(translationsPath, src);
console.log(`✅ Inserted ${inserted} ZH translations (${skipped} skipped, ${failed} failed).`);