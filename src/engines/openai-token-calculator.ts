import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

// ============================================================
// Task 1: Updated Model Catalog (14 models, 4 families, June 2026 pricing)
// ============================================================

interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: 'gpt5' | 'gpt41' | 'o-series' | 'legacy';
  contextWindow: string;
  batchInput: number;
  batchOutput: number;
  order: number;
}

const MODELS: Record<string, ModelInfo> = {
  // GPT-5 Family
  'gpt-5.5':       { input: 5.00, output: 30.00, name: 'GPT-5.5',       family: 'gpt5',     contextWindow: '1M',   batchInput: 2.50, batchOutput: 15.00, order: 1 },
  'gpt-5.2':       { input: 1.75, output: 14.00, name: 'GPT-5.2',       family: 'gpt5',     contextWindow: '400K', batchInput: 0.875, batchOutput: 7.00, order: 2 },
  'gpt-5':         { input: 1.25, output: 10.00, name: 'GPT-5',         family: 'gpt5',     contextWindow: '400K', batchInput: 0.625, batchOutput: 5.00, order: 3 },
  'gpt-5-mini':    { input: 0.25, output: 2.00,  name: 'GPT-5 Mini',    family: 'gpt5',     contextWindow: '400K', batchInput: 0.125, batchOutput: 1.00, order: 4 },
  'gpt-5-nano':    { input: 0.05, output: 0.40,  name: 'GPT-5 Nano',    family: 'gpt5',     contextWindow: '400K', batchInput: 0.025, batchOutput: 0.20, order: 5 },

  // GPT-4.1 Family
  'gpt-4.1':       { input: 2.00, output: 8.00,  name: 'GPT-4.1',       family: 'gpt41',    contextWindow: '1M',   batchInput: 1.00, batchOutput: 4.00, order: 6 },
  'gpt-4.1-mini':  { input: 0.40, output: 1.60,  name: 'GPT-4.1 Mini',  family: 'gpt41',    contextWindow: '1M',   batchInput: 0.20, batchOutput: 0.80, order: 7 },
  'gpt-4.1-nano':  { input: 0.10, output: 0.40,  name: 'GPT-4.1 Nano',  family: 'gpt41',    contextWindow: '1M',   batchInput: 0.05, batchOutput: 0.20, order: 8 },

  // o-series
  'o3':            { input: 2.00, output: 8.00,  name: 'o3',            family: 'o-series', contextWindow: '200K', batchInput: 1.00, batchOutput: 4.00, order: 9 },
  'o4-mini':       { input: 1.10, output: 4.40,  name: 'o4 Mini',       family: 'o-series', contextWindow: '200K', batchInput: 0.55, batchOutput: 2.20, order: 10 },

  // Legacy
  'gpt-4o':        { input: 2.50, output: 10.00, name: 'GPT-4o',        family: 'legacy',   contextWindow: '128K', batchInput: 1.25, batchOutput: 5.00, order: 11 },
  'gpt-4o-mini':   { input: 0.15, output: 0.60,  name: 'GPT-4o Mini',   family: 'legacy',   contextWindow: '128K', batchInput: 0.075, batchOutput: 0.30, order: 12 },
  'gpt-4-turbo':   { input: 10.00, output: 30.00, name: 'GPT-4 Turbo',  family: 'legacy',   contextWindow: '128K', batchInput: 5.00, batchOutput: 15.00, order: 13 },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50,  name: 'GPT-3.5 Turbo', family: 'legacy',   contextWindow: '16K',  batchInput: 0.25, batchOutput: 0.75, order: 14 },
};

// Family labels with text — available for UI consumption (e.g. filter dropdowns, legend)
const FAMILY_LABELS: Record<string, string> = {
  gpt5:     '\u{1F535} GPT-5',     // 🔵 GPT-5
  gpt41:    '\u{1F7E2} GPT-4.1',   // 🟢 GPT-4.1
  'o-series': '\u{1F7E0} o-series', // 🟠 o-series
  legacy:   '\u{26AA} Legacy',      // ⚪ Legacy
};

const DEFAULT_SELECTED = ['gpt-5-mini', 'gpt-5.5', 'gpt-4.1'];

// ============================================================
// Task 2: Scenario Presets
// ============================================================

interface Preset {
  label: string;
  emoji: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reqPerDay: number;
}

// Scenario presets for one-click form fill — consumed by the UI layer (page template)
const PRESETS: Preset[] = [
  { label: 'Customer Support Bot', emoji: '\u{1F3A7}', model: 'gpt-5-mini', inputTokens: 800,  outputTokens: 200,  reqPerDay: 500 },
  { label: 'RAG Q&A',              emoji: '\u{1F4DA}', model: 'gpt-4.1',    inputTokens: 3000, outputTokens: 400,  reqPerDay: 200 },
  { label: 'Code Review',          emoji: '\u{1F4BB}', model: 'gpt-5.5',    inputTokens: 5000, outputTokens: 800,  reqPerDay: 50 },
  { label: 'Document Translation', emoji: '\u{1F310}', model: 'gpt-5',      inputTokens: 2000, outputTokens: 1500, reqPerDay: 100 },
  { label: 'Content Generation',   emoji: '\u{270D}\u{FE0F}', model: 'gpt-5.2', inputTokens: 500, outputTokens: 2000, reqPerDay: 100 },
  { label: 'Data Analysis',        emoji: '\u{1F4CA}', model: 'o3',         inputTokens: 4000, outputTokens: 3000, reqPerDay: 30 },
];

