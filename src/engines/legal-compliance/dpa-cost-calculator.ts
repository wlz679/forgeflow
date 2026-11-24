// P14-4 Data Processing Agreement (DPA) Negotiation Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Benchmark anchor: Fieldfisher 2024 DPA negotiation survey.
// HIGHER on annual_dpa_cost: more cost = worse legal-ops scaling. Bands: <€100K / €100-300K / €300-600K / ≥€600K.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

export const HEALTH_BANDS = {
  excellent: { threshold: 100_000,  label: 'Excellent', message: 'Lean legal ops.' },
  good:      { threshold: 300_000,  label: 'Good',      message: 'Manageable DPA cost.' },
  warning:   { threshold: 600_000,  label: 'Warning',   message: 'Legal ops DPA-bound.' },
  critical:  { threshold: Infinity, label: 'Critical',  message: 'Disproportionate DPA drag.' },
};

export function dpaBaseHours(rounds: number, hoursPerRound: number): number {
  return rounds * hoursPerRound;
}

export function redlineMultiplier(redlines: number): number {
  // Fieldfisher 2024 benchmark: each redline adds 5% to the base negotiation effort.
  return 1 + redlines * 0.05;
}

export function annualDPACost(dpas: number, baseHours: number, rate: number, redlines: number): number {
  return dpas * 4 * baseHours * rate * redlineMultiplier(redlines);
}

export function costPerDPA(baseHours: number, rate: number, redlines: number): number {
  return baseHours * rate * redlineMultiplier(redlines);
}

