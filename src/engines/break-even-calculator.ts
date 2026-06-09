import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateBreakEven(inputs: Record<string, string>): string[] {
  const monthlyCosts = parseFloat(inputs.monthlyCosts) || 0;
  const monthlyRevenue = parseFloat(inputs.monthlyRevenue) || 0;
  const initialInvestment = parseFloat(inputs.initialInvestment) || 0;
  const results: string[] = [];

  const netMonthly = monthlyRevenue - monthlyCosts;
  const monthsToBE = netMonthly > 0 ? Math.ceil(initialInvestment / netMonthly) : Infinity;

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  let timing: string;
  if (!isFinite(monthsToBE)) {
    timing = '⚠️ Your monthly costs exceed revenue. You will never break even unless you increase revenue or cut costs.';
  } else if (monthsToBE <= 3) {
    timing = '🚀 Excellent! You will break even in just ' + monthsToBE + ' months. This is a very healthy business trajectory.';
  } else if (monthsToBE <= 6) {
    timing = '✅ Good. Breaking even in ' + monthsToBE + ' months is solid for most solopreneur ventures.';
  } else if (monthsToBE <= 12) {
    timing = '📈 Within reach. ' + monthsToBE + ' months to break even. Focus on boosting revenue to speed this up.';
  } else if (monthsToBE <= 24) {
    timing = '⏳ Patience needed. ' + monthsToBE + ' months (' + (monthsToBE / 12).toFixed(1) + ' years) to break even. Consider cutting costs or finding faster revenue streams.';
  } else {
    timing = '⚠️ Long road. ' + monthsToBE + ' months (' + (monthsToBE / 12).toFixed(1) + ' years) to break even. Re-evaluate your model.';
  }

  results.push(
    '📊 Break-Even Analysis\n\n' +
    '• Initial Investment: $' + loc(initialInvestment) + '\n' +
    '• Monthly Costs: $' + loc(monthlyCosts) + '/mo\n' +
    '• Monthly Revenue: $' + loc(monthlyRevenue) + '/mo\n' +
    '• Net Monthly Profit: $' + loc(netMonthly) + '/mo\n\n' +
    '⏱️ Months to Break Even: ' + (isFinite(monthsToBE) ? monthsToBE + ' months (' + (monthsToBE / 12).toFixed(1) + ' years)' : 'Never') + '\n\n' +
    timing + '\n\n' +
    '💡 Tip: To break even faster, either increase monthly revenue (raise prices, upsell, add revenue streams) or reduce monthly costs (automate, outsource cheaper, cut unnecessary tools).',
  );

  const combinations = [
    { cost: 50, rev: 100, inv: 500 },
    { cost: 100, rev: 250, inv: 1000 },
    { cost: 500, rev: 1000, inv: 5000 },
    { cost: 1000, rev: 2000, inv: 10000 },
    { cost: 2000, rev: 5000, inv: 15000 },
    { cost: 5000, rev: 8000, inv: 20000 },
    { cost: 3000, rev: 6000, inv: 30000 },
    { cost: 10000, rev: 15000, inv: 50000 },
    { cost: 20000, rev: 35000, inv: 100000 },
  ];

  for (let i = 0; i < combinations.length; i++) {
    const c = combinations[i];
    const net = c.rev - c.cost;
    const be = net > 0 ? Math.ceil(c.inv / net) : 'N/A';
    results.push(
      'Scenario ' + (i + 1) + ': $' + loc(c.cost) + '/mo costs + $' + loc(c.rev) + '/mo revenue + $' + loc(c.inv) + ' invested → ' +
      (typeof be === 'number' ? be + ' months to break even' : be),
    );
  }

  return results;
}

