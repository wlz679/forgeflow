// P12-3 Resolution Time
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Support Ops + ICMI 2023 + SQM Group 2024).
// Tracks in-SLA attainment + tail-ratio (p90 / median) for full resolution cycle.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 85, label: '🟢 Excellent', message: 'Healthy full-cycle resolution — most tickets resolved within SLA, modest tail.' },
  good:      { threshold: 70, label: '🟡 Good',      message: 'Typical mid-market performance — SLA mostly met, investigate outliers.' },
  warning:   { threshold: 50, label: '🟠 Warning',   message: 'Below-market resolution health — many tickets miss SLA or drag on.' },
  critical:  { threshold: -Infinity, label: '🔴 Critical', message: 'Severe resolution backlog — systemic issue or insufficient staffing.' },
};

export type HealthBandKey = keyof typeof HEALTH_BANDS;

export function tailRatio(medianHr: number, p90Hr: number): number {
  if (medianHr <= 0) return 0;
  return p90Hr / medianHr;
}

export function tailRatioHealth(ratio: number): 'uniform' | 'moderate' | 'heavy' {
  if (ratio <= 1.5) return 'uniform';
  if (ratio <= 3.0) return 'moderate';
  return 'heavy';
}

export function calcHealthBand(pct: number): HealthBandKey {
  if (pct >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (pct >= HEALTH_BANDS.good.threshold) return 'good';
  if (pct >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return x.toFixed(1) + '%'; }
function fmtHr(x: number): string { return x.toFixed(1) + 'hr'; }
function fmtMoney(x: number): string { return Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-resolution-time-calculator',
  title: 'Resolution Time Calculator',
  description:
    'Track full-resolution cycle health via in-SLA attainment + tail ratio (p90 / median). HIGHER health bands — more in-SLA = better: 🟢 ≥85% · 🟡 70-85% · 🟠 50-70% · 🔴 <50%. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-Support.',
  inputs: [
    { name: 'sla_attainment_pct',   label: 'In-SLA resolution attainment (%)', placeholder: 'e.g. 75',   type: 'number' },
    { name: 'median_resolution_hr', label: 'Median resolution time (hours)',  placeholder: 'e.g. 8',    type: 'number' },
    { name: 'p90_resolution_hr',    label: 'p90 resolution time (hours)',     placeholder: 'e.g. 36',   type: 'number' },
    { name: 'monthly_resolved',     label: 'Tickets resolved this month',    placeholder: 'e.g. 4800', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {\n  var sla = cnn(Number(inputs.sla_attainment_pct) || 0);\n  var med = cnn(Number(inputs.median_resolution_hr) || 0);\n  var p90 = cnn(Number(inputs.p90_resolution_hr) || 0);\n  var vol = cnn(Number(inputs.monthly_resolved) || 0);\n  var tail = med > 0 ? p90 / med : 0;\n  var tailLabel = tail <= 1.5 ? 'uniform' : tail <= 3.0 ? 'moderate' : 'heavy';\n  var band = sla >= 85 ? 'Excellent' : sla >= 70 ? 'Good' : sla >= 50 ? 'Warning' : 'Critical';\n  var emoji = sla >= 85 ? '🟢' : sla >= 70 ? '🟡' : sla >= 50 ? '🟠' : '🔴';\n  var ifSla = Math.min(100, sla + 10);\n  var ifBand = ifSla >= 85 ? 'Excellent' : ifSla >= 70 ? 'Good' : ifSla >= 50 ? 'Warning' : 'Critical';\n  var ifEmoji = ifSla >= 85 ? '🟢' : ifSla >= 70 ? '🟡' : ifSla >= 50 ? '🟠' : '🔴';\n  var gap = Math.max(0, 85 - sla);\n  var missedApprox = Math.round(vol * (100 - sla) / 100);\n  var ifMissed = Math.round(vol * (100 - ifSla) / 100);\n  return [\n    '🩺 Resolution Health: ' + emoji + ' ' + band + ' (' + sla.toFixed(1) + '% in-SLA · tail ratio ' + tail.toFixed(1) + 'x ' + tailLabel + ')',\n    '📊 Snapshot: ' + vol.toLocaleString() + ' resolved/mo · median ' + med.toFixed(1) + 'hr · p90 ' + p90.toFixed(1) + 'hr · tail ' + tail.toFixed(1) + 'x → ' + missedApprox.toLocaleString() + ' tickets missed SLA',\n    '🔄 What-If: if attainment climbs to ' + ifSla.toFixed(1) + '% (+10pp), band moves to ' + ifEmoji + ' ' + ifBand + ' and ~' + ifMissed.toLocaleString() + ' tickets would still miss',\n    '⚖️ Break-Even: to hit 🟢 Excellent (≥85%), need +' + gap.toFixed(1) + 'pp attainment — investigate the tier with the highest tail ratio',\n    '🎯 Milestone: tail ratio >5x signals systemic issue — escalations, missing knowledge base, or product gaps. Re-benchmark quarterly.',\n    '💡 Tip: Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers — they usually expose KB content gaps or escalation bottlenecks.'\n  ];\n}",
  },
  generate(inputs) {
    const sla = clampNonNegative(Number(inputs.sla_attainment_pct) || 0);
    const med = clampNonNegative(Number(inputs.median_resolution_hr) || 0);
    const p90 = clampNonNegative(Number(inputs.p90_resolution_hr) || 0);
    const vol = clampNonNegative(Number(inputs.monthly_resolved) || 0);
    const tail = tailRatio(med, p90);
    const tailBand = tailRatioHealth(tail);
    const band = calcHealthBand(sla);
    const bandInfo = HEALTH_BANDS[band];
    const ifSla = Math.min(100, sla + 10);
    const ifBand = calcHealthBand(ifSla);
    const gap = Math.max(0, HEALTH_BANDS.excellent.threshold - sla);
    const missed = Math.round(vol * (100 - sla) / 100);
    const ifMissed = Math.round(vol * (100 - ifSla) / 100);
    return [
      '🩺 Resolution Health: ' + bandInfo.label + ' (' + fmtPct(sla) + ' in-SLA · tail ratio ' + tail.toFixed(1) + 'x ' + tailBand + ')',
      '📊 Snapshot: ' + fmtMoney(vol) + ' resolved/mo · median ' + fmtHr(med) + ' · p90 ' + fmtHr(p90) + ' · tail ' + tail.toFixed(1) + 'x → ' + fmtMoney(missed) + ' tickets missed SLA',
      '🔄 What-If: if attainment climbs to ' + fmtPct(ifSla) + ' (+10pp), band moves to ' + HEALTH_BANDS[ifBand].label + ' and ~' + fmtMoney(ifMissed) + ' tickets would still miss',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥85%), need +' + gap.toFixed(1) + 'pp attainment — investigate the tier with the highest tail ratio',
      '🎯 Milestone: tail ratio >5x signals systemic issue — escalations, missing knowledge base, or product gaps. Re-benchmark quarterly.',
      '💡 Tip: Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers — they usually expose KB content gaps or escalation bottlenecks.',
    ];
  },
  staticExamples: [
    '🩺 Resolution Health: 🟡 Good (75.0% in-SLA · tail ratio 4.5x heavy)\n📊 Snapshot: 4,800 resolved/mo · median 8.0hr · p90 36.0hr · tail 4.5x → 1,200 tickets missed SLA\n🔄 What-If: if attainment climbs to 85.0% (+10pp), band moves to 🟢 Excellent and ~720 tickets would still miss\n⚖️ Break-Even: to hit 🟢 Excellent (≥85%), need +10.0pp attainment — investigate the tier with the highest tail ratio\n🎯 Milestone: tail ratio >5x signals systemic issue — escalations, missing knowledge base, or product gaps. Re-benchmark quarterly.\n💡 Tip: Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers — they usually expose KB content gaps or escalation bottlenecks.',
  ],
  faq: [
    { q: 'What is in-SLA resolution attainment?', a: 'It is the share of tickets that are fully resolved within their promised resolution time window — distinct from first response SLA, which only counts the initial reply.' },
    { q: 'What is tail ratio?', a: 'Tail ratio = p90 resolution time / median resolution time. A value of 1.0 means every ticket resolves in roughly the same time (uniform). A value above 3.0 means a heavy tail — a small share of tickets drag on for much longer than typical.' },
    { q: 'Why track tail ratio separately from SLA attainment?', a: 'You can have 90% SLA attainment with a tail ratio of 10x — that 10% that miss SLA drags on for days. Tail ratio reveals outliers that the SLA % hides.' },
    { q: 'What is a good tail ratio?', a: '≤1.5 is uniform (rarely achievable for B2B SaaS). 1.5-3.0 is moderate — typical healthy operation. Above 3.0 is heavy tail; above 5.0 is a systemic issue requiring investigation.' },
    { q: 'How does this pair with first-response SLA?', a: 'P12-2 measures first-response time (initial reply). P12-3 measures full-resolution time (ticket closed). Track both together — fast FRT with slow resolution can mean agents close prematurely.' },
    { q: 'What should I do if tail ratio is above 5x?', a: 'Investigate the slowest 10% of tickets manually. Common causes: missing KB content (tickets waiting on specialist triage), escalation bottlenecks (T3 engineering queue), or product gaps (no workaround for known issue).' },
  ],
  howToUse: [
    'Enter in-SLA attainment (%) — pull from your helpdesk platform reporting.',
    'Enter median resolution time (hours) — full ticket lifecycle, not just FRT.',
    'Enter p90 resolution time (hours) — the 90th percentile of your slowest tickets.',
    'Enter monthly resolved ticket count — total tickets closed this period.',
    'Read the health band driven by SLA %; check tail ratio as a separate signal for outliers.',
  ],
  sources: [
    'https://www.tsia.com/blog/support-operations-benchmark',
    'https://www.icmi.com/research/contact-center-performance',
    'https://www.sqmgroup.com/resources/research/contact-center-benchmarks',
    'https://www.gainsight.com/blog/customer-success-benchmarks/',
  ],
  engineKey: true,
};
registerEngine(engine);
