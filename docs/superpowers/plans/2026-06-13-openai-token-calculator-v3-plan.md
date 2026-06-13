# OpenAI Token Calculator v3 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deep upgrade the OpenAI Token Calculator from a basic 4-model cost estimator to a 14-model comparison tool with batch/caching toggles, scenario presets, unicode bar charts, and savings insights — all within the existing engine architecture.

**Architecture:** Single-file engine upgrade (`src/engines/openai-token-calculator.ts`). Server-side `calculate()` and client-side `customFn` produce identical output. All new features (multi-model comparison, batch/caching, presets, token estimator) are implemented in both TypeScript and minified JS in parallel. Output is a single rich-text string with Unicode bar charts — no new dependencies, no build system changes.

**Tech Stack:** TypeScript (server), plain JS via `new Function()` (client customFn), i18n via `src/i18n/translations.ts`.

---

## File Structure

| File | Responsibility |
|---|---|
| `src/engines/openai-token-calculator.ts` | **Primary.** Model catalog, calculate(), customFn, engine definition, presets, token estimator |
| `src/data/tools.ts` | Input field definitions synced with engine |
| `src/i18n/translations.ts` | All i18n keys for inputs, FAQ, how-to-use |

---

### Task 1: Update Model Catalog

**Files:**
- Modify: `src/engines/openai-token-calculator.ts:4-9`

- [ ] **Step 1: Replace the MODELS constant with the full 14-model catalog**

Replace the current 4-model `MODELS` constant at line 4-9 with:

```typescript
interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: 'gpt5' | 'gpt41' | 'o-series' | 'legacy';
  contextWindow: string;
  batchInput: number;
  batchOutput: number;
}

const MODELS: Record<string, ModelInfo> = {
  // GPT-5 family
  'gpt-5.5': { input: 5.00, output: 30.00, family: 'gpt5', contextWindow: '1M', batchInput: 2.50, batchOutput: 15.00, name: 'GPT-5.5' },
  'gpt-5.2': { input: 1.75, output: 14.00, family: 'gpt5', contextWindow: '400K', batchInput: 0.875, batchOutput: 7.00, name: 'GPT-5.2' },
  'gpt-5': { input: 1.25, output: 10.00, family: 'gpt5', contextWindow: '400K', batchInput: 0.625, batchOutput: 5.00, name: 'GPT-5' },
  'gpt-5-mini': { input: 0.25, output: 2.00, family: 'gpt5', contextWindow: '400K', batchInput: 0.125, batchOutput: 1.00, name: 'GPT-5 Mini' },
  'gpt-5-nano': { input: 0.05, output: 0.40, family: 'gpt5', contextWindow: '400K', batchInput: 0.025, batchOutput: 0.20, name: 'GPT-5 Nano' },
  // GPT-4.1 family (long context)
  'gpt-4.1': { input: 2.00, output: 8.00, family: 'gpt41', contextWindow: '1M', batchInput: 1.00, batchOutput: 4.00, name: 'GPT-4.1' },
  'gpt-4.1-mini': { input: 0.40, output: 1.60, family: 'gpt41', contextWindow: '1M', batchInput: 0.20, batchOutput: 0.80, name: 'GPT-4.1 Mini' },
  'gpt-4.1-nano': { input: 0.10, output: 0.40, family: 'gpt41', contextWindow: '1M', batchInput: 0.05, batchOutput: 0.20, name: 'GPT-4.1 Nano' },
  // o-series reasoning
  'o3': { input: 2.00, output: 8.00, family: 'o-series', contextWindow: '200K', batchInput: 1.00, batchOutput: 4.00, name: 'o3' },
  'o4-mini': { input: 1.10, output: 4.40, family: 'o-series', contextWindow: '200K', batchInput: 0.55, batchOutput: 2.20, name: 'o4-mini' },
  // Legacy
  'gpt-4o': { input: 2.50, output: 10.00, family: 'legacy', contextWindow: '128K', batchInput: 1.25, batchOutput: 5.00, name: 'GPT-4o (Legacy)' },
  'gpt-4o-mini': { input: 0.15, output: 0.60, family: 'legacy', contextWindow: '128K', batchInput: 0.075, batchOutput: 0.30, name: 'GPT-4o Mini (Legacy)' },
  'gpt-4-turbo': { input: 10.00, output: 30.00, family: 'legacy', contextWindow: '128K', batchInput: 5.00, batchOutput: 15.00, name: 'GPT-4 Turbo (Legacy)' },
  'gpt-3.5-turbo': { input: 0.50, output: 1.50, family: 'legacy', contextWindow: '16K', batchInput: 0.25, batchOutput: 0.75, name: 'GPT-3.5 Turbo (Legacy)' },
};

const FAMILY_LABELS: Record<string, string> = { gpt5: '🔵 GPT-5', gpt41: '🟢 GPT-4.1', 'o-series': '🟠 o-series', legacy: '⚪ Legacy' };
const DEFAULT_SELECTED = ['gpt-5-mini', 'gpt-5.5', 'gpt-4.1'];
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm typecheck
```

Expected: No errors related to the new MODELS constant.

---

### Task 2: Add Scenario Presets

**Files:**
- Modify: `src/engines/openai-token-calculator.ts` (after MODELS constant)

- [ ] **Step 1: Add the PRESETS constant**

```typescript
interface Preset {
  label: string;
  emoji: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  reqPerDay: number;
}

const PRESETS: Preset[] = [
  { label: 'Customer Support Bot', emoji: '🎧', model: 'gpt-5-mini', inputTokens: 800, outputTokens: 200, reqPerDay: 500 },
  { label: 'RAG Q&A', emoji: '📚', model: 'gpt-4.1', inputTokens: 3000, outputTokens: 400, reqPerDay: 200 },
  { label: 'Code Review', emoji: '💻', model: 'gpt-5.5', inputTokens: 5000, outputTokens: 800, reqPerDay: 50 },
  { label: 'Document Translation', emoji: '🌐', model: 'gpt-5', inputTokens: 2000, outputTokens: 1500, reqPerDay: 100 },
  { label: 'Content Generation', emoji: '✍️', model: 'gpt-5.2', inputTokens: 500, outputTokens: 2000, reqPerDay: 100 },
  { label: 'Data Analysis', emoji: '📊', model: 'o3', inputTokens: 4000, outputTokens: 3000, reqPerDay: 30 },
];
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm typecheck
```

Expected: No errors.

---

### Task 3: Add Token Estimator Function

**Files:**
- Modify: `src/engines/openai-token-calculator.ts` (after PRESETS)

