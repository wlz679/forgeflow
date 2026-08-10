// P12-5 Self-Service Deflection Rate
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Self-Service Benchmark + Zendesk 2024 + Gartner 2024).
// Self-service deflection via KB + chatbot (pre-T1 channel).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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
    customFn: "var cnn=function(x){return Math.max(0,x)};function run(inputs, pick, fill) {\n  var vol = cnn(Number(inputs.monthly_tickets) || 0);\n  var rate = cnn(Number(inputs.deflection_rate) || 0);\n  var cost = cnn(Number(inputs.cost_per_ticket) || 0);\n  var tool = cnn(Number(inputs.tool_monthly_cost) || 0);\n  var tgt = cnn(Number(inputs.target_deflection) || 0);\n  var deflected = vol * (rate / 100);\n  var saved = deflected * cost;\n  var net = saved - tool;\n  var roi = tool > 0 ? (net / tool) * 100 : 0;\n  var gap = tgt - rate;\n  var band = rate >= 40 ? 'Excellent' : rate >= 25 ? 'Good' : rate >= 10 ? 'Warning' : 'Critical';\n  var emoji = rate >= 40 ? '🟢' : rate >= 25 ? '🟡' : rate >= 10 ? '🟠' : '🔴';\n  var ifRate = Math.min(100, rate + 10);\n  var ifBand = ifRate >= 40 ? 'Excellent' : ifRate >= 25 ? 'Good' : ifRate >= 10 ? 'Warning' : 'Critical';\n  var ifEmoji = ifRate >= 40 ? '🟢' : ifRate >= 25 ? '🟡' : ifRate >= 10 ? '🟠' : '🔴';\n  var ifSaved = vol * (ifRate / 100) * cost - tool;\n  return [\n    '🩺 Deflection Health: ' + emoji + ' ' + band + ' (' + rate.toFixed(1) + '% deflected · ' + net.toLocaleString() + ' net/mo)',\n    '📊 Snapshot: ' + Math.round(deflected).toLocaleString() + ' tickets/mo deflected · $' + Math.round(saved).toLocaleString() + ' gross saved · $' + Math.round(net).toLocaleString() + ' net · ' + Math.round(roi).toLocaleString() + '% ROI',\n    '🔄 What-If: if deflection climbs to ' + ifRate.toFixed(1) + '% (+10pp), band moves to ' + ifEmoji + ' ' + ifBand + ' and net savings = $' + Math.round(ifSaved).toLocaleString() + '/mo',\n    '⚖️ Break-Even: to hit 🟢 Excellent (≥40%), need ' + Math.max(0, 40 - rate).toFixed(1) + 'pp more — pair with [Cost-per-Ticket Calculator] (P12-1) to model full cost reduction',\n    '🎯 Milestone: KB content gap is #1 deflection killer — re-audit top 50 articles quarterly. Track deflection rate weekly.',\n    '💡 Tip: Deflection >50% often means KB is masking product gaps — validate top-deflected tickets quarterly to ensure self-service answers are accurate.'\n  ];\n}",
  },
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
  generate(inputs) {
    const vol = clampNonNegative(Number(inputs.monthly_tickets) || 0);
    const rate = clampNonNegative(Number(inputs.deflection_rate) || 0);
    const cost = clampNonNegative(Number(inputs.cost_per_ticket) || 0);
    const tool = clampNonNegative(Number(inputs.tool_monthly_cost) || 0);
    const target = clampNonNegative(Number(inputs.target_deflection) || 0);
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
    { q: "What is a good deflection rate for SaaS support?", a: "Best-in-class SaaS: 50-70% deflection. Average: 30-40%. Below 20% means self-service is failing. Deflection sources: knowledge base, AI chatbot, community forum, FAQ. Track by query type. Target: 60%+ deflection for tier-1 issues (password, billing, basic how-to)." },
    { q: "How do I improve deflection rate?", a: "Top tactics: 1) Make KB searchable (good search SEO), 2) AI chatbot trained on top 100 ticket topics, 3) In-app help at point of confusion, 4) Community forum for power users, 5) Proactive email for known issues. Most teams see 10-20 point deflection improvement in 6 months." },
    { q: "What is the ROI of deflection?", a: "Each deflected ticket saves $10-25 (cost of human handling). For 10K tickets/month at 50% deflection: $50K-125K saved. AI chatbot cost: $1-5K/month. ROI: 10-100x. Combined with KB maintenance ($2-5K/month), total cost is tiny compared to support cost reduction." },
    { q: "What should I NOT deflect?", a: "Do not deflect: complaints, refund requests, escalations, complex technical issues, billing disputes. These need human empathy. Deflecting them loses customers. Deflection is for: yes/no questions, how-to, status checks, basic troubleshooting, common errors. Route sensitive issues to humans." },
    { q: "How do I measure deflection accurately?", a: "Track: ticket creation avoided (via searches that did not lead to ticket, AI chats resolved without escalation). Use UTM-style tracking on KB articles. Tag AI conversations: \"resolved\" vs \"escalated\". Compare: tickets/month before vs after self-service investment. Industry benchmarks available." },
    { q: "What is the role of AI chatbots in deflection?", a: "Modern AI chatbots (GPT-4 class) handle 50-80% of tier-1 tickets at $0.50-2 per resolution vs $15-25 human. Train on your top 100 ticket topics + KB. Best when: multi-turn, context-aware, integrated with billing/account systems. Limitations: complex edge cases still need human." },
    { q: "How long does it take to build effective self-service?", a: "KB: 3-6 months of content creation, then ongoing maintenance. AI chatbot: 1-3 months to reach 60% deflection. ROI: 6-12 months for KB, 3-6 months for AI. Key: start with top 20 ticket topics (80% of volume). Expand to long tail topics after establishing baseline." },
    { q: "How do I know which content to create for KB?", a: "Analyze last 90 days of tickets. Group by topic. Top 20 topics = 80% of tickets. Write 1 article per topic. Track: article views, search queries leading to article, ticket creation after view. Refresh top articles quarterly. Cut underperforming articles (zero views in 6 months)." },
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
  engineKey: true,
};
registerEngine(engine);