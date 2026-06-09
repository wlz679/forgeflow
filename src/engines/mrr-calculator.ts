import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateMRR(inputs: Record<string, string>): string[] {
  const subs = parseInt(inputs.subscriberCount) || 0;
  const price = parseFloat(inputs.monthlyPrice) || 0;
  const discountMap: Record<string, number> = { '0%': 0, '10%': 0.1, '20%': 0.2, '30%': 0.3 };
  const discount = discountMap[inputs.annualDiscount] || 0;
  const mrr = subs * price;
  const arr = mrr * 12;
  const annualDiscounted = arr * (1 - discount);
  const results: string[] = [];

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  results.push(
    '📊 MRR Calculation\n\n' +
    '• Subscribers: ' + loc(subs) + '\n' +
    '• Monthly Price: $' + fmt(price) + '\n' +
    '• MRR (Monthly Recurring Revenue): $' + fmt(mrr) + '\n' +
    '• ARR (Annual Recurring Revenue, no discount): $' + fmt(arr) + '\n' +
    (discount > 0
      ? '• ARR (with ' + (discount * 100).toFixed(0) + '% annual discount): $' + fmt(annualDiscounted) + '\n' +
        '• Revenue lost to discount: $' + fmt(arr - annualDiscounted) + '\n\n'
      : '\n') +
    '💡 ' + (discount > 0
      ? 'Annual billing locks in revenue and can reduce churn by 20-40%. The discount is worth it.'
      : 'Consider offering a 10-30% annual discount. It improves cash flow and reduces involuntary churn.'),
  );

  const prices = [5, 10, 15, 25, 50, 75, 100, 200, 500];
  const subLevels = [10, 50, 100, 500, 1000, 5000, 10000, 50000, 100000];
  for (let i = 0; i < 9; i++) {
    const cmpMrr = subLevels[i] * prices[i];
    results.push(
      'Scenario ' + (i + 1) + ': ' + loc(subLevels[i]) + ' subs × $' + prices[i] +
      ' = $' + loc(cmpMrr) + '/mo | $' + loc(cmpMrr * 12) + '/yr',
    );
  }

  return results;
}

const customFn =
  "var subs=parseInt(inputs.subscriberCount)||0;" +
  "var price=parseFloat(inputs.monthlyPrice)||0;" +
  "var dm={'0%':0,'10%':0.1,'20%':0.2,'30%':0.3};" +
  "var discount=dm[inputs.annualDiscount]||0;" +
  "var mrr=subs*price;var arr=mrr*12;var ad=arr*(1-discount);" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var results=[];" +
  "results.push('\\uD83D\\uDCCA MRR Calculation\\n\\n" +
  "\\u2022 Subscribers: '+loc(subs)+'\\n" +
  "\\u2022 Monthly Price: $'+fmt(price)+'\\n" +
  "\\u2022 MRR (Monthly Recurring Revenue): $'+fmt(mrr)+'\\n" +
  "\\u2022 ARR (Annual Recurring Revenue, no discount): $'+fmt(arr)+'\\n" +
  "+(discount>0?'\\u2022 ARR (with '+(discount*100).toFixed(0)+'% annual discount): $'+fmt(ad)+'\\n'+'\\u2022 Revenue lost to discount: $'+fmt(arr-ad)+'\\n\\n':'\\n')+" +
  "'\\uD83D\\uDCA1 '+(discount>0?'Annual billing locks in revenue and can reduce churn by 20-40%. The discount is worth it.':'Consider offering a 10-30% annual discount. It improves cash flow and reduces involuntary churn.')" +
  ");" +
  "var prices=[5,10,15,25,50,75,100,200,500];" +
  "var subsL=[10,50,100,500,1000,5000,10000,50000,100000];" +
  "for(var i=0;i<9;i++){var cm=subsL[i]*prices[i];results.push('Scenario '+(i+1)+': '+loc(subsL[i])+' subs \\u00d7 $'+prices[i]+' = $'+loc(cm)+'/mo | $'+loc(cm*12)+'/yr');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-mrr-calculator',
  title: 'MRR Calculator',
  description: 'Calculate your Monthly Recurring Revenue from subscriber count and pricing. See how different subscriber levels and prices scale.',
  category: 'C',
  inputs: [
    { name: 'subscriberCount', label: 'Number of Subscribers', placeholder: 'e.g. 500', type: 'number' },
    { name: 'monthlyPrice', label: 'Monthly Price ($)', placeholder: 'e.g. 29', type: 'number' },
    { name: 'annualDiscount', label: 'Annual Plan Discount', placeholder: '', type: 'select', options: ['0%', '10%', '20%', '30%'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateMRR(inputs);
  },
  staticExamples: [
    '📊 MRR Calculation\n\n• Subscribers: 500\n• Monthly Price: $29.00\n• MRR (Monthly Recurring Revenue): $14,500.00\n• ARR (Annual Recurring Revenue, no discount): $174,000.00\n• ARR (with 20% annual discount): $139,200.00\n• Revenue lost to discount: $34,800.00\n\n💡 Annual billing locks in revenue and can reduce churn by 20-40%. The discount is worth it.',
    'Scenario 1: 10 subs × $5 = $50/mo | $600/yr',
    'Scenario 2: 50 subs × $10 = $500/mo | $6,000/yr',
    'Scenario 3: 100 subs × $15 = $1,500/mo | $18,000/yr',
    'Scenario 4: 500 subs × $25 = $12,500/mo | $150,000/yr',
  ],
  faq: [
    { q: 'What is MRR?', a: 'Monthly Recurring Revenue — the predictable revenue you earn every month from subscriptions. It is the most important metric for SaaS and subscription businesses.' },
    { q: 'What is a good MRR for a solopreneur?', a: '$5K-$10K MRR is typical for a comfortable solopreneur lifestyle business. $20K+ puts you in the top tier of indie hackers.' },
    { q: 'Should I offer an annual plan?', a: 'Yes. Annual plans reduce churn, improve cash flow, and give you upfront capital to reinvest. A 10-30% discount is standard.' },
    { q: 'How does churn affect MRR?', a: 'If you lose 5% of subscribers monthly, your annual churn is ~46%. Reducing churn has a bigger impact than increasing new signups.' },
    { q: 'Can I use this for non-SaaS businesses?', a: 'Yes. Any business with recurring revenue — memberships, newsletters, coaching retainers — can use MRR as a metric.' },
  ],
  howToUse: [
    'Enter your current subscriber count.',
    'Enter your monthly price per subscriber.',
    'Select your annual discount (if you offer one).',
    'Review the MRR and ARR calculations.',
    'Scroll to see 9 comparison scenarios with different subscriber counts and price points.',
    'Use the scenarios to model growth targets and pricing experiments.',
  ],
};

registerEngine(engine);