- [ ] **Step 1: Add the estimateTokens function**

```typescript
/**
 * Estimate token count from raw text using industry-standard approximation.
 * English: ~4 chars/token, Chinese: ~1.5 chars/token (each CJK char ≈ 0.67 tokens).
 * Mixed text is auto-detected by Unicode range.
 * Accuracy: ±15% — sufficient for cost estimation.
 */
function estimateTokens(text: string): { inputTokens: number; detectedLang: string } {
  if (!text || !text.trim()) return { inputTokens: 0, detectedLang: 'empty' };
  let cjkChars = 0;
  let otherChars = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    // CJK Unified Ideographs, CJK Extension A, CJK Compatibility, Hiragana, Katakana, Hangul
    if ((code >= 0x4E00 && code <= 0x9FFF) || (code >= 0x3400 && code <= 0x4DBF) ||
        (code >= 0x3040 && code <= 0x309F) || (code >= 0x30A0 && code <= 0x30FF) ||
        (code >= 0xAC00 && code <= 0xD7AF)) {
      cjkChars++;
    } else if (ch.trim()) {
      otherChars++;
    }
  }
  const total = text.length;
  const cjkRatio = cjkChars / Math.max(total, 1);
  // Chinese: ~1.5 chars = 1 token, English: ~4 chars = 1 token
  const tokens = Math.ceil(cjkChars / 1.5 + otherChars / 4);
  const detectedLang = cjkRatio > 0.4 ? 'zh' : cjkRatio > 0.15 ? 'mixed' : 'en';
  return { inputTokens: tokens, detectedLang };
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm typecheck
```

Expected: No errors.

---

### Task 4: Rewrite calculate() for Multi-Model Comparison

**Files:**
- Modify: `src/engines/openai-token-calculator.ts:11-39` (replace the current calculate function)

- [ ] **Step 1: Replace the entire calculate() function**

Delete lines 11-39 (the entire current `calculate` function) and replace with:

