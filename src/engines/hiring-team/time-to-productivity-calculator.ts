// P11-2 Time to Productivity (Ramp Time)
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (LinkedIn Talent Insights 2024 + HBR First 90 Days + Pave 2024).
// Dual-band per role_level: IC ramp ~ half of Manager ramp.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  IC: {
    excellent: { threshold: 4,  label: '🟢 Excellent', message: 'Fast ramp — IC reaches productivity in under a month.' },
    good:      { threshold: 8,  label: '🟡 Good',      message: 'Healthy IC ramp — under 2 months to first meaningful output.' },
    warning:   { threshold: 16, label: '🟠 Warning',   message: 'Slow IC ramp — likely missing documentation, mentorship, or scoped first project.' },
    critical:  { threshold: Infinity, label: '🔴 Critical', message: 'IC ramp >4 months — onboarding program needs immediate overhaul.' },
  },
  Manager: {
    excellent: { threshold: 8,  label: '🟢 Excellent', message: 'Fast Manager ramp — leadership transition completed in under 2 months.' },
    good:      { threshold: 16, label: '🟡 Good',      message: 'Typical Manager ramp — first 90 days complete with team alignment.' },
    warning:   { threshold: 26, label: '🟠 Warning',   message: 'Slow Manager ramp — likely missing executive sponsorship or team context.' },
    critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Manager ramp >6 months — succession risk and team disengagement likely.' },
  },
};

export function adjustedRamp(weeks: number, complexity: 'Low' | 'Med' | 'High'): number {
  const mult = complexity === 'Low' ? 0.75 : complexity === 'High' ? 1.4 : 1.0;
  return weeks * mult;
}

export function calcHealthBand(weeks: number, role: 'IC' | 'Manager'): keyof typeof HEALTH_BANDS.IC {
  const table = HEALTH_BANDS[role];
  if (weeks <= table.excellent.threshold) return 'excellent';
  if (weeks <= table.good.threshold) return 'good';
  if (weeks <= table.warning.threshold) return 'warning';
  return 'critical';
}

function fmtWeeks(x: number): string { return x.toFixed(1).replace(/\.0$/, '') + 'w'; }

