#!/usr/bin/env node
// P153 — Single source of truth for reading the per-locale i18n JSON files.
//
// Why this exists:
//   P150 (commit c16322b) migrated `src/i18n/translations.ts` (one TS module
//   holding `{ key: { en, zh } }`) into two flat JSON files:
//     src/i18n/locales/en.json  →  { key: "en value" }
//     src/i18n/locales/zh.json  →  { key: "zh value" }
//
//   Eight engine i18n guards still parsed the deleted TS file with regexes to
//   recover `{ en, zh }` pairs. They died with ENOENT — and because CI's
//   "Unit tests" step had never been reached (100 consecutive failing runs
//   before that step), nobody saw it.
//
//   Reading the JSON directly is both simpler and stricter:
//     - `JSON.parse` fails loudly on malformed data instead of silently
//       skipping entries (the old regexes skipped anything they could not
//       match, e.g. descriptions containing apostrophes);
//     - a missing key is `undefined` (an explicit fact) rather than
//       "the regex did not match" (an ambiguous one).
//
// One implementation, many callers — the guards must not each grow their own
// copy of "how to read a translation" (see the P153 lesson: hand-copied
// truth-source copies drift in both directions).
//
// Build dependency: NONE (reads two JSON files + the engines directory only).

import { readFileSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');

export type Locale = 'en' | 'zh';

const cache: Partial<Record<Locale, Record<string, string>>> = {};

export function localeJson(lang: Locale): Record<string, string> {
  if (!cache[lang]) {
    const p = resolve(root, 'src', 'i18n', 'locales', `${lang}.json`);
    cache[lang] = JSON.parse(readFileSync(p, 'utf-8')) as Record<string, string>;
  }
  return cache[lang]!;
}

/**
 * Exact translation for `key` in `lang`, or `undefined` when the locale has
 * no such key. Callers decide whether a missing key is a violation — this
 * function never throws on a missing key, because "key absent" is a normal
 * state that guards must report (not crash on).
 */
export function getTranslation(lang: Locale, key: string): string | undefined {
  return localeJson(lang)[key];
}

/**
 * Engine slugs that carry `tools.<slug>.*` keys in the locale JSON.
 *
 * This is the direct successor of `extractAllEngineSlugs(translationsText)`
 * (which scraped `tools.<slug>.` prefixes out of the deleted TS module).
 * Measured equivalent: locale-derived slugs, engine-directory slugs, and the
 * old TS-derived slugs are the same 100-slug set (P153 probe, 0 differences).
 */
export function getEngineSlugsFromLocales(): string[] {
  const slugs = new Set<string>();
  for (const key of Object.keys(localeJson('en'))) {
    const m = /^tools\.(solopreneur-[a-z0-9-]+)\./.exec(key);
    if (m) slugs.add(m[1]);
  }
  return [...slugs].sort();
}

/**
 * Engine slugs declared in the `src/engines/` tree (every .ts file below it).
 *
 * The "engine exists" direction of the guard contract: every slug here must
 * have its translations, which is what the title/description guards assert.
 */
export function getEngineSlugsFromEnginesDir(): string[] {
  const slugs = new Set<string>();
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
        continue;
      }
      if (!entry.name.endsWith('.ts')) continue;
      const text = readFileSync(full, 'utf-8');
      for (const m of text.matchAll(/^\s*slug:\s*['"](solopreneur-[a-z0-9-]+)['"]/gm)) {
        slugs.add(m[1]);
      }
    }
  };
  walk(resolve(root, 'src', 'engines'));
  return [...slugs].sort();
}
