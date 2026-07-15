import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// =====================================================================
// Cart Abandonment Cost Calculator (P16-2) — Business v3 standard
// =====================================================================
// Engine #100 — the 100-engine milestone. Models the cost of cart abandonment
// and the ROI of a recovery campaign (email + SMS retargeting for abandoned
// carts). Industry standard funnel: traffic -> cart_add -> abandon -> recover.
//
// Formula (Baymard Institute / Shopify / Klaviyo standard):
//   cart_creations     = monthly_traffic * (cart_add_rate / 100)
//   completed_orders   = cart_creations * (1 - cart_abandonment_rate / 100)
//   abandoned_carts    = cart_creations * (cart_abandonment_rate / 100)
//   lost_revenue       = abandoned_carts * avg_order_value
//   recoverable_rev    = lost_revenue * (recovery_rate / 100)
//   recovery_cost      = abandoned_carts * recovery_cost_per_send
//   recovery_net_gain  = recoverable_rev - recovery_cost
//   recovery_roi       = recoverable_rev / recovery_cost  (12.80 = 1280%)
//
// Health bands on recovery_roi: green >=300% . yellow 100-300% . red <100%
//   - Good: every recovery dollar produces >=$3 of recovered revenue.
//   - Warning: recovery barely covers its own cost (fragile).
//   - Critical: recovery campaigns destroy value.
//
// Industry benchmarks:
//   Cart abandonment rate: 65-80% (Baymard 2024: 70.19% avg)
//   Cart recovery rate (email): 5-15% (Klaviyo avg: 8%)
//   Cart recovery rate (SMS): 20-30%
//   Recovery cost per send: $0.10-$2.00

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  good: { threshold: 3.0, label: 'Good — recovery ROI >= 300%; recovery spend is highly profitable' },
  warning: { threshold: 1.0, label: 'Warning — recovery ROI 100–300%; recovery spend barely profitable' },
  critical: { threshold: -Infinity, label: 'Critical — recovery ROI < 100%; recovery spend destroys value' },
} as const;

// ============== Math helpers ==============

/**
 * Recovery ROI ratio (12.80 = 1280%) of a cart abandonment recovery campaign.
 * Returns 0 when recovery_cost is 0 (avoids NaN/Infinity in band comparators).
 */
export function calcRecoveryROI(
  monthlyTraffic: number,
  cartAddRatePct: number,
  cartAbandonmentRatePct: number,
  avgOrderValue: number,
  recoveryRatePct: number,
  recoveryCostPerSend: number
): number {
  const addRate = cartAddRatePct / 100;
  const abandonRate = cartAbandonmentRatePct / 100;
  const recoveryRate = recoveryRatePct / 100;

  const cartCreations = monthlyTraffic * addRate;
  const abandonedCarts = cartCreations * abandonRate;
  const recoverableRevenue = abandonedCarts * avgOrderValue * recoveryRate;
  const recoveryCost = abandonedCarts * recoveryCostPerSend;

  if (recoveryCost <= 0) return 0;
  return recoverableRevenue / recoveryCost;
}

