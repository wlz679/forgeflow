// =====================================================================
// Logo Churn Rate Calculator (P9-4) — Business v3 standard
// =====================================================================
//
// Customer (logo) churn rate — count-based complement to GRR (revenue-
// based). Logo Churn counts lost customers; GRR counts lost revenue. They
// diverge when customers at different price tiers churn at different rates.
//
//   logoChurnPct    = lostCustomers / startCustomers       (ratio, e.g. 0.08)
//   retainedCustomers = startCustomers - lostCustomers
//
// Health bands (logoChurnPct as ratio; displayed as 8% / 12% / 25%) — INVERSE:
//   🟢 < 0.05 — excellent, best-in-class customer retention
//   🟡 0.05–0.10 — good, top-quartile mid-market
//   🟠 0.10–0.20 — warning, high logo churn, needs intervention
//   🔴 ≥ 0.20 — critical, severe; business model at risk

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: [0, 0.05],
  good: [0.05, 0.10],
  warning: [0.10, 0.20],
  critical: [0.20, Infinity],
} as const;

export function retainedCustomers(s: number, l: number): number {
  return s - l;
}

export function logoChurnPct(s: number, l: number): number {
  if (s === 0) return 0;
  return l / s;
}

export function calcHealthBand(v: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (v >= HEALTH_BANDS.critical[0]) return 'critical';
  if (v >= HEALTH_BANDS.warning[0]) return 'warning';
  if (v >= HEALTH_BANDS.good[0]) return 'good';
  return 'excellent';
}

