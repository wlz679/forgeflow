#!/usr/bin/env node
// P145-B2a — Defensive guard: every engine's FAQ count must be ≥
// reflected in translations.ts. Catches P143-style orphan slugs where
// engine.faq[N] exists but translations.faq.N is missing.
//
// Walks src/engines/**/*.ts → extracts (slug → faqCount) from engine.faq
// Walks src/i18n/translations.ts → extracts (slug → Set<faq idx>) from translations
// Asserts: for every engine, translations has ≥ same number of unique faq indices

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'path';

const root = resolve(import.meta.dirname, '..');

// Walk engines, build engineFaqCount map
function walkEngines(d: string): string[] {
  const files: string[] = [];
  for (const e of readdirSync(d, {withFileTypes: true})) {
    const full = resolve(d, e.name);
    if (e.isDirectory()) files.push(...walkEngines(full));
    else if (e.name.endsWith('.ts')) files.push(full);
  }
  return files;
}
const engineFiles = walkEngines(resolve(root, 'src', 'engines'));

const engineFaqCount: Record<string, number> = {};
for (const file of engineFiles) {
  const text = readFileSync(file, 'utf-8');
  const slugMatch = text.match(/slug:\s*['"](solopreneur-[a-z0-9-]+)['"]/);
  if (!slugMatch) continue;
  const slug = slugMatch[1];
  const faqMatch = text.match(/faq:\s*\[([\s\S]*?)(?=\],\s*\n\s*howToUse|\],\s*\n\s*\};)/);
  if (!faqMatch) continue;
  const entries = (faqMatch[1].match(/q:\s*['"]/g) || []).length;
  if (entries > 0) engineFaqCount[slug] = entries;
}

// Walk translations, build transFaqIndices map
const trText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
const transFaqIndices: Record<string, Set<number>> = {};
const trRe = /'tools\.(solopreneur-[a-z0-9-]+)\.faq\.(\d+)\.q':/g;
for (const m of trText.matchAll(trRe)) {
  const slug = m[1]; const idx = +m[2];
  if (!transFaqIndices[slug]) transFaqIndices[slug] = new Set();
  transFaqIndices[slug].add(idx);
}

test('every engine has translations coverage for all FAQ entries', () => {
  const violations = [];
  for (const slug of Object.keys(engineFaqCount)) {
    const engCount = engineFaqCount[slug];
    const transCount = (transFaqIndices[slug] || new Set()).size;
    if (transCount < engCount) {
      const missingIdxs: number[] = [];
      for (let i = 0; i < engCount; i++) {
        if (!transFaqIndices[slug] || !transFaqIndices[slug].has(i)) missingIdxs.push(i);
      }
      violations.push(`${slug}: engine has ${engCount} FAQ entries, translations has ${transCount} (missing faq.${missingIdxs.join(', faq.')})`);
    }
  }
  assert.equal(
    violations.length,
    0,
    `FAQ coverage violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});