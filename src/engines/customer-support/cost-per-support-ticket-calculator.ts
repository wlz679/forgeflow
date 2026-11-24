// P12-1 Cost-per-Support-Ticket
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Support Ops Benchmark + Zendesk CX Trends 2024).
// Multi-tier T1/T2/T3 architecture with weighted average cost-per-ticket.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
//   ⚠️ 命名空间必须精确等于 toolAlias(slug)（见 tests/scripts/p168-tokenized-engines.mjs）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let c=function(t){return Number.isNaN(t)?0:Math.max(0,t)},b=function(t,r,l,e,n){const s=100-e-n;return(t*e+r*n+l*s)/100},d=function(t,r){return t*r},u=function(t){return t<=a.excellent.threshold?"excellent":t<=a.good.threshold?"good":t<=a.warning.threshold?"warning":"critical"},m=function(t){return"$"+Math.round(t).toLocaleString()},o=function(t){return"$"+t.toFixed(2)},f=function(t,r,l){var e=F(t);return Array.isArray(e)?e.join(\`
\`):String(e)};var I=c,P=b,R=d,G=u,J=m,K=o,V=f,h=tk,$='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',h=new Function("return "+$)(),a={excellent:{threshold:10,label:"Excellent",message:"Lean support cost."},good:{threshold:25,label:"Good",message:"Healthy multi-tier mix."},warning:{threshold:50,label:"Warning",message:"Above-market cost."},critical:{threshold:null,label:"Critical",message:"Severely bloated cost."}},F=function(t){const r=c(Number(t.t1_cost)||0),l=c(Number(t.t2_cost)||0),e=c(Number(t.t3_cost)||0),n=c(Number(t.t1_share)||0),s=c(Number(t.t2_share)||0),T=c(Number(t.monthly_volume)||0),g=Math.max(0,100-n-s),i=b(r,l,e,n,s),_=d(i,T),j=u(i),q=a[j],k=(r*n+l*s+e*10)/100,N=u(k),L=a.excellent.threshold*100,O=r*n+l*s+e*g,W=Math.max(0,(O-L)/Math.max(g,1)),p=String(n),v=o(r),y=String(s),x=o(l),S=String(g),C=o(e),w=o(i),M=m(_);return["🩺 Cost-per-Ticket Health: "+q.label+" ("+o(i)+"/ticket · "+m(_)+"/mo)",h("calc_out.cost_per_support_ticket.row.snapshot","📊 Snapshot: T1 "+p+"% × "+v+" + T2 "+y+"% × "+x+" + T3 "+S+"% × "+C+" = "+w+" weighted · "+M+"/mo total",{t1_share:p,t1_cost:v,t2_share:y,t2_cost:x,t3_share:S,t3_cost:C,avg:w,monthly:M}),"🔄 What-If: if T3 share drops to 10%, avg drops to "+o(k)+" (would be "+a[N].label+")","⚖️ Break-Even: to hit 🟢 Excellent ("+o(a.excellent.threshold)+" ceiling), cut T3 cost to ≤$"+Math.round(W)+"/ticket OR push T3 share ≤5%","🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly",h("calc_out.cost_per_support_ticket.row.tip","💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.")]};return[f(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`,
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
    const t1Cost = clampNonNegative(Number(inputs.t1_cost) || 0);
    const t2Cost = clampNonNegative(Number(inputs.t2_cost) || 0);
    const t3Cost = clampNonNegative(Number(inputs.t3_cost) || 0);
    const t1Share = clampNonNegative(Number(inputs.t1_share) || 0);
    const t2Share = clampNonNegative(Number(inputs.t2_share) || 0);
    const monthlyVolume = clampNonNegative(Number(inputs.monthly_volume) || 0);
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
    const t1ShareLabel = String(t1Share);
    const t1CostLabel = fmtAvg(t1Cost);
    const t2ShareLabel = String(t2Share);
    const t2CostLabel = fmtAvg(t2Cost);
    const t3ShareLabel = String(t3Share);
    const t3CostLabel = fmtAvg(t3Cost);
    const avgLabel = fmtAvg(avg);
    const monthlyLabel = fmtMoney(monthly);
    return [
      '🩺 Cost-per-Ticket Health: ' + bandInfo.label + ' (' + fmtAvg(avg) + '/ticket · ' + fmtMoney(monthly) + '/mo)',
      makeToken(
        'calc_out.cost_per_support_ticket.row.snapshot',
        '📊 Snapshot: T1 ' + t1ShareLabel + '% × ' + t1CostLabel + ' + T2 ' + t2ShareLabel + '% × ' + t2CostLabel + ' + T3 ' + t3ShareLabel + '% × ' + t3CostLabel + ' = ' + avgLabel + ' weighted · ' + monthlyLabel + '/mo total',
        { t1_share: t1ShareLabel, t1_cost: t1CostLabel, t2_share: t2ShareLabel, t2_cost: t2CostLabel, t3_share: t3ShareLabel, t3_cost: t3CostLabel, avg: avgLabel, monthly: monthlyLabel },
      ),
      '🔄 What-If: if T3 share drops to 10%, avg drops to ' + fmtAvg(altAvg) + ' (would be ' + HEALTH_BANDS[altBand].label + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (' + fmtAvg(HEALTH_BANDS.excellent.threshold) + ' ceiling), cut T3 cost to ≤$' + Math.round(t3Cut) + '/ticket OR push T3 share ≤5%',
      '🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly',
      makeToken(
        'calc_out.cost_per_support_ticket.row.tip',
        '💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.',
      ),
    ];
  },
  staticExamples: [
    '🩺 Cost-per-Ticket Health: Good ($22.40/ticket · $112,000/mo)\n$calc_out.cost_per_support_ticket.row.snapshot{"t1_share":"55","t1_cost":"$8.00","t2_share":"30","t2_cost":"$25.00","t3_share":"15","t3_cost":"$70.00","avg":"$22.40","monthly":"$112,000"}|📊 Snapshot: T1 55% × $8.00 + T2 30% × $25.00 + T3 15% × $70.00 = $22.40 weighted · $112,000/mo total|\n🔄 What-If: if T3 share drops to 10%, avg drops to $18.90 (would be Good)\n⚖️ Break-Even: to hit 🟢 Excellent ($10.00 ceiling), cut T3 cost to ≤$83/ticket OR push T3 share ≤5%\n🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly\n$calc_out.cost_per_support_ticket.row.tip|💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.|',
  ],
  faq: [
    { q: 'What are T1/T2/T3 tiers?', a: 'T1 = frontline/junior agents handling common questions (password reset, basic how-to). T2 = senior specialists handling technical issues. T3 = engineering escalations requiring dev involvement. Multi-tier is industry standard — TSIA 2024 reports 87% of mid-market CS teams have ≥2 tiers.' },
    { q: 'Why is T3 cost so much higher?', a: 'T3 involves engineering time which costs $80-150/hr fully-loaded. A single T3 ticket can consume 2-5 hours of dev time vs 5-15 min for T1. Reducing T3 share by even 5pp dramatically cuts avg cost.' },
    { q: 'How do I calculate cost-per-tier?', a: 'T1: junior agent hourly rate × avg handle time + overhead. T2: senior specialist rate × handle time + overhead. T3: engineering hourly rate × handle time + opportunity cost. Sum across all tickets in the tier, divide by ticket count.' },
    { q: 'What is the TSIA 2024 benchmark?', a: 'TSIA (Technology & Services Industry Association) 2024 Support Operations Benchmark reports mid-market B2B SaaS averages $15-$25/ticket. <$10 is excellent (mature self-service); >$50 is critical (over-escalation or product issues generating tickets).' },
    { q: 'How does this pair with P12-5 Deflection?', a: 'P12-5 measures deflection rate (tickets avoided entirely via KB/chatbot). Higher deflection = fewer T1 tickets = lower weighted avg cost. Use P12-5 to model the cost impact of improving KB coverage.' },
    { q: 'Does this include CSM/account management cost?', a: 'No — this is support-only (inbound ticket handling). For CSM cost modeling (relationship management, QBRs), see retention-category calculators (P9 series).' },
    { q: "What is a good cost per support ticket?", a: "Cost per ticket varies by channel: $2-5 for self-service, $8-15 for email, $15-30 for live chat, $25-50 for phone. SaaS average: $15-20. Reducing ticket cost: invest in self-service (deflection), improve docs, AI chatbots for tier 1. Best-in-class: under $10 across all channels." },
    { q: "How do I calculate support cost per ticket in practice?", a: "Total support cost = salaries + tools + overhead + training. Divide by tickets resolved per period. Include only tickets fully resolved. For complex issues, count all touchpoints. Track by channel: email, chat, phone, social. Refresh monthly." },
    { q: "What is the impact of self-service on ticket cost?", a: "Self-service (knowledge base, chatbots, community forums) reduces ticket cost by 50-80%. A $20 ticket becomes $3-5 via deflection. Target: 30-50% of tickets deflected. Higher deflection requires: searchable KB, in-app help, AI chatbot trained on your docs." },
    { q: "Should I use AI chatbots or human agents?", a: "AI chatbots handle 60-80% of tier-1 tickets for $0.50-2/ticket vs $15-25 human cost. Use AI for: FAQs, password resets, order status, basic troubleshooting. Escalate to humans for: complex issues, complaints, refunds. Hybrid is best: AI for triage + human for resolution." },
    { q: "How do I reduce first-time resolution cost?", a: "Improving FCR (first contact resolution) reduces tickets by 20-40%. Tactics: better agent training, AI-assisted answers, knowledge base access, escalation paths. Track FCR weekly. Target: 70-80% FCR. Below 60% = need better tooling or process." },
    { q: "What is the cost of poor support quality?", a: "Poor support costs 5-10x more than fixing it: churn, refunds, negative reviews. A customer who churns due to bad support costs $200-2000 in LTV lost. Industry data: 1 in 3 customers will consider switching after one bad support experience. Track CSAT, NPS, and correlate with churn." },
    { q: "How do I forecast support cost scaling?", a: "Tickets scale roughly with user count (1-5% of users request support/month). Cost per ticket: relatively stable. Total cost = users × ticket_rate × cost_per_ticket. Plan for 20% annual efficiency gains via deflection. Headcount plan: 1 agent per 800-1500 tickets/month (email) or 2000+ (chat)." },
    { q: "What is the payback time for support automation?", a: "AI chat/voice automation: 3-6 months payback. Knowledge base: 6-12 months. Helpdesk ticketing system: 1-3 months. ROI calculation: (cost saved per deflected ticket) × (tickets deflected) − (tool cost). Aim for 3x+ ROI in year 1. Reinvest savings in proactive support." },
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
  engineKey: true,
};
registerEngine(engine);