```typescript
function calculate(inputs: Record<string, string>): string[] {
  const inTokens = parseInt(inputs.inputTokens) || 1000;
  const outTokens = parseInt(inputs.outputTokens) || 500;
  const reqPerDay = parseInt(inputs.requestsPerDay) || 100;
  const isBatch = inputs.pricingMode === 'batch';
  const cacheHitRate = Math.min(100, Math.max(0, parseInt(inputs.cacheHitRate) || 0)) / 100;
  const growthRate = Math.min(50, Math.max(0, parseInt(inputs.growthRate) || 0)) / 100;
  const projMonths = parseInt(inputs.projectionMonths) || 12;
  const selectedModelsStr = inputs.models || 'gpt-5-mini,gpt-5.5,gpt-4.1';
  const selectedModels = selectedModelsStr.split(',').map(s => s.trim()).filter(s => MODELS[s]);

  const fmt = (n: number) => '$' + n.toFixed(2);
  const lc = (n: number) => n.toLocaleString();

  // Compute cost per model
  interface ModelResult {
    key: string;
    name: string;
    family: string;
    contextWindow: string;
    costPerReq: number;
    dailyCost: number;
    monthlyCost: number;
    annualCost: number;
    batchMonthly: number;
    cachedMonthly: number;
    inputCost: number;
    outputCost: number;
  }

  const allResults: ModelResult[] = Object.keys(MODELS).map(key => {
    const m = MODELS[key];
    const inRate = isBatch ? m.batchInput : m.input;
    const outRate = isBatch ? m.batchOutput : m.output;
    const cpr = (inTokens / 1_000_000) * inRate + (outTokens / 1_000_000) * outRate;
    const dc = cpr * reqPerDay;
    const mc = dc * 30;
    const ac = mc * 12;
    // Cache: 50% discount on input tokens for cache hits
    const cachedCpr = (inTokens / 1_000_000) * inRate * (1 - cacheHitRate * 0.5) + (outTokens / 1_000_000) * outRate;
    const cachedMc = cachedCpr * reqPerDay * 30;
    return {
      key,
      name: m.name,
      family: m.family,
      contextWindow: m.contextWindow,
      costPerReq: cpr,
      dailyCost: dc,
      monthlyCost: mc,
      annualCost: ac,
      batchMonthly: isBatch ? mc : mc * 0.5, // show batch as 50% off real-time when not in batch mode
      cachedMonthly: cachedMc,
      inputCost: (inTokens / 1_000_000) * inRate,
      outputCost: (outTokens / 1_000_000) * outRate,
    };
  });

  // Sort by monthly cost ascending
  allResults.sort((a, b) => a.monthlyCost - b.monthlyCost);
  const cheapest = allResults[0];
  const maxCost = allResults[allResults.length - 1].monthlyCost;

  // Filter to selected models for detail cards
  const selected = allResults.filter(r => selectedModels.includes(r.key));
  const primaryModel = selected.length > 0 ? selected[0] : allResults[0];

  // Build output
  const lines: string[] = [];
  const hr = '──────────────────────────────────────────────────';

  // ── HEADER ──
  const modeLabel = isBatch ? '⚡ Batch Mode (50% off)' : '🔴 Real-time API';
  const cacheLabel = cacheHitRate > 0 ? ` | 🗜️ Cache Hit: ${(cacheHitRate * 100).toFixed(0)}%` : '';
  lines.push(`🤖 OpenAI API Cost Analysis`);
  lines.push(`${modeLabel}${cacheLabel}`);
  lines.push(`Input: ${lc(inTokens)} tokens/req | Output: ${lc(outTokens)} tokens/req | ${lc(reqPerDay)} reqs/day`);
  lines.push('');

  // ── BAR CHART: All Models ──
  lines.push('📊 MODEL COMPARISON (Monthly Cost)');
  lines.push(hr);
  const maxBarLen = 40;
  for (const r of allResults) {
    const barLen = maxCost > 0 ? Math.max(1, Math.round((r.monthlyCost / maxCost) * maxBarLen)) : 1;
    const bar = '█'.repeat(barLen);
    const famIcon = r.family === 'gpt5' ? '🔵' : r.family === 'gpt41' ? '🟢' : r.family === 'o-series' ? '🟠' : '⚪';
    const badge = r.key === cheapest.key ? ' 🏆 cheapest' : '';
    lines.push(`${famIcon} ${r.name.padEnd(22)} ${bar} ${fmt(r.monthlyCost).padStart(8)}${badge}`);
  }
  lines.push(hr);
  lines.push('');

  // ── DETAIL CARDS: Selected Models ──
  for (const r of selected) {
    const famIcon = r.family === 'gpt5' ? '🔵' : r.family === 'gpt41' ? '🟢' : r.family === 'o-series' ? '🟠' : '⚪';
    lines.push(`${famIcon} ${r.name} — DETAIL BREAKDOWN`);
    lines.push(`Context Window: ${r.contextWindow}`);
    lines.push(`Input:  ${lc(inTokens)} tokens × ${fmt(r.inputCost * 1_000_000 / inTokens)}/1M = ${fmt(r.inputCost)}`);
    lines.push(`Output: ${lc(outTokens)} tokens × ${fmt(r.outputCost * 1_000_000 / outTokens)}/1M = ${fmt(r.outputCost)}`);
    lines.push(`Per Request:                      = ${fmt(r.costPerReq)}`);
    lines.push(`Daily (×${reqPerDay}):          = ${fmt(r.dailyCost)}`);
    lines.push(`Monthly (×30):                    = ${fmt(r.monthlyCost)}`);
    lines.push(`Annual (×365):                    = ${fmt(r.annualCost)}`);
    if (!isBatch) {
      lines.push(`⚡ Batch (50% off): Monthly        = ${fmt(r.monthlyCost * 0.5)}`);
    }
    if (cacheHitRate > 0) {
      lines.push(`🗜️ With ${(cacheHitRate * 100).toFixed(0)}% Cache: Monthly      = ${fmt(r.cachedMonthly)}`);
    }
    lines.push('');
  }

  // ── GROWTH PROJECTION (only if growthRate > 0) ──
  if (growthRate > 0) {
    lines.push(`📈 GROWTH PROJECTION (${(growthRate * 100).toFixed(0)}%/month, ${projMonths} months)`);
    lines.push(hr);
    const months = projMonths <= 3 ? [1, projMonths] : projMonths <= 6 ? [1, 3, projMonths] : [1, 3, 6, projMonths];
    // Header
    let header = 'Month'.padEnd(6);
    for (const r of selected) header += ' │ ' + r.name.padEnd(14);
    header += ' │ Cumulative Diff';
    lines.push(header);
    lines.push('─'.repeat(header.length));
    for (const month of months) {
      const factor = Math.pow(1 + growthRate, month - 1);
      let row = String(month).padEnd(6);
      for (const r of selected) {
        const projected = r.monthlyCost * factor;
        row += ' │ ' + fmt(projected).padEnd(14);
      }
      // Cumulative diff between cheapest and most expensive among selected
      if (selected.length >= 2) {
        const cheapestSel = selected.reduce((a, b) => a.monthlyCost < b.monthlyCost ? a : b);
        const priciestSel = selected.reduce((a, b) => a.monthlyCost > b.monthlyCost ? a : b);
        const diff = (priciestSel.monthlyCost - cheapestSel.monthlyCost) * month * factor;
        row += ' │ Save ' + fmt(diff);
      }
      lines.push(row);
    }
    lines.push('');
    if (selected.length >= 2) {
      const cheapestSel = selected.reduce((a, b) => a.monthlyCost < b.monthlyCost ? a : b);
      const priciestSel = selected.reduce((a, b) => a.monthlyCost > b.monthlyCost ? a : b);
      const totalDiff = (priciestSel.monthlyCost - cheapestSel.monthlyCost) * projMonths;
      lines.push(`💡 Over ${projMonths} months, ${cheapestSel.name} saves ${fmt(totalDiff)} vs ${priciestSel.name}`);
    }
    lines.push('');
  }

  // ── SAVINGS INSIGHTS ──
  lines.push('💰 SAVINGS INSIGHTS');
  lines.push(hr);
  lines.push(`🏆 Cheapest:   ${cheapest.name} @ ${fmt(cheapest.monthlyCost)}/month`);
  // Best value = cheapest non-legacy, non-nano model
  const bestValue = allResults.find(r => r.family !== 'legacy' && !r.name.includes('Nano')) || allResults[1];
  if (bestValue) {
    lines.push(`⚡ Best Value: ${bestValue.name} @ ${fmt(bestValue.monthlyCost)}/month`);
    lines.push(`💸 ${bestValue.name} vs ${allResults[allResults.length - 1].name}: saves ${fmt(allResults[allResults.length - 1].monthlyCost - bestValue.monthlyCost)}/month (${allResults[allResults.length - 1].monthlyCost > 0 ? ((1 - bestValue.monthlyCost / allResults[allResults.length - 1].monthlyCost) * 100).toFixed(0) : 0}% cheaper)`);
  }
  if (cacheHitRate <= 0) {
    lines.push(`🗜️ Tip: Enable prompt caching to save 50% on input token costs for repeated prompts`);
  }
  lines.push('');

  // ── USAGE SCENARIOS TABLE ──
  lines.push('📊 USAGE SCENARIOS (Monthly Cost)');
  lines.push(hr);
  const scenarioReqs = [50, 100, 500, 1000, 5000, 10000];
  let tableHeader = 'Req/Day'.padEnd(8);
  for (const r of selected) tableHeader += ' │ ' + r.name.padEnd(14);
  lines.push(tableHeader);
  lines.push('─'.repeat(tableHeader.length));
  for (const s of scenarioReqs) {
    let row = lc(s).padEnd(8);
    for (const r of selected) {
      const rate = isBatch ? MODELS[r.key].batchInput : MODELS[r.key].input;
      const outRate = isBatch ? MODELS[r.key].batchOutput : MODELS[r.key].output;
      const cost = ((inTokens / 1_000_000) * rate + (outTokens / 1_000_000) * outRate) * s * 30;
      row += ' │ ' + fmt(cost).padEnd(14);
    }
    lines.push(row);
  }

  return [lines.join('\n')];
}
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm typecheck
```

Expected: No errors in `src/engines/openai-token-calculator.ts`.

---

### Task 5: Rewrite customFn (Client-Side JS)

**Files:**
- Modify: `src/engines/openai-token-calculator.ts:41-50` (replace the current customFn string)

- [ ] **Step 1: Replace the entire customFn constant**

Delete lines 41-50 and replace with:

