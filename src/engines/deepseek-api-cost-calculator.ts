import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';
import PRICING from '../data/ai-pricing.json';

interface ModelInfo {
  input: number;
  output: number;
  name: string;
  family: 'v4' | 'legacy';
  contextWindow: string;
  order: number;
}

const MODELS: Record<string, ModelInfo> = PRICING.llm.deepseek.models as any;

const FAMILY_ICONS: Record<string, string> = {
  v4: '◆',
  legacy: '◇',
};
const FAMILY_LABELS: Record<string, string> = {
  v4: 'V4 Series',
  legacy: 'Legacy',
};

// DeepSeek auto-cache read multiplier = 0.02x input (98% discount)
const CACHE_READ_MULT = 0.02;

const DEFAULT_SELECTED = ['deepseek-v4-flash', 'deepseek-v4-pro-promo', 'deepseek-r1'];

// Cross-provider comparison (cheapest from each)
const CROSS_PROVIDER: Record<string, { input: number; output: number; name: string }> = {
  openai: { input: 0.05, output: 0.4, name: 'GPT-5 Nano' },
  claude: { input: 0.25, output: 1.25, name: 'Claude Haiku 3' },
  gemini: { input: 0.075, output: 0.3, name: 'Gemini 1.5 Flash' },
};

const PRESETS: Record<string, Record<string, string>> = {
  'Light Usage': {
    inputTokens: '500', outputTokens: '1000', requestsPerDay: '50',
    cacheHitRate: '80', growthRate: '0', projectionMonths: '12',
  },
  'Mid-Scale': {
    inputTokens: '2000', outputTokens: '1000', requestsPerDay: '500',
    cacheHitRate: '60', growthRate: '0', projectionMonths: '12',
  },
  'High Volume': {
    inputTokens: '5000', outputTokens: '2000', requestsPerDay: '10000',
    cacheHitRate: '50', growthRate: '0', projectionMonths: '12',
  },
  'Heavy Cache': {
    inputTokens: '2000', outputTokens: '800', requestsPerDay: '5000',
    cacheHitRate: '95', growthRate: '0', projectionMonths: '12',
  },
  'Growing App': {
    inputTokens: '1000', outputTokens: '800', requestsPerDay: '200',
    cacheHitRate: '70', growthRate: '10', projectionMonths: '12',
  },
  'Enterprise': {
    inputTokens: '8000', outputTokens: '5000', requestsPerDay: '100000',
    cacheHitRate: '60', growthRate: '0', projectionMonths: '6',
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
  const cacheHitRate = Math.max(0, Math.min(100, parseInt(inputs.cacheHitRate) || 0));
  const growthRate = Math.max(0, Math.min(50, parseFloat(inputs.growthRate) || 0));
  const projMonthsRaw = parseInt(inputs.projectionMonths);
  const projMonths = [3, 6, 12].includes(projMonthsRaw) ? projMonthsRaw : 12;

  const cachingActive = cacheHitRate > 0;
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
    const noCacheCostPerReq = (inTokens / 1_000_000) * info.input + (outTokens / 1_000_000) * info.output;
    const noCacheMonthly = noCacheCostPerReq * reqsPerMonth;

    let costPerReq: number;
    if (cachingActive) {
      // DeepSeek auto-caches repeated prefixes
      const cachedInput = (inTokens * hitRate / 1_000_000) * info.input * CACHE_READ_MULT;
      const nonCachedInput = (inTokens * (1 - hitRate) / 1_000_000) * info.input;
      const outputCost = (outTokens / 1_000_000) * info.output;
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
  let headerLine = '\u{1F534} DeepSeek API Cost';
  if (cachingActive) {
    headerLine += ' | \u{1F4BE} Auto-Cache: ' + cacheHitRate + '% hit (98% discount)';
  }
  out.push(headerLine);
  out.push('');
  out.push(
    '\u{1F4E5} Input: ' + lc(inTokens) + ' tokens/req | ' +
    '\u{1F4E4} Output: ' + lc(outTokens) + ' tokens/req | ' +
    '\u{1F504} ' + lc(reqPerDay) + ' reqs/day',
  );
  out.push('');

  // Section 2: Bar Chart
  out.push('📊 Cost Comparison (' + lc(reqPerDay) + ' reqs/day)');
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
  out.push('');

  // Section 3: Detail Cards — selected models
  out.push('📋 Selected Model Details');
  out.push(SEP.repeat(60));
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
    const famLabel = FAMILY_LABELS[c.info.family];
    const dailyCost = c.costPerReq * reqPerDay;
    const annualCost = c.monthlyCost * 12;

    out.push(
      icon + ' ' + c.info.name + ' (' + famLabel + ') | Context: ' + c.info.contextWindow,
    );
    out.push(SEP.repeat(44));

    // Input cost per-request breakdown
    const inputCostLine = (inTokens / 1_000_000) * c.info.input;
    out.push(
      'Input:  ' +
        pad(lc(inTokens), 7) +
        ' tokens × ' +
        fmt(c.info.input) +
        '/1M → ' +
        fmt(inputCostLine) +
        '/req',
    );
    // Output cost per-request breakdown
    const outputCostLine = (outTokens / 1_000_000) * c.info.output;
    out.push(
      'Output: ' +
        pad(lc(outTokens), 7) +
        ' tokens × ' +
        fmt(c.info.output) +
        '/1M → ' +
        fmt(outputCostLine) +
        '/req',
    );

    out.push(SEP.repeat(44));
    out.push('Per request:    ' + fmt(c.costPerReq));
    out.push('Daily (' + reqPerDay + '):    ' + fmt(dailyCost));
    out.push('Monthly (30d):  ' + fmt(c.monthlyCost));
    out.push('Annual:         ' + fmt(annualCost));
    out.push(SEP.repeat(44));

    // Cache savings per model
    if (cachingActive) {
      const savings = c.noCacheMonthly - c.monthlyCost;
      const pctSaved = c.noCacheMonthly > 0 ? Math.round((savings / c.noCacheMonthly) * 100) : 0;
      out.push(
        '💾 Auto-cache at ' +
          cacheHitRate +
          '% hit: ' +
          fmt(c.monthlyCost) +
          '/mo — saves ' +
          fmt(savings) +
          '/mo (' +
          pctSaved +
          '%)',
      );
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

  // Cheapest overall
  const cheapestDS = allCosts.reduce((min, c) => c.monthlyCost < min.monthlyCost ? c : min);
  out.push(
    '🏆 Cheapest: ' + cheapestDS.info.name + ' at ' + fmt(cheapestDS.monthlyCost) + '/mo',
  );

  // Best value (V4 series, non-promo)
  const bestValue = allCosts
    .filter((c) => c.info.family === 'v4' && c.key !== 'deepseek-v4-pro-promo')
    .reduce((min, c) => (c.monthlyCost < min.monthlyCost ? c : min), allCosts[0]);
  if (bestValue && bestValue.key !== cheapestDS.key) {
    out.push(
      '⭐ Best value (V4 standard): ' +
        bestValue.info.name +
        ' at ' +
        fmt(bestValue.monthlyCost) +
        '/mo',
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
      '💸 Switching from ' +
        mostExpSelected.info.name +
        ' to ' +
        cheapSelected.info.name +
        ' saves ' +
        fmt(diff) +
        '/mo (' +
        fmt(diff * 12) +
        '/yr)',
    );
  }

  // Caching tip
  if (cachingActive && selectedCosts.length > 0) {
    const ref = selectedCosts[0];
    const savings = ref.noCacheMonthly - ref.monthlyCost;
    out.push(
      '💾 Auto-cache at ' +
        cacheHitRate +
        '% hit rate saves ~' +
        fmt(savings) +
        '/mo on ' +
        ref.info.name,
    );
  }

  // Cross-provider comparison
  for (const [provKey, prov] of Object.entries(CROSS_PROVIDER)) {
    const provMonthly = ((inTokens / 1_000_000) * prov.input + (outTokens / 1_000_000) * prov.output) * reqsPerMonth;
    const diff = provMonthly - cheapestDS.monthlyCost;
    const pct = provMonthly > 0 ? Math.round((Math.abs(diff) / provMonthly) * 100) : 0;
    if (diff > 0) {
      out.push(
        '🌍 ' + cheapestDS.info.name + ' vs ' + prov.name + ': saves ' +
          fmt(diff) + '/month (' + pct + '% cheaper)',
      );
    } else {
      out.push(
        '🌍 ' + cheapestDS.info.name + ' vs ' + prov.name + ': costs ' +
          fmt(-diff) + '/month more (' + pct + '% premium)',
      );
    }
  }
  out.push('💡 DeepSeek V4 Flash is 20-100x cheaper than frontier models. Auto-caching saves 98% on repeated prompts.');
  out.push('');

  // Section 6: Usage Scenarios
  out.push('📅 Usage Scenarios (monthly cost at ' + lc(reqPerDay) + ' reqs/day)');
  out.push('');
  const volumes = [50, 100, 500, 1000, 5000, 10000];
  for (const c of selectedCosts) {
    const icon = FAMILY_ICONS[c.info.family];
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
  "var M={" +
  "var M={" +
  "var M={" +
  "var M={" +
  "'deepseek-v4-flash':{i:0.14,o:0.28,n:'DeepSeek V4 Flash',f:'v4',cw:'1M',od:1}," +
  "'deepseek-v4-pro':{i:1.74,o:3.48,n:'DeepSeek V4 Pro',f:'v4',cw:'1M',od:2}," +
  "'deepseek-v4-pro-promo':{i:0.435,o:0.87,n:'V4 Pro (75% Promo)',f:'v4',cw:'1M',od:3}," +
  "'deepseek-r1':{i:0.55,o:2.19,n:'Deepseek R1',f:'legacy',cw:'66K',od:4}" +

  "var FI={v4:'\\u25C6',legacy:'\\u25C7'};" +
  "var FL={v4:'V4 Series',legacy:'Legacy'};" +
  "var DEF=['deepseek-v4-flash','deepseek-v4-pro-promo','deepseek-r1'];" +
  "var CRM=0.02;" +
  "var XP={openai:{i:0.05,o:0.4,n:'GPT-5 Nano'},claude:{i:0.25,o:1.25,n:'Claude Haiku 3'},gemini:{i:0.075,o:0.3,n:'Gemini 1.5 Flash'}};" +
  "function fm(n){if(Math.abs(n)<0.01&&n!==0)return '$'+n.toFixed(4);return '$'+n.toFixed(2)}" +
  "function lc(n){return n.toLocaleString()}" +
  "function pd(s,l){return s+' '.repeat(Math.max(0,l-s.length))}" +
  "var SEP2='\\u2500';" +
  "var rawM=inputs.models||DEF.join(',');var sks=[];var seen={};rawM.split(',').forEach(function(s){s=s.trim();if(s&&!seen[s]){seen[s]=true;sks.push(s);}});" +
  "var iT=Math.max(1,Math.min(1e7,parseInt(inputs.inputTokens)||1000));" +
  "var oT=Math.max(1,Math.min(1e7,parseInt(inputs.outputTokens)||500));" +
  "var rpd=Math.max(0,Math.min(1e6,parseInt(inputs.requestsPerDay)||100));" +
  "var cHR=Math.max(0,Math.min(100,parseInt(inputs.cacheHitRate)||0));" +
  "var gR=Math.max(0,Math.min(50,parseFloat(inputs.growthRate)||0));" +
  "var pMraw=parseInt(inputs.projectionMonths);var pM=[3,6,12].indexOf(pMraw)>=0?pMraw:12;" +
  "var cacheOn=cHR>0;var hR=cHR/100;var rpm=rpd*30;" +
  "var all=[];" +
  "for(var k in M){var mi=M[k];var ncpr=(iT/1e6)*mi.i+(oT/1e6)*mi.o;var ncm=ncpr*rpm;var cpr;" +
  "if(cacheOn){var ci=(iT*hR/1e6)*mi.i*CRM;var nci=(iT*(1-hR)/1e6)*mi.i;cpr=ci+nci+(oT/1e6)*mi.o;}else{cpr=ncpr;}" +
  "var mc=cpr*rpm;all.push({k:k,i:mi,cpr:cpr,mc:mc,ncpr:ncpr,ncm:ncm});}" +
  "all.sort(function(a,b){return a.i.od-b.i.od;});" +
  "var ch=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var mx=all.reduce(function(max,c){return c.mc>max.mc?c:max;}).mc;" +
  "var sc=[];for(var i=0;i<sks.length;i++){var e=all.find(function(c){return c.k===sks[i];});if(e)sc.push(e);}" +
  "if(sc.length===0){for(var j=0;j<DEF.length;j++){var e2=all.find(function(c){return c.k===DEF[j];});if(e2)sc.push(e2);}}" +
  "var o=[];" +
  "var hl='\\u{1F534} DeepSeek API Cost';if(cacheOn){hl+=' | \\u{1F4BE} Auto-Cache: '+cHR+'% hit (98% discount)';}o.push(hl);o.push('');" +
  "o.push('\\u{1F4E5} Input: '+lc(iT)+' tokens/req | \\u{1F4E4} Output: '+lc(oT)+' tokens/req | \\u{1F504} '+lc(rpd)+' reqs/day');o.push('');" +
  "o.push('\\u{1F4CA} Cost Comparison ('+lc(rpd)+' reqs/day)');o.push(SEP2.repeat(54));" +
  "var BW=40;for(var i=0;i<all.length;i++){var c=all[i];var icon=FI[c.i.f];var label=icon+' '+c.i.n;" +
  "var bl=mx>0?Math.max(1,Math.round((c.mc/mx)*BW)):1;var bc=c.k===ch.k?'\\u2591':'\\u2588';var bd=c.k===ch.k?' \\u{1F3C6}':'';" +
  "o.push(pd(label,26)+' '+pd(bc.repeat(bl),BW)+' '+fm(c.mc)+bd);}o.push('');o.push('');" +
  "o.push('\\u{1F4CB} Selected Model Details');o.push(SEP2.repeat(60));" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=FI[c.i.f];var dc2=c.cpr*rpd;var ann=c.mc*12;" +
  "o.push(icon+' '+c.i.n+' ('+FL[c.i.f]+') | Context: '+c.i.cw);" +
  "o.push(SEP2.repeat(44));" +
  "var icl=(iT/1e6)*c.i.i;var ocl=(oT/1e6)*c.i.o;" +
  "o.push('Input:  '+pd(lc(iT),7)+' tokens \\u00d7 '+fm(c.i.i)+'/1M \\u2192 '+fm(icl)+'/req');" +
  "o.push('Output: '+pd(lc(oT),7)+' tokens \\u00d7 '+fm(c.i.o)+'/1M \\u2192 '+fm(ocl)+'/req');" +
  "o.push(SEP2.repeat(44));" +
  "o.push('Per request:    '+fm(c.cpr));" +
  "o.push('Daily ('+rpd+'):    '+fm(dc2));" +
  "o.push('Monthly (30d):  '+fm(c.mc));" +
  "o.push('Annual:         '+fm(ann));" +
  "o.push(SEP2.repeat(44));" +
  "if(cacheOn){var sv=c.ncm-c.mc;var ps=c.ncm>0?Math.round((sv/c.ncm)*100):0;" +
  "o.push('\\u{1F4BE} Auto-cache at '+cHR+'% hit: '+fm(c.mc)+'/mo \\u2014 saves '+fm(sv)+'/mo ('+ps+'%)');}" +
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
  "var cheapestD=all.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "o.push('\\u{1F3C6} Cheapest: '+cheapestD.i.n+' at '+fm(cheapestD.mc)+'/mo');" +
  "var flt2=all.filter(function(c){return c.i.f==='v4'&&c.k!=='deepseek-v4-pro-promo';});" +
  "var bv=flt2.length>0?flt2.reduce(function(mn,c){return c.mc<mn.mc?c:mn;}):null;" +
  "if(bv&&bv.k!==cheapestD.k){o.push('\\u2B50 Best value (V4 standard): '+bv.i.n+' at '+fm(bv.mc)+'/mo');}" +
  "if(sc.length>=2){" +
  "var meS=sc.reduce(function(max,c){return c.mc>max.mc?c:max;});" +
  "var chS=sc.reduce(function(min,c){return c.mc<min.mc?c:min;});" +
  "var df2=meS.mc-chS.mc;" +
  "o.push('\\u{1F4B8} Switching from '+meS.i.n+' to '+chS.i.n+' saves '+fm(df2)+'/mo ('+fm(df2*12)+'/yr)');}" +
  "if(cacheOn&&sc.length>0){" +
  "var ref2=sc[0];var sv2=ref2.ncm-ref2.mc;" +
  "o.push('\\u{1F4BE} Auto-cache at '+cHR+'% hit rate saves ~'+fm(sv2)+'/mo on '+ref2.i.n);}" +
  "for(var pk in XP){var pv=XP[pk];var pm2=((iT/1e6)*pv.i+(oT/1e6)*pv.o)*rpm;var df=pm2-cheapestD.mc;var pct=pm2>0?Math.round((Math.abs(df)/pm2)*100):0;" +
  "if(df>0){o.push('\\u{1F30D} '+cheapestD.i.n+' vs '+pv.n+': saves '+fm(df)+'/month ('+pct+'% cheaper)');}" +
  "else{o.push('\\u{1F30D} '+cheapestD.i.n+' vs '+pv.n+': costs '+fm(-df)+'/month more ('+pct+'% premium)');}" +
  "}" +
  "o.push('\\u{1F4A1} DeepSeek V4 Flash is 20-100x cheaper than frontier models. Auto-caching saves 98% on repeated prompts.');" +
  "o.push('');" +
  "o.push('\\u{1F4C5} Usage Scenarios (monthly cost at '+lc(rpd)+' reqs/day)');o.push('');" +
  "var vols=[50,100,500,1000,5000,10000];" +
  "for(var i=0;i<sc.length;i++){var c=sc[i];var icon=FI[c.i.f];var line=icon+' '+c.i.n+': ';var pts=[];" +
  "for(var j=0;j<vols.length;j++){pts.push(lc(vols[j])+'\\u2192'+fm(c.cpr*vols[j]*30));}" +
  "line+=pts.join(' \\u00b7 ');o.push(line);}" +
  "return o;";

const engine: ToolEngine = {
  slug: 'solopreneur-deepseek-api-cost-calculator',
  title: 'DeepSeek API Cost Calculator',
  description: 'Calculate DeepSeek API costs for V4 Flash, V4 Pro, and legacy R1. Includes automatic caching, growth projections, and cross-provider savings comparison.',
  category: 'B',
  inputs: [
    { name: 'models', label: 'Models', placeholder: 'deepseek-v4-flash,deepseek-v4-pro-promo,deepseek-r1', type: 'text' },
    { name: 'inputTokens', label: 'Input Tokens per Request', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'outputTokens', label: 'Output Tokens per Request', placeholder: 'e.g. 500', type: 'number' },
    { name: 'requestsPerDay', label: 'Requests per Day', placeholder: 'e.g. 100', type: 'number' },
    { name: 'cacheHitRate', label: 'Auto-Cache Hit Rate (%)', placeholder: 'e.g. 60', type: 'number' },
    { name: 'growthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'projectionMonths', label: 'Projection Period', placeholder: '', type: 'select', options: ['3', '6', '12'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [
    // Single comprehensive example covering all 6 sections
    '🔴 DeepSeek API Cost\n' +
    '\n' +
    '📥 Input: 1,000 tokens/req | 📤 Output: 500 tokens/req | 🔄 100 reqs/day\n' +
    '\n' +
    '📊 Cost Comparison (100 reqs/day)\n' +
    '──────────────────────────────────────────────────────\n' +
    '◆ DeepSeek V4 Flash       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░ $0.84 🏆\n' +
    '◆ V4 Pro (75% Promo)      ████████████████████████ $2.61\n' +
    '◆ DeepSeek V4 Pro         █████████████████████████████████████████ $10.44\n' +
    '◇ DeepSeek R1 (Legacy)    █████████████████ $4.65\n' +
    '\n' +
    '📋 Selected Model Details\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '◆ DeepSeek V4 Flash (V4 Series) | Context: 1M\n' +
    '────────────────────────────────────────────\n' +
    'Input:  1,000    tokens × $0.14/1M → $0.0001/req\n' +
    'Output: 500      tokens × $0.28/1M → $0.0001/req\n' +
    '────────────────────────────────────────────\n' +
    'Per request:    $0.0003\n' +
    'Daily (100):    $0.03\n' +
    'Monthly (30d):  $0.84\n' +
    'Annual:         $10.08\n' +
    '────────────────────────────────────────────\n' +
    '\n' +
    '◆ V4 Pro (75% Promo) (V4 Series) | Context: 1M\n' +
    '────────────────────────────────────────────\n' +
    'Input:  1,000    tokens × $0.43/1M → $0.0004/req\n' +
    'Output: 500      tokens × $0.87/1M → $0.0004/req\n' +
    '────────────────────────────────────────────\n' +
    'Per request:    $0.0009\n' +
    'Daily (100):    $0.09\n' +
    'Monthly (30d):  $2.61\n' +
    'Annual:         $31.32\n' +
    '────────────────────────────────────────────\n' +
    '\n' +
    '◇ DeepSeek R1 (Legacy) (Legacy) | Context: 64K\n' +
    '────────────────────────────────────────────\n' +
    'Input:  1,000    tokens × $0.55/1M → $0.0006/req\n' +
    'Output: 500      tokens × $2.00/1M → $0.0010/req\n' +
    '────────────────────────────────────────────\n' +
    'Per request:    $0.0016\n' +
    'Daily (100):    $0.16\n' +
    'Monthly (30d):  $4.65\n' +
    'Annual:         $55.80\n' +
    '────────────────────────────────────────────\n' +
    '\n' +
    '💰 Savings Insights\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🏆 Cheapest: DeepSeek V4 Flash at $0.84/mo\n' +
    '⭐ Best value (V4 standard): V4 Pro (75% Promo) at $2.62/mo\n' +
    '💸 Switching from DeepSeek R1 (Legacy) to DeepSeek V4 Flash saves $3.81/mo ($45.72/yr)\n' +
    '🌍 DeepSeek V4 Flash vs GPT-5 Nano: costs $0.09/month more (12% premium)\n' +
    '🌍 DeepSeek V4 Flash vs Claude Haiku 3: saves $1.79/month (68% cheaper)\n' +
    '🌍 DeepSeek V4 Flash vs Gemini 1.5 Flash: costs $0.17/month more (24% premium)\n' +
    '💡 DeepSeek V4 Flash is 20-100x cheaper than frontier models. Auto-caching saves 98% on repeated prompts.\n' +
    '\n' +
    '📅 Usage Scenarios (monthly cost at 100 reqs/day)\n' +
    '\n' +
    '◆ DeepSeek V4 Flash: 50→$0.42 · 100→$0.84 · 500→$4.20 · 1,000→$8.40 · 5,000→$42.00 · 10,000→$84.00\n' +
    '◆ V4 Pro (75% Promo): 50→$1.31 · 100→$2.62 · 500→$13.09 · 1,000→$26.18 · 5,000→$130.88 · 10,000→$261.75\n' +
    '◇ DeepSeek R1 (Legacy): 50→$2.33 · 100→$4.65 · 500→$23.25 · 1,000→$46.50 · 5,000→$232.50 · 10,000→$465.00',
  ],
  faq: [
    { q: 'How much cheaper is DeepSeek than OpenAI?', a: 'DeepSeek V4 Flash at $0.14/$0.28 per 1M tokens is approximately 95-98% cheaper than GPT-4o ($2.50/$10). For a typical 1,000-token prompt at 100 reqs/day: DeepSeek costs ~$0.84/month vs $22.50/month for GPT-4o. V4 Pro at promo pricing is still 90% cheaper than GPT-4o.' },
    { q: 'What is DeepSeek Automatic Caching?', a: 'DeepSeek automatically caches repeated prefix tokens (system prompts, tool schemas) with no code changes needed. Cache reads get a 98% discount (0.02x input price). On V4 Flash, cached tokens cost just $0.0028/MTok instead of $0.14/MTok. This is fully automatic -- no cache write configuration required.' },
    { q: 'Which DeepSeek model should I use?', a: 'V4 Flash ($0.14/$0.28) for: general chat, RAG, code completion, classification. V4 Pro (promo $0.44/$0.87) for: complex reasoning, multi-step logic, competitive coding. V4 Flash handles 90% of use cases at the lowest price. Use Pro only when you need the strongest reasoning.' },
    { q: 'Is DeepSeek quality comparable to GPT-4o?', a: 'DeepSeek V4 Flash matches GPT-4o on most benchmarks at 1/18 the output price. V4 Pro competes with GPT-5.2/Opus 4.8 for reasoning tasks. The main gap is multimodal (image/vision) capabilities where OpenAI and Claude lead. For text-only tasks, DeepSeek is the most cost-effective by far.' },
    { q: 'How do I migrate from legacy R1/V3 to V4?', a: 'Change your model parameter: deepseek-chat -> deepseek-v4-flash, deepseek-reasoner -> deepseek-v4-pro. The legacy aliases will be retired July 24, 2026. Same base URL and API key -- just update the model name. The API format is OpenAI-compatible.' },
    { q: 'Does DeepSeek have rate limits?', a: 'DeepSeek offers generous rate limits for pay-as-you-go users. During peak hours, free-tier users may experience longer queue times. Paid users get priority access. The API is OpenAI-compatible, making migration trivial from any OpenAI-based codebase.' },
    { q: 'Is DeepSeek safe for production use?', a: 'DeepSeek hosts all models in US data centers with enterprise-grade security. For regulated industries, check data residency requirements. Many enterprises use DeepSeek for cost-sensitive workloads while keeping OpenAI/Claude for sensitive data. Always review the latest privacy policy for your use case.' },
  ],
  howToUse: [
    'Select the DeepSeek models you want to compare (V4 Flash, V4 Pro, etc.).',
    'Enter your average input and output tokens per API call.',
    'Enter your expected daily request volume.',
    'Set the auto-cache hit rate -- DeepSeek automatically caches repeated prefixes.',
    'Add a growth rate and projection period for long-term cost planning.',
    'Review the cost comparison and see how much you save vs OpenAI, Claude, and Gemini.',
  ],
  dataLastUpdated: PRICING.lastUpdated,
};

registerEngine(engine);
