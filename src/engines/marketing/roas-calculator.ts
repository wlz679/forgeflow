import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// ROAS Calculator (P6-1) — Business v3 standard (6+ emoji sections)
// =====================================================================
//
// Gross ROAS = revenue / adSpend. Net profit margin-aware ROAS includes
// gross margin to show true profitability after cost of goods / fulfillment.
// Health bands: 🟢 ≥4.0x · 🟡 2.0-4.0x · 🟠 1.0-2.0x · 🔴 <1.0x
//
// attributionWindow kept as input for future extensibility (Meta's default
// is 7d click; Google Ads default 28d click; some teams run 90d for high-AOV).
// It does not currently modify the ROAS ratio but documents the assumption.

// ============== Health band constants (per-file, exported for tests) ==============

export const HEALTH_BANDS = {
  excellent: 4.0,
  good: [2.0, 4.0],
  warning: [1.0, 2.0],
  critical: 0,
} as const;

// ============== Math helpers (exported for tests) ==============

/** Gross ROAS = revenue / adSpend. Returns Infinity when adSpend = 0. */
export function calcROAS(adSpend: number, revenue: number): number {
  if (adSpend <= 0) return Infinity;
  return revenue / adSpend;
}

/** Net ROAS as percent: ((revenue × margin%) − adSpend) / adSpend × 100. */
export function calcNetROAS(adSpend: number, revenue: number, grossMargin: number): number {
  if (adSpend <= 0) return Infinity;
  return ((revenue * (grossMargin / 100)) - adSpend) / adSpend * 100;
}

/** Net profit ($) = revenue × margin% − adSpend. */
export function calcNetProfit(adSpend: number, revenue: number, grossMargin: number): number {
  return revenue * (grossMargin / 100) - adSpend;
}

