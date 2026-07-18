// P11-6 Attrition Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (SHRM 2022 Human Capital Benchmarking + Gallup attrition research + Pave turnover cost).
// INVERSE band direction — lower % = better.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 50,  label: '🟢 Excellent', message: 'Lean attrition cost — strong retention practices or low-friction backfill.' },
  good:      { threshold: 100, label: '🟡 Good',      message: 'Typical attrition cost — within SHRM benchmark range; flag >1.5x salary.' },
  warning:   { threshold: 200, label: '🟠 Warning',   message: 'High attrition cost — flight risk concentrated in critical roles; investigate manager tenure.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Severe attrition cost (>2x salary) — every leaver is a major business event.' },
};

export function attritionCost(annualSalary: number, recruitingCost: number, rampWeeks: number, lostProductivityMonths: number, roleLevel: 'IC' | 'Manager'): { recruitingCost: number; rampCost: number; lostProductivityCost: number; total: number; pctOfSalary: number } {
  const roleMultiplier = roleLevel === 'Manager' ? 1.5 : 1.0;
  const recruitingTotal = recruitingCost;
  const rampCost = (annualSalary / 52) * rampWeeks * 0.5;
  const lostProductivityCost = (annualSalary / 12) * lostProductivityMonths * roleMultiplier;
  const total = recruitingTotal + rampCost + lostProductivityCost;
  const pctOfSalary = annualSalary === 0 ? 0 : total / annualSalary * 100;
  return { recruitingCost: recruitingTotal, rampCost, lostProductivityCost, total, pctOfSalary };
}