```typescript
const customFn =
  // Model catalog (minified) — keyed by model slug
  "var M={};" +
  "M['gpt-5.5']={i:5,o:30,f:'g5',c:'1M',bi:2.5,bo:15,n:'GPT-5.5'};" +
  "M['gpt-5.2']={i:1.75,o:14,f:'g5',c:'400K',bi:.875,bo:7,n:'GPT-5.2'};" +
  "M['gpt-5']={i:1.25,o:10,f:'g5',c:'400K',bi:.625,bo:5,n:'GPT-5'};" +
  "M['gpt-5-mini']={i:.25,o:2,f:'g5',c:'400K',bi:.125,bo:1,n:'GPT-5 Mini'};" +
  "M['gpt-5-nano']={i:.05,o:.4,f:'g5',c:'400K',bi:.025,bo:.2,n:'GPT-5 Nano'};" +
  "M['gpt-4.1']={i:2,o:8,f:'g4',c:'1M',bi:1,bo:4,n:'GPT-4.1'};" +
  "M['gpt-4.1-mini']={i:.4,o:1.6,f:'g4',c:'1M',bi:.2,bo:.8,n:'GPT-4.1 Mini'};" +
  "M['gpt-4.1-nano']={i:.1,o:.4,f:'g4',c:'1M',bi:.05,bo:.2,n:'GPT-4.1 Nano'};" +
  "M['o3']={i:2,o:8,f:'os',c:'200K',bi:1,bo:4,n:'o3'};" +
  "M['o4-mini']={i:1.1,o:4.4,f:'os',c:'200K',bi:.55,bo:2.2,n:'o4-mini'};" +
  "M['gpt-4o']={i:2.5,o:10,f:'lg',c:'128K',bi:1.25,bo:5,n:'GPT-4o (Legacy)'};" +
  "M['gpt-4o-mini']={i:.15,o:.6,f:'lg',c:'128K',bi:.075,bo:.3,n:'GPT-4o Mini (Legacy)'};" +
  "M['gpt-4-turbo']={i:10,o:30,f:'lg',c:'128K',bi:5,bo:15,n:'GPT-4 Turbo (Legacy)'};" +
  "M['gpt-3.5-turbo']={i:.5,o:1.5,f:'lg',c:'16K',bi:.25,bo:.75,n:'GPT-3.5 Turbo (Legacy)'};" +
  // Inputs
  "var it=parseInt(inputs.inputTokens)||1000;var ot=parseInt(inputs.outputTokens)||500;" +
  "var rd=parseInt(inputs.requestsPerDay)||100;var bat=inputs.pricingMode==='batch';" +
  "var ch=Math.min(100,Math.max(0,parseInt(inputs.cacheHitRate)||0))/100;" +
  "var gr=Math.min(50,Math.max(0,parseInt(inputs.growthRate)||0))/100;" +
  "var pm=parseInt(inputs.projectionMonths)||12;" +
  "var sm=inputs.models||'gpt-5-mini,gpt-5.5,gpt-4.1';var sel=sm.split(',').map(function(s){return s.trim();});" +
  // Helpers
  "function fm(n){return '$'+n.toFixed(2)}function lc(n){return n.toLocaleString()}" +
  // Compute all models
  "var all=[];Object.keys(M).forEach(function(k){" +
  "var m=M[k];var ir=bat?m.bi:m.i;var or=bat?m.bo:m.o;" +
  "var cpr=(it/1e6)*ir+(ot/1e6)*or;var dc=cpr*rd;var mc=dc*30;var ac=mc*12;" +
  "var ccpr=(it/1e6)*ir*(1-ch*.5)+(ot/1e6)*or;var cmc=ccpr*rd*30;" +
  "all.push({k:k,n:m.n,f:m.f,c:m.c,cpr:cpr,dc:dc,mc:mc,ac:ac,bm:bat?mc:mc*.5,cm:cmc,ic:(it/1e6)*ir,oc:(ot/1e6)*or});" +
  "});" +
  "all.sort(function(a,b){return a.mc-b.mc;});" +
  "var chp=all[0];var selr=all.filter(function(r){return sel.indexOf(r.k)>=0;});" +
  "var maxC=all[all.length-1].mc;" +
  // Build output
  "var L=[];var HR='\\u2500'.repeat(50);" +
  "var ml=bat?'\\u26A1 Batch Mode (50% off)':'\\uD83D\\uDD34 Real-time API';" +
  "var cl=ch>0?' | \\uD83D\\uDDDC\\uFE0F Cache Hit: '+(ch*100).toFixed(0)+'%':'';" +
  "L.push('\\uD83E\\uDD16 OpenAI API Cost Analysis');" +
  "L.push(ml+cl);" +
  "L.push('Input: '+lc(it)+' tokens/req | Output: '+lc(ot)+' tokens/req | '+lc(rd)+' reqs/day');" +
  "L.push('');" +
  // Bar chart
  "L.push('\\uD83D\\uDCCA MODEL COMPARISON (Monthly Cost)');L.push(HR);" +
  "var mbl=40;" +
  "all.forEach(function(r){" +
  "var bl=maxC>0?Math.max(1,Math.round((r.mc/maxC)*mbl)):1;var bar='\\u2588'.repeat(bl);" +
  "var fi=r.f==='g5'?'\\uD83D\\uDD35':r.f==='g4'?'\\uD83D\\uDFE2':r.f==='os'?'\\uD83D\\uDFE0':'\\u26AA';" +
  "var bg=r.k===chp.k?' \\uD83C\\uDFC6 cheapest':'';" +
  "var pad='';for(var i=r.n.length;i<22;i++)pad+=' ';" +
  "L.push(fi+' '+r.n+pad+' '+bar+' '+fm(r.mc).replace(/^/,'        ').slice(-8)+bg);" +
  "});" +
  "L.push(HR);L.push('');" +
  // Detail cards for selected
  "selr.forEach(function(r){" +
  "var fi=r.f==='g5'?'\\uD83D\\uDD35':r.f==='g4'?'\\uD83D\\uDFE2':r.f==='os'?'\\uD83D\\uDFE0':'\\u26AA';" +
  "L.push(fi+' '+r.n+' \\u2014 DETAIL BREAKDOWN');" +
  "L.push('Context Window: '+r.c);" +
  "L.push('Input:  '+lc(it)+' tokens \\u00d7 '+fm(r.ic*1e6/it)+'/1M = '+fm(r.ic));" +
  "L.push('Output: '+lc(ot)+' tokens \\u00d7 '+fm(r.oc*1e6/ot)+'/1M = '+fm(r.oc));" +
  "L.push('Per Request:                      = '+fm(r.cpr));" +
  "L.push('Daily (\\u00d7'+rd+'):          = '+fm(r.dc));" +
  "L.push('Monthly (\\u00d730):                    = '+fm(r.mc));" +
  "L.push('Annual (\\u00d7365):                    = '+fm(r.ac));" +
  "if(!bat){L.push('\\u26A1 Batch (50% off): Monthly        = '+fm(r.mc*.5));}" +
  "if(ch>0){L.push('\\uD83D\\uDDDC\\uFE0F With '+(ch*100).toFixed(0)+'% Cache: Monthly      = '+fm(r.cm));}" +
  "L.push('');" +
  "});" +
  // Growth projection
  "if(gr>0){" +
  "L.push('\\uD83D\\uDCC8 GROWTH PROJECTION ('+(gr*100).toFixed(0)+'%/month, '+pm+' months)');L.push(HR);" +
  "var mths=pm<=3?[1,pm]:pm<=6?[1,3,pm]:[1,3,6,pm];" +
  "var hdr='Month ';selr.forEach(function(r){hdr+=' \\u2502 '+r.n;for(var i=r.n.length;i<14;i++)hdr+=' ';});" +
  "hdr+=' \\u2502 Cumulative Diff';L.push(hdr);" +
  "L.push('\\u2500'.repeat(hdr.length));" +
  "mths.forEach(function(mo){" +
  "var fac=Math.pow(1+gr,mo-1);var row=String(mo)+'    ';" +
  "selr.forEach(function(r){" +
  "var pj=r.mc*fac;var pjs=fm(pj);row+=' \\u2502 '+pjs;for(var i=pjs.length;i<14;i++)row+=' ';" +
  "});" +
  "if(selr.length>=2){" +
  "var csel=selr[0];var psel=selr[selr.length-1];" +
  "var df=(psel.mc-csel.mc)*mo*fac;row+=' \\u2502 Save '+fm(df);" +
  "}" +
  "L.push(row);" +
  "});L.push('');" +
  "if(selr.length>=2){" +
  "var csel2=selr[0];var psel2=selr[selr.length-1];" +
  "var tdf=(psel2.mc-csel2.mc)*pm;" +
  "L.push('\\uD83D\\uDCA1 Over '+pm+' months, '+csel2.n+' saves '+fm(tdf)+' vs '+psel2.n);" +
  "}" +
  "L.push('');" +
  "}" +
  // Savings insights
  "L.push('\\uD83D\\uDCB0 SAVINGS INSIGHTS');L.push(HR);" +
  "L.push('\\uD83C\\uDFC6 Cheapest:   '+chp.n+' @ '+fm(chp.mc)+'/month');" +
  "var bv=all.find(function(r){return r.f!=='lg'&&r.n.indexOf('Nano')<0;})||all[1];" +
  "if(bv){" +
  "L.push('\\u26A1 Best Value: '+bv.n+' @ '+fm(bv.mc)+'/month');" +
  "var mx=all[all.length-1];" +
  "L.push('\\uD83D\\uDCB8 '+bv.n+' vs '+mx.n+': saves '+fm(mx.mc-bv.mc)+'/month ('+(mx.mc>0?((1-bv.mc/mx.mc)*100).toFixed(0):0)+'% cheaper)');" +
  "}" +
  "if(ch<=0){L.push('\\uD83D\\uDDDC\\uFE0F Tip: Enable prompt caching to save 50% on input token costs');}" +
  "L.push('');" +
  // Usage scenarios table
  "L.push('\\uD83D\\uDCCA USAGE SCENARIOS (Monthly Cost)');L.push(HR);" +
  "var scrs=[50,100,500,1000,5000,10000];" +
  "var th='Req/Day ';selr.forEach(function(r){th+=' \\u2502 '+r.n;for(var i=r.n.length;i<14;i++)th+=' ';});" +
  "L.push(th);L.push('\\u2500'.repeat(th.length));" +
  "scrs.forEach(function(s){" +
  "var row=lc(s)+'    ';" +
  "selr.forEach(function(r){" +
  "var m2=M[r.k];var ir2=bat?m2.bi:m2.i;var or2=bat?m2.bo:m2.o;" +
  "var cs=((it/1e6)*ir2+(ot/1e6)*or2)*s*30;" +
  "var cs2=fm(cs);row+=' \\u2502 '+cs2;for(var i=cs2.length;i<14;i++)row+=' ';" +
  "});" +
  "L.push(row);" +
  "});" +
  "return L;";
```

