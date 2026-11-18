import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import PRICING from '../../data/ai-pricing.json';
import { pickFlagshipModels } from '../../data/ai-pricing-popular';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// --- Provider & Model definitions ---
interface ModelInfo {
  key: string;
  name: string;
  input: number;
  output: number;
  contextWindow: string;
  provider: string;
}

// Build PROVIDERS from PRICING.llm (auto-syncs with src/data/ai-pricing.json)
// P156: restricted to the comparison FLAGSHIP set (one model per provider = 4),
// which is exactly what the client-side customFn bundle carries. Before this
// the build-time path iterated all 245 models, so the static block said
// "Comparing 245 models across 4 providers" while the live widget compared 4.
// The page's key insight is unchanged: "cheapest overall" was and is
// Gemini 1.5 Flash, which is one of the four flagships.
// See src/data/ai-pricing-popular.ts.
const _buildProviders = (): Record<string, { name: string; models: { key: string; name: string; input: number; output: number; contextWindow: string }[] }> => {
  const out: Record<string, { name: string; models: { key: string; name: string; input: number; output: number; contextWindow: string }[] }> = {};
  const flagged = pickFlagshipModels<{
    name: string;
    input: number;
    output: number;
    contextWindow: string;
  }>(
    Object.fromEntries(
      Object.entries(PRICING.llm).map(([pk, pv]) => [pk, pv.models]),
    ) as Record<
      string,
      Record<string, { name: string; input: number; output: number; contextWindow: string }>
    >,
  );
  for (const [k, v] of Object.entries(PRICING.llm)) {
    out[k] = {
      name: v.name,
      models: Object.entries(flagged[k] ?? {})
        .map(([mk, mv]) => ({ key: mk, name: mv.name, input: mv.input, output: mv.output, contextWindow: mv.contextWindow }))
        .sort((a, b) => a.name.localeCompare(b.name)),
    };
  }
  return out;
};
const PROVIDERS = _buildProviders();

// Provider initials + colors
const PROVIDER_INITIAL: Record<string, string> = {
  openai: 'O', anthropic: 'A', google: 'G', deepseek: 'D',
};
const PROVIDER_COLOR: Record<string, string> = {
  openai: '#10b981', anthropic: '#7c3aed', google: '#3b82f6', deepseek: '#f59e0b',
};

