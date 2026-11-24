// P11-4 Compensation Banding
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Pave 2024 comp database + Levels.fyi 2024 + Carta comp reports).
// HIGHER band direction — paying competitively is better.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
//   ⚠️ 命名空间必须精确等于 toolAlias(slug)（见 tests/scripts/p168-tokenized-engines.mjs）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 75, label: '🟢 Excellent', message: 'Paying at or above P75 — top-quartile retention signal.' },
  good:      { threshold: 50, label: '🟡 Good',      message: 'Paying at market median or above — competitive but not top-quartile.' },
  warning:   { threshold: 25, label: '🟠 Warning',   message: 'Below market median — flight risk to competitors offering P50+.' },
  critical:  { threshold: -Infinity, label: '🔴 Critical', message: 'Significantly below market — high attrition risk; expect counter-offer pressure within 6 months.' },
};

export function compPercentile(base: number, p25: number, p50: number, p75: number): number {
  if (base <= p25) {
    if (p25 === 0) return 0;
    return (base / p25) * 25;
  }
  if (base <= p50) {
    if (p50 === p25) return 25;
    return 25 + ((base - p25) / (p50 - p25)) * 25;
  }
  if (base <= p75) {
    if (p75 === p50) return 50;
    return 50 + ((base - p50) / (p75 - p50)) * 25;
  }
  // above P75: cap at 100
  return Math.min(100, 75 + ((base - p75) / p75) * 25);
}

