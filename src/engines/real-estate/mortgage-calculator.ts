import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

// ============== Math helpers (exported for tests) ==============

/**
 * Monthly P&I payment (PMT formula). Handles zero-rate.
 *   principal * r / (1 - (1+r)^-n)   when r > 0
 *   principal / n                    when r = 0
 */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

/** Total interest over loan term = monthlyPI * n - principal */
export function totalInterest(principal: number, monthlyRate: number, n: number): number {
  return monthlyPI(principal, monthlyRate, n) * n - principal;
}

/** Loan-to-value ratio as percent */
export function ltv(principal: number, homePrice: number): number {
  if (homePrice <= 0) return 0;
  return (principal / homePrice) * 100;
}

/**
 * Cumulative principal paid through end of given `year` (monthly payments).
 *   balance(m) = P * ((1+r)^N - (1+r)^m) / ((1+r)^N - 1)
 *   principalPaid = P - balance(monthsPaid)
 *   monthsPaid = min(year * 12, n)
 */
export function principalPaidByYear(
  year: number,
  principal: number,
  monthlyRate: number,
  n: number,
): number {
  const monthsPaid = Math.min(year * 12, n);
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal * (monthsPaid / n);
  const balance =
    (principal * (Math.pow(1 + monthlyRate, n) - Math.pow(1 + monthlyRate, monthsPaid))) /
    (Math.pow(1 + monthlyRate, n) - 1);
  return principal - balance;
}

// ============== calculate() ==============

