import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';
import PRICING from '../data/ai-pricing.json';

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
const _buildProviders = (): Record<string, { name: string; models: { key: string; name: string; input: number; output: number; contextWindow: string }[] }> => {
  const out: Record<string, { name: string; models: { key: string; name: string; input: number; output: number; contextWindow: string }[] }> = {};
  for (const [k, v] of Object.entries(PRICING.llm)) {
    out[k] = {
      name: v.name,
      models: Object.entries(v.models)
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

// Presets
const PRESETS: Record<string, Record<string, string>> = {
  'Support Bot': {
    inputTokens: '800', outputTokens: '200', requestsPerDay: '500', pricingMode: 'realtime',
  },
  'RAG Q&A': {
    inputTokens: '3000', outputTokens: '400', requestsPerDay: '200', pricingMode: 'realtime',
  },
  'Code Review': {
    inputTokens: '5000', outputTokens: '800', requestsPerDay: '50', pricingMode: 'realtime',
  },
  'Content Gen': {
    inputTokens: '500', outputTokens: '2000', requestsPerDay: '100', pricingMode: 'realtime',
  },
  'Data Analysis': {
    inputTokens: '4000', outputTokens: '3000', requestsPerDay: '30', pricingMode: 'realtime',
  },
  'Batch Processing': {
    inputTokens: '3000', outputTokens: '5000', requestsPerDay: '10000', pricingMode: 'batch',
  },
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

const SEP = '─'; // ─

function calculate(inputs: Record<string, string>): string[] {
  // --- Parse inputs ---
  const inTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.inputTokens) || 1000));
  const outTokens = Math.max(1, Math.min(10_000_000, parseInt(inputs.outputTokens) || 500));
  const reqsPerDay = Math.max(0, Math.min(1_000_000, parseInt(inputs.requestsPerDay) || 100));
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
  out.push('📅 Pricing last updated: ' + (PRICING.lastUpdated || 'unknown') + ' (data synced weekly)');
  out.push('');

  // ================================================================
  // Section 1: Header
  // ================================================================
  const modeEmoji = pricingMode === 'batch' ? '⚡' : '🔴';
  const modeLabel = pricingMode === 'batch' ? 'Batch Pricing (50% off)' : 'Real-time Pricing';
  out.push(modeEmoji + ' ' + modeLabel);
  out.push('');
  out.push(
    'Input: ' + lc(inTokens) + ' tokens/req | ' +
    'Output: ' + lc(outTokens) + ' tokens/req | ' +
    'Volume: ' + lc(reqsPerDay) + ' reqs/day (' + lc(reqsPerMonth) + ' reqs/month)',
  );
  out.push('Comparing ' + ALL_MODELS.length + ' models across ' + Object.keys(PROVIDERS).length + ' providers');
  out.push('');

  // ================================================================
  // Section 2: Cheapest Finder
  // ================================================================
  const cheapestProvName = PROVIDERS[cheapest.model.provider].name;
  const cheapestInitial = PROVIDER_INITIAL[cheapest.model.provider];
  out.push('🏆 Cheapest Model Overall');
  out.push(SEP.repeat(50));
  out.push(
    '  [' + cheapestInitial + '] ' + cheapest.model.name +
    ' (' + cheapestProvName + ')' +
    ' — ' + fmt(cheapest.monthlyCost) + '/month',
  );
  out.push(
    '  Rate: ' + fmt(cheapest.model.input) + '/' + fmt(cheapest.model.output) +
    ' per 1M tokens | Context: ' + cheapest.model.contextWindow,
  );
  out.push(
    '  Per request: ' + fmt(cheapest.costPerReq) +
    ' | Daily: ' + fmt(cheapest.costPerReq * reqsPerDay) +
    ' | Monthly: ' + fmt(cheapest.monthlyCost),
  );
  // Savings vs most expensive
  const savedVsMax = mostExpensive.monthlyCost - cheapest.monthlyCost;
  const pctSaved = mostExpensive.monthlyCost > 0
    ? Math.round((savedVsMax / mostExpensive.monthlyCost) * 100) : 0;
  out.push(
    '  Savings vs ' + mostExpensive.model.name + ': ' +
    fmt(savedVsMax) + '/month (' + pctSaved + '% cheaper)',
  );
  out.push('');

  // ================================================================
  // Section 3: Bar Chart — All models, sorted by cost
  // ================================================================
  out.push('📊 Full Model Comparison (' + lc(reqsPerDay) + ' reqs/day)');
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
    out.push(pad(label, 24) + ' ' + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + badge);
  }
  out.push('');

  // ================================================================
  // Section 4: Provider Summary
  // ================================================================
  out.push('🔍 Provider Summary');
  out.push(SEP.repeat(50));
  for (const [provKey, prov] of Object.entries(PROVIDERS)) {
    const provCosts = allCosts.filter((c) => c.model.provider === provKey);
    const provCheapest = provCosts[0]; // already sorted by cost
    const provMostExpensive = provCosts[provCosts.length - 1];
    const initial = PROVIDER_INITIAL[provKey];
    out.push(
      '  [' + initial + '] ' + prov.name + ': ' +
      provCheapest.model.name + ' (cheapest) at ' + fmt(provCheapest.monthlyCost) + '/month' +
      ' | Range: ' + fmt(provCheapest.monthlyCost) + ' – ' + fmt(provMostExpensive.monthlyCost) + '/month',
    );
  }
  out.push('');

  // ================================================================
  // Section 5: Usage Scenarios — Top 5 cheapest at 6 volume tiers
  // ================================================================
  out.push('📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes');
  out.push('');

  const top5 = allCosts.slice(0, 5); // top 5 cheapest at current volume
  const tiers = [50, 100, 500, 1000, 5000, 10000];

  // Build a table: rows = models, columns = tiers
  // Header row: "Model" | "50" | "100" | ...
  let headerRow = 'Model'.padEnd(22);
  for (const t of tiers) {
    headerRow += ' | ' + lc(t) + ' reqs/day'.padEnd(14);
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
    'Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek',
  );

  return out;
}

