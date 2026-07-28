#!/usr/bin/env node
// P131 — Single-dimension test: en input label. En-side mirror of
// engine-zh-input-i18n-guard.test.ts. Replaces dimension 3 of 5 from P124.
//
// en-side deviation: probes strip JS source escape sequences before
// escapeForHtml (P128 escape-strip). Reason: en FAQ questions often
// contain `\'` in source which becomes `&#39;` in rendered HTML.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToFirstInput,
  escapeForHtml,
  buildTranslationKeyRegex,
  extractAllEngineSlugs,
} from './_composite-i18n-walkers';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-en-input] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every en engine page renders the first input label (P131 split from P124 dim 3)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToFirstInput = buildSlugToFirstInput();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const firstInputName = slugToFirstInput.get(slug);
    if (!firstInputName) continue;
    const m = translationsText.match(
      buildTranslationKeyRegex(`tools.${slug}.input.${firstInputName}.label`)
    );
    if (!m) continue;
    // en value: group 1 (single-quoted) ?? group 2 (double-quoted), then strip JS escapes.
    const inputLabelEn = (m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1');
    const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const rawHtml = readFileSync(enPath, 'utf-8');
    if (!rawHtml.includes(escapeForHtml(inputLabelEn))) {
      violations.push(`${slug}: missing first input label "${inputLabelEn}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Input label (en) i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
