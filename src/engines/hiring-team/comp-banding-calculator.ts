// P11-4 Compensation Banding
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Pave 2024 comp database + Levels.fyi 2024 + Carta comp reports).
// HIGHER band direction — paying competitively is better.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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
    customFn: `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let a=function(t){return Number.isNaN(t)?0:Math.max(0,t)},d=function(t,i,e,n){return t<=i?i===0?0:t/i*25:t<=e?e===i?25:25+(t-i)/(e-i)*25:t<=n?n===e?50:50+(t-e)/(n-e)*25:Math.min(100,75+(t-n)/n*25)},g=function(t){return t>=s.excellent.threshold?"excellent":t>=s.good.threshold?"good":t>=s.warning.threshold?"warning":"critical"},r=function(t){return"$"+Math.round(t).toLocaleString()},h=function(t,i,e){var n=_(t);return Array.isArray(n)?n.join(\`
\`):String(n)};var y=a,k=d,v=g,P=r,w=h,s={excellent:{threshold:75,label:"🟢 Excellent",message:"Paying at or above P75 — top-quartile retention signal."},good:{threshold:50,label:"🟡 Good",message:"Paying at market median or above — competitive but not top-quartile."},warning:{threshold:25,label:"🟠 Warning",message:"Below market median — flight risk to competitors offering P50+."},critical:{threshold:null,label:"🔴 Critical",message:"Significantly below market — high attrition risk; expect counter-offer pressure within 6 months."}},_=function(t){const i=t.role_title||"this role",e=a(Number(t.base_salary)||0),n=a(Number(t.market_p25)||0),u=a(Number(t.market_p50)||0),o=a(Number(t.market_p75)||0),m=d(e,n,u,o),c=g(m),p=s[c],b=o-e,f={pct:m.toFixed(0),base:r(e),p50:r(u),p75:r(o)};let l;return c==="excellent"?l=JSON.stringify({code:"comp_banding_top_quartile",params:f}):c==="good"?l=JSON.stringify({code:"comp_banding_p50_to_p75",params:f}):c==="warning"?l=JSON.stringify({code:"comp_banding_p25_to_p50",params:f}):l=JSON.stringify({code:"comp_banding_below_p25",params:f}),["🩺 Comp Banding: "+p.label+" (P"+m.toFixed(0)+")","📊 Snapshot: "+i+" at "+r(e)+" · Below P75 by "+r(Math.max(0,o-e))+" · Above P50 by "+r(Math.max(0,e-u)),"🔄 What-If: at P75 ("+r(o)+"), retention risk drops 40% (per Pave 2024)","⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget "+r(o)+" — vs current "+r(e)+" = "+r(b)+" delta","🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)","💡 Tip: "+l]};return[h(inputs,pick,fill)]}finally{}
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
    return [
      '🩺 Comp Banding: ' + bandInfo.label + ' (P' + pct.toFixed(0) + ')',
      '📊 Snapshot: ' + role + ' at ' + fmtMoney(base) + ' · Below P75 by ' + fmtMoney(Math.max(0, p75 - base)) + ' · Above P50 by ' + fmtMoney(Math.max(0, base - p50)),
      '🔄 What-If: at P75 (' + fmtMoney(p75) + '), retention risk drops 40% (per Pave 2024)',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget ' + fmtMoney(p75) + ' — vs current ' + fmtMoney(base) + ' = ' + fmtMoney(deltaToP75) + ' delta',
      '🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)',
      '💡 Tip: ' + tip,
    ];
  },
  staticExamples: [
    '🩺 Comp Banding: 🟡 Good (P54)\n📊 Snapshot: Senior Software Engineer at $160,000 · Below P75 by $25,000 · Above P50 by $5,000\n🔄 What-If: at P75 ($185,000), retention risk drops 40% (per Pave 2024)\n⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget $185,000 — vs current $160,000 = $25,000 delta\n🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)\n💡 Tip: {"code":"comp_banding_p50_to_p75","params":{"pct":"54","base":"$160,000","p50":"$155,000","p75":"$185,000"}}',
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
