import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

interface RentalYieldInputs {
  purchasePrice: number;
  downPayment: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
  monthlyRent: number;
  monthlyExpenses: number;
  vacancyRate: number;
}

/** Monthly P&I (PMT formula, shared with P5-1) */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

/** Annual mortgage payment = monthlyPI * 12 */
export function annualMortgagePayment(loanAmount: number, interestRatePct: number, termYears: number): number {
  if (loanAmount <= 0) return 0;
  const mr = interestRatePct / 100 / 12;
  return monthlyPI(loanAmount, mr, termYears * 12) * 12;
}

/** Effective annual rent after vacancy */
export function effectiveAnnualRent(monthlyRent: number, vacancyRatePct: number): number {
  return monthlyRent * 12 * (1 - vacancyRatePct / 100);
}

/**
 * Annual cash flow = effectiveAnnualRent - annualMortgagePayment - annualOperatingExpenses
 * For all-cash purchase (loanAmount=0) → annualMortgagePayment=0
 */
export function annualCashFlow(inputs: RentalYieldInputs): number {
  return (
    effectiveAnnualRent(inputs.monthlyRent, inputs.vacancyRate) -
    annualMortgagePayment(inputs.loanAmount, inputs.interestRate, inputs.loanTermYears) -
    inputs.monthlyExpenses * 12
  );
}

/** Total cash invested = down payment + closing (3% of price) */
export function totalCashInvested(downPayment: number, purchasePrice: number): number {
  const closingCosts = purchasePrice * 0.03;
  return downPayment + closingCosts;
}

/** Gross yield = gross annual rent / price * 100 */
export function grossYield(purchasePrice: number, monthlyRent: number): number {
  if (purchasePrice <= 0) return 0;
  return (monthlyRent * 12 / purchasePrice) * 100;
}

/** Net yield = annual cash flow / price * 100 */
export function netYield(inputs: RentalYieldInputs): number {
  if (inputs.purchasePrice <= 0) return 0;
  return (annualCashFlow(inputs) / inputs.purchasePrice) * 100;
}

/** Cash-on-cash = annual cash flow / total cash invested * 100 */
export function cashOnCashReturn(inputs: RentalYieldInputs): number {
  const tci = totalCashInvested(inputs.downPayment, inputs.purchasePrice);
  if (tci <= 0) return 0;
  return (annualCashFlow(inputs) / tci) * 100;
}

/** Health: 8-12% CoC strong; 4-8% low or 12-15% high marginal; outside = outlier */
export function cocHealth(cocPct: number): { emoji: string; label: string } {
  if (cocPct >= 8 && cocPct <= 12) return { emoji: '🟢', label: 'strong cash-on-cash return — 8-12% range' };
  if ((cocPct >= 4 && cocPct < 8) || (cocPct > 12 && cocPct <= 15))
    return { emoji: '🟡', label: 'marginal — outside 8-12% band (low HCOL or high-yield risk)' };
  return { emoji: '🟠', label: 'outlier — cash-on-cash outside 4-15% range; verify assumptions' };
}

// ============== calculate() ==============