export function calcHealthBand(percentile: number): keyof typeof HEALTH_BANDS {
  if (percentile >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (percentile >= HEALTH_BANDS.good.threshold) return 'good';
  if (percentile >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-comp-banding-calculator',
  title: 'Compensation Banding',
  description:
    'Compute the market percentile of an offered salary against P25/P50/P75 benchmarks. HIGHER health bands — paying competitively is better: 🟢 ≥P75 · 🟡 P50-P75 · 🟠 P25-P50 · 🔴 <P25. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'role_title', label: 'Role title',                     placeholder: 'e.g. Senior Software Engineer', type: 'text' },
    { name: 'base_salary', label: 'Offered base salary',           placeholder: 'e.g. 160000', type: 'number' },
    { name: 'market_p25', label: 'Market P25 (25th percentile)',  placeholder: 'e.g. 130000', type: 'number' },
    { name: 'market_p50', label: 'Market P50 (median)',            placeholder: 'e.g. 155000', type: 'number' },
    { name: 'market_p75', label: 'Market P75 (75th percentile)',  placeholder: 'e.g. 185000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let i=function(e){return Number.isNaN(e)?0:Math.max(0,e)},b=function(e,o,t,n){return e<=o?o===0?0:e/o*25:e<=t?t===o?25:25+(e-o)/(t-o)*25:e<=n?n===t?50:50+(e-t)/(n-t)*25:Math.min(100,75+(e-n)/n*25)},d=function(e){return e>=c.excellent.threshold?"excellent":e>=c.good.threshold?"good":e>=c.warning.threshold?"warning":"critical"},r=function(e){return"$"+Math.round(e).toLocaleString()},p=function(e,o,t){var n=w(e);return Array.isArray(n)?n.join(\`
\`):String(n)};var N=i,S=b,q=d,F=r,O=p,m=tk,y='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',m=new Function("return "+y)(),c={excellent:{threshold:75,label:"🟢 Excellent",message:"Paying at or above P75 — top-quartile retention signal."},good:{threshold:50,label:"🟡 Good",message:"Paying at market median or above — competitive but not top-quartile."},warning:{threshold:25,label:"🟠 Warning",message:"Below market median — flight risk to competitors offering P50+."},critical:{threshold:null,label:"🔴 Critical",message:"Significantly below market — high attrition risk; expect counter-offer pressure within 6 months."}},w=function(e){const o=e.role_title||"this role",t=i(Number(e.base_salary)||0),n=i(Number(e.market_p25)||0),f=i(Number(e.market_p50)||0),a=i(Number(e.market_p75)||0),g=b(t,n,f,a),s=d(g),P=c[s],x=a-t,u={pct:g.toFixed(0),base:r(t),p50:r(f),p75:r(a)};let l;s==="excellent"?l=JSON.stringify({code:"comp_banding_top_quartile",params:u}):s==="good"?l=JSON.stringify({code:"comp_banding_p50_to_p75",params:u}):s==="warning"?l=JSON.stringify({code:"comp_banding_p25_to_p50",params:u}):l=JSON.stringify({code:"comp_banding_below_p25",params:u});const h=o,_=r(t),k=r(Math.max(0,a-t)),v=r(Math.max(0,t-f));return["🩺 Comp Banding: "+P.label+" (P"+g.toFixed(0)+")",m("calc_out.comp_banding.row.snapshot","📊 Snapshot: "+h+" at "+_+" · Below P75 by "+k+" · Above P50 by "+v,{role:h,base:_,below_p75:k,above_p50:v}),"🔄 What-If: at P75 ("+r(a)+"), retention risk drops 40% (per Pave 2024)","⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget "+r(a)+" — vs current "+r(t)+" = "+r(x)+" delta","🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)","💡 Tip: "+l]};return[p(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`,
  },
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该按这个薪资带开价，还是先调整职级与市场定位',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate(inputs) {
    const role = inputs.role_title || 'this role';
    const base = clampNonNegative(Number(inputs.base_salary) || 0);
    const p25 = clampNonNegative(Number(inputs.market_p25) || 0);
    const p50 = clampNonNegative(Number(inputs.market_p50) || 0);
    const p75 = clampNonNegative(Number(inputs.market_p75) || 0);
    const pct = compPercentile(base, p25, p50, p75);
    const band = calcHealthBand(pct);
    const bandInfo = HEALTH_BANDS[band];
    const deltaToP75 = p75 - base;
    // P168 B3-4：💡 Tip 改成**建议码**（语义码 + 参数）—— 英文句子搬进 locale，
    //   zh 页的动态层才会是中文。⚠️ **分支条件与阈值一个都不改**（分支 = 上面 Health 那套 band）。
    //   ⚠️ customFn 里必须写**逐字相同**的一份（守卫「两套实现不许漂」守着这条）。
    const tipParams = { pct: pct.toFixed(0), base: fmtMoney(base), p50: fmtMoney(p50), p75: fmtMoney(p75) };
    let tip: string;
    if (band === 'excellent') {
      tip = JSON.stringify({ code: 'comp_banding_top_quartile', params: tipParams });
    } else if (band === 'good') {
      tip = JSON.stringify({ code: 'comp_banding_p50_to_p75', params: tipParams });
    } else if (band === 'warning') {
      tip = JSON.stringify({ code: 'comp_banding_p25_to_p50', params: tipParams });
    } else {
      tip = JSON.stringify({ code: 'comp_banding_below_p25', params: tipParams });
    }
    const roleLabel = role;
    const baseLabel = fmtMoney(base);
    const belowP75Label = fmtMoney(Math.max(0, p75 - base));
    const aboveP50Label = fmtMoney(Math.max(0, base - p50));
    return [
      '🩺 Comp Banding: ' + bandInfo.label + ' (P' + pct.toFixed(0) + ')',
      makeToken(
        'calc_out.comp_banding.row.snapshot',
        '📊 Snapshot: ' + roleLabel + ' at ' + baseLabel + ' · Below P75 by ' + belowP75Label + ' · Above P50 by ' + aboveP50Label,
        { role: roleLabel, base: baseLabel, below_p75: belowP75Label, above_p50: aboveP50Label },
      ),
      '🔄 What-If: at P75 (' + fmtMoney(p75) + '), retention risk drops 40% (per Pave 2024)',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget ' + fmtMoney(p75) + ' — vs current ' + fmtMoney(base) + ' = ' + fmtMoney(deltaToP75) + ' delta',
      '🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)',
      '💡 Tip: ' + tip,
    ];
  },
  staticExamples: [
    '🩺 Comp Banding: 🟡 Good (P54)\n$calc_out.comp_banding.row.snapshot{"role":"Senior Software Engineer","base":"$160,000","below_p75":"$25,000","above_p50":"$5,000"}|📊 Snapshot: Senior Software Engineer at $160,000 · Below P75 by $25,000 · Above P50 by $5,000|\n🔄 What-If: at P75 ($185,000), retention risk drops 40% (per Pave 2024)\n⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget $185,000 — vs current $160,000 = $25,000 delta\n🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)\n💡 Tip: {"code":"comp_banding_p50_to_p75","params":{"pct":"54","base":"$160,000","p50":"$155,000","p75":"$185,000"}}',
  ],
  faq: [
    { q: 'Where do I get P25/P50/P75 market data?', a: 'Three primary sources: (1) Pave — paid comp database with role-level cuts by company size, geo, and industry. (2) Levels.fyi — free for tech roles, especially engineering. (3) Carta — for startup-stage equity + cash data. For non-tech roles, BLS OES wage data by occupation is a fallback.' },
    { q: 'How often do market percentiles change?', a: 'Tech salaries drift ~5% per year (Levels.fyi 2024). Equity benchmarks shift more dramatically during bull/bear cycles. Refresh your P25/P50/P75 inputs at every annual review cycle, or when you are making a hire decision.' },
    { q: 'Should I use geo-adjusted percentiles?', a: 'Yes for distributed teams. A Senior Engineer in San Francisco at P50 is a Junior Engineer in most of the country. Pave and Levels.fyi both support geo filters (SF Bay, NYC, Remote-US, etc.). For fully-remote companies, the "remote-first" percentile is usually 20-30% below SF.' },
    { q: 'What if base is between P75 and P100?', a: 'P11-4 caps the percentile at 100. Going significantly above P75 (e.g. P85-P95) is reasonable for retention hot-stocks or niche skills, but you may be paying more than necessary. Pair with our [Equity Refresh Calculator] (P11-5) to balance cash vs equity.' },
    { q: 'Does this include equity in the percentile?', a: 'No — P11-4 is base-salary only. Total comp (base + bonus + equity) percentiles require a different model. Pave and Carta both publish total-comp percentiles, but the math is more complex (NPV of equity, expected value of bonus).' },
    { q: 'What if I have no P25/P50/P75 data?', a: 'Use Levels.fyi for tech roles (free). For non-tech, use BLS OES wage data (wage estimates by percentile by metro). For niche roles, hire a Pave subscription or work with a compensation consultant.' },
    { q: "What is compensation banding?", a: "Comp bands = salary ranges for each role/level, with min, midpoint, and max. Typically: midpoint = market median for the role. Range spread: 30-50% (e.g., $100K midpoint = $80K-130K range). Bands ensure internal equity, market competitiveness, and consistent raises. Update annually with market data." },
    { q: "How do I create compensation bands?", a: "1) Define roles and levels (e.g., Engineer II, Senior, Staff), 2) Source market data (Radford, Levels.fyi, Pave, OptionImpact), 3) Set midpoint at market median (or 50-60th percentile for top talent), 4) Set range spread 30-50%, 5) Get leadership approval. Bands per role/level/region. Refresh annually." },
    { q: "What is the right range spread for comp bands?", a: "Common: 30-50% spread (min to max). For engineers: 40-50% (room for growth). For executives: 50-100%. Narrower bands (20-30%) for senior roles. Wider bands (50%+) for junior roles. The midpoint should be 50-60th percentile of market. Bands too narrow = no room for growth. Too wide = inconsistent pay." },
    { q: "How do I use bands for hiring decisions?", a: "Hire at: 80-100% of range for the level. New hires often get 90-100% to attract. Internal transfers: 80-95%. Promotions: 95-110% (going into next band). Use bands as guide, not law. Below 80% = underpaid (high turnover risk). Above 110% = room for promotion soon." },
    { q: "Where should I get market compensation data?", a: "Free: Levels.fyi, Glassdoor, Payscale, LinkedIn Salary. Paid: Radford (Aon), Pave, OptionImpact, Mercer, Compa. Surveys: 50-100 companies per role. Geo-adjusted. Annual subscription: $5K-50K. DIY: post jobs, ask recruiters, network. Most accurate: combination of paid data + Levels.fyi verification." },
    { q: "How should comp differ by location?", a: "Geo-adjusted bands: SF/NYC = 100%, Seattle/Boston = 95%, Austin/Denver = 85%, US average = 75%, Eastern Europe = 40-50%, LATAM = 35-45%, India = 25-35%, Philippines = 20-30%. Adjust for fully remote (use US rates for top talent, geo-adjusted for cost savings). Many companies geo-adjusted 2020-2024, then reset to US rates for top talent." },
    { q: "What about equity in compensation bands?", a: "Equity comp total = base × equity multiplier. Senior ICs: 1-2x base. Managers: 2-3x. VPs: 3-5x. Executives: 5-10x. Bands include both cash and equity. Set ranges with this in mind. Total comp range typically 50-100% spread (vs 30-50% for cash-only). Refresher: stock refresh annually (5-10% of grant)." },
    { q: "How often should I refresh comp bands?", a: "Bands: refresh annually (Q1 typically). Mid-year: spot adjustments for hot roles. Trigger events: major market shifts (inflation, layoffs, hot talent market). Communicate: timing, methodology, impact. Most companies do 3-5% market adjust annually + 5-10% merit. Communicate to managers before employees." },
  ],
  howToUse: [
    'Enter the role title (e.g. Senior Software Engineer) — for context, not math.',
    'Enter the offered base salary.',
    'Enter market P25, P50, P75 from Pave / Levels.fyi / Carta (geo-adjusted for your location).',
    'Read the percentile — 🟢 ≥P75 means you are paying top-quartile.',
    'Pair with [Equity Refresh Calculator] (P11-5) to plan total retention package.',
  ],
  sources: [
    'https://www.pave.com/compensation-benchmarks',
    'https://www.levels.fyi/comp-data',
    'https://carta.com/data/equity-benchmarks/',
  ],
  engineKey: true,
};
registerEngine(engine);
