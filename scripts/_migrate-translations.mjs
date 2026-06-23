#!/usr/bin/env node
// scripts/_migrate-translations.mjs
// ONE-SHOT: Reads src/i18n/translations.ts and emits src/i18n/locales/{en,zh}.json
// Delete this file after running.

import fs from 'node:fs';
import path from 'node:path';

const SRC = 'src/i18n/translations.ts';
const OUT_DIR = 'src/i18n/locales';

const content = fs.readFileSync(SRC, 'utf8');
const en = {};
const zh = {};

// Match: 'some.key': { en: '...', zh: '...' },
// Accepts both single- and double-quoted values (apostrophe-bearing English strings
// use double quotes for `en` so the apostrophe doesn't need escaping).
// Backreferences \2 and \4 capture the opening quote of en/zh values respectively.
const entryRe = /'([^']+)':\s*\{\s*en:\s*(['"])((?:(?!\2)[^\\]|\\.)*)\2\s*,\s*zh:\s*(['"])((?:(?!\4)[^\\]|\\.)*)\4\s*,?\s*\}/g;

let m;
let count = 0;
while ((m = entryRe.exec(content)) !== null) {
  const [, key, , enVal, , zhVal] = m;
  en[key] = unescape(enVal);
  zh[key] = unescape(zhVal);
  count++;
}

fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, 'en.json'), JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(path.join(OUT_DIR, 'zh.json'), JSON.stringify(zh, null, 2) + '\n');

console.log(`Migrated ${count} entries to ${OUT_DIR}/{en,zh}.json`);