- [ ] **Step 2: Verify the customFn parses without syntax errors**

```bash
node -e "var inputs={inputTokens:'1000',outputTokens:'500',requestsPerDay:'100',pricingMode:'realtime',cacheHitRate:'0',growthRate:'0',projectionMonths:'12',models:'gpt-5-mini,gpt-5.5,gpt-4.1'};var pick=function(a){return a[0]};var fill=function(t,v){return t};var fn=new Function('inputs','pick','fill','" + customFn.replace(/'/g, "'\\''") + "');console.log(fn(inputs,pick,fill).join('\\n').substring(0,500))"
```

Expected: Output shows "🤖 OpenAI API Cost Analysis" header with model data.

---

### Task 6: Update Engine Inputs and Metadata

**Files:**
- Modify: `src/engines/openai-token-calculator.ts:52-86` (the engine object)

- [ ] **Step 1: Update the engine object — inputs, description, staticExamples, FAQ, howToUse**

Replace lines 52-86 (the entire `engine` object) with:

```typescript
const engine: ToolEngine = {
  slug: 'solopreneur-openai-token-calculator',
  title: 'OpenAI Token Calculator',
  description: 'Compare OpenAI API costs across 14 models — GPT-5.5 to GPT-5 Nano, GPT-4.1 family, and o-series. Toggle batch pricing, prompt caching, and growth projections.',
  category: 'B',
  inputs: [
    { name: 'models', label: 'Models to Compare', placeholder: '', type: 'text' as const },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' as const },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' as const },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' as const },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select' as const, options: ['realtime', 'batch'] },
    { name: 'cacheHitRate', label: 'Prompt Cache Hit Rate (%)', placeholder: 'e.g. 30', type: 'number' as const },
    { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 10', type: 'number' as const },
    { name: 'projectionMonths', label: 'Projection Period (months)', placeholder: '', type: 'select' as const, options: ['3', '6', '12'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '🤖 OpenAI API Cost Analysis\n\n🔴 Real-time API\nInput: 1,000 tokens/req | Output: 500 tokens/req | 100 reqs/day\n\n📊 MODEL COMPARISON (Monthly Cost)\n──────────────────────────────────────────────────\n🔵 GPT-5 Nano               ████ $3.75 🏆 cheapest\n🟢 GPT-4.1 Nano             ██████ $6.00\n🔵 GPT-5 Mini               ██████████████ $18.75\n🟠 o4-mini                  ██████████████████ $27.00\n🟢 GPT-4.1 Mini             ██████████████████████ $34.50\n🔵 GPT-5                    ██████████████████████████████ $45.00\n🟢 GPT-4.1                  ██████████████████████████████████████ $52.50\n🔵 GPT-5.2                  ████████████████████████████████████████████ $60.00\n🟠 o3                       ████████████████████████████████████████████ $60.00\n⚪ GPT-4o (Legacy)          ████████████████████████████████████████████████████ $75.00\n🔵 GPT-5.5                  ██████████████████████████████████████████████████████████████████████████████████████ $105.00\n⚪ GPT-4o Mini (Legacy)     ███ $4.50\n⚪ GPT-4 Turbo (Legacy)     ████████████████████████████████████████████████████████████████████████████████████████████████████████████████████████ $450.00\n⚪ GPT-3.5 Turbo (Legacy)   ██████ $7.50\n──────────────────────────────────────────────────\n\n🔵 GPT-5 Mini — DETAIL BREAKDOWN\nContext Window: 400K\nInput:  1,000 tokens × $0.25/1M = $0.00025\nOutput: 500 tokens × $2.00/1M = $0.00100\nPer Request:                      = $0.00125\nDaily (×100):          = $0.125\nMonthly (×30):                    = $3.75\nAnnual (×365):                    = $45.63\n⚡ Batch (50% off): Monthly        = $1.88\n\n💰 SAVINGS INSIGHTS\n──────────────────────────────────────────────────\n🏆 Cheapest:   GPT-5 Nano @ $3.75/month\n⚡ Best Value: GPT-5 Mini @ $18.75/month\n💸 GPT-5 Mini vs GPT-4 Turbo (Legacy): saves $446.25/month (96% cheaper)',
  ],
  faq: [
    { q: 'What is an OpenAI token and how do I estimate it?', a: 'A token is a chunk of text (~0.75 English words). Roughly: 1 token ≈ 4 English characters or 1.5 Chinese characters. Paste your prompt text above to get an instant estimate. A typical 500-word prompt uses about 650-750 tokens. OpenAI charges per 1 million tokens processed.' },
    { q: 'Which model is cheapest in 2026?', a: 'GPT-5 Nano at $0.05/$0.40 per 1M input/output tokens is the absolute cheapest. For higher-quality tasks, GPT-5 Mini at $0.25/$2.00 offers the best quality-to-cost ratio — 20× cheaper than GPT-5.5 for similar quality on most tasks.' },
    { q: 'How can I reduce my OpenAI API costs?', a: '(1) Use Batch API for 50% off on non-urgent requests (up to 24h turnaround). (2) Enable prompt caching — repeated system prompts get 50% off input costs. (3) Route simple tasks to GPT-5 Mini/Nano, reserve GPT-5.5 for complex reasoning. (4) Use shorter prompts and set max_tokens limits. (5) Consider GPT-4.1 for long-context needs instead of stuffing prompts.' },
    { q: 'When should I use Batch API vs real-time?', a: 'Batch API gives 50% discount but processes asynchronously (typically within 24 hours). Ideal for: bulk classification, data extraction, embeddings generation, non-user-facing analysis. Use real-time for: chatbots, interactive apps, code completion, any user-facing feature. You can mix both in the same application.' },
    { q: 'What are GPT-4.1 models best for?', a: 'GPT-4.1 family offers a 1 million token context window — ideal for analyzing entire codebases, processing long legal documents, RAG with large knowledge bases, and multi-document summarization. GPT-4.1 Nano at $0.10/$0.40 gives you the 1M window at near-zero cost for classification and extraction tasks.' },
    { q: 'How do o-series reasoning models differ from GPT-5?', a: 'o3 and o4-mini use chain-of-thought reasoning internally, making them better at math, coding, and multi-step logic. They produce "reasoning tokens" (visible in the API) that are billed as output. Use o-series for complex analysis, debugging, and financial modeling. Use GPT-5 for general conversation, content, and translation.' },
    { q: 'What is prompt caching and how much does it save?', a: 'Prompt caching stores repeated content (system prompts, long documents) server-side. Cache hits get a 50% discount on input tokens. For chatbots with a fixed system prompt: the system prompt is charged full price once, then at 50% for subsequent requests. Effective cache hit rates of 30-70% are common in production. Requires prompts >1024 tokens for caching to activate.' },
  ],
  howToUse: [
    'Select one or more OpenAI models to compare (or use a scenario preset).',
    'Enter your average input and output token counts per request.',
    'Set your daily request volume and choose real-time or batch pricing.',
    'Optionally set a cache hit rate and monthly growth rate for projections.',
    'Review the bar chart, detail cards, and savings insights to find your optimal model.',
    'Use the usage scenarios table to plan costs at different scales.',
  ],
};

registerEngine(engine);
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm typecheck
```

