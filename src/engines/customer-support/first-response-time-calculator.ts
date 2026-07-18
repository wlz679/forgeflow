// P12-2 First Response Time SLA
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Zendesk CX Trends + Freshworks customer service benchmarks).
// Multi-tier T1/T2/T3 first-response SLA attainment with equal-weighted tier average.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 90, label: '🟢 Excellent', message: 'World-class SLA reliability.' },
  good:      { threshold: 80, label: '🟡 Good',      message: 'Healthy response coverage.' },
  warning:   { threshold: 60, label: '🟠 Warning',   message: 'SLA misses are visible.' },
  critical:  { threshold: -Infinity, label: '🔴 Critical', message: 'Urgent queue coverage gap.' },
};

// P15 polish: extract magic +5 literal to named constant (community-wisdom uplift assumption for sub-target SLA attainment)
const LIFT_PERCENT = 5;

export type HealthBandKey = keyof typeof HEALTH_BANDS;

export function overallAttainment(t1Attainment: number, t2Attainment: number, t3Attainment: number): number {
  return (t1Attainment + t2Attainment + t3Attainment) / 3;
}

export function attainmentGapToExcellent(overallPct: number): number {
  return Math.max(0, HEALTH_BANDS.excellent.threshold - overallPct);
}

export function tierAttainmentSpread(t1Attainment: number, t2Attainment: number, t3Attainment: number): number {
  return Math.max(t1Attainment, t2Attainment, t3Attainment) - Math.min(t1Attainment, t2Attainment, t3Attainment);
}