export function calcHealthBand(cost: number): keyof typeof HEALTH_BANDS {
  if (cost < HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (cost < HEALTH_BANDS.good.threshold) return 'good';
  if (cost < HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtNum(x: number, decimals: number): string { return x.toFixed(decimals); }

const engine: ToolEngine = {
  slug: 'solopreneur-dpa-cost-calculator',
  title: 'DPA Negotiation Cost',
  description:
    'Quantify annual Data Processing Agreement negotiation cost from DPA volume, negotiation rounds, legal hours, hourly rate, and redline complexity. HIGHER health bands — more cost = worse legal-ops scaling: 🟢 <€100K/yr · 🟡 €100-300K · 🟠 €300-600K · 🔴 ≥€600K. For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, Legal Ops, and Sales leaders.',
  inputs: [
    { name: 'dpas_per_quarter',        label: 'DPAs per quarter',             placeholder: 'e.g. 40',  type: 'number' },
    { name: 'avg_negotiation_rounds',  label: 'Average negotiation rounds',  placeholder: 'e.g. 4',   type: 'number' },
    { name: 'hours_per_round',         label: 'Legal hours per round',       placeholder: 'e.g. 1.5', type: 'number' },
    { name: 'legal_hourly_rate',       label: 'Legal hourly rate (€/hr)',    placeholder: 'e.g. 250', type: 'number' },
    { name: 'redlines_per_dpa',        label: 'Redlines per DPA',            placeholder: 'e.g. 8',   type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let d=function(e){return Number.isNaN(e)?0:Math.max(0,e)},f=function(e,t){return e*t},h=function(e){return 1+e*.05},m=function(e,t,r,a){return e*4*t*r*h(a)},v=function(e,t,r){return e*t*h(r)},_=function(e){return e<i.excellent.threshold?"excellent":e<i.good.threshold?"good":e<i.warning.threshold?"warning":"critical"},b=function(e){return"€"+Math.round(e).toLocaleString()},n=function(e,t){return e.toFixed(t)},k=function(e,t,r){var a=V(e);return Array.isArray(a)?a.join(\`
\`):String(a)};var H=d,ee=f,te=h,ne=m,re=v,ae=_,oe=b,le=n,se=k,g=tk,S='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',g=new Function("return "+S)(),i={excellent:{threshold:1e5,label:"Excellent",message:"Lean legal ops."},good:{threshold:3e5,label:"Good",message:"Manageable DPA cost."},warning:{threshold:6e5,label:"Warning",message:"Legal ops DPA-bound."},critical:{threshold:null,label:"Critical",message:"Disproportionate DPA drag."}},V=function(e){const t=d(Number(e.dpas_per_quarter)||0),r=d(Number(e.avg_negotiation_rounds)||0),a=d(Number(e.hours_per_round)||0),o=d(Number(e.legal_hourly_rate)||0),s=d(Number(e.redlines_per_dpa)||0),c=f(r,a),p=h(s),G=v(c,o,s),l=m(t,c,o,s),W=_(l),J=i[W],Y=l<1e5?"🟢":l<3e5?"🟡":l<6e5?"🟠":"🔴",M=2,$=f(M,a),u=m(t,$,o,s),z=_(u),E=u<1e5?"🟢":u<3e5?"🟡":u<6e5?"🟠":"🔴",y=i.excellent.threshold-1,x=4*c*o*p>0?y/(4*c*o*p):t,D=t>0?Math.min(100,Math.max(0,(t-x)/t*100)):0,P=((t*4*c*o>0?y/(t*4*c*o):p)-1)/.05,q=s>0&&P>=0?Math.min(100,Math.max(0,(s-P)/s*100)):1/0,Q=t*4*(1.2*a)*o*p,L=r>1.2&&Q<y,R=L?Math.min(100,Math.max(0,(r-1.2)/r*100)):1/0,U=l<i.excellent.threshold?"already below €100K — no reduction needed":(()=>{const w=[{pct:q,label:"reduce average redlines to ≤"+n(P,1)+"/DPA ("+n(q,1)+"% fewer)"},{pct:D,label:"reduce DPA volume to ≤"+n(x,1)+"/quarter ("+n(D,1)+"% fewer)"}];return L&&w.push({pct:R,label:"reduce average rounds to ≤1.2 (template-first, "+n(R,1)+"% fewer)"}),w.sort((B,T)=>B.pct-T.pct),w[0].label})(),X=u<l?"drops to":"is already optimal at",Z=u<l?u:l,j=t.toLocaleString(),A=(t*4).toLocaleString(),F=n(r,1),C=n(a,2),I=n(c,2),N=n(s,1),K=n(p,2),O=b(o);return["🩺 DPA Cost: "+Y+" "+J.label+" (annual cost €"+Math.floor(l).toLocaleString()+" · "+b(G)+"/DPA · "+n(c,2)+" base hr/DPA)",g("calc_out.dpa_cost.row.snapshot","📊 Snapshot: "+j+" DPAs/q × 4 = "+A+"/yr · "+F+" rounds × "+C+" hr = "+I+" base hr · "+N+" redlines × 5% → "+K+"× · "+O+"/hr",{dpas:j,dpas_per_year:A,rounds:F,hours_per_round:C,base_hours:I,redlines:N,multiplier:K,rate:O}),"🔄 What-If: if average rounds drop to "+M+" (template-first approach), annual cost "+X+" "+b(Z)+" ("+E+" "+i[z].label+").","⚖️ Break-Even: easiest path to 🟢 Excellent (<€100K): "+U+".","🎯 Milestone: re-baseline quarterly and track DPA turnaround alongside sales-cycle days; template-first playbooks should cut the median negotiation to 2 rounds within two quarters.",g("calc_out.dpa_cost.row.tip","💡 Tip: pair with our [Pipeline Value Calculator] (P8-1) because DPA rounds delay deal close. Also pair with [GDPR Fine Calculator] (L-1) because compliance cost compounds with sales-cycle risk.")]};return[k(inputs,pick,fill)]}finally{}
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
    const dpas = clampNonNegative(Number(inputs.dpas_per_quarter) || 0);
    const rounds = clampNonNegative(Number(inputs.avg_negotiation_rounds) || 0);
    const hoursPerRound = clampNonNegative(Number(inputs.hours_per_round) || 0);
    const rate = clampNonNegative(Number(inputs.legal_hourly_rate) || 0);
    const redlines = clampNonNegative(Number(inputs.redlines_per_dpa) || 0);
    const baseHours = dpaBaseHours(rounds, hoursPerRound);
    const multiplier = redlineMultiplier(redlines);
    const perDPA = costPerDPA(baseHours, rate, redlines);
    const annual = annualDPACost(dpas, baseHours, rate, redlines);
    const band = calcHealthBand(annual);
    const bandInfo = HEALTH_BANDS[band];
    const emoji = annual < 100_000 ? '🟢' : annual < 300_000 ? '🟡' : annual < 600_000 ? '🟠' : '🔴';
    const altRounds = 2;
    const altBaseHours = dpaBaseHours(altRounds, hoursPerRound);
    const altAnnual = annualDPACost(dpas, altBaseHours, rate, redlines);
    const altBand = calcHealthBand(altAnnual);
    const altEmoji = altAnnual < 100_000 ? '🟢' : altAnnual < 300_000 ? '🟡' : altAnnual < 600_000 ? '🟠' : '🔴';

    // Strict-< band: use €99,999 so the displayed easier path actually lands in Excellent.
    // Compare proportional change in quarterly DPA volume vs average redlines; a negative
    // redline target means redline reduction alone cannot reach the threshold.
    const targetAnnual = HEALTH_BANDS.excellent.threshold - 1;
    const targetDpas = (4 * baseHours * rate * multiplier) > 0
      ? targetAnnual / (4 * baseHours * rate * multiplier)
      : dpas;
    const dpaReductionPct = dpas > 0
      ? Math.min(100, Math.max(0, ((dpas - targetDpas) / dpas) * 100))
      : 0;
    const targetMultiplier = (dpas * 4 * baseHours * rate) > 0
      ? targetAnnual / (dpas * 4 * baseHours * rate)
      : multiplier;
    const targetRedlines = (targetMultiplier - 1) / 0.05;
    const redlineReductionPct = redlines > 0 && targetRedlines >= 0
      ? Math.min(100, Math.max(0, ((redlines - targetRedlines) / redlines) * 100))
      : Infinity;
    // Third path: reduce avg rounds to ≤1.2 (template-first). Viable only if newAnnual < targetAnnual.
    const newAnnualAt1_2 = dpas * 4 * (1.2 * hoursPerRound) * rate * multiplier;
    const roundsViable = rounds > 1.2 && newAnnualAt1_2 < targetAnnual;
    const roundsReductionPct = roundsViable
      ? Math.min(100, Math.max(0, ((rounds - 1.2) / rounds) * 100))
      : Infinity;
    const easierPath = annual < HEALTH_BANDS.excellent.threshold
      ? 'already below €100K — no reduction needed'
      : (() => {
          type Path = { pct: number; label: string };
          const paths: Path[] = [
            { pct: redlineReductionPct, label: 'reduce average redlines to ≤' + fmtNum(targetRedlines, 1) + '/DPA (' + fmtNum(redlineReductionPct, 1) + '% fewer)' },
            { pct: dpaReductionPct,     label: 'reduce DPA volume to ≤' + fmtNum(targetDpas, 1) + '/quarter (' + fmtNum(dpaReductionPct, 1) + '% fewer)' },
          ];
          if (roundsViable) {
            paths.push({ pct: roundsReductionPct, label: 'reduce average rounds to ≤1.2 (template-first, ' + fmtNum(roundsReductionPct, 1) + '% fewer)' });
          }
          paths.sort((a, b) => a.pct - b.pct);
          return paths[0].label;
        })();
    // What-If verb guard: "drops to" is only true when altAnnual < annual.
    const altVerb = altAnnual < annual ? 'drops to' : 'is already optimal at';
    const altDisplayed = altAnnual < annual ? altAnnual : annual;

    // P168 B3-15：Snapshot / Tip 两行令牌化 —— 兜底与 params 取**同一个局部变量**
    //   ⇒ 英文页逐字不变；locale 模板把该变量换成 {param} ⇒ 模板不冻结运行时数值。
    //   ⚠️ 命名空间必须精确等于 toolAlias(slug) = 'dpa_cost'（见 B3_15_BATCH）。
    const dpasLabel = dpas.toLocaleString();
    const dpasYearLabel = (dpas * 4).toLocaleString();
    const roundsLabel = fmtNum(rounds, 1);
    const hoursPerRoundLabel = fmtNum(hoursPerRound, 2);
    const baseHoursLabel = fmtNum(baseHours, 2);
    const redlinesLabel = fmtNum(redlines, 1);
    const multiplierLabel = fmtNum(multiplier, 2);
    const rateLabel = fmtMoney(rate);
    return [
      '🩺 DPA Cost: ' + emoji + ' ' + bandInfo.label + ' (annual cost €' + Math.floor(annual).toLocaleString() + ' · ' + fmtMoney(perDPA) + '/DPA · ' + fmtNum(baseHours, 2) + ' base hr/DPA)',
      makeToken(
        'calc_out.dpa_cost.row.snapshot',
        '📊 Snapshot: ' + dpasLabel + ' DPAs/q × 4 = ' + dpasYearLabel + '/yr · ' + roundsLabel + ' rounds × ' + hoursPerRoundLabel + ' hr = ' + baseHoursLabel + ' base hr · ' + redlinesLabel + ' redlines × 5% → ' + multiplierLabel + '× · ' + rateLabel + '/hr',
        { dpas: dpasLabel, dpas_per_year: dpasYearLabel, rounds: roundsLabel, hours_per_round: hoursPerRoundLabel, base_hours: baseHoursLabel, redlines: redlinesLabel, multiplier: multiplierLabel, rate: rateLabel },
      ),
      '🔄 What-If: if average rounds drop to ' + altRounds + ' (template-first approach), annual cost ' + altVerb + ' ' + fmtMoney(altDisplayed) + ' (' + altEmoji + ' ' + HEALTH_BANDS[altBand].label + ').',
      '⚖️ Break-Even: easiest path to 🟢 Excellent (<€100K): ' + easierPath + '.',
      '🎯 Milestone: re-baseline quarterly and track DPA turnaround alongside sales-cycle days; template-first playbooks should cut the median negotiation to 2 rounds within two quarters.',
      makeToken(
        'calc_out.dpa_cost.row.tip',
        '💡 Tip: pair with our [Pipeline Value Calculator] (P8-1) because DPA rounds delay deal close. Also pair with [GDPR Fine Calculator] (L-1) because compliance cost compounds with sales-cycle risk.',
      ),
    ];
  },
  staticExamples: ['🩺 DPA Cost: 🟠 Warning (annual cost €336,000 · €2,100/DPA · 6.00 base hr/DPA)\n$calc_out.dpa_cost.row.snapshot{"dpas":"40","dpas_per_year":"160","rounds":"4.0","hours_per_round":"1.50","base_hours":"6.00","redlines":"8.0","multiplier":"1.40","rate":"€250"}|📊 Snapshot: 40 DPAs/q × 4 = 160/yr · 4.0 rounds × 1.50 hr = 6.00 base hr · 8.0 redlines × 5% → 1.40× · €250/hr|\n🔄 What-If: if average rounds drop to 2 (template-first approach), annual cost drops to €168,000 (🟡 Good).\n⚖️ Break-Even: easiest path to 🟢 Excellent (<€100K): reduce DPA volume to ≤11.9/quarter (70.2% fewer).\n🎯 Milestone: re-baseline quarterly and track DPA turnaround alongside sales-cycle days; template-first playbooks should cut the median negotiation to 2 rounds within two quarters.\n$calc_out.dpa_cost.row.tip|💡 Tip: pair with our [Pipeline Value Calculator] (P8-1) because DPA rounds delay deal close. Also pair with [GDPR Fine Calculator] (L-1) because compliance cost compounds with sales-cycle risk.|'],
  faq: [
    { q: 'What is DPA negotiation cost?', a: 'DPA negotiation cost is the annual legal labor spent reviewing and redlining Data Processing Agreements: quarterly DPA volume × 4 × negotiation rounds × hours per round × legal hourly rate × redline complexity multiplier.' },
    { q: 'Why does each redline add 5%?', a: 'The calculator uses a Fieldfisher 2024 DPA negotiation survey benchmark: each substantive redline adds about 5% to base negotiation effort through review, counter-drafting, stakeholder approval, and version control. The multiplier is 1 + (redlines × 0.05), so 8 redlines produce 1.40× effort.' },
    { q: 'How should I count negotiation rounds?', a: 'Count one round each time a DPA draft crosses company boundaries and returns with substantive edits. Internal legal review alone is not a new round. Use a rolling quarterly average across signed deals rather than one unusually difficult enterprise contract.' },
    { q: 'What is a template-first DPA approach?', a: 'Template-first means offering a pre-approved DPA with fallback clauses, jurisdiction-specific annexes, and a redline playbook before bespoke drafting begins. Mature legal-ops teams often reduce four rounds to two, cutting the canonical annual cost from €336K to €168K.' },
    { q: 'How do DPA rounds affect sales?', a: 'DPA review commonly sits between security approval and signature. Extra rounds hold weighted pipeline in the negotiation stage, delay close dates, and increase forecast slippage. Pair this calculator with P8-1 Pipeline Value to quantify the revenue waiting behind legal review.' },
    { q: 'How does this pair with GDPR fine risk?', a: 'L-4 measures recurring legal-operations cost; L-1 GDPR Fine measures regulatory tail risk. Reducing negotiation effort must not remove processor safeguards required by GDPR Art. 28, so review savings and fine exposure should be assessed together.' },
    { q: "What is a Data Processing Agreement (DPA)?", a: "DPA = contract between data controller (you) and data processor (vendor) defining how personal data is handled. Required by GDPR Article 28. Includes: 1) Subject matter and duration, 2) Nature and purpose of processing, 3) Types of personal data, 4) Obligations of processor, 5) Sub-processor list, 6) Security measures, 7) Data subject rights, 8) Audit rights. Most enterprise vendors have standard DPA." },
    { q: "How much does a DPA cost?", a: "Standard DPA from enterprise vendor: free (Salesforce, AWS, Google). Custom DPA: $5-50K in legal fees. Most companies: 10-50 vendor DPAs to negotiate. Total legal cost: $50-500K for full portfolio. Cheaper alternative: GDPR-compliant contract templates ($500-5K). Best option: standardized template + light customization per vendor." },
    { q: "What should a DPA include?", a: "Must-have: 1) Processing scope, 2) Confidentiality, 3) Security measures, 4) Sub-processor list and approval, 5) Data subject rights assistance, 6) Breach notification (within 24-72 hours), 7) Audit rights, 8) Return/deletion at end, 9) Liability allocation. Optional: SCCs (Standard Contractual Clauses) for cross-border. Avoid: vague language, broad liability waivers, no audit rights." },
    { q: "How long does DPA negotiation take?", a: "Standard DPA (already signed): instant. Standard DPA with redlines: 1-4 weeks. Custom DPA: 4-12 weeks. Enterprise (Microsoft, Salesforce): 1-2 weeks typical. Most delay: security questionnaires, sub-processor lists, audit rights. Tips: 1) Use vendor's standard, 2) Limit redlines to high-risk items, 3) Pre-approve common terms. Avoid: 6-month negotiations." },
    { q: "What is the cost of non-compliance with DPA requirements?", a: "GDPR fines: €20M or 4% of revenue. CCPA: $2,500-7,500 per violation. Plus: customer trust loss, contract terminations, lawsuit risk. Average: 5-10% of revenue at risk. Most companies: 1-2% of revenue in compliance investment. ROI: 5-50x. Don't skip DPAs even for \"small\" vendors — all data processors need one." },
    { q: "What are Standard Contractual Clauses (SCCs)?", a: "SCCs = EU-approved data transfer mechanism for personal data leaving EU/EEA. Required for: US vendors storing EU data, post-Schrems II. Includes: 1) Transfer impact assessment, 2) Supplementary measures, 3) Data subject rights. Versions: 2021 SCCs (current). Most vendors: provide SCCs in DPA. Need: signed SCCs + TIA (Transfer Impact Assessment) + supplementary measures." },
    { q: "Should I have separate DPAs for each vendor?", a: "Yes, ideally. Or: 1) Master DPA + addenda per vendor, 2) Standard template with per-vendor security exhibits, 3) MSA + DPA combo. Most efficient: template with limited customization. Critical: list specific processing activities, sub-processors, security measures per vendor. Avoid: master agreement without per-vendor specifics (fails audit)." },
    { q: "How do I manage DPAs across many vendors?", a: "Tooling: 1) GRC platform (Vanta, Drata, OneTrust: $10-50K/year), 2) Vendor management system, 3) Spreadsheet (for SMBs). Process: 1) Inventory all vendors, 2) Categorize by data sensitivity, 3) Tier 1 (PII, payment): full DPA, 4) Tier 2 (operational): standard DPA, 5) Tier 3 (no PII): no DPA needed. Audit annually. Most teams: 50-200 vendor DPAs to manage." },
  ],
  howToUse: [
    'Enter the average number of DPAs reviewed each quarter.',
    'Enter average negotiation rounds per DPA, counted as external draft exchanges.',
    'Enter legal hours spent in each round across counsel and privacy stakeholders.',
    'Enter the fully loaded internal or external legal hourly rate in euros.',
    'Enter average substantive redlines per DPA; each adds 5% to base effort.',
    'Review annual cost, the 2-round template-first scenario, and the easiest path below €100K/year.',
  ],
  sources: [
    'https://www.fieldfisher.com/en/insights/data-processing-agreements',
    'https://gdpr-info.eu/art-28-gdpr/',
    'https://iapp.org/resources/article/data-processing-agreements/',
  ],
  engineKey: true,
};
registerEngine(engine);
