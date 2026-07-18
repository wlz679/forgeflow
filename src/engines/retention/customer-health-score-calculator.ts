// =====================================================================
// Customer Health Score Calculator (P9-5) — Business v3 standard
// =====================================================================
//
// Composite customer health score (0-100) from 5 weighted signals.
// The early warning system for at-risk accounts. 4 weight presets let CSMs
// tune the model to their motion: Product-led / Service-led / Sales-led / Balanced.
//
//   score = Σ normalize(signal[i]) × weight[i]   for i in 5 signals
//
// Health bands (score 0-100):
//   🟢 ≥ 80 — excellent, healthy; expand motion
//   🟡 60–80 — good, monitor; engagement check
//   🟠 40–60 — warning, at risk; save play needed
//   🔴 < 40 — critical, emergency intervention

import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: [80, Infinity],
  good: [60, 80],
  warning: [40, 60],
  critical: [0, 40],
} as const;

export const PRESETS = {
  balanced:     [0.20, 0.20, 0.20, 0.20, 0.20],
  'product-led': [0.50, 0.15, 0.10, 0.15, 0.10],
  'service-led': [0.10, 0.20, 0.35, 0.25, 0.10],
  'sales-led':   [0.15, 0.25, 0.10, 0.10, 0.40],
} as const;

export function normalize(signalName: string, value: number): number {
  if (signalName === 'nps') return (value + 100) / 2;
  if (signalName === 'supportTickets') return 100 - Math.min(value * 4, 100);
  return value;
}

export function healthScore(
  productUsage: number, nps: number, supportTickets: number, engagement: number, contractValue: number, preset: string,
): number {
  const signalNames = ['productUsage', 'nps', 'supportTickets', 'engagement', 'contractValue'];
  const rawSignals = [productUsage, nps, supportTickets, engagement, contractValue];
  const normalized = rawSignals.map((v, i) => normalize(signalNames[i], v));
  const weights = PRESETS[preset as keyof typeof PRESETS] || PRESETS.balanced;
  return normalized.reduce((sum, sig, i) => sum + sig * weights[i], 0);
}

