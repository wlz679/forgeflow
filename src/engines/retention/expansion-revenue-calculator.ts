// =====================================================================
// Expansion Revenue Calculator (P9-3) — Business v3 standard
// =====================================================================
//
// Expansion revenue as % of starting MRR — the top-line growth lever from
// existing customers. Separates upsell (same product, more usage) from
// cross-sell (new product). High expansion enables NRR > 100% even when
// GRR is mediocre.
//
//   expansionMRR = upsellMRR + crossSellMRR
//   expansionPct = expansionMRR / startingMRR       (ratio, e.g. 0.17)
//
// Health bands (expansionPct as ratio; displayed as 17% / 22% / 28%):
//   🟢 ≥ 0.25 — excellent, best-in-class mid-market expansion motion
//   🟡 0.15–0.25 — good, top-quartile mid-market
//   🟠 0.05–0.15 — warning, motion exists but underweight
//   🔴 < 0.05 — critical, no expansion motion; pure retention play

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: [0.25, Infinity],
  good: [0.15, 0.25],
  warning: [0.05, 0.15],
  critical: [0, 0.05],
} as const;

export function expansionMRR(u: number, c: number): number {
  return u + c;
}

export function expansionPct(s: number, u: number, c: number): number {
  if (s === 0) return 0;
  return expansionMRR(u, c) / s;
}

