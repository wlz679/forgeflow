import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

interface DSCRInputs {
  monthlyRent: number;
  monthlyExpenses: number;
  vacancyRate: number;
  loanAmount: number;
  interestRate: number;
  loanTermYears: number;
}

/** Monthly P&I (shared PMT formula) */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

/** Annual NOI = eff rent (vacancy adj) - OpEx */
export function annualNOI(inputs: DSCRInputs): number {
  return inputs.monthlyRent * 12 * (1 - inputs.vacancyRate / 100) - inputs.monthlyExpenses * 12;
}

/** Annual debt service = monthlyPI × 12 */
export function annualDebtService(inputs: DSCRInputs): number {
  const mr = inputs.interestRate / 100 / 12;
  return monthlyPI(inputs.loanAmount, mr, inputs.loanTermYears * 12) * 12;
}

/** DSCR = NOI / Annual Debt Service. Returns Infinity if NOI > 0 and ADS = 0. */
export function dscr(inputs: DSCRInputs): number {
  const ads = annualDebtService(inputs);
  const noi = annualNOI(inputs);
  if (ads === 0) return Infinity;
  return noi / ads;
}

/**
 * Reverse: max loan at target DSCR (binary search, 50 iterations for ~$50 accuracy)
 * Upper bound: 20× annualNOI (assumes DSCR >> 1 reasonable range)
 */