// ============================================================
// Task 3: Token Estimator
// ============================================================

// Token estimator using heuristic CJK/English character ratios (±15% accuracy).
// Reference implementation — consumed by the UI token-counter widget (page template).
function estimateTokens(text: string): { inputTokens: number; detectedLang: string } {
  if (!text || !text.trim()) return { inputTokens: 0, detectedLang: 'empty' };
  let cjkChars = 0;
  let otherChars = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3400 && code <= 0x4dbf) ||
      (code >= 0x3040 && code <= 0x309f) ||
      (code >= 0x30a0 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjkChars++;
    } else if (ch.trim()) {
      otherChars++;
    }
  }
  const total = text.length;
  const cjkRatio = cjkChars / Math.max(total, 1);
  const tokens = Math.ceil(cjkChars / 1.5 + otherChars / 4);
  const detectedLang = cjkRatio > 0.4 ? 'zh' : cjkRatio > 0.15 ? 'mixed' : 'en';
  return { inputTokens: tokens, detectedLang };
}

// ============================================================
// Task 4: Rewritten calculate() — 6-section output
// ============================================================

const FAMILY_ICONS: Record<string, string> = {
  gpt5: '\u{1F535}',      // 🔵
  gpt41: '\u{1F7E2}',     // 🟢
  'o-series': '\u{1F7E0}', // 🟠
  legacy: '\u{26AA}',      // ⚪
};

const SEP = '\u{2501}'; // ━ (horizontal line)
const DASH = '\u{2500}'; // ─ (thin horizontal line)

function fmt(n: number): string {
  if (n < 0.01 && n > 0) return '$' + n.toFixed(4);
  return '$' + n.toFixed(2);
}

function lc(n: number): string {
  return n.toLocaleString();
}

