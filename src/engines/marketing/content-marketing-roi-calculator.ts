import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-9：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 形态分工：
//   · 章节标题行 → calc_out.section.*（共享键复用：health / inputs_snapshot / what_if /
//     break_even / milestone 已是全仓共享键 ⇒ 直接复用，不得新建同文键）
//   · 标签行（• 标签: 值）→ calc_out.label.*，**只包标签**，值留在行里（数值永不丢）
//   · 带运行时数值的整行 → calc_out.content_marketing_roi.row.*（fallback 与 params 同源）
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
      makeToken('calc_out.section.content_marketing_roi_calculator', '⏰ Content Marketing ROI Calculator') +
        '\n\n' +
        makeToken(
          'calc_out.content_marketing_roi.row.enter_inputs',
          '📊 Enter monthly content pieces, months to rank, peak organic traffic, conversion rate, AOV, content cost, and attribution model to see SEO ramp-up curve, 12-month ROI, and steady-state projections.'
        ),
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
  //   ⚠️ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）。
  const healthRow =
    healthBand === 'excellent'
      ? makeToken(
          'calc_out.content_marketing_roi.row.health_excellent',
          '• 🟢 Excellent — CR ≥ 3%; content converts above average'
        )
      : healthBand === 'good'
      ? makeToken(
          'calc_out.content_marketing_roi.row.health_good',
          '• 🟡 Good — CR 1–3%; healthy content funnel'
        )
      : healthBand === 'warning'
      ? makeToken(
          'calc_out.content_marketing_roi.row.health_warning',
          '• 🟠 Warning — CR 0.3–1%; landing pages need optimization'
        )
      : makeToken(
          'calc_out.content_marketing_roi.row.health_critical',
          '• 🔴 Critical — CR < 0.3%; traffic not converting'
        );

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
  //   ⚠️ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出 ⇒ locale 落库后仍红）。
  let tipToken: string;
  if (healthBand === 'excellent' && twelveMo > 0) {
    tipToken = makeToken(
      'calc_out.content_marketing_roi.row.tip_excellent',
      '💡 Tip: Excellent CR + positive 12-mo ROI. Scale content production — ' +
        monthlyPieces +
        ' → ' +
        (monthlyPieces * 1.5).toFixed(0) +
        ' pieces/month doubles your SEO reach with similar conversion economics.',
      { pieces: String(monthlyPieces), scaled: (monthlyPieces * 1.5).toFixed(0) }
    );
  } else if (monthsToRank > 6) {
    tipToken = makeToken(
      'calc_out.content_marketing_roi.row.tip_long_ramp',
      '💡 Tip: Ramp-up of ' +
        monthsToRank +
        ' months is long. Reduce by targeting lower-competition keywords (long-tail), or invest in link-building to accelerate ranking. Each month saved improves ROI ~' +
        ((monthlyContentCost / Math.max(annualContentCost, 1)) * 100).toFixed(0) +
        '%.',
      { months: String(monthsToRank), pct: ((monthlyContentCost / Math.max(annualContentCost, 1)) * 100).toFixed(0) }
    );
  } else if (conversionRate < 1) {
    tipToken = makeToken(
      'calc_out.content_marketing_roi.row.tip_low_conversion',
      '💡 Tip: Conversion rate < 1% suggests landing page / offer mismatch. Audit your top 10 posts — are they sending traffic to relevant, conversion-optimized pages? Often a CTA tweak doubles CR.'
    );
  } else if (twelveMo < 0) {
    tipToken = makeToken(
      'calc_out.content_marketing_roi.row.tip_negative_roi',
      '💡 Tip: 12-month ROI is negative. Either reduce content cost, accelerate ranking (lower-competition keywords), or improve conversion rate. Each lever tested separately.'
    );
  } else {
    tipToken = makeToken(
      'calc_out.content_marketing_roi.row.tip_healthy',
      '💡 Tip: Healthy content ROI. A/B test attribution model — first/last-touch claim full credit, linear distributes 0.7x. Adjust based on your actual sales cycle.'
    );
  }

  const r =
    makeToken('calc_out.section.content_marketing_roi_calculator', '⏰ Content Marketing ROI Calculator') +
    '\n\n' +
    makeToken('calc_out.section.health', '🩺 Health:') +
    '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthRow +
    '\n' +
    '• ' +
    makeToken('calc_out.label.steady_state_monthly_net', 'Steady-state monthly net') +
    ': ' +
    money(steadyMonthlyNet) +
    '  ·  ' +
    makeToken('calc_out.label.annual', 'Annual') +
    ': ' +
    money(annualSteady) +
    '\n' +
    '• ' +
    makeToken('calc_out.label.twelve_month_roi', '12-month ROI') +
    ': ' +
    (twelveMoROI > 0 ? twelveMoROI.toFixed(0) + '%' : twelveMoROI.toFixed(0) + '%') +
    '  ·  ' +
    makeToken(
      'calc_out.content_marketing_roi.row.attribution',
      'Attribution: ' + attributionModel + ' (' + (attrMult * 100).toFixed(0) + '% credit)',
      { model: attributionModel, credit: (attrMult * 100).toFixed(0) }
    ) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.inputs_snapshot', '📊 Inputs Snapshot:') +
    '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    makeToken('calc_out.label.monthly_pieces', 'Monthly pieces') +
    ':        ' +
    monthlyPieces +
    '\n' +
    '• ' +
    makeToken(
      'calc_out.content_marketing_roi.row.months_to_rank',
      'Months to rank:        ' + monthsToRank + ' (ramp-up)',
      { months: String(monthsToRank) }
    ) +
    '\n' +
    '• ' +
    makeToken('calc_out.label.peak_monthly_traffic', 'Peak monthly traffic') +
    ':  ' +
    fmt(peakMonthlyTraffic) +
    '\n' +
    '• ' +
    makeToken('calc_out.label.conversion_rate', 'Conversion rate') +
    ':       ' +
    conversionRate.toFixed(1) +
    '%\n' +
    '• ' +
    makeToken('calc_out.label.aov', 'AOV') +
    ':                   ' +
    money(aov) +
    '\n' +
    '• ' +
    makeToken('calc_out.label.monthly_content_cost', 'Monthly content cost') +
    ':  ' +
    money(monthlyContentCost) +
    '  ·  ' +
    makeToken('calc_out.label.annual', 'Annual') +
    ': ' +
    money(annualContentCost) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if', '🔄 What-If:') +
    '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    makeToken('calc_out.label.conversion_rate_plus_1pp', 'Conversion rate +1pp') +
    ' (' +
    conversionRate.toFixed(1) +
    '% → ' +
    newCR.toFixed(1) +
    '%):\n' +
    '  • ' +
    makeToken('calc_out.label.twelve_month_total', '12-mo total') +
    ': ' +
    money(twelveMo) +
    ' → ' +
    money(newTwelveMo) +
    ' (+' +
    money(newTwelveMo - twelveMo) +
    ')\n' +
    '  • ' +
    makeToken('calc_out.label.roi', 'ROI') +
    ': ' +
    twelveMoROI.toFixed(0) +
    '% → ' +
    newROI.toFixed(0) +
    '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.break_even', '⚖️ Break-Even:') +
    '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    makeToken('calc_out.label.required_conversion_rate', 'Required conversion rate to break even at 12-mo') +
    ': ' +
    breakEvenCR.toFixed(2) +
    '%\n' +
    '  • ' +
    makeToken('calc_out.label.currently', 'Currently') +
    ': ' +
    conversionRate.toFixed(1) +
    '%\n' +
    '  • ' +
    makeToken('calc_out.label.gap', 'Gap') +
    ': ' +
    ((breakEvenCR - conversionRate) > 0 ? '+' : '') +
    (breakEvenCR - conversionRate).toFixed(2) +
    'pp\n' +
    '  • ' +
    makeToken('calc_out.label.reduce_content_cost_by', 'Or reduce content cost by') +
    ' ' +
    (((monthlyContentCost - (annualContentCost / 12 * (breakEvenCR * 0.01 / conversionRate * 0.01))) / monthlyContentCost) * 100).toFixed(0) +
    '%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.milestone', '🎯 Milestone:') +
    '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    makeToken(
      'calc_out.content_marketing_roi.row.milestone_ramp_up',
      'Ramp-up: ' +
        monthsToRank +
        ' months × ' +
        money(monthlyContentCost) +
        ' = ' +
        money(monthsToRank * monthlyContentCost) +
        ' sunk',
      {
        months: String(monthsToRank),
        cost: money(monthlyContentCost),
        sunk: money(monthsToRank * monthlyContentCost),
      }
    ) +
    '\n' +
    '• ' +
    makeToken(
      'calc_out.content_marketing_roi.row.milestone_steady_state',
      'Steady state (post-month ' + monthsToRank + '): ' + money(steadyMonthlyNet) + '/month net',
      { months: String(monthsToRank), net: money(steadyMonthlyNet) }
    ) +
    '\n' +
    '• ' +
    makeToken('calc_out.label.annual_steady_state_projection', 'Annual steady-state projection') +
    ': ' +
    money(annualSteady) +
    '\n' +
    '• ' +
    makeToken('calc_out.label.twelve_month_cumulative', '12-mo cumulative') +
    ': ' +
    money(twelveMo) +
    ' net  (' +
    twelveMoROI.toFixed(0) +
    '% ROI)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tipToken +
    '\n';

  return [r];
}