function calculate(inputs: Record<string, string>): string[] {
  const startCustomers = clampNonNegative(parseFloat(inputs.startCustomers) || 0);
  const lostCustomers = clampNonNegative(parseFloat(inputs.lostCustomers) || 0);

  if (startCustomers === 0 && lostCustomers === 0) {
    return [
      '📊 Logo Churn Rate Calculator\n\n📊 Enter customers at period start and customers lost during period to see your logo churn rate — the count-based complement to GRR (revenue-based).',
    ];
  }

  const retained = retainedCustomers(startCustomers, lostCustomers);
  const ratio = logoChurnPct(startCustomers, lostCustomers);

  const pctInt = (n: number) => Math.round(n * 100).toString();
  const pct1 = (n: number) => n.toFixed(1);

  const band = calcHealthBand(ratio);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — Logo churn < 5%; best-in-class customer retention'
      : band === 'good'
      ? 'Good — Logo churn 5–10%; top-quartile mid-market retention'
      : band === 'warning'
      ? 'Warning — Logo churn 10–20%; high churn, intervention needed'
      : 'Critical — Logo churn ≥ 20%; severe churn, business model at risk';

  // What-If: reduce lost customers
  const churnHalveLoss = logoChurnPct(startCustomers, lostCustomers / 2);
  const churnZeroLoss = logoChurnPct(startCustomers, 0);
  const churnLose3 = logoChurnPct(startCustomers, 3);
  const liftHL = ratio - churnHalveLoss;
  const liftZL = ratio;
  const liftL3 = ratio - churnLose3;

  // Break-Even: gap to Excellent (<0.05)
  // Target lost = 0.05 × startCustomers; current = lost; gap = max(0, current - target)
  const targetLost = 0.05 * startCustomers;
  const gapToExcellent = Math.max(0, lostCustomers - targetLost);

  // Milestone: gap to next tier (from current band) — INVERSE direction
  let gapToNext: number, nextTier: string;
  if (band === 'critical') { gapToNext = lostCustomers - 0.20 * startCustomers; nextTier = '🟠 Warning (20%)'; }
  else if (band === 'warning') { gapToNext = lostCustomers - 0.10 * startCustomers; nextTier = '🟡 Good (10%)'; }
  else if (band === 'good') { gapToNext = lostCustomers - 0.05 * startCustomers; nextTier = '🟢 Excellent (5%)'; }
  else { gapToNext = 0; nextTier = 'top tier maintained'; }
  const annualCompounded = startCustomers * Math.pow(1 - ratio, 1);

  // Tip: band-driven
  let tip: string;
  if (band === 'critical') tip = 'Logo churn ≥ 20% means you are losing 1 in 5 customers per period. This is not a CS problem — it is a business model problem. Audit product-market fit, pricing, ICP definition. The cohort analysis question: which quarter’s logo class is churning fastest and why?';
  else if (band === 'warning') tip = 'Logo churn 10-20% is high for mid-market B2B SaaS. Diagnose by cohort, build save motion for top 20 at-risk accounts, and reassign CSM coverage. Often the highest-ROI lever is reducing churn on the bottom decile.';
  else if (band === 'good') tip = 'Logo churn 5-10% is healthy mid-market retention. To push to Excellent (<5%), focus on tail of at-risk accounts and tighten ICP — sometimes fewer customers with better fit is the move.';
  else tip = 'Logo churn < 5% is best-in-class. Maintain with QBRs, proactive usage monitoring, save team on standby. Pair with GRR (P9-2) to make sure revenue retention matches logo retention.';

  const r =
    '📊 Logo Churn Rate Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Logo churn: ' + pctInt(ratio) + '%  ·  Retained customers: ' + retained + '\n' +
    '• Lost customers: ' + lostCustomers + '  ·  Started with: ' + startCustomers + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Customers at period start: ' + startCustomers + '\n' +
    '• Customers lost:          -' + lostCustomers + '\n' +
    '• Retained customers:        ' + retained + '\n' +
    '• Logo churn %: ' + ratio.toFixed(4) + ' (' + pctInt(ratio) + '%)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Halve loss (' + (lostCustomers / 2) + ' instead of ' + lostCustomers + '): Churn ' + pctInt(churnHalveLoss) + '% (-' + pct1(liftHL * 100) + 'pp)\n' +
    '• Zero loss: Churn 0% (all ' + startCustomers + ' retained)\n' +
    '• Lose only 3: Churn ' + pctInt(churnLose3) + '% (-' + pct1(liftL3 * 100) + 'pp)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for 🟢 Excellent: Logo churn < 5% (max ' + Math.round(targetLost) + ' lost customers from ' + startCustomers + ')\n' +
    '• Current lost: ' + lostCustomers + '  ·  Gap to 🟢: ' + Math.round(gapToExcellent) + ' fewer customers lost\n' +
    '• Action: reduce lost customers by ' + Math.round(gapToExcellent) + ' (save play, ICP tightening, product-market fit)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + Math.round(Math.max(0, gapToNext)) + ' fewer customers lost' + (band === 'excellent' ? ' (already at top)' : '') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minimal live calc) ==============

const customFn =
  "function lc(s,l){if(s===0)return 0;return l/s;}" +
  "function rc(s,l){return s-l;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "return [lc(cnn(parseFloat(inputs.startCustomers)||0),cnn(parseFloat(inputs.lostCustomers)||0)),rc(cnn(parseFloat(inputs.startCustomers)||0),cnn(parseFloat(inputs.lostCustomers)||0))];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-logo-churn-rate-calculator',
  title: 'Logo Churn Rate Calculator',
  description:
    'Compute customer (logo) churn rate — count-based complement to GRR (revenue-based). Logo Churn counts lost customers; GRR counts lost revenue. Health bands: 🟢 <5% · 🟡 5-10% · 🟠 10-20% · 🔴 ≥20% (INVERSE). For mid-market B2B SaaS ($10M-$50M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'startCustomers', label: 'Customers at period start', placeholder: 'e.g. 100', type: 'number' },
    { name: 'lostCustomers', label: 'Customers lost during period', placeholder: 'e.g. 8', type: 'number' },
  ],
  keywords: [
    'logo churn rate calculator',
    'customer churn rate',
    'logo churn',
    'customer churn',
    'churn analysis',
    'B2B SaaS',
    'mid-market SaaS',
    'retention metric',
  ],
  tags: ['retention', 'csm', 'logo-churn', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
    'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
  ],
  staticExamples: ['📊 Logo Churn Rate Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — Logo churn 5–10%; top-quartile mid-market retention\n• Logo churn: 8%  ·  Retained customers: 92\n• Lost customers: 8  ·  Started with: 100\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Customers at period start: 100\n• Customers lost:          -8\n• Retained customers:        92\n• Logo churn %: 0.0800 (8%)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Halve loss (4 instead of 8): Churn 4% (-4.0pp)\n• Zero loss: Churn 0% (all 100 retained)\n• Lose only 3: Churn 3% (-5.0pp)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: Logo churn < 5% (max 5 lost customers from 100)\n• Current lost: 8  ·  Gap to 🟢: 3 fewer customers lost\n• Action: reduce lost customers by 3 (save play, ICP tightening, product-market fit)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent (5%)\n• Gap to next tier: 3 fewer customers lost\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Logo churn 5-10% is healthy mid-market retention. To push to Excellent (<5%), focus on tail of at-risk accounts and tighten ICP — sometimes fewer customers with better fit is the move.\n'],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  faq: [
    { q: 'What is logo churn rate?', a: 'Logo churn rate is the percentage of customers (logos) lost during a period, regardless of revenue. It is the count-based complement to GRR (revenue-based). Logo churn and GRR diverge when customers at different price tiers churn at different rates.' },
    { q: 'How is logo churn different from GRR?', a: 'Logo churn counts lost customers; GRR counts lost revenue. Example: losing 10 small customers (5% logo churn) might be 8% GRR if they were 8% of MRR. Logo churn is easier to track; GRR is what investors focus on. Pair them for full picture.' },
    { q: 'What is a good logo churn rate?', a: 'Top-quartile B2B SaaS achieves <5% annual logo churn. 5-10% is healthy mid-market. 10-20% is high and needs intervention. ≥20% is severe — usually a product-market fit or ICP problem, not a CS problem.' },
    { q: 'How do I reduce logo churn?', a: 'Three levers: (1) tighten ICP (fewer customers with better fit), (2) better onboarding (first 90 days set the tone), (3) proactive save motion on at-risk accounts (usage drop, NPS detractors, support tickets spiking). Often the highest-ROI lever is tightening ICP.' },
    { q: 'Should I track monthly or annual logo churn?', a: 'Annual is the standard for board reporting and fundraising. Monthly is for operational tracking but noisy — a single bad month can look like a crisis. For early-stage companies with <50 customers, quarterly is the sweet spot.' },

    { q: "What is the difference between logo churn and revenue churn?", a: "Logo churn: % of customers lost. Revenue churn: % of MRR lost. Examples: 5% logo churn + 2% revenue churn = small customers leaving, large stay. Or 5% logo churn + 8% revenue churn = large customers leaving. High logo + low revenue: OK for SMB. Low logo + high revenue: bad sign. Both matter. Track: total = logo_churn × avg_revenue. Or revenue-based: GRR." },
    { q: "What is a good logo churn rate for SaaS?", a: "Benchmarks: 1) Annual: <10% is excellent, 2) Monthly: 0.5-1% is good. By segment: 1) SMB SaaS: 3-5% monthly, 2) Mid-market: 1-2%, 3) Enterprise: 0.5-1%. By stage: 1) Pre-product-market fit: 10%+, 2) PMF: 3-5%, 3) Growth: 1-2%, 4) Scale: <1%. Most: 1-2% monthly is the target. Below 1%: excellent. Above 5%: critical." },

    { q: "What is voluntary vs involuntary churn?", a: "Voluntary: customer chose to leave (didn't see value, found alternative, etc.). Involuntary: payment failure (expired card, etc.). Voluntary: 70-90% of churn. Involuntary: 10-30%. Reduce voluntary: better product, support, CS. Reduce involuntary: 1) Smart retry logic, 2) Card updater, 3) Email reminders, 4) Backup payment. dunning: 5-15% revenue recovered. Most teams: optimize both." },
    { q: "How is logo churn measured?", a: "Logo churn = customers_lost / customers_at_start × 100. Track monthly, by cohort, by plan, by source. Voluntary + involuntary. Exclude: customers who upgraded (sometimes called \"negative churn\"). Tools: CRM (Salesforce), billing (Stripe), product (Mixpanel). track monthly and trailing 3-6 month average. Cohort view: more meaningful. Track cumulative churn by tenure." },
    { q: "What is the leading indicator of logo churn?", a: "1) Drop in product usage (40%+ drop in 30 days), 2) Drop in support engagement, 3) Negative NPS, 4) Key contact left company, 5) No usage in 30 days, 6) Support escalations, 7) No renewal meeting. Use 1) Health scoring, 2) Automated alerts, 3) CSM outreach. predict 30-60 days in advance. Best option: 90 days. Action: before renewal, not after." },
    { q: "How does logo churn affect valuation?", a: "Logo churn directly affects LTV and valuation. 1% monthly logo churn: ~12% annual, 50% by year 5. Investors: <10% annual logo churn = strong. >20% = risky. Most: 10-15% annual is the median. Valuation impact: 5 pp churn = 30-50% valuation difference. SaaS: investors prefer 1-2% monthly + high NRR. Aim: <15% annual. Strong logo retention: foundation for growth." },
    { q: 'How do I do cohort-based logo churn analysis?', a: 'Group customers by signup month (or signup quarter for low-volume businesses), then track cumulative logo loss per cohort across 12-24 months. A healthy pattern shows each newer cohort retaining better than the previous — proof that product improvements are landing. Cohort analysis catches issues that aggregate churn masks: Q3 signups may churn at 25% by month 6 while overall annual churn shows 12%. Use it to isolate acquisition-channel effects (a partner-driven cohort may churn faster because the leads are too early-stage) and product-pricing effects (a recent price hike often shows up as elevated month-1 churn specifically for new cohorts, before settling back to baseline).' },
  ],
  howToUse: [
    'Enter customers at period start (e.g., 100 active customers at the beginning of the year).',
    'Enter customers lost during the period (e.g., 8 customers who churned).',
    'Read the logo churn percentage and Health band. Pair with GRR (P9-2) to see logo vs revenue churn.',
  ],
  engineKey: true,
};

registerEngine(engine);
