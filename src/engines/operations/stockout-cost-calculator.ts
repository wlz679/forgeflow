import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
import { BAND_META } from '../../core/engines/band-meta';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Stockout Cost Calculator (P7-3) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Total cost of running out of stock = lost immediate revenue + lost customer LTV.
// Lost LTV = lost sales × % customers lost forever × avg LTV × (1 - recovery rate).
// Health bands (% of annual revenue):
//   🟢 < 5%        — minimal stockout impact
//   🟡 5%–10%      — measurable; tighten safety stock
//   🟠 10%–15%     — serious; reorder point review needed
//   🔴 ≥ 15%       — critical; consider multi-supplier
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC) — service
// businesses with no inventory should skip this calculator.

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 5.0,
  good: [5.0, 10.0],
  warning: [10.0, 15.0],
  critical: 15.0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Lost immediate revenue ($) = lost sales per day × stockout duration (days). */
export function lostImmediateRevenue(lostSalesPerDay: number, avgStockoutDays: number): number {
  return lostSalesPerDay * avgStockoutDays;
}

/** Lost LTV ($) = lost rev × customer loss rate × avg LTV × (1 - recovery rate). */
export function lostLTV(
  lostImmediateRevenue: number,
  lostCustomerRate: number,
  customerLTV: number,
  recoveryRate: number
): number {
  return lostImmediateRevenue * (lostCustomerRate / 100) * customerLTV * (1 - recoveryRate / 100);
}

/** Total stockout cost ($) = immediate revenue loss + lost LTV. */
export function totalCost(lostImmediateRevenue: number, lostLTV: number): number {
  return lostImmediateRevenue + lostLTV;
}

/** Stockout cost as % of annual revenue. */
export function costPctOfRevenue(totalCost: number, annualRevenue: number): number {
  if (annualRevenue <= 0) return 0;
  return (totalCost / annualRevenue) * 100;
}

