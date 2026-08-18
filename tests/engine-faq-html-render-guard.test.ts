#!/usr/bin/env node
// P146-S2 — Build-dep guard: every engine FAQ en text MUST appear in dist HTML.
// Catches P140b-style engine updates that don't sync to translations.ts,
// which would cause user-visible HTML drift (engine text vs translations text).
//
// Builds via buildWithEnv (build-dep); checks dist HTML contains engine text.
// Requires RUN_BUILD_TESTS=1 (skips in default mode).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildWithEnv } from './_supabase-build-helper.ts';

const root = resolve(import.meta.dirname, '..');

// P23b: skip if RUN_BUILD_TESTS not set
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function walkEngines(d: string, out: string[]): void {
  for (const e of readdirSync(d, { withFileTypes: true })) {
    const full = resolve(d, e.name);
    if (e.isDirectory()) walkEngines(full, out);
    else if (e.name.endsWith('.ts')) out.push(full);
  }
}
const engineFiles: string[] = [];
walkEngines(resolve(root, 'src', 'engines'), engineFiles);

const engineFaq: Record<string, { q: string; a: string }[]> = {};
for (const file of engineFiles) {
  const text = readFileSync(file, 'utf-8');
  const slugMatch = text.match(/slug:\s*['"](solopreneur-[a-z0-9-]+)['"]/);
  if (!slugMatch) continue;
  const slug = slugMatch[1];
  const faqMatch = text.match(/faq:\s*\[([\s\S]*?)(?=\],\s*\n\s*howToUse|\],\s*\n\s*\};)/);
  if (!faqMatch) continue;
  // Lazy alternation regex (P145 lesson) — handles \" and \' properly
  const entries = [...faqMatch[1].matchAll(/q:\s*"((?:[^"\\]|\\.)*)",\s*a:\s*"((?:[^"\\]|\\.)*)"/g)];
  engineFaq[slug] = entries.map(m => ({
    q: m[1].replace(/\\(.)/g, '$1'),
    a: m[2].replace(/\\(.)/g, '$1'),
  }));
}

const escapeForHtml = (s: string): string => s
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

test('every engine FAQ en text appears in dist HTML', () => {
  // Build dist (build-dep) — result not needed (we read individual page HTMLs)
  buildWithEnv({});

  const violations: string[] = [];
  for (const slug of Object.keys(engineFaq)) {
    const entries = engineFaq[slug];
    if (entries.length === 0) continue;
    const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const pageHtml = readFileSync(enPath, 'utf-8');
    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i];
      if (!entry) continue;
      for (const field of ['q', 'a'] as const) {
        const engText = entry[field];
        const escaped = escapeForHtml(engText);
        if (!pageHtml.includes(escaped)) {
          violations.push(`${slug}.faq.${i}.${field}: engine text (${engText.length} chars) not in HTML`);
        }
      }
    }
  }
  assert.equal(
    violations.length,
    0,
    `Engine FAQ en text not in dist HTML (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});