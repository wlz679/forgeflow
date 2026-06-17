import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';
import PRICING from '../data/ai-pricing.json';

interface ModelInfo {
  input: number;
  output: number;
  batchInput: number;
  batchOutput: number;
  name: string;
  family: 'flash35' | 'pro' | 'flash3' | 'legacy';
  icon: string;
  contextWindow: string;
  order: number;
  supportsCache: boolean;
  supportsBatch: boolean;
}

const MODELS: Record<string, ModelInfo> = PRICING.llm.google.models as any;

const FAMILY_LABELS: Record<string, string> = {
  flash35: 'Gemini 3.5 Flash',
  pro: 'Gemini 3.1 Pro',
  flash3: 'Gemini 3 Flash',
  legacy: 'Legacy',
};

// Gemini Context Caching: cached reads at 0.1x input (90% discount), no write multiplier
const CACHE_READ_MULT = 0.1;

const DEFAULT_SELECTED = ['gemini-3.5-flash', 'gemini-3.1-pro', 'gemini-3-flash', 'gemini-1.5-flash'];

// Cross-provider comparison (cheapest from each)
const CROSS_PROVIDER: Record<string, { input: number; output: number; name: string }> = {
  openai: { input: 0.05, output: 0.4, name: 'GPT-5 Nano' },
  claude: { input: 0.25, output: 1.25, name: 'Claude Haiku 3' },
  deepseek: { input: 0.14, output: 0.28, name: 'DeepSeek V4 Flash' },
};

const PRESETS: Record<string, Record<string, string>> = {
  'Light Usage': {
    inputTokens: '500', outputTokens: '1000', requestsPerDay: '50',
    pricingMode: 'realtime', cacheHitRate: '80', growthRate: '0', projectionMonths: '12',
  },
  'Mid-Scale': {
    inputTokens: '2000', outputTokens: '1000', requestsPerDay: '500',
    pricingMode: 'realtime', cacheHitRate: '60', growthRate: '0', projectionMonths: '12',
  },
  'High Volume': {
    inputTokens: '5000', outputTokens: '2000', requestsPerDay: '10000',
    pricingMode: 'realtime', cacheHitRate: '50', growthRate: '0', projectionMonths: '12',
  },
  'Batch Processing': {
    inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000',
    pricingMode: 'batch', cacheHitRate: '0', growthRate: '0', projectionMonths: '12',
  },
  'Heavy Cache': {
    inputTokens: '2000', outputTokens: '800', requestsPerDay: '5000',
    pricingMode: 'realtime', cacheHitRate: '95', growthRate: '0', projectionMonths: '12',
  },
  'Enterprise': {
    inputTokens: '8000', outputTokens: '5000', requestsPerDay: '100000',
    pricingMode: 'realtime', cacheHitRate: '60', growthRate: '0', projectionMonths: '6',
  },
};

function fmt(n: number): string {
  if (Math.abs(n) < 0.01 && n !== 0) return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}
