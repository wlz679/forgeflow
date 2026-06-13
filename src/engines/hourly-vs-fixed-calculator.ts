import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculatePricingModel(inputs: Record<string, string>): string[] {
  const annualIncomeGoal = parseFloat(inputs.annualIncomeGoal) || 0;
  const billableHoursPerWeek = parseFloat(inputs.billableHoursPerWeek) || 0;
  const weeksOffPerYear = parseFloat(inputs.weeksOffPerYear) || 0;
  const results: string[] = [];

  const workingWeeks = 52 - weeksOffPerYear;
  const annualBillableHours = billableHoursPerWeek * workingWeeks;
  const requiredHourly = annualBillableHours > 0 ? annualIncomeGoal / annualBillableHours : 0;
  const monthlyRetainer = annualIncomeGoal / 12;
  const weeklyRate = requiredHourly * billableHoursPerWeek;
  const dailyRate = requiredHourly * 8;

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  let assessment: string;
  if (requiredHourly <= 50) {
    assessment = '✅ Affordable. At $' + fmt(requiredHourly) + '/hr, your target income is achievable with standard freelancing rates. Focus on building a consistent client pipeline.';
  } else if (requiredHourly <= 100) {
    assessment = '📈 Ambitious but realistic. $' + fmt(requiredHourly) + '/hr requires solid expertise and client trust. Specialize deeply to justify this rate.';
  } else if (requiredHourly <= 150) {
    assessment = '🔥 Premium positioning needed. At $' + fmt(requiredHourly) + '/hr, you must demonstrate clear ROI for clients. Case studies, social proof, and niche expertise are essential.';
  } else {
    assessment = '🏆 Elite tier. $' + fmt(requiredHourly) + '/hr puts you in the top 1% of freelancers. You need a strong personal brand, published authority, and enterprise-level clients.';
  }

  results.push(
    '💼 Pricing Model Calculator\n\n' +
    '' +
    '🎯 Your Income Target\n' +
    '\n' +
    '• Annual Income Goal:     $' + loc(annualIncomeGoal) + '\n' +
    '• Billable Hours/Week:     ' + billableHoursPerWeek + ' hrs\n' +
    '• Weeks Off Per Year:      ' + weeksOffPerYear + ' wks\n' +
    '• Working Weeks:              ' + workingWeeks + ' wks\n' +
    '• Annual Billable Hours:    ' + annualBillableHours + ' hrs\n\n' +
    '' +
    '💵 Required Pricing\n' +
    '\n' +
    '• Required Hourly Rate: $' + fmt(requiredHourly) + '/hr\n' +
    '• Daily Rate (8 hrs):        $' + loc(Math.round(dailyRate)) + '/day\n' +
    '• Weekly Rate:                 $' + loc(Math.round(weeklyRate)) + '/wk\n' +
    '• Monthly Retainer:        $' + loc(Math.round(monthlyRetainer)) + '/mo\n\n' +
    assessment + '\n\n' +
    '',
  );

  const goals = [30000, 50000, 75000, 100000, 150000, 200000, 250000, 350000, 500000];
  for (let i = 0; i < 9; i++) {
    const ahGoal = goals[i];
    const ah = annualBillableHours > 0 ? ahGoal / annualBillableHours : 0;
    const mr = ahGoal / 12;
    results.push(
      'Comparison: $' + loc(ahGoal) + '/yr goal → $' + fmt(ah) + '/hr | $' + loc(Math.round(mr)) + '/mo retainer | $' + loc(Math.round(ah * 8)) + '/day',
    );
  }

  return results;
}

