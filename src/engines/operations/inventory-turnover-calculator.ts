import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Inventory Turnover Calculator (P7-1) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Inventory turnover = annual COGS / average inventory. Days-to-sell = period / ratio.
// Health bands by turnover ratio:
//   🟢 ≥ 6.0 (general) — healthy cycle, capital not trapped
//   🟡 4.0–6.0         — typical retail; optimize SKU mix
//   🟠 2.0–4.0         — slow movers tying up capital
//   🔴 < 2.0           — critical: SKU rationalization urgent
//
// Industry benchmarks: general 6, apparel 4, electronics 6, grocery 12, furniture 3.
// Applies to physical-product businesses (Shopify, Amazon FBA, DTC) AND service
// businesses that hold inventory (course creators with merch, agencies with hardware).

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 6.0,
  good: [4.0, 6.0],
  warning: [2.0, 4.0],
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Inventory turnover ratio = annual COGS / average inventory. */
export function turnoverRatio(annualCOGS: number, avgInventory: number): number {
  if (avgInventory <= 0) return 0;
  return annualCOGS / avgInventory;
}

/** Days to sell one full inventory cycle = period days / turnover ratio. */
export function daysToSell(annualCOGS: number, avgInventory: number, periodDays: number): number {
  const ratio = turnoverRatio(annualCOGS, avgInventory);
  if (ratio <= 0) return 0;
  return periodDays / ratio;
}

/** Industry-specific turnover benchmark lookup. Defaults to 6 (general). */
const BENCHMARKS: Record<string, number> = {
  general: 6,
  apparel: 4,
  electronics: 6,
  grocery: 12,
  furniture: 3,
};
export function industryBenchmark(industry: string): number {
  return BENCHMARKS[industry] ?? 6;
}

