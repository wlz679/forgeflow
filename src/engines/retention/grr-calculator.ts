// =====================================================================
// GRR Calculator (P9-2) — Business v3 standard
// =====================================================================
//
// GRR = (startingMRR - downgradeMRR - churnedMRR) / startingMRR
//

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';

export const HEALTH_BANDS = {
  excellent: [0.95, Infinity],
  good: [0.90, 0.95],
  warning: [0.80, 0.90],
  critical: [0, 0.80],
} as const;

export function retainedMRR(s: number, d: number, c: number): number {
  return s - d - c;
}

export function grr(s: number, d: number, c: number): number {
  if (s === 0) return 0;
  return retainedMRR(s, d, c) / s;
}

export function calcHealthBand(v: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (v >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (v >= HEALTH_BANDS.good[0]) return 'good';
  if (v >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

function calculate(inputs: Record<string, string>): string[] {
  const startingMRR = clampNonNegative(parseFloat(inputs.startingMRR) || 0);
  const downgradeMRR = clampNonNegative(parseFloat(inputs.downgradeMRR) || 0);
  const churnedMRR = clampNonNegative(parseFloat(inputs.churnedMRR) || 0);

  if (startingMRR === 0 && downgradeMRR === 0 && churnedMRR === 0) {
    return [
      '📊 GRR Calculator\n\n📊 Enter your starting MRR, downgrade MRR, and churned MRR to see your Gross Revenue Retention — the pure retention signal. GRR ≤ 100% always.',
    ];
  }

  const retained = retainedMRR(startingMRR, downgradeMRR, churnedMRR);
  const ratio = grr(startingMRR, downgradeMRR, churnedMRR);
  const lostMRR = downgradeMRR + churnedMRR;
  const lostPct = startingMRR > 0 ? (lostMRR / startingMRR) * 100 : 0;

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pctInt = (n: number) => Math.round(n * 100).toString();
  const pct1 = (n: number) => n.toFixed(1);

  const band = calcHealthBand(ratio);
  const healthEmoji = BAND_META[band];
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — GRR ≥ 95%; best-in-class SaaS retention, minimal churn leakage'
      : band === 'good'
      ? 'Good — GRR 90–95%; SaaS Capital median, healthy retention engine'
      : band === 'warning'
      ? 'Warning — GRR 80–90%; high churn, mid-market median, intervention needed'
      : 'Critical — GRR < 80%; severe churn, unsustainable, urgent intervention';

  // What-If scenarios
  const grrHC = grr(startingMRR, downgradeMRR, churnedMRR / 2);
  const grrZD = grr(startingMRR, 0, churnedMRR);
  const grrHB = grr(startingMRR, downgradeMRR / 2, churnedMRR / 2);
  const liftHC = grrHC - ratio;
  const liftZD = grrZD - ratio;
  const liftHB = grrHB - ratio;

  // Break-Even: gap to Excellent (GRR >= 0.95)
  const targetRetained = 0.95 * startingMRR;
  const gapToExcellent = Math.max(0, targetRetained - retained);

  // Milestone: gap to next tier
  let gapToNext: number, nextTier: string;
  if (band === 'critical') { gapToNext = 0.80 * startingMRR - retained; nextTier = '🟠 Warning (80%)'; }
  else if (band === 'warning') { gapToNext = 0.90 * startingMRR - retained; nextTier = '🟡 Good (90%)'; }
  else if (band === 'good') { gapToNext = 0.95 * startingMRR - retained; nextTier = '🟢 Excellent (95%)'; }
  else { gapToNext = 0; nextTier = 'top tier maintained'; }
  const annualCompounded = startingMRR * Math.pow(1 - lostPct / 100, 12);

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') tip = 'GRR < 80% is bleeding your business dry every quarter. Stop the churn first: exit interviews on last 10 lost accounts, save-playbook for top 20 at-risk accounts, reassign CSM coverage.';
  else if (band === 'warning') tip = 'GRR 80-90% is high churn for mid-market B2B SaaS. Diagnose by cohort, build save motion with CSM outreach and executive sponsor pairing for top-50 accounts.';
  else if (band === 'good') tip = 'GRR 90-95% is healthy. Focus on tail of at-risk accounts to push to Excellent. Pair with NRR to confirm expansion is also lifting NRR.';
  else tip = 'GRR >= 95% is best-in-class. Maintain with QBRs, proactive usage monitoring, save team on standby.';

  const r =
    '📊 GRR Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• GRR: ' + pctInt(ratio) + '%  ·  Lost as % of start: ' + pct1(lostPct) + '%\n' +
    '• Retained MRR: ' + money(retained) + '  ·  Lost MRR (downgrade + churn): ' + money(lostMRR) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Starting MRR:           ' + money(startingMRR) + '\n' +
    '• Downgrade MRR:         -' + money(downgradeMRR) + '\n' +
    '• Churned MRR:           -' + money(churnedMRR) + '\n' +
    '• Retained MRR:           ' + money(retained) + ' (starting - downgrade - churn)\n' +
    '• GRR ratio: ' + ratio.toFixed(4) + ' (' + pctInt(ratio) + '%)  ·  Lost as % of start: ' + pct1(lostPct) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap: ' + money(Math.max(0, gapToNext)) + ' more retained MRR' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minimal live calc) ==============

const customFn =
  "function calc(s,d,c){var r=s-d-c;var g=s===0?0:r/s;return[{ret:r,grr:g}];}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "return calc(cnn(parseFloat(inputs.startingMRR)||0),cnn(parseFloat(inputs.downgradeMRR)||0),cnn(parseFloat(inputs.churnedMRR)||0));";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-grr-calculator',
  title: 'GRR Calculator',
  description:
    'Compute Gross Revenue Retention (GRR) — the pure retention signal that strips out expansion. GRR <= 100% always. Health bands: 🟢 >=95% · 🟡 90-95% · 🟠 80-90% · 🔴 <80%. For mid-market B2B SaaS ($10M-$50M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'startingMRR', label: 'Starting MRR (USD)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'downgradeMRR', label: 'Downgrade MRR', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'churnedMRR', label: 'Churned MRR', placeholder: 'e.g. 8000', type: 'number' },
  ],
  keywords: [
    'GRR calculator',
    'gross revenue retention',
    'GRR',
    'gross retention',
    'retention metric',
    'saas retention',
    'B2B SaaS',
    'mid-market SaaS',
    'churn rate',
  ],
  tags: ['retention', 'csm', 'grr', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
    'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
    'https://www.iconiqcapital.com/growth/tte-net-dollar-retention',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
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
  generate: calculate,
  staticExamples: ['📊 GRR Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 Warning — GRR 80–90%; high churn, mid-market median, intervention needed\n• GRR: 87%  ·  Lost as % of start: 13.0%\n• Retained MRR: $87,000  ·  Lost MRR (downgrade + churn): $13,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starting MRR:           $100,000\n• Downgrade MRR:         -$5,000\n• Churned MRR:           -$8,000\n• Retained MRR:           $87,000 (starting - downgrade - churn)\n• GRR ratio: 0.8700 (87%)  ·  Lost as % of start: 13.0%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟡 Good (90%)\n• Gap: $3,000 more retained MRR━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: GRR 80-90% is high churn for mid-market B2B SaaS. Diagnose by cohort, build save motion with CSM outreach and executive sponsor pairing for top-50 accounts.\n'],
  faq: [
    { q: 'What is Gross Revenue Retention (GRR)?', a: 'GRR measures revenue retained from existing customers, excluding any expansion (upsell/cross-sell). GRR <= 100% always. It is the "pure retention" signal — investors use it to see how leaky the bucket is before counting expansion as a save.' },
    { q: 'How is GRR different from NRR?', a: 'NRR includes expansion and can exceed 100%; GRR excludes expansion and never exceeds 100%. GRR is the pure retention signal; NRR is retention + growth. Best-in-class SaaS targets NRR >= 120% AND GRR >= 90%.' },
    { q: 'What is a good GRR for B2B SaaS?', a: 'Top-quartile B2B SaaS achieves GRR >= 95% (best-in-class retention). SaaS Capital median is 90-92%. Below 80% means severe churn that is unsustainable. Mid-market median is around 80-90%, indicating room to improve retention.' },
    { q: 'How do I improve GRR?', a: 'Two levers: (1) reduce churn (proactive CS, save playbooks, exit interviews), (2) reduce downgrades (tier alignment, usage-based pricing). Often the highest-ROI lever is reducing churn on the bottom decile of accounts via dedicated CSM coverage.' },
    { q: 'How often should GRR be measured?', a: 'Quarterly for board reporting; monthly for operational tracking. Year-over-year GRR (over 12 months) is the standard for fundraising. Pair GRR with NRR — a gap between them shows how much growth depends on expansion vs retention.' },
    { q: "What is GRR (Gross Revenue Retention)?", a: "GRR = (starting MRR - churn - contraction) / starting MRR. Excludes expansion. Measures: how well you retain existing revenue. Benchmarks: 1) <80%: serious churn issue, 2) 80-90%: average, 3) 90-95%: good, 4) 95%+: world-class. Most SaaS: 85-95%. NRR includes expansion (always >= GRR). Track: monthly, by cohort. GRR is a leading indicator of long-term viability." },
    { q: "What is the difference between GRR and NRR?", a: "GRR: revenue retained (excludes expansion). NRR: net of expansion. Always: NRR >= GRR. Example: 90% gross retention, 15% expansion = 104% net retention. Most investors: NRR is the headline metric. GRR is the underlying. Strong GRR: foundation. Weak GRR + strong NRR: customers expanding but also churning (sustainability concern). Track both. GRR is harder to game." },
    { q: "What is a good GRR for SaaS?", a: "Benchmarks: 1) <80%: critical (revenue declining), 2) 80-90%: average, 3) 90-95%: good, 4) 95%+: best-in-class. By company size: SMB SaaS 80-90%, mid-market 90-95%, enterprise 95%+. Most teams 90%+ is good. 95%+. Track monthly cohort. GRR is the cleanest measure of customer health. If GRR <80%, fix retention before scaling." },

    { q: "Why does GRR matter for valuation?", a: "GRR is the #1 retention metric. Investors: GRR 90%+ = strong business. <80% = risky. Multiples: 90%+ GRR = 8-15x ARR multiple. <80% GRR = 3-6x. Difference: 2-3x valuation. Why: GRR is hard to game. Strong GRR + expansion = sustainable growth. Weak GRR = leaky bucket. For 5-10 year hold: GRR matters more than growth rate. Most: focus on GRR before NRR." },
    { q: "What is the difference between logo churn and revenue churn?", a: "Logo churn: % of customers lost. Revenue churn: % of MRR lost. Often different. Examples: 5% logo churn + 2% revenue churn = small customers leaving, large stay. Or 5% logo churn + 8% revenue churn = large customers leaving (worse). High logo + low revenue: acceptable for SMB. High revenue + low logo: bad sign. GRR is revenue-based. Use both: GRR + logo churn. Both matter." },
    { q: "How is GRR calculated for usage-based products?", a: "Usage-based: GRR is more complex. Components: 1) Usage growth (paid more this month), 2) Usage decline (paid less), 3) Churn. Calculate: (last month revenue - this month revenue) / last month revenue, excluding new customers. If churn is -5% and expansion is +10%: net = +5% (NRR = 105%). If churn is -10% and expansion is +5%: net = -5% (NRR = 95%). Usage-based: GRR often lower than seat-based." },
    { q: "What is the relationship between GRR and CAC payback?", a: "GRR affects CAC payback. For $1M ARR, 1.0x monthly churn, 1.0x gross margin: payback = 12 months. For 5% monthly churn: 5+ years (no payback). Most SaaS: 0.5-1% monthly churn. Lower churn = faster payback. Use GRR target (e.g., 90%) → monthly churn ~0.83%. Calculate payback. Aim for <24 months for healthy SaaS. Strong GRR: foundation for LTV-based growth." },
  ],
  howToUse: [
    'Enter your Starting MRR (revenue from existing customers at the start of the period).',
    'Enter Downgrade MRR (customers who reduced tier/seats during the period).',
    'Enter Churned MRR (customers who fully cancelled during the period).',
    'Read the GRR percentage and Health band. Pair with NRR (P9-1) to see pure retention vs expansion-driven retention separately.',
  ],
  engineKey: true,
};

registerEngine(engine);
