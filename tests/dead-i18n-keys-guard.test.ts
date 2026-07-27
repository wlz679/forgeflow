#!/usr/bin/env node
// P103 — CI guard preventing future re-addition of dead i18n keys.
//
// Why this exists:
//   P99/P100 added 4 i18n keys ('ops_cost.section.savings_insights',
//   'ops_cost.section.usage_scenarios', 'misc.section.savings_insights',
//   'misc.section.usage_scenarios') that reference strings ('💰 Savings Insights',
//   '📊 Usage Scenarios (monthly costs)') that don't appear in any cost/ops/
//   valuation engine staticExamples. P102 deleted those dead keys. This guard
//   prevents future regressions by walking dist/zh pages and asserting the
//   forbidden strings never appear.
//
// Positive coverage (working keys DO translate):
//   - dist/zh/solopreneur-break-even-calculator/ has '📊 盈亏平衡分析'
//   - dist/zh/solopreneur-remote-vs-office-calculator/ has '🎯 盈亏平衡分析:'
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 26th build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
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
  console.log('[p103] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

function getPages(lang: 'en' | 'zh'): string[] {
  const dir = resolve(root, 'dist', lang);
  const pages: string[] = [];
  // Use depth counter to prevent stack overflow from symlink cycles
  function walk(d: string, relBase: string, depth: number = 0): void {
    if (depth > 10) return; // safety: dist/ has at most ~5 levels
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = resolve(d, entry.name);
      const rel = relBase ? `${relBase}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, rel, depth + 1);
      else if (entry.name === 'index.html') pages.push(rel);
    }
  }
  walk(dir, '');
  return pages;
}

// Strip <script>, <style>, JSON-LD blocks — same pattern as zh-hardcoded-english-guard
// (P72 audit filter). Forbidden strings may legitimately appear inside customFn JS
// source code (e.g., `s.indexOf('Savings Insights')` for substring matching) but
// MUST NOT appear in user-visible HTML.
function stripNonBody(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+type="application\/ld\+json"[^>]*>[\s\S]*?<\/[^>]+>/gi, ' ');
}

// P102-deleted dead keys — forbidden ZH translations on zh pages (visible content).
// '💰 节省洞察' was promoted from dead to working in P104 (now
// 'ai_cost.section.savings_insights' for 4 AI cost engines). The remaining
// '📊 使用场景（每月成本）' is still dead — that string never appears in any
// engine output (AI cost engines use '📅 Usage Scenarios — Top 5 Cheapest
// Models at Different Volumes' with a date emoji and longer text).
const DEAD_KEY_FORBIDDEN_STRINGS = [
  '📊 使用场景（每月成本）',
];

// Working i18n keys — required on specific zh pages (visible content).
// If these translations disappear, the post-processor broke.
const WORKING_KEY_REQUIRED = [
  // P102 ops_cost keys
  { path: 'solopreneur-break-even-calculator/index.html', mustContain: '📊 盈亏平衡分析' },
  { path: 'solopreneur-remote-vs-office-calculator/index.html', mustContain: '🎯 盈亏平衡分析:' },
  // P104 ai_cost 'Savings Insights' (4 LLM API engines)
  { path: 'solopreneur-claude-api-cost-calculator/index.html', mustContain: '💰 节省洞察' },
  { path: 'solopreneur-openai-token-calculator/index.html', mustContain: '💰 节省洞察' },
  { path: 'solopreneur-gemini-api-cost-calculator/index.html', mustContain: '💰 节省洞察' },
  { path: 'solopreneur-deepseek-api-cost-calculator/index.html', mustContain: '💰 节省洞察' },
  // P105 ai_cost 'Usage Scenarios' (3 emoji variants × 4 engines)
  { path: 'solopreneur-claude-api-cost-calculator/index.html', mustContain: '📊 使用场景' },
  { path: 'solopreneur-deepseek-api-cost-calculator/index.html', mustContain: '📅 使用场景' },
  { path: 'solopreneur-gemini-api-cost-calculator/index.html', mustContain: '📅 使用场景' },
  { path: 'solopreneur-openai-token-calculator/index.html', mustContain: '📅 使用场景（月度成本）' },
  // P111: business.section.* (44 engine-instances across 20 cost/ops/valuation
  // engines). 6 ops-specific keys asserted across all 6 ops engines (24
  // assertions) + 3 sample assertions for the cross-category keys.
  // 6 ops engines × 4 ops-specific keys (health/inputs_snapshot/what_if/milestone)
  ...[
    'solopreneur-carrying-cost-calculator',
    'solopreneur-fulfillment-cost-calculator',
    'solopreneur-inventory-turnover-calculator',
    'solopreneur-reorder-point-calculator',
    'solopreneur-stockout-cost-calculator',
    'solopreneur-supplier-scorecard-calculator',
  ].flatMap(slug => [
    { path: `${slug}/index.html`, mustContain: '🩺 健康:' },
    { path: `${slug}/index.html`, mustContain: '📊 输入快照:' },
    { path: `${slug}/index.html`, mustContain: '🔄 假设分析:' },
    { path: `${slug}/index.html`, mustContain: '🎯 里程碑:' },
  ]),
  // Cross-category sample assertions
  { path: 'solopreneur-meeting-cost-calculator/index.html', mustContain: '🔄 假设场景:' },
  { path: 'solopreneur-employee-cost-calculator/index.html', mustContain: '📐 关键指标:' },
  { path: 'solopreneur-ltv-calculator/index.html', mustContain: '📊 关键结果:' },
  // P113: tier-2 single-engine health/snapshot subheaders (18 keys, 1:1 per engine)
  { path: 'solopreneur-employee-cost-calculator/index.html', mustContain: '🩺 成本健康:' },
  { path: 'solopreneur-meeting-cost-calculator/index.html', mustContain: '🩺 会议健康:' },
  { path: 'solopreneur-productivity-score/index.html', mustContain: '🩺 生产力健康:' },
  { path: 'solopreneur-remote-vs-office-calculator/index.html', mustContain: '🩺 决策健康:' },
  { path: 'solopreneur-saas-pricing-planner/index.html', mustContain: '🩺 定价健康:' },
  { path: 'solopreneur-arr-multiple-valuation-calculator/index.html', mustContain: '🩺 倍数健康:' },
  { path: 'solopreneur-break-even-calculator/index.html', mustContain: '🩺 盈亏平衡健康:' },
  { path: 'solopreneur-saas-valuation-calculator/index.html', mustContain: '🩺 估值健康:' },
  { path: 'solopreneur-safe-convertible-note-calculator/index.html', mustContain: '🩺 交易健康:' },
  { path: 'solopreneur-stripe-fee-calculator/index.html', mustContain: '🩺 费率效率健康:' },
  { path: 'solopreneur-unit-economics-calculator/index.html', mustContain: '🩺 单位经济健康:' },
  { path: 'solopreneur-meeting-cost-calculator/index.html', mustContain: '💰 成本快照:' },
  { path: 'solopreneur-productivity-score/index.html', mustContain: '💰 得分快照:' },
  { path: 'solopreneur-saas-pricing-planner/index.html', mustContain: '💰 价格层快照:' },
  { path: 'solopreneur-arr-multiple-valuation-calculator/index.html', mustContain: '💰 估值快照:' },
  { path: 'solopreneur-burn-multiple-rule-of-40-calculator/index.html', mustContain: '💰 指标快照:' },
  { path: 'solopreneur-safe-convertible-note-calculator/index.html', mustContain: '💰 交易快照:' },
  { path: 'solopreneur-stripe-fee-calculator/index.html', mustContain: '💰 单次费用明细:' },
  // P114: tier-2 round 2 (12 keys, 1:1 per engine)
  { path: 'solopreneur-ltv-calculator/index.html', mustContain: '🩺 LTV 健康:' },
  { path: 'solopreneur-cac-calculator/index.html', mustContain: '🩺 CAC 健康:' },
  { path: 'solopreneur-employee-cost-calculator/index.html', mustContain: '🎯 年度预测:' },
  { path: 'solopreneur-meeting-cost-calculator/index.html', mustContain: '🎯 季度与年度预测:' },
  { path: 'solopreneur-productivity-score/index.html', mustContain: '🎯 改善预测:' },
  { path: 'solopreneur-stripe-fee-calculator/index.html', mustContain: '🎯 交易量预测:' },
  { path: 'solopreneur-employee-cost-calculator/index.html', mustContain: '⚖️ 全职 vs 合同工盈亏平衡:' },
  { path: 'solopreneur-meeting-cost-calculator/index.html', mustContain: '⚖️ 异步 vs 同步盈亏平衡:' },
  { path: 'solopreneur-productivity-score/index.html', mustContain: '⚖️ 深度工作 vs 浅层工作盈亏平衡:' },
  { path: 'solopreneur-remote-vs-office-calculator/index.html', mustContain: '📐 人均明细:' },
  { path: 'solopreneur-arr-multiple-valuation-calculator/index.html', mustContain: '📐 倍数确定:' },
  { path: 'solopreneur-safe-convertible-note-calculator/index.html', mustContain: '📐 转换机制:' },
  // P115: tier-2 round 3 (22 keys, 1:1 per engine)
  { path: 'solopreneur-ltv-calculator/index.html', mustContain: '🎯 LTV 里程碑' },
  { path: 'solopreneur-arr-multiple-valuation-calculator/index.html', mustContain: '🎯 分阶段倍数范围:' },
  { path: 'solopreneur-brrrr-calculator/index.html', mustContain: '🎯 BRRRR 目标:' },
  { path: 'solopreneur-cap-rate-calculator/index.html', mustContain: '🎯 市场基准（A/B/C 类，按城市分级）:' },
  { path: 'solopreneur-dscr-calculator/index.html', mustContain: '🎯 贷款机构阈值:' },
  { path: 'solopreneur-email-list-revenue-calculator/index.html', mustContain: '🎯 列表增长预测:' },
  { path: 'solopreneur-hourly-vs-fixed-calculator/index.html', mustContain: '🎯 收入阶梯:' },
  { path: 'solopreneur-rental-yield-calculator/index.html', mustContain: '🎯 收益率基准:' },
  { path: 'solopreneur-burn-rate-calculator/index.html', mustContain: '🩺 烧钱健康:' },
  { path: 'solopreneur-cap-rate-calculator/index.html', mustContain: '🩺 资本化率健康:' },
  { path: 'solopreneur-churn-rate-calculator/index.html', mustContain: '🩺 流失健康:' },
  { path: 'solopreneur-dscr-calculator/index.html', mustContain: '🩺 DSCR 健康:' },
  { path: 'solopreneur-email-list-revenue-calculator/index.html', mustContain: '🩺 列表健康:' },
  { path: 'solopreneur-project-profitability-calculator/index.html', mustContain: '🩺 利润健康:' },
  { path: 'solopreneur-affiliate-income-calculator/index.html', mustContain: '💰 收入快照:' },
  { path: 'solopreneur-compound-interest-calculator/index.html', mustContain: '💰 增长快照:' },
  { path: 'solopreneur-rent-vs-buy-calculator/index.html', mustContain: '💰 决策快照:' },
  { path: 'solopreneur-mortgage-calculator/index.html', mustContain: '⚖️ 摊销里程碑:' },
  { path: 'solopreneur-rent-vs-buy-calculator/index.html', mustContain: '⚖️ 并排对比:' },
  { path: 'solopreneur-rental-yield-calculator/index.html', mustContain: '⚖️ 收益构成:' },
  { path: 'solopreneur-cap-rate-calculator/index.html', mustContain: '📐 资本化率计算:' },
  { path: 'solopreneur-freelance-rate-calculator/index.html', mustContain: '📐 费率倍数:' },
];

test('forbidden dead-key strings never appear in user-visible zh HTML', () => {
  ensureBuilt();
  const zhPages = getPages('zh');

  const violations: string[] = [];

  for (const rel of zhPages) {
    const rawHtml = readFileSync(resolve(root, 'dist', 'zh', rel), 'utf-8');
    const html = stripNonBody(rawHtml);
    for (const forbidden of DEAD_KEY_FORBIDDEN_STRINGS) {
      if (html.includes(forbidden)) {
        violations.push(`${rel}: contains forbidden string "${forbidden}"`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `Dead i18n key violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThese strings are dead-key residue from P99/P100 appearing in user-visible content. ` +
      `P102 removed the keys because no engine staticExamples contain these exact strings. ` +
      `Check src/i18n/translations.ts and src/pages/[lang]/[slug].astro translateCalcOutput headerKeys.`
  );
});

test('working i18n keys translate on their target pages', () => {
  ensureBuilt();

  const violations: string[] = [];

  for (const { path, mustContain } of WORKING_KEY_REQUIRED) {
    const full = resolve(root, 'dist', 'zh', path);
    if (!existsSync(full)) {
      violations.push(`${path}: file missing`);
      continue;
    }
    const rawHtml = readFileSync(full, 'utf-8');
    // Working keys can appear anywhere — including inside customFn JS source
    // (the literal English string gets translated client-side too in some cases).
    // Use raw HTML to assert presence in the page at all.
    if (!rawHtml.includes(mustContain)) {
      violations.push(`${path}: missing required translated string "${mustContain}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Working i18n key violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '') +
      `\n\nThese translated strings disappeared — the post-processor broke. ` +
      `Check src/pages/[lang]/[slug].astro translateCalcOutput function and the headerKeys array.`
  );
});