export function calcHealthBand(pct: number): keyof typeof HEALTH_BANDS {
  if (pct <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (pct <= HEALTH_BANDS.good.threshold) return 'good';
  if (pct <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-attrition-cost-calculator',
  title: 'Attrition Cost',
  description:
    'Compute the total cost of losing a single employee — recruiting + ramp + lost productivity. INVERSE health bands — lower % of salary is better: 🟢 ≤50% · 🟡 50-100% · 🟠 100-200% · 🔴 >200%. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'annual_salary',           label: 'Annual base salary',              placeholder: 'e.g. 120000', type: 'number' },
    { name: 'recruiting_cost',         label: 'Recruiting cost',                 placeholder: 'e.g. 8000',   type: 'number' },
    { name: 'ramp_weeks',              label: 'Ramp weeks (backfill)',           placeholder: 'e.g. 12',     type: 'number' },
    { name: 'lost_productivity_months', label: 'Lost productivity months',       placeholder: 'e.g. 6',      type: 'number' },
    { name: 'role_level',              label: 'Role level', type: 'select', options: ['IC', 'Manager'], default: 'IC' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var cnn=function(x){return Math.max(0,x)};
  var sal = cnn(Number(inputs.annual_salary) || 0);
  var rec = cnn(Number(inputs.recruiting_cost) || 0);
  var rw = cnn(Number(inputs.ramp_weeks) || 0);
  var lpm = cnn(Number(inputs.lost_productivity_months) || 0);
  var role = inputs.role_level || 'IC';
  var mult = role === 'Manager' ? 1.5 : 1.0;
  var rampC = (sal / 52) * rw * 0.5;
  var lpC = (sal / 12) * lpm * mult;
  var total = rec + rampC + lpC;
  var pct = sal === 0 ? 0 : total / sal * 100;
  var band = pct <= 50 ? 'Excellent' : pct <= 100 ? 'Good' : pct <= 200 ? 'Warning' : 'Critical';
  var emoji = pct <= 50 ? '🟢' : pct <= 100 ? '🟡' : pct <= 200 ? '🟠' : '🔴';
  var altTotal = rec + rampC + (sal / 12) * lpm * 1.5;
  var altPct = sal === 0 ? 0 : altTotal / sal * 100;
  var targetLpm = Math.floor((sal * 0.5 - rec - rampC) * 12 / sal / mult);
  return [
    '🩺 Attrition Cost: ' + emoji + ' ' + band + ' ($' + Math.round(total).toLocaleString() + ' = ' + pct.toFixed(0) + '% of salary)',
    '📊 Snapshot: Recruiting $' + rec.toLocaleString() + ' + Ramp $' + Math.round(rampC).toLocaleString() + ' + Lost productivity $' + Math.round(lpC).toLocaleString() + ' (role ' + role + ')',
    '🔄 What-If: if role is Manager, lost prod = $' + Math.round(sal/12*lpm*1.5).toLocaleString() + ' → total = $' + Math.round(altTotal).toLocaleString() + ' (' + altPct.toFixed(0) + '%)',
    '⚖️ Break-Even: to hit 🟢 Excellent (≤50%), need lost_productivity_months ≤ ' + (targetLpm < 0 ? '0 (impossible — recruiting + ramp alone > 50%)' : targetLpm),
    '🎯 Milestone: Track attrition cost per leaver quarterly — flag anyone >100% salary for retention review',
    '💡 Tip: Manager attrition costs 1.5x IC — invest in skip-level 1:1s and comp reviews to catch flight risks early.'
  ];
}`,
  },
  generate(inputs) {
    const sal = clampNonNegative(Number(inputs.annual_salary) || 0);
    const rec = clampNonNegative(Number(inputs.recruiting_cost) || 0);
    const rw = clampNonNegative(Number(inputs.ramp_weeks) || 0);
    const lpm = clampNonNegative(Number(inputs.lost_productivity_months) || 0);
    const role = (inputs.role_level || 'IC') as 'IC' | 'Manager';
    const { recruitingCost, rampCost, lostProductivityCost, total, pctOfSalary } = attritionCost(sal, rec, rw, lpm, role);
    const band = calcHealthBand(pctOfSalary);
    const bandInfo = HEALTH_BANDS[band];
    const alt = attritionCost(sal, rec, rw, lpm, 'Manager');
    return [
      '🩺 Attrition Cost: ' + bandInfo.label + ' (' + fmtMoney(total) + ' = ' + fmtPct(pctOfSalary) + ' of salary)',
      '📊 Snapshot: Recruiting ' + fmtMoney(recruitingCost) + ' + Ramp ' + fmtMoney(rampCost) + ' + Lost productivity ' + fmtMoney(lostProductivityCost) + ' (role ' + role + ')',
      '🔄 What-If: if role is Manager, lost prod = ' + fmtMoney(alt.lostProductivityCost) + ' → total = ' + fmtMoney(alt.total) + ' (' + fmtPct(alt.pctOfSalary) + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (≤50%), need lost_productivity_months ≤ 4 OR cut recruiting/ramp costs proportionally',
      '🎯 Milestone: Track attrition cost per leaver quarterly — flag anyone >100% salary for retention review',
      '💡 Tip: Manager attrition costs 1.5x IC — invest in skip-level 1:1s and comp reviews to catch flight risks early.',
    ];
  },
  staticExamples: [
    '🩺 Attrition Cost: 🟡 Good ($81,846 = 68.2% of salary)\n📊 Snapshot: Recruiting $8,000 + Ramp $13,846 + Lost productivity $60,000 (role IC)\n🔄 What-If: if role is Manager, lost prod = $90,000 → total = $111,846 (93.2%)\n⚖️ Break-Even: to hit 🟢 Excellent (≤50%), need lost_productivity_months ≤ 4 OR cut recruiting/ramp costs proportionally\n🎯 Milestone: Track attrition cost per leaver quarterly — flag anyone >100% salary for retention review\n💡 Tip: Manager attrition costs 1.5x IC — invest in skip-level 1:1s and comp reviews to catch flight risks early.',
  ],
  faq: [
    { q: 'What does "attrition cost" include?', a: 'Three components: (1) Recruiting cost — recruiter fees, job board, interview time, signing bonus. (2) Ramp cost — the new hire takes weeks to reach productivity, during which the team is short-handed. (3) Lost productivity cost — the team and the leaver\'s network produce less during transition. P11-6 captures all three.' },
    { q: 'Why is Manager attrition 1.5x IC?', a: 'When a manager leaves, the entire team\'s productivity drops (1:1 disruption, reorg, hiring freeze) and the company pays a premium to backfill the role. P11-6 multiplies the lost_productivity_cost by 1.5 for Manager roles. SHRM 2022 backs this with empirical data.' },
    { q: 'What if I have detailed ramp data per role?', a: 'P11-6 uses a flat 50% productivity during ramp (i.e. ramp_cost = salary/52 × weeks × 0.5). For more granular modeling, use our [Productivity Ramp Curve Calculator] (P11-3) to fit a curve, then integrate over the ramp period.' },
    { q: 'How does recruiting_cost relate to offer accept rate?', a: 'Recruiting cost varies widely: in-house recruiter ~$3-5K, agency search ~$15-30K (15-25% of base for exec), employee referral ~$1-2K. Offer accept rate is orthogonal — a $5K recruiter can close a $200K hire that stays 5 years (very low attrition cost) or leaves in 6 months (very high).' },
    { q: 'Is voluntary + involuntary attrition treated differently?', a: 'P11-6 models total cost regardless of reason. In practice, involuntary attrition (layoffs, PIPs) typically has lower ramp_cost (faster decision to backfill) but higher recruiting_cost (reputation damage + severance). Voluntary attrition (resignations) typically has longer ramp_cost (more disruption) and the lost_productivity_months should reflect notice period + transition.' },
    { q: 'Should I include severance in the cost?', a: 'Yes — add it to recruiting_cost. Severance is typically 2-4 weeks per year of tenure for involuntary departures. P11-6 does not break it out separately, so lump it in.' },
  ],
  howToUse: [
    'Enter the annual base salary of the role that is leaving (or being backfilled).',
    'Enter recruiting cost (recruiter fees + job board + signing bonus).',
    'Enter ramp weeks — how long for the new hire to reach full productivity.',
    'Enter lost productivity months — typically 3-9 months for full team stabilization.',
    'Select role level (IC vs Manager — Manager uses 1.5x multiplier).',
    'Read the % of salary band, then check What-If for the Manager scenario.',
  ],
  sources: [
    'https://www.shrm.org/topics-tools/research/2022-human-capital-benchmarking-report',
    'https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx',
    'https://www.pave.com/compensation-benchmarks',
  ],
  engineKey: true,
};
registerEngine(engine);
