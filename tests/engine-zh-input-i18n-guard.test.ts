#!/usr/bin/env node
// P131 — Single-dimension test: zh input label. Replaces dimension 3 of 5
// from P123 (composite i18n guard). Title (dim 1) is covered by P121 and
// description (dim 2) by P122 — both cover en + zh in single files.
// This file covers ONLY input label rendering for zh pages.
//
// Why split: P123's 5-in-1 failure mode pointed at the test file but not at
// the specific dimension. After P131, an input-label regression fails only
// this test, not the FAQ or how_to_use tests.

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
  const probe = resolve(root, 'dist', 'zh', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-zh-input] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every zh engine page renders the first input label (P131 split from P123 dim 3)', () => {
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
    if (!firstInputName) continue; // engine has no inputs (rare)
    const m = translationsText.match(
      buildTranslationKeyRegex(`tools.${slug}.input.${firstInputName}.label`)
    );
    if (!m) {
      // Missing input label key — out of scope for this test (covered by dead-keys-guard).
      continue;
    }
    // zh value: group 3 (single-quoted) ?? group 4 (double-quoted).
    const inputLabelZh = m[3] ?? m[4];
    const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
    if (!existsSync(zhPath)) {
      violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const rawHtml = readFileSync(zhPath, 'utf-8');
    if (!rawHtml.includes(escapeForHtml(inputLabelZh))) {
      violations.push(`${slug}: missing first input label "${inputLabelZh}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Input label i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
