#!/usr/bin/env node
/**
 * Build-time i18n key completeness check.
 * Scans src/i18n/translations.ts for required keys.
 * Exits 1 if any required key is missing.
 *
 * Plan 1 (EEAT): validates eeat.* keys.
 * Plan 2 (About): validates about.* keys.
 * Plan 3 (Category): validates category.* + header.* keys.
 * Plan 4 (Tools): validates tools.{slug}.{title|description} for ALL engines
 *                 in src/data/tools/*.ts (auto-derives required key list).
 * P2a (Favorites): validates favorites.* keys.
 * P2b (Recent): validates recent.* keys.
 * P2c (History): validates history.* keys.
 * P17 (i18n backfill): extended to validate category.{X}.name + .desc for ALL
 *                      categories, and tools.{slug}.title + .description for
 *                      ALL tools. Engine-level input/FAQ/how-to-use keys are
 *                      NOT yet validated (P17b follow-up).
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
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
  recent: [
    'recent.title',
    'recent.subtitle',
    'recent.empty.title',
    'recent.empty.body',
    'recent.empty.browse',
    'recent.header_label',
    'recent.dropdown.view_all',
    'recent.dropdown.empty',
    'recent.time.just_now',
    'recent.time.hours_ago',
    'recent.time.days_ago',
  ],
  history: [
    'history.title',
    'history.subtitle',
    'history.empty.title',
    'history.empty.body',
    'history.empty.browse',
    'history.header_label',
    'history.dropdown.view_all',
    'history.dropdown.empty',
    'history.btn.save',
    'history.btn.saved',
    'history.btn.restore',
    'history.btn.delete',
    'history.clear_all',
    'history.clear_all.confirm',
  ],
};

// P17: Dynamically derive required category.{X}.name + .desc and
// tools.{slug}.title + .description from source data. This catches new
// engines/categories that ship without i18n keys.
const toolKeys = [];
const categoryKeys = [];

// Read categories
const catsSrc = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf-8');
const catRe = /\{\s*id:\s*'([A-Z])'/g;
let m;
while ((m = catRe.exec(catsSrc)) !== null) {
  categoryKeys.push(`category.${m[1]}.name`, `category.${m[1]}.desc`);
}

// Read tools
const toolsDir = resolve(root, 'src/data/tools');
for (const file of readdirSync(toolsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')) {
  const content = readFileSync(resolve(toolsDir, file), 'utf-8');
  const slugRe = /slug:\s*'([^']+)'/g;
  while ((m = slugRe.exec(content)) !== null) {
    toolKeys.push(`tools.${m[1]}.title`, `tools.${m[1]}.description`);
  }
}

REQUIRED_KEYS.dynamic_category = categoryKeys;
REQUIRED_KEYS.dynamic_tools = toolKeys;

const src = readFileSync(translationsPath, 'utf-8');

// Read extract output (if exists)
// P20-1: extract output moved to _archive/ by P19-2; this path must match.
const extractPath = resolve(root, 'scripts/.scratch/_archive/i18n-needed.json');
let extractData = null;
try {
  extractData = JSON.parse(readFileSync(extractPath, 'utf-8'));
} catch {
  console.warn('⚠️  scripts/.scratch/_archive/i18n-needed.json not found — run `node scripts/extract-i18n-needed.mjs` first');
}

// Scan engines for engineKey=true flag
const engineKeyEngines = []; // [{slug, file}]
function walk(dir) {
  const out = [];
  for (const f of readdirSync(dir)) {
    const p = resolve(dir, f);
    if (statSync(p).isDirectory()) out.push(...walk(p));
    else if (f.endsWith('.ts') && f !== 'index.ts') out.push(p);
  }
  return out;
}
const allEngines = walk(resolve(root, 'src/engines'));
for (const enginePath of allEngines) {
  const content = readFileSync(enginePath, 'utf-8');
  if (/engineKey:\s*true/.test(content)) {
    const slugMatch = content.match(/slug:\s*['"]([^'"]+)['"]/);
    if (slugMatch) engineKeyEngines.push({ slug: slugMatch[1], file: enginePath });
  }
}

// For each engineKey=true engine, validate ALL its required keys are in translations.ts
const engineMissing = [];
if (extractData) {
  for (const { slug } of engineKeyEngines) {
    const tool = extractData.tools.find(t => t.slug === slug);
    if (!tool) continue;
    const requiredKeys = [];
    // input labels
    for (const [name, _label] of Object.entries(tool.inputLabels || {})) {
      requiredKeys.push(`tools.${slug}.input.${name}.label`);
    }
    // input placeholders (if present)
    for (const name of Object.keys(tool.inputPlaceholders || {})) {
      requiredKeys.push(`tools.${slug}.input.${name}.placeholder`);
    }
    // faq
    for (let i = 0; i < (tool.faq || []).length; i++) {
      requiredKeys.push(`tools.${slug}.faq.${i}.q`, `tools.${slug}.faq.${i}.a`);
    }
    // how_to_use
    for (let i = 0; i < (tool.howToUse || []).length; i++) {
      requiredKeys.push(`tools.${slug}.how_to_use.${i}`);
    }
    // Validate each key
    for (const key of requiredKeys) {
      const re = new RegExp(`'${key.replace(/\./g, '\\.')}':\\s*\\{`, 'm');
      if (!re.test(src)) {
        engineMissing.push(`  [engine:${slug}] ${key}`);
      }
    }
  }
}

// Final summary
if (engineMissing.length > 0) {
  console.error(`❌ Engine-level i18n check failed. ${engineMissing.length} key(s) missing for engineKey=true engines:`);
  for (const k of engineMissing) console.error(k);
  process.exit(1);
}
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
  console.error('\nTo fix:');
  console.error('  - Add category.*.name / category.*.desc to translations.ts');
  console.error('  - Add tools.{slug}.title / tools.{slug}.description to translations.ts');
  console.error('  - Run scripts/extract-i18n-needed.mjs for the full required list');
  process.exit(1);
}

const total = Object.values(REQUIRED_KEYS).flat().length;
const dynCount = REQUIRED_KEYS.dynamic_category.length + REQUIRED_KEYS.dynamic_tools.length;
const engineCompleteCount = engineKeyEngines.length;
console.log(`✅ i18n completeness check passed (${total} required keys: eeat/about/category.{A-F}.*/header/favorites/recent/history + ${dynCount} dynamic: ${categoryKeys.length} category names/descs + ${toolKeys.length} tool titles/descs + ${engineCompleteCount} engineKey=true engines fully translated).`);