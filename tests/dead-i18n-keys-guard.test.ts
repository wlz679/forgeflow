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
import enRaw from '../src/i18n/locales/en.json';
import zhRaw from '../src/i18n/locales/zh.json';
// Vite/TS infers JSON imports as literal-key unions; cast to Record so
// dynamic-string lookups (`en[entry]`) don't trigger TS7053.
const en = enRaw as Record<string, string>;
const zh = zhRaw as Record<string, string>;

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
  // P117: tier-2 round 4 (22 keys, 1:1 per engine)
  { path: 'solopreneur-saas-pricing-planner/index.html', mustContain: '🎯 按层级 LTV:' },
  { path: 'solopreneur-safe-convertible-note-calculator/index.html', mustContain: '🎯 持股结果:' },
  { path: 'solopreneur-freelance-tax-calculator/index.html', mustContain: '🎯 季度付款计划:' },
  { path: 'solopreneur-equity-dilution-calculator/index.html', mustContain: '🎯 各轮退出价值:' },
  { path: 'solopreneur-mrr-calculator/index.html', mustContain: '🎯 MRR 里程碑预测' },
  { path: 'solopreneur-revenue-projector/index.html', mustContain: '🎯 行动计划' },
  { path: 'solopreneur-sponsorship-rate-calculator/index.html', mustContain: '🎯 规模化收入:' },
  { path: 'solopreneur-compound-interest-calculator/index.html', mustContain: '🎯 目标时间里程碑:' },
  { path: 'solopreneur-hourly-vs-fixed-calculator/index.html', mustContain: '🩺 费率健康:' },
  { path: 'solopreneur-compound-interest-calculator/index.html', mustContain: '🩺 复利健康:' },
  { path: 'solopreneur-equity-dilution-calculator/index.html', mustContain: '🩺 创始人健康:' },
  { path: 'solopreneur-freelance-rate-calculator/index.html', mustContain: '🩺 市场定位:' },
  { path: 'solopreneur-rental-yield-calculator/index.html', mustContain: '🩺 收益率健康:' },
  { path: 'solopreneur-dscr-calculator/index.html', mustContain: '💰 贷款快照:' },
  { path: 'solopreneur-ai-image-cost-calculator/index.html', mustContain: '💰 成本摘要' },
  { path: 'solopreneur-cap-rate-calculator/index.html', mustContain: '💰 房产快照:' },
  { path: 'solopreneur-rental-yield-calculator/index.html', mustContain: '💰 投资快照:' },
  { path: 'solopreneur-arr-multiple-valuation-calculator/index.html', mustContain: '⚖️ 前向估值:' },
  { path: 'solopreneur-freelance-tax-calculator/index.html', mustContain: '⚖️ 自雇 vs W-2 盈亏平衡:' },
  { path: 'solopreneur-project-profitability-calculator/index.html', mustContain: '⚖️ 盈利时薪:' },
  { path: 'solopreneur-affiliate-income-calculator/index.html', mustContain: '📐 CTR/EPC 漏斗:' },
  { path: 'solopreneur-mrr-calculator/index.html', mustContain: '📐 关键 SaaS 指标' },
  // P118: tier-2 round 5 (28 keys, 1:1 per engine)
  { path: 'solopreneur-revenue-projector/index.html', mustContain: 'MRR 里程碑' },
  { path: 'solopreneur-revenue-projector/index.html', mustContain: '关键里程碑' },
  { path: 'solopreneur-revenue-projector/index.html', mustContain: '增长情景（12 个月展望）' },
  { path: 'solopreneur-rent-vs-buy-calculator/index.html', mustContain: '停留期里程碑:' },
  { path: 'solopreneur-time-value-calculator/index.html', mustContain: '目标时间:' },
  { path: 'solopreneur-affiliate-income-calculator/index.html', mustContain: '规模化预测:' },
  { path: 'solopreneur-affiliate-income-calculator/index.html', mustContain: '漏斗健康:' },
  { path: 'solopreneur-rent-vs-buy-calculator/index.html', mustContain: '决策健康:' },
  { path: 'solopreneur-time-value-calculator/index.html', mustContain: '利用率健康:' },
  { path: 'solopreneur-burn-multiple-rule-of-40-calculator/index.html', mustContain: 'SaaS 健康象限:' },
  { path: 'solopreneur-mortgage-calculator/index.html', mustContain: '可负担健康:' },
  { path: 'solopreneur-mrr-calculator/index.html', mustContain: '流失与收缩健康' },
  { path: 'solopreneur-freelance-tax-calculator/index.html', mustContain: '税务效率:' },
  { path: 'solopreneur-affiliate-income-calculator/index.html', mustContain: '你的流量与转化:' },
  { path: 'solopreneur-time-value-calculator/index.html', mustContain: '时间财富快照:' },
  { path: 'solopreneur-burn-multiple-rule-of-40-calculator/index.html', mustContain: '40 法则结果:' },
  { path: 'solopreneur-burn-multiple-rule-of-40-calculator/index.html', mustContain: '烧钱倍数结果:' },
  { path: 'solopreneur-equity-dilution-calculator/index.html', mustContain: '股权快照:' },
  { path: 'solopreneur-mortgage-calculator/index.html', mustContain: '月供:' },
  { path: 'solopreneur-freelance-rate-calculator/index.html', mustContain: '费率阶梯（市场背景）:' },
  { path: 'solopreneur-market-size-estimator/index.html', mustContain: '现实校验' },
  { path: 'solopreneur-revenue-projector/index.html', mustContain: '跑道与盈亏平衡' },
  { path: 'solopreneur-mortgage-calculator/index.html', mustContain: '贷款期限对比:' },
  { path: 'solopreneur-revenue-projector/index.html', mustContain: '月度 MRR 明细' },
  { path: 'solopreneur-time-value-calculator/index.html', mustContain: '时间价值比:' },
  { path: 'solopreneur-equity-dilution-calculator/index.html', mustContain: '每股轮次稀释:' },
  { path: 'solopreneur-unit-economics-calculator/index.html', mustContain: '规模化经济' },
  { path: 'solopreneur-email-list-revenue-calculator/index.html', mustContain: '漏斗指标:' },
  // P119: tier-2 round 6 (11 keys, 1:1 per engine) — closes remaining static tier-2 gaps
  { path: 'solopreneur-course-pricing-calculator/index.html', mustContain: '收入预测:' },
  { path: 'solopreneur-market-size-estimator/index.html', mustContain: '市场健康:' },
  { path: 'solopreneur-course-pricing-calculator/index.html', mustContain: '发布收入:' },
  { path: 'solopreneur-course-pricing-calculator/index.html', mustContain: '定价指标:' },
  { path: 'solopreneur-email-list-revenue-calculator/index.html', mustContain: '列表经济:' },
  { path: 'solopreneur-freelance-rate-calculator/index.html', mustContain: '目标费率快照:' },
  { path: 'solopreneur-project-profitability-calculator/index.html', mustContain: '年化利润:' },
  { path: 'solopreneur-project-profitability-calculator/index.html', mustContain: '净利润与利润率:' },
  { path: 'solopreneur-freelance-tax-calculator/index.html', mustContain: '实收明细:' },
  { path: 'solopreneur-unit-economics-calculator/index.html', mustContain: '杠杆影响排名' },
  { path: 'solopreneur-unit-economics-calculator/index.html', mustContain: '优化杠杆' },
  // P137 T2.7 composite data-driven lines (key-name entries — Task 5 asserts
  // these exist in translations.ts; Task 2 wires the corresponding zh
  // post-processor patterns). Plain string entries are filtered in the test
  // loop below (the iteration works on objects only).
  'engine_cost.comparison_title',
  'engine_cost.reqs_per_day',
  'engine_cost.cheapest_prefix',
  'engine_cost.at_per_month',
  'engine_cost.saving_prefix',
  'engine_cost.saving_suffix',
  'engine_cost.image_cheapest',
  'engine_cost.gpu_total',
  'engine_cost.training_total',
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

  // P137 T2.7: entries may be plain key-name strings (tracked for
  // translations.ts existence) or object assertions (track zh-page rendering).
  // Plain-string entries are checked via direct translations.ts lookup;
  // object entries are checked against the built zh/ HTML.
  for (const entry of WORKING_KEY_REQUIRED) {
    if (typeof entry === 'string') {
      // P137 I1: assert the key exists in translations.ts (without it, the
      // guard silently accepts orphan-reference removal). For P138+,
      // reserved keys (saving_*, image_cheapest, gpu_total, training_total)
      // become object entries once patterns land.
      if (!en[entry] || !zh[entry]) {
        violations.push(`${entry}: WORKING_KEY_REQUIRED entry references missing i18n locale key (en.json or zh.json)`);
      }
      continue;
    }
    const { path, mustContain } = entry;
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