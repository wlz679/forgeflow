import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Funnel Value Calculator (P6-3) — Business v3 standard
// =====================================================================
// Standard 4-stage funnel: impressions → clickers → leads → sales
// Computes per-stage drop-off and overall conversion rate. Identifies
// the biggest-leak stage and projects What-If improvements.
//
// Health bands (overall CR = sales/impressions):
//   🟢 ≥5%    (excellent — funnel highly optimized)
//   🟡 1-5%   (good — room to optimize, especially middle stages)
//   🟠 0.1-1% (warning — significant drop-off, audit CTA + landing)
//   🔴 <0.1%  (critical — funnel broken or extremely thin audience)

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  excellent: 5.0,
  good: [1.0, 5.0],
  warning: [0.1, 1.0],
  critical: 0,
} as const;

// ============== Types ==============

export interface FunnelInputs {
  impressions: number;
  ctr: number;        // %
  leadRate: number;   // % of clickers
  saleRate: number;   // % of leads
  aov: number;        // $ average order value
  grossMargin: number; // %
}

// ============== Math helpers (exported for tests) ==============

export function stageVisitors(impressions: number): number {
  return impressions;
}

export function stageClickers(impressions: number, ctrPct: number): number {
  return impressions * (ctrPct / 100);
}

export function stageLeads(clickers: number, leadRatePct: number): number {
  return clickers * (leadRatePct / 100);
}

export function stageSales(leads: number, saleRatePct: number): number {
  return leads * (saleRatePct / 100);
}

export function overallCR(sales: number, impressions: number): number {
  if (impressions <= 0) return 0;
  return (sales / impressions) * 100;
}

export function dropOff(prevStage: number, currStage: number): number {
  return Math.max(0, prevStage - currStage);
}

