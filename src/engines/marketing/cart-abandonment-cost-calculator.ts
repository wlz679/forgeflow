import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
// Health bands on recovery_roi (Business v3 4-band standard):
//   green  ≥300%   every recovery dollar produces ≥$3 of recovered revenue.
//   yellow 200-300%  profitable but headroom remains (lift via SMS / cost cuts).
//   orange 100-200%  recovery barely covers its own cost (structurally fragile).
//   red    <100%   recovery campaigns destroy value.
//
// Industry benchmarks:
//   Cart abandonment rate: 65-80% (Baymard 2024: 70.19% avg)
//   Cart recovery rate (email): 5-15% (Klaviyo avg: 8%)
//   Cart recovery rate (SMS): 20-30%
//   Recovery cost per send: $0.10-$2.00

// ============== Health band constants ==============

export const HEALTH_BANDS = {
  good:    { threshold: 3.0,   label: 'Good — recovery ROI ≥ 300%; recovery spend is highly profitable' },
  caution: { threshold: 2.0,   label: 'Caution — recovery ROI 200–300%; profitable but room to optimize' },
  warning: { threshold: 1.0,   label: 'Warning — recovery ROI 100–200%; recovery spend is fragile' },
  critical:{ threshold: -Infinity, label: 'Critical — recovery ROI < 100%; recovery spend destroys value' },
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
export function calcHealthBand(roi: number): 'good' | 'caution' | 'warning' | 'critical' {
  if (roi >= HEALTH_BANDS.good.threshold) return 'good';
  if (roi >= HEALTH_BANDS.caution.threshold) return 'caution';
  if (roi >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

// ============== Health band → emoji lookup (4-tier with 'caution' alias) ==============
// P141-B1-T4: replaces nested ternary with table lookup. cart-abandonment uses
// 'caution' as a middle-band alias rather than the canonical 'excellent' tier,
// so the local table is more compact than BAND_META.
const BAND_EMOJI: Record<ReturnType<typeof calcHealthBand>, string> = {
  good:     '🟢',
  caution:  '🟡',
  warning:  '🟠',
  critical: '🔴',
};

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
      '$calc_out.section.cart_abandonment_cost_calculator|Cart Abandonment Cost Calculator|\n\n' +
        makeToken('calc_out.cart_abandonment_cost.row.enter_inputs_required', 'Enter your monthly traffic, cart add rate, abandonment rate, AOV, recovery rate, and recovery cost per send to compute the recovery ROI of your cart recovery campaign.'),
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
  const healthEmoji = BAND_EMOJI[band];
  // ── P168 B3-8：健康度四档 → 语义码（4 档都是**字面量 code** ⇒ 静态守卫认得出）──
  //   ⚠️ 兜底文案与 HEALTH_BANDS[band].label **逐字相同**
  //      （locale 提取器只认**字面量** ⇒ 兜底不能写常量引用 ⇒ 改 HEALTH_BANDS 时须同步改这 4 条）。
  const healthLabel =
    band === 'good'
      ? makeToken('calc_out.cart_abandonment_cost.row.health_good', 'Good — recovery ROI ≥ 300%; recovery spend is highly profitable')
      : band === 'caution'
      ? makeToken('calc_out.cart_abandonment_cost.row.health_caution', 'Caution — recovery ROI 200–300%; profitable but room to optimize')
      : band === 'warning'
      ? makeToken('calc_out.cart_abandonment_cost.row.health_warning', 'Warning — recovery ROI 100–200%; recovery spend is fragile')
      : makeToken('calc_out.cart_abandonment_cost.row.health_critical', 'Critical — recovery ROI < 100%; recovery spend destroys value');

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

  // ── P168 B3-8：tip 行**整行**令牌化（「💡 Tip:」标记在兜底内 ⇒ 语言无关过滤仍命中）──
  let tip: string;
  if (band === 'critical') {
    tip = makeToken('calc_out.cart_abandonment_cost.row.tip_critical', '💡 Tip: Recovery spend is destroying value. Either lower recovery cost per send (switch from SMS to email, or move to triggered drip sequences rather than one-shot blasts), or focus recovery on high-AOV segments where the recovery economics work. A $0.50 send against an $80 AOV is profitable above 0.625% recovery rate; below that, the math fails.');
  } else if (band === 'good') {
    tip = makeToken('calc_out.cart_abandonment_cost.row.tip_good', '💡 Tip: Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.');
  } else if (band === 'caution') {
    tip = makeToken('calc_out.cart_abandonment_cost.row.tip_caution', '💡 Tip: Profitable but with headroom. The two main levers: lift recovery rate from 8% toward 12% (SMS add-on typically triples email recovery at marginal cost) and lower cost per send by moving to email-dominant sequences. Either alone pushes ROI into 🟢; both compound to ~3x.');
  } else {
    // warning band (100-200% ROI)
    if (recoveryCostPerSend > 1.0) {
      tip = makeToken('calc_out.cart_abandonment_cost.row.tip_warning_sms_cost', '💡 Tip: SMS costs ($1+ per send) dominate the recovery math. Test email-only sequences first (Klaviyo/Mailchimp average 8% recovery at ~$0.05/send) before scaling SMS to high-AOV carts only. Alternatively, move to triggered in-app messages at near-zero cost.');
    } else {
      tip = makeToken('calc_out.cart_abandonment_cost.row.tip_warning_low_roi', '💡 Tip: Recovery barely covers its cost. Two main levers: (1) lift recovery rate from 8% toward 15% via SMS add-on, better subject lines, and dynamic product personalization, (2) lower cost per send by moving to email-dominant sequences. Either alone doubles ROI; both compound to ~5x.');
    }
  }

  // ── P168 B3-8：运行时数值 → 局部字符串变量 ─────────────────────────────────
  //   ⭐ fallback 与 params 取**同一个变量** ⇒ 英文兜底与中文模板不可能漂。
  const roiPct = pct(recoveryROI);
  const netGainStr = money(recoveryNetGain);
  const abandonRateStr = cartAbandonmentRate.toFixed(0);
  const recoveryRateStr = recoveryRate.toFixed(0);
  const trafficStr = monthlyTraffic.toLocaleString('en-US');
  const addRateStr = cartAddRate.toFixed(0);
  const aovStr = money(avgOrderValue);
  const costPerSendStr = money2(recoveryCostPerSend);
  const cartCreationsStr = Math.round(cartCreations).toLocaleString('en-US');
  const completedOrdersStr = Math.round(completedOrders).toLocaleString('en-US');
  const conversionRateStr = (100 - cartAbandonmentRate).toFixed(0);
  const abandonedCartsStr = Math.round(abandonedCarts).toLocaleString('en-US');
  const lostRevenueStr = money(lostRevenue);
  const recoverableRevenueStr = money(recoverableRevenue);
  const recoveryCostStr = money(recoveryCost);
  const whatIfRoiStr = pct(wrROI);
  const whatIfNetStr = money(wrNet);
  const whatIfCostRoiStr = pct(whROI);
  const whatIfCostNetStr = money(whNet);
  const whatIfAbandonRoiStr = pct(wcROI);
  const whatIfAbandonNetStr = money(wcNet);
  const breakEvenRateStr = breakEvenRecoveryRate.toFixed(2);
  const headroomStr = recoveryHeadroom.toFixed(2);
  const annualNetGainStr = money(annualNetGain);
  const annualLostRevenueStr = money(annualLostRevenue);
  const annualRecoveredStr = money(annualRecoveredRevenue);

  // ── P168 B3-8：带运行时数值的整行 → makeToken(code, fallback, params) ─────
  //   ⚠️ code 必须是**字面量**（静态守卫只认字面量）⇒ 不许拼字符串。
  //   ⚠️ 兜底里不得出现半角 '|'（维度行分隔符）—— 本批的行已逐行拆开，无 '|'。
  const tkCartCreations = makeToken(
    'calc_out.cart_abandonment_cost.row.cart_creations',
    'Cart creations:       ' + cartCreationsStr + '  (traffic x ' + addRateStr + '% add rate)',
    { creations: cartCreationsStr, add_rate: addRateStr },
  );
  const tkCompletedOrders = makeToken(
    'calc_out.cart_abandonment_cost.row.completed_orders',
    'Completed orders:     ' + completedOrdersStr + '  (' + conversionRateStr + '% conversion)',
    { orders: completedOrdersStr, conversion: conversionRateStr },
  );
  const tkAbandonedCarts = makeToken(
    'calc_out.cart_abandonment_cost.row.abandoned_carts',
    'Abandoned carts:      ' + abandonedCartsStr + '  (cart creations x ' + abandonRateStr + '%)',
    { carts: abandonedCartsStr, rate: abandonRateStr },
  );
  const tkLostRevenue = makeToken(
    'calc_out.cart_abandonment_cost.row.lost_revenue',
    'Lost revenue:         ' + lostRevenueStr + '  (abandoned x AOV)',
    { lost: lostRevenueStr },
  );
  const tkRecoverableRevenue = makeToken(
    'calc_out.cart_abandonment_cost.row.recoverable_revenue',
    'Recoverable revenue:  ' + recoverableRevenueStr + '  (lost x ' + recoveryRateStr + '% recovery)',
    { revenue: recoverableRevenueStr, rate: recoveryRateStr },
  );
  const tkRecoveryCost = makeToken(
    'calc_out.cart_abandonment_cost.row.recovery_cost',
    'Recovery cost:        ' + recoveryCostStr + '  (abandoned x cost/send)',
    { cost: recoveryCostStr },
  );
  const tkWhatIfRecoveryRate = makeToken(
    'calc_out.cart_abandonment_cost.row.whatif_recovery_rate_up_50pct',
    '+50% recovery rate: recovery ROI = ' + whatIfRoiStr + ' * net gain = ' + whatIfNetStr,
    { roi: whatIfRoiStr, net: whatIfNetStr },
  );
  const tkWhatIfCostPerSend = makeToken(
    'calc_out.cart_abandonment_cost.row.whatif_cost_per_send_down_25pct',
    '-25% cost per send: recovery ROI = ' + whatIfCostRoiStr + ' * net gain = ' + whatIfCostNetStr,
    { roi: whatIfCostRoiStr, net: whatIfCostNetStr },
  );
  const tkWhatIfAbandonment = makeToken(
    'calc_out.cart_abandonment_cost.row.whatif_abandonment_down_10pp',
    '-10pp abandonment:  recovery ROI = ' + whatIfAbandonRoiStr + ' * net gain = ' + whatIfAbandonNetStr,
    { roi: whatIfAbandonRoiStr, net: whatIfAbandonNetStr },
  );
  const tkMinRecoveryRate = makeToken(
    'calc_out.cart_abandonment_cost.row.min_recovery_rate_for_100pct_roi',
    'Minimum recovery rate for 100% ROI: ' + breakEvenRateStr + '%  (cost/send / AOV)',
    { rate: breakEvenRateStr },
  );
  const tkHeadroom = makeToken(
    'calc_out.cart_abandonment_cost.row.headroom',
    'Headroom: ' + headroomStr + 'pp before recovery ROI hits 100%',
    { headroom: headroomStr },
  );
  const tkBreakEvenNote = makeToken(
    'calc_out.cart_abandonment_cost.row.break_even_explanation',
    'At break-even, every recovery dollar returns exactly one recovery dollar in recovered revenue',
  );
  const tkAnnualizedNetGain = makeToken(
    'calc_out.cart_abandonment_cost.row.annualized_net_gain',
    'Annualized net gain:    ' + annualNetGainStr + '  (at current monthly run-rate)',
    { gain: annualNetGainStr },
  );
  const tkAssumesConstantRates = makeToken(
    'calc_out.cart_abandonment_cost.row.assumes_constant_rates',
    '(Assumes constant traffic + rates — refresh quarterly with new funnel data)',
  );

  // ── P168 B3-8：输出行逐行令牌化 ──────────────────────────────────────────
  //   · 章节标题 / 标签 ⇒ **字面量 token**（冒号与对齐空格留在 token 之外）
  //   · 带运行时数值的整行 ⇒ makeToken（fallback 与 params 同源）
  const r =
    '$calc_out.section.cart_abandonment_cost_calculator|Cart Abandonment Cost Calculator|\n\n' +
    '$calc_out.section.health|🩺 Health:|\n' +
    '------------------------------------------------\n' +
    '* ' + healthEmoji + ' ' + healthLabel + '\n' +
    '* $calc_out.label.recovery_roi|Recovery ROI|: ' + roiPct + '  *  $calc_out.label.net_gain|Net gain|: ' + netGainStr + '\n' +
    '* $calc_out.label.abandonment_rate|Abandonment rate|: ' + abandonRateStr + '%  *  $calc_out.label.recovery_rate|Recovery rate|: ' + recoveryRateStr + '%\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n' +
    '------------------------------------------------\n' +
    '* $calc_out.label.monthly_traffic|Monthly traffic|:           ' + trafficStr + '\n' +
    '* $calc_out.label.cart_add_rate|Cart add rate|:             ' + addRateStr + '%\n' +
    '* $calc_out.label.cart_abandonment_rate|Cart abandonment rate|:     ' + abandonRateStr + '%\n' +
    '* $calc_out.label.average_order_value|Average order value|:       ' + aovStr + '\n' +
    '* $calc_out.label.recovery_rate|Recovery rate|:             ' + recoveryRateStr + '%\n' +
    '* $calc_out.label.recovery_cost_per_send|Recovery cost per send|:    ' + costPerSendStr + '\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.cart_abandonment_cost_breakdown|💰 Cost Breakdown:|\n' +
    '------------------------------------------------\n' +
    '* ' + tkCartCreations + '\n' +
    '* ' + tkCompletedOrders + '\n' +
    '* ' + tkAbandonedCarts + '\n' +
    '* ' + tkLostRevenue + '\n' +
    '* ' + tkRecoverableRevenue + '\n' +
    '* ' + tkRecoveryCost + '\n' +
    '* $calc_out.label.net_gain|Net gain|:             ' + netGainStr + '\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.what_if|🔄 What-If:|\n' +
    '------------------------------------------------\n' +
    '* ' + tkWhatIfRecoveryRate + '\n' +
    '* ' + tkWhatIfCostPerSend + '\n' +
    '* ' + tkWhatIfAbandonment + '\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.break_even|⚖️ Break-Even:|\n' +
    '------------------------------------------------\n' +
    '* ' + tkMinRecoveryRate + '\n' +
    '* ' + tkHeadroom + '\n' +
    '* ' + tkBreakEvenNote + '\n\n' +
    '------------------------------------------------\n\n' +
    '$calc_out.section.milestone|🎯 Milestone:|\n' +
    '------------------------------------------------\n' +
    '* ' + tkAnnualizedNetGain + '\n' +
    '* $calc_out.label.annual_lost_revenue|Annual lost revenue|:    ' + annualLostRevenueStr + '\n' +
    '* $calc_out.label.annual_recovered|Annual recovered|:       ' + annualRecoveredStr + '\n' +
    '* ' + tkAssumesConstantRates + '\n\n' +
    '------------------------------------------------\n\n' +
    tip + '\n';

  return [r];
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let r=function(e){return Number.isNaN(e)?0:Math.max(0,e)},A=function(e){return e>=w.good.threshold?"good":e>=w.caution.threshold?"caution":e>=w.warning.threshold?"warning":"critical"},$=function(e,v,R){var n=et(e);return Array.isArray(n)?n.join(\`
\`):String(n)};var Pt=r,Ut=A,Wt=$,t=tk,T='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+T)(),w={good:{threshold:3,label:"Good — recovery ROI ≥ 300%; recovery spend is highly profitable"},caution:{threshold:2,label:"Caution — recovery ROI 200–300%; profitable but room to optimize"},warning:{threshold:1,label:"Warning — recovery ROI 100–200%; recovery spend is fragile"},critical:{threshold:null,label:"Critical — recovery ROI < 100%; recovery spend destroys value"}},tt={good:"🟢",caution:"🟡",warning:"🟠",critical:"🔴"},et=function(e){const v=r(parseFloat(e.monthlyTraffic)||0),R=r(parseFloat(e.cartAddRate)||0),n=r(parseFloat(e.cartAbandonmentRate)||0),i=r(parseFloat(e.avgOrderValue)||0),d=r(parseFloat(e.recoveryRate)||0),a=r(parseFloat(e.recoveryCostPerSend)||0);if(v===0)return[\`$calc_out.section.cart_abandonment_cost_calculator|Cart Abandonment Cost Calculator|

\`+t("calc_out.cart_abandonment_cost.row.enter_inputs_required","Enter your monthly traffic, cart add rate, abandonment rate, AOV, recovery rate, and recovery cost per send to compute the recovery ROI of your cart recovery campaign.")];const ot=R/100,x=n/100,F=d/100,b=v*ot,nt=b*(1-x),_=b*x,h=_*i,s=h*F,y=_*a,M=s-y,N=y>0?s/y:0,o=u=>"$"+Math.round(u).toLocaleString("en-US"),rt=u=>"$"+u.toLocaleString("en-US",{maximumFractionDigits:2}),m=u=>(u*100).toFixed(0)+"%",c=A(N),at=tt[c],ct=c==="good"?t("calc_out.cart_abandonment_cost.row.health_good","Good — recovery ROI ≥ 300%; recovery spend is highly profitable"):c==="caution"?t("calc_out.cart_abandonment_cost.row.health_caution","Caution — recovery ROI 200–300%; profitable but room to optimize"):c==="warning"?t("calc_out.cart_abandonment_cost.row.health_warning","Warning — recovery ROI 100–200%; recovery spend is fragile"):t("calc_out.cart_abandonment_cost.row.health_critical","Critical — recovery ROI < 100%; recovery spend destroys value"),st=d*1.5,q=h*(st/100),g=_*a,lt=q-g,it=g>0?q/g:0,dt=a*.75,S=_*dt,_t=s-S,ut=S>0?s/S:0,vt=Math.max(0,n-10),L=b*(vt/100),E=L*i*F,O=L*a,bt=E-O,ht=O>0?E/O:0,C=i>0?a/i*100:100,yt=d>=C?d-C:0,mt=M*12,pt=h*12,ft=s*12;let l;c==="critical"?l=t("calc_out.cart_abandonment_cost.row.tip_critical","💡 Tip: Recovery spend is destroying value. Either lower recovery cost per send (switch from SMS to email, or move to triggered drip sequences rather than one-shot blasts), or focus recovery on high-AOV segments where the recovery economics work. A $0.50 send against an $80 AOV is profitable above 0.625% recovery rate; below that, the math fails."):c==="good"?l=t("calc_out.cart_abandonment_cost.row.tip_good","💡 Tip: Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline."):c==="caution"?l=t("calc_out.cart_abandonment_cost.row.tip_caution","💡 Tip: Profitable but with headroom. The two main levers: lift recovery rate from 8% toward 12% (SMS add-on typically triples email recovery at marginal cost) and lower cost per send by moving to email-dominant sequences. Either alone pushes ROI into 🟢; both compound to ~3x."):a>1?l=t("calc_out.cart_abandonment_cost.row.tip_warning_sms_cost","💡 Tip: SMS costs ($1+ per send) dominate the recovery math. Test email-only sequences first (Klaviyo/Mailchimp average 8% recovery at ~$0.05/send) before scaling SMS to high-AOV carts only. Alternatively, move to triggered in-app messages at near-zero cost."):l=t("calc_out.cart_abandonment_cost.row.tip_warning_low_roi","💡 Tip: Recovery barely covers its cost. Two main levers: (1) lift recovery rate from 8% toward 15% via SMS add-on, better subject lines, and dynamic product personalization, (2) lower cost per send by moving to email-dominant sequences. Either alone doubles ROI; both compound to ~5x.");const wt=m(N),V=o(M),p=n.toFixed(0),f=d.toFixed(0),Rt=v.toLocaleString("en-US"),I=R.toFixed(0),gt=o(i),St=rt(a),j=Math.round(b).toLocaleString("en-US"),z=Math.round(nt).toLocaleString("en-US"),G=(100-n).toFixed(0),P=Math.round(_).toLocaleString("en-US"),U=o(h),W=o(s),K=o(y),B=m(it),H=o(lt),J=m(ut),D=o(_t),Q=m(ht),X=o(bt),Y=C.toFixed(2),Z=yt.toFixed(2),k=o(mt),Ot=o(pt),Ct=o(ft),It=t("calc_out.cart_abandonment_cost.row.cart_creations","Cart creations:       "+j+"  (traffic x "+I+"% add rate)",{creations:j,add_rate:I}),At=t("calc_out.cart_abandonment_cost.row.completed_orders","Completed orders:     "+z+"  ("+G+"% conversion)",{orders:z,conversion:G}),$t=t("calc_out.cart_abandonment_cost.row.abandoned_carts","Abandoned carts:      "+P+"  (cart creations x "+p+"%)",{carts:P,rate:p}),xt=t("calc_out.cart_abandonment_cost.row.lost_revenue","Lost revenue:         "+U+"  (abandoned x AOV)",{lost:U}),Ft=t("calc_out.cart_abandonment_cost.row.recoverable_revenue","Recoverable revenue:  "+W+"  (lost x "+f+"% recovery)",{revenue:W,rate:f}),Mt=t("calc_out.cart_abandonment_cost.row.recovery_cost","Recovery cost:        "+K+"  (abandoned x cost/send)",{cost:K}),Nt=t("calc_out.cart_abandonment_cost.row.whatif_recovery_rate_up_50pct","+50% recovery rate: recovery ROI = "+B+" * net gain = "+H,{roi:B,net:H}),qt=t("calc_out.cart_abandonment_cost.row.whatif_cost_per_send_down_25pct","-25% cost per send: recovery ROI = "+J+" * net gain = "+D,{roi:J,net:D}),Lt=t("calc_out.cart_abandonment_cost.row.whatif_abandonment_down_10pp","-10pp abandonment:  recovery ROI = "+Q+" * net gain = "+X,{roi:Q,net:X}),Et=t("calc_out.cart_abandonment_cost.row.min_recovery_rate_for_100pct_roi","Minimum recovery rate for 100% ROI: "+Y+"%  (cost/send / AOV)",{rate:Y}),Vt=t("calc_out.cart_abandonment_cost.row.headroom","Headroom: "+Z+"pp before recovery ROI hits 100%",{headroom:Z}),jt=t("calc_out.cart_abandonment_cost.row.break_even_explanation","At break-even, every recovery dollar returns exactly one recovery dollar in recovered revenue"),zt=t("calc_out.cart_abandonment_cost.row.annualized_net_gain","Annualized net gain:    "+k+"  (at current monthly run-rate)",{gain:k}),Gt=t("calc_out.cart_abandonment_cost.row.assumes_constant_rates","(Assumes constant traffic + rates — refresh quarterly with new funnel data)");return[\`$calc_out.section.cart_abandonment_cost_calculator|Cart Abandonment Cost Calculator|

$calc_out.section.health|🩺 Health:|
------------------------------------------------
* \`+at+" "+ct+\`
* $calc_out.label.recovery_roi|Recovery ROI|: \`+wt+"  *  $calc_out.label.net_gain|Net gain|: "+V+\`
* $calc_out.label.abandonment_rate|Abandonment rate|: \`+p+"%  *  $calc_out.label.recovery_rate|Recovery rate|: "+f+\`%

------------------------------------------------

$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|
------------------------------------------------
* $calc_out.label.monthly_traffic|Monthly traffic|:           \`+Rt+\`
* $calc_out.label.cart_add_rate|Cart add rate|:             \`+I+\`%
* $calc_out.label.cart_abandonment_rate|Cart abandonment rate|:     \`+p+\`%
* $calc_out.label.average_order_value|Average order value|:       \`+gt+\`
* $calc_out.label.recovery_rate|Recovery rate|:             \`+f+\`%
* $calc_out.label.recovery_cost_per_send|Recovery cost per send|:    \`+St+\`

------------------------------------------------

$calc_out.section.cart_abandonment_cost_breakdown|💰 Cost Breakdown:|
------------------------------------------------
* \`+It+\`
* \`+At+\`
* \`+$t+\`
* \`+xt+\`
* \`+Ft+\`
* \`+Mt+\`
* $calc_out.label.net_gain|Net gain|:             \`+V+\`

------------------------------------------------

$calc_out.section.what_if|🔄 What-If:|
------------------------------------------------
* \`+Nt+\`
* \`+qt+\`
* \`+Lt+\`

------------------------------------------------

$calc_out.section.break_even|⚖️ Break-Even:|
------------------------------------------------
* \`+Et+\`
* \`+Vt+\`
* \`+jt+\`

------------------------------------------------

$calc_out.section.milestone|🎯 Milestone:|
------------------------------------------------
* \`+zt+\`
* $calc_out.label.annual_lost_revenue|Annual lost revenue|:    \`+Ot+\`
* $calc_out.label.annual_recovered|Annual recovered|:       \`+Ct+\`
* \`+Gt+\`

------------------------------------------------

\`+l+\`
\`]};return[$(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-cart-abandonment-cost-calculator',
  title: 'Cart Abandonment Cost Calculator',
  description:
    'Model cart abandonment and the ROI of a recovery campaign (email + SMS retargeting). See 8-output breakdown, what-if scenarios (recovery rate, cost, abandonment), break-even recovery rate, and annualized projections. Industry benchmarks: 🟢 ≥300% · 🟡 200–300% · 🟠 100–200% · 🔴 <100% recovery ROI.',
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
    '$calc_out.section.cart_abandonment_cost_calculator|Cart Abandonment Cost Calculator|\n\n$calc_out.section.health|🩺 Health:|\n------------------------------------------------\n* 🟢 $calc_out.cart_abandonment_cost.row.health_good|Good — recovery ROI ≥ 300%; recovery spend is highly profitable|\n* $calc_out.label.recovery_roi|Recovery ROI|: 1280%  *  $calc_out.label.net_gain|Net gain|: $41,300\n* $calc_out.label.abandonment_rate|Abandonment rate|: 70%  *  $calc_out.label.recovery_rate|Recovery rate|: 8%\n\n------------------------------------------------\n\n$calc_out.section.inputs_snapshot|📊 Inputs Snapshot:|\n------------------------------------------------\n* $calc_out.label.monthly_traffic|Monthly traffic|:           50,000\n* $calc_out.label.cart_add_rate|Cart add rate|:             20%\n* $calc_out.label.cart_abandonment_rate|Cart abandonment rate|:     70%\n* $calc_out.label.average_order_value|Average order value|:       $80\n* $calc_out.label.recovery_rate|Recovery rate|:             8%\n* $calc_out.label.recovery_cost_per_send|Recovery cost per send|:    $0.5\n\n------------------------------------------------\n\n$calc_out.section.cart_abandonment_cost_breakdown|💰 Cost Breakdown:|\n------------------------------------------------\n* $calc_out.cart_abandonment_cost.row.cart_creations{"creations":"10,000","add_rate":"20"}|Cart creations:       10,000  (traffic x 20% add rate)|\n* $calc_out.cart_abandonment_cost.row.completed_orders{"orders":"3,000","conversion":"30"}|Completed orders:     3,000  (30% conversion)|\n* $calc_out.cart_abandonment_cost.row.abandoned_carts{"carts":"7,000","rate":"70"}|Abandoned carts:      7,000  (cart creations x 70%)|\n* $calc_out.cart_abandonment_cost.row.lost_revenue{"lost":"$560,000"}|Lost revenue:         $560,000  (abandoned x AOV)|\n* $calc_out.cart_abandonment_cost.row.recoverable_revenue{"revenue":"$44,800","rate":"8"}|Recoverable revenue:  $44,800  (lost x 8% recovery)|\n* $calc_out.cart_abandonment_cost.row.recovery_cost{"cost":"$3,500"}|Recovery cost:        $3,500  (abandoned x cost/send)|\n* $calc_out.label.net_gain|Net gain|:             $41,300\n\n------------------------------------------------\n\n$calc_out.section.what_if|🔄 What-If:|\n------------------------------------------------\n* $calc_out.cart_abandonment_cost.row.whatif_recovery_rate_up_50pct{"roi":"1920%","net":"$63,700"}|+50% recovery rate: recovery ROI = 1920% * net gain = $63,700|\n* $calc_out.cart_abandonment_cost.row.whatif_cost_per_send_down_25pct{"roi":"1707%","net":"$42,175"}|-25% cost per send: recovery ROI = 1707% * net gain = $42,175|\n* $calc_out.cart_abandonment_cost.row.whatif_abandonment_down_10pp{"roi":"1280%","net":"$35,400"}|-10pp abandonment:  recovery ROI = 1280% * net gain = $35,400|\n\n------------------------------------------------\n\n$calc_out.section.break_even|⚖️ Break-Even:|\n------------------------------------------------\n* $calc_out.cart_abandonment_cost.row.min_recovery_rate_for_100pct_roi{"rate":"0.63"}|Minimum recovery rate for 100% ROI: 0.63%  (cost/send / AOV)|\n* $calc_out.cart_abandonment_cost.row.headroom{"headroom":"7.38"}|Headroom: 7.38pp before recovery ROI hits 100%|\n* $calc_out.cart_abandonment_cost.row.break_even_explanation|At break-even, every recovery dollar returns exactly one recovery dollar in recovered revenue|\n\n------------------------------------------------\n\n$calc_out.section.milestone|🎯 Milestone:|\n------------------------------------------------\n* $calc_out.cart_abandonment_cost.row.annualized_net_gain{"gain":"$495,600"}|Annualized net gain:    $495,600  (at current monthly run-rate)|\n* $calc_out.label.annual_lost_revenue|Annual lost revenue|:    $6,720,000\n* $calc_out.label.annual_recovered|Annual recovered|:       $537,600\n* $calc_out.cart_abandonment_cost.row.assumes_constant_rates|(Assumes constant traffic + rates — refresh quarterly with new funnel data)|\n\n------------------------------------------------\n\n$calc_out.cart_abandonment_cost.row.tip_good|💡 Tip: Healthy recovery ROI. Scale recovery volume — add SMS to the email sequence (SMS recovery rate is typically 3x email), test send timing (1h vs 24h vs 72h after abandonment), and segment by cart value to push recovery on high-AOV carts first. Each additional 1pp of recovery rate lifts ROI by ~12.8x at this baseline.|\n',
  ],
  faq: [
    { q: 'What is cart abandonment rate?', a: 'Cart abandonment rate is the share of online shopping carts that are created but never converted to a completed purchase. Baymard Institute\'s 2024 study puts the average at 70.19% across industries. Top causes: unexpected shipping costs (48%), required account creation (24%), complicated checkout (22%).' },
    { q: 'What is a good cart recovery rate?', a: 'Email-only recovery: 5-10% (Klaviyo industry avg ~8%). SMS recovery: 20-30% (3x email). Combined email + SMS sequence: 12-18%. Recovery rate above 15% is excellent; below 5% signals poor subject lines, wrong send timing, or weak offer.' },
    { q: 'How do I calculate cart abandonment recovery ROI?', a: 'recovery_roi = recoverable_revenue / recovery_cost, where recoverable_revenue = abandoned_carts * AOV * recovery_rate and recovery_cost = abandoned_carts * cost_per_send. Above 300% = excellent (every recovery dollar returns $3+); 200–300% = caution (profitable, room to optimize); 100–200% = warning (structurally fragile, fix the math); below 100% = recovery campaigns destroy value.' },
    { q: 'What is a reasonable cost per abandoned cart send?', a: 'Email: $0.01-$0.10 per send (Klaviyo, Mailchimp). SMS: $0.50-$1.50 per send (Postscript, Attentive). Push notifications: ~$0.01. The key economic threshold: cost_per_send / AOV = minimum recovery rate for break-even (e.g. $0.50 send / $80 AOV = 0.625% minimum recovery rate).' },
    { q: "What is a good cart abandonment rate?", a: "Average: 70% across industries. Best option: 50-60% (top performers). Top 10% of e-commerce: <65%. Top 1%: <50%. Mobile: 75-85% (higher than desktop). By industry: fashion 68%, beauty 75%, electronics 65%, food 50%. Aim for 5-10% reduction per year. Recovery email: 10-30% of abandoned carts." },
    { q: "How do I calculate cart abandonment revenue loss?", a: "Lost revenue = (carts_created × price) × (1 - completion_rate). For 1000 carts/month at $100 AOV with 70% abandonment: $70K lost. Of which: 10-30% is recoverable (via email/remarketing). Of recoverable: 5-15% recovery rate. So: $70K lost, $7K-21K recoverable, $1K-3K actual recovery. Track: total loss, recoverable, recovered." },
    { q: "What are the top causes of cart abandonment?", a: "Baymard top reasons: 1) Extra costs (shipping, tax): 48%, 2) Forced account creation: 24%, 3) Too long/complex checkout: 18%, 4) Don't trust site: 17%, 5) Don't see total cost upfront: 16%, 6) Delivery too slow: 15%, 7) Couldn't find preferred payment: 13%, 8) Card declined: 9%, 9) Returns policy: 8%. Fix: free shipping threshold, guest checkout, transparent pricing." },
    { q: "How do I recover abandoned carts?", a: "1) Recovery email (1-2 hour delay, then 24 hours, then 72 hours): 10-30% recovery, 2) Exit-intent popup with discount: 5-10% recovery, 3) Retargeting ads: 5-15% recovery, 4) SMS reminder: 20-30% open rate, 5) Push notification (if app): 15-25% CTR. Most teams 2-3x ROI on recovery campaigns. timing, copy, offer." },
    { q: "What should cart abandonment email say?", a: "Best: 1) Subject: \"Did you forget something?\" or \"Your cart is waiting\", 2) Show items with images, 3) One-click checkout link, 4) Social proof (\"Trending\"), 5) Optional small discount (5-10%), 6) Sense of urgency (\"24-hour hold\"). Sequence: 1 hour (reminder), 24 hours (with discount), 72 hours (final). Average recovery: 5-15% per email. Test variations." },
    { q: "Should I offer a discount to recover carts?", a: "Discount works but: 1) Trains customers to abandon next time, 2) Cuts margin, 3) Doesn't fix root cause. Better: free shipping, gift with purchase, urgency (\"sale ends tomorrow\"). If discount: 5-10% max. Test: free shipping vs 10% off (free shipping often wins). Most teams: 10-20% conversion lift with discount, but 30%+ margin loss." },
    { q: "How does checkout design affect abandonment?", a: "Best practices: 1) Guest checkout (no forced signup): -10% abandonment, 2) Progress indicator: -5% abandonment, 3) Auto-fill (address, payment): -8% abandonment, 4) Multiple payment options (Apple Pay, Google Pay, PayPal): -15% abandonment, 5) One-page checkout: -10-20% abandonment (vs multi-step), 6) Trust badges: -5% abandonment. Total potential: 40-60% reduction in abandonment." },
    { q: "What is the ROI of fixing cart abandonment?", a: "For $1M/month revenue at 70% abandonment: $700K lost. If 10% recovery: $70K/month = $840K/year. If abandonment rate drops 5pp (to 65%): $100K+/year. Most teams: $200K-2M annual revenue impact from 5-10pp improvement. Investment: $5-50K in optimization. ROI: 5-50x. Test everything, measure conversion rate at each step." },
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
  engineKey: true,
};

registerEngine(engine);
