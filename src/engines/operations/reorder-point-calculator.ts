import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Reorder Point Calculator (P7-4) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Reorder point = lead-time demand + safety stock.
// Safety stock = Z × std dev × √(lead time / review period).
// Z-score is selected by service level: 90% → 1.28, 95% → 1.65, 99% → 2.33.
// Health bands (by chosen service level):
//   🟢 ≥ 95%      — recommended for high-margin / critical SKU
//   🟡 90%         — typical retail
//   🟠 85%         — risky; raise to 95%
//   🔴 < 85%       — default risk tolerance; reorder point too low
//
// Applies to physical-product businesses (Shopify/Amazon FBA/DTC).

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 95,
  good: 90,
  warning: 85,
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Service level → Z-score lookup. */
const Z_SCORES: Record<number, number> = { 90: 1.28, 95: 1.65, 99: 2.33 };
export function zScore(serviceLevel: number): number {
  return Z_SCORES[serviceLevel] ?? 1.65; // default to 95% SL
}

/** Lead-time demand (units) = avg daily demand × lead time (days). */
export function leadTimeDemand(avgDailyDemand: number, leadTimeDays: number): number {
  return avgDailyDemand * leadTimeDays;
}

/** Safety stock (units) = Z × std dev × √(lead time / review period). */
export function safetyStock(
  z: number,
  demandStdDev: number,
  leadTimeDays: number,
  reviewPeriod: number
): number {
  if (reviewPeriod <= 0) return 0;
  return z * demandStdDev * Math.sqrt(leadTimeDays / reviewPeriod);
}

/** Reorder point (units) = lead-time demand + safety stock. */
export function reorderPoint(leadTimeDemand: number, safetyStock: number): number {
  return leadTimeDemand + safetyStock;
}

