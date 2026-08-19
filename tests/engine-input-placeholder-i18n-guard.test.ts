#!/usr/bin/env node
// P0-3 audit fix guard: no <input>/<textarea> placeholder attribute on tool
// pages may contain a raw i18n key (e.g. `placeholder="tools.X.input.Y.placeholder"`).
//
// Why this guard exists:
//   2026-08-19 audit found /solopreneur-renewal-rate-calculator/ rendered
//   `<input placeholder="tools.solopreneur-renewal-rate-calculator.input.arrUpForRenewal.placeholder">`
//   verbatim on both en + zh pages. Visible to Google crawl (AdSense
//   "low-value content" risk) + visible to users as gray placeholder text
//   on page load.
//
// Root cause: src/pages/[lang]/[slug].astro calls
//   t(`tools.${slug}.input.${input.name}.placeholder`, lang)
//   with no fallback for missing keys (returns raw key).
//
// Existing guards don't cover this:
//   - tests/engine-en-input-i18n-guard.test.ts (P131) — checks .label only
//   - tests/engine-zh-input-i18n-guard.test.ts — checks .label only
//   - tests/category-en-cjk-guard.test.ts (P63) — category pages only
//   - tests/no-adsense-placeholder-guard.test.ts (P140a) — AdUnit component only
//
// Strategy: build dist/ via buildWithEnv({}), walk all 200 tool pages
// (100 slugs × 2 langs), regex-extract placeholder attributes, fail if
// any value matches `tools.{slug}.{...}` (raw i18n key shape).
//
// Requires RUN_BUILD_TESTS=1 (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { tools } from '../src/data/tools/index.ts';
import { buildWithEnv } from './_supabase-build-helper.ts';

const root = resolve(import.meta.dirname, '..');

// P23b skip-guard: only run when explicitly opted-in.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const LANGS = ['en', 'zh'] as const;

// Match a placeholder attribute whose value starts with "tools." (raw i18n
// key). Real placeholders are natural-language examples like "e.g. 720000"
// or "例如 720000" — never the literal i18n key string.
const PLACEHOLDER_LEAK_RE = /placeholder="(tools\.[a-z0-9-]+\.[a-zA-Z0-9_.]+)"/g;

test('no tool page renders raw i18n key in placeholder attribute', () => {
  buildWithEnv({});

  const violations: string[] = [];
  for (const lang of LANGS) {
    for (const tool of tools) {
      const slug = tool.slug;
      const htmlPath = resolve(root, 'dist', lang, slug, 'index.html');
      if (!existsSync(htmlPath)) {
        violations.push(`${lang}/${slug}: dist file missing (build incomplete?)`);
        continue;
      }
      const html = readFileSync(htmlPath, 'utf-8');
      // Reset regex state (regex objects are stateful across calls).
      PLACEHOLDER_LEAK_RE.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = PLACEHOLDER_LEAK_RE.exec(html)) !== null) {
        violations.push(`${lang}/${slug}: raw i18n key in placeholder: "${match[1]}"`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Placeholder i18n leakage (${violations.length}):\n` +
      violations.slice(0, 20).map((v) => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : ''),
  );
});