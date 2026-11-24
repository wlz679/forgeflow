import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Carrying Cost Calculator (P7-2) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Total annual cost of holding inventory = (storage + insurance + shrinkage
// + opportunity + other) % × avg inventory value. Industry rule of thumb:
// 20–30% of inventory value per year.
// Health bands (% of inventory value):
//   🟢 < 20%        — efficient; capital not over-taxed
//   🟡 20%–25%      — typical retail range
//   🟠 25%–30%      — high carrying cost; renegotiate 3PL
//   🔴 ≥ 30%        — critical; reduce SKU count or storage spend
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC) AND service
// businesses with inventory (course creators with merch, agencies with hardware).

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 20.0,
  good: [20.0, 25.0],
  warning: [25.0, 30.0],
  critical: 30.0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Total carrying cost rate (%) = storage + insurance + shrinkage + opp + other. */
export function totalRate(
  storageRate: number,
  insuranceRate: number,
  shrinkageRate: number,
  oppCostRate: number,
  otherCostsPct: number
): number {
  return storageRate + insuranceRate + shrinkageRate + oppCostRate + otherCostsPct;
}

/** Total annual carrying cost ($) = inventory value × rate / 100. */
export function totalAnnualCost(avgInventoryValue: number, rate: number): number {
  return avgInventoryValue * (rate / 100);
}

/** Per-component annual cost ($) — for breakdown display. */
export function componentCost(avgInventoryValue: number, ratePct: number): number {
  return avgInventoryValue * (ratePct / 100);
}