const customFn =
  "var mc=parseFloat(inputs.monthlyCosts)||0;" +
  "var mr=parseFloat(inputs.monthlyRevenue)||0;" +
  "var inv=parseFloat(inputs.initialInvestment)||0;" +
  "var net=mr-mc;" +
  "var be=net>0?Math.ceil(inv/net):Infinity;" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var timing;" +
  "if(!isFinite(be))timing='\\u26A0\\uFE0F Your monthly costs exceed revenue. You will never break even unless you increase revenue or cut costs.';" +
  "else if(be<=3)timing='\\uD83D\\uDE80 Excellent! You will break even in just '+be+' months. This is a very healthy business trajectory.';" +
  "else if(be<=6)timing='\\u2705 Good. Breaking even in '+be+' months is solid for most solopreneur ventures.';" +
  "else if(be<=12)timing='\\uD83D\\uDCC8 Within reach. '+be+' months to break even. Focus on boosting revenue to speed this up.';" +
  "else if(be<=24)timing='\\u23F3 Patience needed. '+be+' months ('+(be/12).toFixed(1)+' years) to break even. Consider cutting costs or finding faster revenue streams.';" +
  "else timing='\\u26A0\\uFE0F Long road. '+be+' months ('+(be/12).toFixed(1)+' years) to break even. Re-evaluate your model.';" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCCA Break-Even Analysis\\n\\n" +
  "\\u2022 Initial Investment: $'+loc(inv)+'\\n" +
  "\\u2022 Monthly Costs: $'+loc(mc)+'/mo\\n" +
  "\\u2022 Monthly Revenue: $'+loc(mr)+'/mo\\n" +
  "\\u2022 Net Monthly Profit: $'+loc(net)+'/mo\\n\\n" +
  "\\u23F1\\uFE0F Months to Break Even: '+(isFinite(be)?be+' months ('+(be/12).toFixed(1)+' years)':'Never')+'\\n\\n" +
  "'+timing+'\\n\\n" +
  "\\uD83D\\uDCA1 Tip: To break even faster, either increase monthly revenue (raise prices, upsell, add revenue streams) or reduce monthly costs (automate, outsource cheaper, cut unnecessary tools).'" +
  ");" +
  "var combos=[{c:50,r:100,i:500},{c:100,r:250,i:1000},{c:500,r:1000,i:5000},{c:1000,r:2000,i:10000},{c:2000,r:5000,i:15000},{c:5000,r:8000,i:20000},{c:3000,r:6000,i:30000},{c:10000,r:15000,i:50000},{c:20000,r:35000,i:100000}];" +
  "for(var i=0;i<combos.length;i++){var o=combos[i];var n=o.r-o.c;var b=n>0?Math.ceil(o.i/n):'N/A';results.push('Scenario '+(i+1)+': $'+loc(o.c)+'/mo costs + $'+loc(o.r)+'/mo revenue + $'+loc(o.i)+' invested \\u2192 '+(typeof b==='number'?b+' months to break even':b));}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-break-even-calculator',
  title: 'Break-Even Calculator',
  description: 'Calculate how many months until you break even on your initial investment. Model different cost and revenue scenarios.',
  category: 'C',
  inputs: [
    { name: 'monthlyCosts', label: 'Monthly Costs ($)', placeholder: 'e.g. 500', type: 'number' },
    { name: 'monthlyRevenue', label: 'Monthly Revenue ($)', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'initialInvestment', label: 'Initial Investment ($)', placeholder: 'e.g. 5000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateBreakEven(inputs);
  },
  staticExamples: [
    '📊 Break-Even Analysis\n\n• Initial Investment: $5,000\n• Monthly Costs: $500/mo\n• Monthly Revenue: $1,000/mo\n• Net Monthly Profit: $500/mo\n\n⏱️ Months to Break Even: 10 months (0.8 years)\n\n📈 Within reach. 10 months to break even. Focus on boosting revenue to speed this up.\n\n💡 Tip: To break even faster, either increase monthly revenue (raise prices, upsell, add revenue streams) or reduce monthly costs (automate, outsource cheaper, cut unnecessary tools).',
    'Scenario 1: $50/mo costs + $100/mo revenue + $500 invested → 10 months to break even',
    'Scenario 2: $100/mo costs + $250/mo revenue + $1,000 invested → 7 months to break even',
    'Scenario 3: $500/mo costs + $1,000/mo revenue + $5,000 invested → 10 months to break even',
    'Scenario 4: $1,000/mo costs + $2,000/mo revenue + $10,000 invested → 10 months to break even',
  ],
  faq: [
    { q: 'What counts as an initial investment?', a: 'Any upfront costs before you start earning: development costs, design, legal fees, initial marketing spend, equipment purchases, and money spent during the build phase.' },
    { q: 'What is a good break-even timeline for a solopreneur?', a: '3-12 months is typical for digital products and SaaS. If it takes more than 18 months, consider simplifying your MVP or finding earlier revenue sources.' },
    { q: 'Should I include my living expenses in monthly costs?', a: 'Yes, if this is your full-time venture. Include all personal expenses you need to cover. This gives you the real break-even point.' },
    { q: 'What if my monthly revenue fluctuates?', a: 'Use your average over the last 3 months. If you are pre-revenue, use conservative estimates — it is better to be pleasantly surprised than caught short.' },
    { q: 'How can I speed up my break-even?', a: 'Launch an MVP sooner, offer pre-sales, add a service layer (consulting), or reduce scope. Time to market is the biggest lever for solopreneurs.' },
  ],
  howToUse: [
    'Enter your total monthly costs (hosting, tools, freelancers, etc.).',
    'Enter your average monthly revenue.',
    'Enter your total initial investment before launch.',
    'Review how many months until you break even.',
    'Scroll down to see 9 comparison scenarios with different cost/revenue/investment combos.',
    'Use the scenarios to model what-if situations and set realistic targets.',
  ],
};

registerEngine(engine);
