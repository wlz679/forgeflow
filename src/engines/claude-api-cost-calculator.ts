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

const customFn =
  // --- MODELS map (full keys, MUST match TS MODELS) ---
  "var M={" +
  "'claude-fable-5':{i:10,o:50,n:'Claude Fable 5',f:'mythos',cw:'1M',mo:'128K',bi:5,bo:25,od:1}," +
  "'claude-opus-4-8':{i:5,o:25,n:'Claude Opus 4.8',f:'claude4x',cw:'1M',mo:'128K',bi:2.5,bo:12.5,od:2}," +
  "'claude-sonnet-4-6':{i:3,o:15,n:'Claude Sonnet 4.6',f:'claude4x',cw:'1M',mo:'64K',bi:1.5,bo:7.5,od:3}," +
  "'claude-haiku-4-5':{i:1,o:5,n:'Claude Haiku 4.5',f:'claude4x',cw:'200K',mo:'64K',bi:0.5,bo:2.5,od:4}," +
  "'claude-opus-4-1':{i:15,o:75,n:'Claude Opus 4.1',f:'legacy',cw:'200K',mo:'32K',bi:7.5,bo:37.5,od:5}," +
  "'claude-haiku-3-5':{i:0.8,o:4,n:'Claude Haiku 3.5',f:'legacy',cw:'200K',mo:'8K',bi:0.4,bo:2,od:6}," +
  "'claude-haiku-3':{i:0.25,o:1.25,n:'Claude Haiku 3',f:'legacy',cw:'200K',mo:'4K',bi:0.125,bo:0.625,od:7}" +
  "};" +
  // Family icons
  "var FI={mythos:'\\u2726',claude4x:'\\u25B2',legacy:'\\u25C6'};" +
  "var FL={mythos:'Mythos',claude4x:'Claude 4.x',legacy:'Legacy'};" +
  // Defaults
  "var DEF=['claude-fable-5','claude-opus-4-8','claude-sonnet-4-6','claude-haiku-4-5'];" +
  // Caching constants
  "var CWM={};CWM['5min']=1.25;CWM['1hour']=2;" +
  "var CRM=0.1;" +
  // Cross-provider
  "var XP={openai:{i:0.05,o:0.4,n:'GPT-5 Nano'},deepseek:{i:0.14,o:0.28,n:'DeepSeek Chat'},gemini:{i:0.075,o:0.3,n:'Gemini 1.5 Flash'}};" +
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
  "var cTTL=inputs.cacheTTL==='1hour'?'1hour':'5min';" +
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
  "var me=pm==='batch'?'\\u26A1':'\\u{1F534}';" +
  "var ml=pm==='batch'?'Batch Pricing (50% off)':'Real-time Pricing';" +
  "var hl=me+' '+ml;" +
  "if(cacheOn){var tl=cTTL==='1hour'?'1-hour TTL':'5-min TTL';hl+=' | \\u{1F4BE} Cache: '+cHR+'% hit ('+tl+')';}" +
  "o.push(hl);o.push('');" +
  "o.push('\\u{1F4E5} Input: '+lc(iT)+' tokens/req | \\u{1F4E4} Output: '+lc(oT)+' tokens/req | \\u{1F504} '+lc(rpd)+' reqs/day');" +
  "if(cacheOn){o.push('\\u{1F4BE} Cache Write: '+lc(cwT)+' tokens/req ('+(wM===1.25?'1.25\\u00D7':'2\\u00D7')+' write, 0.1\\u00D7 read)');}" +
  "o.push('');" +
  // Section 2: Bar Chart
  "o.push('Cost Comparison ('+lc(rpd)+' reqs/day)');" +
  "o.push(SEP.repeat(54));" +
  "var BW=40;" +
  "for(var i=0;i<all.length;i++){" +
  "var c=all[i];var icon=FI[c.i.f];var label=icon+' '+c.i.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;" +
  "var bc=c.k===ch.k?'\\u2591':'\\u2588';var bar=bc.repeat(bl);" +
  "o.push(pd(label,26)+' '+pd(bar,BW)+' '+fm(c.mc));" +
  "}" +
  "o.push('');" +
  // Section 3: Detail Cards
  "for(var i=0;i<sc.length;i++){" +
  "var c=sc[i];var icon=FI[c.i.f];var fl=FL[c.i.f];" +
  "o.push(icon+' '+c.i.n+' ('+fl+')');" +
  "o.push('  Context: '+c.i.cw+' | Max Output: '+c.i.mo);" +
  "o.push('  Rate: '+fm(c.i.i)+'/'+fm(c.i.o)+' per 1M tokens');" +
  "o.push('  Per Request: '+fm(c.cpr));" +
  "o.push('  Monthly Cost ('+lc(rpd)+' reqs/day): '+fm(c.mc));" +
  "if(cacheOn){var sv=c.ncm-c.mc;var ps=c.ncm>0?Math.round((sv/c.ncm)*100):0;var sg=sv>=0?'saved':'extra';o.push('  \\u{1F4BE} With caching: '+fm(c.mc)+' ('+ps+'% '+sg+')');}" +
  "o.push('');" +
  "}" +
  // Section 4: Caching Breakdown
  "if(cacheOn){" +
  "var ref=ch;var ip=ref.ip;var tl2=cTTL==='1hour'?'1-hour TTL':'5-min TTL';var wl=wM===1.25?'1.25\\u00D7':'2\\u00D7';" +
  "o.push('\\u{1F4BE} Prompt Caching Breakdown ('+tl2+' \\u00d7 '+wl+' write)');" +
  "o.push(SEP.repeat(54));" +
  "var ccw=(cwT/1e6)*ip*wM;var cmc2=(1-hR)*ccw;var chc2=hR*(cwT/1e6)*ip*CRM;" +
  "var nci2=((iT-cwT)/1e6)*ip;var bi2=nci2+cmc2+chc2;var nci3=(iT/1e6)*ip;" +
  "o.push('  Model: '+ref.i.n+' (cheapest)');" +
  "o.push('  Cache Write (per miss): '+fm(ccw)+'/req');" +
  "o.push('  Cache Miss Cost: '+fm(cmc2)+'/req ('+Math.round((1-hR)*100)+'% of requests)');" +
  "o.push('  Cache Hit Cost: '+fm(chc2)+'/req ('+Math.round(hR*100)+'% of requests)');" +
  "o.push('  Non-Cached Input: '+fm(nci2)+'/req');" +
  "o.push('  Blended Input Cost: '+fm(bi2)+'/req');" +
  "o.push('  vs without caching: '+fm(nci3)+'/req \\u2192 saves '+fm(nci3-bi2)+'/req');" +
  "o.push('  Monthly Savings: '+fm((nci3-bi2)*rpm));" +
  "o.push('  Break-even: ~2 cache reads (5-min) / ~2 reads (1-hour)');" +
  "o.push('');" +
  "}" +
  // Section 5: Growth Projection
  "if(gR>0){" +
  "o.push('\\u{1F4C8} Growth Projection ('+gR+'%/month, '+pM+' months)');o.push('');" +
  "var hdr='Month'.padEnd(8);for(var i=0;i<sc.length;i++)hdr+=' | '+sc[i].i.n.padEnd(14);o.push(hdr);" +
  "var sl=''.padEnd(8,SEP);for(var i=0;i<sc.length;i++)sl+='-+-'.padEnd(15,SEP);o.push(sl);" +
  "var gm=1+gR/100;" +
  "for(var m=1;m<=pM;m++){var mult=Math.pow(gm,m-1);var row=String(m).padEnd(8);for(var i=0;i<sc.length;i++)row+=' | '+fm(sc[i].mc*mult).padEnd(14);o.push(row);}" +
  "o.push(sl);" +
  "var tr='Total'.padEnd(8);for(var i=0;i<sc.length;i++){var cum=0;for(var m=1;m<=pM;m++)cum+=sc[i].mc*Math.pow(gm,m-1);tr+=' | '+fm(cum).padEnd(14);}o.push(tr);" +
  "o.push('');" +
  "}" +
  // Section 6: Savings Insights
  "o.push('\\u{1F4B0} Savings Insights');" +
  "o.push(SEP.repeat(54));" +
  "var cheapestC=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "for(var pk in XP){var pv=XP[pk];var pcpr=(iT/1e6)*pv.i+(oT/1e6)*pv.o;var pm2=pcpr*rpm;var d=cheapestC.mc-pm2;var pct=pm2>0?Math.abs(d)/pm2*100:0;" +
  "if(d>0){o.push('  '+cheapestC.i.n+' vs '+pv.n+': Claude costs '+fm(d)+' more/month ('+Math.round(pct)+'% premium)');}" +
  "else{o.push('  '+cheapestC.i.n+' vs '+pv.n+': Claude saves '+fm(Math.abs(d))+'/month ('+Math.round(pct)+'% cheaper)');}" +
  "}" +
  "o.push('\\u{1F4A1} Premium buys: 1M context, best-in-class safety, superior code generation');" +
  "o.push('');" +
  // Section 7: Usage Scenarios
  "o.push('\\u{1F4CA} Usage Scenarios (monthly cost at '+lc(rpd)+' reqs/day)');" +
  "o.push('');" +
  "var vols=[50,100,500,1000,5000,10000];" +
  "for(var i=0;i<sc.length;i++){" +
  "var c=sc[i];var icon=FI[c.i.f];var line=icon+' '+c.i.n+' ('+FL[c.i.f]+'): ';var pts=[];" +
  "for(var j=0;j<vols.length;j++){pts.push(lc(vols[j])+'\\u2192'+fm(c.cpr*vols[j]*30));}" +
  "line+=pts.join(' \\u00b7 ');o.push(line);" +
  "}" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-claude-api-cost-calculator',
  title: 'Claude API Cost Calculator',
  description: 'Calculate Claude API costs for Fable 5, Opus 4.8, Sonnet 4.6, Haiku 4.5, and legacy models. Includes Prompt Caching, batch pricing, growth projections, and cross-provider comparison.',
  category: 'B',
  inputs: [
    { name: 'models', label: 'Models', placeholder: 'claude-fable-5,claude-opus-4-8,claude-sonnet-4-6,claude-haiku-4-5', type: 'text' },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
    { name: 'cacheWriteTokens', label: 'Cache Write Tokens', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'cacheTTL', label: 'Cache TTL', placeholder: '', type: 'select', options: ['5min', '1hour'] },
    { name: 'cacheReadHitRate', label: 'Cache Read Hit Rate (%)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🔴 Real-time Pricing\n' +
    '\n' +
    '📥 Input: 1,000 tokens/req | 📤 Output: 500 tokens/req | 🔄 100 reqs/day\n' +
    '\n' +
    'Cost Comparison (100 reqs/day)\n' +
    '──────────────────────────────────────────────────────\n' +
    '✦ Claude Fable 5           ███████████████████████████              $105.00\n' +
    '▲ Claude Opus 4.8          █████████████                            $52.50\n' +
    '▲ Claude Sonnet 4.6        ████████                                 $31.50\n' +
    '▲ Claude Haiku 4.5         ███                                      $10.50\n' +
    '◆ Claude Opus 4.1          ████████████████████████████████████████ $157.50\n' +
    '◆ Claude Haiku 3.5         ██                                       $8.40\n' +
    '◆ Claude Haiku 3           ░                                        $2.63\n',
    '✦ Claude Fable 5 (Mythos): 50→$52.50 · 100→$105.00 · 500→$525.00 · 1,000→$1050.00 · 5,000→$5250.00 · 10,000→$10500.00',
    '▲ Claude Opus 4.8 (Claude 4.x): 50→$26.25 · 100→$52.50 · 500→$262.50 · 1,000→$525.00 · 5,000→$2625.00 · 10,000→$5250.00',
    '▲ Claude Sonnet 4.6 (Claude 4.x): 50→$15.75 · 100→$31.50 · 500→$157.50 · 1,000→$315.00 · 5,000→$1575.00 · 10,000→$3150.00',
    '▲ Claude Haiku 4.5 (Claude 4.x): 50→$5.25 · 100→$10.50 · 500→$52.50 · 1,000→$105.00 · 5,000→$525.00 · 10,000→$1050.00',
  ],
  faq: [
    {
      q: 'How does Claude pricing compare to GPT-4o?',
      a: 'Claude Opus 4.8 at $5/$25 per 1M tokens is 2× more expensive than GPT-4o ($2.50/$10) but offers a 1M context window and stronger safety. Claude Haiku 4.5 at $1/$5 is competitive with GPT-4o Mini ($0.15/$0.60). Claude Fable 5 at $10/$50 is Anthropic\'s most capable model, comparable to o3-level reasoning.',
    },
    {
      q: 'What is Prompt Caching and how much can it save?',
      a: 'Claude\'s Prompt Caching lets you mark parts of your prompt as cacheable. Cache reads cost 10% of the standard input price (90% discount). Cache writes cost 1.25× (5-min TTL) or 2× (1-hour TTL). A 50K-token system prompt at 500 reqs/day can save ~$24,500/year. Break-even is just 2 cache reads for 5-min TTL.',
    },
    {
      q: 'When should I use Batch API vs Real-time?',
      a: 'Batch API gives 50% off all token costs across all models. Use it for async workloads that can tolerate up to 24-hour processing time — data labeling, bulk analysis, content generation. Real-time is for interactive use cases. You can mix both: batch for large offline jobs, real-time for user-facing requests.',
    },
    {
      q: 'Is Claude Fable 5 worth the premium?',
      a: 'Fable 5 at $10/$50 is 2× Opus 4.8 pricing but delivers Mythos-class performance (~95% on SWE-bench Verified). It\'s worth it for: frontier coding tasks, multi-day autonomous agent runs, complex research requiring deepest reasoning. For everyday tasks, Opus 4.8 or Sonnet 4.6 offer better value.',
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
  ],
  howToUse: [
    'Select the Claude models you want to compare (Fable 5, Opus 4.8, Sonnet 4.6, etc.).',
    'Enter your average input and output tokens per API call.',
    'Choose pricing mode — Real-time for interactive use, Batch for 50% off async processing.',
    'Configure Prompt Caching (write tokens, TTL, hit rate) to see potential savings from caching.',
    'Set growth rate and projection period for long-term cost planning.',
    'Review the cost comparison bar chart, caching breakdown, and cross-provider insights.',
  ],
};

registerEngine(engine);