/** Health band label from cost %. */
export function calcHealthBand(costPct: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (costPct < HEALTH_BANDS.excellent) return 'excellent';
  if (costPct < HEALTH_BANDS.good[1]) return 'good';
  if (costPct < HEALTH_BANDS.warning[1]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const lostSalesPerDay = clampNonNegative(parseFloat(inputs.lostSalesPerDay) || 0);
  const avgStockoutDays = clampNonNegative(parseFloat(inputs.avgStockoutDays) || 0);
  const lostCustomerRate = clampNonNegative(Math.min(100, parseFloat(inputs.lostCustomerRate) || 0));
  const customerLTV = clampNonNegative(parseFloat(inputs.customerLTV) || 0);
  const annualRevenue = clampNonNegative(parseFloat(inputs.annualRevenue) || 0);
  const recoveryRate = clampNonNegative(Math.min(100, parseFloat(inputs.recoveryRate) || 0));

  // Edge: missing sales input or revenue → prompt
  if (lostSalesPerDay === 0 || annualRevenue === 0) {
    return [
      '$calc_out.section.stockout_cost_calculator|⏰ Stockout Cost Calculator|\n\n' +
        makeToken('calc_out.stockout_cost.row.enter_inputs_required', '📊 Enter your lost sales per day, stockout duration, customer loss rate, customer LTV, annual revenue, and win-back rate to see total stockout cost and how it impacts your bottom line.'),
    ];
  }

  const lir = lostImmediateRevenue(lostSalesPerDay, avgStockoutDays);
  const ll = lostLTV(lir, lostCustomerRate, customerLTV, recoveryRate);
  const tc = totalCost(lir, ll);
  const cpct = costPctOfRevenue(tc, annualRevenue);

  // P168 B3-8：派生量只算一次 ⇒ fallback 与 params 必然同源（不可能漂）
  const recoveryCaptures = lir * (lostCustomerRate / 100) * customerLTV * (recoveryRate / 100);
  const lostCustomerValue = lir * (lostCustomerRate / 100);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(cpct);
  const healthEmoji = BAND_META[band];
  // ⚠️ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）
  const healthLabel =
    band === 'excellent'
      ? makeToken('calc_out.stockout_cost.row.health_excellent', 'Excellent — stockout cost < 5% of revenue')
      : band === 'good'
      ? makeToken('calc_out.stockout_cost.row.health_good', 'Good — 5–10% of revenue lost to stockouts; tighten safety stock')
      : band === 'warning'
      ? makeToken('calc_out.stockout_cost.row.health_warning', 'Warning — 10–15% of revenue lost; reorder point review needed')
      : makeToken('calc_out.stockout_cost.row.health_critical', 'Critical — ≥ 15% of revenue lost; urgent: switch to multi-supplier');

  // What-If: reduce stockout days by 50%, then increase recovery rate to 25%
  const daysDown50 = avgStockoutDays * 0.5;
  const lirDown50 = lostImmediateRevenue(lostSalesPerDay, daysDown50);
  const llDown50 = lostLTV(lirDown50, lostCustomerRate, customerLTV, recoveryRate);
  const tcDown50 = totalCost(lirDown50, llDown50);
  const cpctDown50 = costPctOfRevenue(tcDown50, annualRevenue);
  const savingsFrom50 = tc - tcDown50;

  const recoveryUp25 = 25;
  const llUp25 = lostLTV(lir, lostCustomerRate, customerLTV, recoveryUp25);
  const tcUp25 = totalCost(lir, llUp25);
  const savingsFromRecovery = tc - tcUp25;

  // Break-Even: max stockout days for 🟢 (target < 5% of revenue)
  // totalCost / annualRevenue < 0.05
  // (lir + ll) / annualRevenue < 0.05
  // For simplicity, assume avgStockoutDays is the lever; other inputs fixed
  // Reverse-solve: daysMax * (lostSalesPerDay + lostSalesPerDay × LCR × LTV × (1-RR/100)) / annualRevenue < 0.05
  const costPerDay = lostSalesPerDay + lostSalesPerDay * (lostCustomerRate / 100) * customerLTV * (1 - recoveryRate / 100);
  const targetTc = annualRevenue * 0.05;
  const maxDaysForExcellent = costPerDay > 0 ? targetTc / costPerDay : Infinity;

  // Milestone: 12-mo savings if stockout cut 50%
  const annualSavings50 = savingsFrom50;

  // Tip: band-driven contextual advice
  // P168 B3-4：**建议文案已迁到页面 i18n**（decision_tip.<code>）
  //   ⇒ 引擎只输出结构化建议码 + 参数，页面负责渲染成完整建议。
  const tipParams = {
    cost: money(tc),
    pct: cpct.toFixed(2) + '%',
    immediate: money(lir),
    ltv: money(ll),
  };
  let tip: string;
  if (band === 'critical') {
    tip = JSON.stringify({ code: 'stockout_critical', params: tipParams });
  } else if (band === 'warning') {
    tip = JSON.stringify({ code: 'stockout_serious', params: tipParams });
  } else if (band === 'good') {
    tip = JSON.stringify({ code: 'stockout_measurable', params: tipParams });
  } else {
    tip = JSON.stringify({ code: 'stockout_excellent', params: tipParams });
  }

  let r =
    '$calc_out.section.stockout_cost_calculator|⏰ Stockout Cost Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.total_stockout_cost', 'Total stockout cost: ' + money(tc) + '/year  ·  ' + cpct.toFixed(2) + '% of annual revenue', { cost: money(tc), pct: cpct.toFixed(2) }) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.lost_breakdown', 'Lost immediate: ' + money(lir) + '  ·  Lost LTV: ' + money(ll) + '  ·  Recovery captures: ' + money(recoveryCaptures), { immediate: money(lir), ltv: money(ll), recovery: money(recoveryCaptures) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.lost_sales_per_day|Lost sales per day|:       ' + money(lostSalesPerDay) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.stockout_duration', 'Stockout duration:        ' + avgStockoutDays + ' days  ·  cumulative: ' + money(lir), { days: String(avgStockoutDays), cumulative: money(lir) }) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.customer_loss_rate', 'Customer loss rate:       ' + lostCustomerRate.toFixed(1) + '%  ·  applies to ' + money(lir) + ' = ' + money(lostCustomerValue) + ' lost-customers', { rate: lostCustomerRate.toFixed(1), applies: money(lir), lost: money(lostCustomerValue) }) + '\n' +
    '• $calc_out.label.customer_ltv|Customer LTV|:             ' + money(customerLTV) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.recovery_rate', 'Recovery rate:            ' + recoveryRate.toFixed(1) + '%  ·  recaptures ' + money(recoveryCaptures), { rate: recoveryRate.toFixed(1), recaptured: money(recoveryCaptures) }) + '\n' +
    '• $calc_out.label.annual_revenue_stockout|Annual revenue|:           ' + money(annualRevenue) + '\n' +
    '• $calc_out.label.stockout_cost_to_revenue|Stockout cost / revenue|:  ' + cpct.toFixed(2) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.whatif_cut_days_50', 'Cut stockout days by 50%: total cost = ' + money(tcDown50) + ' (' + cpctDown50.toFixed(2) + '%)  ·  annual savings = ' + money(savingsFrom50), { cost: money(tcDown50), pct: cpctDown50.toFixed(2), savings: money(savingsFrom50) }) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.whatif_recovery_25', 'Raise recovery rate to 25%: total cost = ' + money(tcUp25) + '  ·  additional savings = ' + money(savingsFromRecovery), { cost: money(tcUp25), savings: money(savingsFromRecovery) }) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.whatif_combined', 'Combined (50% less days + 25% recovery): see Milestone below') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + (isFinite(maxDaysForExcellent)
      ? makeToken('calc_out.stockout_cost.row.break_even_max_days', 'Max stockout days for 🟢 (< 5% of revenue): ' + maxDaysForExcellent.toFixed(1) + ' days', { days: maxDaysForExcellent.toFixed(1) })
      : makeToken('calc_out.stockout_cost.row.break_even_max_days_na', 'Max stockout days for 🟢 (< 5% of revenue): N/A (cost per day = 0)')) + '\n' +
    '• ' + (avgStockoutDays > maxDaysForExcellent
      ? makeToken('calc_out.stockout_cost.row.break_even_current_vs_target_reduce', 'Current vs target: reduce stockout days by ' + (avgStockoutDays - maxDaysForExcellent).toFixed(1) + ' to hit 🟢', { days: (avgStockoutDays - maxDaysForExcellent).toFixed(1) })
      : makeToken('calc_out.stockout_cost.row.break_even_current_vs_target_below', 'Current vs target: already below target')) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.milestone_12mo_savings', '12-mo savings if stockout cut 50%: ' + money(annualSavings50), { savings: money(annualSavings50) }) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.milestone_reinvested_8pct', 'Reinvested at 8% return: ' + money(annualSavings50 * 0.08) + '/yr additional', { amount: money(annualSavings50 * 0.08) }) + '\n' +
    '• ' + makeToken('calc_out.stockout_cost.row.milestone_compounded_3y', 'Compounded over 3 years: ' + money(annualSavings50 * 1.08 * 3 - annualSavings50 * 3) + ' (vs $0 reinvested)', { amount: money(annualSavings50 * 1.08 * 3 - annualSavings50 * 3) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  // P168 B3-4：🧭 决策支持已迁到页面 i18n（tools.<slug>.decision_* 四层，双语）
  //   ⇒ 引擎只负责算，决策建议由页面的「算完之后」区块独占 ⇒ 同页不再有两份。
  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function lir(lpd,days){return lpd*days;}" +
  "function ll(lir,lcr,ltv,rr){return lir*(lcr/100)*ltv*(1-rr/100);}" +
  "function tc(lir,ll){return lir+ll;}" +
  "function cpct(t,rev){if(rev<=0)return 0;return (t/rev)*100;}" +
  "function band(p){if(p<5)return 'excellent';if(p<10)return 'good';if(p<15)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var lpd=cnn(parseFloat(inputs.lostSalesPerDay)||0);" +
  "var days=cnn(parseFloat(inputs.avgStockoutDays)||0);" +
  "var lcr=cnn(Math.min(100,parseFloat(inputs.lostCustomerRate)||0));" +
  "var ltv=cnn(parseFloat(inputs.customerLTV)||0);" +
  "var rev=cnn(parseFloat(inputs.annualRevenue)||0);" +
  "var rr=cnn(Math.min(100,parseFloat(inputs.recoveryRate)||0));" +
  "if(lpd===0||rev===0){return['$calc_out.section.stockout_cost_calculator|\\u23F0 Stockout Cost Calculator|\\n\\n'+tk('calc_out.stockout_cost.row.enter_inputs_required','\\uD83D\\uDCCA Enter your lost sales per day, stockout duration, customer loss rate, customer LTV, annual revenue, and win-back rate to see total stockout cost and how it impacts your bottom line.')];}" +
  "var lirV=lir(lpd,days);" +
  "var llV=ll(lirV,lcr,ltv,rr);" +
  "var tcV=tc(lirV,llV);" +
  "var pct=cpct(tcV,rev);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "var recCap=lirV*(lcr/100)*ltv*(rr/100);" +
  "var lostCust=lirV*(lcr/100);" +
  "var bd=band(pct);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?tk('calc_out.stockout_cost.row.health_excellent','Excellent \\u2014 stockout cost < 5% of revenue'):bd==='good'?tk('calc_out.stockout_cost.row.health_good','Good \\u2014 5\\u201310% of revenue lost to stockouts; tighten safety stock'):bd==='warning'?tk('calc_out.stockout_cost.row.health_warning','Warning \\u2014 10\\u201315% of revenue lost; reorder point review needed'):tk('calc_out.stockout_cost.row.health_critical','Critical \\u2014 \\u2265 15% of revenue lost; urgent: switch to multi-supplier');" +
  "var days50=days*0.5;var lir50=lir(lpd,days50);var ll50=ll(lir50,lcr,ltv,rr);var tc50=tc(lir50,ll50);var pct50=cpct(tc50,rev);var sav50=tcV-tc50;" +
  "var rr25=25;var ll25=ll(lirV,lcr,ltv,rr25);var tc25=tc(lirV,ll25);var savRec=tcV-tc25;" +
  "var costDay=lpd+lpd*(lcr/100)*ltv*(1-rr/100);var targetTc=rev*0.05;var maxDays=costDay>0?targetTc/costDay:Infinity;" +
  "var annSav50=sav50;" +
  "var tipP={cost:money(tcV),pct:pct.toFixed(2)+'%',immediate:money(lirV),ltv:money(llV)};" +
  "var tip='';" +
  "if(bd==='critical'){tip=JSON.stringify({code:'stockout_critical',params:tipP});}" +
  "else if(bd==='warning'){tip=JSON.stringify({code:'stockout_serious',params:tipP});}" +
  "else if(bd==='good'){tip=JSON.stringify({code:'stockout_measurable',params:tipP});}" +
  "else{tip=JSON.stringify({code:'stockout_excellent',params:tipP});}" +
  "var r2='';" +
  "r2+='$calc_out.section.stockout_cost_calculator|\\u23F0 Stockout Cost Calculator|\\n\\n';" +
  "r2+='$calc_out.section.health|\\uD83E\\uDE7A Health:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.total_stockout_cost','Total stockout cost: '+money(tcV)+'/year  \\u00B7  '+pct.toFixed(2)+'% of annual revenue',{cost:money(tcV),pct:pct.toFixed(2)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.lost_breakdown','Lost immediate: '+money(lirV)+'  \\u00B7  Lost LTV: '+money(llV)+'  \\u00B7  Recovery captures: '+money(recCap),{immediate:money(lirV),ltv:money(llV),recovery:money(recCap)})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.inputs_snapshot|\\uD83D\\uDCCA Inputs Snapshot:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 $calc_out.label.lost_sales_per_day|Lost sales per day|:       '+money(lpd)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.stockout_duration','Stockout duration:        '+days+' days  \\u00B7  cumulative: '+money(lirV),{days:String(days),cumulative:money(lirV)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.customer_loss_rate','Customer loss rate:       '+lcr.toFixed(1)+'%  \\u00B7  applies to '+money(lirV)+' = '+money(lostCust)+' lost-customers',{rate:lcr.toFixed(1),applies:money(lirV),lost:money(lostCust)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.customer_ltv|Customer LTV|:             '+money(ltv)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.recovery_rate','Recovery rate:            '+rr.toFixed(1)+'%  \\u00B7  recaptures '+money(recCap),{rate:rr.toFixed(1),recaptured:money(recCap)})+'\\n';" +
  "r2+='\\u2022 $calc_out.label.annual_revenue_stockout|Annual revenue|:           '+money(rev)+'\\n';" +
  "r2+='\\u2022 $calc_out.label.stockout_cost_to_revenue|Stockout cost / revenue|:  '+pct.toFixed(2)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.what_if|\\uD83D\\uDD04 What-If:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.whatif_cut_days_50','Cut stockout days by 50%: total cost = '+money(tc50)+' ('+pct50.toFixed(2)+'%)  \\u00B7  annual savings = '+money(sav50),{cost:money(tc50),pct:pct50.toFixed(2),savings:money(sav50)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.whatif_recovery_25','Raise recovery rate to 25%: total cost = '+money(tc25)+'  \\u00B7  additional savings = '+money(savRec),{cost:money(tc25),savings:money(savRec)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.whatif_combined','Combined (50% less days + 25% recovery): see Milestone below')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.break_even|\\u2696\\uFE0F Break-Even:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+(isFinite(maxDays)?tk('calc_out.stockout_cost.row.break_even_max_days','Max stockout days for \\uD83D\\uDFE2 (< 5% of revenue): '+maxDays.toFixed(1)+' days',{days:maxDays.toFixed(1)}):tk('calc_out.stockout_cost.row.break_even_max_days_na','Max stockout days for \\uD83D\\uDFE2 (< 5% of revenue): N/A (cost per day = 0)'))+'\\n';" +
  "r2+='\\u2022 '+(days>maxDays?tk('calc_out.stockout_cost.row.break_even_current_vs_target_reduce','Current vs target: reduce stockout days by '+(days-maxDays).toFixed(1)+' to hit \\uD83D\\uDFE2',{days:(days-maxDays).toFixed(1)}):tk('calc_out.stockout_cost.row.break_even_current_vs_target_below','Current vs target: already below target'))+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='$calc_out.section.milestone|\\uD83C\\uDFAF Milestone:|\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.milestone_12mo_savings','12-mo savings if stockout cut 50%: '+money(annSav50),{savings:money(annSav50)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.milestone_reinvested_8pct','Reinvested at 8% return: '+money(annSav50*0.08)+'/yr additional',{amount:money(annSav50*0.08)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.stockout_cost.row.milestone_compounded_3y','Compounded over 3 years: '+money(annSav50*1.08*3-annSav50*3)+' (vs $0 reinvested)',{amount:money(annSav50*1.08*3-annSav50*3)})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-stockout-cost-calculator',
  title: 'Stockout Cost Calculator',
  description:
    'Quantify the cost of running out of stock — lost immediate revenue + lost customer LTV (some defect forever). Industry benchmarks: 🟢 <5% · 🟡 5–10% · 🟠 10–15% · 🔴 ≥15% of annual revenue.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'lostSalesPerDay', label: 'Lost Sales per Day (units or $)', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'avgStockoutDays', label: 'Average Stockout Duration (days)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'lostCustomerRate', label: '% of Stockout Customers Lost Forever', placeholder: 'e.g. 30', type: 'number' },
    { name: 'customerLTV', label: 'Customer Lifetime Value ($)', placeholder: 'e.g. 200', type: 'number' },
    { name: 'annualRevenue', label: 'Annual Revenue (for % calc)', placeholder: 'e.g. 600000', type: 'number' },
    { name: 'recoveryRate', label: 'Win-back / Recovery Rate (%)', placeholder: 'e.g. 10', type: 'number' },
  ],
  keywords: [
    'stockout cost calculator',
    'lost sales revenue',
    'inventory stockout',
    'customer churn from stockout',
    'LTV loss',
    'lost customer LTV',
    'win-back rate',
    'Shopify out of stock',
    'Amazon FBA stockout',
    'inventory shortage cost',
  ],
  tags: ['operations', 'inventory', 'stockout', 'lost-sales'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.shopify.com/blog/how-to-handle-out-of-stock-products',
    'https://www.invensia.net/wp-content/uploads/2016/09/Estimating-stockout-cost.pdf',
    'https://www.supplychainbrain.com/blogs/1-think-tank/post/29319-the-real-cost-of-stockouts',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该为这次断货补更多库存，还是先修需求预测',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: '页面的「🧭 算完之后」决策区块（决策支持已由区块独占）',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
  },
  generate: calculate,
  staticExamples: ['$calc_out.section.stockout_cost_calculator|⏰ Stockout Cost Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 $calc_out.stockout_cost.row.health_critical|Critical — ≥ 15% of revenue lost; urgent: switch to multi-supplier|\n• $calc_out.stockout_cost.row.total_stockout_cost{"cost":"$275,000","pct":"45.83"}|Total stockout cost: $275,000/year  ·  45.83% of annual revenue|\n• $calc_out.stockout_cost.row.lost_breakdown{"immediate":"$5,000","ltv":"$270,000","recovery":"$30,000"}|Lost immediate: $5,000  ·  Lost LTV: $270,000  ·  Recovery captures: $30,000|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.lost_sales_per_day|Lost sales per day|:       $1,000\n• $calc_out.stockout_cost.row.stockout_duration{"days":"5","cumulative":"$5,000"}|Stockout duration:        5 days  ·  cumulative: $5,000|\n• $calc_out.stockout_cost.row.customer_loss_rate{"rate":"30.0","applies":"$5,000","lost":"$1,500"}|Customer loss rate:       30.0%  ·  applies to $5,000 = $1,500 lost-customers|\n• $calc_out.label.customer_ltv|Customer LTV|:             $200\n• $calc_out.stockout_cost.row.recovery_rate{"rate":"10.0","recaptured":"$30,000"}|Recovery rate:            10.0%  ·  recaptures $30,000|\n• $calc_out.label.annual_revenue_stockout|Annual revenue|:           $600,000\n• $calc_out.label.stockout_cost_to_revenue|Stockout cost / revenue|:  45.83%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.stockout_cost.row.whatif_cut_days_50{"cost":"$137,500","pct":"22.92","savings":"$137,500"}|Cut stockout days by 50%: total cost = $137,500 (22.92%)  ·  annual savings = $137,500|\n• $calc_out.stockout_cost.row.whatif_recovery_25{"cost":"$230,000","savings":"$45,000"}|Raise recovery rate to 25%: total cost = $230,000  ·  additional savings = $45,000|\n• $calc_out.stockout_cost.row.whatif_combined|Combined (50% less days + 25% recovery): see Milestone below|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.stockout_cost.row.break_even_max_days{"days":"0.5"}|Max stockout days for 🟢 (< 5% of revenue): 0.5 days|\n• $calc_out.stockout_cost.row.break_even_current_vs_target_reduce{"days":"4.5"}|Current vs target: reduce stockout days by 4.5 to hit 🟢|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.stockout_cost.row.milestone_12mo_savings{"savings":"$137,500"}|12-mo savings if stockout cut 50%: $137,500|\n• $calc_out.stockout_cost.row.milestone_reinvested_8pct{"amount":"$11,000"}|Reinvested at 8% return: $11,000/yr additional|\n• $calc_out.stockout_cost.row.milestone_compounded_3y{"amount":"$33,000"}|Compounded over 3 years: $33,000 (vs $0 reinvested)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: {"code":"stockout_critical","params":{"cost":"$275,000","pct":"45.83%","immediate":"$5,000","ltv":"$270,000"}}\n'],
  faq: [
    { q: 'How much revenue do stockouts typically cost?', a: 'Studies show 5–15% of annual revenue for typical ecommerce businesses. Above 15% is critical — indicates either poor demand forecasting, weak supplier relationships, or systemic SKU count too high. Below 5% is excellent — indicates strong safety stock + supplier reliability.' },
    { q: 'What percentage of stockout customers defect forever?', a: 'Industry data: 30–60% of customers who experience a stockout will not return. This is the invisible cost — lost immediate revenue plus lost lifetime value. Win-back campaigns can recover 10–25% but the rest defect to competitors.' },
    { q: 'How does win-back rate affect stockout cost?', a: 'A 25% recovery rate vs 10% saves ~15% of lost LTV. Investing in automated win-back emails ("sorry it was out of stock, here is 15% off") typically yields 3–5x ROI on the discount cost.' },
    { q: 'What is the relationship between stockout cost and reorder point?', a: 'Reorder point (P7-4) sets when to reorder; service-level Z-scores determine safety stock. Higher service level → more safety stock → fewer stockouts → lower stockout cost. The two calcs are complementary: use this one to size the cost, then use P7-4 to optimize the safety stock.' },
    { q: "What is the cost of a stockout?", a: "Stockout cost = lost revenue + customer dissatisfaction + brand damage. Components: 1) Lost sale (immediate): 30-70% of stockout shoppers buy elsewhere, 2) Lost future: 20-40% of stockout customers never return, 3) Brand impact: 5-15% of stockout customers tell others. Total: 5-20% of original sale value in lost lifetime value. Critical items: 50%+ stockout cost." },
    { q: "What is a good stockout rate target?", a: "Targets: 1) Top 20 SKUs: <2% stockout rate, 2) Mid-tier: 3-5%, 3) Long tail: 5-10%, 4) Critical items: <1%. Overall: <5% is good, <2% is excellent. Service level (in-stock %): 95%+ for top SKUs, 90%+ for rest. Track per SKU. Out-of-stock is the #1 cause of lost sales in ecommerce. Industry: 5-8% typical." },
    { q: "How do I prevent stockouts?", a: "1) Better demand forecasting, 2) Safety stock (1-2 weeks), 3) Lower lead times, 4) Multiple suppliers, 5) Auto-reorder triggers, 6) Real-time inventory visibility, 7) Pre-position before peak. Most teams 50%+ reduction in stockouts in 6-12 months. Best ROI: auto-reorder + safety stock. Top 20 SKUs: weekly review." },
    { q: "What is the difference between backorder and stockout?", a: "Backorder: customer can order, but delivery is delayed. Stockout: item unavailable, customer can't order. Backorder is better: 1) Captures sale (some customers wait), 2) Allows planning. Cost: backorder 30-50% of stockout cost. Use for: high-LTV customers, must-have items, long relationships. Most: 5-10% of stockouts can be backorders." },
    { q: "How does stockout affect customer lifetime value?", a: "Stockout: 1) 30-50% of customers buy from competitor immediately, 2) 20-40% never return, 3) 10-20% switch brands long-term. Total: 30-50% lost LTV per stockout. For a $500 LTV customer: $150-250 lost. Avoid: stockouts on top 20% of SKUs (highest revenue impact). For low-priority items: 5-10% stockout is acceptable." },
    { q: "What is the cost of a stockout in physical retail?", a: "Retail stockout: 1) Lost sale (immediate): 30-50% buy elsewhere, 2) Substitute purchase: 20-30% buy similar, 3) Customer dissatisfaction, 4) Lost future visit: 15-25%. Total: 5-15% of revenue impact. Most: 3-5% lost sales from stockouts. Tools: POS data, in-stock tracking, planogram compliance. Improve: on-shelf availability 95%+. Walmart, Target: 95-98% target." },
    { q: "How do I prioritize stockout prevention by SKU?", a: "Prioritize by: 1) Revenue (top 20 SKUs = 80% impact), 2) Margin (high-margin = more cost to stockout), 3) Customer loyalty (top items that drive retention), 4) Substitute availability (less substitutes = more lost sales), 5) Lead time (longer = more safety stock). Pareto: 20% of SKUs = 80% of stockout cost. Focus on top SKUs first." },
    { q: "Should I show out-of-stock items on my site?", a: "It depends. Hide: low-LTV items, low-margin, low-conversion. Show with backorder option: high-LTV items, strong customer relationships, expected restock soon. Show with notification: top items, demand-driven. Most teams: 30-50% of out-of-stock items still shown (with backorder or restock alert). Conversion: 5-15% for backorder-enabled, 1-3% for notification-only." },
  ],
  howToUse: [
    'Enter your average lost sales per day during a stockout event (units × AOV if units, or $ if already converted).',
    'Enter the average stockout duration in days.',
    'Enter your customer loss rate (% who defect forever; 30–60% is typical).',
    'Enter your customer LTV (use the LTV calculator if unsure).',
    'Enter annual revenue (for % calculation) and win-back rate (10–25% is typical with good email flows).',
    'Read the stockout cost as % of revenue; use What-If to model cutting stockout days 50% or raising recovery to 25%.',
  ],
  engineKey: true,
};
registerEngine(engine);