import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateEmployeeCost(inputs: Record<string, string>): string[] {
  const annualSalary = parseFloat(inputs.annualSalary) || 0;
  const benefitsPct = parseFloat(inputs.benefitsPercentage) || 0;
  const location = inputs.location || 'us';
  const results: string[] = [];

  const employerTaxRates: Record<string, number> = {
    us: 0.0765,
    uk: 0.138,
    europe: 0.20,
    asia: 0.12,
    remote: 0.10,
  };

  const overheadRates: Record<string, number> = {
    us: 0.25,
    uk: 0.20,
    europe: 0.22,
    asia: 0.15,
    remote: 0.10,
  };

  const taxRate = employerTaxRates[location] || 0.0765;
  const overheadRate = overheadRates[location] || 0.25;

  const benefitsCost = annualSalary * (benefitsPct / 100);
  const employerTax = annualSalary * taxRate;
  const overhead = annualSalary * overheadRate;
  const totalAnnualCost = annualSalary + benefitsCost + employerTax + overhead;
  const monthlyCost = totalAnnualCost / 12;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const loc = (n: number) => n.toLocaleString();
  const pct = (v: number, t: number) => t > 0 ? ((v / t) * 100).toFixed(1) + '%' : '0%';

  const locLabel: Record<string, string> = {
    us: 'United States',
    uk: 'United Kingdom',
    europe: 'Europe (EU avg)',
    asia: 'Asia (regional avg)',
    remote: 'Global Remote',
  };

  results.push(
    '💼 Employee Cost Breakdown\n\n' +
    '📍 Location: ' + locLabel[location] + '\n' +
    '💰 Base Salary: $' + loc(annualSalary) + '/yr\n' +
    '🏥 Benefits (' + benefitsPct + '%): $' + loc(benefitsCost) + '/yr\n' +
    '🏛️ Employer Tax (' + (taxRate * 100).toFixed(1) + '%): $' + loc(employerTax) + '/yr\n' +
    '🏢 Overhead (' + (overheadRate * 100).toFixed(0) + '%): $' + loc(overhead) + '/yr\n\n' +
    '\n' +
    '💵 Total Annual Cost: $' + loc(totalAnnualCost) + '/yr\n' +
    '📅 Monthly Cost: $' + fmt(monthlyCost) + '/mo\n' +
    '📊 True Cost Multiplier: ' + (totalAnnualCost / annualSalary).toFixed(2) + 'x\n\n' +
    '\n' +
    '📌 Breakdown:\n' +
    '• Base salary is ' + pct(annualSalary, totalAnnualCost) + ' of total cost\n' +
    '• Benefits add ' + pct(benefitsCost, totalAnnualCost) + '\n' +
    '• Employer taxes add ' + pct(employerTax, totalAnnualCost) + '\n' +
    '• Overhead adds ' + pct(overhead, totalAnnualCost) + '\n\n' +
    '💡 Budget rule of thumb: total employee cost = base salary × ' + (totalAnnualCost / annualSalary).toFixed(1),
  );

  const salaries = [30000, 50000, 80000, 120000, 200000];
  const locations = ['us', 'uk', 'europe', 'asia', 'remote'];
  let count = 0;

  for (let i = 0; i < salaries.length && count < 5; i++) {
    const s = salaries[i];
    const bc = s * (benefitsPct / 100);
    const et = s * taxRate;
    const oh = s * overheadRate;
    const tac = s + bc + et + oh;
    results.push(
      'Comparison: $' + loc(s) + ' salary → Total $' + loc(tac) + '/yr ($' + fmt(tac / 12) + '/mo) | Multiplier ' + (tac / s).toFixed(2) + 'x',
    );
    count++;
  }

  return results;
}

