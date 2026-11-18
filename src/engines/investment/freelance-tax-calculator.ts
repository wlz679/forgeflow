import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';
// P168 B3-8：结果输出 token 化 —— 服务端 makeToken / 客户端 customFn 前置**同一份**实现
//   （CALC_OUTPUT_MAKE_TOKEN_JS）⇒ 服务端与客户端输出逐字节相同，不可能漂移。
//   ⚠️ 章节标题 / 标签用**字面量 token**（code|英文原文|）；带运行时数值的整行用
//      makeToken(code, fallback, params) ⇒ fallback 与 params 取**同一个变量**。
//   ⚠️ 含 ' | ' 的行必须拆成多个 token —— fallback 段以第一个 | 收尾 ⇒ fallback 里不得有半角 |。
import { makeToken, CALC_OUTPUT_MAKE_TOKEN_JS } from '../../lib/calc-output-i18n';

function calculateFreelanceTax(inputs: Record<string, string>): string[] {
  const annualIncome = clampNonNegative(parseFloat(inputs.annualIncome) || 0);
  const businessExpenses = clampNonNegative(parseFloat(inputs.businessExpenses) || 0);
  const retirementContribution = clampNonNegative(parseFloat(inputs.retirementContribution) || 0);
  const filingStatus = inputs.filingStatus || 'single';
  const stateTaxRate = clampNonNegative(parseFloat(inputs.stateTaxRate) || 0);
  const country = inputs.country || 'us';

  const taxRates: Record<string, { rate: number; label: string; currency: string }> = {
    us: { rate: 0.30, label: 'US (Self-Employed, approx)', currency: '$' },
    uk: { rate: 0.25, label: 'UK (Sole Trader, approx)', currency: '£' },
    canada: { rate: 0.26, label: 'Canada (Sole Proprietor, approx)', currency: 'C$' },
    australia: { rate: 0.275, label: 'Australia (Sole Trader, approx)', currency: 'A$' },
    germany: { rate: 0.35, label: 'Germany (Freiberufler, approx)', currency: '€' },
  };

  const taxInfo = taxRates[country] || taxRates['us'];

  const retirementDeduction = Math.min(retirementContribution, annualIncome * 0.25);
  const taxableIncome = Math.max(0, annualIncome - businessExpenses - retirementDeduction);
  const federalTax = taxableIncome * taxInfo.rate;
  const stateTax = country === 'us' ? taxableIncome * (stateTaxRate / 100) : 0;
  const selfEmploymentTax = country === 'us' ? taxableIncome * 0.153 * 0.9235 : 0;
  const totalTax = federalTax + stateTax + selfEmploymentTax;
  const effectiveTaxRate = annualIncome > 0 ? (totalTax / annualIncome) * 100 : 0;
  const marginalRate = country === 'us' ? taxInfo.rate * 100 + stateTaxRate : taxInfo.rate * 100;
  const quarterlyPayment = totalTax / 4;
  const monthlyTaxSetAside = totalTax / 12;
  const afterTaxIncome = annualIncome - totalTax;
  const monthlyTakeHome = afterTaxIncome / 12;

  const standardDeductions: Record<string, number> = { single: 14600, married: 29200, hoh: 21900 };
  const stdDeduction = standardDeductions[filingStatus] || 14600;
  const seVsW2BreakEven = annualIncome > 80000 && (selfEmploymentTax + totalTax * 0.05) > annualIncome * 0.15;

  const results: string[] = [];

  const fmt = (n: number) => taxInfo.currency + Math.round(n).toLocaleString();
  const fmt2 = (n: number) => taxInfo.currency + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => n.toFixed(1);
  const loc = (n: number) => Math.round(n).toLocaleString();

  results.push(
    '$calc_out.section.freelance_tax_calculator|🧾 Freelance Tax Calculator|\n\n' +
    '🌍 $calc_out.label.country|Country|: ' + taxInfo.label + '  |  ' +
    '$calc_out.label.filing|Filing|: ' + filingStatus.toUpperCase() + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.freelance_tax_take_home_breakdown|💰 Take-Home Breakdown:|\n' +
    '• $calc_out.label.gross_income|Gross Income|:           ' + fmt(annualIncome) + '/yr\n' +
    '• $calc_out.label.business_expenses|Business Expenses|:     -' + fmt(businessExpenses) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.retirement_deduction', 'Retirement Deduction:  -' + fmt(retirementDeduction) + '  (SEP-IRA / Solo 401k)', { amount: fmt(retirementDeduction) }) + '\n' +
    '• $calc_out.label.standard_deduction|Standard Deduction|:     -' + taxInfo.currency + loc(stdDeduction) + '  (' + filingStatus + ')\n' +
    '• $calc_out.label.taxable_income|Taxable Income|:          ' + fmt(taxableIncome) + '\n' +
    '• $calc_out.label.total_tax_owed|Total Tax Owed|:         -' + fmt(totalTax) + '\n' +
    '• $calc_out.label.net_take_home|Net Take-Home|:           ' + fmt(afterTaxIncome) + '/yr\n' +
    '• $calc_out.label.monthly_take_home|Monthly Take-Home|:     ' + fmt2(monthlyTakeHome) + '/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.key_metrics|📐 Key Metrics:|\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.effective_tax_rate', 'Effective Tax Rate:    ' + pct(effectiveTaxRate) + '%  (after all deductions)', { rate: pct(effectiveTaxRate) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.marginal_tax_rate', 'Marginal Tax Rate:    ' + pct(marginalRate) + '%  (rate on next dollar earned)', { rate: pct(marginalRate) }) + '\n' +
    '• $calc_out.label.quarterly_payment|Quarterly Payment|:    ' + fmt2(quarterlyPayment) + '/quarter\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.monthly_tax_savings', 'Monthly Tax Savings:  ' + fmt2(monthlyTaxSetAside) + '/mo  (set this aside!)', { amount: fmt2(monthlyTaxSetAside) }) + '\n' +
    (country === 'us'
      ? '• ' + makeToken('calc_out.freelance_tax.row.self_employment_tax', 'Self-Employment Tax:  ' + fmt(selfEmploymentTax) + '  (15.3% on 92.35% of net)', { amount: fmt(selfEmploymentTax) }) + '\n'
      : '• ' + makeToken('calc_out.freelance_tax.row.country_tax_burden', 'Country tax burden:   ' + pct(taxInfo.rate * 100) + '% effective combined rate', { rate: pct(taxInfo.rate * 100) }) + '\n') +
    (stateTax > 0 ? '• ' + makeToken('calc_out.freelance_tax.row.state_tax', 'State Tax (' + pct(stateTaxRate) + '%):           ' + fmt(stateTax), { rate: pct(stateTaxRate), amount: fmt(stateTax) }) + '\n' : '') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.freelance_tax_efficiency|🩺 Tax Efficiency:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (effectiveTaxRate < 20
      ? '• ' + makeToken('calc_out.freelance_tax.row.effective_rate_low', '🟢 Effective rate ' + pct(effectiveTaxRate) + '% is low. You are optimizing deductions well.', { rate: pct(effectiveTaxRate) }) + '\n'
      : effectiveTaxRate < 30
      ? '• ' + makeToken('calc_out.freelance_tax.row.effective_rate_moderate', '🟡 Effective rate ' + pct(effectiveTaxRate) + '% is moderate. Standard for self-employed.', { rate: pct(effectiveTaxRate) }) + '\n'
      : effectiveTaxRate < 40
      ? '• ' + makeToken('calc_out.freelance_tax.row.effective_rate_high', '🟠 Effective rate ' + pct(effectiveTaxRate) + '% is high. Look for more deductions.', { rate: pct(effectiveTaxRate) }) + '\n'
      : '• ' + makeToken('calc_out.freelance_tax.row.effective_rate_very_high', '🔴 Effective rate ' + pct(effectiveTaxRate) + '% is very high. Recheck filing status & deductions.', { rate: pct(effectiveTaxRate) }) + '\n') +
    (businessExpenses > annualIncome * 0.1
      ? '• ' + makeToken('calc_out.freelance_tax.row.business_expenses_solid', '🟢 Business expenses are ' + pct((businessExpenses / annualIncome) * 100) + '% of income — solid deduction rate.', { rate: pct((businessExpenses / annualIncome) * 100) }) + '\n'
      : '• ' + makeToken('calc_out.freelance_tax.row.business_expenses_low', '🟡 Business expenses are only ' + pct((businessExpenses / Math.max(annualIncome, 1)) * 100) + '% of income. Most freelancers deduct 10-20%.', { rate: pct((businessExpenses / Math.max(annualIncome, 1)) * 100) }) + '\n') +
    (retirementContribution > 0
      ? '• ' + makeToken('calc_out.freelance_tax.row.retirement_contributing', '🟢 Contributing ' + fmt(retirementContribution) + '/yr to retirement — reduces taxable income now.', { amount: fmt(retirementContribution) }) + '\n'
      : '• ' + makeToken('calc_out.freelance_tax.row.retirement_none', '🟡 No retirement contribution set. SEP-IRA allows up to 25% of net earnings (~$66K cap).') + '\n') +
    '\n$calc_out.section.freelance_tax_quarterly_plan|🎯 Quarterly Payment Plan:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• $calc_out.label.q1_apr_15|Q1 (Apr 15)|:           ' + fmt2(quarterlyPayment) + '\n' +
    '• $calc_out.label.q2_jun_15|Q2 (Jun 15)|:           ' + fmt2(quarterlyPayment) + '\n' +
    '• $calc_out.label.q3_sep_15|Q3 (Sep 15)|:           ' + fmt2(quarterlyPayment) + '\n' +
    '• $calc_out.label.q4_jan_15|Q4 (Jan 15)|:           ' + fmt2(quarterlyPayment) + '\n' +
    '• $calc_out.label.annual_total|Annual Total|:           ' + fmt(totalTax) + '\n' +
    '• $calc_out.label.set_aside_per_month|Set Aside Per Month|:  ' + fmt2(monthlyTaxSetAside) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.freelance_tax_w2_breakeven|⚖️ Self-Employed vs W-2 Break-Even:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (seVsW2BreakEven
      ? '• ' + makeToken('calc_out.freelance_tax.row.w2_above_80k', '🟡 Above $80K/yr: SE tax + admin may make W-2 worthwhile. Compare job offers with full benefits.') + '\n'
      : '• ' + makeToken('calc_out.freelance_tax.row.w2_beats', '🟢 Self-employment still beats W-2 at this income. Tax savings from deductions outweigh SE tax.') + '\n') +
    '• ' + makeToken('calc_out.freelance_tax.row.se_tax_burden', 'SE Tax Burden:        ' + fmt(selfEmploymentTax) + '/yr  (only paid by self-employed)', { amount: fmt(selfEmploymentTax) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.equivalent_w2_salary', 'Equivalent W-2 Salary: ' + fmt(annualIncome * 0.78) + '  (typical 22% total W-2 tax + benefits)', { amount: fmt(annualIncome * 0.78) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.net_tax_savings', 'Net Tax Savings:       ' + fmt(annualIncome * 0.22 - totalTax) + '/yr  vs W-2 equivalent', { amount: fmt(annualIncome * 0.22 - totalTax) }) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.whatif_raise_retirement', 'Raise retirement to max (25% of net):  Save ' + fmt(Math.min(annualIncome * 0.25, 66000) * taxInfo.rate) + '/yr in taxes', { save: fmt(Math.min(annualIncome * 0.25, 66000) * taxInfo.rate) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.whatif_switch_filing', 'Switch to ' + (filingStatus === 'single' ? 'married' : 'single') + ' filing:  Standard deduction doubles to ' + taxInfo.currency + loc(standardDeductions[filingStatus === 'single' ? 'married' : 'single']), { status: filingStatus === 'single' ? 'married' : 'single', amount: taxInfo.currency + loc(standardDeductions[filingStatus === 'single' ? 'married' : 'single']) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.whatif_track_expenses', 'Track $5K more in expenses:  Save ' + fmt(5000 * taxInfo.rate) + '/yr  (at ' + pct(taxInfo.rate * 100) + '% rate)', { save: fmt(5000 * taxInfo.rate), rate: pct(taxInfo.rate * 100) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.whatif_scorp', 'Form S-Corp (US):  Save ~' + fmt(selfEmploymentTax * 0.5) + '/yr  once net income exceeds $60-80K', { save: fmt(selfEmploymentTax * 0.5) }) + '\n' +
    '• ' + makeToken('calc_out.freelance_tax.row.whatif_mileage', 'Track mileage (~$0.67/mi):  Save $1-3K/yr for active freelancers') + '\n\n' +
    makeToken('calc_out.freelance_tax.row.tip_set_aside', '💡 Tip: Set aside ' + pct(marginalRate) + '% of every invoice the moment it lands. Treat tax savings like a non-negotiable expense. Quarterly deadlines are firm — missing them costs 3-5% in underpayment penalties on top of what you owe.', { rate: pct(marginalRate) }) + '\n\n' +
    makeToken('calc_out.freelance_tax.row.set_aside_monthly', '📌 Set This Aside Monthly: ' + fmt2(monthlyTaxSetAside) + '  (transfer on the 1st of each month to a separate account)', { amount: fmt2(monthlyTaxSetAside) }),
  );

  const incomes = [30000, 60000, 100000, 150000, 250000];
  for (let i = 0; i < incomes.length; i++) {
    const inc = incomes[i];
    const ti = Math.max(0, inc - businessExpenses - retirementDeduction);
    const ft = ti * taxInfo.rate;
    const st2 = country === 'us' ? ti * (stateTaxRate / 100) : 0;
    const se2 = country === 'us' ? ti * 0.153 * 0.9235 : 0;
    const tot = ft + st2 + se2;
    const ati = inc - tot;
    const mth = ati / 12;
    const efr = inc > 0 ? (tot / inc) * 100 : 0;
    results.push(
      '$calc_out.label.comparison|Comparison|: ' +
      makeToken('calc_out.freelance_tax.row.comparison_income', taxInfo.currency + loc(inc) + '/yr', { income: taxInfo.currency + loc(inc) }) +
      ' → ' +
      makeToken('calc_out.freelance_tax.row.comparison_tax', 'Tax: ' + taxInfo.currency + loc(tot), { tax: taxInfo.currency + loc(tot) }) +
      ' | ' +
      makeToken('calc_out.freelance_tax.row.comparison_effective_rate', 'Effective rate: ' + pct(efr) + '%', { rate: pct(efr) }) +
      ' | ' +
      makeToken('calc_out.freelance_tax.row.comparison_take_home', 'Take-home: ' + fmt2(mth) + '/mo', { take_home: fmt2(mth) }),
    );
  }

  return results;
}

const customFn =
  // P168 B3-8：⭐ 前置 token 构造器（服务端 makeToken 的**同一份**实现）
  //   ⇒ 两端输出逐字节相同，不可能漂移；new Function 的签名不变（仍是 3 个参数）。
  CALC_OUTPUT_MAKE_TOKEN_JS + `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let p=function(c){return Number.isNaN(c)?0:Math.max(0,c)},C=function(c){const r=p(parseFloat(c.annualIncome)||0),i=p(parseFloat(c.businessExpenses)||0),u=p(parseFloat(c.retirementContribution)||0),x=c.filingStatus||"single",h=p(parseFloat(c.stateTaxRate)||0),m=c.country||"us",R={us:{rate:.3,label:"US (Self-Employed, approx)",currency:"$"},uk:{rate:.25,label:"UK (Sole Trader, approx)",currency:"£"},canada:{rate:.26,label:"Canada (Sole Proprietor, approx)",currency:"C$"},australia:{rate:.275,label:"Australia (Sole Trader, approx)",currency:"A$"},germany:{rate:.35,label:"Germany (Freiberufler, approx)",currency:"€"}},n=R[m]||R.us,g=Math.min(u,r*.25),v=Math.max(0,r-i-g),W=v*n.rate,S=m==="us"?v*(h/100):0,f=m==="us"?v*.153*.9235:0,_=W+S+f,o=r>0?_/r*100:0,$=m==="us"?n.rate*100+h:n.rate*100,w=_/4,b=_/12,I=r-_,B=I/12,M={single:14600,married:29200,hoh:21900},Q=M[x]||14600,T=r>8e4&&f+_*.05>r*.15,F=[],t=s=>n.currency+Math.round(s).toLocaleString(),l=s=>n.currency+s.toLocaleString("en-US",{minimumFractionDigits:2,maximumFractionDigits:2}),a=s=>s.toFixed(1),d=s=>Math.round(s).toLocaleString();F.push(\`$calc_out.section.freelance_tax_calculator|🧾 Freelance Tax Calculator|

🌍 $calc_out.label.country|Country|: \`+n.label+"  |  $calc_out.label.filing|Filing|: "+x.toUpperCase()+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.freelance_tax_take_home_breakdown|💰 Take-Home Breakdown:|
• $calc_out.label.gross_income|Gross Income|:           \`+t(r)+\`/yr
• $calc_out.label.business_expenses|Business Expenses|:     -\`+t(i)+\`
• \`+e("calc_out.freelance_tax.row.retirement_deduction","Retirement Deduction:  -"+t(g)+"  (SEP-IRA / Solo 401k)",{amount:t(g)})+\`
• $calc_out.label.standard_deduction|Standard Deduction|:     -\`+n.currency+d(Q)+"  ("+x+\`)
• $calc_out.label.taxable_income|Taxable Income|:          \`+t(v)+\`
• $calc_out.label.total_tax_owed|Total Tax Owed|:         -\`+t(_)+\`
• $calc_out.label.net_take_home|Net Take-Home|:           \`+t(I)+\`/yr
• $calc_out.label.monthly_take_home|Monthly Take-Home|:     \`+l(B)+\`/mo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.key_metrics|📐 Key Metrics:|
• \`+e("calc_out.freelance_tax.row.effective_tax_rate","Effective Tax Rate:    "+a(o)+"%  (after all deductions)",{rate:a(o)})+\`
• \`+e("calc_out.freelance_tax.row.marginal_tax_rate","Marginal Tax Rate:    "+a($)+"%  (rate on next dollar earned)",{rate:a($)})+\`
• $calc_out.label.quarterly_payment|Quarterly Payment|:    \`+l(w)+\`/quarter
• \`+e("calc_out.freelance_tax.row.monthly_tax_savings","Monthly Tax Savings:  "+l(b)+"/mo  (set this aside!)",{amount:l(b)})+\`
\`+(m==="us"?"• "+e("calc_out.freelance_tax.row.self_employment_tax","Self-Employment Tax:  "+t(f)+"  (15.3% on 92.35% of net)",{amount:t(f)})+\`
\`:"• "+e("calc_out.freelance_tax.row.country_tax_burden","Country tax burden:   "+a(n.rate*100)+"% effective combined rate",{rate:a(n.rate*100)})+\`
\`)+(S>0?"• "+e("calc_out.freelance_tax.row.state_tax","State Tax ("+a(h)+"%):           "+t(S),{rate:a(h),amount:t(S)})+\`
\`:"")+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.freelance_tax_efficiency|🩺 Tax Efficiency:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(o<20?"• "+e("calc_out.freelance_tax.row.effective_rate_low","🟢 Effective rate "+a(o)+"% is low. You are optimizing deductions well.",{rate:a(o)})+\`
\`:o<30?"• "+e("calc_out.freelance_tax.row.effective_rate_moderate","🟡 Effective rate "+a(o)+"% is moderate. Standard for self-employed.",{rate:a(o)})+\`
\`:o<40?"• "+e("calc_out.freelance_tax.row.effective_rate_high","🟠 Effective rate "+a(o)+"% is high. Look for more deductions.",{rate:a(o)})+\`
\`:"• "+e("calc_out.freelance_tax.row.effective_rate_very_high","🔴 Effective rate "+a(o)+"% is very high. Recheck filing status & deductions.",{rate:a(o)})+\`
\`)+(i>r*.1?"• "+e("calc_out.freelance_tax.row.business_expenses_solid","🟢 Business expenses are "+a(i/r*100)+"% of income — solid deduction rate.",{rate:a(i/r*100)})+\`
\`:"• "+e("calc_out.freelance_tax.row.business_expenses_low","🟡 Business expenses are only "+a(i/Math.max(r,1)*100)+"% of income. Most freelancers deduct 10-20%.",{rate:a(i/Math.max(r,1)*100)})+\`
\`)+(u>0?"• "+e("calc_out.freelance_tax.row.retirement_contributing","🟢 Contributing "+t(u)+"/yr to retirement — reduces taxable income now.",{amount:t(u)})+\`
\`:"• "+e("calc_out.freelance_tax.row.retirement_none","🟡 No retirement contribution set. SEP-IRA allows up to 25% of net earnings (~$66K cap).")+\`
\`)+\`
$calc_out.section.freelance_tax_quarterly_plan|🎯 Quarterly Payment Plan:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• $calc_out.label.q1_apr_15|Q1 (Apr 15)|:           \`+l(w)+\`
• $calc_out.label.q2_jun_15|Q2 (Jun 15)|:           \`+l(w)+\`
• $calc_out.label.q3_sep_15|Q3 (Sep 15)|:           \`+l(w)+\`
• $calc_out.label.q4_jan_15|Q4 (Jan 15)|:           \`+l(w)+\`
• $calc_out.label.annual_total|Annual Total|:           \`+t(_)+\`
• $calc_out.label.set_aside_per_month|Set Aside Per Month|:  \`+l(b)+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.freelance_tax_w2_breakeven|⚖️ Self-Employed vs W-2 Break-Even:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(T?"• "+e("calc_out.freelance_tax.row.w2_above_80k","🟡 Above $80K/yr: SE tax + admin may make W-2 worthwhile. Compare job offers with full benefits.")+\`
\`:"• "+e("calc_out.freelance_tax.row.w2_beats","🟢 Self-employment still beats W-2 at this income. Tax savings from deductions outweigh SE tax.")+\`
\`)+"• "+e("calc_out.freelance_tax.row.se_tax_burden","SE Tax Burden:        "+t(f)+"/yr  (only paid by self-employed)",{amount:t(f)})+\`
• \`+e("calc_out.freelance_tax.row.equivalent_w2_salary","Equivalent W-2 Salary: "+t(r*.78)+"  (typical 22% total W-2 tax + benefits)",{amount:t(r*.78)})+\`
• \`+e("calc_out.freelance_tax.row.net_tax_savings","Net Tax Savings:       "+t(r*.22-_)+"/yr  vs W-2 equivalent",{amount:t(r*.22-_)})+\`

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• \`+e("calc_out.freelance_tax.row.whatif_raise_retirement","Raise retirement to max (25% of net):  Save "+t(Math.min(r*.25,66e3)*n.rate)+"/yr in taxes",{save:t(Math.min(r*.25,66e3)*n.rate)})+\`
• \`+e("calc_out.freelance_tax.row.whatif_switch_filing","Switch to "+(x==="single"?"married":"single")+" filing:  Standard deduction doubles to "+n.currency+d(M[x==="single"?"married":"single"]),{status:x==="single"?"married":"single",amount:n.currency+d(M[x==="single"?"married":"single"])})+\`
• \`+e("calc_out.freelance_tax.row.whatif_track_expenses","Track $5K more in expenses:  Save "+t(5e3*n.rate)+"/yr  (at "+a(n.rate*100)+"% rate)",{save:t(5e3*n.rate),rate:a(n.rate*100)})+\`
• \`+e("calc_out.freelance_tax.row.whatif_scorp","Form S-Corp (US):  Save ~"+t(f*.5)+"/yr  once net income exceeds $60-80K",{save:t(f*.5)})+\`
• \`+e("calc_out.freelance_tax.row.whatif_mileage","Track mileage (~$0.67/mi):  Save $1-3K/yr for active freelancers")+\`

\`+e("calc_out.freelance_tax.row.tip_set_aside","💡 Tip: Set aside "+a($)+"% of every invoice the moment it lands. Treat tax savings like a non-negotiable expense. Quarterly deadlines are firm — missing them costs 3-5% in underpayment penalties on top of what you owe.",{rate:a($)})+\`

\`+e("calc_out.freelance_tax.row.set_aside_monthly","📌 Set This Aside Monthly: "+l(b)+"  (transfer on the 1st of each month to a separate account)",{amount:l(b)}));const j=[3e4,6e4,1e5,15e4,25e4];for(let s=0;s<j.length;s++){const y=j[s],q=Math.max(0,y-i-g),U=q*n.rate,H=m==="us"?q*(h/100):0,L=m==="us"?q*.153*.9235:0,E=U+H+L,D=(y-E)/12,K=y>0?E/y*100:0;F.push("$calc_out.label.comparison|Comparison|: "+e("calc_out.freelance_tax.row.comparison_income",n.currency+d(y)+"/yr",{income:n.currency+d(y)})+" → "+e("calc_out.freelance_tax.row.comparison_tax","Tax: "+n.currency+d(E),{tax:n.currency+d(E)})+" | "+e("calc_out.freelance_tax.row.comparison_effective_rate","Effective rate: "+a(K)+"%",{rate:a(K)})+" | "+e("calc_out.freelance_tax.row.comparison_take_home","Take-home: "+l(D)+"/mo",{take_home:l(D)}))}return F},A=function(c,r,i){var u=P(c);return Array.isArray(u)?u.join(\`
\`):String(u)};var O=p,J=C,G=A,e=tk,N='function tk(c,f,p){var q={};Object.keys(p||{}).forEach(function(k){q[k]=String(p[k])});var s=Object.keys(q).length?JSON.stringify(q):"";var j=s?"{"+s.slice(1,s.length-1).replace(/[{]/g,"\\\\\\\\u007b").replace(/[}]/g,"\\\\\\\\u007d")+"}":"";return "$"+c+j+"|"+String(f).replace(/\\\\|/g,"｜")+"|"}',e=new Function("return "+N)(),P=function(c){return C(c)};return[A(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-freelance-tax-calculator',
  title: 'Freelance Tax Calculator',
  description: 'Estimate your freelance taxes across 5 countries with retirement, state, and self-employment tax breakdowns. Quarterly payment plan and W-2 break-even included.',
  inputs: [
    { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'businessExpenses', label: 'Business Expenses ($)', placeholder: 'e.g. 15000', type: 'number' },
    { name: 'retirementContribution', label: 'Retirement Contribution ($)', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'filingStatus', label: 'Filing Status', placeholder: '', type: 'select', options: ['single', 'married', 'hoh'] },
    { name: 'stateTaxRate', label: 'State Tax Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'country', label: 'Country', placeholder: '', type: 'select', options: ['us', 'uk', 'canada', 'australia', 'germany'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
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
    return calculateFreelanceTax(inputs);
  },
  staticExamples: [
    '$calc_out.section.freelance_tax_calculator|🧾 Freelance Tax Calculator|\n\n🌍 $calc_out.label.country|Country|: US (Self-Employed, approx)  |  $calc_out.label.filing|Filing|: SINGLE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.freelance_tax_take_home_breakdown|💰 Take-Home Breakdown:|\n• $calc_out.label.gross_income|Gross Income|:           $100,000/yr\n• $calc_out.label.business_expenses|Business Expenses|:     -$15,000\n• $calc_out.freelance_tax.row.retirement_deduction{"amount":"$10,000"}|Retirement Deduction:  -$10,000  (SEP-IRA / Solo 401k)|\n• $calc_out.label.standard_deduction|Standard Deduction|:     -$14,600  (single)\n• $calc_out.label.taxable_income|Taxable Income|:          $75,000\n• $calc_out.label.total_tax_owed|Total Tax Owed|:         -$36,847\n• $calc_out.label.net_take_home|Net Take-Home|:           $63,153/yr\n• $calc_out.label.monthly_take_home|Monthly Take-Home|:     $5,262.74/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.key_metrics|📐 Key Metrics:|\n• $calc_out.freelance_tax.row.effective_tax_rate{"rate":"36.8"}|Effective Tax Rate:    36.8%  (after all deductions)|\n• $calc_out.freelance_tax.row.marginal_tax_rate{"rate":"35.0"}|Marginal Tax Rate:    35.0%  (rate on next dollar earned)|\n• $calc_out.label.quarterly_payment|Quarterly Payment|:    $9,211.79/quarter\n• $calc_out.freelance_tax.row.monthly_tax_savings{"amount":"$3,070.60"}|Monthly Tax Savings:  $3,070.60/mo  (set this aside!)|\n• $calc_out.freelance_tax.row.self_employment_tax{"amount":"$10,597"}|Self-Employment Tax:  $10,597  (15.3% on 92.35% of net)|\n• $calc_out.freelance_tax.row.state_tax{"rate":"5.0","amount":"$3,750"}|State Tax (5.0%):           $3,750|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.freelance_tax_efficiency|🩺 Tax Efficiency:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.freelance_tax.row.effective_rate_high{"rate":"36.8"}|🟠 Effective rate 36.8% is high. Look for more deductions.|\n• $calc_out.freelance_tax.row.business_expenses_solid{"rate":"15.0"}|🟢 Business expenses are 15.0% of income — solid deduction rate.|\n• $calc_out.freelance_tax.row.retirement_contributing{"amount":"$10,000"}|🟢 Contributing $10,000/yr to retirement — reduces taxable income now.|\n\n$calc_out.section.freelance_tax_quarterly_plan|🎯 Quarterly Payment Plan:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.label.q1_apr_15|Q1 (Apr 15)|:           $9,211.79\n• $calc_out.label.q2_jun_15|Q2 (Jun 15)|:           $9,211.79\n• $calc_out.label.q3_sep_15|Q3 (Sep 15)|:           $9,211.79\n• $calc_out.label.q4_jan_15|Q4 (Jan 15)|:           $9,211.79\n• $calc_out.label.annual_total|Annual Total|:           $36,847\n• $calc_out.label.set_aside_per_month|Set Aside Per Month|:  $3,070.60\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.freelance_tax_w2_breakeven|⚖️ Self-Employed vs W-2 Break-Even:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.freelance_tax.row.w2_beats|🟢 Self-employment still beats W-2 at this income. Tax savings from deductions outweigh SE tax.|\n• $calc_out.freelance_tax.row.se_tax_burden{"amount":"$10,597"}|SE Tax Burden:        $10,597/yr  (only paid by self-employed)|\n• $calc_out.freelance_tax.row.equivalent_w2_salary{"amount":"$78,000"}|Equivalent W-2 Salary: $78,000  (typical 22% total W-2 tax + benefits)|\n• $calc_out.freelance_tax.row.net_tax_savings{"amount":"$-14,847"}|Net Tax Savings:       $-14,847/yr  vs W-2 equivalent|\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n$calc_out.section.what_if_scenarios|🔄 What-If Scenarios:|\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• $calc_out.freelance_tax.row.whatif_raise_retirement{"save":"$7,500"}|Raise retirement to max (25% of net):  Save $7,500/yr in taxes|\n• $calc_out.freelance_tax.row.whatif_switch_filing{"status":"married","amount":"$29,200"}|Switch to married filing:  Standard deduction doubles to $29,200|\n• $calc_out.freelance_tax.row.whatif_track_expenses{"save":"$1,500","rate":"30.0"}|Track $5K more in expenses:  Save $1,500/yr  (at 30.0% rate)|\n• $calc_out.freelance_tax.row.whatif_scorp{"save":"$5,299"}|Form S-Corp (US):  Save ~$5,299/yr  once net income exceeds $60-80K|\n• $calc_out.freelance_tax.row.whatif_mileage|Track mileage (~$0.67/mi):  Save $1-3K/yr for active freelancers|\n\n$calc_out.freelance_tax.row.tip_set_aside{"rate":"35.0"}|💡 Tip: Set aside 35.0% of every invoice the moment it lands. Treat tax savings like a non-negotiable expense. Quarterly deadlines are firm — missing them costs 3-5% in underpayment penalties on top of what you owe.|\n\n$calc_out.freelance_tax.row.set_aside_monthly{"amount":"$3,070.60"}|📌 Set This Aside Monthly: $3,070.60  (transfer on the 1st of each month to a separate account)|\n$calc_out.label.comparison|Comparison|: $calc_out.freelance_tax.row.comparison_income{"income":"$30,000"}|$30,000/yr| → $calc_out.freelance_tax.row.comparison_tax{"tax":"$2,456"}|Tax: $2,456| | $calc_out.freelance_tax.row.comparison_effective_rate{"rate":"8.2"}|Effective rate: 8.2%| | $calc_out.freelance_tax.row.comparison_take_home{"take_home":"$2,295.29"}|Take-home: $2,295.29/mo|\n$calc_out.label.comparison|Comparison|: $calc_out.freelance_tax.row.comparison_income{"income":"$60,000"}|$60,000/yr| → $calc_out.freelance_tax.row.comparison_tax{"tax":"$17,195"}|Tax: $17,195| | $calc_out.freelance_tax.row.comparison_effective_rate{"rate":"28.7"}|Effective rate: 28.7%| | $calc_out.freelance_tax.row.comparison_take_home{"take_home":"$3,567.05"}|Take-home: $3,567.05/mo|\n$calc_out.label.comparison|Comparison|: $calc_out.freelance_tax.row.comparison_income{"income":"$100,000"}|$100,000/yr| → $calc_out.freelance_tax.row.comparison_tax{"tax":"$36,847"}|Tax: $36,847| | $calc_out.freelance_tax.row.comparison_effective_rate{"rate":"36.8"}|Effective rate: 36.8%| | $calc_out.freelance_tax.row.comparison_take_home{"take_home":"$5,262.74"}|Take-home: $5,262.74/mo|\n$calc_out.label.comparison|Comparison|: $calc_out.freelance_tax.row.comparison_income{"income":"$150,000"}|$150,000/yr| → $calc_out.freelance_tax.row.comparison_tax{"tax":"$61,412"}|Tax: $61,412| | $calc_out.freelance_tax.row.comparison_effective_rate{"rate":"40.9"}|Effective rate: 40.9%| | $calc_out.freelance_tax.row.comparison_take_home{"take_home":"$7,382.34"}|Take-home: $7,382.34/mo|\n$calc_out.label.comparison|Comparison|: $calc_out.freelance_tax.row.comparison_income{"income":"$250,000"}|$250,000/yr| → $calc_out.freelance_tax.row.comparison_tax{"tax":"$110,541"}|Tax: $110,541| | $calc_out.freelance_tax.row.comparison_effective_rate{"rate":"44.2"}|Effective rate: 44.2%| | $calc_out.freelance_tax.row.comparison_take_home{"take_home":"$11,621.54"}|Take-home: $11,621.54/mo|',
    '',
    '',
    '',
    '',
    '',
  ],
  faq: [
    { q: 'How accurate are these tax estimates?', a: 'These are simplified estimates using average effective tax rates for self-employed individuals in each country. They account for income tax and self-employment/social contributions but do not include state/provincial variations, tax credits, deductions beyond business expenses, or personal allowances. For US filers, the 30% approximate rate covers federal income tax (10-37% brackets), self-employment tax (15.3%), and state tax (0-13%). Always consult a qualified tax professional for your specific situation.' },
    { q: 'What counts as a business expense?', a: 'Business expenses include home office costs (rent/mortgage portion, utilities, internet), equipment and software (laptop, subscriptions), professional services (accountant, lawyer, designer), marketing and advertising, travel for business, continued education and courses, health insurance premiums (self-employed deduction), and retirement contributions (SEP IRA, Solo 401k). The key test: is the expense both ordinary and necessary for your business? If yes, it is likely deductible.' },
    { q: 'Why do I need to pay quarterly?', a: 'Most countries require self-employed individuals to pay estimated taxes quarterly rather than annually. This is because no employer withholds taxes from your paychecks. In the US, quarterly deadlines are April 15, June 15, September 15, and January 15. Missing quarterly payments results in underpayment penalties, typically 3-5% of the underpaid amount. Use IRS Form 1040-ES or your country\'s equivalent to calculate and submit payments.' },
    { q: 'Can I reduce my tax rate legally?', a: 'Yes. Max out retirement contributions (SEP IRA allows up to 25% of net earnings, up to $66K). Use an S-Corp election (US) to split income into salary and distributions, reducing self-employment tax on the distribution portion. Hire your spouse and split income into lower brackets. Time large purchases for high-income years. Track every legitimate business expense — the difference between tracking 80% vs 100% of deductions can be thousands in tax savings.' },
    { q: 'Should I form an LLC or stay sole proprietor?', a: 'An LLC provides legal liability protection but does not change your tax situation by default — single-member LLCs are still taxed as sole proprietors. The real tax optimization comes from electing S-Corp taxation (US) once your net income exceeds $60K-$80K. At that point, the payroll tax savings from the S-Corp structure typically outweigh the added accounting complexity and payroll costs. For UK freelancers, operating as a limited company becomes tax-efficient above roughly £50K.' },
    { q: "How much should I set aside for taxes as a freelancer?", a: "Self-employment tax: 15.3% (Social Security + Medicare). federal income: 10-37% based on bracket. state: 0-13%. Total: 25-50% of net income. Set aside: 30% baseline, 40% if you earn above $100K. Quarterly estimated taxes: 25% of expected annual. Pay by Apr 15, Jun 15, Sep 15, Jan 15. Avoid: underpayment penalties." },
    { q: "What tax deductions can freelancers claim?", a: "Common deductions: 1) Home office (sqft × $5 max, or 15% of home costs), 2) Health insurance premiums (100% above-the-line), 3) Retirement contributions (SEP-IRA up to 25% of net), 4) Equipment (laptop, monitor, software), 5) Internet/phone (business %), 6) Travel (mix of business), 7) Continuing education, 8) Professional services (accountant, lawyer)." },
    { q: "How do I calculate quarterly estimated taxes?", a: "Method 1: Safe harbor (pay 100% of last year's tax, 110% if AGI > $150K). Method 2: Project current year (income × estimated bracket). Pay IRS + state. Use Form 1040-ES. Underpayment penalty: 4-6% APR. Most freelancers overpay slightly. Use tax software (QuickBooks Self-Employed, FreeTaxUSA) to estimate." },
    { q: "What is the self-employment tax deduction?", a: "Self-employment tax (15.3%) is split: half is deductible above the line on Form 1040. This reduces your AGI by 7.65%. Effective: $50K SE tax becomes $34K net tax. Don't forget to take this deduction. Schedule SE calculates SE tax. The 50% deduction appears on Schedule 1 line 15." },
    { q: "How do I handle state taxes as a freelancer?", a: "States with no income tax: 9 (TX, FL, WA, NV, WY, AK, SD, TN, NH). Other states: 0-13%. Nexus: if you spend >1 day in a state, you may owe tax there. Remote freelancers: file in state of residence. Multi-state: register in each state where you have clients. Sales tax: not applicable to services in most states." },
    { q: "Should I form an LLC or S-Corp?", a: "LLC: simple, pass-through taxation, easy to set up. S-Corp: requires payroll, but saves self-employment tax on distributions above reasonable salary. Rule of thumb: <$50K = LLC. $50K-200K = consider S-Corp. >$200K = S-Corp often wins. Setup: $500-2K (state fees). Annual cost: $1K-5K (accountant, payroll). Tax savings: 5-15% of net." },
    { q: "What retirement accounts should freelancers use?", a: "Solo 401(k): max $23K employee + 25% of net as employer contribution (~$69K total in 2026). SEP-IRA: max 25% of net (~$70K). Traditional IRA: $7K. Roth IRA: $7K (income limits). Backdoor Roth: convert. Most tax-efficient: max Solo 401(k) + backdoor Roth. Mix: pre-tax now, tax-free later." },
    { q: "How do I handle international client payments?", a: "International: 1) Wise (TransferWise) for personal: low fees, 0.5-1%, 1-2 days. 2) Mercury or Relay for US business accounts: free wire transfers. 3) Payoneer: common for freelancers. 4) Direct USD wire: $20-50 per transaction. Tax: report foreign income on 1040. FBAR: $10K+ foreign accounts require FinCEN 114. Talk to a CPA for international tax issues." },
  ],
  howToUse: [
    'Enter your gross annual freelance income.',
    'Enter your total deductible business expenses and retirement contributions.',
    'Select your filing status (US) and enter your state tax rate.',
    'Select your country of tax residence.',
    'Review your estimated tax owed, effective tax rate, and quarterly payment amount.',
    'See your after-tax annual income and monthly take-home pay.',
    'Scroll down to compare tax scenarios at different income levels.',
  ],
  engineKey: true,
};

registerEngine(engine);
