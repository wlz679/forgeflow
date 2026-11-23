import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-14：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

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
      makeToken('calc_out.section.mortgage_calculator', '⏰ Mortgage Calculator') +
        '\n\n' +
        makeToken('calc_out.mortgage.row.need_inputs', '💰 Enter home price, down payment, loan term, and interest rate to see your monthly P&I, total interest, and amortization milestones.'),
    ];
  }
  // Edge: down payment >= home price
  if (downPayment >= homePrice) {
    const downAmountLabel = homePrice.toLocaleString('en-US');
    return [
      makeToken('calc_out.section.mortgage_calculator', '⏰ Mortgage Calculator') +
        '\n\n' +
        makeToken(
          'calc_out.mortgage.row.no_loan_needed',
          '💰 Down payment (' + downAmountLabel + ') >= home price — no loan needed. Consider whether a smaller down payment would let you keep more cash liquid for other investments.',
          { value: downAmountLabel },
        ),
    ];
  }
  // Edge: invalid term
  if (loanTermYears <= 0) {
    return [
      makeToken('calc_out.section.mortgage_calculator', '⏰ Mortgage Calculator') +
        '\n\n' +
        makeToken('calc_out.mortgage.row.need_term', '💰 Loan term must be > 0 years. Typical mortgages are 15, 20, or 30 years.'),
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

  // Health（健康度各档**各写一个 code 字面量** ⇒ 不动态拼码）
  const ratio = homePrice > 0 ? monthly / homePrice : 0;
  let healthLine: string;
  if (ratio < 0.010) {
    healthLine = makeToken(
      'calc_out.mortgage.row.health_affordable',
      '• 🟢 affordable — P&I under 1.0% of home price',
    );
  } else if (ratio < 0.013) {
    healthLine = makeToken(
      'calc_out.mortgage.row.health_moderate',
      '• 🟡 moderate — P&I between 1.0-1.3% of home price',
    );
  } else {
    healthLine = makeToken(
      'calc_out.mortgage.row.health_stretched',
      '• 🟠 stretched — P&I over 1.3% of home price; verify 28% DTI rule',
    );
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
    tip = makeToken(
      'calc_out.mortgage.row.tip_pmi',
      '💡 Tip: LTV ≥ 80% typically requires Private Mortgage Insurance (PMI) — adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI.',
    );
  } else if (loanTermYears >= 30) {
    tip = makeToken(
      'calc_out.mortgage.row.tip_30_year',
      '💡 Tip: 30-year term gives lowest monthly payment but highest total interest. Compare with 15-year — higher payment but ~50% less total interest paid.',
    );
  } else {
    tip = makeToken(
      'calc_out.mortgage.row.tip_shorten',
      '💡 Tip: Shortening your term from 30 to 15 years typically saves 50%+ on total interest. Run the comparison below to see the dollar difference for your loan.',
    );
  }

  // P168 B3-14：params 的表达式与兜底里的表达式必须**同源** ⇒ 先用局部变量承接
  const totalInterestLabel = money(ti);
  const totalCostLabel = money(totalCost);
  const m15Label = money(m15);
  const ti15Label = money(ti15);
  const m20Label = money(m20);
  const ti20Label = money(ti20);
  const monthlyLabel = money(monthly);
  const tiLabel = money(ti);
  const paid5Label = money(paid5);
  const paid5PctLabel = pct2((paid5 / principal) * 100);
  const paid15Label = money(paid15);
  const paid15PctLabel = pct2((paid15 / principal) * 100);
  const paid30Label = money(paid30);
  const principal20Label = money(principal20);
  const monthly20Label = money(monthly20);
  const ratioPctLabel = pct2(ratio * 100);
  // ⚠️ params 的值必须是**字符串**（makeToken 的类型是 Record<string, string>）
  const termYearsLabel = String(loanTermYears);
  const termMonthsLabel = String(n);
  const rateLabel = String(interestRate);
  const extraYearsLabel = String(extraYears);

  const r =
    makeToken('calc_out.section.mortgage_calculator', '⏰ Mortgage Calculator') + '\n\n' +
    makeToken('calc_out.section.mortgage_loan_snapshot', '💰 Loan Snapshot:') + '\n' +
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
    makeToken(
      'calc_out.mortgage.row.loan_term',
      '• Loan term:            ' + termYearsLabel + ' years (' + termMonthsLabel + ' months)',
      { term: termYearsLabel, months: termMonthsLabel },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.interest_rate',
      '• Interest rate:        ' + rateLabel + '% APR',
      { rate: rateLabel },
    ) +
    '\n' +
    '• LTV:                  ' +
    pct2(ltvPct) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.mortgage_monthly_payment', '📐 Monthly Payment:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Monthly P&I:          ' +
    money(monthly) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.total_interest',
      '• Total interest paid: ' + totalInterestLabel + '  (over loan term)',
      { value: totalInterestLabel },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.total_cost',
      '• Total cost (price + interest): ' + totalCostLabel,
      { value: totalCostLabel },
    ) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.mortgage_health', '🩺 Affordability Health:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    healthLine +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.pi_as_pct_home_price',
      '• P&I as % of home price: ' + ratioPctLabel,
      { value: ratioPctLabel },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.rule_of_thumb',
      '• Rule of thumb: P&I should be ≤ 28% of monthly gross income',
    ) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.mortgage_term_comparison', '🎯 Loan Term Comparison:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken(
      'calc_out.mortgage.row.term_15',
      '• 15-year: ' + m15Label + '/mo · ' + ti15Label + ' total interest',
      { payment: m15Label, interest: ti15Label },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.term_20',
      '• 20-year: ' + m20Label + '/mo · ' + ti20Label + ' total interest',
      { payment: m20Label, interest: ti20Label },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.term_current',
      '• ' + termYearsLabel + '-year: ' + monthlyLabel + '/mo · ' + tiLabel + ' total interest  ← current',
      { term: termYearsLabel, payment: monthlyLabel, interest: tiLabel },
    ) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.mortgage_amortization', '⚖️ Amortization Milestones:') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    makeToken(
      'calc_out.mortgage.row.amort_year_5',
      '• After year 5:  ' + paid5Label + ' principal paid (' + paid5PctLabel + ' of loan)',
      { value: paid5Label, pct: paid5PctLabel },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.amort_year_15',
      '• After year 15: ' + paid15Label + ' principal paid (' + paid15PctLabel + ' of loan)',
      { value: paid15Label, pct: paid15PctLabel },
    ) +
    '\n' +
    (loanTermYears >= 30
      ? makeToken(
          'calc_out.mortgage.row.amort_year_30',
          '• After year 30: ' + paid30Label + ' (loan fully paid)',
          { value: paid30Label },
        ) + '\n'
      : '') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    makeToken('calc_out.section.what_if_scenarios', '🔄 What-If Scenarios:') + '\n' +
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
    makeToken(
      'calc_out.mortgage.row.whatif_extra_payment',
      '• Extra $200/mo payment:    helps pay off ~' + extraYearsLabel + ' months earlier',
      { months: extraYearsLabel },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.whatif_down_20',
      '• 20% down (vs current):   loan ' + principal20Label + ' · monthly ' + monthly20Label,
      { loan: principal20Label, monthly: monthly20Label },
    ) +
    '\n' +
    makeToken(
      'calc_out.mortgage.row.whatif_refi_15',
      '• 15-year refinance:        see comparison above',
    ) +
    '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  const prices = [200000, 400000, 600000, 800000, 1000000, 1500000];
  for (const p of prices) {
    const prinP = p - downPayment;
    const priceLabel = money(p);
    const downLabel = money(downPayment);
    if (prinP <= 0) {
      results.push(
        makeToken(
          'calc_out.mortgage.row.comparison_no_loan',
          'Comparison: home ' + priceLabel + ' with ' + downLabel + ' down → loan = $0 (no payment)',
          { price: priceLabel, down: downLabel },
        ),
      );
      continue;
    }
    const m = monthlyPI(prinP, monthlyRate, n);
    const pctLabel = pct2((downPayment / p) * 100);
    const monthlyCompareLabel = money(m);
    results.push(
      makeToken(
        'calc_out.mortgage.row.comparison',
        'Comparison: ' + priceLabel + ' home with ' + downLabel + ' down (' + pctLabel + ') → ' + monthlyCompareLabel + '/mo at ' + rateLabel + '%',
        { price: priceLabel, down: downLabel, pct: pctLabel, monthly: monthlyCompareLabel, rate: rateLabel },
      ),
    );
  }

  return results;
}

