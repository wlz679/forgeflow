import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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
      '⏰ Stockout Cost Calculator\n\n' +
        '📊 Enter your lost sales per day, stockout duration, customer loss rate, customer LTV, annual revenue, and win-back rate to see total stockout cost and how it impacts your bottom line.',
    ];
  }

  const lir = lostImmediateRevenue(lostSalesPerDay, avgStockoutDays);
  const ll = lostLTV(lir, lostCustomerRate, customerLTV, recoveryRate);
  const tc = totalCost(lir, ll);
  const cpct = costPctOfRevenue(tc, annualRevenue);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(cpct);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — stockout cost < 5% of revenue'
      : band === 'good'
      ? 'Good — 5–10% of revenue lost to stockouts; tighten safety stock'
      : band === 'warning'
      ? 'Warning — 10–15% of revenue lost; reorder point review needed'
      : 'Critical — ≥ 15% of revenue lost; urgent: switch to multi-supplier';

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
  let tip: string;
  if (band === 'critical') {
    tip =
      '≥ 15% revenue loss to stockouts is critical. Switch to multi-supplier (reduces single-point-of-failure risk), implement safety stock buffers based on demand std dev (use reorder point calculator), and audit the top 3 SKUs by lost sales weekly.';
  } else if (band === 'warning') {
    tip =
      '10–15% is serious. Tighten reorder points using service-level Z-scores (90–95% SL), increase safety stock by 30%, and pre-position inventory at 2 fulfillment centers if shipping time is a stockout driver.';
  } else if (band === 'good') {
    tip =
      '5–10% is measurable but not catastrophic. Improve win-back flows (recovery rate ↑ to 25% saves 15% of lost LTV), set up low-stock alerts at 2-week reorder point, and review top-20 SKUs monthly for stockout patterns.';
  } else {
    tip =
      'Excellent stockout control. To maintain, monitor service-level Z-scores quarterly, keep safety stock tuned to demand std dev, and run a "lost sales audit" every 6 months to verify the model still matches reality.';
  }

  const r =
    '⏰ Stockout Cost Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Total stockout cost: ' + money(tc) + '/year  ·  ' + cpct.toFixed(2) + '% of annual revenue\n' +
    '• Lost immediate: ' + money(lir) + '  ·  Lost LTV: ' + money(ll) + '  ·  Recovery captures: ' + money(lir * (lostCustomerRate / 100) * customerLTV * (recoveryRate / 100)) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Lost sales per day:       ' + money(lostSalesPerDay) + '\n' +
    '• Stockout duration:        ' + avgStockoutDays + ' days  ·  cumulative: ' + money(lir) + '\n' +
    '• Customer loss rate:       ' + lostCustomerRate.toFixed(1) + '%  ·  applies to ' + money(lir) + ' = ' + money(lir * (lostCustomerRate / 100)) + ' lost-customers\n' +
    '• Customer LTV:             ' + money(customerLTV) + '\n' +
    '• Recovery rate:            ' + recoveryRate.toFixed(1) + '%  ·  recaptures ' + money(lir * (lostCustomerRate / 100) * customerLTV * (recoveryRate / 100)) + '\n' +
    '• Annual revenue:           ' + money(annualRevenue) + '\n' +
    '• Stockout cost / revenue:  ' + cpct.toFixed(2) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cut stockout days by 50%: total cost = ' + money(tcDown50) + ' (' + cpctDown50.toFixed(2) + '%)  ·  annual savings = ' + money(savingsFrom50) + '\n' +
    '• Raise recovery rate to 25%: total cost = ' + money(tcUp25) + '  ·  additional savings = ' + money(savingsFromRecovery) + '\n' +
    '• Combined (50% less days + 25% recovery): see Milestone below\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Max stockout days for 🟢 (< 5% of revenue): ' + (isFinite(maxDaysForExcellent) ? maxDaysForExcellent.toFixed(1) + ' days' : 'N/A (cost per day = 0)') + '\n' +
    '• Current vs target: ' + (avgStockoutDays > maxDaysForExcellent ? 'reduce stockout days by ' + (avgStockoutDays - maxDaysForExcellent).toFixed(1) + ' to hit 🟢' : 'already below target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 12-mo savings if stockout cut 50%: ' + money(annualSavings50) + '\n' +
    '• Reinvested at 8% return: ' + money(annualSavings50 * 0.08) + '/yr additional\n' +
    '• Compounded over 3 years: ' + money(annualSavings50 * 1.08 * 3 - annualSavings50 * 3) + ' (vs $0 reinvested)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
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
  "if(lpd===0||rev===0){return['\\u23F0 Stockout Cost Calculator\\n\\n\\uD83D\\uDCCA Enter your lost sales per day, stockout duration, customer loss rate, customer LTV, annual revenue, and win-back rate to see total stockout cost and how it impacts your bottom line.'];}" +
  "var lirV=lir(lpd,days);" +
  "var llV=ll(lirV,lcr,ltv,rr);" +
  "var tcV=tc(lirV,llV);" +
  "var pct=cpct(tcV,rev);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "var bd=band(pct);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 stockout cost < 5% of revenue':bd==='good'?'Good \\u2014 5\\u201310% of revenue lost to stockouts; tighten safety stock':bd==='warning'?'Warning \\u2014 10\\u201315% of revenue lost; reorder point review needed':'Critical \\u2014 \\u2265 15% of revenue lost; urgent: switch to multi-supplier';" +
  "var days50=days*0.5;var lir50=lir(lpd,days50);var ll50=ll(lir50,lcr,ltv,rr);var tc50=tc(lir50,ll50);var pct50=cpct(tc50,rev);var sav50=tcV-tc50;" +
  "var rr25=25;var ll25=ll(lirV,lcr,ltv,rr25);var tc25=tc(lirV,ll25);var savRec=tcV-tc25;" +
  "var costDay=lpd+lpd*(lcr/100)*ltv*(1-rr/100);var targetTc=rev*0.05;var maxDays=costDay>0?targetTc/costDay:Infinity;" +
  "var annSav50=sav50;" +
  "var tip='';" +
  "if(bd==='critical'){tip='\\u2265 15% revenue loss to stockouts is critical. Switch to multi-supplier (reduces single-point-of-failure risk), implement safety stock buffers based on demand std dev (use reorder point calculator), and audit the top 3 SKUs by lost sales weekly.';}" +
  "else if(bd==='warning'){tip='10\\u201315% is serious. Tighten reorder points using service-level Z-scores (90\\u201395% SL), increase safety stock by 30%, and pre-position inventory at 2 fulfillment centers if shipping time is a stockout driver.';}" +
  "else if(bd==='good'){tip='5\\u201310% is measurable but not catastrophic. Improve win-back flows (recovery rate \\u2191 to 25% saves 15% of lost LTV), set up low-stock alerts at 2-week reorder point, and review top-20 SKUs monthly for stockout patterns.';}" +
  "else{tip='Excellent stockout control. To maintain, monitor service-level Z-scores quarterly, keep safety stock tuned to demand std dev, and run a \\u201Clost sales audit\\u201D every 6 months to verify the model still matches reality.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Stockout Cost Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Total stockout cost: '+money(tcV)+'/year  \\u00B7  '+pct.toFixed(2)+'% of annual revenue\\n';" +
  "r2+='\\u2022 Lost immediate: '+money(lirV)+'  \\u00B7  Lost LTV: '+money(llV)+'  \\u00B7  Recovery captures: '+money(lirV*(lcr/100)*ltv*(rr/100))+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Lost sales per day:       '+money(lpd)+'\\n';" +
  "r2+='\\u2022 Stockout duration:        '+days+' days  \\u00B7  cumulative: '+money(lirV)+'\\n';" +
  "r2+='\\u2022 Customer loss rate:       '+lcr.toFixed(1)+'%  \\u00B7  applies to '+money(lirV)+' = '+money(lirV*(lcr/100))+' lost-customers\\n';" +
  "r2+='\\u2022 Customer LTV:             '+money(ltv)+'\\n';" +
  "r2+='\\u2022 Recovery rate:            '+rr.toFixed(1)+'%  \\u00B7  recaptures '+money(lirV*(lcr/100)*ltv*(rr/100))+'\\n';" +
  "r2+='\\u2022 Annual revenue:           '+money(rev)+'\\n';" +
  "r2+='\\u2022 Stockout cost / revenue:  '+pct.toFixed(2)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Cut stockout days by 50%: total cost = '+money(tc50)+' ('+pct50.toFixed(2)+'%)  \\u00B7  annual savings = '+money(sav50)+'\\n';" +
  "r2+='\\u2022 Raise recovery rate to 25%: total cost = '+money(tc25)+'  \\u00B7  additional savings = '+money(savRec)+'\\n';" +
  "r2+='\\u2022 Combined (50% less days + 25% recovery): see Milestone below\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Max stockout days for \\uD83D\\uDFE2 (< 5% of revenue): '+(isFinite(maxDays)?maxDays.toFixed(1)+' days':'N/A (cost per day = 0)')+'\\n';" +
  "r2+='\\u2022 Current vs target: '+(days>maxDays?'reduce stockout days by '+(days-maxDays).toFixed(1)+' to hit \\uD83D\\uDFE2':'already below target')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 12-mo savings if stockout cut 50%: '+money(annSav50)+'\\n';" +
  "r2+='\\u2022 Reinvested at 8% return: '+money(annSav50*0.08)+'/yr additional\\n';" +
  "r2+='\\u2022 Compounded over 3 years: '+money(annSav50*1.08*3-annSav50*3)+' (vs $0 reinvested)\\n\\n';" +
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
  generate: calculate,
  staticExamples: ['⏰ Stockout Cost Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 Critical — ≥ 15% of revenue lost; urgent: switch to multi-supplier\n• Total stockout cost: $275,000/year  ·  45.83% of annual revenue\n• Lost immediate: $5,000  ·  Lost LTV: $270,000  ·  Recovery captures: $30,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Lost sales per day:       $1,000\n• Stockout duration:        5 days  ·  cumulative: $5,000\n• Customer loss rate:       30.0%  ·  applies to $5,000 = $1,500 lost-customers\n• Customer LTV:             $200\n• Recovery rate:            10.0%  ·  recaptures $30,000\n• Annual revenue:           $600,000\n• Stockout cost / revenue:  45.83%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut stockout days by 50%: total cost = $137,500 (22.92%)  ·  annual savings = $137,500\n• Raise recovery rate to 25%: total cost = $230,000  ·  additional savings = $45,000\n• Combined (50% less days + 25% recovery): see Milestone below\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Max stockout days for 🟢 (< 5% of revenue): 0.5 days\n• Current vs target: reduce stockout days by 4.5 to hit 🟢\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 12-mo savings if stockout cut 50%: $137,500\n• Reinvested at 8% return: $11,000/yr additional\n• Compounded over 3 years: $33,000 (vs $0 reinvested)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: ≥ 15% revenue loss to stockouts is critical. Switch to multi-supplier (reduces single-point-of-failure risk), implement safety stock buffers based on demand std dev (use reorder point calculator), and audit the top 3 SKUs by lost sales weekly.\n'],
  faq: [
    { q: 'How much revenue do stockouts typically cost?', a: 'Studies show 5–15% of annual revenue for typical ecommerce businesses. Above 15% is critical — indicates either poor demand forecasting, weak supplier relationships, or systemic SKU count too high. Below 5% is excellent — indicates strong safety stock + supplier reliability.' },
    { q: 'What percentage of stockout customers defect forever?', a: 'Industry data: 30–60% of customers who experience a stockout will not return. This is the invisible cost — lost immediate revenue plus lost lifetime value. Win-back campaigns can recover 10–25% but the rest defect to competitors.' },
    { q: 'How does win-back rate affect stockout cost?', a: 'A 25% recovery rate vs 10% saves ~15% of lost LTV. Investing in automated win-back emails ("sorry it was out of stock, here is 15% off") typically yields 3–5x ROI on the discount cost.' },
    { q: 'What is the relationship between stockout cost and reorder point?', a: 'Reorder point (P7-4) sets when to reorder; service-level Z-scores determine safety stock. Higher service level → more safety stock → fewer stockouts → lower stockout cost. The two calcs are complementary: use this one to size the cost, then use P7-4 to optimize the safety stock.' },
  ],
  howToUse: [
    'Enter your average lost sales per day during a stockout event (units × AOV if units, or $ if already converted).',
    'Enter the average stockout duration in days.',
    'Enter your customer loss rate (% who defect forever; 30–60% is typical).',
    'Enter your customer LTV (use the LTV calculator if unsure).',
    'Enter annual revenue (for % calculation) and win-back rate (10–25% is typical with good email flows).',
    'Read the stockout cost as % of revenue; use What-If to model cutting stockout days 50% or raising recovery to 25%.',
  ],
};
registerEngine(engine);