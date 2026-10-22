#!/usr/bin/env node
// P131 — Shared walker helpers for the 6 single-dimension composite i18n
// guards that replace P123/P124. Lineage:
//
//   buildSlugToFirstInput()  — P127 (slug → first input name; fixes which-key)
//   buildSlugToFaqCount()    — P128 (slug → FAQ entry count; extends coverage)
//   buildSlugToHowToCount()  — P128 (slug → howToUse entry count; extends coverage)
//   escapeForHtml()          — P123/P124 inline helper (HTML-escape for probe comparison)
//
// P153: `buildTranslationKeyRegex()` and `extractAllEngineSlugs()` were
// removed — they scraped the deleted src/i18n/translations.ts and are now
// replaced by tests/_locale-json.ts (getTranslation / getEngineSlugsFromLocales).
// Keeping them would have left a second, dead way to read translations.
//
// Consumed by:
//   - engine-zh-input-i18n-guard.test.ts  (firstInput)
//   - engine-zh-faq-i18n-guard.test.ts    (faqCount)
//   - engine-zh-howto-i18n-guard.test.ts  (howToCount)
//   - engine-en-input-i18n-guard.test.ts  (firstInput + escape-strip)
//   - engine-en-faq-i18n-guard.test.ts    (faqCount + escape-strip)
//   - engine-en-howto-i18n-guard.test.ts  (howToCount + escape-strip)
//
// Build dependency: NONE (helpers only read src/engines/**/*.ts).
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
    // Anchor with `(?:^|\n)\s*` so we don't false-match `function calculate(
    // inputs: Record<...>)` signatures (preceded by `(`) or comment examples
    // like `// inputs: [{ ... }]` embedded mid-line. P136 audit hardening.
    const inputsArr = text.match(/(?:^|\n)\s*inputs:\s*\[([\s\S]*?)\]/);
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
//
// Outer regex requires `\n\s*\],` at the end — only matches multi-line FAQ
// arrays. Single-line FAQ (e.g. `faq: [{ q: '...', a: '...' }]`) is NOT
// captured; engines with single-line FAQ would be silently skipped (the
// consumer test does `if (faqCount === 0) continue`). All 100 current engines
// use multi-line format. P136 audit documented this limitation explicitly.
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
//
// Outer regex requires `\n\s*\],` at the end — only matches multi-line
// howToUse arrays. Single-line howToUse is NOT captured (same limitation as
// buildSlugToFaqCount — P136 audit). All 100 current engines use multi-line
// format.
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
