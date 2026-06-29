import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

function calculateFreelanceTax(inputs: Record<string, string>): string[] {
  const annualIncome = parseFloat(inputs.annualIncome) || 0;
  const businessExpenses = parseFloat(inputs.businessExpenses) || 0;
  const retirementContribution = parseFloat(inputs.retirementContribution) || 0;
  const filingStatus = inputs.filingStatus || 'single';
  const stateTaxRate = parseFloat(inputs.stateTaxRate) || 0;
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
    '🧾 Freelance Tax Calculator\n\n' +
    '🌍 Country: ' + taxInfo.label + '  |  Filing: ' + filingStatus.toUpperCase() + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Take-Home Breakdown:\n' +
    '• Gross Income:           ' + fmt(annualIncome) + '/yr\n' +
    '• Business Expenses:     -' + fmt(businessExpenses) + '\n' +
    '• Retirement Deduction:  -' + fmt(retirementDeduction) + '  (SEP-IRA / Solo 401k)\n' +
    '• Standard Deduction:     -' + taxInfo.currency + loc(stdDeduction) + '  (' + filingStatus + ')\n' +
    '• Taxable Income:          ' + fmt(taxableIncome) + '\n' +
    '• Total Tax Owed:         -' + fmt(totalTax) + '\n' +
    '• Net Take-Home:           ' + fmt(afterTaxIncome) + '/yr\n' +
    '• Monthly Take-Home:     ' + fmt2(monthlyTakeHome) + '/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    '• Effective Tax Rate:    ' + pct(effectiveTaxRate) + '%  (after all deductions)\n' +
    '• Marginal Tax Rate:    ' + pct(marginalRate) + '%  (rate on next dollar earned)\n' +
    '• Quarterly Payment:    ' + fmt2(quarterlyPayment) + '/quarter\n' +
    '• Monthly Tax Savings:  ' + fmt2(monthlyTaxSetAside) + '/mo  (set this aside!)\n' +
    (country === 'us'
      ? '• Self-Employment Tax:  ' + fmt(selfEmploymentTax) + '  (15.3% on 92.35% of net)\n'
      : '• Country tax burden:   ' + pct(taxInfo.rate * 100) + '% effective combined rate\n') +
    (stateTax > 0 ? '• State Tax (' + pct(stateTaxRate) + '%):           ' + fmt(stateTax) + '\n' : '') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Tax Efficiency:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (effectiveTaxRate < 20
      ? '• 🟢 Effective rate ' + pct(effectiveTaxRate) + '% is low. You are optimizing deductions well.\n'
      : effectiveTaxRate < 30
      ? '• 🟡 Effective rate ' + pct(effectiveTaxRate) + '% is moderate. Standard for self-employed.\n'
      : effectiveTaxRate < 40
      ? '• 🟠 Effective rate ' + pct(effectiveTaxRate) + '% is high. Look for more deductions.\n'
      : '• 🔴 Effective rate ' + pct(effectiveTaxRate) + '% is very high. Recheck filing status & deductions.\n') +
    (businessExpenses > annualIncome * 0.1
      ? '• 🟢 Business expenses are ' + pct((businessExpenses / annualIncome) * 100) + '% of income — solid deduction rate.\n'
      : '• 🟡 Business expenses are only ' + pct((businessExpenses / Math.max(annualIncome, 1)) * 100) + '% of income. Most freelancers deduct 10-20%.\n') +
    (retirementContribution > 0
      ? '• 🟢 Contributing ' + fmt(retirementContribution) + '/yr to retirement — reduces taxable income now.\n'
      : '• 🟡 No retirement contribution set. SEP-IRA allows up to 25% of net earnings (~$66K cap).\n') +
    '\n🎯 Quarterly Payment Plan:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Q1 (Apr 15):           ' + fmt2(quarterlyPayment) + '\n' +
    '• Q2 (Jun 15):           ' + fmt2(quarterlyPayment) + '\n' +
    '• Q3 (Sep 15):           ' + fmt2(quarterlyPayment) + '\n' +
    '• Q4 (Jan 15):           ' + fmt2(quarterlyPayment) + '\n' +
    '• Annual Total:           ' + fmt(totalTax) + '\n' +
    '• Set Aside Per Month:  ' + fmt2(monthlyTaxSetAside) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Self-Employed vs W-2 Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (seVsW2BreakEven
      ? '• 🟡 Above $80K/yr: SE tax + admin may make W-2 worthwhile. Compare job offers with full benefits.\n'
      : '• 🟢 Self-employment still beats W-2 at this income. Tax savings from deductions outweigh SE tax.\n') +
    '• SE Tax Burden:        ' + fmt(selfEmploymentTax) + '/yr  (only paid by self-employed)\n' +
    '• Equivalent W-2 Salary: ' + fmt(annualIncome * 0.78) + '  (typical 22% total W-2 tax + benefits)\n' +
    '• Net Tax Savings:       ' + fmt(annualIncome * 0.22 - totalTax) + '/yr  vs W-2 equivalent\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise retirement to max (25% of net):  Save ' + fmt(Math.min(annualIncome * 0.25, 66000) * taxInfo.rate) + '/yr in taxes\n' +
    '• Switch to ' + (filingStatus === 'single' ? 'married' : 'single') + ' filing:  Standard deduction doubles to ' + taxInfo.currency + loc(standardDeductions[filingStatus === 'single' ? 'married' : 'single']) + '\n' +
    '• Track $5K more in expenses:  Save ' + fmt(5000 * taxInfo.rate) + '/yr  (at ' + pct(taxInfo.rate * 100) + '% rate)\n' +
    '• Form S-Corp (US):  Save ~' + fmt(selfEmploymentTax * 0.5) + '/yr  once net income exceeds $60-80K\n' +
    '• Track mileage (~$0.67/mi):  Save $1-3K/yr for active freelancers\n\n' +
    '💡 Tip: Set aside ' + pct(marginalRate) + '% of every invoice the moment it lands. Treat tax savings like a non-negotiable expense. Quarterly deadlines are firm — missing them costs 3-5% in underpayment penalties on top of what you owe.\n\n' +
    '📌 Set This Aside Monthly: ' + fmt2(monthlyTaxSetAside) + '  (transfer on the 1st of each month to a separate account)',
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
      'Comparison: ' + taxInfo.currency + loc(inc) + '/yr → Tax: ' + taxInfo.currency + loc(tot) + ' | Effective rate: ' + pct(efr) + '% | Take-home: ' + fmt2(mth) + '/mo',
    );
  }

  return results;
}

