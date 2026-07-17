import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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
      '⏰ Order Fulfillment Cost Calculator\n\n' +
        '📊 Enter your orders per month, pick/pack time, shipping/packaging costs, labor rate, and return rate to see per-order and monthly fulfillment costs and how you compare to industry benchmarks.',
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

  // Health band
  const band = calcHealthBand(poCost);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — per-order cost < $5; efficient fulfillment'
      : band === 'good'
      ? 'Good — $5–$10 per order; typical retail range'
      : band === 'warning'
      ? 'Warning — $10–$20 per order; high; automate or batch'
      : 'Critical — ≥ $20 per order; restructure or switch to 3PL';

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

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      '≥ $20 per order is unsustainable. Switch to a 3PL (typical $3–$8/order), negotiate shipping rates (50%+ savings possible at scale), and audit SKU-level fulfillment complexity (top 20% of SKUs often drive 80% of cost).';
  } else if (band === 'warning') {
    tip =
      '$10–$20 per order is high. Batch pick (process 5+ orders at once), automate packaging (tape dispensers, dunnage systems), and audit return reasons (often 30–50% reducible via better product descriptions).';
  } else if (band === 'good') {
    tip =
      '$5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).';
  } else {
    tip =
      'Excellent fulfillment cost. Keep monitoring — as you scale, revisit 3PL pricing (often $3–$5/order), renegotiate carrier rates annually, and watch for return-rate creep (each +1% return adds $0.05/order).';
  }

  const r =
    '⏰ Order Fulfillment Cost Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Per-order cost: ' + money(poCost) + '  ·  Monthly total: ' + moneyR(moTotal) + '  ·  Annual: ' + moneyR(annTotal) + '\n' +
    '• Industry benchmark: $5–$10/order  ·  Your status: ' + (poCost < 5 ? 'below benchmark' : poCost < 10 ? 'in benchmark' : poCost < 20 ? 'above benchmark' : 'critical') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Orders per month:        ' + ordersPerMonth + '\n' +
    '• Pick time:               ' + pickMin + ' min/order\n' +
    '• Pack time:               ' + packMin + ' min/order\n' +
    '• Labor rate:              ' + money(laborRate) + '/hr\n' +
    '• Labor cost:              ' + money(laborCost) + '/order  (' + laborMin + ' min)\n' +
    '• Shipping cost:           ' + money(shippingCost) + '/order\n' +
    '• Packaging cost:          ' + money(packagingCost) + '/order\n' +
    '• Return rate:             ' + returnRate.toFixed(1) + '%  ·  handling = ' + money(retHandling) + '/order\n' +
    '• Per-order total:         ' + money(poCost) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Returns drop to 3%: per-order = ' + money(poCostRetDown) + '  ·  monthly savings = ' + moneyR(savingsRet) + '\n' +
    '• Labor 25% faster: per-order = ' + money(poCostLabor25) + '  ·  monthly savings = ' + moneyR(savingsLabor) + '\n' +
    '• Combined (3% returns + 25% faster labor): see Milestone\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Max labor min for 🟢 (< $5/order total): ' + (isFinite(targetLaborMin) ? targetLaborMin.toFixed(1) + ' min' : 'N/A (fixed costs alone exceed $5)') + '\n' +
    '• Labor headroom: ' + (laborHeadroom > 0 ? 'reduce pick+pack by ' + laborHeadroom.toFixed(1) + ' min to hit 🟢' : laborHeadroom === 0 ? 'at threshold' : 'already below target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 12-mo savings if cost drops $1/order: ' + moneyR(annualSavings1) + '\n' +
    '• Reinvested at 8% return: ' + moneyR(annualSavings1 * 0.08) + '/yr additional\n' +
    '• Compounded over 3 years: ' + moneyR(annualSavings1 * 1.08 * 3 - annualSavings1 * 3) + ' (vs $0 reinvested)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "var AVGRC=4.5;" +
  "function lmo(p,pa){return p+pa;}" +
  "function lcpo(lm,lr){return(lm/60)*lr;}" +
  "function rpo(rp){return(rp/100)*AVGRC;}" +
  "function poc(lc,sc,pc,rh){return lc+sc+pc+rh;}" +
  "function mt(poc,opm){return poc*opm;}" +
  "function at(mt){return mt*12;}" +
  "function band(p){if(p<5)return 'excellent';if(p<10)return 'good';if(p<20)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var opm=cnn(parseFloat(inputs.ordersPerMonth)||0);" +
  "var pk=cnn(parseFloat(inputs.pickMin)||0);" +
  "var pa=cnn(parseFloat(inputs.packMin)||0);" +
  "var sc=cnn(parseFloat(inputs.shippingCost)||0);" +
  "var pc=cnn(parseFloat(inputs.packagingCost)||0);" +
  "var lr=cnn(parseFloat(inputs.laborRate)||0);" +
  "var rr=cnn(Math.min(100,parseFloat(inputs.returnRate)||0));" +
  "if(opm===0){return['\\u23F0 Order Fulfillment Cost Calculator\\n\\n\\uD83D\\uDCCA Enter your orders per month, pick/pack time, shipping/packaging costs, labor rate, and return rate to see per-order and monthly fulfillment costs and how you compare to industry benchmarks.'];}" +
  "var lm=lmo(pk,pa);" +
  "var lc=lcpo(lm,lr);" +
  "var rh=rpo(rr);" +
  "var poC=poc(lc,sc,pc,rh);" +
  "var moT=mt(poC,opm);" +
  "var annT=at(moT);" +
  "function money(n){return '$'+n.toLocaleString('en-US',{maximumFractionDigits:2});}" +
  "function moneyR(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "var bd=band(poC);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 per-order cost < $5; efficient fulfillment':bd==='good'?'Good \\u2014 $5\\u2013$10 per order; typical retail range':bd==='warning'?'Warning \\u2014 $10\\u2013$20 per order; high; automate or batch':'Critical \\u2014 \\u2265 $20 per order; restructure or switch to 3PL';" +
  "var rr3=3;var rh3=rpo(rr3);var po3=poc(lc,sc,pc,rh3);var savR=moT-mt(po3,opm);" +
  "var lm25=lm*0.75;var lc25=lcpo(lm25,lr);var poL25=poc(lc25,sc,pc,rh);var savL=moT-mt(poL25,opm);" +
  "var fixed=sc+pc+rh;var tlc=5.0-fixed;var tlm=lr>0&&tlc>0?(tlc*60)/lr:Infinity;var lhr=lm-tlm;" +
  "var annSav1=1*opm*12;" +
  "var tip='';" +
  "if(bd==='critical'){tip='\\u2265 $20 per order is unsustainable. Switch to a 3PL (typical $3\\u2013$8/order), negotiate shipping rates (50%+ savings possible at scale), and audit SKU-level fulfillment complexity (top 20% of SKUs often drive 80% of cost).';}" +
  "else if(bd==='warning'){tip='$10\\u2013$20 per order is high. Batch pick (process 5+ orders at once), automate packaging (tape dispensers, dunnage systems), and audit return reasons (often 30\\u201350% reducible via better product descriptions).';}" +
  "else if(bd==='good'){tip='$5\\u2013$10 per order is typical retail. To reach \\uD83D\\uDFE2, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).';}" +
  "else{tip='Excellent fulfillment cost. Keep monitoring \\u2014 as you scale, revisit 3PL pricing (often $3\\u2013$5/order), renegotiate carrier rates annually, and watch for return-rate creep (each +1% return adds $0.05/order).';}" +
  "var r2='';" +
  "r2+='\\u23F0 Order Fulfillment Cost Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Per-order cost: '+money(poC)+'  \\u00B7  Monthly total: '+moneyR(moT)+'  \\u00B7  Annual: '+moneyR(annT)+'\\n';" +
  "r2+='\\u2022 Industry benchmark: $5\\u2013$10/order  \\u00B7  Your status: '+(poC<5?'below benchmark':poC<10?'in benchmark':poC<20?'above benchmark':'critical')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Orders per month:        '+opm+'\\n';" +
  "r2+='\\u2022 Pick time:               '+pk+' min/order\\n';" +
  "r2+='\\u2022 Pack time:               '+pa+' min/order\\n';" +
  "r2+='\\u2022 Labor rate:              '+money(lr)+'/hr\\n';" +
  "r2+='\\u2022 Labor cost:              '+money(lc)+'/order  ('+lm+' min)\\n';" +
  "r2+='\\u2022 Shipping cost:           '+money(sc)+'/order\\n';" +
  "r2+='\\u2022 Packaging cost:          '+money(pc)+'/order\\n';" +
  "r2+='\\u2022 Return rate:             '+rr.toFixed(1)+'%  \\u00B7  handling = '+money(rh)+'/order\\n';" +
  "r2+='\\u2022 Per-order total:         '+money(poC)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Returns drop to 3%: per-order = '+money(po3)+'  \\u00B7  monthly savings = '+moneyR(savR)+'\\n';" +
  "r2+='\\u2022 Labor 25% faster: per-order = '+money(poL25)+'  \\u00B7  monthly savings = '+moneyR(savL)+'\\n';" +
  "r2+='\\u2022 Combined (3% returns + 25% faster labor): see Milestone\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Max labor min for \\uD83D\\uDFE2 (< $5/order total): '+(isFinite(tlm)?tlm.toFixed(1)+' min':'N/A (fixed costs alone exceed $5)')+'\\n';" +
  "r2+='\\u2022 Labor headroom: '+(lhr>0?'reduce pick+pack by '+lhr.toFixed(1)+' min to hit \\uD83D\\uDFE2':lhr===0?'at threshold':'already below target')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 12-mo savings if cost drops $1/order: '+moneyR(annSav1)+'\\n';" +
  "r2+='\\u2022 Reinvested at 8% return: '+moneyR(annSav1*0.08)+'/yr additional\\n';" +
  "r2+='\\u2022 Compounded over 3 years: '+moneyR(annSav1*1.08*3-annSav1*3)+' (vs $0 reinvested)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

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
  generate: calculate,
  staticExamples: ['⏰ Order Fulfillment Cost Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — $5–$10 per order; typical retail range\n• Per-order cost: $8.56  ·  Monthly total: $4,280  ·  Annual: $51,360\n• Industry benchmark: $5–$10/order  ·  Your status: in benchmark\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Orders per month:        500\n• Pick time:               3 min/order\n• Pack time:               2 min/order\n• Labor rate:              $18/hr\n• Labor cost:              $1.5/order  (5 min)\n• Shipping cost:           $5.5/order\n• Packaging cost:          $1.2/order\n• Return rate:             8.0%  ·  handling = $0.36/order\n• Per-order total:         $8.56\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Returns drop to 3%: per-order = $8.33  ·  monthly savings = $113\n• Labor 25% faster: per-order = $8.19  ·  monthly savings = $187\n• Combined (3% returns + 25% faster labor): see Milestone\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Max labor min for 🟢 (< $5/order total): N/A (fixed costs alone exceed $5)\n• Labor headroom: already below target\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 12-mo savings if cost drops $1/order: $6,000\n• Reinvested at 8% return: $480/yr additional\n• Compounded over 3 years: $1,440 (vs $0 reinvested)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: $5–$10 per order is typical retail. To reach 🟢, focus on shipping negotiation (LTL freight for heavy items, regional carriers), reduce packaging waste, and review labor flow (eliminate walking time).\n'],
  faq: [
    { q: 'What is a typical per-order fulfillment cost?', a: '$5–$10 is typical retail. <$5 is excellent (high-volume operators or efficient 3PLs). $10–$20 is high (small-volume in-house). ≥$20 is critical (often indicates manual labor + inefficient shipping).' },
    { q: 'Should I use a 3PL or fulfill in-house?', a: '3PLs typically charge $3–$8 per order and become cost-effective above ~200 orders/month. Below that, in-house is often cheaper (3PL minimums + storage fees). Compare using this calculator with 3PL quote.' },
    { q: 'How can I reduce return handling costs?', a: 'Returns typically cost $4–$10/order to handle (receiving, inspecting, restocking or disposing). Reduce at source: better product descriptions, accurate sizing, AR try-on tools, packaging integrity.' },
    { q: 'What is the biggest cost driver?', a: 'Usually shipping (40–60% of per-order cost for small parcels). Negotiate rates at scale (carriers give 30–50% discounts above 100 orders/week), use regional carriers, or batch orders to LTL for heavy items.' },
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