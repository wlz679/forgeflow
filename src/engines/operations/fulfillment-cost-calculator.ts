import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Order Fulfillment Cost Calculator (P7-5) — Business v3 standard
// =====================================================================
//
// Per-order cost = labor + shipping + packaging + return handling.
// labor = (pick min + pack min) / 60 × labor rate.
// return handling = return rate % × $4.50 (avg return handling cost).
// Health bands ($/order):
//   🟢 < $5       — efficient; profitable fulfillment
//   🟡 $5–$10     — typical retail range
//   🟠 $10–$20    — high; automate or batch
//   🔴 ≥ $20      — critical; consider 3PL or restructure
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC) — service
// businesses with no order fulfillment should skip this calculator.

const AVG_RETURN_HANDLING_COST = 4.5; // $4.50 per returned order (industry average)

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 5.0,
  good: [5.0, 10.0],
  warning: [10.0, 20.0],
  critical: 20.0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Labor minutes per order = pick min + pack min. */
export function laborMinPerOrder(pickMin: number, packMin: number): number {
  return pickMin + packMin;
}

/** Labor cost per order ($) = (labor min / 60) × labor rate ($/hr). */
export function laborCostPerOrder(laborMin: number, laborRate: number): number {
  return (laborMin / 60) * laborRate;
}

/** Return handling cost per order ($) = return rate % × $4.50. */
export function returnHandlingPerOrder(returnRatePct: number): number {
  return (returnRatePct / 100) * AVG_RETURN_HANDLING_COST;
}

/** Per-order total fulfillment cost ($) = labor + shipping + packaging + return handling. */
export function perOrderCost(
  laborCostPerOrder: number,
  shippingCost: number,
  packagingCost: number,
  returnHandlingPerOrder: number
): number {
  return laborCostPerOrder + shippingCost + packagingCost + returnHandlingPerOrder;
}

/** Monthly total cost = per-order × orders per month. */
export function monthlyTotal(perOrderCost: number, ordersPerMonth: number): number {
  return perOrderCost * ordersPerMonth;
}

/** Annual total = monthly × 12. */
export function annualTotal(monthlyTotal: number): number {
  return monthlyTotal * 12;
}