Expected: No errors.

---

### Task 7: Sync tools.ts

**Files:**
- Modify: `src/data/tools.ts:53-63`

- [ ] **Step 1: Update the OpenAI token calculator entry in tools.ts**

Replace the current entry at lines 53-63:

```typescript
  {
    slug: 'solopreneur-openai-token-calculator',
    title: 'OpenAI Token Calculator',
    description: 'Compare OpenAI API costs across GPT-5.5, GPT-5, GPT-4.1, o-series and more. Toggle batch pricing and growth projections.',
    categoryId: 'B',
    inputs: [
      { name: 'models', label: 'Models to Compare', placeholder: '', type: 'select', options: ['gpt-5.5', 'gpt-5.2', 'gpt-5', 'gpt-5-mini', 'gpt-5-nano', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano', 'o3', 'o4-mini', 'gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo'] },
      { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
      { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
      { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
      { name: 'cacheHitRate', label: 'Prompt Cache Hit Rate (%)', placeholder: 'e.g. 30', type: 'number' },
      { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 10', type: 'number' },
      { name: 'projectionMonths', label: 'Projection Period (months)', placeholder: '', type: 'select', options: ['3', '6', '12'] },
    ],
  },
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm typecheck
```

Expected: No errors.

---

### Task 8: Add i18n Translations

**Files:**
- Modify: `src/i18n/translations.ts` (after line 1351)

- [ ] **Step 1: Add all missing i18n keys for the OpenAI token calculator**

Insert after the existing description line (after line 1351):

