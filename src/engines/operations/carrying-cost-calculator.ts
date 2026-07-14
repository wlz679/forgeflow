import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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
      '⏰ Carrying Cost Calculator\n\n' +
        '📊 Enter your average inventory value and the five carrying-cost rate components (storage, insurance, shrinkage, opportunity cost, other) to see your total annual carrying cost and how you compare to industry benchmarks.',
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
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — total carry < 20%; capital is efficient'
      : band === 'good'
      ? 'Good — typical retail range (20–25%); review annually'
      : band === 'warning'
      ? 'Warning — high carrying cost (25–30%); reduce SKU count or storage spend'
      : 'Critical — ≥ 30%; urgent renegotiation of 3PL / storage contracts';

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
    tip =
      '≥ 30% carrying cost is unsustainable. Renegotiate 3PL contracts (storage fees are usually the biggest lever), kill bottom-decile SKUs, and consider drop-shipping for slow movers to remove inventory from your books entirely.';
  } else if (band === 'warning') {
    tip =
      '25–30% is high. Reduce SKU count by 20% (typically kills 60% of slow-moving capital), audit shrinkage (most teams find 0.5–1.5% recoverable via better receiving/inventory audits), and check storage rates against 2 alternative 3PLs.';
  } else if (band === 'good') {
    tip =
      '20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.';
  } else {
    tip =
      'Excellent carry cost. Your capital is efficient — keep monitoring for creep. Watch for: storage rate increases on contract renewal, opportunity cost drift if interest rates fall (re-evaluate opp cost annually).';
  }

  const r =
    '⏰ Carrying Cost Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Total rate: ' + tr.toFixed(1) + '%/year  ·  Total annual cost: ' + money(totalCost) + '\n' +
    '• Industry benchmark: 20–30% of inventory value/year  ·  Your status: ' + (tr < 20 ? 'below benchmark' : tr < 25 ? 'in benchmark' : tr < 30 ? 'above benchmark' : 'critical') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Avg inventory value:    ' + money(avgInventoryValue) + '\n' +
    '• Storage:                ' + storageRate.toFixed(1) + '%  =  ' + money(storageCost) + '/yr\n' +
    '• Insurance:              ' + insuranceRate.toFixed(1) + '%  =  ' + money(insuranceCost) + '/yr\n' +
    '• Shrinkage:              ' + shrinkageRate.toFixed(1) + '%  =  ' + money(shrinkageCost) + '/yr\n' +
    '• Opportunity cost:       ' + oppCostRate.toFixed(1) + '%  =  ' + money(oppCost) + '/yr\n' +
    '• Other:                  ' + otherCostsPct.toFixed(1) + '%  =  ' + money(otherCost) + '/yr\n' +
    '• TOTAL:                  ' + tr.toFixed(1) + '%  =  ' + money(totalCost) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Shrinkage drops to 0.5% (loss-prevention win): rate = ' + trShrinkageDown.toFixed(1) + '%  ·  annual cost = ' + money(totalCostShrinkageDown) + '  ·  savings = ' + money(savingsFromShrinkage) + '\n' +
    '• Total rate drops −2pp: rate = ' + trDown2pp.toFixed(1) + '%  ·  annual cost = ' + money(totalCostDown2pp) + '  ·  savings = ' + money(savings2pp) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Max storage rate for 🟢 (target <20% total): ' + (targetStorage >= 0 ? targetStorage.toFixed(1) + '%' : 'N/A (other components already exceed 20% — must reduce elsewhere)') + '\n' +
    '• Storage headroom: ' + (storageHeadroom > 0 ? 'reduce storage by ' + storageHeadroom.toFixed(1) + 'pp to hit 🟢' : storageHeadroom === 0 ? 'at threshold' : 'already below target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 12-mo savings if rate drops 2pp: ' + money(annualSavings2pp) + '\n' +
    '• Reinvested at 8% return: ' + money(annualSavings2pp * 0.08) + '/yr additional\n' +
    '• Compounded over 3 years: ' + money(annualSavings2pp * 1.08 * 3 - annualSavings2pp * 3) + ' (vs $0 reinvested)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function tr(s,i,sh,oc,ot){return s+i+sh+oc+ot;}" +
  "function tac(v,r){return v*(r/100);}" +
  "function cc(v,r){return v*(r/100);}" +
  "function band(r){if(r<20)return 'excellent';if(r<25)return 'good';if(r<30)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var inv=cnn(parseFloat(inputs.avgInventoryValue)||0);" +
  "var st=cnn(parseFloat(inputs.storageRate)||0);" +
  "var ins=cnn(parseFloat(inputs.insuranceRate)||0);" +
  "var sh=cnn(parseFloat(inputs.shrinkageRate)||0);" +
  "var oc=cnn(parseFloat(inputs.oppCostRate)||0);" +
  "var ot=cnn(parseFloat(inputs.otherCostsPct)||0);" +
  "if(inv===0){return['\\u23F0 Carrying Cost Calculator\\n\\n\\uD83D\\uDCCA Enter your average inventory value and the five carrying-cost rate components (storage, insurance, shrinkage, opportunity cost, other) to see your total annual carrying cost and how you compare to industry benchmarks.'];}" +
  "var rate=tr(st,ins,sh,oc,ot);" +
  "var cost=tac(inv,rate);" +
  "var sc=cc(inv,st);var ic=cc(inv,ins);var shc=cc(inv,sh);var occ=cc(inv,oc);var otc=cc(inv,ot);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "var bd=band(rate);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 total carry < 20%; capital is efficient':bd==='good'?'Good \\u2014 typical retail range (20\\u201325%); review annually':bd==='warning'?'Warning \\u2014 high carrying cost (25\\u201330%); reduce SKU count or storage spend':'Critical \\u2014 \\u2265 30%; urgent renegotiation of 3PL / storage contracts';" +
  "var shD=0.5;" +
  "var trSD=tr(st,ins,shD,oc,ot);" +
  "var tcSD=tac(inv,trSD);" +
  "var savSD=cost-tcSD;" +
  "var trD2=Math.max(0,rate-2);var tcD2=tac(inv,trD2);var sav2=cost-tcD2;" +
  "var otherSum=ins+sh+oc+ot;var tSt=19.9-otherSum;var stHR=st-tSt;" +
  "var annSav2=sav2;" +
  "var tip='';" +
  "if(bd==='critical'){tip='\\u2265 30% carrying cost is unsustainable. Renegotiate 3PL contracts (storage fees are usually the biggest lever), kill bottom-decile SKUs, and consider drop-shipping for slow movers to remove inventory from your books entirely.';}" +
  "else if(bd==='warning'){tip='25\\u201330% is high. Reduce SKU count by 20% (typically kills 60% of slow-moving capital), audit shrinkage (most teams find 0.5\\u20131.5% recoverable via better receiving/inventory audits), and check storage rates against 2 alternative 3PLs.';}" +
  "else if(bd==='good'){tip='20\\u201325% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.';}" +
  "else{tip='Excellent carry cost. Your capital is efficient \\u2014 keep monitoring for creep. Watch for: storage rate increases on contract renewal, opportunity cost drift if interest rates fall (re-evaluate opp cost annually).';}" +
  "var r2='';" +
  "r2+='\\u23F0 Carrying Cost Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Total rate: '+rate.toFixed(1)+'%/year  \\u00B7  Total annual cost: '+money(cost)+'\\n';" +
  "r2+='\\u2022 Industry benchmark: 20\\u201330% of inventory value/year  \\u00B7  Your status: '+(rate<20?'below benchmark':rate<25?'in benchmark':rate<30?'above benchmark':'critical')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Avg inventory value:    '+money(inv)+'\\n';" +
  "r2+='\\u2022 Storage:                '+st.toFixed(1)+'%  =  '+money(sc)+'/yr\\n';" +
  "r2+='\\u2022 Insurance:              '+ins.toFixed(1)+'%  =  '+money(ic)+'/yr\\n';" +
  "r2+='\\u2022 Shrinkage:              '+sh.toFixed(1)+'%  =  '+money(shc)+'/yr\\n';" +
  "r2+='\\u2022 Opportunity cost:       '+oc.toFixed(1)+'%  =  '+money(occ)+'/yr\\n';" +
  "r2+='\\u2022 Other:                  '+ot.toFixed(1)+'%  =  '+money(otc)+'/yr\\n';" +
  "r2+='\\u2022 TOTAL:                  '+rate.toFixed(1)+'%  =  '+money(cost)+'/yr\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Shrinkage drops to 0.5% (loss-prevention win): rate = '+trSD.toFixed(1)+'%  \\u00B7  annual cost = '+money(tcSD)+'  \\u00B7  savings = '+money(savSD)+'\\n';" +
  "r2+='\\u2022 Total rate drops \\u22122pp: rate = '+trD2.toFixed(1)+'%  \\u00B7  annual cost = '+money(tcD2)+'  \\u00B7  savings = '+money(sav2)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Max storage rate for \\uD83D\\uDFE2 (target <20% total): '+(tSt>=0?tSt.toFixed(1)+'%':'N/A (other components already exceed 20% \\u2014 must reduce elsewhere)')+'\\n';" +
  "r2+='\\u2022 Storage headroom: '+(stHR>0?'reduce storage by '+stHR.toFixed(1)+'pp to hit \\uD83D\\uDFE2':stHR===0?'at threshold':'already below target')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 12-mo savings if rate drops 2pp: '+money(annSav2)+'\\n';" +
  "r2+='\\u2022 Reinvested at 8% return: '+money(annSav2*0.08)+'/yr additional\\n';" +
  "r2+='\\u2022 Compounded over 3 years: '+money(annSav2*1.08*3-annSav2*3)+' (vs $0 reinvested)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

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
  generate: calculate,
  staticExamples: ['⏰ Carrying Cost Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — typical retail range (20–25%); review annually\n• Total rate: 21.5%/year  ·  Total annual cost: $10,750\n• Industry benchmark: 20–30% of inventory value/year  ·  Your status: in benchmark\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Avg inventory value:    $50,000\n• Storage:                8.0%  =  $4,000/yr\n• Insurance:              1.5%  =  $750/yr\n• Shrinkage:              2.0%  =  $1,000/yr\n• Opportunity cost:       8.0%  =  $4,000/yr\n• Other:                  2.0%  =  $1,000/yr\n• TOTAL:                  21.5%  =  $10,750/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Shrinkage drops to 0.5% (loss-prevention win): rate = 20.0%  ·  annual cost = $10,000  ·  savings = $750\n• Total rate drops −2pp: rate = 19.5%  ·  annual cost = $9,750  ·  savings = $1,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Max storage rate for 🟢 (target <20% total): 6.4%\n• Storage headroom: reduce storage by 1.6pp to hit 🟢\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 12-mo savings if rate drops 2pp: $1,000\n• Reinvested at 8% return: $80/yr additional\n• Compounded over 3 years: $240 (vs $0 reinvested)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: 20–25% is solid retail territory. To reach the excellent band, focus on opportunity cost (line of credit at < 8% APR) and storage (consolidate to fewer warehouses). Audit annually for rate changes.\n'],
  faq: [
    { q: 'What is a typical inventory carrying cost?', a: 'Industry rule of thumb: 20–30% of inventory value per year. Storage is usually the largest component (5–10%), followed by opportunity cost (5–10%), shrinkage (1–3%), insurance (1–2%), and other (1–3%).' },
    { q: 'How do I reduce my carrying cost?', a: 'Three biggest levers: (1) reduce SKU count — kill bottom 20% (typically frees 50%+ of capital), (2) renegotiate 3PL contracts — most teams save 15–30%, (3) tighten reorder points and reduce safety stock (saves 10–20%).' },
    { q: 'How is opportunity cost calculated?', a: 'Opportunity cost = capital tied up in inventory × alternative investment return. If your inventory holds $50k and you could earn 8% elsewhere, opp cost = $4k/year. Adjust when interest rates change (lower rates → lower opp cost).' },
    { q: 'Does shrinkage include theft?', a: 'Yes — shrinkage is the umbrella term for inventory loss from theft, damage, expiry, miscounting, and supplier fraud. Most teams find 0.5–1.5% recoverable via better receiving/inventory audits; >2% suggests a process problem.' },
  ],
  howToUse: [
    'Enter your average inventory value (often calculated as (beginning + ending inventory) / 2).',
    'Enter each carrying cost component as a percentage of inventory value (storage / insurance / shrinkage / opportunity / other).',
    'Read the total annual cost and compare to the 20–30% industry benchmark band.',
    'Use What-If to model shrinkage reduction (typical loss-prevention win) or rate drops.',
    'If you are above 30%, use Break-Even to see which component to attack first.',
  ],
};
registerEngine(engine);