function pad(s: string, len: number): string {
  return s + ' '.repeat(Math.max(0, len - s.length));
}

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const selectedKeys = (inputs.models || DEFAULT_SELECTED.join(','))
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const inTokens = parseInt(inputs.inputTokens) || 1000;
  const outTokens = parseInt(inputs.outputTokens) || 500;
  const reqPerDay = parseInt(inputs.requestsPerDay) || 100;
  const pricingMode = inputs.pricingMode === 'batch' ? 'batch' : 'realtime';
  const cacheHitRate = Math.min(100, Math.max(0, parseInt(inputs.cacheHitRate) || 0));
  const growthRate = Math.min(50, Math.max(0, parseFloat(inputs.growthRate) || 0));
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  // --- Compute costs for all 14 models ---
  interface CostEntry {
    key: string;
    info: ModelInfo;
    inputPrice: number;
    outputPrice: number;
    costPerReq: number;
    monthlyCost: number;
  }

  const allCosts: CostEntry[] = [];
  for (const [key, info] of Object.entries(MODELS)) {
    const inputPrice = pricingMode === 'batch' ? info.batchInput : info.input;
    const outputPrice = pricingMode === 'batch' ? info.batchOutput : info.output;
    const costPerReq = (inTokens / 1_000_000) * inputPrice + (outTokens / 1_000_000) * outputPrice;
    const monthlyCost = costPerReq * reqPerDay * 30;
    allCosts.push({ key, info, inputPrice, outputPrice, costPerReq, monthlyCost });
  }

  // Sort by display order (newest model first)
  allCosts.sort((a, b) => a.info.order - b.info.order);
  // Cheapest is still determined by cost, not order
  const cheapest = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  const maxCost = allCosts.reduce((max, c) => c.monthlyCost > max.monthlyCost ? c : max).monthlyCost;

  // Build a lookup for selected models
  const selectedCosts: CostEntry[] = [];
  for (const k of selectedKeys) {
    const entry = allCosts.find((c) => c.key === k);
    if (entry) selectedCosts.push(entry);
  }
  // If nothing resolved, fall back to defaults
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
  const modeEmoji = pricingMode === 'batch' ? '⚡' : '\u{1F534}'; // ⚡ or 🔴
  const modeLabel = pricingMode === 'batch' ? 'Batch Pricing' : 'Real-time Pricing';
  let headerLine = modeEmoji + ' ' + modeLabel;
  if (cacheHitRate > 0) {
    headerLine += ' | \u{1F4BE} ' + cacheHitRate + '% Cache Hit Rate'; // 💾
  }
  out.push(headerLine);
  out.push('');
  out.push(
    '\u{1F4E5} Input: ' + lc(inTokens) + ' tokens/req | ' +
    '\u{1F4E4} Output: ' + lc(outTokens) + ' tokens/req | ' +
    '\u{1F504} ' + lc(reqPerDay) + ' reqs/day',
  );
  out.push('');

  // ================================================================
  // Section 2: Bar Chart — full-model comparison
  // ================================================================
  out.push('\u{1F4CA} Cost Comparison (14 Models)');
  out.push(SEP.repeat(60));
  for (const item of allCosts) {
    const icon = FAMILY_ICONS[item.info.family];
    const label = icon + ' ' + item.info.name;
    const paddedLabel = pad(label, 24);
    const barWidth = maxCost > 0 ? Math.max(1, Math.round((item.monthlyCost / maxCost) * 40)) : 0;
    const bar = '█'.repeat(barWidth); // █
    const isCheapest = item.key === cheapest.key;
    const badge = isCheapest ? ' \u{1F3C6} cheapest' : ''; // 🏆
    out.push(paddedLabel + ' │ ' + bar + ' ' + fmt(item.monthlyCost) + badge);
  }
  out.push(SEP.repeat(60));
  out.push('');

  // ================================================================
  // Section 3: Detail Cards — selected models
  // ================================================================
  out.push('\u{1F4CB} Selected Model Details');
  out.push(SEP.repeat(60));
  for (const item of selectedCosts) {
    const icon = FAMILY_ICONS[item.info.family];
    const dailyCost = item.costPerReq * reqPerDay;
    const monthlyCost = item.monthlyCost;
    const annualCost = monthlyCost * 12;

    out.push(icon + ' ' + item.info.name + ' | Context: ' + item.info.contextWindow + ' tokens');
    out.push(DASH.repeat(44));

    const inputCostLine = (inTokens / 1_000_000) * item.inputPrice;
    const outputCostLine = (outTokens / 1_000_000) * item.outputPrice;
    out.push(
      'Input:  ' + pad(lc(inTokens), 7) + ' tokens × ' + fmt(item.inputPrice) + '/1M → ' + fmt(inputCostLine) + '/req',
    );
    out.push(
      'Output: ' + pad(lc(outTokens), 7) + ' tokens × ' + fmt(item.outputPrice) + '/1M → ' + fmt(outputCostLine) + '/req',
    );
    out.push(DASH.repeat(44));
    out.push('Per request:    ' + fmt(item.costPerReq));
    out.push('Daily (' + reqPerDay + '):    ' + fmt(dailyCost));
    out.push('Monthly (30d):  ' + fmt(monthlyCost));
    out.push('Annual:         ' + fmt(annualCost));
    out.push(DASH.repeat(44));

    // Alternative pricing line
    if (pricingMode === 'realtime') {
      const batchCPR = (inTokens / 1_000_000) * item.info.batchInput + (outTokens / 1_000_000) * item.info.batchOutput;
      const batchMonthly = batchCPR * reqPerDay * 30;
      out.push('\u{1F4A1} Batch pricing: ' + fmt(batchCPR) + '/req (' + fmt(batchMonthly) + '/mo) — save 50%');
    } else {
      const realtimeCPR = (inTokens / 1_000_000) * item.info.input + (outTokens / 1_000_000) * item.info.output;
      const realtimeMonthly = realtimeCPR * reqPerDay * 30;
      out.push('\u{1F534} Real-time: ' + fmt(realtimeCPR) + '/req (' + fmt(realtimeMonthly) + '/mo)');
    }

    // Cache line
    if (cacheHitRate > 0) {
      // Cached input tokens get 50% discount on input pricing
      const effectiveInput =
        item.inputPrice * (1 - cacheHitRate / 100) + item.inputPrice * 0.5 * (cacheHitRate / 100);
      const cachedCPR = (inTokens / 1_000_000) * effectiveInput + (outTokens / 1_000_000) * item.outputPrice;
      const cachedMonthly = cachedCPR * reqPerDay * 30;
      out.push('\u{1F4BE} With ' + cacheHitRate + '% cache hit: ' + fmt(cachedCPR) + '/req (' + fmt(cachedMonthly) + '/mo)');
    }

    out.push('');
  }

  // ================================================================
  // Section 4: Growth Projection (only if growthRate > 0)
  // ================================================================
  if (growthRate > 0) {
    out.push('\u{1F4C8} Growth Projection (' + growthRate + '% monthly)');
    out.push('');

    // Build month list
    const monthList: number[] = [1];
    if (projMonths >= 3) monthList.push(3);
    if (projMonths >= 6) monthList.push(6);
    if (projMonths >= 12) monthList.push(12);
    if (!monthList.includes(projMonths)) monthList.push(projMonths);
    monthList.sort((a, b) => a - b);

    // Header row
    let headerRow = pad('Month', 6);
    for (const item of selectedCosts) {
      headerRow += pad(item.info.name, 13);
    }
    headerRow += pad('Cum. Diff', 12);
    out.push(headerRow);

    // Separator
    let sepRow = DASH.repeat(5) + ' ';
    for (let i = 0; i < selectedCosts.length; i++) {
      sepRow += DASH.repeat(11) + '  ';
    }
    sepRow += DASH.repeat(10);
    out.push(sepRow);

    let cumDiff = 0;

    for (const month of monthList) {
      const growth = Math.pow(1 + growthRate / 100, month - 1);
      const monthCosts = selectedCosts.map((item) => {
        return item.costPerReq * reqPerDay * 30 * growth;
      });
      const minCost = Math.min(...monthCosts);
      const maxC = Math.max(...monthCosts);

      // Cumulative diff: running sum of (most_expensive - cheapest) each period
      cumDiff += maxC - minCost;

      let row = pad(String(month), 6);
      for (const mc of monthCosts) {
        row += pad(fmt(mc), 13);
      }
      row += pad(fmt(cumDiff), 12);
      out.push(row);
    }
    out.push('');
  }

  // ================================================================
  // Section 5: Savings Insights
  // ================================================================
  out.push('\u{1F4B0} Savings Insights');
  out.push(SEP.repeat(60));

  // Cheapest overall
  out.push('\u{1F3C6} Cheapest: ' + cheapest.info.name + ' at ' + fmt(cheapest.monthlyCost) + '/mo');

  // Best value (cheapest non-legacy, non-Nano by cost)
  const bestValue = allCosts
    .filter(c => c.info.family !== 'legacy' && !c.info.name.toLowerCase().includes('nano'))
    .reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min, allCosts[0]);
  if (bestValue) {
    out.push('⭐ Best value (non-legacy, non-Nano): ' + bestValue.info.name + ' at ' + fmt(bestValue.monthlyCost) + '/mo');
  }

  // Switch savings: most expensive selected vs cheapest selected
  if (selectedCosts.length >= 2) {
    const mostExpSelected = selectedCosts.reduce((max, c) => (c.monthlyCost > max.monthlyCost ? c : max));
    const cheapSelected = selectedCosts.reduce((min, c) => (c.monthlyCost < min.monthlyCost ? c : min));
    const diff = mostExpSelected.monthlyCost - cheapSelected.monthlyCost;
    out.push(
      '\u{1F4B8} Switching from ' + mostExpSelected.info.name + ' to ' + cheapSelected.info.name +
      ' saves ' + fmt(diff) + '/mo (' + fmt(diff * 12) + '/yr)',
    );
  }

  // Caching tip
  if (cacheHitRate > 0 && selectedCosts.length > 0) {
    const ref = selectedCosts[0];
    const effectiveInput =
      ref.inputPrice * (1 - cacheHitRate / 100) + ref.inputPrice * 0.5 * (cacheHitRate / 100);
    const cachedCPR = (inTokens / 1_000_000) * effectiveInput + (outTokens / 1_000_000) * ref.outputPrice;
    const cachedMonthly = cachedCPR * reqPerDay * 30;
    const cacheSaving = ref.monthlyCost - cachedMonthly;
    out.push(
      '\u{1F4BE} Prompt caching at ' + cacheHitRate + '% hit rate saves ~' +
      fmt(cacheSaving) + '/mo on ' + ref.info.name,
    );
  }

  out.push('');

  // ================================================================
  // Section 6: Usage Scenarios Table
  // ================================================================
  out.push('\u{1F4C5} Usage Scenarios (monthly costs)');
  out.push(SEP.repeat(60));

  // Header row
  let usageHeader = pad('Reqs/Day', 10);
  for (const item of selectedCosts) {
    usageHeader += pad(item.info.name, 13);
  }
  out.push(usageHeader);

  // Separator
  let usageSep = DASH.repeat(8) + '  ';
  for (let i = 0; i < selectedCosts.length; i++) {
    usageSep += DASH.repeat(11) + '  ';
  }
  out.push(usageSep);

  const scenarioVolumes = [50, 100, 500, 1000, 5000, 10000];
  for (const vol of scenarioVolumes) {
    let row = pad(lc(vol), 10);
    for (const item of selectedCosts) {
      const mc = item.costPerReq * vol * 30;
      row += pad(fmt(mc), 13);
    }
    out.push(row);
  }

  return out;
}

