#!/usr/bin/env node
// P133 — input labels i18n audit. Single test asserts every
// `tools.<slug>.input.<name>.label` key exists in translations.ts with
// non-empty en + zh values. Catches the class where future engine additions
// add inputs without translating labels.
//
// Build dependency:
//   - Pure source-only test (no dist/ HTML required) — same skip-guard pattern
//     as other build-dep suites but doesn't call ensureBuilt(). P133 39th
//     build-dep suite (38 → 39 per P131 catch-up + P132 invariants).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, statSync, readdirSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

// === Helpers ===

/** Recursively find engine .ts files (skip index.ts barrel files). */
function findEngineFiles(dir: string): string[] {
  const entries = readdirSync(dir);
  const files: string[] = [];
  for (const entry of entries) {
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      files.push(...findEngineFiles(full));
    } else if (entry.endsWith('.ts') && entry !== 'index.ts') {
      files.push(full);
    }
  }
  return files;
}

/** Extract the engine's actual `slug:` field (NOT from filename — some engines
 *  have filename ≠ slug, e.g. ai-image-generation-cost-calculator.ts has slug
 *  'solopreneur-ai-image-cost-calculator'). */
function extractSlug(text: string): string | null {
  const m = text.match(/^\s*slug:\s*['"]([^'"]+)['"]/m);
  return m ? m[1] : null;
}

/** Extract input names from `inputs: [...]` array. */
function extractInputNames(text: string): string[] {
  const start = text.search(/\binputs:\s*\[/);
  if (start < 0) return [];
  let depth = 0;
  let i = text.indexOf('[', start);
  let end = -1;
  for (; i < text.length; i++) {
    if (text[i] === '[') depth++;
    else if (text[i] === ']') {
      depth--;
      if (depth === 0) { end = i; break; }
    }
  }
  if (end < 0) return [];
  const block = text.slice(start, end + 1);
  const names: string[] = [];
  const re = /name:\s*['"]([^'"]+)['"]/g;
  for (const m of block.matchAll(re)) {
    names.push(m[1]);
  }
  return names;
}

/**
 * Load the per-locale JSON files → Map<key, {en, zh}>.
 *
 * P153: this used to read `src/i18n/translations.ts` — a file deleted by the
 * P150 migration to per-locale JSON (c16322b). The guard has been failing
 * with ENOENT ever since, i.e. it has not checked anything at all. The
 * locale JSONs are now the single source of truth (same as
 * scripts/check-i18n-completeness.mjs and src/i18n/translate-helper.ts).
 */
function loadTranslations(): Map<string, { en: string; zh: string }> {
  const en = JSON.parse(
    readFileSync(resolve(root, 'src', 'i18n', 'locales', 'en.json'), 'utf-8'),
  ) as Record<string, string>;
  const zh = JSON.parse(
    readFileSync(resolve(root, 'src', 'i18n', 'locales', 'zh.json'), 'utf-8'),
  ) as Record<string, string>;
  const map = new Map<string, { en: string; zh: string }>();
  for (const key of Object.keys(en)) {
    map.set(key, { en: en[key] ?? '', zh: zh[key] ?? '' });
  }
  return map;
}

// === Test ===

test('every engine input label is translated to both en and zh (P133)', () => {
  const engineFiles = findEngineFiles(resolve(root, 'src', 'engines'));
  const translations = loadTranslations();

  const violations: string[] = [];
  let totalProbes = 0;
  let totalOk = 0;
  const enginesScanned: string[] = [];

  for (const file of engineFiles) {
    const text = readFileSync(file, 'utf-8');
    const slug = extractSlug(text);
    if (!slug) {
      violations.push(`No slug field in ${file}`);
      continue;
    }
    const inputNames = extractInputNames(text);
    if (inputNames.length === 0) continue;
    enginesScanned.push(slug);

    for (const inputName of inputNames) {
      totalProbes++;
      const key = `tools.${slug}.input.${inputName}.label`;
      const entry = translations.get(key);
      if (!entry) {
        violations.push(`${key} — key not found in translations.ts`);
      } else if (!entry.en || entry.en.trim() === '') {
        violations.push(`${key} — en value is empty`);
      } else if (!entry.zh || entry.zh.trim() === '') {
        violations.push(`${key} — zh value is empty (en="${entry.en}")`);
      } else {
        totalOk++;
      }
    }
  }

  assert.equal(
    enginesScanned.length,
    100,
    `Expected 100 engines with inputs, found ${enginesScanned.length} — ` +
      `tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT broken?`
  );

  assert.equal(
    violations.length,
    0,
    `Input labels i18n drift (${violations.length} violation(s) across ` +
      `${totalProbes} probes — ${totalOk} OK):\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\n\nFix: add the missing translation key(s) to src/i18n/translations.ts ` +
      `with both en and zh values. This guard catches the drift class where ` +
      `future engine additions add inputs without translating labels.`
  );
});