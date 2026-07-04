import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

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
  const purchasePrice = Math.max(0, parseFloat(inputs.purchasePrice) || 0);
  const rehabCost = Math.max(0, parseFloat(inputs.rehabCost) || 0);
  const afterRepairValue = Math.max(0, parseFloat(inputs.afterRepairValue) || 0);
  const downPaymentPct = Math.max(0, parseFloat(inputs.downPaymentPct) || 0);
  const interestRate = parseFloat(inputs.interestRate) || 0;
  const loanTermYears = Math.max(0, parseFloat(inputs.loanTermYears) || 0);
  const monthlyRent = Math.max(0, parseFloat(inputs.monthlyRent) || 0);
  const monthlyExpenses = Math.max(0, parseFloat(inputs.monthlyExpenses) || 0);
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0;
  const holdingMonths = Math.max(0, parseFloat(inputs.holdingMonths) || 0);

  if (purchasePrice <= 0 || afterRepairValue <= 0) {
    return ['⏰ BRRRR Calculator\n\n💰 Enter purchase price, rehab cost, and after-repair value (ARV) to see your 5-stage BRRRR analysis.'];
  }
  if (downPaymentPct < 0 || downPaymentPct >= 100) {
    return ['⏰ BRRRR Calculator\n\n💰 Down payment percentage must be 0-99. Typical BRRRR: 20-30% down (some investors use 0% via hard money).'];
  }
  if (afterRepairValue < purchasePrice + rehabCost) {
    return ['⏰ BRRRR Calculator\n\n💰 ARV (' + afterRepairValue.toLocaleString('en-US') + ') is less than purchase + rehab (' + (purchasePrice + rehabCost).toLocaleString('en-US') + '). This deal does not work as BRRRR — consider flipping instead.'];
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
  const seventyDealTag = seventy.gap <= 0 ? ' ✅ within 70% rule' : ' ⚠️ above 70% rule';

  let tip: string;
  if (tally.cashLeftInDeal <= 0) {
    tip = '💡 Tip: 🎉 Cash-out success — full capital returned via refi. The "R" in BRRRR worked. Repeat: deploy the recovered cash into the next deal to compound.';
  } else if (tally.cashLeftInDeal / tally.cashOut > 0.15) {
    tip = '💡 Tip: Significant cash trapped. Either: (1) negotiate lower purchase price, (2) reduce rehab scope, (3) add value (rehab more aggressively). 70% rule is a quick screen — failing it means ARV likely won\'t support the deal.';
  } else {
    tip = '💡 Tip: Small cash-in is workable if monthly cash flow is positive. Run the Rental Yield (P5-4) for sustained ROI. BRRRR is most powerful when chained: 12-month cycle from buy → refi → next property.';
  }

  const r =
    '⏰ BRRRR Calculator (Buy Rehab Rent Refinance Repeat)\n\n' +
    '💰 Deal Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Purchase price:        ' + money(purchasePrice) + '\n' +
    '• Rehab cost:            ' + money(rehabCost) + '\n' +
    '• After-Repair Value:   ' + money(afterRepairValue) + '\n' +
    '• Forced appreciation:  ' + money(forced) + '  (ARV - price - rehab)\n' +
    '• Total cash invested:   ' + money(tally.cashOut) + '\n' +
    '• Cash returned via refi: ' + money(tally.cashIn - interimRent) + ' (' + money(refi.cashOutFromRefi) + ' refi + ' + money(interimRent) + ' rent)\n' +
    '• Cash LEFT in deal:     ' + money(tally.cashLeftInDeal) + (tally.cashLeftInDeal <= 0 ? ' 🎉 cash-out!' : '') + '\n' +
    '• Post-refi CoC return:  ' + cocStr + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 5-Stage Breakdown:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '1. BUY:        down ' + money(s1.downPayment) + ' + closing ' + money(s1.closingBuy) + ' = ' + money(s1.total) + ' (initial loan ' + money(s1.initialLoan) + ')\n' +
    '2. REHAB:      ' + money(rehabCost) + ' + holding ' + money(s2.holdingCost) + ' (utilities/insurance over ' + holdingMonths + 'mo)\n' +
    '3. RENT:       ' + money(interimRent) + ' interim rent (during rehab/hold)\n' +
    '4. REFINANCE:  refi loan ' + money(refi.refiLoan) + ' at 75% LTV → cash back ' + money(refi.cashOutFromRefi) + (refi.cashOutFromRefi < 0 ? ' (cash-in!)' : '') + '\n' +
    '5. REPEAT:     CoC return ' + cocStr + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Deal Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n' +
    '• Cash left/cash out ratio: ' + ((tally.cashLeftInDeal / Math.max(1, tally.cashOut)) * 100).toFixed(1) + '%\n' +
    '• Cash flow (post-refi):  ' + money(cf) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 BRRRR Targets:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 70% rule: ARV × 0.7 = ' + money(afterRepairValue * 0.7) + ' should cover (price + rehab)\n' +
    '• Max bid at 70% rule:  ' + money(seventy.maxAllowedBid) + ' (' + money(seventy.gap) + ' gap)' + seventyDealTag + '\n' +
    '• Recommended hold:     3-9 months (rehab timeline)\n' +
    '• Refi LTV:             70-75% of ARV typical\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Forced Appreciation:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ARV gain from rehab:   ' + money(forced) + ' (' + ((forced / purchasePrice) * 100).toFixed(0) + '% of purchase)\n' +
    '• Without rehab:        would have appreciated with market only\n' +
    '• Forcing appreciation  is the active skill in BRRRR\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Rehab -$10K:           cash-in ' + money(tally2.cashLeftInDeal) + '  (less trapped)\n' +
    '• ARV -$20K:             refi ' + money(refiCalc(afterRepairValue - 20000, s1.initialLoan).refiLoan) + ', CF ' + money(coc2) + '/yr\n' +
    '• Refi LTV 75% (current) · 80% (test): higher cash-out at more risk\n' +
    '• Term 30y (current) vs 15y: see Rental Yield for the impact\n' +
    '• 25% down (vs current ' + downPaymentPct + '%): less cash-in but more mortgage\n\n' +
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
    const tag = t.cashLeftInDeal <= 0 ? ' 🎉 cash-out' : '';
    results.push(
      'Comparison: ARV ' + money(arv2) + ' (+' + money(lift) + ' lift) → cash left ' + money(t.cashLeftInDeal) + tag,
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  "function s1(p,d){var dp=d/100;return{dp:p*dp,cb:p*0.03,total:p*dp+p*0.03,il:p*(1-dp)};}" +
  "function s2(rc,il,ir,hm){var mh=il*(ir/100/12)+200;return{total:rc,hc:mh*hm};}" +
  "function rc(arv,il){var rl=arv*0.75;return{refiLoan:rl,cashOut:rl-il};}" +
  "function mPI(p,r,n){if(n<=0)return 0;if(r===0)return p/n;return(p*r)/(1-Math.pow(1+r,-n));}" +
  "function pcf(mr,vr,mep,rl,ir,lty){var er=mr*12*(1-vr/100);var mt=mPI(rl,ir/100/12,lty*12)*12;return er-mt-mep*12;}" +
  "function ct(s1c,s2c,hc,ir2,co){var cashOut=s1c+s2c+hc;var cashIn=ir2+co;return{co:cashOut,ci:cashIn,cld:cashOut-cashIn};}" +
  "function fa(a,p,r){return a-p-r;}" +
  "function sr(a,p,r){var mab=a*0.7-r;return{mab:mab,gap:p-mab};}" +
  "function cocR(cf,cld){if(cld<=0)return Infinity;if(cf<=0)return 0;return(cf/cld)*100;}" +
  "function bH(cld,co){if(co<=0)return{e:'\\uD83D\\uDFE2',l:'cash-out success \\u2014 full capital returned'};var r=(cld/co)*100;if(r<=0)return{e:'\\uD83D\\uDFE2',l:'cash-out success \\u2014 full capital returned via refi'};if(r<=15)return{e:'\\uD83D\\uDCA1',l:'small cash-in (\\u226415%) \\u2014 deal workable'};return{e:'\\uD83D\\uDFE0',l:'significant cash-in (>15%) \\u2014 capital still trapped'};}" +
  "var pp=Math.max(0,parseFloat(inputs.purchasePrice)||0);" +
  "var rcost=Math.max(0,parseFloat(inputs.rehabCost)||0);" +
  "var arv=Math.max(0,parseFloat(inputs.afterRepairValue)||0);" +
  "var dpPct=Math.max(0,parseFloat(inputs.downPaymentPct)||0);" +
  "var ir=parseFloat(inputs.interestRate)||0;" +
  "var lty=Math.max(0,parseFloat(inputs.loanTermYears)||0);" +
  "var mr=Math.max(0,parseFloat(inputs.monthlyRent)||0);" +
  "var mep=Math.max(0,parseFloat(inputs.monthlyExpenses)||0);" +
  "var vr=parseFloat(inputs.vacancyRate)||0;" +
  "var hm=Math.max(0,parseFloat(inputs.holdingMonths)||0);" +
  "if(pp<=0||arv<=0){return['\\u23F0 BRRRR Calculator\\n\\n\\uD83D\\uDCB0 Enter purchase price, rehab cost, and after-repair value (ARV) to see your 5-stage BRRRR analysis.'];}" +
  "if(dpPct<0||dpPct>=100){return['\\u23F0 BRRRR Calculator\\n\\n\\uD83D\\uDCB0 Down payment percentage must be 0-99. Typical BRRRR: 20-30% down (some investors use 0% via hard money).'];}" +
  "if(arv<pp+rcost){return['\\u23F0 BRRRR Calculator\\n\\n\\uD83D\\uDCB0 ARV ('+pp.toLocaleString('en-US')+') is less than purchase + rehab ('+(pp+rcost).toLocaleString('en-US')+'). This deal does not work as BRRRR \\u2014 consider flipping instead.'];}" +
  "var s1r=s1(pp,dpPct);var s2r=s2(rcost,s1r.il,ir,hm);var irRent=mr*Math.max(0,Math.min(2,hm-1));var rr=rc(arv,s1r.il);var cf=pcf(mr,vr,mep,rr.refiLoan,ir,lty);var tal=ct(s1r.total,s2r.total,s2r.hc,irRent,rr.cashOut);var fd=fa(arv,pp,rcost);var srr=sr(arv,pp,rcost);var coc=cocR(cf,tal.cld);var hl=bH(tal.cld,tal.co);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "var cocStr2=isFinite(coc)?coc.toFixed(2)+'%':'\\u221E (cash-out success)';" +
  "var tip='';" +
  "if(tal.cld<=0){tip='\\uD83D\\uDCA1 Tip: \\uD83C\\uDF89 Cash-out success \\u2014 full capital returned via refi. The \"R\" in BRRRR worked. Repeat: deploy the recovered cash into the next deal to compound.';}" +
  "else if(tal.cld/tal.co>0.15){tip='\\uD83D\\uDCA1 Tip: Significant cash trapped. Either: (1) negotiate lower purchase price, (2) reduce rehab scope, (3) add value (rehab more aggressively). 70% rule is a quick screen \\u2014 failing it means ARV likely won\\u0027t support the deal.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: Small cash-in is workable if monthly cash flow is positive. Run the Rental Yield (P5-4) for sustained ROI. BRRRR is most powerful when chained: 12-month cycle from buy \\u2192 refi \\u2192 next property.';}" +
  "var r2='';" +
  "r2+='\\u23F0 BRRRR Calculator (Buy Rehab Rent Refinance Repeat)\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Deal Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Purchase price:        '+money(pp)+'\\n';" +
  "r2+='\\u2022 Rehab cost:            '+money(rcost)+'\\n';" +
  "r2+='\\u2022 After-Repair Value:   '+money(arv)+'\\n';" +
  "r2+='\\u2022 Forced appreciation:  '+money(fd)+'  (ARV - price - rehab)\\n';" +
  "r2+='\\u2022 Total cash invested:   '+money(tal.co)+'\\n';" +
  "r2+='\\u2022 Cash returned via refi: '+money(tal.ci-irRent)+' ('+money(rr.cashOut)+' refi + '+money(irRent)+' rent)\\n';" +
  "r2+='\\u2022 Cash LEFT in deal:     '+money(tal.cld)+(tal.cld<=0?' \\uD83C\\uDF89 cash-out!':'')+'\\n';" +
  "r2+='\\u2022 Post-refi CoC return:  '+cocStr2+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 5-Stage Breakdown:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='1. BUY:        down '+money(s1r.dp)+' + closing '+money(s1r.cb)+' = '+money(s1r.total)+' (initial loan '+money(s1r.il)+')\\n';" +
  "r2+='2. REHAB:      '+money(rcost)+' + holding '+money(s2r.hc)+' (utilities/insurance over '+hm+'mo)\\n';" +
  "r2+='3. RENT:       '+money(irRent)+' interim rent (during rehab/hold)\\n';" +
  "r2+='4. REFINANCE:  refi loan '+money(rr.refiLoan)+' at 75% LTV \\u2192 cash back '+money(rr.cashOut)+(rr.cashOut<0?' (cash-in!)':'')+'\\n';" +
  "r2+='5. REPEAT:     CoC return '+cocStr2+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Deal Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hl.e+' '+hl.l+'\\n';" +
  "r2+='\\u2022 Cash left/cash out ratio: '+((tal.cld/Math.max(1,tal.co))*100).toFixed(1)+'%\\n';" +
  "r2+='\\u2022 Cash flow (post-refi):  '+money(cf)+'/yr\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF BRRRR Targets:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 70% rule: ARV \\u00D7 0.7 = '+money(arv*0.7)+' should cover (price + rehab)\\n';" +
  "r2+='\\u2022 Max bid at 70% rule:  '+money(srr.mab)+' ('+money(srr.gap)+' gap)'+(srr.gap<=0?' \\u2705 within 70% rule':' \\u26A0\\uFE0F above 70% rule')+'\\n';" +
  "r2+='\\u2022 Recommended hold:     3-9 months (rehab timeline)\\n';" +
  "r2+='\\u2022 Refi LTV:             70-75% of ARV typical\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Forced Appreciation:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 ARV gain from rehab:   '+money(fd)+' ('+((fd/pp)*100).toFixed(0)+'% of purchase)\\n';" +
  "r2+='\\u2022 Without rehab:        would have appreciated with market only\\n';" +
  "r2+='\\u2022 Forcing appreciation  is the active skill in BRRRR\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "var coc3=pcf(mr,vr,mep,rc(arv-20000,s1r.il).refiLoan,ir,lty);" +
  "var tal2=ct(s1r.total,rcost-10000,s2r.hc,irRent,rr.cashOut-20000);" +
  "var refi2=rc(arv-20000,s1r.il);" +
  "r2+='\\u2022 Rehab -$10K:           cash-in '+money(tal2.cld)+'  (less trapped)\\n';" +
  "r2+='\\u2022 ARV -$20K:             refi '+money(refi2.refiLoan)+', CF '+money(coc3)+'/yr\\n';" +
  "r2+='\\u2022 Refi LTV 75% (current) \\u00B7 80% (test): higher cash-out at more risk\\n';" +
  "r2+='\\u2022 Term 30y (current) vs 15y: see Rental Yield for the impact\\n';" +
  "r2+='\\u2022 25% down (vs current '+dpPct.toFixed(0)+'%): less cash-in but more mortgage\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var lifts=[10000,30000,50000,70000,100000,150000];" +
  "for(var li=0;li<lifts.length;li++){var lft=lifts[li];var arv2=pp+rcost+lft;var t=ct(s1r.total,rcost,s2r.hc,irRent,rc(arv2,s1r.il).cashOut);results.push('Comparison: ARV '+money(arv2)+' (+'+money(lft)+' lift) \\u2192 cash left '+money(t.cld)+(t.cld<=0?' \\uD83C\\uDF89 cash-out':''));}" +
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
  generate(inputs: Record<string, string>): string[] {
    return calculateBRRRR(inputs);
  },
  staticExamples: ['⏰ BRRRR Calculator (Buy Rehab Rent Refinance Repeat)\n\n💰 Deal Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Purchase price:        $150,000\n• Rehab cost:            $30,000\n• After-Repair Value:   $220,000\n• Forced appreciation:  $40,000  (ARV - price - rehab)\n• Total cash invested:   $77,419\n• Cash returned via refi: $52,500 ($52,500 refi + $3,600 rent)\n• Cash LEFT in deal:     $21,319\n• Post-refi CoC return:  8.80%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 5-Stage Breakdown:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n1. BUY:        down $37,500 + closing $4,500 = $42,000 (initial loan $112,500)\n2. REHAB:      $30,000 + holding $5,419 (utilities/insurance over 6mo)\n3. RENT:       $3,600 interim rent (during rehab/hold)\n4. REFINANCE:  refi loan $165,000 at 75% LTV → cash back $52,500\n5. REPEAT:     CoC return 8.80%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Deal Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 significant cash-in (>15%) — capital still trapped\n• Cash left/cash out ratio: 27.5%\n• Cash flow (post-refi):  $1,876/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 BRRRR Targets:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 70% rule: ARV × 0.7 = $154,000 should cover (price + rehab)\n• Max bid at 70% rule:  $124,000 ($26,000 gap) ⚠️ above 70% rule\n• Recommended hold:     3-9 months (rehab timeline)\n• Refi LTV:             70-75% of ARV typical\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Forced Appreciation:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• ARV gain from rehab:   $40,000 (27% of purchase)\n• Without rehab:        would have appreciated with market only\n• Forcing appreciation  is the active skill in BRRRR\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Rehab -$10K:           cash-in $31,319  (less trapped)\n• ARV -$20K:             refi $150,000, CF $3,134/yr\n• Refi LTV 75% (current) · 80% (test): higher cash-out at more risk\n• Term 30y (current) vs 15y: see Rental Yield for the impact\n• 25% down (vs current 25%): less cash-in but more mortgage\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Significant cash trapped. Either: (1) negotiate lower purchase price, (2) reduce rehab scope, (3) add value (rehab more aggressively). 70% rule is a quick screen — failing it means ARV likely won\'t support the deal.\nComparison: ARV $190,000 (+$10,000 lift) → cash left $43,819\nComparison: ARV $210,000 (+$30,000 lift) → cash left $28,819\nComparison: ARV $230,000 (+$50,000 lift) → cash left $13,819\nComparison: ARV $250,000 (+$70,000 lift) → cash left $-1,181 🎉 cash-out\nComparison: ARV $280,000 (+$100,000 lift) → cash left $-23,681 🎉 cash-out\nComparison: ARV $330,000 (+$150,000 lift) → cash left $-61,181 🎉 cash-out'],
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
};

registerEngine(engine);
