import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateFreelanceTax(inputs: Record<string, string>): string[] {
  const annualIncome = parseFloat(inputs.annualIncome) || 0;
  const businessExpenses = parseFloat(inputs.businessExpenses) || 0;
  const country = inputs.country || 'us';
  const results: string[] = [];

  const taxableIncome = Math.max(0, annualIncome - businessExpenses);

  const taxRates: Record<string, { rate: number; label: string; currency: string }> = {
    us: { rate: 0.30, label: 'US (Self-Employed, approx)', currency: '$' },
    uk: { rate: 0.25, label: 'UK (Sole Trader, approx)', currency: '£' },
    canada: { rate: 0.26, label: 'Canada (Sole Proprietor, approx)', currency: 'C$' },
    australia: { rate: 0.275, label: 'Australia (Sole Trader, approx)', currency: 'A$' },
    germany: { rate: 0.35, label: 'Germany (Freiberufler, approx)', currency: '€' },
  };

  const taxInfo = taxRates[country] || taxRates['us'];
  const estimatedTax = taxableIncome * taxInfo.rate;
  const effectiveTaxRate = annualIncome > 0 ? (estimatedTax / annualIncome) * 100 : 0;
  const quarterlyPayment = estimatedTax / 4;
  const afterTaxIncome = annualIncome - estimatedTax;
  const monthlyTakeHome = afterTaxIncome / 12;

  const loc = (n: number) => taxInfo.currency + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const pct = (n: number) => n.toFixed(1);

  results.push(
    '🏛️ Freelance Tax Estimate\n\n' +
    '🌍 Country: ' + taxInfo.label + '\n' +
    '💼 Annual Income: ' + loc(annualIncome) + '\n' +
    '🧾 Business Expenses: ' + loc(businessExpenses) + '\n' +
    '📊 Taxable Income: ' + loc(taxableIncome) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💸 Estimated Tax Owed: ' + loc(estimatedTax) + ' (' + pct(taxInfo.rate * 100) + '% rate)\n' +
    '📉 Effective Tax Rate: ' + pct(effectiveTaxRate) + '% (after expenses)\n' +
    '📆 Quarterly Payment: ' + loc(quarterlyPayment) + '/quarter\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 After-Tax Income: ' + loc(afterTaxIncome) + '/yr\n' +
    '🏠 Monthly Take-Home: ' + loc(monthlyTakeHome) + '/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💡 Set aside ' + pct(taxInfo.rate * 100) + '% of every invoice for taxes. ' +
    'Open a separate tax savings account and transfer quarterly payments automatically.\n\n' +
    '📌 Tax Savings Target (monthly): ' + loc(estimatedTax / 12),
  );

  const incomes = [20000, 40000, 75000, 120000, 250000];
  for (let i = 0; i < incomes.length; i++) {
    const inc = incomes[i];
    const ti = Math.max(0, inc - businessExpenses);
    const tax = ti * taxInfo.rate;
    const ati = inc - tax;
    const mth = ati / 12;
    const efr = inc > 0 ? (tax / inc) * 100 : 0;
    results.push(
      'Comparison: ' + loc(inc) + '/yr → Tax: ' + loc(tax) + ' | Effective rate: ' + pct(efr) + '% | Take-home: ' + loc(mth) + '/mo',
    );
  }

  return results;
}

