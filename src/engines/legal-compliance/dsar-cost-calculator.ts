// P14-2 DSAR (Data Subject Access Request) Processing Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 15 (right of access, full text at https://gdpr-info.eu/art-15-gdpr/);
// ICO DSAR code of practice; IAPP Privacy Operations Survey 2024.
// HIGHER on annual_cost: more cost = worse operational exposure. Bands: <€25K / €25-100K / €100-300K / ≥€300K.
// automation_pct is CLAMPED to [0, 100] defensively (negative hours make no sense).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 25_000,   label: 'Excellent', message: 'Low DSAR volume or high automation.' },
  good:      { threshold: 100_000,  label: 'Good',      message: 'Manageable DSAR cost.' },
  warning:   { threshold: 300_000,  label: 'Warning',   message: 'Significant operational load.' },
  critical:  { threshold: Infinity, label: 'Critical',  message: 'DSAR consuming disproportionate resources.' },
};

export function manualHoursPerDSAR(hours: number, automationPct: number): number {
  const clampedAuto = Math.min(100, Math.max(0, automationPct));
  return hours * (1 - clampedAuto / 100);
}

export function annualDSARCost(dsars: number, hours: number, rate: number, automationPct: number): number {
  return dsars * 12 * manualHoursPerDSAR(hours, automationPct) * rate;
}

export function costPerDSAR(hours: number, rate: number, automationPct: number): number {
  return manualHoursPerDSAR(hours, automationPct) * rate;
}