function calculateRentalYield(inputs: Record<string, string>): string[] {
  const purchasePrice = clampNonNegative(parseFloat(inputs.purchasePrice) || 0);
  const downPayment = clampNonNegative(parseFloat(inputs.downPayment) || 0);
  const loanAmount = clampNonNegative(parseFloat(inputs.loanAmount) || 0);
  const interestRate = parseFloat(inputs.interestRate) || 0;
  const loanTermYears = clampNonNegative(parseFloat(inputs.loanTermYears) || 0);
  const monthlyRent = clampNonNegative(parseFloat(inputs.monthlyRent) || 0);
  const monthlyExpenses = clampNonNegative(parseFloat(inputs.monthlyExpenses) || 0);
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0;
  // annualAppreciation is for info/context only in V1 (display in tip)

  if (purchasePrice <= 0) {
    return ['⏰ Rental Yield Calculator\n\n💰 Enter purchase price and rent to see your gross/net/cash-on-cash yields, mortgage breakdown, and health assessment.'];
  }

  const args: RentalYieldInputs = {
    purchasePrice, downPayment, loanAmount, interestRate,
    loanTermYears, monthlyRent, monthlyExpenses, vacancyRate,
  };
  const grosYield = grossYield(purchasePrice, monthlyRent);
  const effRent = effectiveAnnualRent(monthlyRent, vacancyRate);
  const annMort = annualMortgagePayment(loanAmount, interestRate, loanTermYears);
  const cf = annualCashFlow(args);
  const tci = totalCashInvested(downPayment, purchasePrice);
  const nY = netYield(args);
  const coc = cashOnCashReturn(args);
  const health = cocHealth(coc);

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);

  // What-If
  const cfVac5 = annualCashFlow({ ...args, vacancyRate: vacancyRate + 5 });
  const cfRent200 = annualCashFlow({ ...args, monthlyRent: monthlyRent + 200 });
  const cfRateMinus = annualCashFlow({ ...args, interestRate: Math.max(0, interestRate - 1) });
  const cfTerm15 = annualCashFlow({ ...args, loanTermYears: 15 });
  const coc100Down = cashOnCashReturn({
    ...args,
    downPayment: purchasePrice,  // 100% down
  });

  let tip: string;
  if (cf < 0) {
    tip = '💡 Tip: Negative cash flow means rent does not cover mortgage + expenses. You subsidize monthly — common in appreciation markets (SF/NYC). Reserve 6-12 months of negative cash flow as a safety buffer.';
  } else if (coc < 8) {
    tip = '💡 Tip: Cash-on-cash below 8% lags S&P 500 historical return (~7-10%). Either negotiate a lower price, increase rent, or reduce expenses to reach 8%+ threshold.';
  } else {
    tip = '💡 Tip: Strong cash-on-cash (8-12%) on a leveraged rental beats most passive investments. Reinvest cash flow into next property to compound — the BRRRR strategy captures this loop.';
  }

  const r =
    '⏰ Rental Yield / Cash-on-Cash Calculator\n\n' +
    '💰 Investment Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Purchase price:        ' + money(purchasePrice) + '\n' +
    '• Down payment:          ' + money(downPayment) + '\n' +
    '• Loan amount:           ' + money(loanAmount) + '  (' + ((loanAmount / Math.max(1, purchasePrice)) * 100).toFixed(0) + '% LTV)\n' +
    '• Total cash invested:   ' + money(tci) + '  (down + 3% closing)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Annual Cash Flow:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Gross rent (annual):   ' + money(monthlyRent * 12) + '\n' +
    '• Effective rent (post-vacancy): ' + money(effRent) + '\n' +
    '• Annual mortgage P&I:   ' + money(annMort) + '\n' +
    '• Annual OpEx:           ' + money(monthlyExpenses * 12) + '\n' +
    '• Net annual cash flow:  ' + money(cf) + (cf < 0 ? '  ⚠️ negative' : '') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Yield Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n' +
    '• Gross yield:           ' + grosYield.toFixed(2) + '%  (annual rent / price)\n' +
    '• Net yield:             ' + nY.toFixed(2) + '%  (cash flow / price)\n' +
    '• Cash-on-cash return:   ' + coc.toFixed(2) + '%  (cash flow / cash invested)\n' +
    (cf < 0 ? '• ⚠️ Out-of-pocket burden: ' + money(-cf) + '/yr\n' : '') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Yield Benchmarks:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Gross yield:    <8% low · 8-10% typical · >12% high\n' +
    '• Cash-on-cash:   <6% low · 8-12% strong · >15% high-yield (verify)\n' +
    '• S&P comparison: ~7-10% historical avg with zero work\n' +
    '• Goal threshold:  Aim for CoC ≥ 8% AND gross ≥ 8%\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Return Composition:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Yield component:       ' + coc.toFixed(2) + '% CoC annually\n' +
    '• Principal paydown:     ~1-3% annual equity build (mortgage dependent)\n' +
    '• Appreciation (Y1):     ' + (parseFloat(inputs.annualAppreciation) || 0).toFixed(1) + '% user-specified\n' +
    '• Total estimated return: ' + (coc + (parseFloat(inputs.annualAppreciation) || 0)).toFixed(1) + '% (sum of components)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Vacancy +5pp:                 CoC → ' + cashOnCashReturn({ ...args, vacancyRate: vacancyRate + 5 }).toFixed(2) + '%\n' +
    '• Rent +$200/mo:                CoC → ' + cashOnCashReturn({ ...args, monthlyRent: monthlyRent + 200 }).toFixed(2) + '%\n' +
    '• Rate -1pp:                    CoC → ' + cashOnCashReturn({ ...args, interestRate: Math.max(0, interestRate - 1) }).toFixed(2) + '%\n' +
    '• Term 30y → 15y:               CoC → ' + cashOnCashReturn({ ...args, loanTermYears: 15 }).toFixed(2) + '%\n' +
    '• 100% down (vs current LTV):   CoC → ' + coc100Down.toFixed(2) + '% (no leverage)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO comparison rows at 6 CoC values
  const cocRow = [4, 6, 8, 10, 12, 15];
  for (const c of cocRow) {
    results.push(
      'Comparison: target ' + c + '% CoC on $' + fmt(tci) + ' cash invested → annual cash flow ' +
        money((c / 100) * tci),
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  "function mPI(p,r,n){if(n<=0)return 0;if(r===0)return p/n;return(p*r)/(1-Math.pow(1+r,-n));}" +
  "function annMort(la,irp,ty){if(la<=0)return 0;return mPI(la,irp/100/12,ty*12)*12;}" +
  "function effAR(mr,vrp){return mr*12*(1-vrp/100);}" +
  "function annCF(pp,dp,la,irp,lty,mr,mep,vrp){return effAR(mr,vrp)-annMort(la,irp,lty)-mep*12;}" +
  "function tCI(dp,pp){return dp+pp*0.03;}" +
  "function gY(pp,mr){if(pp<=0)return 0;return(mr*12/pp)*100;}" +
  "function cOCR(pp,dp,la,irp,lty,mr,mep,vrp){var tci=tCI(dp,pp);if(tci<=0)return 0;return(annCF(pp,dp,la,irp,lty,mr,mep,vrp)/tci)*100;}" +
  "function cocH(c){if(c>=8&&c<=12)return{e:'\\uD83D\\uDFE2',l:'strong cash-on-cash return \\u2014 8-12% range'};if((c>=4&&c<8)||(c>12&&c<=15))return{e:'\\uD83D\\uDCA1',l:'marginal \\u2014 outside 8-12% band (low HCOL or high-yield risk)'};return{e:'\\uD83D\\uDFE0',l:'outlier \\u2014 cash-on-cash outside 4-15% range; verify assumptions'};}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var pp=cnn(parseFloat(inputs.purchasePrice)||0);" +
  "var dp=cnn(parseFloat(inputs.downPayment)||0);" +
  "var la=cnn(parseFloat(inputs.loanAmount)||0);" +
  "var irp=parseFloat(inputs.interestRate)||0;" +
  "var lty=cnn(parseFloat(inputs.loanTermYears)||0);" +
  "var mr=cnn(parseFloat(inputs.monthlyRent)||0);" +
  "var mep=cnn(parseFloat(inputs.monthlyExpenses)||0);" +
  "var vrp=parseFloat(inputs.vacancyRate)||0;" +
  "var appr=parseFloat(inputs.annualAppreciation)||0;" +
  "if(pp<=0){return['\\u23F0 Rental Yield / Cash-on-Cash Calculator\\n\\n\\uD83D\\uDCB0 Enter purchase price and rent to see your gross/net/cash-on-cash yields, mortgage breakdown, and health assessment.'];}" +
  "var gY2=gY(pp,mr);var effRent=effAR(mr,vrp);var annM=annMort(la,irp,lty);" +
  "var cf=annCF(pp,dp,la,irp,lty,mr,mep,vrp);" +
  "var tci=tCI(dp,pp);" +
  "var coc=cOCR(pp,dp,la,irp,lty,mr,mep,vrp);" +
  "var nY=pp<=0?0:(cf/pp)*100;" +
  "var hl=cocH(coc);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "var cocVac5=cOCR(pp,dp,la,irp,lty,mr,mep,vrp+5);" +
  "var cocRent200=cOCR(pp,dp,la,irp,lty,mr+200,mep,vrp);" +
  "var cocRateMin=cOCR(pp,dp,la,Math.max(0,irp-1),lty,mr,mep,vrp);" +
  "var cocTerm15=cOCR(pp,dp,la,irp,15,mr,mep,vrp);" +
  "var coc100=cOCR(pp,pp,0,0,lty,mr,mep,vrp);" +
  "var tip='';" +
  "if(cf<0){tip='\\uD83D\\uDCA1 Tip: Negative cash flow means rent does not cover mortgage + expenses. You subsidize monthly \\u2014 common in appreciation markets (SF/NYC). Reserve 6-12 months of negative cash flow as a safety buffer.';}" +
  "else if(coc<8){tip='\\uD83D\\uDCA1 Tip: Cash-on-cash below 8% lags S&P 500 historical return (~7-10%). Either negotiate a lower price, increase rent, or reduce expenses to reach 8%+ threshold.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: Strong cash-on-cash (8-12%) on a leveraged rental beats most passive investments. Reinvest cash flow into next property to compound \\u2014 the BRRRR strategy captures this loop.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Rental Yield / Cash-on-Cash Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Investment Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Purchase price:        '+money(pp)+'\\n';" +
  "r2+='\\u2022 Down payment:          '+money(dp)+'\\n';" +
  "r2+='\\u2022 Loan amount:           '+money(la)+'  ('+(la/Math.max(1,pp)*100).toFixed(0)+'% LTV)\\n';" +
  "r2+='\\u2022 Total cash invested:   '+money(tci)+'  (down + 3% closing)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Annual Cash Flow:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Gross rent (annual):   '+money(mr*12)+'\\n';" +
  "r2+='\\u2022 Effective rent (post-vacancy): '+money(effRent)+'\\n';" +
  "r2+='\\u2022 Annual mortgage P&I:   '+money(annM)+'\\n';" +
  "r2+='\\u2022 Annual OpEx:           '+money(mep*12)+'\\n';" +
  "r2+='\\u2022 Net annual cash flow:  '+money(cf)+(cf<0?'  \\u26A0\\uFE0F negative':'')+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Yield Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hl.e+' '+hl.l+'\\n';" +
  "r2+='\\u2022 Gross yield:           '+gY2.toFixed(2)+'%  (annual rent / price)\\n';" +
  "r2+='\\u2022 Net yield:             '+nY.toFixed(2)+'%  (cash flow / price)\\n';" +
  "r2+='\\u2022 Cash-on-cash return:   '+coc.toFixed(2)+'%  (cash flow / cash invested)\\n';" +
  "if(cf<0){r2+='\\u2022 \\u26A0\\uFE0F Out-of-pocket burden: '+money(-cf)+'/yr\\n';}" +
  "r2+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Yield Benchmarks:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Gross yield:    <8% low \\u00B7 8-10% typical \\u00B7 >12% high\\n';" +
  "r2+='\\u2022 Cash-on-cash:   <6% low \\u00B7 8-12% strong \\u00B7 >15% high-yield (verify)\\n';" +
  "r2+='\\u2022 S&P comparison: ~7-10% historical avg with zero work\\n';" +
  "r2+='\\u2022 Goal threshold:  Aim for CoC \\u2265 8% AND gross \\u2265 8%\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Return Composition:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Yield component:       '+coc.toFixed(2)+'% CoC annually\\n';" +
  "r2+='\\u2022 Principal paydown:     ~1-3% annual equity build (mortgage dependent)\\n';" +
  "r2+='\\u2022 Appreciation (Y1):     '+appr.toFixed(1)+'% user-specified\\n';" +
  "r2+='\\u2022 Total estimated return: '+(coc+appr).toFixed(1)+'% (sum of components)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Vacancy +5pp:                 CoC \\u2192 '+cocVac5.toFixed(2)+'%\\n';" +
  "r2+='\\u2022 Rent +$200/mo:                CoC \\u2192 '+cocRent200.toFixed(2)+'%\\n';" +
  "r2+='\\u2022 Rate -1pp:                    CoC \\u2192 '+cocRateMin.toFixed(2)+'%\\n';" +
  "r2+='\\u2022 Term 30y \\u2192 15y:               CoC \\u2192 '+cocTerm15.toFixed(2)+'%\\n';" +
  "r2+='\\u2022 100% down (vs current LTV):   CoC \\u2192 '+coc100.toFixed(2)+'% (no leverage)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var cocRow=[4,6,8,10,12,15];" +
  "for(var ci=0;ci<cocRow.length;ci++){var c=cocRow[ci];results.push('Comparison: target '+c+'% CoC on $'+fmt(tci)+' cash invested \\u2192 annual cash flow '+money((c/100)*tci));}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-rental-yield-calculator',
  title: 'Rental Yield / Cash-on-Cash Calculator',
  description:
    'Calculate gross/net yields and cash-on-cash return on a leveraged rental property. Compares annual rent, mortgage, and OpEx against actual cash invested. Shows negative cash flow warnings for appreciation-only markets.',
  inputs: [
    { name: 'purchasePrice', label: 'Purchase Price ($)', placeholder: 'e.g. 300000', type: 'number' },
    { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 75000', type: 'number' },
    { name: 'loanAmount', label: 'Loan Amount ($)', placeholder: 'e.g. 225000', type: 'number' },
    { name: 'interestRate', label: 'Mortgage Rate (%)', placeholder: 'e.g. 7', type: 'number' },
    { name: 'loanTermYears', label: 'Loan Term (years)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'monthlyRent', label: 'Monthly Rent Income ($)', placeholder: 'e.g. 2500', type: 'number' },
    { name: 'monthlyExpenses', label: 'Monthly Operating Expenses ($)', placeholder: 'e.g. 600', type: 'number' },
    { name: 'vacancyRate', label: 'Vacancy Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'annualAppreciation', label: 'Expected Annual Appreciation (%)', placeholder: 'e.g. 3', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateRentalYield(inputs);
  },
  staticExamples: ['⏰ Rental Yield / Cash-on-Cash Calculator\n\n💰 Investment Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Purchase price:        $300,000\n• Down payment:          $75,000\n• Loan amount:           $225,000  (75% LTV)\n• Total cash invested:   $84,000  (down + 3% closing)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Annual Cash Flow:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Gross rent (annual):   $30,000\n• Effective rent (post-vacancy): $28,500\n• Annual mortgage P&I:   $17,963\n• Annual OpEx:           $7,200\n• Net annual cash flow:  $3,337\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Yield Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 outlier — cash-on-cash outside 4-15% range; verify assumptions\n• Gross yield:           10.00%  (annual rent / price)\n• Net yield:             1.11%  (cash flow / price)\n• Cash-on-cash return:   3.97%  (cash flow / cash invested)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Yield Benchmarks:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Gross yield:    <8% low · 8-10% typical · >12% high\n• Cash-on-cash:   <6% low · 8-12% strong · >15% high-yield (verify)\n• S&P comparison: ~7-10% historical avg with zero work\n• Goal threshold:  Aim for CoC ≥ 8% AND gross ≥ 8%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Return Composition:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Yield component:       3.97% CoC annually\n• Principal paydown:     ~1-3% annual equity build (mortgage dependent)\n• Appreciation (Y1):     3.0% user-specified\n• Total estimated return: 7.0% (sum of components)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Vacancy +5pp:                 CoC → 2.19%\n• Rent +$200/mo:                CoC → 6.69%\n• Rate -1pp:                    CoC → 6.09%\n• Term 30y → 15y:               CoC → -3.53%\n• 100% down (vs current LTV):   CoC → 1.08% (no leverage)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: Cash-on-cash below 8% lags S&P 500 historical return (~7-10%). Either negotiate a lower price, increase rent, or reduce expenses to reach 8%+ threshold.\nComparison: target 4% CoC on $84,000 cash invested → annual cash flow $3,360\nComparison: target 6% CoC on $84,000 cash invested → annual cash flow $5,040\nComparison: target 8% CoC on $84,000 cash invested → annual cash flow $6,720\nComparison: target 10% CoC on $84,000 cash invested → annual cash flow $8,400\nComparison: target 12% CoC on $84,000 cash invested → annual cash flow $10,080\nComparison: target 15% CoC on $84,000 cash invested → annual cash flow $12,600'],
  faq: [
    {
      q: 'What is cash-on-cash return?',
      a: 'Cash-on-cash return (CoC) measures the annual cash flow you receive as a percent of the actual cash you invested. Formula: (Annual Cash Flow / Total Cash Invested) × 100. Where Total Cash Invested = Down Payment + Closing Costs (typically 3% of price). CoC is the most relevant metric for leveraged rentals, since it isolates your actual deployed capital from the bank-financed portion.',
    },
    {
      q: 'Cash-on-cash vs cap rate vs gross yield — what is the difference?',
      a: 'Three yield metrics on a rental: (1) Gross Yield = Annual Rent / Price (ignores vacancy and expenses). (2) Cap Rate (Net Yield) = NOI / Price (after vacancy and expenses, ignores financing). (3) Cash-on-Cash = Cash Flow / Cash Invested (after vacancy, expenses, AND mortgage). Cash-on-cash captures the leverage effect — same property with a mortgage has much higher CoC than all-cash.',
    },
    {
      q: 'What is a good cash-on-cash return?',
      a: '8-12% is strong for residential rentals. Below 6% lags S&P 500 historical returns. Above 15% is high-yield territory — verify the rent and expense assumptions are realistic. Note that many appreciation markets (SF, NYC, Seattle) show near-0% or negative cash flow but compensate via property value growth. CoC works for cash-flow markets (Midwest, Southeast, Texas).',
    },
    {
      q: 'What if cash flow is negative?',
      a: 'Negative cash flow means rent doesn\'t cover mortgage + expenses. You subsidize monthly. This is common in low-cap markets (San Francisco, NYC) where you buy for appreciation, not yield. Risk: you must keep paying the difference each month. Rule of thumb: keep 6-12 months of negative cash flow as a safety reserve before relying on appreciation.',
    },
    {
      q: 'How does leverage affect cash-on-cash?',
      a: 'Leverage dramatically increases CoC. Example: $300K property with $75K down (25% LTV) at 7% generates ~4% CoC. With 100% cash (no loan), CoC drops to 7% (the cap rate). The bank essentially "subsidizes" your return when rates are below the property\'s yield. This is the BRRRR strategy\'s foundation — pull cash out at refi to deploy on the next property.',
    },
  ],
  howToUse: [
    'Enter the purchase price (or contract price).',
    'Enter your down payment (typical: 20-25% for residential, 25-30% for multi-family).',
    'Enter the loan amount (purchase price minus down payment if standard financing).',
    'Enter mortgage rate and term (current 30-year fixed ~6.5-7.0% in 2026).',
    'Enter expected monthly rent (research comps on Zillow / Rentometer / Apartments.com).',
    'Enter monthly operating expenses (property tax + insurance + maintenance + management ≈ 1-1.5% of price annually).',
    'Enter vacancy rate (5% typical, 8-15% Class C).',
    'Enter expected annual appreciation.',
    'Review CoC, gross/net yield, and health band.',
    'Compare negative cash flow warning if applicable.',
    'Apply 5 what-ifs for sensitivity (vacancy, rent, rate, term, leverage).',
  ],
};

registerEngine(engine);