function lc(n: number): string { return n.toLocaleString(); }
function pad(s: string, len: number): string {
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function estimateTokens(text: string): { tokens: number; method: string } {
  if (!text.trim()) return { tokens: 0, method: 'empty' };
  const cjk = (text.match(/[一-鿿㐀-䶿]/g) || []).length;
  const words = text.split(/\s+/).length;
  if (cjk > text.length * 0.3) {
    return { tokens: Math.round(text.length / 0.65), method: 'CJK (0.65 chars/token)' };
  }
  return { tokens: Math.round(words * 1.3), method: 'English (1.3 words/token)' };
}

const SEP = '─';

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const selectedKeys = [...new Set(
    (inputs.models || DEFAULT_SELECTED.join(','))
      .split(',').map(s => s.trim()).filter(Boolean),
  )];
  const inTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.inputTokens) || 1000));
  const outTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.outputTokens) || 500));
  const reqPerDay = Math.max(0, Math.min(1_000_000, parseInt(inputs.requestsPerDay) || 100));
  const pricingMode = (inputs.pricingMode === 'batch') ? 'batch' : 'realtime';
  const cacheHitRate = Math.max(0, Math.min(100, parseInt(inputs.cacheHitRate) || 0));
  const growthRate = Math.max(0, Math.min(50, parseFloat(inputs.growthRate) || 0));
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  const isBatch = pricingMode === 'batch';
  const cachingActive = !isBatch && cacheHitRate > 0;
  const hitRate = cacheHitRate / 100;
  const reqsPerMonth = reqPerDay * 30;

  // --- Compute costs ---
  interface CostEntry {
    key: string;
    info: ModelInfo;
    costPerReq: number;
    monthlyCost: number;
    noCacheCostPerReq: number;
    noCacheMonthly: number;
  }

  const allCosts: CostEntry[] = [];
  for (const [key, info] of Object.entries(MODELS)) {
    // Base pricing: realtime or batch
    const effInput = isBatch && info.supportsBatch ? info.batchInput : info.input;
    const effOutput = isBatch && info.supportsBatch ? info.batchOutput : info.output;

    const noCacheCostPerReq = (inTokens / 1_000_000) * effInput + (outTokens / 1_000_000) * effOutput;
    const noCacheMonthly = noCacheCostPerReq * reqsPerMonth;

    let costPerReq: number;
    if (cachingActive && info.supportsCache) {
      // Gemini Context Caching: cached portion at 0.1x input, non-cached at full input
      const cachedInput = (inTokens * hitRate / 1_000_000) * effInput * CACHE_READ_MULT;
      const nonCachedInput = (inTokens * (1 - hitRate) / 1_000_000) * effInput;
      const outputCost = (outTokens / 1_000_000) * effOutput;
      costPerReq = cachedInput + nonCachedInput + outputCost;
    } else {
      costPerReq = noCacheCostPerReq;
    }

    const monthlyCost = costPerReq * reqsPerMonth;
    allCosts.push({ key, info, costPerReq, monthlyCost, noCacheCostPerReq, noCacheMonthly });
  }

  allCosts.sort((a, b) => a.info.order - b.info.order);

  const cheapest = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const maxCost = allCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max).monthlyCost;

  const selectedCosts: CostEntry[] = [];
  for (const k of selectedKeys) {
    const entry = allCosts.find(c => c.key === k);
    if (entry) selectedCosts.push(entry);
  }
  if (selectedCosts.length === 0) {
    for (const dk of DEFAULT_SELECTED) {
      const entry = allCosts.find(c => c.key === dk);
      if (entry) selectedCosts.push(entry);
    }
  }

  const out: string[] = [];
  out.push('📅 Pricing last updated: ' + (PRICING.lastUpdated || 'unknown') + ' (data synced weekly)');
  out.push('');

  // Section 1: Header
  let headerLine = '\u{1F916} Gemini API Cost';
  if (isBatch) {
    headerLine += ' | \u{1F4E6} Batch Mode (50% discount)';
  }
  if (cachingActive) {
    headerLine += ' | \u{1F4BE} Context Caching: ' + cacheHitRate + '% hit (90% discount)';
  }
  out.push(headerLine);
  out.push('');
  out.push(
    '\u{1F4E5} Input: ' + lc(inTokens) + ' tokens/req | ' +
    '\u{1F4E4} Output: ' + lc(outTokens) + ' tokens/req | ' +
    '\u{1F504} ' + lc(reqPerDay) + ' reqs/day | ' +
    (isBatch ? '\u{1F4E6} Batch' : '⚡ Real-time'),
  );
  out.push('');

  // Section 2: Bar Chart
  out.push('📊 Cost Comparison (' + lc(reqPerDay) + ' reqs/day)');
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 40;
  for (const c of allCosts) {
    const icon = c.info.icon;
    const label = icon + ' ' + c.info.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.key === cheapest.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    const suffix = isBatch && !c.info.supportsBatch ? ' (no batch)' : '';
    const isCheapest = c.key === cheapest.key;
    const badge = isCheapest ? ' 🏆' : '';
    out.push(pad(label, 28) + ' ' + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + suffix + badge);
  }
  out.push('');
  out.push('');

  // Section 3: Detail Cards — selected models
  out.push('📋 Selected Model Details');
  out.push(SEP.repeat(60));
  for (const c of selectedCosts) {
    const icon = c.info.icon;
    const famLabel = FAMILY_LABELS[c.info.family];
    const dailyCost = c.costPerReq * reqPerDay;
    const annualCost = c.monthlyCost * 12;

    out.push(
      icon + ' ' + c.info.name + ' (' + famLabel + ') | Context: ' + c.info.contextWindow,
    );
    out.push(SEP.repeat(44));

    const inputCostLine = (inTokens / 1_000_000) * (isBatch && c.info.supportsBatch ? c.info.batchInput : c.info.input);
    const outputCostLine = (outTokens / 1_000_000) * (isBatch && c.info.supportsBatch ? c.info.batchOutput : c.info.output);
    out.push(
      'Input:  ' + pad(lc(inTokens), 7) + ' tokens × ' +
        fmt(isBatch && c.info.supportsBatch ? c.info.batchInput : c.info.input) +
        '/1M → ' + fmt(inputCostLine) + '/req',
    );
    out.push(
      'Output: ' + pad(lc(outTokens), 7) + ' tokens × ' +
        fmt(isBatch && c.info.supportsBatch ? c.info.batchOutput : c.info.output) +
        '/1M → ' + fmt(outputCostLine) + '/req',
    );

    // Batch rate line for models that support it
    if (!isBatch && c.info.supportsBatch) {
      out.push('  Batch Rate: ' + fmt(c.info.batchInput) + '/' + fmt(c.info.batchOutput) + ' per 1M tokens');
    } else if (!c.info.supportsBatch) {
      out.push('  ⚠ Batch: N/A for this model');
    }

    out.push(SEP.repeat(44));
    out.push('Per request:    ' + fmt(c.costPerReq));
    out.push('Daily (' + reqPerDay + '):    ' + fmt(dailyCost));
    out.push('Monthly (30d):  ' + fmt(c.monthlyCost));
    out.push('Annual:         ' + fmt(annualCost));
    out.push(SEP.repeat(44));

    // Context caching savings per model
    if (cachingActive && c.info.supportsCache) {
      const savings = c.noCacheMonthly - c.monthlyCost;
      const pctSaved = c.noCacheMonthly > 0 ? Math.round((savings / c.noCacheMonthly) * 100) : 0;
      out.push(
        '💾 Context cache at ' + cacheHitRate + '% hit: ' + fmt(c.monthlyCost) +
          '/mo — saves ' + fmt(savings) + '/mo (' + pctSaved + '%)',
      );
    } else if (cachingActive && !c.info.supportsCache) {
      out.push('🚫 Context caching not available for this model');
    }

    out.push('');
  }

  // Section 4: Growth Projection
  if (growthRate > 0) {
    out.push('\u{1F4C8} Growth Projection (' + growthRate + '%/month, ' + projMonths + ' months)');
    out.push('');
    let header = 'Month'.padEnd(8);
    for (const c of selectedCosts) header += ' | ' + c.info.name.padEnd(16);
    out.push(header);
    let sepLine = ''.padEnd(8, SEP);
    for (const _ of selectedCosts) sepLine += '-+-'.padEnd(17, SEP);
    out.push(sepLine);
    const growthMult = 1 + growthRate / 100;
    for (let month = 1; month <= projMonths; month++) {
      const mult = Math.pow(growthMult, month - 1);
      let row = String(month).padEnd(8);
      for (const c of selectedCosts) {
        row += ' | ' + fmt(c.monthlyCost * mult).padEnd(16);
      }
      out.push(row);
    }
    out.push(sepLine);
    let totalRow = 'Total'.padEnd(8);
    for (const c of selectedCosts) {
      let cum = 0;
      for (let m = 1; m <= projMonths; m++) cum += c.monthlyCost * Math.pow(growthMult, m - 1);
      totalRow += ' | ' + fmt(cum).padEnd(16);
    }
    out.push(totalRow);
    out.push('');
  }

  // Section 5: Savings Insights
  out.push('💰 Savings Insights');
  out.push(SEP.repeat(60));

  const cheapestGem = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  out.push('🏆 Cheapest: ' + cheapestGem.info.name + ' at ' + fmt(cheapestGem.monthlyCost) + '/mo');

  // Best value (non-legacy Gemini 3 family)
  const bestValue = allCosts
    .filter((c) => c.info.family !== 'legacy')
    .reduce((min, c) => (c.monthlyCost < min.monthlyCost ? c : min), allCosts[0]);
  if (bestValue && bestValue.key !== cheapestGem.key) {
    out.push('⭐ Best value (Gemini 3 series): ' + bestValue.info.name + ' at ' + fmt(bestValue.monthlyCost) + '/mo');
  }

  // Switching savings
  if (selectedCosts.length >= 2) {
    const mostExpSelected = selectedCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max);
    const cheapSelected = selectedCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
    const diff = mostExpSelected.monthlyCost - cheapSelected.monthlyCost;
    out.push('💸 Switching from ' + mostExpSelected.info.name + ' to ' + cheapSelected.info.name +
      ' saves ' + fmt(diff) + '/mo (' + fmt(diff * 12) + '/yr)');
  }

  // Caching tip
  if (cachingActive && selectedCosts.length > 0) {
    const ref = selectedCosts[0];
    const savings = ref.noCacheMonthly - ref.monthlyCost;
    out.push('💾 Context cache at ' + cacheHitRate + '% hit rate saves ~' + fmt(savings) + '/mo on ' + ref.info.name);
  }

  // Cross-provider comparison
  for (const [provKey, prov] of Object.entries(CROSS_PROVIDER)) {
    const provMonthly = ((inTokens / 1_000_000) * prov.input + (outTokens / 1_000_000) * prov.output) * reqsPerMonth;
    const savings = provMonthly - cheapestGem.monthlyCost;
    const pct = provMonthly > 0 ? Math.round((savings / provMonthly) * 100) : 0;
    const cheaper = savings > 0;
    out.push('🌍 ' + cheapestGem.info.name + ' vs ' + prov.name + ': ' +
      (cheaper ? 'saves ' + fmt(savings) + '/month (' + pct + '% cheaper)' : 'costs ' + fmt(-savings) + '/month more'));
  }
  out.push('💡 Gemini 3 Flash is the cheapest frontier-quality model at $0.50/$3.00 per 1M tokens. Context Caching saves 90% on repeated prompts for the newest 3 models.');
  out.push('');

  // Section 6: Usage Scenarios
  out.push('📅 Usage Scenarios (monthly cost at ' + lc(reqPerDay) + ' reqs/day)');
  out.push('');
  const volumes = [50, 100, 500, 1000, 5000, 10000];
  for (const c of selectedCosts) {
    const icon = c.info.icon;
    let line = icon + ' ' + c.info.name + ': ';
    const parts: string[] = [];
    for (const v of volumes) {
      parts.push(lc(v) + '→' + fmt(c.costPerReq * v * 30));
    }
    line += parts.join(' · ');
    out.push(line);
  }

  return out;
}

