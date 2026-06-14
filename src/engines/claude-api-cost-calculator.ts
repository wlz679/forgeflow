import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

// --- Model definitions ---
interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: 'mythos' | 'claude4x' | 'legacy';
  contextWindow: string;
  maxOutput: string;
  batchInput: number;
  batchOutput: number;
  order: number;
}

const MODELS: Record<string, ModelInfo> = {
  // Mythos-class
  'claude-fable-5': {
    input: 10.0,
    output: 50.0,
    name: 'Claude Fable 5',
    family: 'mythos',
    contextWindow: '1M',
    maxOutput: '128K',
    batchInput: 5.0,
    batchOutput: 25.0,
    order: 1,
  },
  // Claude 4.x Current
  'claude-opus-4-8': {
    input: 5.0,
    output: 25.0,
    name: 'Claude Opus 4.8',
    family: 'claude4x',
    contextWindow: '1M',
    maxOutput: '128K',
    batchInput: 2.5,
    batchOutput: 12.5,
    order: 2,
  },
  'claude-sonnet-4-6': {
    input: 3.0,
    output: 15.0,
    name: 'Claude Sonnet 4.6',
    family: 'claude4x',
    contextWindow: '1M',
    maxOutput: '64K',
    batchInput: 1.5,
    batchOutput: 7.5,
    order: 3,
  },
  'claude-haiku-4-5': {
    input: 1.0,
    output: 5.0,
    name: 'Claude Haiku 4.5',
    family: 'claude4x',
    contextWindow: '200K',
    maxOutput: '64K',
    batchInput: 0.5,
    batchOutput: 2.5,
    order: 4,
  },
  // Legacy
  'claude-opus-4-1': {
    input: 15.0,
    output: 75.0,
    name: 'Claude Opus 4.1',
    family: 'legacy',
    contextWindow: '200K',
    maxOutput: '32K',
    batchInput: 7.5,
    batchOutput: 37.5,
    order: 5,
  },
  'claude-haiku-3-5': {
    input: 0.80,
    output: 4.0,
    name: 'Claude Haiku 3.5',
    family: 'legacy',
    contextWindow: '200K',
    maxOutput: '8K',
    batchInput: 0.4,
    batchOutput: 2.0,
    order: 6,
  },
  'claude-haiku-3': {
    input: 0.25,
    output: 1.25,
    name: 'Claude Haiku 3',
    family: 'legacy',
    contextWindow: '200K',
    maxOutput: '4K',
    batchInput: 0.125,
    batchOutput: 0.625,
    order: 7,
  },
};

// Family display metadata
const FAMILY_ICONS: Record<string, string> = {
  mythos: '✦',     // ✦
  claude4x: '▲',   // ▲
  legacy: '◆',     // ◆
};
const FAMILY_LABELS: Record<string, string> = {
  mythos: 'Mythos',
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
    pricingMode: 'realtime', cacheWriteTokens: '500', cacheTTL: '5min', cacheReadHitRate: '80',
    growthRate: '0', projectionMonths: '12',
  },
  'Mid-Scale': {
    inputTokens: '2000', outputTokens: '1000', requestsPerDay: '500',
    pricingMode: 'realtime', cacheWriteTokens: '2000', cacheTTL: '5min', cacheReadHitRate: '60',
    growthRate: '0', projectionMonths: '12',
  },
  'High Volume': {
    inputTokens: '5000', outputTokens: '2000', requestsPerDay: '5000',
    pricingMode: 'realtime', cacheWriteTokens: '5000', cacheTTL: '1hour', cacheReadHitRate: '40',
    growthRate: '0', projectionMonths: '12',
  },
  'Batch Processing': {
    inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000',
    pricingMode: 'batch', cacheWriteTokens: '0', cacheTTL: '5min', cacheReadHitRate: '0',
    growthRate: '0', projectionMonths: '12',
  },
  'Heavy Caching': {
    inputTokens: '2000', outputTokens: '800', requestsPerDay: '2000',
    pricingMode: 'realtime', cacheWriteTokens: '2000', cacheTTL: '1hour', cacheReadHitRate: '90',
    growthRate: '0', projectionMonths: '12',
  },
  Enterprise: {
    inputTokens: '10000', outputTokens: '5000', requestsPerDay: '50000',
    pricingMode: 'batch', cacheWriteTokens: '10000', cacheTTL: '1hour', cacheReadHitRate: '70',
    growthRate: '0', projectionMonths: '12',
  },
};