/** Effective cost-per-$1000-revenue: (adSpend / revenue) × 1000. */
export function effectiveCPMPer1000(adSpend: number, revenue: number): number {
  if (revenue <= 0) return Infinity;
  return (adSpend / revenue) * 1000;
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const adSpend = clampNonNegative(parseFloat(inputs.adSpend) || 0);
  const revenue = clampNonNegative(parseFloat(inputs.revenue) || 0);
  const grossMargin = clampNonNegative(parseFloat(inputs.grossMargin) || 0);
  const attributionWindow = inputs.attributionWindow || '28d';

  // Edge: ad spend = 0 → prompt to enter value
  if (adSpend === 0) {
    return [
      '⏰ ROAS Calculator\n\n' +
        '📊 Enter ad spend and revenue to see your return on ad spend ratio (ROAS), net profit margin after ad costs, and projected scaling outcomes.',
    ];
  }

  const roas = calcROAS(adSpend, revenue);
  const netROAS = calcNetROAS(adSpend, revenue, grossMargin);
  const netProfit = calcNetProfit(adSpend, revenue, grossMargin);
  const cpm = effectiveCPMPer1000(adSpend, revenue);

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const money2 = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });

  // Health band (gross ROAS)
  let healthEmoji: string;
  let healthLabel: string;
  if (roas >= HEALTH_BANDS.excellent) {
    healthEmoji = '🟢';
    healthLabel = 'Excellent — ROAS ≥ 4.0x; profitable and scalable';
  } else if (roas >= HEALTH_BANDS.good[0]) {
    healthEmoji = '🟡';
    healthLabel = 'Good — ROAS 2.0–4.0x; profitable with room to optimize';
  } else if (roas >= HEALTH_BANDS.warning[0]) {
    healthEmoji = '🟠';
    healthLabel = 'Warning — ROAS 1.0–2.0x; breaking even on revenue; margin is critical';
  } else {
    healthEmoji = '🔴';
    healthLabel = 'Critical — ROAS < 1.0x; losing money per ad dollar';
  }

  // What-If: +20% revenue · −20% spend · both
  const revUp = revenue * 1.2;
  const spendDown = adSpend * 0.8;
  const roasRevUp = revUp / adSpend;
  const roasSpendDown = revenue / spendDown;
  const roasBoth = revUp / spendDown;
  const netProfitRevUp = revUp * (grossMargin / 100) - adSpend;
  const netProfitSpendDown = revenue * (grossMargin / 100) - spendDown;

  // Break-Even: revenue needed at current margin so net profit = 0
  // revenue * (margin/100) = adSpend  →  revenue = adSpend / (margin/100)
  const breakevenRevenue = grossMargin > 0 ? adSpend / (grossMargin / 100) : adSpend;
  const breakevenROAS = breakevenRevenue / adSpend;
  const revIncreaseNeeded = revenue > 0 ? ((breakevenRevenue - revenue) / revenue) * 100 : 0;

  // Milestone: scaling 2x at same ratio
  const scale2xRevenue = revenue * 2;
  const scale2xSpend = adSpend * 2;
  const scale2xProfit = scale2xRevenue * (grossMargin / 100) - scale2xSpend;
  // 12-month projection
  const annualRevenue = revenue * 12;
  const annualNetProfit = netProfit * 12;

  // Tip: band-driven contextual advice
  let tip: string;
  if (roas < 1.0) {
    tip =
      'You are losing money per ad dollar. Audit creatives, audience targeting, and channel mix immediately. Pause and re-launch with a $500–$1,000 test budget to find winning combinations before scaling further.';
  } else if (roas >= HEALTH_BANDS.excellent) {
    tip =
      'Excellent ROAS. Scale confidently — increase budget 2–3x and expand to lookalike audiences or adjacent channels (Meta if on Google, TikTok if on Meta, etc.). Maintain creative refresh cadence to avoid audience fatigue.';
  } else if (roas >= HEALTH_BANDS.good[0]) {
    tip =
      'Profitable but suboptimal. Test new creatives, audience segments, and landing pages. A 30% conversion-rate improvement could push ROAS from 3.0x to 3.9x at same spend.';
  } else {
    // 1.0-2.0 range
    if (grossMargin < 50) {
      tip =
        'ROAS is in the warning band with thin margin. Either improve margin (pricing, COGS, packaging) or improve funnel CTR/CVR — you need both to safely leave this band.';
    } else {
      tip =
        'In the 1.0–2.0x warning band. Audit the funnel (CTR → CVR) — a 30–50% improvement is typical after re-targeting and landing page testing. Verify attribution window (' +
        attributionWindow +
        ') matches your consideration cycle.';
    }
  }

  const r =
    '⏰ ROAS Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Gross ROAS: ' + roas.toFixed(2) + 'x  ·  Net profit margin: ' + netROAS.toFixed(1) + '%\n' +
    '• Attribution: ' + attributionWindow + '  ·  Effective cost per $1K revenue: ' + money2(cpm) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Ad spend:     ' + money(adSpend) + '\n' +
    '• Revenue:      ' + money(revenue) + '\n' +
    '• Gross margin: ' + grossMargin.toFixed(1) + '%\n' +
    '• Net profit:   ' + money(netProfit) + '  (after ad cost)\n' +
    '• Attribution:  ' + attributionWindow + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• +20% revenue: ROAS = ' + roasRevUp.toFixed(2) + 'x · net profit = ' + money(netProfitRevUp) + '\n' +
    '• −20% spend:   ROAS = ' + roasSpendDown.toFixed(2) + 'x · net profit = ' + money(netProfitSpendDown) + '\n' +
    '• Both:         ROAS = ' + roasBoth.toFixed(2) + 'x (compound gain)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Break-even revenue: ' + money(breakevenRevenue) + '  (at ' + grossMargin.toFixed(0) + '% margin → ROAS = ' + breakevenROAS.toFixed(2) + 'x)\n' +
    '• Revenue lift needed: ' + revIncreaseNeeded.toFixed(1) + '% to break even on net profit\n' +
    '• Or raise gross margin to ' + ((adSpend / revenue) * 100).toFixed(1) + '% on current revenue to break even\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Scale 2x at current ratio: revenue = ' + money(scale2xRevenue) + ' · profit = ' + money(scale2xProfit) + '/period\n' +
    '• 12-month projection:        revenue = ' + money(annualRevenue) + ' · net profit = ' + money(annualNetProfit) + '\n' +
    '• (Assumes constant ratio — actual scaling often degrades 10–30% as audience saturates)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function cROAS(s,r){if(s<=0)return Infinity;return r/s;}" +
  "function cNetROAS(s,r,m){if(s<=0)return Infinity;return((r*(m/100))-s)/s*100;}" +
  "function cNetProf(s,r,m){return r*(m/100)-s;}" +
  "function ecpm(s,r){if(r<=0)return Infinity;return(s/r)*1000;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var as=cnn(parseFloat(inputs.adSpend)||0);" +
  "var rev=cnn(parseFloat(inputs.revenue)||0);" +
  "var gm=cnn(parseFloat(inputs.grossMargin)||0);" +
  "var aw=inputs.attributionWindow||'28d';" +
  "if(as===0){return['\\u23F0 ROAS Calculator\\n\\n\\uD83D\\uDCCA Enter ad spend and revenue to see your return on ad spend ratio (ROAS), net profit margin after ad costs, and projected scaling outcomes.'];}" +
  "var roas=cROAS(as,rev);" +
  "var nr=cNetROAS(as,rev,gm);" +
  "var np=cNetProf(as,rev,gm);" +
  "var cpmV=ecpm(as,rev);" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function money2(n){return '$'+n.toLocaleString('en-US',{maximumFractionDigits:2});}" +
  "var he='',hl='';" +
  "if(roas>=4){he='\\uD83D\\uDFE2';hl='Excellent \\u2014 ROAS \\u2265 4.0x; profitable and scalable';}" +
  "else if(roas>=2){he='\\uD83D\\uDFE1';hl='Good \\u2014 ROAS 2.0\\u20134.0x; profitable with room to optimize';}" +
  "else if(roas>=1){he='\\uD83D\\uDFE0';hl='Warning \\u2014 ROAS 1.0\\u20132.0x; breaking even on revenue; margin is critical';}" +
  "else{he='\\uD83D\\uDD34';hl='Critical \\u2014 ROAS < 1.0x; losing money per ad dollar';}" +
  "var ru=rev*1.2,sd=as*0.8;" +
  "var rU=ru/as,rSD=rev/sd,rB=ru/sd;" +
  "var npRU=ru*(gm/100)-as;var npSD=rev*(gm/100)-sd;" +
  "var beR=gm>0?as/(gm/100):as;var beROAS=beR/as;" +
  "var rinc=rev>0?((beR-rev)/rev)*100:0;" +
  "var s2rev=rev*2;var s2sp=as*2;var s2pf=s2rev*(gm/100)-s2sp;" +
  "var annR=rev*12;var annNP=np*12;" +
  "var tip='';" +
  "if(roas<1){tip='You are losing money per ad dollar. Audit creatives, audience targeting, and channel mix immediately. Pause and re-launch with a $500\\u2013$1,000 test budget to find winning combinations before scaling further.';}" +
  "else if(roas>=4){tip='Excellent ROAS. Scale confidently \\u2014 increase budget 2\\u20133x and expand to lookalike audiences or adjacent channels (Meta if on Google, TikTok if on Meta, etc.). Maintain creative refresh cadence to avoid audience fatigue.';}" +
  "else if(roas>=2){tip='Profitable but suboptimal. Test new creatives, audience segments, and landing pages. A 30% conversion-rate improvement could push ROAS from 3.0x to 3.9x at same spend.';}" +
  "else{if(gm<50){tip='ROAS is in the warning band with thin margin. Either improve margin (pricing, COGS, packaging) or improve funnel CTR/CVR \\u2014 you need both to safely leave this band.';}else{tip='In the 1.0\\u20132.0x warning band. Audit the funnel (CTR \\u2192 CVR) \\u2014 a 30\\u201350% improvement is typical after re-targeting and landing page testing. Verify attribution window ('+aw+') matches your consideration cycle.';}}" +
  "var r2='';" +
  "r2+='\\u23F0 ROAS Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+he+' '+hl+'\\n';" +
  "r2+='\\u2022 Gross ROAS: '+roas.toFixed(2)+'x  \\u00B7  Net profit margin: '+nr.toFixed(1)+'%\\n';" +
  "r2+='\\u2022 Attribution: '+aw+'  \\u00B7  Effective cost per $1K revenue: '+money2(cpmV)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Ad spend:     '+money(as)+'\\n';" +
  "r2+='\\u2022 Revenue:      '+money(rev)+'\\n';" +
  "r2+='\\u2022 Gross margin: '+gm.toFixed(1)+'%\\n';" +
  "r2+='\\u2022 Net profit:   '+money(np)+'  (after ad cost)\\n';" +
  "r2+='\\u2022 Attribution:  '+aw+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 +20% revenue: ROAS = '+rU.toFixed(2)+'x \\u00B7 net profit = '+money(npRU)+'\\n';" +
  "r2+='\\u2022 \\u221220% spend:   ROAS = '+rSD.toFixed(2)+'x \\u00B7 net profit = '+money(npSD)+'\\n';" +
  "r2+='\\u2022 Both:         ROAS = '+rB.toFixed(2)+'x (compound gain)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Break-even revenue: '+money(beR)+'  (at '+gm.toFixed(0)+'% margin \\u2192 ROAS = '+beROAS.toFixed(2)+'x)\\n';" +
  "r2+='\\u2022 Revenue lift needed: '+rinc.toFixed(1)+'% to break even on net profit\\n';" +
  "r2+='\\u2022 Or raise gross margin to '+((as/rev)*100).toFixed(1)+'% on current revenue to break even\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Scale 2x at current ratio: revenue = '+money(s2rev)+' \\u00B7 profit = '+money(s2pf)+'/period\\n';" +
  "r2+='\\u2022 12-month projection:        revenue = '+money(annR)+' \\u00B7 net profit = '+money(annNP)+'\\n';" +
  "r2+='\\u2022 (Assumes constant ratio \\u2014 actual scaling often degrades 10\\u201330% as audience saturates)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-roas-calculator',
  title: 'ROAS Calculator',
  description:
    'Calculate Return on Ad Spend (ROAS) with margin-aware net profit. See health bands, what-if scenarios (revenue +20% / spend -20%), break-even revenue, and 2x scaling projections. Industry benchmarks: 🟢 ≥4.0x · 🟡 2.0–4.0x · 🟠 1.0–2.0x · 🔴 <1.0x.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'adSpend', label: 'Ad Spend ($)', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'revenue', label: 'Revenue Generated ($)', placeholder: 'e.g. 20000', type: 'number' },
    { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 60', type: 'number' },
    {
      name: 'attributionWindow',
      label: 'Attribution Window',
      placeholder: '',
      type: 'select',
      options: ['7d', '14d', '28d', '90d'],
    },
  ],
  keywords: [
    'ROAS calculator',
    'return on ad spend',
    'ROAS',
    'ad spend ROI',
    'marketing ROI',
    'ROAS benchmark',
    'gross ROAS',
    'net ROAS',
    'solopreneur marketing',
    'performance marketing',
  ],
  tags: ['marketing', 'roas', 'roi'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-04',
  sources: [
    'https://www.meta.com/business/help/430291176997522/',
    'https://support.google.com/google-ads/answer/14090053',
    'https://blog.hubspot.com/marketing/roas',
    'https://www.shopify.com/blog/roas',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: [
    '⏰ ROAS Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Excellent — ROAS ≥ 4.0x; profitable and scalable\n• Gross ROAS: 4.00x  ·  Net profit margin: 140.0%\n• Attribution: 28d  ·  Effective cost per $1K revenue: $250\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Ad spend:     $5,000\n• Revenue:      $20,000\n• Gross margin: 60.0%\n• Net profit:   $7,000  (after ad cost)\n• Attribution:  28d\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• +20% revenue: ROAS = 4.80x · net profit = $9,400\n• −20% spend:   ROAS = 5.00x · net profit = $8,000\n• Both:         ROAS = 6.00x (compound gain)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Break-even revenue: $8,333  (at 60% margin → ROAS = 1.67x)\n• Revenue lift needed: -58.3% to break even on net profit\n• Or raise gross margin to 25.0% on current revenue to break even\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Scale 2x at current ratio: revenue = $40,000 · profit = $14,000/period\n• 12-month projection:        revenue = $240,000 · net profit = $84,000\n• (Assumes constant ratio — actual scaling often degrades 10–30% as audience saturates)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Excellent ROAS. Scale confidently — increase budget 2–3x and expand to lookalike audiences or adjacent channels (Meta if on Google, TikTok if on Meta, etc.). Maintain creative refresh cadence to avoid audience fatigue.\n',
  ],
  faq: [
    { q: 'What is a good ROAS?', a: 'A "good" ROAS depends on your gross margin. At 50% margin, ROAS ≥ 2.0x is break-even; ROAS ≥ 3.0x is comfortably profitable. At 70% margin, ROAS ≥ 1.5x is break-even. Most solopreneurs target 4.0x+ for sustainable scaling.' },
    { q: 'How does gross margin affect ROAS interpretation?', a: 'A 5x gross ROAS at 30% margin (1.5x net) is worse than 3x gross ROAS at 80% margin (2.4x net). Always evaluate ROAS alongside gross margin to know your real profitability per ad dollar.' },
    { q: 'What attribution window should I use?', a: 'Use 7d for impulse purchases, 28d (industry default) for mid-ticket, and 90d for high-AOV considered purchases. Mismatched windows cause ROAS to appear inflated or deflated versus true conversions.' },
    { q: 'Does ROAS include COGS or just ad cost?', a: 'Gross ROAS only factors ad cost. Net ROAS (margin-adjusted, shown here) subtracts both ad cost AND gross margin from revenue to reveal true profit per ad dollar. Always look at both.' },
  ],
  howToUse: [
    'Enter your total ad spend over the period (e.g., 30 days).',
    'Enter the revenue attributed to that ad spend within your attribution window.',
    'Enter your gross margin % (revenue minus COGS divided by revenue, expressed as %).',
    'Pick an attribution window that matches your product consideration time.',
    'Compare the health band to your target ROAS; use the What-If scenarios to model improvements.',
  ],
};

registerEngine(engine);
