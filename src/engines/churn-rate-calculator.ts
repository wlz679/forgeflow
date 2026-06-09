import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateChurn(inputs: Record<string, string>): string[] {
  const customersStart = parseInt(inputs.customersStart) || 0;
  const customersLost = parseInt(inputs.customersLost) || 0;
  const newCustomers = parseInt(inputs.newCustomers) || 0;
  const avgRevenue = parseFloat(inputs.avgRevenuePerCustomer) || 0;
  const results: string[] = [];

  const monthlyChurnRate = customersStart > 0 ? customersLost / customersStart : 0;
  const annualChurnRate = 1 - Math.pow(1 - monthlyChurnRate, 12);
  const customersEnd = customersStart - customersLost + newCustomers;
  const netGrowth = customersEnd - customersStart;
  const growthRate = customersStart > 0 ? (netGrowth / customersStart) * 100 : 0;
  const revenueLost = customersLost * avgRevenue;
  const revenueChurnImpact = avgRevenue > 0 ? customersLost / customersStart : 0;

  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const loc = (n: number) => n.toLocaleString();

  let mainResult =
    '\\uD83D\\uDCC9 Churn Rate Analysis\\n\\n' +
    '\\u2022 Customers at Start: ' + loc(customersStart) + '\\n' +
    '\\u2022 Customers Lost: ' + loc(customersLost) + '\\n' +
    '\\u2022 New Customers Added: ' + loc(newCustomers) + '\\n' +
    '\\u2022 Customers at End: ' + loc(customersEnd) + '\\n' +
    '\\u2022 Net Growth: ' + (netGrowth >= 0 ? '+' : '') + loc(netGrowth) + ' (' + growthRate.toFixed(1) + '%)\\n\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

  mainResult +=
    '\\uD83D\\uDCCA Key Metrics:\\n\\n' +
    '\\u2022 Monthly Churn Rate: ' + pct(monthlyChurnRate) + '\\n' +
    '\\u2022 Annual Churn Rate: ' + pct(annualChurnRate) + '\\n' +
    '\\u2022 Revenue Churn Impact: ' + pct(revenueChurnImpact) + '\\n';

  if (avgRevenue > 0) {
    mainResult += '\\u2022 Monthly Revenue Lost to Churn: ' + fmt(revenueLost) + '\\n';
    mainResult += '\\u2022 Annual Revenue Lost to Churn: ' + fmt(revenueLost * 12) + '\\n';
  }

  mainResult += '\\n';

  if (monthlyChurnRate <= 0.02) {
    mainResult += '\\uD83D\\uDFE2 HEALTHY: Monthly churn under 2% is excellent. Keep doing what you are doing.\\n';
  } else if (monthlyChurnRate <= 0.05) {
    mainResult += '\\uD83D\\uDFE1 AVERAGE: 2-5% monthly churn is typical for SaaS. There is room for improvement.\\n';
  } else {
    mainResult += '\\uD83D\\uDD34 HIGH: Over 5% monthly churn means you are losing ~46%+ of customers annually. Address this urgently.\\n';
  }

  mainResult += '\\n\\uD83D\\uDCA1 Tip: Reducing churn from 5% to 3% monthly is often easier and more profitable than doubling your new customer acquisition. Churn compounds negatively — fix it first.';

  results.push(mainResult);

  // 5 comparison scenarios
  const churnScenarios = [
    { label: 'Best Case (1% churn)', churnRate: 0.01 },
    { label: 'Good (2% churn)', churnRate: 0.02 },
    { label: 'Average (3% churn)', churnRate: 0.03 },
    { label: 'Warning (5% churn)', churnRate: 0.05 },
    { label: 'Critical (8% churn)', churnRate: 0.08 },
  ];

  for (let i = 0; i < churnScenarios.length; i++) {
    const lost = Math.round(customersStart * churnScenarios[i].churnRate);
    const end = customersStart - lost + newCustomers;
    const annual = 1 - Math.pow(1 - churnScenarios[i].churnRate, 12);
    const revLost = lost * avgRevenue;
    results.push(
      churnScenarios[i].label + ': Lose ' + lost + ' cust/mo | Annual churn ' + pct(annual) +
      ' | End with ' + end + ' customers' + (avgRevenue > 0 ? ' | Lose ' + fmt(revLost) + '/mo' : ''),
    );
  }

  return results;
}

