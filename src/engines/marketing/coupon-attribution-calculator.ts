import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

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

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const couponValue = clampNonNegative(parseFloat(inputs.couponValue) || 0);
  const redemptionRate = clampNonNegative(parseFloat(inputs.redemptionRate) || 0);
  const avgOrderValue = clampNonNegative(parseFloat(inputs.avgOrderValue) || 0);
  const baselineRevenue = clampNonNegative(parseFloat(inputs.baselineRevenue) || 0);
  const cannibalizationPct = clampNonNegative(parseFloat(inputs.cannibalizationPct) || 0);

  if (baselineRevenue === 0) {
    return [
      'Coupon Attribution Calculator\n\n' +
        'Enter your baseline revenue, coupon value, redemption rate, AOV, and cannibalization % to compute the true ROI of your coupon campaign.',
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
  const healthEmoji = band === 'good' ? 'G' : band === 'warning' ? 'Y' : 'R';
  const healthLabel = HEALTH_BANDS[band].label;

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
    tip =
      'Coupons are destroying value. Either raise coupon value (smaller discount), tighten targeting so redemption comes from genuinely incremental buyers, or run a holdout test to measure real cannibalization before scaling. Most teams discover true cannibalization is 50–70%, not the 30% they assumed.';
  } else if (band === 'good') {
    tip =
      'Healthy true ROI. Lock in this audience * offer * channel combination as a template; A/B test only one variable at a time (discount depth, audience, creative) so you can attribute the next +20pp of ROI to a specific lever. Document the cannibalization % you measured — it is the single most-cited number in coupon post-mortems.';
  } else {
    // warning band
    if (cannibalizationPct > 50) {
      tip =
        'High cannibalization is the dominant drag on ROI. Run a 50/50 holdout (no-coupon cohort) for one cycle to measure true incremental conversion; if observed cannibalization is >50%, switch to dollar-off vs. percent-off and cap the discount at the smallest value that still clears your margin floor.';
    } else {
      tip =
        'Coupon barely profitable. Tighten redemption targeting (exclude recent purchasers / email subscribers already at LTV ceiling), shorten the campaign window to avoid stacking with other promos, or reduce discount depth by 25–50%. A 10pp drop in cannibalization alone often doubles true ROI.';
    }
  }

  const r =
    'Coupon Attribution Calculator\n\n' +
    'Health:\n' +
    '------------------------------------------------\n' +
    '* ' + healthEmoji + ' ' + healthLabel + '\n' +
    '* True ROI: ' + pct(trueROI) + '  *  Net revenue gain: ' + money(netRevenueGain) + '\n' +
    '* Cannibalization: ' + cannibalizationPct.toFixed(0) + '%  *  Coupon cost: ' + money(couponCost) + '\n\n' +
    '------------------------------------------------\n\n' +
    'Inputs Snapshot:\n' +
    '------------------------------------------------\n' +
    '* Coupon value:        ' + money(couponValue) + '\n' +
    '* Redemption rate:     ' + redemptionRate.toFixed(1) + '%\n' +
    '* Average order value: ' + money(avgOrderValue) + '\n' +
    '* Baseline revenue:    ' + money(baselineRevenue) + '\n' +
    '* Cannibalization:     ' + cannibalizationPct.toFixed(0) + '%\n\n' +
    '------------------------------------------------\n\n' +
    'Revenue Breakdown:\n' +
    '------------------------------------------------\n' +
    '* Total coupon revenue: ' + money(totalCouponRevenue) + '  (baseline x ' + redemptionRate.toFixed(1) + '% x AOV)\n' +
    '* Cannibalization loss: ' + money(cannibalizationLoss) + '  (orders that would have happened anyway)\n' +
    '* Incremental revenue:  ' + money(incrementalRevenue) + '  (after cannibalization adjustment)\n' +
    '* Coupon cost:          ' + money(couponCost) + '  (baseline x ' + redemptionRate.toFixed(1) + '% x discount)\n' +
    '* Net revenue gain:     ' + money(netRevenueGain) + '\n\n' +
    '------------------------------------------------\n\n' +
    'What-If:\n' +
    '------------------------------------------------\n' +
    '* +20% redemption: true ROI = ' + pct(wrROI) + ' * net gain = ' + money(wrNet) + '\n' +
    '* -50% coupon value: true ROI = ' + pct(whROI) + ' * net gain = ' + money(whNet) + '\n' +
    '* -10pp cannibalization: true ROI = ' + pct(wcROI) + ' * net gain = ' + money(wcNet) + '\n\n' +
    '------------------------------------------------\n\n' +
    'Break-Even:\n' +
    '------------------------------------------------\n' +
    '* Cannibalization ceiling: ' + breakEvenCannibalPct.toFixed(1) + '%  (above this, coupons destroy value)\n' +
    '* Headroom: ' + cannibalHeadroom.toFixed(1) + 'pp before net revenue gain hits zero\n' +
    '* At break-even, every coupon dollar returns exactly one coupon dollar in net revenue\n\n' +
    '------------------------------------------------\n\n' +
    'Milestone:\n' +
    '------------------------------------------------\n' +
    '* Annualized net gain: ' + money(annualNetGain) + '  (at 1 campaign/month cadence)\n' +
    '* Annual incremental revenue: ' + money(annualIncrementalRevenue) + '\n' +
    '* Annual coupon cost: ' + money(annualCouponCost) + '\n' +
    '* (Assumes constant redemption + cannibalization — refresh quarterly with new cohort data)\n\n' +
    '------------------------------------------------\n\n' +
    'Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "var cnn=function(x){return Math.max(0,x)};" +
  "var cv=cnn(parseFloat(inputs.couponValue)||0);" +
  "var rr=cnn(parseFloat(inputs.redemptionRate)||0);" +
  "var aov=cnn(parseFloat(inputs.avgOrderValue)||0);" +
  "var br=cnn(parseFloat(inputs.baselineRevenue)||0);" +
  "var cp=cnn(parseFloat(inputs.cannibalizationPct)||0);" +
  'if(br===0){return["Coupon Attribution Calculator\\n\\nEnter your baseline revenue, coupon value, redemption rate, AOV, and cannibalization % to compute the true ROI of your coupon campaign."];}' +
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
  'var he=band==="good"?"G":(band==="warning"?"Y":"R");' +
  'var hl=band==="good"?"Good — true ROI >= 100%; coupon creates incremental profit":(band==="warning"?"Warning — true ROI 0–100%; coupon barely profitable, fragile":"Critical — true ROI < 0%; coupon destroys value");' +
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
  "var annNet=net*12;" +
  "var annCC=cc*12;" +
  "var annIncr=incr*12;" +
  'var tip="";' +
  'if(band==="critical"){tip="Coupons are destroying value. Either raise coupon value (smaller discount), tighten targeting so redemption comes from genuinely incremental buyers, or run a holdout test to measure real cannibalization before scaling. Most teams discover true cannibalization is 50–70%, not the 30% they assumed.";}' +
  'else if(band==="good"){tip="Healthy true ROI. Lock in this audience * offer * channel combination as a template; A/B test only one variable at a time (discount depth, audience, creative) so you can attribute the next +20pp of ROI to a specific lever. Document the cannibalization % you measured — it is the single most-cited number in coupon post-mortems.";}' +
  'else{if(cp>50){tip="High cannibalization is the dominant drag on ROI. Run a 50/50 holdout (no-coupon cohort) for one cycle to measure true incremental conversion; if observed cannibalization is >50%, switch to dollar-off vs. percent-off and cap the discount at the smallest value that still clears your margin floor.";}else{tip="Coupon barely profitable. Tighten redemption targeting (exclude recent purchasers / email subscribers already at LTV ceiling), shorten the campaign window to avoid stacking with other promos, or reduce discount depth by 25–50%. A 10pp drop in cannibalization alone often doubles true ROI.";}}' +
  'var r="";' +
  'r+="Coupon Attribution Calculator\\n\\n";' +
  'r+="Health:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* "+he+" "+hl+"\\n";' +
  'r+="* True ROI: "+pct(roi)+"  *  Net revenue gain: "+money(net)+"\\n";' +
  'r+="* Cannibalization: "+cp.toFixed(0)+"%  *  Coupon cost: "+money(cc)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="Inputs Snapshot:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Coupon value:        "+money(cv)+"\\n";' +
  'r+="* Redemption rate:     "+rr.toFixed(1)+"%\\n";' +
  'r+="* Average order value: "+money(aov)+"\\n";' +
  'r+="* Baseline revenue:    "+money(br)+"\\n";' +
  'r+="* Cannibalization:     "+cp.toFixed(0)+"%\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="Revenue Breakdown:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Total coupon revenue: "+money(tcr)+"  (baseline x "+rr.toFixed(1)+"% x AOV)\\n";' +
  'r+="* Cannibalization loss: "+money(canLoss)+"  (orders that would have happened anyway)\\n";' +
  'r+="* Incremental revenue:  "+money(incr)+"  (after cannibalization adjustment)\\n";' +
  'r+="* Coupon cost:          "+money(cc)+"  (baseline x "+rr.toFixed(1)+"% x discount)\\n";' +
  'r+="* Net revenue gain:     "+money(net)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="What-If:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* +20% redemption: true ROI = "+pct(wrROI)+" * net gain = "+money(wrNet)+"\\n";' +
  'r+="* -50% coupon value: true ROI = "+pct(whROI)+" * net gain = "+money(whNet)+"\\n";' +
  'r+="* -10pp cannibalization: true ROI = "+pct(wcROI)+" * net gain = "+money(wcNet)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="Break-Even:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Cannibalization ceiling: "+beCann.toFixed(1)+"%  (above this, coupons destroy value)\\n";' +
  'r+="* Headroom: "+canHead.toFixed(1)+"pp before net revenue gain hits zero\\n";' +
  'r+="* At break-even, every coupon dollar returns exactly one coupon dollar in net revenue\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="Milestone:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Annualized net gain: "+money(annNet)+"  (at 1 campaign/month cadence)\\n";' +
  'r+="* Annual incremental revenue: "+money(annIncr)+"\\n";' +
  'r+="* Annual coupon cost: "+money(annCC)+"\\n";' +
  'r+="* (Assumes constant redemption + cannibalization — refresh quarterly with new cohort data)\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="Tip: "+tip+"\\n";' +
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
  generate: calculate,
  staticExamples: [
    'Coupon Attribution Calculator\n\nHealth:\n------------------------------------------------\n* G Good — true ROI >= 100%; coupon creates incremental profit\n* True ROI: 180%  *  Net revenue gain: $180,000\n* Cannibalization: 30%  *  Coupon cost: $100,000\n\n------------------------------------------------\n\nInputs Snapshot:\n------------------------------------------------\n* Coupon value:        $20\n* Redemption rate:     10.0%\n* Average order value: $80\n* Baseline revenue:    $50,000\n* Cannibalization:     30%\n\n------------------------------------------------\n\nRevenue Breakdown:\n------------------------------------------------\n* Total coupon revenue: $400,000  (baseline x 10.0% x AOV)\n* Cannibalization loss: $120,000  (orders that would have happened anyway)\n* Incremental revenue:  $280,000  (after cannibalization adjustment)\n* Coupon cost:          $100,000  (baseline x 10.0% x discount)\n* Net revenue gain:     $180,000\n\n------------------------------------------------\n\nWhat-If:\n------------------------------------------------\n* +20% redemption: true ROI = 180% * net gain = $216,000\n* -50% coupon value: true ROI = 460% * net gain = $230,000\n* -10pp cannibalization: true ROI = 220% * net gain = $220,000\n\n------------------------------------------------\n\nBreak-Even:\n------------------------------------------------\n* Cannibalization ceiling: 75.0%  (above this, coupons destroy value)\n* Headroom: 45.0pp before net revenue gain hits zero\n* At break-even, every coupon dollar returns exactly one coupon dollar in net revenue\n\n------------------------------------------------\n\nMilestone:\n------------------------------------------------\n* Annualized net gain: $2,160,000  (at 1 campaign/month cadence)\n* Annual incremental revenue: $3,360,000\n* Annual coupon cost: $1,200,000\n* (Assumes constant redemption + cannibalization — refresh quarterly with new cohort data)\n\n------------------------------------------------\n\nTip: Healthy true ROI. Lock in this audience * offer * channel combination as a template; A/B test only one variable at a time (discount depth, audience, creative) so you can attribute the next +20pp of ROI to a specific lever. Document the cannibalization % you measured — it is the single most-cited number in coupon post-mortems.\n',
  ],
  faq: [
    { q: 'What is coupon cannibalization?', a: 'Cannibalization is the share of coupon-driven orders that would have happened anyway at full price. Industry average is ~30% if you have not run a holdout test; observed cannibalization in real holdouts is often 50–70%. Lower cannibalization means higher true ROI.' },
    { q: 'How is true coupon ROI different from gross coupon revenue?', a: 'Gross coupon revenue = (baseline x redemption%) x AOV. True ROI subtracts both cannibalization (orders that would have happened anyway) AND the coupon cost itself. A campaign with $1M gross coupon revenue and $200K coupon cost is NOT 5x ROI — after a 30% cannibalization adjustment, true ROI is roughly 2.5x.' },
    { q: 'How do I measure cannibalization accurately?', a: 'Run a holdout test: send the coupon to 90% of your audience (treatment) and withhold from 10% (control). After the campaign, compare conversion rate of the treatment cohort against the control cohort. The lift is the incremental conversion; the remainder is cannibalization. Klaviyo, Shopify, and most ESPs support holdout segments natively.' },
    { q: 'What is a good true ROI for a coupon campaign?', a: '>= 100% is healthy (every coupon dollar produces >= $1 of incremental profit). 0–100% is fragile (positive ROI only because gross revenue > discount). <0% means coupons destroy value. Mature e-commerce teams target >= 150% to keep room for fulfillment and support costs.' },
  ],
  howToUse: [
    'Enter the coupon value (e.g. $20 off per order).',
    'Enter your expected redemption rate (% of eligible customers who use the coupon).',
    'Enter your average order value (AOV) — the typical order size.',
    'Enter your baseline revenue (total revenue over the campaign period).',
    'Enter cannibalization % — start with 30% (industry avg) if you have not run a holdout test.',
    'Read the true ROI, what-if scenarios, and break-even cannibalization ceiling to size the next campaign.',
  ],
};

registerEngine(engine);