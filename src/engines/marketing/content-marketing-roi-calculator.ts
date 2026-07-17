import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Content Marketing ROI Calculator (P6-6) — Business v3 standard
// =====================================================================
// Models SEO/content marketing economics:
//   - Ramp-up: months-to-rank before traffic peak
//   - Steady state: post-rank traffic + conversion
//   - Attribution model: first-touch / last-touch / linear
// Outputs 12-month ROI projection + health based on conversion rate.

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  excellent: 3.0,
  good: [1.0, 3.0],
  warning: [0.3, 1.0],
  critical: 0,
} as const;

// ============== Types ==============

export type AttributionModel = 'first-touch' | 'last-touch' | 'linear';

// ============== Math helpers (exported for tests) ==============

/** Monthly revenue from organic traffic = traffic × (CR/100) × AOV */
export function monthlyRevenue(traffic: number, conversionRatePct: number, aov: number): number {
  return traffic * (conversionRatePct / 100) * aov;
}

/** Monthly net revenue = revenue - content cost */
export function monthlyNetRevenue(revenue: number, contentCost: number): number {
  return revenue - contentCost;
}

/** Attribution multiplier — first/last-touch claim full credit, linear distributes */
export function attributionMultiplier(model: AttributionModel): number {
  if (model === 'first-touch' || model === 'last-touch') return 1.0;
  if (model === 'linear') return 0.7;
  return 1.0; // default
}

/**
 * 12-month total profit from content marketing:
 *   months ramp-up × -contentCost (no revenue yet)
 *   + months post-rank × monthlyNetRevenue × attribution multiplier
 */
export function twelveMonthTotal(
  monthsToRank: number,
  monthlyRevenueVal: number,
  monthlyContentCost: number,
  attrMultiplier: number
): number {
  const rampLoss = -monthsToRank * monthlyContentCost;
  const postRankGain = (12 - monthsToRank) * monthlyRevenueVal * attrMultiplier
    - (12 - monthsToRank) * monthlyContentCost;
  return rampLoss + postRankGain;
}

