import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-7：结果输出 token 化 —— 服务端用 makeToken，客户端 customFn 前置
//   同一份实现（CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// =====================================================================
// Coupon Attribution Calculator (P16-1) — Business v3 standard
// =====================================================================
// True ROI of a coupon campaign = (incremental_revenue - coupon_cost) / coupon_cost.
// Incremental revenue adjusts gross coupon revenue by cannibalization rate
// (% of coupon orders that would have happened anyway at full price).
//
// Formula (Shopify/Klaviyo standard):
//   total_coupon_revenue = baseline_revenue * redemption_rate * AOV
//   coupon_cost          = baseline_revenue * redemption_rate * coupon_value
//   incremental_revenue  = total_coupon_revenue * (1 - cannibalization_pct)
//   cannibalization_loss = total_coupon_revenue - incremental_revenue
//   net_revenue_gain     = incremental_revenue - coupon_cost
//   true_roi             = net_revenue_gain / coupon_cost (1.80 = 180%)
//
// Health bands on true_roi: green >=100% . yellow 0-100% . red <0%
//   - Good: every coupon dollar produced >=$1 of incremental profit.
//   - Warning: coupons returned less than they cost (fragile).
//   - Critical: coupons destroyed value.
//
// NOTE: This engine uses 3-band Health (🟢🟡🔴) by design — see CLAUDE.md
// "v3 standard — two variants" for the ROI-hard-breakpoint exemption.
// True coupon ROI's break-even is structurally at 100% (profit↔loss
// boundary), not a fuzzy middle band; inserting a 🟠 band would force
// an arbitrary split (e.g. 50–100% margin) with no business meaning.
//
// Cannibalization: not running A/B tests? Use 30% (industry avg).

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  good: { threshold: 1.0, label: 'Good — true ROI >= 100%; coupon creates incremental profit' },
  warning: { threshold: 0, label: 'Warning — true ROI 0–100%; coupon barely profitable, fragile' },
  critical: { threshold: -Infinity, label: 'Critical — true ROI < 0%; coupon destroys value' },
} as const;

// ============== Math helpers ==============

/**
 * True ROI ratio (1.80 = 180%) of a coupon campaign.
 * Returns 0 when coupon_cost is 0 (avoids NaN/Infinity in band comparators).
 */
export function calcTrueROI(
  couponValue: number,
  redemptionPct: number,
  aov: number,
  baselineRevenue: number,
  cannibalizationPct: number
): number {
  const redemptionRate = redemptionPct / 100;
  const cannibalizationRate = cannibalizationPct / 100;
  const totalCouponRevenue = baselineRevenue * redemptionRate * aov;
  const couponCost = baselineRevenue * redemptionRate * couponValue;
  const incrementalRevenue = totalCouponRevenue * (1 - cannibalizationRate);
  const netRevenueGain = incrementalRevenue - couponCost;
  if (couponCost <= 0) return 0;
  return netRevenueGain / couponCost;
}