export function calcHealthBand(v: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (v >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (v >= HEALTH_BANDS.good[0]) return 'good';
  if (v >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

function calculate(inputs: Record<string, string>): string[] {
  const startingMRR = clampNonNegative(parseFloat(inputs.startingMRR) || 0);
  const upsellMRR = clampNonNegative(parseFloat(inputs.upsellMRR) || 0);
  const crossSellMRR = clampNonNegative(parseFloat(inputs.crossSellMRR) || 0);

  if (startingMRR === 0 && upsellMRR === 0 && crossSellMRR === 0) {
    return [
      '📊 Expansion Revenue Calculator\n\n📊 Enter starting MRR, upsell MRR, and cross-sell MRR to see your expansion revenue percentage — the top-line growth lever from existing customers.',
    ];
  }

  const totalExpansion = expansionMRR(upsellMRR, crossSellMRR);
  const ratio = expansionPct(startingMRR, upsellMRR, crossSellMRR);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pctInt = (n: number) => Math.round(n * 100).toString();
  const pct1 = (n: number) => n.toFixed(1);

  const band = calcHealthBand(ratio);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — Expansion ≥ 25%; best-in-class mid-market expansion motion'
      : band === 'good'
      ? 'Good — Expansion 15–25%; top-quartile mid-market expansion'
      : band === 'warning'
      ? 'Warning — Expansion 5–15%; motion exists but underweight'
      : 'Critical — Expansion < 5%; no expansion motion, pure retention play';

  // What-If: what if we doubled upsell, or added cross-sell, or both?
  const expDoubleUpsell = expansionPct(startingMRR, upsellMRR * 2, crossSellMRR);
  const expDoubleBoth = expansionPct(startingMRR, upsellMRR * 2, crossSellMRR * 2);
  const expPureCrossSell = expansionPct(startingMRR, 0, crossSellMRR);
  const liftDU = expDoubleUpsell - ratio;
  const liftDB = expDoubleBoth - ratio;

  // Break-Even: gap to Excellent (≥0.25)
  const targetExpansion = 0.25 * startingMRR;
  const gapToExcellent = Math.max(0, targetExpansion - totalExpansion);

  // Milestone: gap to next tier
  let gapToNext: number, nextTier: string;
  if (band === 'critical') { gapToNext = 0.05 * startingMRR - totalExpansion; nextTier = '🟠 Warning (5%)'; }
  else if (band === 'warning') { gapToNext = 0.15 * startingMRR - totalExpansion; nextTier = '🟡 Good (15%)'; }
  else if (band === 'good') { gapToNext = 0.25 * startingMRR - totalExpansion; nextTier = '🟢 Excellent (25%)'; }
  else { gapToNext = 0; nextTier = 'top tier maintained'; }

  // Tip: band-driven
  let tip: string;
  if (band === 'critical') tip = 'Expansion < 5% means you are not growing revenue from existing customers — pure retention play. Identify accounts getting high value but underpaying; build a price-increase motion on the top decile. Add cross-sell on accounts already using 1 product.';
  else if (band === 'warning') tip = 'Expansion 5–15% is motion but underweight. Audit which accounts expanded and what triggered it — replicate the playbook. Common levers: seat expansion on growing teams, tier upgrades after usage threshold, cross-sell on product-fit accounts.';
  else if (band === 'good') tip = 'Expansion 15–25% is healthy mid-market motion. Push to Excellent (≥25%) by focusing on the top 20% of accounts — a 10% price increase on high-value accounts often moves expansion more than broad-stroke campaigns.';
  else tip = 'Expansion ≥ 25% is best-in-class. Maintain the engine: monitor usage trends, identify expansion-ready accounts quarterly, and protect champion relationships. Pair with NRR (P9-1) to confirm expansion is offsetting churn.';

  const r =
    '📊 Expansion Revenue Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Expansion: ' + pctInt(ratio) + '% of starting MRR  ·  Total expansion: ' + money(totalExpansion) + '\n' +
    '• Upsell: ' + money(upsellMRR) + '  ·  Cross-sell: ' + money(crossSellMRR) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Starting MRR: ' + money(startingMRR) + '\n' +
    '• Upsell MRR (more usage): +' + money(upsellMRR) + '\n' +
    '• Cross-sell MRR (new product): +' + money(crossSellMRR) + '\n' +
    '• Total Expansion MRR: ' + money(totalExpansion) + '\n' +
    '• Expansion %: ' + ratio.toFixed(4) + ' (' + pctInt(ratio) + '%) of starting MRR\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Double upsell (+' + money(upsellMRR) + ' → +' + money(upsellMRR * 2) + '): Expansion ' + pctInt(expDoubleUpsell) + '% (+' + pct1(liftDU * 100) + 'pp)\n' +
    '• Double both (upsell + cross-sell): Expansion ' + pctInt(expDoubleBoth) + '% (+' + pct1(liftDB * 100) + 'pp)\n' +
    '• Pure cross-sell (no upsell): Expansion ' + pctInt(expPureCrossSell) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target for 🟢 Excellent: Expansion ≥ 25% (expansion MRR ≥ ' + money(targetExpansion) + ')\n' +
    '• Current expansion: ' + money(totalExpansion) + '  ·  Gap to 🟢: ' + money(gapToExcellent) + '\n' +
    '• Action: add ' + money(gapToExcellent) + ' in expansion MRR (upsell + cross-sell)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Next tier: ' + nextTier + '\n' +
    '• Gap to next tier: ' + money(Math.max(0, gapToNext)) + ' more expansion MRR' + (band === 'excellent' ? ' (already at top)' : '') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minimal live calc) ==============

const customFn =
  "function exp(u,c){return u+c;}" +
  "function pct(s,u,c){if(s===0)return 0;return exp(u,c)/s;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "return [pct(cnn(parseFloat(inputs.startingMRR)||0),cnn(parseFloat(inputs.upsellMRR)||0),cnn(parseFloat(inputs.crossSellMRR)||0))];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-expansion-revenue-calculator',
  title: 'Expansion Revenue Calculator',
  description:
    'Compute expansion revenue as % of starting MRR — the top-line growth lever from existing customers. Separates upsell (same product, more usage) from cross-sell (new product). Health bands: 🟢 ≥25% · 🟡 15-25% · 🟠 5-15% · 🔴 <5%. For mid-market B2B SaaS ($10M-$50M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'startingMRR',   label: 'Starting MRR (USD)',        placeholder: 'e.g. 100000', type: 'number' },
    { name: 'upsellMRR',     label: 'Upsell MRR (more usage)',  placeholder: 'e.g. 12000',  type: 'number' },
    { name: 'crossSellMRR',  label: 'Cross-sell MRR (new product)', placeholder: 'e.g. 5000',   type: 'number' },
  ],
  keywords: [
    'expansion revenue calculator',
    'expansion MRR',
    'upsell',
    'cross-sell',
    'net expansion',
    'B2B SaaS',
    'mid-market SaaS',
    'growth lever',
  ],
  tags: ['retention', 'csm', 'expansion', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
    'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
  ],
  staticExamples: ['📊 Expansion Revenue Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — Expansion 15–25%; top-quartile mid-market expansion\n• Expansion: 17% of starting MRR  ·  Total expansion: $17,000\n• Upsell: $12,000  ·  Cross-sell: $5,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starting MRR: $100,000\n• Upsell MRR (more usage): +$12,000\n• Cross-sell MRR (new product): +$5,000\n• Total Expansion MRR: $17,000\n• Expansion %: 0.1700 (17%) of starting MRR\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Double upsell (+$12,000 → +$24,000): Expansion 29% (+12.0pp)\n• Double both (upsell + cross-sell): Expansion 34% (+17.0pp)\n• Pure cross-sell (no upsell): Expansion 5%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: Expansion ≥ 25% (expansion MRR ≥ $25,000)\n• Current expansion: $17,000  ·  Gap to 🟢: $8,000\n• Action: add $8,000 in expansion MRR (upsell + cross-sell)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent (25%)\n• Gap to next tier: $8,000 more expansion MRR\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Expansion 15–25% is healthy mid-market motion. Push to Excellent (≥25%) by focusing on the top 20% of accounts — a 10% price increase on high-value accounts often moves expansion more than broad-stroke campaigns.\n'],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  faq: [
    { q: 'What is expansion revenue?', a: 'Expansion revenue is the additional MRR you generate from existing customers — either upsell (same product, more usage/seats) or cross-sell (new product from your portfolio). It is the top-line growth lever that enables NRR > 100% even when GRR is mediocre.' },
    { q: 'What is a good expansion rate?', a: 'Top-quartile B2B SaaS achieves 15-25% expansion (OpenView/ICONIQ benchmarks for $10M-$50M ARR). Below 5% means no expansion motion — pure retention play. Above 25% is best-in-class mid-market motion.' },
    { q: 'How is expansion different from NRR?', a: 'Expansion is one component of NRR. NRR = (starting + expansion - downgrade - churn) / starting. Expansion only includes growth (upsell + cross-sell); NRR includes the full retention picture. High expansion + mediocre GRR can still produce strong NRR.' },
    { q: 'How do I grow expansion revenue?', a: 'Three levers: (1) seat expansion on growing teams (usage-based pricing), (2) tier upgrades after usage threshold (freemium → pro → enterprise), (3) cross-sell on product-fit accounts. Audit the top 20% of accounts by usage — they are expansion-ready and often underpriced.' },
    { q: 'How is upsell different from cross-sell?', a: 'Upsell is selling more of the same product (more seats, higher tier, more usage). Cross-sell is selling additional products from your portfolio. Upsell is usually higher-margin and easier to close; cross-sell requires product-fit alignment. The ratio between them varies by GTM motion.' },
  ],
  howToUse: [
    'Enter Starting MRR (revenue from existing customers at the start of the period).',
    'Enter Upsell MRR (same product, more usage/seats/tier during the period).',
    'Enter Cross-sell MRR (additional products sold to existing customers).',
    'Read the expansion percentage and Health band. Pair with NRR (P9-1) to see the full retention picture.',
  ],
};

registerEngine(engine);
