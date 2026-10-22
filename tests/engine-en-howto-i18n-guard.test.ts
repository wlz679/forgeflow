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
} from './_composite-i18n-walkers';
// P153: translations moved from the deleted src/i18n/translations.ts to the
// per-locale JSON files (P150, commit c16322b). This guard used to scrape
// the TS module with a regex and died with ENOENT once it was deleted.
import { getTranslation, getEngineSlugsFromLocales } from './_locale-json';

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

  const allSlugs = getEngineSlugsFromLocales();
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
      const howToRaw = getTranslation('en', `tools.${slug}.how_to_use.${i}`);
      assert.ok(
        typeof howToRaw === 'string',
        `${slug}: missing how_to_use[${i}] translation key (engine defines ${howToCount} steps, but en.json has no tools.${slug}.how_to_use.${i})`
      );
      const howToEn = escapeForHtml(howToRaw);
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
