// P12-4 CSAT (Customer Satisfaction)
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (CustomerGauge 2024 + Gainsight CS Benchmarks + Zendesk CX 2024).
// 95% CI margin of error formula: z=1.96, p*(1-p)/n.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 90, label: '🟢 Excellent', message: 'World-class CSAT — customers consistently rate interactions positively.' },
  good:      { threshold: 80, label: '🟡 Good',      message: 'Healthy CSAT — typical mid-market SaaS benchmark (80-90%).' },
  warning:   { threshold: 70, label: '🟠 Warning',   message: 'Below-market CSAT — investigate common friction points (FRT, resolution time).' },
  critical:  { threshold: -Infinity, label: '🔴 Critical', message: 'Severe CSAT problem — escalation to Head-of-CS and product investigation required.' },
};

export type HealthBandKey = keyof typeof HEALTH_BANDS;

export function marginOfError(csatPct: number, sampleSize: number): number {
  if (sampleSize <= 0) return Infinity;
  const p = csatPct / 100;
  return 1.96 * Math.sqrt((p * (1 - p)) / sampleSize) * 100;
}

export function confidenceInterval(csatPct: number, sampleSize: number): { low: number; high: number } {
  const m = marginOfError(csatPct, sampleSize);
  return { low: csatPct - m, high: csatPct + m };
}

export function gapToTarget(csatPct: number, targetPct: number): number {
  return csatPct - targetPct;
}

