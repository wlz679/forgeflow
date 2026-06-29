#!/usr/bin/env node
/**
 * Build-time i18n key completeness check.
 * Scans src/i18n/translations.ts for required keys.
 * Exits 1 if any required key is missing.
 *
 * Plan 1 (EEAT): validates eeat.* keys.
 * Plan 2 (About) and Plan 3 (Category) extend REQUIRED_KEYS with their own keys.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const translationsPath = resolve(root, 'src/i18n/translations.ts');

const REQUIRED_KEYS = {
  eeat: [
    'eeat.title',
    'eeat.reviewed_by',
    'eeat.last_reviewed',
    'eeat.sources',
    'eeat.suggest_improvement',
    'eeat.suggest_body',
    'eeat.team',
    'eeat.author_label',
    'eeat.publisher_label',
    'eeat.contact_email',
  ],
  about: [
    'about.mission.h1',
    'about.mission.body',
    'about.data_sources.h1',
    'about.data_sources.body',
    'about.update_policy.h1',
    'about.update_policy.body',
    'about.editorial_policy.h1',
    'about.editorial_policy.body',
    'about.contact.h1',
    'about.contact.body',
    'about.roadmap.h1',
    'about.roadmap.body',
  ],
  // Plan 3 will add: category.{A-F}.intro.{1-3}, ...faq.q{1-5}, ...guide.{1-3}, header.categories
};

const src = readFileSync(translationsPath, 'utf-8');
const missing = [];

for (const [group, keys] of Object.entries(REQUIRED_KEYS)) {
  for (const key of keys) {
    // Match: 'key': { en: '...', zh: '...' } — key can contain dots
    const re = new RegExp(`'${key.replace(/\./g, '\\.')}':\\s*\\{`, 'm');
    if (!re.test(src)) {
      missing.push(`  [${group}] ${key}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`❌ i18n completeness check failed. Missing ${missing.length} key(s):`);
  for (const k of missing) console.error(k);
  process.exit(1);
}

const total = Object.values(REQUIRED_KEYS).flat().length;
console.log(`✅ i18n completeness check passed (${total} required keys present).`);
