#!/usr/bin/env node
// P131 — Shared walker helpers for the 6 single-dimension composite i18n
// guards that replace P123/P124. Lineage:
//
//   buildSlugToFirstInput()  — P127 (slug → first input name; fixes which-key)
//   buildSlugToFaqCount()    — P128 (slug → FAQ entry count; extends coverage)
//   buildSlugToHowToCount()  — P128 (slug → howToUse entry count; extends coverage)
//   escapeForHtml()          — P123/P124 inline helper (HTML-escape for probe comparison)
//   buildTranslationKeyRegex() — P129 (regex with 4 capture groups for '...' / "..." en/zh)
//   extractAllEngineSlugs()  — P123/P124 inline helper (slug list from translations.ts)
//
// Consumed by:
//   - engine-zh-input-i18n-guard.test.ts  (firstInput)
//   - engine-zh-faq-i18n-guard.test.ts    (faqCount)
//   - engine-zh-howto-i18n-guard.test.ts  (howToCount)
//   - engine-en-input-i18n-guard.test.ts  (firstInput + escape-strip)
//   - engine-en-faq-i18n-guard.test.ts    (faqCount + escape-strip)
//   - engine-en-howto-i18n-guard.test.ts  (howToCount + escape-strip)
//
// Build dependency: NONE (helpers only read src/engines/**/*.ts + translations.ts).
// The 6 consuming test files still need RUN_BUILD_TESTS=1 + ensureBuilt().

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function walkEnginesDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walkEnginesDir(full));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry === 'index.ts') continue;
    files.push(full);
  }
  return files;
}

// Walk src/engines/**/*.ts and build slug → firstInputName map.
// Why this is needed: a naive "first input.X.label match in translations.ts"
// probes the wrong key for slugs where translations.ts has dead input keys
// (e.g. solopreneur-freelance-rate-calculator has `input.skill.label` in
// translations.ts but no `skill` input in the engine — page renders
// `annualIncome` first). Using the engine's actual first input name gives
// the correct probe.
export function buildSlugToFirstInput(): Map<string, string> {
  const map = new Map<string, string>();
  const enginesDir = resolve(root, 'src', 'engines');
  for (const full of walkEnginesDir(enginesDir)) {
    const text = readFileSync(full, 'utf-8');
    const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    // Match the inputs: [...] array — first `name:` inside is the first input.
    const inputsArr = text.match(/inputs:\s*\[([\s\S]*?)\]/);
    if (!inputsArr) continue;
    const nameMatch = inputsArr[1].match(/name:\s*['"]([a-zA-Z][a-zA-Z0-9_-]*)['"]/);
    if (nameMatch) {
      map.set(slug, nameMatch[1]);
    }
  }
  return map;
}

// Walk src/engines/**/*.ts and build slug → faqCount map.
// Counts `q: '...'` lines inside `faq: [...]` array. Each FAQ entry has exactly
// one `q:`, so the count gives the number of entries.
// Match `q:` preceded by `{` or `,` (with optional whitespace) so both
// single-line `{ q: "...", a: "..." },` and multi-line formats are counted.
export function buildSlugToFaqCount(): Map<string, number> {
  const map = new Map<string, number>();
  const enginesDir = resolve(root, 'src', 'engines');
  for (const full of walkEnginesDir(enginesDir)) {
    const text = readFileSync(full, 'utf-8');
    const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    const faqArr = text.match(/faq:\s*\[([\s\S]*?)\n\s*\],/);
    if (faqArr) {
      const qCount = (faqArr[1].match(/[{,]\s*q:\s*['"]/g) || []).length;
      map.set(slug, qCount);
    }
  }
  return map;
}

// Walk src/engines/**/*.ts and build slug → howToUseCount map.
// Counts top-level quoted strings inside `howToUse: [...]` array.
// Each entry is a quoted string on its own line.
export function buildSlugToHowToCount(): Map<string, number> {
  const map = new Map<string, number>();
  const enginesDir = resolve(root, 'src', 'engines');
  for (const full of walkEnginesDir(enginesDir)) {
    const text = readFileSync(full, 'utf-8');
    const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    const howArr = text.match(/howToUse:\s*\[([\s\S]*?)\n\s*\],/);
    if (howArr) {
      const sCount = (howArr[1].match(/^\s*['"]/gm) || []).length;
      map.set(slug, sCount);
    }
  }
  return map;
}

// HTML-escape a string for probe comparison. The dist/ pages HTML-escape
// user-visible text, so we must do the same to compare probes correctly.
export function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build regex to extract en + zh values from a translations.ts key entry.
// Returns 4 capture groups: 1=enSingle-quoted, 2=enDouble-quoted,
// 3=zhSingle-quoted, 4=zhDouble-quoted. Use `m[3] ?? m[4]` for zh and
// `m[1] ?? m[2]` for en (P129 alternation pattern — closes the double-quote
// silent-skip bug that P128's single-quote-only regex had).
export function buildTranslationKeyRegex(key: string): RegExp {
  return new RegExp(
    `'${key.replace(/\./g, '\\.')}':\\s*\\{\\s*en:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)"),\\s*zh:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)")`
  );
}

// Extract all 100 engine slugs from translations.ts. Anchored on 'tools.'
// prefix and sorted alphabetically for stable iteration.
//
// Note: uses imperative `exec` loop + array push (not matchAll iterator or
// Set spread) because tsconfig.json excludes tests/_*.ts from `tsc --noEmit`,
// and the consuming test files (engine-zh-*-i18n-guard.test.ts, etc.) are
// compiled against `astro/tsconfigs/strict` which targets es5 — matchAll
// iteration and Set spread require --downlevelIteration with es5 target.
export function extractAllEngineSlugs(translationsText: string): string[] {
  const slugRe = /^\s*'tools\.(solopreneur-[a-z0-9-]+)\./gm;
  const seen = new Set<string>();
  const slugs: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = slugRe.exec(translationsText)) !== null) {
    if (!seen.has(m[1])) {
      seen.add(m[1]);
      slugs.push(m[1]);
    }
  }
  return slugs.sort();
}