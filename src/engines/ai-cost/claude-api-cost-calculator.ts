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
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let ct=function(n,W,f){const d=k.llm[n]?.models?.[W];if(!d)throw new Error(\`cross-provider model missing from dataset: \${n}/\${W}\`);return{input:d.input,output:d.output,name:f}},a=function(n){return Math.abs(n)<.01&&n!==0?"$"+n.toFixed(4):"$"+n.toFixed(2)},m=function(n){return n.toLocaleString()},F=function(n,W){return n+" ".repeat(Math.max(0,W-n.length))},Z=function(n){const W=[...new Set((n.models||X.join(",")).split(",").map(t=>t.trim()).filter(Boolean))],f=Math.max(1,Math.min(1e7,parseInt(n.inputTokens)||1e3)),w=Math.max(1,Math.min(1e7,parseInt(n.outputTokens)||500)),d=Math.max(0,Math.min(1e6,parseInt(n.requestsPerDay)||100)),H=n.pricingMode==="batch"?"batch":"realtime",x=Math.max(0,Math.min(f,parseInt(n.cacheWriteTokens)||0)),V=n.cacheTtl==="1hour"?"1hour":"5min",y=Math.max(0,Math.min(100,parseInt(n.cacheReadHitRate)||0)),z=Math.max(0,Math.min(50,parseFloat(n.growthRate)||0)),U=parseInt(n.projectionMonths),J=[3,6,12].includes(U)?U:12,K=x>0&&y>0,O=D[V]||1.25,q=y/100,B=d*30,b=[];for(const[t,e]of Object.entries(ot)){const u=H==="batch"?e.batchInput:e.input,s=H==="batch"?e.batchOutput:e.output,l=f/1e6*u+w/1e6*s,_=l*B;let r;if(K){const h=(f-x)/1e6*u,v=(1-q)*(x/1e6)*u*O,P=q*(x/1e6)*u*j,L=h+v+P,st=w/1e6*s;r=L+st}else r=l;const i=r*B;b.push({key:t,info:e,inputPrice:u,outputPrice:s,costPerReq:r,monthlyCost:i,noCacheCostPerReq:l,noCacheMonthly:_})}b.sort((t,e)=>t.info.order-e.info.order);const Q=b.reduce((t,e)=>e.monthlyCost<t.monthlyCost?e:t),A=b.reduce((t,e)=>e.monthlyCost>t.monthlyCost?e:t).monthlyCost,p=[];for(const t of W){const e=b.find(u=>u.key===t);e&&p.push(e)}if(p.length===0)for(const t of X){const e=b.find(u=>u.key===t);e&&p.push(e)}const o=[];o.push("");let E=H==="batch"?c("calc_out.claude_api_cost.row.pricing_mode_batch","⚡ Batch Pricing (50% off)"):c("calc_out.claude_api_cost.row.pricing_mode_realtime","🔴 Real-time Pricing");if(K){const t=V==="1hour"?"1-hour TTL":"5-min TTL";E+=" | "+c("calc_out.claude_api_cost.row.cache_header","💾 Cache: "+y+"% hit ("+t+")",{hit:String(y),ttl:t})}o.push(E),o.push(""),o.push(c("calc_out.claude_api_cost.row.input_req","📥 Input")+": "+m(f)+" tokens/req | "+c("calc_out.claude_api_cost.row.output_req","📤 Output")+": "+m(w)+" tokens/req | 🔄 "+m(d)+" reqs/day"),K&&o.push(c("calc_out.claude_api_cost.row.cache_write_line","💾 Cache Write: "+m(x)+" tokens/req ("+(O===1.25?"1.25×":"2×")+" write, 0.1× read)",{tokens:m(x),mult:O===1.25?"1.25×":"2×"})),o.push(""),o.push(c("calc_out.claude_api_cost.row.cost_comparison","📊 Cost Comparison")+" ("+m(d)+" reqs/day)"),o.push(C.repeat(54));const T=40;for(const t of b){const u=$[t.info.family]+" "+t.info.name,s=A>0?Math.max(1,Math.round(t.monthlyCost/A*T)):1,_=(t.key===Q.key?"░":"█").repeat(s),i=t.key===Q.key?" 🏆":"";o.push(F(u,26)+" "+F(_,T)+" "+a(t.monthlyCost)+i)}o.push(""),o.push(c("calc_out.claude_api_cost.row.selected_model_details","📋 Selected Model Details")),o.push(C.repeat(60));for(const t of p){const e=$[t.info.family],u=G[t.info.family],s=t.costPerReq*d,l=t.monthlyCost*12;o.push(e+" "+t.info.name+" ("+u+") | "+c("calc_out.claude_api_cost.row.context_label","Context")+": "+t.info.contextWindow+" | "+c("calc_out.claude_api_cost.row.max_output_label","Max Output")+": "+t.info.maxOutput),o.push(N.repeat(44));const _=f/1e6*t.inputPrice;o.push(c("calc_out.claude_api_cost.row.input_label","Input")+":  "+F(m(f),7)+" tokens × "+a(t.inputPrice)+"/1M → "+a(_)+"/req");const r=w/1e6*t.outputPrice;if(o.push(c("calc_out.claude_api_cost.row.output_label","Output")+": "+F(m(w),7)+" tokens × "+a(t.outputPrice)+"/1M → "+a(r)+"/req"),o.push(N.repeat(44)),o.push(c("calc_out.claude_api_cost.row.per_request_label","Per request")+":    "+a(t.costPerReq)),o.push(c("calc_out.claude_api_cost.row.daily_label","Daily")+" ("+d+"):    "+a(s)),o.push(c("calc_out.claude_api_cost.row.monthly_label","Monthly")+" (30d):  "+a(t.monthlyCost)),o.push(c("calc_out.claude_api_cost.row.annual_label","Annual")+":         "+a(l)),o.push(N.repeat(44)),H==="realtime"){const i=f/1e6*t.info.batchInput+w/1e6*t.info.batchOutput,h=i*d*30;o.push(c("calc_out.claude_api_cost.row.batch_pricing_line","💡 Batch pricing: "+a(i)+"/req ("+a(h)+"/mo) — save 50%",{cpr:a(i),monthly:a(h)}))}else{const i=f/1e6*t.info.input+w/1e6*t.info.output,h=i*d*30;o.push(c("calc_out.claude_api_cost.row.real_time_label","🔴 Real-time")+": "+a(i)+"/req ("+a(h)+"/mo)")}if(K){const i=t.noCacheMonthly-t.monthlyCost,h=t.noCacheMonthly>0?Math.round(i/t.noCacheMonthly*100):0;o.push(c("calc_out.claude_api_cost.row.cache_hit_line","💾 With "+y+"% cache hit: "+a(t.monthlyCost)+"/mo — saves "+a(i)+"/mo ("+h+"%)",{hit:String(y),monthly:a(t.monthlyCost),savings:a(i),pct:String(h)}))}o.push("")}if(K){const t=Q,e=t.inputPrice,u=V==="1hour"?"1-hour TTL":"5-min TTL",s=O===1.25?"1.25×":"2×";o.push(c("calc_out.claude_api_cost.row.cache_breakdown_title","💾 Prompt Caching Breakdown ("+u+" × "+s+" write)",{ttl:u,mult:s})),o.push(C.repeat(54));const l=x/1e6*e*O,_=(1-q)*l,r=q*(x/1e6)*e*j,i=(f-x)/1e6*e,h=i+_+r,v=f/1e6*e;o.push(c("calc_out.claude_api_cost.row.model_line","  Model: "+t.info.name+" (cheapest)",{name:t.info.name})),o.push(c("calc_out.claude_api_cost.row.cache_write_miss_label","Cache Write (per miss)")+": "+a(l)+"/req"),o.push(c("calc_out.claude_api_cost.row.cache_miss_cost_line","  Cache Miss Cost: "+a(_)+"/req ("+Math.round((1-q)*100)+"% of requests)",{cost:a(_),pct:String(Math.round((1-q)*100))})),o.push(c("calc_out.claude_api_cost.row.cache_hit_cost_line","  Cache Hit Cost: "+a(r)+"/req ("+Math.round(q*100)+"% of requests)",{cost:a(r),pct:String(Math.round(q*100))})),o.push(c("calc_out.claude_api_cost.row.non_cached_input_label","Non-Cached Input")+": "+a(i)+"/req"),o.push(c("calc_out.claude_api_cost.row.blended_input_label","Blended Input Cost")+": "+a(h)+"/req"),o.push(c("calc_out.claude_api_cost.row.vs_without_caching_line","  vs without caching: "+a(v)+"/req → saves "+a(v-h)+"/req",{nocache:a(v),savings:a(v-h)})),o.push(c("calc_out.claude_api_cost.row.monthly_savings_label","Monthly Savings")+": "+a((v-h)*B));const P=Math.ceil(1/(1-j-(D["5min"]-1))),L=Math.ceil(1/(1-j-(D["1hour"]-1)));o.push(c("calc_out.claude_api_cost.row.break_even_line","  Break-even: ~"+P+" cache reads (5-min) / ~"+L+" reads (1-hour)",{be5:String(P),be1:String(L)})),o.push("")}if(z>0){o.push(c("calc_out.claude_api_cost.row.growth_projection","📈 Growth Projection")+" ("+z+"%/month, "+J+" months)"),o.push("");let t=c("calc_out.claude_api_cost.row.month_label","Month")+"Month".padEnd(8).slice(5);for(const r of p)t+=" | "+r.info.name.padEnd(14);o.push(t);let e="".padEnd(8,C);for(const r of p)e+="-+-".padEnd(15,C);o.push(e);const u=1+z/100;let s=0;for(let r=1;r<=J;r++){const i=Math.pow(u,r-1);let h=String(r).padEnd(8);for(const v of p){const P=v.monthlyCost*i;h+=" | "+a(P).padEnd(14)}o.push(h),s+=(p[0]?.monthlyCost||0)*i}let l="".padEnd(8,C);for(const r of p)l+="-+-".padEnd(15,C);o.push(l);let _=c("calc_out.claude_api_cost.row.total_label","Total")+"Total".padEnd(8).slice(5);for(const r of p){let i=0;for(let h=1;h<=J;h++)i+=r.monthlyCost*Math.pow(u,h-1);_+=" | "+a(i).padEnd(14)}o.push(_),o.push("")}o.push(c("calc_out.claude_api_cost.row.savings_insights","💰 Savings Insights")),o.push(C.repeat(60));const g=b.reduce((t,e)=>e.monthlyCost<t.monthlyCost?e:t);o.push(c("calc_out.claude_api_cost.row.cheapest_line","🏆 Cheapest: "+g.info.name+" at "+a(g.monthlyCost)+"/mo",{name:g.info.name,cost:a(g.monthlyCost)}));const S=b.filter(t=>t.info.family!=="legacy").reduce((t,e)=>e.monthlyCost<t.monthlyCost?e:t,b[0]);if(S&&S.key!==g.key&&o.push(c("calc_out.claude_api_cost.row.best_value_line","⭐ Best value (current-gen): "+S.info.name+" at "+a(S.monthlyCost)+"/mo",{name:S.info.name,cost:a(S.monthlyCost)})),p.length>=2){const t=p.reduce((s,l)=>l.monthlyCost>s.monthlyCost?l:s),e=p.reduce((s,l)=>l.monthlyCost<s.monthlyCost?l:s),u=t.monthlyCost-e.monthlyCost;o.push(c("calc_out.claude_api_cost.row.switching_line","💸 Switching from "+t.info.name+" to "+e.info.name+" saves "+a(u)+"/mo ("+a(u*12)+"/yr)",{from:t.info.name,to:e.info.name,monthly:a(u),yearly:a(u*12)}))}if(K&&p.length>0){const t=p[0],e=t.noCacheMonthly-t.monthlyCost;o.push(c("calc_out.claude_api_cost.row.prompt_caching_line","💾 Prompt caching at "+y+"% hit rate saves ~"+a(e)+"/mo on "+t.info.name,{hit:String(y),savings:a(e),name:t.info.name}))}for(const[t,e]of Object.entries(et)){const s=(f/1e6*e.input+w/1e6*e.output)*B,l=g.monthlyCost-s,_=s>0?Math.abs(l)/s*100:0;l>0?o.push(c("calc_out.claude_api_cost.row.cross_premium_line","🌍 "+g.info.name+" vs "+e.name+": Claude costs "+a(l)+" more/month ("+Math.round(_)+"% premium)",{a:g.info.name,b:e.name,diff:a(l),pct:String(Math.round(_))})):o.push(c("calc_out.claude_api_cost.row.cross_cheaper_line","🌍 "+g.info.name+" vs "+e.name+": Claude saves "+a(Math.abs(l))+"/month ("+Math.round(_)+"% cheaper)",{a:g.info.name,b:e.name,diff:a(Math.abs(l)),pct:String(Math.round(_))}))}o.push(c("calc_out.claude_api_cost.row.premium_buys","💡 Premium buys: 1M context, best-in-class safety, superior code generation")),o.push(""),o.push(c("calc_out.claude_api_cost.row.usage_scenarios","📊 Usage Scenarios (monthly cost at "+m(d)+" reqs/day)",{rpd:m(d)})),o.push("");const ut=[50,100,500,1e3,5e3,1e4];for(const t of p){const e=$[t.info.family],u=[];for(const s of ut)u.push(m(s)+"→"+a(t.costPerReq*s*30));o.push(c("calc_out.claude_api_cost.row.usage_scenario_line",e+" "+t.info.name+" ("+G[t.info.family]+"): "+u.join(" · "),{icon:e,model:t.info.name,family:G[t.info.family],v50:u[0],v100:u[1],v500:u[2],v1k:u[3],v5k:u[4],v10k:u[5]}))}o.push(""),o.push(c("calc_out.claude_api_cost.row.cost_health","🩺 Cost Health:")),o.push(C.repeat(60));const I=p.reduce((t,e)=>t+e.monthlyCost,0),M=p.reduce((t,e)=>e.monthlyCost<t.monthlyCost?e:t),nt=p.reduce((t,e)=>e.monthlyCost>t.monthlyCost?e:t);if(p.length>=2){const t=nt.monthlyCost/Math.max(M.monthlyCost,.01);t>=50?o.push(c("calc_out.claude_api_cost.row.health_expensive","• 🔴 Your most expensive selection costs "+t.toFixed(0)+"x your cheapest — consider mixing tiers.",{ratio:t.toFixed(0)})):t>=10?o.push(c("calc_out.claude_api_cost.row.health_spread_warning","• 🟠 "+t.toFixed(0)+"x cost spread across selected models — review if every model needs to be premium.",{ratio:t.toFixed(0)})):o.push(c("calc_out.claude_api_cost.row.health_spread_ok","• 🟢 Healthy cost spread ("+t.toFixed(1)+"x) across selected models.",{ratio:t.toFixed(1)}))}if(M){const t=M.info.name,e=a(M.monthlyCost),u=t+" at "+e+"/mo.";M.monthlyCost<5?o.push(c("calc_out.claude_api_cost.row.health_tier_micro","• 🟢 Micro-tier (under $5/mo) — "+u,{name:t,cost:e})):M.monthlyCost<50?o.push(c("calc_out.claude_api_cost.row.health_tier_low","• 🟢 Low-volume tier — "+u,{name:t,cost:e})):M.monthlyCost<500?o.push(c("calc_out.claude_api_cost.row.health_tier_mid","• 🟡 Mid-volume tier — "+u,{name:t,cost:e})):o.push(c("calc_out.claude_api_cost.row.health_tier_high","• 🟠 High-volume tier — "+u,{name:t,cost:e}))}y===0?o.push(c("calc_out.claude_api_cost.row.health_cache_zero","• ⚠️ Cache hit rate is 0% — enabling prompt caching on repeated prefixes can cut cost 40-90%.")):y<30?o.push(c("calc_out.claude_api_cost.row.health_cache_low","• 🟡 Low cache hit rate ("+y+"%) — review if your prompt has stable system instructions.",{hit:String(y)})):o.push(c("calc_out.claude_api_cost.row.health_cache_ok","• 🟢 Healthy cache rate ("+y+"%) — keep an eye on cache TTL vs your traffic pattern.",{hit:String(y)})),O>1&&o.push(c("calc_out.claude_api_cost.row.health_cache_write_mult","• 💡 Cache write multiplier is "+O+"x — writes are expensive. Only cache stable prefixes (system prompts, few-shot examples).",{mult:String(O)})),o.push(""),o.push(c("calc_out.claude_api_cost.row.what_if_scenarios","🔄 What-If Scenarios:")),o.push(C.repeat(60));const R=b.reduce((t,e)=>e.info.input+e.info.output<t.info.input+t.info.output?e:t,b[0]);if(R&&R.key!==M?.key){const e=(f/1e6*R.info.input+w/1e6*R.info.output)*d*30,u=(M?.monthlyCost??0)-e;u>0&&o.push(c("calc_out.claude_api_cost.row.whatif_switch_cheapest","• Switch cheapest to "+R.info.name+":  save "+a(u)+"/mo  (similar quality, much cheaper)",{name:R.info.name,savings:a(u)}))}if(o.push(c("calc_out.claude_api_cost.row.whatif_double_volume","• Double volume to "+m(d*2)+" reqs/day:  "+a(I*2)+"/mo",{rpd:m(d*2),cost:a(I*2)})),o.push(c("calc_out.claude_api_cost.row.whatif_halve_volume","• Halve volume to "+m(Math.max(1,Math.floor(d/2)))+" reqs/day:  "+a(I/2)+"/mo",{rpd:m(Math.max(1,Math.floor(d/2))),cost:a(I/2)})),y<50){const e=I*.775,u=I-e;o.push(c("calc_out.claude_api_cost.row.whatif_boost_cache","• Boost cache hit rate to 50%:  save ~"+a(u)+"/mo  ("+a(I)+" → "+a(e)+")",{savings:a(u),total:a(I),cached:a(e)}))}return o.push(""),o},Y=function(n,W,f){var w=at(n);return Array.isArray(w)?w.join(\`
\`):String(w)};var lt=ct,it=a,rt=m,ht=F,pt=Z,dt=Y,k={llm:{openai:{name:"OpenAI",cacheReadMult:null,models:{}},anthropic:{name:"Anthropic",cacheReadMult:.1,cacheWriteMult5m:1.25,cacheWriteMult1h:2,models:{"claude-fable-5":{input:10,output:50,batchInput:5,batchOutput:25,name:"Claude Fable 5",family:"mythos",contextWindow:"1M",maxOutput:"128K",order:1},"claude-opus-4-8":{input:5,output:25,batchInput:2.5,batchOutput:12.5,name:"Claude Opus 48",family:"claude4x",contextWindow:"1M",maxOutput:"128K",order:8},"claude-sonnet-4-6":{input:3,output:15,batchInput:1.5,batchOutput:7.5,name:"Claude Sonnet 46",family:"claude4x",contextWindow:"1M",maxOutput:"64K",order:9},"claude-haiku-4-5":{input:1,output:5,batchInput:.5,batchOutput:2.5,name:"Claude Haiku 45",family:"claude4x",contextWindow:"200K",maxOutput:"64K",order:10}}},google:{name:"Google",cacheReadMult:.1,models:{}},deepseek:{name:"DeepSeek",cacheReadMult:.02,models:{}}}},c=tk,tt='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',c=new Function("return "+tt)(),ot={"claude-fable-5":{input:10,output:50,batchInput:5,batchOutput:25,name:"Claude Fable 5",family:"mythos",contextWindow:"1M",maxOutput:"128K",order:1},"claude-opus-4-8":{input:5,output:25,batchInput:2.5,batchOutput:12.5,name:"Claude Opus 48",family:"claude4x",contextWindow:"1M",maxOutput:"128K",order:8},"claude-sonnet-4-6":{input:3,output:15,batchInput:1.5,batchOutput:7.5,name:"Claude Sonnet 46",family:"claude4x",contextWindow:"1M",maxOutput:"64K",order:9},"claude-haiku-4-5":{input:1,output:5,batchInput:.5,batchOutput:2.5,name:"Claude Haiku 45",family:"claude4x",contextWindow:"200K",maxOutput:"64K",order:10},"claude-opus-4-1":{input:15,output:75,batchInput:7.5,batchOutput:37.5,name:"Claude Opus 41",family:"claude4x",contextWindow:"200K",maxOutput:"32K",order:11},"claude-haiku-3-5":{input:.8,output:4,batchInput:.4,batchOutput:2,name:"Claude Haiku 3.5",family:"legacy",contextWindow:"200K",maxOutput:"8K",order:12},"claude-haiku-3":{input:.25,output:1.25,batchInput:.125,batchOutput:.625,name:"Claude Haiku 3",family:"legacy",contextWindow:"200K",maxOutput:"4K",order:13},"claude-sonnet-5":{input:2,output:10,name:"Claude Sonnet 5",family:"claude5x",contextWindow:"1M",order:6,maxOutput:"128K",batchInput:1,batchOutput:5},"claude-opus-5":{input:5,output:25,name:"Claude Opus 5",family:"claude5x",contextWindow:"1M",order:5,maxOutput:"128K",batchInput:2.5,batchOutput:12.5},"claude-mythos-5":{input:10,output:50,name:"Claude Mythos 5",family:"mythos",contextWindow:"1M",order:7,maxOutput:"128K",batchInput:5,batchOutput:25},"claude-sonnet-5-5":{input:2,output:10,name:"Claude Sonnet 55",family:"claude5x",contextWindow:"1M",order:3,maxOutput:"128K",batchInput:1,batchOutput:5},"claude-opus-5-5":{input:4,output:20,name:"Claude Opus 55",family:"claude5x",contextWindow:"1M",order:2,maxOutput:"128K",batchInput:2,batchOutput:10},"claude-haiku-5-5":{input:.1,output:.5,name:"Claude Haiku 55",family:"claude5x",contextWindow:"1M",order:4,maxOutput:"128K",batchInput:.05,batchOutput:.25}},$={mythos:"✦",claude5x:"★",claude4x:"▲",legacy:"◆"},G={mythos:"Mythos",claude5x:"Claude 5.x",claude4x:"Claude 4.x",legacy:"Legacy"},D={"5min":1.25,"1hour":2},j=.1,X=["claude-fable-5","claude-opus-4-8","claude-sonnet-4-6","claude-haiku-4-5"],et={openai:{input:.05,output:.4,name:"GPT-5 Nano"},deepseek:{input:.3,output:1.2,name:"DeepSeek V4 Flash"},gemini:{input:.075,output:.3,name:"Gemini 1.5 Flash"}},C="─",N="—",at=function(n){return Z(n)};return[Y(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
    '\n$calc_out.claude_api_cost.row.pricing_mode_realtime|🔴 Real-time Pricing| | $calc_out.claude_api_cost.row.cache_header{"hit":"50","ttl":"5-min TTL"}|💾 Cache: 50% hit (5-min TTL)|\n\n$calc_out.claude_api_cost.row.input_req|📥 Input|: 1,000 tokens/req | $calc_out.claude_api_cost.row.output_req|📤 Output|: 500 tokens/req | 🔄 100 reqs/day\n$calc_out.claude_api_cost.row.cache_write_line{"tokens":"1,000","mult":"1.25×"}|💾 Cache Write: 1,000 tokens/req (1.25× write, 0.1× read)|\n\n$calc_out.claude_api_cost.row.cost_comparison|📊 Cost Comparison| (100 reqs/day)\n──────────────────────────────────────────────────────\n✦ Claude Fable 5           ███████████████████████████              $95.25\n★ Claude Opus 55           ███████████                              $38.10\n★ Claude Sonnet 55         █████                                    $19.05\n★ Claude Haiku 55          ░                                        $0.95 🏆\n★ Claude Opus 5            █████████████                            $47.63\n★ Claude Sonnet 5          █████                                    $19.05\n✦ Claude Mythos 5          ███████████████████████████              $95.25\n▲ Claude Opus 48           █████████████                            $47.63\n▲ Claude Sonnet 46         ████████                                 $28.57\n▲ Claude Haiku 45          ███                                      $9.53\n▲ Claude Opus 41           ████████████████████████████████████████ $142.88\n◆ Claude Haiku 3.5         ██                                       $7.62\n◆ Claude Haiku 3           █                                        $2.38\n\n$calc_out.claude_api_cost.row.selected_model_details|📋 Selected Model Details|\n────────────────────────────────────────────────────────────\n▲ Claude Sonnet 46 (Claude 4.x) | $calc_out.claude_api_cost.row.context_label|Context|: 1M | $calc_out.claude_api_cost.row.max_output_label|Max Output|: 64K\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.input_label|Input|:  1,000   tokens × $3.00/1M → $0.0030/req\n$calc_out.claude_api_cost.row.output_label|Output|: 500     tokens × $15.00/1M → $0.0075/req\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.per_request_label|Per request|:    $0.0095\n$calc_out.claude_api_cost.row.daily_label|Daily| (100):    $0.95\n$calc_out.claude_api_cost.row.monthly_label|Monthly| (30d):  $28.57\n$calc_out.claude_api_cost.row.annual_label|Annual|:         $342.90\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.batch_pricing_line{"cpr":"$0.0052","monthly":"$15.75"}|💡 Batch pricing: $0.0052/req ($15.75/mo) — save 50%|\n$calc_out.claude_api_cost.row.cache_hit_line{"hit":"50","monthly":"$28.57","savings":"$2.93","pct":"9"}|💾 With 50% cache hit: $28.57/mo — saves $2.93/mo (9%)|\n\n▲ Claude Haiku 45 (Claude 4.x) | $calc_out.claude_api_cost.row.context_label|Context|: 200K | $calc_out.claude_api_cost.row.max_output_label|Max Output|: 64K\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.input_label|Input|:  1,000   tokens × $1.00/1M → $0.0010/req\n$calc_out.claude_api_cost.row.output_label|Output|: 500     tokens × $5.00/1M → $0.0025/req\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.per_request_label|Per request|:    $0.0032\n$calc_out.claude_api_cost.row.daily_label|Daily| (100):    $0.32\n$calc_out.claude_api_cost.row.monthly_label|Monthly| (30d):  $9.53\n$calc_out.claude_api_cost.row.annual_label|Annual|:         $114.30\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.batch_pricing_line{"cpr":"$0.0018","monthly":"$5.25"}|💡 Batch pricing: $0.0018/req ($5.25/mo) — save 50%|\n$calc_out.claude_api_cost.row.cache_hit_line{"hit":"50","monthly":"$9.53","savings":"$0.97","pct":"9"}|💾 With 50% cache hit: $9.53/mo — saves $0.97/mo (9%)|\n\n✦ Claude Fable 5 (Mythos) | $calc_out.claude_api_cost.row.context_label|Context|: 1M | $calc_out.claude_api_cost.row.max_output_label|Max Output|: 128K\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.input_label|Input|:  1,000   tokens × $10.00/1M → $0.01/req\n$calc_out.claude_api_cost.row.output_label|Output|: 500     tokens × $50.00/1M → $0.03/req\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.per_request_label|Per request|:    $0.03\n$calc_out.claude_api_cost.row.daily_label|Daily| (100):    $3.17\n$calc_out.claude_api_cost.row.monthly_label|Monthly| (30d):  $95.25\n$calc_out.claude_api_cost.row.annual_label|Annual|:         $1143.00\n————————————————————————————————————————————\n$calc_out.claude_api_cost.row.batch_pricing_line{"cpr":"$0.02","monthly":"$52.50"}|💡 Batch pricing: $0.02/req ($52.50/mo) — save 50%|\n$calc_out.claude_api_cost.row.cache_hit_line{"hit":"50","monthly":"$95.25","savings":"$9.75","pct":"9"}|💾 With 50% cache hit: $95.25/mo — saves $9.75/mo (9%)|\n\n$calc_out.claude_api_cost.row.cache_breakdown_title{"ttl":"5-min TTL","mult":"1.25×"}|💾 Prompt Caching Breakdown (5-min TTL × 1.25× write)|\n──────────────────────────────────────────────────────\n$calc_out.claude_api_cost.row.model_line{"name":"Claude Haiku 55"}|  Model: Claude Haiku 55 (cheapest)|\n$calc_out.claude_api_cost.row.cache_write_miss_label|Cache Write (per miss)|: $0.0001/req\n$calc_out.claude_api_cost.row.cache_miss_cost_line{"cost":"$0.0001","pct":"50"}|  Cache Miss Cost: $0.0001/req (50% of requests)|\n$calc_out.claude_api_cost.row.cache_hit_cost_line{"cost":"$0.0000","pct":"50"}|  Cache Hit Cost: $0.0000/req (50% of requests)|\n$calc_out.claude_api_cost.row.non_cached_input_label|Non-Cached Input|: $0.00/req\n$calc_out.claude_api_cost.row.blended_input_label|Blended Input Cost|: $0.0001/req\n$calc_out.claude_api_cost.row.vs_without_caching_line{"nocache":"$0.0001","savings":"$0.0000"}|  vs without caching: $0.0001/req → saves $0.0000/req|\n$calc_out.claude_api_cost.row.monthly_savings_label|Monthly Savings|: $0.10\n$calc_out.claude_api_cost.row.break_even_line{"be5":"2","be1":"-10"}|  Break-even: ~2 cache reads (5-min) / ~-10 reads (1-hour)|\n\n$calc_out.claude_api_cost.row.savings_insights|💰 Savings Insights|\n────────────────────────────────────────────────────────────\n$calc_out.claude_api_cost.row.cheapest_line{"name":"Claude Haiku 55","cost":"$0.95"}|🏆 Cheapest: Claude Haiku 55 at $0.95/mo|\n$calc_out.claude_api_cost.row.switching_line{"from":"Claude Fable 5","to":"Claude Haiku 45","monthly":"$85.72","yearly":"$1028.70"}|💸 Switching from Claude Fable 5 to Claude Haiku 45 saves $85.72/mo ($1028.70/yr)|\n$calc_out.claude_api_cost.row.prompt_caching_line{"hit":"50","savings":"$2.93","name":"Claude Sonnet 46"}|💾 Prompt caching at 50% hit rate saves ~$2.93/mo on Claude Sonnet 46|\n$calc_out.claude_api_cost.row.cross_premium_line{"a":"Claude Haiku 55","b":"GPT-5 Nano","diff":"$0.20","pct":"27"}|🌍 Claude Haiku 55 vs GPT-5 Nano: Claude costs $0.20 more/month (27% premium)|\n$calc_out.claude_api_cost.row.cross_cheaper_line{"a":"Claude Haiku 55","b":"DeepSeek V4 Flash","diff":"$1.75","pct":"65"}|🌍 Claude Haiku 55 vs DeepSeek V4 Flash: Claude saves $1.75/month (65% cheaper)|\n$calc_out.claude_api_cost.row.cross_premium_line{"a":"Claude Haiku 55","b":"Gemini 1.5 Flash","diff":"$0.28","pct":"41"}|🌍 Claude Haiku 55 vs Gemini 1.5 Flash: Claude costs $0.28 more/month (41% premium)|\n$calc_out.claude_api_cost.row.premium_buys|💡 Premium buys: 1M context, best-in-class safety, superior code generation|\n\n$calc_out.claude_api_cost.row.usage_scenarios{"rpd":"100"}|📊 Usage Scenarios (monthly cost at 100 reqs/day)|\n\n$calc_out.claude_api_cost.row.usage_scenario_line{"icon":"▲","model":"Claude Sonnet 46","family":"Claude 4.x","v50":"50→$14.29","v100":"100→$28.57","v500":"500→$142.87","v1k":"1,000→$285.75","v5k":"5,000→$1428.75","v10k":"10,000→$2857.50"}|▲ Claude Sonnet 46 (Claude 4.x): 50→$14.29 · 100→$28.57 · 500→$142.87 · 1,000→$285.75 · 5,000→$1428.75 · 10,000→$2857.50|\n$calc_out.claude_api_cost.row.usage_scenario_line{"icon":"▲","model":"Claude Haiku 45","family":"Claude 4.x","v50":"50→$4.76","v100":"100→$9.53","v500":"500→$47.63","v1k":"1,000→$95.25","v5k":"5,000→$476.25","v10k":"10,000→$952.50"}|▲ Claude Haiku 45 (Claude 4.x): 50→$4.76 · 100→$9.53 · 500→$47.63 · 1,000→$95.25 · 5,000→$476.25 · 10,000→$952.50|\n$calc_out.claude_api_cost.row.usage_scenario_line{"icon":"✦","model":"Claude Fable 5","family":"Mythos","v50":"50→$47.63","v100":"100→$95.25","v500":"500→$476.25","v1k":"1,000→$952.50","v5k":"5,000→$4762.50","v10k":"10,000→$9525.00"}|✦ Claude Fable 5 (Mythos): 50→$47.63 · 100→$95.25 · 500→$476.25 · 1,000→$952.50 · 5,000→$4762.50 · 10,000→$9525.00|\n\n$calc_out.claude_api_cost.row.cost_health|🩺 Cost Health:|\n────────────────────────────────────────────────────────────\n$calc_out.claude_api_cost.row.health_spread_warning{"ratio":"10"}|• 🟠 10x cost spread across selected models — review if every model needs to be premium.|\n$calc_out.claude_api_cost.row.health_tier_low{"name":"Claude Haiku 45","cost":"$9.53"}|• 🟢 Low-volume tier — Claude Haiku 45 at $9.53/mo.|\n$calc_out.claude_api_cost.row.health_cache_ok{"hit":"50"}|• 🟢 Healthy cache rate (50%) — keep an eye on cache TTL vs your traffic pattern.|\n$calc_out.claude_api_cost.row.health_cache_write_mult{"mult":"1.25"}|• 💡 Cache write multiplier is 1.25x — writes are expensive. Only cache stable prefixes (system prompts, few-shot examples).|\n\n$calc_out.claude_api_cost.row.what_if_scenarios|🔄 What-If Scenarios:|\n────────────────────────────────────────────────────────────\n$calc_out.claude_api_cost.row.whatif_switch_cheapest{"name":"Claude Haiku 55","savings":"$8.48"}|• Switch cheapest to Claude Haiku 55:  save $8.48/mo  (similar quality, much cheaper)|\n$calc_out.claude_api_cost.row.whatif_double_volume{"rpd":"200","cost":"$266.70"}|• Double volume to 200 reqs/day:  $266.70/mo|\n$calc_out.claude_api_cost.row.whatif_halve_volume{"rpd":"50","cost":"$66.67"}|• Halve volume to 50 reqs/day:  $66.67/mo|\n',
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