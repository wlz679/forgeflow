#!/usr/bin/env node
// P131 — Single-dimension test: en how_to_use steps. En-side mirror of
// engine-zh-howto-i18n-guard.test.ts. Replaces dimension 5 of 5 from P124.

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
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-en-howto] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every en engine page renders all how_to_use steps (P131 split from P124 dim 5)', () => {
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
    if (howToCount === 0) continue;
    for (let i = 0; i < howToCount; i++) {
      const m = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.how_to_use.${i}`)
      );
      assert(
        m,
        `${slug}: missing how_to_use[${i}] translation key (engine defines ${howToCount} steps, but translations.ts has no tools.${slug}.how_to_use.${i})`
      );
      const howToEn = escapeForHtml((m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1'));
      const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
      if (!existsSync(enPath)) {
        violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(enPath, 'utf-8');
      if (!rawHtml.includes(howToEn)) {
        violations.push(`${slug}: missing how_to_use[${i}] (en length ${howToEn.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `how_to_use (en) i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
