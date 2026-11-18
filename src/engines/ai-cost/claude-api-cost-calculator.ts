import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import PRICING from '../../data/ai-pricing.json';
import { pickInteractiveModels, pickCrossProviderModels } from '../../data/ai-pricing-popular';
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// --- Model definitions ---
interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: 'mythos' | 'claude5x' | 'claude4x' | 'legacy';
  contextWindow: string;
  maxOutput: string;
  batchInput: number;
  batchOutput: number;
  order: number;
}

// P156: build-time model set == the interactive set (13), matching the
// client-side customFn bundle. See src/data/ai-pricing-popular.ts.
const MODELS: Record<string, ModelInfo> = pickInteractiveModels(
  PRICING.llm.anthropic.models as any,
  'anthropic',
);

// Family display metadata
const FAMILY_ICONS: Record<string, string> = {
  mythos: '✦',     // ✦
  claude5x: '★',   // ★
  claude4x: '▲',   // ▲
  legacy: '◆',     // ◆
};
const FAMILY_LABELS: Record<string, string> = {
  mythos: 'Mythos',
  claude5x: 'Claude 5.x',
  claude4x: 'Claude 4.x',
  legacy: 'Legacy',
};

// Prompt Caching multipliers
const CACHE_WRITE_MULT: Record<string, number> = { '5min': 1.25, '1hour': 2.0 };
const CACHE_READ_MULT = 0.1;

// Default selected models (first 4, newest)
const DEFAULT_SELECTED = [
  'claude-fable-5',
  'claude-opus-4-8',
  'claude-sonnet-4-6',
  'claude-haiku-4-5',
];

// Scenario presets
const PRESETS: Record<string, Record<string, string>> = {
  'Small Project': {
    inputTokens: '500', outputTokens: '1000', requestsPerDay: '50',
    pricingMode: 'realtime', cacheWriteTokens: '500', cacheTtl: '5min', cacheReadHitRate: '80',
    growthRate: '0', projectionMonths: '12',
  },
  'Mid-Scale': {
    inputTokens: '2000', outputTokens: '1000', requestsPerDay: '500',
    pricingMode: 'realtime', cacheWriteTokens: '2000', cacheTtl: '5min', cacheReadHitRate: '60',
    growthRate: '0', projectionMonths: '12',
  },
  'High Volume': {
    inputTokens: '5000', outputTokens: '2000', requestsPerDay: '5000',
    pricingMode: 'realtime', cacheWriteTokens: '5000', cacheTtl: '1hour', cacheReadHitRate: '40',
    growthRate: '0', projectionMonths: '12',
  },
  'Batch Processing': {
    inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000',
    pricingMode: 'batch', cacheWriteTokens: '0', cacheTtl: '5min', cacheReadHitRate: '0',
    growthRate: '0', projectionMonths: '12',
  },
  'Heavy Caching': {
    inputTokens: '2000', outputTokens: '800', requestsPerDay: '2000',
    pricingMode: 'realtime', cacheWriteTokens: '2000', cacheTtl: '1hour', cacheReadHitRate: '90',
    growthRate: '0', projectionMonths: '12',
  },
  Enterprise: {
    inputTokens: '10000', outputTokens: '5000', requestsPerDay: '50000',
    pricingMode: 'batch', cacheWriteTokens: '10000', cacheTtl: '1hour', cacheReadHitRate: '70',
    growthRate: '0', projectionMonths: '12',
  },
};

// P164: 跨供应商对比的代表模型 —— 见 gemini 引擎同名的注释。
//
// 「展示哪几个模型」与「展示名叫什么」是**编辑决定** ⇒ 放在
// src/data/ai-pricing-popular.json 的 crossProviderModels 里（**唯一一份**，
// 服务端两个引擎 + 客户端 codegen 三处共用）；**价格一律从数据集派生**。
//
// 之前这张表是手写的，而且已经漂了：DeepSeek 那行手写 0.14/0.28，
// 数据集里 deepseek-v4-flash 实际 **0.3 / 1.2**（差 2.1 倍 / 4.3 倍）⇒
// 页面上「Claude vs DeepSeek」的跨供应商对比一直在用错价。
const CROSS_PROVIDER: Record<string, { input: number; output: number; name: string }> =
  Object.fromEntries(
    pickCrossProviderModels('claude').map((c) => [
      c.key,
      crossProviderModel(c.provider, c.model, c.label),
    ]),
  );

/** 取数据集里某个模型的 per-1M 输入/输出价；展示名用编辑口径。 */
function crossProviderModel(provider: string, key: string, label: string) {
  const models = (PRICING.llm as unknown as Record<string, { models: Record<string, { input: number; output: number }> }>)[provider]?.models;
  const m = models?.[key];
  if (!m) throw new Error(`cross-provider model missing from dataset: ${provider}/${key}`);
  return { input: m.input, output: m.output, name: label };
}