/** Health band label from per-order cost. */
export function calcHealthBand(perOrderCost: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (perOrderCost < HEALTH_BANDS.excellent) return 'excellent';
  if (perOrderCost < HEALTH_BANDS.good[1]) return 'good';
  if (perOrderCost < HEALTH_BANDS.warning[1]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const ordersPerMonth = clampNonNegative(parseFloat(inputs.ordersPerMonth) || 0);
  const pickMin = clampNonNegative(parseFloat(inputs.pickMin) || 0);
  const packMin = clampNonNegative(parseFloat(inputs.packMin) || 0);
  const shippingCost = clampNonNegative(parseFloat(inputs.shippingCost) || 0);
  const packagingCost = clampNonNegative(parseFloat(inputs.packagingCost) || 0);
  const laborRate = clampNonNegative(parseFloat(inputs.laborRate) || 0);
  const returnRate = clampNonNegative(Math.min(100, parseFloat(inputs.returnRate) || 0));

  // Edge: zero orders → prompt
  if (ordersPerMonth === 0) {
    return [
      makeToken('calc_out.section.fulfillment_cost_calculator', '⏰ Order Fulfillment Cost Calculator') +
        '\n\n' +
        makeToken('calc_out.fulfillment_cost.row.need_inputs', '📊 Enter your orders per month, pick/pack time, shipping/packaging costs, labor rate, and return rate to see per-order and monthly fulfillment costs and how you compare to industry benchmarks.'),
    ];
  }

  const laborMin = laborMinPerOrder(pickMin, packMin);
  const laborCost = laborCostPerOrder(laborMin, laborRate);
  const retHandling = returnHandlingPerOrder(returnRate);
  const poCost = perOrderCost(laborCost, shippingCost, packagingCost, retHandling);
  const moTotal = monthlyTotal(poCost, ordersPerMonth);
  const annTotal = annualTotal(moTotal);

  const money = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const moneyR = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band（健康度 4 档各写一个 code 字面量 ⇒ 不动态拼码）
  const band = calcHealthBand(poCost);
  let healthLine: string;
  if (band === 'excellent') {
    healthLine = makeToken(
      'calc_out.fulfillment_cost.row.health_excellent',
      '• 🟢 Excellent — per-order cost < $5; efficient fulfillment',
    );
  } else if (band === 'good') {
    healthLine = makeToken(
      'calc_out.fulfillment_cost.row.health_good',
      '• 🟡 Good — $5–$10 per order; typical retail range',
    );
  } else if (band === 'warning') {
    healthLine = makeToken(
      'calc_out.fulfillment_cost.row.health_warning',
      '• 🟠 Warning — $10–$20 per order; high; automate or batch',
    );
  } else {
    healthLine = makeToken(
      'calc_out.fulfillment_cost.row.health_critical',
      '• 🔴 Critical — ≥ $20 per order; restructure or switch to 3PL',
    );
  }

  // What-If: returns drop to 3%, then labor 25% faster
  const retDown = 3;
  const retHandlingDown = returnHandlingPerOrder(retDown);
  const poCostRetDown = perOrderCost(laborCost, shippingCost, packagingCost, retHandlingDown);
  const savingsRet = moTotal - monthlyTotal(poCostRetDown, ordersPerMonth);

  const laborMin25 = laborMin * 0.75;
  const laborCost25 = laborCostPerOrder(laborMin25, laborRate);
  const poCostLabor25 = perOrderCost(laborCost25, shippingCost, packagingCost, retHandling);
  const savingsLabor = moTotal - monthlyTotal(poCostLabor25, ordersPerMonth);

  // Break-Even: max labor min per order for 🟢 (< $5 total)
  // poCost < 5
  // (laborMin / 60) × laborRate + shipping + packaging + retHandling < 5
  // laborMin < (5 - shipping - packaging - retHandling) × 60 / laborRate
  const fixedCosts = shippingCost + packagingCost + retHandling;
  const targetLaborCost = 5.0 - fixedCosts;
  const targetLaborMin = laborRate > 0 && targetLaborCost > 0 ? (targetLaborCost * 60) / laborRate : Infinity;
  const laborHeadroom = laborMin - targetLaborMin;

  // Milestone: 12-mo savings if cost drops $1/order
  const savingsPerOrder1 = 1;
  const annualSavings1 = savingsPerOrder1 * ordersPerMonth * 12;

  // Tip: band-driven contextual advice（每个档位一个 code 字面量）
  let tip: string;
  if (band === 'critical') {
    tip = makeToken(
      'calc_out.fulfillment_cost.row.tip_critical',
      '💡 Tip: ≥ $20 per order is unsustainable. Switch to a 3PL (typical $3–$8/order), negotiate shipping rates (50%+ savings possible at scale), and audit SKU-level fulfillment complexity (top 20% of SKUs often drive 80% of cost).',
    );
  } else if (band === 'warning') {
    tip = makeToken(
      'calc_out.fulfillment_cost.row.tip_warning',
      '💡 Tip: $10–$20 per order is high. Batch pick (process 5+ orders at once), automate packaging (tape dispensers, dunnage systems), and audit return reasons (often 30–50% reducible via better product descriptions).',
    );
  } else if (band === 'good') {
    tip = makeToken(
      'calc_out.fulfillment_cost.row.tip_good',
      '💡 Tip: $5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).',
    );
  } else {
    tip = makeToken(
      'calc_out.fulfillment_cost.row.tip_excellent',
      '💡 Tip: Excellent fulfillment cost. Keep monitoring — as you scale, revisit 3PL pricing (often $3–$5/order), renegotiate carrier rates annually, and watch for return-rate creep (each +1% return adds $0.05/order).',
    );
  }

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const ordersLabel = String(ordersPerMonth);
  const pickLabel = String(pickMin);
  const packLabel = String(packMin);
  const laborCostLabel = money(laborCost);
  const laborMinLabel = String(laborMin);
  const shippingLabel = money(shippingCost);
  const packagingLabel = money(packagingCost);
  const returnRateLabel = returnRate.toFixed(1);
  const retHandlingLabel = money(retHandling);
  const poCostLabel = money(poCost);
  const moTotalLabel = moneyR(moTotal);
  const annTotalLabel = moneyR(annTotal);
  const poRetDownLabel = money(poCostRetDown);
  const savingsRetLabel = moneyR(savingsRet);
  const poLabor25Label = money(poCostLabor25);
  const savingsLaborLabel = moneyR(savingsLabor);
  const targetLaborMinLabel = targetLaborMin.toFixed(1);
  const headroomMinLabel = laborHeadroom.toFixed(1);
  const annualSavingsLabel = moneyR(annualSavings1);
  const reinvestLabel = moneyR(annualSavings1 * 0.08);
  const compoundedLabel = moneyR(annualSavings1 * 1.08 * 3 - annualSavings1 * 3);

  const r =
    makeToken('calc_out.section.fulfillment_cost_calculator', '⏰ Order Fulfillment Cost Calculator') + '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine + '\n' +
    makeToken('calc_out.fulfillment_cost.row.per_order_cost', '• Per-order cost: ' + poCostLabel + '  ·  Monthly total: ' + moTotalLabel + '  ·  Annual: ' + annTotalLabel, { cost: poCostLabel, monthly: moTotalLabel, annual: annTotalLabel }) + '\n' +
    (poCost < 5
      ? makeToken('calc_out.fulfillment_cost.row.benchmark_below', '• Industry benchmark: $5–$10/order  ·  Your status: below benchmark')
      : poCost < 10
      ? makeToken('calc_out.fulfillment_cost.row.benchmark_in', '• Industry benchmark: $5–$10/order  ·  Your status: in benchmark')
      : poCost < 20
      ? makeToken('calc_out.fulfillment_cost.row.benchmark_above', '• Industry benchmark: $5–$10/order  ·  Your status: above benchmark')
      : makeToken('calc_out.fulfillment_cost.row.benchmark_critical', '• Industry benchmark: $5–$10/order  ·  Your status: critical')) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.fulfillment_cost.row.orders_per_month', '• Orders per month:        ' + ordersLabel, { orders: ordersLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.pick_time', '• Pick time:               ' + pickLabel + ' min/order', { minutes: pickLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.pack_time', '• Pack time:               ' + packLabel + ' min/order', { minutes: packLabel }) + '\n' +
    '• Labor rate:              ' + money(laborRate) + '/hr\n' +
    makeToken('calc_out.fulfillment_cost.row.labor_cost', '• Labor cost:              ' + laborCostLabel + '/order  (' + laborMinLabel + ' min)', { cost: laborCostLabel, minutes: laborMinLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.shipping_cost', '• Shipping cost:           ' + shippingLabel + '/order', { cost: shippingLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.packaging_cost', '• Packaging cost:          ' + packagingLabel + '/order', { cost: packagingLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.return_rate', '• Return rate:             ' + returnRateLabel + '%  ·  handling = ' + retHandlingLabel + '/order', { rate: returnRateLabel, handling: retHandlingLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.per_order_total', '• Per-order total:         ' + poCostLabel, { cost: poCostLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if', '🔄 What-If:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.fulfillment_cost.row.whatif_returns_drop', '• Returns drop to 3%: per-order = ' + poRetDownLabel + '  ·  monthly savings = ' + savingsRetLabel, { cost: poRetDownLabel, savings: savingsRetLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.whatif_labor_faster', '• Labor 25% faster: per-order = ' + poLabor25Label + '  ·  monthly savings = ' + savingsLaborLabel, { cost: poLabor25Label, savings: savingsLaborLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.whatif_combined', '• Combined (3% returns + 25% faster labor): see Milestone') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.break_even', '⚖️ Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (isFinite(targetLaborMin)
      ? makeToken('calc_out.fulfillment_cost.row.breakeven_max_labor_min', '• Max labor min for 🟢 (< $5/order total): ' + targetLaborMinLabel + ' min', { minutes: targetLaborMinLabel })
      : makeToken('calc_out.fulfillment_cost.row.breakeven_max_labor_na', '• Max labor min for 🟢 (< $5/order total): N/A (fixed costs alone exceed $5)')) + '\n' +
    (laborHeadroom > 0
      ? makeToken('calc_out.fulfillment_cost.row.breakeven_headroom_reduce', '• Labor headroom: reduce pick+pack by ' + headroomMinLabel + ' min to hit 🟢', { minutes: headroomMinLabel })
      : laborHeadroom === 0
      ? makeToken('calc_out.fulfillment_cost.row.breakeven_headroom_threshold', '• Labor headroom: at threshold')
      : makeToken('calc_out.fulfillment_cost.row.breakeven_headroom_below', '• Labor headroom: already below target')) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.fulfillment_cost.row.milestone_12mo_savings', '• 12-mo savings if cost drops $1/order: ' + annualSavingsLabel, { value: annualSavingsLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.milestone_reinvested', '• Reinvested at 8% return: ' + reinvestLabel + '/yr additional', { value: reinvestLabel }) + '\n' +
    makeToken('calc_out.fulfillment_cost.row.milestone_compounded', '• Compounded over 3 years: ' + compoundedLabel + ' (vs $0 reinvested)', { value: compoundedLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let n=function(o){return Number.isNaN(o)?0:Math.max(0,o)},R=function(o,r){return o+r},$=function(o,r){return o/60*r},x=function(o){return o/100*et},g=function(o,r,s,e){return o+r+s+e},b=function(o,r){return o*r},P=function(o){return o*12},I=function(o){return o<y.excellent?"excellent":o<y.good[1]?"good":o<y.warning[1]?"warning":"critical"},O=function(o,r,s){var e=lt(o);return Array.isArray(e)?e.join(\`
\`):String(e)};var _t=n,dt=R,pt=$,gt=x,bt=g,ht=b,mt=P,wt=I,vt=O,t=tk,nt='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+nt)(),et=4.5,y={excellent:5,good:[5,10],warning:[10,20],critical:20},lt=function(o){const r=n(parseFloat(o.ordersPerMonth)||0),s=n(parseFloat(o.pickMin)||0),e=n(parseFloat(o.packMin)||0),u=n(parseFloat(o.shippingCost)||0),f=n(parseFloat(o.packagingCost)||0),_=n(parseFloat(o.laborRate)||0),j=n(Math.min(100,parseFloat(o.returnRate)||0));if(r===0)return[t("calc_out.section.fulfillment_cost_calculator","⏰ Order Fulfillment Cost Calculator")+\`

\`+t("calc_out.fulfillment_cost.row.need_inputs","📊 Enter your orders per month, pick/pack time, shipping/packaging costs, labor rate, and return rate to see per-order and monthly fulfillment costs and how you compare to industry benchmarks.")];const h=R(s,e),C=$(h,_),m=x(j),a=g(C,u,f,m),w=b(a,r),ct=P(w),l=S=>"$"+S.toLocaleString("en-US",{maximumFractionDigits:2}),c=S=>"$"+Math.round(S).toLocaleString("en-US"),i=I(a);let d;i==="excellent"?d=t("calc_out.fulfillment_cost.row.health_excellent","• 🟢 Excellent — per-order cost < $5; efficient fulfillment"):i==="good"?d=t("calc_out.fulfillment_cost.row.health_good","• 🟡 Good — $5–$10 per order; typical retail range"):i==="warning"?d=t("calc_out.fulfillment_cost.row.health_warning","• 🟠 Warning — $10–$20 per order; high; automate or batch"):d=t("calc_out.fulfillment_cost.row.health_critical","• 🔴 Critical — ≥ $20 per order; restructure or switch to 3PL");const at=x(3),D=g(C,u,f,at),it=w-b(D,r),st=h*.75,ut=$(st,_),q=g(ut,u,f,m),ft=w-b(q,r),E=5-(u+f+m),M=_>0&&E>0?E*60/_:1/0,F=h-M,v=1*r*12;let p;i==="critical"?p=t("calc_out.fulfillment_cost.row.tip_critical","💡 Tip: ≥ $20 per order is unsustainable. Switch to a 3PL (typical $3–$8/order), negotiate shipping rates (50%+ savings possible at scale), and audit SKU-level fulfillment complexity (top 20% of SKUs often drive 80% of cost)."):i==="warning"?p=t("calc_out.fulfillment_cost.row.tip_warning","💡 Tip: $10–$20 per order is high. Batch pick (process 5+ orders at once), automate packaging (tape dispensers, dunnage systems), and audit return reasons (often 30–50% reducible via better product descriptions)."):i==="good"?p=t("calc_out.fulfillment_cost.row.tip_good","💡 Tip: $5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time)."):p=t("calc_out.fulfillment_cost.row.tip_excellent","💡 Tip: Excellent fulfillment cost. Keep monitoring — as you scale, revisit 3PL pricing (often $3–$5/order), renegotiate carrier rates annually, and watch for return-rate creep (each +1% return adds $0.05/order).");const K=String(r),N=String(s),U=String(e),Y=l(C),W=String(h),G=l(u),H=l(f),J=j.toFixed(1),z=l(m),L=l(a),A=c(w),B=c(ct),Q=l(D),V=c(it),X=l(q),Z=c(ft),k=M.toFixed(1),T=F.toFixed(1),tt=c(v),ot=c(v*.08),rt=c(v*1.08*3-v*3);return[t("calc_out.section.fulfillment_cost_calculator","⏰ Order Fulfillment Cost Calculator")+\`

\`+t("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+d+\`
\`+t("calc_out.fulfillment_cost.row.per_order_cost","• Per-order cost: "+L+"  ·  Monthly total: "+A+"  ·  Annual: "+B,{cost:L,monthly:A,annual:B})+\`
\`+(a<5?t("calc_out.fulfillment_cost.row.benchmark_below","• Industry benchmark: $5–$10/order  ·  Your status: below benchmark"):a<10?t("calc_out.fulfillment_cost.row.benchmark_in","• Industry benchmark: $5–$10/order  ·  Your status: in benchmark"):a<20?t("calc_out.fulfillment_cost.row.benchmark_above","• Industry benchmark: $5–$10/order  ·  Your status: above benchmark"):t("calc_out.fulfillment_cost.row.benchmark_critical","• Industry benchmark: $5–$10/order  ·  Your status: critical"))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.fulfillment_cost.row.orders_per_month","• Orders per month:        "+K,{orders:K})+\`
\`+t("calc_out.fulfillment_cost.row.pick_time","• Pick time:               "+N+" min/order",{minutes:N})+\`
\`+t("calc_out.fulfillment_cost.row.pack_time","• Pack time:               "+U+" min/order",{minutes:U})+\`
• Labor rate:              \`+l(_)+\`/hr
\`+t("calc_out.fulfillment_cost.row.labor_cost","• Labor cost:              "+Y+"/order  ("+W+" min)",{cost:Y,minutes:W})+\`
\`+t("calc_out.fulfillment_cost.row.shipping_cost","• Shipping cost:           "+G+"/order",{cost:G})+\`
\`+t("calc_out.fulfillment_cost.row.packaging_cost","• Packaging cost:          "+H+"/order",{cost:H})+\`
\`+t("calc_out.fulfillment_cost.row.return_rate","• Return rate:             "+J+"%  ·  handling = "+z+"/order",{rate:J,handling:z})+\`
\`+t("calc_out.fulfillment_cost.row.per_order_total","• Per-order total:         "+L,{cost:L})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.what_if","🔄 What-If:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.fulfillment_cost.row.whatif_returns_drop","• Returns drop to 3%: per-order = "+Q+"  ·  monthly savings = "+V,{cost:Q,savings:V})+\`
\`+t("calc_out.fulfillment_cost.row.whatif_labor_faster","• Labor 25% faster: per-order = "+X+"  ·  monthly savings = "+Z,{cost:X,savings:Z})+\`
\`+t("calc_out.fulfillment_cost.row.whatif_combined","• Combined (3% returns + 25% faster labor): see Milestone")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.break_even","⚖️ Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(isFinite(M)?t("calc_out.fulfillment_cost.row.breakeven_max_labor_min","• Max labor min for 🟢 (< $5/order total): "+k+" min",{minutes:k}):t("calc_out.fulfillment_cost.row.breakeven_max_labor_na","• Max labor min for 🟢 (< $5/order total): N/A (fixed costs alone exceed $5)"))+\`
\`+(F>0?t("calc_out.fulfillment_cost.row.breakeven_headroom_reduce","• Labor headroom: reduce pick+pack by "+T+" min to hit 🟢",{minutes:T}):F===0?t("calc_out.fulfillment_cost.row.breakeven_headroom_threshold","• Labor headroom: at threshold"):t("calc_out.fulfillment_cost.row.breakeven_headroom_below","• Labor headroom: already below target"))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.fulfillment_cost.row.milestone_12mo_savings","• 12-mo savings if cost drops $1/order: "+tt,{value:tt})+\`
\`+t("calc_out.fulfillment_cost.row.milestone_reinvested","• Reinvested at 8% return: "+ot+"/yr additional",{value:ot})+\`
\`+t("calc_out.fulfillment_cost.row.milestone_compounded","• Compounded over 3 years: "+rt+" (vs $0 reinvested)",{value:rt})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+p+\`
\`]};return[O(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-fulfillment-cost-calculator',
  title: 'Order Fulfillment Cost Calculator',
  description:
    'Per-order cost decomposition — labor + shipping + packaging + returns handling. The "true cost" of fulfilling one order; often higher than expected. Health bands: 🟢 <$5 · 🟡 $5–$10 · 🟠 $10–$20 · 🔴 ≥$20.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'ordersPerMonth', label: 'Orders per Month', placeholder: 'e.g. 500', type: 'number' },
    { name: 'pickMin', label: 'Pick Time (min/order)', placeholder: 'e.g. 3', type: 'number' },
    { name: 'packMin', label: 'Pack Time (min/order)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'shippingCost', label: 'Shipping Cost per Order ($)', placeholder: 'e.g. 5.50', type: 'number' },
    { name: 'packagingCost', label: 'Packaging Cost per Order ($)', placeholder: 'e.g. 1.20', type: 'number' },
    { name: 'laborRate', label: 'Labor Rate ($/hour)', placeholder: 'e.g. 18', type: 'number' },
    { name: 'returnRate', label: 'Return Rate (%)', placeholder: 'e.g. 8', type: 'number' },
  ],
  keywords: [
    'fulfillment cost calculator',
    'order fulfillment cost',
    'pick and pack cost',
    'shipping cost',
    'packaging cost',
    'return handling cost',
    'per order cost',
    '3PL comparison',
    'ecommerce fulfillment',
    'Shopify fulfillment cost',
  ],
  tags: ['operations', 'fulfillment', 'pick-pack', 'shipping'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.shipbob.com/blog/fulfillment-cost/',
    'https://www.shopify.com/enterprise/blog/ecommerce-fulfillment',
    'https://www.bigcommerce.com/blog/fulfillment-cost/',
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
  staticExamples: ['$calc_out.section.fulfillment_cost_calculator|⏰ Order Fulfillment Cost Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.fulfillment_cost.row.health_good|• 🟡 Good — $5–$10 per order; typical retail range|\n$calc_out.fulfillment_cost.row.per_order_cost{"cost":"$8.56","monthly":"$4,280","annual":"$51,360"}|• Per-order cost: $8.56  ·  Monthly total: $4,280  ·  Annual: $51,360|\n$calc_out.fulfillment_cost.row.benchmark_in|• Industry benchmark: $5–$10/order  ·  Your status: in benchmark|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.fulfillment_cost.row.orders_per_month{"orders":"500"}|• Orders per month:        500|\n$calc_out.fulfillment_cost.row.pick_time{"minutes":"3"}|• Pick time:               3 min/order|\n$calc_out.fulfillment_cost.row.pack_time{"minutes":"2"}|• Pack time:               2 min/order|\n• Labor rate:              $18/hr\n$calc_out.fulfillment_cost.row.labor_cost{"cost":"$1.5","minutes":"5"}|• Labor cost:              $1.5/order  (5 min)|\n$calc_out.fulfillment_cost.row.shipping_cost{"cost":"$5.5"}|• Shipping cost:           $5.5/order|\n$calc_out.fulfillment_cost.row.packaging_cost{"cost":"$1.2"}|• Packaging cost:          $1.2/order|\n$calc_out.fulfillment_cost.row.return_rate{"rate":"8.0","handling":"$0.36"}|• Return rate:             8.0%  ·  handling = $0.36/order|\n$calc_out.fulfillment_cost.row.per_order_total{"cost":"$8.56"}|• Per-order total:         $8.56|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.fulfillment_cost.row.whatif_returns_drop{"cost":"$8.33","savings":"$113"}|• Returns drop to 3%: per-order = $8.33  ·  monthly savings = $113|\n$calc_out.fulfillment_cost.row.whatif_labor_faster{"cost":"$8.19","savings":"$187"}|• Labor 25% faster: per-order = $8.19  ·  monthly savings = $187|\n$calc_out.fulfillment_cost.row.whatif_combined|• Combined (3% returns + 25% faster labor): see Milestone|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.fulfillment_cost.row.breakeven_max_labor_na|• Max labor min for 🟢 (< $5/order total): N/A (fixed costs alone exceed $5)|\n$calc_out.fulfillment_cost.row.breakeven_headroom_below|• Labor headroom: already below target|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.fulfillment_cost.row.milestone_12mo_savings{"value":"$6,000"}|• 12-mo savings if cost drops $1/order: $6,000|\n$calc_out.fulfillment_cost.row.milestone_reinvested{"value":"$480"}|• Reinvested at 8% return: $480/yr additional|\n$calc_out.fulfillment_cost.row.milestone_compounded{"value":"$1,440"}|• Compounded over 3 years: $1,440 (vs $0 reinvested)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.fulfillment_cost.row.tip_good|💡 Tip: $5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).|\n'],
  faq: [
    { q: 'What is a typical per-order fulfillment cost?', a: '$5–$10 is typical retail. <$5 is excellent (high-volume operators or efficient 3PLs). $10–$20 is high (small-volume in-house). ≥$20 is critical (often indicates manual labor + inefficient shipping).' },
    { q: 'Should I use a 3PL or fulfill in-house?', a: '3PLs typically charge $3–$8 per order and become cost-effective above ~200 orders/month. Below that, in-house is often cheaper (3PL minimums + storage fees). Compare using this calculator with 3PL quote.' },
    { q: 'How can I reduce return handling costs?', a: 'Returns typically cost $4–$10/order to handle (receiving, inspecting, restocking or disposing). Reduce at source: better product descriptions, accurate sizing, AR try-on tools, packaging integrity.' },
    { q: 'What is the biggest cost driver?', a: 'Usually shipping (40–60% of per-order cost for small parcels). Negotiate rates at scale (carriers give 30–50% discounts above 100 orders/week), use regional carriers, or batch orders to LTL for heavy items.' },
    { q: "What is a good fulfillment cost per order?", a: "Benchmarks: 1) Self-fulfilled small business: $5-15, 2) 3PL mid-size: $3-8, 3) Amazon FBA: $5-10, 4) Enterprise (millions of orders): $2-5. Includes: pick + pack + ship + materials. Lower = better. By category: apparel higher (size variants), books lower (standard size). Most teams: aim for $5-7 per order." },
    { q: "What are the components of fulfillment cost?", a: "Cost components: 1) Pick fee ($0.50-2), 2) Pack fee ($0.50-2), 3) Materials (box, tape, dunnage: $0.50-3), 4) Shipping label ($3-15 for small parcel), 5) Warehousing ($0.50-5/unit/month), 6) Returns ($5-15 per return). Total: $5-30 per order. Optimize: pick/pack efficiency, materials, shipping rates, returns process." },
    { q: "How do I reduce fulfillment cost?", a: "1) Negotiate shipping rates (USPS discounts, FedEx tier 2-3), 2) Optimize packaging (right-size boxes), 3) Batch pick/pack, 4) Reduce split shipments, 5) Use 3PL (often 30-50% cheaper than self), 6) Reduce returns (better product info). Most teams 20-40% reduction in 12 months. Best ROI: shipping rate negotiation (immediate)." },
    { q: "When should I use a 3PL?", a: "Use 3PL when: 1) >500 orders/month (cheaper than self), 2) Multi-warehouse needed, 3) International expansion, 4) Capital constraints, 5) Time-to-market matters. Common 3PLs: ShipBob, ShipMonk, Rakuten, Fulfilled by Amazon (FBA). Cost: 30-50% less than self at 1000+ orders/month. Be careful: lock-in contracts, integration complexity." },
    { q: "What is FBA vs FBM?", a: "FBA (Fulfilled by Amazon): Amazon stores, picks, packs, ships. Pros: Prime badge, fast shipping, customer trust. Cons: fees ($5-10/order + storage), less control, returns to Amazon. FBM (Fulfilled by Merchant): you ship. Pros: lower fees, control, branding. Cons: slower, no Prime, harder to scale. Most: FBA for top SKUs, FBM for the rest." },
    { q: "How do shipping zones affect cost?", a: "Shipping zones: 1-8 in US. Zone 1-4: cheap ($3-7), zone 5-8: expensive ($8-20). Per zone: 1-2 lbs package. Most ecommerce: 2-3 zone average. Tactics include 1) Multiple warehouses (closer to customers), 2) USPS for lightweight, 3) FedEx Ground for midweight, 4) Negotiate tier 2-3 rates at 1000+ orders/month. Most teams 20-40% shipping cost reduction with multi-warehouse." },
    { q: "How do returns affect fulfillment cost?", a: "Returns: 5-15% of orders in apparel, 5-10% in electronics, 2-5% in beauty. Cost: $5-15 per return (inspection, repackaging, return shipping). Tactics include 1) Better product info, 2) Size guides (apparel), 3) Quality control, 4) Easier returns (encourages purchases), 5) Restocking fees. Most teams 10-20% reduction in returns with better content + sizing. Track return rate by SKU." },
    { q: "Should I charge for shipping?", a: "Mixed. Free shipping: 20-30% conversion lift, but eats margin. Threshold: \"Free over $50\" drives AOV. Most ecommerce: 1) Free over $X (target AOV), 2) Flat rate ($5-7), 3) Real-time rates (pass through). Best option: free over $50-100 threshold. 5-10% conversion lift is worth 5-10% margin hit. Free shipping = 2-3x add-to-cart rate." },
  ],
  howToUse: [
    'Enter your monthly order volume.',
    'Enter pick and pack time per order (in minutes).',
    'Enter shipping cost per order (what you pay the carrier on average).',
    'Enter packaging cost per order (boxes, tape, dunnage).',
    'Enter labor rate (hourly wage for pick/pack staff).',
    'Enter return rate (% of orders returned).',
    'Read the per-order cost and compare to the $5–$10 industry benchmark band.',
  ],
  engineKey: true,
};
registerEngine(engine);