const engine: ToolEngine = {
  slug: 'solopreneur-time-to-productivity-calculator',
  title: 'Time to Productivity (Ramp Time)',
  description:
    'Compute the adjusted ramp time to first meaningful productivity for a new hire, factoring role level (IC vs Manager) and industry complexity. INVERSE health bands — shorter ramp is better. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'role_level',         label: 'Role level',          type: 'select', options: ['IC', 'Manager'], default: 'IC' },
    { name: 'ramp_weeks',         label: 'Base ramp weeks',     placeholder: 'e.g. 8', type: 'number' },
    { name: 'industry_complexity', label: 'Industry complexity', type: 'select', options: ['Low', 'Med', 'High'], default: 'Med' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var role = inputs.role_level || 'IC';
  var weeks = Number(inputs.ramp_weeks) || 0;
  var cplx = inputs.industry_complexity || 'Med';
  var mult = cplx === 'Low' ? 0.75 : cplx === 'High' ? 1.4 : 1.0;
  var adj = weeks * mult;
  var t = role === 'Manager' ? { ex: 8, gd: 16, wn: 26 } : { ex: 4, gd: 8, wn: 16 };
  var band = adj <= t.ex ? 'Excellent' : adj <= t.gd ? 'Good' : adj <= t.wn ? 'Warning' : 'Critical';
  var emoji = adj <= t.ex ? '🟢' : adj <= t.gd ? '🟡' : adj <= t.wn ? '🟠' : '🔴';
  return [
    '🩺 Ramp Health: ' + emoji + ' ' + band + ' (' + adj.toFixed(1).replace(/\\.0$/, '') + 'w for ' + role + ')',
    '📊 Snapshot: ' + weeks + 'w base × ' + mult + 'x (' + cplx + ') = ' + adj.toFixed(1).replace(/\\.0$/, '') + 'w. Role: ' + role,
    '🔄 What-If: if complexity drops to Low, ramp = ' + (weeks * 0.75).toFixed(1).replace(/\\.0$/, '') + 'w (would be ' + ((weeks * 0.75) <= t.ex ? 'Excellent' : (weeks * 0.75) <= t.gd ? 'Good' : (weeks * 0.75) <= t.wn ? 'Warning' : 'Critical') + ')',
    '⚖️ Break-Even: to hit ' + (role === 'IC' ? '🟢 Excellent (≤4w)' : '🟢 Excellent (≤8w)') + ', need ' + (role === 'IC' ? '4w × ' + (4 / weeks).toFixed(2) : '8w × ' + (8 / weeks).toFixed(2)) + ' base ramp',
    '🎯 Milestone: Plan first 90-day OKRs to land at week 12; pair with our [Productivity Ramp Curve Calculator] (P11-3)',
    '💡 Tip: Manager ramp is typically 2x IC ramp — budget for this in headcount plan and avoid promoting ICs without 6mo management prep.'
  ];
}`,
  },
  generate(inputs) {
    const role = (inputs.role_level || 'IC') as 'IC' | 'Manager';
    const weeks = Number(inputs.ramp_weeks) || 0;
    const cplx = (inputs.industry_complexity || 'Med') as 'Low' | 'Med' | 'High';
    const adj = adjustedRamp(weeks, cplx);
    const band = calcHealthBand(adj, role);
    const bandInfo = HEALTH_BANDS[role][band];
    const altAdj = adjustedRamp(weeks, 'Low');
    const altBand = calcHealthBand(altAdj, role);
    const altBandInfo = HEALTH_BANDS[role][altBand];
    const targetWeeks = HEALTH_BANDS[role].excellent.threshold;
    const ratioNeeded = targetWeeks / weeks;
    return [
      '🩺 Ramp Health: ' + bandInfo.label + ' (' + fmtWeeks(adj) + ' for ' + role + ')',
      '📊 Snapshot: ' + weeks + 'w base × ' + (cplx === 'Low' ? '0.75' : cplx === 'High' ? '1.40' : '1.00') + ' (' + cplx + ' complexity) = ' + fmtWeeks(adj) + ' adjusted',
      '🔄 What-If: if complexity drops to Low, ramp = ' + fmtWeeks(altAdj) + ' (would be ' + altBandInfo.label + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (' + (role === 'IC' ? '≤4w' : '≤8w') + ' ceiling), need base ramp of ' + fmtWeeks(targetWeeks) + ' — i.e. ' + ratioNeeded.toFixed(2) + 'x your current ' + weeks + 'w',
      '🎯 Milestone: Plan first 90-day OKRs landing at week 12; pair with [Productivity Ramp Curve Calculator] (P11-3) to model output curve',
      '💡 Tip: Manager ramp is typically 2x IC ramp — budget for this in headcount plan and avoid promoting ICs to management without 6 months of management prep.',
    ];
  },
  staticExamples: [
    '🩺 Ramp Health: 🟡 Good (8w for IC)\n📊 Snapshot: 8w base × 1.00 (Med complexity) = 8w adjusted\n🔄 What-If: if complexity drops to Low, ramp = 6w (would be 🟡 Good)\n⚖️ Break-Even: to hit 🟢 Excellent (≤4w ceiling), need base ramp of 4w — i.e. 0.50x your current 8w\n🎯 Milestone: Plan first 90-day OKRs landing at week 12; pair with [Productivity Ramp Curve Calculator] (P11-3) to model output curve\n💡 Tip: Manager ramp is typically 2x IC ramp — budget for this in headcount plan and avoid promoting ICs to management without 6 months of management prep.',
  ],
  faq: [
    { q: 'What counts as "productivity"?', a: 'A new hire is "productive" when they are contributing at the level expected for their role — usually measured by reaching OKR targets, shipping independent work, or hitting ramp-stage review milestones. Different companies use different definitions; pick one and stick with it.' },
    { q: 'Why is Manager ramp 2x IC ramp?', a: 'Managers have to learn the team (existing 1:1s, dynamics, history), the org (cross-functional partners, political landscape), AND their leadership style — in addition to the same role-context learning an IC needs. HBR "The First 90 Days" and LinkedIn Talent Insights 2024 both confirm this 2x pattern.' },
    { q: 'What is industry complexity?', a: 'A multiplier reflecting how much domain context the new hire needs. Low = consumer/general (e.g. marketing at a DTC brand), Med = general SaaS, High = specialized B2B (e.g. healthcare IT, financial compliance, dev tooling for niche stacks).' },
    { q: 'Should I include training/onboarding in ramp weeks?', a: 'Yes — ramp weeks should cover the FULL period from start date to first meaningful output, including any formal training, certification, or shadowing. Don\'t double-count by adding training separately.' },
    { q: 'How does this pair with P11-3 Productivity Ramp Curve?', a: 'P11-2 measures HOW LONG until first productivity. P11-3 models the CURVE of productivity over time (S-Curve, Linear, SlowStart) and computes break-even month. Use P11-2 for headcount plan; use P11-3 to project cumulative productive output.' },
    { q: 'What if I onboard 10 hires at once?', a: 'Cohort-based onboarding typically lengthens ramp by 20-30% (mentor attention divided). Factor this in by adding a "cohort" complexity tier or multiplying ramp_weeks by 1.25 for cohorts of 5+.' },
  ],
  howToUse: [
    'Select the role level (IC vs Manager) — Manager has 2x the IC ramp ceiling.',
    'Enter the base ramp weeks for this role (typical: IC 4-12w, Manager 8-26w).',
    'Select industry complexity — Low (consumer/general), Med (SaaS), High (specialized B2B).',
    'Read the adjusted ramp band, then check the What-If for what a complexity reduction would do.',
    'Use the Break-Even to set the target ramp for next hire cohort.',
  ],
  sources: [
    'https://www.linkedin.com/business/talent/blog/talent-acquisition/onshore-onsite-and-ramp-up-time',
    'https://hbr.org/2009/04/leading-change-when-business-is-good',
    'https://www.pave.com/compensation-benchmarks',
  ],
};
registerEngine(engine);