// Build flat model list with provider reference
const ALL_MODELS: ModelInfo[] = [];
for (const [provKey, prov] of Object.entries(PROVIDERS)) {
  for (const m of prov.models) {
    ALL_MODELS.push({ ...m, provider: provKey });
  }
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

const SEP = '─'; // ─

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const inTokens = Math.max(1, Math.min(10_000_000, clampNonNegative(parseInt(inputs.inputTokens)) || 1000));
  const outTokens = Math.max(1, Math.min(10_000_000, clampNonNegative(parseInt(inputs.outputTokens)) || 500));
  const reqsPerDay = Math.max(0, Math.min(1_000_000, clampNonNegative(parseInt(inputs.requestsPerDay)) || 100));
  const pricingMode = inputs.pricingMode === 'batch' ? 'batch' : 'realtime';
  const batchMult = pricingMode === 'batch' ? 0.5 : 1.0;
  const reqsPerMonth = reqsPerDay * 30;

  // --- Compute cost for every model ---
  interface CostEntry {
    model: ModelInfo;
    costPerReq: number;
    monthlyCost: number;
  }

  const allCosts: CostEntry[] = [];
  for (const m of ALL_MODELS) {
    const costPerReq = (inTokens / 1_000_000) * m.input * batchMult + (outTokens / 1_000_000) * m.output * batchMult;
    allCosts.push({
      model: m,
      costPerReq,
      monthlyCost: costPerReq * reqsPerMonth,
    });
  }

  // Sort by monthly cost ascending
  allCosts.sort((a, b) => a.monthlyCost - b.monthlyCost);
  const cheapest = allCosts[0];
  const mostExpensive = allCosts[allCosts.length - 1];
  const maxCost = mostExpensive.monthlyCost;

  const out: string[] = [];
  // P168 B3-8：⭐「📅 Pricing last updated」这一行**从卡片正文里去掉** ——
  //   · 页面用**徽章**显示同一个日期（dataLastUpdated → 「📅 Data updated」）
  //   · codegen 写 staticExamples[0] 时也会过滤掉它（"UI badge covers it"）
  //   ⇒ 留在正文里只会与徽章重复。
  //   ⚠️ 这里**保留空元素**（而不是删这一行）⇒ out 数组结构与之前逐字一致
  //   ⇒ staticExamples[0] 仍以 '\n' 开头 ⇒ 英文页零变化（G9 不需要白名单）。
  out.push('');

  // ================================================================
  // Section 1: Header
  // ================================================================
  const modeEmoji = pricingMode === 'batch' ? '⚡' : '🔴';
  const modeLabel = pricingMode === 'batch' ? 'Batch Pricing (50% off)' : 'Real-time Pricing';
  out.push(
    pricingMode === 'batch'
      ? '$calc_out.section.ai_api_cost_comparison_batch|⚡ Batch Pricing (50% off)|'
      : '$calc_out.section.ai_api_cost_comparison_realtime|🔴 Real-time Pricing|',
  );
  out.push('');
  out.push(
    makeToken('calc_out.ai_api_cost_comparison.row.input_tokens', 'Input: ' + lc(inTokens) + ' tokens/req', { tokens: lc(inTokens) }) +
    ' | ' +
    makeToken('calc_out.ai_api_cost_comparison.row.output_tokens', 'Output: ' + lc(outTokens) + ' tokens/req', { tokens: lc(outTokens) }) +
    ' | ' +
    makeToken('calc_out.ai_api_cost_comparison.row.volume', 'Volume: ' + lc(reqsPerDay) + ' reqs/day (' + lc(reqsPerMonth) + ' reqs/month)', { reqs: lc(reqsPerDay), monthly: lc(reqsPerMonth) }),
  );
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.comparing_models', 'Comparing ' + ALL_MODELS.length + ' models across ' + Object.keys(PROVIDERS).length + ' providers', { models: String(ALL_MODELS.length), providers: String(Object.keys(PROVIDERS).length) }));
  out.push('');

  // ================================================================
  // Section 2: Cheapest Finder
  // ================================================================
  const cheapestProvName = PROVIDERS[cheapest.model.provider].name;
  const cheapestInitial = PROVIDER_INITIAL[cheapest.model.provider];
  out.push('$calc_out.section.ai_api_cost_comparison_cheapest|🏆 Cheapest Model Overall|');
  out.push(SEP.repeat(50));
  out.push(
    '  ' + makeToken('calc_out.ai_api_cost_comparison.row.cheapest_model', '[' + cheapestInitial + '] ' + cheapest.model.name + ' (' + cheapestProvName + ') — ' + fmt(cheapest.monthlyCost) + '/month', { model: cheapest.model.name, provider: cheapestProvName, cost: fmt(cheapest.monthlyCost), initial: cheapestInitial }),
  );
  out.push(
    '  ' + makeToken('calc_out.ai_api_cost_comparison.row.cheapest_rate', 'Rate: ' + fmt(cheapest.model.input) + '/' + fmt(cheapest.model.output) + ' per 1M tokens', { input: fmt(cheapest.model.input), output: fmt(cheapest.model.output) }) +
    ' | ' +
    makeToken('calc_out.ai_api_cost_comparison.row.cheapest_context', 'Context: ' + cheapest.model.contextWindow, { context: cheapest.model.contextWindow }),
  );
  out.push(
    '  ' + makeToken('calc_out.ai_api_cost_comparison.row.per_request', 'Per request: ' + fmt(cheapest.costPerReq), { cost: fmt(cheapest.costPerReq) }) +
    ' | ' +
    makeToken('calc_out.ai_api_cost_comparison.row.daily_cost', 'Daily: ' + fmt(cheapest.costPerReq * reqsPerDay), { cost: fmt(cheapest.costPerReq * reqsPerDay) }) +
    ' | ' +
    makeToken('calc_out.ai_api_cost_comparison.row.monthly_cost', 'Monthly: ' + fmt(cheapest.monthlyCost), { cost: fmt(cheapest.monthlyCost) }),
  );
  // Savings vs most expensive
  const savedVsMax = mostExpensive.monthlyCost - cheapest.monthlyCost;
  const pctSaved = mostExpensive.monthlyCost > 0
    ? Math.round((savedVsMax / mostExpensive.monthlyCost) * 100) : 0;
  out.push(
    '  ' + makeToken('calc_out.ai_api_cost_comparison.row.savings_vs_max', 'Savings vs ' + mostExpensive.model.name + ': ' + fmt(savedVsMax) + '/month (' + pctSaved + '% cheaper)', { model: mostExpensive.model.name, saved: fmt(savedVsMax), pct: String(pctSaved) }),
  );
  out.push('');

  // ================================================================
  // Section 3: Bar Chart — All models, sorted by cost
  // ================================================================
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.model_comparison_header', '📊 Full Model Comparison (' + lc(reqsPerDay) + ' reqs/day)', { reqs: lc(reqsPerDay) }));
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 36;
  for (const c of allCosts) {
    const initial = PROVIDER_INITIAL[c.model.provider];
    const label = '[' + initial + '] ' + c.model.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.model.key === cheapest.model.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    const isCheapest = c.model.key === cheapest.model.key;
    const badge = isCheapest ? ' 🏆' : '';
    // P153: a label too long for the column used to lose its bar entirely.
  //
  // The client-side beautifier (src/pages/[lang]/[slug].astro) recognises a
  // row only when the engine emitted AT LEAST TWO spaces between the label
  // and the bar (regex `^(.+?)\s{2,}([█░]+)\s+[\$](\S+)`), and the engine
  // emits pad(label, W) + ONE separator space. So a label of length >= W
  // ended up with a single space, matched nothing, and the row was left as
  // a bare name with no bar — 93 of the 244 rows at the old width of 24.
  //
  // The fix must NOT widen the column: widening it to fit the longest label
  // (53 chars) pushed this page to 209 KB and broke the page-size budget
  // (200 KB, tests/page-size-guard.test.ts). So the column stays at 24 and
  // a label that overflows it simply gets the two spaces the beautifier
  // needs. Cost: one extra character per overflowing row; the page keeps
  // its previous size and every row renders.
  const labelField = label.length >= 24 ? label + '  ' : pad(label, 24) + ' ';
  out.push(labelField + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + badge);
  }
  out.push('');

  // ================================================================
  // Section 4: Provider Summary
  // ================================================================
  out.push('$calc_out.section.ai_api_cost_comparison_provider_summary|🔍 Provider Summary|');
  out.push(SEP.repeat(50));
  for (const [provKey, prov] of Object.entries(PROVIDERS)) {
    const provCosts = allCosts.filter((c) => c.model.provider === provKey);
    const provCheapest = provCosts[0]; // already sorted by cost
    const provMostExpensive = provCosts[provCosts.length - 1];
    const initial = PROVIDER_INITIAL[provKey];
    out.push(
      '  ' + makeToken('calc_out.ai_api_cost_comparison.row.provider_cheapest', '[' + initial + '] ' + prov.name + ': ' + provCheapest.model.name + ' (cheapest) at ' + fmt(provCheapest.monthlyCost) + '/month', { provider: prov.name, model: provCheapest.model.name, cost: fmt(provCheapest.monthlyCost), initial: initial }) +
      ' | ' +
      makeToken('calc_out.ai_api_cost_comparison.row.provider_range', 'Range: ' + fmt(provCheapest.monthlyCost) + ' – ' + fmt(provMostExpensive.monthlyCost) + '/month', { min: fmt(provCheapest.monthlyCost), max: fmt(provMostExpensive.monthlyCost) })
    );
  }
  out.push('');

  // ================================================================
  // Section 5: Usage Scenarios — Top 5 cheapest at 6 volume tiers
  // ================================================================
  out.push('$calc_out.section.ai_api_cost_comparison_usage_scenarios|📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes|');
  out.push('');

  const top5 = allCosts.slice(0, 5); // top 5 cheapest at current volume
  const tiers = [50, 100, 500, 1000, 5000, 10000];

  // Build a table: rows = models, columns = tiers
  // Header row: "Model" | "50" | "100" | ...
  let headerRow = '$calc_out.ai_api_cost_comparison.row.table_model|Model|' + ' '.repeat(17);
  for (const t of tiers) {
    headerRow += ' | ' + (
      t === 50 ? makeToken('calc_out.ai_api_cost_comparison.row.tier_50', lc(t) + ' reqs/day', { tier: lc(t) }) :
      t === 100 ? makeToken('calc_out.ai_api_cost_comparison.row.tier_100', lc(t) + ' reqs/day', { tier: lc(t) }) :
      t === 500 ? makeToken('calc_out.ai_api_cost_comparison.row.tier_500', lc(t) + ' reqs/day', { tier: lc(t) }) :
      t === 1000 ? makeToken('calc_out.ai_api_cost_comparison.row.tier_1000', lc(t) + ' reqs/day', { tier: lc(t) }) :
      t === 5000 ? makeToken('calc_out.ai_api_cost_comparison.row.tier_5000', lc(t) + ' reqs/day', { tier: lc(t) }) :
      makeToken('calc_out.ai_api_cost_comparison.row.tier_10000', lc(t) + ' reqs/day', { tier: lc(t) })
    ) + ' '.repeat(5);
  }
  out.push(headerRow);

  // Separator
  let sepRow = ''.padEnd(22, SEP);
  for (const _ of tiers) sepRow += '-+-'.padEnd(15, SEP);
  out.push(sepRow);

  for (const entry of top5) {
    const initial = PROVIDER_INITIAL[entry.model.provider];
    const label = '[' + initial + '] ' + entry.model.name;
    let row = pad(label, 22);
    for (const t of tiers) {
      const costAtTier = entry.costPerReq * t * 30;
      row += ' | ' + fmt(costAtTier).padEnd(14);
    }
    out.push(row);
  }

  // Legend
  out.push('');
  out.push(
    makeToken('calc_out.ai_api_cost_comparison.row.legend', 'Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek'),
  );
  out.push('');

  // 🩺 Cost Health (v3)
  out.push('$calc_out.section.ai_api_cost_comparison_cost_health|🩺 Cost Health:|');
  out.push(SEP.repeat(60));
  const top3 = allCosts.slice(0, 3);
  const bottom3 = allCosts.slice(-3).reverse();
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.health_cheapest', '• 🏆 Cheapest overall: ' + top3[0].model.name + ' at ' + fmt(top3[0].monthlyCost) + '/mo (' + top3[0].model.provider + ')', { model: top3[0].model.name, cost: fmt(top3[0].monthlyCost), provider: top3[0].model.provider }));
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.health_most_expensive', '• 💸 Most expensive in this comparison: ' + bottom3[0].model.name + ' at ' + fmt(bottom3[0].monthlyCost) + '/mo', { model: bottom3[0].model.name, cost: fmt(bottom3[0].monthlyCost) }));
  const ratio = bottom3[0].monthlyCost / Math.max(top3[0].monthlyCost, 0.01);
  if (ratio >= 50) out.push(makeToken('calc_out.ai_api_cost_comparison.row.health_spread_50x', '• 🔴 ' + ratio.toFixed(0) + 'x cost spread — ' + bottom3[0].model.name + ' is 50x+ the cheapest. For most workloads, the cheapest model will suffice.', { ratio: ratio.toFixed(0), model: bottom3[0].model.name }));
  else if (ratio >= 10) out.push(makeToken('calc_out.ai_api_cost_comparison.row.health_spread_10x', '• 🟠 ' + ratio.toFixed(0) + 'x cost spread — review whether premium features justify the cost.', { ratio: ratio.toFixed(0) }));
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.health_tradeoffs', '• ℹ️ Each model has trade-offs (context window, speed, capabilities). Don\'t pick purely on price.'));
  out.push('');

  // 🔄 What-If Scenarios (v3)
  out.push('$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|');
  out.push(SEP.repeat(60));
  // Compare each provider's cheapest
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.whatif_switch_cheapest', '• Switch all workloads to cheapest:  save vs current ' + fmt(top3[0].monthlyCost) + '/mo (already optimal)', { cost: fmt(top3[0].monthlyCost) }));
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.whatif_double_volume', '• Double volume to ' + lc(reqsPerDay * 2) + ' reqs/day:  cheapest becomes ' + fmt(top3[0].monthlyCost * 2) + '/mo', { reqs: lc(reqsPerDay * 2), cost: fmt(top3[0].monthlyCost * 2) }));
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.whatif_halve_volume', '• Halve volume to ' + lc(Math.max(1, Math.floor(reqsPerDay / 2))) + ' reqs/day:  save proportionally', { reqs: lc(Math.max(1, Math.floor(reqsPerDay / 2))) }));
  out.push(makeToken('calc_out.ai_api_cost_comparison.row.whatif_cheap_inference', '• If you only need cheap inference: pick ' + top3[0].model.name + ' (cheapest) and route 80% of traffic there', { model: top3[0].model.name }));
  out.push('');

  // 💡 Tip (v3)
  if (ratio >= 10) {
    out.push(makeToken('calc_out.ai_api_cost_comparison.row.tip_spread_10x', '💡 Tip: A 10x+ cost spread between models means the cheapest is probably good enough for 80% of workloads. Route simple queries (summarization, classification, extraction) to it; only escalate complex queries to premium models. Most teams overspend by 5x by sending everything to GPT-5/Claude Opus.'));
  } else if (ratio >= 3) {
    out.push(makeToken('calc_out.ai_api_cost_comparison.row.tip_spread_3x', '💡 Tip: A 3x cost spread means model choice matters. Default to the cheapest that meets your quality bar (run a 50-prompt eval), then upgrade specific workloads only when quality drops. Track quality per task, not per model.'));
  } else {
    out.push(makeToken('calc_out.ai_api_cost_comparison.row.tip_similar_costs', '💡 Tip: Costs are similar across providers — pick based on capabilities, context window, or latency, not price. Most production AI apps spend more on retries from rate limits than they save on per-token pricing.'));
  }
  out.push('');

  return out;
}