export function maxLoanAtTargetDSCR(inputs: Omit<DSCRInputs, 'loanAmount'>, targetDSCR: number): number {
  const noi = annualNOI({ ...inputs, loanAmount: 0 });
  if (noi <= 0) return 0;
  const mr = inputs.interestRate / 100 / 12;
  const n = inputs.loanTermYears * 12;

  // Binary search in [0, 20 × annualNOI]
  let lo = 0;
  let hi = noi * 20;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const ads = monthlyPI(mid, mr, n) * 12;
    if (ads === 0) {
      lo = mid;
      continue;
    }
    const currentDSCR = noi / ads;
    if (currentDSCR > targetDSCR) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/**
 * Health: DSCR ≥ 1.25 qualifies for most lenders · 1.0-1.25 marginal · < 1.0 fails
 */
export function dscrHealth(value: number) {
  if (!isFinite(value)) return { emoji: '🟢', label: 'trivially qualifies — no debt service' };
  if (value >= 1.25) return { emoji: '🟢', label: 'qualifies — DSCR ≥ 1.25 (most lenders approve)' };
  if (value >= 1.0) return { emoji: '🟡', label: 'marginal — DSCR between 1.0-1.25 (many lenders decline)' };
  return { emoji: '🔴', label: 'fails — DSCR < 1.0 (deal cannot service debt)' };
}

// ============== calculate() ==============

function calculateDSCR(inputs: Record<string, string>): string[] {
  const monthlyRent = clampNonNegative(parseFloat(inputs.monthlyRent) || 0);
  const monthlyExpenses = clampNonNegative(parseFloat(inputs.monthlyExpenses) || 0);
  const loanAmount = clampNonNegative(parseFloat(inputs.loanAmount) || 0);
  const interestRate = parseFloat(inputs.interestRate) || 0;
  const loanTermYears = clampNonNegative(parseFloat(inputs.loanTermYears) || 0);
  const vacancyRate = parseFloat(inputs.vacancyRate) || 0;

  const args: DSCRInputs = {
    monthlyRent, monthlyExpenses, vacancyRate, loanAmount, interestRate, loanTermYears,
  };

  if (monthlyRent <= 0 && loanAmount <= 0) {
    return ['⏰ DSCR Calculator\n\n💰 Enter monthly rent and loan amount to compute DSCR (NOI / annual debt service) and check lender qualification thresholds.'];
  }

  const noi = annualNOI(args);
  const ads = annualDebtService(args);
  const ratio = dscr(args);
  const maxLoan125 = maxLoanAtTargetDSCR({
    monthlyRent, monthlyExpenses, vacancyRate, interestRate, loanTermYears,
  }, 1.25);
  const maxLoan10 = maxLoanAtTargetDSCR({
    monthlyRent, monthlyExpenses, vacancyRate, interestRate, loanTermYears,
  }, 1.0);
  const maxLoan15 = maxLoanAtTargetDSCR({
    monthlyRent, monthlyExpenses, vacancyRate, interestRate, loanTermYears,
  }, 1.5);
  const health = dscrHealth(ratio);

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);

  // What-If
  const noiVac5 = annualNOI({ ...args, vacancyRate: vacancyRate + 5 });
  const ratioVac5 = ads > 0 ? noiVac5 / ads : Infinity;
  const noiRatePlus1 = annualNOI({ ...args });
  const adsRatePlus1 = monthlyPI(loanAmount, (interestRate + 1) / 100 / 12, loanTermYears * 12) * 12;
  const ratioRatePlus1 = adsRatePlus1 > 0 ? noiRatePlus1 / adsRatePlus1 : Infinity;
  const adsTerm15 = monthlyPI(loanAmount, interestRate / 100 / 12, 15 * 12) * 12;
  const ratioTerm15 = adsTerm15 > 0 ? annualNOI(args) / adsTerm15 : Infinity;
  const adsExpMinus10 = monthlyPI(loanAmount, interestRate / 100 / 12, loanTermYears * 12) * 12 * 1.0;  // simpler
  const noiExpMinus10 = monthlyRent * 12 * (1 - vacancyRate / 100) - monthlyExpenses * 12 * 0.9;
  const ratioExpMinus10 = adsExpMinus10 > 0 ? noiExpMinus10 / adsExpMinus10 : Infinity;

  let tip: string;
  if (ratio < 1.0) {
    tip = '💡 Tip: DSCR below 1.0 = property cannot cover debt service from operations. Lenders will deny. Either: (1) reduce loan amount, (2) raise rent, (3) reduce expenses. STR lenders may accept 0.75-1.0 DSCR based on platform bookings (Airbnb); conventional lenders require 1.20+';
  } else if (ratio < 1.25) {
    tip = '💡 Tip: DSCR in 1.0-1.25 zone is "marginal" — many lenders will decline or require larger down payment. Aim for DSCR ≥ 1.25 by either reducing loan, raising rent, or building up reserves that are not counted here.';
  } else {
    tip = '💡 Tip: DSCR ≥ 1.25 qualifies for most conventional and portfolio lenders. STR lenders typically accept 0.75-1.0. If approaching 2.0+, you may be over-paying for the property — explore buying more units or larger loan for better leverage.';
  }

  const r =
    '⏰ DSCR Calculator (Debt Service Coverage Ratio)\n\n' +
    '💰 Loan Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Monthly gross rent:         ' + money(monthlyRent) + '\n' +
    '• Monthly OpEx:                ' + money(monthlyExpenses) + '\n' +
    '• Annual NOI:                  ' + money(noi) + '  (eff rent - OpEx)\n' +
    '• Annual debt service:       ' + money(ads) + '  (mortgage P&I × 12)\n' +
    '• Loan amount:                 ' + money(loanAmount) + '\n' +
    '• DSCR ratio:                  ' + (isFinite(ratio) ? ratio.toFixed(2) + 'x' : '∞') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 DSCR Math:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• NOI = grossRent × (1 - vacancy) - OpEx\n' +
    '        = ' + money(monthlyRent * 12) + ' × (1 - ' + vacancyRate + '%) - ' + money(monthlyExpenses * 12) + '\n' +
    '        = ' + money(noi) + '\n' +
    '• Debt service = monthlyPI × 12\n' +
    '                = ' + money(monthlyPI(loanAmount, interestRate / 100 / 12, loanTermYears * 12)) + '/mo × 12\n' +
    '                = ' + money(ads) + '\n' +
    '• DSCR = NOI / Debt service = ' + (isFinite(ratio) ? ratio.toFixed(2) + 'x' : '∞') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 DSCR Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n' +
    (ratio >= 1.25 ? '• Most conventional lenders will approve this deal.\n' : ratio >= 1.0 ? '• Many lenders will require larger down payment or decline.\n' : '• Current structure does not qualify. Lenders will deny.\n') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Lender Thresholds:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Conventional (Fannie/Freddie):  DSCR ≥ 1.20-1.25\n' +
    '• Portfolio lenders:              DSCR ≥ 1.20\n' +
    '• Short-term rental (Airbnb):     DSCR 0.75-1.0 (Airbnb-future projections)\n' +
    '• Commercial (multi-family):     DSCR ≥ 1.20-1.40\n' +
    '• Hard money / bridge:           DSCR flexible (higher rate)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Reverse Calc (Max Loan):\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• At target DSCR 1.0:   ' + money(maxLoan10) + '\n' +
    '• At target DSCR 1.25:  ' + money(maxLoan125) + ' ← conventional threshold\n' +
    '• At target DSCR 1.5:   ' + money(maxLoan15) + ' ← strong buffer\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Vacancy +5pp:               DSCR → ' + (isFinite(ratioVac5) ? ratioVac5.toFixed(2) + 'x' : '∞') + '\n' +
    '• Rate +1pp:                  DSCR → ' + (isFinite(ratioRatePlus1) ? ratioRatePlus1.toFixed(2) + 'x' : '∞') + '\n' +
    '• Term 30y → 15y:             DSCR → ' + (isFinite(ratioTerm15) ? ratioTerm15.toFixed(2) + 'x' : '∞') + '\n' +
    '• OpEx −10%:                  DSCR → ' + (isFinite(ratioExpMinus10) ? ratioExpMinus10.toFixed(2) + 'x' : '∞') + '\n' +
    '• Target DSCR 1.25 vs 1.0:    see reverse calc above\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO comparison rows at 6 DSCR thresholds
  const thresholds = [0.8, 1.0, 1.25, 1.5, 2.0, 3.0];
  for (const t of thresholds) {
    const maxLoan = maxLoanAtTargetDSCR({
      monthlyRent, monthlyExpenses, vacancyRate, interestRate, loanTermYears,
    }, t);
    const lenderTag = t >= 1.25 ? ' qualifies' : t >= 1.0 ? ' marginal' : ' fails';
    results.push(
      'Comparison: at DSCR ' + t.toFixed(2) + 'x → max loan ' + money(maxLoan) + lenderTag,
    );
  }
  return results;
}