function calculateMortgage(inputs: Record<string, string>): string[] {
  const homePrice = clampNonNegative(parseFloat(inputs.homePrice) || 0);
  const downPayment = clampNonNegative(parseFloat(inputs.downPayment) || 0);
  const loanTermYears = clampNonNegative(parseFloat(inputs.loanTermYears) || 0);
  const interestRate = parseFloat(inputs.interestRate) || 0;

  // Edge: homePrice=0 → prompt
  if (homePrice === 0) {
    return [
      '⏰ Mortgage Calculator\n\n' +
        '💰 Enter home price, down payment, loan term, and interest rate to see your monthly P&I, total interest, and amortization milestones.',
    ];
  }
  // Edge: down payment >= home price
  if (downPayment >= homePrice) {
    return [
      '⏰ Mortgage Calculator\n\n' +
        '💰 Down payment (' +
        homePrice.toLocaleString('en-US') +
        ') >= home price — no loan needed. Consider whether a smaller down payment would let you keep more cash liquid for other investments.',
    ];
  }
  // Edge: invalid term
  if (loanTermYears <= 0) {
    return [
      '⏰ Mortgage Calculator\n\n' +
        '💰 Loan term must be > 0 years. Typical mortgages are 15, 20, or 30 years.',
    ];
  }

  const principal = homePrice - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const n = loanTermYears * 12;
  const monthly = monthlyPI(principal, monthlyRate, n);
  const ti = totalInterest(principal, monthlyRate, n);
  const totalCost = homePrice + ti;
  const ltvPct = ltv(principal, homePrice);

  const fmt = (n: number) =>
    n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const pct2 = (n: number) => n.toFixed(2) + '%';

  // Health
  let healthEmoji: string;
  let healthLabel: string;
  const ratio = homePrice > 0 ? monthly / homePrice : 0;
  if (ratio < 0.010) {
    healthEmoji = '🟢';
    healthLabel = 'affordable — P&I under 1.0% of home price';
  } else if (ratio < 0.013) {
    healthEmoji = '🟡';
    healthLabel = 'moderate — P&I between 1.0-1.3% of home price';
  } else {
    healthEmoji = '🟠';
    healthLabel = 'stretched — P&I over 1.3% of home price; verify 28% DTI rule';
  }

  // Term comparison
  const m15 = monthlyPI(principal, monthlyRate, 180);
  const ti15 = totalInterest(principal, monthlyRate, 180);
  const m20 = monthlyPI(principal, monthlyRate, 240);
  const ti20 = totalInterest(principal, monthlyRate, 240);

  // Milestones
  const paid5 = principalPaidByYear(5, principal, monthlyRate, n);
  const paid15 = principalPaidByYear(15, principal, monthlyRate, n);
  const paid30 = principalPaidByYear(30, principal, monthlyRate, n);

  // What-If
  const rateMinus = Math.max(0, interestRate - 1);
  const ratePlus = interestRate + 1;
  const monthlyMinus = monthlyPI(principal, rateMinus / 100 / 12, n);
  const monthlyPlus = monthlyPI(principal, ratePlus / 100 / 12, n);
  const dp20 = homePrice * 0.2;
  const principal20 = homePrice - dp20;
  const monthly20 = monthlyPI(principal20, monthlyRate, n);
  const extraYears = ti > 0 ? Math.ceil(ti / 200 / 12) : 0;

  // Tip
  let tip: string;
  if (ltvPct >= 80) {
    tip =
      '💡 Tip: LTV ≥ 80% typically requires Private Mortgage Insurance (PMI) — adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI.';
  } else if (loanTermYears >= 30) {
    tip =
      '💡 Tip: 30-year term gives lowest monthly payment but highest total interest. Compare with 15-year — higher payment but ~50% less total interest paid.';
  } else {
    tip =
      '💡 Tip: Shortening your term from 30 to 15 years typically saves 50%+ on total interest. Run the comparison below to see the dollar difference for your loan.';
  }

  const r =
    '⏰ Mortgage Calculator\n\n' +
    '💰 Loan Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Home price:           ' +
    money(homePrice) +
    '\n' +
    '• Down payment:         ' +
    money(downPayment) +
    '  (' +
    pct2((downPayment / homePrice) * 100) +
    ')\n' +
    '• Loan amount:          ' +
    money(principal) +
    '\n' +
    '• Loan term:            ' +
    loanTermYears +
    ' years (' +
    n +
    ' months)\n' +
    '• Interest rate:        ' +
    interestRate +
    '% APR\n' +
    '• LTV:                  ' +
    pct2(ltvPct) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Monthly Payment:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Monthly P&I:          ' +
    money(monthly) +
    '\n' +
    '• Total interest paid: ' +
    money(ti) +
    '  (over loan term)\n' +
    '• Total cost (price + interest): ' +
    money(totalCost) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Affordability Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' +
    healthEmoji +
    ' ' +
    healthLabel +
    '\n' +
    '• P&I as % of home price: ' +
    pct2(ratio * 100) +
    '\n' +
    '• Rule of thumb: P&I should be ≤ 28% of monthly gross income\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Loan Term Comparison:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 15-year: ' +
    money(m15) +
    '/mo · ' +
    money(ti15) +
    ' total interest\n' +
    '• 20-year: ' +
    money(m20) +
    '/mo · ' +
    money(ti20) +
    ' total interest\n' +
    '• ' +
    loanTermYears +
    '-year: ' +
    money(monthly) +
    '/mo · ' +
    money(ti) +
    ' total interest  ← current\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Amortization Milestones:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• After year 5:  ' +
    money(paid5) +
    ' principal paid (' +
    pct2((paid5 / principal) * 100) +
    ' of loan)\n' +
    '• After year 15: ' +
    money(paid15) +
    ' principal paid (' +
    pct2((paid15 / principal) * 100) +
    ' of loan)\n' +
    (loanTermYears >= 30
      ? '• After year 30: ' +
        money(paid30) +
        ' (loan fully paid)\n'
      : '') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Rate -1pp (' +
    rateMinus.toFixed(1) +
    '%):     monthly → ' +
    money(monthlyMinus) +
    '\n' +
    '• Rate +1pp (' +
    ratePlus.toFixed(1) +
    '%):     monthly → ' +
    money(monthlyPlus) +
    '\n' +
    '• Extra $200/mo payment:    helps pay off ~' +
    extraYears +
    ' months earlier\n' +
    '• 20% down (vs current):   loan ' +
    money(principal20) +
    ' · monthly ' +
    money(monthly20) +
    '\n' +
    '• 15-year refinance:        see comparison above\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  const prices = [200000, 400000, 600000, 800000, 1000000, 1500000];
  for (const p of prices) {
    const prinP = p - downPayment;
    if (prinP <= 0) {
      results.push(
        'Comparison: home ' +
          money(p) +
          ' with ' +
          money(downPayment) +
          ' down → loan = $0 (no payment)',
      );
      continue;
    }
    const m = monthlyPI(prinP, monthlyRate, n);
    results.push(
      'Comparison: ' +
        money(p) +
        ' home with ' +
        money(downPayment) +
        ' down (' +
        pct2((downPayment / p) * 100) +
        ') → ' +
        money(m) +
        '/mo at ' +
        interestRate +
        '%',
    );
  }

  return results;
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  "function mPI(p,r,n){if(n<=0)return 0;if(r===0)return p/n;return(p*r)/(1-Math.pow(1+r,-n));}" +
  "function tI(p,r,n){return mPI(p,r,n)*n-p;}" +
  "function ltv2(p,h){if(h<=0)return 0;return p/h*100;}" +
  "function ppByY(y,p,r,n){var m=Math.min(y*12,n);if(n<=0)return 0;if(r===0)return p*(m/n);var b=(p*(Math.pow(1+r,n)-Math.pow(1+r,m)))/(Math.pow(1+r,n)-1);return p-b;}" +
  "var cnn=function(x){return Math.max(0,x)};" +
  "var hp=cnn(parseFloat(inputs.homePrice)||0);" +
  "var dp=cnn(parseFloat(inputs.downPayment)||0);" +
  "var lty=cnn(parseFloat(inputs.loanTermYears)||0);" +
  "var ir=parseFloat(inputs.interestRate)||0;" +
  "if(hp===0){return['\\u23F0 Mortgage Calculator\\n\\n\\uD83D\\uDCB0 Enter home price, down payment, loan term, and interest rate to see your monthly P&I, total interest, and amortization milestones.'];}" +
  "if(dp>=hp){return['\\u23F0 Mortgage Calculator\\n\\n\\uD83D\\uDCB0 Down payment ('+hp.toLocaleString('en-US')+') >= home price \\u2014 no loan needed. Consider whether a smaller down payment would let you keep more cash liquid for other investments.'];}" +
  "if(lty<=0){return['\\u23F0 Mortgage Calculator\\n\\n\\uD83D\\uDCB0 Loan term must be > 0 years. Typical mortgages are 15, 20, or 30 years.'];}" +
  "var prin=hp-dp;" +
  "var mr=ir/100/12;" +
  "var n2=lty*12;" +
  "var monthly=mPI(prin,mr,n2);" +
  "var ti=tI(prin,mr,n2);" +
  "var tc=hp+ti;" +
  "var lvP=ltv2(prin,hp);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return '$'+fmt(n);}" +
  "function pct2(n){return n.toFixed(2)+'%';}" +
  "var ratio=hp>0?monthly/hp:0;" +
  "var hlE='',hlL='';" +
  "if(ratio<0.010){hlE='\\uD83D\\uDFE2';hlL='affordable \\u2014 P&I under 1.0% of home price';}" +
  "else if(ratio<0.013){hlE='\\uD83D\\uDCA1';hlL='moderate \\u2014 P&I between 1.0-1.3% of home price';}" +
  "else{hlE='\\uD83D\\uDFE0';hlL='stretched \\u2014 P&I over 1.3% of home price; verify 28% DTI rule';}" +
  "var m15=mPI(prin,mr,180);var ti15=tI(prin,mr,180);" +
  "var m20=mPI(prin,mr,240);var ti20=tI(prin,mr,240);" +
  "var p5=ppByY(5,prin,mr,n2);var p15=ppByY(15,prin,mr,n2);var p30=ppByY(30,prin,mr,n2);" +
  "var rmi=Math.max(0,ir-1);var rpi=ir+1;" +
  "var mMinus=mPI(prin,rmi/100/12,n2);var mPlus=mPI(prin,rpi/100/12,n2);" +
  "var dp20=hp*0.20;var prin20=hp-dp20;var m20d=mPI(prin20,mr,n2);" +
  "var extraYears=ti>0?Math.ceil(ti/200/12):0;" +
  "var tip='';" +
  "if(lvP>=80){tip='\\uD83D\\uDCA1 Tip: LTV \\u2265 80% typically requires Private Mortgage Insurance (PMI) \\u2014 adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI.';}" +
  "else if(lty>=30){tip='\\uD83D\\uDCA1 Tip: 30-year term gives lowest monthly payment but highest total interest. Compare with 15-year \\u2014 higher payment but ~50% less total interest paid.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: Shortening your term from 30 to 15 years typically saves 50%+ on total interest. Run the comparison below to see the dollar difference for your loan.';}" +
  "var r2='';" +
  "r2+='\\u23F0 Mortgage Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Loan Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Home price:           '+money(hp)+'\\n';" +
  "r2+='\\u2022 Down payment:         '+money(dp)+'  ('+pct2((dp/hp)*100)+')\\n';" +
  "r2+='\\u2022 Loan amount:          '+money(prin)+'\\n';" +
  "r2+='\\u2022 Loan term:            '+lty+' years ('+n2+' months)\\n';" +
  "r2+='\\u2022 Interest rate:        '+ir+'% APR\\n';" +
  "r2+='\\u2022 LTV:                  '+pct2(lvP)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Monthly Payment:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Monthly P&I:          '+money(monthly)+'\\n';" +
  "r2+='\\u2022 Total interest paid: '+money(ti)+'  (over loan term)\\n';" +
  "r2+='\\u2022 Total cost (price + interest): '+money(tc)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Affordability Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+hlE+' '+hlL+'\\n';" +
  "r2+='\\u2022 P&I as % of home price: '+pct2(ratio*100)+'\\n';" +
  "r2+='\\u2022 Rule of thumb: P&I should be \\u2264 28% of monthly gross income\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Loan Term Comparison:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 15-year: '+money(m15)+'/mo \\u00B7 '+money(ti15)+' total interest\\n';" +
  "r2+='\\u2022 20-year: '+money(m20)+'/mo \\u00B7 '+money(ti20)+' total interest\\n';" +
  "r2+='\\u2022 '+lty+'-year: '+money(monthly)+'/mo \\u00B7 '+money(ti)+' total interest  \\u2190 current\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Amortization Milestones:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 After year 5:  '+money(p5)+' principal paid ('+pct2((p5/prin)*100)+' of loan)\\n';" +
  "r2+='\\u2022 After year 15: '+money(p15)+' principal paid ('+pct2((p15/prin)*100)+' of loan)\\n';" +
  "if(lty>=30){r2+='\\u2022 After year 30: '+money(p30)+' (loan fully paid)\\n';}" +
  "r2+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Rate -1pp ('+rmi.toFixed(1)+'%):     monthly \\u2192 '+money(mMinus)+'\\n';" +
  "r2+='\\u2022 Rate +1pp ('+rpi.toFixed(1)+'%):     monthly \\u2192 '+money(mPlus)+'\\n';" +
  "r2+='\\u2022 Extra $200/mo payment:    helps pay off ~'+extraYears+' months earlier\\n';" +
  "r2+='\\u2022 20% down (vs current):   loan '+money(prin20)+' \\u00B7 monthly '+money(m20d)+'\\n';" +
  "r2+='\\u2022 15-year refinance:        see comparison above\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var prices=[200000,400000,600000,800000,1000000,1500000];" +
  "for(var pi=0;pi<prices.length;pi++){var pp=prices[pi];var prinP=pp-dp;if(prinP<=0){results.push('Comparison: home '+money(pp)+' with '+money(dp)+' down \\u2192 loan = $0 (no payment)');continue;}var mp=mPI(prinP,mr,n2);results.push('Comparison: '+money(pp)+' home with '+money(dp)+' down ('+pct2((dp/pp)*100)+') \\u2192 '+money(mp)+'/mo at '+ir+'%');}" +
  "return results;";

// ============== Engine ==============

const engine: ToolEngine = {
  slug: 'solopreneur-mortgage-calculator',
  title: 'Mortgage Calculator',
  description:
    'Calculate your monthly P&I payment, total interest over the loan term, and amortization milestones. Compare 15y vs 30y terms, model rate changes, and check LTV-driven PMI implications.',
  inputs: [
    { name: 'homePrice', label: 'Home Price ($)', placeholder: 'e.g. 500000', type: 'number' },
    { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'loanTermYears', label: 'Loan Term (years)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'interestRate', label: 'Annual Interest Rate (%)', placeholder: 'e.g. 6.5', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateMortgage(inputs);
  },
  staticExamples: ['⏰ Mortgage Calculator\n\n💰 Loan Snapshot:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Home price:           $500,000\n• Down payment:         $100,000  (20.00%)\n• Loan amount:          $400,000\n• Loan term:            30 years (360 months)\n• Interest rate:        6.5% APR\n• LTV:                  80.00%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Monthly Payment:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Monthly P&I:          $2,528\n• Total interest paid: $510,178  (over loan term)\n• Total cost (price + interest): $1,010,178\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Affordability Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 affordable — P&I under 1.0% of home price\n• P&I as % of home price: 0.51%\n• Rule of thumb: P&I should be ≤ 28% of monthly gross income\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🎯 Loan Term Comparison:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 15-year: $3,484/mo · $227,197 total interest\n• 20-year: $2,982/mo · $315,750 total interest\n• 30-year: $2,528/mo · $510,178 total interest  ← current\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Amortization Milestones:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• After year 5:  $25,556 principal paid (6.39% of loan)\n• After year 15: $109,763 principal paid (27.44% of loan)\n• After year 30: $400,000 (loan fully paid)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Rate -1pp (5.5%):     monthly → $2,271\n• Rate +1pp (7.5%):     monthly → $2,797\n• Extra $200/mo payment:    helps pay off ~213 months earlier\n• 20% down (vs current):   loan $400,000 · monthly $2,528\n• 15-year refinance:        see comparison above\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💡 Tip: LTV ≥ 80% typically requires Private Mortgage Insurance (PMI) — adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI.\nComparison: $200,000 home with $100,000 down (50.00%) → $632/mo at 6.5%\nComparison: $400,000 home with $100,000 down (25.00%) → $1,896/mo at 6.5%\nComparison: $600,000 home with $100,000 down (16.67%) → $3,160/mo at 6.5%\nComparison: $800,000 home with $100,000 down (12.50%) → $4,424/mo at 6.5%\nComparison: $1,000,000 home with $100,000 down (10.00%) → $5,689/mo at 6.5%\nComparison: $1,500,000 home with $100,000 down (6.67%) → $8,849/mo at 6.5%'],
  faq: [
    {
      q: 'How is the monthly mortgage payment calculated?',
      a: 'Monthly payment uses the PMT formula: P × r / (1 − (1+r)^−n), where P = loan principal (home price − down payment), r = monthly interest rate (annual rate ÷ 12), and n = total months (loan term × 12). For a $400K loan at 6.5% over 30 years, the monthly P&I is ~$2,528. The formula handles zero-rate loans gracefully (returns principal/n).',
    },
    {
      q: 'What is LTV and why does it matter?',
      a: 'LTV (Loan-to-Value) is the ratio of your loan to the home price, expressed as a percent. With 20% down on a $500K home, LTV is 80%. Most lenders require Private Mortgage Insurance (PMI) when LTV exceeds 80%, which adds 0.5–1.5% to your annual payment. PMI typically drops off once LTV falls below 78%.',
    },
    {
      q: 'What is the difference between 15-year and 30-year mortgages?',
      a: 'A 15-year mortgage has higher monthly payments but saves 50%+ on total interest paid. For a $400K loan at 6.5%, 30-year total interest is ~$510K; 15-year is only ~$228K. Shorter terms build equity faster and qualify for lower rates (typically 0.5–1.0% less). Choose based on cash flow — 15-year works if monthly payment stays under 28% of gross income.',
    },
    {
      q: 'How can I pay off my mortgage faster?',
      a: 'Three common strategies: (1) Extra principal payments — even $100/month extra on a $400K 30-year at 6.5% saves ~$80K in interest and pays off 5+ years early. (2) Biweekly payments — splits monthly payment in half and pays every 2 weeks, resulting in 13 full payments per year instead of 12. (3) Refinance to shorter term — if rates drop or income rises, refinancing from 30-year to 15-year accelerates payoff.',
    },
    {
      q: 'Are property taxes and insurance included in the monthly payment?',
      a: 'No — the monthly P&I calculated here is principal and interest only. Most lenders escrow property taxes and homeowners insurance, collecting 1–2% of home value annually as part of total monthly payment. Add ~$500–$1,500/month for taxes+insurance on a typical $500K home to estimate true monthly housing cost.',
    },
  ],
  howToUse: [
    'Enter the home purchase price.',
    'Enter your down payment amount (e.g., 20% of price for conventional loans).',
    'Enter loan term (typical: 15, 20, or 30 years).',
    'Enter annual interest rate (current 30-year fixed ~6.5-7.0% in 2026).',
    'Review monthly P&I, total interest, and amortization milestones at years 5/15/30.',
    'Compare 15y vs 30y total interest to choose your term.',
    'Apply the 5 what-if scenarios for rate changes and extra payments.',
    'For "PITI" (full housing cost), add property tax + insurance + HOA to monthly P&I.',
  ],
};

registerEngine(engine);
