// P10-5 Time-to-Value (TTV)
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Intercom Onboarding Benchmarks + Buffer Growth Team).
//
// INVERSE BAND DIRECTION: lower TTV = better.
// P9-4 lesson applied: lower_is_better uses <= comparison (NOT >=).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 1,    label: '🟢 Excellent', message: 'Lightning-fast aha-moment - users see value within their first session.' },
  good:      { threshold: 3,    label: '🟡 Good',      message: 'Fast TTV - users reach aha within a few days. Strong onboarding.' },
  warning:   { threshold: 7,    label: '🟠 Warning',   message: 'Slow TTV - users take up to a week to find value. Optimize the first-run experience.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Very slow TTV - users wait more than a week. Major activation risk.' },
};

export function calcHealthBand(days: number): 'excellent' | 'good' | 'warning' | 'critical' {
  // INVERSE direction (P9-4 lesson): lower = better
  if (days < 0) return 'critical';
  if (days <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (days <= HEALTH_BANDS.good.threshold) return 'good';
  if (days <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtDays(n: number): string {
  if (n === 0) return '0 days (same-session)';
  if (n < 1) return (n * 24).toFixed(1) + ' hours';
  if (n === 1) return '1 day';
  if (n < 7) return n.toFixed(1) + ' days';
  if (n < 30) return n.toFixed(0) + ' days (~' + (n / 7).toFixed(1) + ' weeks)';
  return n.toFixed(0) + ' days (~' + (n / 30).toFixed(1) + ' months)';
}

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn = "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) { var p50 = cnn(Number(inputs['median_days'])); var p90 = cnn(Number(inputs['p90_days'])); if (p90 < p50) p90 = p50; var band = p50 <= 1 ? 'Excellent' : p50 <= 3 ? 'Good' : p50 <= 7 ? 'Warning' : 'Critical'; var emoji = p50 <= 1 ? 'GREEN' : p50 <= 3 ? 'YELLOW' : p50 <= 7 ? 'ORANGE' : 'RED'; var gap = p90 - p50; return ['TTV ' + emoji + ' ' + band + ' (median ' + p50.toFixed(1) + ' days, p90 ' + p90.toFixed(1) + ' days)','SNAPSHOT: 50% of users reach the aha-moment in ' + p50.toFixed(1) + ' days. 90% do within ' + p90.toFixed(1) + ' days. Long-tail gap: ' + gap.toFixed(1) + ' days.','WHATIF: cutting the first milestone by 1 day typically improves activation by +8 to +12 percentage points','BREAKEVEN: to hit GOOD (median <=3 days), need at least 50% of signups reaching aha within 3 days','MILESTONE: focus on reducing p50 first (widest impact), then p90 (long-tail friction)','TIP: Faster TTV = higher activation = higher retention. Pair with the Activation Rate and Customer Health Score (P9) calculators.']; }";

const engine: ToolEngine = {
  slug: 'solopreneur-time-to-value-calculator',
  title: 'Time-to-Value (TTV)',
  description:
    'Compute the median (p50) and p90 days from signup to key action (aha-moment). The PM metric for diagnosing onboarding speed. INVERSE health bands - lower is better: green <=1 day · yellow 1-3 days · orange 3-7 days · red >7 days. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  categoryId: 'P',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'median_days', label: 'Median TTV in days (p50)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'p90_days',    label: 'p90 TTV in days (long tail)', placeholder: 'e.g. 5', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs) {
    const p50 = clampNonNegative(Number(inputs['median_days']));
    let p90 = clampNonNegative(Number(inputs['p90_days']));
    if (p50 < 0 || p90 < 0) return ['Days must be >= 0.'];
    if (p90 < p50) p90 = p50;
    const band = calcHealthBand(p50);
    const bandInfo = HEALTH_BANDS[band];
    const gap = p90 - p50;
    return [
      'Time-to-Value: ' + bandInfo.label + ' (median ' + fmtDays(p50) + ', p90 ' + fmtDays(p90) + ')',
      'Snapshot: 50% of users reach the aha-moment in ' + fmtDays(p50) + '. 90% do within ' + fmtDays(p90) + '. Long-tail gap: ' + gap.toFixed(1) + ' days.',
      'What-If: cutting the first milestone by 1 day typically improves activation rate by +8 to +12 percentage points (each day saved = more users reach aha within window)',
      'Break-Even: to hit Good (median <=3 days), focus the onboarding flow on the single most important first action; remove any steps that delay aha beyond day 3',
      'Milestone: reduce p50 first (widest impact across users), then close the long-tail gap by tackling p90-causing frictions (e.g. complex initial setup)',
      'Tip: Faster TTV = higher activation = higher retention. Pair with the Activation Rate Calculator and Customer Health Score (P9 batch).',
    ];
  },
  staticExamples: [
    'Time-to-Value: 🟡 Good (median 2.0 days, p90 5.0 days)\nSnapshot: 50% of users reach the aha-moment in 2.0 days. 90% do within 5.0 days. Long-tail gap: 3.0 days.\nWhat-If: cutting the first milestone by 1 day typically improves activation rate by +8 to +12 percentage points (each day saved = more users reach aha within window)\nBreak-Even: to hit Good (median <=3 days), focus the onboarding flow on the single most important first action; remove any steps that delay aha beyond day 3\nMilestone: reduce p50 first (widest impact across users), then close the long-tail gap by tackling p90-causing frictions (e.g. complex initial setup)\nTip: Faster TTV = higher activation = higher retention. Pair with the Activation Rate Calculator and Customer Health Score (P9 batch).',
  ],
  faq: [
    { q: 'What is TTV (Time-to-Value)?', a: 'The time from signup (or first session) to the moment the user reaches their first "aha" - the action that correlates with retention. Lower = better.' },
    { q: 'What does p50 / p90 mean?', a: 'p50 = median, half of users reach aha within this many days. p90 = 90% of users reach aha within this many days. The gap reveals long-tail friction.' },
    { q: 'Why is the band INVERSE (lower = better)?', a: 'Because lower TTV is universally better for retention. Unlike NRR / Adoption where higher = better, TTV follows the opposite direction. Bands: green <=1d · yellow 1-3d · orange 3-7d · red >7d.' },
    { q: 'What is a "good" TTV?', a: 'Intercom benchmarks: B2B SaaS should aim for p50 <= 3 days. Consumer / mobile should aim for same-session (p50 <= 1 hour). World-class: p50 <= 1 hour for PLG products.' },
    { q: 'How is TTV different from Time-to-First-Action?', a: 'TTFA = first click/key event (low bar). TTV = the moment user perceives value (high bar, correlates with retention). Optimize TTV, not TTFA.' },
    { q: 'What if p90 < p50 in inputs?', a: 'Indicates a data error (p90 should always be >= p50). The engine clamps p90 to p50 to prevent artifact-based misreporting.' },
  ],
  howToUse: [
    'Define your aha-moment (same as Activation Rate calc).',
    'Pull the per-user TTV for the period from your analytics tool - Mixpanel/Amplitude Cohorts report the median and p90 by cohort.',
    'Enter the p50 (median) and p90 days. Band reflects p50 - the average user experience.',
    'Look at the gap between p50 and p90 to identify long-tail friction (users who never quite get there).',
    'Optimize p50 first for widest impact; then close the p90 gap.',
  ],
  sources: [
    'https://www.intercom.com/blog/onboarding-benchmarks/',
    'https://buffer.com/resources/time-to-value',
    'https://www.lennysnewsletter.com/p/onboarding',
  ],
};

registerEngine(engine);
