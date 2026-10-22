#!/usr/bin/env node
// P153: every i18n key the code references must exist in BOTH locale files.
//
// Why this guard exists:
//
//   translate() falls back to `locales[lang]?.[key] ?? locales.en?.[key] ?? key`
//   — so a MISSING key does not crash. It silently prints the raw key name
//   on the page. That is exactly what happened in production: the P150
//   migration (c16322b) moved translations.ts to per-locale JSON and dropped
//   the 9 engine_cost.* keys on the way. The Chinese AI-cost pages then
//   served
//
//     engine_cost.comparison_title (100engine_cost.reqs_per_day)
//     engine_cost.cheapest_prefixClaude Haiku 55engine_cost.at_per_month$1.05/mo
//
//   (12 occurrences per page, live on forgeflowkit.com). Two existing
//   guards did see it — dead-i18n-keys-guard (via its hand-kept
//   WORKING_KEY_REQUIRED list) and the ai-cost-t2-7 zh-output guard — but
//   both are BUILD-dependent, so they only run with RUN_BUILD_TESTS=1, and
//   CI had never reached the unit-test step. This one is source-only: it
//   runs in `pnpm check` on every machine, every push.
//
// What it checks:
//   Every literal key passed to t('...') / translate('...') in src/ must exist
//   in en.json AND zh.json.
//
//   Scope note: keys that are passed as plain strings and resolved later
//   (e.g. the headerKeys array in src/pages/[lang]/[slug].astro, which calls
//   t(key, lang)) are NOT covered here — a dotted literal is not
//   distinguishable from a model id ('gpt-5.5'), a domain
//   ('forgeflowkit.com') or a file name ('index.html'). Those keys are
//   covered by dead-i18n-keys-guard, which keeps an explicit
//   WORKING_KEY_REQUIRED list of exactly the keys that are resolved
//   indirectly. Between the two guards, both call styles are checked.
//
// Build dependency: none (source-only).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { getEngineSlugsFromEnginesDir, getEngineSlugsFromLocales } from './_locale-json';
// P153: the comment stripper is now the shared one in tests/build-dep-suites.mjs.
// This guard used to carry its own copy — a regex pair whose block-comment
// half swallowed 40,718 characters of src/pages/[lang]/[slug].astro
// (including the `t('engine_cost.*')` call sites), which is why it could
// not see a missing key in exactly that region. Two copies of a
// "strip the comments" routine is two chances to be wrong.
import { stripComments } from './build-dep-suites.mjs';

const root = resolve(import.meta.dirname, '..');

const en = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf-8')) as Record<string, string>;
const zh = JSON.parse(readFileSync(resolve(root, 'src/i18n/locales/zh.json'), 'utf-8')) as Record<string, string>;

const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', '.astro']);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = resolve(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (/\.(astro|ts|tsx|js|jsx|mjs)$/.test(entry.name)) out.push(full);
  }
  return out;
}

// An i18n key shape: dotted, lowercase-ish segments, e.g. tools.foo.title
const KEY_SHAPE = /^[a-z][a-z0-9_-]*(\.[a-z0-9_.-]+)+$/;

test('every i18n key referenced in src/ exists in en.json and zh.json', () => {
  const files = walk(resolve(root, 'src'));
  const used = new Map<string, Set<string>>();
  const note = (key: string, file: string) => {
    if (!used.has(key)) used.set(key, new Set());
    used.get(key)!.add(relative(root, file).replaceAll('\\', '/'));
  };

  for (const file of files) {
    const src = stripComments(readFileSync(file, 'utf-8'));
    // t('key') / translate('key') — literal calls only.
    for (const m of src.matchAll(/\b(?:t|translate)\(\s*(['"])([A-Za-z0-9_.\-]+)\1/g)) {
      note(m[2], file);
    }
  }

  const violations: string[] = [];
  for (const [key, where] of [...used].sort((a, b) => a[0].localeCompare(b[0]))) {
    const inEn = key in en;
    const inZh = key in zh;
    if (inEn && inZh) continue;
    violations.push(
      `${key}: missing in ${!inEn ? 'en.json' : ''}${!inEn && !inZh ? ' and ' : ''}${!inZh ? 'zh.json' : ''} ` +
        `(referenced in ${[...where].join(', ')})`,
    );
  }

  assert.equal(
    violations.length,
    0,
    `Referenced-but-missing i18n keys (${violations.length}):\n` +
      violations.slice(0, 25).map((v) => `  - ${v}`).join('\n') +
      (violations.length > 25 ? `\n  ... and ${violations.length - 25} more` : '') +
      `\n\ntranslate() falls back to the RAW KEY when a key is missing, so this ` +
      `renders as "engine_cost.comparison_title" on the page instead of the ` +
      `translated string. Add the key to BOTH src/i18n/locales/en.json and ` +
      `src/i18n/locales/zh.json (values may be recovered from git history — ` +
      `the P150 migration dropped 9 engine_cost.* keys this way).`,
  );
});

test('en.json and zh.json carry the same key set', () => {
  const onlyEn = Object.keys(en).filter((k) => !(k in zh));
  const onlyZh = Object.keys(zh).filter((k) => !(k in en));
  assert.equal(
    onlyEn.length + onlyZh.length,
    0,
    `Locale key sets diverged: ${onlyEn.length} only in en.json, ${onlyZh.length} only in zh.json\n` +
      `  only en: ${onlyEn.slice(0, 10).join(', ')}\n` +
      `  only zh: ${onlyZh.slice(0, 10).join(', ')}`,
  );
});

// The six composite engine guards (faq / how_to_use / input, en + zh) derive
// their slug list from the LOCALE side (`tools.<slug>.` prefixes). If a new
// engine were added without any `tools.<slug>.*` key, those guards would
// simply never look at it — the engine would ship with untranslated titles,
// descriptions, FAQ and labels, and no guard would notice.
//
// This test closes that gap from the other direction: the set of engines
// declared in src/engines must be exactly the set of slugs that have
// `tools.<slug>.*` keys in the locale. Source-only, so it runs on every
// push — unlike the composite guards, which need a built dist/.
test('engine slugs (src/engines) and locale tools.<slug>.* prefixes are the same set', () => {
  const engineSlugs = getEngineSlugsFromEnginesDir();
  const localeSlugs = getEngineSlugsFromLocales();

  assert.equal(
    engineSlugs.length,
    100,
    `Expected 100 engine slugs (EXPECTED_ENGINE_COUNT), found ${engineSlugs.length} — ` +
      `P22b locked engine count at 100, investigate before continuing.`,
  );

  const localeSet = new Set(localeSlugs);
  const engineSet = new Set(engineSlugs);
  const engineWithoutLocale = engineSlugs.filter((s) => !localeSet.has(s));
  const localeWithoutEngine = localeSlugs.filter((s) => !engineSet.has(s));

  assert.equal(
    engineWithoutLocale.length + localeWithoutEngine.length,
    0,
    `Engine ↔ locale slug sets diverged (${engineWithoutLocale.length + localeWithoutEngine.length}):\n` +
      `  engines with no tools.<slug>.* keys: ${engineWithoutLocale.slice(0, 10).join(', ') || '(none)'}\n` +
      `  tools.<slug>.* with no engine: ${localeWithoutEngine.slice(0, 10).join(', ') || '(none)'}\n\n` +
      `An engine without locale keys renders raw key names (translate() falls back ` +
      `to the key). A locale namespace without an engine is dead dictionary weight.`,
  );
});