// Cross-provider reference prices (cheapest from each, per 1M tokens)
const CROSS_PROVIDER: Record<string, { input: number; output: number; name: string }> = {
  openai: { input: 0.05, output: 0.4, name: 'GPT-5 Nano' },
  deepseek: { input: 0.14, output: 0.28, name: 'DeepSeek Chat' },
  gemini: { input: 0.075, output: 0.3, name: 'Gemini 1.5 Flash' },
};

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
  const cacheTTL = inputs.cacheTTL === '1hour' ? '1hour' : '5min';
  const cacheReadHitRate = Math.max(0, Math.min(100, parseInt(inputs.cacheReadHitRate) || 0));
  const growthRate = Math.max(0, Math.min(50, parseFloat(inputs.growthRate) || 0));
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  const cachingActive = cacheWriteTokens > 0 && cacheReadHitRate > 0;
  const writeMult = CACHE_WRITE_MULT[cacheTTL] || 1.25;
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

  // ================================================================
  // Section 1: Header
  // ================================================================
  const modeEmoji = pricingMode === 'batch' ? '⚡' : '🔴';
  const modeLabel = pricingMode === 'batch' ? 'Batch Pricing (50% off)' : 'Real-time Pricing';
  let headerLine = modeEmoji + ' ' + modeLabel;
  if (cachingActive) {
    const ttlLabel = cacheTTL === '1hour' ? '1-hour TTL' : '5-min TTL';
    headerLine += ' | 💾 Cache: ' + cacheReadHitRate + '% hit (' + ttlLabel + ')';
  }
  out.push(headerLine);
  out.push('');
  out.push(
    '📥 Input: ' + lc(inTokens) + ' tokens/req | ' +
    '📤 Output: ' + lc(outTokens) + ' tokens/req | ' +
    '🔄 ' + lc(reqPerDay) + ' reqs/day',
  );
  if (cachingActive) {
    out.push(
      '💾 Cache Write: ' + lc(cacheWriteTokens) + ' tokens/req (' +
      (writeMult === 1.25 ? '1.25×' : '2×') + ' write, 0.1× read)',
    );
  }
  out.push('');

  // ================================================================
  // Section 2: Bar Chart
  // ================================================================
  out.push('Cost Comparison (' + lc(reqPerDay) + ' reqs/day)');
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 40;
  for (const c of allCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const label = icon + ' ' + c.info.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.key === cheapest.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    out.push(pad(label, 26) + ' ' + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost));
  }
  out.push('');

  // ================================================================
  // Section 3: Detail Cards
  // ================================================================
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const famLabel = FAMILY_LABELS[c.info.family];
    out.push(icon + ' ' + c.info.name + ' (' + famLabel + ')');
    out.push('  Context: ' + c.info.contextWindow + ' | Max Output: ' + c.info.maxOutput);
    out.push('  Rate: ' + fmt(c.info.input) + '/' + fmt(c.info.output) + ' per 1M tokens');
    out.push('  Per Request: ' + fmt(c.costPerReq));
    out.push('  Monthly Cost (' + lc(reqPerDay) + ' reqs/day): ' + fmt(c.monthlyCost));
    if (cachingActive) {
      const savings = c.noCacheMonthly - c.monthlyCost;
      const pctSaved = c.noCacheMonthly > 0 ? Math.round((savings / c.noCacheMonthly) * 100) : 0;
      const sign = savings >= 0 ? 'saved' : 'extra';
      out.push('  💾 With caching: ' + fmt(c.monthlyCost) + ' (' + pctSaved + '% ' + sign + ')');
    }
    out.push('');
  }

  // ================================================================
  // Section 4: Caching Breakdown (Claude-specific)
  // ================================================================
  if (cachingActive) {
    const ref = cheapest;
    const ip = ref.inputPrice;
    const ttlLabel = cacheTTL === '1hour' ? '1-hour TTL' : '5-min TTL';
    const wmLabel = writeMult === 1.25 ? '1.25×' : '2×';
    out.push('💾 Prompt Caching Breakdown (' + ttlLabel + ' × ' + wmLabel + ' write)');
    out.push(SEP.repeat(54));

    const cacheWriteCost = (cacheWriteTokens / 1_000_000) * ip * writeMult;
    const cacheMissCost = (1 - hitRate) * cacheWriteCost;
    const cacheHitCost = hitRate * (cacheWriteTokens / 1_000_000) * ip * CACHE_READ_MULT;
    const nonCacheInput = ((inTokens - cacheWriteTokens) / 1_000_000) * ip;
    const blendedInput = nonCacheInput + cacheMissCost + cacheHitCost;
    const noCacheInput = (inTokens / 1_000_000) * ip;

    out.push('  Model: ' + ref.info.name + ' (cheapest)');
    out.push('  Cache Write (per miss): ' + fmt(cacheWriteCost) + '/req');
    out.push('  Cache Miss Cost: ' + fmt(cacheMissCost) + '/req (' + Math.round((1 - hitRate) * 100) + '% of requests)');
    out.push('  Cache Hit Cost: ' + fmt(cacheHitCost) + '/req (' + Math.round(hitRate * 100) + '% of requests)');
    out.push('  Non-Cached Input: ' + fmt(nonCacheInput) + '/req');
    out.push('  Blended Input Cost: ' + fmt(blendedInput) + '/req');
    out.push('  vs without caching: ' + fmt(noCacheInput) + '/req → saves ' + fmt(noCacheInput - blendedInput) + '/req');
    out.push('  Monthly Savings: ' + fmt((noCacheInput - blendedInput) * reqsPerMonth));
    // Break-even
    const beHits5min = Math.ceil(1 / (1 - CACHE_READ_MULT - (CACHE_WRITE_MULT['5min'] - 1)));
    const beHits1hour = Math.ceil(1 / (1 - CACHE_READ_MULT - (CACHE_WRITE_MULT['1hour'] - 1)));
    out.push('  Break-even: ~' + beHits5min + ' cache reads (5-min) / ~' + beHits1hour + ' reads (1-hour)');
    out.push('');
  }

  // ================================================================
  // Section 5: Growth Projection
  // ================================================================
  if (growthRate > 0) {
    out.push('📈 Growth Projection (' + growthRate + '%/month, ' + projMonths + ' months)');
    out.push('');

    // Table header
    let header = 'Month'.padEnd(8);
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
    let totalRow = 'Total'.padEnd(8);
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
  // Section 6: Savings Insights — Cross-provider
  // ================================================================
  out.push('💰 Savings Insights');
  out.push(SEP.repeat(54));
  // Find cheapest Claude model
  const cheapestClaude = allCosts.reduce((min, c) =>
    c.monthlyCost < min.monthlyCost ? c : min,
  );

  for (const [provKey, prov] of Object.entries(CROSS_PROVIDER)) {
    const provCostPerReq = (inTokens / 1_000_000) * prov.input + (outTokens / 1_000_000) * prov.output;
    const provMonthly = provCostPerReq * reqsPerMonth;
    const diff = cheapestClaude.monthlyCost - provMonthly;
    const pct = provMonthly > 0 ? Math.abs(diff) / provMonthly * 100 : 0;
    if (diff > 0) {
      out.push('  ' + cheapestClaude.info.name + ' vs ' + prov.name + ': Claude costs ' + fmt(diff) + ' more/month (' + Math.round(pct) + '% premium)');
    } else {
      out.push('  ' + cheapestClaude.info.name + ' vs ' + prov.name + ': Claude saves ' + fmt(Math.abs(diff)) + '/month (' + Math.round(pct) + '% cheaper)');
    }
  }
  out.push('💡 Premium buys: 1M context, best-in-class safety, superior code generation');
  out.push('');

  // ================================================================
  // Section 7: Usage Scenarios
  // ================================================================
  out.push('📊 Usage Scenarios (monthly cost at ' + lc(reqPerDay) + ' reqs/day)');
  out.push('');
  const volumes = [50, 100, 500, 1000, 5000, 10000];
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    let line = icon + ' ' + c.info.name + ' (' + FAMILY_LABELS[c.info.family] + '): ';
    const parts: string[] = [];
    for (const v of volumes) {
      parts.push(lc(v) + '→' + fmt(c.costPerReq * v * 30));
    }
    line += parts.join(' · ');
    out.push(line);
  }

  return out;
}