// --- customFn: exact sync of calculate(), minified JS ---
const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let F=function(s){return Number.isNaN(s)?0:Math.max(0,s)},A=function(s){const p={};for(const[n,c]of Object.entries(s)){const l=Q[n];l&&c[l]&&(p[n]={[l]:c[l]})}return p},a=function(s){return Math.abs(s)<.01&&s!==0?"$"+s.toFixed(4):"$"+s.toFixed(2)},i=function(s){return s.toLocaleString()},j=function(s,p){return s+" ".repeat(Math.max(0,p-s.length))},G=function(s){const p=Math.max(1,Math.min(1e7,F(parseInt(s.inputTokens))||1e3)),n=Math.max(1,Math.min(1e7,F(parseInt(s.outputTokens))||500)),c=Math.max(0,Math.min(1e6,F(parseInt(s.requestsPerDay))||100)),l=s.pricingMode==="batch"?"batch":"realtime",_=l==="batch"?.5:1,W=c*30,h=[];for(const t of q){const d=p/1e6*t.input*_+n/1e6*t.output*_;h.push({model:t,costPerReq:d,monthlyCost:d*W})}h.sort((t,d)=>t.monthlyCost-d.monthlyCost);const r=h[0],g=h[h.length-1],P=g.monthlyCost,o=[];o.push("");const so=l==="batch"?"⚡":"🔴",io=l==="batch"?"Batch Pricing (50% off)":"Real-time Pricing";o.push(l==="batch"?"$calc_out.section.ai_api_cost_comparison_batch|⚡ Batch Pricing (50% off)|":"$calc_out.section.ai_api_cost_comparison_realtime|🔴 Real-time Pricing|"),o.push(""),o.push(e("calc_out.ai_api_cost_comparison.row.input_tokens","Input: "+i(p)+" tokens/req",{tokens:i(p)})+" | "+e("calc_out.ai_api_cost_comparison.row.output_tokens","Output: "+i(n)+" tokens/req",{tokens:i(n)})+" | "+e("calc_out.ai_api_cost_comparison.row.volume","Volume: "+i(c)+" reqs/day ("+i(W)+" reqs/month)",{reqs:i(c),monthly:i(W)})),o.push(e("calc_out.ai_api_cost_comparison.row.comparing_models","Comparing "+q.length+" models across "+Object.keys(x).length+" providers",{models:String(q.length),providers:String(Object.keys(x).length)})),o.push("");const H=x[r.model.provider].name,B=M[r.model.provider];o.push("$calc_out.section.ai_api_cost_comparison_cheapest|🏆 Cheapest Model Overall|"),o.push(v.repeat(50)),o.push("  "+e("calc_out.ai_api_cost_comparison.row.cheapest_model","["+B+"] "+r.model.name+" ("+H+") — "+a(r.monthlyCost)+"/month",{model:r.model.name,provider:H,cost:a(r.monthlyCost),initial:B})),o.push("  "+e("calc_out.ai_api_cost_comparison.row.cheapest_rate","Rate: "+a(r.model.input)+"/"+a(r.model.output)+" per 1M tokens",{input:a(r.model.input),output:a(r.model.output)})+" | "+e("calc_out.ai_api_cost_comparison.row.cheapest_context","Context: "+r.model.contextWindow,{context:r.model.contextWindow})),o.push("  "+e("calc_out.ai_api_cost_comparison.row.per_request","Per request: "+a(r.costPerReq),{cost:a(r.costPerReq)})+" | "+e("calc_out.ai_api_cost_comparison.row.daily_cost","Daily: "+a(r.costPerReq*c),{cost:a(r.costPerReq*c)})+" | "+e("calc_out.ai_api_cost_comparison.row.monthly_cost","Monthly: "+a(r.monthlyCost),{cost:a(r.monthlyCost)}));const O=g.monthlyCost-r.monthlyCost,S=g.monthlyCost>0?Math.round(O/g.monthlyCost*100):0;o.push("  "+e("calc_out.ai_api_cost_comparison.row.savings_vs_max","Savings vs "+g.model.name+": "+a(O)+"/month ("+S+"% cheaper)",{model:g.model.name,saved:a(O),pct:String(S)})),o.push(""),o.push(e("calc_out.ai_api_cost_comparison.row.model_comparison_header","📊 Full Model Comparison ("+i(c)+" reqs/day)",{reqs:i(c)})),o.push(v.repeat(54));const R=36;for(const t of h){const y="["+M[t.model.provider]+"] "+t.model.name,m=P>0?Math.max(1,Math.round(t.monthlyCost/P*R)):1,b=(t.model.key===r.model.key?"░":"█").repeat(m),k=t.model.key===r.model.key?" 🏆":"",V=y.length>=24?y+"  ":j(y,24)+" ";o.push(V+j(b,R)+" "+a(t.monthlyCost)+k)}o.push(""),o.push("$calc_out.section.ai_api_cost_comparison_provider_summary|🔍 Provider Summary|"),o.push(v.repeat(50));for(const[t,d]of Object.entries(x)){const y=h.filter(J=>J.model.provider===t),m=y[0],C=y[y.length-1],b=M[t];o.push("  "+e("calc_out.ai_api_cost_comparison.row.provider_cheapest","["+b+"] "+d.name+": "+m.model.name+" (cheapest) at "+a(m.monthlyCost)+"/month",{provider:d.name,model:m.model.name,cost:a(m.monthlyCost),initial:b})+" | "+e("calc_out.ai_api_cost_comparison.row.provider_range","Range: "+a(m.monthlyCost)+" – "+a(C.monthlyCost)+"/month",{min:a(m.monthlyCost),max:a(C.monthlyCost)}))}o.push(""),o.push("$calc_out.section.ai_api_cost_comparison_usage_scenarios|📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes|"),o.push("");const Z=h.slice(0,5),$=[50,100,500,1e3,5e3,1e4];let N="$calc_out.ai_api_cost_comparison.row.table_model|Model|"+" ".repeat(17);for(const t of $)N+=" | "+(t===50?e("calc_out.ai_api_cost_comparison.row.tier_50",i(t)+" reqs/day",{tier:i(t)}):t===100?e("calc_out.ai_api_cost_comparison.row.tier_100",i(t)+" reqs/day",{tier:i(t)}):t===500?e("calc_out.ai_api_cost_comparison.row.tier_500",i(t)+" reqs/day",{tier:i(t)}):t===1e3?e("calc_out.ai_api_cost_comparison.row.tier_1000",i(t)+" reqs/day",{tier:i(t)}):t===5e3?e("calc_out.ai_api_cost_comparison.row.tier_5000",i(t)+" reqs/day",{tier:i(t)}):e("calc_out.ai_api_cost_comparison.row.tier_10000",i(t)+" reqs/day",{tier:i(t)}))+" ".repeat(5);o.push(N);let z="".padEnd(22,v);for(const t of $)z+="-+-".padEnd(15,v);o.push(z);for(const t of Z){const y="["+M[t.model.provider]+"] "+t.model.name;let m=j(y,22);for(const C of $){const b=t.costPerReq*C*30;m+=" | "+a(b).padEnd(14)}o.push(m)}o.push(""),o.push(e("calc_out.ai_api_cost_comparison.row.legend","Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek")),o.push(""),o.push("$calc_out.section.ai_api_cost_comparison_cost_health|🩺 Cost Health:|"),o.push(v.repeat(60));const u=h.slice(0,3),w=h.slice(-3).reverse();o.push(e("calc_out.ai_api_cost_comparison.row.health_cheapest","• 🏆 Cheapest overall: "+u[0].model.name+" at "+a(u[0].monthlyCost)+"/mo ("+u[0].model.provider+")",{model:u[0].model.name,cost:a(u[0].monthlyCost),provider:u[0].model.provider})),o.push(e("calc_out.ai_api_cost_comparison.row.health_most_expensive","• 💸 Most expensive in this comparison: "+w[0].model.name+" at "+a(w[0].monthlyCost)+"/mo",{model:w[0].model.name,cost:a(w[0].monthlyCost)}));const f=w[0].monthlyCost/Math.max(u[0].monthlyCost,.01);return f>=50?o.push(e("calc_out.ai_api_cost_comparison.row.health_spread_50x","• 🔴 "+f.toFixed(0)+"x cost spread — "+w[0].model.name+" is 50x+ the cheapest. For most workloads, the cheapest model will suffice.",{ratio:f.toFixed(0),model:w[0].model.name})):f>=10&&o.push(e("calc_out.ai_api_cost_comparison.row.health_spread_10x","• 🟠 "+f.toFixed(0)+"x cost spread — review whether premium features justify the cost.",{ratio:f.toFixed(0)})),o.push(e("calc_out.ai_api_cost_comparison.row.health_tradeoffs","• ℹ️ Each model has trade-offs (context window, speed, capabilities). Don't pick purely on price.")),o.push(""),o.push("$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|"),o.push(v.repeat(60)),o.push(e("calc_out.ai_api_cost_comparison.row.whatif_switch_cheapest","• Switch all workloads to cheapest:  save vs current "+a(u[0].monthlyCost)+"/mo (already optimal)",{cost:a(u[0].monthlyCost)})),o.push(e("calc_out.ai_api_cost_comparison.row.whatif_double_volume","• Double volume to "+i(c*2)+" reqs/day:  cheapest becomes "+a(u[0].monthlyCost*2)+"/mo",{reqs:i(c*2),cost:a(u[0].monthlyCost*2)})),o.push(e("calc_out.ai_api_cost_comparison.row.whatif_halve_volume","• Halve volume to "+i(Math.max(1,Math.floor(c/2)))+" reqs/day:  save proportionally",{reqs:i(Math.max(1,Math.floor(c/2)))})),o.push(e("calc_out.ai_api_cost_comparison.row.whatif_cheap_inference","• If you only need cheap inference: pick "+u[0].model.name+" (cheapest) and route 80% of traffic there",{model:u[0].model.name})),o.push(""),f>=10?o.push(e("calc_out.ai_api_cost_comparison.row.tip_spread_10x","💡 Tip: A 10x+ cost spread between models means the cheapest is probably good enough for 80% of workloads. Route simple queries (summarization, classification, extraction) to it; only escalate complex queries to premium models. Most teams overspend by 5x by sending everything to GPT-5/Claude Opus.")):f>=3?o.push(e("calc_out.ai_api_cost_comparison.row.tip_spread_3x","💡 Tip: A 3x cost spread means model choice matters. Default to the cheapest that meets your quality bar (run a 50-prompt eval), then upgrade specific workloads only when quality drops. Track quality per task, not per model.")):o.push(e("calc_out.ai_api_cost_comparison.row.tip_similar_costs","💡 Tip: Costs are similar across providers — pick based on capabilities, context window, or latency, not price. Most production AI apps spend more on retries from rate limits than they save on per-token pricing.")),o.push(""),o},D=function(s,p,n){var c=Y(s);return Array.isArray(c)?c.join(\`
\`):String(c)};var E=F,L=A,T=a,oo=i,to=j,eo=G,ao=D,K={llm:{openai:{name:"OpenAI",cacheReadMult:null,models:{"gpt-5-mini":{input:.25,output:2,batchInput:.125,batchOutput:1,name:"GPT 5 Mini",family:"gpt5",contextWindow:"272K",order:8}}},anthropic:{name:"Anthropic",cacheReadMult:.1,cacheWriteMult5m:1.25,cacheWriteMult1h:2,models:{"claude-haiku-3":{input:.25,output:1.25,batchInput:.125,batchOutput:.625,name:"Claude Haiku 3",family:"legacy",contextWindow:"200K",maxOutput:"4K",order:13}}},google:{name:"Google",cacheReadMult:.1,models:{"gemini-1.5-flash":{input:.075,output:.3,batchInput:0,batchOutput:0,name:"Gemini 1.5 Flash",family:"legacy",contextWindow:"1M",order:8,icon:"◇",supportsCache:!1,supportsBatch:!1}}},deepseek:{name:"DeepSeek",cacheReadMult:.02,models:{"deepseek-v4.1-flash-1017":{input:.15,output:.6,name:"Deepseek V4.1 Flash 1017",family:"v4",contextWindow:"1M",order:1}}}}},e=tk,U={comparisonFlagshipKeys:{openai:"gpt-5-mini",anthropic:"claude-haiku-3",google:"gemini-1.5-flash",deepseek:"deepseek-v4.1-flash-1017"}},Q=U.comparisonFlagshipKeys,X='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+X)(),I=()=>{const s={},p=A(Object.fromEntries(Object.entries(K.llm).map(([n,c])=>[n,c.models])));for(const[n,c]of Object.entries(K.llm))s[n]={name:c.name,models:Object.entries(p[n]??{}).map(([l,_])=>({key:l,name:_.name,input:_.input,output:_.output,contextWindow:_.contextWindow})).sort((l,_)=>l.name.localeCompare(_.name))};return s},x={openai:{name:"OpenAI",models:[{key:"gpt-5-mini",name:"GPT 5 Mini",input:.25,output:2,contextWindow:"272K"}]},anthropic:{name:"Anthropic",models:[{key:"claude-haiku-3",name:"Claude Haiku 3",input:.25,output:1.25,contextWindow:"200K"}]},google:{name:"Google",models:[{key:"gemini-1.5-flash",name:"Gemini 1.5 Flash",input:.075,output:.3,contextWindow:"1M"}]},deepseek:{name:"DeepSeek",models:[{key:"deepseek-v4.1-flash-1017",name:"Deepseek V4.1 Flash 1017",input:.15,output:.6,contextWindow:"1M"}]}},M={openai:"O",anthropic:"A",google:"G",deepseek:"D"},q=[];for(const[s,p]of Object.entries(x))for(const n of p.models)q.push({...n,provider:s});var v="─",Y=function(s){return G(s)};return[D(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`

const engine: ToolEngine = {
  slug: 'solopreneur-ai-api-cost-comparison',
  title: 'AI API Cost Comparison',
  description: 'Cross-provider AI API cost comparison across the full OpenAI, Anthropic, Google and DeepSeek model lineups — find the cheapest model for your usage with bar chart, provider summary, and volume scenario planning.',
  inputs: [
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
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
  // P151: preset chips — replaces dead PRESETS const. Each preset fills
  // the form inputs from preset.fields; the page renders one button per entry.
  presets: [
    { key: 'support-bot',   emoji: '💬', fields: { inputTokens: '800',  outputTokens: '200',  requestsPerDay: '500',   pricingMode: 'realtime' } },
    { key: 'rag-qa',        emoji: '🔍', fields: { inputTokens: '3000', outputTokens: '400',  requestsPerDay: '200',   pricingMode: 'realtime' } },
    { key: 'code-review',   emoji: '👀', fields: { inputTokens: '5000', outputTokens: '800',  requestsPerDay: '50',    pricingMode: 'realtime' } },
    { key: 'content-gen',   emoji: '✍️', fields: { inputTokens: '500',  outputTokens: '2000', requestsPerDay: '100',   pricingMode: 'realtime' } },
    { key: 'data-analysis', emoji: '📊', fields: { inputTokens: '4000', outputTokens: '3000', requestsPerDay: '30',    pricingMode: 'realtime' } },
    { key: 'batch',         emoji: '⚡', fields: { inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000', pricingMode: 'batch'    } },
  ],
  staticExamples: [
    '\n$calc_out.section.ai_api_cost_comparison_realtime|🔴 Real-time Pricing|\n\n$calc_out.ai_api_cost_comparison.row.input_tokens{"tokens":"1,000"}|Input: 1,000 tokens/req| | $calc_out.ai_api_cost_comparison.row.output_tokens{"tokens":"500"}|Output: 500 tokens/req| | $calc_out.ai_api_cost_comparison.row.volume{"reqs":"100","monthly":"3,000"}|Volume: 100 reqs/day (3,000 reqs/month)|\n$calc_out.ai_api_cost_comparison.row.comparing_models{"models":"4","providers":"4"}|Comparing 4 models across 4 providers|\n\n$calc_out.section.ai_api_cost_comparison_cheapest|🏆 Cheapest Model Overall|\n──────────────────────────────────────────────────\n  $calc_out.ai_api_cost_comparison.row.cheapest_model{"model":"Gemini 1.5 Flash","provider":"Google","cost":"$0.67","initial":"G"}|[G] Gemini 1.5 Flash (Google) — $0.67/month|\n  $calc_out.ai_api_cost_comparison.row.cheapest_rate{"input":"$0.07","output":"$0.30"}|Rate: $0.07/$0.30 per 1M tokens| | $calc_out.ai_api_cost_comparison.row.cheapest_context{"context":"1M"}|Context: 1M|\n  $calc_out.ai_api_cost_comparison.row.per_request{"cost":"$0.0002"}|Per request: $0.0002| | $calc_out.ai_api_cost_comparison.row.daily_cost{"cost":"$0.02"}|Daily: $0.02| | $calc_out.ai_api_cost_comparison.row.monthly_cost{"cost":"$0.67"}|Monthly: $0.67|\n  $calc_out.ai_api_cost_comparison.row.savings_vs_max{"model":"GPT 5 Mini","saved":"$3.08","pct":"82"}|Savings vs GPT 5 Mini: $3.08/month (82% cheaper)|\n\n$calc_out.ai_api_cost_comparison.row.model_comparison_header{"reqs":"100"}|📊 Full Model Comparison (100 reqs/day)|\n──────────────────────────────────────────────────────\n[G] Gemini 1.5 Flash     ░░░░░░                               $0.67 🏆\n[D] Deepseek V4.1 Flash 1017  █████████████                        $1.35\n[A] Claude Haiku 3       █████████████████████████            $2.63\n[O] GPT 5 Mini           ████████████████████████████████████ $3.75\n\n$calc_out.section.ai_api_cost_comparison_provider_summary|🔍 Provider Summary|\n──────────────────────────────────────────────────\n  $calc_out.ai_api_cost_comparison.row.provider_cheapest{"provider":"OpenAI","model":"GPT 5 Mini","cost":"$3.75","initial":"O"}|[O] OpenAI: GPT 5 Mini (cheapest) at $3.75/month| | $calc_out.ai_api_cost_comparison.row.provider_range{"min":"$3.75","max":"$3.75"}|Range: $3.75 – $3.75/month|\n  $calc_out.ai_api_cost_comparison.row.provider_cheapest{"provider":"Anthropic","model":"Claude Haiku 3","cost":"$2.63","initial":"A"}|[A] Anthropic: Claude Haiku 3 (cheapest) at $2.63/month| | $calc_out.ai_api_cost_comparison.row.provider_range{"min":"$2.63","max":"$2.63"}|Range: $2.63 – $2.63/month|\n  $calc_out.ai_api_cost_comparison.row.provider_cheapest{"provider":"Google","model":"Gemini 1.5 Flash","cost":"$0.67","initial":"G"}|[G] Google: Gemini 1.5 Flash (cheapest) at $0.67/month| | $calc_out.ai_api_cost_comparison.row.provider_range{"min":"$0.67","max":"$0.67"}|Range: $0.67 – $0.67/month|\n  $calc_out.ai_api_cost_comparison.row.provider_cheapest{"provider":"DeepSeek","model":"Deepseek V4.1 Flash 1017","cost":"$1.35","initial":"D"}|[D] DeepSeek: Deepseek V4.1 Flash 1017 (cheapest) at $1.35/month| | $calc_out.ai_api_cost_comparison.row.provider_range{"min":"$1.35","max":"$1.35"}|Range: $1.35 – $1.35/month|\n\n$calc_out.section.ai_api_cost_comparison_usage_scenarios|📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes|\n\n$calc_out.ai_api_cost_comparison.row.table_model|Model|                  | $calc_out.ai_api_cost_comparison.row.tier_50{"tier":"50"}|50 reqs/day|      | $calc_out.ai_api_cost_comparison.row.tier_100{"tier":"100"}|100 reqs/day|      | $calc_out.ai_api_cost_comparison.row.tier_500{"tier":"500"}|500 reqs/day|      | $calc_out.ai_api_cost_comparison.row.tier_1000{"tier":"1,000"}|1,000 reqs/day|      | $calc_out.ai_api_cost_comparison.row.tier_5000{"tier":"5,000"}|5,000 reqs/day|      | $calc_out.ai_api_cost_comparison.row.tier_10000{"tier":"10,000"}|10,000 reqs/day|     \n──────────────────────-+-────────────-+-────────────-+-────────────-+-────────────-+-────────────-+-────────────\n[G] Gemini 1.5 Flash   | $0.34          | $0.67          | $3.38          | $6.75          | $33.75         | $67.50        \n[D] Deepseek V4.1 Flash 1017 | $0.67          | $1.35          | $6.75          | $13.50         | $67.50         | $135.00       \n[A] Claude Haiku 3     | $1.31          | $2.63          | $13.13         | $26.25         | $131.25        | $262.50       \n[O] GPT 5 Mini         | $1.88          | $3.75          | $18.75         | $37.50         | $187.50        | $375.00       \n\n$calc_out.ai_api_cost_comparison.row.legend|Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek|\n\n$calc_out.section.ai_api_cost_comparison_cost_health|🩺 Cost Health:|\n────────────────────────────────────────────────────────────\n$calc_out.ai_api_cost_comparison.row.health_cheapest{"model":"Gemini 1.5 Flash","cost":"$0.67","provider":"google"}|• 🏆 Cheapest overall: Gemini 1.5 Flash at $0.67/mo (google)|\n$calc_out.ai_api_cost_comparison.row.health_most_expensive{"model":"GPT 5 Mini","cost":"$3.75"}|• 💸 Most expensive in this comparison: GPT 5 Mini at $3.75/mo|\n$calc_out.ai_api_cost_comparison.row.health_tradeoffs|• ℹ️ Each model has trade-offs (context window, speed, capabilities). Don\'t pick purely on price.|\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n────────────────────────────────────────────────────────────\n$calc_out.ai_api_cost_comparison.row.whatif_switch_cheapest{"cost":"$0.67"}|• Switch all workloads to cheapest:  save vs current $0.67/mo (already optimal)|\n$calc_out.ai_api_cost_comparison.row.whatif_double_volume{"reqs":"200","cost":"$1.35"}|• Double volume to 200 reqs/day:  cheapest becomes $1.35/mo|\n$calc_out.ai_api_cost_comparison.row.whatif_halve_volume{"reqs":"50"}|• Halve volume to 50 reqs/day:  save proportionally|\n$calc_out.ai_api_cost_comparison.row.whatif_cheap_inference{"model":"Gemini 1.5 Flash"}|• If you only need cheap inference: pick Gemini 1.5 Flash (cheapest) and route 80% of traffic there|\n\n$calc_out.ai_api_cost_comparison.row.tip_spread_3x|💡 Tip: A 3x cost spread means model choice matters. Default to the cheapest that meets your quality bar (run a 50-prompt eval), then upgrade specific workloads only when quality drops. Track quality per task, not per model.|\n',
    '[D] V4 Flash: 50→$0.18 · 100→$0.37 · 500→$1.84 · 1,000→$3.68 · 5,000→$18.45 · 10,000→$36.90',
    '[O] GPT-5 Nano: 50→$0.23 · 100→$0.45 · 500→$2.25 · 1,000→$4.50 · 5,000→$22.50 · 10,000→$45.00',
    '[G] Gemini 1.5 Flash: 50→$0.22 · 100→$0.45 · 500→$2.25 · 1,000→$4.50 · 5,000→$22.50 · 10,000→$45.00',
    '[D] V4 Pro (Promo): 50→$0.56 · 100→$1.12 · 500→$5.64 · 1,000→$11.28 · 5,000→$56.42 · 10,000→$112.84',
  ],
  faq: [
    {
      q: 'Which AI API is the absolute cheapest in 2026?',
      a: 'DeepSeek Coder at {{live:deepseek/deepseek-coder}} per 1M input/output tokens is the cheapest model in our table, and DeepSeek V4.1 Flash 1017 ({{live:deepseek/deepseek-v4.1-flash-1017}}, released 2026-10-17) is the newest frontier-quality DeepSeek option. OpenAI GPT-5 Nano ({{live:openai/gpt-5-nano}}) costs {{liveShareIn:openai/gpt-5-nano|google/gemini-1.5-flash}} of Gemini 1.5 Flash ({{live:google/gemini-1.5-flash}}) on input but {{liveShareOut:openai/gpt-5-nano|google/gemini-1.5-flash}} on output. At scale (millions of requests), DeepSeek V4.1 Flash 1017 costs {{liveShareMix:deepseek/deepseek-v4.1-flash-1017|openai/gpt-5.5}} of GPT-5.5 ({{live:openai/gpt-5.5}}) and {{liveShareMix:deepseek/deepseek-v4.1-flash-1017|anthropic/claude-fable-5}} of Claude Fable 5 ({{live:anthropic/claude-fable-5}}).',
    },
    {
      q: 'Should I always use the cheapest model?',
      a: 'Not necessarily. Match the model to the task: use ultra-cheap models (GPT-5 Nano, V4 Flash, Haiku 3) for classification, routing, simple Q&A. Use mid-tier (GPT-5 Mini, V4 Pro Promo, Gemini 3 Flash) for general-purpose chat and content. Reserve premium models (GPT-5.5, Claude Fable 5, Sonnet 4.6) only for complex reasoning, code generation, and safety-critical applications.',
    },
    {
      q: 'How does batch pricing affect costs?',
      a: 'Batch pricing cuts costs by 50% across all providers with async processing (typically within 24 hours). OpenAI, Anthropic, and Google all offer batch APIs. Use batch for: bulk data processing, overnight analytics, content pipelines, data labeling. Real-time is for: chatbots, interactive apps, code assistants. DeepSeek does not offer batch pricing — but it is already the cheapest option.',
    },
    {
      q: 'What is the cost difference at enterprise scale?',
      a: 'At 300,000 requests/month (10,000 reqs/day) with 1K input + 500 output tokens: DeepSeek V4 Flash costs {{liveMonthlyAt:deepseek/deepseek-v4-flash|300000}}/month. OpenAI GPT-5 Nano costs {{liveMonthlyAt:openai/gpt-5-nano|300000}}/month. Gemini 1.5 Flash costs {{liveMonthlyAt:google/gemini-1.5-flash|300000}}/month. Claude Haiku 3 costs {{liveMonthlyAt:anthropic/claude-haiku-3|300000}}/month. GPT-5.5 costs {{liveMonthlyAt:openai/gpt-5.5|300000}}/month. Claude Fable 5 costs {{liveMonthlyAt:anthropic/claude-fable-5|300000}}/month. Gemini 1.5 Flash is {{liveShareMix:google/gemini-1.5-flash|anthropic/claude-fable-5}} of Claude Fable 5\'s bill, which is why enterprise teams route traffic by tier instead of sending everything to one premium model.',
    },
    {
      q: 'How do I switch between AI providers easily?',
      a: 'Use an AI gateway like LiteLLM, Portkey, or OpenRouter that provides a unified OpenAI-compatible API. Deploy with tiered routing: cheapest model first (V4 Flash/GPT-5 Nano), fallback to mid-tier on failure, premium only for flagged high-complexity requests. This "model tiering" strategy typically reduces total costs by 80-90% vs using a single premium model.',
    },
    {
      q: 'Do these providers offer free tiers?',
      a: 'OpenAI: free ChatGPT usage (not API). Google: free tier via AI Studio (1,500 reqs/day on select models). Anthropic: free claude.ai usage only. DeepSeek: pay-as-you-go only but ultra-low prices with generous initial credits. All major providers offer startup credits ($5K-$25K) through partner programs like AWS Activate, Google Cloud for Startups, etc.',
    },
    {
      q: 'Which provider is best for my use case?',
      a: 'Budget + good quality: DeepSeek V4 Flash. Best free tier: Gemini 1.5 Flash (Google AI Studio). Best safety: Anthropic Claude models. Best ecosystem/tools: OpenAI. Best multimodal: Gemini 3.5 Flash. Best for coding: Claude Sonnet 4.6 or GPT-5. For most solopreneurs, using DeepSeek V4 Flash for 90% of tasks + a premium model for the remaining 10% is the optimal cost-quality strategy.',
    },
    { q: "How do I choose between batch and real-time pricing?", a: "Real-time: sub-second response, used for chatbots, code assistants, interactive apps. Batch: 50% off, 24h turnaround, used for bulk processing, content pipelines, data labeling. Use batch for 80% of non-user-facing workloads to halve costs." },
    { q: "What is the cost difference between input and output tokens?", a: "Output tokens cost more than input tokens across all providers. A 1K input + 500 output request on GPT-5: {{liveCostIn:openai/gpt-5|1000}} + {{liveCostOut:openai/gpt-5|500}} = {{liveCostMix:openai/gpt-5|1000|500}}. The output side is {{liveCostOut:openai/gpt-5|500}} of that {{liveCostMix:openai/gpt-5|1000|500}} total. To save: write tighter prompts, ask for shorter responses, use lower max_tokens when possible." },
    { q: "How should I budget for AI costs as a startup?", a: "Rule of thumb: $0.001-0.01 per user interaction for simple chatbots; $0.01-0.10 for complex agents. For 10K MAU with 5 interactions/day on a mid-tier model: $150-1500/month. Track cost per user, not just total spend. Aim for AI cost <20% of revenue." },
    { q: "What is the cheapest model that still works for production?", a: "For most production workloads in 2026: Gemini 1.5 Flash ({{live:google/gemini-1.5-flash}}) or DeepSeek V4.1 Flash 1017 ({{live:deepseek/deepseek-v4.1-flash-1017}}). Quality is competitive with GPT-4-class models for typical tasks. Reserve GPT-5/Claude Opus for the 5-10% of hard cases that need premium reasoning." },
    { q: "How do I estimate cost for a RAG system?", a: "Cost = (query embedding cost) + (retrieval: free) + (LLM context cost: prompt + retrieved chunks + completion). For 1K queries/day with 5K retrieved chunks each: ~$5-50/month on Flash models. Embeddings cost ~$0.01/1M tokens with Ada." },
    { q: "What is AI gateway and why should I use one?", a: "AI gateways (LiteLLM, Portkey, OpenRouter) provide unified OpenAI-compatible API across providers. Benefits: provider failover, automatic cost optimization, rate limit pooling, audit logging, fallbacks. Many startups save 50-80% by routing each request to the cheapest provider that meets quality needs." },
    { q: "How do I track AI costs across an organization?", a: "Tag requests by feature/user/department. Track: requests/day, input tokens, output tokens, cost per request. Tools: OpenAI dashboard, Anthropic Console, custom analytics via gateway. Set per-feature budget alerts. Review weekly." },
    { q: "What are common cost optimization mistakes?", a: "Sending everything to GPT-5 (use tiered routing). Not using prompt caching (50-90% off repeated prefixes). Paying for embeddings on every request (cache them). Sending full chat history when summary suffices. Long system prompts that repeat on every call. Max_tokens too high." },
  ],
  howToUse: [
    'Enter your average input tokens per API request.',
    'Enter your average output tokens per API request.',
    'Set your expected daily request volume.',
    'Choose real-time or batch pricing (batch gives 50% off for async jobs).',
    'Review the bar chart to see every model ranked by monthly cost.',
    'Check the Provider Summary to find the cheapest model from each provider, and use the Usage Scenarios table to plan costs at different volumes.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
  engineKey: true,
};

registerEngine(engine);
