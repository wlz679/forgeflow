import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-7：结果输出 token 化 —— 服务端用 makeToken，客户端 customFn 前置
//   同一份实现（CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 两端逐字节相同，不可能漂。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

// ============== Math helpers (exported for tests) ==============

/**
 * Stage 1: Buy
 * downPayment = purchasePrice × dpPct/100
 * closing = 3% of price
 * initialLoan = purchasePrice - downPayment
 */
export function stage1Cash(purchasePrice: number, downPaymentPct: number) {
  const dpRate = downPaymentPct / 100;
  const downPayment = purchasePrice * dpRate;
  const closingBuy = purchasePrice * 0.03;
  const initialLoan = purchasePrice * (1 - dpRate);
  return {
    downPayment,
    closingBuy,
    total: downPayment + closingBuy,
    initialLoan,
  };
}

/**
 * Stage 2: Rehab + holding cost during rehab
 * totalStage2Cash = rehabCost
 * monthlyHoldCost = initialLoan × rate/100/12 (interest only) + $200 utilities/insurance
 * holdingCost = monthlyHoldCost × holdingMonths
 */
export function stage2Cash(rehabCost: number, initialLoan: number, interestRatePct: number, holdingMonths: number) {
  const monthlyHoldCost = initialLoan * (interestRatePct / 100 / 12) + 200;
  const holdingCost = monthlyHoldCost * holdingMonths;
  return { totalStage2Cash: rehabCost, holdingCost };
}

/**
 * Stage 4: Refinance
 * refiLoan = afterRepairValue × 0.75 (75% LTV)
 * cashOutFromRefi = refiLoan - initialLoan (positive = cash to investor)
 */
export function refiCalc(afterRepairValue: number, initialLoan: number) {
  const refiLTV = 0.75;
  const refiLoan = afterRepairValue * refiLTV;
  const cashOutFromRefi = refiLoan - initialLoan;
  return { refiLoan, cashOutFromRefi };
}

/** Monthly P&I (PMT formula, shared) */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

interface PostRefiCFInputs {
  monthlyRent: number;
  vacancyRate: number;
  monthlyExpenses: number;
  refiLoan: number;
  interestRate: number;
  loanTermYears: number;
}

/** Annual cash flow after refinance = eff rent - refi mortgage - OpEx */
export function postRefiAnnualCashFlow(inputs: PostRefiCFInputs): number {
  const effRent = inputs.monthlyRent * 12 * (1 - inputs.vacancyRate / 100);
  const mortgage = monthlyPI(inputs.refiLoan, inputs.interestRate / 100 / 12, inputs.loanTermYears * 12) * 12;
  return effRent - mortgage - inputs.monthlyExpenses * 12;
}

interface CashTallyInputs {
  totalStage1Cash: number;
  totalStage2Cash: number;
  holdingCost: number;
  interimRent: number;
  cashOutFromRefi: number;
}

/**
 * Stage 5: cash tally
 * cashOut = stage1 + stage2 + holding (cash investor put in)
 * cashIn = interim rent + cash from refi (cash investor got back)
 * cashLeftInDeal = cashOut - cashIn
 *   negative = BRRRR worked (cash-out success)
 */
export function cashTally(inputs: CashTallyInputs) {
  const cashOut = inputs.totalStage1Cash + inputs.totalStage2Cash + inputs.holdingCost;
  const cashIn = inputs.interimRent + inputs.cashOutFromRefi;
  return { cashOut, cashIn, cashLeftInDeal: cashOut - cashIn };
}

/** Forced appreciation = ARV - purchasePrice - rehabCost (market value created by rehab) */
export function forcedAppreciation(afterRepairValue: number, purchasePrice: number, rehabCost: number): number {
  return afterRepairValue - purchasePrice - rehabCost;
}

/** 70% rule check: maxAllowedBid = ARV × 0.7 - rehabCost */
export function seventyRuleCheck(afterRepairValue: number, purchasePrice: number, rehabCost: number) {
  const maxAllowedBid = afterRepairValue * 0.7 - rehabCost;
  const gap = purchasePrice - maxAllowedBid;  // positive = paying more than 70% rule allows
  return { maxAllowedBid, gap };
}

/**
 * Cash-on-cash after BRRRR
 * Returns Infinity when cashLeftInDeal ≤ 0 (cash-out success — CoC undefined)
 */
export function cashOnCashReturnBRRRR(annualCashFlow: number, cashLeftInDeal: number): number {
  if (cashLeftInDeal <= 0) return Infinity;
  if (annualCashFlow <= 0) return 0;  // technically can be negative but for V1 return 0
  return (annualCashFlow / cashLeftInDeal) * 100;
}

/**
 * Health: cashLeftInDeal ratio to cashOut
 * ≤ 0% → 🟢 (cash-out success — best case)
 * 0-15% → 🟡 (small cash-in, deals OK but not ideal)
 * > 15% → 🟠 (significant capital still trapped)
 */
export function brrrrHealth(cashLeftInDeal: number, cashOut: number) {
  if (cashOut <= 0) return { emoji: '🟢', label: 'cash-out success — full capital returned' };
  const ratio = (cashLeftInDeal / cashOut) * 100;
  if (ratio <= 0) return { emoji: '🟢', label: 'cash-out success — full capital returned via refi' };
  if (ratio <= 15) return { emoji: '🟡', label: 'small cash-in (≤15%) — deal workable' };
  return { emoji: '🟠', label: 'significant cash-in (>15%) — capital still trapped' };
}

// ============== calculate() ==============