// Helpers
function fmt(n: number): string {
  if (Math.abs(n) < 0.01 && n !== 0) return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string {
  return s + ' '.repeat(Math.max(0, len - s.length));
}

// Token estimator (Claude tokenizer ≈1.3-1.5 tokens/word English, ~0.65 chars/token CJK)
function estimateTokens(text: string): { tokens: number; method: string } {
  if (!text.trim()) return { tokens: 0, method: 'empty' };
  const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const words = text.split(/\s+/).length;
  if (cjk > text.length * 0.3) {
    return { tokens: Math.round(text.length / 0.65), method: 'CJK (0.65 chars/token)' };
  }
  return { tokens: Math.round(words * 1.4), method: 'English (1.4 words/token)' };
}

// SEP and DASH for formatting
const SEP = '─'; // ─
const DASH = '—'; // —

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const selectedKeys = [...new Set(
    (inputs.models || DEFAULT_SELECTED.join(','))
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
  )];
  const inTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.inputTokens) || 1000));
  const outTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.outputTokens) || 500));
  const reqPerDay = Math.max(0, Math.min(1_000_000, parseInt(inputs.requestsPerDay) || 100));
  const pricingMode = inputs.pricingMode === 'batch' ? 'batch' : 'realtime';
  const cacheWriteTokens = Math.max(0, Math.min(inTokens, parseInt(inputs.cacheWriteTokens) || 0));
  const cacheTtl = inputs.cacheTtl === '1hour' ? '1hour' : '5min';
  const cacheReadHitRate = Math.max(0, Math.min(100, parseInt(inputs.cacheReadHitRate) || 0));
  const growthRate = Math.max(0, Math.min(50, parseFloat(inputs.growthRate) || 0));
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  const cachingActive = cacheWriteTokens > 0 && cacheReadHitRate > 0;
  const writeMult = CACHE_WRITE_MULT[cacheTtl] || 1.25;
  const hitRate = cacheReadHitRate / 100;
  const reqsPerMonth = reqPerDay * 30;

  // --- Compute costs for all models ---
  interface CostEntry {
    key: string;
    info: ModelInfo;
    inputPrice: number;
    outputPrice: number;
    costPerReq: number;
    monthlyCost: number;
    noCacheCostPerReq: number;
    noCacheMonthly: number;
  }

  const allCosts: CostEntry[] = [];
  for (const [key, info] of Object.entries(MODELS)) {
    const inputPrice = pricingMode === 'batch' ? info.batchInput : info.input;
    const outputPrice = pricingMode === 'batch' ? info.batchOutput : info.output;

    // Without caching
    const noCacheCostPerReq =
      (inTokens / 1_000_000) * inputPrice + (outTokens / 1_000_000) * outputPrice;
    const noCacheMonthly = noCacheCostPerReq * reqsPerMonth;

    // With caching (blended)
    let costPerReq: number;
    if (cachingActive) {
      const nonCacheInput = ((inTokens - cacheWriteTokens) / 1_000_000) * inputPrice;
      const cacheMissCost = (1 - hitRate) * (cacheWriteTokens / 1_000_000) * inputPrice * writeMult;
      const cacheHitCost = hitRate * (cacheWriteTokens / 1_000_000) * inputPrice * CACHE_READ_MULT;
      const blendedInput = nonCacheInput + cacheMissCost + cacheHitCost;
      const outputCost = (outTokens / 1_000_000) * outputPrice;
      costPerReq = blendedInput + outputCost;
    } else {
      costPerReq = noCacheCostPerReq;
    }

    const monthlyCost = costPerReq * reqsPerMonth;
    allCosts.push({
      key, info, inputPrice, outputPrice,
      costPerReq, monthlyCost,
      noCacheCostPerReq, noCacheMonthly,
    });
  }

  // Sort by display order
  allCosts.sort((a, b) => a.info.order - b.info.order);

  const cheapest = allCosts.reduce((min, c) =>
    c.monthlyCost < min.monthlyCost ? c : min,
  );
  const maxCost = allCosts.reduce((max, c) =>
    c.monthlyCost > max.monthlyCost ? c : max,
  ).monthlyCost;

  // Filter selected
  const selectedCosts: CostEntry[] = [];
  for (const k of selectedKeys) {
    const entry = allCosts.find((c) => c.key === k);
    if (entry) selectedCosts.push(entry);
  }
  if (selectedCosts.length === 0) {
    for (const dk of DEFAULT_SELECTED) {
      const entry = allCosts.find((c) => c.key === dk);
      if (entry) selectedCosts.push(entry);
    }
  }

  const out: string[] = [];
  // P168 B3-9: DELETE the "Pricing last updated" line (same recipe as ai-training-cost-estimator).
  //   codegen already strips it from staticExamples[0] (scripts/codegen-examples.mjs:317) and the
  //   page renders the same date as a badge => keeping it only makes the server output one line
  //   longer than the static card (pre-existing G6 drift). After tokenization both sides must match
  //   character for character. The visible English page does not change.
  out.push('');

  // ================================================================
  // Section 1: Header
  // ================================================================
  // P168 B3-9: the pricing-mode label is a token (same code on server and client).
  const modeLabel = pricingMode === 'batch'
    ? makeToken('calc_out.claude_api_cost.row.pricing_mode_batch', '⚡ Batch Pricing (50% off)')
    : makeToken('calc_out.claude_api_cost.row.pricing_mode_realtime', '🔴 Real-time Pricing');
  let headerLine = modeLabel;
  if (cachingActive) {
    const ttlLabel = cacheTtl === '1hour' ? '1-hour TTL' : '5-min TTL';
    headerLine += ' | ' + makeToken('calc_out.claude_api_cost.row.cache_header', '💾 Cache: ' + cacheReadHitRate + '% hit (' + ttlLabel + ')', { hit: String(cacheReadHitRate), ttl: ttlLabel });
  }
  out.push(headerLine);
  out.push('');
  out.push(
    makeToken('calc_out.claude_api_cost.row.input_req', '📥 Input') + ': ' + lc(inTokens) + ' tokens/req | ' +
    makeToken('calc_out.claude_api_cost.row.output_req', '📤 Output') + ': ' + lc(outTokens) + ' tokens/req | ' +
    '🔄 ' + lc(reqPerDay) + ' reqs/day',
  );
  if (cachingActive) {
    out.push(
      makeToken('calc_out.claude_api_cost.row.cache_write_line', '💾 Cache Write: ' + lc(cacheWriteTokens) + ' tokens/req (' + (writeMult === 1.25 ? '1.25×' : '2×') + ' write, 0.1× read)', { tokens: lc(cacheWriteTokens), mult: writeMult === 1.25 ? '1.25×' : '2×' }),
    );
  }
  out.push('');

  // ================================================================
  // Section 2: Bar Chart
  // ================================================================
  out.push(makeToken('calc_out.claude_api_cost.row.cost_comparison', '📊 Cost Comparison') + ' (' + lc(reqPerDay) + ' reqs/day)');
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 40;
  for (const c of allCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const label = icon + ' ' + c.info.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.key === cheapest.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    const isCheapest = c.key === cheapest.key;
    const badge = isCheapest ? ' 🏆' : '';
    out.push(pad(label, 26) + ' ' + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + badge);
  }
  out.push('');

  // ================================================================
  // Section 3: Detail Cards — selected models
  // ================================================================
  out.push(makeToken('calc_out.claude_api_cost.row.selected_model_details', '📋 Selected Model Details'));
  out.push(SEP.repeat(60));
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const famLabel = FAMILY_LABELS[c.info.family];
    const dailyCost = c.costPerReq * reqPerDay;
    const annualCost = c.monthlyCost * 12;

    out.push(
      icon + ' ' + c.info.name + ' (' + famLabel + ') | ' +
      makeToken('calc_out.claude_api_cost.row.context_label', 'Context') + ': ' + c.info.contextWindow + ' | ' +
      makeToken('calc_out.claude_api_cost.row.max_output_label', 'Max Output') + ': ' + c.info.maxOutput,
    );
    out.push(DASH.repeat(44));

    // Input cost per-request breakdown
    const inputCostLine = (inTokens / 1_000_000) * c.inputPrice;
    out.push(
      makeToken('calc_out.claude_api_cost.row.input_label', 'Input') + ':  ' +
        pad(lc(inTokens), 7) +
        ' tokens × ' +
        fmt(c.inputPrice) +
        '/1M → ' +
        fmt(inputCostLine) +
        '/req',
    );
    // Output cost per-request breakdown
    const outputCostLine = (outTokens / 1_000_000) * c.outputPrice;
    out.push(
      makeToken('calc_out.claude_api_cost.row.output_label', 'Output') + ': ' +
        pad(lc(outTokens), 7) +
        ' tokens × ' +
        fmt(c.outputPrice) +
        '/1M → ' +
        fmt(outputCostLine) +
        '/req',
    );

    out.push(DASH.repeat(44));
    out.push(makeToken('calc_out.claude_api_cost.row.per_request_label', 'Per request') + ':    ' + fmt(c.costPerReq));
    out.push(makeToken('calc_out.claude_api_cost.row.daily_label', 'Daily') + ' (' + reqPerDay + '):    ' + fmt(dailyCost));
    out.push(makeToken('calc_out.claude_api_cost.row.monthly_label', 'Monthly') + ' (30d):  ' + fmt(c.monthlyCost));
    out.push(makeToken('calc_out.claude_api_cost.row.annual_label', 'Annual') + ':         ' + fmt(annualCost));
    out.push(DASH.repeat(44));

    // Alternative pricing line
    if (pricingMode === 'realtime') {
      const batchCPR =
        (inTokens / 1_000_000) * c.info.batchInput +
        (outTokens / 1_000_000) * c.info.batchOutput;
      const batchMonthly = batchCPR * reqPerDay * 30;
      out.push(
        makeToken('calc_out.claude_api_cost.row.batch_pricing_line', '💡 Batch pricing: ' + fmt(batchCPR) + '/req (' + fmt(batchMonthly) + '/mo) — save 50%', { cpr: fmt(batchCPR), monthly: fmt(batchMonthly) }),
      );
    } else {
      const realtimeCPR =
        (inTokens / 1_000_000) * c.info.input +
        (outTokens / 1_000_000) * c.info.output;
      const realtimeMonthly = realtimeCPR * reqPerDay * 30;
      out.push(
        makeToken('calc_out.claude_api_cost.row.real_time_label', '🔴 Real-time') + ': ' +
          fmt(realtimeCPR) +
          '/req (' +
          fmt(realtimeMonthly) +
          '/mo)',
      );
    }

    // Cache line per model
    if (cachingActive) {
      const savings = c.noCacheMonthly - c.monthlyCost;
      const pctSaved = c.noCacheMonthly > 0 ? Math.round((savings / c.noCacheMonthly) * 100) : 0;
      out.push(
        makeToken('calc_out.claude_api_cost.row.cache_hit_line', '💾 With ' + cacheReadHitRate + '% cache hit: ' + fmt(c.monthlyCost) + '/mo — saves ' + fmt(savings) + '/mo (' + pctSaved + '%)', { hit: String(cacheReadHitRate), monthly: fmt(c.monthlyCost), savings: fmt(savings), pct: String(pctSaved) }),
      );
    }

    out.push('');
  }

  // ================================================================
  // Section 4: Caching Breakdown (Claude-specific)
  // ================================================================
  if (cachingActive) {
    const ref = cheapest;
    const ip = ref.inputPrice;
    const ttlLabel = cacheTtl === '1hour' ? '1-hour TTL' : '5-min TTL';
    const wmLabel = writeMult === 1.25 ? '1.25×' : '2×';
    out.push(makeToken('calc_out.claude_api_cost.row.cache_breakdown_title', '💾 Prompt Caching Breakdown (' + ttlLabel + ' × ' + wmLabel + ' write)', { ttl: ttlLabel, mult: wmLabel }));
    out.push(SEP.repeat(54));

    const cacheWriteCost = (cacheWriteTokens / 1_000_000) * ip * writeMult;
    const cacheMissCost = (1 - hitRate) * cacheWriteCost;
    const cacheHitCost = hitRate * (cacheWriteTokens / 1_000_000) * ip * CACHE_READ_MULT;
    const nonCacheInput = ((inTokens - cacheWriteTokens) / 1_000_000) * ip;
    const blendedInput = nonCacheInput + cacheMissCost + cacheHitCost;
    const noCacheInput = (inTokens / 1_000_000) * ip;

    out.push(makeToken('calc_out.claude_api_cost.row.model_line', '  Model: ' + ref.info.name + ' (cheapest)', { name: ref.info.name }));
    out.push(makeToken('calc_out.claude_api_cost.row.cache_write_miss_label', 'Cache Write (per miss)') + ': ' + fmt(cacheWriteCost) + '/req');
    out.push(makeToken('calc_out.claude_api_cost.row.cache_miss_cost_line', '  Cache Miss Cost: ' + fmt(cacheMissCost) + '/req (' + Math.round((1 - hitRate) * 100) + '% of requests)', { cost: fmt(cacheMissCost), pct: String(Math.round((1 - hitRate) * 100)) }));
    out.push(makeToken('calc_out.claude_api_cost.row.cache_hit_cost_line', '  Cache Hit Cost: ' + fmt(cacheHitCost) + '/req (' + Math.round(hitRate * 100) + '% of requests)', { cost: fmt(cacheHitCost), pct: String(Math.round(hitRate * 100)) }));
    out.push(makeToken('calc_out.claude_api_cost.row.non_cached_input_label', 'Non-Cached Input') + ': ' + fmt(nonCacheInput) + '/req');
    out.push(makeToken('calc_out.claude_api_cost.row.blended_input_label', 'Blended Input Cost') + ': ' + fmt(blendedInput) + '/req');
    out.push(makeToken('calc_out.claude_api_cost.row.vs_without_caching_line', '  vs without caching: ' + fmt(noCacheInput) + '/req → saves ' + fmt(noCacheInput - blendedInput) + '/req', { nocache: fmt(noCacheInput), savings: fmt(noCacheInput - blendedInput) }));
    out.push(makeToken('calc_out.claude_api_cost.row.monthly_savings_label', 'Monthly Savings') + ': ' + fmt((noCacheInput - blendedInput) * reqsPerMonth));
    // Break-even
    const beHits5min = Math.ceil(1 / (1 - CACHE_READ_MULT - (CACHE_WRITE_MULT['5min'] - 1)));
    const beHits1hour = Math.ceil(1 / (1 - CACHE_READ_MULT - (CACHE_WRITE_MULT['1hour'] - 1)));
    out.push(makeToken('calc_out.claude_api_cost.row.break_even_line', '  Break-even: ~' + beHits5min + ' cache reads (5-min) / ~' + beHits1hour + ' reads (1-hour)', { be5: String(beHits5min), be1: String(beHits1hour) }));
    out.push('');
  }

  // ================================================================
  // Section 5: Growth Projection
  // ================================================================
  if (growthRate > 0) {
    out.push(makeToken('calc_out.claude_api_cost.row.growth_projection', '📈 Growth Projection') + ' (' + growthRate + '%/month, ' + projMonths + ' months)');
    out.push('');

    // Table header
    // Alignment spaces stay OUTSIDE the token (same recipe as ai-training-cost-estimator).
    let header = makeToken('calc_out.claude_api_cost.row.month_label', 'Month') + 'Month'.padEnd(8).slice('Month'.length);
    for (const c of selectedCosts) header += ' | ' + c.info.name.padEnd(14);
    out.push(header);

    // Separator
    let sepLine = ''.padEnd(8, SEP);
    for (const _ of selectedCosts) sepLine += '-+-'.padEnd(15, SEP);
    out.push(sepLine);

    // Rows
    const growthMult = 1 + growthRate / 100;
    let cumDiff = 0;
    for (let month = 1; month <= projMonths; month++) {
      const mult = Math.pow(growthMult, month - 1);
      let row = String(month).padEnd(8);
      for (const c of selectedCosts) {
        const mCost = c.monthlyCost * mult;
        row += ' | ' + fmt(mCost).padEnd(14);
      }
      out.push(row);
      cumDiff += (selectedCosts[0]?.monthlyCost || 0) * mult;
    }

    // Total row
    let totalLine = ''.padEnd(8, SEP);
    for (const _ of selectedCosts) totalLine += '-+-'.padEnd(15, SEP);
    out.push(totalLine);
    let totalRow = makeToken('calc_out.claude_api_cost.row.total_label', 'Total') + 'Total'.padEnd(8).slice('Total'.length);
    for (const c of selectedCosts) {
      let cum = 0;
      for (let m = 1; m <= projMonths; m++) {
        cum += c.monthlyCost * Math.pow(growthMult, m - 1);
      }
      totalRow += ' | ' + fmt(cum).padEnd(14);
    }
    out.push(totalRow);
    out.push('');
  }

  // ================================================================
  // Section 6: Savings Insights
  // ================================================================
  out.push(makeToken('calc_out.claude_api_cost.row.savings_insights', '💰 Savings Insights'));
  out.push(SEP.repeat(60));

  // Cheapest overall
  const cheapestClaude = allCosts.reduce((min, c) =>
    c.monthlyCost < min.monthlyCost ? c : min,
  );
  out.push(
    makeToken('calc_out.claude_api_cost.row.cheapest_line', '🏆 Cheapest: ' + cheapestClaude.info.name + ' at ' + fmt(cheapestClaude.monthlyCost) + '/mo', { name: cheapestClaude.info.name, cost: fmt(cheapestClaude.monthlyCost) }),
  );

  // Best value (Claude 4.x family, excluding legacy)
  const bestValue = allCosts
    .filter((c) => c.info.family !== 'legacy')
    .reduce((min, c) => (c.monthlyCost < min.monthlyCost ? c : min), allCosts[0]);
  if (bestValue && bestValue.key !== cheapestClaude.key) {
    out.push(
      makeToken('calc_out.claude_api_cost.row.best_value_line', '⭐ Best value (current-gen): ' + bestValue.info.name + ' at ' + fmt(bestValue.monthlyCost) + '/mo', { name: bestValue.info.name, cost: fmt(bestValue.monthlyCost) }),
    );
  }

  // Switching savings: most expensive selected vs cheapest selected
  if (selectedCosts.length >= 2) {
    const mostExpSelected = selectedCosts.reduce((max, c) =>
      c.monthlyCost > max.monthlyCost ? c : max,
    );
    const cheapSelected = selectedCosts.reduce((min, c) =>
      c.monthlyCost < min.monthlyCost ? c : min,
    );
    const diff = mostExpSelected.monthlyCost - cheapSelected.monthlyCost;
    out.push(
      makeToken('calc_out.claude_api_cost.row.switching_line', '💸 Switching from ' + mostExpSelected.info.name + ' to ' + cheapSelected.info.name + ' saves ' + fmt(diff) + '/mo (' + fmt(diff * 12) + '/yr)', { from: mostExpSelected.info.name, to: cheapSelected.info.name, monthly: fmt(diff), yearly: fmt(diff * 12) }),
    );
  }

  // Caching tip
  if (cachingActive && selectedCosts.length > 0) {
    const ref = selectedCosts[0];
    const savings = ref.noCacheMonthly - ref.monthlyCost;
    out.push(
      makeToken('calc_out.claude_api_cost.row.prompt_caching_line', '💾 Prompt caching at ' + cacheReadHitRate + '% hit rate saves ~' + fmt(savings) + '/mo on ' + ref.info.name, { hit: String(cacheReadHitRate), savings: fmt(savings), name: ref.info.name }),
    );
  }

  // Cross-provider comparison
  for (const [provKey, prov] of Object.entries(CROSS_PROVIDER)) {
    const provCostPerReq = (inTokens / 1_000_000) * prov.input + (outTokens / 1_000_000) * prov.output;
    const provMonthly = provCostPerReq * reqsPerMonth;
    const diff = cheapestClaude.monthlyCost - provMonthly;
    const pct = provMonthly > 0 ? Math.abs(diff) / provMonthly * 100 : 0;
    if (diff > 0) {
      out.push(
        makeToken('calc_out.claude_api_cost.row.cross_premium_line', '🌍 ' + cheapestClaude.info.name + ' vs ' + prov.name + ': Claude costs ' + fmt(diff) + ' more/month (' + Math.round(pct) + '% premium)', { a: cheapestClaude.info.name, b: prov.name, diff: fmt(diff), pct: String(Math.round(pct)) }),
      );
    } else {
      out.push(
        makeToken('calc_out.claude_api_cost.row.cross_cheaper_line', '🌍 ' + cheapestClaude.info.name + ' vs ' + prov.name + ': Claude saves ' + fmt(Math.abs(diff)) + '/month (' + Math.round(pct) + '% cheaper)', { a: cheapestClaude.info.name, b: prov.name, diff: fmt(Math.abs(diff)), pct: String(Math.round(pct)) }),
      );
    }
  }
  out.push(makeToken('calc_out.claude_api_cost.row.premium_buys', '💡 Premium buys: 1M context, best-in-class safety, superior code generation'));
  out.push('');

  // ================================================================
  // Section 7: Usage Scenarios
  // ================================================================
  out.push(makeToken('calc_out.claude_api_cost.row.usage_scenarios', '📊 Usage Scenarios (monthly cost at ' + lc(reqPerDay) + ' reqs/day)', { rpd: lc(reqPerDay) }));
  out.push('');
  const volumes = [50, 100, 500, 1000, 5000, 10000];
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const parts: string[] = [];
    for (const v of volumes) {
      parts.push(lc(v) + '→' + fmt(c.costPerReq * v * 30));
    }
    // P168 B3-9：整行**令牌化**（原先是裸文本 ⇒ zh 卡片这一行整行是英文 ⇒ G4c 红）
    //   ⇒ 图标 / 型号 / 系列标签 / 6 档用量全部走 {param} ⇒ zh 侧可整行中文化。
    out.push(
      makeToken(
        'calc_out.claude_api_cost.row.usage_scenario_line',
        icon + ' ' + c.info.name + ' (' + FAMILY_LABELS[c.info.family] + '): ' + parts.join(' · '),
        {
          icon,
          model: c.info.name,
          family: FAMILY_LABELS[c.info.family],
          v50: parts[0],
          v100: parts[1],
          v500: parts[2],
          v1k: parts[3],
          v5k: parts[4],
          v10k: parts[5],
        },
      ),
    );
  }

  // 🩺 Cost Health (v3)
  out.push('');
  out.push(makeToken('calc_out.claude_api_cost.row.cost_health', '🩺 Cost Health:'));
  out.push(SEP.repeat(60));
  const totalSelectedMonthly = selectedCosts.reduce((s, c) => s + c.monthlyCost, 0);
  const cheapestSelected = selectedCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const expensiveSelected = selectedCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
  if (selectedCosts.length >= 2) {
    const ratio = expensiveSelected.monthlyCost / Math.max(cheapestSelected.monthlyCost, 0.01);
    if (ratio >= 50) out.push(makeToken('calc_out.claude_api_cost.row.health_expensive', '• 🔴 Your most expensive selection costs ' + ratio.toFixed(0) + 'x your cheapest — consider mixing tiers.', { ratio: ratio.toFixed(0) }));
    else if (ratio >= 10) out.push(makeToken('calc_out.claude_api_cost.row.health_spread_warning', '• 🟠 ' + ratio.toFixed(0) + 'x cost spread across selected models — review if every model needs to be premium.', { ratio: ratio.toFixed(0) }));
    else out.push(makeToken('calc_out.claude_api_cost.row.health_spread_ok', '• 🟢 Healthy cost spread (' + ratio.toFixed(1) + 'x) across selected models.', { ratio: ratio.toFixed(1) }));
  }
  if (cheapestSelected) {
    const tierName = cheapestSelected.info.name;
    const tierCost = fmt(cheapestSelected.monthlyCost);
    const tierTail = tierName + ' at ' + tierCost + '/mo.';
    if (cheapestSelected.monthlyCost < 5) out.push(makeToken('calc_out.claude_api_cost.row.health_tier_micro', '• 🟢 Micro-tier (under $5/mo) — ' + tierTail, { name: tierName, cost: tierCost }));
    else if (cheapestSelected.monthlyCost < 50) out.push(makeToken('calc_out.claude_api_cost.row.health_tier_low', '• 🟢 Low-volume tier — ' + tierTail, { name: tierName, cost: tierCost }));
    else if (cheapestSelected.monthlyCost < 500) out.push(makeToken('calc_out.claude_api_cost.row.health_tier_mid', '• 🟡 Mid-volume tier — ' + tierTail, { name: tierName, cost: tierCost }));
    else out.push(makeToken('calc_out.claude_api_cost.row.health_tier_high', '• 🟠 High-volume tier — ' + tierTail, { name: tierName, cost: tierCost }));
  }
  if (cacheReadHitRate === 0) {
    out.push(makeToken('calc_out.claude_api_cost.row.health_cache_zero', '• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%.'));
  } else if (cacheReadHitRate < 30) {
    out.push(makeToken('calc_out.claude_api_cost.row.health_cache_low', '• 🟡 Low cache hit rate (' + cacheReadHitRate + '%) — review if your prompt has stable system instructions.', { hit: String(cacheReadHitRate) }));
  } else {
    out.push(makeToken('calc_out.claude_api_cost.row.health_cache_ok', '• 🟢 Healthy cache rate (' + cacheReadHitRate + '%) — keep an eye on cache TTL vs your traffic pattern.', { hit: String(cacheReadHitRate) }));
  }
  if (writeMult > 1) {
    out.push(makeToken('calc_out.claude_api_cost.row.health_cache_write_mult', '• 💡 Cache write multiplier is ' + writeMult + 'x — writes are expensive. Only cache stable prefixes (system prompts, few-shot examples).', { mult: String(writeMult) }));
  }
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push(makeToken('calc_out.claude_api_cost.row.what_if_scenarios', '🔄 What-If Scenarios:'));
  out.push(SEP.repeat(60));
  // Switch to cheapest popular model
  const popularCheapest = allCosts
    .reduce((min, c) => (c.info.input + c.info.output) < (min.info.input + min.info.output) ? c : min, allCosts[0]);
  if (popularCheapest && popularCheapest.key !== cheapestSelected?.key) {
    const cpr = (inTokens / 1e6) * popularCheapest.info.input + (outTokens / 1e6) * popularCheapest.info.output;
    const newMonthly = cpr * reqPerDay * 30;
    const savings = (cheapestSelected?.monthlyCost ?? 0) - newMonthly;
    if (savings > 0) out.push(makeToken('calc_out.claude_api_cost.row.whatif_switch_cheapest', '• Switch cheapest to ' + popularCheapest.info.name + ':  save ' + fmt(savings) + '/mo  (similar quality, much cheaper)', { name: popularCheapest.info.name, savings: fmt(savings) }));
  }
  // Double volume
  out.push(makeToken('calc_out.claude_api_cost.row.whatif_double_volume', '• Double volume to ' + lc(reqPerDay * 2) + ' reqs/day:  ' + fmt(totalSelectedMonthly * 2) + '/mo', { rpd: lc(reqPerDay * 2), cost: fmt(totalSelectedMonthly * 2) }));
  // Halve volume
  out.push(makeToken('calc_out.claude_api_cost.row.whatif_halve_volume', '• Halve volume to ' + lc(Math.max(1, Math.floor(reqPerDay / 2))) + ' reqs/day:  ' + fmt(totalSelectedMonthly / 2) + '/mo', { rpd: lc(Math.max(1, Math.floor(reqPerDay / 2))), cost: fmt(totalSelectedMonthly / 2) }));
  // 50% cache
  if (cacheReadHitRate < 50) {
    const cacheFactor = 0.5 + 0.5 * (1 - 0.5 * 0.9); // ~50% of input is cacheable, 90% discount
    const cachedMonthly = totalSelectedMonthly * cacheFactor;
    const cacheSavings = totalSelectedMonthly - cachedMonthly;
    out.push(makeToken('calc_out.claude_api_cost.row.whatif_boost_cache', '• Boost cache hit rate to 50%:  save ~' + fmt(cacheSavings) + '/mo  (' + fmt(totalSelectedMonthly) + ' → ' + fmt(cachedMonthly) + ')', { savings: fmt(cacheSavings), total: fmt(totalSelectedMonthly), cached: fmt(cachedMonthly) }));
  }
  out.push('');

  return out;
}

