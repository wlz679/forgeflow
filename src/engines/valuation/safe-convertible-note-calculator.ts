import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// ============== Math helpers (exported for tests) ==============

/**
 * Number of SAFE shares issued at conversion, given the cap.
 * Closed-form algebra from capPrice = (postMoneyCap - investment) / existingShares:
 *   SAFEshares = investment / capPrice = investment × existingShares / (postMoneyCap - investment)
 * Returns 0 if cap <= investment (caller should validate).
 */
export function safeSharesAtCap(
  investment: number,
  postMoneyCap: number,
  existingShares: number,
): number {
  const effectivePreMoney = postMoneyCap - investment;
  if (effectivePreMoney <= 0 || existingShares <= 0) return 0;
  return (investment * existingShares) / effectivePreMoney;
}

/**
 * Cap price per share: (postMoneyCap - investment) / existingShares.
 * This is the per-share price at which SAFE converts if the cap governs.
 * Returns 0 if effective pre-money is non-positive.
 */
export function capPrice(
  postMoneyCap: number,
  effectivePreMoney: number,
  existingShares: number,
): number {
  if (effectivePreMoney <= 0 || existingShares <= 0) return 0;
  return effectivePreMoney / existingShares;
}

/**
 * Discount price per share: (nextRoundValuation / existingShares) × (1 - discountRate/100).
 * If nextRoundValuation = 0 or existingShares = 0, returns Infinity (so cap always wins).
 */
export function discountPrice(
  nextRoundValuation: number,
  existingShares: number,
  discountRatePercent: number,
): number {
  if (nextRoundValuation <= 0 || existingShares <= 0) return Infinity;
  return (nextRoundValuation / existingShares) * (1 - discountRatePercent / 100);
}

/**
 * Conversion price = min(capPrice, discountPrice). The SAFE converts at whichever is lower
 * (better for the SAFE investor).
 */
export function conversionPrice(
  capP: number,
  discountP: number,
): number {
  return Math.min(capP, discountP);
}

/**
 * SAFE investor ownership at conversion, as a fraction (0-1).
 *   own = SAFEshares / (existingShares + SAFEshares)
 */
export function safeOwnership(
  safeShares: number,
  existingShares: number,
): number {
  const total = existingShares + safeShares;
  if (total <= 0) return 0;
  return safeShares / total;
}

/**
 * Health assessment based on cap-to-investment ratio.
 *   ratio < 5 → 🟠 aggressive (low cap)
 *   ratio 5-10 → 🟡 standard
 *   ratio >= 10 → 🟢 founder-friendly (high cap)
 */
export function dealHealth(capToInvestmentRatio: number): {
  emoji: string;
  label: string;
} {
  if (capToInvestmentRatio < 5)
    return { emoji: '🟠', label: 'low cap — aggressive for founder' };
  if (capToInvestmentRatio <= 10)
    return { emoji: '🟡', label: 'standard cap' };
  return { emoji: '🟢', label: 'founder-friendly cap' };
}

/**
 * Discount assessment.
 *   0% → 🟢 no discount (post-money standard)
 *   1-15% → 🟡 moderate
 *   16-25% → 🟠 high
 *   > 25% → 🔴 very high
 */
export function discountHealth(discountRatePercent: number): {
  emoji: string;
  label: string;
} {
  if (discountRatePercent === 0)
    return { emoji: '🟢', label: 'no discount (post-money standard)' };
  if (discountRatePercent <= 15)
    return { emoji: '🟡', label: 'moderate discount' };
  if (discountRatePercent <= 25)
    return { emoji: '🟠', label: 'high discount' };
  return { emoji: '🔴', label: 'very high discount — unusual' };
}

/**
 * SAFE type label for display.
 */
export function safeType(
  postMoneyCap: number,
  discountRatePercent: number,
): string {
  if (postMoneyCap > 0 && discountRatePercent === 0)
    return 'Post-Money SAFE (YC Standard)';
  if (postMoneyCap > 0 && discountRatePercent > 0)
    return 'Post-Money SAFE with Discount';
  if (postMoneyCap <= 0 && discountRatePercent > 0)
    return 'Discount-Only SAFE (Pre-Conversion)';
  return 'Custom SAFE';
}

// ============== calculate() ==============

