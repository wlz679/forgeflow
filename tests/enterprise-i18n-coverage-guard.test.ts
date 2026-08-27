#!/usr/bin/env node
// P5A-T5 — CI guard ensuring all 15 enterprise.* i18n keys are translated
// in both en + zh in src/i18n/translations.ts.
//
// Why this exists:
//   Phase 5-A v2.5 Enterprise ships 4 Astro components (EnterpriseToolbar +
//   3 modal placeholders). The toolbar binds to 15 i18n keys; missing any
//   one leaves a literal `'enterprise.foo.bar'` string on the rendered page.
//   This guard catches that class of bug at build-dep time.
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, mirrors P103)
//   - Triggers `pnpm build` if dist/ missing (per P103 ensureBuilt helper)
//
// Coverage:
//   - Reads translations.ts source (Astro tree-shakes unused keys out of
//     dist/ JS bundles, so dist is unreliable for coverage assertions —
//     source file is the source of truth)
//   - Asserts each key appears ≥2× (once as key name, once in en-or-zh
//     string references in nearby keys — actually we just assert ≥1 per
//     presence. The 2× check below is the proper dual-lang verification.)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p5a-t5] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

// 15 enterprise.* keys per spec §6 / task-5-brief Step 1.
// Each must appear in both en and zh translations.
const KEYS = [
  'enterprise.toolbar.save',
  'enterprise.toolbar.templates',
  'enterprise.toolbar.report',
  'enterprise.scenario.modal_title',
  'enterprise.scenario.placeholder.name',
  'enterprise.scenario.placeholder.notes',
  'enterprise.template.picker_title',
  'enterprise.template.empty_state',
  'enterprise.template.apply',
  'enterprise.template.delete_confirm',
  'enterprise.report.modal_title',
  'enterprise.report.format',
  'enterprise.report.success',
  'enterprise.report.error',
  'enterprise.report.toast',
] as const;

test('all 15 enterprise.* i18n keys present in en + zh', () => {
  ensureBuilt();
  const enPath = resolve(root, 'src/i18n/locales/en.json');
  const zhPath = resolve(root, 'src/i18n/locales/zh.json');
  assert.ok(existsSync(enPath), 'en.json missing');
  assert.ok(existsSync(zhPath), 'zh.json missing');
  const en = JSON.parse(readFileSync(enPath, 'utf-8')) as Record<string, string>;
  const zh = JSON.parse(readFileSync(zhPath, 'utf-8')) as Record<string, string>;

  // For each key: assert it exists in BOTH en and zh JSON, with non-empty strings.
  // (JSON migration from translations.ts — src no longer tree-shakes keys.)
  const missing: string[] = [];
  const empty: string[] = [];
  const langMissing: string[] = [];

  for (const key of KEYS) {
    if (!(key in en)) { missing.push(`${key} (not in en.json)`); continue; }
    if (!(key in zh)) { missing.push(`${key} (not in zh.json)`); continue; }
    const enVal = en[key];
    const zhVal = zh[key];
    if (enVal.trim() === '') langMissing.push(`${key}.en`);
    if (zhVal.trim() === '') langMissing.push(`${key}.zh`);
  }

  assert.equal(
    missing.length,
    0,
    `enterprise.* keys missing from i18n JSON (${missing.length}):\n` +
      missing.map(k => `  - ${k}`).join('\n'),
  );
  assert.equal(
    langMissing.length,
    0,
    `enterprise.* keys with empty en/zh translation (${langMissing.length}):\n` +
      langMissing.map(k => `  - ${k}`).join('\n'),
  );
});
