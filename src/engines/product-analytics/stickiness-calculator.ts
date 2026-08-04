// P10-4 Stickiness (DAU/MAU)
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Mixpanel 2024 Product Benchmarks + Lenny's Newsletter PM Survey).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.20, label: '🟢 Excellent', message: 'Social-app tier stickiness - users return daily. World-class.' },
  good:      { threshold: 0.13, label: '🟡 Good',      message: 'High-engagement SaaS - users return ~4 days/week. Strong product-market fit.' },
  warning:   { threshold: 0.05, label: '🟠 Warning',   message: 'SaaS median - users return ~1.5 days/week. Below this signals churn risk.' },
  critical:  { threshold: 0,    label: '🔴 Critical',  message: 'Low engagement - users rarely return. Investigate onboarding + value delivery.' },
};

export function stickiness(dau: number, mau: number): number {
  if (mau <= 0) return 0;
  if (dau >= mau) return 1.0;
  return dau / mau;
}

export function calcHealthBand(rate: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (rate >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (rate >= HEALTH_BANDS.good.threshold) return 'good';
  if (rate >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }
function fmtInt(n: number): string { return Math.round(n).toLocaleString(); }

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn = "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) { var dau = cnn(Number(inputs['DAU'])); var mau = cnn(Number(inputs['MAU'])); if (mau <= 0) return ['MAU must be > 0.']; if (dau > mau) dau = mau; var s = dau / mau; var band = s >= 0.20 ? 'Excellent' : s >= 0.13 ? 'Good' : s >= 0.05 ? 'Warning' : 'Critical'; var emoji = s >= 0.20 ? 'GREEN' : s >= 0.13 ? 'YELLOW' : s >= 0.05 ? 'ORANGE' : 'RED'; var daysPerWeek = (s * 7).toFixed(1); var targetDAU = Math.ceil(mau * 0.13); return ['STICKINESS ' + emoji + ' ' + band + ' (' + (s*100).toFixed(1) + '% - users return ~' + daysPerWeek + ' days/week)','SNAPSHOT: ' + fmtInt(dau) + ' of ' + fmtInt(mau) + ' MAU users are daily-active. ' + fmtInt(mau - dau) + ' MAU users are not active today.','WHATIF: if you retain +5% more MAU as DAU (e.g. via push notifications), stickiness rises to ' + ((dau + (mau-dau)*0.05) / mau * 100).toFixed(1) + '%','BREAKEVEN: to hit GOOD (13% stickiness), need DAU of at least ' + targetDAU.toLocaleString() + ' (currently ' + fmtInt(dau) + ')','MILESTONE: stickiness rarely moves without improving onboarding or core-loop frequency - target +5pp over next 60 days via notifications and re-engagement','TIP: Stickiness is the leading indicator of churn - pair with the GRR Calculator (P9) to confirm.']; function fmtInt(n) { return Math.round(n).toLocaleString(); } }";

const engine: ToolEngine = {
  slug: 'solopreneur-stickiness-calculator',
  title: 'Stickiness (DAU/MAU)',
  description:
    'Compute stickiness as DAU/MAU ratio - the PM metric for measuring how often monthly users return daily. Social-app tier is 20%+, high-engagement SaaS is 13-20%, SaaS median ~5%. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  categoryId: 'P',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'DAU', label: 'Daily Active Users (today)', placeholder: 'e.g. 650', type: 'number' },
    { name: 'MAU', label: 'Monthly Active Users (30 days)', placeholder: 'e.g. 5000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs) {
    let dau = clampNonNegative(Number(inputs['DAU']));
    const mau = clampNonNegative(Number(inputs['MAU']));
    if (mau <= 0) return ['MAU must be > 0.'];
    if (dau > mau) dau = mau;
    const s = stickiness(dau, mau);
    const band = calcHealthBand(s);
    const bandInfo = HEALTH_BANDS[band];
    const daysPerWeek = (s * 7).toFixed(1);
    const targetDAU = Math.ceil(mau * HEALTH_BANDS.good.threshold);
    const lifted = dau + (mau - dau) * 0.05;
    return [
      'Stickiness: ' + bandInfo.label + ' (' + fmtPct(s) + ' — users return ~' + daysPerWeek + ' days/week)',
      'Snapshot: ' + fmtInt(dau) + ' of ' + fmtInt(mau) + ' MAU users are daily-active. ' + fmtInt(mau - dau) + ' MAU users are not active today.',
      'What-If: if you retain +5% of non-daily MAU as daily (via push/email/re-engagement), stickiness rises to ' + fmtPct(lifted / mau),
      'Break-Even: to hit Good (' + fmtPct(HEALTH_BANDS.good.threshold) + ' stickiness), need DAU of at least ' + targetDAU.toLocaleString() + ' (currently ' + fmtInt(dau) + ')',
      'Milestone: stickiness rarely moves without improving onboarding or core-loop frequency. Target +5pp over the next 60 days via notifications and re-engagement campaigns.',
      'Tip: Stickiness is the leading indicator of churn — pair with the GRR Calculator (P9 retention batch) to confirm the relationship in your data.',
    ];
  },
  staticExamples: [
    'Stickiness: 🟡 Good (13.0% — users return ~0.9 days/week)\nSnapshot: 650 of 5,000 MAU users are daily-active. 4,350 MAU users are not active today.\nWhat-If: if you retain +5% of non-daily MAU as daily (via push/email/re-engagement), stickiness rises to 17.3%\nBreak-Even: to hit Good (13.0% stickiness), need DAU of at least 650 (currently 650)\nMilestone: stickiness rarely moves without improving onboarding or core-loop frequency. Target +5pp over the next 60 days via notifications and re-engagement campaigns.\nTip: Stickiness is the leading indicator of churn — pair with the GRR Calculator (P9 retention batch) to confirm the relationship in your data.',
  ],
  faq: [
    { q: 'Why is 13% the bar for Good?', a: 'Mixpanel 2024 Product Benchmarks: high-engagement B2B SaaS achieves 13-20% DAU/MAU. 20%+ is social-app tier (Slack, Discord). 5% is SaaS median. Below 5% is "users opened it once" tier.' },
    { q: 'How does stickiness differ from retention?', a: 'Retention = month-over-month cohort survival. Stickiness = within-month frequency (how many days each month did you use it). Both matter; stickiness is leading indicator.' },
    { q: 'What is the "days per week" output?', a: 'stickiness * 7 = approximate number of days/week each MAU user is active. 13% stickiness = ~0.9 days/week (most users come ~once). 20% = ~1.4 days/week.' },
    { q: 'Is DAU/MAU better than DAU/WAU?', a: 'DAU/WAU shows weekly-active users among weekly set (different framing). Stickiness uses DAU/MAU because MAU is the canonical reach metric.' },
    { q: 'When should I measure stickiness?', a: 'Weekly for fast-moving products (track delta). Monthly for stable products. Pair with cohort retention (P6) to see WHICH user segment is non-sticky.' },
    { q: 'How is DAU computed for B2B (multi-user accounts)?', a: 'Depends on whether DAU = "users active" or "accounts with any activity". The most defensible: each seat-user active = 1 DAU. Document your definition.' },
    { q: "What is stickiness ratio?", a: "Stickiness = DAU / MAU. % of monthly users active daily. Benchmarks: 1) 20% is good, 2) 30%+ is excellent, 3) 50%+ is \"social media\" tier. Examples: Facebook 50%, Twitter 25%, SaaS 10-20%, mobile games 30-50%. Calculated: DAU (daily active users) divided by MAU (monthly active users). Higher = users return more often. Most products: 15-25% is good." },
    { q: "How do I improve stickiness?", a: "Top tactics: 1) Daily content/value (news, social, deals), 2) Push notifications (engagement reminders), 3) Email digests (daily/weekly), 4) Habit loops (streaks, rewards), 5) Reduce friction (1-tap return), 6) Personalization (relevant content). Most teams: 5-10% stickiness improvement in 3-6 months. Best: combination of habit + notification. Trade-off: don't over-notify (unsubscribes)." },
    { q: "What is the difference between DAU, WAU, MAU?", a: "DAU: daily active users. WAU: weekly active. MAU: monthly active. DAU/MAU = stickiness. WAU/MAU = weekly stickiness (typically 50-70%). DAU/MAU = daily stickiness (typically 15-30%). Track all three. DAU = daily habit. WAU = regular use. MAU = monthly presence. Different products optimize for different metrics." },
    { q: "What is a good DAU/MAU ratio for SaaS?", a: "Benchmarks: 1) Productivity tools: 10-20% (e.g., Slack, Notion), 2) Communication: 30-50% (e.g., email, chat), 3) Social: 50%+ (e.g., Facebook, Instagram), 4) Games: 30-50%, 5) E-commerce: 5-10% (low). For B2B SaaS: 15-25% is good. 30%+ excellent. For consumer: 20-40%. DAU/MAU is a key engagement metric. Track weekly." },
    { q: "How is stickiness different from retention?", a: "Stickiness: % of users active daily. Retention: % of users still active after N days. Stickiness is current (today). Retention is past (cohorts). High stickiness + low retention: many users but they churn. High stickiness + high retention: sticky AND retained (best). Low stickiness + high retention: many users but don't come back daily. Track both. Stickiness = current health, retention = long-term." },
    { q: "What is the impact of push notifications on stickiness?", a: "Push notifications: 1) Increase DAU by 10-30%, 2) Increase stickiness by 5-15%, 3) Risk: opt-outs. Opt-out rate: 5-20% per month without relevance. Best option: 1-3 notifications/day, 2) Personalized timing, 3) Value-driven content, 4) Easy opt-out. Most teams 20-50% stickiness lift with good push. Avoid notification fatigue (too many = churn)." },
    { q: "How do I track stickiness by user segment?", a: "Track DAU/MAU by: 1) Acquisition channel (referral = high, paid = low), 2) Plan tier (enterprise = high, free = low), 3) Tenure (new = low, mature = high), 4) Geography, 5) Demographics. Use: identify high-value segments. Power users: 50-80% stickiness. New users: 5-15%. Activate new users = big stickiness lift. Customize by segment." },
    { q: "Should I optimize for stickiness or growth?", a: "Both. Growth gets users in the door. Stickiness keeps them. Optimize: 1) Growth for first 6-12 months, 2) Stickiness after, 3) Both long-term. Healthy products: growing + sticky. Stagnant: no new users. High churn: growing but losing. Track: DAU/MAU trend over time. Most teams: stickiness lift = 2-3x LTV. Don't sacrifice stickiness for growth metrics." },
  ],
  howToUse: [
    'Pull DAU count for the most recent day (or 7-day average for stability).',
    'Pull MAU count for the last 30 days.',
    'Read the band: green/yellow/orange/red indicates return-frequency.',
    'Days-per-week column reveals the average user behavior (e.g. 0.9 = users open ~once a week).',
    'Combine with Cohort Retention (P6) to identify WHICH user segment is non-sticky.',
  ],
  sources: [
    'https://mixpanel.com/blog/2024-product-benchmarks/',
    'https://www.lennysnewsletter.com/p/dau-mau-stickiness',
    'https://amplitude.com/blog/calculate-stickiness',
  ],
  engineKey: true,
};

registerEngine(engine);
