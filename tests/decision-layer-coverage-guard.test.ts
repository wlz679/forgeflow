#!/usr/bin/env node
// P140f — CI guard for Decision Layer coverage (source-level invariant).
//
// Why this exists:
//   Phase 1 5 calc 必须含 🧭 Decision Recommendation 4 子段（v2.0 L5 决策支持灵魂）。
//   这是 v2.0 灵魂 first-class 化，任何 calc 回退到只有数字（无决策）必须被检出。
//
// 7 工具：csat / roas / cac / churn-rate (saas) / burn-rate / ltv-by-channel / gdpr-fine
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
import { L5_LAYERS, L5_TAGS } from './l5-tags.ts';

const root = resolve(import.meta.dirname, '..');

const TARGET_CALCS = [
  // P168 B3-1：迁出决策支持的工具也进清单（判据是「引擎输出 ∪ 页面 i18n 键」，
  //   所以迁出后仍然必须**齐** —— 迁走不等于可以少一层）
  // P168 B3-4：再迁 15 个工具（本批）
  'src/engines/customer-support/csat-calculator.ts',
  'src/engines/marketing/roas-calculator.ts',
  'src/engines/valuation/cac-calculator.ts',
  'src/engines/saas/churn-rate-calculator.ts',
  'src/engines/saas/burn-rate-calculator.ts',
  'src/engines/marketing/ltv-by-channel-calculator.ts',
  'src/engines/legal-compliance/gdpr-fine-calculator.ts',
  'src/engines/cost/employee-cost-calculator.ts',
  'src/engines/investment/equity-dilution-calculator.ts',
  'src/engines/freelance/freelance-rate-calculator.ts',
  'src/engines/real-estate/rent-vs-buy-calculator.ts',
  'src/engines/valuation/saas-valuation-calculator.ts',
  'src/engines/sales/acv-calculator.ts',
  'src/engines/hiring-team/comp-banding-calculator.ts',
  'src/engines/retention/customer-health-score-calculator.ts',
  'src/engines/product-analytics/funnel-step-calculator.ts',
  'src/engines/ai-cost/gpu-cloud-cost-calculator.ts',
  'src/engines/knowledge/kb-coverage-rate-calculator.ts',
  'src/engines/operations/stockout-cost-calculator.ts',
];

// P153-E2: the tag list now lives in tests/l5-tags.ts — one definition for
// the guard, the audit test and (by extension) any future consumer, so the
// copies cannot drift apart the way the old three did.
const REQUIRED_TAGS = L5_TAGS;

test('7 calc 全部含 🧭 Decision Recommendation 4 子段（或已迁进页面决策层）', () => {
  // ⭐ P168 B3-0：决策支持**可以住在两个地方** ——
  //   ① 引擎输出里的 🧭 四段（未迁移的工具）
  //   ② 页面的决策层 i18n 键（已迁移的工具：burn-rate 已整段迁出引擎）
  // ⇒ 判据是「**这个工具的决策建议层齐不齐**」，不是「引擎源码里有没有那四个字符串」
  //   （后者会把「迁走了」误判成「退化了」—— 而迁移正是我们要的形态）。
  const locale = JSON.parse(
    readFileSync(resolve(root, 'src/i18n/locales/en.json'), 'utf8').replace(/^\uFEFF/, ''),
  ) as Record<string, string>;
  for (const relPath of TARGET_CALCS) {
    const src = readFileSync(resolve(root, relPath), 'utf8');
    const slug = (src.match(/\bslug\s*:\s*['"]([^'"]+)['"]/) ?? [])[1] ?? '';
    const missing = L5_LAYERS.filter(
      (l) =>
        !src.includes(l.tag) &&
        typeof locale['tools.' + slug + '.' + l.key] !== 'string',
    );
    assert.equal(
      missing.length,
      0,
      `${relPath} 缺失决策层: ${missing.map((m) => m.tag).join(', ')}`,
    );
  }
});

test('guard 元数据正确（7 calc × 4 标签）', () => {
  assert.equal(TARGET_CALCS.length, 19);
  assert.equal(REQUIRED_TAGS.length, 4);
  // 契约只有一份（tests/l5-layers.json）⇒ 标签表与键映射不可能各自漂。
  // ⚠️ 期望值**独立写死字面量** —— 若从同一份 JSON 派生，那是同义反复
  //   （断言恒真 ⇒ 守卫测不到任何东西）。这里写死 ⇒ 契约被改动时它会红。
  assert.deepEqual(L5_LAYERS.map((l) => l.key), [
    'decision_goal',
    'decision_recommendation',
    'decision_constraint',
    'decision_next_tool',
  ]);
  assert.deepEqual(L5_LAYERS.map((l) => l.tag), [
    '🧭 Decision Question',
    '🧭 Recommendation',
    '🧭 Key Uncertainty',
    '🧭 Next Action',
  ]);
});