// ============================================================
// Task 5: customFn — minified JS producing identical output
// ============================================================

const customFn =
  // Model data: full keys matching MODELS constant → {i,o,f,c,bi,bo,n}
  "var M={};" +
  "M['gpt-5.5']={i:5,o:30,f:'g5',c:'1M',bi:2.5,bo:15,n:'GPT-5.5',od:1};" +
  "M['gpt-5.2']={i:1.75,o:14,f:'g5',c:'400K',bi:0.875,bo:7,n:'GPT-5.2',od:2};" +
  "M['gpt-5']={i:1.25,o:10,f:'g5',c:'400K',bi:0.625,bo:5,n:'GPT-5',od:3};" +
  "M['gpt-5-mini']={i:0.25,o:2,f:'g5',c:'400K',bi:0.125,bo:1,n:'GPT-5 Mini',od:4};" +
  "M['gpt-5-nano']={i:0.05,o:0.4,f:'g5',c:'400K',bi:0.025,bo:0.2,n:'GPT-5 Nano',od:5};" +
  "M['gpt-4.1']={i:2,o:8,f:'g41',c:'1M',bi:1,bo:4,n:'GPT-4.1',od:6};" +
  "M['gpt-4.1-mini']={i:0.4,o:1.6,f:'g41',c:'1M',bi:0.2,bo:0.8,n:'GPT-4.1 Mini',od:7};" +
  "M['gpt-4.1-nano']={i:0.1,o:0.4,f:'g41',c:'1M',bi:0.05,bo:0.2,n:'GPT-4.1 Nano',od:8};" +
  "M['o3']={i:2,o:8,f:'os',c:'200K',bi:1,bo:4,n:'o3',od:9};" +
  "M['o4-mini']={i:1.1,o:4.4,f:'os',c:'200K',bi:0.55,bo:2.2,n:'o4 Mini',od:10};" +
  "M['gpt-4o']={i:2.5,o:10,f:'lg',c:'128K',bi:1.25,bo:5,n:'GPT-4o',od:11};" +
  "M['gpt-4o-mini']={i:0.15,o:0.6,f:'lg',c:'128K',bi:0.075,bo:0.3,n:'GPT-4o Mini',od:12};" +
  "M['gpt-4-turbo']={i:10,o:30,f:'lg',c:'128K',bi:5,bo:15,n:'GPT-4 Turbo',od:13};" +
  "M['gpt-3.5-turbo']={i:0.5,o:1.5,f:'lg',c:'16K',bi:0.25,bo:0.75,n:'GPT-3.5 Turbo',od:14};" +
  // Family icons
  "var FI={g5:'\\uD83D\\uDD35',g41:'\\uD83D\\uDFE2',os:'\\uD83D\\uDFE0',lg:'\\u26AA'};" +
  // Default selected (full keys matching MODELS)
  "var DS=['gpt-5-mini','gpt-5.5','gpt-4.1'];" +
  // Helpers
  "function fm(n){return (n<0.01&&n>0?'$'+n.toFixed(4):'$'+n.toFixed(2))}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,n){return s+Array(Math.max(0,n-s.length+1)).join(' ')}" +
  // Parse inputs
  "var SK=(inputs.models||DS.join(',')).split(',').map(function(s){return s.trim()}).filter(Boolean);" +
  "var it=parseInt(inputs.inputTokens)||1000;" +
  "var ot=parseInt(inputs.outputTokens)||500;" +
  "var rd=parseInt(inputs.requestsPerDay)||100;" +
  "var pm=inputs.pricingMode==='batch'?'batch':'realtime';" +
  "var chr=Math.min(100,Math.max(0,parseInt(inputs.cacheHitRate)||0));" +
  "var gr=Math.min(50,Math.max(0,parseFloat(inputs.growthRate)||0));" +
  "var pRM=parseInt(inputs.projectionMonths);var pM=[3,6,12].indexOf(pRM)>=0?pRM:12;" +
  // Compute all model costs
  "var AC=[];var ks=Object.keys(M);for(var i=0;i<ks.length;i++){" +
  "var k=ks[i];var m=M[k];" +
  "var ip=pm==='batch'?m.bi:m.i;var op=pm==='batch'?m.bo:m.o;" +
  "var cpr=(it/1e6)*ip+(ot/1e6)*op;var mc=cpr*rd*30;" +
  "AC.push({k:k,m:m,ip:ip,op:op,cpr:cpr,mc:mc});}" +
  "AC.sort(function(a,b){return a.m.od-b.m.od});" +
  "var ch=AC.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var maxC=AC.reduce(function(max,c){return c.mc>max.mc?c:max;}).mc;" +
  // Selected costs
  "var SC=[];for(var i=0;i<SK.length;i++){" +
  "var f=AC.find(function(c){return c.k===SK[i]});if(f)SC.push(f);}" +
  "if(SC.length===0){for(var i=0;i<DS.length;i++){" +
  "var f=AC.find(function(c){return c.k===DS[i]});if(f)SC.push(f);}}" +
  // Output
  "var r=[];" +
  // Section 1: Header
  "var me=pm==='batch'?'\\u26A1':'\\uD83D\\uDD34';" +
  "var ml=pm==='batch'?'Batch Pricing':'Real-time Pricing';" +
  "var hl=me+' '+ml;" +
  "if(chr>0){hl+=' | \\uD83D\\uDCBE '+chr+'% Cache Hit Rate';}" +
  "r.push(hl);r.push('');" +
  "r.push('\\uD83D\\uDCE5 Input: '+lc(it)+' tokens/req | \\uD83D\\uDCE4 Output: '+lc(ot)+' tokens/req | \\uD83D\\uDD04 '+lc(rd)+' reqs/day');" +
  "r.push('');" +
  // Section 2: Bar Chart
  "r.push('\\uD83D\\uDCCA Cost Comparison (14 Models)');" +
  "r.push(Array(61).join('\\u2501'));" +
  "for(var i=0;i<AC.length;i++){" +
  "var itm=AC[i];var ic=FI[itm.m.f];var lb=ic+' '+itm.m.n;" +
  "var pl=pd(lb,24);var bw=maxC>0?Math.max(1,Math.round((itm.mc/maxC)*40)):0;" +
  "var br=Array(bw+1).join('\\u2588');" +
  "var bd=itm.k===ch.k?' \\uD83C\\uDFC6 cheapest':'';" +
  "r.push(pl+' \\u2502 '+br+' '+fm(itm.mc)+bd);}" +
  "r.push(Array(61).join('\\u2501'));r.push('');" +
  // Section 3: Detail Cards
  "r.push('\\uD83D\\uDCCB Selected Model Details');" +
  "r.push(Array(61).join('\\u2501'));" +
  "for(var i=0;i<SC.length;i++){" +
  "var itm=SC[i];var ic=FI[itm.m.f];var dc=itm.cpr*rd;var am=itm.mc*12;" +
  "r.push(ic+' '+itm.m.n+' | Context: '+itm.m.c+' tokens');" +
  "r.push(Array(45).join('\\u2500'));" +
  "var icl=(it/1e6)*itm.ip;var ocl=(ot/1e6)*itm.op;" +
  "r.push('Input:  '+pd(lc(it),7)+' tokens \\u00d7 '+fm(itm.ip)+'/1M \\u2192 '+fm(icl)+'/req');" +
  "r.push('Output: '+pd(lc(ot),7)+' tokens \\u00d7 '+fm(itm.op)+'/1M \\u2192 '+fm(ocl)+'/req');" +
  "r.push(Array(45).join('\\u2500'));" +
  "r.push('Per request:    '+fm(itm.cpr));" +
  "r.push('Daily ('+rd+'):    '+fm(dc));" +
  "r.push('Monthly (30d):  '+fm(itm.mc));" +
  "r.push('Annual:         '+fm(am));" +
  "r.push(Array(45).join('\\u2500'));" +
  // Alt pricing
  "if(pm==='realtime'){" +
  "var bcpr=(it/1e6)*itm.m.bi+(ot/1e6)*itm.m.bo;var bm=bcpr*rd*30;" +
  "r.push('\\uD83D\\uDCA1 Batch pricing: '+fm(bcpr)+'/req ('+fm(bm)+'/mo) \\u2014 save 50%');}" +
  "else{" +
  "var rcpr=(it/1e6)*itm.m.i+(ot/1e6)*itm.m.o;var rm=rcpr*rd*30;" +
  "r.push('\\uD83D\\uDD34 Real-time: '+fm(rcpr)+'/req ('+fm(rm)+'/mo)');}" +
  // Cache line
  "if(chr>0){" +
  "var ei=itm.ip*(1-chr/100)+itm.ip*0.5*(chr/100);" +
  "var ccpr=(it/1e6)*ei+(ot/1e6)*itm.op;var cm=ccpr*rd*30;" +
  "r.push('\\uD83D\\uDCBE With '+chr+'% cache hit: '+fm(ccpr)+'/req ('+fm(cm)+'/mo)');}" +
  "r.push('');}" +
  // Section 4: Growth Projection
  "if(gr>0){" +
  "r.push('\\uD83D\\uDCC8 Growth Projection ('+gr+'% monthly)');r.push('');" +
  "var mL=[1];if(pM>=3)mL.push(3);if(pM>=6)mL.push(6);if(pM>=12)mL.push(12);" +
  "if(mL.indexOf(pM)<0)mL.push(pM);mL.sort(function(a,b){return a-b;});" +
  "var hdr=pd('Month',6);for(var i=0;i<SC.length;i++){hdr+=pd(SC[i].m.n,13);}" +
  "hdr+=pd('Cum. Diff',12);r.push(hdr);" +
  "var sr=Array(6).join('\\u2500')+' ';" +
  "for(var i=0;i<SC.length;i++){sr+=Array(12).join('\\u2500')+'  ';}" +
  "sr+=Array(11).join('\\u2500');r.push(sr);" +
  "var cd=0;" +
  "for(var mi=0;mi<mL.length;mi++){" +
  "var mn=mL[mi];var g=Math.pow(1+gr/100,mn-1);" +
  "var mcs=[];for(var j=0;j<SC.length;j++){mcs.push(SC[j].cpr*rd*30*g);}" +
  "var minC=Math.min.apply(null,mcs);var maxCM=Math.max.apply(null,mcs);" +
  "cd+=maxCM-minC;" +
  "var row=pd(String(mn),6);" +
  "for(var j=0;j<mcs.length;j++){row+=pd(fm(mcs[j]),13);}" +
  "row+=pd(fm(cd),12);r.push(row);}" +
  "r.push('');}" +
  // Section 5: Savings Insights
  "r.push('\\uD83D\\uDCB0 Savings Insights');" +
  "r.push(Array(61).join('\\u2501'));" +
  "r.push('\\uD83C\\uDFC6 Cheapest: '+ch.m.n+' at '+fm(ch.mc)+'/mo');" +
  "var flt=AC.filter(function(c){return c.m.f!=='lg'&&c.m.n.toLowerCase().indexOf('nano')<0;});" +
  "var bv=flt.length>0?flt.reduce(function(mn,c){return c.mc<mn.mc?c:mn;}):null;" +
  "if(bv){r.push('\\u2B50 Best value (non-legacy, non-Nano): '+bv.m.n+' at '+fm(bv.mc)+'/mo');}" +
  "if(SC.length>=2){" +
  "var meS=SC.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "var chS=SC.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var df=meS.mc-chS.mc;" +
  "r.push('\\uD83D\\uDCB8 Switching from '+meS.m.n+' to '+chS.m.n+' saves '+fm(df)+'/mo ('+fm(df*12)+'/yr)');}" +
  "if(chr>0&&SC.length>0){" +
  "var ref=SC[0];" +
  "var ei=ref.ip*(1-chr/100)+ref.ip*0.5*(chr/100);" +
  "var ccpr=(it/1e6)*ei+(ot/1e6)*ref.op;var cm=ccpr*rd*30;" +
  "var cs2=ref.mc-cm;" +
  "r.push('\\uD83D\\uDCBE Prompt caching at '+chr+'% hit rate saves ~'+fm(cs2)+'/mo on '+ref.m.n);}" +
  "r.push('');" +
  // Section 6: Usage Scenarios
  "r.push('\\uD83D\\uDCC5 Usage Scenarios (monthly costs)');" +
  "r.push(Array(61).join('\\u2501'));" +
  "var uh=pd('Reqs/Day',10);for(var i=0;i<SC.length;i++){uh+=pd(SC[i].m.n,13);}r.push(uh);" +
  "var us=Array(9).join('\\u2500')+'  ';" +
  "for(var i=0;i<SC.length;i++){us+=Array(12).join('\\u2500')+'  ';}r.push(us);" +
  "var sv=[50,100,500,1000,5000,10000];" +
  "for(var i=0;i<sv.length;i++){" +
  "var v=sv[i];var row=pd(lc(v),10);" +
  "for(var j=0;j<SC.length;j++){row+=pd(fm(SC[j].cpr*v*30),13);}" +
  "r.push(row);}" +
  "return r;";

