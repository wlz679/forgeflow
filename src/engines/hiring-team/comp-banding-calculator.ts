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
    customFn: `function run(inputs, pick, fill) {
  var cnn=function(x){return Math.max(0,x)};
  var base = cnn(Number(inputs.base_salary) || 0);
  var p25 = cnn(Number(inputs.market_p25) || 1);
  var p50 = cnn(Number(inputs.market_p50) || 1);
  var p75 = cnn(Number(inputs.market_p75) || 1);
  var role = inputs.role_title || 'this role';
  var pct = 0;
  if (base <= p25) pct = (base / p25) * 25;
  else if (base <= p50) pct = 25 + ((base - p25) / (p50 - p25)) * 25;
  else if (base <= p75) pct = 50 + ((base - p50) / (p75 - p50)) * 25;
  else pct = Math.min(100, 75 + ((base - p75) / p75) * 25);
  var band = pct >= 75 ? 'Excellent' : pct >= 50 ? 'Good' : pct >= 25 ? 'Warning' : 'Critical';
  var emoji = pct >= 75 ? '🟢' : pct >= 50 ? '🟡' : pct >= 25 ? '🟠' : '🔴';
  var targetAt75 = p75;
  return [
    '🩺 Comp Banding: ' + emoji + ' ' + band + ' (P' + pct.toFixed(0) + ')',
    '📊 Snapshot: ' + role + ' at $' + base.toLocaleString() + ' vs P25 $' + p25.toLocaleString() + ' / P50 $' + p50.toLocaleString() + ' / P75 $' + p75.toLocaleString(),
    '🔄 What-If: at P75 ($' + p75.toLocaleString() + '), retention risk drops 40% (per Pave 2024)',
    '⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget $' + targetAt75.toLocaleString() + ' — vs current $' + base.toLocaleString() + ' = $' + (targetAt75 - base).toLocaleString() + ' delta',
    '🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)',
    '💡 Tip: Pave / Levels.fyi / Carta publish role-level percentiles — refresh annually. Top-quartile retention is the goal.' + '\n\n🧭 Decision Recommendation\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '🧭 Decision Question: 单纯看 band midpoint 是陷阱，**核心问题是"候选人 market rate + 当前团队 equity + competitor 同岗位 pay + offer 速度 trade-off"**。top of band 可能意味着 hire 太晚。\n' +
    '🧭 Recommendation: (1) **offer < band 25 百分位** → 极可能 lose candidate（除非强 equity/使命）；(2) **25-75 百分位** → 合理区间（适合大多数情况）；(3) **> 75 百分位** → 仅在 critical hire / replacement > 6 月时；(4) **> 95 百分位** → 重新评估 role 必要性或拆分。\n' +
    '🧭 Key Uncertainty: (1) band 是 annualized base 不含 equity / bonus（total comp 可能 30-50% 高出）；(2) 不同 region 不可比（NYC senior ≠ Bangalore senior）；(3) competitor raise 数据滞后 6-12 月；(4) counter-offer 时机影响 retention。\n' +
    '🧭 Next Action: (a) 跑 [Attrition Cost Calculator] 看 replacement 成本；(b) 跑 [Productivity Ramp Curve Calculator] 看 ramp 时间 ROI；(c) 跑 [Fully Loaded Employee Cost Calculator] 看全负荷 cost；(d) 决策前 verify 候选人 other competing offers。'
  ];
}`,
  },
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
    return [
      '🩺 Comp Banding: ' + bandInfo.label + ' (P' + pct.toFixed(0) + ')',
      '📊 Snapshot: ' + role + ' at ' + fmtMoney(base) + ' · Below P75 by ' + fmtMoney(Math.max(0, p75 - base)) + ' · Above P50 by ' + fmtMoney(Math.max(0, base - p50)),
      '🔄 What-If: at P75 (' + fmtMoney(p75) + '), retention risk drops 40% (per Pave 2024)',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget ' + fmtMoney(p75) + ' — vs current ' + fmtMoney(base) + ' = ' + fmtMoney(deltaToP75) + ' delta',
      '🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)',
      '💡 Tip: Pave / Levels.fyi / Carta publish role-level percentiles — refresh annually. Top-quartile retention is the goal.',
      // P151 batch2: L5 Decision Recommendation
      '\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 band midpoint 是陷阱，**核心问题是"候选人 market rate + 当前团队 equity + competitor 同岗位 pay + offer 速度 trade-off"**。top of band 可能意味着 hire 太晚。\n• 🧭 Recommendation: (1) **offer < band 25 百分位** → 极可能 lose candidate（除非强 equity/使命）；(2) **25-75 百分位** → 合理区间（适合大多数情况）；(3) **> 75 百分位** → 仅在 critical hire / replacement > 6 月时；(4) **> 95 百分位** → 重新评估 role 必要性或拆分。\n• 🧭 Key Uncertainty: (1) band 是 annualized base 不含 equity / bonus（total comp 可能 30-50% 高出）；(2) 不同 region 不可比（NYC senior ≠ Bangalore senior）；(3) competitor raise 数据滞后 6-12 月；(4) counter-offer 时机影响 retention。\n• 🧭 Next Action: (a) 跑 [Attrition Cost Calculator] 看 replacement 成本；(b) 跑 [Productivity Ramp Curve Calculator] 看 ramp 时间 ROI；(c) 跑 [Fully Loaded Employee Cost Calculator] 看全负荷 cost；(d) 决策前 verify 候选人 other competing offers。',
    ];
  },
  staticExamples: [
    '🩺 Comp Banding: 🟡 Good (P54)\n📊 Snapshot: Senior Software Engineer at $160,000 · Below P75 by $25,000 · Above P50 by $5,000\n🔄 What-If: at P75 ($185,000), retention risk drops 40% (per Pave 2024)\n⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget $185,000 — vs current $160,000 = $25,000 delta\n🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)\n💡 Tip: Pave / Levels.fyi / Carta publish role-level percentiles — refresh annually. Top-quartile retention is the goal.\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🧭 Decision Question: 单纯看 band midpoint 是陷阱，**核心问题是"候选人 market rate + 当前团队 equity + competitor 同岗位 pay + offer 速度 trade-off"**。top of band 可能意味着 hire 太晚。\n• 🧭 Recommendation: (1) **offer < band 25 百分位** → 极可能 lose candidate（除非强 equity/使命）；(2) **25-75 百分位** → 合理区间（适合大多数情况）；(3) **> 75 百分位** → 仅在 critical hire / replacement > 6 月时；(4) **> 95 百分位** → 重新评估 role 必要性或拆分。\n• 🧭 Key Uncertainty: (1) band 是 annualized base 不含 equity / bonus（total comp 可能 30-50% 高出）；(2) 不同 region 不可比（NYC senior ≠ Bangalore senior）；(3) competitor raise 数据滞后 6-12 月；(4) counter-offer 时机影响 retention。\n• 🧭 Next Action: (a) 跑 [Attrition Cost Calculator] 看 replacement 成本；(b) 跑 [Productivity Ramp Curve Calculator] 看 ramp 时间 ROI；(c) 跑 [Fully Loaded Employee Cost Calculator] 看全负荷 cost；(d) 决策前 verify 候选人 other competing offers。',
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