function calculateSafe(inputs: Record<string, string>): string[] {
  const investment = clampNonNegative(parseFloat(inputs.investmentAmount) || 0);
  const postMoneyCap = clampNonNegative(parseFloat(inputs.postMoneyCap) || 0);
  const discountRate = clampNonNegative(parseFloat(inputs.discountRate) || 0);
  const existingShares = clampNonNegative(parseFloat(inputs.existingShares) || 0);
  const nextRoundValuation = clampNonNegative(parseFloat(inputs.nextRoundValuation) || 0);

  // Edge case: cap must exceed investment
  if (postMoneyCap > 0 && postMoneyCap <= investment) {
    return [
      '$calc_out.section.safe_convertible_note_calculator|⏰ SAFE / Convertible Note Calculator|\n\n' +
        makeToken('calc_out.safe_convertible_note.row.error_cap_not_exceeding_investment', '💰 The post-money cap ($' + postMoneyCap.toLocaleString() + ') must exceed the investment amount ($' + investment.toLocaleString() + '). A SAFE cannot have a cap lower than the investment it represents.', { cap: '$' + postMoneyCap.toLocaleString(), investment: '$' + investment.toLocaleString() }),
    ];
  }
  if (investment <= 0 || postMoneyCap <= 0 || existingShares <= 0) {
    return [
      '$calc_out.section.safe_convertible_note_calculator|⏰ SAFE / Convertible Note Calculator|\n\n' +
        makeToken('calc_out.safe_convertible_note.row.enter_inputs_required', '💰 Enter investment amount, post-money cap, and existing fully diluted shares to see SAFE conversion mechanics.'),
    ];
  }

  // Core math
  const effectivePreMoney = postMoneyCap - investment;
  const cp = capPrice(postMoneyCap, effectivePreMoney, existingShares);
  const dp = discountPrice(
    nextRoundValuation > 0 ? nextRoundValuation : postMoneyCap,
    existingShares,
    discountRate,
  );
  const cvp = conversionPrice(cp, dp);
  const safeShares = investment / cvp;
  const own = safeOwnership(safeShares, existingShares);
  const existingOwn = 1 - own;
  const capToInvestmentRatio = postMoneyCap / investment;
  const dh = dealHealth(capToInvestmentRatio);
  const dish = discountHealth(discountRate);
  const type = safeType(postMoneyCap, discountRate);

  // Format helpers
  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const money2 = (n: number) => '$' + n.toFixed(2);
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const shares = (n: number) => Math.round(n).toLocaleString('en-US');

  // Ownership pie chart (20 chars wide)
  const safeBars = Math.round(own * 20);
  const existingBars = 20 - safeBars;
  const pieChart =
    '▓'.repeat(existingBars) +
    '░'.repeat(safeBars) +
    '  ' +
    '$calc_out.label.existing|Existing|' +
    ' ' +
    pct(existingOwn) +
    '  |  SAFE ' +
    pct(own);

  // Effective post-money at conversion
  const effectivePostMoney = cvp * (existingShares + safeShares);
  const capGoverns = cvp === cp;

  // What-If scenarios
  // 1. Double the SAFE ($1M instead of $500K)
  const doubleShares = safeSharesAtCap(investment * 2, postMoneyCap, existingShares);
  const doubleOwn = safeOwnership(doubleShares, existingShares);
  // 2. Lower cap to 6:1 ratio
  const lowerCap = investment * 6;
  const lowerCapShares =
    lowerCap > investment ? safeSharesAtCap(investment, lowerCap, existingShares) : 0;
  const lowerCapOwn =
    lowerCap > investment ? safeOwnership(lowerCapShares, existingShares) : 0;
  // 3. Add 20% discount
  const withDiscountCvp = conversionPrice(
    cp,
    discountPrice(postMoneyCap, existingShares, 20),
  );
  const withDiscountShares = investment / withDiscountCvp;
  const withDiscountOwn = safeOwnership(withDiscountShares, existingShares);
  // 4. No cap (cap = $100M, effectively capless)
  const noCapShares = safeSharesAtCap(investment, 100000000, existingShares);
  const noCapOwn = safeOwnership(noCapShares, existingShares);
  // 5. Stack with prior $250K SAFE at $4M cap
  const priorSafeShares = safeSharesAtCap(250000, 4000000, existingShares);
  const stackedShares = priorSafeShares + safeShares;
  const stackedOwn = safeOwnership(stackedShares, existingShares);

  // Tip selection
  let tip: string;
  if (discountRate === 0) {
    tip = makeToken('calc_out.safe_convertible_note.row.tip_no_discount', '💡 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder’s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.');
  } else if (discountRate > 15 && capToInvestmentRatio < 8) {
    tip = makeToken('calc_out.safe_convertible_note.row.tip_aggressive_terms', '💡 Tip: Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low.');
  } else if (existingOwn < 0.5) {
    tip = makeToken('calc_out.safe_convertible_note.row.tip_heavy_dilution', '💡 Tip: Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor.');
  } else {
    tip = makeToken('calc_out.safe_convertible_note.row.tip_standard_terms', '💡 Tip: Standard terms: $5M post-money cap on $500K raise → ~10% dilution. If investor asks for >20% discount, that’s a red flag. Pro-rata rights are negotiable but rarely granted at SAFE stage.');
  }

  // ── P168 B3-8：分支相关的整行 ⇒ 每档**单独写出 code 字面量**（动态拼码 ⇒ 静态扫描器认不出）──
  const ratioTxt = capToInvestmentRatio.toFixed(1);
  const dealHealthRow =
    dh.label === 'standard cap'
      ? makeToken('calc_out.safe_convertible_note.row.deal_health_standard', dh.label + ' (cap is ' + ratioTxt + '× investment)', { ratio: ratioTxt })
      : dh.label === 'low cap — aggressive for founder'
      ? makeToken('calc_out.safe_convertible_note.row.deal_health_low_cap', dh.label + ' (cap is ' + ratioTxt + '× investment)', { ratio: ratioTxt })
      : makeToken('calc_out.safe_convertible_note.row.deal_health_founder_friendly', dh.label + ' (cap is ' + ratioTxt + '× investment)', { ratio: ratioTxt });
  const discountHealthRow =
    dish.label === 'no discount (post-money standard)'
      ? makeToken('calc_out.safe_convertible_note.row.discount_health_none', dish.label)
      : dish.label === 'moderate discount'
      ? makeToken('calc_out.safe_convertible_note.row.discount_health_moderate', dish.label)
      : dish.label === 'high discount'
      ? makeToken('calc_out.safe_convertible_note.row.discount_health_high', dish.label)
      : makeToken('calc_out.safe_convertible_note.row.discount_health_very_high', dish.label);
  const typeRow =
    type === 'Post-Money SAFE (YC Standard)'
      ? makeToken('calc_out.safe_convertible_note.row.type_post_money_standard', type)
      : type === 'Post-Money SAFE with Discount'
      ? makeToken('calc_out.safe_convertible_note.row.type_post_money_discount', type)
      : type === 'Discount-Only SAFE (Pre-Conversion)'
      ? makeToken('calc_out.safe_convertible_note.row.type_discount_only', type)
      : makeToken('calc_out.safe_convertible_note.row.type_custom', type);
  const discountPriceRow =
    discountRate > 0
      ? makeToken('calc_out.safe_convertible_note.row.discount_price', 'Discount Price:      ' + money2(dp) + ' per share  (next round × (1 − discount))', { price: money2(dp) })
      : makeToken('calc_out.safe_convertible_note.row.discount_price_none', 'Discount Price:      n/a (no discount)');
  const conversionPriceRow = capGoverns
    ? makeToken('calc_out.safe_convertible_note.row.conversion_price_cap_governs', 'Conversion Price:    ' + money2(cvp) + ' per share  ← CAP GOVERNS', { price: money2(cvp) })
    : makeToken('calc_out.safe_convertible_note.row.conversion_price_discount_governs', 'Conversion Price:    ' + money2(cvp) + ' per share  ← DISCOUNT GOVERNS', { price: money2(cvp) });
  const effectivePostMoneyRow = capGoverns
    ? makeToken('calc_out.safe_convertible_note.row.effective_post_money_cap', 'Effective post-money at conversion: ' + money(effectivePostMoney) + '  (cap governs)', { value: money(effectivePostMoney) })
    : makeToken('calc_out.safe_convertible_note.row.effective_post_money_discount', 'Effective post-money at conversion: ' + money(effectivePostMoney) + '  (discount governs)', { value: money(effectivePostMoney) });

  const r =
    '$calc_out.section.safe_convertible_note_calculator|⏰ SAFE / Convertible Note Calculator|\n\n' +
    '$calc_out.section.deal_snapshot|💰 Deal Snapshot:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.investment_amount|Investment|:          ' + money(investment) + '\n' +
    '• $calc_out.label.post_money_cap|Post-Money Cap|:      ' + money(postMoneyCap) + '\n' +
    '• $calc_out.label.discount_rate|Discount Rate|:       ' + discountRate + '%\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.effective_pre_money', 'Effective Pre-Money: ' + money(effectivePreMoney) + '  (cap − investment)', { value: money(effectivePreMoney) }) + '\n' +
    '• $calc_out.label.safe_type|SAFE Type|:           ' + typeRow + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.safe_convertible_note_conversion_mechanics|📐 Conversion Mechanics:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.cap_price', 'Cap Price:           ' + money2(cp) + ' per share  (post-money cap / (existing + SAFE shares))', { price: money2(cp) }) + '\n' +
    '• ' + discountPriceRow + '\n' +
    '• ' + conversionPriceRow + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.shares_issued', 'Shares Issued:       ' + shares(safeShares) + '  (' + money(investment) + ' ÷ ' + money2(cvp) + ')', { shares: shares(safeShares), investment: money(investment), price: money2(cvp) }) + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.safe_ownership', 'SAFE Ownership:      ' + pct(own) + ' at conversion', { pct: pct(own) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.deal_health|🩺 Deal Health:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + dh.emoji + ' ' + dealHealthRow + '\n' +
    '• ' + dish.emoji + ' ' + discountHealthRow + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.conversion_trigger', 'Conversion trigger:  whichever is lower (cap or discount) at next priced round') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.safe_convertible_note_ownership_outcomes|🎯 Ownership Outcomes:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.existing_pool_header', 'Existing Pool (founder + prior investors + options):') + '\n' +
    '    ' + makeToken('calc_out.safe_convertible_note.row.pre_safe', 'pre-SAFE:  100.0%  (' + shares(existingShares) + ' shares)', { shares: shares(existingShares) }) + '\n' +
    '    ' + makeToken('calc_out.safe_convertible_note.row.post_safe', 'post-SAFE: ' + pct(existingOwn) + '  (' + shares(existingShares) + ' of ' + shares(existingShares + safeShares) + ' shares)', { pct: pct(existingOwn), existing: shares(existingShares), total: shares(existingShares + safeShares) }) + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.safe_holder', 'SAFE Holder: ' + pct(own) + '  (' + shares(safeShares) + ' shares at conversion)', { pct: pct(own), shares: shares(safeShares) }) + '\n' +
    '• $calc_out.label.pie|Pie|: ' + pieChart + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.safe_convertible_note_dilution_analysis|⚖️ Dilution Analysis:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.existing_pool_dilution', 'Existing pool dilution: −' + pct(own) + '  (from 100% to ' + pct(existingOwn) + ')', { diluted: pct(own), remaining: pct(existingOwn) }) + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.safe_as_pct_of_post', 'SAFE-as-%-of-post: ' + pct(own), { pct: pct(own) }) + '\n' +
    '• ' + effectivePostMoneyRow + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.cap_sensitivity', 'Cap sensitivity: at 2× cap ($' + fmt(postMoneyCap * 2) + '), SAFE holder would get ' + pct(safeOwnership(safeSharesAtCap(investment, postMoneyCap * 2, existingShares), existingShares)) + ' instead of ' + pct(own), { cap: '$' + fmt(postMoneyCap * 2), at2x: pct(safeOwnership(safeSharesAtCap(investment, postMoneyCap * 2, existingShares), existingShares)), now: pct(own) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.whatif_double_safe', 'Double the SAFE ($' + fmt(investment * 2) + '):            existing pool drops to ' + pct(1 - doubleOwn) + ', SAFE holder rises to ' + pct(doubleOwn), { amount: '$' + fmt(investment * 2), existing: pct(1 - doubleOwn), safe: pct(doubleOwn) }) + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.whatif_lower_cap', 'Lower cap to $' + fmt(lowerCap) + ':                SAFE holder gets ' + pct(lowerCapOwn) + ', existing pool drops to ' + pct(1 - lowerCapOwn), { cap: '$' + fmt(lowerCap), safe: pct(lowerCapOwn), existing: pct(1 - lowerCapOwn) }) + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.whatif_add_discount', 'Add 20% discount:                conversion at ' + money2(withDiscountCvp) + ' per share, SAFE holder gets ' + pct(withDiscountOwn), { price: money2(withDiscountCvp), safe: pct(withDiscountOwn) }) + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.whatif_no_cap', 'No cap (cap = $100M):            effectively discount-only, SAFE holder gets ' + pct(noCapOwn), { safe: pct(noCapOwn) }) + '\n' +
    '• ' + makeToken('calc_out.safe_convertible_note.row.whatif_stack_prior_safe', 'Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership ' + pct(stackedOwn), { total: pct(stackedOwn) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 different cap levels
  const caps = [1000000, 3000000, 5000000, 10000000, 20000000];
  for (let idx = 0; idx < caps.length; idx++) {
    const c1 = caps[idx];
    const s1 = safeSharesAtCap(investment, c1, existingShares);
    const o1 = safeOwnership(s1, existingShares);
    results.push(
      '$calc_out.label.comparison|Comparison|: ' +
        makeToken('calc_out.safe_convertible_note.row.comparison_detail', '$' + fmt(c1) + ' cap on $' + fmt(investment) + ' SAFE → SAFE holder gets ' + pct(o1) + ' (' + shares(s1) + ' shares)', { cap: '$' + fmt(c1), investment: '$' + fmt(investment), own: pct(o1), shares: shares(s1) }),
    );
  }

  return results;
}

// ============== customFn ==============

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 服务端与客户端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let g=function(o){return Number.isNaN(o)?0:Math.max(0,o)},h=function(o,e,c){const r=e-o;return r<=0||c<=0?0:o*c/r},I=function(o,e,c){return e<=0||c<=0?0:e/c},P=function(o,e,c){return o<=0||e<=0?1/0:o/e*(1-c/100)},M=function(o,e){return Math.min(o,e)},p=function(o,e){const c=e+o;return c<=0?0:o/c},q=function(o){return o<5?{emoji:"🟠",label:"low cap — aggressive for founder"}:o<=10?{emoji:"🟡",label:"standard cap"}:{emoji:"🟢",label:"founder-friendly cap"}},H=function(o){return o===0?{emoji:"🟢",label:"no discount (post-money standard)"}:o<=15?{emoji:"🟡",label:"moderate discount"}:o<=25?{emoji:"🟠",label:"high discount"}:{emoji:"🔴",label:"very high discount — unusual"}},G=function(o,e){return o>0&&e===0?"Post-Money SAFE (YC Standard)":o>0&&e>0?"Post-Money SAFE with Discount":o<=0&&e>0?"Discount-Only SAFE (Pre-Conversion)":"Custom SAFE"},K=function(o){const e=g(parseFloat(o.investmentAmount)||0),c=g(parseFloat(o.postMoneyCap)||0),r=g(parseFloat(o.discountRate)||0),s=g(parseFloat(o.existingShares)||0),V=g(parseFloat(o.nextRoundValuation)||0);if(c>0&&c<=e)return[\`$calc_out.section.safe_convertible_note_calculator|⏰ SAFE / Convertible Note Calculator|

\`+t("calc_out.safe_convertible_note.row.error_cap_not_exceeding_investment","💰 The post-money cap ($"+c.toLocaleString()+") must exceed the investment amount ($"+e.toLocaleString()+"). A SAFE cannot have a cap lower than the investment it represents.",{cap:"$"+c.toLocaleString(),investment:"$"+e.toLocaleString()})];if(e<=0||c<=0||s<=0)return[\`$calc_out.section.safe_convertible_note_calculator|⏰ SAFE / Convertible Note Calculator|

\`+t("calc_out.safe_convertible_note.row.enter_inputs_required","💰 Enter investment amount, post-money cap, and existing fully diluted shares to see SAFE conversion mechanics.")];const D=c-e,E=I(c,D,s),O=P(V>0?V:c,s,r),d=M(E,O),v=e/d,i=p(v,s),y=1-i,j=c/e,S=q(j),w=H(r),b=G(c,r),u=a=>a.toLocaleString("en-US",{maximumFractionDigits:0}),f=a=>"$"+u(a),l=a=>"$"+a.toFixed(2),n=a=>(a*100).toFixed(1)+"%",_=a=>Math.round(a).toLocaleString("en-US"),Y=Math.round(i*20),tt=20-Y,et="▓".repeat(tt)+"░".repeat(Y)+"  $calc_out.label.existing|Existing| "+n(y)+"  |  SAFE "+n(i),m=d*(s+v),B=d===E,ot=h(e*2,c,s),C=p(ot,s),A=e*6,nt=A>e?h(e,A,s):0,x=A>e?p(nt,s):0,N=M(E,P(c,s,20)),ct=e/N,J=p(ct,s),st=h(e,1e8,s),W=p(st,s),rt=h(25e4,4e6,s)+v,z=p(rt,s);let $;r===0?$=t("calc_out.safe_convertible_note.row.tip_no_discount","💡 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder’s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic."):r>15&&j<8?$=t("calc_out.safe_convertible_note.row.tip_aggressive_terms","💡 Tip: Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low."):y<.5?$=t("calc_out.safe_convertible_note.row.tip_heavy_dilution","💡 Tip: Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor."):$=t("calc_out.safe_convertible_note.row.tip_standard_terms","💡 Tip: Standard terms: $5M post-money cap on $500K raise → ~10% dilution. If investor asks for >20% discount, that’s a red flag. Pro-rata rights are negotiable but rarely granted at SAFE stage.");const F=j.toFixed(1),it=S.label==="standard cap"?t("calc_out.safe_convertible_note.row.deal_health_standard",S.label+" (cap is "+F+"× investment)",{ratio:F}):S.label==="low cap — aggressive for founder"?t("calc_out.safe_convertible_note.row.deal_health_low_cap",S.label+" (cap is "+F+"× investment)",{ratio:F}):t("calc_out.safe_convertible_note.row.deal_health_founder_friendly",S.label+" (cap is "+F+"× investment)",{ratio:F}),at=w.label==="no discount (post-money standard)"?t("calc_out.safe_convertible_note.row.discount_health_none",w.label):w.label==="moderate discount"?t("calc_out.safe_convertible_note.row.discount_health_moderate",w.label):w.label==="high discount"?t("calc_out.safe_convertible_note.row.discount_health_high",w.label):t("calc_out.safe_convertible_note.row.discount_health_very_high",w.label),lt=t(b==="Post-Money SAFE (YC Standard)"?"calc_out.safe_convertible_note.row.type_post_money_standard":b==="Post-Money SAFE with Discount"?"calc_out.safe_convertible_note.row.type_post_money_discount":b==="Discount-Only SAFE (Pre-Conversion)"?"calc_out.safe_convertible_note.row.type_discount_only":"calc_out.safe_convertible_note.row.type_custom",b),_t=r>0?t("calc_out.safe_convertible_note.row.discount_price","Discount Price:      "+l(O)+" per share  (next round × (1 − discount))",{price:l(O)}):t("calc_out.safe_convertible_note.row.discount_price_none","Discount Price:      n/a (no discount)"),ut=B?t("calc_out.safe_convertible_note.row.conversion_price_cap_governs","Conversion Price:    "+l(d)+" per share  ← CAP GOVERNS",{price:l(d)}):t("calc_out.safe_convertible_note.row.conversion_price_discount_governs","Conversion Price:    "+l(d)+" per share  ← DISCOUNT GOVERNS",{price:l(d)}),pt=B?t("calc_out.safe_convertible_note.row.effective_post_money_cap","Effective post-money at conversion: "+f(m)+"  (cap governs)",{value:f(m)}):t("calc_out.safe_convertible_note.row.effective_post_money_discount","Effective post-money at conversion: "+f(m)+"  (discount governs)",{value:f(m)}),Q=[\`$calc_out.section.safe_convertible_note_calculator|⏰ SAFE / Convertible Note Calculator|

$calc_out.section.deal_snapshot|💰 Deal Snapshot:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.investment_amount|Investment|:          \`+f(e)+\`
• $calc_out.label.post_money_cap|Post-Money Cap|:      \`+f(c)+\`
• $calc_out.label.discount_rate|Discount Rate|:       \`+r+\`%
• \`+t("calc_out.safe_convertible_note.row.effective_pre_money","Effective Pre-Money: "+f(D)+"  (cap − investment)",{value:f(D)})+\`
• $calc_out.label.safe_type|SAFE Type|:           \`+lt+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.safe_convertible_note_conversion_mechanics|📐 Conversion Mechanics:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.safe_convertible_note.row.cap_price","Cap Price:           "+l(E)+" per share  (post-money cap / (existing + SAFE shares))",{price:l(E)})+\`
• \`+_t+\`
• \`+ut+\`
• \`+t("calc_out.safe_convertible_note.row.shares_issued","Shares Issued:       "+_(v)+"  ("+f(e)+" ÷ "+l(d)+")",{shares:_(v),investment:f(e),price:l(d)})+\`
• \`+t("calc_out.safe_convertible_note.row.safe_ownership","SAFE Ownership:      "+n(i)+" at conversion",{pct:n(i)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.deal_health|🩺 Deal Health:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+S.emoji+" "+it+\`
• \`+w.emoji+" "+at+\`
• \`+t("calc_out.safe_convertible_note.row.conversion_trigger","Conversion trigger:  whichever is lower (cap or discount) at next priced round")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.safe_convertible_note_ownership_outcomes|🎯 Ownership Outcomes:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.safe_convertible_note.row.existing_pool_header","Existing Pool (founder + prior investors + options):")+\`
    \`+t("calc_out.safe_convertible_note.row.pre_safe","pre-SAFE:  100.0%  ("+_(s)+" shares)",{shares:_(s)})+\`
    \`+t("calc_out.safe_convertible_note.row.post_safe","post-SAFE: "+n(y)+"  ("+_(s)+" of "+_(s+v)+" shares)",{pct:n(y),existing:_(s),total:_(s+v)})+\`
• \`+t("calc_out.safe_convertible_note.row.safe_holder","SAFE Holder: "+n(i)+"  ("+_(v)+" shares at conversion)",{pct:n(i),shares:_(v)})+\`
• $calc_out.label.pie|Pie|: \`+et+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.safe_convertible_note_dilution_analysis|⚖️ Dilution Analysis:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.safe_convertible_note.row.existing_pool_dilution","Existing pool dilution: −"+n(i)+"  (from 100% to "+n(y)+")",{diluted:n(i),remaining:n(y)})+\`
• \`+t("calc_out.safe_convertible_note.row.safe_as_pct_of_post","SAFE-as-%-of-post: "+n(i),{pct:n(i)})+\`
• \`+pt+\`
• \`+t("calc_out.safe_convertible_note.row.cap_sensitivity","Cap sensitivity: at 2× cap ($"+u(c*2)+"), SAFE holder would get "+n(p(h(e,c*2,s),s))+" instead of "+n(i),{cap:"$"+u(c*2),at2x:n(p(h(e,c*2,s),s)),now:n(i)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+t("calc_out.safe_convertible_note.row.whatif_double_safe","Double the SAFE ($"+u(e*2)+"):            existing pool drops to "+n(1-C)+", SAFE holder rises to "+n(C),{amount:"$"+u(e*2),existing:n(1-C),safe:n(C)})+\`
• \`+t("calc_out.safe_convertible_note.row.whatif_lower_cap","Lower cap to $"+u(A)+":                SAFE holder gets "+n(x)+", existing pool drops to "+n(1-x),{cap:"$"+u(A),safe:n(x),existing:n(1-x)})+\`
• \`+t("calc_out.safe_convertible_note.row.whatif_add_discount","Add 20% discount:                conversion at "+l(N)+" per share, SAFE holder gets "+n(J),{price:l(N),safe:n(J)})+\`
• \`+t("calc_out.safe_convertible_note.row.whatif_no_cap","No cap (cap = $100M):            effectively discount-only, SAFE holder gets "+n(W),{safe:n(W)})+\`
• \`+t("calc_out.safe_convertible_note.row.whatif_stack_prior_safe","Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership "+n(z),{total:n(z)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+$],X=[1e6,3e6,5e6,1e7,2e7];for(let a=0;a<X.length;a++){const R=X[a],L=h(e,R,s),Z=p(L,s);Q.push("$calc_out.label.comparison|Comparison|: "+t("calc_out.safe_convertible_note.row.comparison_detail","$"+u(R)+" cap on $"+u(e)+" SAFE → SAFE holder gets "+n(Z)+" ("+_(L)+" shares)",{cap:"$"+u(R),investment:"$"+u(e),own:n(Z),shares:_(L)}))}return Q},U=function(o,e,c){var r=k(o);return Array.isArray(r)?r.join(\`
\`):String(r)};var ft=g,dt=h,vt=I,ht=P,wt=M,bt=p,gt=q,yt=H,St=G,Ft=K,Et=U,t=tk,T='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+T)(),k=function(o){return K(o)};return[U(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-safe-convertible-note-calculator',
  title: 'SAFE / Convertible Note Calculator',
  description:
    'Model your SAFE (Simple Agreement for Future Equity) round. See how valuation cap and discount rate interact, what ownership % the SAFE investor gets at conversion, and how much existing shareholders are diluted. Covers YC post-money SAFE, pre-money SAFE with discount, and discount-only structures.',
  inputs: [
    {
      name: 'investmentAmount',
      label: 'Investment Amount ($)',
      placeholder: 'e.g. 500000',
      type: 'number',
    },
    {
      name: 'postMoneyCap',
      label: 'Post-Money Valuation Cap ($)',
      placeholder: 'e.g. 5000000',
      type: 'number',
    },
    {
      name: 'discountRate',
      label: 'Discount Rate (%)',
      placeholder: 'e.g. 0 or 20',
      type: 'number',
    },
    {
      name: 'existingShares',
      label: 'Existing Fully Diluted Shares',
      placeholder: 'e.g. 1000000',
      type: 'number',
    },
    {
      name: 'nextRoundValuation',
      label: 'Expected Next Round Valuation ($)',
      placeholder: 'e.g. 5000000',
      type: 'number',
    },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
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
  generate(inputs: Record<string, string>): string[] {
    return calculateSafe(inputs);
  },
  staticExamples: ['$calc_out.section.safe_convertible_note_calculator|⏰ SAFE / Convertible Note Calculator|\n\n$calc_out.section.deal_snapshot|💰 Deal Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.investment_amount|Investment|:          $500,000\n• $calc_out.label.post_money_cap|Post-Money Cap|:      $5,000,000\n• $calc_out.label.discount_rate|Discount Rate|:       0%\n• $calc_out.safe_convertible_note.row.effective_pre_money{"value":"$4,500,000"}|Effective Pre-Money: $4,500,000  (cap − investment)|\n• $calc_out.label.safe_type|SAFE Type|:           $calc_out.safe_convertible_note.row.type_post_money_standard|Post-Money SAFE (YC Standard)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.safe_convertible_note_conversion_mechanics|📐 Conversion Mechanics:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.safe_convertible_note.row.cap_price{"price":"$4.50"}|Cap Price:           $4.50 per share  (post-money cap / (existing + SAFE shares))|\n• $calc_out.safe_convertible_note.row.discount_price_none|Discount Price:      n/a (no discount)|\n• $calc_out.safe_convertible_note.row.conversion_price_cap_governs{"price":"$4.50"}|Conversion Price:    $4.50 per share  ← CAP GOVERNS|\n• $calc_out.safe_convertible_note.row.shares_issued{"shares":"111,111","investment":"$500,000","price":"$4.50"}|Shares Issued:       111,111  ($500,000 ÷ $4.50)|\n• $calc_out.safe_convertible_note.row.safe_ownership{"pct":"10.0%"}|SAFE Ownership:      10.0% at conversion|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.deal_health|🩺 Deal Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 $calc_out.safe_convertible_note.row.deal_health_standard{"ratio":"10.0"}|standard cap (cap is 10.0× investment)|\n• 🟢 $calc_out.safe_convertible_note.row.discount_health_none|no discount (post-money standard)|\n• $calc_out.safe_convertible_note.row.conversion_trigger|Conversion trigger:  whichever is lower (cap or discount) at next priced round|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.safe_convertible_note_ownership_outcomes|🎯 Ownership Outcomes:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.safe_convertible_note.row.existing_pool_header|Existing Pool (founder + prior investors + options):|\n    $calc_out.safe_convertible_note.row.pre_safe{"shares":"1,000,000"}|pre-SAFE:  100.0%  (1,000,000 shares)|\n    $calc_out.safe_convertible_note.row.post_safe{"pct":"90.0%","existing":"1,000,000","total":"1,111,111"}|post-SAFE: 90.0%  (1,000,000 of 1,111,111 shares)|\n• $calc_out.safe_convertible_note.row.safe_holder{"pct":"10.0%","shares":"111,111"}|SAFE Holder: 10.0%  (111,111 shares at conversion)|\n• $calc_out.label.pie|Pie|: ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓░░  $calc_out.label.existing|Existing| 90.0%  |  SAFE 10.0%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.safe_convertible_note_dilution_analysis|⚖️ Dilution Analysis:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.safe_convertible_note.row.existing_pool_dilution{"diluted":"10.0%","remaining":"90.0%"}|Existing pool dilution: −10.0%  (from 100% to 90.0%)|\n• $calc_out.safe_convertible_note.row.safe_as_pct_of_post{"pct":"10.0%"}|SAFE-as-%-of-post: 10.0%|\n• $calc_out.safe_convertible_note.row.effective_post_money_cap{"value":"$5,000,000"}|Effective post-money at conversion: $5,000,000  (cap governs)|\n• $calc_out.safe_convertible_note.row.cap_sensitivity{"cap":"$10,000,000","at2x":"5.0%","now":"10.0%"}|Cap sensitivity: at 2× cap ($10,000,000), SAFE holder would get 5.0% instead of 10.0%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.safe_convertible_note.row.whatif_double_safe{"amount":"$1,000,000","existing":"80.0%","safe":"20.0%"}|Double the SAFE ($1,000,000):            existing pool drops to 80.0%, SAFE holder rises to 20.0%|\n• $calc_out.safe_convertible_note.row.whatif_lower_cap{"cap":"$3,000,000","safe":"16.7%","existing":"83.3%"}|Lower cap to $3,000,000:                SAFE holder gets 16.7%, existing pool drops to 83.3%|\n• $calc_out.safe_convertible_note.row.whatif_add_discount{"price":"$4.00","safe":"11.1%"}|Add 20% discount:                conversion at $4.00 per share, SAFE holder gets 11.1%|\n• $calc_out.safe_convertible_note.row.whatif_no_cap{"safe":"0.5%"}|No cap (cap = $100M):            effectively discount-only, SAFE holder gets 0.5%|\n• $calc_out.safe_convertible_note.row.whatif_stack_prior_safe{"total":"15.1%"}|Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership 15.1%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.safe_convertible_note.row.tip_no_discount|💡 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder’s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.|\n$calc_out.label.comparison|Comparison|: $calc_out.safe_convertible_note.row.comparison_detail{"cap":"$1,000,000","investment":"$500,000","own":"50.0%","shares":"1,000,000"}|$1,000,000 cap on $500,000 SAFE → SAFE holder gets 50.0% (1,000,000 shares)|\n$calc_out.label.comparison|Comparison|: $calc_out.safe_convertible_note.row.comparison_detail{"cap":"$3,000,000","investment":"$500,000","own":"16.7%","shares":"200,000"}|$3,000,000 cap on $500,000 SAFE → SAFE holder gets 16.7% (200,000 shares)|\n$calc_out.label.comparison|Comparison|: $calc_out.safe_convertible_note.row.comparison_detail{"cap":"$5,000,000","investment":"$500,000","own":"10.0%","shares":"111,111"}|$5,000,000 cap on $500,000 SAFE → SAFE holder gets 10.0% (111,111 shares)|\n$calc_out.label.comparison|Comparison|: $calc_out.safe_convertible_note.row.comparison_detail{"cap":"$10,000,000","investment":"$500,000","own":"5.0%","shares":"52,632"}|$10,000,000 cap on $500,000 SAFE → SAFE holder gets 5.0% (52,632 shares)|\n$calc_out.label.comparison|Comparison|: $calc_out.safe_convertible_note.row.comparison_detail{"cap":"$20,000,000","investment":"$500,000","own":"2.5%","shares":"25,641"}|$20,000,000 cap on $500,000 SAFE → SAFE holder gets 2.5% (25,641 shares)|'],
  faq: [
    {
      q: 'What is a SAFE and how does conversion work?',
      a: 'A SAFE (Simple Agreement for Future Equity) is Y Combinator’s standardized contract for early-stage startup funding. Unlike a priced round, a SAFE has no fixed share price at signing — instead, it converts to equity at a future priced round. The conversion price is the lower of two values: the valuation cap price (a discount to the cap) or the discount price (a discount to the next round). For a $500K SAFE on a $5M cap with 1M existing shares, the SAFE holder gets ~10% at conversion (post-money SAFE convention, YC standard since 2018).',
    },
    {
      q: 'What is the difference between pre-money and post-money SAFE?',
      a: 'Pre-money SAFE (YC’s older form, pre-2018): the cap refers to pre-money valuation, so the SAFE holder’s ownership at conversion depends on the size of the priced round — bigger rounds = more dilution for SAFE holder. Post-money SAFE (YC standard since 2018): the cap refers to post-money valuation, so the SAFE holder’s % is fixed at conversion. For founders, post-money SAFE is dramatically better because the math is predictable. Always use post-money SAFE unless the investor is strategic and willing to negotiate the discount differently.',
    },
    {
      q: 'How does the discount rate interact with the cap?',
      a: 'A SAFE typically has both a valuation cap (e.g., $5M) and a discount rate (e.g., 20%). At conversion, the SAFE holder gets the lower of: (1) the cap price = cap / total fully diluted shares, or (2) the discount price = next round price per share × (1 - discount). Example: $5M cap, 20% discount, next round at $10M → cap price = $4.50/share, discount price = $8.00/share, SAFE converts at $4.50 (cap wins). But if next round is at $5M → cap price $4.50, discount price $4.00, SAFE converts at $4.00 (discount wins).',
    },
    {
      q: 'What is MFN (Most Favored Nation) in a SAFE?',
      a: 'MFN is a clause that gives the SAFE holder the right to upgrade to better terms if you issue a subsequent SAFE with more favorable terms (lower cap, higher discount, or other sweeteners). MFN is common for early SAFEs to protect the first investor from being penalized for being early. The downside for founders: each new SAFE with MFN can create a chain of upgrades that erodes your future flexibility. Most YC post-money SAFEs don’t include MFN by default — only add it if the investor is a strategic anchor.',
    },
    {
      q: 'When does a SAFE convert and what triggers it?',
      a: 'A SAFE converts at a "liquidity event" — most commonly a priced equity round (Series Seed, Series A, etc.) where the company issues preferred stock to new investors. At conversion, the SAFE holder’s investment is converted to shares at the conversion price (min of cap and discount). Other less common triggers: an IPO, an acquisition (change of control), or the maturity date (typically 10 years after issuance — rarely reached in practice). Note: SAFEs do not accrue interest (unlike convertible notes), so the investment amount at conversion is exactly what was originally invested.',
    },
    { q: "What is a SAFE (Simple Agreement for Future Equity)?", a: "SAFE = Simple Agreement for Future Equity. Created by Y Combinator. Investor gives money now, gets equity later (when priced round happens). No interest, no maturity date. Discount: 10-30% off next round price. Valuation cap: max valuation to convert at. MFN: most-favored-nation (gets best terms). Most: 70-80% of seed rounds use SAFEs. Cheaper, faster than priced rounds. Most common: post-money SAFE (YC standard)." },
    { q: "How is a SAFE different from a convertible note?", a: "SAFE: not a debt (no interest, no maturity). Convertible note: debt that converts (has interest, maturity date). For founder: SAFE is better (no debt on books, no maturity pressure). For investor: convertible note has more protections (interest, maturity, senior). SAFE is preferred for early-stage. Use convertible: when investor wants debt-like protection. Most rounds: SAFE. 80%+ of seed rounds now use SAFEs." },
    { q: "What is a valuation cap?", a: "Valuation cap: max valuation at which SAFE converts. For SAFE at $5M cap: investor converts at min of (cap or next round price). If next round is $10M valuation: investor gets $5M valuation. If next round is $3M: investor gets $3M (no benefit). Cap protects investors from high-valuation rounds. Founder-friendly: higher cap. Investor-friendly: lower cap. Most: 1.5-3x current valuation. Trade-off." },
    { q: "What is a discount rate?", a: "Discount: % off next round price. For 20% discount: investor gets shares at 80% of next round price. Combined with cap: investor gets min of (cap or discounted price). 15-25% discount. Common: 20%. For very early: 20-30%. For later: 10-20%. discount + cap is standard. Cap is more important. Most investors: cap is non-negotiable. Discount: less important. Cap drives the economics." },
    { q: "How does a SAFE convert at a priced round?", a: "At priced round: SAFE converts to equity. Calculation: investment / conversion_price. Conversion price = min(price based on cap, price based on discount). For $500K SAFE at $5M cap, 20% discount, $10M priced: 1) Cap: 500K/5M = 10%, 2) Discount: 500K/(10M × 0.8) = 6.25%, 3) Investor gets 10% (cap). Founder dilution: 10% from SAFE. Most: cap is the floor. Discount only matters if no cap or cap is very high." },
    { q: "What is MFN (Most Favored Nation)?", a: "MFN: SAFE gets best terms of any future SAFE. For first SAFE without MFN, second SAFE with better terms: first SAFE still has original terms. With MFN: first SAFE gets the better terms. MFN is investor-friendly. Most SAFEs: include MFN. YC: standard MFN. Trade-off: founder-friendly to exclude (later SAFEs get worse terms). MFN is standard. Avoid no MFN (later SAFEs will demand it anyway)." },
    { q: "How much equity does a $500K SAFE at $5M cap give?", a: "Calculate: $500K / $5M cap = 10% of post-money. But: post-money SAFE includes the SAFE itself. For $500K SAFE at $5M cap, $5M round: 1) Post-money = $5M, 2) SAFE = 10%, 3) New investor at $5M post-money = $5M-$500K = $4.5M for new = same 10% if $4.5M price. For YC post-money SAFE: SAFE ownership = investment / cap. So 10% from SAFE. Most: 10% for $500K SAFE at $5M cap. Most: aim for 10-25% dilution per round." },
    { q: "What is the post-money SAFE vs pre-money SAFE?", a: "Pre-money SAFE: cap = pre-money valuation (excludes SAFE). YC post-money SAFE: cap = post-money valuation (includes SAFE). Pre-money: founder-friendly, hard to model. Post-money: investor-friendly, easy to model. Most: post-money SAFE is YC standard (since 2018). For $5M cap post-money: SAFE = 10% immediately. For pre-money $5M: SAFE = 9% (5M/5.5M). Most: 90%+ of SAFEs are now post-money. Use YC standard." },
  ],
  howToUse: [
    'Enter the SAFE investment amount (e.g., $500,000).',
    'Set the post-money valuation cap (e.g., $5,000,000 for a typical seed round).',
    'Enter the discount rate (0% for standard post-money SAFE, 20% for pre-money SAFE).',
    'Enter your existing fully diluted shares (founder + prior investors + option pool).',
    'Set the expected next round valuation (default = cap; adjust if you expect a different round size).',
    'Review the conversion mechanics, deal health, and ownership outcomes.',
    'Check the 5 what-if scenarios for sensitivity analysis (double SAFE, lower cap, etc.).',
  ],
  engineKey: true,
};

registerEngine(engine);