const customFn =
  "var ai=parseFloat(inputs.annualIncome)||0;" +
  "var be=parseFloat(inputs.businessExpenses)||0;" +
  "var rc=parseFloat(inputs.retirementContribution)||0;" +
  "var fs=inputs.filingStatus||'single';" +
  "var st=parseFloat(inputs.stateTaxRate)||0;" +
  "var country=inputs.country||'us';" +
  "var tr={us:{rate:0.30,label:'US (Self-Employed, approx)',cur:'$'},uk:{rate:0.25,label:'UK (Sole Trader, approx)',cur:'\\u00A3'},canada:{rate:0.26,label:'Canada (Sole Proprietor, approx)',cur:'C$'},australia:{rate:0.275,label:'Australia (Sole Trader, approx)',cur:'A$'},germany:{rate:0.35,label:'Germany (Freiberufler, approx)',cur:'\\u20AC'}};" +
  "var ti=tr[country]||tr['us'];" +
  "var rd=Math.min(rc,ai*0.25);" +
  "var tx=Math.max(0,ai-be-rd);" +
  "var ft=tx*ti.rate;" +
  "var stx=country==='us'?tx*(st/100):0;" +
  "var se=country==='us'?tx*0.153*0.9235:0;" +
  "var tt=ft+stx+se;" +
  "var efr=ai>0?(tt/ai)*100:0;" +
  "var mr=country==='us'?ti.rate*100+st:ti.rate*100;" +
  "var qp=tt/4;" +
  "var mts=tt/12;" +
  "var ati=ai-tt;" +
  "var mth=ati/12;" +
  "var sd={single:14600,married:29200,hoh:21900};" +
  "var std=sd[fs]||14600;" +
  "var seb=ai>80000&&(se+tt*0.05)>ai*0.15;" +
  "function fmt(n){return ti.cur+Math.round(n).toLocaleString()}" +
  "function fmt2(n){return ti.cur+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function pct(n){return n.toFixed(1)}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\uD83E\\uDDFE Freelance Tax Calculator\\n\\n';" +
  "r+='\\uD83C\\uDF0D Country: '+ti.label+'  |  Filing: '+fs.toUpperCase()+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Take-Home Breakdown:\\n';" +
  "r+='\\u2022 Gross Income:           '+fmt(ai)+'/yr\\n';" +
  "r+='\\u2022 Business Expenses:     -'+fmt(be)+'\\n';" +
  "r+='\\u2022 Retirement Deduction:  -'+fmt(rd)+'  (SEP-IRA / Solo 401k)\\n';" +
  "r+='\\u2022 Standard Deduction:     -'+ti.cur+loc(std)+'  ('+fs+')\\n';" +
  "r+='\\u2022 Taxable Income:          '+fmt(tx)+'\\n';" +
  "r+='\\u2022 Total Tax Owed:         -'+fmt(tt)+'\\n';" +
  "r+='\\u2022 Net Take-Home:           '+fmt(ati)+'/yr\\n';" +
  "r+='\\u2022 Monthly Take-Home:     '+fmt2(mth)+'/mo\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Key Metrics:\\n';" +
  "r+='\\u2022 Effective Tax Rate:    '+pct(efr)+'%  (after all deductions)\\n';" +
  "r+='\\u2022 Marginal Tax Rate:    '+pct(mr)+'%  (rate on next dollar earned)\\n';" +
  "r+='\\u2022 Quarterly Payment:    '+fmt2(qp)+'/quarter\\n';" +
  "r+='\\u2022 Monthly Tax Savings:  '+fmt2(mts)+'/mo  (set this aside!)\\n';" +
  "if(country==='us'){r+='\\u2022 Self-Employment Tax:  '+fmt(se)+'  (15.3% on 92.35% of net)\\n';}else{r+='\\u2022 Country tax burden:   '+pct(ti.rate*100)+'% effective combined rate\\n';}" +
  "if(stx>0)r+='\\u2022 State Tax ('+pct(st)+'%):           '+fmt(stx)+'\\n';" +
  "r+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Tax Efficiency:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(efr<20)r+='\\u2022 \\uD83D\\uDFE2 Effective rate '+pct(efr)+'% is low. You are optimizing deductions well.\\n';" +
  "else if(efr<30)r+='\\u2022 \\uD83D\\uDFE1 Effective rate '+pct(efr)+'% is moderate. Standard for self-employed.\\n';" +
  "else if(efr<40)r+='\\u2022 \\uD83D\\uDFE0 Effective rate '+pct(efr)+'% is high. Look for more deductions.\\n';" +
  "else r+='\\u2022 \\uD83D\\uDD34 Effective rate '+pct(efr)+'% is very high. Recheck filing status & deductions.\\n';" +
  "if(be>ai*0.1){r+='\\u2022 \\uD83D\\uDFE2 Business expenses are '+pct((be/ai)*100)+'% of income \\u2014 solid deduction rate.\\n';}else{r+='\\u2022 \\uD83D\\uDFE1 Business expenses are only '+pct((be/Math.max(ai,1))*100)+'% of income. Most freelancers deduct 10-20%.\\n';}" +
  "if(rc>0){r+='\\u2022 \\uD83D\\uDFE2 Contributing '+fmt(rc)+'/yr to retirement \\u2014 reduces taxable income now.\\n';}else{r+='\\u2022 \\uD83D\\uDFE1 No retirement contribution set. SEP-IRA allows up to 25% of net earnings (~$66K cap).\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Quarterly Payment Plan:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Q1 (Apr 15):           '+fmt2(qp)+'\\n';" +
  "r+='\\u2022 Q2 (Jun 15):           '+fmt2(qp)+'\\n';" +
  "r+='\\u2022 Q3 (Sep 15):           '+fmt2(qp)+'\\n';" +
  "r+='\\u2022 Q4 (Jan 15):           '+fmt2(qp)+'\\n';" +
  "r+='\\u2022 Annual Total:           '+fmt(tt)+'\\n';" +
  "r+='\\u2022 Set Aside Per Month:  '+fmt2(mts)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Self-Employed vs W-2 Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(seb){r+='\\u2022 \\uD83D\\uDFE1 Above $80K/yr: SE tax + admin may make W-2 worthwhile. Compare job offers with full benefits.\\n';}else{r+='\\u2022 \\uD83D\\uDFE2 Self-employment still beats W-2 at this income. Tax savings from deductions outweigh SE tax.\\n';}" +
  "r+='\\u2022 SE Tax Burden:        '+fmt(se)+'/yr  (only paid by self-employed)\\n';" +
  "r+='\\u2022 Equivalent W-2 Salary: '+fmt(ai*0.78)+'  (typical 22% total W-2 tax + benefits)\\n';" +
  "r+='\\u2022 Net Tax Savings:       '+fmt(ai*0.22-tt)+'/yr  vs W-2 equivalent\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise retirement to max (25% of net):  Save '+fmt(Math.min(ai*0.25,66000)*ti.rate)+'/yr in taxes\\n';" +
  "r+='\\u2022 Switch to '+(fs==='single'?'married':'single')+' filing:  Standard deduction doubles to '+ti.cur+loc(sd[fs==='single'?'married':'single'])+'\\n';" +
  "r+='\\u2022 Track $5K more in expenses:  Save '+fmt(5000*ti.rate)+'/yr  (at '+pct(ti.rate*100)+'% rate)\\n';" +
  "r+='\\u2022 Form S-Corp (US):  Save ~'+fmt(se*0.5)+'/yr  once net income exceeds $60-80K\\n';" +
  "r+='\\u2022 Track mileage (~$0.67/mi):  Save $1-3K/yr for active freelancers\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Set aside '+pct(mr)+'% of every invoice the moment it lands. Treat tax savings like a non-negotiable expense. Quarterly deadlines are firm \\u2014 missing them costs 3-5% in underpayment penalties on top of what you owe.\\n\\n';" +
  "r+='\\uD83D\\uDCCC Set This Aside Monthly: '+fmt2(mts)+'  (transfer on the 1st of each month to a separate account)';" +
  "results.push(r);" +
  "var incomes=[30000,60000,100000,150000,250000];" +
  "for(var i=0;i<incomes.length;i++){" +
  "var inc=incomes[i];" +
  "var tx2=Math.max(0,inc-be-rd);" +
  "var ft2=tx2*ti.rate;" +
  "var stx2=country==='us'?tx2*(st/100):0;" +
  "var se2=country==='us'?tx2*0.153*0.9235:0;" +
  "var tot=ft2+stx2+se2;" +
  "var at=inc-tot;" +
  "var m=at/12;" +
  "var ef=inc>0?(tot/inc)*100:0;" +
  "results.push('Comparison: '+ti.cur+loc(inc)+'/yr \\u2192 Tax: '+ti.cur+loc(tot)+' | Effective rate: '+pct(ef)+'% | Take-home: '+fmt2(m)+'/mo');" +
  "}" +
  "return results;";

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
  generate(inputs: Record<string, string>): string[] {
    return calculateFreelanceTax(inputs);
  },
  staticExamples: [
    '🧾 Freelance Tax Calculator\n\n🌍 Country: US (Self-Employed, approx)  |  Filing: SINGLE\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Take-Home Breakdown:\n• Gross Income:           $100,000/yr\n• Business Expenses:     -$15,000\n• Retirement Deduction:  -$10,000  (SEP-IRA / Solo 401k)\n• Standard Deduction:     -$14,600  (single)\n• Taxable Income:          $75,000\n• Total Tax Owed:         -$36,847\n• Net Take-Home:           $63,153/yr\n• Monthly Take-Home:     $5,262.74/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n• Effective Tax Rate:    36.8%  (after all deductions)\n• Marginal Tax Rate:    35.0%  (rate on next dollar earned)\n• Quarterly Payment:    $9,211.79/quarter\n• Monthly Tax Savings:  $3,070.60/mo  (set this aside!)\n• Self-Employment Tax:  $10,597  (15.3% on 92.35% of net)\n• State Tax (5.0%):           $3,750\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Tax Efficiency:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟠 Effective rate 36.8% is high. Look for more deductions.\n• 🟢 Business expenses are 15.0% of income — solid deduction rate.\n• 🟢 Contributing $10,000/yr to retirement — reduces taxable income now.\n\n🎯 Quarterly Payment Plan:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Q1 (Apr 15):           $9,211.79\n• Q2 (Jun 15):           $9,211.79\n• Q3 (Sep 15):           $9,211.79\n• Q4 (Jan 15):           $9,211.79\n• Annual Total:           $36,847\n• Set Aside Per Month:  $3,070.60\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Self-Employed vs W-2 Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 Self-employment still beats W-2 at this income. Tax savings from deductions outweigh SE tax.\n• SE Tax Burden:        $10,597/yr  (only paid by self-employed)\n• Equivalent W-2 Salary: $78,000  (typical 22% total W-2 tax + benefits)\n• Net Tax Savings:       $-14,847/yr  vs W-2 equivalent\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise retirement to max (25% of net):  Save $7,500/yr in taxes\n• Switch to married filing:  Standard deduction doubles to $29,200\n• Track $5K more in expenses:  Save $1,500/yr  (at 30.0% rate)\n• Form S-Corp (US):  Save ~$5,299/yr  once net income exceeds $60-80K\n• Track mileage (~$0.67/mi):  Save $1-3K/yr for active freelancers\n\n💡 Tip: Set aside 35.0% of every invoice the moment it lands. Treat tax savings like a non-negotiable expense. Quarterly deadlines are firm — missing them costs 3-5% in underpayment penalties on top of what you owe.\n\n📌 Set This Aside Monthly: $3,070.60  (transfer on the 1st of each month to a separate account)\nComparison: $30,000/yr → Tax: $2,456 | Effective rate: 8.2% | Take-home: $2,295.29/mo\nComparison: $60,000/yr → Tax: $17,195 | Effective rate: 28.7% | Take-home: $3,567.05/mo\nComparison: $100,000/yr → Tax: $36,847 | Effective rate: 36.8% | Take-home: $5,262.74/mo\nComparison: $150,000/yr → Tax: $61,412 | Effective rate: 40.9% | Take-home: $7,382.34/mo\nComparison: $250,000/yr → Tax: $110,541 | Effective rate: 44.2% | Take-home: $11,621.54/mo',
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
};

registerEngine(engine);