// ============== customFn (live = static parity) ==============

const customFn =
  "function mPI(p,r,n){if(n<=0)return 0;if(r===0)return p/n;return(p*r)/(1-Math.pow(1+r,-n));}" +
  "function aNOI(mr,mep,vr){return mr*12*(1-vr/100)-mep*12;}" +
  "function aDS(la,ir,lty){return mPI(la,ir/100/12,lty*12)*12;}" +
  "function dscrF(mr,mep,vr,la,ir,lty){var ads=aDS(la,ir,lty);var noi=aNOI(mr,mep,vr);if(ads===0)return Infinity;return noi/ads;}" +
  "function maxLAtDSCR(mr,mep,vr,ir,lty,target){var noi=aNOI(mr,mep,vr);if(noi<=0)return 0;var mr2=ir/100/12;var n2=lty*12;var lo=0;var hi=noi*20;for(var i=0;i<50;i++){var mid=(lo+hi)/2;var ads=mPI(mid,mr2,n2)*12;if(ads===0){lo=mid;continue;}var c=noi/ads;if(c>target)lo=mid;else hi=mid;}return(lo+hi)/2;}" +
  "function dH(v){if(!isFinite(v))return{e:'\\uD83D\\uDFE2',l:'trivially qualifies \\u2014 no debt service'};if(v>=1.25)return{e:'\\uD83D\\uDFE2',l:'qualifies \\u2014 DSCR \\u2265 1.25 (most lenders approve)'};if(v>=1.0)return{e:'\\uD83D\\uDCA1',l:'marginal \\u2014 DSCR between 1.0-1.25 (many lenders decline)'};return{e:'\\uD83D\\uDD34',l:'fails \\u2014 DSCR < 1.0 (deal cannot service debt)'};}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var mr=cnn(parseFloat(inputs.monthlyRent)||0);" +
  "var mep=cnn(parseFloat(inputs.monthlyExpenses)||0);" +
  "var la=cnn(parseFloat(inputs.loanAmount)||0);" +
  "var ir=parseFloat(inputs.interestRate)||0;" +
  "var lty=cnn(parseFloat(inputs.loanTermYears)||0);" +
  "var vr=parseFloat(inputs.vacancyRate)||0;" +
  "if(mr<=0&&la<=0){return['\\u23F0 DSCR Calculator\\n\\n\\uD83D\\uDCB0 Enter monthly rent and loan amount to compute DSCR (NOI / annual debt service) and check lender qualification thresholds.'];}" +
  "var noi=aNOI(mr,mep,vr);" +
  "var ads=aDS(la,ir,lty);" +
  "var ratio=dscrF(mr,mep,vr,la,ir,lty);" +
  "var ml125=maxLAtDSCR(mr,mep,vr,ir,lty,1.25);" +
  "var ml10=maxLAtDSCR(mr,mep,vr,ir,lty,1.0);" +
  "var ml15=maxLAtDSCR(mr,mep,vr,ir,lty,1.5);" +
  "var hl=dH(ratio);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "function rStr(v){return isFinite(v)?v.toFixed(2)+'x':'\\u221E';}" +
  "var noiV5=aNOI(mr,mep,vr+5);" +
  "var rVac5=ads>0?noiV5/ads:Infinity;" +
  "var adsRP1=mPI(la,(ir+1)/100/12,lty*12)*12;" +
  "var rRP1=adsRP1>0?noi/adsRP1:Infinity;" +
  "var adsT15=mPI(la,ir/100/12,15*12)*12;" +
  "var rT15=adsT15>0?noi/adsT15:Infinity;" +
  "var noiEM=mr*12*(1-vr/100)-mep*12*0.9;" +
  "var rEM=ads>0?noiEM/ads:Infinity;" +
  "var tip='';" +
  "if(ratio<1.0){tip='\\uD83D\\uDCA1 Tip: DSCR below 1.0 = property cannot cover debt service from operations. Lenders will deny. Either: (1) reduce loan amount, (2) raise rent, (3) reduce expenses. STR lenders may accept 0.75-1.0 DSCR based on platform bookings (Airbnb); conventional lenders require 1.20+';}" +
  "else if(ratio<1.25){tip='\\uD83D\\uDCA1 Tip: DSCR in 1.0-1.25 zone is \"marginal\" \\u2014 many lenders will decline or require larger down payment. Aim for DSCR \\u2265 1.25 by either reducing loan, raising rent, or building up reserves that are not counted here.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: DSCR \\u2265 1.25 qualifies for most conventional and portfolio lenders. STR lenders typically accept 0.75-1.0. If approaching 2.0+, you may be over-paying for the property \\u2014 explore buying more units or larger loan for better leverage.';}" +
  "var r2='';" +
  "r2+='\\u23F0 DSCR Calculator (Debt Service Coverage Ratio)\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Loan Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Monthly gross rent:         '+money(mr)+'\\n';" +
  "r2+='\\u2022 Monthly OpEx:                '+money(mep)+'\\n';" +
  "r2+='\\u2022 Annual NOI:                  '+money(noi)+'  (eff rent - OpEx)\\n';" +
  "r2+='\\u2022 Annual debt service:       '+money(ads)+'  (mortgage P&I \\u00D7 12)\\n';" +
  "r2+='\\u2022 Loan amount:                 '+money(la)+'\\n';" +
  "r2+='\\u2022 DSCR ratio:                  '+rStr(ratio)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 DSCR Math:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 NOI = grossRent \\u00D7 (1 - vacancy) - OpEx\\n';" +
  "r2+='        = '+money(mr*12)+' \\u00D7 (1 - '+vr+'%) - '+money(mep*12)+'\\n';" +
  "r2+='        = '+money(noi)+'\\n';" +
  "r2+='\\u2022 Debt service = monthlyPI \\u00D7 12\\n';" +
  "r2+='                = '+money(mPI(la,ir/100/12,lty*12))+'/mo \\u00D7 12\\n';" +
  "r2+='                = '+money(ads)+'\\n';" +
  "r2+='\\u2022 DSCR = NOI / Debt service = '+rStr(ratio)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A DSCR Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hl.e+' '+hl.l+'\\n';" +
  "if(ratio>=1.25){r2+='\\u2022 Most conventional lenders will approve this deal.\\n';}" +
  "else if(ratio>=1.0){r2+='\\u2022 Many lenders will require larger down payment or decline.\\n';}" +
  "else{r2+='\\u2022 Current structure does not qualify. Lenders will deny.\\n';}" +
  "r2+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Lender Thresholds:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Conventional (Fannie/Freddie):  DSCR \\u2265 1.20-1.25\\n';" +
  "r2+='\\u2022 Portfolio lenders:              DSCR \\u2265 1.20\\n';" +
  "r2+='\\u2022 Short-term rental (Airbnb):     DSCR 0.75-1.0 (Airbnb-future projections)\\n';" +
  "r2+='\\u2022 Commercial (multi-family):     DSCR \\u2265 1.20-1.40\\n';" +
  "r2+='\\u2022 Hard money / bridge:           DSCR flexible (higher rate)\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Reverse Calc (Max Loan):\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 At target DSCR 1.0:   '+money(ml10)+'\\n';" +
  "r2+='\\u2022 At target DSCR 1.25:  '+money(ml125)+' \\u2190 conventional threshold\\n';" +
  "r2+='\\u2022 At target DSCR 1.5:   '+money(ml15)+' \\u2190 strong buffer\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Vacancy +5pp:               DSCR \\u2192 '+rStr(rVac5)+'\\n';" +
  "r2+='\\u2022 Rate +1pp:                  DSCR \\u2192 '+rStr(rRP1)+'\\n';" +
  "r2+='\\u2022 Term 30y \\u2192 15y:             DSCR \\u2192 '+rStr(rT15)+'\\n';" +
  "r2+='\\u2022 OpEx \\u221210%:                  DSCR \\u2192 '+rStr(rEM)+'\\n';" +
  "r2+='\\u2022 Target DSCR 1.25 vs 1.0:    see reverse calc above\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var thresholds=[0.8,1.0,1.25,1.5,2.0,3.0];" +
  "for(var ti=0;ti<thresholds.length;ti++){var t=thresholds[ti];var ml=maxLAtDSCR(mr,mep,vr,ir,lty,t);results.push('Comparison: at DSCR '+t.toFixed(2)+'x \\u2192 max loan '+money(ml)+(t>=1.25?' qualifies':t>=1.0?' marginal':' fails'));}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-dscr-calculator',
  title: 'DSCR Calculator (Debt Service Coverage Ratio)',
  description:
    'Measure DSCR (NOI / annual debt service) to qualify for lender approval. Includes reverse max-loan calc at lender thresholds (1.0/1.25/1.5) via binary search, plus STR and commercial RE benchmarks.',
  inputs: [
    { name: 'monthlyRent', label: 'Monthly Gross Rent ($)', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'monthlyExpenses', label: 'Monthly Operating Expenses ($)', placeholder: 'e.g. 1500', type: 'number' },
    { name: 'loanAmount', label: 'Loan Amount ($)', placeholder: 'e.g. 400000', type: 'number' },
    { name: 'interestRate', label: 'Loan Rate (%)', placeholder: 'e.g. 7.5', type: 'number' },
    { name: 'loanTermYears', label: 'Loan Term (years)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'vacancyRate', label: 'Vacancy Rate (%)', placeholder: 'e.g. 5', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateDSCR(inputs);
  },
  staticExamples: ['⏰ DSCR Calculator (Debt Service Coverage Ratio)\n\n💰 Loan Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Monthly gross rent:         $5,000\n• Monthly OpEx:                $1,500\n• Annual NOI:                  $39,000  (eff rent - OpEx)\n• Annual debt service:       $33,562  (mortgage P&I × 12)\n• Loan amount:                 $400,000\n• DSCR ratio:                  1.16x\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 DSCR Math:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• NOI = grossRent × (1 - vacancy) - OpEx\n        = $60,000 × (1 - 5%) - $18,000\n        = $39,000\n• Debt service = monthlyPI × 12\n                = $2,797/mo × 12\n                = $33,562\n• DSCR = NOI / Debt service = 1.16x\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 DSCR Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 marginal — DSCR between 1.0-1.25 (many lenders decline)\n• Many lenders will require larger down payment or decline.\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Lender Thresholds:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Conventional (Fannie/Freddie):  DSCR ≥ 1.20-1.25\n• Portfolio lenders:              DSCR ≥ 1.20\n• Short-term rental (Airbnb):     DSCR 0.75-1.0 (Airbnb-future projections)\n• Commercial (multi-family):     DSCR ≥ 1.20-1.40\n• Hard money / bridge:           DSCR flexible (higher rate)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Reverse Calc (Max Loan):\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• At target DSCR 1.0:   $464,807\n• At target DSCR 1.25:  $371,846 ← conventional threshold\n• At target DSCR 1.5:   $309,872 ← strong buffer\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Vacancy +5pp:               DSCR → 1.07x\n• Rate +1pp:                  DSCR → 1.06x\n• Term 30y → 15y:             DSCR → 0.88x\n• OpEx −10%:                  DSCR → 1.22x\n• Target DSCR 1.25 vs 1.0:    see reverse calc above\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: DSCR in 1.0-1.25 zone is "marginal" — many lenders will decline or require larger down payment. Aim for DSCR ≥ 1.25 by either reducing loan, raising rent, or building up reserves that are not counted here.\nComparison: at DSCR 0.80x → max loan $581,009 fails\nComparison: at DSCR 1.00x → max loan $464,807 marginal\nComparison: at DSCR 1.25x → max loan $371,846 qualifies\nComparison: at DSCR 1.50x → max loan $309,872 qualifies\nComparison: at DSCR 2.00x → max loan $232,404 qualifies\nComparison: at DSCR 3.00x → max loan $154,936 qualifies'],
  faq: [
    {
      q: 'What is DSCR?',
      a: 'DSCR (Debt Service Coverage Ratio) measures whether a property\'s income covers its debt payments. Formula: NOI / Annual Debt Service. For a property with $39K NOI and $33,564 annual mortgage, DSCR = 1.16. Most conventional lenders require DSCR ≥ 1.20-1.25; short-term rental lenders often accept 0.75-1.0.',
    },
    {
      q: 'What DSCR do I need for an investment property loan?',
      a: 'By lender type: Fannie/Freddie (conforming) 1.20-1.25; portfolio lenders 1.20; commercial multi-family 1.20-1.40; short-term rental (Airbnb) lenders 0.75-1.0; hard money / bridge lenders are flexible (compensate with higher rate). STR lenders often use future Airbnb projections to qualify, which lowers the apparent DSCR ratio requirement.',
    },
    {
      q: 'How can I improve my DSCR?',
      a: 'Three levers: (1) Reduce loan amount via larger down payment — biggest single impact. (2) Raise rent (verify with comps first; over-estimating is risky). (3) Reduce operating expenses (refinance insurance, raise deductibles, switch property managers). Each percentage point of DSCR improvement is meaningful; aim for ≥ 1.25 to access the deepest lender pool.',
    },
    {
      q: 'Why use NOI instead of gross rent in DSCR?',
      a: 'NOI (Net Operating Income) subtracts vacancy reserves and operating expenses from gross rent — closer to actual cash flow. A property with $5K/mo gross rent but $2K/mo OpEx is fundamentally different from one with $3K/mo OpEx (the latter has ~67% higher effective income). DSCR uses NOI because lenders care about your ability to service debt from real net income, not optimistic top-line rent.',
    },
    {
      q: 'How is DSCR different from cash-on-cash?',
      a: 'DSCR uses NOI (before mortgage); cash-on-cash uses cash flow (after mortgage). DSCR asks: "can the property produce enough income to cover its debt?" CoC asks: "how much cash do I make per dollar invested?" Both are essential — DSCR determines if you CAN get the loan; CoC determines if you SHOULD take it. Aim for both: DSCR ≥ 1.25 (eligibility) AND CoC ≥ 8% (worthwhile return).',
    },
  ],
  howToUse: [
    'Enter monthly gross rent (vacancy will be deducted automatically).',
    'Enter monthly operating expenses (1-1.5% of property value annually).',
    'Enter the loan amount you want to qualify for.',
    'Enter interest rate (current 30-year fixed ~6.5-7.5% in 2026).',
    'Enter loan term (30y standard, 15y for higher DSCR).',
    'Enter expected vacancy rate (5-10% typical residential, 8-15% Class C).',
    'Review DSCR ratio and health band (🟢 ≥1.25 qualifies, 🟡 1.0-1.25 marginal, 🔴 <1.0 fails).',
    'Check the reverse max-loan calc at 1.25 to see how much you can borrow.',
    'Compare lender type thresholds (conventional vs STR vs portfolio).',
    'Apply what-ifs (vacancy, rate, term, OpEx) for sensitivity.',
    'If DSCR falls short, see Rental Yield (P5-4) and BRRRR (P5-5) calculators for the underlying cash flow analysis.',
  ],
  engineKey: true,
};

registerEngine(engine);