const customFn =
  "var aig=parseFloat(inputs.annualIncomeGoal)||0;" +
  "var bhw=parseFloat(inputs.billableHoursPerWeek)||0;" +
  "var woy=parseFloat(inputs.weeksOffPerYear)||0;" +
  "var ww=52-woy;" +
  "var abh=bhw*ww;" +
  "var rh=abh>0?aig/abh:0;" +
  "var mr=aig/12;" +
  "var wr=rh*bhw;" +
  "var dr=rh*8;" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var assess;" +
  "if(rh<=50)assess='\\u2705 Affordable. At $'+fmt(rh)+'/hr, your target income is achievable with standard freelancing rates. Focus on building a consistent client pipeline.';" +
  "else if(rh<=100)assess='\\uD83D\\uDCC8 Ambitious but realistic. $'+fmt(rh)+'/hr requires solid expertise and client trust. Specialize deeply to justify this rate.';" +
  "else if(rh<=150)assess='\\uD83D\\uDD25 Premium positioning needed. At $'+fmt(rh)+'/hr, you must demonstrate clear ROI for clients. Case studies, social proof, and niche expertise are essential.';" +
  "else assess='\\uD83C\\uDFC6 Elite tier. $'+fmt(rh)+'/hr puts you in the top 1% of freelancers. You need a strong personal brand, published authority, and enterprise-level clients.';" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCBC Pricing Model Calculator\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83C\\uDFAF Your Income Target\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Annual Income Goal:     $'+loc(aig)+'\\n" +
  "\\u2022 Billable Hours/Week:     '+bhw+' hrs\\n" +
  "\\u2022 Weeks Off Per Year:      '+woy+' wks\\n" +
  "\\u2022 Working Weeks:              '+ww+' wks\\n" +
  "\\u2022 Annual Billable Hours:    '+abh+' hrs\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCB5 Required Pricing\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Required Hourly Rate: $'+fmt(rh)+'/hr\\n" +
  "\\u2022 Daily Rate (8 hrs):        $'+loc(Math.round(dr))+'/day\\n" +
  "\\u2022 Weekly Rate:                 $'+loc(Math.round(wr))+'/wk\\n" +
  "\\u2022 Monthly Retainer:        $'+loc(Math.round(mr))+'/mo\\n\\n" +
  "'+assess+'\\n\\n" +
  "\\uD83D\\uDCA1 Tip: Most freelancers bill only 60-70% of working hours. The rest goes to admin, marketing, and skill-building. For a safer estimate, multiply your required hourly rate by 1.4 to account for non-billable time.'" +
  ");" +
  "var goals=[30000,50000,75000,100000,150000,200000,250000,350000,500000];" +
  "for(var i=0;i<9;i++){" +
  "var g=goals[i];" +
  "var h=abh>0?g/abh:0;" +
  "var m=g/12;" +
  "results.push('Comparison: $'+loc(g)+'/yr goal \\u2192 $'+fmt(h)+'/hr | $'+loc(Math.round(m))+'/mo retainer | $'+loc(Math.round(h*8))+'/day');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-hourly-vs-fixed-calculator',
  title: 'Hourly vs Fixed Rate Calculator',
  description: 'Calculate the hourly rate, monthly retainer, and project equivalents needed to reach your annual income goal.',
  category: 'C',
  inputs: [
    { name: 'annualIncomeGoal', label: 'Annual Income Goal ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'billableHoursPerWeek', label: 'Billable Hours Per Week', placeholder: 'e.g. 30', type: 'number' },
    { name: 'weeksOffPerYear', label: 'Weeks Off Per Year', placeholder: 'e.g. 4', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculatePricingModel(inputs);
  },
  staticExamples: [
    '💼 Pricing Model Calculator\n\n🎯 Your Income Target\n\n• Annual Income Goal:     $100,000\n• Billable Hours/Week:     30 hrs\n• Weeks Off Per Year:      4 wks\n• Working Weeks:              48 wks\n• Annual Billable Hours:    1,440 hrs\n\n💵 Required Pricing\n\n• Required Hourly Rate: $69.44/hr\n• Daily Rate (8 hrs):        $556/day\n• Weekly Rate:                 $2,083/wk\n• Monthly Retainer:        $8,333/mo\n\n📈 Ambitious but realistic. $69.44/hr requires solid expertise and client trust. Specialize deeply to justify this rate.\n',
    'Comparison: $30,000/yr goal → $20.83/hr | $2,500/mo retainer | $167/day',
    'Comparison: $50,000/yr goal → $34.72/hr | $4,167/mo retainer | $278/day',
    'Comparison: $150,000/yr goal → $104.17/hr | $12,500/mo retainer | $833/day',
    'Comparison: $200,000/yr goal → $138.89/hr | $16,667/mo retainer | $1,111/day',
  ],
  faq: [
    { q: 'How many billable hours per week is realistic?', a: 'Most full-time freelancers bill 20-30 hours per week. The remaining time goes to admin, marketing, proposals, learning, and breaks. If you are billing 40 hours every week, you are likely burning out. Plan for 25 billable hours as a sustainable target.' },
    { q: 'Should I charge hourly or fixed-price?', a: 'Fixed-price is generally better for experienced freelancers. Clients prefer predictable costs, and you earn more when you work efficiently. Use hourly for unclear scopes or ongoing retainer work. Start with hourly, then transition to fixed as you learn to estimate accurately.' },
    { q: 'What if my target hourly rate is too high?', a: 'You have three levers: increase billable hours, lower your income goal, or specialize in a higher-paying niche. Working with US/EU clients while living in a lower-cost region is a proven strategy to make a high effective rate achievable.' },
    { q: 'Should I charge different rates to different clients?', a: 'Yes. Early clients might get a lower rate for testimonials. Enterprise clients should pay premium rates. Long-term retainer clients can receive a 10-20% discount. The key is to never disclose your rate variance — each client gets a custom quote based on project scope.' },
    { q: 'How do I factor in taxes and business expenses?', a: 'Multiply your desired take-home income by 1.3-1.5 to cover self-employment taxes (15.3% in the US), health insurance, software, hardware, and professional development. If you want $100K take-home, target $130K-$150K in gross revenue.' },
  ],
  howToUse: [
    'Enter your target annual income goal.',
    'Set your realistic billable hours per week (most freelancers bill 20-30).',
    'Enter how many weeks you plan to take off per year.',
    'Review your required hourly, daily, weekly, and monthly retainer rates.',
    'Check the assessment to see if your target rate is realistic for your market.',
    'Scroll down to compare what different income goals require from your pricing.',
  ],
};

registerEngine(engine);
