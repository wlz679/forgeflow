#!/usr/bin/env node
// P137 T2.7 — build-dep test asserting /zh/ AI cost pages contain localized
// composite data-driven lines, /en/ pages remain pure English.
//
// Build dependency: yes (RUN_BUILD_TESTS=1 + ensureBuilt).
// Replaces the trial "if build, then check dist" pattern in P131/P136 walker
// tests with per-engine per-pattern assertions.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function readBuiltHtml(lang: string, slug: string): string {
  const path = join(root, 'dist', lang, slug, 'index.html');
  return readFileSync(path, 'utf-8');
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'zh', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p137-t2-7] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

const CASES: Array<{ slug: string; zhFragment: string; enFragment: string }> = [
  // Cost Comparison (claude-api, gemini-api, deepseek-api). All three use
  // the static prefix "📊 Cost Comparison (" + lc(reqPerDay) + " reqs/day)"
  // — covered by engine_cost.comparison_title + engine_cost.reqs_per_day.
  //
  // NOTE: solopreneur-ai-api-cost-comparison uses "📊 Full Model Comparison"
  // (not "Cost Comparison") in staticExamples — different composite line.
  // That pattern is out of scope for T2.7; covered by a later P137 task if
  // a new engine_cost.full_model_comparison_title key is added. (Documented
  // in the T2 report.)
  {
    slug: 'solopreneur-claude-api-cost-calculator',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
  {
    slug: 'solopreneur-gemini-api-cost-calculator',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
  {
    slug: 'solopreneur-deepseek-api-cost-calculator',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
  // OpenAI: line 270 emits literal "📊 Cost Comparison (14 Models)" —
  // different shape from the other 3 (N reqs/day). Same zh fragment
  // because only the prefix gets translated; "Models" is universal.
  {
    slug: 'solopreneur-openai-token-calculator',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
];

test('P137 T2.7 composite i18n — zh-output guard: 4 AI cost engines have localized "Cost Comparison"', () => {
  ensureBuilt();

  const violations: string[] = [];

  for (const { slug, zhFragment, enFragment } of CASES) {
    const zhPath = join(root, 'dist', 'zh', slug, 'index.html');
    const enPath = join(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(zhPath)) {
      violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const zhHtml = readBuiltHtml('zh', slug);
    const enHtml = readBuiltHtml('en', slug);

    if (!zhHtml.includes(zhFragment)) {
      violations.push(`${slug}: zh page missing localized fragment "${zhFragment}"`);
    }
    if (enHtml.includes(zhFragment)) {
      violations.push(`${slug}: en page leaked zh fragment "${zhFragment}" (translation not applied?)`);
    }
    if (!enHtml.includes(enFragment)) {
      violations.push(`${slug}: en page missing baseline fragment "${enFragment}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `P137 T2.7 composite i18n violations (${violations.length}):\n` +
      violations.map(v => `  - ${v}`).join('\n')
  );
});