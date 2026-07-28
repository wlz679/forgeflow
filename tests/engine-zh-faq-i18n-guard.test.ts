#!/usr/bin/env node
// P131 — Single-dimension test: zh FAQ q + a. Replaces dimension 4 of 5
// from P123. Title (P121) and description (P122) covered separately; input
// label in engine-zh-input-i18n-guard.test.ts; how_to_use in
// engine-zh-howto-i18n-guard.test.ts.
//
// Probes every FAQ q AND every FAQ a entry (not just [0]) — extends P128
// walker pattern. P129 promoted the probe loop's missing-key check to
// assert() so missing FAQ translations fail loudly.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToFaqCount,
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
  console.log('[p131-zh-faq] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every zh engine page renders all FAQ q + a entries (P131 split from P123 dim 4)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToFaqCount = buildSlugToFaqCount();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const faqCount = slugToFaqCount.get(slug) ?? 0;
    if (faqCount === 0) continue; // engine has no FAQ entries
    for (let i = 0; i < faqCount; i++) {
      const qMatch = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.faq.${i}.q`)
      );
      const aMatch = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.faq.${i}.a`)
      );
      assert(
        qMatch,
        `${slug}: missing FAQ[${i}].q translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.q)`
      );
      assert(
        aMatch,
        `${slug}: missing FAQ[${i}].a translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.a)`
      );
      const qZh = escapeForHtml(qMatch[3] ?? qMatch[4]);
      const aZh = escapeForHtml(aMatch[3] ?? aMatch[4]);
      const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
      if (!existsSync(zhPath)) {
        violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(zhPath, 'utf-8');
      if (!rawHtml.includes(qZh)) {
        violations.push(`${slug}: missing FAQ[${i}].q (zh length ${qZh.length})`);
      }
      if (!rawHtml.includes(aZh)) {
        violations.push(`${slug}: missing FAQ[${i}].a (zh length ${aZh.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `FAQ i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
