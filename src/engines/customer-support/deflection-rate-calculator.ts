// P12-5 Self-Service Deflection Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Self-Service Benchmark + Zendesk 2024 + Gartner 2024).
// Self-service deflection via KB + chatbot (pre-T1 channel).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 40, label: '🟢 Excellent', message: 'World-class self-service — KB/chatbot deflects ≥40% of tickets before they reach T1.' },
  good:      { threshold: 25, label: '🟡 Good',      message: 'Healthy deflection — typical mid-market benchmark (25-40%).' },
  warning:   { threshold: 10, label: '🟠 Warning',   message: 'Below-market self-service — KB has content gaps or search is failing.' },
  critical:  { threshold: -Infinity, label: '🔴 Critical', message: 'No meaningful self-service — every ticket reaches a human agent.' },
};

export type HealthBandKey = keyof typeof HEALTH_BANDS;

export function deflectedVolume(monthlyTickets: number, deflectionPct: number): number {
  return monthlyTickets * (deflectionPct / 100);
}

export function savedCost(deflected: number, costPerTicket: number): number {
  return deflected * costPerTicket;
}

export function netSavings(saved: number, toolMonthlyCost: number): number {
  return saved - toolMonthlyCost;
}

export function roiPct(net: number, toolMonthlyCost: number): number {
  if (toolMonthlyCost <= 0) return Infinity;
  return (net / toolMonthlyCost) * 100;
}

export function gapToTarget(ratePct: number, targetPct: number): number {
  return ratePct - targetPct;
}