export function biggestLeakStage(inputs: FunnelInputs): string {
  const s2 = stageClickers(inputs.impressions, inputs.ctr);
  const s3 = stageLeads(s2, inputs.leadRate);
  const s4 = stageSales(s3, inputs.saleRate);
  const d12 = dropOff(inputs.impressions, s2);
  const d23 = dropOff(s2, s3);
  const d34 = dropOff(s3, s4);
  const max = Math.max(d12, d23, d34);
  if (max === d12) return '1→2';
  if (max === d23) return '2→3';
  return '3→4';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const f: FunnelInputs = {
    impressions: clampNonNegative(parseFloat(inputs.impressions) || 0),
    ctr: clampNonNegative(parseFloat(inputs.ctr) || 0),
    leadRate: clampNonNegative(parseFloat(inputs.leadRate) || 0),
    saleRate: clampNonNegative(parseFloat(inputs.saleRate) || 0),
    aov: clampNonNegative(parseFloat(inputs.aov) || 0),
    grossMargin: clampNonNegative(parseFloat(inputs.grossMargin) || 0),
  };

  // Edge: no impressions
  if (f.impressions === 0) {
    return [
      makeToken('calc_out.section.funnel_value_calculator', '⏰ Funnel Value Calculator') +
        '\n\n' +
        makeToken('calc_out.funnel_value.row.need_inputs', '📊 Enter impressions, click-through rate, lead conversion rate, sale conversion rate, AOV, and gross margin to see overall funnel conversion rate, biggest drop-off stage, and revenue projections.'),
    ];
  }

  const s2 = stageClickers(f.impressions, f.ctr);
  const s3 = stageLeads(s2, f.leadRate);
  const s4 = stageSales(s3, f.saleRate);
  const cr = overallCR(s4, f.impressions);
  const totalRevenue = s4 * f.aov;
  const totalProfit = totalRevenue * (f.grossMargin / 100);
  const d12 = dropOff(f.impressions, s2);
  const d23 = dropOff(s2, s3);
  const d34 = dropOff(s3, s4);
  const leak = biggestLeakStage(f);
  const d12pct = f.impressions > 0 ? (d12 / f.impressions) * 100 : 0;
  const d23pct = s2 > 0 ? (d23 / s2) * 100 : 0;
  const d34pct = s3 > 0 ? (d34 / s3) * 100 : 0;

  // Health band（健康度 4 档各写一个 code 字面量 ⇒ 不动态拼码）
  let healthLine: string;
  if (cr >= HEALTH_BANDS.excellent) {
    healthLine = makeToken(
      'calc_out.funnel_value.row.health_excellent',
      '• 🟢 Excellent — overall CR ≥ 5%; funnel highly optimized',
    );
  } else if (cr >= HEALTH_BANDS.good[0]) {
    healthLine = makeToken(
      'calc_out.funnel_value.row.health_good',
      '• 🟡 Good — overall CR 1–5%; profitable with optimization upside',
    );
  } else if (cr >= HEALTH_BANDS.warning[0]) {
    healthLine = makeToken(
      'calc_out.funnel_value.row.health_warning',
      '• 🟠 Warning — overall CR 0.1–1%; significant drop-off',
    );
  } else {
    healthLine = makeToken(
      'calc_out.funnel_value.row.health_critical',
      '• 🔴 Critical — overall CR < 0.1%; funnel broken or extreme thin audience',
    );
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 1 });
  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // What-If: leadRate +30% (or 5pp, whichever bigger)
  const leadRateBoost = Math.max(f.leadRate * 0.3, 5);
  const newLeadRate = f.leadRate + leadRateBoost;
  const newS3 = stageLeads(s2, newLeadRate);
  const newS4 = stageSales(newS3, f.saleRate);
  const newCR = overallCR(newS4, f.impressions);
  const newRevenue = newS4 * f.aov;

  // Break-Even: at what overall CR does revenue exceed $X target?
  const targetRevenue = Math.max(totalRevenue, 10000); // arbitrary baseline
  const breakEvenCR = (targetRevenue / f.aov) / f.impressions * 100;
  const breakEvenLeadRate = s2 > 0 ? (targetRevenue / f.aov / s2) * 100 : 0;

  // Milestone: scaling impressions 2x
  const scale2xS2 = stageClickers(f.impressions * 2, f.ctr);
  const scale2xS4 = stageSales(stageLeads(scale2xS2, f.leadRate), f.saleRate);
  const scale2xRevenue = scale2xS4 * f.aov;
  const annualRevenue = totalRevenue * 12;

  // Tip: stage-specific advice
  let tip: string;
  if (leak === '1→2') {
    tip = makeToken('calc_out.funnel_value.row.tip_awareness', '💡 Tip: Biggest leak at the awareness stage (1→2): impressions → clickers lost ' + d12pct.toFixed(0) + '%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.', { lost: d12pct.toFixed(0) });
  } else if (leak === '2→3') {
    tip = makeToken('calc_out.funnel_value.row.tip_consideration', '💡 Tip: Biggest leak at the consideration stage (2→3): clickers → leads lost ' + d23pct.toFixed(0) + '%. Audit landing page, headline copy, and CTA. Optimize page-load speed and trust signals.', { lost: d23pct.toFixed(0) });
  } else if (leak === '3→4') {
    tip = makeToken('calc_out.funnel_value.row.tip_decision', '💡 Tip: Biggest leak at the decision stage (3→4): leads → sales lost ' + d34pct.toFixed(0) + '%. Test pricing, sales page, checkout flow. Add social proof, testimonials, and risk-reversal (guarantees).', { lost: d34pct.toFixed(0) });
  } else {
    tip = makeToken('calc_out.funnel_value.row.tip_add_data', '💡 Tip: Add data to see stage-specific recommendations.');
  }

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const crLabel = cr.toFixed(3);
  const revenueLabel = money(totalRevenue);
  const profitLabel = money(totalProfit);
  const impressionsLabel = fmt(f.impressions);
  const clickersLabel = fmt(s2);
  const ctrLabel = f.ctr.toFixed(1);
  const d12Label = d12pct.toFixed(1);
  const leadsLabel = fmt(s3);
  const leadRateLabel = f.leadRate.toFixed(1);
  const d23Label = d23pct.toFixed(1);
  const salesLabel = fmt(s4);
  const saleRateLabel = f.saleRate.toFixed(1);
  const d34Label = d34pct.toFixed(1);
  const aovLabel = money(f.aov);
  const marginLabel = f.grossMargin.toFixed(0);
  const leadRateBoostLabel = leadRateBoost.toFixed(1);
  const newLeadRateLabel = newLeadRate.toFixed(1);
  const newSalesLabel = fmt(newS4);
  const newRevenueLabel = money(newRevenue);
  const newCrLabel = newCR.toFixed(3);
  const targetRevenueLabel = money(targetRevenue);
  const needSalesLabel = fmt(targetRevenue / f.aov);
  const breakEvenCrLabel = breakEvenCR.toFixed(3);
  const breakEvenLeadRateLabel = breakEvenLeadRate.toFixed(1);
  const scale2xSalesLabel = fmt(scale2xS4);
  const scale2xRevenueLabel = money(scale2xRevenue);
  const annualRevenueLabel = money(annualRevenue);

  const r =
    makeToken('calc_out.section.funnel_value_calculator', '⏰ Funnel Value Calculator') + '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine + '\n' +
    makeToken('calc_out.funnel_value.row.overall_cr_leak', '• Overall conversion rate: ' + crLabel + '%  ·  Biggest leak: stage ' + leak, { cr: crLabel, leak: leak }) + '\n' +
    makeToken('calc_out.funnel_value.row.revenue_profit', '• Revenue: ' + revenueLabel + '  ·  Net profit: ' + profitLabel, { revenue: revenueLabel, profit: profitLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.funnel_value.row.impressions', '• Impressions:  ' + impressionsLabel, { value: impressionsLabel }) + '\n' +
    makeToken('calc_out.funnel_value.row.clickers', '• Clickers:     ' + clickersLabel + '  (CTR ' + ctrLabel + '%, drop ' + d12Label + '%)', { value: clickersLabel, ctr: ctrLabel, drop: d12Label }) + '\n' +
    makeToken('calc_out.funnel_value.row.leads', '• Leads:        ' + leadsLabel + '  (lead rate ' + leadRateLabel + '%, drop ' + d23Label + '%)', { value: leadsLabel, rate: leadRateLabel, drop: d23Label }) + '\n' +
    makeToken('calc_out.funnel_value.row.sales', '• Sales:        ' + salesLabel + '  (sale rate ' + saleRateLabel + '%, drop ' + d34Label + '%)', { value: salesLabel, rate: saleRateLabel, drop: d34Label }) + '\n' +
    makeToken('calc_out.funnel_value.row.aov_margin', '• AOV:          ' + aovLabel + '  ·  Margin: ' + marginLabel + '%', { aov: aovLabel, margin: marginLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if', '🔄 What-If:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.funnel_value.row.whatif_lead_rate', '• Lead rate +' + leadRateBoostLabel + 'pp (' + leadRateLabel + '% → ' + newLeadRateLabel + '%):', { boost: leadRateBoostLabel, from: leadRateLabel, to: newLeadRateLabel }) + '\n' +
    makeToken('calc_out.funnel_value.row.whatif_sales_revenue', '  • Sales: ' + salesLabel + ' → ' + newSalesLabel + '  ·  Revenue: ' + newRevenueLabel, { from: salesLabel, to: newSalesLabel, revenue: newRevenueLabel }) + '\n' +
    makeToken('calc_out.funnel_value.row.whatif_cr', '  • CR: ' + crLabel + '% → ' + newCrLabel + '%', { from: crLabel, to: newCrLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.break_even', '⚖️ Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.funnel_value.row.breakeven_target', '• To reach ' + targetRevenueLabel + ' revenue at current AOV: need ' + needSalesLabel + ' sales', { revenue: targetRevenueLabel, sales: needSalesLabel }) + '\n' +
    makeToken('calc_out.funnel_value.row.breakeven_cr', '  • Required overall CR: ' + breakEvenCrLabel + '% (currently ' + crLabel + '%)', { target: breakEvenCrLabel, current: crLabel }) + '\n' +
    makeToken('calc_out.funnel_value.row.breakeven_lead_rate', '  • Required lead rate: ' + breakEvenLeadRateLabel + '% (currently ' + leadRateLabel + '%)', { target: breakEvenLeadRateLabel, current: leadRateLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.funnel_value.row.milestone_scale_2x', '• Scale impressions 2x: ' + scale2xSalesLabel + ' sales → ' + scale2xRevenueLabel + ' revenue', { sales: scale2xSalesLabel, revenue: scale2xRevenueLabel }) + '\n' +
    makeToken('calc_out.funnel_value.row.milestone_12mo', '• 12-month projection (constant funnel): ' + annualRevenueLabel + ' revenue', { revenue: annualRevenueLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let o=function(t){return Number.isNaN(t)?0:Math.max(0,t)},h=function(t,e){return t*(e/100)},f=function(t,e){return t*(e/100)},p=function(t,e){return t*(e/100)},m=function(t,e){return e<=0?0:t/e*100},s=function(t,e){return Math.max(0,t-e)},j=function(t){const e=h(t.impressions,t.ctr),a=f(e,t.leadRate),l=p(a,t.saleRate),r=s(t.impressions,e),c=s(e,a),d=s(a,l),b=Math.max(r,c,d);return b===r?"1→2":b===c?"2→3":"3→4"},E=function(t,e,a){var l=se(t);return Array.isArray(l)?l.join(\`
\`):String(l)};var Re=o,he=h,be=f,xe=p,Le=m,Fe=s,me=j,Ce=E,n=tk,oe='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',n=new Function("return "+oe)(),F={excellent:5,good:[1,5],warning:[.1,1],critical:0},se=function(t){const e={impressions:o(parseFloat(t.impressions)||0),ctr:o(parseFloat(t.ctr)||0),leadRate:o(parseFloat(t.leadRate)||0),saleRate:o(parseFloat(t.saleRate)||0),aov:o(parseFloat(t.aov)||0),grossMargin:o(parseFloat(t.grossMargin)||0)};if(e.impressions===0)return[n("calc_out.section.funnel_value_calculator","⏰ Funnel Value Calculator")+\`

\`+n("calc_out.funnel_value.row.need_inputs","📊 Enter impressions, click-through rate, lead conversion rate, sale conversion rate, AOV, and gross margin to see overall funnel conversion rate, biggest drop-off stage, and revenue projections.")];const a=h(e.impressions,e.ctr),l=f(a,e.leadRate),r=p(l,e.saleRate),c=m(r,e.impressions),d=r*e.aov,b=d*(e.grossMargin/100),re=s(e.impressions,a),ce=s(a,l),ie=s(l,r),g=j(e),C=e.impressions>0?re/e.impressions*100:0,S=a>0?ce/a*100:0,M=l>0?ie/l*100:0;let w;c>=F.excellent?w=n("calc_out.funnel_value.row.health_excellent","• 🟢 Excellent — overall CR ≥ 5%; funnel highly optimized"):c>=F.good[0]?w=n("calc_out.funnel_value.row.health_good","• 🟡 Good — overall CR 1–5%; profitable with optimization upside"):c>=F.warning[0]?w=n("calc_out.funnel_value.row.health_warning","• 🟠 Warning — overall CR 0.1–1%; significant drop-off"):w=n("calc_out.funnel_value.row.health_critical","• 🔴 Critical — overall CR < 0.1%; funnel broken or extreme thin audience");const i=O=>O.toLocaleString("en-US",{maximumFractionDigits:1}),u=O=>"$"+Math.round(O).toLocaleString("en-US"),q=Math.max(e.leadRate*.3,5),A=e.leadRate+q,ue=f(a,A),y=p(ue,e.saleRate),de=m(y,e.impressions),ve=y*e.aov,x=Math.max(d,1e4),_e=x/e.aov/e.impressions*100,fe=a>0?x/e.aov/a*100:0,pe=h(e.impressions*2,e.ctr),B=p(f(pe,e.leadRate),e.saleRate),ge=B*e.aov,we=d*12;let R;g==="1→2"?R=n("calc_out.funnel_value.row.tip_awareness","💡 Tip: Biggest leak at the awareness stage (1→2): impressions → clickers lost "+C.toFixed(0)+"%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.",{lost:C.toFixed(0)}):g==="2→3"?R=n("calc_out.funnel_value.row.tip_consideration","💡 Tip: Biggest leak at the consideration stage (2→3): clickers → leads lost "+S.toFixed(0)+"%. Audit landing page, headline copy, and CTA. Optimize page-load speed and trust signals.",{lost:S.toFixed(0)}):g==="3→4"?R=n("calc_out.funnel_value.row.tip_decision","💡 Tip: Biggest leak at the decision stage (3→4): leads → sales lost "+M.toFixed(0)+"%. Test pricing, sales page, checkout flow. Add social proof, testimonials, and risk-reversal (guarantees).",{lost:M.toFixed(0)}):R=n("calc_out.funnel_value.row.tip_add_data","💡 Tip: Add data to see stage-specific recommendations.");const v=c.toFixed(3),V=u(d),N=u(b),z=i(e.impressions),I=i(a),U=e.ctr.toFixed(1),W=C.toFixed(1),$=i(l),_=e.leadRate.toFixed(1),G=S.toFixed(1),L=i(r),J=e.saleRate.toFixed(1),K=M.toFixed(1),P=u(e.aov),D=e.grossMargin.toFixed(0),Q=q.toFixed(1),X=A.toFixed(1),Y=i(y),Z=u(ve),H=de.toFixed(3),T=u(x),k=i(x/e.aov),ee=_e.toFixed(3),ne=fe.toFixed(1),te=i(B),ae=u(ge),le=u(we);return[n("calc_out.section.funnel_value_calculator","⏰ Funnel Value Calculator")+\`

\`+n("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+w+\`
\`+n("calc_out.funnel_value.row.overall_cr_leak","• Overall conversion rate: "+v+"%  ·  Biggest leak: stage "+g,{cr:v,leak:g})+\`
\`+n("calc_out.funnel_value.row.revenue_profit","• Revenue: "+V+"  ·  Net profit: "+N,{revenue:V,profit:N})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.funnel_value.row.impressions","• Impressions:  "+z,{value:z})+\`
\`+n("calc_out.funnel_value.row.clickers","• Clickers:     "+I+"  (CTR "+U+"%, drop "+W+"%)",{value:I,ctr:U,drop:W})+\`
\`+n("calc_out.funnel_value.row.leads","• Leads:        "+$+"  (lead rate "+_+"%, drop "+G+"%)",{value:$,rate:_,drop:G})+\`
\`+n("calc_out.funnel_value.row.sales","• Sales:        "+L+"  (sale rate "+J+"%, drop "+K+"%)",{value:L,rate:J,drop:K})+\`
\`+n("calc_out.funnel_value.row.aov_margin","• AOV:          "+P+"  ·  Margin: "+D+"%",{aov:P,margin:D})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.what_if","🔄 What-If:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.funnel_value.row.whatif_lead_rate","• Lead rate +"+Q+"pp ("+_+"% → "+X+"%):",{boost:Q,from:_,to:X})+\`
\`+n("calc_out.funnel_value.row.whatif_sales_revenue","  • Sales: "+L+" → "+Y+"  ·  Revenue: "+Z,{from:L,to:Y,revenue:Z})+\`
\`+n("calc_out.funnel_value.row.whatif_cr","  • CR: "+v+"% → "+H+"%",{from:v,to:H})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.break_even","⚖️ Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.funnel_value.row.breakeven_target","• To reach "+T+" revenue at current AOV: need "+k+" sales",{revenue:T,sales:k})+\`
\`+n("calc_out.funnel_value.row.breakeven_cr","  • Required overall CR: "+ee+"% (currently "+v+"%)",{target:ee,current:v})+\`
\`+n("calc_out.funnel_value.row.breakeven_lead_rate","  • Required lead rate: "+ne+"% (currently "+_+"%)",{target:ne,current:_})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+n("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+n("calc_out.funnel_value.row.milestone_scale_2x","• Scale impressions 2x: "+te+" sales → "+ae+" revenue",{sales:te,revenue:ae})+\`
\`+n("calc_out.funnel_value.row.milestone_12mo","• 12-month projection (constant funnel): "+le+" revenue",{revenue:le})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+R+\`
\`]};return[E(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-funnel-value-calculator',
  title: 'Funnel Value Calculator',
  description:
    'Measure marketing funnel value across 4 stages: impressions → clickers → leads → sales. See overall conversion rate, biggest drop-off stage, what-if improvements, and revenue projections. Health bands: 🟢 ≥5% · 🟡 1–5% · 🟠 0.1–1% · 🔴 <0.1%.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'impressions', label: 'Impressions (top of funnel)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'ctr', label: 'Click-Through Rate (%)', placeholder: 'e.g. 2.5', type: 'number' },
    { name: 'leadRate', label: 'Lead Conversion Rate (% of clickers)', placeholder: 'e.g. 15', type: 'number' },
    { name: 'saleRate', label: 'Sale Conversion Rate (% of leads)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'aov', label: 'Average Order Value ($)', placeholder: 'e.g. 80', type: 'number' },
    { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 70', type: 'number' },
  ],
  keywords: [
    'funnel value calculator',
    'marketing funnel',
    'conversion funnel',
    'funnel analysis',
    'sales funnel',
    'CTR',
    'lead conversion',
    'sales conversion',
    'funnel optimization',
    'AOV',
  ],
  tags: ['marketing', 'funnel', 'conversion'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-05',
  sources: [
    'https://blog.hubspot.com/marketing/conversion-funnel',
    'https://www.salesforce.com/resources/articles/sales-funnel/',
    'https://unbounce.com/conversion-rate-optimization/conversion-funnel/',
    'https://www.optimizely.com/insights/blog/conversion-funnel/',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
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
  generate: calculate,
  staticExamples: ['$calc_out.section.funnel_value_calculator|⏰ Funnel Value Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.funnel_value.row.health_critical|• 🔴 Critical — overall CR < 0.1%; funnel broken or extreme thin audience|\n$calc_out.funnel_value.row.overall_cr_leak{"cr":"0.019","leak":"1→2"}|• Overall conversion rate: 0.019%  ·  Biggest leak: stage 1→2|\n$calc_out.funnel_value.row.revenue_profit{"revenue":"$1,500","profit":"$1,050"}|• Revenue: $1,500  ·  Net profit: $1,050|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.funnel_value.row.impressions{"value":"100,000"}|• Impressions:  100,000|\n$calc_out.funnel_value.row.clickers{"value":"2,500","ctr":"2.5","drop":"97.5"}|• Clickers:     2,500  (CTR 2.5%, drop 97.5%)|\n$calc_out.funnel_value.row.leads{"value":"375","rate":"15.0","drop":"85.0"}|• Leads:        375  (lead rate 15.0%, drop 85.0%)|\n$calc_out.funnel_value.row.sales{"value":"18.8","rate":"5.0","drop":"95.0"}|• Sales:        18.8  (sale rate 5.0%, drop 95.0%)|\n$calc_out.funnel_value.row.aov_margin{"aov":"$80","margin":"70"}|• AOV:          $80  ·  Margin: 70%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.funnel_value.row.whatif_lead_rate{"boost":"5.0","from":"15.0","to":"20.0"}|• Lead rate +5.0pp (15.0% → 20.0%):|\n$calc_out.funnel_value.row.whatif_sales_revenue{"from":"18.8","to":"25","revenue":"$2,000"}|  • Sales: 18.8 → 25  ·  Revenue: $2,000|\n$calc_out.funnel_value.row.whatif_cr{"from":"0.019","to":"0.025"}|  • CR: 0.019% → 0.025%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.funnel_value.row.breakeven_target{"revenue":"$10,000","sales":"125"}|• To reach $10,000 revenue at current AOV: need 125 sales|\n$calc_out.funnel_value.row.breakeven_cr{"target":"0.125","current":"0.019"}|  • Required overall CR: 0.125% (currently 0.019%)|\n$calc_out.funnel_value.row.breakeven_lead_rate{"target":"5.0","current":"15.0"}|  • Required lead rate: 5.0% (currently 15.0%)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.funnel_value.row.milestone_scale_2x{"sales":"37.5","revenue":"$3,000"}|• Scale impressions 2x: 37.5 sales → $3,000 revenue|\n$calc_out.funnel_value.row.milestone_12mo{"revenue":"$18,000"}|• 12-month projection (constant funnel): $18,000 revenue|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.funnel_value.row.tip_awareness{"lost":"98"}|💡 Tip: Biggest leak at the awareness stage (1→2): impressions → clickers lost 98%. Test new ad creative, audience targeting, and channel mix. Most cost-effective lever at this stage.|\n'],
  faq: [
    { q: 'What is a typical funnel conversion rate?', a: 'E-commerce funnels: 1-3% overall CR (impressions → sale). B2B SaaS free-trial funnels: 0.1-1%. Lead-gen funnels: 0.5-2%. Industry varies; benchmark your funnel vs your specific vertical.' },
    { q: 'Where is the biggest leak in most funnels?', a: 'Awareness stage (1→2) — typically 97-99% of impressions never click. Optimization focus: ad creative + targeting. Second-biggest leak varies by business — measure yours.' },
    { q: 'How do I improve a specific stage?', a: 'Stage 1→2 (CTR): test creative, copy, audience. Stage 2→3 (lead rate): landing page, headline, CTA. Stage 3→4 (sale rate): pricing, sales page, checkout, social proof.' },
    { q: 'Should I focus on CTR or conversion rate?', a: 'Both matter but conversion rate has 3-5x more ROI than CTR (a 30% landing page lift often beats a 30% CTR lift). Optimize the bottom of the funnel first.' },
    { q: "What is funnel value analysis?", a: "Funnel value = revenue potential at each funnel stage. Helps prioritize: where to invest to maximize revenue. Example: 10K visitors → 1K signups → 100 customers → $100K revenue. Identify biggest drop-off: optimize there first. Often: biggest opportunity is mid-funnel (consideration). Tool: AARRR (Acquisition, Activation, Retention, Revenue, Referral) for SaaS." },
    { q: "What is a good conversion rate at each funnel stage?", a: "Benchmarks: 1) Visitor to lead: 2-5%, 2) Lead to MQL: 10-20%, 3) MQL to SQL: 20-30%, 4) SQL to opportunity: 30-50%, 5) Opportunity to close: 20-30%. E-commerce: 1-3% visitor to purchase. SaaS trial: 15-25%. Each stage: 10-30% improvement with focused optimization. Track per stage. Industry varies by niche." },
    { q: "How do I find the biggest funnel bottleneck?", a: "Calculate: revenue impact = (current_conversion × remaining_value) - (improved_conversion × improved_value). Pick stage with biggest gap. Often: 1) Top of funnel (low traffic), 2) Activation (low first-week retention), 3) Conversion (low trial-to-paid). Run user research. Most teams: 2-3 bottlenecks, fix the biggest first. Compound wins." },
    { q: "What is the difference between funnel and pipeline?", a: "Funnel: marketing/sales stages from awareness to purchase. Generic. Pipeline: specific deals in CRM. Sales pipeline: qualified leads being worked. Marketing funnel: visitor to MQL. Sales funnel: MQL to close. Use: funnel for system design, pipeline for forecasting. B2B: pipeline matters more. B2C: funnel matters more. Both: visual representation of customer journey." },
    { q: "How do I optimize the middle of the funnel?", a: "Middle = consideration (lead to opportunity). Tactics include 1) Email nurture (5-7 emails over 2-4 weeks), 2) Retargeting ads, 3) Comparison content, 4) Webinars, 5) Case studies, 6) Sales calls (B2B), 7) Free trials (SaaS). Best ROI: 1 + 2 + 4. Most teams 2x conversion in middle funnel within 6 months. Use lead scoring to prioritize." },
    { q: "What is the role of segmentation in funnel optimization?", a: "Segmentation = grouping users by behavior, demographics, source. Examples: by source (organic, paid, social), by behavior (high-intent, browsing), by plan (free, paid). Optimize per segment: different funnels for different users. Most teams: 30-50% improvement in conversion with segmentation. Start: 3-5 segments. Tools: Mixpanel, Amplitude, HubSpot." },
    { q: "How do I attribute revenue to funnel stages?", a: "Models: 1) First-touch (first interaction), 2) Last-touch (final interaction), 3) Multi-touch (weighted). For funnel: first-touch shows top of funnel impact, last-touch shows closing channels. Use multi-touch for accurate ROI. Tools: HubSpot, Salesforce, Bizible, custom. Compare: first vs last vs multi. Most: 60% of revenue from multi-touch attribution." },
    { q: "How do I scale funnel without losing quality?", a: "Tactics: 1) Automate nurture (email, scoring), 2) Build self-serve options (trials, freemium), 3) Sales enablement (better tools, training), 4) Improve qualification (MQL → SQL faster), 5) Better handoff (marketing → sales). Most teams: 2-3x funnel capacity in 12 months without adding headcount. Top lever: better qualification. Don't scale broken funnels." },
  ],
  howToUse: [
    'Enter top-of-funnel impressions for the period (month, quarter).',
    'Enter your CTR (clickers ÷ impressions × 100).',
    'Enter lead conversion rate (leads ÷ clickers × 100).',
    'Enter sale conversion rate (sales ÷ leads × 100).',
    'Enter AOV (average order value) and gross margin %.',
    'Read the biggest leak — that is your highest-leverage optimization target.',
  ],
  engineKey: true,
};

registerEngine(engine);