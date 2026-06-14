import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

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

const MODELS: Record<string, ModelInfo> = {
  'gemini-3.5-flash': {
    input: 1.50, output: 9.00, batchInput: 0.75, batchOutput: 4.50,
    name: 'Gemini 3.5 Flash',
    family: 'flash35', icon: '●', contextWindow: '1M', order: 1,
    supportsCache: true, supportsBatch: true,
  },
  'gemini-3.1-pro': {
    input: 2.50, output: 15.00, batchInput: 1.25, batchOutput: 7.50,
    name: 'Gemini 3.1 Pro',
    family: 'pro', icon: '▲', contextWindow: '1M', order: 2,
    supportsCache: true, supportsBatch: true,
  },
  'gemini-3-flash': {
    input: 0.50, output: 3.00, batchInput: 0.25, batchOutput: 1.50,
    name: 'Gemini 3 Flash',
    family: 'flash3', icon: '◆', contextWindow: '1M', order: 3,
    supportsCache: true, supportsBatch: true,
  },
  'gemini-2.5-flash': {
    input: 0.30, output: 2.50, batchInput: 0, batchOutput: 0,
    name: 'Gemini 2.5 Flash',
    family: 'legacy', icon: '◇', contextWindow: '1M', order: 4,
    supportsCache: false, supportsBatch: false,
  },
  'gemini-1.5-pro': {
    input: 3.50, output: 10.50, batchInput: 0, batchOutput: 0,
    name: 'Gemini 1.5 Pro',
    family: 'legacy', icon: '◇', contextWindow: '2M', order: 5,
    supportsCache: false, supportsBatch: false,
  },
  'gemini-1.5-flash': {
    input: 0.075, output: 0.30, batchInput: 0, batchOutput: 0,
    name: 'Gemini 1.5 Flash',
    family: 'legacy', icon: '◇', contextWindow: '1M', order: 6,
    supportsCache: false, supportsBatch: false,
  },
};

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
  out.push('Cost Comparison (' + lc(reqPerDay) + ' reqs/day)');
  out.push(SEP.repeat(54));
  const BAR_WIDTH = 40;
  for (const c of allCosts) {
    const icon = c.info.icon;
    const label = icon + ' ' + c.info.name;
    const barLen = maxCost > 0 ? Math.max(1, Math.round((c.monthlyCost / maxCost) * BAR_WIDTH)) : 1;
    const barChar = c.key === cheapest.key ? '░' : '█';
    const bar = barChar.repeat(barLen);
    // Gray out non-batch models in batch mode
    const suffix = isBatch && !c.info.supportsBatch ? ' (no batch)' : '';
    out.push(pad(label, 28) + ' ' + pad(bar, BAR_WIDTH) + ' ' + fmt(c.monthlyCost) + suffix);
  }
  out.push('');

  // Section 3: Detail Cards
  for (const c of selectedCosts) {
    const icon = c.info.icon;
    const famLabel = FAMILY_LABELS[c.info.family];
    out.push(icon + ' ' + c.info.name + ' (' + famLabel + ')');
    out.push('  Context: ' + c.info.contextWindow + ' | Rate: ' + fmt(c.info.input) + '/' + fmt(c.info.output) + ' per 1M tokens');
    if (c.info.supportsBatch) {
      out.push('  Batch Rate: ' + fmt(c.info.batchInput) + '/' + fmt(c.info.batchOutput) + ' per 1M tokens');
    } else {
      out.push('  Batch: N/A');
    }
    out.push('  Per Request: ' + fmt(c.costPerReq));
    out.push('  Monthly Cost (' + lc(reqPerDay) + ' reqs/day): ' + fmt(c.monthlyCost));
    if (cachingActive && c.info.supportsCache) {
      const savings = c.noCacheMonthly - c.monthlyCost;
      const pctSaved = c.noCacheMonthly > 0 ? Math.round((savings / c.noCacheMonthly) * 100) : 0;
      out.push('  \u{1F4BE} With context caching: ' + fmt(c.monthlyCost) + ' (saves ' + pctSaved + '%)');
    } else if (cachingActive && !c.info.supportsCache) {
      out.push('  \u{1F6AB} Context caching not available for this model');
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
  out.push('\u{1F4B0} Savings vs Other Providers');
  out.push(SEP.repeat(54));
  const cheapestGem = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  for (const [provKey, prov] of Object.entries(CROSS_PROVIDER)) {
    const provMonthly = ((inTokens / 1_000_000) * prov.input + (outTokens / 1_000_000) * prov.output) * reqsPerMonth;
    const savings = provMonthly - cheapestGem.monthlyCost;
    const pct = provMonthly > 0 ? Math.round((savings / provMonthly) * 100) : 0;
    const cheaper = savings > 0;
    out.push('  ' + cheapestGem.info.name + ' vs ' + prov.name + ': ' +
      (cheaper ? 'saves ' + fmt(savings) + '/month (' + pct + '% cheaper)' : 'costs ' + fmt(-savings) + '/month more'));
  }
  out.push('\u{1F4A1} Gemini 3 Flash is the cheapest frontier-quality model at $0.50/$3.00 per 1M tokens. Context Caching saves 90% on repeated prompts for the newest 3 models.');
  out.push('');

  // Section 6: Usage Scenarios
  out.push('\u{1F4CA} Usage Scenarios (monthly cost at ' + lc(reqPerDay) + ' reqs/day)');
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
  "'gemini-3-flash':{i:0.5,o:3,bi:0.25,bo:1.5,n:'Gemini 3 Flash',f:'flash3',ic:'\\u25C6',cw:'1M',od:3,sc:true,sb:true}," +
  "'gemini-2.5-flash':{i:0.3,o:2.5,bi:0,bo:0,n:'Gemini 2.5 Flash',f:'legacy',ic:'\\u25C7',cw:'1M',od:4,sc:false,sb:false}," +
  "'gemini-1.5-pro':{i:3.5,o:10.5,bi:0,bo:0,n:'Gemini 1.5 Pro',f:'legacy',ic:'\\u25C7',cw:'2M',od:5,sc:false,sb:false}," +
  "'gemini-1.5-flash':{i:0.075,o:0.3,bi:0,bo:0,n:'Gemini 1.5 Flash',f:'legacy',ic:'\\u25C7',cw:'1M',od:6,sc:false,sb:false}" +
  "};" +
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
  "o.push('Cost Comparison ('+lc(rpd)+' reqs/day)');o.push(SEP2.repeat(54));" +
  "var BW=40;for(var i=0;i<all.length;i++){var c=all[i];var icon=c.i.ic;var label=icon+' '+c.i.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;var bc=c.k===ch.k?'\\u2591':'\\u2588';" +
  "var sf=isBatch&&!c.i.sb?' (no batch)':'';" +
  "o.push(pd(label,28)+' '+pd(bc.repeat(bl),BW)+' '+fm(c.mc)+sf);}o.push('');" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=c.i.ic;" +
  "o.push(icon+' '+c.i.n+' ('+FL[c.i.f]+')');" +
  "o.push('  Context: '+c.i.cw+' | Rate: '+fm(c.i.i)+'/'+fm(c.i.o)+' per 1M tokens');" +
  "if(c.i.sb){o.push('  Batch Rate: '+fm(c.i.bi)+'/'+fm(c.i.bo)+' per 1M tokens');}else{o.push('  Batch: N/A');}" +
  "o.push('  Per Request: '+fm(c.cpr));" +
  "o.push('  Monthly Cost ('+lc(rpd)+' reqs/day): '+fm(c.mc));" +
  "if(cacheOn&&c.i.sc){var sv=c.ncm-c.mc;var ps=c.ncm>0?Math.round((sv/c.ncm)*100):0;o.push('  \\u{1F4BE} With context caching: '+fm(c.mc)+' (saves '+ps+'%)');}" +
  "else if(cacheOn&&!c.i.sc){o.push('  \\u{1F6AB} Context caching not available for this model');}" +
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
  "o.push('\\u{1F4B0} Savings vs Other Providers');o.push(SEP2.repeat(54));" +
  "var cheapestG=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "for(var pk in XP){var pv=XP[pk];var pm2=((iT/1e6)*pv.i+(oT/1e6)*pv.o)*rpm;var sv2=pm2-cheapestG.mc;var pct=pm2>0?Math.round((sv2/pm2)*100):0;" +
  "var cheaper=sv2>0;o.push('  '+cheapestG.i.n+' vs '+pv.n+': '+(cheaper?'saves '+fm(sv2)+'/month ('+pct+'% cheaper)':'costs '+fm(-sv2)+'/month more'));}" +
  "o.push('\\u{1F4A1} Gemini 3 Flash is the cheapest frontier-quality model at $0.50/$3.00 per 1M tokens. Context Caching saves 90% on repeated prompts for the newest 3 models.');" +
  "o.push('');" +
  "o.push('\\u{1F4CA} Usage Scenarios (monthly cost at '+lc(rpd)+' reqs/day)');o.push('');" +
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
    '\u{1F916} Gemini API Cost\n\n\u{1F4E5} Input: 1,000 tokens/req | \u{1F4E4} Output: 500 tokens/req | \u{1F504} 100 reqs/day | ⚡ Real-time\n\nCost Comparison (100 reqs/day)\n──────────────────────────────────────────────────────\n◆ Gemini 3 Flash          ░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $0.60\n● Gemini 3.5 Flash        ████████████ $1.80\n▲ Gemini 3.1 Pro           ██████████████████████████████████████████ $3.00\n◇ Gemini 2.5 Flash         ██████████████████████ $2.10\n◇ Gemini 1.5 Pro           ██████████████████████████████████████████████████████████████████████████████ $18.75\n◇ Gemini 1.5 Flash         ██ $0.23',
    '● Gemini 3.5 Flash: 50→$0.90 · 100→$1.80 · 500→$9.00 · 1K→$18.00 · 5K→$90.00 · 10K→$180.00',
    '▲ Gemini 3.1 Pro: 50→$1.50 · 100→$3.00 · 500→$15.00 · 1K→$30.00 · 5K→$150.00 · 10K→$300.00',
    '◆ Gemini 3 Flash: 50→$0.30 · 100→$0.60 · 500→$3.00 · 1K→$6.00 · 5K→$30.00 · 10K→$60.00',
    '◇ Gemini 1.5 Flash: 50→$0.11 · 100→$0.23 · 500→$1.13 · 1K→$2.25 · 5K→$11.25 · 10K→$22.50',
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
};

registerEngine(engine);