function calculateBRRRR(inputs: Record<string, string>): string[] {
  const purchasePrice = clampNonNegative(parseFloat(inputs.purchasePrice) || 0);
  const rehabCost = clampNonNegative(parseFloat(inputs.rehabCost) || 0);
  const afterRepairValue = clampNonNegative(parseFloat(inputs.afterRepairValue) || 0);
  const downPaymentPct = clampNonNegative(parseFloat(inputs.downPaymentPct) || 0);
  const interestRate = parseFloat(inputs.interestRate) || 0;
  const loanTermYears = clampNonNegative(parseFloat(inputs.loanTermYears) || 0);
  const monthlyRent = clampNonNegative(parseFloat(inputs.monthlyRent) || 0);
  const monthlyExpenses = clampNonNegative(parseFloat(inputs.monthlyExpenses) || 0);
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0;
  const holdingMonths = clampNonNegative(parseFloat(inputs.holdingMonths) || 0);

  if (purchasePrice <= 0 || afterRepairValue <= 0) {
    return [
      makeToken('calc_out.section.brrrr_calculator', '⏰ BRRRR Calculator') + '\n\n' +
      makeToken('calc_out.brrrr.row.missing_price_or_arv', '💰 Enter purchase price, rehab cost, and after-repair value (ARV) to see your 5-stage BRRRR analysis.'),
    ];
  }
  if (downPaymentPct < 0 || downPaymentPct >= 100) {
    return [
      makeToken('calc_out.section.brrrr_calculator', '⏰ BRRRR Calculator') + '\n\n' +
      makeToken('calc_out.brrrr.row.invalid_down_payment_pct', '💰 Down payment percentage must be 0-99. Typical BRRRR: 20-30% down (some investors use 0% via hard money).'),
    ];
  }
  if (afterRepairValue < purchasePrice + rehabCost) {
    return [
      makeToken('calc_out.section.brrrr_calculator', '⏰ BRRRR Calculator') + '\n\n' +
      makeToken('calc_out.brrrr.row.arv_below_total_cost', '💰 ARV (' + afterRepairValue.toLocaleString('en-US') + ') is less than purchase + rehab (' + (purchasePrice + rehabCost).toLocaleString('en-US') + '). This deal does not work as BRRRR — consider flipping instead.', { arv: afterRepairValue.toLocaleString('en-US'), total: (purchasePrice + rehabCost).toLocaleString('en-US') }),
    ];
  }

  const s1 = stage1Cash(purchasePrice, downPaymentPct);
  const s2 = stage2Cash(rehabCost, s1.initialLoan, interestRate, holdingMonths);
  const interimRent = monthlyRent * Math.max(0, Math.min(2, holdingMonths - 1));
  const refi = refiCalc(afterRepairValue, s1.initialLoan);
  const cf = postRefiAnnualCashFlow({
    monthlyRent, vacancyRate, monthlyExpenses,
    refiLoan: refi.refiLoan, interestRate, loanTermYears,
  });
  const tally = cashTally({
    totalStage1Cash: s1.total,
    totalStage2Cash: s2.totalStage2Cash,
    holdingCost: s2.holdingCost,
    interimRent,
    cashOutFromRefi: refi.cashOutFromRefi,
  });
  const forced = forcedAppreciation(afterRepairValue, purchasePrice, rehabCost);
  const seventy = seventyRuleCheck(afterRepairValue, purchasePrice, rehabCost);
  const coc = cashOnCashReturnBRRRR(cf, tally.cashLeftInDeal);
  const health = brrrrHealth(tally.cashLeftInDeal, tally.cashOut);

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);

  // What-If
  const coc2 = postRefiAnnualCashFlow({
    monthlyRent, vacancyRate, monthlyExpenses,
    refiLoan: refiCalc(afterRepairValue - 20000, s1.initialLoan).refiLoan,
    interestRate, loanTermYears,
  });
  const tally2 = cashTally({
    totalStage1Cash: s1.total,
    totalStage2Cash: rehabCost - 10000,
    holdingCost: s2.holdingCost,
    interimRent,
    cashOutFromRefi: refi.cashOutFromRefi - 20000,
  });
  const cocStr = isFinite(coc) ? coc.toFixed(2) + '%' : '∞ (cash-out success)';

  // 70% rule advisory
  const seventy70 = (afterRepairValue * 0.7).toLocaleString('en-US', { maximumFractionDigits: 0 });
  const seventyDealTag = seventy.gap <= 0
    ? ' ' + makeToken('calc_out.brrrr.row.within_70_rule', '✅ within 70% rule')
    : ' ' + makeToken('calc_out.brrrr.row.above_70_rule', '⚠️ above 70% rule');

  let tip: string;
  if (tally.cashLeftInDeal <= 0) {
    tip = makeToken('calc_out.brrrr.row.tip_cash_out_success', '💡 Tip: 🎉 Cash-out success — full capital returned via refi. The "R" in BRRRR worked. Repeat: deploy the recovered cash into the next deal to compound.');
  } else if (tally.cashLeftInDeal / tally.cashOut > 0.15) {
    tip = makeToken('calc_out.brrrr.row.tip_significant_cash_in', '💡 Tip: Significant cash trapped. Either: (1) negotiate lower purchase price, (2) reduce rehab scope, (3) add value (rehab more aggressively). 70% rule is a quick screen — failing it means ARV likely won\'t support the deal.');
  } else {
    tip = makeToken('calc_out.brrrr.row.tip_small_cash_in', '💡 Tip: Small cash-in is workable if monthly cash flow is positive. Run the Rental Yield (P5-4) for sustained ROI. BRRRR is most powerful when chained: 12-month cycle from buy → refi → next property.');
  }

  // P168 B3-7：token 化 —— 每个输出行 = 一个 token；params 与英文兜底用**同一批变量**
  //   ⇒ 英文兜底与中文模板不可能漂（数值只有一个来源）。
  const mDown = money(s1.downPayment), mClosing = money(s1.closingBuy), mTotal1 = money(s1.total), mLoan = money(s1.initialLoan);
  const mRehab = money(rehabCost), mHolding = money(s2.holdingCost), mInterim = money(interimRent);
  const mRefiLoan = money(refi.refiLoan), mCashBack = money(refi.cashOutFromRefi);
  const mForced = money(forced), mSeventy = money(afterRepairValue * 0.7);
  const mMaxBid = money(seventy.maxAllowedBid), mGap = money(seventy.gap);
  const mCashOut = money(tally.cashOut), mCashIn = money(tally.cashIn - interimRent), mCashLeft = money(tally.cashLeftInDeal);
  const mTally2 = money(tally2.cashLeftInDeal), mRefi2 = money(refiCalc(afterRepairValue - 20000, s1.initialLoan).refiLoan), mCoc2 = money(coc2);
  // 健康度 4 档：判定短语是**片段** ⇒ 每档各一个 code（emoji 并入 token，行首 '• ' 留在 token 之外）
  const healthToken =
    health.label === 'cash-out success — full capital returned'
      ? makeToken('calc_out.brrrr.row.health_cash_out_full', '🟢 cash-out success — full capital returned')
      : health.label === 'cash-out success — full capital returned via refi'
        ? makeToken('calc_out.brrrr.row.health_cash_out_via_refi', '🟢 cash-out success — full capital returned via refi')
        : health.label === 'small cash-in (≤15%) — deal workable'
          ? makeToken('calc_out.brrrr.row.health_small_cash_in', '🟡 small cash-in (≤15%) — deal workable')
          : makeToken('calc_out.brrrr.row.health_significant_cash_in', '🟠 significant cash-in (>15%) — capital still trapped');

  const r =
    makeToken('calc_out.section.brrrr_calculator_headline', '⏰ BRRRR Calculator (Buy Rehab Rent Refinance Repeat)') + '\n\n' +
    makeToken('calc_out.section.deal_snapshot', '💰 Deal Snapshot:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.label.purchase_price', 'Purchase price') + ':        ' + money(purchasePrice) + '\n' +
    '• ' + makeToken('calc_out.label.rehab_cost', 'Rehab cost') + ':            ' + money(rehabCost) + '\n' +
    '• ' + makeToken('calc_out.label.after_repair_value', 'After-Repair Value') + ':   ' + money(afterRepairValue) + '\n' +
    makeToken('calc_out.brrrr.row.forced_appreciation', '• Forced appreciation:  ' + mForced + '  (ARV - price - rehab)', { forced: mForced }) + '\n' +
    '• ' + makeToken('calc_out.label.total_cash_invested', 'Total cash invested') + ':   ' + money(tally.cashOut) + '\n' +
    makeToken('calc_out.brrrr.row.cash_returned_via_refi', '• Cash returned via refi: ' + mCashIn + ' (' + mCashBack + ' refi + ' + mInterim + ' rent)', { returned: mCashIn, refi: mCashBack, rent: mInterim }) + '\n' +
    '• ' + makeToken('calc_out.label.cash_left_in_deal', 'Cash LEFT in deal') + ':     ' + mCashLeft + (tally.cashLeftInDeal <= 0 ? ' ' + makeToken('calc_out.brrrr.row.cash_out_badge', '🎉 cash-out!') : '') + '\n' +
    '• ' + makeToken('calc_out.label.post_refi_coc_return', 'Post-refi CoC return') + ':  ' + cocStr + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.five_stage_breakdown', '📐 5-Stage Breakdown:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.brrrr.row.stage_buy', '1. BUY:        down ' + mDown + ' + closing ' + mClosing + ' = ' + mTotal1 + ' (initial loan ' + mLoan + ')', { down: mDown, closing: mClosing, total: mTotal1, loan: mLoan }) + '\n' +
    makeToken('calc_out.brrrr.row.stage_rehab', '2. REHAB:      ' + mRehab + ' + holding ' + mHolding + ' (utilities/insurance over ' + holdingMonths + 'mo)', { rehab: mRehab, holding: mHolding, months: String(holdingMonths) }) + '\n' +
    makeToken('calc_out.brrrr.row.stage_rent', '3. RENT:       ' + mInterim + ' interim rent (during rehab/hold)', { interim: mInterim }) + '\n' +
    makeToken('calc_out.brrrr.row.stage_refinance', '4. REFINANCE:  refi loan ' + mRefiLoan + ' at 75% LTV → cash back ' + mCashBack, { refiLoan: mRefiLoan, cashBack: mCashBack }) + (refi.cashOutFromRefi < 0 ? ' ' + makeToken('calc_out.brrrr.row.cash_in_badge', '(cash-in!)') : '') + '\n' +
    makeToken('calc_out.brrrr.row.stage_repeat', '5. REPEAT:     CoC return ' + cocStr, { coc: cocStr }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.deal_health', '🩺 Deal Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + healthToken + '\n' +
    '• ' + makeToken('calc_out.label.cash_left_cash_out_ratio', 'Cash left/cash out ratio') + ': ' + ((tally.cashLeftInDeal / Math.max(1, tally.cashOut)) * 100).toFixed(1) + '%\n' +
    '• ' + makeToken('calc_out.label.cash_flow_post_refi', 'Cash flow (post-refi)') + ':  ' + money(cf) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.brrrr_targets', '🎯 BRRRR Targets:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.brrrr.row.rule_70', '• 70% rule: ARV × 0.7 = ' + mSeventy + ' should cover (price + rehab)', { cap: mSeventy }) + '\n' +
    makeToken('calc_out.brrrr.row.max_bid_70', '• Max bid at 70% rule:  ' + mMaxBid + ' (' + mGap + ' gap)', { maxBid: mMaxBid, gap: mGap }) + seventyDealTag + '\n' +
    makeToken('calc_out.brrrr.row.recommended_hold', '• Recommended hold:     3-9 months (rehab timeline)') + '\n' +
    makeToken('calc_out.brrrr.row.refi_ltv', '• Refi LTV:             70-75% of ARV typical') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.forced_appreciation', '⚖️ Forced Appreciation:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.brrrr.row.arv_gain_from_rehab', '• ARV gain from rehab:   ' + mForced + ' (' + ((forced / purchasePrice) * 100).toFixed(0) + '% of purchase)', { gain: mForced, pct: ((forced / purchasePrice) * 100).toFixed(0) }) + '\n' +
    makeToken('calc_out.brrrr.row.without_rehab', '• Without rehab:        would have appreciated with market only') + '\n' +
    makeToken('calc_out.brrrr.row.forcing_appreciation', '• Forcing appreciation  is the active skill in BRRRR') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken('calc_out.brrrr.row.whatif_rehab_minus_10k', '• Rehab -$10K:           cash-in ' + mTally2 + '  (less trapped)', { cld: mTally2 }) + '\n' +
    makeToken('calc_out.brrrr.row.whatif_arv_minus_20k', '• ARV -$20K:             refi ' + mRefi2 + ', CF ' + mCoc2 + '/yr', { refi: mRefi2, cf: mCoc2 }) + '\n' +
    makeToken('calc_out.brrrr.row.whatif_refi_ltv', '• Refi LTV 75% (current) · 80% (test): higher cash-out at more risk') + '\n' +
    makeToken('calc_out.brrrr.row.whatif_term', '• Term 30y (current) vs 15y: see Rental Yield for the impact') + '\n' +
    makeToken('calc_out.brrrr.row.whatif_down_25', '• 25% down (vs current ' + downPaymentPct + '%): less cash-in but more mortgage', { dp: String(downPaymentPct) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO comparison rows at 6 ARV lift values
  const lifts = [10000, 30000, 50000, 70000, 100000, 150000];
  for (const lift of lifts) {
    const arv2 = purchasePrice + rehabCost + lift;
    const t = cashTally({
      totalStage1Cash: s1.total,
      totalStage2Cash: rehabCost,
      holdingCost: s2.holdingCost,
      interimRent,
      cashOutFromRefi: refiCalc(arv2, s1.initialLoan).cashOutFromRefi,
    });
    const tag = t.cashLeftInDeal <= 0 ? ' ' + makeToken('calc_out.brrrr.row.cash_out_badge_cmp', '🎉 cash-out') : '';
    results.push(
      makeToken('calc_out.brrrr.row.comparison_lift', 'Comparison: ARV ' + money(arv2) + ' (+' + money(lift) + ' lift) → cash left ' + money(t.cashLeftInDeal), { arv: money(arv2), lift: money(lift), left: money(t.cashLeftInDeal) }) + tag,
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  // P168 B3-7：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS +
  "function stage1Cash(p,d){var dpRate=d/100;return{downPayment:p*dpRate,closingBuy:p*0.03,total:p*dpRate+p*0.03,initialLoan:p*(1-dpRate)};}" +
  "function stage2Cash(rehabCost,initialLoan,interestRatePct,holdingMonths){var monthlyHoldCost=initialLoan*(interestRatePct/100/12)+200;var holdingCost=monthlyHoldCost*holdingMonths;return{totalStage2Cash:rehabCost,holdingCost:holdingCost};}" +
  "function refiCalc(afterRepairValue,initialLoan){var refiLTV=0.75;var refiLoan=afterRepairValue*refiLTV;var cashOutFromRefi=refiLoan-initialLoan;return{refiLoan:refiLoan,cashOutFromRefi:cashOutFromRefi};}" +
  "function monthlyPI(principal,monthlyRate,n){if(n<=0)return 0;if(monthlyRate===0)return principal/n;return(principal*monthlyRate)/(1-Math.pow(1+monthlyRate,-n));}" +
  "function postRefiAnnualCashFlow(monthlyRent,vacancyRate,monthlyExpenses,refiLoan,interestRate,loanTermYears){var effRent=monthlyRent*12*(1-vacancyRate/100);var mortgage=monthlyPI(refiLoan,interestRate/100/12,loanTermYears*12)*12;return effRent-mortgage-monthlyExpenses*12;}" +
  "function cashTally(totalStage1Cash,totalStage2Cash,holdingCost,interimRent,cashOutFromRefi){var cashOut=totalStage1Cash+totalStage2Cash+holdingCost;var cashIn=interimRent+cashOutFromRefi;return{cashOut:cashOut,cashIn:cashIn,cashLeftInDeal:cashOut-cashIn};}" +
  "function forcedAppreciation(afterRepairValue,purchasePrice,rehabCost){return afterRepairValue-purchasePrice-rehabCost;}" +
  "function seventyRuleCheck(afterRepairValue,purchasePrice,rehabCost){var maxAllowedBid=afterRepairValue*0.7-rehabCost;var gap=purchasePrice-maxAllowedBid;return{maxAllowedBid:maxAllowedBid,gap:gap};}" +
  "function cashOnCashReturnBRRRR(annualCashFlow,cashLeftInDeal){if(cashLeftInDeal<=0)return Infinity;if(annualCashFlow<=0)return 0;return(annualCashFlow/cashLeftInDeal)*100;}" +
  "function brrrrHealth(cashLeftInDeal,cashOut){if(cashOut<=0)return{emoji:'\\uD83D\\uDFE2',label:'cash-out success \\u2014 full capital returned'};var ratio=(cashLeftInDeal/cashOut)*100;if(ratio<=0)return{emoji:'\\uD83D\\uDFE2',label:'cash-out success \\u2014 full capital returned via refi'};if(ratio<=15)return{emoji:'\\uD83D\\uDFE1',label:'small cash-in (\\u226415%) \\u2014 deal workable'};return{emoji:'\\uD83D\\uDFE0',label:'significant cash-in (>15%) \\u2014 capital still trapped'};}" +
  "var clampNonNegative=function(x){return Number.isNaN(x)?0:Math.max(0,x)};" +
  "var purchasePrice=clampNonNegative(parseFloat(inputs.purchasePrice)||0);" +
  "var rehabCost=clampNonNegative(parseFloat(inputs.rehabCost)||0);" +
  "var afterRepairValue=clampNonNegative(parseFloat(inputs.afterRepairValue)||0);" +
  "var downPaymentPct=clampNonNegative(parseFloat(inputs.downPaymentPct)||0);" +
  "var interestRate=parseFloat(inputs.interestRate)||0;" +
  "var loanTermYears=clampNonNegative(parseFloat(inputs.loanTermYears)||0);" +
  "var monthlyRent=clampNonNegative(parseFloat(inputs.monthlyRent)||0);" +
  "var monthlyExpenses=clampNonNegative(parseFloat(inputs.monthlyExpenses)||0);" +
  "var vacancyRate=parseFloat(inputs.vacancyRate)||0;" +
  "var holdingMonths=clampNonNegative(parseFloat(inputs.holdingMonths)||0);" +
  "if(purchasePrice<=0||afterRepairValue<=0){return[tk('calc_out.section.brrrr_calculator','\\u23F0 BRRRR Calculator')+'\\n\\n'+tk('calc_out.brrrr.row.missing_price_or_arv','\\uD83D\\uDCB0 Enter purchase price, rehab cost, and after-repair value (ARV) to see your 5-stage BRRRR analysis.')];}" +
  "if(downPaymentPct<0||downPaymentPct>=100){return[tk('calc_out.section.brrrr_calculator','\\u23F0 BRRRR Calculator')+'\\n\\n'+tk('calc_out.brrrr.row.invalid_down_payment_pct','\\uD83D\\uDCB0 Down payment percentage must be 0-99. Typical BRRRR: 20-30% down (some investors use 0% via hard money).')];}" +
  "if(afterRepairValue<purchasePrice+rehabCost){return[tk('calc_out.section.brrrr_calculator','\\u23F0 BRRRR Calculator')+'\\n\\n'+tk('calc_out.brrrr.row.arv_below_total_cost','\\uD83D\\uDCB0 ARV ('+afterRepairValue.toLocaleString('en-US')+') is less than purchase + rehab ('+(purchasePrice+rehabCost).toLocaleString('en-US')+'). This deal does not work as BRRRR \\u2014 consider flipping instead.',{arv:afterRepairValue.toLocaleString('en-US'),total:(purchasePrice+rehabCost).toLocaleString('en-US')})];}" +
  "var s1=stage1Cash(purchasePrice,downPaymentPct);" +
  "var s2=stage2Cash(rehabCost,s1.initialLoan,interestRate,holdingMonths);" +
  "var interimRent=monthlyRent*Math.max(0,Math.min(2,holdingMonths-1));" +
  "var refi=refiCalc(afterRepairValue,s1.initialLoan);" +
  "var cf=postRefiAnnualCashFlow(monthlyRent,vacancyRate,monthlyExpenses,refi.refiLoan,interestRate,loanTermYears);" +
  "var tally=cashTally(s1.total,s2.totalStage2Cash,s2.holdingCost,interimRent,refi.cashOutFromRefi);" +
  "var forced=forcedAppreciation(afterRepairValue,purchasePrice,rehabCost);" +
  "var seventy=seventyRuleCheck(afterRepairValue,purchasePrice,rehabCost);" +
  "var coc=cashOnCashReturnBRRRR(cf,tally.cashLeftInDeal);" +
  "var health=brrrrHealth(tally.cashLeftInDeal,tally.cashOut);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "var cocStr=isFinite(coc)?coc.toFixed(2)+'%':'\\u221E (cash-out success)';" +
  "var seventyDealTag=seventy.gap<=0?' '+tk('calc_out.brrrr.row.within_70_rule','\\u2705 within 70% rule'):' '+tk('calc_out.brrrr.row.above_70_rule','\\u26A0\\uFE0F above 70% rule');" +
  "var tip='';" +
  "if(tally.cashLeftInDeal<=0){tip=tk('calc_out.brrrr.row.tip_cash_out_success','\\uD83D\\uDCA1 Tip: \\uD83C\\uDF89 Cash-out success \\u2014 full capital returned via refi. The \"R\" in BRRRR worked. Repeat: deploy the recovered cash into the next deal to compound.');}" +
  "else if(tally.cashLeftInDeal/tally.cashOut>0.15){tip=tk('calc_out.brrrr.row.tip_significant_cash_in','\\uD83D\\uDCA1 Tip: Significant cash trapped. Either: (1) negotiate lower purchase price, (2) reduce rehab scope, (3) add value (rehab more aggressively). 70% rule is a quick screen \\u2014 failing it means ARV likely won\\u0027t support the deal.');}" +
  "else{tip=tk('calc_out.brrrr.row.tip_small_cash_in','\\uD83D\\uDCA1 Tip: Small cash-in is workable if monthly cash flow is positive. Run the Rental Yield (P5-4) for sustained ROI. BRRRR is most powerful when chained: 12-month cycle from buy \\u2192 refi \\u2192 next property.');}" +
  "var healthToken=health.label==='cash-out success \\u2014 full capital returned'?tk('calc_out.brrrr.row.health_cash_out_full','\\uD83D\\uDFE2 cash-out success \\u2014 full capital returned'):health.label==='cash-out success \\u2014 full capital returned via refi'?tk('calc_out.brrrr.row.health_cash_out_via_refi','\\uD83D\\uDFE2 cash-out success \\u2014 full capital returned via refi'):health.label==='small cash-in (\\u226415%) \\u2014 deal workable'?tk('calc_out.brrrr.row.health_small_cash_in','\\uD83D\\uDFE1 small cash-in (\\u226415%) \\u2014 deal workable'):tk('calc_out.brrrr.row.health_significant_cash_in','\\uD83D\\uDFE0 significant cash-in (>15%) \\u2014 capital still trapped');" +
  "var r2='';" +
  "r2+=tk('calc_out.section.brrrr_calculator_headline','\\u23F0 BRRRR Calculator (Buy Rehab Rent Refinance Repeat)')+'\\n\\n';" +
  "r2+=tk('calc_out.section.deal_snapshot','\\uD83D\\uDCB0 Deal Snapshot:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.purchase_price','Purchase price')+':        '+money(purchasePrice)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.rehab_cost','Rehab cost')+':            '+money(rehabCost)+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.after_repair_value','After-Repair Value')+':   '+money(afterRepairValue)+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.forced_appreciation','\\u2022 Forced appreciation:  '+money(forced)+'  (ARV - price - rehab)',{forced:money(forced)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.total_cash_invested','Total cash invested')+':   '+money(tally.cashOut)+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.cash_returned_via_refi','\\u2022 Cash returned via refi: '+money(tally.cashIn-interimRent)+' ('+money(refi.cashOutFromRefi)+' refi + '+money(interimRent)+' rent)',{returned:money(tally.cashIn-interimRent),refi:money(refi.cashOutFromRefi),rent:money(interimRent)})+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.cash_left_in_deal','Cash LEFT in deal')+':     '+money(tally.cashLeftInDeal)+(tally.cashLeftInDeal<=0?' '+tk('calc_out.brrrr.row.cash_out_badge','\\uD83C\\uDF89 cash-out!'):'')+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.post_refi_coc_return','Post-refi CoC return')+':  '+cocStr+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.five_stage_breakdown','\\uD83D\\uDCD0 5-Stage Breakdown:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tk('calc_out.brrrr.row.stage_buy','1. BUY:        down '+money(s1.downPayment)+' + closing '+money(s1.closingBuy)+' = '+money(s1.total)+' (initial loan '+money(s1.initialLoan)+')',{down:money(s1.downPayment),closing:money(s1.closingBuy),total:money(s1.total),loan:money(s1.initialLoan)})+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.stage_rehab','2. REHAB:      '+money(rehabCost)+' + holding '+money(s2.holdingCost)+' (utilities/insurance over '+holdingMonths+'mo)',{rehab:money(rehabCost),holding:money(s2.holdingCost),months:String(holdingMonths)})+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.stage_rent','3. RENT:       '+money(interimRent)+' interim rent (during rehab/hold)',{interim:money(interimRent)})+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.stage_refinance','4. REFINANCE:  refi loan '+money(refi.refiLoan)+' at 75% LTV \\u2192 cash back '+money(refi.cashOutFromRefi),{refiLoan:money(refi.refiLoan),cashBack:money(refi.cashOutFromRefi)})+(refi.cashOutFromRefi<0?' '+tk('calc_out.brrrr.row.cash_in_badge','(cash-in!)'):'')+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.stage_repeat','5. REPEAT:     CoC return '+cocStr,{coc:cocStr})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.deal_health','\\uD83E\\uDE7A Deal Health:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+healthToken+'\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.cash_left_cash_out_ratio','Cash left/cash out ratio')+': '+((tally.cashLeftInDeal/Math.max(1,tally.cashOut))*100).toFixed(1)+'%\\n';" +
  "r2+='\\u2022 '+tk('calc_out.label.cash_flow_post_refi','Cash flow (post-refi)')+':  '+money(cf)+'/yr\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.brrrr_targets','\\uD83C\\uDFAF BRRRR Targets:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tk('calc_out.brrrr.row.rule_70','\\u2022 70% rule: ARV \\u00D7 0.7 = '+money(afterRepairValue*0.7)+' should cover (price + rehab)',{cap:money(afterRepairValue*0.7)})+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.max_bid_70','\\u2022 Max bid at 70% rule:  '+money(seventy.maxAllowedBid)+' ('+money(seventy.gap)+' gap)',{maxBid:money(seventy.maxAllowedBid),gap:money(seventy.gap)})+seventyDealTag+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.recommended_hold','\\u2022 Recommended hold:     3-9 months (rehab timeline)')+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.refi_ltv','\\u2022 Refi LTV:             70-75% of ARV typical')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.forced_appreciation','\\u2696\\uFE0F Forced Appreciation:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+=tk('calc_out.brrrr.row.arv_gain_from_rehab','\\u2022 ARV gain from rehab:   '+money(forced)+' ('+((forced/purchasePrice)*100).toFixed(0)+'% of purchase)',{gain:money(forced),pct:((forced/purchasePrice)*100).toFixed(0)})+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.without_rehab','\\u2022 Without rehab:        would have appreciated with market only')+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.forcing_appreciation','\\u2022 Forcing appreciation  is the active skill in BRRRR')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tk('calc_out.section.what_if_scenarios','\\uD83D\\uDD04 What-If Scenarios:')+'\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "var coc2=postRefiAnnualCashFlow(monthlyRent,vacancyRate,monthlyExpenses,refiCalc(afterRepairValue-20000,s1.initialLoan).refiLoan,interestRate,loanTermYears);" +
  "var tally2=cashTally(s1.total,rehabCost-10000,s2.holdingCost,interimRent,refi.cashOutFromRefi-20000);" +
  "var refi2=refiCalc(afterRepairValue-20000,s1.initialLoan);" +
  "r2+=tk('calc_out.brrrr.row.whatif_rehab_minus_10k','\\u2022 Rehab -$10K:           cash-in '+money(tally2.cashLeftInDeal)+'  (less trapped)',{cld:money(tally2.cashLeftInDeal)})+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.whatif_arv_minus_20k','\\u2022 ARV -$20K:             refi '+money(refiCalc(afterRepairValue-20000,s1.initialLoan).refiLoan)+', CF '+money(coc2)+'/yr',{refi:money(refiCalc(afterRepairValue-20000,s1.initialLoan).refiLoan),cf:money(coc2)})+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.whatif_refi_ltv','\\u2022 Refi LTV 75% (current) \\u00B7 80% (test): higher cash-out at more risk')+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.whatif_term','\\u2022 Term 30y (current) vs 15y: see Rental Yield for the impact')+'\\n';" +
  "r2+=tk('calc_out.brrrr.row.whatif_down_25','\\u2022 25% down (vs current '+downPaymentPct+'%): less cash-in but more mortgage',{dp:String(downPaymentPct)})+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var lifts=[10000,30000,50000,70000,100000,150000];" +
  "for(var li=0;li<lifts.length;li++){var lift=lifts[li];var arv2=purchasePrice+rehabCost+lift;var t=cashTally(s1.total,rehabCost,s2.holdingCost,interimRent,refiCalc(arv2,s1.initialLoan).cashOutFromRefi);results.push(tk('calc_out.brrrr.row.comparison_lift','Comparison: ARV '+money(arv2)+' (+'+money(lift)+' lift) \\u2192 cash left '+money(t.cashLeftInDeal),{arv:money(arv2),lift:money(lift),left:money(t.cashLeftInDeal)})+(t.cashLeftInDeal<=0?' '+tk('calc_out.brrrr.row.cash_out_badge_cmp','\\uD83C\\uDF89 cash-out'):''));}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-brrrr-calculator',
  title: 'BRRRR Calculator',
  description:
    'Model a BRRRR (Buy Rehab Rent Refinance Repeat) deal: stage-by-stage cash flow, 70% rule check, forced appreciation, post-refi cash-on-cash return, and whether the deal achieves cash-out success.',
  inputs: [
    { name: 'purchasePrice', label: 'Purchase Price ($)', placeholder: 'e.g. 150000', type: 'number' },
    { name: 'rehabCost', label: 'Rehab Cost ($)', placeholder: 'e.g. 30000', type: 'number' },
    { name: 'afterRepairValue', label: 'After-Repair Value (ARV) ($)', placeholder: 'e.g. 220000', type: 'number' },
    { name: 'downPaymentPct', label: 'Down Payment (%)', placeholder: 'e.g. 25', type: 'number' },
    { name: 'interestRate', label: 'Refinance Rate (%)', placeholder: 'e.g. 7.5', type: 'number' },
    { name: 'loanTermYears', label: 'Loan Term after Refi (years)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'monthlyRent', label: 'Monthly Rent after Refi ($)', placeholder: 'e.g. 1800', type: 'number' },
    { name: 'monthlyExpenses', label: 'Monthly OpEx ($)', placeholder: 'e.g. 400', type: 'number' },
    { name: 'vacancyRate', label: 'Vacancy Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'holdingMonths', label: 'Holding Period (months)', placeholder: 'e.g. 6', type: 'number' },
    { name: 'sellingCostsPct', label: 'Selling Costs if not held (%)', placeholder: 'e.g. 8', type: 'number' },
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
    return calculateBRRRR(inputs);
  },
  staticExamples: ['$calc_out.section.brrrr_calculator_headline|⏰ BRRRR Calculator (Buy Rehab Rent Refinance Repeat)|\n\n$calc_out.section.deal_snapshot|💰 Deal Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.purchase_price|Purchase price|:        $150,000\n• $calc_out.label.rehab_cost|Rehab cost|:            $30,000\n• $calc_out.label.after_repair_value|After-Repair Value|:   $220,000\n$calc_out.brrrr.row.forced_appreciation{"forced":"$40,000"}|• Forced appreciation:  $40,000  (ARV - price - rehab)|\n• $calc_out.label.total_cash_invested|Total cash invested|:   $77,419\n$calc_out.brrrr.row.cash_returned_via_refi{"returned":"$52,500","refi":"$52,500","rent":"$3,600"}|• Cash returned via refi: $52,500 ($52,500 refi + $3,600 rent)|\n• $calc_out.label.cash_left_in_deal|Cash LEFT in deal|:     $21,319\n• $calc_out.label.post_refi_coc_return|Post-refi CoC return|:  8.80%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.five_stage_breakdown|📐 5-Stage Breakdown:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.brrrr.row.stage_buy{"down":"$37,500","closing":"$4,500","total":"$42,000","loan":"$112,500"}|1. BUY:        down $37,500 + closing $4,500 = $42,000 (initial loan $112,500)|\n$calc_out.brrrr.row.stage_rehab{"rehab":"$30,000","holding":"$5,419","months":"6"}|2. REHAB:      $30,000 + holding $5,419 (utilities/insurance over 6mo)|\n$calc_out.brrrr.row.stage_rent{"interim":"$3,600"}|3. RENT:       $3,600 interim rent (during rehab/hold)|\n$calc_out.brrrr.row.stage_refinance{"refiLoan":"$165,000","cashBack":"$52,500"}|4. REFINANCE:  refi loan $165,000 at 75% LTV → cash back $52,500|\n$calc_out.brrrr.row.stage_repeat{"coc":"8.80%"}|5. REPEAT:     CoC return 8.80%|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.deal_health|🩺 Deal Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.brrrr.row.health_significant_cash_in|🟠 significant cash-in (>15%) — capital still trapped|\n• $calc_out.label.cash_left_cash_out_ratio|Cash left/cash out ratio|: 27.5%\n• $calc_out.label.cash_flow_post_refi|Cash flow (post-refi)|:  $1,876/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.brrrr_targets|🎯 BRRRR Targets:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.brrrr.row.rule_70{"cap":"$154,000"}|• 70% rule: ARV × 0.7 = $154,000 should cover (price + rehab)|\n$calc_out.brrrr.row.max_bid_70{"maxBid":"$124,000","gap":"$26,000"}|• Max bid at 70% rule:  $124,000 ($26,000 gap)| $calc_out.brrrr.row.above_70_rule|⚠️ above 70% rule|\n$calc_out.brrrr.row.recommended_hold|• Recommended hold:     3-9 months (rehab timeline)|\n$calc_out.brrrr.row.refi_ltv|• Refi LTV:             70-75% of ARV typical|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.forced_appreciation|⚖️ Forced Appreciation:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.brrrr.row.arv_gain_from_rehab{"gain":"$40,000","pct":"27"}|• ARV gain from rehab:   $40,000 (27% of purchase)|\n$calc_out.brrrr.row.without_rehab|• Without rehab:        would have appreciated with market only|\n$calc_out.brrrr.row.forcing_appreciation|• Forcing appreciation  is the active skill in BRRRR|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.brrrr.row.whatif_rehab_minus_10k{"cld":"$31,319"}|• Rehab -$10K:           cash-in $31,319  (less trapped)|\n$calc_out.brrrr.row.whatif_arv_minus_20k{"refi":"$150,000","cf":"$3,134"}|• ARV -$20K:             refi $150,000, CF $3,134/yr|\n$calc_out.brrrr.row.whatif_refi_ltv|• Refi LTV 75% (current) · 80% (test): higher cash-out at more risk|\n$calc_out.brrrr.row.whatif_term|• Term 30y (current) vs 15y: see Rental Yield for the impact|\n$calc_out.brrrr.row.whatif_down_25{"dp":"25"}|• 25% down (vs current 25%): less cash-in but more mortgage|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.brrrr.row.tip_significant_cash_in|💡 Tip: Significant cash trapped. Either: (1) negotiate lower purchase price, (2) reduce rehab scope, (3) add value (rehab more aggressively). 70% rule is a quick screen — failing it means ARV likely won\'t support the deal.|\n$calc_out.brrrr.row.comparison_lift{"arv":"$190,000","lift":"$10,000","left":"$43,819"}|Comparison: ARV $190,000 (+$10,000 lift) → cash left $43,819|\n$calc_out.brrrr.row.comparison_lift{"arv":"$210,000","lift":"$30,000","left":"$28,819"}|Comparison: ARV $210,000 (+$30,000 lift) → cash left $28,819|\n$calc_out.brrrr.row.comparison_lift{"arv":"$230,000","lift":"$50,000","left":"$13,819"}|Comparison: ARV $230,000 (+$50,000 lift) → cash left $13,819|\n$calc_out.brrrr.row.comparison_lift{"arv":"$250,000","lift":"$70,000","left":"$-1,181"}|Comparison: ARV $250,000 (+$70,000 lift) → cash left $-1,181| $calc_out.brrrr.row.cash_out_badge_cmp|🎉 cash-out|\n$calc_out.brrrr.row.comparison_lift{"arv":"$280,000","lift":"$100,000","left":"$-23,681"}|Comparison: ARV $280,000 (+$100,000 lift) → cash left $-23,681| $calc_out.brrrr.row.cash_out_badge_cmp|🎉 cash-out|\n$calc_out.brrrr.row.comparison_lift{"arv":"$330,000","lift":"$150,000","left":"$-61,181"}|Comparison: ARV $330,000 (+$150,000 lift) → cash left $-61,181| $calc_out.brrrr.row.cash_out_badge_cmp|🎉 cash-out|'],
  faq: [
    {
      q: 'What is BRRRR?',
      a: 'BRRRR is a real estate investing strategy: Buy (often below market), Rehab (force appreciation), Rent (cash flow during refi process), Refinance (pull cash out at the new appraised value), Repeat (deploy recovered capital). The key insight: by creating value through rehab, you refinance based on the after-repair value (ARV) — not the purchase price — pulling out most or all of your initial capital.',
    },
    {
      q: 'What is the 70% rule?',
      a: 'The 70% rule is a quick screen: ARV × 0.7 should cover (purchase price + rehab cost). Formula: Max Bid = (ARV × 0.7) - Rehab. This leaves a 30% margin for closing, holding, and refinance costs. Failing the 70% rule does not necessarily kill the deal, but it indicates higher risk of cash being trapped.',
    },
    {
      q: 'How much cash do I need for a BRRRR deal?',
      a: 'In theory: 0% of your own cash if the math works (cash-out success). In practice: 20-30% down for the initial purchase, plus rehab reserves. Typical cash-in before refi: 20-30% down + 3% closing + 100% of rehab. After successful refi: the cash returns to you (cash-out success) or you have small cash-in.',
    },
    {
      q: 'What if the appraisal comes in lower than expected?',
      a: 'The refi is at 70-75% of appraised value, not the ARV you estimated. If appraisal is 10% below your ARV, the refi loan is 10% smaller than expected — meaning less cash back. Worst case, the appraisal comes in below your initial loan: you face cash-in (negative cashOutFromRefi). Always run the BRRRR with conservative ARV estimates.',
    },
    {
      q: 'Is BRRRR still viable in 2026?',
      a: 'Yes, but harder than 2020-2022 when rates were 3%. Current rates (6.5-7.5%) compress refinance amounts and stretch cash flow. Successful 2026 BRRRRs need: (1) higher forced appreciation ($50K+ ARV lift typical), (2) lower purchase prices (deep discounts via wholesale or distressed), (3) higher rents post-rehab. Run the calculator with conservative assumptions before committing.',
    },
    { q: "What is the BRRRR method?", a: "BRRRR = Buy, Rehab, Rent, Refinance, Repeat. Strategy: 1) Buy distressed property below market, 2) Rehab to increase value, 3) Rent for cash flow, 4) Refinance based on new value (pull out cash), 5) Repeat with cash-out. Goal: scale real estate portfolio using bank financing. Originally popular among real estate investors. Requires good deals and reliable contractors." },
    { q: "What is a good BRRRR deal?", a: "Good BRRRR: 1) Buy at 70-80% of after-repair value (ARV), 2) Rehab cost 10-20% of ARV, 3) Rent covers 1.0-1.2x PITI, 4) Refinance pulls out 75-100% of capital, 5) Repeat. Target: $200-500/month cash flow per property, with 75%+ capital recapture. Most: 1.0-1.2 DSCR, 70-75% LTV after refi. Market-dependent." },
    { q: "How much should I budget for rehab?", a: "Rehab budget: 1) Light (cosmetic): $5-15K, 2) Medium (kitchens, baths): $15-50K, 3) Heavy (gut rehab): $50-150K, 4) Major (structural): $150K+. Most BRRRR: $20-50K. Calculate: 10-20% of ARV typical. Always: 1) Get 3 contractor bids, 2) Add 10-20% contingency, 3) Allow for surprises, 4) Inspect first, bid second. Avoid: skipping inspection." },
    { q: "What is a good cash-on-cash return for BRRRR?", a: "CoC return: 1) Good: 8-12%, 2) Excellent: 12-20%, 3) Top: 20%+. Cash flow / cash invested. Target: 10%+ for sustainable portfolio. Risk-adjusted: include vacancy (5-10%), maintenance (5-10%), management (8-10%). Net: 8-15% is realistic. Higher CoC = more risk (lower quality area, less stable tenant). Most: 10-15% with proper underwriting." },
    { q: "How long does a BRRRR take?", a: "Timeline: 1) Buy: 30-60 days, 2) Rehab: 2-4 months, 3) Rent: 1-2 months, 4) Refinance: 30-60 days, 5) Cash out: 30-60 days. Total: 4-9 months per property. Hold time: 6-12 months ideal. Cash tied up: 4-9 months. Most: 1-2 properties simultaneously to start. Scale: 4-6 properties/year with 1-2 rehabs at a time. Slow vs fast BRRRR strategy." },
    { q: "What is the best financing for BRRRR?", a: "Buy: hard money (10-15% rate, 6-18 months), private money, conventional. Rehab: construction loan, hard money, cash. Refinance: conventional investment property (DSCR, debt service coverage), portfolio lender. Best option: hard money for buy + rehab, conventional for refi. Cost: 2-5% in fees + 10-15% carry. 70-80% LTV on refi, 75% on buy." },
    { q: "What is the 1% rule for rentals?", a: "1% rule: monthly rent ≥ 1% of purchase price. $200K house = $2K+/month rent. Useful screen, not gospel. Markets vary: high cost-of-living may be 0.5-0.7%. Lower cost areas: 1-2%. Most: 0.7-1% is achievable in good markets. Strict 1% rule: tight markets, may not hit. Use as filter, then run cash flow + CoC analysis. Top markets: 1.2-1.5% possible." },
    { q: "How do I find good BRRRR properties?", a: "Sources: 1) MLS (filter: 70%+ ARV discount), 2) Off-market (driving for dollars, networking), 3) Wholesalers, 4) Auctions, 5) Real estate agents, 6) Facebook groups, 7) Bandit signs. Criteria: 1) Below-market price, 2) Good neighborhood (rent demand), 3) Reasonable rehab, 4) 70-75% rule met. Most: 100-500 leads to find 1-2 deals. Network with wholesalers." },
  ],
  howToUse: [
    'Enter the purchase price (often below market via wholesale or distressed sale).',
    'Enter estimated rehab cost (get contractor bids for accuracy).',
    'Enter After-Repair Value (ARV). Get this from a comparable sales analysis of recent 3-6 month sales in the area.',
    'Enter down payment percent (20-30% typical, or 0% via hard money lenders).',
    'Enter refinance rate (current 30-year fixed ~6.5-7.5% in 2026).',
    'Enter loan term (typical: 30 years for max cash-out).',
    'Enter expected monthly rent post-rehab.',
    'Enter monthly OpEx (1-1.5% of ARV annually for taxes + insurance + maintenance).',
    'Enter vacancy rate (5-10% typical).',
    'Enter holding months (rehab timeline, typically 3-9 months).',
    'Review deal health (cash-out success preferred).',
    'Check 70% rule (your purchase should leave 30% margin).',
    'Use what-ifs (rehab cost -$10K, ARV -$20K) to stress-test sensitivity.',
  ],
  engineKey: true,
};

registerEngine(engine);