const customFn =
  "var cs=parseInt(inputs.customersStart)||0;" +
  "var cl=parseInt(inputs.customersLost)||0;" +
  "var nc=parseInt(inputs.newCustomers)||0;" +
  "var ar=parseFloat(inputs.avgRevenuePerCustomer)||0;" +
  "var mcr=cs>0?cl/cs:0;" +
  "var acr=1-Math.pow(1-mcr,12);" +
  "var ce=cs-cl+nc;" +
  "var ng=ce-cs;" +
  "var gr=cs>0?(ng/cs)*100:0;" +
  "var rl=cl*ar;" +
  "var rci=ar>0?cl/cs:0;" +
  "function pctn(n){return (n*100).toFixed(1)+'%'}" +
  "function fmtn(n){return '$'+Math.round(n).toLocaleString()}" +
  "function locn(n){return n.toLocaleString()}" +
  "var mr3='';" +
  "mr3+='\\uD83D\\uDCC9 Churn Rate Analysis\\n\\n';" +
  "mr3+='\\u2022 Customers at Start: '+locn(cs)+'\\n';" +
  "mr3+='\\u2022 Customers Lost: '+locn(cl)+'\\n';" +
  "mr3+='\\u2022 New Customers Added: '+locn(nc)+'\\n';" +
  "mr3+='\\u2022 Customers at End: '+locn(ce)+'\\n';" +
  "mr3+='\\u2022 Net Growth: '+(ng>=0?'+':'')+locn(ng)+' ('+gr.toFixed(1)+'%)\\n\\n';" +
  "mr3+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "mr3+='\\uD83D\\uDCCA Key Metrics:\\n\\n';" +
  "mr3+='\\u2022 Monthly Churn Rate: '+pctn(mcr)+'\\n';" +
  "mr3+='\\u2022 Annual Churn Rate: '+pctn(acr)+'\\n';" +
  "mr3+='\\u2022 Revenue Churn Impact: '+pctn(rci)+'\\n';" +
  "if(ar>0){mr3+='\\u2022 Monthly Revenue Lost to Churn: '+fmtn(rl)+'\\n';mr3+='\\u2022 Annual Revenue Lost to Churn: '+fmtn(rl*12)+'\\n';}" +
  "mr3+='\\n';" +
  "if(mcr<=0.02)mr3+='\\uD83D\\uDFE2 HEALTHY: Monthly churn under 2% is excellent. Keep doing what you are doing.\\n';" +
  "else if(mcr<=0.05)mr3+='\\uD83D\\uDFE1 AVERAGE: 2-5% monthly churn is typical for SaaS. There is room for improvement.\\n';" +
  "else mr3+='\\uD83D\\uDD34 HIGH: Over 5% monthly churn means you are losing ~46%+ of customers annually. Address this urgently.\\n';" +
  "mr3+='\\n\\uD83D\\uDCA1 Tip: Reducing churn from 5% to 3% monthly is often easier and more profitable than doubling your new customer acquisition. Churn compounds negatively \\u2014 fix it first.';" +
  "var results=[mr3];" +
  "var chs=[{l:'Best Case (1% churn)',cr:0.01},{l:'Good (2% churn)',cr:0.02},{l:'Average (3% churn)',cr:0.03},{l:'Warning (5% churn)',cr:0.05},{l:'Critical (8% churn)',cr:0.08}];" +
  "for(var i=0;i<chs.length;i++){var lost=Math.round(cs*chs[i].cr);var end=cs-lost+nc;var ann=1-Math.pow(1-chs[i].cr,12);var revLost=lost*ar;results.push(chs[i].l+': Lose '+lost+' cust/mo | Annual churn '+pctn(ann)+' | End with '+end+' customers'+(ar>0?' | Lose '+fmtn(revLost)+'/mo':''));}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-churn-rate-calculator',
  title: 'Churn Rate Calculator',
  description: 'Calculate your monthly and annual customer churn rate. See churn impact on revenue and compare different churn scenarios.',
  category: 'A',
  inputs: [
    { name: 'customersStart', label: 'Customers at Start of Month', placeholder: 'e.g. 500', type: 'number' },
    { name: 'customersLost', label: 'Customers Lost This Month', placeholder: 'e.g. 15', type: 'number' },
    { name: 'newCustomers', label: 'New Customers This Month', placeholder: 'e.g. 25', type: 'number' },
    { name: 'avgRevenuePerCustomer', label: 'Avg Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateChurn(inputs);
  },
  staticExamples: [
    '📉 Churn Rate Analysis\n\n• Customers at Start: 500\n• Customers Lost: 15\n• New Customers Added: 25\n• Customers at End: 510\n• Net Growth: +10 (2.0%)\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 Key Metrics:\n\n• Monthly Churn Rate: 3.0%\n• Annual Churn Rate: 30.6%\n• Revenue Churn Impact: 3.0%\n• Monthly Revenue Lost to Churn: $750\n• Annual Revenue Lost to Churn: $9,000\n\n🟡 AVERAGE: 2-5% monthly churn is typical for SaaS. There is room for improvement.\n\n💡 Tip: Reducing churn from 5% to 3% monthly is often easier and more profitable than doubling your new customer acquisition. Churn compounds negatively — fix it first.',
    'Best Case (1% churn): Lose 5 cust/mo | Annual churn 11.4% | End with 520 customers | Lose $250/mo',
    'Good (2% churn): Lose 10 cust/mo | Annual churn 21.5% | End with 515 customers | Lose $500/mo',
    'Average (3% churn): Lose 15 cust/mo | Annual churn 30.6% | End with 510 customers | Lose $750/mo',
    'Warning (5% churn): Lose 25 cust/mo | Annual churn 46.0% | End with 500 customers | Lose $1,250/mo',
  ],
  faq: [
    { q: 'What is a good monthly churn rate for SaaS?', a: 'A good monthly churn rate for SMB SaaS is 3-5%. For enterprise SaaS, aim for under 2% monthly. The best SaaS companies like Salesforce and HubSpot have monthly churn under 1%. However, annual churn is the more important metric — a 3% monthly churn compounds to ~31% annual churn, which means you lose a third of your customers every year.' },
    { q: 'What is the difference between customer churn and revenue churn?', a: 'Customer churn measures the percentage of customers who leave. Revenue churn measures the percentage of revenue lost from those customers. Revenue churn can be higher than customer churn if your highest-paying customers leave, or lower if only low-tier customers churn. Track both.' },
    { q: 'How do I reduce churn?', a: 'Focus on onboarding (most churn happens in the first 30-60 days), proactive customer success (reach out to at-risk accounts before they cancel), and feedback loops (exit surveys reveal why people leave). Also consider annual contracts — they lock in customers and reduce involuntary churn from failed credit card payments.' },
    { q: 'Does churn include downgrades or just cancellations?', a: 'Strictly, churn means complete cancellations. But you should also track contraction MRR (downgrades) separately. Together, churn + contraction gives you your total MRR churn rate. Many companies lump them together for a conservative view.' },
    { q: 'Why does a 3% monthly churn become 31% annual?', a: 'Churn compounds: each month you lose 3% of remaining customers, not 3% of the original count. The formula is 1 - (1 - 0.03)^12 = 30.6%. This is why small improvements in monthly churn have huge annual impacts. Reducing from 5% to 3% monthly takes annual churn from 46% down to 31%.' },
  ],
  howToUse: [
    'Enter your customer count at the beginning of the month.',
    'Enter how many customers cancelled or failed to renew this month.',
    'Enter how many new customers you acquired this month.',
    'Optionally enter your average revenue per customer to see revenue impact.',
    'Review your monthly churn rate, annual churn rate, and net customer growth.',
    'Scroll down to see 5 churn scenarios showing how different rates affect your business.',
  ],
};

registerEngine(engine);
