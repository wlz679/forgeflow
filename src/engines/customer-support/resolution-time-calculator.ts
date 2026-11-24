// P12-3 Resolution Time
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Support Ops + ICMI 2023 + SQM Group 2024).
// Tracks in-SLA attainment + tail-ratio (p90 / median) for full resolution cycle.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
//   ⚠️ 命名空间必须精确等于 toolAlias(slug)（见 tests/scripts/p168-tokenized-engines.mjs）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let o=function(t){return Number.isNaN(t)?0:Math.max(0,t)},f=function(t,e){return t<=0?0:e/t},g=function(t){return t<=1.5?"uniform":t<=3?"moderate":"heavy"},a=function(t){return t>=n.excellent.threshold?"excellent":t>=n.good.threshold?"good":t>=n.warning.threshold?"warning":"critical"},l=function(t){return t.toFixed(1)+"%"},c=function(t){return t.toFixed(1)+"hr"},r=function(t){return Math.round(t).toLocaleString()},b=function(t,e,u){var i=w(t);return Array.isArray(i)?i.join(\`
\`):String(i)};var I=o,O=f,C=g,K=a,R=l,W=c,G=r,J=b,s=tk,x='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',s=new Function("return "+x)(),n={excellent:{threshold:85,label:"🟢 Excellent",message:"Healthy full-cycle resolution — most tickets resolved within SLA, modest tail."},good:{threshold:70,label:"🟡 Good",message:"Typical mid-market performance — SLA mostly met, investigate outliers."},warning:{threshold:50,label:"🟠 Warning",message:"Below-market resolution health — many tickets miss SLA or drag on."},critical:{threshold:-1/0,label:"🔴 Critical",message:"Severe resolution backlog — systemic issue or insufficient staffing."}},w=function(t){const e=o(Number(t.sla_attainment_pct)||0),u=o(Number(t.median_resolution_hr)||0),i=o(Number(t.p90_resolution_hr)||0),d=o(Number(t.monthly_resolved)||0),h=f(u,i),F=g(h),M=a(e),S=n[M],m=Math.min(100,e+10),L=a(m),j=Math.max(0,n.excellent.threshold-e),q=Math.round(d*(100-e)/100),N=Math.round(d*(100-m)/100),p=r(d),k=c(u),v=c(i),y=h.toFixed(1),_=r(q);return["🩺 Resolution Health: "+S.label+" ("+l(e)+" in-SLA · tail ratio "+h.toFixed(1)+"x "+F+")",s("calc_out.resolution_time.row.snapshot","📊 Snapshot: "+p+" resolved/mo · median "+k+" · p90 "+v+" · tail "+y+"x → "+_+" tickets missed SLA",{vol:p,med:k,p90:v,tail:y,missed:_}),"🔄 What-If: if attainment climbs to "+l(m)+" (+10pp), band moves to "+n[L].label+" and ~"+r(N)+" tickets would still miss","⚖️ Break-Even: to hit 🟢 Excellent (≥85%), need +"+j.toFixed(1)+"pp attainment — investigate the tier with the highest tail ratio","🎯 Milestone: tail ratio >5x signals systemic issue — escalations, missing knowledge base, or product gaps. Re-benchmark quarterly.",s("calc_out.resolution_time.row.tip","💡 Tip: Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers — they usually expose KB content gaps or escalation bottlenecks.")]};return[b(inputs,pick,fill)]}finally{}
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
    const volLabel = fmtMoney(vol);
    const medLabel = fmtHr(med);
    const p90Label = fmtHr(p90);
    const tailLabel = tail.toFixed(1);
    const missedLabel = fmtMoney(missed);
    return [
      '🩺 Resolution Health: ' + bandInfo.label + ' (' + fmtPct(sla) + ' in-SLA · tail ratio ' + tail.toFixed(1) + 'x ' + tailBand + ')',
      makeToken(
        'calc_out.resolution_time.row.snapshot',
        '📊 Snapshot: ' + volLabel + ' resolved/mo · median ' + medLabel + ' · p90 ' + p90Label + ' · tail ' + tailLabel + 'x → ' + missedLabel + ' tickets missed SLA',
        { vol: volLabel, med: medLabel, p90: p90Label, tail: tailLabel, missed: missedLabel },
      ),
      '🔄 What-If: if attainment climbs to ' + fmtPct(ifSla) + ' (+10pp), band moves to ' + HEALTH_BANDS[ifBand].label + ' and ~' + fmtMoney(ifMissed) + ' tickets would still miss',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥85%), need +' + gap.toFixed(1) + 'pp attainment — investigate the tier with the highest tail ratio',
      '🎯 Milestone: tail ratio >5x signals systemic issue — escalations, missing knowledge base, or product gaps. Re-benchmark quarterly.',
      makeToken(
        'calc_out.resolution_time.row.tip',
        '💡 Tip: Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers — they usually expose KB content gaps or escalation bottlenecks.',
      ),
    ];
  },
  staticExamples: [
    '🩺 Resolution Health: 🟡 Good (75.0% in-SLA · tail ratio 4.5x heavy)\n$calc_out.resolution_time.row.snapshot{"vol":"4,800","med":"8.0hr","p90":"36.0hr","tail":"4.5","missed":"1,200"}|📊 Snapshot: 4,800 resolved/mo · median 8.0hr · p90 36.0hr · tail 4.5x → 1,200 tickets missed SLA|\n🔄 What-If: if attainment climbs to 85.0% (+10pp), band moves to 🟢 Excellent and ~720 tickets would still miss\n⚖️ Break-Even: to hit 🟢 Excellent (≥85%), need +10.0pp attainment — investigate the tier with the highest tail ratio\n🎯 Milestone: tail ratio >5x signals systemic issue — escalations, missing knowledge base, or product gaps. Re-benchmark quarterly.\n$calc_out.resolution_time.row.tip|💡 Tip: Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers — they usually expose KB content gaps or escalation bottlenecks.|',
  ],
  faq: [
    { q: 'What is in-SLA resolution attainment?', a: 'It is the share of tickets that are fully resolved within their promised resolution time window — distinct from first response SLA, which only counts the initial reply.' },
    { q: 'What is tail ratio?', a: 'Tail ratio = p90 resolution time / median resolution time. A value of 1.0 means every ticket resolves in roughly the same time (uniform). A value above 3.0 means a heavy tail — a small share of tickets drag on for much longer than typical.' },
    { q: 'Why track tail ratio separately from SLA attainment?', a: 'You can have 90% SLA attainment with a tail ratio of 10x — that 10% that miss SLA drags on for days. Tail ratio reveals outliers that the SLA % hides.' },
    { q: 'What is a good tail ratio?', a: '≤1.5 is uniform (rarely achievable for B2B SaaS). 1.5-3.0 is moderate — typical healthy operation. Above 3.0 is heavy tail; above 5.0 is a systemic issue requiring investigation.' },
    { q: 'How does this pair with first-response SLA?', a: 'P12-2 measures first-response time (initial reply). P12-3 measures full-resolution time (ticket closed). Track both together — fast FRT with slow resolution can mean agents close prematurely.' },
    { q: 'What should I do if tail ratio is above 5x?', a: 'Investigate the slowest 10% of tickets manually. Common causes: missing KB content (tickets waiting on specialist triage), escalation bottlenecks (T3 engineering queue), or product gaps (no workaround for known issue).' },
    { q: "What is a good resolution time for SaaS support?", a: "Benchmarks: tier 1 (basic): 4-8 hours. Tier 2 (technical): 24-48 hours. Tier 3 (engineering): 1-2 weeks. Enterprise: 4-8 hours. Time-to-resolution by priority: critical <2 hours, high <24 hours, medium <3 days, low <1 week. Track by tier, not just average." },
    { q: "How do I reduce resolution time without sacrificing quality?", a: "Tactics: 1) Better knowledge base and AI-assisted answers, 2) Tiered escalation (L1 → L2 → L3), 3) Internal collaboration tools (Slack, ticket comments), 4) Pre-defined response templates, 5) Macros for common issues. Most teams see 30-50% reduction in 6 months." },
    { q: "What is the difference between resolution time and FRT?", a: "FRT (first response time): when agent first replies. Resolution time: when problem is fully solved. FRT is leading indicator; resolution time is the real customer outcome. Long FRT = bad first impression. Long resolution = churn risk. Track both weekly." },
    { q: "When should I escalate a ticket?", a: "Escalate when: 1) Beyond L1 agent expertise, 2) Customer asks for manager, 3) Issue affects multiple customers, 4) Engineering involvement needed, 5) Resolution will take >24 hours. Set clear escalation criteria. Track escalation rate. Healthy: 10-20% of tickets escalated to L2/L3." },
    { q: "How do I track resolution time accurately?", a: "Resolution time = (last_status_change_to_resolved − ticket_creation). Use status changes, not just final reply. P95 is more meaningful than average. Track by: issue type, customer tier, agent. Group by \"what type of issue takes longest?\" — those are your product improvement opportunities." },
    { q: "What is the impact of resolution time on retention?", a: "Fast resolution is the top driver of retention. Customers who get their issue resolved in <24 hours maintain 95%+ retention. 24-72 hours: 80% retention. >1 week: 50% retention. >2 weeks: 20% retention. Resolution time is a leading indicator of churn 3-6 months out." },
    { q: "Should I have a 24/7 support team?", a: "24/7 is needed if: 1) Global customer base, 2) High-value enterprise customers, 3) Mission-critical product (infrastructure, security). Otherwise: business hours + AI chatbot for off-hours covers most cases. Cost of 24/7: 3-4x of business hours team. Only worth it for premium tiers." },
    { q: "How do I handle tickets that depend on engineering?", a: "Set expectations: \"This requires engineering, typical timeline 1-2 weeks.\" Communicate weekly until resolution. Use a \"triage queue\" to convert tickets to engineering tickets with clear specs. Track engineering-tied tickets separately. Goal: keep customer informed, even if not resolved." },
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
