#!/usr/bin/env node
// P140f — CI guard for Decision Layer coverage (source-level invariant).
//
// Why this exists:
//   Phase 1 5 calc 必须含 🧭 Decision Recommendation 4 子段（v2.0 L5 决策支持灵魂）。
//   这是 v2.0 灵魂 first-class 化，任何 calc 回退到只有数字（无决策）必须被检出。
//
// 5 工具：csat / roas / cac / churn-rate (saas) / burn-rate
// 4 标签：Decision Question / Recommendation / Key Uncertainty / Next Action
// Source-level：直接 grep .ts 文件字符串字面量（与 P138 v3-render-coverage-guard 同模式）。
//
// P153-G1: source-only guard — no `pnpm build` required. The P23b
// RUN_BUILD_TESTS gate was removed: it silently disabled this guard in
// every default `pnpm check` run, so the invariant it protects was not
// actually being enforced.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

const TARGET_CALCS = [
  'src/engines/customer-support/csat-calculator.ts',
  'src/engines/marketing/roas-calculator.ts',
  'src/engines/valuation/cac-calculator.ts',
  'src/engines/saas/churn-rate-calculator.ts',
  'src/engines/saas/burn-rate-calculator.ts',
];

const REQUIRED_TAGS = [
  '🧭 Decision Question',
  '🧭 Recommendation',
  '🧭 Key Uncertainty',
  '🧭 Next Action',
];

test('5 calc 全部含 🧭 Decision Recommendation 4 子段', () => {
  for (const relPath of TARGET_CALCS) {
    const src = readFileSync(resolve(root, relPath), 'utf8');
    for (const tag of REQUIRED_TAGS) {
      assert.ok(
        src.includes(tag),
        `${relPath} 缺失决策标签: "${tag}"`
      );
    }
  }
});

test('guard 元数据正确（5 calc × 4 标签）', () => {
  assert.equal(TARGET_CALCS.length, 5);
  assert.equal(REQUIRED_TAGS.length, 4);
});