export function calcHealthBand(score: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (score >= HEALTH_BANDS.excellent[0]) return 'excellent';
  if (score >= HEALTH_BANDS.good[0]) return 'good';
  if (score >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

function calculate(inputs: Record<string, string>): string[] {
  const productUsage = clampNonNegative(Math.min(100, parseFloat(inputs.productUsage) || 0));
  const nps = Math.max(-100, Math.min(100, parseFloat(inputs.nps) || 0));
  const supportTickets = clampNonNegative(parseFloat(inputs.supportTickets) || 0);
  const engagement = clampNonNegative(Math.min(100, parseFloat(inputs.engagement) || 0));
  const contractValue = clampNonNegative(Math.min(100, parseFloat(inputs.contractValue) || 0));
  const preset = (inputs.weightPreset || 'balanced') as keyof typeof PRESETS;

  if (productUsage === 0 && nps === 0 && supportTickets === 0 && engagement === 0 && contractValue === 0) {
    return [
      '📊 Customer Health Score Calculator\n\n📊 Enter your 5 customer health signals (product usage, NPS, support tickets, engagement, contract value) and select a weight preset to see your composite score (0-100).',
    ];
  }

  const signalNames = ['productUsage', 'nps', 'supportTickets', 'engagement', 'contractValue'];
  const rawSignals = [productUsage, nps, supportTickets, engagement, contractValue];
  const normalized = rawSignals.map((v, i) => normalize(signalNames[i], v));
  const weights = PRESETS[preset] || PRESETS.balanced;
  const score = healthScore(productUsage, nps, supportTickets, engagement, contractValue, preset);
  const pct1 = (n: number) => n.toFixed(1);

  const band = calcHealthBand(score);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — Score ≥ 80; healthy account, expand motion'
      : band === 'good'
      ? 'Good — Score 60–80; monitor closely, engagement check'
      : band === 'warning'
      ? 'Warning — Score 40–60; at risk, save play needed'
      : 'Critical — Score < 40; emergency intervention required';

  const scoreNPS70 = healthScore(productUsage, 70, supportTickets, engagement, contractValue, preset);
  const scorePU90 = healthScore(90, nps, supportTickets, engagement, contractValue, preset);
  const scoreST2 = healthScore(productUsage, nps, 2, engagement, contractValue, preset);
  const liftNPS = scoreNPS70 - score;
  const liftPU = scorePU90 - score;
  const liftST = scoreST2 - score;

  const gapToExcellent = Math.max(0, 80 - score);
  const targetProductUsage = Math.min(100, productUsage + gapToExcellent / weights[0]);

  let gapToNext: number, nextTier: string;
  if (band === 'critical') { gapToNext = 40 - score; nextTier = '🟠 Warning 40'; }
  else if (band === 'warning') { gapToNext = 60 - score; nextTier = '🟡 Good 60'; }
  else if (band === 'good') { gapToNext = 80 - score; nextTier = '🟢 Excellent 80'; }
  else { gapToNext = 0; nextTier = 'top tier maintained'; }

  let tip: string;
  if (band === 'critical') tip = 'Score under 40 is critical regardless of preset. Emergency save play: executive sponsor pairing, dedicated CSM, usage audit.';
  else if (band === 'warning') tip = preset === 'service-led' ? 'Service-led: focus on closing open tickets and reducing response time.' : preset === 'product-led' ? 'Product-led: focus on adoption depth via power users.' : preset === 'sales-led' ? 'Sales-led: schedule exec business review to align on renewal.' : 'Balanced: audit all 5 signals and identify the lowest normalized score.';
  else if (band === 'good') tip = preset === 'service-led' ? 'Good score. Maintain ticket response quality; do not let support slip.' : preset === 'product-led' ? 'Good score. Push to Excellent via adoption depth; identify expansion-ready users.' : preset === 'sales-led' ? 'Good score. Schedule exec review to align on expansion and renewal.' : 'Good balanced score. Push to Excellent by improving the lowest normalized signal.';
  else tip = preset === 'service-led' ? 'Excellent score. Maintain service quality; review quarterly.' : preset === 'product-led' ? 'Excellent score. Identify expansion-ready users for upsell motion.' : preset === 'sales-led' ? 'Excellent score. Lock in renewal with multi-year contract discussion.' : 'Excellent balanced score. Maintain the engine: monitor usage trends and protect champion relationships.';

  const r =
  '📊 Customer Health Score Calculator\n\n' +
  '🩺 Health:\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  '• ' + healthEmoji + ' ' + healthLabel + '\n' +
  '• Health Score: ' + pct1(score) + ' / 100  ·  Preset: ' + preset + '\n' +
  '• Sub-scores: Product ' + pct1(normalized[0]) + ' · NPS ' + pct1(normalized[1]) + ' · Support ' + pct1(normalized[2]) + ' · Engagement ' + pct1(normalized[3]) + ' · Contract ' + pct1(normalized[4]) + '\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  '📊 Inputs Snapshot:\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  '• Product Usage:    ' + productUsage + ' → ' + pct1(normalized[0]) + ' normalized\n' +
  '• NPS:              ' + nps + ' → ' + pct1(normalized[1]) + ' normalized\n' +
  '• Support Tickets:  ' + supportTickets + ' → ' + pct1(normalized[2]) + ' normalized\n' +
  '• Engagement:       ' + engagement + ' → ' + pct1(normalized[3]) + ' normalized\n' +
  '• Contract Value:   ' + contractValue + ' → ' + pct1(normalized[4]) + ' normalized\n' +
  '• Weights: Product ' + Math.round(weights[0]*100) + '% · NPS ' + Math.round(weights[1]*100) + '% · Support ' + Math.round(weights[2]*100) + '% · Engagement ' + Math.round(weights[3]*100) + '% · Contract ' + Math.round(weights[4]*100) + '%\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  '🔄 What-If:\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  '• NPS 40→70: Score ' + pct1(scoreNPS70) + ' (+' + pct1(liftNPS) + ')\n' +
  '• Product Usage 75→90: Score ' + pct1(scorePU90) + ' (+' + pct1(liftPU) + ')\n' +
  '• Support Tickets 5→2: Score ' + pct1(scoreST2) + ' (+' + pct1(liftST) + ')\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  '⚖️ Break-Even:\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  '• Target for 🟢 Excellent: Score ≥ 80\n' +
  '• Current score: ' + pct1(score) + '  ·  Gap to 🟢: ' + pct1(gapToExcellent) + ' points\n' +
  '• Action: raise Product Usage to ' + Math.round(targetProductUsage) + ' OR improve any other signal by ' + pct1(gapToExcellent) + ' normalized points\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  '🎯 Milestone:\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
  '• Next tier: ' + nextTier + '\n' +
  '• Gap to next tier: ' + pct1(Math.max(0, gapToNext)) + ' points' + (band === 'excellent' ? ' already at top' : '') + '\n\n' +
  '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
  '💡 Tip: ' + tip + '\n';

  return [r];
}

const customFn =
  "function nrm(s,v){if(s==='nps')return (v+100)/2;if(s==='supportTickets')return 100-Math.min(v*4,100);return v;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var pu=cnn(Math.min(100,parseFloat(inputs.productUsage)||0));" +
  "var n=Math.max(-100,Math.min(100,parseFloat(inputs.nps)||0));" +
  "var st=cnn(parseFloat(inputs.supportTickets)||0);" +
  "var en=cnn(Math.min(100,parseFloat(inputs.engagement)||0));" +
  "var cv=cnn(Math.min(100,parseFloat(inputs.contractValue)||0));" +
  "var ps=inputs.weightPreset||'balanced';" +
  "var wt=ps==='product-led'?[0.50,0.15,0.10,0.15,0.10]:ps==='service-led'?[0.10,0.20,0.35,0.25,0.10]:ps==='sales-led'?[0.15,0.25,0.10,0.10,0.40]:[0.20,0.20,0.20,0.20,0.20];" +
  "var sgs=[nrm('productUsage',pu),nrm('nps',n),nrm('supportTickets',st),nrm('engagement',en),nrm('contractValue',cv)];" +
  "var sc=sgs.reduce(function(a,b,i){return a+b*wt[i];},0);" +
  "return [sc];";

const engine: ToolEngine = {
  slug: 'solopreneur-customer-health-score-calculator',
  title: 'Customer Health Score Calculator',
  description:
    'Compute composite customer health score 0-100 from 5 weighted signals: product usage, NPS, support tickets, engagement, contract value. 4 weight presets: balanced, product-led, service-led, sales-led. Health bands: 🟢 ≥80 · 🟡 60-80 · 🟠 40-60 · 🔴 <40. For mid-market B2B SaaS (0M-0M ARR) CSMs and RevOps leads.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'productUsage', label: 'Product usage score 0-100', placeholder: 'e.g. 75', type: 'number' },
    { name: 'nps', label: 'NPS -100 to +100', placeholder: 'e.g. 40', type: 'number' },
    { name: 'supportTickets', label: 'Support tickets last 90 days', placeholder: 'e.g. 5', type: 'number' },
    { name: 'engagement', label: 'Engagement score 0-100', placeholder: 'e.g. 80', type: 'number' },
    { name: 'contractValue', label: 'Contract value score 0-100', placeholder: 'e.g. 60', type: 'number' },
    { name: 'weightPreset', label: 'Weight preset', type: 'select', options: [ { value: 'balanced', label: 'Balanced' }, { value: 'product-led', label: 'Product-led' }, { value: 'service-led', label: 'Service-led' }, { value: 'sales-led', label: 'Sales-led' } ], default: 'balanced' },
  ],
  keywords: ['customer health score', 'health score calculator', 'CSM score', 'account health', 'product usage', 'NPS', 'support tickets', 'engagement', 'contract value', 'B2B SaaS'],
  tags: ['retention', 'csm', 'health-score', 'saas-metrics'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-09',
  sources: [
    'https://www.gainsight.com/blog/customer-health-score/',
    'https://www.churnzero.com/customer-health-score/',
  ],
  staticExamples: ['📊 Customer Health Score Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — Score 60–80; monitor closely, engagement check\n• Health Score: 73.0 / 100  ·  Preset: balanced\n• Sub-scores: Product 75.0 · NPS 70.0 · Support 80.0 · Engagement 80.0 · Contract 60.0\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Product Usage:    75 → 75.0 normalized\n• NPS:              40 → 70.0 normalized\n• Support Tickets:  5 → 80.0 normalized\n• Engagement:       80 → 80.0 normalized\n• Contract Value:   60 → 60.0 normalized\n• Weights: Product 20% · NPS 20% · Support 20% · Engagement 20% · Contract 20%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• NPS 40→70: Score 76.0 (+3.0)\n• Product Usage 75→90: Score 76.0 (+3.0)\n• Support Tickets 5→2: Score 75.4 (+2.4)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target for 🟢 Excellent: Score ≥ 80\n• Current score: 73.0  ·  Gap to 🟢: 7.0 points\n• Action: raise Product Usage to 100 OR improve any other signal by 7.0 normalized points\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Next tier: 🟢 Excellent 80\n• Gap to next tier: 7.0 points\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Good balanced score. Push to Excellent by improving the lowest normalized signal.\n'],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  faq: [
    { q: 'What is a customer health score?', a: 'A composite score 0-100 computed from multiple signals (product usage, NPS, support tickets, engagement, contract value) that predicts account health. The early warning system for at-risk accounts.' },
    { q: 'How do the weight presets differ?', a: 'Balanced 20% each. Product-led weights usage 50%. Service-led weights support 35%. Sales-led weights contract value 40%. Pick the preset that matches your GTM motion — product-led for PLG, sales-led for enterprise.' },
    { q: 'How are signals normalized?', a: 'productUsage, engagement, contractValue pass through 0-100. NPS -100 to +100 maps to 0-100 via (nps+100)/2. Support tickets are inverted: 0 tickets = 100, 25+ tickets = 0 (saturation).' },
    { q: 'What is a good health score?', a: 'Top-quartile B2B SaaS achieves ≥80. 60-80 is healthy mid-market. 40-60 is at-risk — needs save play. Below 40 is critical — emergency intervention.' },
    { q: 'How often should I compute health scores?', a: 'Real-time or daily for operational alerts. Weekly for CSM planning. Monthly for executive reporting. Pair with a quarterly cohort analysis to identify systemic issues vs account-specific.' },
  ],
  howToUse: [
    'Enter the 5 customer health signals: Product Usage (0-100), NPS (-100 to +100), Support Tickets (last 90 days), Engagement (0-100), Contract Value (0-100).',
    'Select a Weight Preset that matches your GTM motion (Balanced is the default).',
    'Read the composite Health Score 0-100 and Health band. Sub-scores are shown normalized so you can identify the lowest signal for intervention.',
  ],
  engineKey: true,
};

registerEngine(engine);