export function calcHealthBand(pct: number): HealthBandKey {
  if (pct >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (pct >= HEALTH_BANDS.good.threshold) return 'good';
  if (pct >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return x.toFixed(1) + '%'; }
function fmtPp(x: number): string { return (x >= 0 ? '+' : '') + x.toFixed(1) + 'pp'; }
function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtMoneyExact(x: number): string { return '$' + x.toLocaleString(undefined, { maximumFractionDigits: 0 }); }

const engine: ToolEngine = {
  slug: 'solopreneur-deflection-rate-calculator',
  title: 'Self-Service Deflection Rate Calculator',
  description:
    'Measure self-service deflection via KB + chatbot (pre-T1 tickets avoided). HIGHER health bands — more deflection = better efficiency: 🟢 ≥40% · 🟡 25-40% · 🟠 10-25% · 🔴 <10%. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-CS.',
  inputs: [
    { name: 'monthly_tickets',   label: 'Monthly inbound tickets',     placeholder: 'e.g. 5000', type: 'number' },
    { name: 'deflection_rate',   label: 'Deflection rate (%)',        placeholder: 'e.g. 35',   type: 'number' },
    { name: 'cost_per_ticket',   label: 'Cost per ticket ($)',        placeholder: 'e.g. 24',   type: 'number' },
    { name: 'tool_monthly_cost', label: 'KB/chatbot monthly cost ($)',placeholder: 'e.g. 1500', type: 'number' },
    { name: 'target_deflection', label: 'Internal deflection target (%)', placeholder: 'e.g. 40', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: "function run(inputs, pick, fill) {\n  var vol = Number(inputs.monthly_tickets) || 0;\n  var rate = Number(inputs.deflection_rate) || 0;\n  var cost = Number(inputs.cost_per_ticket) || 0;\n  var tool = Number(inputs.tool_monthly_cost) || 0;\n  var tgt = Number(inputs.target_deflection) || 0;\n  var deflected = vol * (rate / 100);\n  var saved = deflected * cost;\n  var net = saved - tool;\n  var roi = tool > 0 ? (net / tool) * 100 : 0;\n  var gap = tgt - rate;\n  var band = rate >= 40 ? 'Excellent' : rate >= 25 ? 'Good' : rate >= 10 ? 'Warning' : 'Critical';\n  var emoji = rate >= 40 ? '🟢' : rate >= 25 ? '🟡' : rate >= 10 ? '🟠' : '🔴';\n  var ifRate = Math.min(100, rate + 10);\n  var ifBand = ifRate >= 40 ? 'Excellent' : ifRate >= 25 ? 'Good' : ifRate >= 10 ? 'Warning' : 'Critical';\n  var ifEmoji = ifRate >= 40 ? '🟢' : ifRate >= 25 ? '🟡' : ifRate >= 10 ? '🟠' : '🔴';\n  var ifSaved = vol * (ifRate / 100) * cost - tool;\n  return [\n    '🩺 Deflection Health: ' + emoji + ' ' + band + ' (' + rate.toFixed(1) + '% deflected · ' + net.toLocaleString() + ' net/mo)',\n    '📊 Snapshot: ' + Math.round(deflected).toLocaleString() + ' tickets/mo deflected · $' + Math.round(saved).toLocaleString() + ' gross saved · $' + Math.round(net).toLocaleString() + ' net · ' + Math.round(roi).toLocaleString() + '% ROI',\n    '🔄 What-If: if deflection climbs to ' + ifRate.toFixed(1) + '% (+10pp), band moves to ' + ifEmoji + ' ' + ifBand + ' and net savings = $' + Math.round(ifSaved).toLocaleString() + '/mo',\n    '⚖️ Break-Even: to hit 🟢 Excellent (≥40%), need ' + Math.max(0, 40 - rate).toFixed(1) + 'pp more — pair with [Cost-per-Ticket Calculator] (P12-1) to model full cost reduction',\n    '🎯 Milestone: KB content gap is #1 deflection killer — re-audit top 50 articles quarterly. Track deflection rate weekly.',\n    '💡 Tip: Deflection >50% often means KB is masking product gaps — validate top-deflected tickets quarterly to ensure self-service answers are accurate.'\n  ];\n}",
  },
  generate(inputs) {
    const vol = Number(inputs.monthly_tickets) || 0;
    const rate = Number(inputs.deflection_rate) || 0;
    const cost = Number(inputs.cost_per_ticket) || 0;
    const tool = Number(inputs.tool_monthly_cost) || 0;
    const target = Number(inputs.target_deflection) || 0;
    const deflected = deflectedVolume(vol, rate);
    const saved = savedCost(deflected, cost);
    const net = netSavings(saved, tool);
    const roi = roiPct(net, tool);
    const gap = gapToTarget(rate, target);
    const band = calcHealthBand(rate);
    const bandInfo = HEALTH_BANDS[band];
    const ifRate = Math.min(100, rate + 10);
    const ifBand = calcHealthBand(ifRate);
    const ifSaved = netSavings(savedCost(deflectedVolume(vol, ifRate), cost), tool);
    const gapSign = gap >= 0 ? '+' : '';
    return [
      '🩺 Deflection Health: ' + bandInfo.label + ' (' + fmtPct(rate) + ' deflected · ' + fmtMoney(net) + '/mo net)',
      '📊 Snapshot: ' + Math.round(deflected).toLocaleString() + ' tickets/mo deflected · ' + fmtMoney(saved) + ' gross saved · ' + fmtMoney(net) + ' net · ' + Math.round(roi).toLocaleString() + '% ROI',
      '🔄 What-If: if deflection climbs to ' + fmtPct(ifRate) + ' (+10pp), band moves to ' + HEALTH_BANDS[ifBand].label + ' and net savings = ' + fmtMoney(ifSaved) + '/mo',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥40%), need ' + Math.max(0, 40 - rate).toFixed(1) + 'pp more — pair with [Cost-per-Ticket Calculator] (P12-1) to model full cost reduction',
      '🎯 Milestone: KB content gap is #1 deflection killer — re-audit top 50 articles quarterly. Track deflection rate weekly.',
      '💡 Tip: Deflection >50% often means KB is masking product gaps — validate top-deflected tickets quarterly to ensure self-service answers are accurate.',
    ];
  },
  staticExamples: [
    '🩺 Deflection Health: 🟡 Good (35.0% deflected · $40,500/mo net)\n📊 Snapshot: 1,750 tickets/mo deflected · $42,000 gross saved · $40,500 net · 2,700% ROI\n🔄 What-If: if deflection climbs to 45.0% (+10pp), band moves to 🟢 Excellent and net savings = $52,500/mo\n⚖️ Break-Even: to hit 🟢 Excellent (≥40%), need 5.0pp more — pair with [Cost-per-Ticket Calculator] (P12-1) to model full cost reduction\n🎯 Milestone: KB content gap is #1 deflection killer — re-audit top 50 articles quarterly. Track deflection rate weekly.\n💡 Tip: Deflection >50% often means KB is masking product gaps — validate top-deflected tickets quarterly to ensure self-service answers are accurate.',
  ],
  faq: [
    { q: 'What is self-service deflection?', a: 'It is the share of inbound tickets that are resolved by self-service channels (KB articles, in-product help, chatbot) BEFORE they reach a human T1 agent. Industry reporting often combines KB + chatbot under "deflection."' },
    { q: 'How is cost savings calculated?', a: 'Each deflected ticket saves the cost of human handling. Net savings = (tickets × deflection% × cost/ticket) - tool monthly cost (KB platform + chatbot subscription).' },
    { q: 'What is a good deflection rate?', a: '≥40% is excellent (mature KB + chatbot). 25-40% is typical mid-market. 10-25% is a warning (KB has content gaps). <10% means self-service is essentially not working.' },
    { q: 'Should I count chatbot escalations as deflection?', a: 'No — only count tickets that are FULLY resolved without human intervention. Tickets where chatbot attempted then escalated to T1 should count against deflection rate.' },
    { q: 'How does this pair with cost-per-ticket?', a: 'Higher deflection = fewer T1 tickets = lower weighted avg cost-per-ticket (P12-1). Use both calculators together to model the ROI of KB/chatbot investment.' },
    { q: 'What if deflection is very high (>50%)?', a: 'It can mean KB is masking product gaps — customers self-serve through workaround articles instead of getting the bug fixed. Quarterly audit the top-deflected tickets to ensure self-service is healthy, not papering over real issues.' },
  ],
  howToUse: [
    'Enter monthly inbound tickets — total tickets expected this month.',
    'Enter deflection rate (%) — share of tickets resolved via KB/chatbot without human intervention.',
    'Enter cost per ticket — pull from your P12-1 calculation or helpdesk platform.',
    'Enter KB/chatbot monthly cost — combined tool subscription cost.',
    'Enter internal deflection target — your company benchmark for "good" deflection.',
    'Read the net savings + ROI; check Break-Even for gap to Excellent threshold.',
  ],
  sources: [
    'https://www.tsia.com/blog/self-service-benchmark',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.freshworks.com/customer-service-benchmark/',
    'https://www.gartner.com/en/customer-service-support',
  ],
};
registerEngine(engine);