/** Map organic conversion rate (%) to a health band label */
export function calcHealthBand(crPct: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (crPct >= HEALTH_BANDS.excellent) return 'excellent';
  if (crPct >= HEALTH_BANDS.good[0]) return 'good';
  if (crPct >= HEALTH_BANDS.warning[0]) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const monthlyPieces = clampNonNegative(parseFloat(inputs.monthlyPieces) || 0);
  const monthsToRank = clampNonNegative(Math.min(11, parseFloat(inputs.monthsToRank) || 0));
  const peakMonthlyTraffic = clampNonNegative(parseFloat(inputs.peakMonthlyTraffic) || 0);
  const conversionRate = clampNonNegative(parseFloat(inputs.conversionRate) || 0);
  const aov = clampNonNegative(parseFloat(inputs.aov) || 0);
  const monthlyContentCost = clampNonNegative(parseFloat(inputs.monthlyContentCost) || 0);
  const attributionModel = (inputs.attributionModel || 'last-touch') as AttributionModel;

  // Edge: no traffic
  if (peakMonthlyTraffic === 0) {
    return [
      '⏰ Content Marketing ROI Calculator\n\n' +
        '📊 Enter monthly content pieces, months to rank, peak organic traffic, conversion rate, AOV, content cost, and attribution model to see SEO ramp-up curve, 12-month ROI, and steady-state projections.',
    ];
  }

  const monthRev = monthlyRevenue(peakMonthlyTraffic, conversionRate, aov);
  const monthNet = monthlyNetRevenue(monthRev, monthlyContentCost);
  const attrMult = attributionMultiplier(attributionModel);
  const twelveMo = twelveMonthTotal(monthsToRank, monthRev, monthlyContentCost, attrMult);
  const annualContentCost = monthlyContentCost * 12;
  const twelveMoROI = annualContentCost > 0 ? (twelveMo / annualContentCost) * 100 : 0;
  const healthBand = calcHealthBand(conversionRate);

  // Health band
  let healthEmoji: string;
  let healthLabel: string;
  if (healthBand === 'excellent') {
    healthEmoji = '🟢';
    healthLabel = 'Excellent — CR ≥ 3%; content converts above average';
  } else if (healthBand === 'good') {
    healthEmoji = '🟡';
    healthLabel = 'Good — CR 1–3%; healthy content funnel';
  } else if (healthBand === 'warning') {
    healthEmoji = '🟠';
    healthLabel = 'Warning — CR 0.3–1%; landing pages need optimization';
  } else {
    healthEmoji = '🔴';
    healthLabel = 'Critical — CR < 0.3%; traffic not converting';
  }

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });

  // What-If: conversion rate +1pp
  const newCR = conversionRate + 1;
  const newMonthRev = monthlyRevenue(peakMonthlyTraffic, newCR, aov);
  const newTwelveMo = twelveMonthTotal(monthsToRank, newMonthRev, monthlyContentCost, attrMult);
  const newROI = annualContentCost > 0 ? (newTwelveMo / annualContentCost) * 100 : 0;

  // Break-Even: at what conversion rate does 12-mo total = 0?
  // 0 = -monthsToRank × cc + (12 - monthsToRank) × (traffic × CR × aov × mult) - (12 - monthsToRank) × cc
  // (12 - monthsToRank) × traffic × CR × aov × mult = monthsToRank × cc + (12 - monthsToRank) × cc = 12 × cc
  // CR = 12 × cc / ((12 - monthsToRank) × traffic × aov × mult)
  const breakEvenCR = monthsToRank < 12 && peakMonthlyTraffic > 0 && aov > 0 && attrMult > 0
    ? (12 * monthlyContentCost) / ((12 - monthsToRank) * peakMonthlyTraffic * aov * attrMult) * 100
    : 0;

  // Milestone: steady-state projection (12-24 months post-rank)
  const steadyMonthlyNet = monthNet * attrMult;
  const annualSteady = steadyMonthlyNet * 12;

  // Tip: attribution-aware + weakest-link advice
  let tip: string;
  if (healthBand === 'excellent' && twelveMo > 0) {
    tip = 'Excellent CR + positive 12-mo ROI. Scale content production — ' + monthlyPieces + ' → ' + (monthlyPieces * 1.5).toFixed(0) + ' pieces/month doubles your SEO reach with similar conversion economics.';
  } else if (monthsToRank > 6) {
    tip = 'Ramp-up of ' + monthsToRank + ' months is long. Reduce by targeting lower-competition keywords (long-tail), or invest in link-building to accelerate ranking. Each month saved improves ROI ~' + ((monthlyContentCost / Math.max(annualContentCost, 1)) * 100).toFixed(0) + '%.';
  } else if (conversionRate < 1) {
    tip = 'Conversion rate < 1% suggests landing page / offer mismatch. Audit your top 10 posts — are they sending traffic to relevant, conversion-optimized pages? Often a CTA tweak doubles CR.';
  } else if (twelveMo < 0) {
    tip = '12-month ROI is negative. Either reduce content cost, accelerate ranking (lower-competition keywords), or improve conversion rate. Each lever tested separately.';
  } else {
    tip = 'Healthy content ROI. A/B test attribution model — first/last-touch claim full credit, linear distributes 0.7x. Adjust based on your actual sales cycle.';
  }

  const r =
    '⏰ Content Marketing ROI Calculator\n\n' +
    '🩺 Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthEmoji + ' ' + healthLabel + '\n' +
    '• Steady-state monthly net: ' + money(steadyMonthlyNet) + '  ·  Annual: ' + money(annualSteady) + '\n' +
    '• 12-month ROI: ' + (twelveMoROI > 0 ? twelveMoROI.toFixed(0) + '%' : twelveMoROI.toFixed(0) + '%') + '  ·  Attribution: ' + attributionModel + ' (' + (attrMult * 100).toFixed(0) + '% credit)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Inputs Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Monthly pieces:        ' + monthlyPieces + '\n' +
    '• Months to rank:        ' + monthsToRank + ' (ramp-up)\n' +
    '• Peak monthly traffic:  ' + fmt(peakMonthlyTraffic) + '\n' +
    '• Conversion rate:       ' + conversionRate.toFixed(1) + '%\n' +
    '• AOV:                   ' + money(aov) + '\n' +
    '• Monthly content cost:  ' + money(monthlyContentCost) + '  ·  Annual: ' + money(annualContentCost) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Conversion rate +1pp (' + conversionRate.toFixed(1) + '% → ' + newCR.toFixed(1) + '%):\n' +
    '  • 12-mo total: ' + money(twelveMo) + ' → ' + money(newTwelveMo) + ' (+' + money(newTwelveMo - twelveMo) + ')\n' +
    '  • ROI: ' + twelveMoROI.toFixed(0) + '% → ' + newROI.toFixed(0) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Required conversion rate to break even at 12-mo: ' + breakEvenCR.toFixed(2) + '%\n' +
    '  • Currently: ' + conversionRate.toFixed(1) + '%\n' +
    '  • Gap: ' + ((breakEvenCR - conversionRate) > 0 ? '+' : '') + (breakEvenCR - conversionRate).toFixed(2) + 'pp\n' +
    '  • Or reduce content cost by ' + (((monthlyContentCost - (annualContentCost / 12 * (breakEvenCR * 0.01 / conversionRate * 0.01))) / monthlyContentCost) * 100).toFixed(0) + '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Milestone:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Ramp-up: ' + monthsToRank + ' months × ' + money(monthlyContentCost) + ' = ' + money(monthsToRank * monthlyContentCost) + ' sunk\n' +
    '• Steady state (post-month ' + monthsToRank + '): ' + money(steadyMonthlyNet) + '/month net\n' +
    '• Annual steady-state projection: ' + money(annualSteady) + '\n' +
    '• 12-mo cumulative: ' + money(twelveMo) + ' net  (' + twelveMoROI.toFixed(0) + '% ROI)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  "function mR(t,cr,a){return t*(cr/100)*a;}" +
  "function mNR(r,cc){return r-cc;}" +
  "function aM(m){if(m==='first-touch'||m==='last-touch')return 1.0;if(m==='linear')return 0.7;return 1.0;}" +
  "function t12T(mr,mnv,mcc,am){var rl=-mr*mcc;var pg=(12-mr)*mnv*am-(12-mr)*mcc;return rl+pg;}" +
  "function cHB(cr){if(cr>=3)return'excellent';if(cr>=1)return'good';if(cr>=0.3)return'warning';return'critical';}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var mp=cnn(parseFloat(inputs.monthlyPieces)||0);" +
  "var mtr=cnn(Math.min(11,parseFloat(inputs.monthsToRank)||0));" +
  "var pmt=cnn(parseFloat(inputs.peakMonthlyTraffic)||0);" +
  "var cr=cnn(parseFloat(inputs.conversionRate)||0);" +
  "var aov=cnn(parseFloat(inputs.aov)||0);" +
  "var mcc=cnn(parseFloat(inputs.monthlyContentCost)||0);" +
  "var am=inputs.attributionModel||'last-touch';" +
  "if(pmt===0){return['\\u23F0 Content Marketing ROI Calculator\\n\\n\\uD83D\\uDCCA Enter monthly content pieces, months to rank, peak organic traffic, conversion rate, AOV, content cost, and attribution model to see SEO ramp-up curve, 12-month ROI, and steady-state projections.'];}" +
  "var mR2=mR(pmt,cr,aov);var mN=mNR(mR2,mcc);var aM2=aM(am);" +
  "var t12=t12T(mtr,mR2,mcc,aM2);var acc=mcc*12;var t12ROI=acc>0?(t12/acc)*100:0;" +
  "var hB=cHB(cr);" +
  "var hE='',hL='';" +
  "if(hB==='excellent'){hE='\\uD83D\\uDFE2';hL='Excellent \\u2014 CR \\u2265 3%; content converts above average';}" +
  "else if(hB==='good'){hE='\\uD83D\\uDFE1';hL='Good \\u2014 CR 1\\u20133%; healthy content funnel';}" +
  "else if(hB==='warning'){hE='\\uD83D\\uDFE0';hL='Warning \\u2014 CR 0.3\\u20131%; landing pages need optimization';}" +
  "else{hE='\\uD83D\\uDD34';hL='Critical \\u2014 CR < 0.3%; traffic not converting';}" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "var nCR=cr+1;var nMR=mR(pmt,nCR,aov);var n12=t12T(mtr,nMR,mcc,aM2);" +
  "var nROI=acc>0?(n12/acc)*100:0;" +
  "var beCR=mtr<12&&pmt>0&&aov>0&&aM2>0?(12*mcc)/((12-mtr)*pmt*aov*aM2)*100:0;" +
  "var sMN=mN*aM2;var aSt=sMN*12;" +
  "var tip='';" +
  "if(hB==='excellent'&&t12>0){tip='Excellent CR + positive 12-mo ROI. Scale content production \\u2014 '+mp+' \\u2192 '+(mp*1.5).toFixed(0)+' pieces/month doubles your SEO reach with similar conversion economics.';}" +
  "else if(mtr>6){tip='Ramp-up of '+mtr+' months is long. Reduce by targeting lower-competition keywords (long-tail), or invest in link-building to accelerate ranking. Each month saved improves ROI ~'+((mcc/Math.max(acc,1))*100).toFixed(0)+'%.';}" +
  "else if(cr<1){tip='Conversion rate < 1% suggests landing page / offer mismatch. Audit your top 10 posts \\u2014 are they sending traffic to relevant, conversion-optimized pages? Often a CTA tweak doubles CR.';}" +
  "else if(t12<0){tip='12-month ROI is negative. Either reduce content cost, accelerate ranking (lower-competition keywords), or improve conversion rate. Each lever tested separately.';}" +
  "else{tip='Healthy content ROI. A/B test attribution model \\u2014 first/last-touch claim full credit, linear distributes 0.7x. Adjust based on your actual sales cycle.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Content Marketing ROI Calculator\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hE+' '+hL+'\\n';" +
  "r2+='\\u2022 Steady-state monthly net: '+money(sMN)+'  \\u00B7  Annual: '+money(aSt)+'\\n';" +
  "r2+='\\u2022 12-month ROI: '+(t12ROI>0?t12ROI.toFixed(0)+'%':t12ROI.toFixed(0)+'%')+'  \\u00B7  Attribution: '+am+' ('+(aM2*100).toFixed(0)+'% credit)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCCA Inputs Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Monthly pieces:        '+mp+'\\n';" +
  "r2+='\\u2022 Months to rank:        '+mtr+' (ramp-up)\\n';" +
  "r2+='\\u2022 Peak monthly traffic:  '+fmt(pmt)+'\\n';" +
  "r2+='\\u2022 Conversion rate:       '+cr.toFixed(1)+'%\\n';" +
  "r2+='\\u2022 AOV:                   '+money(aov)+'\\n';" +
  "r2+='\\u2022 Monthly content cost:  '+money(mcc)+'  \\u00B7  Annual: '+money(acc)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Conversion rate +1pp ('+cr.toFixed(1)+'% \\u2192 '+nCR.toFixed(1)+'%):\\n';" +
  "r2+='  \\u2022 12-mo total: '+money(t12)+' \\u2192 '+money(n12)+' (+'+money(n12-t12)+')\\n';" +
  "r2+='  \\u2022 ROI: '+t12ROI.toFixed(0)+'% \\u2192 '+nROI.toFixed(0)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Break-Even:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Required conversion rate to break even at 12-mo: '+beCR.toFixed(2)+'%\\n';" +
  "r2+='  \\u2022 Currently: '+cr.toFixed(1)+'%\\n';" +
  "r2+='  \\u2022 Gap: '+((beCR-cr)>0?'+':'')+(beCR-cr).toFixed(2)+'pp\\n';" +
  "r2+='  \\u2022 Or reduce content cost by '+(((mcc-(acc/12*(beCR*0.01/cr*0.01)))/mcc)*100).toFixed(0)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Milestone:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Ramp-up: '+mtr+' months \\u00D7 '+money(mcc)+' = '+money(mtr*mcc)+' sunk\\n';" +
  "r2+='\\u2022 Steady state (post-month '+mtr+'): '+money(sMN)+'/month net\\n';" +
  "r2+='\\u2022 Annual steady-state projection: '+money(aSt)+'\\n';" +
  "r2+='\\u2022 12-mo cumulative: '+money(t12)+' net  ('+t12ROI.toFixed(0)+'% ROI)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCA1 Tip: '+tip+'\\n';" +
  "return [r2];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-content-marketing-roi-calculator',
  title: 'Content Marketing ROI Calculator',
  description:
    'Model SEO/content marketing economics with ramp-up months, peak traffic, attribution model (first-touch / last-touch / linear). See 12-month ROI projection, steady-state revenue, and break-even conversion rate. Health: 🟢 ≥3% CR · 🟡 1–3% · 🟠 0.3–1% · 🔴 <0.3%.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'monthlyPieces', label: 'Content Pieces / Month', placeholder: 'e.g. 8', type: 'number' },
    { name: 'monthsToRank', label: 'Avg Months to Rank (SEO)', placeholder: 'e.g. 6', type: 'number' },
    { name: 'peakMonthlyTraffic', label: 'Peak Monthly Organic Traffic', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'conversionRate', label: 'Conversion Rate (% of organic visitors)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'aov', label: 'Average Order Value ($)', placeholder: 'e.g. 80', type: 'number' },
    { name: 'monthlyContentCost', label: 'Monthly Content Cost ($)', placeholder: 'e.g. 2000', type: 'number' },
    {
      name: 'attributionModel',
      label: 'Attribution Model',
      placeholder: '',
      type: 'select',
      options: ['first-touch', 'last-touch', 'linear'],
    },
  ],
  keywords: [
    'content marketing ROI',
    'SEO ROI',
    'content ROI calculator',
    'content marketing calculator',
    'organic traffic value',
    'content cost',
    'attribution model',
    'first-touch attribution',
    'last-touch attribution',
    'linear attribution',
  ],
  tags: ['marketing', 'content', 'seo', 'roi'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-06',
  sources: [
    'https://www.hubspot.com/marketing/content-marketing-roi',
    'https://contentmarketinginstitute.com/',
    'https://www.semrush.com/blog/content-marketing-roi/',
    'https://neilpatel.com/blog/content-marketing-roi/',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: ['⏰ Content Marketing ROI Calculator\n\n🩺 Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Good — CR 1–3%; healthy content funnel\n• Steady-state monthly net: $6,000  ·  Annual: $72,000\n• 12-month ROI: 100%  ·  Attribution: last-touch (100% credit)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📊 Inputs Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Monthly pieces:        8\n• Months to rank:        6 (ramp-up)\n• Peak monthly traffic:  5,000\n• Conversion rate:       2.0%\n• AOV:                   $80\n• Monthly content cost:  $2,000  ·  Annual: $24,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Conversion rate +1pp (2.0% → 3.0%):\n  • 12-mo total: $24,000 → $48,000 (+$24,000)\n  • ROI: 100% → 200%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Required conversion rate to break even at 12-mo: 1.00%\n  • Currently: 2.0%\n  • Gap: -1.00pp\n  • Or reduce content cost by 100%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Milestone:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Ramp-up: 6 months × $2,000 = $12,000 sunk\n• Steady state (post-month 6): $6,000/month net\n• Annual steady-state projection: $72,000\n• 12-mo cumulative: $24,000 net  (100% ROI)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Healthy content ROI. A/B test attribution model — first/last-touch claim full credit, linear distributes 0.7x. Adjust based on your actual sales cycle.\n'],
  faq: [
    { q: 'How long does SEO content take to rank?', a: 'Average: 3-6 months for low-competition long-tail keywords; 6-12 months for competitive head terms. E-E-A-T signals (expertise, authority, trust) accelerate ranking.' },
    { q: 'What is a good content marketing ROI?', a: 'Best-in-class: 3-5x within 12 months. Average: 1.5-2.5x. The first 6 months are often net-negative due to ramp-up costs — measure 12+ months.' },
    { q: 'First-touch vs last-touch vs linear attribution?', a: 'First-touch credits 100% to first interaction (good for top-of-funnel). Last-touch credits 100% to last (good for conversion focus). Linear distributes evenly (0.7x each touch in our model — accounts for attribution overlap).' },
    { q: 'How much does content marketing cost?', a: 'SMB in-house: $500-$2K/month (writer + tools). SMB agency: $2K-$10K/month. Enterprise: $10K-$50K+. Use the calculator with realistic monthly costs for your situation.' },
  ],
  howToUse: [
    'Enter how many content pieces you publish per month (e.g., 8 blog posts).',
    'Enter typical months-to-rank for your niche (3-12 is typical).',
    'Enter peak monthly organic traffic (use Google Analytics).',
    'Enter conversion rate (% of organic visitors who convert).',
    'Enter average order value (AOV).',
    'Enter total monthly content cost (writer + tools + design).',
    'Pick attribution model — start with last-touch, adjust based on your sales cycle.',
  ],
  engineKey: true,
};

registerEngine(engine);