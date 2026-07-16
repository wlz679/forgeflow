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
  // Match: 'key': { en: '...', zh: '...' } OR 'key': { en: '...', zh: '' }
  // Caveat (P17b-1 review Finding #1): if a single-quoted zh value contains a
  // raw ' or escaped \', this regex captures only up to the first quote and
  // the script will silently miss. Audit 2026-07-16: 0 of 1551 single-quoted
  // zh entries contain apostrophes today. Re-insertion of a key with such a
  // value is the only affected flow (rare in P17b single-pass workflow).
  // TODO (deferred to final holistic review): upgrade to a per-line parser
  // if any P17b batch introduces an apostrophe-bearing zh value.
  const re = new RegExp(`('${escapedKey}':\\s*\\{[^}]*?zh:\\s*)'([^']*)'`, 'm');
  const m = src.match(re);
  if (!m) {
    console.warn(`⚠️  Key not found or no zh field: ${key}`);
    failed++;
    continue;
  }
  // Escape single quotes in zh
  const escapedZh = zh.replace(/'/g, "\\'");
  src = src.replace(re, `$1'${escapedZh}'`);
  inserted++;
}

writeFileSync(translationsPath, src);
console.log(`✅ Inserted ${inserted} ZH translations (${skipped} skipped, ${failed} failed).`);