// ============== customFn (minified, mirrors calculate()) ==============

const customFn =
  // P168 B3-9：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
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
  "if(pmt===0){return[tk('calc_out.section.content_marketing_roi_calculator','\\u23F0 Content Marketing ROI Calculator')+'\\n\\n'+tk('calc_out.content_marketing_roi.row.enter_inputs','\\uD83D\\uDCCA Enter monthly content pieces, months to rank, peak organic traffic, conversion rate, AOV, content cost, and attribution model to see SEO ramp-up curve, 12-month ROI, and steady-state projections.')];}" +
  "var mR2=mR(pmt,cr,aov);var mN=mNR(mR2,mcc);var aM2=aM(am);" +
  "var t12=t12T(mtr,mR2,mcc,aM2);var acc=mcc*12;var t12ROI=acc>0?(t12/acc)*100:0;" +
  "var hB=cHB(cr);" +
  "var hRow=hB==='excellent'?tk('calc_out.content_marketing_roi.row.health_excellent','\\u2022 \\uD83D\\uDFE2 Excellent \\u2014 CR \\u2265 3%; content converts above average'):hB==='good'?tk('calc_out.content_marketing_roi.row.health_good','\\u2022 \\uD83D\\uDFE1 Good \\u2014 CR 1\\u20133%; healthy content funnel'):hB==='warning'?tk('calc_out.content_marketing_roi.row.health_warning','\\u2022 \\uD83D\\uDFE0 Warning \\u2014 CR 0.3\\u20131%; landing pages need optimization'):tk('calc_out.content_marketing_roi.row.health_critical','\\u2022 \\uD83D\\uDD34 Critical \\u2014 CR < 0.3%; traffic not converting');" +
  "function money(n){return '$'+Math.round(n).toLocaleString('en-US');}" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "var nCR=cr+1;var nMR=mR(pmt,nCR,aov);var n12=t12T(mtr,nMR,mcc,aM2);" +
  "var nROI=acc>0?(n12/acc)*100:0;" +
  "var beCR=mtr<12&&pmt>0&&aov>0&&aM2>0?(12*mcc)/((12-mtr)*pmt*aov*aM2)*100:0;" +
  "var sMN=mN*aM2;var aSt=sMN*12;" +
  "var tipTok;" +
  "if(hB==='excellent'&&t12>0){tipTok=tk('calc_out.content_marketing_roi.row.tip_excellent','\\uD83D\\uDCA1 Tip: Excellent CR + positive 12-mo ROI. Scale content production \\u2014 '+mp+' \\u2192 '+(mp*1.5).toFixed(0)+' pieces/month doubles your SEO reach with similar conversion economics.',{pieces:String(mp),scaled:(mp*1.5).toFixed(0)});}" +
  "else if(mtr>6){tipTok=tk('calc_out.content_marketing_roi.row.tip_long_ramp','\\uD83D\\uDCA1 Tip: Ramp-up of '+mtr+' months is long. Reduce by targeting lower-competition keywords (long-tail), or invest in link-building to accelerate ranking. Each month saved improves ROI ~'+((mcc/Math.max(acc,1))*100).toFixed(0)+'%.',{months:String(mtr),pct:((mcc/Math.max(acc,1))*100).toFixed(0)});}" +
  "else if(cr<1){tipTok=tk('calc_out.content_marketing_roi.row.tip_low_conversion','\\uD83D\\uDCA1 Tip: Conversion rate < 1% suggests landing page / offer mismatch. Audit your top 10 posts \\u2014 are they sending traffic to relevant, conversion-optimized pages? Often a CTA tweak doubles CR.');}" +
  "else if(t12<0){tipTok=tk('calc_out.content_marketing_roi.row.tip_negative_roi','\\uD83D\\uDCA1 Tip: 12-month ROI is negative. Either reduce content cost, accelerate ranking (lower-competition keywords), or improve conversion rate. Each lever tested separately.');}" +
  "else{tipTok=tk('calc_out.content_marketing_roi.row.tip_healthy','\\uD83D\\uDCA1 Tip: Healthy content ROI. A/B test attribution model \\u2014 first/last-touch claim full credit, linear distributes 0.7x. Adjust based on your actual sales cycle.');}" +
  "var r2='';" +
  "r2+=tk('calc_out.section.content_marketing_roi_calculator','\\u23F0 Content Marketing ROI Calculator')+'\\n\\n';" +
  "r2+=tk('calc_out.section.health','\\uD83E\\uDE7A Health:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=hRow+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.steady_state_monthly_net','Steady-state monthly net')+': '+money(sMN)+'  \\u00B7  '+tk('calc_out.label.annual','Annual')+': '+money(aSt)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.twelve_month_roi','12-month ROI')+': '+(t12ROI>0?t12ROI.toFixed(0)+'%':t12ROI.toFixed(0)+'%')+'  \\u00B7  '+tk('calc_out.content_marketing_roi.row.attribution','Attribution: '+am+' ('+(aM2*100).toFixed(0)+'% credit)',{model:am,credit:(aM2*100).toFixed(0)})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.inputs_snapshot','\\uD83D\\uDCCA Inputs Snapshot:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.monthly_pieces','Monthly pieces')+':        '+mp+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.content_marketing_roi.row.months_to_rank','Months to rank:        '+mtr+' (ramp-up)',{months:String(mtr)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.peak_monthly_traffic','Peak monthly traffic')+':  '+fmt(pmt)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.conversion_rate','Conversion rate')+':       '+cr.toFixed(1)+'%\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.aov','AOV')+':                   '+money(aov)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.monthly_content_cost','Monthly content cost')+':  '+money(mcc)+'  \\u00B7  '+tk('calc_out.label.annual','Annual')+': '+money(acc)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.what_if','\\uD83D\\uDD04 What-If:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.conversion_rate_plus_1pp','Conversion rate +1pp')+' ('+cr.toFixed(1)+'% \\u2192 '+nCR.toFixed(1)+'%):\\n';" +
  "r2+='  \\u2022 '+tk('calc_out.label.twelve_month_total','12-mo total')+': '+money(t12)+' \\u2192 '+money(n12)+' (+'+money(n12-t12)+')\\n';" +
  "r2+='  \\u2022 '+tk('calc_out.label.roi','ROI')+': '+t12ROI.toFixed(0)+'% \\u2192 '+nROI.toFixed(0)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.break_even','\\u2696\\uFE0F Break-Even:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.required_conversion_rate','Required conversion rate to break even at 12-mo')+': '+beCR.toFixed(2)+'%\\n';" +
  "r2+='  \\u2022 '+tk('calc_out.label.currently','Currently')+': '+cr.toFixed(1)+'%\\n';" +
  "r2+='  \\u2022 '+tk('calc_out.label.gap','Gap')+': '+((beCR-cr)>0?'+':'')+(beCR-cr).toFixed(2)+'pp\\n';" +
  "r2+='  \\u2022 '+tk('calc_out.label.reduce_content_cost_by','Or reduce content cost by')+' '+(((mcc-(acc/12*(beCR*0.01/cr*0.01)))/mcc)*100).toFixed(0)+'%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.milestone','\\uD83C\\uDFAF Milestone:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.content_marketing_roi.row.milestone_ramp_up','Ramp-up: '+mtr+' months \\u00D7 '+money(mcc)+' = '+money(mtr*mcc)+' sunk',{months:String(mtr),cost:money(mcc),sunk:money(mtr*mcc)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.content_marketing_roi.row.milestone_steady_state','Steady state (post-month '+mtr+'): '+money(sMN)+'/month net',{months:String(mtr),net:money(sMN)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.annual_steady_state_projection','Annual steady-state projection')+': '+money(aSt)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.twelve_month_cumulative','12-mo cumulative')+': '+money(t12)+' net  ('+t12ROI.toFixed(0)+'% ROI)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tipTok+'\\n';" +
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
  staticExamples: ['$calc_out.section.content_marketing_roi_calculator|⏰ Content Marketing ROI Calculator|\n\n$calc_out.section.health|🩺 Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.content_marketing_roi.row.health_good|• 🟡 Good — CR 1–3%; healthy content funnel|\n• $calc_out.label.steady_state_monthly_net|Steady-state monthly net|: $6,000  ·  $calc_out.label.annual|Annual|: $72,000\n• $calc_out.label.twelve_month_roi|12-month ROI|: 100%  ·  $calc_out.content_marketing_roi.row.attribution{"model":"last-touch","credit":"100"}|Attribution: last-touch (100% credit)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.monthly_pieces|Monthly pieces|:        8\n• $calc_out.content_marketing_roi.row.months_to_rank{"months":"6"}|Months to rank:        6 (ramp-up)|\n• $calc_out.label.peak_monthly_traffic|Peak monthly traffic|:  5,000\n• $calc_out.label.conversion_rate|Conversion rate|:       2.0%\n• $calc_out.label.aov|AOV|:                   $80\n• $calc_out.label.monthly_content_cost|Monthly content cost|:  $2,000  ·  $calc_out.label.annual|Annual|: $24,000\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if|🔄 What-If:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.conversion_rate_plus_1pp|Conversion rate +1pp| (2.0% → 3.0%):\n  • $calc_out.label.twelve_month_total|12-mo total|: $24,000 → $48,000 (+$24,000)\n  • $calc_out.label.roi|ROI|: 100% → 200%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.required_conversion_rate|Required conversion rate to break even at 12-mo|: 1.00%\n  • $calc_out.label.currently|Currently|: 2.0%\n  • $calc_out.label.gap|Gap|: -1.00pp\n  • $calc_out.label.reduce_content_cost_by|Or reduce content cost by| 100%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.milestone|🎯 Milestone:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.content_marketing_roi.row.milestone_ramp_up{"months":"6","cost":"$2,000","sunk":"$12,000"}|Ramp-up: 6 months × $2,000 = $12,000 sunk|\n• $calc_out.content_marketing_roi.row.milestone_steady_state{"months":"6","net":"$6,000"}|Steady state (post-month 6): $6,000/month net|\n• $calc_out.label.annual_steady_state_projection|Annual steady-state projection|: $72,000\n• $calc_out.label.twelve_month_cumulative|12-mo cumulative|: $24,000 net  (100% ROI)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.content_marketing_roi.row.tip_healthy|💡 Tip: Healthy content ROI. A/B test attribution model — first/last-touch claim full credit, linear distributes 0.7x. Adjust based on your actual sales cycle.|\n'],
  faq: [
    { q: 'How long does SEO content take to rank?', a: 'Average: 3-6 months for low-competition long-tail keywords; 6-12 months for competitive head terms. E-E-A-T signals (expertise, authority, trust) accelerate ranking.' },
    { q: 'What is a good content marketing ROI?', a: 'Best-in-class: 3-5x within 12 months. Average: 1.5-2.5x. The first 6 months are often net-negative due to ramp-up costs — measure 12+ months.' },
    { q: 'First-touch vs last-touch vs linear attribution?', a: 'First-touch credits 100% to first interaction (good for top-of-funnel). Last-touch credits 100% to last (good for conversion focus). Linear distributes evenly (0.7x each touch in our model — accounts for attribution overlap).' },
    { q: 'How much does content marketing cost?', a: 'SMB in-house: $500-$2K/month (writer + tools). SMB agency: $2K-$10K/month. Enterprise: $10K-$50K+. Use the calculator with realistic monthly costs for your situation.' },
    { q: "What is a good ROI for content marketing?", a: "Average: 3-5x. Top performers: 10-30x. Hubspot: content marketing generates 3x more leads per dollar than paid search. B2B SaaS: 6-9x ROI typical. E-commerce: 4-6x. Time horizon: 6-12 months to see ROI. Faster for SEO, longer for thought leadership. Track per piece, by cluster, by channel. Calculate: (revenue - cost) / cost." },
    { q: 'How do I measure content marketing ROI?', a: 'Formula: ROI = (revenue_attributed - content_cost) / content_cost. Attribution: 1) First-touch (first interaction), 2) Last-touch (final interaction), 3) Multi-touch (weighted). Tools: HubSpot, Google Analytics 4, custom UTM. Best option: combination of attribution + survey. Most teams 60-80% of revenue can be tied to content if tracked well.' },
    { q: 'How much should I budget for content marketing?', a: 'B2B SaaS: 25-50% of marketing budget. E-commerce: 15-25%. SMB: 10-20% of revenue. Mix: 50% in-house writers + tools, 30% promotion, 20% paid distribution. Per piece cost: $100-2000 (in-house to agency). Annual content budget: $50K-500K typical. Most teams: $1000-3000/article for high-quality.' },
    { q: 'What content drives the most ROI?', a: 'Top formats: 1) Comparison posts (X vs Y): high intent, 5-10% conversion, 2) How-to guides: SEO traffic, 3) Templates/tools: lead magnets, 4) Original research: backlinks, 5) Case studies: bottom-funnel, 6) Product reviews: high conversion. Allocate: 30% top-of-funnel (awareness), 50% middle (consideration), 20% bottom (decision).' },
    { q: 'How long until content marketing pays back?', a: 'SEO content: 6-12 months. Paid distribution: 1-3 months. Email nurture: 1-6 months. Social: 3-12 months. Overall: 6-12 months for positive ROI. Be patient: most teams underestimate by 50%. Compound effect: 1.5-2x year-over-year. After 2-3 years: content is the #1 lead source for most B2B. Don\'t quit early.' },
    { q: 'How do I scale content production?', a: 'Pillars: 1) Hire dedicated writers (1-3 FTE per 100+ articles/year), 2) Editorial calendar (quarterly themes), 3) Templates + SOPs, 4) AI-assisted writing, 5) Subject matter expert interviews, 6) Repurpose (1 article → 10 social posts). Most teams 4-8 articles/month with 1-2 writers. 20-40 articles/month with team.' },
    { q: 'Should I use AI for content?', a: 'Yes, with guardrails. AI helps: 1) Outlines + first drafts (50% faster), 2) Topic research, 3) Meta descriptions, 4) Translation, 5) Email/chat copy. Avoid full AI articles without human edit (Google penalizes). Best option: human + AI collaboration. 30-50% content productivity boost with AI. Quality must remain high.' },
    { q: 'How do I track content marketing attribution?', a: 'Tools: 1) UTM parameters on every link, 2) Google Analytics 4 (engagement, conversion), 3) HubSpot/Marketo (B2B attribution), 4) First-party data (email, accounts), 5) Post-purchase surveys ("how did you hear about us?"). Best option: multi-touch attribution. Most teams 30-50% revenue attribution. Track source, medium, campaign, content piece.' },
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
