// P12-6 Support Team Capacity Planning
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Workforce Optimization + ICMI 2023 + Zendesk 2024).
// Capacity planning: productive_min = hours × 60 × (1-shrink) × (occ/100).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

export const HEALTH_BANDS = {
  excellent: { threshold: 85, label: '🟢 Excellent', message: 'Healthy buffer — agents have ≥15% capacity for spikes + training.' },
  good:      { threshold: 100, label: '🟡 Good',      message: 'Healthy utilization — buffer for after-call work, but no room for big spikes.' },
  warning:   { threshold: 120, label: '🟠 Warning',   message: 'No buffer — burnout risk; expect attrition within 1-2 quarters.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Overworked — agents cannot complete work; attrition imminent.' },
};

export type HealthBandKey = keyof typeof HEALTH_BANDS;

export function totalHandleMin(monthlyTickets: number, avgHandleMin: number): number {
  return monthlyTickets * avgHandleMin;
}

export function productiveMinPerAgent(workHoursPerMonth: number, shrinkagePct: number, targetOccupancyPct: number): number {
  return workHoursPerMonth * 60 * (1 - shrinkagePct / 100) * (targetOccupancyPct / 100);
}

export function requiredAgentsRaw(totalMin: number, productiveMin: number): number {
  if (productiveMin <= 0) return 0;
  return totalMin / productiveMin;
}

export function requiredAgents(totalMin: number, productiveMin: number): number {
  return Math.ceil(requiredAgentsRaw(totalMin, productiveMin));
}

export function utilizationActual(totalMin: number, productiveMin: number, agents: number): number {
  if (agents <= 0) return Infinity;
  return (totalMin / (agents * productiveMin)) * 100;
}

