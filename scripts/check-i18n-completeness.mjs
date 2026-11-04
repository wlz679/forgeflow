#!/usr/bin/env node
/**
 * Build-time i18n key completeness check.
 * Validates that required keys exist in BOTH src/i18n/locales/en.json
 * AND src/i18n/locales/zh.json (per-locale JSON files).
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
 *
 * P150: migration from translations.ts → per-locale JSON. The regex scan
 *       over translations.ts source is replaced by JSON.parse + key lookup.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const enPath = resolve(root, 'src/i18n/locales/en.json');
const zhPath = resolve(root, 'src/i18n/locales/zh.json');

// P153-E2: this list had drifted into a SECOND, contradictory contract.
// It still demanded five keys that nothing renders anywhere:
//   eeat.reviewed_by / eeat.team / eeat.author_label / eeat.publisher_label
//   favorites.saved_count
// The E-E-A-T block (src/components/EeatTrustBlock.astro) renders the
// author's name and `eeat.author_role.${role}` directly — it never prints
// an "Author" / "Publisher" / "Reviewed by" label — and the favorites page
// renders favorites.title / .subtitle / .empty.*, never a saved-count
// string. Meanwhile the orphan-key guard (tests/translation-glossary-guard)
// proved the same five keys were referenced by no t() call.
//
// Two gates disagreed about the same keys, and the build gate was the
// stricter one, so deleting the keys broke `pnpm build` (its prebuild step
// runs this check) — which wiped dist/ mid-suite and cascaded into a dozen
// unrelated dist/-reading failures.
//
// The contract now lists only keys the site actually renders. If a future
// component starts printing one of the removed labels, add it back here
// AND wire it into a t() call — the two lists then agree again.
// P167: 分类清单**从 src/data/categories.ts 派生**（不再手写 ['A','B','C','D','E','F']）。
//
// * 为什么：那份手写清单是**第二份真相源** —— P167 把 9 个分类补成同形时，它会静默地
//   少覆盖那 9 个分类（与 P164 的「开了第二份清单 ⇒ 既有守卫当场变红」同类）。
//   而且它**已经漂移过一次**：下面 dynamic_category 段早就改用派生了，
//   静态段却还写死 A-F ⇒ 同一个文件里两套分类清单。
const catsSrc = readFileSync(resolve(root, 'src/data/categories.ts'), 'utf-8');
const CATEGORY_IDS = [...catsSrc.matchAll(/\{\s*id:\s*'([^']+)'/g)].map((x) => x[1]);
// ⭐ 派生式清单最危险的失效形态是**静默漏项** —— 分类 id 若不再是单个大写字母，
//   上面那条正则会一个都匹配不到 ⇒ 门禁「全绿」而实际什么都没查。
//   ⇒ 这里显式断言，发现 id 形态变了就**大声失败**，而不是安静地少查。
if (CATEGORY_IDS.length === 0) {
  throw new Error('从 src/data/categories.ts 派生出的分类清单是空的 —— 解析规则失效了？');
}
for (const id of CATEGORY_IDS) {
  if (!/^[A-Z]$/.test(id)) {
    throw new Error(
      '分类 id 不是单个大写字母: ' + JSON.stringify(id) +
      ' —— 分类清单的派生正则与 categories.ts 不同步了（门禁会静默漏查），请同步更新本文件。',
    );
  }
}

const REQUIRED_KEYS = {
  eeat: [
    'eeat.title',
    'eeat.last_reviewed',
    'eeat.sources',
    'eeat.suggest_improvement',
    'eeat.suggest_body',
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
    for (const id of CATEGORY_IDS) {
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

// Read categories（P167：复用上面派生的同一份清单，不再第二次扫描源文件）
for (const id of CATEGORY_IDS) {
  categoryKeys.push(`category.${id}.name`, `category.${id}.desc`);
}
let m;

// Read tools
const toolsDir = resolve(root, 'src/data/tools');
for (const file of readdirSync(toolsDir).filter(f => f.endsWith('.ts') && f !== 'index.ts' && f !== 'types.ts')) {
  const content = readFileSync(resolve(toolsDir, file), 'utf-8');
  const slugRe = /slug:\s*'([^']+)'/g;
  while ((m = slugRe.exec(content)) !== null) {
    // P167: shortTitle 是**卡片用的短名**（ToolCard 读它渲染卡片标题）。
    //   漏写时 t() 会返回键名本身 ⇒ 卡片标题会显示成字面量
    //   "tools.xxx.shortTitle" ⇒ 必须纳入门禁。
    toolKeys.push(`tools.${m[1]}.title`, `tools.${m[1]}.shortTitle`, `tools.${m[1]}.description`);
  }
}

REQUIRED_KEYS.dynamic_category = categoryKeys;
REQUIRED_KEYS.dynamic_tools = toolKeys;

// Load locale JSON (the source of truth post-migration)
const en = JSON.parse(readFileSync(enPath, 'utf-8'));
const zh = JSON.parse(readFileSync(zhPath, 'utf-8'));

const has = (key) => (key in en) && (key in zh);

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

// For each engineKey=true engine, validate ALL its required keys are in BOTH en + zh JSON
const engineMissing = [];
if (extractData) {
  for (const { slug } of engineKeyEngines) {
    const tool = extractData.tools.find(t => t.slug === slug);
    if (!tool) continue;
    const requiredKeys = [];
    // input labels
    for (const name of Object.keys(tool.inputLabels || {})) {
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
    // Validate each key in both en and zh
    for (const key of requiredKeys) {
      if (!(key in en)) {
        engineMissing.push(`  [engine:${slug}] ${key} (missing in en.json)`);
      } else if (!(key in zh)) {
        engineMissing.push(`  [engine:${slug}] ${key} (missing in zh.json)`);
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
    if (!has(key)) {
      if (!(key in en)) missing.push(`  [${group}] ${key} (missing in en.json)`);
      else if (!(key in zh)) missing.push(`  [${group}] ${key} (missing in zh.json)`);
      else missing.push(`  [${group}] ${key}`);
    }
  }
}

if (missing.length > 0) {
  console.error(`❌ i18n completeness check failed. Missing ${missing.length} key(s):`);
  for (const k of missing) console.error(k);
  console.error('\nTo fix:');
  console.error('  - Add category.*.name / category.*.desc to src/i18n/locales/{en,zh}.json');
  console.error('  - Add tools.{slug}.title / tools.{slug}.description to src/i18n/locales/{en,zh}.json');
  console.error('  - Run scripts/extract-i18n-needed.mjs for the full required list');
  process.exit(1);
}

const total = Object.values(REQUIRED_KEYS).flat().length;
const dynCount = REQUIRED_KEYS.dynamic_category.length + REQUIRED_KEYS.dynamic_tools.length;
const engineCompleteCount = engineKeyEngines.length;
console.log(`✅ i18n completeness check passed (${total} required keys: eeat/about/category.{${CATEGORY_IDS.join(',')}}.*/header/favorites/recent/history + ${dynCount} dynamic: ${categoryKeys.length} category names/descs + ${toolKeys.length} tool titles/shortTitles/descs + ${engineCompleteCount} engineKey=true engines fully translated).`);