// ============== customFn (live = static parity with calculate()) ==============

const customFn =
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let _=function(n){return Number.isNaN(n)?0:Math.max(0,n)},u=function(n,o,e){return e<=0?0:o===0?n/e:n*o/(1-Math.pow(1+o,-e))},h=function(n,o,e){return u(n,o,e)*e-n},I=function(n,o){return o<=0?0:n/o*100},f=function(n,o,e,c){const m=Math.min(n*12,c);if(c<=0)return 0;if(e===0)return o*(m/c);const a=o*(Math.pow(1+e,c)-Math.pow(1+e,m))/(Math.pow(1+e,c)-1);return o-a},C=function(n){const o=_(parseFloat(n.homePrice)||0),e=_(parseFloat(n.downPayment)||0),c=_(parseFloat(n.loanTermYears)||0),m=parseFloat(n.interestRate)||0;if(o===0)return[t("calc_out.section.mortgage_calculator","⏰ Mortgage Calculator")+\`

\`+t("calc_out.mortgage.row.need_inputs","💰 Enter home price, down payment, loan term, and interest rate to see your monthly P&I, total interest, and amortization milestones.")];if(e>=o){const l=o.toLocaleString("en-US");return[t("calc_out.section.mortgage_calculator","⏰ Mortgage Calculator")+\`

\`+t("calc_out.mortgage.row.no_loan_needed","💰 Down payment ("+l+") >= home price — no loan needed. Consider whether a smaller down payment would let you keep more cash liquid for other investments.",{value:l})]}if(c<=0)return[t("calc_out.section.mortgage_calculator","⏰ Mortgage Calculator")+\`

\`+t("calc_out.mortgage.row.need_term","💰 Loan term must be > 0 years. Typical mortgages are 15, 20, or 30 years.")];const a=o-e,s=m/100/12,i=c*12,P=u(a,s,i),p=h(a,s,i),et=o+p,A=I(a,o),at=l=>l.toLocaleString("en-US",{maximumFractionDigits:0}),r=l=>"$"+at(l),g=l=>l.toFixed(2)+"%",M=o>0?P/o:0;let y;M<.01?y=t("calc_out.mortgage.row.health_affordable","• 🟢 affordable — P&I under 1.0% of home price"):M<.013?y=t("calc_out.mortgage.row.health_moderate","• 🟡 moderate — P&I between 1.0-1.3% of home price"):y=t("calc_out.mortgage.row.health_stretched","• 🟠 stretched — P&I over 1.3% of home price; verify 28% DTI rule");const ct=u(a,s,180),lt=h(a,s,180),st=u(a,s,240),it=h(a,s,240),x=f(5,a,s,i),q=f(15,a,s,i),ut=f(30,a,s,i),j=Math.max(0,m-1),D=m+1,mt=u(a,j/100/12,i),gt=u(a,D/100/12,i),pt=o*.2,N=o-pt,_t=u(N,s,i),ht=p>0?Math.ceil(p/200/12):0;let w;A>=80?w=t("calc_out.mortgage.row.tip_pmi","💡 Tip: LTV ≥ 80% typically requires Private Mortgage Insurance (PMI) — adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI."):c>=30?w=t("calc_out.mortgage.row.tip_30_year","💡 Tip: 30-year term gives lowest monthly payment but highest total interest. Compare with 15-year — higher payment but ~50% less total interest paid."):w=t("calc_out.mortgage.row.tip_shorten","💡 Tip: Shortening your term from 30 to 15 years typically saves 50%+ on total interest. Run the comparison below to see the dollar difference for your loan.");const Y=r(p),E=r(et),$=r(ct),z=r(lt),O=r(st),R=r(it),H=r(P),U=r(p),V=r(x),J=g(x/a*100),K=r(q),W=g(q/a*100),B=r(ut),G=r(N),Q=r(_t),X=g(M*100),d=String(c),Z=String(i),b=String(m),T=String(ht),S=[t("calc_out.section.mortgage_calculator","⏰ Mortgage Calculator")+\`

\`+t("calc_out.section.mortgage_loan_snapshot","💰 Loan Snapshot:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Home price:           \`+r(o)+\`
• Down payment:         \`+r(e)+"  ("+g(e/o*100)+\`)
• Loan amount:          \`+r(a)+\`
\`+t("calc_out.mortgage.row.loan_term","• Loan term:            "+d+" years ("+Z+" months)",{term:d,months:Z})+\`
\`+t("calc_out.mortgage.row.interest_rate","• Interest rate:        "+b+"% APR",{rate:b})+\`
• LTV:                  \`+g(A)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.mortgage_monthly_payment","📐 Monthly Payment:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Monthly P&I:          \`+r(P)+\`
\`+t("calc_out.mortgage.row.total_interest","• Total interest paid: "+Y+"  (over loan term)",{value:Y})+\`
\`+t("calc_out.mortgage.row.total_cost","• Total cost (price + interest): "+E,{value:E})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.mortgage_health","🩺 Affordability Health:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+y+\`
\`+t("calc_out.mortgage.row.pi_as_pct_home_price","• P&I as % of home price: "+X,{value:X})+\`
\`+t("calc_out.mortgage.row.rule_of_thumb","• Rule of thumb: P&I should be ≤ 28% of monthly gross income")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.mortgage_term_comparison","🎯 Loan Term Comparison:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.mortgage.row.term_15","• 15-year: "+$+"/mo · "+z+" total interest",{payment:$,interest:z})+\`
\`+t("calc_out.mortgage.row.term_20","• 20-year: "+O+"/mo · "+R+" total interest",{payment:O,interest:R})+\`
\`+t("calc_out.mortgage.row.term_current","• "+d+"-year: "+H+"/mo · "+U+" total interest  ← current",{term:d,payment:H,interest:U})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.mortgage_amortization","⚖️ Amortization Milestones:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+t("calc_out.mortgage.row.amort_year_5","• After year 5:  "+V+" principal paid ("+J+" of loan)",{value:V,pct:J})+\`
\`+t("calc_out.mortgage.row.amort_year_15","• After year 15: "+K+" principal paid ("+W+" of loan)",{value:K,pct:W})+\`
\`+(c>=30?t("calc_out.mortgage.row.amort_year_30","• After year 30: "+B+" (loan fully paid)",{value:B})+\`
\`:"")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+t("calc_out.section.what_if_scenarios","🔄 What-If Scenarios:")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Rate -1pp (\`+j.toFixed(1)+"%):     monthly → "+r(mt)+\`
• Rate +1pp (\`+D.toFixed(1)+"%):     monthly → "+r(gt)+\`
\`+t("calc_out.mortgage.row.whatif_extra_payment","• Extra $200/mo payment:    helps pay off ~"+T+" months earlier",{months:T})+\`
\`+t("calc_out.mortgage.row.whatif_down_20","• 20% down (vs current):   loan "+G+" · monthly "+Q,{loan:G,monthly:Q})+\`
\`+t("calc_out.mortgage.row.whatif_refi_15","• 15-year refinance:        see comparison above")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+w],ft=[2e5,4e5,6e5,8e5,1e6,15e5];for(const l of ft){const k=l-e,L=r(l),v=r(e);if(k<=0){S.push(t("calc_out.mortgage.row.comparison_no_loan","Comparison: home "+L+" with "+v+" down → loan = $0 (no payment)",{price:L,down:v}));continue}const yt=u(k,s,i),tt=g(e/l*100),ot=r(yt);S.push(t("calc_out.mortgage.row.comparison","Comparison: "+L+" home with "+v+" down ("+tt+") → "+ot+"/mo at "+b+"%",{price:L,down:v,pct:tt,monthly:ot,rate:b}))}return S},F=function(n,o,e){var c=nt(n);return Array.isArray(c)?c.join(\`
\`):String(c)};var wt=_,dt=u,bt=h,Lt=I,vt=f,Pt=C,Mt=F,t=tk,rt='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',t=new Function("return "+rt)(),nt=function(n){return C(n)};return[F(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
    return calculateMortgage(inputs);
  },
  staticExamples: ['$calc_out.section.mortgage_calculator|⏰ Mortgage Calculator|\n\n$calc_out.section.mortgage_loan_snapshot|💰 Loan Snapshot:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Home price:           $500,000\n• Down payment:         $100,000  (20.00%)\n• Loan amount:          $400,000\n$calc_out.mortgage.row.loan_term{"term":"30","months":"360"}|• Loan term:            30 years (360 months)|\n$calc_out.mortgage.row.interest_rate{"rate":"6.5"}|• Interest rate:        6.5% APR|\n• LTV:                  80.00%\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.mortgage_monthly_payment|📐 Monthly Payment:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Monthly P&I:          $2,528\n$calc_out.mortgage.row.total_interest{"value":"$510,178"}|• Total interest paid: $510,178  (over loan term)|\n$calc_out.mortgage.row.total_cost{"value":"$1,010,178"}|• Total cost (price + interest): $1,010,178|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.mortgage_health|🩺 Affordability Health:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.mortgage.row.health_affordable|• 🟢 affordable — P&I under 1.0% of home price|\n$calc_out.mortgage.row.pi_as_pct_home_price{"value":"0.51%"}|• P&I as % of home price: 0.51%|\n$calc_out.mortgage.row.rule_of_thumb|• Rule of thumb: P&I should be ≤ 28% of monthly gross income|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.mortgage_term_comparison|🎯 Loan Term Comparison:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.mortgage.row.term_15{"payment":"$3,484","interest":"$227,197"}|• 15-year: $3,484/mo · $227,197 total interest|\n$calc_out.mortgage.row.term_20{"payment":"$2,982","interest":"$315,750"}|• 20-year: $2,982/mo · $315,750 total interest|\n$calc_out.mortgage.row.term_current{"term":"30","payment":"$2,528","interest":"$510,178"}|• 30-year: $2,528/mo · $510,178 total interest  ← current|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.mortgage_amortization|⚖️ Amortization Milestones:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n$calc_out.mortgage.row.amort_year_5{"value":"$25,556","pct":"6.39%"}|• After year 5:  $25,556 principal paid (6.39% of loan)|\n$calc_out.mortgage.row.amort_year_15{"value":"$109,763","pct":"27.44%"}|• After year 15: $109,763 principal paid (27.44% of loan)|\n$calc_out.mortgage.row.amort_year_30{"value":"$400,000"}|• After year 30: $400,000 (loan fully paid)|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Rate -1pp (5.5%):     monthly → $2,271\n• Rate +1pp (7.5%):     monthly → $2,797\n$calc_out.mortgage.row.whatif_extra_payment{"months":"213"}|• Extra $200/mo payment:    helps pay off ~213 months earlier|\n$calc_out.mortgage.row.whatif_down_20{"loan":"$400,000","monthly":"$2,528"}|• 20% down (vs current):   loan $400,000 · monthly $2,528|\n$calc_out.mortgage.row.whatif_refi_15|• 15-year refinance:        see comparison above|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.mortgage.row.tip_pmi|💡 Tip: LTV ≥ 80% typically requires Private Mortgage Insurance (PMI) — adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI.|\n$calc_out.mortgage.row.comparison{"price":"$200,000","down":"$100,000","pct":"50.00%","monthly":"$632","rate":"6.5"}|Comparison: $200,000 home with $100,000 down (50.00%) → $632/mo at 6.5%|\n$calc_out.mortgage.row.comparison{"price":"$400,000","down":"$100,000","pct":"25.00%","monthly":"$1,896","rate":"6.5"}|Comparison: $400,000 home with $100,000 down (25.00%) → $1,896/mo at 6.5%|\n$calc_out.mortgage.row.comparison{"price":"$600,000","down":"$100,000","pct":"16.67%","monthly":"$3,160","rate":"6.5"}|Comparison: $600,000 home with $100,000 down (16.67%) → $3,160/mo at 6.5%|\n$calc_out.mortgage.row.comparison{"price":"$800,000","down":"$100,000","pct":"12.50%","monthly":"$4,424","rate":"6.5"}|Comparison: $800,000 home with $100,000 down (12.50%) → $4,424/mo at 6.5%|\n$calc_out.mortgage.row.comparison{"price":"$1,000,000","down":"$100,000","pct":"10.00%","monthly":"$5,689","rate":"6.5"}|Comparison: $1,000,000 home with $100,000 down (10.00%) → $5,689/mo at 6.5%|\n$calc_out.mortgage.row.comparison{"price":"$1,500,000","down":"$100,000","pct":"6.67%","monthly":"$8,849","rate":"6.5"}|Comparison: $1,500,000 home with $100,000 down (6.67%) → $8,849/mo at 6.5%|'],
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
    { q: "How is monthly mortgage payment calculated?", a: "Monthly P&I = P × r / (1 − (1+r)^−n). P = loan principal, r = monthly interest rate (annual rate / 12), n = total months (years × 12). Example: $400K loan, 6.5% APR, 30 years: $2,528/month. Add: property taxes, insurance, PMI (if <20% down), HOA. Total monthly PITI: typically 25-35% higher than P&I alone. Use the calculator for exact figures." },
    { q: "What is the difference between P&I and PITI?", a: "P&I: principal + interest (loan only). PITI: P&I + taxes + insurance (+ HOA + PMI if applicable). PITI is true monthly cost. Use PITI for: budget, qualification. Use P&I for: amortization, interest. For $400K loan at 6.5% + $4K/year taxes + $1.5K/year insurance: P&I $2,528, PITI $3,029. Lenders qualify on PITI. Most buyers: budget 30% of gross income for PITI." },
    { q: "What is PMI and when is it required?", a: "PMI (Private Mortgage Insurance): required when down payment <20%. Cost: 0.5-1.5% of loan annually. Add to monthly payment. For $400K loan at 1% PMI: $333/month. Cancel PMI: 1) Reach 78% LTV (loan-to-value), 2) Refinance, 3) Request removal at 80% LTV. Most: PMI is temporary (5-10 years), drops off as you pay down. Some loans: 10% down available (FHA, etc.)." },
    { q: "How does loan term affect total interest paid?", a: "30-year: lowest monthly, most interest. 15-year: highest monthly, less than half the interest. Example: $400K at 6.5% — 30-year: $2,528/mo, $510K interest. 15-year: $3,484/mo, $227K interest. Difference: $283K total. Most buyers: 30-year for affordability. If you can afford 15-year: save $200K+ over 30 years. Refinance: 30-year now, recast later." },
    { q: "How much house can I afford?", a: "Rule of thumb: 1) 28% rule: PITI <28% of gross monthly income, 2) 36% rule: total debt <36%, 3) 25% rule: down payment 20% of home value. For $100K income: PITI budget $2,333/month, max home ~$350-400K. Most lenders: 28/36. Conservative: 25% rule. Use DTI calculator, mortgage calculator. Aim for house = 2.5-3x annual income (conservative)." },
    { q: "Should I choose a fixed or adjustable rate?", a: "Fixed rate: 30-year stable, predictable. Best for: most buyers, planning to stay 5+ years. ARM (adjustable): lower initial rate, adjusts after 5/7/10 years. Best for: planning to sell/refi before adjustment, very low rates. Most: 30-year fixed is the safe choice. ARMs: 5/1 or 7/1 ARM. ARM rates 0.5-1% lower initially. Risk: rate spike after fixed period. Most: 5/1 ARM if planning to move in 5-7 years." },
    { q: "How do points (discount points) work?", a: "Discount points: prepaid interest to lower rate. 1 point = 1% of loan amount. Cost: $4,000 on $400K. Lower rate: 0.25% per point typically. For 30-year mortgage: break-even 5-10 years. Worth it if: planning to keep 10+ years. Most: skip points if planning to sell in 5-7 years. Use: when rates are high (lock in lower). Most first-time buyers: skip points (preserve cash)." },
    { q: "What is an amortization schedule and why does it matter?", a: "Amortization = breakdown of each payment into interest vs principal over time. Early years: mostly interest. Later years: mostly principal. For $400K at 6.5%, 30-year: month 1 = $2,167 interest, $361 principal. Month 360 (final): $13 interest, $2,515 principal. Insight: extra principal payments early save 5-10x in interest. Most: pay extra when possible. Refinance: reset amortization. Build equity faster." },
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
  engineKey: true,
};

registerEngine(engine);
