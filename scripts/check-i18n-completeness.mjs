#!/usr/bin/env node
/**
 * Build-time i18n key completeness check.
 * Scans src/i18n/translations.ts for required keys.
 * Exits 1 if any required key is missing.
 *
 * Plan 1 (EEAT): validates eeat.* keys.
 * Plan 2 (About): validates about.* keys.
 * Plan 3 (Category): validates category.* + header.* keys.
 * P2a (Favorites): validates favorites.* keys.
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
  category: (() => {
    const keys = [];
    for (const id of ['A','B','C','D','E','F']) {
      keys.push(`category.${id}.intro.h2`);
      keys.push(`category.${id}.intro.1`, `category.${id}.intro.2`, `category.${id}.intro.3`);
      for (let n = 1; n <= 5; n++) {
        keys.push(`category.${id}.faq.q${n}.q`, `category.${id}.faq.q${n}.a`);
      }
      for (let n = 1; n <= 3; n++) {
        keys.push(`category.${id}.guide.${n}.title`, `category.${id}.guide.${n}.desc`);
      }
    }
    return keys;
  })(),
  header: [
    'header.categories',
  ],
  favorites: [
    'favorites.title',
    'favorites.subtitle',
    'favorites.saved_count',
    'favorites.empty.title',
    'favorites.empty.body',
    'favorites.empty.browse',
    'favorites.header_label',
    'favorites.dropdown.view_all',
    'favorites.dropdown.empty',
    'favorites.toast.quota',
    'favorites.toast.unavailable',
    'favorites.aria.add',
    'favorites.aria.remove',
  ],
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
