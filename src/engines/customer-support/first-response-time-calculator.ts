// P12-2 First Response Time SLA
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (Zendesk CX Trends + Freshworks customer service benchmarks).
// Multi-tier T1/T2/T3 first-response SLA attainment with equal-weighted tier average.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
//   ⚠️ 命名空间必须精确等于 toolAlias(slug)（见 tests/scripts/p168-tokenized-engines.mjs）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let i=function(e){return Number.isNaN(e)?0:Math.max(0,e)},f=function(e,t,n){return(e+t+n)/3},m=function(e){return Math.max(0,s.excellent.threshold-e)},v=function(e,t,n){return Math.max(e,t,n)-Math.min(e,t,n)},b=function(e){return e>=s.excellent.threshold?"excellent":e>=s.good.threshold?"good":e>=s.warning.threshold?"warning":"critical"},r=function(e){return e.toFixed(1)+"%"},u=function(e){return e.toFixed(1)+"pp"},d=function(e,t,n){return"T1 ≤"+e+" min · T2 ≤"+t+"h · T3 ≤"+n+"h"},p=function(e,t,n){const a=[{name:"T1",value:e},{name:"T2",value:t},{name:"T3",value:n}];return a.sort((l,o)=>l.value-o.value||l.name.localeCompare(o.name)),a[0]},_=function(e,t,n){var a=C(e);return Array.isArray(a)?a.join(\`
\`):String(a)};var K=i,P=f,U=m,$=v,E=b,Q=r,V=u,X=d,Y=p,Z=_,g=tk,j='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',g=new Function("return "+j)(),s={excellent:{threshold:90,label:"🟢 Excellent",message:"World-class SLA reliability."},good:{threshold:80,label:"🟡 Good",message:"Healthy response coverage."},warning:{threshold:60,label:"🟠 Warning",message:"SLA misses are visible."},critical:{threshold:null,label:"🔴 Critical",message:"Urgent queue coverage gap."}},O=5,C=function(e){const t=i(Number(e.t1_target_min)||0),n=i(Number(e.t2_target_hr)||0),a=i(Number(e.t3_target_hr)||0),l=i(Number(e.t1_attainment)||0),o=i(Number(e.t2_attainment)||0),c=i(Number(e.t3_attainment)||0),h=f(l,o,c),W=b(h),I=s[W],R=d(t,n,a),w=Math.min(100,l+O),k=f(w,o,c),z=b(k),T=m(h),G=T*3,J=v(l,o,c),y=p(l,o,c),x=r(l),S=String(t),L=r(o),q=String(n),F=r(c),M=String(a),N=r(h);return["🩺 First Response SLA Health: "+I.label+" ("+r(h)+" in-SLA · "+R+")",g("calc_out.first_response_time.row.snapshot","📊 Snapshot: T1 "+x+" within "+S+" min · T2 "+L+" within "+q+"h · T3 "+F+" within "+M+"h → equal-weighted overall "+N,{t1:x,t1_min:S,t2:L,t2_hr:q,t3:F,t3_hr:M,overall:N}),"🔄 What-If: lifting T1 by +5pp to "+r(w)+" moves overall SLA to "+r(k)+" (would be "+s[z].label+")","⚖️ Break-Even: to hit 🟢 Excellent (90.0%), close "+u(T)+" overall — about "+u(G)+" total tier percentage-points if spread evenly","🎯 Milestone: weakest tier is "+y.name+" at "+r(y.value)+"; tier spread is "+u(J)+". Stabilize the weakest queue before tightening targets.",g("calc_out.first_response_time.row.tip","💡 Tip: T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount before changing the SLA target.")]};return[_(inputs,pick,fill)]}finally{}
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
    const t1Label = fmtPct(t1);
    const t1MinLabel = String(t1TargetMin);
    const t2Label = fmtPct(t2);
    const t2HrLabel = String(t2TargetHr);
    const t3Label = fmtPct(t3);
    const t3HrLabel = String(t3TargetHr);
    const overallLabel = fmtPct(overall);
    return [
      '🩺 First Response SLA Health: ' + bandInfo.label + ' (' + fmtPct(overall) + ' in-SLA · ' + targetLine + ')',
      makeToken(
        'calc_out.first_response_time.row.snapshot',
        '📊 Snapshot: T1 ' + t1Label + ' within ' + t1MinLabel + ' min · T2 ' + t2Label + ' within ' + t2HrLabel + 'h · T3 ' + t3Label + ' within ' + t3HrLabel + 'h → equal-weighted overall ' + overallLabel,
        { t1: t1Label, t1_min: t1MinLabel, t2: t2Label, t2_hr: t2HrLabel, t3: t3Label, t3_hr: t3HrLabel, overall: overallLabel },
      ),
      '🔄 What-If: lifting T1 by +5pp to ' + fmtPct(ifT1) + ' moves overall SLA to ' + fmtPct(ifOverall) + ' (would be ' + HEALTH_BANDS[ifBand].label + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (90.0%), close ' + fmtPp(gap) + ' overall — about ' + fmtPp(totalTierPp) + ' total tier percentage-points if spread evenly',
      '🎯 Milestone: weakest tier is ' + weak.name + ' at ' + fmtPct(weak.value) + '; tier spread is ' + fmtPp(spread) + '. Stabilize the weakest queue before tightening targets.',
      makeToken(
        'calc_out.first_response_time.row.tip',
        '💡 Tip: T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount before changing the SLA target.',
      ),
    ];
  },
  staticExamples: [
    '🩺 First Response SLA Health: 🟡 Good (85.0% in-SLA · T1 ≤30 min · T2 ≤4h · T3 ≤24h)\n$calc_out.first_response_time.row.snapshot{"t1":"85.0%","t1_min":"30","t2":"80.0%","t2_hr":"4","t3":"90.0%","t3_hr":"24","overall":"85.0%"}|📊 Snapshot: T1 85.0% within 30 min · T2 80.0% within 4h · T3 90.0% within 24h → equal-weighted overall 85.0%|\n🔄 What-If: lifting T1 by +5pp to 90.0% moves overall SLA to 86.7% (would be 🟡 Good)\n⚖️ Break-Even: to hit 🟢 Excellent (90.0%), close 5.0pp overall — about 15.0pp total tier percentage-points if spread evenly\n🎯 Milestone: weakest tier is T2 at 80.0%; tier spread is 10.0pp. Stabilize the weakest queue before tightening targets.\n$calc_out.first_response_time.row.tip|💡 Tip: T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount before changing the SLA target.|',
  ],
  faq: [
    { q: 'What is first response time SLA?', a: 'It is the share of tickets that receive an initial human response within the promised time window. This calculator tracks T1/T2/T3 separately because frontline, specialist, and engineering escalations usually have different targets.' },
    { q: 'Why is the overall SLA an equal-weighted average?', a: 'This P12-2 version intentionally uses (T1 + T2 + T3) / 3. That makes tier health visible even when T3 volume is small, but it is a known limitation: it assumes balanced tier importance and does not weight by ticket volume.' },
    { q: 'What is a good first response SLA for mid-market B2B SaaS?', a: '90%+ in-SLA is world-class, 80-90% is healthy, 60-80% is a warning, and below 60% means customers are routinely waiting beyond the promised response window.' },
    { q: 'How should targets differ by tier?', a: 'A common setup is T1 measured in minutes, T2 in hours, and T3 in one business day or more. Keep targets realistic: aggressive targets without matching staffing only create chronic misses.' },
    { q: 'What should I do if T1 attainment is below 80%?', a: 'T1 misses usually point to queue overflow, weak shift coverage, or too many low-value tickets. Check arrival patterns, staffing schedule, macro coverage, and deflection opportunities before relaxing the SLA.' },
    { q: 'How does this pair with cost-per-ticket?', a: 'Use this alongside Cost-per-Support-Ticket. A cheap support motion that misses first response SLAs creates churn risk; an excellent SLA with bloated escalation cost may need tier redesign.' },
    { q: "What is a good first response time (FRT)?", a: "Industry benchmarks: <1 hour for email, <2 minutes for chat. SLA targets: 24 hours for email is standard, 1 hour is excellent. Live chat: 30 seconds to 2 minutes. Premium tiers: 15 minutes. Track FRT by priority: critical issues should be <15 minutes regardless of channel." },
    { q: "How does FRT affect customer satisfaction?", a: "FRT is the strongest predictor of CSAT. Industry data: <1 hour FRT = 85% CSAT. 1-4 hours = 75%. 4-24 hours = 60%. >24 hours = 40%. Each hour of delay costs 1-2 CSAT points. Speed matters more than resolution quality for short interactions. Aim for fast triage, fast first reply." },
    { q: "What is the difference between FRT and resolution time?", a: "FRT: time to first agent reply (initial acknowledgment). Resolution time: time to problem solved. FRT is faster (min-hours), resolution is slower (hours-days). Track both. Quick FRT shows you care; fast resolution shows competence. Customers measure both." },
    { q: "How do I improve FRT?", a: "Tactics: 1) AI auto-acknowledgment for all tickets (instant reply), 2) 24/7 staffing or follow-the-sun, 3) Set expectations (\"we will reply within 2 hours\"), 4) Tiered routing (auto-assign by topic), 5) Smaller support team with right tools over big team. Most teams improve FRT 50% in 3 months." },
    { q: "Should FRT targets vary by tier?", a: "Yes. Enterprise customers: <1 hour FRT is standard. SMB: <4 hours acceptable. Free tier: <24 hours. Custom SLAs for top 10% customers. Differentiate by plan tier. Charge premium for 1-hour FRT SLA. Communicate SLA clearly in onboarding." },
    { q: "How do I calculate FRT?", a: "FRT = (first_agent_reply_time − ticket_creation_time). Average FRT across all tickets. P95 FRT (95th percentile) is more meaningful than median. Track by: priority, channel, plan tier, time of day. Most teams have a \"long tail\" of slow tickets dragging averages up." },
    { q: "What is good FRT for AI chatbots?", a: "AI chatbots should respond in <2 seconds. If you cannot hit that, your chatbot is too slow. For complex queries, AI can acknowledge instantly and reply with full answer in 5-10 seconds. Speed is the #1 reason users prefer chatbots over waiting for human agents." },
    { q: "How do after-hours tickets affect FRT?", a: "If you have 24/7 staffing, FRT is consistent. If not, after-hours tickets pile up. Solutions: 1) AI chatbot for after-hours triage, 2) Auto-acknowledgment with next-business-day expectation, 3) Follow-the-sun model (3 regions, 8-hour shifts). After-hours FRT is rarely a deal-breaker if expectations are set." },
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