const customFn =
  // P168 B3-9: the shared token builder (same implementation as the server side).
  CALC_OUTPUT_MAKE_TOKEN_JS +
  // --- MODELS map (full keys, MUST match TS MODELS) ---
  "var M={'claude-fable-5':{i:10,o:50,n:'Claude Fable 5',f:'mythos',cw:'1M',mo:'128K',bi:5,bo:25,od:1},'claude-opus-5-5':{i:4,o:20,n:'Claude Opus 55',f:'claude5x',cw:'1M',mo:'128K',bi:2,bo:10,od:2},'claude-sonnet-5-5':{i:2,o:10,n:'Claude Sonnet 55',f:'claude5x',cw:'1M',mo:'128K',bi:1,bo:5,od:3},'claude-haiku-5-5':{i:0.1,o:0.5,n:'Claude Haiku 55',f:'claude5x',cw:'1M',mo:'128K',bi:0.05,bo:0.25,od:4},'claude-opus-5':{i:5,o:25,n:'Claude Opus 5',f:'claude5x',cw:'1M',mo:'128K',bi:2.5,bo:12.5,od:5},'claude-sonnet-5':{i:2,o:10,n:'Claude Sonnet 5',f:'claude5x',cw:'1M',mo:'128K',bi:1,bo:5,od:6},'claude-mythos-5':{i:10,o:50,n:'Claude Mythos 5',f:'mythos',cw:'1M',mo:'128K',bi:5,bo:25,od:7},'claude-opus-4-8':{i:5,o:25,n:'Claude Opus 48',f:'claude4x',cw:'1M',mo:'128K',bi:2.5,bo:12.5,od:8},'claude-sonnet-4-6':{i:3,o:15,n:'Claude Sonnet 46',f:'claude4x',cw:'1M',mo:'64K',bi:1.5,bo:7.5,od:9},'claude-haiku-4-5':{i:1,o:5,n:'Claude Haiku 45',f:'claude4x',cw:'200K',mo:'64K',bi:0.5,bo:2.5,od:10},'claude-opus-4-1':{i:15,o:75,n:'Claude Opus 41',f:'claude4x',cw:'200K',mo:'32K',bi:7.5,bo:37.5,od:11},'claude-haiku-3-5':{i:0.8,o:4,n:'Claude Haiku 3.5',f:'lg',cw:'200K',mo:'8K',bi:0.4,bo:2,od:12},'claude-haiku-3':{i:0.25,o:1.25,n:'Claude Haiku 3',f:'lg',cw:'200K',mo:'4K',bi:0.125,bo:0.625,od:13}};\nvar XP={openai:{i:0.05,o:0.4,n:'GPT-5 Nano'},deepseek:{i:0.3,o:1.2,n:'DeepSeek V4 Flash'},gemini:{i:0.075,o:0.3,n:'Gemini 1.5 Flash'}};" +

  // Family icons
  "var FI={mythos:'\\u2726',claude5x:'\\u2605',claude4x:'\\u25B2',legacy:'\\u25C6',lg:'\\u25C6'};" +
  "var FL={mythos:'Mythos',claude5x:'Claude 5.x',claude4x:'Claude 4.x',legacy:'Legacy',lg:'Legacy'};" +
  // Defaults
  "var DEF=['claude-fable-5','claude-opus-4-8','claude-sonnet-4-6','claude-haiku-4-5'];" +
  // Caching constants
  "var CWM={};CWM['5min']=1.25;CWM['1hour']=2;" +
  "var CRM=0.1;" +
  // Helpers
  "function fm(n){if(Math.abs(n)<0.01&&n!==0)return '$'+n.toFixed(4);return '$'+n.toFixed(2)}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP='\\u2500';" +
  // --- Parse inputs ---
  "var rawModels=inputs.models||DEF.join(',');" +
  "var sks=[];var seen={};rawModels.split(',').forEach(function(s){s=s.trim();if(s&&!seen[s]){seen[s]=true;sks.push(s);}});" +
  "var iT=Math.max(1,Math.min(1e7,parseInt(inputs.inputTokens)||1000));" +
  "var oT=Math.max(1,Math.min(1e7,parseInt(inputs.outputTokens)||500));" +
  "var rpd=Math.max(0,Math.min(1e6,parseInt(inputs.requestsPerDay)||100));" +
  "var pm=inputs.pricingMode||'realtime';" +
  "var cwT=Math.max(0,Math.min(iT,parseInt(inputs.cacheWriteTokens)||0));" +
  "var cTTL=inputs.cacheTtl==='1hour'?'1hour':'5min';" +
  "var cHR=Math.max(0,Math.min(100,parseInt(inputs.cacheReadHitRate)||0));" +
  "var gR=Math.max(0,Math.min(50,parseFloat(inputs.growthRate)||0));" +
  "var pMraw=parseInt(inputs.projectionMonths);var pM=[3,6,12].indexOf(pMraw)>=0?pMraw:12;" +
  "var cacheOn=cwT>0&&cHR>0;var wM=CWM[cTTL]||1.25;var hR=cHR/100;var rpm=rpd*30;" +
  // --- Compute costs ---
  "var all=[];" +
  "for(var k in M){" +
  "var mi=M[k];var ip=pm==='batch'?mi.bi:mi.i;var op=pm==='batch'?mi.bo:mi.o;" +
  "var ncpr=(iT/1e6)*ip+(oT/1e6)*op;var ncm=ncpr*rpm;" +
  "var cpr;" +
  "if(cacheOn){" +
  "var nci=((iT-cwT)/1e6)*ip;" +
  "var cmc=(1-hR)*(cwT/1e6)*ip*wM;" +
  "var chc=hR*(cwT/1e6)*ip*CRM;" +
  "cpr=nci+cmc+chc+(oT/1e6)*op;" +
  "}else{cpr=ncpr;}" +
  "var mc=cpr*rpm;all.push({k:k,i:mi,ip:ip,op:op,cpr:cpr,mc:mc,ncpr:ncpr,ncm:ncm});" +
  "}" +
  // Sort and find cheapest/max
  "all.sort(function(a,b){return a.i.od-b.i.od;});" +
  "var ch=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var mx=all.reduce(function(max,c){return c.mc>max.mc?c:max;}).mc;" +
  // Filter selected
  "var sc=[];" +
  "for(var i=0;i<sks.length;i++){var e=all.find(function(c){return c.k===sks[i];});if(e)sc.push(e);}" +
  "if(sc.length===0){for(var j=0;j<DEF.length;j++){var e2=all.find(function(c){return c.k===DEF[j];});if(e2)sc.push(e2);}}" +
  // --- Output ---
  "var o=[];" +
  // Section 1: Header
  "var ml=pm==='batch'?tk('calc_out.claude_api_cost.row.pricing_mode_batch','\\u26A1 Batch Pricing (50% off)'):tk('calc_out.claude_api_cost.row.pricing_mode_realtime','\\u{1F534} Real-time Pricing');" +
  "var hl=ml;" +
  "if(cacheOn){var tl=cTTL==='1hour'?'1-hour TTL':'5-min TTL';hl+=' | '+tk('calc_out.claude_api_cost.row.cache_header','\\u{1F4BE} Cache: '+cHR+'% hit ('+tl+')',{hit:String(cHR),ttl:tl});}" +
  "o.push('');o.push(hl);o.push('');" +
  "o.push(tk('calc_out.claude_api_cost.row.input_req','\\u{1F4E5} Input')+': '+lc(iT)+' tokens/req | '+tk('calc_out.claude_api_cost.row.output_req','\\u{1F4E4} Output')+': '+lc(oT)+' tokens/req | \\u{1F504} '+lc(rpd)+' reqs/day');" +
  "if(cacheOn){o.push(tk('calc_out.claude_api_cost.row.cache_write_line','\\u{1F4BE} Cache Write: '+lc(cwT)+' tokens/req ('+(wM===1.25?'1.25\\u00D7':'2\\u00D7')+' write, 0.1\\u00D7 read)',{tokens:lc(cwT),mult:wM===1.25?'1.25\\u00D7':'2\\u00D7'}));}" +
  "o.push('');" +
  // Section 2: Bar Chart
  "o.push(tk('calc_out.claude_api_cost.row.cost_comparison','\\u{1F4CA} Cost Comparison')+' ('+lc(rpd)+' reqs/day)');" +
  "o.push(SEP.repeat(54));" +
  "var BW=40;" +
  "for(var i=0;i<all.length;i++){" +
  "var c=all[i];var icon=FI[c.i.f];var label=icon+' '+c.i.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;" +
  "var bc=c.k===ch.k?'\\u2591':'\\u2588';var bar=bc.repeat(bl);" +
  "var bd=c.k===ch.k?' \\u{1F3C6}':'';" +
  "o.push(pd(label,26)+' '+pd(bar,BW)+' '+fm(c.mc)+bd);" +
  "}" +
  "o.push('');" +
  // Section 3: Detail Cards
  "o.push(tk('calc_out.claude_api_cost.row.selected_model_details','\\u{1F4CB} Selected Model Details'));" +
  "o.push(SEP.repeat(60));" +
  "for(var i=0;i<sc.length;i++){" +
  "var c=sc[i];var icon=FI[c.i.f];var fl=FL[c.i.f];" +
  "var dc2=c.cpr*rpd;var ann=c.mc*12;" +
  "o.push(icon+' '+c.i.n+' ('+fl+') | '+tk('calc_out.claude_api_cost.row.context_label','Context')+': '+c.i.cw+' | '+tk('calc_out.claude_api_cost.row.max_output_label','Max Output')+': '+c.i.mo);" +
  "o.push(Array(45).join('\\u2014'));" +
  "var icl=(iT/1e6)*c.ip;var ocl=(oT/1e6)*c.op;" +
  "o.push(tk('calc_out.claude_api_cost.row.input_label','Input')+':  '+pd(lc(iT),7)+' tokens \\u00D7 '+fm(c.ip)+'/1M \\u2192 '+fm(icl)+'/req');" +
  "o.push(tk('calc_out.claude_api_cost.row.output_label','Output')+': '+pd(lc(oT),7)+' tokens \\u00D7 '+fm(c.op)+'/1M \\u2192 '+fm(ocl)+'/req');" +
  "o.push(Array(45).join('\\u2014'));" +
  "o.push(tk('calc_out.claude_api_cost.row.per_request_label','Per request')+':    '+fm(c.cpr));" +
  "o.push(tk('calc_out.claude_api_cost.row.daily_label','Daily')+' ('+rpd+'):    '+fm(dc2));" +
  "o.push(tk('calc_out.claude_api_cost.row.monthly_label','Monthly')+' (30d):  '+fm(c.mc));" +
  "o.push(tk('calc_out.claude_api_cost.row.annual_label','Annual')+':         '+fm(ann));" +
  "o.push(Array(45).join('\\u2014'));" +
  "if(pm==='realtime'){" +
  "var bcpr=(iT/1e6)*c.i.bi+(oT/1e6)*c.i.bo;var bm=bcpr*rpd*30;" +
  "o.push(tk('calc_out.claude_api_cost.row.batch_pricing_line','\\u{1F4A1} Batch pricing: '+fm(bcpr)+'/req ('+fm(bm)+'/mo) \\u2014 save 50%',{cpr:fm(bcpr),monthly:fm(bm)}));}" +
  "else{" +
  "var rcpr=(iT/1e6)*c.i.i+(oT/1e6)*c.i.o;var rm2=rcpr*rpd*30;" +
  "o.push(tk('calc_out.claude_api_cost.row.real_time_label','\\u{1F534} Real-time')+': '+fm(rcpr)+'/req ('+fm(rm2)+'/mo)');}" +
  "if(cacheOn){" +
  "var sv=c.ncm-c.mc;var ps=c.ncm>0?Math.round((sv/c.ncm)*100):0;" +
  "o.push(tk('calc_out.claude_api_cost.row.cache_hit_line','\\u{1F4BE} With '+cHR+'% cache hit: '+fm(c.mc)+'/mo \\u2014 saves '+fm(sv)+'/mo ('+ps+'%)',{hit:String(cHR),monthly:fm(c.mc),savings:fm(sv),pct:String(ps)}));}" +
  "o.push('');" +
  "}" +
  // Section 4: Caching Breakdown
  "if(cacheOn){" +
  "var ref=ch;var ip=ref.ip;var tl2=cTTL==='1hour'?'1-hour TTL':'5-min TTL';var wl=wM===1.25?'1.25\\u00D7':'2\\u00D7';" +
  "o.push(tk('calc_out.claude_api_cost.row.cache_breakdown_title','\\u{1F4BE} Prompt Caching Breakdown ('+tl2+' \\u00D7 '+wl+' write)',{ttl:tl2,mult:wl}));" +
  "o.push(SEP.repeat(54));" +
  "var ccw=(cwT/1e6)*ip*wM;var cmc2=(1-hR)*ccw;var chc2=hR*(cwT/1e6)*ip*CRM;" +
  "var nci2=((iT-cwT)/1e6)*ip;var bi2=nci2+cmc2+chc2;var nci3=(iT/1e6)*ip;" +
  "o.push(tk('calc_out.claude_api_cost.row.model_line','  Model: '+ref.i.n+' (cheapest)',{name:ref.i.n}));" +
  "o.push(tk('calc_out.claude_api_cost.row.cache_write_miss_label','Cache Write (per miss)')+': '+fm(ccw)+'/req');" +
  "o.push(tk('calc_out.claude_api_cost.row.cache_miss_cost_line','  Cache Miss Cost: '+fm(cmc2)+'/req ('+Math.round((1-hR)*100)+'% of requests)',{cost:fm(cmc2),pct:String(Math.round((1-hR)*100))}));" +
  "o.push(tk('calc_out.claude_api_cost.row.cache_hit_cost_line','  Cache Hit Cost: '+fm(chc2)+'/req ('+Math.round(hR*100)+'% of requests)',{cost:fm(chc2),pct:String(Math.round(hR*100))}));" +
  "o.push(tk('calc_out.claude_api_cost.row.non_cached_input_label','Non-Cached Input')+': '+fm(nci2)+'/req');" +
  "o.push(tk('calc_out.claude_api_cost.row.blended_input_label','Blended Input Cost')+': '+fm(bi2)+'/req');" +
  "o.push(tk('calc_out.claude_api_cost.row.vs_without_caching_line','  vs without caching: '+fm(nci3)+'/req \\u2192 saves '+fm(nci3-bi2)+'/req',{nocache:fm(nci3),savings:fm(nci3-bi2)}));" +
  "o.push(tk('calc_out.claude_api_cost.row.monthly_savings_label','Monthly Savings')+': '+fm((nci3-bi2)*rpm));" +
  "var be5=Math.ceil(1/(1-CRM-(CWM['5min']-1)));var be1=Math.ceil(1/(1-CRM-(CWM['1hour']-1)));" +
  "o.push(tk('calc_out.claude_api_cost.row.break_even_line','  Break-even: ~'+be5+' cache reads (5-min) / ~'+be1+' reads (1-hour)',{be5:String(be5),be1:String(be1)}));" +
  "o.push('');" +
  "}" +
  // Section 5: Growth Projection
  "if(gR>0){" +
  "o.push(tk('calc_out.claude_api_cost.row.growth_projection','\\u{1F4C8} Growth Projection')+' ('+gR+'%/month, '+pM+' months)');o.push('');" +
  "var hdr=tk('calc_out.claude_api_cost.row.month_label','Month')+'Month'.padEnd(8).slice(5);for(var i=0;i<sc.length;i++)hdr+=' | '+sc[i].i.n.padEnd(14);o.push(hdr);" +
  "var sl=''.padEnd(8,SEP);for(var i=0;i<sc.length;i++)sl+='-+-'.padEnd(15,SEP);o.push(sl);" +
  "var gm=1+gR/100;" +
  "for(var m=1;m<=pM;m++){var mult=Math.pow(gm,m-1);var row=String(m).padEnd(8);for(var i=0;i<sc.length;i++)row+=' | '+fm(sc[i].mc*mult).padEnd(14);o.push(row);}" +
  "o.push(sl);" +
  "var tr=tk('calc_out.claude_api_cost.row.total_label','Total')+'Total'.padEnd(8).slice(5);for(var i=0;i<sc.length;i++){var cum=0;for(var m=1;m<=pM;m++)cum+=sc[i].mc*Math.pow(gm,m-1);tr+=' | '+fm(cum).padEnd(14);}o.push(tr);" +
  "o.push('');" +
  "}" +
  // Section 6: Savings Insights
  "o.push(tk('calc_out.claude_api_cost.row.savings_insights','\\u{1F4B0} Savings Insights'));" +
  "o.push(SEP.repeat(60));" +
  "var cheapestC=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "o.push(tk('calc_out.claude_api_cost.row.cheapest_line','\\u{1F3C6} Cheapest: '+cheapestC.i.n+' at '+fm(cheapestC.mc)+'/mo',{name:cheapestC.i.n,cost:fm(cheapestC.mc)}));" +
  "var flt2=all.filter(function(c){return c.i.f!=='legacy'&&c.i.f!=='lg';});" +
  "var bv=flt2.length>0?flt2.reduce(function(mn,c){return c.mc<mn.mc?c:mn;}):null;" +
  "if(bv&&bv.k!==cheapestC.k){o.push(tk('calc_out.claude_api_cost.row.best_value_line','\\u2B50 Best value (current-gen): '+bv.i.n+' at '+fm(bv.mc)+'/mo',{name:bv.i.n,cost:fm(bv.mc)}));}" +
  "if(sc.length>=2){" +
  "var meS=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "var chS=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var df2=meS.mc-chS.mc;" +
  "o.push(tk('calc_out.claude_api_cost.row.switching_line','\\u{1F4B8} Switching from '+meS.i.n+' to '+chS.i.n+' saves '+fm(df2)+'/mo ('+fm(df2*12)+'/yr)',{from:meS.i.n,to:chS.i.n,monthly:fm(df2),yearly:fm(df2*12)}));}" +
  "if(cacheOn&&sc.length>0){" +
  "var ref2=sc[0];var sv2=ref2.ncm-ref2.mc;" +
  "o.push(tk('calc_out.claude_api_cost.row.prompt_caching_line','\\u{1F4BE} Prompt caching at '+cHR+'% hit rate saves ~'+fm(sv2)+'/mo on '+ref2.i.n,{hit:String(cHR),savings:fm(sv2),name:ref2.i.n}));}" +
  "for(var pk in XP){var pv=XP[pk];var pcpr=(iT/1e6)*pv.i+(oT/1e6)*pv.o;var pm2=pcpr*rpm;var d=cheapestC.mc-pm2;var pct=pm2>0?Math.abs(d)/pm2*100:0;" +
  "if(d>0){o.push(tk('calc_out.claude_api_cost.row.cross_premium_line','\\u{1F30D} '+cheapestC.i.n+' vs '+pv.n+': Claude costs '+fm(d)+' more/month ('+Math.round(pct)+'% premium)',{a:cheapestC.i.n,b:pv.n,diff:fm(d),pct:String(Math.round(pct))}));}" +
  "else{o.push(tk('calc_out.claude_api_cost.row.cross_cheaper_line','\\u{1F30D} '+cheapestC.i.n+' vs '+pv.n+': Claude saves '+fm(Math.abs(d))+'/month ('+Math.round(pct)+'% cheaper)',{a:cheapestC.i.n,b:pv.n,diff:fm(Math.abs(d)),pct:String(Math.round(pct))}));}" +
  "}" +
  "o.push(tk('calc_out.claude_api_cost.row.premium_buys','\\u{1F4A1} Premium buys: 1M context, best-in-class safety, superior code generation'));" +
  "o.push('');" +
  // Section 7: Usage Scenarios
  "o.push(tk('calc_out.claude_api_cost.row.usage_scenarios','\\u{1F4CA} Usage Scenarios (monthly cost at '+lc(rpd)+' reqs/day)',{rpd:lc(rpd)}));" +
  "o.push('');" +
  "var vols=[50,100,500,1000,5000,10000];" +
  "for(var i=0;i<sc.length;i++){" +
  "var c=sc[i];var icon=FI[c.i.f];var pts=[];" +
  "for(var j=0;j<vols.length;j++){pts.push(lc(vols[j])+'\\u2192'+fm(c.cpr*vols[j]*30));}" +
  "o.push(tk('calc_out.claude_api_cost.row.usage_scenario_line',icon+' '+c.i.n+' ('+FL[c.i.f]+'): '+pts.join(' \\u00b7 '),{icon:icon,model:c.i.n,family:FL[c.i.f],v50:pts[0],v100:pts[1],v500:pts[2],v1k:pts[3],v5k:pts[4],v10k:pts[5]}));" +
  "}" +
  // Cost Health (v3) -- mirrors the server section 1:1
  "o.push('');" +
  "o.push(tk('calc_out.claude_api_cost.row.cost_health','\\u{1FA7A} Cost Health:'));" +
  "o.push(SEP.repeat(60));" +
  "var tsm=sc.reduce(function(s,c){return s+c.mc;},0);" +
  "var chSel=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var exSel=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "if(sc.length>=2){" +
  "var ratio2=exSel.mc/Math.max(chSel.mc,0.01);" +
  "if(ratio2>=50)o.push(tk('calc_out.claude_api_cost.row.health_expensive','\\u2022 \\u{1F534} Your most expensive selection costs '+ratio2.toFixed(0)+'x your cheapest \\u2014 consider mixing tiers.',{ratio:ratio2.toFixed(0)}));" +
  "else if(ratio2>=10)o.push(tk('calc_out.claude_api_cost.row.health_spread_warning','\\u2022 \\u{1F7E0} '+ratio2.toFixed(0)+'x cost spread across selected models \\u2014 review if every model needs to be premium.',{ratio:ratio2.toFixed(0)}));" +
  "else o.push(tk('calc_out.claude_api_cost.row.health_spread_ok','\\u2022 \\u{1F7E2} Healthy cost spread ('+ratio2.toFixed(1)+'x) across selected models.',{ratio:ratio2.toFixed(1)}));" +
  "}" +
  "if(chSel){" +
  "var tierName=chSel.i.n;var tierCost=fm(chSel.mc);var tierTail=tierName+' at '+tierCost+'/mo.';" +
  "if(chSel.mc<5)o.push(tk('calc_out.claude_api_cost.row.health_tier_micro','\\u2022 \\u{1F7E2} Micro-tier (under $5/mo) \\u2014 '+tierTail,{name:tierName,cost:tierCost}));" +
  "else if(chSel.mc<50)o.push(tk('calc_out.claude_api_cost.row.health_tier_low','\\u2022 \\u{1F7E2} Low-volume tier \\u2014 '+tierTail,{name:tierName,cost:tierCost}));" +
  "else if(chSel.mc<500)o.push(tk('calc_out.claude_api_cost.row.health_tier_mid','\\u2022 \\u{1F7E1} Mid-volume tier \\u2014 '+tierTail,{name:tierName,cost:tierCost}));" +
  "else o.push(tk('calc_out.claude_api_cost.row.health_tier_high','\\u2022 \\u{1F7E0} High-volume tier \\u2014 '+tierTail,{name:tierName,cost:tierCost}));" +
  "}" +
  "if(cHR===0){o.push(tk('calc_out.claude_api_cost.row.health_cache_zero','\\u2022 \\u26A0\\uFE0F Cache hit rate is 0% \\u2014 enabling prompt caching on repeated prefixes can cut cost 40-90%.'));}" +
  "else if(cHR<30){o.push(tk('calc_out.claude_api_cost.row.health_cache_low','\\u2022 \\u{1F7E1} Low cache hit rate ('+cHR+'%) \\u2014 review if your prompt has stable system instructions.',{hit:String(cHR)}));}" +
  "else{o.push(tk('calc_out.claude_api_cost.row.health_cache_ok','\\u2022 \\u{1F7E2} Healthy cache rate ('+cHR+'%) \\u2014 keep an eye on cache TTL vs your traffic pattern.',{hit:String(cHR)}));}" +
  "if(wM>1){o.push(tk('calc_out.claude_api_cost.row.health_cache_write_mult','\\u2022 \\u{1F4A1} Cache write multiplier is '+wM+'x \\u2014 writes are expensive. Only cache stable prefixes (system prompts, few-shot examples).',{mult:String(wM)}));}" +
  "o.push('');" +
  // What-If Scenarios (v3) -- mirrors the server section 1:1
  "o.push(tk('calc_out.claude_api_cost.row.what_if_scenarios','\\u{1F504} What-If Scenarios:'));" +
  "o.push(SEP.repeat(60));" +
  "var pc2=all.reduce(function(min,c){return (c.i.i+c.i.o)<(min.i.i+min.i.o)?c:min;},all[0]);" +
  "if(pc2&&pc2.k!==chSel.k){" +
  "var cpr2=(iT/1e6)*pc2.i.i+(oT/1e6)*pc2.i.o;var nm2=cpr2*rpd*30;var sav2=(chSel?chSel.mc:0)-nm2;" +
  "if(sav2>0)o.push(tk('calc_out.claude_api_cost.row.whatif_switch_cheapest','\\u2022 Switch cheapest to '+pc2.i.n+':  save '+fm(sav2)+'/mo  (similar quality, much cheaper)',{name:pc2.i.n,savings:fm(sav2)}));" +
  "}" +
  "o.push(tk('calc_out.claude_api_cost.row.whatif_double_volume','\\u2022 Double volume to '+lc(rpd*2)+' reqs/day:  '+fm(tsm*2)+'/mo',{rpd:lc(rpd*2),cost:fm(tsm*2)}));" +
  "o.push(tk('calc_out.claude_api_cost.row.whatif_halve_volume','\\u2022 Halve volume to '+lc(Math.max(1,Math.floor(rpd/2)))+' reqs/day:  '+fm(tsm/2)+'/mo',{rpd:lc(Math.max(1,Math.floor(rpd/2))),cost:fm(tsm/2)}));" +
  "if(cHR<50){" +
  "var cf2=0.5+0.5*(1-0.5*0.9);var cm2=tsm*cf2;var csav2=tsm-cm2;" +
  "o.push(tk('calc_out.claude_api_cost.row.whatif_boost_cache','\\u2022 Boost cache hit rate to 50%:  save ~'+fm(csav2)+'/mo  ('+fm(tsm)+' \\u2192 '+fm(cm2)+')',{savings:fm(csav2),total:fm(tsm),cached:fm(cm2)}));" +
  "}" +
  "o.push('');" +
  // P168 B3-9：⭐ 返回**整份输出**的单元素数组 —— 页面（src/pages/[lang]/[slug].astro:2186）对 custom 型**只渲染 results[0]**
  //   ⇒ 多元素数组会让动态卡片只剩第一行（同一形态 B3-8 已在 ai-api-cost-comparison 修复并验证）。
  "return [o.join('\\n')];";

const engine: ToolEngine = {
  slug: 'solopreneur-claude-api-cost-calculator',
  title: 'Claude API Cost Calculator',
  description: 'Calculate Claude API costs for Fable 5, Opus 5.5, Sonnet 5.5, Haiku 5.5 and legacy models — with Prompt Caching, batch pricing, growth projections, and cross-provider comparison.',
  inputs: [
    { name: 'models', label: 'Models', placeholder: 'claude-fable-5,claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5', type: 'text' },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
    { name: 'cacheWriteTokens', label: 'Cache Write Tokens', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'cacheTtl', label: 'Cache TTL', placeholder: '', type: 'select', options: ['5min', '1hour'] },
    { name: 'cacheReadHitRate', label: 'Cache Read Hit Rate (%)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用此计算器的结果作为决策依据',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: 'Phase 1 引擎自身的 🧭 Decision Recommendation (如已 ship) 或未来扩展',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    // Single comprehensive example covering all 7 sections (same structure as calculate() output)
    '\n$calc_out.claude_api_cost.row.pricing_mode_realtime|🔴 Real-time Pricing|\n\n$calc_out.claude_api_cost.row.input_req|📥 Input|: 1,000 tokens/req | $calc_out.claude_api_cost.row.output_req|📤 Output|: 500 tokens/req | 🔄 100 reqs/day\n\n$calc_out.claude_api_cost.row.cost_comparison|📊 Cost Comparison| (100 reqs/day)\n──────────────────────────────────────────────────────\n✦ Claude Fable 5           ███████████████████████████              $105.00\n★ Claude Opus 55           ███████████                              $42.00\n★ Claude Sonnet 55         █████                                    $21.00\n★ Claude Haiku 55          ░                                        $1.05 🏆\n★ Claude Opus 5            █████████████                            $52.50\n★ Claude Sonnet 5          █████                                    $21.00\n✦ Claude Mythos 5          ███████████████████████████              $105.00\n▲ Claude Opus 48           █████████████                            $52.50\n▲ Claude Sonnet 46         ████████                                 $31.50\n▲ Claude Haiku 45          ███                                      $10.50\n▲ Claude Opus 41           ████████████████████████████████████████ $157.50\n◆ Claude Haiku 3.5         ██                                       $8.40\n◆ Claude Haiku 3           █                                        $2.63\n\n$calc_out.claude_api_cost.row.selected_model_details|📋 Selected Model Details|\n────────────────────────────────────────────────────────────\n▲ Claude Sonnet 46 (Claude 4.x) | $calc_out.claude_api_cost.row.context_label|Context|: 1M | $calc_out.claude_api_cost.row.max_output_label|Max Output|: 64K\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.input_label|Input|:  1,000   tokens × $3.00/1M → $0.0030/req\n$calc_out.claude_api_cost.row.output_label|Output|: 500     tokens × $15.00/1M → $0.0075/req\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.per_request_label|Per request|:    $0.01\n$calc_out.claude_api_cost.row.daily_label|Daily| (100):    $1.05\n$calc_out.claude_api_cost.row.monthly_label|Monthly| (30d):  $31.50\n$calc_out.claude_api_cost.row.annual_label|Annual|:         $378.00\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.batch_pricing_line{"cpr":"$0.0052","monthly":"$15.75"}|💡 Batch pricing: $0.0052/req ($15.75/mo) — save 50%|\n\n▲ Claude Haiku 45 (Claude 4.x) | $calc_out.claude_api_cost.row.context_label|Context|: 200K | $calc_out.claude_api_cost.row.max_output_label|Max Output|: 64K\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.input_label|Input|:  1,000   tokens × $1.00/1M → $0.0010/req\n$calc_out.claude_api_cost.row.output_label|Output|: 500     tokens × $5.00/1M → $0.0025/req\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.per_request_label|Per request|:    $0.0035\n$calc_out.claude_api_cost.row.daily_label|Daily| (100):    $0.35\n$calc_out.claude_api_cost.row.monthly_label|Monthly| (30d):  $10.50\n$calc_out.claude_api_cost.row.annual_label|Annual|:         $126.00\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.batch_pricing_line{"cpr":"$0.0018","monthly":"$5.25"}|💡 Batch pricing: $0.0018/req ($5.25/mo) — save 50%|\n\n✦ Claude Fable 5 (Mythos) | $calc_out.claude_api_cost.row.context_label|Context|: 1M | $calc_out.claude_api_cost.row.max_output_label|Max Output|: 128K\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.input_label|Input|:  1,000   tokens × $10.00/1M → $0.01/req\n$calc_out.claude_api_cost.row.output_label|Output|: 500     tokens × $50.00/1M → $0.03/req\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.per_request_label|Per request|:    $0.04\n$calc_out.claude_api_cost.row.daily_label|Daily| (100):    $3.50\n$calc_out.claude_api_cost.row.monthly_label|Monthly| (30d):  $105.00\n$calc_out.claude_api_cost.row.annual_label|Annual|:         $1260.00\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.batch_pricing_line{"cpr":"$0.02","monthly":"$52.50"}|💡 Batch pricing: $0.02/req ($52.50/mo) — save 50%|\n\n$calc_out.claude_api_cost.row.savings_insights|💰 Savings Insights|\n────────────────────────────────────────────────────────────\n$calc_out.claude_api_cost.row.cheapest_line{"name":"Claude Haiku 55","cost":"$1.05"}|🏆 Cheapest: Claude Haiku 55 at $1.05/mo|\n$calc_out.claude_api_cost.row.switching_line{"from":"Claude Fable 5","to":"Claude Haiku 45","monthly":"$94.50","yearly":"$1134.00"}|💸 Switching from Claude Fable 5 to Claude Haiku 45 saves $94.50/mo ($1134.00/yr)|\n$calc_out.claude_api_cost.row.cross_premium_line{"a":"Claude Haiku 55","b":"GPT-5 Nano","diff":"$0.30","pct":"40"}|🌍 Claude Haiku 55 vs GPT-5 Nano: Claude costs $0.30 more/month (40% premium)|\n$calc_out.claude_api_cost.row.cross_cheaper_line{"a":"Claude Haiku 55","b":"DeepSeek V4 Flash","diff":"$1.65","pct":"61"}|🌍 Claude Haiku 55 vs DeepSeek V4 Flash: Claude saves $1.65/month (61% cheaper)|\n$calc_out.claude_api_cost.row.cross_premium_line{"a":"Claude Haiku 55","b":"Gemini 1.5 Flash","diff":"$0.38","pct":"56"}|🌍 Claude Haiku 55 vs Gemini 1.5 Flash: Claude costs $0.38 more/month (56% premium)|\n$calc_out.claude_api_cost.row.premium_buys|💡 Premium buys: 1M context, best-in-class safety, superior code generation|\n\n$calc_out.claude_api_cost.row.usage_scenarios{"rpd":"100"}|📊 Usage Scenarios (monthly cost at 100 reqs/day)|\n\n$calc_out.claude_api_cost.row.usage_scenario_line{"icon":"▲","model":"Claude Sonnet 46","family":"Claude 4.x","v50":"50→$15.75","v100":"100→$31.50","v500":"500→$157.50","v1k":"1,000→$315.00","v5k":"5,000→$1575.00","v10k":"10,000→$3150.00"}|▲ Claude Sonnet 46 (Claude 4.x): 50→$15.75 · 100→$31.50 · 500→$157.50 · 1,000→$315.00 · 5,000→$1575.00 · 10,000→$3150.00|\n$calc_out.claude_api_cost.row.usage_scenario_line{"icon":"▲","model":"Claude Haiku 45","family":"Claude 4.x","v50":"50→$5.25","v100":"100→$10.50","v500":"500→$52.50","v1k":"1,000→$105.00","v5k":"5,000→$525.00","v10k":"10,000→$1050.00"}|▲ Claude Haiku 45 (Claude 4.x): 50→$5.25 · 100→$10.50 · 500→$52.50 · 1,000→$105.00 · 5,000→$525.00 · 10,000→$1050.00|\n$calc_out.claude_api_cost.row.usage_scenario_line{"icon":"✦","model":"Claude Fable 5","family":"Mythos","v50":"50→$52.50","v100":"100→$105.00","v500":"500→$525.00","v1k":"1,000→$1050.00","v5k":"5,000→$5250.00","v10k":"10,000→$10500.00"}|✦ Claude Fable 5 (Mythos): 50→$52.50 · 100→$105.00 · 500→$525.00 · 1,000→$1050.00 · 5,000→$5250.00 · 10,000→$10500.00|\n\n$calc_out.claude_api_cost.row.cost_health|🩺 Cost Health:|\n────────────────────────────────────────────────────────────\n$calc_out.claude_api_cost.row.health_spread_warning{"ratio":"10"}|• 🟠 10x cost spread across selected models — review if every model needs to be premium.|\n$calc_out.claude_api_cost.row.health_tier_low{"name":"Claude Haiku 45","cost":"$10.50"}|• 🟢 Low-volume tier — Claude Haiku 45 at $10.50/mo.|\n$calc_out.claude_api_cost.row.health_cache_zero|• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%.|\n$calc_out.claude_api_cost.row.health_cache_write_mult{"mult":"1.25"}|• 💡 Cache write multiplier is 1.25x — writes are expensive. Only cache stable prefixes (system prompts, few-shot examples).|\n\n$calc_out.claude_api_cost.row.what_if_scenarios|🔄 What-If Scenarios:|\n────────────────────────────────────────────────────────────\n$calc_out.claude_api_cost.row.whatif_switch_cheapest{"name":"Claude Haiku 55","savings":"$9.45"}|• Switch cheapest to Claude Haiku 55:  save $9.45/mo  (similar quality, much cheaper)|\n$calc_out.claude_api_cost.row.whatif_double_volume{"rpd":"200","cost":"$294.00"}|• Double volume to 200 reqs/day:  $294.00/mo|\n$calc_out.claude_api_cost.row.whatif_halve_volume{"rpd":"50","cost":"$73.50"}|• Halve volume to 50 reqs/day:  $73.50/mo|\n$calc_out.claude_api_cost.row.whatif_boost_cache{"savings":"$33.08","total":"$147.00","cached":"$113.92"}|• Boost cache hit rate to 50%:  save ~$33.08/mo  ($147.00 → $113.92)|\n',
  ],
  faq: [
    {
      q: 'How does Claude pricing compare to GPT-4o?',
      a: 'Claude Opus 4.8 at {{live:anthropic/claude-opus-4-8}} per 1M tokens costs {{liveShareIn:anthropic/claude-opus-4-8|openai/gpt-4o}} of GPT-4o ({{live:openai/gpt-4o}}) on input and {{liveShareOut:anthropic/claude-opus-4-8|openai/gpt-4o}} on output, but offers a 1M context window and stronger safety. Claude Haiku 4.5 at {{live:anthropic/claude-haiku-4-5}} is competitive with GPT-4o Mini ({{live:openai/gpt-4o-mini}}). Claude Fable 5 at {{live:anthropic/claude-fable-5}} is Anthropic\'s most capable model, comparable to o3-level reasoning.',
    },
    {
      q: 'What is Prompt Caching and how much can it save?',
      a: 'Claude\'s Prompt Caching lets you mark parts of your prompt as cacheable. Cache reads cost 10% of the standard input price (90% discount) — for Claude Sonnet 4.6 that is {{liveScaledIn:anthropic/claude-sonnet-4-6|0.1}} per 1M tokens instead of {{liveIn:anthropic/claude-sonnet-4-6}}. Cache writes cost 1.25× (5-min TTL) or 2× (1-hour TTL). A 50K-token system prompt at 500 reqs/day pays {{liveCostIn:anthropic/claude-sonnet-4-6|50000}} per request uncached, so the cache earns its keep within a couple of reads. Break-even is just 2 cache reads for 5-min TTL.',
    },
    {
      q: 'When should I use Batch API vs Real-time?',
      a: 'Batch API gives 50% off all token costs across all models. Use it for async workloads that can tolerate up to 24-hour processing time — data labeling, bulk analysis, content generation. Real-time is for interactive use cases. You can mix both: batch for large offline jobs, real-time for user-facing requests.',
    },
    {
      q: 'Is Claude Fable 5 worth the premium?',
      a: 'Fable 5 at {{live:anthropic/claude-fable-5}} costs {{liveShareMix:anthropic/claude-fable-5|anthropic/claude-opus-4-8}} of Opus 4.8\'s ({{live:anthropic/claude-opus-4-8}}) on a mixed workload but delivers Mythos-class performance (~95% on SWE-bench Verified). It\'s worth it for: frontier coding tasks, multi-day autonomous agent runs, complex research requiring deepest reasoning. For everyday tasks, Opus 4.8 or Sonnet 4.6 offer better value.',
    },
    {
      q: 'How does Claude\'s tokenizer affect costs?',
      a: 'Claude uses a different tokenizer from OpenAI. For English text, Claude produces roughly 1.3-1.5 tokens/word (vs OpenAI\'s ~1.3). Opus 4.7 introduced a new tokenizer that can produce up to 35% more tokens for the same text compared to Opus 4.6. Always compare token counts when switching models.',
    },
    {
      q: 'Can I switch between Claude models easily?',
      a: 'Yes, all Claude models share the same Messages API format. Switch by changing the model parameter. Use Haiku for cost-sensitive classification/routing, Sonnet for everyday tasks, Opus for complex analysis, and Fable 5 for frontier coding. Many teams implement model routing based on task complexity.',
    },
    {
      q: 'How do I estimate token counts for Claude?',
      a: 'As a rule of thumb: ~1.4 words/token for English prose, ~0.65 chars/token for CJK text. A typical 500-word English prompt uses ~350-400 tokens. Use the token estimator on this page for quick estimates, or Anthropic\'s token counting API for precise counts.',
    },
    { q: "Why is Claude Sonnet priced higher than GPT-5?", a: "Claude Sonnet 4.6 ({{live:anthropic/claude-sonnet-4-6}}) costs {{liveShareMix:anthropic/claude-sonnet-4-6|openai/gpt-5}} of GPT-5 ({{live:openai/gpt-5}}) on a mixed workload but excels at code, long-context reasoning, and instruction-following. For production workloads where quality matters more than price-per-token, Sonnet often wins on cost-per-successful-completion. Track quality, not just token cost." },
    { q: "What is the difference between Haiku, Sonnet, and Opus?", a: "Haiku 4.5 ({{live:anthropic/claude-haiku-4-5}}) — fast, cheap, for simple tasks. Sonnet 4.6 ({{live:anthropic/claude-sonnet-4-6}}) — balanced, the workhorse for most production. Opus 4.8 ({{live:anthropic/claude-opus-4-8}}) — premium reasoning, code, multi-step agents. Use tiered routing: Haiku for 70%, Sonnet for 25%, Opus for 5%." },
    { q: "How does the 200K context window affect pricing?", a: "Claude charges by token, not by window size, but longer prompts cost more per request. On Claude Sonnet 4.6, a 200K prompt is {{liveCostIn:anthropic/claude-sonnet-4-6|200000}} in input cost vs {{liveCostIn:anthropic/claude-sonnet-4-6|1000}} for 1K. For long documents, use the Files API or batch processing to amortize. Always prefer fetching only relevant chunks." },
    { q: "Is Claude prompt caching actually 90% off?", a: "Yes — on Claude Sonnet 4.6, cached reads cost {{liveScaledIn:anthropic/claude-sonnet-4-6|0.1}} per 1M vs {{liveIn:anthropic/claude-sonnet-4-6}} fresh, a 90% discount. Cache hits have ~200ms latency penalty. Use for: system prompts, tool definitions, RAG-retrieved context that does not change between calls. Invalidates after 5 minutes of inactivity." },
    { q: "When should I use Claude over OpenAI or Gemini?", a: "Claude excels at: coding (Sonnet 4.6), long document analysis (200K context), agentic workflows (tool use), nuanced writing. OpenAI is better for: image generation, voice, ecosystem. Gemini is better for: free tier, multimodal (video), huge context. Pick per task, not brand loyalty." },
    { q: "What does the \"thinking\" model cost extra?", a: "Extended thinking modes (Claude Sonnet 4.6 with reasoning enabled) burn extra tokens for internal reasoning — typically 2-5x more output tokens than non-thinking. Reserved for hard problems. Budget separately for thinking-mode workloads; it can dominate monthly bills." },
    { q: "How do I batch-process with Claude?", a: "Anthropic Message Batches API offers 50% discount for async processing (under 24h turnaround). Use for: bulk classification, content pipelines, dataset labeling, overnight analytics. Not for: real-time chat. Submit up to 100K requests per batch." },
    { q: "What is the free tier for Claude API?", a: "There is no persistent free Claude API tier, but Anthropic offers $5-15K in startup credits through AWS Activate, Google Cloud for Startups, Azure for Startups. New API users historically get $5 free credit. The claude.ai consumer product has free usage with rate limits." },
  ],
  howToUse: [
    'Select the Claude models you want to compare (Fable 5, Opus 4.8, Sonnet 4.6, etc.).',
    'Enter your average input and output tokens per API call.',
    'Choose pricing mode — Real-time for interactive use, Batch for 50% off async processing.',
    'Configure Prompt Caching (write tokens, TTL, hit rate) to see potential savings from caching.',
    'Set growth rate and projection period for long-term cost planning.',
    'Review the cost comparison bar chart, caching breakdown, and cross-provider insights.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);