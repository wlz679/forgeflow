// P12-1 Cost-per-Support-Ticket
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Support Ops Benchmark + Zendesk CX Trends 2024).
// Multi-tier T1/T2/T3 architecture with weighted average cost-per-ticket.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 10, label: 'Excellent', message: 'Lean support cost.' },
  good:      { threshold: 25, label: 'Good',      message: 'Healthy multi-tier mix.' },
  warning:   { threshold: 50, label: 'Warning',   message: 'Above-market cost.' },
  critical:  { threshold: Infinity, label: 'Critical', message: 'Severely bloated cost.' },
};

export function weightedAvgCost(t1Cost: number, t2Cost: number, t3Cost: number, t1Share: number, t2Share: number): number {
  const t3Share = 100 - t1Share - t2Share;
  return (t1Cost * t1Share + t2Cost * t2Share + t3Cost * t3Share) / 100;
}

export function monthlyTotalCost(avg: number, volume: number): number {
  return avg * volume;
}

export function calcHealthBand(avg: number): keyof typeof HEALTH_BANDS {
  if (avg <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (avg <= HEALTH_BANDS.good.threshold) return 'good';
  if (avg <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtAvg(x: number): string { return '$' + x.toFixed(2); }

const engine: ToolEngine = {
  slug: 'solopreneur-cost-per-support-ticket-calculator',
  title: 'Cost-per-Support-Ticket',
  description:
    'Compute weighted average cost-per-support-ticket across multi-tier T1/T2/T3 structure. INVERSE health bands — lower $/ticket = better cost control: 🟢 ≤$10 · 🟡 $10-$25 · 🟠 $25-$50 · 🔴 >$50. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-CS.',
  inputs: [
    { name: 't1_cost',        label: 'T1 cost per ticket ($)',     placeholder: 'e.g. 8',  type: 'number' },
    { name: 't2_cost',        label: 'T2 cost per ticket ($)',     placeholder: 'e.g. 25', type: 'number' },
    { name: 't3_cost',        label: 'T3 cost per ticket ($)',     placeholder: 'e.g. 70', type: 'number' },
    { name: 't1_share',       label: 'T1 share of tickets (%)',    placeholder: 'e.g. 55', type: 'number' },
    { name: 't2_share',       label: 'T2 share of tickets (%)',    placeholder: 'e.g. 30', type: 'number' },
    { name: 'monthly_volume', label: 'Monthly ticket volume',      placeholder: 'e.g. 5000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var t1c = Number(inputs.t1_cost) || 0;
  var t2c = Number(inputs.t2_cost) || 0;
  var t3c = Number(inputs.t3_cost) || 0;
  var t1s = Number(inputs.t1_share) || 0;
  var t2s = Number(inputs.t2_share) || 0;
  var vol = Number(inputs.monthly_volume) || 0;
  var t3s = 100 - t1s - t2s;
  if (t3s < 0) t3s = 0;
  var avg = (t1c * t1s + t2c * t2s + t3c * t3s) / 100;
  var monthly = avg * vol;
  var band = avg <= 10 ? 'Excellent' : avg <= 25 ? 'Good' : avg <= 50 ? 'Warning' : 'Critical';
  var emoji = avg <= 10 ? '🟢' : avg <= 25 ? '🟡' : avg <= 50 ? '🟠' : '🔴';
  var altAvg = (t1c * t1s + t2c * t2s + t3c * 10) / 100;
  var targetWeighted = 10 * 100;
  var currentWeighted = t1c * t1s + t2c * t2s + t3c * t3s;
  var t3Cut = Math.max(0, Math.round((currentWeighted - targetWeighted) / Math.max(t3s, 1)));
  return [
    '🩺 Cost-per-Ticket Health: ' + emoji + ' ' + band + ' ($' + avg.toFixed(2) + '/ticket · $' + Math.round(monthly).toLocaleString() + '/mo)',
    '📊 Snapshot: T1 ' + t1s + '% × $' + t1c + ' + T2 ' + t2s + '% × $' + t2c + ' + T3 ' + t3s + '% × $' + t3c + ' = $' + avg.toFixed(2) + ' weighted · $' + Math.round(monthly).toLocaleString() + '/mo total',
    '🔄 What-If: if T3 share drops to 10%, avg drops to $' + altAvg.toFixed(2) + ' (would be ' + (altAvg <= 10 ? '🟢 Excellent' : altAvg <= 25 ? '🟡 Good' : altAvg <= 50 ? '🟠 Warning' : '🔴 Critical') + ')',
    '⚖️ Break-Even: to hit 🟢 Excellent ($10.00 ceiling), cut T3 cost to ≤$' + t3Cut + '/ticket OR push T3 share ≤5%',
    '🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly',
    '💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.',
  ];
}`,
  },
  generate(inputs) {
    const t1Cost = Number(inputs.t1_cost) || 0;
    const t2Cost = Number(inputs.t2_cost) || 0;
    const t3Cost = Number(inputs.t3_cost) || 0;
    const t1Share = Number(inputs.t1_share) || 0;
    const t2Share = Number(inputs.t2_share) || 0;
    const monthlyVolume = Number(inputs.monthly_volume) || 0;
    const t3Share = Math.max(0, 100 - t1Share - t2Share);
    const avg = weightedAvgCost(t1Cost, t2Cost, t3Cost, t1Share, t2Share);
    const monthly = monthlyTotalCost(avg, monthlyVolume);
    const band = calcHealthBand(avg);
    const bandInfo = HEALTH_BANDS[band];
    const altT3Share = 10;
    const altAvg = (t1Cost * t1Share + t2Cost * t2Share + t3Cost * altT3Share) / 100;
    const altBand = calcHealthBand(altAvg);
    const targetWeighted = HEALTH_BANDS.excellent.threshold * 100;
    const currentWeighted = t1Cost * t1Share + t2Cost * t2Share + t3Cost * t3Share;
    const t3Cut = Math.max(0, (currentWeighted - targetWeighted) / Math.max(t3Share, 1));
    return [
      '🩺 Cost-per-Ticket Health: ' + bandInfo.label + ' (' + fmtAvg(avg) + '/ticket · ' + fmtMoney(monthly) + '/mo)',
      '📊 Snapshot: T1 ' + t1Share + '% × ' + fmtAvg(t1Cost) + ' + T2 ' + t2Share + '% × ' + fmtAvg(t2Cost) + ' + T3 ' + t3Share + '% × ' + fmtAvg(t3Cost) + ' = ' + fmtAvg(avg) + ' weighted · ' + fmtMoney(monthly) + '/mo total',
      '🔄 What-If: if T3 share drops to 10%, avg drops to ' + fmtAvg(altAvg) + ' (would be ' + HEALTH_BANDS[altBand].label + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (' + fmtAvg(HEALTH_BANDS.excellent.threshold) + ' ceiling), cut T3 cost to ≤$' + Math.round(t3Cut) + '/ticket OR push T3 share ≤5%',
      '🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly',
      '💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.',
    ];
  },
  staticExamples: [
    '🩺 Cost-per-Ticket Health: Good ($22.40/ticket · $112,000/mo)\n📊 Snapshot: T1 55% × $8.00 + T2 30% × $25.00 + T3 15% × $70.00 = $22.40 weighted · $112,000/mo total\n🔄 What-If: if T3 share drops to 10%, avg drops to $18.90 (would be Good)\n⚖️ Break-Even: to hit 🟢 Excellent ($10.00 ceiling), cut T3 cost to ≤$83/ticket OR push T3 share ≤5%\n🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly\n💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.',
  ],
  faq: [
    { q: 'What are T1/T2/T3 tiers?', a: 'T1 = frontline/junior agents handling common questions (password reset, basic how-to). T2 = senior specialists handling technical issues. T3 = engineering escalations requiring dev involvement. Multi-tier is industry standard — TSIA 2024 reports 87% of mid-market CS teams have ≥2 tiers.' },
    { q: 'Why is T3 cost so much higher?', a: 'T3 involves engineering time which costs $80-150/hr fully-loaded. A single T3 ticket can consume 2-5 hours of dev time vs 5-15 min for T1. Reducing T3 share by even 5pp dramatically cuts avg cost.' },
    { q: 'How do I calculate cost-per-tier?', a: 'T1: junior agent hourly rate × avg handle time + overhead. T2: senior specialist rate × handle time + overhead. T3: engineering hourly rate × handle time + opportunity cost. Sum across all tickets in the tier, divide by ticket count.' },
    { q: 'What is the TSIA 2024 benchmark?', a: 'TSIA (Technology & Services Industry Association) 2024 Support Operations Benchmark reports mid-market B2B SaaS averages $15-$25/ticket. <$10 is excellent (mature self-service); >$50 is critical (over-escalation or product issues generating tickets).' },
    { q: 'How does this pair with P12-5 Deflection?', a: 'P12-5 measures deflection rate (tickets avoided entirely via KB/chatbot). Higher deflection = fewer T1 tickets = lower weighted avg cost. Use P12-5 to model the cost impact of improving KB coverage.' },
    { q: 'Does this include CSM/account management cost?', a: 'No — this is support-only (inbound ticket handling). For CSM cost modeling (relationship management, QBRs), see retention-category calculators (P9 series).' },
  ],
  howToUse: [
    'Enter T1/T2/T3 cost per ticket — junior agent time + overhead for T1, specialist for T2, engineering for T3.',
    'Enter T1 and T2 share as % of total tickets — T3 share is auto-computed (100 - T1 - T2).',
    'Enter monthly ticket volume — pull from your helpdesk platform (Zendesk, Intercom, Freshdesk).',
    'Read the weighted avg cost-per-ticket band and monthly total — both feed into CS Ops budget.',
    'Pair with [Deflection Rate Calculator] (P12-5) to model cost savings from improved KB/chatbot.',
  ],
  sources: [
    'https://www.tsia.com/blog/support-operations-benchmark',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.freshworks.com/customer-service-benchmark/',
    'https://www.icmi.com/research/contact-center-performance',
  ],
};
registerEngine(engine);