export function calcHealthBand(pct: number): HealthBandKey {
  if (pct >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (pct >= HEALTH_BANDS.good.threshold) return 'good';
  if (pct >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return x.toFixed(1) + '%'; }
function fmtPp(x: number): string { return (x >= 0 ? '+' : '') + x.toFixed(1) + 'pp'; }
function fmtMoney(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-csat-calculator',
  title: 'CSAT (Customer Satisfaction) Calculator',
  description:
    'Measure CSAT (customer satisfaction) with 95% confidence interval margin of error. HIGHER health bands — better satisfaction = better retention: 🟢 ≥90% · 🟡 80-90% · 🟠 70-80% · 🔴 <70%. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-CS.',
  inputs: [
    { name: 'csat_pct',      label: 'CSAT score (%)',            placeholder: 'e.g. 87',  type: 'number' },
    { name: 'response_rate', label: 'Survey response rate (%)',  placeholder: 'e.g. 35',  type: 'number' },
    { name: 'sample_size',   label: 'Total responses collected', placeholder: 'e.g. 200', type: 'number' },
    { name: 'target_csat',   label: 'Internal CSAT target (%)',  placeholder: 'e.g. 90',  type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {\n  var csat = cnn(Number(inputs.csat_pct) || 0);\n  var rr = cnn(Number(inputs.response_rate) || 0);\n  var n = cnn(Number(inputs.sample_size) || 0);\n  var tgt = cnn(Number(inputs.target_csat) || 0);\n  var m = n > 0 ? 1.96 * Math.sqrt((csat/100) * (1 - csat/100) / n) * 100 : 0;\n  var ciLow = csat - m;\n  var ciHigh = csat + m;\n  var gap = tgt - csat;\n  var band = csat >= 90 ? 'Excellent' : csat >= 80 ? 'Good' : csat >= 70 ? 'Warning' : 'Critical';\n  var emoji = csat >= 90 ? '🟢' : csat >= 80 ? '🟡' : csat >= 70 ? '🟠' : '🔴';\n  var ifCsat = Math.min(100, csat + 3);\n  var ifBand = ifCsat >= 90 ? 'Excellent' : ifCsat >= 80 ? 'Good' : ifCsat >= 70 ? 'Warning' : 'Critical';\n  var ifEmoji = ifCsat >= 90 ? '🟢' : ifCsat >= 80 ? '🟡' : ifCsat >= 70 ? '🟠' : '🔴';\n  var ifM = n > 0 ? 1.96 * Math.sqrt((ifCsat/100) * (1 - ifCsat/100) / n) * 100 : 0;\n  var rrWarning = rr < 20 ? ' · ⚠️ Response rate <20% = biased sample' : '';\n  return [\n    '🩺 CSAT Health: ' + emoji + ' ' + band + ' (' + csat.toFixed(1) + '% CSAT · ' + m.toFixed(1) + 'pp margin · ' + rr.toFixed(1) + '% response rate)',\n    '📊 Snapshot: ' + n.toLocaleString() + ' responses · 95% CI [' + ciLow.toFixed(1) + '%, ' + ciHigh.toFixed(1) + '%] · target ' + tgt.toFixed(1) + '% · gap ' + (gap >= 0 ? '+' : '') + gap.toFixed(1) + 'pp' + rrWarning,\n    '🔄 What-If: if CSAT climbs to ' + ifCsat.toFixed(1) + '% (+3pp), band moves to ' + ifEmoji + ' ' + ifBand + ' and margin tightens to ' + ifM.toFixed(1) + 'pp',\n    '⚖️ Break-Even: to hit 🟢 Excellent (≥90%), need ' + Math.max(0, 90 - csat).toFixed(1) + 'pp more — pair with [Resolution Time Calculator] (P12-3) since FRT + resolution drive CSAT',\n    '🎯 Milestone: CSAT is the leading indicator of NRR — track weekly; >5pp drop = escalate to Head-of-CS',\n    '💡 Tip: Response rate <20% = biased sample (only happy/angry respond); incentivize responses with post-resolution email + optional micro-survey.'\n  ];\n}",
  },
  generate(inputs) {
    const csat = clampNonNegative(Number(inputs.csat_pct) || 0);
    const rr = clampNonNegative(Number(inputs.response_rate) || 0);
    const n = clampNonNegative(Number(inputs.sample_size) || 0);
    const target = clampNonNegative(Number(inputs.target_csat) || 0);
    const m = marginOfError(csat, n);
    const ci = confidenceInterval(csat, n);
    const gap = gapToTarget(csat, target);
    const band = calcHealthBand(csat);
    const bandInfo = HEALTH_BANDS[band];
    const ifCsat = Math.min(100, csat + 3);
    const ifBand = calcHealthBand(ifCsat);
    const ifM = marginOfError(ifCsat, n);
    const gapSign = gap >= 0 ? '+' : '';
    const rrWarning = rr < 20 ? ' · ⚠️ Response rate <20% = biased sample' : '';
    return [
      '🩺 CSAT Health: ' + bandInfo.label + ' (' + fmtPct(csat) + ' CSAT · ' + m.toFixed(1) + 'pp margin · ' + fmtPct(rr) + ' response rate)',
      '📊 Snapshot: ' + fmtMoney(n) + ' responses · 95% CI [' + ci.low.toFixed(1) + '%, ' + ci.high.toFixed(1) + '%] · target ' + fmtPct(target) + ' · gap ' + gapSign + gap.toFixed(1) + 'pp' + rrWarning,
      '🔄 What-If: if CSAT climbs to ' + fmtPct(ifCsat) + ' (+3pp), band moves to ' + HEALTH_BANDS[ifBand].label + ' and margin tightens to ' + ifM.toFixed(1) + 'pp',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥90%), need ' + Math.max(0, 90 - csat).toFixed(1) + 'pp more — pair with [Resolution Time Calculator] (P12-3) since FRT + resolution drive CSAT',
      '🎯 Milestone: CSAT is the leading indicator of NRR — track weekly; >5pp drop = escalate to Head-of-CS',
      '💡 Tip: Response rate <20% = biased sample (only happy/angry respond); incentivize responses with post-resolution email + optional micro-survey.',
    ];
  },
  staticExamples: [
    '🩺 CSAT Health: 🟡 Good (87.0% CSAT · 4.7pp margin · 35.0% response rate)\n📊 Snapshot: 200 responses · 95% CI [82.3%, 91.7%] · target 90.0% · gap -3.0pp\n🔄 What-If: if CSAT climbs to 90.0% (+3pp), band moves to 🟢 Excellent and margin tightens to 4.2pp\n⚖️ Break-Even: to hit 🟢 Excellent (≥90%), need 3.0pp more — pair with [Resolution Time Calculator] (P12-3) since FRT + resolution drive CSAT\n🎯 Milestone: CSAT is the leading indicator of NRR — track weekly; >5pp drop = escalate to Head-of-CS\n💡 Tip: Response rate <20% = biased sample (only happy/angry respond); incentivize responses with post-resolution email + optional micro-survey.',
  ],
  faq: [
    { q: 'What is CSAT?', a: 'CSAT (Customer Satisfaction Score) is the percentage of customers who rate their support interaction positively (typically 4 or 5 on a 5-point scale). It is a per-interaction metric — distinct from NPS, which measures relationship.' },
    { q: 'What does the margin of error mean?', a: 'The 95% confidence interval (CI) shows the range your true CSAT likely falls within. At 87% CSAT with 200 responses, the margin is ~4.7pp — meaning the true value is between 82.3% and 91.7% with 95% confidence.' },
    { q: 'Why does response rate matter?', a: 'Below 20% response rate, the sample is biased — only the most satisfied OR most frustrated customers respond. A 90% CSAT at 10% response rate is misleading; aim for ≥30% response rate for a representative signal.' },
    { q: 'How does CSAT pair with FRT and resolution time?', a: 'CSAT is downstream — fast first response + fast resolution drive higher CSAT. Use P12-2 (FRT SLA) and P12-3 (resolution time) as leading indicators of CSAT drops.' },
    { q: 'What is a good CSAT for mid-market B2B SaaS?', a: '≥90% is world-class, 80-90% is typical mid-market, 70-80% is a warning, <70% is critical. CustomerGauge 2024 reports B2B SaaS median around 82%.' },
    { q: 'Should I track CSAT per tier?', a: 'Yes — T1/T2/T3 CSAT often diverge significantly. T3 (engineering) interactions usually have lower CSAT due to longer resolution times. Track per tier to identify specific improvement areas.' },
  ],
  howToUse: [
    'Enter CSAT score — % of positive ratings (typically 4-5 on 5-point scale).',
    'Enter survey response rate — % of customers who actually rated their interaction.',
    'Enter sample size — total ratings collected in this period.',
    'Enter internal CSAT target — your company benchmark for "good" CSAT.',
    'Read the health band + CI margin; if response rate is below 20%, treat the score as directional only.',
  ],
  sources: [
    'https://www.customergauge.com/blog/csat-benchmarks',
    'https://www.gainsight.com/blog/customer-success-benchmarks/',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.icmi.com/research/contact-center-performance',
  ],
};
registerEngine(engine);