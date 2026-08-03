// P10-6 Power User Pareto Curve
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Andrew Chen "The Cold Start Problem" + Pareto 70/20 anchor).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 3.5, label: '🟢 Excellent', message: 'Strong power-user concentration — top users drive disproportionate usage.' },
  good:      { threshold: 3.0, label: '🟡 Good',      message: 'Healthy Pareto distribution; power users exist and are visible.' },
  warning:   { threshold: 2.5, label: '🟠 Warning',   message: 'Diffuse usage — no strong power-user tier emerging.' },
  critical:  { threshold: 0,   label: '🔴 Critical',  message: 'Very even distribution — usage spread across all users, no power-user leverage.' },
};

export function paretoRatio(topShare: number, topPct: number): number {
  if (topPct <= 0 || topPct > 100) return 0;
  const capped = Math.min(topShare, 100);
  return capped / topPct;
}

export function calcHealthBand(ratio: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (ratio >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (ratio >= HEALTH_BANDS.good.threshold) return 'good';
  if (ratio >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtRatio(r: number): string {
  return r.toFixed(2) + 'x';
}

// customFn: minimal live calc. Prepend cnn alias to defensively clamp inputs to [0, ∞).
const customFn = "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) { var p = cnn(Number(inputs['top_pct'])); var s = cnn(Number(inputs['top_pct_usage_share'])); if (p <= 0 || p > 100) return ['Top percent must be 1-100.']; if (s > 100) s = 100; var ratio = s / p; var band = ratio >= 3.5 ? 'Excellent' : ratio >= 3.0 ? 'Good' : ratio >= 2.5 ? 'Warning' : 'Critical'; var emoji = ratio >= 3.5 ? 'GREEN' : ratio >= 3.0 ? 'YELLOW' : ratio >= 2.5 ? 'ORANGE' : 'RED'; var l10 = Math.min(100, s + (100-s)*0.10); var targetShare = (p * 3.0).toFixed(1); return ['POWER USER ' + emoji + ' ' + band + ' (' + ratio.toFixed(2) + 'x ratio; ' + s.toFixed(1) + '/' + p + ')','SNAPSHOT: top ' + p.toFixed(1) + '% of users drive ' + s.toFixed(1) + '% of total usage. The remaining ' + (100 - p).toFixed(1) + '% of users account for ' + (100-s).toFixed(1) + '% of usage','WHATIF: if 10% of mid-tier users upgrade their engagement to power-user level, ratio lifts to ' + (l10/p).toFixed(2) + 'x','BREAKEVEN: to hit GOOD (3.0x ratio), need top ' + p.toFixed(1) + '% users driving at least ' + targetShare + '% of usage (currently ' + s.toFixed(1) + '%)','MILESTONE: power-user programs (VIP support / beta features) amplify existing concentration by +5-15 percentage points in usage share','TIP: Power users are the seed for referrals - pair with the NRR Calculator (P9).']; }";

const engine: ToolEngine = {
  slug: 'solopreneur-power-user-curve-calculator',
  title: 'Power User Pareto Curve',
  description:
    'Compute the Pareto ratio of power-user concentration: top X% of users driving Y% of total usage. Canonical 70/20 = 3.5x. Higher = more concentrated (more leverage for power-user programs). For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  categoryId: 'P',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'top_pct',             label: 'Top % of users by activity',          placeholder: 'e.g. 20', type: 'number' },
    { name: 'top_pct_usage_share', label: '% of total usage from those users',   placeholder: 'e.g. 70', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs) {
    const topPct = clampNonNegative(Number(inputs['top_pct']));
    let topShare = clampNonNegative(Number(inputs['top_pct_usage_share']));
    if (topPct <= 0 || topPct > 100) return ['Top percent must be 1-100.'];
    if (topShare > 100) topShare = 100;
    const ratio = paretoRatio(topShare, topPct);
    const band = calcHealthBand(ratio);
    const bandInfo = HEALTH_BANDS[band];
    const l10share = Math.min(100, topShare + (100 - topShare) * 0.10);
    const targetShare = (topPct * HEALTH_BANDS.good.threshold).toFixed(1);
    return [
      'Power User Concentration: ' + bandInfo.label + ' (' + fmtRatio(ratio) + ' ratio — ' + topShare.toFixed(1) + '/' + topPct.toFixed(1) + ')',
      'Snapshot: top ' + topPct.toFixed(1) + '% of users drive ' + topShare.toFixed(1) + '% of total usage. The remaining ' + (100 - topPct).toFixed(1) + '% of users account for ' + (100 - topShare).toFixed(1) + '% of usage.',
      'What-If: if 10% of mid-tier users upgrade their engagement to power-user level, share rises to ' + l10share.toFixed(1) + '% (ratio lifts to ' + fmtRatio(l10share / topPct) + ')',
      'Break-Even: to hit Good (' + fmtRatio(HEALTH_BANDS.good.threshold) + ' ratio), need top ' + topPct.toFixed(1) + '% users driving at least ' + targetShare + '% of usage (currently ' + topShare.toFixed(1) + '%)',
      'Milestone: power-user programs (VIP support, beta features, dedicated CSM) can amplify existing concentration by +5-15 percentage points in usage share within 1 quarter',
      'Tip: Power users are the seed for referrals and product feedback. Pair with the NRR Calculator (P9 batch) to project revenue impact.',
    ];
  },
  staticExamples: [
    'Power User Concentration: 🟢 Excellent (3.50x ratio — 70.0/20.0)\nSnapshot: top 20.0% of users drive 70.0% of total usage. The remaining 80.0% of users account for 30.0% of usage.\nWhat-If: if 10% of mid-tier users upgrade their engagement to power-user level, share rises to 73.0% (ratio lifts to 3.65x)\nBreak-Even: to hit Good (3.00x ratio), need top 20.0% users driving at least 60.0% of usage (currently 70.0%)\nMilestone: power-user programs (VIP support, beta features, dedicated CSM) can amplify existing concentration by +5-15 percentage points in usage share within 1 quarter\nTip: Power users are the seed for referrals and product feedback. Pair with the NRR Calculator (P9 batch) to project revenue impact.',
  ],
  faq: [
    { q: 'What is Pareto ratio?', a: 'The ratio of usage share to user share. 70/20 = 3.5 means top 20% of users generate 3.5x their proportional share of usage (70% / 20% = 3.5). Higher = more concentrated.' },
    { q: 'Why is 70/20 the canonical anchor?', a: 'Andrew Chen "The Cold Start Problem" cites 70/20 as a common Pareto for many consumer + SaaS products. Strong PMFs often approach 80/20 or 90/10 (top 10% driving 80%+ usage).' },
    { q: 'How is this different from feature adoption?', a: 'Feature adoption = % of users using Feature X. Power User Curve = concentration of OVERALL usage across all users. A 25% adoption feature may have very high power-user concentration (90/10).' },
    { q: 'How do I compute this from analytics?', a: 'Sort users by total activity (events, sessions, minutes). Take top X% by total activity. Sum their usage share. The Pareto ratio = usage_share / top_pct * 100.' },
    { q: 'What is a "good" ratio for B2B SaaS?', a: 'Andrew Chen + Lenny surveys: 70/20 (3.5x) is solid. World-class power-user programs push toward 80/10-15 (5.3x-8x). Below 50/20 (2.5x) is diffuse — no clear power users.' },
    { q: 'What if my ratio is <2.5x?', a: 'Either (a) the product is too "horizontal" (every user uses equally), or (b) the analytics are wrong (mixing power-tier and standard-tier in same cohort). Diagnose via cohort breakdown first.' },
    { q: "What is a power user curve?", a: "Power user curve = distribution of users by activity level. Often follows power law / Pareto: 20% of users = 80% of activity. Identify power users: top 10% by engagement. Compare their behavior to average. Power users: 5-10x more active, longer retention, higher LTV. Use: 1) Find what makes them successful, 2) Replicate in onboarding, 3) Reward with premium features." },
    { q: "How do I identify power users?", a: "Method 1: Top 10% by engagement score. Method 2: Specific behaviors (e.g., 3+ sessions/week, 5+ features used). Method 3: Specific actions (e.g., invited 5+ users, used 30+ times). Power users: typically 5-10% of total user base. Look for: 1) High frequency, 2) Feature breadth, 3) Long tenure. Compare behavior to average. Most: define based on business outcomes." },
    { q: "How do I use power user insights to grow?", a: "Process: 1) Identify power users, 2) Profile them (demographics, behavior, motivations), 3) Survey them (why they love the product), 4) Find patterns, 5) Replicate in onboarding (default settings, suggested features), 6) Build features they ask for. Most teams: 30-50% activation lift. Power users are 5-10% of base, generate 30-50% of revenue. Don't ignore." },
    { q: "What is the difference between power users and whale users?", a: "Power user: high engagement (active, frequent). Whale user: high revenue (spends a lot). They overlap but are different. Examples: Slack power user = 50 messages/day. Whale = 100-seat enterprise customer. Optimize for: power users (engagement drives LTV) + whales (revenue). For SaaS: power user = high retention. For gaming: whale = high spend. Both valuable." },
    { q: "What is the 1-9-90 rule?", a: "1-9-90: 1% of users create content, 9% engage with it, 90% consume. Common in social/marketplaces. Examples: Reddit, Twitter, YouTube. For most products: similar distribution. Strategy: 1) Reward creators (the 1%), 2) Support engagers (the 9%), 3) Optimize for consumers (the 90%). Don't build for all equally. Power users = creators. Most revenue from engaged users." },
    { q: "How does power user curve affect retention strategy?", a: "Power users drive long-term retention. Average user: 30-50% retention at month 6. Power users: 70-90%. Strategy: 1) Identify early (within 30 days), 2) Reward (loyalty program, premium tier), 3) Engage (personalized comms), 4) Listen to feedback. Cost: lower churn, higher LTV. Most teams: 5-10x LTV lift for power users. Don't treat all users the same." },
    { q: "Should I have a separate experience for power users?", a: "Yes, for top 5-10%. Options: 1) Premium tier (advanced features), 2) Beta access (early features), 3) Community access (peer support), 4) Direct support channel, 5) Loyalty rewards. Cost: minimal, revenue: 5-20% of total. Most teams: power users pay 2-3x more (premium tier). Make it a no-brainer: 10x more value, 2x more cost. Power users self-select." },
    { q: "How do I convert regular users to power users?", a: "Tactics: 1) Onboarding modeled on power user behavior, 2) Progressive disclosure (advanced features appear as user progresses), 3) Suggestions (\"users like you also use X\"), 4) Gamification (badges, streaks), 5) Re-engagement (when usage drops), 6) Community (peer learning). Most teams: 5-15% conversion to power user in 6-12 months. Long-term: builds community and word-of-mouth." },
  ],
  howToUse: [
    'Decide the top-X% threshold (usually 20%, sometimes 10% or 5% for power-user concentration).',
    'Pull your user-activity metric (DAU events, sessions, minutes, etc.) from analytics.',
    'Sort users by total activity. Sum the top-X% usage as % of total usage.',
    'Enter top_pct and top_pct_usage_share. The engine computes ratio + band.',
    'If ratio is low (<2.5x), diagnose: is it diffuse usage, or are you mixing cohorts?',
  ],
  sources: [
    'https://andrewchen.co/the-cold-start-problem/',
    'https://www.lennysnewsletter.com/p/power-users',
    'https://a16z.com/power-user-curve/',
  ],
  engineKey: true,
};

registerEngine(engine);
