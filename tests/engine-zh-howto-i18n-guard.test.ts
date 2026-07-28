#!/usr/bin/env node
// P131 — Single-dimension test: zh how_to_use steps. Replaces dimension 5 of 5
// from P123. Title (P121), description (P122), input label (engine-zh-input-i18n-guard),
// FAQ (engine-zh-faq-i18n-guard) covered separately.
//
// Probes every how_to_use step (not just [0]) — extends P128 walker pattern.
// P129 promoted the probe loop's missing-key check to assert() so missing
// how_to_use translations fail loudly.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToHowToCount,
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
  console.log('[p131-zh-howto] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every zh engine page renders all how_to_use steps (P131 split from P123 dim 5)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToHowToCount = buildSlugToHowToCount();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const howToCount = slugToHowToCount.get(slug) ?? 0;
    if (howToCount === 0) continue; // engine has no how_to_use
    for (let i = 0; i < howToCount; i++) {
      const m = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.how_to_use.${i}`)
      );
      assert(
        m,
        `${slug}: missing how_to_use[${i}] translation key (engine defines ${howToCount} steps, but translations.ts has no tools.${slug}.how_to_use.${i})`
      );
      const howToZh = escapeForHtml(m[3] ?? m[4]);
      const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
      if (!existsSync(zhPath)) {
        violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(zhPath, 'utf-8');
      if (!rawHtml.includes(howToZh)) {
        violations.push(`${slug}: missing how_to_use[${i}] (zh length ${howToZh.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `how_to_use i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