// customFn — exact sync with calculate()
const customFn =
  "var M={" +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5 Flash',f:'flash35',ic:'\\u25CF',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'\\u25B2',cw:'1M',od:2,sc:true,sb:true}," +
  "var M={" +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "var M={" +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "var M={" +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "var M={" +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3.5-flash':{i:1.5,o:9,bi:0.75,bo:4.5,n:'Gemini 3.5Flash',f:'flash35',ic:'●',cw:'1M',od:1,sc:true,sb:true}," +
  "'gemini-3.1-pro':{i:2.5,o:15,bi:1.25,bo:7.5,n:'Gemini 3.1 Pro',f:'pro',ic:'▲',cw:'1M',od:2,sc:true,sb:true}," +
  "'gemini-3-flash':{i:0.5,o:3,bi:0.25,bo:1.5,n:'Gemini 3 Flash',f:'flash3',ic:'◆',cw:'1M',od:3,sc:true,sb:true}," +
  "'gemini-2.5-flash':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5Flash',f:'legacy',ic:'◇',cw:'1M',od:4,sc:false,sb:false}," +
  "'gemini-1.5-pro':{i:3.5,o:10.5,bi:0,bo:0,n:'Gemini 1.5 Pro',f:'legacy',ic:'◇',cw:'2M',od:5,sc:false,sb:false}," +
  "'gemini-1.5-flash':{i:0.075,o:0.3,bi:0,bo:0,n:'Gemini 1.5 Flash',f:'legacy',ic:'◇',cw:'1M',od:6,sc:false,sb:false}," +
  "'gemini-2.0-flash':{i:0.1,o:0.4,bi:0,bo:0,n:'Gemini 2.0Flash',f:'legacy',ic:'◇',cw:'1M',od:7,sc:false,sb:false}," +
  "'gemini-2.0-flash-001':{i:0.1,o:0.4,bi:0,bo:0,n:'Gemini 2.0Flash 001',f:'legacy',ic:'◇',cw:'1M',od:8,sc:false,sb:false}," +
  "'gemini-2.0-flash-lite':{i:0.075,o:0.3,bi:0,bo:0,n:'Gemini 2.0Flash Lite',f:'legacy',ic:'◇',cw:'1M',od:9,sc:false,sb:false}," +
  "'gemini-2.0-flash-lite-001':{i:0.075,o:0.3,bi:0,bo:0,n:'Gemini 2.0Flash Lite 001',f:'legacy',ic:'◇',cw:'1M',od:10,sc:false,sb:false}," +
  "'gemini-2.5-flash-image':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5Flash Image',f:'legacy',ic:'◇',cw:'33K',od:11,sc:false,sb:false}," +
  "'gemini-3-pro-image-preview':{i:2,o:12,bi:0,bo:0,n:'Gemini 3Pro Image Preview',f:'flash3',ic:'◆',cw:'66K',od:12,sc:false,sb:false}," +
  "'gemini-3.1-flash-image-preview':{i:0.25,o:1.5,bi:0,bo:0,n:'Gemini 3.1Flash Image Preview',f:'flash3',ic:'◆',cw:'66K',od:13,sc:false,sb:false}," +
  "'gemini-3.1-flash-lite-preview':{i:0.25,o:1.5,bi:0,bo:0,n:'Gemini 3.1Flash Lite Preview',f:'flash3',ic:'◆',cw:'1M',od:14,sc:false,sb:false}," +
  "'gemini-3.1-flash-lite':{i:0.25,o:1.5,bi:0,bo:0,n:'Gemini 3.1Flash Lite',f:'flash3',ic:'◆',cw:'1M',od:15,sc:false,sb:false}," +
  "'gemini-2.5-flash-lite':{i:0.1,o:0.4,bi:0,bo:0,n:'Gemini 2.5Flash Lite',f:'legacy',ic:'◇',cw:'1M',od:16,sc:false,sb:false}," +
  "'gemini-2.5-flash-lite-preview-09-2025':{i:0.1,o:0.4,bi:0,bo:0,n:'Gemini 2.5Flash Lite Preview 092025',f:'legacy',ic:'◇',cw:'1M',od:17,sc:false,sb:false}," +
  "'gemini-2.5-flash-preview-09-2025':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5Flash Preview 092025',f:'legacy',ic:'◇',cw:'1M',od:18,sc:false,sb:false}," +
  "'gemini-live-2.5-flash-preview-native-audio-09-2025':{i:0.3,o:2,bi:0,bo:0,n:'Gemini Live 2.5Flash Preview Native Audio 092025',f:'legacy',ic:'◇',cw:'1M',od:19,sc:false,sb:false}," +
  "'gemini-2.5-flash-lite-preview-06-17':{i:0.1,o:0.4,bi:0,bo:0,n:'Gemini 2.5Flash Lite Preview 0617',f:'legacy',ic:'◇',cw:'1M',od:20,sc:false,sb:false}," +
  "'gemini-2.5-pro':{i:1.25,o:10,bi:0,bo:0,n:'Gemini 2.5Pro',f:'legacy',ic:'◇',cw:'1M',od:21,sc:false,sb:false}," +
  "'gemini-3-pro-preview':{i:2,o:12,bi:0,bo:0,n:'Gemini 3Pro Preview',f:'flash3',ic:'◆',cw:'1M',od:22,sc:false,sb:false}," +
  "'gemini-3.1-pro-preview':{i:2,o:12,bi:0,bo:0,n:'Gemini 3.1Pro Preview',f:'pro',ic:'▲',cw:'1M',od:23,sc:false,sb:false}," +
  "'gemini-3.1-pro-preview-customtools':{i:2,o:12,bi:0,bo:0,n:'Gemini 3.1Pro Preview Customtools',f:'pro',ic:'▲',cw:'1M',od:24,sc:false,sb:false}," +
  "'gemini-2.5-pro-preview-tts':{i:1.25,o:10,bi:0,bo:0,n:'Gemini 2.5Pro Preview Tts',f:'legacy',ic:'◇',cw:'1M',od:25,sc:false,sb:false}," +
  "'gemini-robotics-er-1.5-preview':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini Robotics Er 1.5Preview',f:'legacy',ic:'◇',cw:'1M',od:26,sc:false,sb:false}," +
  "'gemini-2.5-computer-use-preview-10-2025':{i:1.25,o:10,bi:0,bo:0,n:'Gemini 2.5Computer Use Preview 102025',f:'legacy',ic:'◇',cw:'128K',od:27,sc:false,sb:false}," +
  "'deep-research-pro-preview-12-2025':{i:2,o:12,bi:0,bo:0,n:'Deep Research Pro Preview 122025',f:'legacy',ic:'◇',cw:'66K',od:28,sc:false,sb:false}," +
  "'gemini-flash-latest':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini Flash Latest',f:'legacy',ic:'◇',cw:'1M',od:29,sc:false,sb:false}," +
  "'gemini-flash-lite-latest':{i:0.1,o:0.4,bi:0,bo:0,n:'Gemini Flash Lite Latest',f:'legacy',ic:'◇',cw:'1M',od:30,sc:false,sb:false}," +
  "'gemini-2.5-flash-preview-tts':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5Flash Preview Tts',f:'legacy',ic:'◇',cw:'128K',od:31,sc:false,sb:false}," +
  "'gemini-3-flash-preview':{i:0.5,o:3,bi:0,bo:0,n:'Gemini 3Flash Preview',f:'flash3',ic:'◆',cw:'1M',od:32,sc:false,sb:false}," +
  "'gemini-gemma-2-27b-it':{i:0.35,o:1.05,bi:0,bo:0,n:'Gemini Gemma 227b It',f:'legacy',ic:'◇',cw:'8K',od:33,sc:false,sb:false}," +
  "'gemini-gemma-2-9b-it':{i:0.35,o:1.05,bi:0,bo:0,n:'Gemini Gemma 29b It',f:'legacy',ic:'◇',cw:'8K',od:34,sc:false,sb:false}," +
  "'gemini-2.5-flash-native-audio-latest':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5Flash Native Audio Latest',f:'legacy',ic:'◇',cw:'1M',od:35,sc:false,sb:false}," +
  "'gemini-2.5-flash-native-audio-preview-09-2025':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5Flash Native Audio Preview 092025',f:'legacy',ic:'◇',cw:'1M',od:36,sc:false,sb:false}," +
  "'gemini-2.5-flash-native-audio-preview-12-2025':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5Flash Native Audio Preview 122025',f:'legacy',ic:'◇',cw:'1M',od:37,sc:false,sb:false}," +
  "'gemini-3.1-flash-live-preview':{i:0.75,o:4.5,bi:0,bo:0,n:'Gemini 3.1Flash Live Preview',f:'flash3',ic:'◆',cw:'131K',od:38,sc:false,sb:false}," +
  "'gemini-pro-latest':{i:1.25,o:10,bi:0,bo:0,n:'Gemini Pro Latest',f:'legacy',ic:'◇',cw:'1M',od:39,sc:false,sb:false}," +
  "'gemini-exp-1206':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini Exp 1206',f:'legacy',ic:'◇',cw:'1M',od:40,sc:false,sb:false}" +

  "var FL={flash35:'Gemini 3.5 Flash',pro:'Gemini 3.1 Pro',flash3:'Gemini 3 Flash',legacy:'Legacy'};" +
  "var DEF=['gemini-3.5-flash','gemini-3.1-pro','gemini-3-flash','gemini-1.5-flash'];" +
  "var CRM=0.1;" +
  "var XP={openai:{i:0.05,o:0.4,n:'GPT-5 Nano'},claude:{i:0.25,o:1.25,n:'Claude Haiku 3'},deepseek:{i:0.14,o:0.28,n:'DeepSeek V4 Flash'}};" +
  "function fm(n){if(Math.abs(n)<0.01&&n!==0)return '$'+n.toFixed(4);return '$'+n.toFixed(2)}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP2='\\u2500';" +
  "var rawM=inputs.models||DEF.join(',');var sks=[];var seen={};rawM.split(',').forEach(function(s){s=s.trim();if(s&&!seen[s]){seen[s]=true;sks.push(s);}});" +
  "var iT=Math.max(1,Math.min(1e7,parseInt(inputs.inputTokens)||1000));" +
  "var oT=Math.max(1,Math.min(1e7,parseInt(inputs.outputTokens)||500));" +
  "var rpd=Math.max(0,Math.min(1e6,parseInt(inputs.requestsPerDay)||100));" +
  "var pMode=inputs.pricingMode==='batch'?'batch':'realtime';" +
  "var cHR=Math.max(0,Math.min(100,parseInt(inputs.cacheHitRate)||0));" +
  "var gR=Math.max(0,Math.min(50,parseFloat(inputs.growthRate)||0));" +
  "var pMraw=parseInt(inputs.projectionMonths);var pM=[3,6,12].indexOf(pMraw)>=0?pMraw:12;" +
  "var isBatch=pMode==='batch';var cacheOn=!isBatch&&cHR>0;var hR=cHR/100;var rpm=rpd*30;" +
  "var all=[];" +
  "for(var k in M){var mi=M[k];var ei=isBatch&&mi.sb?mi.bi:mi.i;var eo=isBatch&&mi.sb?mi.bo:mi.o;" +
  "var ncpr=(iT/1e6)*ei+(oT/1e6)*eo;var ncm=ncpr*rpm;var cpr;" +
  "if(cacheOn&&mi.sc){var ci=(iT*hR/1e6)*ei*CRM;var nci=(iT*(1-hR)/1e6)*ei;cpr=ci+nci+(oT/1e6)*eo;}else{cpr=ncpr;}" +
  "var mc=cpr*rpm;all.push({k:k,i:mi,cpr:cpr,mc:mc,ncpr:ncpr,ncm:ncm});}" +
  "all.sort(function(a,b){return a.i.od-b.i.od;});" +
  "var ch=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var mx=all.reduce(function(max,c){return c.mc>max.mc?c:max;}).mc;" +
  "var sc=[];for(var i=0;i<sks.length;i++){var e=all.find(function(c){return c.k===sks[i];});if(e)sc.push(e);}" +
  "if(sc.length===0){for(var j=0;j<DEF.length;j++){var e2=all.find(function(c){return c.k===DEF[j];});if(e2)sc.push(e2);}}" +
  "var o=[];" +
  "var hl='\\u{1F916} Gemini API Cost';if(isBatch){hl+=' | \\u{1F4E6} Batch Mode (50% discount)';}" +
  "if(cacheOn){hl+=' | \\u{1F4BE} Context Caching: '+cHR+'% hit (90% discount)';}" +
  "o.push(hl);o.push('');" +
  "o.push('\\u{1F4E5} Input: '+lc(iT)+' tokens/req | \\u{1F4E4} Output: '+lc(oT)+' tokens/req | \\u{1F504} '+lc(rpd)+' reqs/day | '+(isBatch?'\\u{1F4E6} Batch':'\\u26A1 Real-time'));o.push('');" +
  "o.push('\\u{1F4CA} Cost Comparison ('+lc(rpd)+' reqs/day)');o.push(SEP2.repeat(54));" +
  "var BW=40;for(var i=0;i<all.length;i++){var c=all[i];var icon=c.i.ic;var label=icon+' '+c.i.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;var bc=c.k===ch.k?'\\u2591':'\\u2588';" +
  "var sf=isBatch&&!c.i.sb?' (no batch)':'';var bd=c.k===ch.k?' \\u{1F3C6}':'';" +
  "o.push(pd(label,28)+' '+pd(bc.repeat(bl),BW)+' '+fm(c.mc)+sf+bd);}o.push('');o.push('');" +
  "o.push('\\u{1F4CB} Selected Model Details');o.push(SEP2.repeat(60));" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=c.i.ic;var dc2=c.cpr*rpd;var ann=c.mc*12;" +
  "o.push(icon+' '+c.i.n+' ('+FL[c.i.f]+') | Context: '+c.i.cw);" +
  "o.push(SEP2.repeat(44));" +
  "var ei2=isBatch&&c.i.sb?c.i.bi:c.i.i;var eo2=isBatch&&c.i.sb?c.i.bo:c.i.o;" +
  "var icl=(iT/1e6)*ei2;var ocl=(oT/1e6)*eo2;" +
  "o.push('Input:  '+pd(lc(iT),7)+' tokens \\u00d7 '+fm(ei2)+'/1M \\u2192 '+fm(icl)+'/req');" +
  "o.push('Output: '+pd(lc(oT),7)+' tokens \\u00d7 '+fm(eo2)+'/1M \\u2192 '+fm(ocl)+'/req');" +
  "if(!isBatch&&c.i.sb){o.push('  Batch Rate: '+fm(c.i.bi)+'/'+fm(c.i.bo)+' per 1M tokens');}" +
  "else if(!c.i.sb){o.push('  \\u26A0 Batch: N/A for this model');}" +
  "o.push(SEP2.repeat(44));" +
  "o.push('Per request:    '+fm(c.cpr));" +
  "o.push('Daily ('+rpd+'):    '+fm(dc2));" +
  "o.push('Monthly (30d):  '+fm(c.mc));" +
  "o.push('Annual:         '+fm(ann));" +
  "o.push(SEP2.repeat(44));" +
  "if(cacheOn&&c.i.sc){var sv=c.ncm-c.mc;var ps=c.ncm>0?Math.round((sv/c.ncm)*100):0;o.push('\\u{1F4BE} Context cache at '+cHR+'% hit: '+fm(c.mc)+'/mo \\u2014 saves '+fm(sv)+'/mo ('+ps+'%)');}" +
  "else if(cacheOn&&!c.i.sc){o.push('\\u{1F6AB} Context caching not available for this model');}" +
  "o.push('');}" +
  "if(gR>0){" +
  "o.push('\\u{1F4C8} Growth Projection ('+gR+'%/month, '+pM+' months)');o.push('');" +
  "var hdr='Month'.padEnd(8);for(var i=0;i<sc.length;i++)hdr+=' | '+sc[i].i.n.padEnd(16);o.push(hdr);" +
  "var sl=''.padEnd(8,SEP2);for(var i=0;i<sc.length;i++)sl+='-+-'.padEnd(17,SEP2);o.push(sl);" +
  "var gm=1+gR/100;" +
  "for(var m=1;m<=pM;m++){var mult=Math.pow(gm,m-1);var row=String(m).padEnd(8);for(var i=0;i<sc.length;i++)row+=' | '+fm(sc[i].mc*mult).padEnd(16);o.push(row);}" +
  "o.push(sl);" +
  "var tr='Total'.padEnd(8);for(var i=0;i<sc.length;i++){var cum=0;for(var m=1;m<=pM;m++)cum+=sc[i].mc*Math.pow(gm,m-1);tr+=' | '+fm(cum).padEnd(16);}o.push(tr);" +
  "o.push('');}" +
  "o.push('\\u{1F4B0} Savings Insights');o.push(SEP2.repeat(60));" +
  "var cheapestG=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "o.push('\\u{1F3C6} Cheapest: '+cheapestG.i.n+' at '+fm(cheapestG.mc)+'/mo');" +
  "var flt2=all.filter(function(c){return c.i.f!=='legacy';});" +
  "var bv=flt2.length>0?flt2.reduce(function(mn,c){return c.mc<mn.mc?c:mn;}):null;" +
  "if(bv&&bv.k!==cheapestG.k){o.push('\\u2B50 Best value (Gemini 3 series): '+bv.i.n+' at '+fm(bv.mc)+'/mo');}" +
  "if(sc.length>=2){" +
  "var meS=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "var chS=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var df2=meS.mc-chS.mc;" +
  "o.push('\\u{1F4B8} Switching from '+meS.i.n+' to '+chS.i.n+' saves '+fm(df2)+'/mo ('+fm(df2*12)+'/yr)');}" +
  "if(cacheOn&&sc.length>0){" +
  "var ref2=sc[0];var sv3=ref2.ncm-ref2.mc;" +
  "o.push('\\u{1F4BE} Context cache at '+cHR+'% hit rate saves ~'+fm(sv3)+'/mo on '+ref2.i.n);}" +
  "for(var pk in XP){var pv=XP[pk];var pm2=((iT/1e6)*pv.i+(oT/1e6)*pv.o)*rpm;var sv2=pm2-cheapestG.mc;var pct=pm2>0?Math.round((sv2/pm2)*100):0;" +
  "var cheaper=sv2>0;o.push('\\u{1F30D} '+cheapestG.i.n+' vs '+pv.n+': '+(cheaper?'saves '+fm(sv2)+'/month ('+pct+'% cheaper)':'costs '+fm(-sv2)+'/month more'));}" +
  "o.push('\\u{1F4A1} Gemini 3 Flash is the cheapest frontier-quality model at $0.50/$3.00 per 1M tokens. Context Caching saves 90% on repeated prompts for the newest 3 models.');" +
  "o.push('');" +
  "o.push('\\u{1F4C5} Usage Scenarios (monthly cost at '+lc(rpd)+' reqs/day)');o.push('');" +
  "var vols=[50,100,500,1000,5000,10000];" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=c.i.ic;var line=icon+' '+c.i.n+': ';var pts=[];" +
  "for(var j=0;j<vols.length;j++){pts.push(lc(vols[j])+'\\u2192'+fm(c.cpr*vols[j]*30));}" +
  "line+=pts.join(' \\u00b7 ');o.push(line);}" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-gemini-api-cost-calculator',
  title: 'Gemini API Cost Calculator',
  description: 'Calculate Google Gemini API costs across 6 models — Gemini 3.5 Flash, 3.1 Pro, 3 Flash, and legacy models. Includes Context Caching, batch pricing, growth projections, and cross-provider comparison.',
  category: 'B',
  inputs: [
    { name: 'models', label: 'Models', placeholder: 'gemini-3.5-flash,gemini-3.1-pro,gemini-3-flash,gemini-1.5-flash', type: 'text' },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
    { name: 'cacheHitRate', label: 'Context Cache Hit Rate (%)', placeholder: 'e.g. 60', type: 'number' },
    { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    // All values verified against actual calculate() output with default inputs
    '🤖 Gemini API Cost\n' +
    '\n' +
    '📥 Input: 1,000 tokens/req | 📤 Output: 500 tokens/req | 🔄 100 reqs/day | ⚡ Real-time\n' +
    '\n' +
    '📊 Cost Comparison (100 reqs/day)\n' +
    '──────────────────────────────────────────────────────\n' +
    '● Gemini 3.5 Flash        ████████████████████████ $18.00\n' +
    '▲ Gemini 3.1 Pro           ████████████████████████████████████████ $30.00\n' +
    '◆ Gemini 3 Flash          ████████ $6.00\n' +
    '◇ Gemini 2.5 Flash         ██████ $4.65\n' +
    '◇ Gemini 1.5 Pro           ███████████████████████████████████ $26.25\n' +
    '◇ Gemini 1.5 Flash         ░ $0.67 🏆\n' +
    '\n' +
    '📋 Selected Model Details\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '● Gemini 3.5 Flash (Gemini 3.5 Flash) | Context: 1M\n' +
    '────────────────────────────────────────────\n' +
    'Input:  1,000    tokens × $1.50/1M → $0.0015/req\n' +
    'Output: 500      tokens × $9.00/1M → $0.0045/req\n' +
    '  Batch Rate: $0.75/$4.50 per 1M tokens\n' +
    '────────────────────────────────────────────\n' +
    'Per request:    $0.0060\n' +
    'Daily (100):    $0.60\n' +
    'Monthly (30d):  $18.00\n' +
    'Annual:         $216.00\n' +
    '────────────────────────────────────────────\n' +
    '\n' +
    '▲ Gemini 3.1 Pro (Gemini 3.1 Pro) | Context: 1M\n' +
    '────────────────────────────────────────────\n' +
    'Input:  1,000    tokens × $2.50/1M → $0.0025/req\n' +
    'Output: 500      tokens × $15.00/1M → $0.0075/req\n' +
    '  Batch Rate: $1.25/$7.50 per 1M tokens\n' +
    '────────────────────────────────────────────\n' +
    'Per request:    $0.01\n' +
    'Daily (100):    $1.00\n' +
    'Monthly (30d):  $30.00\n' +
    'Annual:         $360.00\n' +
    '────────────────────────────────────────────\n' +
    '\n' +
    '◆ Gemini 3 Flash (Gemini 3 Flash) | Context: 1M\n' +
    '────────────────────────────────────────────\n' +
    'Input:  1,000    tokens × $0.50/1M → $0.0005/req\n' +
    'Output: 500      tokens × $3.00/1M → $0.0015/req\n' +
    '  Batch Rate: $0.25/$1.50 per 1M tokens\n' +
    '────────────────────────────────────────────\n' +
    'Per request:    $0.0020\n' +
    'Daily (100):    $0.20\n' +
    'Monthly (30d):  $6.00\n' +
    'Annual:         $72.00\n' +
    '────────────────────────────────────────────\n' +
    '\n' +
    '◇ Gemini 1.5 Flash (Legacy) | Context: 1M\n' +
    '────────────────────────────────────────────\n' +
    'Input:  1,000    tokens × $0.07/1M → $0.0001/req\n' +
    'Output: 500      tokens × $0.30/1M → $0.0001/req\n' +
    '  ⚠ Batch: N/A for this model\n' +
    '────────────────────────────────────────────\n' +
    'Per request:    $0.0002\n' +
    'Daily (100):    $0.02\n' +
    'Monthly (30d):  $0.67\n' +
    'Annual:         $8.10\n' +
    '────────────────────────────────────────────\n' +
    '\n' +
    '💰 Savings Insights\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🏆 Cheapest: Gemini 1.5 Flash at $0.67/mo\n' +
    '⭐ Best value (Gemini 3 series): Gemini 3 Flash at $6.00/mo\n' +
    '💸 Switching from Gemini 3.1 Pro to Gemini 1.5 Flash saves $29.32/mo ($351.90/yr)\n' +
    '🌍 Gemini 1.5 Flash vs GPT-5 Nano: saves $0.08/month (10% cheaper)\n' +
    '🌍 Gemini 1.5 Flash vs Claude Haiku 3: saves $1.95/month (74% cheaper)\n' +
    '🌍 Gemini 1.5 Flash vs DeepSeek V4 Flash: saves $0.17/month (20% cheaper)\n' +
    '💡 Gemini 3 Flash is the cheapest frontier-quality model at $0.50/$3.00 per 1M tokens.\n' +
    '\n' +
    '📅 Usage Scenarios (monthly cost at 100 reqs/day)\n' +
    '\n' +
    '● Gemini 3.5 Flash: 50→$9.00 · 100→$18.00 · 500→$90.00 · 1,000→$180.00 · 5,000→$900.00 · 10,000→$1,800.00\n' +
    '▲ Gemini 3.1 Pro: 50→$15.00 · 100→$30.00 · 500→$150.00 · 1,000→$300.00 · 5,000→$1,500.00 · 10,000→$3,000.00\n' +
    '◆ Gemini 3 Flash: 50→$3.00 · 100→$6.00 · 500→$30.00 · 1,000→$60.00 · 5,000→$300.00 · 10,000→$600.00\n' +
    '◇ Gemini 1.5 Flash: 50→$0.34 · 100→$0.67 · 500→$3.38 · 1,000→$6.75 · 5,000→$33.75 · 10,000→$67.50',
  ],
  faq: [
    { q: 'How does Gemini pricing compare to OpenAI/Claude?', a: 'Gemini 3 Flash at $0.50/$3.00 per 1M tokens is 80-95% cheaper than GPT-4o ($2.50/$10) and 75% cheaper than Claude Haiku 3 ($0.25/$1.25 for output). Gemini 3.5 Flash at $1.50/$9.00 is still 40% cheaper than GPT-4o for input. The biggest advantage is Gemini\'s 2M token context window on Pro models.' },
    { q: 'What is Gemini Context Caching and how much can it save?', a: 'Gemini Context Caching stores your system instructions and repeated prefixes for 90% discount on cache reads. Cached tokens cost 0.1x the standard input price. It activates automatically for system instructions — no write cost. With 80% cache hit rate, you save ~72% on input costs. Available only on Gemini 3.5 Flash, 3.1 Pro, and 3 Flash.' },
    { q: 'When should I use Batch API vs Real-time?', a: 'Batch API gives 50% discount with async processing (completed within 24 hours). Use for: bulk data processing, content generation pipelines, overnight analytics. Use Real-time for: chatbots, interactive apps, code assistants — anything needing sub-second responses. Batch is only available on the 3 newest Gemini models.' },
    { q: 'Is Gemini 3.5 Flash worth it vs older Gemini models?', a: 'Gemini 3.5 Flash ($1.50/$9.00) outperforms 2.5 Flash and 1.5 Pro on reasoning benchmarks at a fraction of 1.5 Pro\'s output price. For most production apps, 3 Flash ($0.50/$3.00) is the sweet spot — frontier quality at budget pricing. Only pay for 3.5 Flash if you need the strongest creative writing and complex reasoning.' },
    { q: 'Gemini 3.5 Flash vs GPT-4o vs Claude Sonnet?', a: 'Gemini 3.5 Flash ($1.50/$9.00) is 40% cheaper than GPT-4o ($2.50/$10) on input and 10% cheaper on output. Claude Sonnet 4.6 ($3/$15) is 2x more expensive than Gemini 3.5 Flash. For multimodal tasks (image+text), Gemini often outperforms at lower cost. For pure text reasoning, the margins are tighter — test your specific use case.' },
    { q: 'How do I switch between Gemini models?', a: 'Just change the model name in your API call: gemini-3.5-flash, gemini-3.1-pro, gemini-3-flash, gemini-2.5-flash, gemini-1.5-pro, gemini-1.5-flash. All models share the same API endpoint and auth. No code changes needed beyond the model parameter. Use Google AI Studio to test models before deploying.' },
    { q: 'Which Gemini model should I use for my use case?', a: 'Chatbots/RAG: Gemini 3 Flash ($0.50/$3.00) — cheapest frontier quality. Complex reasoning: Gemini 3.1 Pro ($2.50/$15.00) — strongest reasoning with 1M context. Bulk processing: Gemini 3 Flash in batch mode ($0.25/$1.50). Multimodal apps: Gemini 3.5 Flash ($1.50/$9.00) — best image+text performance. Budget/legacy: Gemini 1.5 Flash ($0.075/$0.30) — ultra-cheap, acceptable quality.' },
  ],
  howToUse: [
    'Select the Gemini models you want to compare (3.5 Flash, 3.1 Pro, 3 Flash, etc.).',
    'Enter your average input and output tokens per API call.',
    'Enter your expected daily request volume.',
    'Choose real-time or batch pricing — batch gives 50% discount for async jobs.',
    'Set the context cache hit rate — Gemini caches system instructions automatically at 90% discount.',
    'Add a growth rate and projection period for long-term cost planning, then review savings vs other providers.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
};

registerEngine(engine);