```typescript
  // OpenAI Token Calculator — inputs
  'tools.solopreneur-openai-token-calculator.input.models.label': { en: 'Models to Compare', zh: '对比模型' },
  'tools.solopreneur-openai-token-calculator.input.inputTokens.label': { en: 'Input Tokens per Request', zh: '每次请求输入 Token 数' },
  'tools.solopreneur-openai-token-calculator.input.inputTokens.placeholder': { en: 'e.g. 1000', zh: '例如：1000' },
  'tools.solopreneur-openai-token-calculator.input.outputTokens.label': { en: 'Output Tokens per Request', zh: '每次请求输出 Token 数' },
  'tools.solopreneur-openai-token-calculator.input.outputTokens.placeholder': { en: 'e.g. 500', zh: '例如：500' },
  'tools.solopreneur-openai-token-calculator.input.requestsPerDay.label': { en: 'Requests per Day', zh: '每日请求数' },
  'tools.solopreneur-openai-token-calculator.input.requestsPerDay.placeholder': { en: 'e.g. 100', zh: '例如：100' },
  'tools.solopreneur-openai-token-calculator.input.pricingMode.label': { en: 'Pricing Mode', zh: '计费模式' },
  'tools.solopreneur-openai-token-calculator.input.cacheHitRate.label': { en: 'Prompt Cache Hit Rate (%)', zh: '提示缓存命中率 (%)' },
  'tools.solopreneur-openai-token-calculator.input.cacheHitRate.placeholder': { en: 'e.g. 30', zh: '例如：30' },
  'tools.solopreneur-openai-token-calculator.input.growthRate.label': { en: 'Monthly Growth Rate (%)', zh: '月增长率 (%)' },
  'tools.solopreneur-openai-token-calculator.input.growthRate.placeholder': { en: 'e.g. 10', zh: '例如：10' },
  'tools.solopreneur-openai-token-calculator.input.projectionMonths.label': { en: 'Projection Period (months)', zh: '投影周期（月）' },
  // OpenAI Token Calculator — FAQ
  'tools.solopreneur-openai-token-calculator.faq.0.q': { en: 'What is an OpenAI token and how do I estimate it?', zh: '什么是 OpenAI Token？如何估算？' },
  'tools.solopreneur-openai-token-calculator.faq.0.a': { en: 'A token is a chunk of text (~0.75 English words). Roughly: 1 token ≈ 4 English characters or 1.5 Chinese characters. Paste your prompt text above to get an instant estimate. A typical 500-word prompt uses about 650-750 tokens. OpenAI charges per 1 million tokens processed.', zh: 'Token 是模型读取或生成的文本块（约 0.75 个英文单词）。大致：1 Token ≈ 4 个英文字符或 1.5 个中文字符。粘贴你的提示文本即可即时估算。一篇 500 字的提示大约使用 650-750 个 Token。OpenAI 按每百万 Token 计费。' },
  'tools.solopreneur-openai-token-calculator.faq.1.q': { en: 'Which model is cheapest in 2026?', zh: '2026 年哪个模型最便宜？' },
  'tools.solopreneur-openai-token-calculator.faq.1.a': { en: 'GPT-5 Nano at $0.05/$0.40 per 1M input/output tokens is the absolute cheapest. For higher-quality tasks, GPT-5 Mini at $0.25/$2.00 offers the best quality-to-cost ratio — 20× cheaper than GPT-5.5 for similar quality on most tasks.', zh: 'GPT-5 Nano 以 $0.05/$0.40/百万 Token 的输入/输出价格成为绝对最便宜的选择。对于需要更高质量的任务，GPT-5 Mini 以 $0.25/$2.00 提供了最佳性价比——在大多数任务上比 GPT-5.5 便宜 20 倍，但质量相近。' },
  'tools.solopreneur-openai-token-calculator.faq.2.q': { en: 'How can I reduce my OpenAI API costs?', zh: '如何降低 OpenAI API 成本？' },
  'tools.solopreneur-openai-token-calculator.faq.2.a': { en: '(1) Use Batch API for 50% off on non-urgent requests (up to 24h turnaround). (2) Enable prompt caching — repeated system prompts get 50% off input costs. (3) Route simple tasks to GPT-5 Mini/Nano, reserve GPT-5.5 for complex reasoning. (4) Use shorter prompts and set max_tokens limits. (5) Consider GPT-4.1 for long-context needs instead of stuffing prompts.', zh: '(1) 使用 Batch API 可享受 50% 折扣（最长 24 小时周转）。(2) 启用提示缓存——重复的系统提示可享受输入成本 50% 折扣。(3) 简单任务路由到 GPT-5 Mini/Nano，GPT-5.5 仅用于复杂推理。(4) 使用更短的提示并设置 max_tokens 限制。(5) 对于长上下文需求考虑使用 GPT-4.1，避免过度填充提示。' },
  'tools.solopreneur-openai-token-calculator.faq.3.q': { en: 'When should I use Batch API vs real-time?', zh: '什么时候用 Batch API 而不是实时 API？' },
  'tools.solopreneur-openai-token-calculator.faq.3.a': { en: 'Batch API gives 50% discount but processes asynchronously (typically within 24 hours). Ideal for: bulk classification, data extraction, embeddings generation, non-user-facing analysis. Use real-time for: chatbots, interactive apps, code completion, any user-facing feature. You can mix both in the same application.', zh: 'Batch API 提供 50% 折扣但异步处理（通常在 24 小时内完成）。适合：批量分类、数据提取、嵌入生成、非用户交互分析。实时 API 适合：聊天机器人、交互式应用、代码补全、任何面向用户的功能。两者可在同一应用中混合使用。' },
  'tools.solopreneur-openai-token-calculator.faq.4.q': { en: 'What are GPT-4.1 models best for?', zh: 'GPT-4.1 模型最适合什么场景？' },
  'tools.solopreneur-openai-token-calculator.faq.4.a': { en: 'GPT-4.1 family offers a 1 million token context window — ideal for analyzing entire codebases, processing long legal documents, RAG with large knowledge bases, and multi-document summarization. GPT-4.1 Nano at $0.10/$0.40 gives you the 1M window at near-zero cost for classification and extraction tasks.', zh: 'GPT-4.1 系列提供 100 万 Token 上下文窗口——非常适合分析完整代码库、处理长篇法律文档、大知识库 RAG 和多文档摘要。GPT-4.1 Nano 以 $0.10/$0.40 的价格提供了 1M 窗口，适合分类和提取任务，成本几乎为零。' },
  'tools.solopreneur-openai-token-calculator.faq.5.q': { en: 'How do o-series reasoning models differ from GPT-5?', zh: 'o 系列推理模型与 GPT-5 有何不同？' },
  'tools.solopreneur-openai-token-calculator.faq.5.a': { en: 'o3 and o4-mini use chain-of-thought reasoning internally, making them better at math, coding, and multi-step logic. They produce "reasoning tokens" (visible in the API) that are billed as output. Use o-series for complex analysis, debugging, and financial modeling. Use GPT-5 for general conversation, content, and translation.', zh: 'o3 和 o4-mini 内部使用思维链推理，在数学、编码和多步逻辑方面表现更优。它们产生"推理 Token"（在 API 中可见）并计为输出。使用 o 系列进行复杂分析、调试和财务建模。使用 GPT-5 进行一般对话、内容和翻译。' },
  'tools.solopreneur-openai-token-calculator.faq.6.q': { en: 'What is prompt caching and how much does it save?', zh: '什么是提示缓存？能省多少钱？' },
  'tools.solopreneur-openai-token-calculator.faq.6.a': { en: 'Prompt caching stores repeated content (system prompts, long documents) server-side. Cache hits get a 50% discount on input tokens. For chatbots with a fixed system prompt: the system prompt is charged full price once, then at 50% for subsequent requests. Effective cache hit rates of 30-70% are common in production. Requires prompts >1024 tokens for caching to activate.', zh: '提示缓存在服务端存储重复内容（系统提示、长文档）。缓存命中时输入 Token 享受 50% 折扣。对于有固定系统提示的聊天机器人：系统提示首次按全价计费，后续请求享受 50% 折扣。生产环境中 30-70% 的有效缓存命中率很常见。需要提示超过 1024 个 Token 才能激活缓存。' },
  // OpenAI Token Calculator — how to use
  'tools.solopreneur-openai-token-calculator.how_to_use.0': { en: 'Select one or more OpenAI models to compare (or use a scenario preset).', zh: '选择一个或多个 OpenAI 模型进行对比（或使用场景预设）。' },
  'tools.solopreneur-openai-token-calculator.how_to_use.1': { en: 'Enter your average input and output token counts per request.', zh: '输入每次请求的平均输入和输出 Token 数量。' },
  'tools.solopreneur-openai-token-calculator.how_to_use.2': { en: 'Set your daily request volume and choose real-time or batch pricing.', zh: '设置每日请求量并选择实时或 Batch 计费模式。' },
  'tools.solopreneur-openai-token-calculator.how_to_use.3': { en: 'Optionally set a cache hit rate and monthly growth rate for projections.', zh: '可选设置缓存命中率和月增长率进行投影。' },
  'tools.solopreneur-openai-token-calculator.how_to_use.4': { en: 'Review the bar chart, detail cards, and savings insights to find your optimal model.', zh: '查看柱状图、详情卡片和节约洞察，找到最优模型。' },
  'tools.solopreneur-openai-token-calculator.how_to_use.5': { en: 'Use the usage scenarios table to plan costs at different scales.', zh: '使用用量场景表规划不同规模下的成本。' },
```