/** Map recovery ROI ratio to health band. */
export function calcHealthBand(roi: number): 'good' | 'warning' | 'critical' {
  if (roi >= HEALTH_BANDS.good.threshold) return 'good';
  if (roi >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

// ============== calculate() ==============

function calculate(inputs: Record<string, string>): string[] {
  const monthlyTraffic = clampNonNegative(parseFloat(inputs.monthlyTraffic) || 0);
  const cartAddRate = clampNonNegative(parseFloat(inputs.cartAddRate) || 0);
  const cartAbandonmentRate = clampNonNegative(parseFloat(inputs.cartAbandonmentRate) || 0);
  const avgOrderValue = clampNonNegative(parseFloat(inputs.avgOrderValue) || 0);
  const recoveryRate = clampNonNegative(parseFloat(inputs.recoveryRate) || 0);
  const recoveryCostPerSend = clampNonNegative(parseFloat(inputs.recoveryCostPerSend) || 0);

  if (monthlyTraffic === 0) {
    return [
      'Cart Abandonment Cost Calculator\n\n' +
        'Enter your monthly traffic, cart add rate, abandonment rate, AOV, recovery rate, and recovery cost per send to compute the recovery ROI of your cart recovery campaign.',
    ];
  }

  const addRate = cartAddRate / 100;
  const abandonRate = cartAbandonmentRate / 100;
  const recRate = recoveryRate / 100;

  const cartCreations = monthlyTraffic * addRate;
  const completedOrders = cartCreations * (1 - abandonRate);
  const abandonedCarts = cartCreations * abandonRate;
  const lostRevenue = abandonedCarts * avgOrderValue;
  const recoverableRevenue = lostRevenue * recRate;
  const recoveryCost = abandonedCarts * recoveryCostPerSend;
  const recoveryNetGain = recoverableRevenue - recoveryCost;
  const recoveryROI = recoveryCost > 0 ? recoverableRevenue / recoveryCost : 0;

  const money = (n: number) => '$' + Math.round(n).toLocaleString('en-US');
  const money2 = (n: number) => '$' + n.toLocaleString('en-US', { maximumFractionDigits: 2 });
  const pct = (n: number) => (n * 100).toFixed(0) + '%';

  const band = calcHealthBand(recoveryROI);
  const healthEmoji = band === 'good' ? '🟢' : band === 'warning' ? '🟡' : '🔴';
  const healthLabel = HEALTH_BANDS[band].label;

  // What-If scenarios:
  // (a) +50% recovery rate (better email/SMS targeting)
  const wrRR = recoveryRate * 1.5;
  const wrRecoverable = lostRevenue * (wrRR / 100);
  const wrCost = abandonedCarts * recoveryCostPerSend;
  const wrNet = wrRecoverable - wrCost;
  const wrROI = wrCost > 0 ? wrRecoverable / wrCost : 0;

  // (b) -25% recovery cost per send (cheaper SMS/email channels)
  const whCPS = recoveryCostPerSend * 0.75;
  const whCost = abandonedCarts * whCPS;
  const whNet = recoverableRevenue - whCost;
  const whROI = whCost > 0 ? recoverableRevenue / whCost : 0;

  // (c) -10pp abandonment rate (better checkout UX)
  const wcRate = Math.max(0, cartAbandonmentRate - 10);
  const wcAbandoned = cartCreations * (wcRate / 100);
  const wcLost = wcAbandoned * avgOrderValue;
  const wcRecoverable = wcLost * recRate;
  const wcCost = wcAbandoned * recoveryCostPerSend;
  const wcNet = wcRecoverable - wcCost;
  const wcROI = wcCost > 0 ? wcRecoverable / wcCost : 0;

  // Break-Even: minimum recovery_rate for ROI = 1.0 (100%)
  //   recoverable_rev / recovery_cost >= 1
  //   lost_rev * recovery_rate >= abandoned * cost_per_send
  //   recovery_rate >= (abandoned * cost_per_send) / lost_rev
  //   recovery_rate >= cost_per_send / avg_order_value
  const breakEvenRecoveryRate = avgOrderValue > 0
    ? (recoveryCostPerSend / avgOrderValue) * 100
    : 100;
  const recoveryHeadroom = recoveryRate >= breakEvenRecoveryRate
    ? recoveryRate - breakEvenRecoveryRate
    : 0;

  // Milestone: 12-month projection at current run-rate
  const annualNetGain = recoveryNetGain * 12;
  const annualLostRevenue = lostRevenue * 12;
  const annualRecoveredRevenue = recoverableRevenue * 12;

  // Tip: band-driven contextual advice
  let tip: string;
  if (band === 'critical') {
    tip =
      'Recovery spend is destroying value. Either lower recovery cost per send (switch from SMS to email, or move to triggered drip sequences rather than one-shot blasts), or focus recovery on high-AOV segments where the recovery economics work. A $0.50 send against an $80 AOV is profitable above 0.625% recovery rate; below that, the math fails.';
  } else if (band === 'good') {
    tip =
      'Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.';
  } else {
    // warning band
    if (recoveryCostPerSend > 1.0) {
      tip =
        'SMS costs ($1+ per send) dominate the recovery math. Test email-only sequences first (Klaviyo/Mailchimp average 8% recovery at ~$0.05/send) before scaling SMS to high-AOV carts only. Alternatively, move to triggered in-app messages at near-zero cost.';
    } else {
      tip =
        'Recovery barely covers its cost. Two main levers: (1) lift recovery rate from 8% toward 15% via SMS add-on, better subject lines, and dynamic product personalization, (2) lower cost per send by moving to email-dominant sequences. Either alone doubles ROI; both compound to ~5x.';
    }
  }

  const r =
    'Cart Abandonment Cost Calculator\n\n' +
    '🩺 Health:\n' +
    '------------------------------------------------\n' +
    '* ' + healthEmoji + ' ' + healthLabel + '\n' +
    '* Recovery ROI: ' + pct(recoveryROI) + '  *  Net gain: ' + money(recoveryNetGain) + '\n' +
    '* Abandonment rate: ' + cartAbandonmentRate.toFixed(0) + '%  *  Recovery rate: ' + recoveryRate.toFixed(0) + '%\n\n' +
    '------------------------------------------------\n\n' +
    '📊 Inputs Snapshot:\n' +
    '------------------------------------------------\n' +
    '* Monthly traffic:           ' + monthlyTraffic.toLocaleString('en-US') + '\n' +
    '* Cart add rate:             ' + cartAddRate.toFixed(0) + '%\n' +
    '* Cart abandonment rate:     ' + cartAbandonmentRate.toFixed(0) + '%\n' +
    '* Average order value:       ' + money(avgOrderValue) + '\n' +
    '* Recovery rate:             ' + recoveryRate.toFixed(0) + '%\n' +
    '* Recovery cost per send:    ' + money2(recoveryCostPerSend) + '\n\n' +
    '------------------------------------------------\n\n' +
    '💰 Cost Breakdown:\n' +
    '------------------------------------------------\n' +
    '* Cart creations:       ' + Math.round(cartCreations).toLocaleString('en-US') + '  (traffic x ' + cartAddRate.toFixed(0) + '% add rate)\n' +
    '* Completed orders:     ' + Math.round(completedOrders).toLocaleString('en-US') + '  (' + (100 - cartAbandonmentRate).toFixed(0) + '% conversion)\n' +
    '* Abandoned carts:      ' + Math.round(abandonedCarts).toLocaleString('en-US') + '  (cart creations x ' + cartAbandonmentRate.toFixed(0) + '%)\n' +
    '* Lost revenue:         ' + money(lostRevenue) + '  (abandoned x AOV)\n' +
    '* Recoverable revenue:  ' + money(recoverableRevenue) + '  (lost x ' + recoveryRate.toFixed(0) + '% recovery)\n' +
    '* Recovery cost:        ' + money(recoveryCost) + '  (abandoned x cost/send)\n' +
    '* Net gain:             ' + money(recoveryNetGain) + '\n\n' +
    '------------------------------------------------\n\n' +
    '🔄 What-If:\n' +
    '------------------------------------------------\n' +
    '* +50% recovery rate: recovery ROI = ' + pct(wrROI) + ' * net gain = ' + money(wrNet) + '\n' +
    '* -25% cost per send: recovery ROI = ' + pct(whROI) + ' * net gain = ' + money(whNet) + '\n' +
    '* -10pp abandonment:  recovery ROI = ' + pct(wcROI) + ' * net gain = ' + money(wcNet) + '\n\n' +
    '------------------------------------------------\n\n' +
    '⚖️ Break-Even:\n' +
    '------------------------------------------------\n' +
    '* Minimum recovery rate for 100% ROI: ' + breakEvenRecoveryRate.toFixed(2) + '%  (cost/send / AOV)\n' +
    '* Headroom: ' + recoveryHeadroom.toFixed(2) + 'pp before recovery ROI hits 100%\n' +
    '* At break-even, every recovery dollar returns exactly one recovery dollar in recovered revenue\n\n' +
    '------------------------------------------------\n\n' +
    '🎯 Milestone:\n' +
    '------------------------------------------------\n' +
    '* Annualized net gain:    ' + money(annualNetGain) + '  (at current monthly run-rate)\n' +
    '* Annual lost revenue:    ' + money(annualLostRevenue) + '\n' +
    '* Annual recovered:       ' + money(annualRecoveredRevenue) + '\n' +
    '* (Assumes constant traffic + rates — refresh quarterly with new funnel data)\n\n' +
    '------------------------------------------------\n\n' +
    '💡 Tip: ' + tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "var cnn=function(x){return Math.max(0,x)};" +
  "var mt=cnn(parseFloat(inputs.monthlyTraffic)||0);" +
  "var car=cnn(parseFloat(inputs.cartAddRate)||0);" +
  "var cab=cnn(parseFloat(inputs.cartAbandonmentRate)||0);" +
  "var aov=cnn(parseFloat(inputs.avgOrderValue)||0);" +
  "var rr=cnn(parseFloat(inputs.recoveryRate)||0);" +
  "var rcps=cnn(parseFloat(inputs.recoveryCostPerSend)||0);" +
  'if(mt===0){return["Cart Abandonment Cost Calculator\\n\\nEnter your monthly traffic, cart add rate, abandonment rate, AOV, recovery rate, and recovery cost per send to compute the recovery ROI of your cart recovery campaign."];}' +
  "var ar=car/100,abr=cab/100,recR=rr/100;" +
  "var cc=mt*ar;" +
  "var co=cc*(1-abr);" +
  "var ac=cc*abr;" +
  "var lr=ac*aov;" +
  "var rev=lr*recR;" +
  "var cost=ac*rcps;" +
  "var net=rev-cost;" +
  "var roi=cost>0?rev/cost:0;" +
  'function money(n){return "$"+Math.round(n).toLocaleString("en-US");}' +
  'function money2(n){return "$"+n.toLocaleString("en-US",{maximumFractionDigits:2});}' +
  'function pct(n){return (n*100).toFixed(0)+"%";}' +
  'var band=roi>=3?"good":(roi>=1?"warning":"critical");' +
  'var he=band==="good"?"🟢":(band==="warning"?"🟡":"🔴");' +
  'var hl=band==="good"?"Good — recovery ROI >= 300%; recovery spend is highly profitable":(band==="warning"?"Warning — recovery ROI 100–300%; recovery spend barely profitable":"Critical — recovery ROI < 100%; recovery spend destroys value");' +
  "var wrRR=rr*1.5;" +
  "var wrR=lr*(wrRR/100);" +
  "var wrC=ac*rcps;" +
  "var wrN=wrR-wrC;" +
  "var wrROI=wrC>0?wrR/wrC:0;" +
  "var whCPS=rcps*0.75;" +
  "var whC=ac*whCPS;" +
  "var whN=rev-whC;" +
  "var whROI=whC>0?rev/whC:0;" +
  "var wcRate=Math.max(0,cab-10);" +
  "var wcAc=cc*(wcRate/100);" +
  "var wcLr=wcAc*aov;" +
  "var wcR=wcLr*recR;" +
  "var wcC=wcAc*rcps;" +
  "var wcN=wcR-wcC;" +
  "var wcROI=wcC>0?wcR/wcC:0;" +
  "var beRR=aov>0?(rcps/aov)*100:100;" +
  "var recHead=rr>=beRR?rr-beRR:0;" +
  "var annNet=net*12;" +
  "var annLR=lr*12;" +
  "var annRev=rev*12;" +
  'var tip="";' +
  'if(band==="critical"){tip="Recovery spend is destroying value. Either lower recovery cost per send (switch from SMS to email, or move to triggered drip sequences rather than one-shot blasts), or focus recovery on high-AOV segments where the recovery economics work. A $0.50 send against an $80 AOV is profitable above 0.625% recovery rate; below that, the math fails.";}' +
  'else if(band==="good"){tip="Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.";}' +
  'else{if(rcps>1){tip="SMS costs ($1+ per send) dominate the recovery math. Test email-only sequences first (Klaviyo/Mailchimp average 8% recovery at ~$0.05/send) before scaling SMS to high-AOV carts only. Alternatively, move to triggered in-app messages at near-zero cost.";}else{tip="Recovery barely covers its cost. Two main levers: (1) lift recovery rate from 8% toward 15% via SMS add-on, better subject lines, and dynamic product personalization, (2) lower cost per send by moving to email-dominant sequences. Either alone doubles ROI; both compound to ~5x.";}}' +
  'var r="";' +
  'r+="Cart Abandonment Cost Calculator\\n\\n";' +
  'r+="🩺 Health:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* "+he+" "+hl+"\\n";' +
  'r+="* Recovery ROI: "+pct(roi)+"  *  Net gain: "+money(net)+"\\n";' +
  'r+="* Abandonment rate: "+cab.toFixed(0)+"%  *  Recovery rate: "+rr.toFixed(0)+"%\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="📊 Inputs Snapshot:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Monthly traffic:           "+mt.toLocaleString("en-US")+"\\n";' +
  'r+="* Cart add rate:             "+car.toFixed(0)+"%\\n";' +
  'r+="* Cart abandonment rate:     "+cab.toFixed(0)+"%\\n";' +
  'r+="* Average order value:       "+money(aov)+"\\n";' +
  'r+="* Recovery rate:             "+rr.toFixed(0)+"%\\n";' +
  'r+="* Recovery cost per send:    "+money2(rcps)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="💰 Cost Breakdown:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Cart creations:       "+Math.round(cc).toLocaleString("en-US")+"  (traffic x "+car.toFixed(0)+"% add rate)\\n";' +
  'r+="* Completed orders:     "+Math.round(co).toLocaleString("en-US")+"  ("+(100-cab).toFixed(0)+"% conversion)\\n";' +
  'r+="* Abandoned carts:      "+Math.round(ac).toLocaleString("en-US")+"  (cart creations x "+cab.toFixed(0)+"%)\\n";' +
  'r+="* Lost revenue:         "+money(lr)+"  (abandoned x AOV)\\n";' +
  'r+="* Recoverable revenue:  "+money(rev)+"  (lost x "+rr.toFixed(0)+"% recovery)\\n";' +
  'r+="* Recovery cost:        "+money(cost)+"  (abandoned x cost/send)\\n";' +
  'r+="* Net gain:             "+money(net)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="🔄 What-If:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* +50% recovery rate: recovery ROI = "+pct(wrROI)+" * net gain = "+money(wrN)+"\\n";' +
  'r+="* -25% cost per send: recovery ROI = "+pct(whROI)+" * net gain = "+money(whN)+"\\n";' +
  'r+="* -10pp abandonment:  recovery ROI = "+pct(wcROI)+" * net gain = "+money(wcN)+"\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="⚖️ Break-Even:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Minimum recovery rate for 100% ROI: "+beRR.toFixed(2)+"%  (cost/send / AOV)\\n";' +
  'r+="* Headroom: "+recHead.toFixed(2)+"pp before recovery ROI hits 100%\\n";' +
  'r+="* At break-even, every recovery dollar returns exactly one recovery dollar in recovered revenue\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="🎯 Milestone:\\n";' +
  'r+="------------------------------------------------\\n";' +
  'r+="* Annualized net gain:    "+money(annNet)+"  (at current monthly run-rate)\\n";' +
  'r+="* Annual lost revenue:    "+money(annLR)+"\\n";' +
  'r+="* Annual recovered:       "+money(annRev)+"\\n";' +
  'r+="* (Assumes constant traffic + rates — refresh quarterly with new funnel data)\\n\\n";' +
  'r+="------------------------------------------------\\n\\n";' +
  'r+="💡 Tip: "+tip+"\\n";' +
  "return [r];";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-cart-abandonment-cost-calculator',
  title: 'Cart Abandonment Cost Calculator',
  description:
    'Model cart abandonment and the ROI of a recovery campaign (email + SMS retargeting). See 8-output breakdown, what-if scenarios (recovery rate, cost, abandonment), break-even recovery rate, and annualized projections. Industry benchmarks: 🟢 ≥300% recovery ROI · 🟡 100–300% · 🔴 <100%.',
  categoryId: 'M',
  applicationCategory: 'BusinessApplication',
  inputs: [
    { name: 'monthlyTraffic', label: 'Monthly Traffic (visitors)', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'cartAddRate', label: 'Cart Add Rate (%)', placeholder: 'e.g. 20', type: 'number' },
    { name: 'cartAbandonmentRate', label: 'Cart Abandonment Rate (%)', placeholder: 'e.g. 70', type: 'number' },
    { name: 'avgOrderValue', label: 'Average Order Value ($)', placeholder: 'e.g. 80', type: 'number' },
    { name: 'recoveryRate', label: 'Recovery Rate (%)', placeholder: 'e.g. 8', type: 'number' },
    { name: 'recoveryCostPerSend', label: 'Recovery Cost per Send ($)', placeholder: 'e.g. 0.5', type: 'number' },
  ],
  keywords: [
    'cart abandonment',
    'cart abandonment calculator',
    'cart abandonment cost',
    'cart recovery ROI',
    'cart recovery rate',
    'abandoned cart',
    'shopping cart abandonment',
    'cart abandonment email',
    'cart recovery campaign',
    'ecommerce cart recovery',
    'solopreneur marketing',
  ],
  tags: ['marketing', 'cart', 'abandonment', 'roi'],
  reviewedBy: 'ForgeFlowKit Team',
  author: 'ForgeFlowKit',
  dataReviewedAt: '2026-07-15',
  sources: [
    'https://baymard.com/lists/cart-abandonment-rate',
    'https://www.shopify.com/blog/cart-abandonment',
    'https://help.klaviyo.com/hc/en-us/articles/115005758787',
    'https://www.optimizely.com/insights/blog/cart-abandonment-statistics/',
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  calculate,
  generate: calculate,
  staticExamples: [
    'Cart Abandonment Cost Calculator\n\n🩺 Health:\n------------------------------------------------\n* 🟢 Good — recovery ROI >= 300%; recovery spend is highly profitable\n* Recovery ROI: 1280%  *  Net gain: $41,300\n* Abandonment rate: 70%  *  Recovery rate: 8%\n\n------------------------------------------------\n\n📊 Inputs Snapshot:\n------------------------------------------------\n* Monthly traffic:           50,000\n* Cart add rate:             20%\n* Cart abandonment rate:     70%\n* Average order value:       $80\n* Recovery rate:             8%\n* Recovery cost per send:    $0.5\n\n------------------------------------------------\n\n💰 Cost Breakdown:\n------------------------------------------------\n* Cart creations:       10,000  (traffic x 20% add rate)\n* Completed orders:     3,000  (30% conversion)\n* Abandoned carts:      7,000  (cart creations x 70%)\n* Lost revenue:         $560,000  (abandoned x AOV)\n* Recoverable revenue:  $44,800  (lost x 8% recovery)\n* Recovery cost:        $3,500  (abandoned x cost/send)\n* Net gain:             $41,300\n\n------------------------------------------------\n\n🔄 What-If:\n------------------------------------------------\n* +50% recovery rate: recovery ROI = 1920% * net gain = $63,700\n* -25% cost per send: recovery ROI = 1707% * net gain = $42,175\n* -10pp abandonment:  recovery ROI = 1280% * net gain = $35,400\n\n------------------------------------------------\n\n⚖️ Break-Even:\n------------------------------------------------\n* Minimum recovery rate for 100% ROI: 0.63%  (cost/send / AOV)\n* Headroom: 7.38pp before recovery ROI hits 100%\n* At break-even, every recovery dollar returns exactly one recovery dollar in recovered revenue\n\n------------------------------------------------\n\n🎯 Milestone:\n------------------------------------------------\n* Annualized net gain:    $495,600  (at current monthly run-rate)\n* Annual lost revenue:    $6,720,000\n* Annual recovered:       $537,600\n* (Assumes constant traffic + rates — refresh quarterly with new funnel data)\n\n------------------------------------------------\n\n💡 Tip: Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.\n',
  ],
  faq: [
    { q: 'What is cart abandonment rate?', a: 'Cart abandonment rate is the share of online shopping carts that are created but never converted to a completed purchase. Baymard Institute\'s 2024 study puts the average at 70.19% across industries. Top causes: unexpected shipping costs (48%), required account creation (24%), complicated checkout (22%).' },
    { q: 'What is a good cart recovery rate?', a: 'Email-only recovery: 5-10% (Klaviyo industry avg ~8%). SMS recovery: 20-30% (3x email). Combined email + SMS sequence: 12-18%. Recovery rate above 15% is excellent; below 5% signals poor subject lines, wrong send timing, or weak offer.' },
    { q: 'How do I calculate cart abandonment recovery ROI?', a: 'recovery_roi = recoverable_revenue / recovery_cost, where recoverable_revenue = abandoned_carts * AOV * recovery_rate and recovery_cost = abandoned_carts * cost_per_send. Above 300% = excellent (every recovery dollar returns $3+); 100-300% = warning band; below 100% = recovery campaigns destroy value.' },
    { q: 'What is a reasonable cost per abandoned cart send?', a: 'Email: $0.01-$0.10 per send (Klaviyo, Mailchimp). SMS: $0.50-$1.50 per send (Postscript, Attentive). Push notifications: ~$0.01. The key economic threshold: cost_per_send / AOV = minimum recovery rate for break-even (e.g. $0.50 send / $80 AOV = 0.625% minimum recovery rate).' },
  ],
  howToUse: [
    'Enter your monthly traffic (unique visitors or sessions — pick the one your analytics tool reports).',
    'Enter your cart add rate (% of visitors who add an item to cart).',
    'Enter your cart abandonment rate (% of carts that never reach checkout completion).',
    'Enter your average order value (AOV) — the typical completed order size.',
    'Enter your recovery rate (% of abandoned carts you successfully recover via email/SMS).',
    'Enter your recovery cost per send (your blended SMS+email send cost).',
    'Read the recovery ROI, what-if scenarios, and break-even recovery rate to size your recovery campaign.',
  ],
};

registerEngine(engine);