// P14-6 Consent Management Platform (CMP) ROI
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS DPO/Privacy Officer persona (€10M-€50M ARR).
// Regulatory anchors: GDPR Art. 7 (consent) + ePrivacy Art. 5(3) (cookie consent);
// IAB TCF v2.2 framework; OneTrust 2024 CMP benchmark; Didomi 2024 CMP benchmark;
// Cookiebot 2024 CMP benchmark.
// HIGHER on roi_pct: more ROI = better automation payback. Bands: <50% / 50-150% / 150-400% / >=400%.
// Critical threshold -Infinity (negative ROI = CMP costs more than it saves).
//
// Lesson 1: file path uses .ts suffix (codegen-examples.mjs joins via path.join + file)
// Lesson 2: customFn uses return run(inputs, pick, fill); wrapper for runtime safety
// Lesson 3: Break-Even uses 5× cost for ROI≥4.0 (since net/cost ≥ 4.0 → savings ≥ 5× cost)
// Lesson 4: What-If uses altSavings > annual guard for "climb to" vs "drops to"
// Lesson 5: Health line uses .toFixed(1) for ROI to avoid integer-boundary contradiction at 400/150/50
// Lesson 6: Leading € format consistently in both generate() and customFn
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-15：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
//   ⚠️ 兜底与 params **同源**（同一个局部变量）⇒ 英文页逐字不变（G9）、模板不冻结数值（G8）。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// Thresholds are decimal ratios: 4.0 = 400%, 1.5 = 150%, 0.5 = 50%.
// calcHealthBand receives roiPct in percentage form (e.g. 296 for 296%) and
// converts to decimal internally for comparison.
export const HEALTH_BANDS = {
  excellent: { threshold: 4.0,        label: 'Excellent', message: 'CMP pays back 5×+.' },
  good:      { threshold: 1.5,        label: 'Good',      message: 'CMP pays for itself.' },
  warning:   { threshold: 0.5,        label: 'Warning',   message: 'CMP under-saving.' },
  critical:  { threshold: -Infinity,  label: 'Critical',  message: 'CMP costs more than it saves.' },
};

export function dsarAnnualSavings(dsars: number, hours: number, rate: number, uplift: number): number {
  return dsars * 12 * hours * (uplift / 100) * rate;
}

export function cmpAnnualCost(monthly: number): number {
  return monthly * 12;
}

export function netAnnualSavings(savings: number, cost: number): number {
  return savings - cost;
}

export function cmpROI(net: number, cost: number): number {
  return cost > 0 ? (net / cost) * 100 : -Infinity;
}

export function paybackMonths(cost: number, monthlySavings: number): number {
  return monthlySavings > 0 ? cost / monthlySavings : Infinity;
}