- [ ] **Step 2: Verify TypeScript compilation**

```bash
pnpm typecheck
```

Expected: No errors.

---

### Task 9: Build and Verify

- [ ] **Step 1: Run the full type check**

```bash
cd "D:\E\独立站\youtube-tools" && pnpm typecheck
```

Expected: Zero type errors.

- [ ] **Step 2: Build the project**

```bash
cd "D:\E\独立站\youtube-tools" && pnpm build
```

Expected: Build succeeds, dist files generated.

- [ ] **Step 3: Verify the built HTML for the OpenAI calculator contains updated content**

```bash
grep -c "GPT-5.5" "D:\E\独立站\youtube-tools\dist\zh\solopreneur-openai-token-calculator\index.html"
```

Expected: Returns a number > 0 (GPT-5.5 mentioned in the built page).

- [ ] **Step 4: Verify i18n keys are resolved in the built HTML**

```bash
grep "tools.solopreneur-openai-token-calculator.faq" "D:\E\独立站\youtube-tools\dist\zh\solopreneur-openai-token-calculator\index.html"
```

Expected: Should NOT find raw i18n keys — keys should be replaced with translated text. If keys still appear raw, the build i18n pipeline may need adjustment (document this as a known issue).

- [ ] **Step 5: Verify customFn works in Node.js**

```bash
cd "D:\E\独立站\youtube-tools" && node -e "
var customFn = require('fs').readFileSync('src/engines/openai-token-calculator.ts','utf8');
var start = customFn.indexOf('const customFn = \"');
var end = customFn.lastIndexOf('\";');
var fn = customFn.substring(start + 18, end);
var inputs = {inputTokens:'1000',outputTokens:'500',requestsPerDay:'100',pricingMode:'realtime',cacheHitRate:'30',growthRate:'10',projectionMonths:'12',models:'gpt-5-mini,gpt-5.5,gpt-4.1'};
var f = new Function('inputs', 'pick', 'fill', fn);
var result = f(inputs, function(a){return a[0]}, function(t,v){return t});
console.log('Result lines:', result.length);
console.log(result[0].substring(0, 200));
"
```

Expected: Output shows result lines count and the beginning of the analysis text.

- [ ] **Step 6: Commit all changes**

```bash
git add src/engines/openai-token-calculator.ts src/data/tools.ts src/i18n/translations.ts
git commit -m "feat: OpenAI Token Calculator v3 — 14 models, batch/caching, bar chart, growth projections"
```

---

## Self-Review

1. **Spec coverage:** All sections from the design spec are covered:
   - ✅ Section 1 (Model Catalog) → Task 1
   - ✅ Section 2 (Input Design: Presets, Token Estimator, Core Inputs, Advanced Options) → Tasks 2, 3, 6
   - ✅ Section 3 (Output: Bar Chart, Detail Cards, Growth, Insights) → Tasks 4, 5
   - ✅ Section 4 (Architecture) → All tasks follow the architecture
   - ✅ Section 5 (Bug Fixes) → Fixed in Tasks 1, 6, 8 (model key mismatch, i18n, $ prefix)
   - ✅ Section 6 (FAQ) → Task 6
   - ✅ Section 7 (How To Use) → Task 6

2. **Placeholder scan:** No TODOs, TBDs, or incomplete sections found.

3. **Type consistency:** Model keys (`gpt-5.5`, `gpt-5-mini`, etc.) are consistent across MODELS constant, customFn mapping, staticExamples, and tools.ts. Input names (`inputTokens`, `pricingMode`, `cacheHitRate`, etc.) match between engine definition and calculate()/customFn.

