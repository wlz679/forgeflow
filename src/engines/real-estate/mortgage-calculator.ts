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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let f=function(e){return Number.isNaN(e)?0:Math.max(0,e)},c=function(e,n,o){return o<=0?0:n===0?e/o:e*n/(1-Math.pow(1+n,-o))},h=function(e,n,o){return c(e,n,o)*o-e},v=function(e,n){return n<=0?0:e/n*100},y=function(e,n,o,a){const m=Math.min(e*12,a);if(a<=0)return 0;if(o===0)return n*(m/a);const r=n*(Math.pow(1+o,a)-Math.pow(1+o,m))/(Math.pow(1+o,a)-1);return n-r},I=function(e){const n=f(parseFloat(e.homePrice)||0),o=f(parseFloat(e.downPayment)||0),a=f(parseFloat(e.loanTermYears)||0),m=parseFloat(e.interestRate)||0;if(n===0)return[\`⏰ Mortgage Calculator

💰 Enter home price, down payment, loan term, and interest rate to see your monthly P&I, total interest, and amortization milestones.\`];if(o>=n)return[\`⏰ Mortgage Calculator

💰 Down payment (\`+n.toLocaleString("en-US")+") >= home price — no loan needed. Consider whether a smaller down payment would let you keep more cash liquid for other investments."];if(a<=0)return[\`⏰ Mortgage Calculator

💰 Loan term must be > 0 years. Typical mortgages are 15, 20, or 30 years.\`];const r=n-o,i=m/100/12,s=a*12,M=c(r,i,s),u=h(r,i,s),E=n+u,_=v(r,n),N=l=>l.toLocaleString("en-US",{maximumFractionDigits:0}),t=l=>"$"+N(l),p=l=>l.toFixed(2)+"%";let d,w;const P=n>0?M/n:0;P<.01?(d="🟢",w="affordable — P&I under 1.0% of home price"):P<.013?(d="🟡",w="moderate — P&I between 1.0-1.3% of home price"):(d="🟠",w="stretched — P&I over 1.3% of home price; verify 28% DTI rule");const k=c(r,i,180),R=h(r,i,180),Y=c(r,i,240),$=h(r,i,240),C=y(5,r,i,s),F=y(15,r,i,s),j=y(30,r,i,s),L=Math.max(0,m-1),A=m+1,q=c(r,L/100/12,s),z=c(r,A/100/12,s),H=n*.2,S=n-H,U=c(S,i,s),V=u>0?Math.ceil(u/200/12):0;let g;_>=80?g="💡 Tip: LTV ≥ 80% typically requires Private Mortgage Insurance (PMI) — adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI.":a>=30?g="💡 Tip: 30-year term gives lowest monthly payment but highest total interest. Compare with 15-year — higher payment but ~50% less total interest paid.":g="💡 Tip: Shortening your term from 30 to 15 years typically saves 50%+ on total interest. Run the comparison below to see the dollar difference for your loan.";const b=[\`⏰ Mortgage Calculator

💰 Loan Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Home price:           \`+t(n)+\`
• Down payment:         \`+t(o)+"  ("+p(o/n*100)+\`)
• Loan amount:          \`+t(r)+\`
• Loan term:            \`+a+" years ("+s+\` months)
• Interest rate:        \`+m+\`% APR
• LTV:                  \`+p(_)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 Monthly Payment:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Monthly P&I:          \`+t(M)+\`
• Total interest paid: \`+t(u)+\`  (over loan term)
• Total cost (price + interest): \`+t(E)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Affordability Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+d+" "+w+\`
• P&I as % of home price: \`+p(P*100)+\`
• Rule of thumb: P&I should be ≤ 28% of monthly gross income

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Loan Term Comparison:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 15-year: \`+t(k)+"/mo · "+t(R)+\` total interest
• 20-year: \`+t(Y)+"/mo · "+t($)+\` total interest
• \`+a+"-year: "+t(M)+"/mo · "+t(u)+\` total interest  ← current

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Amortization Milestones:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• After year 5:  \`+t(C)+" principal paid ("+p(C/r*100)+\` of loan)
• After year 15: \`+t(F)+" principal paid ("+p(F/r*100)+\` of loan)
\`+(a>=30?"• After year 30: "+t(j)+\` (loan fully paid)
\`:"")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Rate -1pp (\`+L.toFixed(1)+"%):     monthly → "+t(q)+\`
• Rate +1pp (\`+A.toFixed(1)+"%):     monthly → "+t(z)+\`
• Extra $200/mo payment:    helps pay off ~\`+V+\` months earlier
• 20% down (vs current):   loan \`+t(S)+" · monthly "+t(U)+\`
• 15-year refinance:        see comparison above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+g],K=[2e5,4e5,6e5,8e5,1e6,15e5];for(const l of K){const x=l-o;if(x<=0){b.push("Comparison: home "+t(l)+" with "+t(o)+" down → loan = $0 (no payment)");continue}const W=c(x,i,s);b.push("Comparison: "+t(l)+" home with "+t(o)+" down ("+p(o/l*100)+") → "+t(W)+"/mo at "+m+"%")}return b},T=function(e,n,o){var a=D(e);return Array.isArray(a)?a.join(\`
\`):String(a)};var B=f,G=c,J=h,O=v,Q=y,X=I,Z=T,D=function(e){return I(e)};return[T(inputs,pick,fill)]}finally{}
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