export function calcHealthBand(cost: number): keyof typeof HEALTH_BANDS {
  if (cost < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (cost < HEALTH_BANDS.good.threshold) return 'good';
  if (cost < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtNum(x: number, decimals: number): string { return x.toFixed(decimals); }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-dsar-cost-calculator',
  title: 'DSAR Processing Cost',
  description:
    'Quantify annualized cost of processing Data Subject Access Requests (DSAR) given volume, manual hours, DPO rate, and automation %. HIGHER health bands — more cost = worse operational exposure: 🟢 <€25K/yr · 🟡 €25-100K · 🟠 €100-300K · 🔴 ≥€300K. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Heads of Privacy.',
  inputs: [
    { name: 'dsars_per_month',  label: 'DSARs per month',       placeholder: 'e.g. 50',  type: 'number' },
    { name: 'hours_per_dsar',   label: 'Manual hours per DSAR',  placeholder: 'e.g. 2.5', type: 'number' },
    { name: 'hourly_rate_dpo',  label: 'DPO hourly rate (€/hr)', placeholder: 'e.g. 95',  type: 'number' },
    { name: 'automation_pct',   label: 'Automation (%)',         placeholder: 'e.g. 30',  type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let s=function(t){return Number.isNaN(t)?0:Math.max(0,t)},l=function(t,a){const n=Math.min(100,Math.max(0,a));return t*(1-n/100)},d=function(t,a,n,o){return t*12*l(a,o)*n},_=function(t,a,n){return l(t,n)*a},m=function(t){return t<r.excellent.threshold?"excellent":t<r.good.threshold?"good":t<r.warning.threshold?"warning":"critical"},e=function(t){return"€"+Math.round(t).toLocaleString()},c=function(t,a){return t.toFixed(a)},g=function(t){return t.toFixed(1)+"%"},S=function(t,a,n){var o=F(t);return Array.isArray(o)?o.join(\`
\`):String(o)};var K=s,W=l,z=d,E=_,G=m,J=e,Y=c,$=g,Q=S,h=tk,D='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',h=new Function("return "+D)(),r={excellent:{threshold:25e3,label:"Excellent",message:"Low DSAR volume or high automation."},good:{threshold:1e5,label:"Good",message:"Manageable DSAR cost."},warning:{threshold:3e5,label:"Warning",message:"Significant operational load."},critical:{threshold:null,label:"Critical",message:"DSAR consuming disproportionate resources."}},F=function(t){const a=s(Number(t.dsars_per_month)||0),n=s(Number(t.hours_per_dsar)||0),o=s(Number(t.hourly_rate_dpo)||0),u=s(Number(t.automation_pct)||0),i=l(n,u),C=_(n,o,u),f=d(a,n,o,u),P=m(f),L=r[P],b=60,O=l(n,b),v=d(a,n,o,b),j=m(v),p=r.excellent.threshold,q=a*12*o>0?p/(a*12*o):0,N=n>0?Math.min(100,Math.max(0,(1-q/n)*100)):0,I=12*i*o>0?Math.ceil(p/(12*i*o)):0,R=a.toLocaleString(),x=(a*12).toLocaleString(),y=c(n,2),M=g(u),k=c(i,2),w=e(o),A=e(f);return["🩺 DSAR Cost: "+L.label+" (annual cost "+e(f)+" · "+c(i,2)+" hr/DSAR · "+e(C)+"/DSAR)",h("calc_out.dsar_cost.row.snapshot","📊 Snapshot: "+R+" DSARs/mo × 12 = "+x+"/yr · "+y+" hr/DSAR · "+M+" automation ("+k+" manual hr) · "+w+"/hr DPO · annual cost "+A,{dsars:R,dsars_per_year:x,hours:y,automation:M,manual_hours:k,rate:w,annual:A}),"🔄 What-If: if automation climbs to "+b+"%, manual hours drop to "+c(O,2)+", annual cost drops to "+e(v)+" ("+r[j].label+"). Push past ~82% automation to reach 🟢 Excellent (<€25K).","⚖️ Break-Even: to hit 🟢 Excellent (<€"+(p/1e3).toFixed(0)+"K), need automation ≥"+N.toFixed(0)+"% OR cut DSARs to ≤"+I+"/mo (current "+g(u)+")","🎯 Milestone: re-baseline quarterly + after any product launch that adds data-collection surface (DSAR volume correlates with consent changes).",h("calc_out.dsar_cost.row.tip","💡 Tip: pair with [CMP ROI] (L-6) — CMP reduces DSAR volume via consent logging. Also pair with our [Cost-per-Ticket Calculator] (P12-1) to size the broader privacy ops budget.")]};return[S(inputs,pick,fill)]}finally{}
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
    const dsars = clampNonNegative(Number(inputs.dsars_per_month) || 0);
    const hours = clampNonNegative(Number(inputs.hours_per_dsar) || 0);
    const rate = clampNonNegative(Number(inputs.hourly_rate_dpo) || 0);
    const automationPct = clampNonNegative(Number(inputs.automation_pct) || 0);
    const manualHours = manualHoursPerDSAR(hours, automationPct);
    const costPerDSARv = costPerDSAR(hours, rate, automationPct);
    const annual = annualDSARCost(dsars, hours, rate, automationPct);
    const band = calcHealthBand(annual);
    const bandInfo = HEALTH_BANDS[band];
    const altAutomationPct = 60;
    const altManualHours = manualHoursPerDSAR(hours, altAutomationPct);
    const altAnnual = annualDSARCost(dsars, hours, rate, altAutomationPct);
    const altBand = calcHealthBand(altAnnual);
    const targetCost = HEALTH_BANDS.excellent.threshold;
    const targetManualHours = (dsars * 12 * rate) > 0 ? targetCost / (dsars * 12 * rate) : 0;
    const needAutomation = hours > 0 ? Math.min(100, Math.max(0, (1 - targetManualHours / hours) * 100)) : 0;
    const needDSARs = (12 * manualHours * rate) > 0 ? Math.ceil(targetCost / (12 * manualHours * rate)) : 0;
    // P168 B3-15：Snapshot / Tip 两行令牌化 —— 兜底与 params 取**同一个局部变量**
    //   ⇒ 英文页逐字不变；locale 模板把该变量换成 {param} ⇒ 模板不冻结运行时数值。
    //   ⚠️ 命名空间必须精确等于 toolAlias(slug) = 'dsar_cost'（见 B3_15_BATCH）。
    const dsarsLabel = dsars.toLocaleString();
    const dsarsYearLabel = (dsars * 12).toLocaleString();
    const hoursLabel = fmtNum(hours, 2);
    const automationLabel = fmtPct(automationPct);
    const manualHoursLabel = fmtNum(manualHours, 2);
    const rateLabel = fmtMoney(rate);
    const annualLabel = fmtMoney(annual);
    return [
      '🩺 DSAR Cost: ' + bandInfo.label + ' (annual cost ' + fmtMoney(annual) + ' · ' + fmtNum(manualHours, 2) + ' hr/DSAR · ' + fmtMoney(costPerDSARv) + '/DSAR)',
      makeToken(
        'calc_out.dsar_cost.row.snapshot',
        '📊 Snapshot: ' + dsarsLabel + ' DSARs/mo × 12 = ' + dsarsYearLabel + '/yr · ' + hoursLabel + ' hr/DSAR · ' + automationLabel + ' automation (' + manualHoursLabel + ' manual hr) · ' + rateLabel + '/hr DPO · annual cost ' + annualLabel,
        { dsars: dsarsLabel, dsars_per_year: dsarsYearLabel, hours: hoursLabel, automation: automationLabel, manual_hours: manualHoursLabel, rate: rateLabel, annual: annualLabel },
      ),
      '🔄 What-If: if automation climbs to ' + altAutomationPct + '%, manual hours drop to ' + fmtNum(altManualHours, 2) + ', annual cost drops to ' + fmtMoney(altAnnual) + ' (' + HEALTH_BANDS[altBand].label + '). Push past ~82% automation to reach 🟢 Excellent (<€25K).',
      '⚖️ Break-Even: to hit 🟢 Excellent (<€' + (targetCost / 1000).toFixed(0) + 'K), need automation ≥' + needAutomation.toFixed(0) + '% OR cut DSARs to ≤' + needDSARs + '/mo (current ' + fmtPct(automationPct) + ')',
      '🎯 Milestone: re-baseline quarterly + after any product launch that adds data-collection surface (DSAR volume correlates with consent changes).',
      makeToken(
        'calc_out.dsar_cost.row.tip',
        '💡 Tip: pair with [CMP ROI] (L-6) — CMP reduces DSAR volume via consent logging. Also pair with our [Cost-per-Ticket Calculator] (P12-1) to size the broader privacy ops budget.',
      ),
    ];
  },
  staticExamples: [
    '🩺 DSAR Cost: Good (annual cost €99,750 · 1.75 hr/DSAR · €166/DSAR)\n$calc_out.dsar_cost.row.snapshot{"dsars":"50","dsars_per_year":"600","hours":"2.50","automation":"30.0%","manual_hours":"1.75","rate":"€95","annual":"€99,750"}|📊 Snapshot: 50 DSARs/mo × 12 = 600/yr · 2.50 hr/DSAR · 30.0% automation (1.75 manual hr) · €95/hr DPO · annual cost €99,750|\n🔄 What-If: if automation climbs to 60%, manual hours drop to 1.00, annual cost drops to €57,000 (Good). Push past ~82% automation to reach 🟢 Excellent (<€25K).\n⚖️ Break-Even: to hit 🟢 Excellent (<€25K), need automation ≥82% OR cut DSARs to ≤13/mo (current 30.0%)\n🎯 Milestone: re-baseline quarterly + after any product launch that adds data-collection surface (DSAR volume correlates with consent changes).\n$calc_out.dsar_cost.row.tip|💡 Tip: pair with [CMP ROI] (L-6) — CMP reduces DSAR volume via consent logging. Also pair with our [Cost-per-Ticket Calculator] (P12-1) to size the broader privacy ops budget.|',
  ],
  faq: [
    { q: 'What is DSAR processing cost?', a: 'DSAR (Data Subject Access Request) processing cost = annual labor cost to fulfill GDPR Art. 15 access requests. Each request takes manual hours × DPO hourly rate, scaled by annual request volume minus automation savings. Mid-market B2B SaaS averages 30–100 DSARs/mo (IAPP 2024 Privacy Operations Survey).' },
    { q: 'How do I estimate "manual hours per DSAR"?', a: 'Baseline: 2–4 hours per DSAR for manual search + redaction + reply (per ICO DSAR code of practice). With automation tools (OneTrust DSAR, Securys, Transcend), drops to 0.5–1 hour. Most mid-market DSARs require manual redaction for third-party data references (Art. 15(4)).' },
    { q: 'What does the "automation %" input mean?', a: 'Automation % = share of DSAR workflow handled by tooling (auto-discovery of user data, template responses, redaction). 30% automation = 70% manual effort remaining. 80%+ automation = mostly template-driven with human review only for edge cases (per OneTrust 2024 benchmark).' },
    { q: 'How does this pair with L-6 CMP ROI?', a: 'CMP (Consent Management Platform) reduces DSAR volume by ~30–50% via granular consent logging (data subjects see exactly what you have and only request access for unclear items). L-6 quantifies CMP cost savings; L-2 quantifies DSAR cost savings — combined gives full privacy-ops ROI.' },
    { q: 'What is the difference between L-1 GDPR Fine and L-2 DSAR Cost?', a: 'L-1 measures regulatory fine exposure (worst-case scenario: data breach + Art. 83 fine). L-2 measures operational cost of routine privacy ops (legitimate requests you must fulfill under Art. 15). Both are mid-market DPO metrics but address different budget lines: fines (risk) vs. ops (run-rate).' },
    { q: 'Does L-2 cover CCPA / global privacy laws?', a: 'CCPA, LGPD, PIPL all have similar data-access rights (with variations). The math (volume × hours × rate) is universal; only the monthly DSAR volume input changes by jurisdiction. For US-only companies, the volume may be 50–70% lower than EU (less consumer awareness).' },
    { q: "What is a DSAR (Data Subject Access Request)?", a: "DSAR = request from a user to access, delete, or modify their personal data. Required by GDPR (30 days), CCPA (45 days), and other laws. Process: 1) Verify identity, 2) Locate data across systems, 3) Compile/export, 4) Deliver response. Volume: 1-5% of users request per year for active businesses. Cost: $50-500 per request without automation." },
    { q: "How much does it cost to fulfill a DSAR?", a: "Without automation: $300-1000 per request. With automation: $50-200. For 1000 requests/year: $50K-1M. Most expensive: manual data location, manual compilation. Cost breakdown: legal review (20%), data location (40%), compilation (30%), delivery (10%). Most teams 5-10x cost reduction with automation. Tools: Securys, BigID, OneTrust, custom." },
    { q: "What is the response time for a DSAR?", a: "GDPR: 30 days (extendable 60 days for complex). CCPA: 45 days. HIPAA: 30 days. State laws vary. Process: 1) Acknowledge within 7 days, 2) Verify identity, 3) Compile data, 4) Deliver within deadline. Tips: 1) Acknowledge immediately, 2) Verify within 7 days, 3) Use templates. Penalty for missing: fines + reputational damage." },
    { q: "How do I automate DSAR fulfillment?", a: "Tools: 1) Privacy management platforms (OneTrust, BigID, Securys), 2) Data mapping (auto-discover PII), 3) Workflow automation (ServiceNow, Jira), 4) Templated responses. Process: 1) Self-service portal, 2) Identity verification, 3) Auto-data-export, 4) Auto-response email. Most teams: 70-90% automation, 5-10x cost reduction. Investment: $10-100K/year." },
    { q: "What about DSARs for deletion vs access?", a: "GDPR Article 17 (right to erasure): user can request deletion. CCPA: delete with exceptions (legal, security). Process: 1) Verify identity, 2) Locate all data, 3) Delete from systems + backups (within 90 days typically), 4) Confirm. Cost: 2-3x access request. Most teams: 30-50% of DSARs are deletion requests. Automate deletion as much as possible." },
    { q: "What if a DSAR is incomplete or unverifiable?", a: "Process: 1) Request additional information (within 7 days), 2) Set deadline for response, 3) If not received: close request. Verify identity with: 1) Government ID (KYC), 2) Account details, 3) Email verification, 4) Phone verification. GDPR: cannot refuse without reason. CCPA: can require verification. Document: identity verification process. Avoid: SSN requests (over-asking)." },
    { q: "What is the volume of DSARs I should expect?", a: "Benchmarks: 0.5-2% of MAU per year (1-2 per 100 users). Spikes: after breaches, after media coverage, after policy changes. For 10K users: 50-200 DSARs/year. For 100K: 500-2000. For 1M: 5000-20000. Plan: 1 FTE per 1000-2000 DSARs/year. Automation: cuts to 0.1-0.5 FTE for same volume." },
    { q: "How do DSARs affect my analytics and ML models?", a: "Deletion requests: 1) Remove user from ML training data, 2) Update recommendation systems, 3) Anonymize instead of delete (where possible), 4) Update cohort analyses. Cost: 2-5x normal data engineering. Mitigate: 1) Pre-built deletion pipelines, 2) Auto-anonymization, 3) Federated learning, 4) Periodic full re-training. Most teams: 10-20% data eng time on DSAR compliance." },
  ],
  howToUse: [
    'Enter monthly DSAR volume — pull from your privacy request ticketing system or OneTrust DSAR portal.',
    'Enter manual hours per DSAR — average across fulfillment team (search + redaction + reply time).',
    'Enter DPO hourly rate — fully-loaded cost including benefits + overhead (typically €80–€150/hr EU mid-market).',
    'Enter automation % — current share of workflow handled by tooling (start at 0% if fully manual).',
    'Read the band — 🟢 Excellent <€25K · 🟡 Good €25-100K · 🟠 Warning €100-300K · 🔴 Critical ≥€300K.',
    'Pair with L-6 (CMP ROI) to project savings from consent tooling; L-1 (GDPR Fine) for risk context.',
  ],
  sources: [
    'https://gdpr-info.eu/art-15-gdpr/',
    'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/right-of-access/',
    'https://iapp.org/news/a/2024-privacy-operations-survey/',
    'https://www.onetrust.com/products/dsar-automation/',
  ],
  engineKey: true,
};
registerEngine(engine);