// ============================================================
// Task 6: Updated Engine Metadata
// ============================================================

const engine: ToolEngine = {
  slug: 'solopreneur-openai-token-calculator',
  title: 'OpenAI Token Calculator',
  description:
    'Compare OpenAI API costs across 14 models — GPT-5.5 to GPT-5 Nano, GPT-4.1 family, and o-series. Toggle batch pricing, prompt caching, and growth projections.',
  category: 'B',
  inputs: [
    { name: 'models', label: 'Models (comma-separated)', placeholder: 'gpt-5-mini,gpt-5.5,gpt-4.1', type: 'text' },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
    { name: 'cacheHitRate', label: 'Cache Hit Rate (%)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'projectionMonths', label: 'Projection Period (months)', placeholder: '', type: 'select', options: ['3', '6', '12'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) {
    return calculate(inputs);
  },
  staticExamples: [
    `🔴 Real-time Pricing

📥 Input: 1,000 tokens/req | 📤 Output: 500 tokens/req | 🔄 100 reqs/day

📊 Cost Comparison (14 Models)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 GPT-5.5               │ ████████████████████████████████ $60.00
🔵 GPT-5.2               │ ██████████████ $26.25
🔵 GPT-5                 │ ██████████ $18.75
🔵 GPT-5 Mini            │ ██ $3.75
🔵 GPT-5 Nano            │ █ $0.75 🏆 cheapest
🟢 GPT-4.1               │ ██████████ $18.00
🟢 GPT-4.1 Mini          │ ██ $3.60
🟢 GPT-4.1 Nano          │ █ $0.90
🟠 o3                    │ ██████████ $18.00
🟠 o4 Mini               │ █████ $9.90
⚪ GPT-4o                 │ ████████████ $22.50
⚪ GPT-4o Mini            │ █ $1.35
⚪ GPT-4 Turbo            │ ████████████████████████████████████████ $75.00
⚪ GPT-3.5 Turbo          │ ██ $3.75
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📋 Selected Model Details
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔵 GPT-5 Mini | Context: 400K tokens
────────────────────────────────────────────
Input:  1,000   tokens × $0.25/1M → $0.0003/req
Output: 500     tokens × $2.00/1M → $0.0010/req
────────────────────────────────────────────
Per request:    $0.0013
Daily (100):    $0.13
Monthly (30d):  $3.75
Annual:         $45.00
────────────────────────────────────────────
💡 Batch pricing: $0.0006/req ($1.88/mo) — save 50%

🔵 GPT-5.5 | Context: 1M tokens
────────────────────────────────────────────
Input:  1,000   tokens × $5.00/1M → $0.0050/req
Output: 500     tokens × $30.00/1M → $0.0150/req
────────────────────────────────────────────
Per request:    $0.0200
Daily (100):    $2.00
Monthly (30d):  $60.00
Annual:         $720.00
────────────────────────────────────────────
💡 Batch pricing: $0.0100/req ($30.00/mo) — save 50%

🟢 GPT-4.1 | Context: 1M tokens
────────────────────────────────────────────
Input:  1,000   tokens × $2.00/1M → $0.0020/req
Output: 500     tokens × $8.00/1M → $0.0040/req
────────────────────────────────────────────
Per request:    $0.0060
Daily (100):    $0.60
Monthly (30d):  $18.00
Annual:         $216.00
────────────────────────────────────────────
💡 Batch pricing: $0.0030/req ($9.00/mo) — save 50%

💰 Savings Insights
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🏆 Cheapest: GPT-5 Nano at $0.75/mo
⭐ Best value (non-legacy, non-Nano): GPT-4.1 Mini at $3.60/mo
💸 Switching from GPT-5.5 to GPT-5 Mini saves $56.25/mo ($675.00/yr)

📅 Usage Scenarios (monthly costs)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Reqs/Day  GPT-5 Mini   GPT-5.5      GPT-4.1
────────  ───────────  ───────────  ───────────
50        $1.88        $30.00       $9.00
100       $3.75        $60.00       $18.00
500       $18.75       $300.00      $90.00
1,000     $37.50       $600.00      $180.00
5,000     $187.50      $3000.00     $900.00
10,000    $375.00      $6000.00     $1800.00`,
  ],
  faq: [
    {
      q: 'How do I estimate token counts for my prompts?',
      a: 'Roughly 1 token = 0.75 English words (4 characters). For CJK languages (Chinese, Japanese, Korean), 1 character ~= 1.5 tokens. A 1000-word English article uses ~1,300 tokens. Use OpenAI’s tiktoken library or the Tokenizer page for precise counts. This calculator includes a built-in estimateTokens() utility that detects language and estimates token counts from raw text.',
    },
    {
      q: 'Which model is cheapest?',
      a: 'GPT-5 Nano is the cheapest at $0.05/$0.40 per 1M input/output tokens. For simple classification, summarization, and high-volume Q&A, it can be 100x cheaper than GPT-5.5. GPT-4.1 Nano ($0.10/$0.40) is also excellent for budget workloads with a 1M context window.',
    },
    {
      q: 'How can I reduce my API costs?',
      a: '(1) Use batch pricing for non-urgent workloads — 50% discount. (2) Enable prompt caching — cached input tokens cost 50% less; reuse system prompts and long context prefixes. (3) Route simple queries to cheaper models (GPT-5 Nano, GPT-4.1 Nano). (4) Limit output tokens with max_tokens. (5) Compress long prompts and prune conversation history.',
    },
    {
      q: 'What is the difference between batch and real-time pricing?',
      a: 'Batch API processes jobs asynchronously with a 24-hour turnaround window at 50% of real-time pricing. Ideal for evaluation, classification, embedding, and non-interactive workloads. Real-time API is for chat, copilots, and interactive apps where latency matters. Both use the same token pricing structure.',
    },
    {
      q: 'When should I use GPT-4.1 vs GPT-5?',
      a: 'GPT-4.1 family offers 1M-token context windows at competitive prices — ideal for long-document analysis, full-codebase reviews, and large knowledge-base RAG. GPT-5 family has stronger reasoning and instruction-following. For most cost-sensitive production, GPT-5 Mini hits the sweet spot; for maximum context at low cost, GPT-4.1 Nano is compelling.',
    },
    {
      q: 'What is the o-series and when should I use it?',
      a: 'The o-series (o3, o4 Mini) are reasoning models optimized for multi-step logic, math, coding, and scientific analysis. They "think" before responding, using more output tokens but producing higher-quality results for complex tasks. Use o3 for hard reasoning; o4 Mini for cost-effective reasoning workloads. For simple Q&A or chat, GPT-5 or GPT-4.1 models are more cost-effective.',
    },
    {
      q: 'How does prompt caching work and how much can it save?',
      a: 'OpenAI automatically caches prompt prefixes longer than 1024 tokens. Cached input tokens cost 50% less. Structure your prompts with a long, static system message or knowledge base at the beginning, and vary only the user query at the end. At 50% cache hit rate, input costs drop by 25%. At 80% hit rate, input costs drop by 40%. This calculator lets you model different cache hit rates to see the savings.',
    },
  ],
  howToUse: [
    'Enter the model keys you want to compare (comma-separated, e.g. "gpt-5-mini,gpt-5.5,gpt-4.1"). Leave default for the recommended comparison set.',
    'Enter your average input and output tokens per request. Use the estimateTokens() utility or OpenAI’s Tokenizer to gauge your prompt sizes.',
    'Set your daily request volume and choose real-time or batch pricing mode. Batch mode cuts all costs by 50% instantly.',
    'Optionally set a cache hit rate (0-100%) to model prompt caching savings, and a monthly growth rate (0-50%) to project future costs.',
    'Review the detail cards for each selected model — compare per-request, daily, monthly, and annual costs at a glance.',
    'Use the Usage Scenarios table to see how costs scale from 50 to 10,000 requests/day, and check Savings Insights for the cheapest and best-value recommendations.',
  ],
};

registerEngine(engine);