// --- customFn: exact sync of calculate(), minified JS ---
const customFn =
  // PROVIDERS data
  "var P={" +
  "openai:{n:'OpenAI',m:[{k:'gpt-5-mini',n:'GPT 5Mini',i:0.25,o:2,cw:'272K'}]}," +
  "anthropic:{n:'Anthropic',m:[{k:'claude-haiku-3',n:'Claude Haiku 3',i:0.25,o:1.25,cw:'200K'}]}," +
  "google:{n:'Google',m:[{k:'gemini-1.5-flash',n:'Gemini 1.5 Flash',i:0.075,o:0.3,cw:'1M'}]}," +
  "deepseek:{n:'DeepSeek',m:[{k:'deepseek-v4-flash',n:'DeepSeek V4 Flash',i:0.14,o:0.28,cw:'1M'}]}};" +
  // Provider initials + colors
  "var PI={openai:'O',anthropic:'A',google:'G',deepseek:'D'};" +
  // Build flat list
  "var AM=[];" +
  "for(var pk in P){var pv=P[pk];for(var i=0;i<pv.m.length;i++){var m=pv.m[i];AM.push({k:m.k,n:m.n,i:m.i,o:m.o,cw:m.cw,pr:pk});}}" +
  // Helpers
  "function fm(n){if(Math.abs(n)<0.01&&n!==0)return '$'+n.toFixed(4);return '$'+n.toFixed(2)}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP='\\u2500';" +
  // Parse inputs
  "var iT=Math.max(1,Math.min(1e7,parseInt(inputs.inputTokens)||1000));" +
  "var oT=Math.max(1,Math.min(1e7,parseInt(inputs.outputTokens)||500));" +
  "var rpd=Math.max(0,Math.min(1e6,parseInt(inputs.requestsPerDay)||100));" +
  "var pm=inputs.pricingMode||'realtime';" +
  "var bm=pm==='batch'?0.5:1;var rpm=rpd*30;" +
  // Compute costs
  "var ac=[];" +
  "for(var i=0;i<AM.length;i++){var m=AM[i];var cpr=(iT/1e6)*m.i*bm+(oT/1e6)*m.o*bm;ac.push({m:m,cpr:cpr,mc:cpr*rpm});}" +
  "ac.sort(function(a,b){return a.mc-b.mc;});" +
  "var ch=ac[0];var me=ac[ac.length-1];var mx=me.mc;" +
  // Output
  "var o=[];" +
  // Section 1: Header
  "var mem=pm==='batch'?'\\u26A1':'\\u{1F534}';" +
  "var ml=pm==='batch'?'Batch Pricing (50% off)':'Real-time Pricing';" +
  "o.push(mem+' '+ml);o.push('');" +
  "o.push('Input: '+lc(iT)+' tokens/req | Output: '+lc(oT)+' tokens/req | Volume: '+lc(rpd)+' reqs/day ('+lc(rpm)+' reqs/month)');" +
  "var pkCount=0;for(var k in P)pkCount++;" +
  "o.push('Comparing '+AM.length+' models across '+pkCount+' providers');" +
  "o.push('');" +
  // Section 2: Cheapest Finder
  "var chpn=P[ch.m.pr].n;var chi=PI[ch.m.pr];" +
  "o.push('\\u{1F3C6} Cheapest Model Overall');" +
  "o.push(SEP.repeat(50));" +
  "o.push('  ['+chi+'] '+ch.m.n+' ('+chpn+') \\u2014 '+fm(ch.mc)+'/month');" +
  "o.push('  Rate: '+fm(ch.m.i)+'/'+fm(ch.m.o)+' per 1M tokens | Context: '+ch.m.cw);" +
  "o.push('  Per request: '+fm(ch.cpr)+' | Daily: '+fm(ch.cpr*rpd)+' | Monthly: '+fm(ch.mc));" +
  "var sv=me.mc-ch.mc;var ps=me.mc>0?Math.round((sv/me.mc)*100):0;" +
  "o.push('  Savings vs '+me.m.n+': '+fm(sv)+'/month ('+ps+'% cheaper)');" +
  "o.push('');" +
  // Section 3: Bar Chart
  "o.push('\\u{1F4CA} Full Model Comparison ('+lc(rpd)+' reqs/day)');" +
  "o.push(SEP.repeat(54));" +
  "var BW=36;" +
  "for(var i=0;i<ac.length;i++){" +
  "var c=ac[i];var ini=PI[c.m.pr];var label='['+ini+'] '+c.m.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;" +
  "var bc=c.m.k===ch.m.k?'\\u2591':'\\u2588';var bar=bc.repeat(bl);var bd=c.m.k===ch.m.k?' \\u{1F3C6}':'';" +
  "o.push(pd(label,24)+' '+pd(bar,BW)+' '+fm(c.mc)+bd);" +
  "}" +
  "o.push('');" +
  // Section 4: Provider Summary
  "o.push('\\u{1F50D} Provider Summary');" +
  "o.push(SEP.repeat(50));" +
  "for(var pk2 in P){var prov=P[pk2];" +
  "var pcs=ac.filter(function(c){return c.m.pr===pk2;});" +
  "var pcch=pcs[0];var pcme=pcs[pcs.length-1];var ini2=PI[pk2];" +
  "o.push('  ['+ini2+'] '+prov.n+': '+pcch.m.n+' (cheapest) at '+fm(pcch.mc)+'/month | Range: '+fm(pcch.mc)+' \\u2013 '+fm(pcme.mc)+'/month');" +
  "}" +
  "o.push('');" +
  // Section 5: Usage Scenarios
  "o.push('\\u{1F4C5} Usage Scenarios \\u2014 Top 5 Cheapest Models at Different Volumes');" +
  "o.push('');" +
  "var top5=ac.slice(0,5);var tiers=[50,100,500,1000,5000,10000];" +
  "var hr='Model'.padEnd(22);for(var i=0;i<tiers.length;i++)hr+=' | '+lc(tiers[i])+' reqs/day'.padEnd(14);o.push(hr);" +
  "var sr=''.padEnd(22,SEP);for(var i=0;i<tiers.length;i++)sr+='-+-'.padEnd(15,SEP);o.push(sr);" +
  "for(var i=0;i<top5.length;i++){" +
  "var e=top5[i];var ini3=PI[e.m.pr];var lab='['+ini3+'] '+e.m.n;var row=pd(lab,22);" +
  "for(var j=0;j<tiers.length;j++){var cat=e.cpr*tiers[j]*30;row+=' | '+fm(cat).padEnd(14);}" +
  "o.push(row);" +
  "}" +
  "o.push('');" +
  "o.push('Legend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek');" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-ai-api-cost-comparison',
  title: 'AI API Cost Comparison',
  description: 'Cross-provider AI API cost comparison across 15 models from OpenAI, Anthropic, Google, and DeepSeek. Find the cheapest model for your usage — with bar chart, provider summary, and volume scenario planning.',
  category: 'B',
  inputs: [
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'pricingMode', label: 'Pricing Mode', placeholder: '', type: 'select', options: ['realtime', 'batch'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    '\n🔴 Real-time Pricing\n\nInput: 1,000 tokens/req | Output: 500 tokens/req | Volume: 100 reqs/day (3,000 reqs/month)\nComparing 188 models across 4 providers\n\n🏆 Cheapest Model Overall\n──────────────────────────────────────────────────\n  [G] Gemini 1.5 Flash (Google) — $0.67/month\n  Rate: $0.07/$0.30 per 1M tokens | Context: 1M\n  Per request: $0.0002 | Daily: $0.02 | Monthly: $0.67\n  Savings vs O1Pro 20250319: $1349.32/month (100% cheaper)\n\n📊 Full Model Comparison (100 reqs/day)\n──────────────────────────────────────────────────────\n[G] Gemini 1.5 Flash     ░                                    $0.67 🏆\n[G] Gemini 2.0Flash Lite █                                    $0.67\n[G] Gemini 2.0Flash Lite 001 █                                    $0.67\n[O] GPT 5Nano            █                                    $0.75\n[O] GPT 5Nano 20250807   █                                    $0.75\n[D] Deepseek Coder       █                                    $0.84\n[D] DeepSeek V4 Flash    █                                    $0.84\n[O] GPT 4.1Nano          █                                    $0.90\n[O] GPT 4.1Nano 20250414 █                                    $0.90\n[G] Gemini 2.0Flash      █                                    $0.90\n[G] Gemini 2.0Flash 001  █                                    $0.90\n[G] Gemini 2.5Flash Lite █                                    $0.90\n[G] Gemini 2.5Flash Lite Preview 0617 █                                    $0.90\n[G] Gemini 2.5Flash Lite Preview 092025 █                                    $0.90\n[G] Gemini Flash Lite Latest █                                    $0.90\n[O] GPT 4o Mini          █                                    $1.35\n[O] GPT 4o Mini 20240718 █                                    $1.35\n[O] GPT 4o Mini Audio Preview █                                    $1.35\n[O] GPT 4o Mini Audio Preview 20241217 █                                    $1.35\n[O] GPT 4o Mini Search Preview █                                    $1.35\n[O] GPT 4o Mini Search Preview 20250311 █                                    $1.35\n[D] Deepseek V3.2        █                                    $1.44\n[D] Deepseek Chat        █                                    $1.47\n[D] Deepseek Reasoner    █                                    $1.47\n[D] Deepseek V3          █                                    $2.46\n[O] GPT 5.4Nano          █                                    $2.48\n[O] GPT 5.4Nano 20260317 █                                    $2.48\n[D] V4 Pro (75% Promo)   █                                    $2.61\n[G] Gemini Gemma 227b It █                                    $2.62\n[G] Gemini Gemma 29b It  █                                    $2.62\n[A] Claude 3Haiku        █                                    $2.63\n[A] Claude Haiku 3       █                                    $2.63\n[G] Gemini 3.1Flash Image Preview █                                    $3.00\n[G] Gemini 3.1Flash Lite █                                    $3.00\n[G] Gemini 3.1Flash Lite Preview █                                    $3.00\n[O] GPT 4.1Mini          █                                    $3.60\n[O] GPT 4.1Mini 20250414 █                                    $3.60\n[O] GPT 3.5Turbo         █                                    $3.75\n[O] GPT 3.5Turbo 0125    █                                    $3.75\n[O] GPT 5.1Codex Mini    █                                    $3.75\n[O] GPT 5Mini            █                                    $3.75\n[O] GPT 5Mini 20250807   █                                    $3.75\n[G] Gemini Live 2.5Flash Preview Native Audio 092025 █                                    $3.90\n[G] Gemini 2.5Flash      █                                    $4.65\n[G] Gemini 2.5Flash Image █                                    $4.65\n[G] Gemini 2.5Flash Native Audio Latest █                                    $4.65\n[G] Gemini 2.5Flash Native Audio Preview 092025 █                                    $4.65\n[G] Gemini 2.5Flash Native Audio Preview 122025 █                                    $4.65\n[G] Gemini 2.5Flash Preview 092025 █                                    $4.65\n[G] Gemini 2.5Flash Preview Tts █                                    $4.65\n[G] Gemini Exp 1206      █                                    $4.65\n[G] Gemini Flash Latest  █                                    $4.65\n[G] Gemini Robotics Er 1.5Preview █                                    $4.65\n[D] Deepseek R1          █                                    $4.94\n[O] GPT 4o Mini Realtime Preview █                                    $5.40\n[O] GPT 4o Mini Realtime Preview 20241217 █                                    $5.40\n[O] GPT Audio Mini       █                                    $5.40\n[O] GPT Audio Mini 20251006 █                                    $5.40\n[O] GPT Audio Mini 20251215 █                                    $5.40\n[O] GPT Realtime Mini    █                                    $5.40\n[O] GPT Realtime Mini 20251006 █                                    $5.40\n[O] GPT Realtime Mini 20251215 █                                    $5.40\n[O] GPT 3.5Turbo 1106    █                                    $6.00\n[G] Gemini 3 Flash       █                                    $6.00\n[G] Gemini 3Flash Preview █                                    $6.00\n[O] GPT 3.5Turbo Instruct █                                    $7.50\n[O] GPT 3.5Turbo Instruct 0914 █                                    $7.50\n[A] Claude Haiku 3.5     █                                    $8.40\n[O] GPT 5.4Mini          █                                    $9.00\n[O] GPT 5.4Mini 20260317 █                                    $9.00\n[G] Gemini 3.1Flash Live Preview █                                    $9.00\n[O] O3Mini               █                                    $9.90\n[O] O3Mini 20250131      █                                    $9.90\n[O] O4Mini               █                                    $9.90\n[O] O4Mini 20250416      █                                    $9.90\n[D] DeepSeek V4 Pro      █                                    $10.44\n[A] Claude Haiku 45      █                                    $10.50\n[O] GPT 4o Mini Transcribe █                                    $11.25\n[O] GPT 4o Mini Transcribe 20250320 █                                    $11.25\n[O] GPT 4o Mini Transcribe 20251215 █                                    $11.25\n[O] GPT 3.5Turbo 16k     █                                    $15.00\n[O] GPT 4.1              █                                    $18.00\n[O] GPT 4.120250414      █                                    $18.00\n[O] O3                   █                                    $18.00\n[O] O320250416           █                                    $18.00\n[O] O4Mini Deep Research █                                    $18.00\n[O] O4Mini Deep Research 20250626 █                                    $18.00\n[G] Gemini 3.5Flash      █                                    $18.00\n[O] GPT 5                █                                    $18.75\n[O] GPT 5.1              █                                    $18.75\n[O] GPT 5.120251113      █                                    $18.75\n[O] GPT 5.1Chat Latest   █                                    $18.75\n[O] GPT 5.1Codex         █                                    $18.75\n[O] GPT 5.1Codex Max     █                                    $18.75\n[O] GPT 520250807        █                                    $18.75\n[O] GPT 5Chat            █                                    $18.75\n[O] GPT 5Chat Latest     █                                    $18.75\n[O] GPT 5Codex           █                                    $18.75\n[O] GPT 5Search Api      █                                    $18.75\n[O] GPT 5Search Api 20251014 █                                    $18.75\n[G] Gemini 2.5Computer Use Preview 102025 █                                    $18.75\n[G] Gemini 2.5Pro        █                                    $18.75\n[G] Gemini 2.5Pro Preview Tts █                                    $18.75\n[G] Gemini Pro Latest    █                                    $18.75\n[O] GPT 4o               █                                    $22.50\n[O] GPT 4o 20240806      █                                    $22.50\n[O] GPT 4o 20241120      █                                    $22.50\n[O] GPT 4o Audio Preview █                                    $22.50\n[O] GPT 4o Audio Preview 20241217 █                                    $22.50\n[O] GPT 4o Audio Preview 20250603 █                                    $22.50\n[O] GPT 4o Mini Tts      █                                    $22.50\n[O] GPT 4o Mini Tts 20250320 █                                    $22.50\n[O] GPT 4o Mini Tts 20251215 █                                    $22.50\n[O] GPT 4o Search Preview █                                    $22.50\n[O] GPT 4o Search Preview 20250311 █                                    $22.50\n[O] GPT 4o Transcribe    █                                    $22.50\n[O] GPT 4o Transcribe Diarize █                                    $22.50\n[O] GPT Audio            █                                    $22.50\n[O] GPT Audio 1.5        █                                    $22.50\n[O] GPT Audio 20250828   █                                    $22.50\n[G] Deep Research Pro Preview 122025 █                                    $24.00\n[G] Gemini 3.1Pro Preview █                                    $24.00\n[G] Gemini 3.1Pro Preview Customtools █                                    $24.00\n[G] Gemini 3Pro Image Preview █                                    $24.00\n[G] Gemini 3Pro Preview  █                                    $24.00\n[O] GPT 5.2              █                                    $26.25\n[O] GPT 5.220251211      █                                    $26.25\n[O] GPT 5.2Chat Latest   █                                    $26.25\n[O] GPT 5.2Codex         █                                    $26.25\n[O] GPT 5.3Chat Latest   █                                    $26.25\n[O] GPT 5.3Codex         █                                    $26.25\n[G] Gemini 1.5 Pro       █                                    $26.25\n[O] GPT 5.4              █                                    $30.00\n[O] GPT 5.420260305      █                                    $30.00\n[O] GPT Image 1.5        █                                    $30.00\n[O] GPT Image 1.520251216 █                                    $30.00\n[O] GPT Image 2          █                                    $30.00\n[O] GPT Image 220260421  █                                    $30.00\n[G] Gemini 3.1 Pro       █                                    $30.00\n[A] Claude 37 Sonnet     █                                    $31.50\n[A] Claude 4Sonnet       █                                    $31.50\n[A] Claude Sonnet 4      █                                    $31.50\n[A] Claude Sonnet 45     █                                    $31.50\n[A] Claude Sonnet 45 20250929V1:0 █                                    $31.50\n[A] Claude Sonnet 46     █                                    $31.50\n[O] GPT Realtime         █                                    $36.00\n[O] GPT Realtime 1.5     █                                    $36.00\n[O] GPT Realtime 2       █                                    $36.00\n[O] GPT Realtime 20250828 █                                    $36.00\n[O] GPT 4o 20240513      █                                    $37.50\n[O] GPT 4o Realtime Preview █                                    $45.00\n[O] GPT 4o Realtime Preview 20241217 █                                    $45.00\n[O] GPT 4o Realtime Preview 20250603 █                                    $45.00\n[A] Claude Opus 45       █                                    $52.50\n[A] Claude Opus 46       █                                    $52.50\n[A] Claude Opus 47       █                                    $52.50\n[A] Claude Opus 48       █                                    $52.50\n[O] GPT 5.5              ██                                   $60.00\n[O] GPT 5.520260423      ██                                   $60.00\n[O] GPT 40125Preview     ██                                   $75.00\n[O] GPT 41106Preview     ██                                   $75.00\n[O] GPT 4Turbo           ██                                   $75.00\n[O] GPT 4Turbo 20240409  ██                                   $75.00\n[O] GPT 4Turbo Preview   ██                                   $75.00\n[O] O3Deep Research      ██                                   $90.00\n[O] O3Deep Research 20250626 ██                                   $90.00\n[A] Claude Fable 5       ███                                  $105.00\n[O] O1                   ████                                 $135.00\n[O] O120241217           ████                                 $135.00\n[A] Claude 3Opus         ████                                 $157.50\n[A] Claude 4Opus         ████                                 $157.50\n[A] Claude Opus 4        ████                                 $157.50\n[A] Claude Opus 41       ████                                 $157.50\n[O] GPT 4                █████                                $180.00\n[O] GPT 40314            █████                                $180.00\n[O] GPT 40613            █████                                $180.00\n[O] O3Pro                █████                                $180.00\n[O] O3Pro 20250610       █████                                $180.00\n[O] GPT 5Pro             ██████                               $225.00\n[O] GPT 5Pro 20251006    ██████                               $225.00\n[O] GPT 5.2Pro           ████████                             $315.00\n[O] GPT 5.2Pro 20251211  ████████                             $315.00\n[O] GPT 5.4Pro           ██████████                           $360.00\n[O] GPT 5.4Pro 20260305  ██████████                           $360.00\n[O] GPT 5.5Pro           ██████████                           $360.00\n[O] GPT 5.5Pro 20260423  ██████████                           $360.00\n[O] O1Pro                ████████████████████████████████████ $1350.00\n[O] O1Pro 20250319       ████████████████████████████████████ $1350.00\n\n🔍 Provider Summary\n──────────────────────────────────────────────────\n  [O] OpenAI: GPT 5Nano (cheapest) at $0.75/month | Range: $0.75 – $1350.00/month\n  [A] Anthropic: Claude 3Haiku (cheapest) at $2.63/month | Range: $2.63 – $157.50/month\n  [G] Google: Gemini 1.5 Flash (cheapest) at $0.67/month | Range: $0.67 – $30.00/month\n  [D] DeepSeek: Deepseek Coder (cheapest) at $0.84/month | Range: $0.84 – $10.44/month\n\n📅 Usage Scenarios — Top 5 Cheapest Models at Different Volumes\n\nModel                  | 50 reqs/day      | 100 reqs/day      | 500 reqs/day      | 1,000 reqs/day      | 5,000 reqs/day      | 10,000 reqs/day     \n──────────────────────-+-────────────-+-────────────-+-────────────-+-────────────-+-────────────-+-────────────\n[G] Gemini 1.5 Flash   | $0.34          | $0.67          | $3.38          | $6.75          | $33.75         | $67.50        \n[G] Gemini 2.0Flash Lite | $0.34          | $0.67          | $3.38          | $6.75          | $33.75         | $67.50        \n[G] Gemini 2.0Flash Lite 001 | $0.34          | $0.67          | $3.38          | $6.75          | $33.75         | $67.50        \n[O] GPT 5Nano          | $0.38          | $0.75          | $3.75          | $7.50          | $37.50         | $75.00        \n[O] GPT 5Nano 20250807 | $0.38          | $0.75          | $3.75          | $7.50          | $37.50         | $75.00        \n\nLegend: [O]=OpenAI  [A]=Anthropic  [G]=Google  [D]=DeepSeek',
    '[D] V4 Flash: 50→$0.18 · 100→$0.37 · 500→$1.84 · 1,000→$3.68 · 5,000→$18.45 · 10,000→$36.90',
    '[O] GPT-5 Nano: 50→$0.23 · 100→$0.45 · 500→$2.25 · 1,000→$4.50 · 5,000→$22.50 · 10,000→$45.00',
    '[G] Gemini 1.5 Flash: 50→$0.22 · 100→$0.45 · 500→$2.25 · 1,000→$4.50 · 5,000→$22.50 · 10,000→$45.00',
    '[D] V4 Pro (Promo): 50→$0.56 · 100→$1.12 · 500→$5.64 · 1,000→$11.28 · 5,000→$56.42 · 10,000→$112.84',
  ],
  faq: [
    {
      q: 'Which AI API is the absolute cheapest in 2026?',
      a: 'DeepSeek V4 Flash at $0.14/$0.28 per 1M input/output tokens is the cheapest frontier-quality model. OpenAI GPT-5 Nano ($0.05/$0.40) is slightly cheaper on input but more expensive on output. Gemini 1.5 Flash ($0.075/$0.30) is very close. At scale (millions of requests), DeepSeek V4 Flash saves 95-99% vs GPT-5.5 or Claude Fable 5.',
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
      a: 'At 10,000 reqs/day with 1K input + 500 output tokens: DeepSeek V4 Flash costs ~$37/month. OpenAI GPT-5 Nano costs ~$45/month. Gemini 1.5 Flash costs ~$45/month. Claude Haiku 3 costs ~$113/month. GPT-5.5 costs ~$2,850/month. Claude Fable 5 costs ~$2,500/month. The 50-75x gap between cheapest and premium models is why enterprise teams use a tiered routing strategy.',
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
  ],
  howToUse: [
    'Enter your average input tokens per API request.',
    'Enter your average output tokens per API request.',
    'Set your expected daily request volume.',
    'Choose real-time or batch pricing (batch gives 50% off for async jobs).',
    'Review the bar chart to see all 15 models ranked by monthly cost.',
    'Check the Provider Summary to find the cheapest model from each provider, and use the Usage Scenarios table to plan costs at different volumes.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
};

registerEngine(engine);