export function calcHealthBand(pct: number): HealthBandKey {
  if (pct >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (pct >= HEALTH_BANDS.good.threshold) return 'good';
  if (pct >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return x.toFixed(1) + '%'; }
function fmtPp(x: number): string { return x.toFixed(1) + 'pp'; }
function fmtTarget(t1Min: number, t2Hr: number, t3Hr: number): string {
  return 'T1 ≤' + t1Min + ' min · T2 ≤' + t2Hr + 'h · T3 ≤' + t3Hr + 'h';
}
function lowestTier(t1: number, t2: number, t3: number): { name: string; value: number } {
  const tiers = [
    { name: 'T1', value: t1 },
    { name: 'T2', value: t2 },
    { name: 'T3', value: t3 },
  ];
  tiers.sort((a, b) => a.value - b.value || a.name.localeCompare(b.name));
  return tiers[0];
}

const engine: ToolEngine = {
  slug: 'solopreneur-first-response-time-calculator',
  title: 'First Response Time SLA Calculator',
  description:
    'Measure first-response SLA attainment across T1/T2/T3 support tiers using an equal-weighted tier average. HIGHER health bands — more in-SLA responses = better: 🟢 ≥90% · 🟡 80-90% · 🟠 60-80% · 🔴 <60%. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-Support.',
  inputs: [
    { name: 't1_target_min', label: 'T1 first-response target (minutes)', placeholder: 'e.g. 30', type: 'number' },
    { name: 't2_target_hr',  label: 'T2 first-response target (hours)',   placeholder: 'e.g. 4',  type: 'number' },
    { name: 't3_target_hr',  label: 'T3 first-response target (hours)',   placeholder: 'e.g. 24', type: 'number' },
    { name: 't1_attainment', label: 'T1 in-SLA attainment (%)',           placeholder: 'e.g. 85', type: 'number' },
    { name: 't2_attainment', label: 'T2 in-SLA attainment (%)',           placeholder: 'e.g. 80', type: 'number' },
    { name: 't3_attainment', label: 'T3 in-SLA attainment (%)',           placeholder: 'e.g. 90', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: [
      "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {",
      "  var t1Target = cnn(Number(inputs.t1_target_min) || 0);",
      "  var t2Target = cnn(Number(inputs.t2_target_hr) || 0);",
      "  var t3Target = cnn(Number(inputs.t3_target_hr) || 0);",
      "  var t1 = cnn(Number(inputs.t1_attainment) || 0);",
      "  var t2 = cnn(Number(inputs.t2_attainment) || 0);",
      "  var t3 = cnn(Number(inputs.t3_attainment) || 0);",
      "  var LIFT_PCT = 5;",  // mirrors src LIFT_PERCENT constant (customFn has no module scope)
      "  var overall = (t1 + t2 + t3) / 3;",
      "  var band = overall >= 90 ? 'Excellent' : overall >= 80 ? 'Good' : overall >= 60 ? 'Warning' : 'Critical';",
      "  var emoji = overall >= 90 ? '🟢' : overall >= 80 ? '🟡' : overall >= 60 ? '🟠' : '🔴';",
      "  var targetLine = 'T1 ≤' + t1Target + ' min · T2 ≤' + t2Target + 'h · T3 ≤' + t3Target + 'h';",
      "  var ifT1 = Math.min(100, t1 + LIFT_PCT);",
      "  var ifOverall = (ifT1 + t2 + t3) / 3;",
      "  var ifBand = ifOverall >= 90 ? 'Excellent' : ifOverall >= 80 ? 'Good' : ifOverall >= 60 ? 'Warning' : 'Critical';",
      "  var ifEmoji = ifOverall >= 90 ? '🟢' : ifOverall >= 80 ? '🟡' : ifOverall >= 60 ? '🟠' : '🔴';",
      "  var gap = Math.max(0, 90 - overall);",
      "  var totalPp = gap * 3;",
      "  var spread = Math.max(t1, t2, t3) - Math.min(t1, t2, t3);",
      "  var lowName = t1 <= t2 && t1 <= t3 ? 'T1' : t2 <= t3 ? 'T2' : 'T3';",
      "  var lowValue = Math.min(t1, t2, t3);",
      "  return [",
      "    '🩺 First Response SLA Health: ' + emoji + ' ' + band + ' (' + overall.toFixed(1) + '% in-SLA · ' + targetLine + ')',",
      "    '📊 Snapshot: T1 ' + t1.toFixed(1) + '% within ' + t1Target + ' min · T2 ' + t2.toFixed(1) + '% within ' + t2Target + 'h · T3 ' + t3.toFixed(1) + '% within ' + t3Target + 'h → equal-weighted overall ' + overall.toFixed(1) + '%',",
      "    '🔄 What-If: lifting T1 by +5pp to ' + ifT1.toFixed(1) + '% moves overall SLA to ' + ifOverall.toFixed(1) + '% (would be ' + ifEmoji + ' ' + ifBand + ')',",
      "    '⚖️ Break-Even: to hit 🟢 Excellent (90.0%), close ' + gap.toFixed(1) + 'pp overall — about ' + totalPp.toFixed(1) + 'pp total tier percentage-points if spread evenly',",
      "    '🎯 Milestone: weakest tier is ' + lowName + ' at ' + lowValue.toFixed(1) + '%; tier spread is ' + spread.toFixed(1) + 'pp. Stabilize the weakest queue before tightening targets.',",
      "    '💡 Tip: T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount before changing the SLA target.'",
      "  ];",
      "}",
    ].join('\n'),
  },
  generate(inputs) {
    const t1TargetMin = clampNonNegative(Number(inputs.t1_target_min) || 0);
    const t2TargetHr = clampNonNegative(Number(inputs.t2_target_hr) || 0);
    const t3TargetHr = clampNonNegative(Number(inputs.t3_target_hr) || 0);
    const t1 = clampNonNegative(Number(inputs.t1_attainment) || 0);
    const t2 = clampNonNegative(Number(inputs.t2_attainment) || 0);
    const t3 = clampNonNegative(Number(inputs.t3_attainment) || 0);
    const overall = overallAttainment(t1, t2, t3);
    const band = calcHealthBand(overall);
    const bandInfo = HEALTH_BANDS[band];
    const targetLine = fmtTarget(t1TargetMin, t2TargetHr, t3TargetHr);
    const ifT1 = Math.min(100, t1 + LIFT_PERCENT);
    const ifOverall = overallAttainment(ifT1, t2, t3);
    const ifBand = calcHealthBand(ifOverall);
    const gap = attainmentGapToExcellent(overall);
    const totalTierPp = gap * 3;
    const spread = tierAttainmentSpread(t1, t2, t3);
    const weak = lowestTier(t1, t2, t3);
    return [
      '🩺 First Response SLA Health: ' + bandInfo.label + ' (' + fmtPct(overall) + ' in-SLA · ' + targetLine + ')',
      '📊 Snapshot: T1 ' + fmtPct(t1) + ' within ' + t1TargetMin + ' min · T2 ' + fmtPct(t2) + ' within ' + t2TargetHr + 'h · T3 ' + fmtPct(t3) + ' within ' + t3TargetHr + 'h → equal-weighted overall ' + fmtPct(overall),
      '🔄 What-If: lifting T1 by +5pp to ' + fmtPct(ifT1) + ' moves overall SLA to ' + fmtPct(ifOverall) + ' (would be ' + HEALTH_BANDS[ifBand].label + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (90.0%), close ' + fmtPp(gap) + ' overall — about ' + fmtPp(totalTierPp) + ' total tier percentage-points if spread evenly',
      '🎯 Milestone: weakest tier is ' + weak.name + ' at ' + fmtPct(weak.value) + '; tier spread is ' + fmtPp(spread) + '. Stabilize the weakest queue before tightening targets.',
      '💡 Tip: T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount before changing the SLA target.',
    ];
  },
  staticExamples: [
    '🩺 First Response SLA Health: 🟡 Good (85.0% in-SLA · T1 ≤30 min · T2 ≤4h · T3 ≤24h)\n📊 Snapshot: T1 85.0% within 30 min · T2 80.0% within 4h · T3 90.0% within 24h → equal-weighted overall 85.0%\n🔄 What-If: lifting T1 by +5pp to 90.0% moves overall SLA to 86.7% (would be 🟡 Good)\n⚖️ Break-Even: to hit 🟢 Excellent (90.0%), close 5.0pp overall — about 15.0pp total tier percentage-points if spread evenly\n🎯 Milestone: weakest tier is T2 at 80.0%; tier spread is 10.0pp. Stabilize the weakest queue before tightening targets.\n💡 Tip: T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount before changing the SLA target.',
  ],
  faq: [
    { q: 'What is first response time SLA?', a: 'It is the share of tickets that receive an initial human response within the promised time window. This calculator tracks T1/T2/T3 separately because frontline, specialist, and engineering escalations usually have different targets.' },
    { q: 'Why is the overall SLA an equal-weighted average?', a: 'This P12-2 version intentionally uses (T1 + T2 + T3) / 3. That makes tier health visible even when T3 volume is small, but it is a known limitation: it assumes balanced tier importance and does not weight by ticket volume.' },
    { q: 'What is a good first response SLA for mid-market B2B SaaS?', a: '90%+ in-SLA is world-class, 80-90% is healthy, 60-80% is a warning, and below 60% means customers are routinely waiting beyond the promised response window.' },
    { q: 'How should targets differ by tier?', a: 'A common setup is T1 measured in minutes, T2 in hours, and T3 in one business day or more. Keep targets realistic: aggressive targets without matching staffing only create chronic misses.' },
    { q: 'What should I do if T1 attainment is below 80%?', a: 'T1 misses usually point to queue overflow, weak shift coverage, or too many low-value tickets. Check arrival patterns, staffing schedule, macro coverage, and deflection opportunities before relaxing the SLA.' },
    { q: 'How does this pair with cost-per-ticket?', a: 'Use this alongside Cost-per-Support-Ticket. A cheap support motion that misses first response SLAs creates churn risk; an excellent SLA with bloated escalation cost may need tier redesign.' },
  ],
  howToUse: [
    'Enter the first-response target for each tier: T1 in minutes, T2 and T3 in hours.',
    'Enter the percentage of tickets in each tier that met its first-response target during the reporting window.',
    'Read the overall SLA health band: 🟢 ≥90%, 🟡 80-90%, 🟠 60-80%, 🔴 <60%.',
    'Use the What-If and Break-Even sections to estimate how many tier percentage-points must improve to reach the next operating level.',
    'Investigate the weakest tier first; chronic T1 misses usually mean queue overflow or shift coverage gaps.',
  ],
  sources: [
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.freshworks.com/customer-service-benchmark/',
    'https://www.icmi.com/research/contact-center-performance',
    'https://www.tsia.com/blog/support-operations-benchmark',
  ],
  engineKey: true,
};
registerEngine(engine);