const customFn =
  "var salary=parseFloat(inputs.annualSalary)||0;" +
  "var bp=parseFloat(inputs.benefitsPercentage)||0;" +
  "var loc=inputs.location||'us';" +
  "var tr={us:0.0765,uk:0.138,europe:0.20,asia:0.12,remote:0.10};" +
  "var or={us:0.25,uk:0.20,europe:0.22,asia:0.15,remote:0.10};" +
  "var taxRate=tr[loc]||0.0765;" +
  "var ohRate=or[loc]||0.25;" +
  "var bc=salary*(bp/100);" +
  "var et=salary*taxRate;" +
  "var oh=salary*ohRate;" +
  "var tac=salary+bc+et+oh;" +
  "var mc=tac/12;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2})}" +
  "function loc(n){return n.toLocaleString()}" +
  "function pct(v,t){return t>0?((v/t)*100).toFixed(1)+'%':'0%'}" +
  "var ll={us:'United States',uk:'United Kingdom',europe:'Europe (EU avg)',asia:'Asia (regional avg)',remote:'Global Remote'};" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCBC Employee Cost Breakdown\\n\\n" +
  "\\uD83D\\uDCCD Location: '+ll[loc]+'\\n" +
  "\\uD83D\\uDCB0 Base Salary: $'+loc(salary)+'/yr\\n" +
  "\\uD83C\\uDFE5 Benefits ('+bp+'%): $'+loc(bc)+'/yr\\n" +
  "\\uD83C\\uDFDB\\uFE0F Employer Tax ('+(taxRate*100).toFixed(1)+'%): $'+loc(et)+'/yr\\n" +
  "\\uD83C\\uDFE2 Overhead ('+(ohRate*100).toFixed(0)+'%): $'+loc(oh)+'/yr\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCB5 Total Annual Cost: $'+loc(tac)+'/yr\\n" +
  "\\uD83D\\uDCC5 Monthly Cost: $'+fmt(mc)+'/mo\\n" +
  "\\uD83D\\uDCCA True Cost Multiplier: '+(tac/salary).toFixed(2)+'x\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCCC Breakdown:\\n" +
  "\\u2022 Base salary is '+pct(salary,tac)+' of total cost\\n" +
  "\\u2022 Benefits add '+pct(bc,tac)+'\\n" +
  "\\u2022 Employer taxes add '+pct(et,tac)+'\\n" +
  "\\u2022 Overhead adds '+pct(oh,tac)+'\\n\\n" +
  "\\uD83D\\uDCA1 Budget rule of thumb: total employee cost = base salary \\u00d7 '+(tac/salary).toFixed(1)" +
  ");" +
  "var salaries=[30000,50000,80000,120000,200000];" +
  "var count=0;" +
  "for(var i=0;i<salaries.length&&count<5;i++){" +
  "var s=salaries[i];" +
  "var b=s*(bp/100);" +
  "var e=s*taxRate;" +
  "var o=s*ohRate;" +
  "var t=s+b+e+o;" +
  "results.push('Comparison: $'+loc(s)+' salary \\u2192 Total $'+loc(t)+'/yr ($'+fmt(t/12)+'/mo) | Multiplier '+(t/s).toFixed(2)+'x');" +
  "count++;" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-employee-cost-calculator',
  title: 'Employee Cost Calculator',
  description: 'Calculate the true cost of hiring an employee, including benefits, employer taxes, and overhead. Compare costs across salary levels and locations.',
  category: 'D',
  inputs: [
    { name: 'annualSalary', label: 'Annual Base Salary ($)', placeholder: 'e.g. 80000', type: 'number' },
    { name: 'benefitsPercentage', label: 'Benefits (% of salary)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'location', label: 'Hiring Location', placeholder: '', type: 'select', options: ['us', 'uk', 'europe', 'asia', 'remote'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateEmployeeCost(inputs);
  },
  staticExamples: [
    '💼 Employee Cost Breakdown\n\n📍 Location: United States\n💰 Base Salary: $80,000/yr\n🏥 Benefits (30%): $24,000/yr\n🏛️ Employer Tax (7.7%): $6,120/yr\n🏢 Overhead (25%): $20,000/yr\n\n💵 Total Annual Cost: $130,120/yr\n📅 Monthly Cost: $10,843.33/mo\n📊 True Cost Multiplier: 1.63x\n\n📌 Breakdown:\n• Base salary is 61.5% of total cost\n• Benefits add 18.4%\n• Employer taxes add 4.7%\n• Overhead adds 15.4%\n\n💡 Budget rule of thumb: total employee cost = base salary × 1.6',
    'Comparison: $30,000 salary → Total $49,803/yr ($4,150.25/mo) | Multiplier 1.66x',
    'Comparison: $50,000 salary → Total $81,725/yr ($6,810.42/mo) | Multiplier 1.63x',
    'Comparison: $120,000 salary → Total $194,520/yr ($16,210.00/mo) | Multiplier 1.62x',
    'Comparison: $200,000 salary → Total $323,300/yr ($26,941.67/mo) | Multiplier 1.62x',
  ],
  faq: [
    { q: 'What is included in employer taxes?', a: 'In the US, employer taxes include Social Security (6.2%), Medicare (1.45%), and federal/state unemployment insurance. Rates vary significantly by country. The UK adds National Insurance contributions at 13.8%. European countries often have higher social charges ranging from 20-35% of gross salary. Always consult a local accountant for precise calculations in your jurisdiction.' },
    { q: 'What counts as overhead for an employee?', a: 'Overhead includes office space/desk rent ($500-$2,000/mo), equipment (laptop, monitor, software licenses), HR and payroll administration, training and onboarding costs, manager time spent supervising, and general operational costs like internet, utilities, and insurance. A common rule of thumb is 20-30% of base salary for knowledge workers.' },
    { q: 'How do I calculate total employee cost quickly?', a: 'Use the multiplier method: base salary × (1 + benefits% + employer tax% + overhead%). For a US employee with 30% benefits, the multiplier is roughly 1.6-1.7x. So a $100K salary really costs $160K-$170K. For European employees, the multiplier is often 1.8-2.2x due to higher social charges and mandatory benefits.' },
    { q: 'Should I hire locally or remotely?', a: 'Remote hiring can reduce overhead by 10-15% (no office space, lower equipment costs) and may allow access to markets with lower employer tax rates. However, you may face compliance complexity, currency fluctuation risk, and communication challenges across time zones. The calculator helps you compare the financial side of this decision.' },
    { q: 'Does this include recruiting and onboarding costs?', a: 'The calculator provides recurring annual costs. Recruiting is typically a one-time expense of 20-30% of first-year salary (agency fees, job board postings, interview time). Onboarding and ramp-up productivity loss can add another 10-20% in the first 3-6 months. Budget separately for these upfront investments.' },
  ],
  howToUse: [
    'Enter the annual base salary you plan to offer.',
    'Set the benefits percentage (typical range: 20-40% of salary for health insurance, retirement, etc.).',
    'Select the hiring location to apply country-specific employer tax and overhead rates.',
    'Review the total annual cost breakdown showing salary, benefits, taxes, and overhead.',
    'Check the True Cost Multiplier to understand how much each dollar of salary really costs your business.',
    'Scroll down to compare costs at different salary levels to plan your hiring budget.',
  ],
};

registerEngine(engine);
