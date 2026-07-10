// P11-4 Compensation Banding
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Pave 2024 comp database + Levels.fyi 2024 + Carta comp reports).
// HIGHER band direction — paying competitively is better.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

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
  var base = Number(inputs.base_salary) || 0;
  var p25 = Number(inputs.market_p25) || 1;
  var p50 = Number(inputs.market_p50) || 1;
  var p75 = Number(inputs.market_p75) || 1;
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
    '💡 Tip: Pave / Levels.fyi / Carta publish role-level percentiles — refresh annually. Top-quartile retention is the goal.'
  ];
}`,
  },
  generate(inputs) {
    const role = inputs.role_title || 'this role';
    const base = Number(inputs.base_salary) || 0;
    const p25 = Number(inputs.market_p25) || 0;
    const p50 = Number(inputs.market_p50) || 0;
    const p75 = Number(inputs.market_p75) || 0;
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
    ];
  },
  staticExamples: [
    '🩺 Comp Banding: 🟡 Good (P54)\n📊 Snapshot: Senior Software Engineer at $160,000 · Below P75 by $25,000 · Above P50 by $5,000\n🔄 What-If: at P75 ($185,000), retention risk drops 40% (per Pave 2024)\n⚖️ Break-Even: to hit 🟢 Excellent (≥P75), budget $185,000 — vs current $160,000 = $25,000 delta\n🎯 Milestone: Annual comp review (Q1) to keep up with market drift (~5%/yr per Levels.fyi)\n💡 Tip: Pave / Levels.fyi / Carta publish role-level percentiles — refresh annually. Top-quartile retention is the goal.',
  ],
  faq: [
    { q: 'Where do I get P25/P50/P75 market data?', a: 'Three primary sources: (1) Pave — paid comp database with role-level cuts by company size, geo, and industry. (2) Levels.fyi — free for tech roles, especially engineering. (3) Carta — for startup-stage equity + cash data. For non-tech roles, BLS OES wage data by occupation is a fallback.' },
    { q: 'How often do market percentiles change?', a: 'Tech salaries drift ~5% per year (Levels.fyi 2024). Equity benchmarks shift more dramatically during bull/bear cycles. Refresh your P25/P50/P75 inputs at every annual review cycle, or when you are making a hire decision.' },
    { q: 'Should I use geo-adjusted percentiles?', a: 'Yes for distributed teams. A Senior Engineer in San Francisco at P50 is a Junior Engineer in most of the country. Pave and Levels.fyi both support geo filters (SF Bay, NYC, Remote-US, etc.). For fully-remote companies, the "remote-first" percentile is usually 20-30% below SF.' },
    { q: 'What if base is between P75 and P100?', a: 'P11-4 caps the percentile at 100. Going significantly above P75 (e.g. P85-P95) is reasonable for retention hot-stocks or niche skills, but you may be paying more than necessary. Pair with our [Equity Refresh Calculator] (P11-5) to balance cash vs equity.' },
    { q: 'Does this include equity in the percentile?', a: 'No — P11-4 is base-salary only. Total comp (base + bonus + equity) percentiles require a different model. Pave and Carta both publish total-comp percentiles, but the math is more complex (NPV of equity, expected value of bonus).' },
    { q: 'What if I have no P25/P50/P75 data?', a: 'Use Levels.fyi for tech roles (free). For non-tech, use BLS OES wage data (wage estimates by percentile by metro). For niche roles, hire a Pave subscription or work with a compensation consultant.' },
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
};
registerEngine(engine);