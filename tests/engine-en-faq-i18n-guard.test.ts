#!/usr/bin/env node
// P131 — Single-dimension test: en FAQ q + a. En-side mirror of
// engine-zh-faq-i18n-guard.test.ts. Replaces dimension 4 of 5 from P124.

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
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-en-faq] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every en engine page renders all FAQ q + a entries (P131 split from P124 dim 4)', () => {
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
    if (faqCount === 0) continue;
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
      const qEn = escapeForHtml((qMatch[1] ?? qMatch[2] ?? '').replace(/\\(.)/g, '$1'));
      const aEn = escapeForHtml((aMatch[1] ?? aMatch[2] ?? '').replace(/\\(.)/g, '$1'));
      const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
      if (!existsSync(enPath)) {
        violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(enPath, 'utf-8');
      if (!rawHtml.includes(qEn)) {
        violations.push(`${slug}: missing FAQ[${i}].q (en length ${qEn.length})`);
      }
      if (!rawHtml.includes(aEn)) {
        violations.push(`${slug}: missing FAQ[${i}].a (en length ${aEn.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `FAQ (en) i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
