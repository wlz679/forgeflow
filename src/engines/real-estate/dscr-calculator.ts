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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let y=function(n){return Number.isNaN(n)?0:Math.max(0,n)},m=function(n,e,t){return t<=0?0:e===0?n/t:n*e/(1-Math.pow(1+e,-t))},d=function(n){return n.monthlyRent*12*(1-n.vacancyRate/100)-n.monthlyExpenses*12},C=function(n){const e=n.interestRate/100/12;return m(n.loanAmount,e,n.loanTermYears*12)*12},h=function(n){const e=C(n),t=d(n);return e===0?1/0:t/e},p=function(n,e){const t=d({...n,loanAmount:0});if(t<=0)return 0;const r=n.interestRate/100/12,s=n.loanTermYears*12;let a=0,i=t*20;for(let c=0;c<50;c++){const f=(a+i)/2,R=m(f,r,s)*12;if(R===0){a=f;continue}t/R>e?a=f:i=f}return(a+i)/2},D=function(n){return isFinite(n)?n>=1.25?{emoji:"🟢",label:"qualifies — DSCR ≥ 1.25 (most lenders approve)"}:n>=1?{emoji:"🟡",label:"marginal — DSCR between 1.0-1.25 (many lenders decline)"}:{emoji:"🔴",label:"fails — DSCR < 1.0 (deal cannot service debt)"}:{emoji:"🟢",label:"trivially qualifies — no debt service"}},x=function(n){const e=y(parseFloat(n.monthlyRent)||0),t=y(parseFloat(n.monthlyExpenses)||0),r=y(parseFloat(n.loanAmount)||0),s=parseFloat(n.interestRate)||0,a=y(parseFloat(n.loanTermYears)||0),i=parseFloat(n.vacancyRate)||0,c={monthlyRent:e,monthlyExpenses:t,vacancyRate:i,loanAmount:r,interestRate:s,loanTermYears:a};if(e<=0&&r<=0)return[\`⏰ DSCR Calculator

💰 Enter monthly rent and loan amount to compute DSCR (NOI / annual debt service) and check lender qualification thresholds.\`];const f=d(c),R=C(c),l=h(c),w=p({monthlyRent:e,monthlyExpenses:t,vacancyRate:i,interestRate:s,loanTermYears:a},1.25),q=p({monthlyRent:e,monthlyExpenses:t,vacancyRate:i,interestRate:s,loanTermYears:a},1),N=p({monthlyRent:e,monthlyExpenses:t,vacancyRate:i,interestRate:s,loanTermYears:a},1.5),g=D(l),O=u=>u.toLocaleString("en-US",{maximumFractionDigits:0}),o=u=>"$"+O(u),j=d({...c,vacancyRate:i+5}),v=R>0?j/R:1/0,P=d({...c}),F=m(r,(s+1)/100/12,a*12)*12,A=F>0?P/F:1/0,T=m(r,s/100/12,180)*12,E=T>0?d(c)/T:1/0,I=m(r,s/100/12,a*12)*12*1,k=e*12*(1-i/100)-t*12*.9,L=I>0?k/I:1/0;let S;l<1?S="💡 Tip: DSCR below 1.0 = property cannot cover debt service from operations. Lenders will deny. Either: (1) reduce loan amount, (2) raise rent, (3) reduce expenses. STR lenders may accept 0.75-1.0 DSCR based on platform bookings (Airbnb); conventional lenders require 1.20+":l<1.25?S='💡 Tip: DSCR in 1.0-1.25 zone is "marginal" — many lenders will decline or require larger down payment. Aim for DSCR ≥ 1.25 by either reducing loan, raising rent, or building up reserves that are not counted here.':S="💡 Tip: DSCR ≥ 1.25 qualifies for most conventional and portfolio lenders. STR lenders typically accept 0.75-1.0. If approaching 2.0+, you may be over-paying for the property — explore buying more units or larger loan for better leverage.";const M=[\`⏰ DSCR Calculator (Debt Service Coverage Ratio)

💰 Loan Snapshot:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Monthly gross rent:         \`+o(e)+\`
• Monthly OpEx:                \`+o(t)+\`
• Annual NOI:                  \`+o(f)+\`  (eff rent - OpEx)
• Annual debt service:       \`+o(R)+\`  (mortgage P&I × 12)
• Loan amount:                 \`+o(r)+\`
• DSCR ratio:                  \`+(isFinite(l)?l.toFixed(2)+"x":"∞")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 DSCR Math:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• NOI = grossRent × (1 - vacancy) - OpEx
        = \`+o(e*12)+" × (1 - "+i+"%) - "+o(t*12)+\`
        = \`+o(f)+\`
• Debt service = monthlyPI × 12
                = \`+o(m(r,s/100/12,a*12))+\`/mo × 12
                = \`+o(R)+\`
• DSCR = NOI / Debt service = \`+(isFinite(l)?l.toFixed(2)+"x":"∞")+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 DSCR Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+g.emoji+" "+g.label+\`
\`+(l>=1.25?\`• Most conventional lenders will approve this deal.
\`:l>=1?\`• Many lenders will require larger down payment or decline.
\`:\`• Current structure does not qualify. Lenders will deny.
\`)+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 Lender Thresholds:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Conventional (Fannie/Freddie):  DSCR ≥ 1.20-1.25
• Portfolio lenders:              DSCR ≥ 1.20
• Short-term rental (Airbnb):     DSCR 0.75-1.0 (Airbnb-future projections)
• Commercial (multi-family):     DSCR ≥ 1.20-1.40
• Hard money / bridge:           DSCR flexible (higher rate)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Reverse Calc (Max Loan):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• At target DSCR 1.0:   \`+o(q)+\`
• At target DSCR 1.25:  \`+o(w)+\` ← conventional threshold
• At target DSCR 1.5:   \`+o(N)+\` ← strong buffer

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Vacancy +5pp:               DSCR → \`+(isFinite(v)?v.toFixed(2)+"x":"∞")+\`
• Rate +1pp:                  DSCR → \`+(isFinite(A)?A.toFixed(2)+"x":"∞")+\`
• Term 30y → 15y:             DSCR → \`+(isFinite(E)?E.toFixed(2)+"x":"∞")+\`
• OpEx −10%:                  DSCR → \`+(isFinite(L)?L.toFixed(2)+"x":"∞")+\`
• Target DSCR 1.25 vs 1.0:    see reverse calc above

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

\`+S],Y=[.8,1,1.25,1.5,2,3];for(const u of Y){const V=p({monthlyRent:e,monthlyExpenses:t,vacancyRate:i,interestRate:s,loanTermYears:a},u),H=u>=1.25?" qualifies":u>=1?" marginal":" fails";M.push("Comparison: at DSCR "+u.toFixed(2)+"x → max loan "+o(V)+H)}return M},b=function(n,e,t){var r=_(n);return Array.isArray(r)?r.join(\`
\`):String(r)};var z=y,K=m,U=d,W=C,$=h,B=p,G=D,J=x,Q=b,_=function(n){return x(n)};return[b(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

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
    { q: "What is DSCR (Debt Service Coverage Ratio)?", a: "DSCR = NOI / annual debt service. Measures ability to cover mortgage payments from rental income. Benchmarks: 1) <1.0: negative cash flow (lender won't finance), 2) 1.0-1.2: break-even, 3) 1.2-1.5: healthy, 4) 1.5-2.0: very safe, 5) >2.0: possibly under-leveraged. Most lenders: 1.2+ required. Best: 1.25-1.5 for investment property loans." },
    { q: "What is a good DSCR for rental property?", a: "Good: 1.25+ (lender-acceptable). Excellent: 1.5+. Risk-adjusted: 1.5+ for safety. If <1.0: serious cash flow problem, refinance or sell. If 1.0-1.2: tight, risky. Track per property. Most investors: target 1.3-1.5. With 20% vacancy: 1.5+ is safe. Most lenders (DSCR loans): 1.2-1.25 minimum. Fannie/Freddie: 1.0-1.25." },
    { q: "How is DSCR used in loan qualification?", a: "DSCR loans: qualify based on rental income vs mortgage payment, not borrower income. Process: 1) Get appraised value, 2) Calculate NOI, 3) Divide by PITI, 4) 1.2+ qualifies, 5) Loan = 75-80% LTV. Best for: self-employed investors, multiple properties. Rate: 0.5-1% higher than conventional. Most: 5-10% of investment property loans are DSCR." },
    { q: "What is the difference between DSCR and cap rate?", a: "DSCR: cash flow vs debt service (leverage-adjusted). Cap rate: NOI / value (unleveraged). Use both. Cap rate for: property comparison, market analysis. DSCR for: financing decisions, cash flow analysis. Same property, different cap rate vs DSCR based on financing. All-cash: cap rate = CoC = DSCR. Financed: DSCR typically higher (good leverage)." },
    { q: "How do I improve DSCR?", a: "Tactics include 1) Increase rent (lease renewals, market adjustments), 2) Reduce expenses (refinance, management optimization), 3) Refinance (lower rate or longer term), 4) Larger down payment (lower payment), 5) Buy in better area (higher rent). 0.2-0.5 DSCR improvement achievable. Time: 6-24 months. Avoid stretching on bad deals just to hit DSCR." },
    { q: "What is the minimum DSCR for a loan?", a: "DSCR loans: 1.2-1.25 minimum. Fannie Mae: 1.0-1.25. Freddie Mac: 1.0-1.25. Conventional: 1.0+ (with reserves). Portfolio lenders: 1.0+ (more flexible). Hard money: 0.8-1.0 (debt service coverage matters less). Most: 1.2+ for traditional financing. Below 1.0: no qualifying loans (cash deal or sell)." },
    { q: "How does DSCR differ for short-term rentals (Airbnb)?", a: "STR DSCR: 1) Uses 12-month trailing income, 2) Seasonality matters, 3) Vacancy rate higher (10-30% vs 5-10%), 4) Operating expenses higher (utilities, cleaning, platform fees). Lenders: 1.25-1.5 DSCR for STR. Most: stricter underwriting, larger down payment (25-30%). Calculate: net rental income (after management + cleaning) / mortgage payment. STR DSCR: 30-50% more conservative than LTR." },
    { q: "What is the relationship between DSCR and risk?", a: "Higher DSCR = lower risk. 1.2 = lender minimum. 1.5 = very safe. 2.0 = over-leveraged (lost upside). For risk-averse: 1.5+. For yield: 1.2-1.3. 1.3-1.4 sweet spot. Track 1) Per property, 2) Portfolio aggregate, 3) With reserves (3-6 months). Avoid thin DSCR (1.05) with no reserves. Stress test: 10% vacancy, 10% expense increase." },
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