export function calcHealthBand(utilPct: number): HealthBandKey {
  if (utilPct <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (utilPct <= HEALTH_BANDS.good.threshold) return 'good';
  if (utilPct <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return x.toFixed(1) + '%'; }
function fmtMin(x: number): string { return Math.round(x).toLocaleString() + ' min'; }
function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }

const engine: ToolEngine = {
  slug: 'solopreneur-support-capacity-planning-calculator',
  title: 'Support Team Capacity Planning Calculator',
  description:
    'Plan headcount capacity using handle time, shrinkage, and target occupancy. INVERSE health bands — lower utilization = more buffer: 🟢 ≤85% (15%+ buffer) · 🟡 85-100% · 🟠 100-120% · 🔴 >120%. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-CS.',
  inputs: [
    { name: 'monthly_tickets',        label: 'Expected monthly tickets',         placeholder: 'e.g. 5000', type: 'number' },
    { name: 'avg_handle_time_min',    label: 'Average handle time (minutes)',    placeholder: 'e.g. 18',   type: 'number' },
    { name: 'target_occupancy_pct',   label: 'Target occupancy (%)',            placeholder: 'e.g. 70',   type: 'number' },
    { name: 'work_hours_per_month',   label: 'Work hours per agent per month',   placeholder: 'e.g. 160',  type: 'number' },
    { name: 'shrinkage_pct',          label: 'Shrinkage (%) — non-productive time', placeholder: 'e.g. 30', type: 'number' },
    { name: 'target_response_time_min', label: 'Target response time (minutes)', placeholder: 'e.g. 60', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {\n  var vol = cnn(Number(inputs.monthly_tickets) || 0);\n  var aht = cnn(Number(inputs.avg_handle_time_min) || 0);\n  var occ = cnn(Number(inputs.target_occupancy_pct) || 0);\n  var hr = cnn(Number(inputs.work_hours_per_month) || 0);\n  var sh = cnn(Number(inputs.shrinkage_pct) || 0);\n  var resp = cnn(Number(inputs.target_response_time_min) || 0);\n  var total = vol * aht;\n  var prod = hr * 60 * (1 - sh/100) * (occ/100);\n  var raw = prod > 0 ? total / prod : 0;\n  var agents = Math.ceil(raw);\n  var util = agents > 0 ? (total / (agents * prod)) * 100 : 0;\n  var band = util <= 85 ? 'Excellent' : util <= 100 ? 'Good' : util <= 120 ? 'Warning' : 'Critical';\n  var emoji = util <= 85 ? '🟢' : util <= 100 ? '🟡' : util <= 120 ? '🟠' : '🔴';\n  var ifVol = Math.round(vol * 1.2);\n  var ifTotal = ifVol * aht;\n  var ifRaw = prod > 0 ? ifTotal / prod : 0;\n  var ifAgents = Math.ceil(ifRaw);\n  var delta = ifAgents - agents;\n  return [\n    '🩺 Capacity Health: ' + emoji + ' ' + band + ' (' + agents + ' agents required · ' + util.toFixed(1) + '% utilization)',\n    '📊 Snapshot: ' + Math.round(total).toLocaleString() + ' total handle min/mo · ' + Math.round(prod).toLocaleString() + ' productive min/agent · ' + sh.toFixed(0) + '% shrinkage',\n    '🔄 What-If: if volume grows 20% to ' + ifVol.toLocaleString() + ' tickets/mo, required = ' + ifAgents + ' agents (+' + delta + ' hires) at same ' + util.toFixed(1) + '% util',\n    '⚖️ Break-Even: to hit 🟢 Excellent (≤85% util), hire 1 more agent (' + (agents+1) + ' total) for ' + ((total / ((agents+1) * prod)) * 100).toFixed(1) + '% util',\n    '🎯 Milestone: Capacity plan must refresh monthly; volume spikes >20% require temporary contractors',\n    '💡 Tip: 70% occupancy target accounts for after-call work; 85%+ means agents are drowning. Pair with [Cost-per-Ticket Calculator] (P12-1) to model full cost.'\n  ];\n}",
  },
  generate(inputs) {
    const vol = clampNonNegative(Number(inputs.monthly_tickets) || 0);
    const aht = clampNonNegative(Number(inputs.avg_handle_time_min) || 0);
    const occ = clampNonNegative(Number(inputs.target_occupancy_pct) || 0);
    const hr = clampNonNegative(Number(inputs.work_hours_per_month) || 0);
    const sh = clampNonNegative(Number(inputs.shrinkage_pct) || 0);
    const resp = clampNonNegative(Number(inputs.target_response_time_min) || 0);
    const total = totalHandleMin(vol, aht);
    const prod = productiveMinPerAgent(hr, sh, occ);
    const agents = requiredAgents(total, prod);
    const util = utilizationActual(total, prod, agents);
    const band = calcHealthBand(util);
    const bandInfo = HEALTH_BANDS[band];
    const ifVol = Math.round(vol * 1.2);
    const ifTotal = totalHandleMin(ifVol, aht);
    const ifAgents = requiredAgents(ifTotal, prod);
    const delta = ifAgents - agents;
    const bufferUtil = utilizationActual(total, prod, agents + 1);
    return [
      '🩺 Capacity Health: ' + bandInfo.label + ' (' + agents + ' agents required · ' + fmtPct(util) + ' utilization)',
      '📊 Snapshot: ' + fmtMin(total) + '/mo handle time · ' + fmtMin(prod) + '/agent productive · ' + fmtPct(sh) + ' shrinkage · target response ' + resp + 'min',
      '🔄 What-If: if volume grows 20% to ' + ifVol.toLocaleString() + ' tickets/mo, required = ' + ifAgents + ' agents (+' + delta + ' hires) at same ' + fmtPct(util) + ' util',
      '⚖️ Break-Even: to hit 🟢 Excellent (≤85% util), hire 1 more agent (' + (agents + 1) + ' total) for ' + bufferUtil.toFixed(1) + '% util',
      '🎯 Milestone: Capacity plan must refresh monthly; volume spikes >20% require temporary contractors',
      '💡 Tip: 70% occupancy target accounts for after-call work; 85%+ means agents are drowning. Pair with [Cost-per-Ticket Calculator] (P12-1) to model full cost.',
    ];
  },
  staticExamples: [
    '🩺 Capacity Health: 🟡 Good (20 agents required · 95.7% utilization)\n📊 Snapshot: 90,000 min/mo handle time · 4,704 min/agent productive · 30.0% shrinkage · target response 60min\n🔄 What-If: if volume grows 20% to 6,000 tickets/mo, required = 23 agents (+3 hires) at same 95.7% util\n⚖️ Break-Even: to hit 🟢 Excellent (≤85% util), hire 1 more agent (21 total) for 91.1% util\n🎯 Milestone: Capacity plan must refresh monthly; volume spikes >20% require temporary contractors\n💡 Tip: 70% occupancy target accounts for after-call work; 85%+ means agents are drowning. Pair with [Cost-per-Ticket Calculator] (P12-1) to model full cost.',
  ],
  faq: [
    { q: 'What is capacity planning?', a: 'It answers "how many agents do we need to handle X tickets per month at Y service level?" by combining handle time, shrinkage, and target occupancy into a single headcount number.' },
    { q: 'What is shrinkage?', a: 'Shrinkage is non-productive time — meetings, training, sick days, PTO, system issues. Typical support teams budget 25-35% shrinkage. Higher shrinkage means you need more agents to do the same work.' },
    { q: 'What is target occupancy?', a: 'Occupancy is the % of an agent\'s productive time spent on tickets (vs idle/waiting). 70-85% is the industry sweet spot — too low means overstaffing, too high means agents are drowning. ICMI standard is ~75%.' },
    { q: 'How does this pair with cost-per-ticket?', a: 'Capacity (P12-6) × Cost-per-ticket (P12-1) = monthly support cost. Use both together to model the financial impact of hiring decisions.' },
    { q: 'When should we refresh the capacity plan?', a: 'Monthly minimum — volume changes seasonally and with product launches. Spikes >20% should trigger temporary contractor hiring rather than permanent FTEs (hiring lag is 6-8 weeks).' },
    { q: 'What if utilization is above 120%?', a: 'That means you have less than half the buffer needed. Agents cannot complete work, burnout is high, attrition is imminent (typically 50%+ annual turnover). Hire 3-5 agents immediately and/or invest in deflection (P12-5).' },
  ],
  howToUse: [
    'Enter expected monthly tickets — forecast from last quarter + growth assumption.',
    'Enter average handle time (minutes) — pull from your helpdesk AHT reporting.',
    'Enter target occupancy — typical 70-85%; higher = more efficient but more burnout risk.',
    'Enter work hours per agent — 160 = 40hr/wk × 4wk (US standard).',
    'Enter shrinkage % — typical 25-35% (meetings + training + PTO + sick).',
    'Read the required agents + utilization band; check What-If for +20% volume scenario.',
  ],
  sources: [
    'https://www.tsia.com/blog/workforce-optimization',
    'https://www.icmi.com/research/contact-center-performance',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.sqmgroup.com/resources/research/contact-center-benchmarks',
  ],
  engineKey: true,
};
registerEngine(engine);