export function calcHealthBand(roiPct: number): keyof typeof HEALTH_BANDS {
  const roiDec = roiPct / 100;
  if (roiDec >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (roiDec >= HEALTH_BANDS.good.threshold) return 'good';
  if (roiDec >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '€' + Math.round(x).toLocaleString(); }
function fmtNum(x: number, decimals: number): string { return x.toFixed(decimals); }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-cmp-roi-calculator',
  title: 'CMP ROI',
  description:
    'Quantify annual ROI of a Consent Management Platform from DSAR automation savings vs platform cost. HIGHER health bands — more ROI = better automation payback: 🟢 ≥400% (CMP pays back 5×+) · 🟡 150-400% (CMP pays for itself) · 🟠 50-150% (CMP under-saving) · 🔴 <50% (CMP costs more than it saves). For mid-market B2B SaaS (€10M-€50M ARR) DPOs, Privacy Officers, and Procurement.',
  inputs: [
    { name: 'cmp_monthly_cost',     label: 'CMP monthly cost (€/mo)',  placeholder: 'e.g. 1200', type: 'number' },
    { name: 'dsars_per_month',      label: 'DSARs per month',          placeholder: 'e.g. 50',   type: 'number' },
    { name: 'hours_per_dsar',       label: 'Manual hours per DSAR',    placeholder: 'e.g. 2.5',  type: 'number' },
    { name: 'hourly_rate_dpo',      label: 'DPO hourly rate (€/hr)',   placeholder: 'e.g. 95',   type: 'number' },
    { name: 'automation_uplift_pct', label: 'CMP automation uplift (%)', placeholder: 'e.g. 40',  type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let l=function(t){return Number.isNaN(t)?0:Math.max(0,t)},v=function(t,n,a,e){return t*12*n*(e/100)*a},P=function(t){return t*12},y=function(t,n){return t-n},_=function(t,n){return n>0?t/n*100:-1/0},S=function(t,n){return n>0?t/n:1/0},M=function(t){const n=t/100;return n>=u.excellent.threshold?"excellent":n>=u.good.threshold?"good":n>=u.warning.threshold?"warning":"critical"},s=function(t){return"€"+Math.round(t).toLocaleString()},r=function(t,n){return t.toFixed(n)},C=function(t){return t.toFixed(1)+"%"},x=function(t,n,a){var e=J(t);return Array.isArray(e)?e.join(\`
\`):String(e)};var et=l,at=v,ot=P,rt=y,st=_,it=S,ct=M,lt=s,ut=r,ft=C,pt=x,b=tk,G='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',b=new Function("return "+G)(),u={excellent:{threshold:4,label:"Excellent",message:"CMP pays back 5×+."},good:{threshold:1.5,label:"Good",message:"CMP pays for itself."},warning:{threshold:.5,label:"Warning",message:"CMP under-saving."},critical:{threshold:null,label:"Critical",message:"CMP costs more than it saves."}},J=function(t){const n=l(Number(t.cmp_monthly_cost)||0),a=l(Number(t.dsars_per_month)||0),e=l(Number(t.hours_per_dsar)||0),i=l(Number(t.hourly_rate_dpo)||0),o=l(Number(t.automation_uplift_pct)||0),f=v(a,e,i,o),c=P(n),h=y(f,c),m=_(h,c),K=f/12,R=S(c,K),Y=M(m),$=u[Y],g=m/100,Q=g>=4?"🟢":g>=1.5?"🟡":g>=.5?"🟠":"🔴",I=200,k=v(I,e,i,o),w=y(k,c),d=_(w,c),V=M(d),X=d/100>=4?"🟢":d/100>=1.5?"🟡":d/100>=.5?"🟠":"🔴",Z=k>f?"climb to":"drop to",L=5*c,D=a*12*e*i>0?Math.min(100,L/(a*12*e*i)*100):o,F=12*e*(o/100)*i>0?Math.ceil(L/(12*e*(o/100)*i)):a,N=D-o,j=F-a,T=Math.abs(N/Math.max(o,1e-4))<=Math.abs(j/Math.max(a,1e-4)),H=g>=4,tt=h<0;let p;H?p="already 🟢 Excellent (ROI ≥"+C(m)+") — no uplift needed":tt?p="CMP is unprofitable at current settings. Either reduce CMP cost to ≤"+Math.round(f/12).toLocaleString()+" €/mo (so annual cost < annual savings) or increase DSAR volume / automation uplift until net ≥ 0.":T?p="lift CMP automation uplift to ≥"+r(D,1)+"% (current "+r(o,1)+"%, +"+r(N,1)+"pp).":p="grow DSAR volume to ≥"+F+"/mo (current "+a+"/mo, +"+j+").";const nt=R===1/0?"never":r(R,1)+" months",E=a.toLocaleString(),O=(a*12).toLocaleString(),q=r(e,2),A=r(i,0),U=r(o,0),W=s(f),z=s(c),B=s(h);return["🩺 CMP ROI: "+Q+" "+$.label+" (net "+s(h)+"/yr · "+C(m)+" ROI · payback "+nt+")",b("calc_out.cmp_roi.row.snapshot","📊 Snapshot: "+E+" DSARs/mo × 12 = "+O+"/yr × "+q+" hr × "+A+" €/hr × "+U+"% uplift = "+W+" savings · – "+z+" CMP cost = "+B+" net",{dsars:E,dsars_per_year:O,hours:q,rate:A,uplift:U,savings:W,cmp_cost:z,net:B}),"🔄 What-If: if DSAR volume climbs to "+I+"/mo, annual savings "+Z+" "+s(k)+", net "+s(w)+" ("+X+" "+u[V].label+").","⚖️ Break-Even: easiest path to 🟢 Excellent (ROI ≥ 400%): "+p,"🎯 Milestone: re-baseline quarterly + after any CMP vendor switch. IAB TCF v2.2 re-certification happens every 12 months — plan a re-evaluation around it.",b("calc_out.cmp_roi.row.tip","💡 Tip: pair with [DSAR Processing Cost] (L-2) — CMP reduces DSAR volume via consent logging. Also pair with [Cookie Consent Revenue Impact] (L-3) — premium CMP lifts consent rate. Use our [Break-Even Calculator] (B-7) to size payback against other tooling investments.")]};return[x(inputs,pick,fill)]}finally{}
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
    const cmpCost = clampNonNegative(Number(inputs.cmp_monthly_cost) || 0);
    const dsars = clampNonNegative(Number(inputs.dsars_per_month) || 0);
    const hours = clampNonNegative(Number(inputs.hours_per_dsar) || 0);
    const rate = clampNonNegative(Number(inputs.hourly_rate_dpo) || 0);
    const uplift = clampNonNegative(Number(inputs.automation_uplift_pct) || 0);
    const dsarSavings = dsarAnnualSavings(dsars, hours, rate, uplift);
    const cmpAnnual = cmpAnnualCost(cmpCost);
    const net = netAnnualSavings(dsarSavings, cmpAnnual);
    const roiPct = cmpROI(net, cmpAnnual);
    const monthlySavings = dsarSavings / 12;
    const payback = paybackMonths(cmpAnnual, monthlySavings);
    const band = calcHealthBand(roiPct);
    const bandInfo = HEALTH_BANDS[band];
    const roiDec = roiPct / 100;
    const emoji = roiDec >= 4.0 ? '🟢' : roiDec >= 1.5 ? '🟡' : roiDec >= 0.5 ? '🟠' : '🔴';

    const altDsars = 200;
    const altSavings = dsarAnnualSavings(altDsars, hours, rate, uplift);
    const altNet = netAnnualSavings(altSavings, cmpAnnual);
    const altRoiPct = cmpROI(altNet, cmpAnnual);
    const altBand = calcHealthBand(altRoiPct);
    const altEmoji = (altRoiPct / 100) >= 4.0 ? '🟢' : (altRoiPct / 100) >= 1.5 ? '🟡' : (altRoiPct / 100) >= 0.5 ? '🟠' : '🔴';
    const altText = altSavings > dsarSavings ? 'climb to' : 'drop to';

    // ROI >= 4.0 (decimal) → net/cost >= 4 → savings >= 5× cost. For canonical
    // (savings=57000, cost=14400) need savings >= 72000. Compare two paths:
    // (a) raise uplift vs (b) raise DSAR volume. Pick the smaller relative change.
    const targetSavings = 5 * cmpAnnual;
    // Keep targetUplift in percentage form (0-100) to match uplift's units, so delta math is consistent.
    const targetUplift = (dsars * 12 * hours * rate) > 0
      ? Math.min(100, (targetSavings / (dsars * 12 * hours * rate)) * 100)
      : uplift;
    const targetDsars = (12 * hours * (uplift / 100) * rate) > 0
      ? Math.ceil(targetSavings / (12 * hours * (uplift / 100) * rate))
      : dsars;
    const upliftDelta = targetUplift - uplift;
    const dsarDelta = targetDsars - dsars;
    const upliftEasier = Math.abs(upliftDelta / Math.max(uplift, 0.0001)) <= Math.abs(dsarDelta / Math.max(dsars, 0.0001));
    const alreadyExcellent = roiDec >= 4.0;
    const netNegative = net < 0;

    let easierPath: string;
    if (alreadyExcellent) {
      easierPath = 'already 🟢 Excellent (ROI ≥' + fmtPct(roiPct) + ') — no uplift needed';
    } else if (netNegative) {
      easierPath = 'CMP is unprofitable at current settings. Either reduce CMP cost to ≤' + Math.round(dsarSavings / 12).toLocaleString() + ' €/mo (so annual cost < annual savings) or increase DSAR volume / automation uplift until net ≥ 0.';
    } else if (upliftEasier) {
      easierPath = 'lift CMP automation uplift to ≥' + fmtNum(targetUplift, 1) + '% (current ' + fmtNum(uplift, 1) + '%, +' + fmtNum(upliftDelta, 1) + 'pp).';
    } else {
      easierPath = 'grow DSAR volume to ≥' + targetDsars + '/mo (current ' + dsars + '/mo, +' + dsarDelta + ').';
    }

    const paybackStr = payback === Infinity ? 'never' : fmtNum(payback, 1) + ' months';

    // P168 B3-15：Snapshot / Tip 两行令牌化 —— 兜底与 params 取**同一个局部变量**
    //   ⇒ 英文页逐字不变；locale 模板把该变量换成 {param} ⇒ 模板不冻结运行时数值。
    //   ⚠️ 命名空间必须精确等于 toolAlias(slug) = 'cmp_roi'（见 B3_15_BATCH）。
    const dsarsLabel = dsars.toLocaleString();
    const dsarsYearLabel = (dsars * 12).toLocaleString();
    const hoursLabel = fmtNum(hours, 2);
    const rateLabel = fmtNum(rate, 0);
    const upliftLabel = fmtNum(uplift, 0);
    const savingsLabel = fmtMoney(dsarSavings);
    const cmpCostLabel = fmtMoney(cmpAnnual);
    const netLabel = fmtMoney(net);
    return [
      '🩺 CMP ROI: ' + emoji + ' ' + bandInfo.label + ' (net ' + fmtMoney(net) + '/yr · ' + fmtPct(roiPct) + ' ROI · payback ' + paybackStr + ')',
      makeToken(
        'calc_out.cmp_roi.row.snapshot',
        '📊 Snapshot: ' + dsarsLabel + ' DSARs/mo × 12 = ' + dsarsYearLabel + '/yr × ' + hoursLabel + ' hr × ' + rateLabel + ' €/hr × ' + upliftLabel + '% uplift = ' + savingsLabel + ' savings · – ' + cmpCostLabel + ' CMP cost = ' + netLabel + ' net',
        { dsars: dsarsLabel, dsars_per_year: dsarsYearLabel, hours: hoursLabel, rate: rateLabel, uplift: upliftLabel, savings: savingsLabel, cmp_cost: cmpCostLabel, net: netLabel },
      ),
      '🔄 What-If: if DSAR volume climbs to ' + altDsars + '/mo, annual savings ' + altText + ' ' + fmtMoney(altSavings) + ', net ' + fmtMoney(altNet) + ' (' + altEmoji + ' ' + HEALTH_BANDS[altBand].label + ').',
      '⚖️ Break-Even: easiest path to 🟢 Excellent (ROI ≥ 400%): ' + easierPath,
      '🎯 Milestone: re-baseline quarterly + after any CMP vendor switch. IAB TCF v2.2 re-certification happens every 12 months — plan a re-evaluation around it.',
      makeToken(
        'calc_out.cmp_roi.row.tip',
        '💡 Tip: pair with [DSAR Processing Cost] (L-2) — CMP reduces DSAR volume via consent logging. Also pair with [Cookie Consent Revenue Impact] (L-3) — premium CMP lifts consent rate. Use our [Break-Even Calculator] (B-7) to size payback against other tooling investments.',
      ),
    ];
  },
  staticExamples: ['🩺 CMP ROI: 🟡 Good (net €42,600/yr · 295.8% ROI · payback 3.0 months)\n$calc_out.cmp_roi.row.snapshot{"dsars":"50","dsars_per_year":"600","hours":"2.50","rate":"95","uplift":"40","savings":"€57,000","cmp_cost":"€14,400","net":"€42,600"}|📊 Snapshot: 50 DSARs/mo × 12 = 600/yr × 2.50 hr × 95 €/hr × 40% uplift = €57,000 savings · – €14,400 CMP cost = €42,600 net|\n🔄 What-If: if DSAR volume climbs to 200/mo, annual savings climb to €228,000, net €213,600 (🟢 Excellent).\n⚖️ Break-Even: easiest path to 🟢 Excellent (ROI ≥ 400%): lift CMP automation uplift to ≥50.5% (current 40.0%, +10.5pp).\n🎯 Milestone: re-baseline quarterly + after any CMP vendor switch. IAB TCF v2.2 re-certification happens every 12 months — plan a re-evaluation around it.\n$calc_out.cmp_roi.row.tip|💡 Tip: pair with [DSAR Processing Cost] (L-2) — CMP reduces DSAR volume via consent logging. Also pair with [Cookie Consent Revenue Impact] (L-3) — premium CMP lifts consent rate. Use our [Break-Even Calculator] (B-7) to size payback against other tooling investments.|'],
  faq: [
    { q: 'What is CMP ROI?', a: 'CMP (Consent Management Platform) ROI measures the annual return on a privacy-tech platform investment: DSAR automation savings (volume × hours × rate × uplift %) minus platform cost, expressed as a percentage. Mid-market B2B SaaS CMPs typically run €500–€3000/month (OneTrust, Didomi, Cookiebot, Iubenda per 2024 benchmarks) and produce 100–500% annual ROI through labor savings.' },
    { q: 'How is DSAR automation savings calculated?', a: 'dsar_annual_savings = DSARs/month × 12 × manual hours per DSAR × automation uplift % × DPO hourly rate. The automation uplift % is the share of manual work the CMP eliminates (auto-discovery, template responses, redaction tooling). Mid-market CMPs typically deliver 30–60% uplift (OneTrust 2024: 40–55%).' },
    { q: 'What does the payback period mean?', a: 'payback_months = annual CMP cost / monthly DSAR savings. It is the time for cumulative DSAR savings to cover the annual CMP subscription. For canonical (€14,400/yr cost, €4,750/mo savings), payback is 3.0 months. A payback under 6 months is procurement-ready; over 12 months needs a stronger business case.' },
    { q: 'How is the ROI % calculated?', a: 'roi_pct = (net_annual_savings / cmp_annual_cost) × 100 = ((dsar_savings - cmp_cost) / cmp_cost) × 100. ROI ≥ 400% (Excellent) means the CMP pays back 5×+ over its cost. ROI < 50% (Critical) means the CMP costs more than it saves — consider cheaper alternatives or higher-volume usage to justify the spend.' },
    { q: 'How does this pair with L-2 DSAR Cost?', a: 'L-2 quantifies baseline DSAR cost (volume × hours × rate). L-6 quantifies the CMP savings on top — a CMP reduces manual hours per DSAR by the automation uplift %. Combined, L-2 + L-6 give full privacy-ops ROI: baseline cost vs CMP-augmented cost.' },
    { q: 'How does this pair with L-3 Cookie Consent Revenue?', a: 'L-3 measures consent-rate revenue impact (e.g. 20pp consent gap = €64K/mo recoverable for 200K visitors with 2% conv × €80 AOV). L-6 measures the operational savings of a CMP. A premium CMP often delivers both: revenue lift (L-3) + labor savings (L-6).' },
    { q: 'Does L-6 cover CCPA / global privacy laws?', a: 'Yes — CMPs cover GDPR (ePrivacy Art. 5(3) cookie consent + Art. 7), CCPA/CPRA (Do Not Sell signals), LGPD (Brazil), and PIPL (China). The math (savings vs cost) is universal; only the automation uplift % varies by jurisdiction (CCPA typically 20–30%, GDPR 30–60%).' },
    { q: "What is a Consent Management Platform (CMP)?", a: "CMP = tool to collect, store, and manage user consent for cookies, tracking, data processing. Required by GDPR, CCPA, LGPD. Examples: OneTrust, Cookiebot, Iubenda, Osano. Cost: $10-1000/month. ROI: avoid regulatory fines, build user trust, enable compliant analytics. Most sites need CMP within first year of EU/CA traffic." },
    { q: "How much do GDPR/CCPA fines cost?", a: "GDPR: up to €20M or 4% of global revenue (whichever higher). Average: €50K-500K for SMB. CCPA: $2,500-7,500 per violation, max $0-7.5M+ for pattern. State laws vary. NY SHIELD: $5K per violation. Total risk: 5-10% of revenue. CMP cost: $1-30K/year. ROI: clear. Most companies need CMP." },
    { q: "What is the ROI of a CMP?", a: "CMP cost: $1-30K/year. Avoided fines: $50K-500K (GDPR/CCPA risk). Plus: 1) Enables marketing/analytics in regulated jurisdictions, 2) Builds user trust, 3) Reduces legal work, 4) Future-proofs against new regulations. ROI: 5-50x. Most mid-market: $5-10K/year CMP, $1M+ revenue at risk without it." },
    { q: "Which CMP should I choose?", a: "Pick by: 1) Budget, 2) Regulatory scope, 3) Feature needs, 4) Integration ease. Tier 1 (enterprise): OneTrust, TrustArc ($10K-100K+/year). Tier 2 (mid-market): Cookiebot, Iubenda, Osano ($500-5K/year). Tier 3 (SMB): free Cookiebot, Klaro, Osano. Tier 4: Custom-built (DIY). Most SMBs: tier 2-3 is enough." },
    { q: "What is the impact of CMP on ad revenue?", a: "CMP reduces opt-in rates by 10-30% in EU. Personalized ads drop 30-50%. But: 1) Compliance is mandatory, 2) Contextual ads still work, 3) First-party data compensates, 4) User trust improves long-term. Net impact: -5% to -15% ad revenue in regulated markets. Better than: 100% loss of EU business from non-compliance." },
    { q: "Do I need a CMP if I have no EU traffic?", a: "Maybe. CCPA covers California (US). If you have CA traffic: need CMP. Many US state laws now require opt-in/opt-out. Threshold: 50K+ consumers, $25M revenue, 50% revenue from selling data. Even if not strictly required, CMP builds user trust and prepares for new regulations. Most sites add CMP within 6 months of launch." },
    { q: "How do I implement a CMP correctly?", a: "Steps: 1) Audit current data collection, 2) Categorize cookies/tracking, 3) Choose CMP (Cookiebot for SMB, OneTrust for enterprise), 4) Install, 5) Update privacy policy, 6) Geo-target (GDPR for EU, CCPA for CA, etc.), 7) Test opt-in flows, 8) Train team. Common mistakes: pre-checked boxes, no granular choice, dark patterns. Avoid: legal risk." },
    { q: "What is the difference between opt-in and opt-out CMPs?", a: "Opt-in (GDPR): user must actively consent before tracking. Opt-out (CCPA): user must actively opt out. Default: opt-in for EU, opt-out for CA. Implementation: opt-in requires user action, blocks tracking until consent. Opt-out allows tracking by default. Both need clear UI. Most CMPs: auto-detect user location and apply correct rules." },
  ],
  howToUse: [
    'Enter CMP monthly subscription cost (€/mo) — OneTrust Pro ~€1500/mo, Didomi ~€800/mo, Cookiebot ~€200/mo (per 2024 vendor benchmarks).',
    'Enter monthly DSAR volume from your privacy request ticketing system or CMP portal.',
    'Enter manual hours per DSAR — average across fulfillment team (search + redaction + reply time).',
    'Enter DPO hourly rate — fully-loaded cost including benefits + overhead (typically €80–€150/hr EU mid-market).',
    'Enter CMP automation uplift % — share of DSAR workflow the CMP handles (OneTrust 2024: 40–55%, Cookiebot: 20–30%).',
    'Read the band — 🟢 Excellent ROI ≥ 400% · 🟡 Good 150-400% · 🟠 Warning 50-150% · 🔴 Critical < 50%.',
    'Pair with L-2 (DSAR) for baseline privacy-ops cost; L-3 (Consent Revenue) for revenue lift from consent-rate improvement.',
  ],
  sources: [
    'https://www.onetrust.com/blog/consent-rate-benchmarks/',
    'https://www.didomi.io/blog/cmp-pricing-comparison',
    'https://www.cookiebot.com/en/cmp/',
    'https://iabeurope.eu/tcf-for-vendors/',
    'https://gdpr-info.eu/art-7-gdpr/',
  ],
  engineKey: true,
};
registerEngine(engine);