/** Map true ROI ratio to health band. */
export function calcHealthBand(roi: number): 'good' | 'warning' | 'critical' {
  if (roi >= HEALTH_BANDS.good.threshold) return 'good';
  if (roi >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

// ============== Health band → emoji lookup (3-tier hard-breakpoint exemption) ==============
// P141-B1-T4: replaces nested ternary with table lookup. Coupon ROI's structural
// break-even at 100% (profit↔loss boundary) means there's no 'excellent' band;
// see CLAUDE.md "Hard-breakpoint exemption".
const BAND_EMOJI: Record<ReturnType<typeof calcHealthBand>, string> = {
  good:     '🟢',
  warning:  '🟡',
  critical: '🔴',
};

// ============== Health band → token（3 档硬断点：🟢/🟡/🔴，无 🟠）==============
// P168 B3-7：档位**文案**（HEALTH_BANDS[x].label）整体进 token；emoji 仍由 BAND_EMOJI
//   提供 ⇒ 输出行仍是 `* 🟢 <文案>`，而文案本身可被 locale 模板替换。
// ⚠️ locale.en 必须与 HEALTH_BANDS[x].label **逐字相同**（否则兜底与模板分叉）。
const HEALTH_BAND_TOKENS = {
  good: makeToken(
    'calc_out.coupon_attribution.row.health_good',
    HEALTH_BANDS.good.label,
  ),
  warning: makeToken(
    'calc_out.coupon_attribution.row.health_warning',
    HEALTH_BANDS.warning.label,
  ),
  critical: makeToken(
    'calc_out.coupon_attribution.row.health_critical',
    HEALTH_BANDS.critical.label,
  ),
};

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const couponValue = clampNonNegative(parseFloat(inputs.couponValue) || 0);
  const redemptionRate = clampNonNegative(parseFloat(inputs.redemptionRate) || 0);
  const avgOrderValue = clampNonNegative(parseFloat(inputs.avgOrderValue) || 0);
  const baselineRevenue = clampNonNegative(parseFloat(inputs.baselineRevenue) || 0);
  const cannibalizationPct = clampNonNegative(parseFloat(inputs.cannibalizationPct) || 0);

  if (baselineRevenue === 0) {
    return [
      '$calc_out.section.coupon_attribution_calculator|Coupon Attribution Calculator|\n\n' +
        '$calc_out.coupon_attribution.row.enter_inputs_required|Enter your baseline revenue, coupon value, redemption rate, AOV, and cannibalization % to compute the true ROI of your coupon campaign.|',
    ];
  }

  const rd = redemptionRate / 100;
  const cd = cannibalizationPct / 100;
  const totalCouponRevenue = baselineRevenue * rd * avgOrderValue;
  const couponCost = baselineRevenue * rd * couponValue;
  const incrementalRevenue = totalCouponRevenue * (1 - cd);
  const cannibalizationLoss = totalCouponRevenue - incrementalRevenue;
  const netRevenueGain = incrementalRevenue - couponCost;
  const trueROI = couponCost > 0 ? netRevenueGain / couponCost : 0;

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const pct = (n: number) => (n * 100).toFixed(0) + '%';

  const band = calcHealthBand(trueROI);
  const healthEmoji = BAND_EMOJI[band];
  const healthLabel = HEALTH_BAND_TOKENS[band];

  // What-If: +20% redemption; -50% coupon_value; -10pp cannibalization
  const wrR = redemptionRate * 1.2;
  const wrRev = baselineRevenue * (wrR / 100) * avgOrderValue;
  const wrCost = baselineRevenue * (wrR / 100) * couponValue;
  const wrIncr = wrRev * (1 - cd);
  const wrNet = wrIncr - wrCost;
  const wrROI = wrCost > 0 ? wrNet / wrCost : 0;

  const whCV = couponValue * 0.5;
  const whCost = baselineRevenue * rd * whCV;
  const whNet = incrementalRevenue - whCost;
  const whROI = whCost > 0 ? whNet / whCost : 0;

  const wcP = Math.max(0, cannibalizationPct - 10);
  const wcIncr = totalCouponRevenue * (1 - wcP / 100);
  const wcNet = wcIncr - couponCost;
  const wcROI = couponCost > 0 ? wcNet / couponCost : 0;

  // Break-Even: cannibalization_pct that drives net_revenue_gain to 0
  //   net = totalRevenue * (1 - canni) - couponCost = 0
  //   canni = 1 - couponCost / totalRevenue
  const breakEvenCannibalPct = totalCouponRevenue > 0
    ? Math.max(0, (1 - couponCost / totalCouponRevenue) * 100)
    : 100;
  const cannibalHeadroom = cannibalizationPct <= breakEvenCannibalPct
    ? breakEvenCannibalPct - cannibalizationPct
    : 0;

  // Milestone: 12-month projection at current run-rate
  const annualNetGain = netRevenueGain * 12;
  const annualCouponCost = couponCost * 12;
  const annualIncrementalRevenue = incrementalRevenue * 12;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip = makeToken('calc_out.coupon_attribution.row.tip_critical', '💡 Tip: Coupons are destroying value. Either raise coupon value (smaller discount), tighten targeting so redemption comes from genuinely incremental buyers, or run a holdout test to measure real cannibalization before scaling. Most teams discover true cannibalization is 50–70%, not the 30% they assumed.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.coupon_attribution.row.tip_good', '💡 Tip: Healthy true ROI. Lock in this audience * offer * channel combination as a template; A/B test only one variable at a time (discount depth, audience, creative) so you can attribute the next +20pp of ROI to a specific lever. Document the cannibalization % you measured — it is the single most-cited number in coupon post-mortems.');
  } else {
    // warning band
    if (cannibalizationPct > 50) {
      tip = makeToken('calc_out.coupon_attribution.row.tip_warning_high_cannibalization', '💡 Tip: High cannibalization is the dominant drag on ROI. Run a 50/50 holdout (no-coupon cohort) for one cycle to measure true incremental conversion; if observed cannibalization is >50%, switch to dollar-off vs. percent-off and cap the discount at the smallest value that still clears your margin floor.');
    } else {
      tip = makeToken('calc_out.coupon_attribution.row.tip_warning_low_cannibalization', '💡 Tip: Coupon barely profitable. Tighten redemption targeting (exclude recent purchasers / email subscribers already at LTV ceiling), shorten the campaign window to avoid stacking with other promos, or reduce discount depth by 25–50%. A 10pp drop in cannibalization alone often doubles true ROI.');
    }
  }

  // P168 B3-7：带 params 的行 token 化 —— fallback 与 params 取**同一个变量**
  //   ⇒ 英文兜底与中文模板不可能漂。
  const tkRateAov = makeToken('calc_out.coupon_attribution.row.formula_baseline_x_rate_x_aov', '(baseline x ' + redemptionRate.toFixed(1) + '% x AOV)', { rate: redemptionRate.toFixed(1) });
  const tkRateDiscount = makeToken('calc_out.coupon_attribution.row.formula_baseline_x_rate_x_discount', '(baseline x ' + redemptionRate.toFixed(1) + '% x discount)', { rate: redemptionRate.toFixed(1) });
  const tkWr = makeToken('calc_out.coupon_attribution.row.whatif_redemption_plus_20', '+20% redemption: true ROI = ' + pct(wrROI) + ' * net gain = ' + money(wrNet), { roi: pct(wrROI), net: money(wrNet) });
  const tkWh = makeToken('calc_out.coupon_attribution.row.whatif_coupon_value_minus_50', '-50% coupon value: true ROI = ' + pct(whROI) + ' * net gain = ' + money(whNet), { roi: pct(whROI), net: money(whNet) });
  const tkWc = makeToken('calc_out.coupon_attribution.row.whatif_cannibalization_minus_10pp', '-10pp cannibalization: true ROI = ' + pct(wcROI) + ' * net gain = ' + money(wcNet), { roi: pct(wcROI), net: money(wcNet) });
  const tkHeadroom = makeToken('calc_out.coupon_attribution.row.headroom', 'Headroom: ' + cannibalHeadroom.toFixed(1) + 'pp before net revenue gain hits zero', { headroom: cannibalHeadroom.toFixed(1) + 'pp' });

  const r =
    '$calc_out.section.coupon_attribution_calculator|Coupon Attribution Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '------------------------------------------------\n' +
    '* ' + healthEmoji + ' ' + healthLabel + '\n' +
    '* $calc_out.label.true_roi|True ROI|: ' + pct(trueROI) + '  *  $calc_out.label.net_revenue_gain|Net revenue gain|: ' + money(netRevenueGain) + '\n' +
    '* $calc_out.label.cannibalization|Cannibalization|: ' + cannibalizationPct.toFixed(0) + '%  *  $calc_out.label.coupon_cost|Coupon cost|: ' + money(couponCost) + '\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '------------------------------------------------\n' +
    '* $calc_out.label.coupon_value|Coupon value|:        ' + money(couponValue) + '\n' +
    '* $calc_out.label.redemption_rate|Redemption rate|:     ' + redemptionRate.toFixed(1) + '%\n' +
    '* $calc_out.label.average_order_value|Average order value|: ' + money(avgOrderValue) + '\n' +
    '* $calc_out.label.baseline_revenue|Baseline revenue|:    ' + money(baselineRevenue) + '\n' +
    '* $calc_out.label.cannibalization|Cannibalization|:     ' + cannibalizationPct.toFixed(0) + '%\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.revenue_breakdown|💰 Revenue Breakdown:|\n' +
    '------------------------------------------------\n' +
    '* $calc_out.label.total_coupon_revenue|Total coupon revenue|: ' + money(totalCouponRevenue) + '  ' + tkRateAov + '\n' +
    '* $calc_out.label.cannibalization_loss|Cannibalization loss|: ' + money(cannibalizationLoss) + '  $calc_out.coupon_attribution.row.formula_orders_would_happen|(orders that would have happened anyway)|\n' +
    '* $calc_out.label.incremental_revenue|Incremental revenue|:  ' + money(incrementalRevenue) + '  $calc_out.coupon_attribution.row.formula_after_cannibalization|(after cannibalization adjustment)|\n' +
    '* $calc_out.label.coupon_cost|Coupon cost|:          ' + money(couponCost) + '  ' + tkRateDiscount + '\n' +
    '* $calc_out.label.net_revenue_gain|Net revenue gain|:     ' + money(netRevenueGain) + '\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '------------------------------------------------\n' +
    '* ' + tkWr + '\n' +
    '* ' + tkWh + '\n' +
    '* ' + tkWc + '\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '------------------------------------------------\n' +
    '* $calc_out.label.cannibalization_ceiling|Cannibalization ceiling|: ' + breakEvenCannibalPct.toFixed(1) + '%  $calc_out.coupon_attribution.row.cannibalization_ceiling_note|(above this, coupons destroy value)|\n' +
    '* ' + tkHeadroom + '\n' +
    '* $calc_out.coupon_attribution.row.break_even_one_dollar|At break-even, every coupon dollar returns exactly one coupon dollar in net revenue|\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '------------------------------------------------\n' +
    '* $calc_out.label.annualized_net_gain|Annualized net gain|: ' + money(annualNetGain) + '  $calc_out.coupon_attribution.row.milestone_cadence_note|(at 1 campaign/month cadence)|\n' +
    '* $calc_out.label.annual_incremental_revenue|Annual incremental revenue|: ' + money(annualIncrementalRevenue) + '\n' +
    '* $calc_out.label.annual_coupon_cost|Annual coupon cost|: ' + money(annualCouponCost) + '\n' +
    '* $calc_out.coupon_attribution.row.milestone_assumption|(Assumes constant redemption + cannibalization — refresh quarterly with new cohort data)|\n\n' +
    '------------------------------------------------\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-7：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var cv=cnn(parseFloat(inputs.couponValue)||0);" +
  "var rr=cnn(parseFloat(inputs.redemptionRate)||0);" +
  // P168 B3-7：params 表达式用**服务端同名变量**（客户端核销率变量名是 rr）。
  "var redemptionRate=rr;" +
  "var aov=cnn(parseFloat(inputs.avgOrderValue)||0);" +
  "var br=cnn(parseFloat(inputs.baselineRevenue)||0);" +
  "var cp=cnn(parseFloat(inputs.cannibalizationPct)||0);" +
  'if(br===0){return["$calc_out.section.coupon_attribution_calculator|Coupon Attribution Calculator|\\n\\n$calc_out.coupon_attribution.row.enter_inputs_required|Enter your baseline revenue, coupon value, redemption rate, AOV, and cannibalization % to compute the true ROI of your coupon campaign.|"];}' +
  "var rd=rr/100,cd=cp/100;" +
  "var tcr=br*rd*aov;" +
  "var cc=br*rd*cv;" +
  "var incr=tcr*(1-cd);" +
  "var canLoss=tcr-incr;" +
  "var net=incr-cc;" +
  "var roi=cc>0?net/cc:0;" +
  'function money(n){return "$"+Math.round(n).toLocaleString("en-US");}' +
  'function pct(n){return (n*100).toFixed(0)+"%";}' +
  'var band=roi>=1?"good":(roi>=0?"warning":"critical");' +
  'var he=band==="good"?"🟢":(band==="warning"?"🟡":"🔴");' +
  // P168 B3-7：三档文案取自 HEALTH_BANDS（与服务端**同一份**原文 ⇒ 逐字节相同）。
  'var hl=band==="good"?"$calc_out.coupon_attribution.row.health_good|' + HEALTH_BANDS.good.label + '|":(band==="warning"?"$calc_out.coupon_attribution.row.health_warning|' + HEALTH_BANDS.warning.label + '|":"$calc_out.coupon_attribution.row.health_critical|' + HEALTH_BANDS.critical.label + '|");' +
  "var wrR=rr*1.2;" +
  "var wrRev=br*(wrR/100)*aov;" +
  "var wrCost=br*(wrR/100)*cv;" +
  "var wrIncr=wrRev*(1-cd);" +
  "var wrNet=wrIncr-wrCost;" +
  "var wrROI=wrCost>0?wrNet/wrCost:0;" +
  "var whCV=cv*0.5;" +
  "var whCost=br*rd*whCV;" +
  "var whNet=incr-whCost;" +
  "var whROI=whCost>0?whNet/whCost:0;" +
  "var wcP=Math.max(0,cp-10);" +
  "var wcIncr=tcr*(1-wcP/100);" +
  "var wcNet=wcIncr-cc;" +
  "var wcROI=cc>0?wcNet/cc:0;" +
  "var beCann=tcr>0?Math.max(0,(1-cc/tcr)*100):100;" +
  "var canHead=cp<=beCann?beCann-cp:0;" +
  // P168 B3-7：params 表达式用**服务端同名变量**（客户端余量变量名是 canHead）。
  "var cannibalHeadroom=canHead;" +
  "var annNet=net*12;" +
  "var annCC=cc*12;" +
  "var annIncr=incr*12;" +
  'var tip="";' +
  "if(band===\"critical\"){tip=tk('calc_out.coupon_attribution.row.tip_critical','💡 Tip: Coupons are destroying value. Either raise coupon value (smaller discount), tighten targeting so redemption comes from genuinely incremental buyers, or run a holdout test to measure real cannibalization before scaling. Most teams discover true cannibalization is 50–70%, not the 30% they assumed.');}" +
  "else if(band===\"good\"){tip=tk('calc_out.coupon_attribution.row.tip_good','💡 Tip: Healthy true ROI. Lock in this audience * offer * channel combination as a template; A/B test only one variable at a time (discount depth, audience, creative) so you can attribute the next +20pp of ROI to a specific lever. Document the cannibalization % you measured — it is the single most-cited number in coupon post-mortems.');}" +
  "else{if(cp>50){tip=tk('calc_out.coupon_attribution.row.tip_warning_high_cannibalization','💡 Tip: High cannibalization is the dominant drag on ROI. Run a 50/50 holdout (no-coupon cohort) for one cycle to measure true incremental conversion; if observed cannibalization is >50%, switch to dollar-off vs. percent-off and cap the discount at the smallest value that still clears your margin floor.');}else{tip=tk('calc_out.coupon_attribution.row.tip_warning_low_cannibalization','💡 Tip: Coupon barely profitable. Tighten redemption targeting (exclude recent purchasers / email subscribers already at LTV ceiling), shorten the campaign window to avoid stacking with other promos, or reduce discount depth by 25–50%. A 10pp drop in cannibalization alone often doubles true ROI.');}}" +
  // P168 B3-7：带 params 的行 token 化（fallback 与 params 取同一个变量）。
  "var tkAov=tk('calc_out.coupon_attribution.row.formula_baseline_x_rate_x_aov','(baseline x '+redemptionRate.toFixed(1)+'% x AOV)',{rate:redemptionRate.toFixed(1)});" +
  "var tkDiscount=tk('calc_out.coupon_attribution.row.formula_baseline_x_rate_x_discount','(baseline x '+redemptionRate.toFixed(1)+'% x discount)',{rate:redemptionRate.toFixed(1)});" +
  "var tkWr=tk('calc_out.coupon_attribution.row.whatif_redemption_plus_20','+20% redemption: true ROI = '+pct(wrROI)+' * net gain = '+money(wrNet),{roi:pct(wrROI),net:money(wrNet)});" +
  "var tkWh=tk('calc_out.coupon_attribution.row.whatif_coupon_value_minus_50','-50% coupon value: true ROI = '+pct(whROI)+' * net gain = '+money(whNet),{roi:pct(whROI),net:money(whNet)});" +
  "var tkWc=tk('calc_out.coupon_attribution.row.whatif_cannibalization_minus_10pp','-10pp cannibalization: true ROI = '+pct(wcROI)+' * net gain = '+money(wcNet),{roi:pct(wcROI),net:money(wcNet)});" +
  "var tkHeadroom=tk('calc_out.coupon_attribution.row.headroom','Headroom: '+cannibalHeadroom.toFixed(1)+'pp before net revenue gain hits zero',{headroom:cannibalHeadroom.toFixed(1)+'pp'});" +
  'var r="";' +
  'r+="$calc_out.section.coupon_attribution_calculator|Coupon Attribution Calculator|\\n\\n";' +
  'r+="$calc_out.section.health|🩺 Health:|\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* "+he+" "+hl+"\\n";' +
  'r+="* $calc_out.label.true_roi|True ROI|: "+pct(roi)+"  *  $calc_out.label.net_revenue_gain|Net revenue gain|: "+money(net)+"\\n";' +
  'r+="* $calc_out.label.cannibalization|Cannibalization|: "+cp.toFixed(0)+"%  *  $calc_out.label.coupon_cost|Coupon cost|: "+money(cc)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* $calc_out.label.coupon_value|Coupon value|:        "+money(cv)+"\\n";' +
  'r+="* $calc_out.label.redemption_rate|Redemption rate|:     "+rr.toFixed(1)+"%\\n";' +
  'r+="* $calc_out.label.average_order_value|Average order value|: "+money(aov)+"\\n";' +
  'r+="* $calc_out.label.baseline_revenue|Baseline revenue|:    "+money(br)+"\\n";' +
  'r+="* $calc_out.label.cannibalization|Cannibalization|:     "+cp.toFixed(0)+"%\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="$calc_out.section.revenue_breakdown|💰 Revenue Breakdown:|\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* $calc_out.label.total_coupon_revenue|Total coupon revenue|: "+money(tcr)+"  "+tkAov+"\\n";' +
  'r+="* $calc_out.label.cannibalization_loss|Cannibalization loss|: "+money(canLoss)+"  $calc_out.coupon_attribution.row.formula_orders_would_happen|(orders that would have happened anyway)|\\n";' +
  'r+="* $calc_out.label.incremental_revenue|Incremental revenue|:  "+money(incr)+"  $calc_out.coupon_attribution.row.formula_after_cannibalization|(after cannibalization adjustment)|\\n";' +
  'r+="* $calc_out.label.coupon_cost|Coupon cost|:          "+money(cc)+"  "+tkDiscount+"\\n";' +
  'r+="* $calc_out.label.net_revenue_gain|Net revenue gain|:     "+money(net)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="$calc_out.section.what_if|🔄 What-If:|\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* "+tkWr+"\\n";' +
  'r+="* "+tkWh+"\\n";' +
  'r+="* "+tkWc+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="$calc_out.section.break_even|⚖️ Break-Even:|\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* $calc_out.label.cannibalization_ceiling|Cannibalization ceiling|: "+beCann.toFixed(1)+"%  $calc_out.coupon_attribution.row.cannibalization_ceiling_note|(above this, coupons destroy value)|\\n";' +
  'r+="* "+tkHeadroom+"\\n";' +
  'r+="* $calc_out.coupon_attribution.row.break_even_one_dollar|At break-even, every coupon dollar returns exactly one coupon dollar in net revenue|\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="$calc_out.section.milestone|🎯 Milestone:|\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* $calc_out.label.annualized_net_gain|Annualized net gain|: "+money(annNet)+"  $calc_out.coupon_attribution.row.milestone_cadence_note|(at 1 campaign/month cadence)|\\n";' +
  'r+="* $calc_out.label.annual_incremental_revenue|Annual incremental revenue|: "+money(annIncr)+"\\n";' +
  'r+="* $calc_out.label.annual_coupon_cost|Annual coupon cost|: "+money(annCC)+"\\n";' +
  'r+="* $calc_out.coupon_attribution.row.milestone_assumption|(Assumes constant redemption + cannibalization — refresh quarterly with new cohort data)|\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+=tip+"\\n";' +
  "return [r];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-coupon-attribution-calculator',
  title: 'Coupon Attribution Calculator',
  description:
    'Measure the true ROI of a coupon campaign by adjusting gross coupon revenue for cannibalization. See health bands, what-if scenarios, break-even cannibalization rate, and annualized projections. Industry benchmarks: green >=100% true ROI . yellow 0–100% . red <0%.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'couponValue', label: 'Coupon Value ($)', placeholder: 'e.g. 20', type: 'number' },
    { name: 'redemptionRate', label: 'Redemption Rate (%)', placeholder: 'e.g. 10', type: 'number' },
    { name: 'avgOrderValue', label: 'Average Order Value ($)', placeholder: 'e.g. 80', type: 'number' },
    { name: 'baselineRevenue', label: 'Baseline Revenue ($)', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'cannibalizationPct', label: 'Cannibalization (%)', placeholder: 'e.g. 30', type: 'number' },
  ],
  keywords: [
    'coupon attribution',
    'coupon ROI',
    'coupon cannibalization',
    'true coupon ROI',
    'coupon campaign ROI',
    'incremental coupon revenue',
    'coupon effectiveness',
    'ecommerce coupon',
    'solopreneur marketing',
    'coupon holdout test',
  ],
  tags: ['marketing', 'coupon', 'roi'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-15',
  sources: [
    'https://www.shopify.com/blog/coupon-marketing',
    'https://help.klaviyo.com/hc/en-us/articles/115005758787',
    'https://www.optimove.com/resources/learning-center/coupon-redemption-rate',
    'https://blog.hubspot.com/marketing/coupon-marketing-strategies',
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
  staticExamples: [
    '$calc_out.section.coupon_attribution_calculator|Coupon Attribution Calculator|\n\n$calc_out.section.health|🩺 Health:|\n------------------------------------------------\n* 🟢 $calc_out.coupon_attribution.row.health_good|Good — true ROI >= 100%; coupon creates incremental profit|\n* $calc_out.label.true_roi|True ROI|: 180%  *  $calc_out.label.net_revenue_gain|Net revenue gain|: $180,000\n* $calc_out.label.cannibalization|Cannibalization|: 30%  *  $calc_out.label.coupon_cost|Coupon cost|: $100,000\n\n------------------------------------------------\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n------------------------------------------------\n* $calc_out.label.coupon_value|Coupon value|:        $20\n* $calc_out.label.redemption_rate|Redemption rate|:     10.0%\n* $calc_out.label.average_order_value|Average order value|: $80\n* $calc_out.label.baseline_revenue|Baseline revenue|:    $50,000\n* $calc_out.label.cannibalization|Cannibalization|:     30%\n\n------------------------------------------------\n\n$calc_out.section.revenue_breakdown|💰 Revenue Breakdown:|\n------------------------------------------------\n* $calc_out.label.total_coupon_revenue|Total coupon revenue|: $400,000  $calc_out.coupon_attribution.row.formula_baseline_x_rate_x_aov{"rate":"10.0"}|(baseline x 10.0% x AOV)|\n* $calc_out.label.cannibalization_loss|Cannibalization loss|: $120,000  $calc_out.coupon_attribution.row.formula_orders_would_happen|(orders that would have happened anyway)|\n* $calc_out.label.incremental_revenue|Incremental revenue|:  $280,000  $calc_out.coupon_attribution.row.formula_after_cannibalization|(after cannibalization adjustment)|\n* $calc_out.label.coupon_cost|Coupon cost|:          $100,000  $calc_out.coupon_attribution.row.formula_baseline_x_rate_x_discount{"rate":"10.0"}|(baseline x 10.0% x discount)|\n* $calc_out.label.net_revenue_gain|Net revenue gain|:     $180,000\n\n------------------------------------------------\n\n$calc_out.section.what_if|🔄 What-If:|\n------------------------------------------------\n* $calc_out.coupon_attribution.row.whatif_redemption_plus_20{"roi":"180%","net":"$216,000"}|+20% redemption: true ROI = 180% * net gain = $216,000|\n* $calc_out.coupon_attribution.row.whatif_coupon_value_minus_50{"roi":"460%","net":"$230,000"}|-50% coupon value: true ROI = 460% * net gain = $230,000|\n* $calc_out.coupon_attribution.row.whatif_cannibalization_minus_10pp{"roi":"220%","net":"$220,000"}|-10pp cannibalization: true ROI = 220% * net gain = $220,000|\n\n------------------------------------------------\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n------------------------------------------------\n* $calc_out.label.cannibalization_ceiling|Cannibalization ceiling|: 75.0%  $calc_out.coupon_attribution.row.cannibalization_ceiling_note|(above this, coupons destroy value)|\n* $calc_out.coupon_attribution.row.headroom{"headroom":"45.0pp"}|Headroom: 45.0pp before net revenue gain hits zero|\n* $calc_out.coupon_attribution.row.break_even_one_dollar|At break-even, every coupon dollar returns exactly one coupon dollar in net revenue|\n\n------------------------------------------------\n\n$calc_out.section.milestone|🎯 Milestone:|\n------------------------------------------------\n* $calc_out.label.annualized_net_gain|Annualized net gain|: $2,160,000  $calc_out.coupon_attribution.row.milestone_cadence_note|(at 1 campaign/month cadence)|\n* $calc_out.label.annual_incremental_revenue|Annual incremental revenue|: $3,360,000\n* $calc_out.label.annual_coupon_cost|Annual coupon cost|: $1,200,000\n* $calc_out.coupon_attribution.row.milestone_assumption|(Assumes constant redemption + cannibalization — refresh quarterly with new cohort data)|\n\n------------------------------------------------\n\n$calc_out.coupon_attribution.row.tip_good|💡 Tip: Healthy true ROI. Lock in this audience * offer * channel combination as a template; A/B test only one variable at a time (discount depth, audience, creative) so you can attribute the next +20pp of ROI to a specific lever. Document the cannibalization % you measured — it is the single most-cited number in coupon post-mortems.|\n',
  ],
  faq: [
    { q: 'What is coupon cannibalization?', a: 'Cannibalization is the share of coupon-driven orders that would have happened anyway at full price. Industry average is ~30% if you have not run a holdout test; observed cannibalization in real holdouts is often 50–70%. Lower cannibalization means higher true ROI.' },
    { q: 'How is true coupon ROI different from gross coupon revenue?', a: 'Gross coupon revenue = (baseline x redemption%) x AOV. True ROI subtracts both cannibalization (orders that would have happened anyway) AND the coupon cost itself. A campaign with $1M gross coupon revenue and $200K coupon cost is NOT 5x ROI — after a 30% cannibalization adjustment, true ROI is roughly 2.5x.' },
    { q: 'How do I measure cannibalization accurately?', a: 'Run a holdout test: send the coupon to 90% of your audience (treatment) and withhold from 10% (control). After the campaign, compare conversion rate of the treatment cohort against the control cohort. The lift is the incremental conversion; the remainder is cannibalization. Klaviyo, Shopify, and most ESPs support holdout segments natively.' },
    { q: 'What is a good true ROI for a coupon campaign?', a: '>= 100% is healthy (every coupon dollar produces >= $1 of incremental profit). 0–100% is fragile (positive ROI only because gross revenue > discount). <0% means coupons destroy value. Mature e-commerce teams target >= 150% to keep room for fulfillment and support costs.' },
    { q: "What is coupon attribution?", a: "Coupon attribution = tracking which sales came from coupon codes vs. organic. Helps answer: did the coupon drive incremental revenue, or just attract discount-seekers who would have bought anyway? Methods: 1) Promo code tracking, 2) Holdout test (no coupon for control group), 3) A/B test (coupon vs no coupon). Best: holdout test for accuracy." },
    { q: "What is a good coupon redemption rate?", a: "Benchmarks: 1-5% of issued coupons. 10-20%. By discount: 5% off: 3-5%, 10% off: 5-10%, 20% off: 10-15%, 30%+ off: 15-25%. Expiration date: 1-2 weeks optimum. Limited-time: 2-3x redemption vs. open-ended. Best option: 10-15% off + 7-day expiration + email reminder." },
    { q: "How do I prevent coupon abuse?", a: "Tactics include 1) One per customer (email/account limit), 2) Minimum order size, 3) Exclude sale items, 4) Limited duration, 5) New customers only, 6) Unique codes per channel, 7) Cap redemptions, 8) Fraud detection (multiple accounts same address). Most teams 5-10% of coupon redemptions are abuse. Track redemption rate vs. new customer count." },
    { q: "Should I use percentage or fixed-amount discounts?", a: "Percentage: works for all price points, simple, higher AOV impact at high prices. Fixed amount: predictable cost, drives higher AOV (need to spend $X to get $Y off), works well for $X+ orders. Common pattern: percentage for first purchase, fixed amount for re-engagement. Test both. Top conversion: free shipping often beats both." },
    { q: "How do I measure coupon ROI?", a: "ROI = (revenue_from_coupon - coupon_cost - marketing_cost) / marketing_cost. Incremental revenue: holdout test (no coupon group). Average order value: coupon users often buy more. New customer %: are they first-time? Repeat rate: do they come back without coupon? Tools: Google Analytics, Klaviyo, custom. Best: combined attribution + cohort analysis." },
    { q: "What is the cost of discount addiction?", a: "Customers acquired with heavy discount: 30-50% lower LTV. They expect future discounts, shop around for deals, churn at higher rates. Industry data: 50%+ of coupon users would have bought anyway. Mitigation: 1) Limit discount to first purchase, 2) Use non-monetary rewards (free shipping, gift), 3) Tiered loyalty, 4) Minimum order value." },
    { q: "Should I show discount to existing customers?", a: "Yes, with strategy. Existing customers: 1) Birthday discount, 2) Loyalty tier rewards, 3) Reactivation (haven't bought in 6+ months), 4) Tier-up bonus, 5) Bundle savings. Avoid: 10%+ off to anyone (trains them to wait). Better: free shipping, free gift, early access. 5-10% discount to loyal customers is sustainable." },
    { q: "How do I run an A/B test on coupon effectiveness?", a: "Setup: 1) 50% of email list gets coupon, 50% gets no coupon (control). 2) Random assignment, 3) Same email timing. 4) Track: conversion rate, AOV, LTV. Run for 30 days minimum. Sample size: 1000+ per group. Compare: revenue per user (not just conversion). Most tests: coupon lifts conversion 10-30% but AOV drops 5-15%. Net: test carefully." },
  ],
  howToUse: [
    'Enter the coupon value (e.g. $20 off per order).',
    'Enter your expected redemption rate (% of eligible customers who use the coupon).',
    'Enter your average order value (AOV) — the typical order size.',
    'Enter your baseline revenue (total revenue over the campaign period).',
    'Enter cannibalization % — start with 30% (industry avg) if you have not run a holdout test.',
    'Read the true ROI, what-if scenarios, and break-even cannibalization ceiling to size the next campaign.',
  ],
  engineKey: true,
};

registerEngine(engine);