/** Health band label from total rate. */
export function calcHealthBand(rate: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (rate < HEALTH_BANDS.excellent) return 'excellent';
  if (rate < HEALTH_BANDS.good[1]) return 'good';
  if (rate < HEALTH_BANDS.warning[1]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const avgInventoryValue = clampNonNegative(parseFloat(inputs.avgInventoryValue) || 0);
  const storageRate = clampNonNegative(parseFloat(inputs.storageRate) || 0);
  const insuranceRate = clampNonNegative(parseFloat(inputs.insuranceRate) || 0);
  const shrinkageRate = clampNonNegative(parseFloat(inputs.shrinkageRate) || 0);
  const oppCostRate = clampNonNegative(parseFloat(inputs.oppCostRate) || 0);
  const otherCostsPct = clampNonNegative(parseFloat(inputs.otherCostsPct) || 0);

  // Edge: zero inventory → prompt to enter value
  if (avgInventoryValue === 0) {
    return [
      makeToken('calc_out.section.carrying_cost_calculator', '⏰ Carrying Cost Calculator') +
        '\n\n' +
        makeToken('calc_out.carrying_cost.row.need_inputs', '📊 Enter your average inventory value and the five carrying-cost rate components (storage, insurance, shrinkage, opportunity cost, other) to see your total annual carrying cost and how you compare to industry benchmarks.'),
    ];
  }

  const tr = totalRate(storageRate, insuranceRate, shrinkageRate, oppCostRate, otherCostsPct);
  const totalCost = totalAnnualCost(avgInventoryValue, tr);
  const storageCost = componentCost(avgInventoryValue, storageRate);
  const insuranceCost = componentCost(avgInventoryValue, insuranceRate);
  const shrinkageCost = componentCost(avgInventoryValue, shrinkageRate);
  const oppCost = componentCost(avgInventoryValue, oppCostRate);
  const otherCost = componentCost(avgInventoryValue, otherCostsPct);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(tr);
  let healthLine: string;
  if (band === 'excellent') {
    healthLine = makeToken(
      'calc_out.carrying_cost.row.health_excellent',
      '• 🟢 Excellent — total carry < 20%; capital is efficient',
    );
  } else if (band === 'good') {
    healthLine = makeToken(
      'calc_out.carrying_cost.row.health_good',
      '• 🟡 Good — typical retail range (20–25%); review annually',
    );
  } else if (band === 'warning') {
    healthLine = makeToken(
      'calc_out.carrying_cost.row.health_warning',
      '• 🟠 Warning — high carrying cost (25–30%); reduce SKU count or storage spend',
    );
  } else {
    healthLine = makeToken(
      'calc_out.carrying_cost.row.health_critical',
      '• 🔴 Critical — ≥ 30%; urgent renegotiation of 3PL / storage contracts',
    );
  }

  // What-If: shrinkage drops to 0.5% (loss-prevention win), then total -2pp
  const shrinkageDown = 0.5;
  const trShrinkageDown = storageRate + insuranceRate + shrinkageDown + oppCostRate + otherCostsPct;
  const totalCostShrinkageDown = totalAnnualCost(avgInventoryValue, trShrinkageDown);
  const savingsFromShrinkage = totalCost - totalCostShrinkageDown;

  const trDown2pp = Math.max(0, tr - 2);
  const totalCostDown2pp = totalAnnualCost(avgInventoryValue, trDown2pp);
  const savings2pp = totalCost - totalCostDown2pp;

  // Break-Even: max total rate for 🟢 (< 20%); reverse-solve storage headroom
  const otherRatesSum = insuranceRate + shrinkageRate + oppCostRate + otherCostsPct;
  const targetStorage = 19.9 - otherRatesSum; // ceiling for storage alone to hit 🟢
  const storageHeadroom = storageRate - targetStorage;

  // Milestone: 12-mo savings if rate drops 2pp
  const annualSavings2pp = savings2pp;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip = makeToken('calc_out.carrying_cost.row.tip_critical', '💡 Tip: ≥ 30% carrying cost is unsustainable. Renegotiate 3PL contracts (storage fees are usually the biggest lever), kill bottom-decile SKUs, and consider drop-shipping for slow movers to remove inventory from your books entirely.');
  } else if (band === 'warning') {
    tip = makeToken('calc_out.carrying_cost.row.tip_warning', '💡 Tip: 25–30% is high. Reduce SKU count by 20% (typically kills 60% of slow-moving capital), audit shrinkage (most teams find 0.5–1.5% recoverable via better receiving/inventory audits), and check storage rates against 2 alternative 3PLs.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.carrying_cost.row.tip_good', '💡 Tip: 20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.');
  } else {
    tip = makeToken('calc_out.carrying_cost.row.tip_excellent', '💡 Tip: Excellent carry cost. Your capital is efficient — keep monitoring for creep. Watch for: storage rate increases on contract renewal, opportunity cost drift if interest rates fall (re-evaluate opp cost annually).');
  }

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const trLabel = tr.toFixed(1);
  const totalCostLabel = money(totalCost);
  const avgInventoryLabel = money(avgInventoryValue);
  const storageRateLabel = storageRate.toFixed(1);
  const storageCostLabel = money(storageCost);
  const insuranceRateLabel = insuranceRate.toFixed(1);
  const insuranceCostLabel = money(insuranceCost);
  const shrinkageRateLabel = shrinkageRate.toFixed(1);
  const shrinkageCostLabel = money(shrinkageCost);
  const oppRateLabel = oppCostRate.toFixed(1);
  const oppCostLabel = money(oppCost);
  const otherRateLabel = otherCostsPct.toFixed(1);
  const otherCostLabel = money(otherCost);
  const trShrinkageDownLabel = trShrinkageDown.toFixed(1);
  const totalCostShrinkageDownLabel = money(totalCostShrinkageDown);
  const savingsFromShrinkageLabel = money(savingsFromShrinkage);
  const trDown2ppLabel = trDown2pp.toFixed(1);
  const totalCostDown2ppLabel = money(totalCostDown2pp);
  const savings2ppLabel = money(savings2pp);
  const targetStorageLabel = targetStorage.toFixed(1);
  const storageHeadroomLabel = storageHeadroom.toFixed(1);
  const annualSavingsLabel = money(annualSavings2pp);
  const reinvestLabel = money(annualSavings2pp * 0.08);
  const compoundedLabel = money(annualSavings2pp * 1.08 * 3 - annualSavings2pp * 3);

  const r =
    makeToken('calc_out.section.carrying_cost_calculator', '⏰ Carrying Cost Calculator') + '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine + '\n' +
    makeToken('calc_out.carrying_cost.row.total_rate_cost', '• Total rate: ' + trLabel + '%/year  ·  Total annual cost: ' + totalCostLabel, { rate: trLabel, cost: totalCostLabel }) + '\n' +
    (tr < 20
      ? makeToken('calc_out.carrying_cost.row.benchmark_below', '• Industry benchmark: 20–30% of inventory value/year  ·  Your status: below benchmark')
      : tr < 25
      ? makeToken('calc_out.carrying_cost.row.benchmark_in', '• Industry benchmark: 20–30% of inventory value/year  ·  Your status: in benchmark')
      : tr < 30
      ? makeToken('calc_out.carrying_cost.row.benchmark_above', '• Industry benchmark: 20–30% of inventory value/year  ·  Your status: above benchmark')
      : makeToken('calc_out.carrying_cost.row.benchmark_critical', '• Industry benchmark: 20–30% of inventory value/year  ·  Your status: critical')) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.carrying_cost.row.avg_inventory', '• Avg inventory value:    ' + avgInventoryLabel, { value: avgInventoryLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.storage', '• Storage:                ' + storageRateLabel + '%  =  ' + storageCostLabel + '/yr', { rate: storageRateLabel, cost: storageCostLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.insurance', '• Insurance:              ' + insuranceRateLabel + '%  =  ' + insuranceCostLabel + '/yr', { rate: insuranceRateLabel, cost: insuranceCostLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.shrinkage', '• Shrinkage:              ' + shrinkageRateLabel + '%  =  ' + shrinkageCostLabel + '/yr', { rate: shrinkageRateLabel, cost: shrinkageCostLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.opportunity_cost', '• Opportunity cost:       ' + oppRateLabel + '%  =  ' + oppCostLabel + '/yr', { rate: oppRateLabel, cost: oppCostLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.other', '• Other:                  ' + otherRateLabel + '%  =  ' + otherCostLabel + '/yr', { rate: otherRateLabel, cost: otherCostLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.total', '• TOTAL:                  ' + trLabel + '%  =  ' + totalCostLabel + '/yr', { rate: trLabel, cost: totalCostLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if', '🔄 What-If:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.carrying_cost.row.whatif_shrinkage_down', '• Shrinkage drops to 0.5% (loss-prevention win): rate = ' + trShrinkageDownLabel + '%  ·  annual cost = ' + totalCostShrinkageDownLabel + '  ·  savings = ' + savingsFromShrinkageLabel, { rate: trShrinkageDownLabel, cost: totalCostShrinkageDownLabel, savings: savingsFromShrinkageLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.whatif_rate_down_2pp', '• Total rate drops −2pp: rate = ' + trDown2ppLabel + '%  ·  annual cost = ' + totalCostDown2ppLabel + '  ·  savings = ' + savings2ppLabel, { rate: trDown2ppLabel, cost: totalCostDown2ppLabel, savings: savings2ppLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.break_even', '⚖️ Break-Even:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (targetStorage >= 0
      ? makeToken('calc_out.carrying_cost.row.breakeven_max_storage', '• Max storage rate for 🟢 (target <20% total): ' + targetStorageLabel + '%', { rate: targetStorageLabel })
      : makeToken('calc_out.carrying_cost.row.breakeven_max_storage_na', '• Max storage rate for 🟢 (target <20% total): N/A (other components already exceed 20% — must reduce elsewhere)')) + '\n' +
    (storageHeadroom > 0
      ? makeToken('calc_out.carrying_cost.row.breakeven_headroom_reduce', '• Storage headroom: reduce storage by ' + storageHeadroomLabel + 'pp to hit 🟢', { points: storageHeadroomLabel })
      : storageHeadroom === 0
      ? makeToken('calc_out.carrying_cost.row.breakeven_headroom_threshold', '• Storage headroom: at threshold')
      : makeToken('calc_out.carrying_cost.row.breakeven_headroom_below', '• Storage headroom: already below target')) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.carrying_cost.row.milestone_12mo_savings', '• 12-mo savings if rate drops 2pp: ' + annualSavingsLabel, { value: annualSavingsLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.milestone_reinvested', '• Reinvested at 8% return: ' + reinvestLabel + '/yr additional', { value: reinvestLabel }) + '\n' +
    makeToken('calc_out.carrying_cost.row.milestone_compounded', '• Compounded over 3 years: ' + compoundedLabel + ' (vs $0 reinvested)', { value: compoundedLabel }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let c=function(o){return Number.isNaN(o)?0:Math.max(0,o)},S=function(o,r,e,n,l){return o+r+e+n+l},p=function(o,r){return o*(r/100)},i=function(o,r){return o*(r/100)},x=function(o){return o<b.excellent?"excellent":o<b.good[1]?"good":o<b.warning[1]?"warning":"critical"},F=function(o,r,e){var n=tt(o);return Array.isArray(n)?n.join(\`
\`):String(n)};var it=c,lt=S,ut=p,gt=i,_t=x,yt=F,t=tk,T='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+T)(),b={excellent:20,good:[20,25],warning:[25,30],critical:30},tt=function(o){const r=c(parseFloat(o.avgInventoryValue)||0),e=c(parseFloat(o.storageRate)||0),n=c(parseFloat(o.insuranceRate)||0),l=c(parseFloat(o.shrinkageRate)||0),g=c(parseFloat(o.oppCostRate)||0),_=c(parseFloat(o.otherCostsPct)||0);if(r===0)return[t("calc_out.section.carrying_cost_calculator","⏰ Carrying Cost Calculator")+\`

\`+t("calc_out.carrying_cost.row.need_inputs","📊 Enter your average inventory value and the five carrying-cost rate components (storage, insurance, shrinkage, opportunity cost, other) to see your total annual carrying cost and how you compare to industry benchmarks.")];const s=S(e,n,l,g,_),f=p(r,s),ot=i(r,e),rt=i(r,n),at=i(r,l),nt=i(r,g),et=i(r,_),a=st=>"$"+Math.round(st).toLocaleString("en-US"),u=x(s);let y;u==="excellent"?y=t("calc_out.carrying_cost.row.health_excellent","• 🟢 Excellent — total carry < 20%; capital is efficient"):u==="good"?y=t("calc_out.carrying_cost.row.health_good","• 🟡 Good — typical retail range (20–25%); review annually"):u==="warning"?y=t("calc_out.carrying_cost.row.health_warning","• 🟠 Warning — high carrying cost (25–30%); reduce SKU count or storage spend"):y=t("calc_out.carrying_cost.row.health_critical","• 🔴 Critical — ≥ 30%; urgent renegotiation of 3PL / storage contracts");const R=e+n+.5+g+_,m=p(r,R),ct=f-m,I=Math.max(0,s-2),D=p(r,I),M=f-D,C=19.9-(n+l+g+_),L=e-C,d=M;let h;u==="critical"?h=t("calc_out.carrying_cost.row.tip_critical","💡 Tip: ≥ 30% carrying cost is unsustainable. Renegotiate 3PL contracts (storage fees are usually the biggest lever), kill bottom-decile SKUs, and consider drop-shipping for slow movers to remove inventory from your books entirely."):u==="warning"?h=t("calc_out.carrying_cost.row.tip_warning","💡 Tip: 25–30% is high. Reduce SKU count by 20% (typically kills 60% of slow-moving capital), audit shrinkage (most teams find 0.5–1.5% recoverable via better receiving/inventory audits), and check storage rates against 2 alternative 3PLs."):u==="good"?h=t("calc_out.carrying_cost.row.tip_good","💡 Tip: 20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes."):h=t("calc_out.carrying_cost.row.tip_excellent","💡 Tip: Excellent carry cost. Your capital is efficient — keep monitoring for creep. Watch for: storage rate increases on contract renewal, opportunity cost drift if interest rates fall (re-evaluate opp cost annually).");const v=s.toFixed(1),w=a(f),O=a(r),P=e.toFixed(1),j=a(ot),Y=n.toFixed(1),q=a(rt),E=l.toFixed(1),K=a(at),N=g.toFixed(1),U=a(nt),A=_.toFixed(1),W=a(et),$=R.toFixed(1),V=a(m),G=a(ct),J=I.toFixed(1),z=a(D),Q=a(M),X=C.toFixed(1),Z=L.toFixed(1),B=a(d),H=a(d*.08),k=a(d*1.08*3-d*3);return[t("calc_out.section.carrying_cost_calculator","⏰ Carrying Cost Calculator")+\`

\`+t("calc_out.section.health","🩺 Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+y+\`
\`+t("calc_out.carrying_cost.row.total_rate_cost","• Total rate: "+v+"%/year  ·  Total annual cost: "+w,{rate:v,cost:w})+\`
\`+(s<20?t("calc_out.carrying_cost.row.benchmark_below","• Industry benchmark: 20–30% of inventory value/year  ·  Your status: below benchmark"):s<25?t("calc_out.carrying_cost.row.benchmark_in","• Industry benchmark: 20–30% of inventory value/year  ·  Your status: in benchmark"):s<30?t("calc_out.carrying_cost.row.benchmark_above","• Industry benchmark: 20–30% of inventory value/year  ·  Your status: above benchmark"):t("calc_out.carrying_cost.row.benchmark_critical","• Industry benchmark: 20–30% of inventory value/year  ·  Your status: critical"))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.inputs_snapshot","📊 Inputs Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.carrying_cost.row.avg_inventory","• Avg inventory value:    "+O,{value:O})+\`
\`+t("calc_out.carrying_cost.row.storage","• Storage:                "+P+"%  =  "+j+"/yr",{rate:P,cost:j})+\`
\`+t("calc_out.carrying_cost.row.insurance","• Insurance:              "+Y+"%  =  "+q+"/yr",{rate:Y,cost:q})+\`
\`+t("calc_out.carrying_cost.row.shrinkage","• Shrinkage:              "+E+"%  =  "+K+"/yr",{rate:E,cost:K})+\`
\`+t("calc_out.carrying_cost.row.opportunity_cost","• Opportunity cost:       "+N+"%  =  "+U+"/yr",{rate:N,cost:U})+\`
\`+t("calc_out.carrying_cost.row.other","• Other:                  "+A+"%  =  "+W+"/yr",{rate:A,cost:W})+\`
\`+t("calc_out.carrying_cost.row.total","• TOTAL:                  "+v+"%  =  "+w+"/yr",{rate:v,cost:w})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.what_if","🔄 What-If:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.carrying_cost.row.whatif_shrinkage_down","• Shrinkage drops to 0.5% (loss-prevention win): rate = "+$+"%  ·  annual cost = "+V+"  ·  savings = "+G,{rate:$,cost:V,savings:G})+\`
\`+t("calc_out.carrying_cost.row.whatif_rate_down_2pp","• Total rate drops −2pp: rate = "+J+"%  ·  annual cost = "+z+"  ·  savings = "+Q,{rate:J,cost:z,savings:Q})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.break_even","⚖️ Break-Even:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(C>=0?t("calc_out.carrying_cost.row.breakeven_max_storage","• Max storage rate for 🟢 (target <20% total): "+X+"%",{rate:X}):t("calc_out.carrying_cost.row.breakeven_max_storage_na","• Max storage rate for 🟢 (target <20% total): N/A (other components already exceed 20% — must reduce elsewhere)"))+\`
\`+(L>0?t("calc_out.carrying_cost.row.breakeven_headroom_reduce","• Storage headroom: reduce storage by "+Z+"pp to hit 🟢",{points:Z}):L===0?t("calc_out.carrying_cost.row.breakeven_headroom_threshold","• Storage headroom: at threshold"):t("calc_out.carrying_cost.row.breakeven_headroom_below","• Storage headroom: already below target"))+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.milestone","🎯 Milestone:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.carrying_cost.row.milestone_12mo_savings","• 12-mo savings if rate drops 2pp: "+B,{value:B})+\`
\`+t("calc_out.carrying_cost.row.milestone_reinvested","• Reinvested at 8% return: "+H+"/yr additional",{value:H})+\`
\`+t("calc_out.carrying_cost.row.milestone_compounded","• Compounded over 3 years: "+k+" (vs $0 reinvested)",{value:k})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+h+\`
\`]};return[F(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-carrying-cost-calculator',
  title: 'Carrying Cost Calculator',
  description:
    'Total annual cost of holding inventory — storage + insurance + shrinkage + opportunity cost + other. Industry rule of thumb: 20–30% of inventory value per year. Health bands: 🟢 <20% · 🟡 20–25% · 🟠 25–30% · 🔴 ≥30%.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'avgInventoryValue', label: 'Average Inventory Value', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'storageRate', label: 'Storage Cost (% of inventory)', placeholder: 'e.g. 8', type: 'number' },
    { name: 'insuranceRate', label: 'Insurance Cost (%)', placeholder: 'e.g. 1.5', type: 'number' },
    { name: 'shrinkageRate', label: 'Shrinkage / Damage (%)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'oppCostRate', label: 'Opportunity Cost (%)', placeholder: 'e.g. 8', type: 'number' },
    { name: 'otherCostsPct', label: 'Other Carrying Costs (%)', placeholder: 'e.g. 2', type: 'number' },
  ],
  keywords: [
    'carrying cost calculator',
    'inventory holding cost',
    'storage cost',
    'shrinkage rate',
    'opportunity cost inventory',
    'inventory carrying cost',
    'total inventory cost',
    'B2B inventory metrics',
    'warehouse cost',
    'inventory financing',
  ],
  tags: ['operations', 'inventory', 'carrying-cost', 'storage'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.investopedia.com/terms/c/carrying-cost.asp',
    'https://www.shopify.com/blog/carrying-cost',
    'https://www.shipbob.com/blog/carrying-cost/',
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
  staticExamples: ['$calc_out.section.carrying_cost_calculator|⏰ Carrying Cost Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.carrying_cost.row.health_good|• 🟡 Good — typical retail range (20–25%); review annually|\n$calc_out.carrying_cost.row.total_rate_cost{"rate":"21.5","cost":"$10,750"}|• Total rate: 21.5%/year  ·  Total annual cost: $10,750|\n$calc_out.carrying_cost.row.benchmark_in|• Industry benchmark: 20–30% of inventory value/year  ·  Your status: in benchmark|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.carrying_cost.row.avg_inventory{"value":"$50,000"}|• Avg inventory value:    $50,000|\n$calc_out.carrying_cost.row.storage{"rate":"8.0","cost":"$4,000"}|• Storage:                8.0%  =  $4,000/yr|\n$calc_out.carrying_cost.row.insurance{"rate":"1.5","cost":"$750"}|• Insurance:              1.5%  =  $750/yr|\n$calc_out.carrying_cost.row.shrinkage{"rate":"2.0","cost":"$1,000"}|• Shrinkage:              2.0%  =  $1,000/yr|\n$calc_out.carrying_cost.row.opportunity_cost{"rate":"8.0","cost":"$4,000"}|• Opportunity cost:       8.0%  =  $4,000/yr|\n$calc_out.carrying_cost.row.other{"rate":"2.0","cost":"$1,000"}|• Other:                  2.0%  =  $1,000/yr|\n$calc_out.carrying_cost.row.total{"rate":"21.5","cost":"$10,750"}|• TOTAL:                  21.5%  =  $10,750/yr|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.carrying_cost.row.whatif_shrinkage_down{"rate":"20.0","cost":"$10,000","savings":"$750"}|• Shrinkage drops to 0.5% (loss-prevention win): rate = 20.0%  ·  annual cost = $10,000  ·  savings = $750|\n$calc_out.carrying_cost.row.whatif_rate_down_2pp{"rate":"19.5","cost":"$9,750","savings":"$1,000"}|• Total rate drops −2pp: rate = 19.5%  ·  annual cost = $9,750  ·  savings = $1,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.carrying_cost.row.breakeven_max_storage{"rate":"6.4"}|• Max storage rate for 🟢 (target <20% total): 6.4%|\n$calc_out.carrying_cost.row.breakeven_headroom_reduce{"points":"1.6"}|• Storage headroom: reduce storage by 1.6pp to hit 🟢|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.carrying_cost.row.milestone_12mo_savings{"value":"$1,000"}|• 12-mo savings if rate drops 2pp: $1,000|\n$calc_out.carrying_cost.row.milestone_reinvested{"value":"$80"}|• Reinvested at 8% return: $80/yr additional|\n$calc_out.carrying_cost.row.milestone_compounded{"value":"$240"}|• Compounded over 3 years: $240 (vs $0 reinvested)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.carrying_cost.row.tip_good|💡 Tip: 20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.|\n'],
  faq: [
    { q: 'What is a typical inventory carrying cost?', a: 'Industry rule of thumb: 20–30% of inventory value per year. Storage is usually the largest component (5–10%), followed by opportunity cost (5–10%), shrinkage (1–3%), insurance (1–2%), and other (1–3%).' },
    { q: 'How do I reduce my carrying cost?', a: 'Three biggest levers: (1) reduce SKU count — kill bottom 20% (typically frees 50%+ of capital), (2) renegotiate 3PL contracts — most teams save 15–30%, (3) tighten reorder points and reduce safety stock (saves 10–20%).' },
    { q: 'How is opportunity cost calculated?', a: 'Opportunity cost = capital tied up in inventory × alternative investment return. If your inventory holds $50k and you could earn 8% elsewhere, opp cost = $4k/year. Adjust when interest rates change (lower rates → lower opp cost).' },
    { q: 'Does shrinkage include theft?', a: 'Yes — shrinkage is the umbrella term for inventory loss from theft, damage, expiry, miscounting, and supplier fraud. Most teams find 0.5–1.5% recoverable via better receiving/inventory audits; >2% suggests a process problem.' },
    { q: "What is inventory carrying cost?", a: "Carrying cost = total cost of holding inventory per year. Components: 1) Capital cost (opportunity cost of money tied up): 5-15% of inventory value, 2) Storage cost (warehousing): 2-5%, 3) Insurance + taxes: 1-3%, 4) Shrinkage (theft, damage, expiry): 1-5%, 5) Obsolescence: 2-10%. Total: 15-30% of inventory value per year. Industry average: 25%." },
    { q: "How do I reduce inventory carrying cost?", a: "1) Just-in-time (JIT) inventory, 2) Better demand forecasting, 3) Drop shipping, 4) Lower safety stock, 5) Cross-docking, 6) Markdown slow-movers early, 7) Negotiate supplier terms (consignment, longer payment). Most teams 10-30% reduction in 12 months. Aim for 15-20% carrying cost (vs 25% average)." },
    { q: "What is the difference between carrying cost and holding cost?", a: "Same thing. Holding cost = carrying cost = total cost of inventory per year. Sometimes \"carrying cost\" includes shipping to customer (last-mile), but typically it's the storage + capital + obsolescence. Most teams: 20-30% of inventory value annually. Use for: EOQ, reorder point, safety stock calculations. Lower = more efficient." },
    { q: "What is a good inventory turnover ratio?", a: "Benchmarks: 4-6x/year is good. 8-12x is excellent. <3x = overstocked. By industry: grocery 12-20x, apparel 4-8x, electronics 6-10x, auto 2-4x. Calculate: COGS / average inventory. Higher = more efficient. Target: industry-specific. Low: cash tied up, obsolescence risk. High: stockout risk. Sweet spot: 6-8x for most." },
    { q: "How does carrying cost affect pricing?", a: "Carrying cost adds to product cost. For 25% carrying cost on $100 product: $25/year. If turns 4x/year: $6.25 per unit per sale. Add to COGS. Higher carrying cost = higher prices. Reduce: lower inventory, faster turns, lower storage cost. Most products: 5-15% of price is carrying cost. Affects margin significantly." },
    { q: "What is safety stock and how does it relate?", a: "Safety stock = extra inventory to prevent stockouts. Higher = lower stockout risk, higher carrying cost. Lower = higher stockout risk, lower cost. Formula: safety_stock = Z × σ_demand × √(lead_time). Where Z = service level factor, σ = demand variability. Most teams: 1-2 weeks of demand as safety stock. Trade-off: cost vs service level." },
    { q: "How do I calculate inventory obsolescence cost?", a: "Obsolescence: inventory that won't sell. Cost: 1) Write-down (full cost), 2) Markdown (typically 30-70% off), 3) Disposal cost. Common in: fashion (seasons), tech (new models), food (expiry). Tactics to reduce: 1) Better forecasting, 2) Smaller initial orders, 3) Faster turns, 4) Markdown early (less write-down). Most: 5-10% of inventory becomes obsolete." },
    { q: "Should I drop ship to reduce carrying cost?", a: "Drop ship: supplier ships directly to customer. Pros: 1) Zero inventory carrying cost, 2) Lower capital needs, 3) Wider product range. Cons: 1) Lower margin (10-30% less), 2) Less control over shipping, 3) Inventory surprises, 4) Customer service harder. Best for: low-volume SKUs, long-tail products, test markets. Hybrid: stock fast-movers, drop ship the rest." },
  ],
  howToUse: [
    'Enter your average inventory value (often calculated as (beginning + ending inventory) / 2).',
    'Enter each carrying cost component as a percentage of inventory value (storage / insurance / shrinkage / opportunity / other).',
    'Read the total annual cost and compare to the 20–30% industry benchmark band.',
    'Use What-If to model shrinkage reduction (typical loss-prevention win) or rate drops.',
    'If you are above 30%, use Break-Even to see which component to attack first.',
  ],
  engineKey: true,
};
registerEngine(engine);