const customFn =
  "var ai=parseFloat(inputs.annualIncome)||0;" +
  "var be=parseFloat(inputs.businessExpenses)||0;" +
  "var country=inputs.country||'us';" +
  "var ti=Math.max(0,ai-be);" +
  "var tr={us:{rate:0.30,label:'US (Self-Employed, approx)',cur:'$'},uk:{rate:0.25,label:'UK (Sole Trader, approx)',cur:'\\u00A3'},canada:{rate:0.26,label:'Canada (Sole Proprietor, approx)',cur:'C$'},australia:{rate:0.275,label:'Australia (Sole Trader, approx)',cur:'A$'},germany:{rate:0.35,label:'Germany (Freiberufler, approx)',cur:'\\u20AC'}};" +
  "var taxInfo=tr[country]||tr['us'];" +
  "var et=ti*taxInfo.rate;" +
  "var efr=ai>0?(et/ai)*100:0;" +
  "var qp=et/4;" +
  "var ati=ai-et;" +
  "var mth=ati/12;" +
  "function loc(n){return taxInfo.cur+n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function pct(n){return n.toFixed(1)}" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83C\\uDFDB\\uFE0F Freelance Tax Estimate\\n\\n" +
  "\\uD83C\\uDF0D Country: '+taxInfo.label+'\\n" +
  "\\uD83D\\uDCBC Annual Income: '+loc(ai)+'\\n" +
  "\\uD83E\\uDDFE Business Expenses: '+loc(be)+'\\n" +
  "\\uD83D\\uDCCA Taxable Income: '+loc(ti)+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCB8 Estimated Tax Owed: '+loc(et)+' ('+pct(taxInfo.rate*100)+'% rate)\\n" +
  "\\uD83D\\uDCC9 Effective Tax Rate: '+pct(efr)+'% (after expenses)\\n" +
  "\\uD83D\\uDCC6 Quarterly Payment: '+loc(qp)+'/quarter\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCB0 After-Tax Income: '+loc(ati)+'/yr\\n" +
  "\\uD83C\\uDFE0 Monthly Take-Home: '+loc(mth)+'/mo\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCA1 Set aside '+pct(taxInfo.rate*100)+'% of every invoice for taxes. Open a separate tax savings account and transfer quarterly payments automatically.\\n\\n" +
  "\\uD83D\\uDCCC Tax Savings Target (monthly): '+loc(et/12)" +
  ");" +
  "var incomes=[20000,40000,75000,120000,250000];" +
  "for(var i=0;i<incomes.length;i++){" +
  "var inc=incomes[i];" +
  "var tx=Math.max(0,inc-be);" +
  "var tax=tx*taxInfo.rate;" +
  "var at=inc-tax;" +
  "var m=at/12;" +
  "var ef=inc>0?(tax/inc)*100:0;" +
  "results.push('Comparison: '+loc(inc)+'/yr \\u2192 Tax: '+loc(tax)+' | Effective rate: '+pct(ef)+'% | Take-home: '+loc(m)+'/mo');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-freelance-tax-calculator',
  title: 'Freelance Tax Calculator',
  description: 'Estimate your freelance taxes across 5 countries. See your taxable income, quarterly payments, effective tax rate, and monthly take-home pay.',
  category: 'E',
  inputs: [
    { name: 'annualIncome', label: 'Annual Income ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'businessExpenses', label: 'Business Expenses ($)', placeholder: 'e.g. 15000', type: 'number' },
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
    '🏛️ Freelance Tax Estimate\n\n🌍 Country: US (Self-Employed, approx)\n💼 Annual Income: $100,000.00\n🧾 Business Expenses: $15,000.00\n📊 Taxable Income: $85,000.00\n\n━━━━━━━━━━━━━━━━━━━━\n\n💸 Estimated Tax Owed: $25,500.00 (30.0% rate)\n📉 Effective Tax Rate: 25.5% (after expenses)\n📆 Quarterly Payment: $6,375.00/quarter\n\n━━━━━━━━━━━━━━━━━━━━\n\n💰 After-Tax Income: $74,500.00/yr\n🏠 Monthly Take-Home: $6,208.33/mo\n\n━━━━━━━━━━━━━━━━━━━━\n\n💡 Set aside 30.0% of every invoice for taxes. Open a separate tax savings account and transfer quarterly payments automatically.\n\n📌 Tax Savings Target (monthly): $2,125.00',
    'Comparison: $20,000.00/yr → Tax: $1,500.00 | Effective rate: 7.5% | Take-home: $1,541.67/mo',
    'Comparison: $40,000.00/yr → Tax: $7,500.00 | Effective rate: 18.8% | Take-home: $2,708.33/mo',
    'Comparison: $75,000.00/yr → Tax: $18,000.00 | Effective rate: 24.0% | Take-home: $4,750.00/mo',
    'Comparison: $120,000.00/yr → Tax: $31,500.00 | Effective rate: 26.3% | Take-home: $7,375.00/mo',
    'Comparison: $250,000.00/yr → Tax: $70,500.00 | Effective rate: 28.2% | Take-home: $14,958.33/mo',
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
    'Enter your total deductible business expenses.',
    'Select your country of tax residence.',
    'Review your estimated tax owed, effective tax rate, and quarterly payment amount.',
    'See your after-tax annual income and monthly take-home pay.',
    'Scroll down to compare tax scenarios at different income levels.',
  ],
};

registerEngine(engine);
