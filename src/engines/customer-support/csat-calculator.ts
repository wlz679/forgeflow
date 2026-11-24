// P12-4 CSAT (Customer Satisfaction)
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (CustomerGauge 2024 + Gainsight CS Benchmarks + Zendesk CX 2024).
// 95% CI margin of error formula: z=1.96, p*(1-p)/n.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
//   ⚠️ 命名空间必须精确等于 toolAlias(slug)（见 tests/scripts/p168-tokenized-engines.mjs）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let o=function(t){return Number.isNaN(t)?0:Math.max(0,t)},c=function(t,e){if(e<=0)return 1/0;const n=t/100;return 1.96*Math.sqrt(n*(1-n)/e)*100},h=function(t,e){const n=c(t,e);return{low:t-n,high:t+n}},u=function(t,e){return t-e},l=function(t){return t>=a.excellent.threshold?"excellent":t>=a.good.threshold?"good":t>=a.warning.threshold?"warning":"critical"},i=function(t){return t.toFixed(1)+"%"},f=function(t){return Math.round(t).toLocaleString()},m=function(t,e,n){var r=N(t);return Array.isArray(r)?r.join(\`
\`):String(r)};var W=o,I=c,z=h,G=u,K=l,L=i,$=f,P=m,p=tk,w='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',p=new Function("return "+w)(),a={excellent:{threshold:90,label:"🟢 Excellent",message:"World-class CSAT — customers consistently rate interactions positively."},good:{threshold:80,label:"🟡 Good",message:"Healthy CSAT — typical mid-market SaaS benchmark (80-90%)."},warning:{threshold:70,label:"🟠 Warning",message:"Below-market CSAT — investigate common friction points (FRT, resolution time)."},critical:{threshold:null,label:"🔴 Critical",message:"Severe CSAT problem — escalation to Head-of-CS and product investigation required."}},N=function(t){const e=o(Number(t.csat_pct)||0),n=o(Number(t.response_rate)||0),r=o(Number(t.sample_size)||0),g=o(Number(t.target_csat)||0),b=c(e,r),x=h(e,r),F=u(e,g),O=l(e),J=a[O],d=Math.min(100,e+3),M=l(d),R=c(d,r),T=F>=0?"+":"",q=n<20?" · ⚠️ Response rate <20% = biased sample":"",s={csat:e.toFixed(1),target:g.toFixed(1),responseRate:n.toFixed(1),sampleSize:r.toFixed(0),margin:(r>0?b:0).toFixed(1)},j=n<20?JSON.stringify({code:"csat_biased_sample",params:s}):e>=a.excellent.threshold?JSON.stringify({code:"csat_excellent",params:s}):e>=a.good.threshold?JSON.stringify({code:"csat_good",params:s}):e>=a.warning.threshold?JSON.stringify({code:"csat_warning",params:s}):JSON.stringify({code:"csat_critical",params:s}),S=f(r),y=x.low.toFixed(1),k=x.high.toFixed(1),v=i(g),C=T+F.toFixed(1),_=q;return["🩺 CSAT Health: "+J.label+" ("+i(e)+" CSAT · "+b.toFixed(1)+"pp margin · "+i(n)+" response rate)",p("calc_out.csat.row.snapshot","📊 Snapshot: "+S+" responses · 95% CI ["+y+"%, "+k+"%] · target "+v+" · gap "+C+"pp"+_,{n:S,low:y,high:k,target:v,gap:C,rr_warning:_}),"🔄 What-If: if CSAT climbs to "+i(d)+" (+3pp), band moves to "+a[M].label+" and margin tightens to "+R.toFixed(1)+"pp","⚖️ Break-Even: to hit 🟢 Excellent (≥90%), need "+Math.max(0,90-e).toFixed(1)+"pp more — pair with [Resolution Time Calculator] (P12-3) since FRT + resolution drive CSAT","🎯 Milestone: CSAT is the leading indicator of NRR — track weekly; >5pp drop = escalate to Head-of-CS","💡 Tip: "+j]};return[m(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`,
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
    // P168 B3-4：💡 Tip 改成**语义码**（分支条件 = 下面 Health 那套 band 边界 + 响应率 20% 阈值，
    //   不引入第二套阈值）⇒ 模板在 locale 的 decision_tip.<code> 里，动态层随输入变。
    const tipParams = {
      csat: csat.toFixed(1),
      target: target.toFixed(1),
      responseRate: rr.toFixed(1),
      sampleSize: n.toFixed(0),
      margin: (n > 0 ? m : 0).toFixed(1),
    };
    const tipJson =
      rr < 20
        ? JSON.stringify({ code: 'csat_biased_sample', params: tipParams })
        : csat >= HEALTH_BANDS.excellent.threshold
        ? JSON.stringify({ code: 'csat_excellent', params: tipParams })
        : csat >= HEALTH_BANDS.good.threshold
        ? JSON.stringify({ code: 'csat_good', params: tipParams })
        : csat >= HEALTH_BANDS.warning.threshold
        ? JSON.stringify({ code: 'csat_warning', params: tipParams })
        : JSON.stringify({ code: 'csat_critical', params: tipParams });
    const nLabel = fmtMoney(n);
    const ciLowLabel = ci.low.toFixed(1);
    const ciHighLabel = ci.high.toFixed(1);
    const targetLabel = fmtPct(target);
    const gapLabel = gapSign + gap.toFixed(1);
    const rrWarningLabel = rrWarning;
    return [
      '🩺 CSAT Health: ' + bandInfo.label + ' (' + fmtPct(csat) + ' CSAT · ' + m.toFixed(1) + 'pp margin · ' + fmtPct(rr) + ' response rate)',
      makeToken(
        'calc_out.csat.row.snapshot',
        '📊 Snapshot: ' + nLabel + ' responses · 95% CI [' + ciLowLabel + '%, ' + ciHighLabel + '%] · target ' + targetLabel + ' · gap ' + gapLabel + 'pp' + rrWarningLabel,
        { n: nLabel, low: ciLowLabel, high: ciHighLabel, target: targetLabel, gap: gapLabel, rr_warning: rrWarningLabel },
      ),
      '🔄 What-If: if CSAT climbs to ' + fmtPct(ifCsat) + ' (+3pp), band moves to ' + HEALTH_BANDS[ifBand].label + ' and margin tightens to ' + ifM.toFixed(1) + 'pp',
      '⚖️ Break-Even: to hit 🟢 Excellent (≥90%), need ' + Math.max(0, 90 - csat).toFixed(1) + 'pp more — pair with [Resolution Time Calculator] (P12-3) since FRT + resolution drive CSAT',
      '🎯 Milestone: CSAT is the leading indicator of NRR — track weekly; >5pp drop = escalate to Head-of-CS',
      '💡 Tip: ' + tipJson,
    ];
  },
  staticExamples: [
    '🩺 CSAT Health: 🟡 Good (87.0% CSAT · 4.7pp margin · 35.0% response rate)\n$calc_out.csat.row.snapshot{"n":"200","low":"82.3","high":"91.7","target":"90.0%","gap":"-3.0","rr_warning":""}|📊 Snapshot: 200 responses · 95% CI [82.3%, 91.7%] · target 90.0% · gap -3.0pp|\n🔄 What-If: if CSAT climbs to 90.0% (+3pp), band moves to 🟢 Excellent and margin tightens to 4.2pp\n⚖️ Break-Even: to hit 🟢 Excellent (≥90%), need 3.0pp more — pair with [Resolution Time Calculator] (P12-3) since FRT + resolution drive CSAT\n🎯 Milestone: CSAT is the leading indicator of NRR — track weekly; >5pp drop = escalate to Head-of-CS\n💡 Tip: {"code":"csat_good","params":{"csat":"87.0","target":"90.0","responseRate":"35.0","sampleSize":"200","margin":"4.7"}}',
  ],
  faq: [
    { q: 'What is CSAT?', a: 'CSAT (Customer Satisfaction Score) is the percentage of customers who rate their support interaction positively (typically 4 or 5 on a 5-point scale). It is a per-interaction metric — distinct from NPS, which measures relationship.' },
    { q: 'What does the margin of error mean?', a: 'The 95% confidence interval (CI) shows the range your true CSAT likely falls within. At 87% CSAT with 200 responses, the margin is ~4.7pp — meaning the true value is between 82.3% and 91.7% with 95% confidence.' },
    { q: 'Why does response rate matter?', a: 'Below 20% response rate, the sample is biased — only the most satisfied OR most frustrated customers respond. A 90% CSAT at 10% response rate is misleading; aim for ≥30% response rate for a representative signal.' },
    { q: 'How does CSAT pair with FRT and resolution time?', a: 'CSAT is downstream — fast first response + fast resolution drive higher CSAT. Use P12-2 (FRT SLA) and P12-3 (resolution time) as leading indicators of CSAT drops.' },
    { q: 'What is a good CSAT for mid-market B2B SaaS?', a: '≥90% is world-class, 80-90% is typical mid-market, 70-80% is a warning, <70% is critical. CustomerGauge 2024 reports B2B SaaS median around 82%.' },
    { q: 'Should I track CSAT per tier?', a: 'Yes — T1/T2/T3 CSAT often diverge significantly. T3 (engineering) interactions usually have lower CSAT due to longer resolution times. Track per tier to identify specific improvement areas.' },
    { q: "What is a good CSAT score for SaaS?", a: "Industry benchmarks: 80-85% is good, 85%+ is excellent. Below 70% indicates systemic issues. Track CSAT by: ticket type, agent, channel, customer segment. Best-in-class SaaS: 90%+. Customer expectations rose post-2020; aim for 5-10 points above your industry average." },
    { q: "How do I collect CSAT without annoying customers?", a: "Send CSAT survey immediately after ticket resolution (in-app or email). Keep it to 1 question (5-star or thumbs up/down). Response rate: 20-40% if in-app, 5-15% if email. Add optional follow-up question for context. Avoid: long surveys, daily prompts, post-purchase before support." },
    { q: "What is the difference between CSAT and NPS?", a: "CSAT: measures satisfaction with a specific interaction (ticket, call, product). NPS: measures overall brand loyalty (would you recommend?). Use CSAT for: agent performance, ticket trends. Use NPS for: overall health, churn prediction. Best practice: collect both. CSAT is leading, NPS is lagging." },
    { q: "How do I respond to negative CSAT feedback?", a: "Reply within 24 hours. Acknowledge, apologize, ask for more detail. Offer to make it right. Document the issue. Common fixes: refund, credit, escalation, fix the root cause. Follow up in 1-2 weeks to confirm satisfaction. Track resolution rate. Aim: 80%+ of negative feedback resolved." },
    { q: "What sample size do I need for CSAT to be meaningful?", a: "Minimum 50-100 responses per period for statistical significance. For less-traffic channels: 30-day rolling window. Segment by: plan tier, customer size, ticket type. Smaller samples work if you focus on trends, not absolute scores. Compare period-over-period, not against target." },
    { q: "How do I improve CSAT quickly?", a: "Top 5 quick wins: 1) Reduce wait time (target <2 min), 2) Improve agent training (empathy, technical depth), 3) Use AI for quick initial response, 4) Better knowledge base access, 5) Follow-up after resolution. Most teams see 5-10 point CSAT improvement in 2-3 months from these." },
    { q: "How is CSAT correlated with churn?", a: "CSAT is a leading indicator of churn. Customers with 1-2 star ratings churn 5-10x faster than 5-star. Track CSAT trend by cohort. A 5-point CSAT drop typically precedes 2-5% churn increase 6 months later. Use CSAT data to identify at-risk customers for proactive outreach." },
    { q: "Should I ask CSAT after every interaction?", a: "For support tickets: yes (after resolution). For product usage: only after key milestones (first purchase, feature adoption). Avoid after every click, every login, every page view. Saturation destroys response rates. Best option: 1-2 surveys per customer per month, rotated to avoid fatigue." },
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
  engineKey: true,
  // P140f-p3-T2: 完整 6 字段 playbook (per P140f §4.3 + ADR-0001)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  // 内容镜像 Phase 1 csat 🧭 Decision Recommendation 4 子段 + ADR-0001 决策逻辑
  playbook: {
    goal: '用户该不该把 CSAT 当成留存的先行指标去追，还是先修回复率与客户分群',
    input: 'csat_pct (0-100) + response_rate (0-100) + sample_size (≥0) + target_csat (0-100)',
    output: '健康带 🟢≥90 / 🟡80-90 / 🟠70-80 / 🔴<70 + 95% CI 边界 + 响应率偏差警告',

    constraint: '样本 < 100 视为低置信; 响应率 < 20% 视为有偏样本; CSAT 是滞后指标',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'CustomerGauge 2024 + Gainsight CS Benchmarks + Zendesk CX 2024',
  },
};
registerEngine(engine);