/** Health band label from turnover ratio. */
export function calcHealthBand(ratio: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (ratio >= HEALTH_BANDS.excellent) return 'excellent';
  if (ratio >= HEALTH_BANDS.good[0]) return 'good';
  if (ratio >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const annualCOGS = clampNonNegative(parseFloat(inputs.annualCOGS) || 0);
  const avgInventory = clampNonNegative(parseFloat(inputs.avgInventory) || 0);
  const periodDays = Math.max(1, parseFloat(inputs.periodDays) || 365);
  const industry = inputs.industry || 'general';

  // Edge: missing or zero inputs → prompt to enter values
  if (annualCOGS === 0 || avgInventory === 0) {
    return [
      '⏰ Inventory Turnover Calculator\n\n' +
        '📊 Enter your annual COGS and average inventory value to see how many times your inventory cycles per year, how many days to sell, and how you compare to your industry benchmark.',
    ];
  }

  const ratio = turnoverRatio(annualCOGS, avgInventory);
  const dts = daysToSell(annualCOGS, avgInventory, periodDays);
  const benchmark = industryBenchmark(industry);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');

  // Health band
  const band = calcHealthBand(ratio);
  const healthEmoji = band === 'excellent' ? '🟢' : band === 'good' ? '🟡' : band === 'warning' ? '🟠' : '🔴';
  const healthLabel =
    band === 'excellent'
      ? 'Excellent — inventory cycles ≥ 6x/year; capital is working efficiently'
      : band === 'good'
      ? 'Good — typical retail range; room to optimize SKU mix'
      : band === 'warning'
      ? 'Warning — slow turn; capital trapped in slow movers'
      : 'Critical — turn < 2x/year; urgent SKU rationalization needed';

  // What-If: COGS -10% (slower sales), +10% (faster sales)
  const cogsDown = annualCOGS * 0.9;
  const cogsUp = annualCOGS * 1.1;
  const ratioDown = cogsDown / avgInventory;
  const ratioUp = cogsUp / avgInventory;
  const dtsDown = periodDays / ratioDown;
  const dtsUp = periodDays / ratioUp;
  const capitalFreedDown = avgInventory - cogsDown / benchmark;
  const capitalFreedUp = avgInventory - cogsUp / benchmark;

  // Break-Even: target inventory for 🟢 (general benchmark 6x)
  const targetInventory = annualCOGS / benchmark;
  const inventoryDelta = avgInventory - targetInventory;
  const inventoryDeltaPct = (inventoryDelta / avgInventory) * 100;

  // Milestone: 12-mo projection if ratio improves by +1
  const ratioPlus1 = ratio + 1;
  const targetInventoryPlus1 = annualCOGS / ratioPlus1;
  const capitalFreedPlus1 = avgInventory - targetInventoryPlus1;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      'Turnover < 2x/year is a red flag. Audit slow-moving SKUs, run clearance promotions on deadstock, and renegotiate supplier minimum order quantities (MOQs). Consider a SKU rationalization pass to cut the bottom 20%.';
  } else if (band === 'warning') {
    tip =
      '2–4x turnover means ~90–180 days of stock on hand. Identify your slowest-moving SKUs (top 20% by days-on-hand) and apply markdown ladders. A 10% COGS reduction through better demand forecasting could push you to the healthy band.';
  } else if (band === 'good') {
    tip =
      '4–6x is solid retail territory. To reach the excellent band, optimize SKU mix by killing bottom-decile performers, tighten reorder points to reduce safety stock, and negotiate faster supplier lead times.';
  } else {
    tip =
      'Excellent turnover — capital is working efficiently. Watch for stockout risk as turnover rises; pair this metric with a stockout cost tracker (P7-3) to ensure fast turn is not buying you lost sales.';
  }

  const r =
    '⏰ Inventory Turnover Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Turnover ratio: ' + ratio.toFixed(2) + 'x/year  ·  Days to sell: ' + dts.toFixed(1) + ' days\n' +
    '• Industry benchmark: ' + industry + ' = ' + benchmark + 'x/year  ·  Your status: ' + (ratio >= benchmark ? 'above benchmark' : 'below benchmark') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Annual COGS:        ' + money(annualCOGS) + '\n' +
    '• Average inventory:  ' + money(avgInventory) + '\n' +
    '• Period:             ' + periodDays + ' days\n' +
    '• Industry:           ' + industry + ' (benchmark ' + benchmark + 'x)\n' +
    '• Turnover ratio:     ' + ratio.toFixed(2) + 'x/year\n' +
    '• Days to sell:       ' + dts.toFixed(1) + ' days\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• COGS −10% (slower sales): turnover = ' + ratioDown.toFixed(2) + 'x · days to sell = ' + dtsDown.toFixed(1) + '\n' +
    '• COGS +10% (faster sales): turnover = ' + ratioUp.toFixed(2) + 'x · days to sell = ' + dtsUp.toFixed(1) + '\n' +
    '• Capital freed (vs benchmark): ' + (capitalFreedDown >= 0 ? '+' : '') + money(capitalFreedDown) + ' at −10%, ' + (capitalFreedUp >= 0 ? '+' : '') + money(capitalFreedUp) + ' at +10%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Target inventory for 🟢: ' + money(targetInventory) + '  (at ' + benchmark + 'x benchmark)\n' +
    '• Current vs target: ' + (inventoryDelta >= 0 ? '+' : '') + money(inventoryDelta) + ' (' + (inventoryDeltaPct >= 0 ? '+' : '') + inventoryDeltaPct.toFixed(1) + '%)\n' +
    '• Action: ' + (inventoryDelta > 0 ? 'reduce inventory by ' + money(inventoryDelta) + ' to hit 🟢' : 'inventory is already below 🟢 target') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Improve ratio by +1: target inventory = ' + money(targetInventoryPlus1) + '\n' +
    '• Capital freed if ratio +1: ' + money(capitalFreedPlus1) + ' (one-time working-capital release)\n' +
    '• 12-mo operating impact: every $1 of inventory reduction = ~$0.15–0.25 of annual carrying-cost savings (use P7-2 to size)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function tr(c,i){if(i<=0)return 0;return c/i;}" +
  "function dts(c,i,p){var r=tr(c,i);if(r<=0)return 0;return p/r;}" +
  "var BM={general:6,apparel:4,electronics:6,grocery:12,furniture:3};" +
  "function bm(ind){return BM[ind]!=null?BM[ind]:6;}" +
  "function band(r){if(r>=6)return 'excellent';if(r>=4)return 'good';if(r>=2)return 'warning';return 'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var cogs=cnn(parseFloat(inputs.annualCOGS)||0);" +
  "var inv=cnn(parseFloat(inputs.avgInventory)||0);" +
  "var pd=Math.max(1,parseFloat(inputs.periodDays)||365);" +
  "var ind=inputs.industry||'general';" +
  "if(cogs===0||inv===0){return['\\u23F0 Inventory Turnover Calculator\\n\\n\\uD83D\\uDCCA Enter your annual COGS and average inventory value to see how many times your inventory cycles per year, how many days to sell, and how you compare to your industry benchmark.'];}" +
  "var r=tr(cogs,inv);" +
  "var d=dts(cogs,inv,pd);" +
  "var b=bm(ind);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "var bd=band(r);" +
  "var he=bd==='excellent'?'\\uD83D\\uDFE2':bd==='good'?'\\uD83D\\uDFE1':bd==='warning'?'\\uD83D\\uDFE0':'\\uD83D\\uDD34';" +
  "var hl=bd==='excellent'?'Excellent \\u2014 inventory cycles \\u2265 6x/year; capital is working efficiently':bd==='good'?'Good \\u2014 typical retail range; room to optimize SKU mix':bd==='warning'?'Warning \\u2014 slow turn; capital trapped in slow movers':'Critical \\u2014 turn < 2x/year; urgent SKU rationalization needed';" +
  "var cogsD=cogs*0.9;var cogsU=cogs*1.1;" +
  "var rD=cogsD/inv;var rU=cogsU/inv;" +
  "var dD=pd/rD;var dU=pd/rU;" +
  "var cfD=inv-cogsD/b;var cfU=inv-cogsU/b;" +
  "var tI=cogs/b;" +
  "var iD=inv-tI;var iDp=(iD/inv)*100;" +
  "var rP1=r+1;var tIP1=cogs/rP1;var cfP1=inv-tIP1;" +
  "var tip='';" +
  "if(bd==='critical'){tip='Turnover < 2x/year is a red flag. Audit slow-moving SKUs, run clearance promotions on deadstock, and renegotiate supplier minimum order quantities (MOQs). Consider a SKU rationalization pass to cut the bottom 20%.';}" +
  "else if(bd==='warning'){tip='2\\u20134x turnover means ~90\\u2013180 days of stock on hand. Identify your slowest-moving SKUs (top 20% by days-on-hand) and apply markdown ladders. A 10% COGS reduction through better demand forecasting could push you to the healthy band.';}" +
  "else if(bd==='good'){tip='4\\u20136x is solid retail territory. To reach the excellent band, optimize SKU mix by killing bottom-decile performers, tighten reorder points to reduce safety stock, and negotiate faster supplier lead times.';}" +
  "else{tip='Excellent turnover \\u2014 capital is working efficiently. Watch for stockout risk as turnover rises; pair this metric with a stockout cost tracker (P7-3) to ensure fast turn is not buying you lost sales.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Inventory Turnover Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Turnover ratio: '+r.toFixed(2)+'x/year  \\u00B7  Days to sell: '+d.toFixed(1)+' days\\n';" +
  "r2+='\\u2022 Industry benchmark: '+ind+' = '+b+'x/year  \\u00B7  Your status: '+(r>=b?'above benchmark':'below benchmark')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Annual COGS:        '+money(cogs)+'\\n';" +
  "r2+='\\u2022 Average inventory:  '+money(inv)+'\\n';" +
  "r2+='\\u2022 Period:             '+pd+' days\\n';" +
  "r2+='\\u2022 Industry:           '+ind+' (benchmark '+b+'x)\\n';" +
  "r2+='\\u2022 Turnover ratio:     '+r.toFixed(2)+'x/year\\n';" +
  "r2+='\\u2022 Days to sell:       '+d.toFixed(1)+' days\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 COGS \\u221210% (slower sales): turnover = '+rD.toFixed(2)+'x \\u00B7 days to sell = '+dD.toFixed(1)+'\\n';" +
  "r2+='\\u2022 COGS +10% (faster sales): turnover = '+rU.toFixed(2)+'x \\u00B7 days to sell = '+dU.toFixed(1)+'\\n';" +
  "r2+='\\u2022 Capital freed (vs benchmark): '+(cfD>=0?'+':'')+money(cfD)+' at \\u221210%, '+(cfU>=0?'+':'')+money(cfU)+' at +10%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Target inventory for \\uD83D\\uDFE2: '+money(tI)+'  (at '+b+'x benchmark)\\n';" +
  "r2+='\\u2022 Current vs target: '+(iD>=0?'+':'')+money(iD)+' ('+(iDp>=0?'+':'')+iDp.toFixed(1)+'%)\\n';" +
  "r2+='\\u2022 Action: '+(iD>0?'reduce inventory by '+money(iD)+' to hit \\uD83D\\uDFE2':'inventory is already below \\uD83D\\uDFE2 target')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Improve ratio by +1: target inventory = '+money(tIP1)+'\\n';" +
  "r2+='\\u2022 Capital freed if ratio +1: '+money(cfP1)+' (one-time working-capital release)\\n';" +
  "r2+='\\u2022 12-mo operating impact: every $1 of inventory reduction = ~$0.15\\u20130.25 of annual carrying-cost savings (use P7-2 to size)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-inventory-turnover-calculator',
  title: 'Inventory Turnover Calculator',
  description:
    'Measure how many times per year your inventory cycles (COGS / avg inventory) and how many days to sell. The fundamental inventory health metric for Shopify, Amazon FBA, and DTC brands. Industry benchmarks: 🟢 ≥6x · 🟡 4–6x · 🟠 2–4x · 🔴 <2x.',
  categoryId: 'O',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'annualCOGS', label: 'Annual Cost of Goods Sold (COGS)', placeholder: 'e.g. 240000', type: 'number' },
    { name: 'avgInventory', label: 'Average Inventory Value', placeholder: 'e.g. 40000', type: 'number' },
    { name: 'periodDays', label: 'Period (days)', placeholder: 'e.g. 365', type: 'number' },
    {
      name: 'industry',
      label: 'Industry benchmark',
      placeholder: '',
      type: 'select',
      options: ['general', 'apparel', 'electronics', 'grocery', 'furniture'],
    },
  ],
  keywords: [
    'inventory turnover calculator',
    'days to sell',
    'COGS ratio',
    'inventory health',
    'stock turn',
    'inventory cycle',
    'Shopify inventory',
    'Amazon FBA metrics',
    'DTC inventory',
    'working capital',
  ],
  tags: ['operations', 'inventory', 'turnover', 'cogs'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.investopedia.com/terms/i/inventory-turnover.asp',
    'https://www.shopify.com/blog/inventory-turnover-ratio',
    'https://corporatefinanceinstitute.com/resources/accounting/inventory-turnover/',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['⏰ Inventory Turnover Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Excellent — inventory cycles ≥ 6x/year; capital is working efficiently\n• Turnover ratio: 6.00x/year  ·  Days to sell: 60.8 days\n• Industry benchmark: general = 6x/year  ·  Your status: above benchmark\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Annual COGS:        $240,000\n• Average inventory:  $40,000\n• Period:             365 days\n• Industry:           general (benchmark 6x)\n• Turnover ratio:     6.00x/year\n• Days to sell:       60.8 days\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• COGS −10% (slower sales): turnover = 5.40x · days to sell = 67.6\n• COGS +10% (faster sales): turnover = 6.60x · days to sell = 55.3\n• Capital freed (vs benchmark): +$4,000 at −10%, $-4,000 at +10%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Target inventory for 🟢: $40,000  (at 6x benchmark)\n• Current vs target: +$0 (+0.0%)\n• Action: inventory is already below 🟢 target\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Improve ratio by +1: target inventory = $34,286\n• Capital freed if ratio +1: $5,714 (one-time working-capital release)\n• 12-mo operating impact: every $1 of inventory reduction = ~$0.15–0.25 of annual carrying-cost savings (use P7-2 to size)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Excellent turnover — capital is working efficiently. Watch for stockout risk as turnover rises; pair this metric with a stockout cost tracker (P7-3) to ensure fast turn is not buying you lost sales.\n'],
  faq: [
    { q: 'What is a good inventory turnover ratio?', a: 'For general retail, 6x/year is the healthy baseline. Apparel is typically 4x (seasonal), grocery 12x (perishable, fast-moving), and furniture 3x (high-ticket, slow). Anything below 4x signals capital trapped in slow movers; below 2x is critical and demands SKU rationalization.' },
    { q: 'How do I calculate days to sell inventory?', a: 'Days to sell = period days / turnover ratio. With 240k COGS, 40k avg inventory, and 365-day period: 365 / (240k/40k) = 60.8 days. Industry-specific benchmarks vary — grocery may target 30 days, furniture 120 days.' },
    { q: 'Should I optimize for higher turnover?', a: 'Higher turnover is generally better (capital not trapped), but watch for stockout risk as turnover rises. Pair this metric with a stockout cost tracker and reorder point calculator to ensure fast turn is not buying you lost sales.' },
    { q: 'How does this differ for service businesses with inventory?', a: 'Agencies holding hardware SKU, course creators with merch, or SaaS with physical goods use the same math. The "general" benchmark (6x) applies; service-only businesses with no inventory should skip this calculator.' },
  ],
  howToUse: [
    'Enter your annual Cost of Goods Sold (COGS) — total cost to produce or buy what you sold in the year.',
    'Enter your average inventory value (often calculated as (beginning inventory + ending inventory) / 2).',
    'Adjust the period (default 365 days for annual; use 90 for quarterly tracking).',
    'Pick your industry benchmark for context-aware health bands.',
    'Read the turnover ratio and days-to-sell, then use What-If to model +10% sales or -10% slower sales.',
  ],
  engineKey: true,
};
registerEngine(engine);