/** Health band label from service level chosen. */
export function calcHealthBand(serviceLevel: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (serviceLevel >= HEALTH_BANDS.excellent) return 'excellent';
  if (serviceLevel >= HEALTH_BANDS.good) return 'good';
  if (serviceLevel >= HEALTH_BANDS.warning) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const avgDailyDemand = clampNonNegative(parseFloat(inputs.avgDailyDemand) || 0);
  const leadTimeDays = clampNonNegative(parseFloat(inputs.leadTimeDays) || 0);
  const serviceLevel = parseInt(inputs.serviceLevel || '95', 10);
  const demandStdDev = clampNonNegative(parseFloat(inputs.demandStdDev) || 0);
  const reviewPeriod = Math.max(1, parseFloat(inputs.reviewPeriod) || 7);

  // Edge: zero demand or lead time → prompt
  if (avgDailyDemand === 0 || leadTimeDays === 0) {
    return [
      '⏰ Reorder Point Calculator\n\n' +
        '📊 Enter your average daily demand, supplier lead time, service level, demand std dev, and review period to compute when to reorder and how much safety stock to carry.',
    ];
  }

  const z = zScore(serviceLevel);
  const ltd = leadTimeDemand(avgDailyDemand, leadTimeDays);
  const ss = safetyStock(z, demandStdDev, leadTimeDays, reviewPeriod);
  const rop = reorderPoint(ltd, ss);

  // Health band
  const band = calcHealthBand(serviceLevel);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — service level ≥ 95%; reorder point accounts for demand variability'
      : band === 'good'
      ? 'Good — 90% service level; typical retail, raise to 95% for high-margin / critical SKU'
      : band === 'warning'
      ? 'Warning — 85% service level; risky; 15% of cycles will stockout'
      : 'Critical — < 85% service level; default risk tolerance; reorder point too low';

  // What-If: lead time doubles (safety stock grows with sqrt)
  const leadTimeDoubled = leadTimeDays * 2;
  const ltdDoubled = leadTimeDemand(avgDailyDemand, leadTimeDoubled);
  const ssDoubled = safetyStock(z, demandStdDev, leadTimeDoubled, reviewPeriod);
  const ropDoubled = reorderPoint(ltdDoubled, ssDoubled);
  const ssDelta = ssDoubled - ss;

  // What-If 2: service level raised to 99%
  const z99 = zScore(99);
  const ss99 = safetyStock(z99, demandStdDev, leadTimeDays, reviewPeriod);
  const rop99 = reorderPoint(ltd, ss99);
  const ssIncrease99 = ss99 - ss;

  // Break-Even: min service level for low-stockout risk (≥ 95%)
  const minSLForExcellent = 95;
  const slGap = minSLForExcellent - serviceLevel;

  // Milestone: 12-mo — units between ROP and stockout = inventory headroom
  // Headroom = safetyStock (the buffer above lead-time demand)
  const inventoryHeadroom = ss;
  const monthlyOrderFreq = 30 / reviewPeriod; // approx orders per month
  const annualStockoutAvoided = inventoryHeadroom * monthlyOrderFreq * 12;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      '< 85% service level will stockout 15%+ of cycles. Raise SL to 95% immediately (typical for most SKUs), or to 99% for high-margin / critical / perishable inventory. Cost of safety stock is far less than cost of stockouts (use P7-3 to compare).';
  } else if (band === 'warning') {
    tip =
      '85% service level means ~15% of cycles will stockout. For most SKUs, 95% SL is the right target — the safety-stock cost increase (≈30% more buffer) is small relative to the stockout cost avoided.';
  } else if (band === 'good') {
    tip =
      '90% service level is solid retail. To upgrade to 🟢, increase to 95% SL (typically +25% safety stock buffer). Reserve 99% SL for high-margin / critical / perishable SKUs only.';
  } else {
    tip =
      '95% service level is the recommended baseline. Reorder quarterly to match demand variability shifts (seasonal products may need SL tuning). Pair with stockout cost (P7-3) to verify safety-stock investment pays off.';
  }

  const r =
    '⏰ Reorder Point Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Service level: ' + serviceLevel + '%  ·  Z-score: ' + z.toFixed(2) + '  ·  Reorder point: ' + Math.round(rop) + ' units\n' +
    '• Lead-time demand: ' + Math.round(ltd) + ' units  ·  Safety stock: ' + Math.round(ss) + ' units\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Avg daily demand:        ' + avgDailyDemand + ' units/day\n' +
    '• Supplier lead time:      ' + leadTimeDays + ' days\n' +
    '• Service level:           ' + serviceLevel + '%  (Z = ' + z.toFixed(2) + ')\n' +
    '• Demand std deviation:    ' + demandStdDev + ' units/day\n' +
    '• Review period:           ' + reviewPeriod + ' days\n' +
    '• Lead-time demand:        ' + Math.round(ltd) + ' units\n' +
    '• Safety stock:            ' + Math.round(ss) + ' units\n' +
    '• Reorder point:           ' + Math.round(rop) + ' units\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Lead time doubles: ROP = ' + Math.round(ropDoubled) + ' units  ·  safety stock grows by ' + Math.round(ssDelta) + ' units (√2 factor)\n' +
    '• Service level raised to 99% (Z=' + z99.toFixed(2) + '): ROP = ' + Math.round(rop99) + ' units  ·  safety stock grows by ' + Math.round(ssIncrease99) + ' units\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Min service level for 🟢: ' + minSLForExcellent + '%\n' +
    '• Current vs target: ' + (slGap > 0 ? 'raise SL by ' + slGap + 'pp to hit 🟢' : slGap === 0 ? 'at target' : 'already above target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Inventory headroom (safety stock): ' + Math.round(inventoryHeadroom) + ' units above lead-time demand\n' +
    '• Order frequency: ~' + monthlyOrderFreq.toFixed(1) + ' orders/month  ·  ~' + Math.round(monthlyOrderFreq * 12) + ' orders/year\n' +
    '• Annual stockout risk avoided: ' + Math.round(annualStockoutAvoided) + ' units not stocked out\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "var ZS={90:1.28,95:1.65,99:2.33};" +
  "function zScore(sl){return ZS[sl]!=null?ZS[sl]:1.65;}" +
  "function ltd(d,l){return d*l;}" +
  "function ss(z,sd,l,rp){if(rp<=0)return 0;return z*sd*Math.sqrt(l/rp);}" +
  "function rop(l,s){return l+s;}" +
  "function band(sl){if(sl>=95)return 'excellent';if(sl>=90)return 'good';if(sl>=85)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var add=cnn(parseFloat(inputs.avgDailyDemand)||0);" +
  "var ltd2=cnn(parseFloat(inputs.leadTimeDays)||0);" +
  "var sl=parseInt(inputs.serviceLevel||'95',10);" +
  "var dsd=cnn(parseFloat(inputs.demandStdDev)||0);" +
  "var rp=Math.max(1,parseFloat(inputs.reviewPeriod)||7);" +
  "if(add===0||ltd2===0){return['\\u23F0 Reorder Point Calculator\\n\\n\\uD83D\\uDCCA Enter your average daily demand, supplier lead time, service level, demand std dev, and review period to compute when to reorder and how much safety stock to carry.'];}" +
  "var z=zScore(sl);" +
  "var ltdV=ltd(add,ltd2);" +
  "var ssV=ss(z,dsd,ltd2,rp);" +
  "var ropV=rop(ltdV,ssV);" +
  "var bd=band(sl);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 service level \\u2265 95%; reorder point accounts for demand variability':bd==='good'?'Good \\u2014 90% service level; typical retail, raise to 95% for high-margin / critical SKU':bd==='warning'?'Warning \\u2014 85% service level; risky; 15% of cycles will stockout':'Critical \\u2014 < 85% service level; default risk tolerance; reorder point too low';" +
  "var lt2=ltd2*2;var ltdD=ltd(add,lt2);var ssD=ss(z,dsd,lt2,rp);var ropD=rop(ltdD,ssD);var ssDelta=ssD-ssV;" +
  "var z99=zScore(99);var ss99=ss(z99,dsd,ltd2,rp);var rop99=rop(ltdV,ss99);var ssInc99=ss99-ssV;" +
  "var minSL=95;var slGap=minSL-sl;" +
  "var invH=ssV;var moFreq=30/rp;var annStkout=invH*moFreq*12;" +
  "var tip='';" +
  "if(bd==='critical'){tip='< 85% service level will stockout 15%+ of cycles. Raise SL to 95% immediately (typical for most SKUs), or to 99% for high-margin / critical / perishable inventory. Cost of safety stock is far less than cost of stockouts (use P7-3 to compare).';}" +
  "else if(bd==='warning'){tip='85% service level means ~15% of cycles will stockout. For most SKUs, 95% SL is the right target \\u2014 the safety-stock cost increase (\\u224830% more buffer) is small relative to the stockout cost avoided.';}" +
  "else if(bd==='good'){tip='90% service level is solid retail. To upgrade to \\uD83D\\uDFE2, increase to 95% SL (typically +25% safety stock buffer). Reserve 99% SL for high-margin / critical / perishable SKUs only.';}" +
  "else{tip='95% service level is the recommended baseline. Reorder quarterly to match demand variability shifts (seasonal products may need SL tuning). Pair with stockout cost (P7-3) to verify safety-stock investment pays off.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Reorder Point Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Service level: '+sl+'%  \\u00B7  Z-score: '+z.toFixed(2)+'  \\u00B7  Reorder point: '+Math.round(ropV)+' units\\n';" +
  "r2+='\\u2022 Lead-time demand: '+Math.round(ltdV)+' units  \\u00B7  Safety stock: '+Math.round(ssV)+' units\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Avg daily demand:        '+add+' units/day\\n';" +
  "r2+='\\u2022 Supplier lead time:      '+ltd2+' days\\n';" +
  "r2+='\\u2022 Service level:           '+sl+'%  (Z = '+z.toFixed(2)+')\\n';" +
  "r2+='\\u2022 Demand std deviation:    '+dsd+' units/day\\n';" +
  "r2+='\\u2022 Review period:           '+rp+' days\\n';" +
  "r2+='\\u2022 Lead-time demand:        '+Math.round(ltdV)+' units\\n';" +
  "r2+='\\u2022 Safety stock:            '+Math.round(ssV)+' units\\n';" +
  "r2+='\\u2022 Reorder point:           '+Math.round(ropV)+' units\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Lead time doubles: ROP = '+Math.round(ropD)+' units  \\u00B7  safety stock grows by '+Math.round(ssDelta)+' units (\\u221A2 factor)\\n';" +
  "r2+='\\u2022 Service level raised to 99% (Z='+z99.toFixed(2)+'): ROP = '+Math.round(rop99)+' units  \\u00B7  safety stock grows by '+Math.round(ssInc99)+' units\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Min service level for \\uD83D\\uDFE2: '+minSL+'%\\n';" +
  "r2+='\\u2022 Current vs target: '+(slGap>0?'raise SL by '+slGap+'pp to hit \\uD83D\\uDFE2':slGap===0?'at target':'already above target')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Inventory headroom (safety stock): '+Math.round(invH)+' units above lead-time demand\\n';" +
  "r2+='\\u2022 Order frequency: ~'+moFreq.toFixed(1)+' orders/month  \\u00B7  ~'+Math.round(moFreq*12)+' orders/year\\n';" +
  "r2+='\\u2022 Annual stockout risk avoided: '+Math.round(annStkout)+' units not stocked out\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-reorder-point-calculator',
  title: 'Reorder Point Calculator',
  description:
    'Compute when to reorder — lead-time demand + safety stock. Includes service-level Z-score for statistical safety buffer. Health bands: 🟢 ≥95% · 🟡 90% · 🟠 85% · 🔴 <85% service level.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'avgDailyDemand', label: 'Average Daily Demand (units)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'leadTimeDays', label: 'Supplier Lead Time (days)', placeholder: 'e.g. 14', type: 'number' },
    {
      name: 'serviceLevel',
      label: 'Service Level',
      placeholder: '',
      type: 'select',
      options: ['90', '95', '99'],
    },
    { name: 'demandStdDev', label: 'Daily Demand Std Dev (units)', placeholder: 'e.g. 10', type: 'number' },
    { name: 'reviewPeriod', label: 'Review Period (days)', placeholder: 'e.g. 7', type: 'number' },
  ],
  keywords: [
    'reorder point calculator',
    'safety stock',
    'service level',
    'Z-score inventory',
    'lead time demand',
    'inventory reorder',
    'stockout prevention',
    'demand variability',
    'EOQ alternative',
    'inventory buffer',
  ],
  tags: ['operations', 'inventory', 'reorder', 'safety-stock'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.investopedia.com/terms/r/reorder-point.asp',
    'https://www.shopify.com/blog/reorder-point',
    'https://www.netSuite.com/portal/resource/articles/inventory-management/reorder-point.shtml',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['⏰ Reorder Point Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Excellent — service level ≥ 95%; reorder point accounts for demand variability\n• Service level: 95%  ·  Z-score: 1.65  ·  Reorder point: 723 units\n• Lead-time demand: 700 units  ·  Safety stock: 23 units\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Avg daily demand:        50 units/day\n• Supplier lead time:      14 days\n• Service level:           95%  (Z = 1.65)\n• Demand std deviation:    10 units/day\n• Review period:           7 days\n• Lead-time demand:        700 units\n• Safety stock:            23 units\n• Reorder point:           723 units\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Lead time doubles: ROP = 1433 units  ·  safety stock grows by 10 units (√2 factor)\n• Service level raised to 99% (Z=2.33): ROP = 733 units  ·  safety stock grows by 10 units\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Min service level for 🟢: 95%\n• Current vs target: at target\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Inventory headroom (safety stock): 23 units above lead-time demand\n• Order frequency: ~4.3 orders/month  ·  ~51 orders/year\n• Annual stockout risk avoided: 1200 units not stocked out\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: 95% service level is the recommended baseline. Reorder quarterly to match demand variability shifts (seasonal products may need SL tuning). Pair with stockout cost (P7-3) to verify safety-stock investment pays off.\n'],
  faq: [
    { q: 'What is a good service level for inventory?', a: '95% is the recommended baseline for most SKUs — only 5% of cycles will stockout. 99% is reserved for high-margin, critical, or perishable items. 90% is typical retail but accepts 10% stockout risk.' },
    { q: 'How does demand variability affect safety stock?', a: 'Higher demand variability (larger std dev) → more safety stock needed. Safety stock grows linearly with std dev but only as √lead time. So doubling lead time increases safety stock by ~41%, not 100%.' },
    { q: 'What is the relationship between safety stock and review period?', a: 'Longer review periods (you check inventory less often) → more safety stock needed. The √(lead time / review period) factor means a 4x longer review period doubles safety stock.' },
    { q: 'Should I use 95% or 99% service level?', a: 'Start with 95% for most SKUs. Use 99% only for: high-margin products (stockout cost is high), critical/perishable items (lost sale is permanent), or items with high LTV customers. The safety-stock cost increase from 95% to 99% is ~41%.' },
  ],
  howToUse: [
    'Enter your average daily demand (units sold per day).',
    'Enter your supplier lead time in days (from order to delivery).',
    'Select your target service level (90/95/99%). Use 95% as default; 99% for critical SKUs.',
    'Enter your daily demand standard deviation (how much demand varies day-to-day).',
    'Enter your review period (how often you check inventory and reorder — typically weekly = 7 days).',
    'Read the reorder point — order when inventory drops to this level.',
  ],
};
registerEngine(engine);