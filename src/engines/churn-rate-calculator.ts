import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateChurn(inputs: Record<string, string>): string[] {
  const customersStart = parseInt(inputs.customersStart) || 0;
  const customersLost = parseInt(inputs.customersLost) || 0;
  const newCustomers = parseInt(inputs.newCustomers) || 0;
  const avgRevenue = parseFloat(inputs.avgRevenuePerCustomer) || 0;
  const expansionRevenue = parseFloat(inputs.expansionRevenue) || 0;
  const results: string[] = [];

  // Logo churn (customer headcount)
  const monthlyLogoChurn = customersStart > 0 ? customersLost / customersStart : 0;
  const annualLogoChurn = 1 - Math.pow(1 - monthlyLogoChurn, 12);

  // Customer growth
  const customersEnd = customersStart - customersLost + newCustomers;
  const netGrowth = customersEnd - customersStart;
  const growthRate = customersStart > 0 ? (netGrowth / customersStart) * 100 : 0;

  // Revenue calculations (only meaningful when avgRevenue > 0)
  const startingRevenue = customersStart * avgRevenue;
  const churnedRevenue = customersLost * avgRevenue;
  const monthlyGrossRevChurn = startingRevenue > 0 ? churnedRevenue / startingRevenue : 0;
  const monthlyNetRevChurn = startingRevenue > 0 ? (churnedRevenue - expansionRevenue) / startingRevenue : 0;

  // GRR / NRR
  const grr = startingRevenue > 0 ? ((startingRevenue - churnedRevenue) / startingRevenue) * 100 : 0;
  const nrr = startingRevenue > 0 ? ((startingRevenue + expansionRevenue - churnedRevenue) / startingRevenue) * 100 : 0;

  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const loc = (n: number) => n.toLocaleString();

  // ---- Build main result ----
  let mainResult =
    '\\uD83D\\uDCC9 Logo & Revenue Churn Analysis\\n\\n' +
    '\\u2022 Customers at Start: ' + loc(customersStart) + '\\n' +
    '\\u2022 New Customers Added: ' + loc(newCustomers) + '\\n' +
    '\\u2022 Customers Lost: ' + loc(customersLost) + '\\n' +
    '\\u2022 Customers at End: ' + loc(customersEnd) + '\\n' +
    '\\u2022 Net Growth: ' + (netGrowth >= 0 ? '+' : '') + loc(netGrowth) + ' (' + growthRate.toFixed(1) + '%)\\n\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

  // ---- Logo Churn section ----
  mainResult +=
    '\\uD83D\\uDC65 Logo Churn (Customer Headcount)\\n' +
    '\\u2022 Monthly Logo Churn: ' + pct(monthlyLogoChurn) + '\\n' +
    '\\u2022 Annual Logo Churn: ' + pct(annualLogoChurn) + '\\n\\n';

  // ---- Revenue Churn section (only when avgRevenue > 0) ----
  if (avgRevenue > 0) {
    mainResult +=
      '\\uD83D\\uDCB0 Revenue Churn\\n' +
      '\\u2022 Gross Revenue Churn (before expansion): ' + pct(monthlyGrossRevChurn) + '\\n' +
      '\\u2022 Net Revenue Churn (after expansion): ' + pct(monthlyNetRevChurn) + '\\n' +
      '\\u2022 Monthly Revenue Lost to Churn: ' + fmt(churnedRevenue) + '\\n' +
      '\\u2022 Annual Revenue Lost to Churn: ' + fmt(churnedRevenue * 12) + '\\n\\n';

    // ---- GRR / NRR section ----
    // NRR status
    let nrrLabel = '';
    if (nrr >= 120) nrrLabel = '\\uD83D\\uDFE2 Best-in-class';
    else if (nrr >= 100) nrrLabel = '\\uD83D\\uDFE1 Positive';
    else nrrLabel = '\\uD83D\\uDD34 Shrinking';

    // GRR status
    let grrLabel = '';
    if (grr >= 90) grrLabel = '\\uD83D\\uDFE2 Healthy';
    else if (grr >= 80) grrLabel = '\\uD83D\\uDFE1 Watch';
    else grrLabel = '\\uD83D\\uDD34 At risk';

    mainResult +=
      '\\uD83D\\uDCC8 GRR / NRR\\n' +
      '\\u2022 GRR = ' + grr.toFixed(1) + '% \\u2014 ' + grrLabel + '\\n' +
      '\\u2022 NRR = ' + nrr.toFixed(1) + '% \\u2014 ' + nrrLabel + '\\n\\n';
  }

  mainResult +=
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

  // ---- Health assessment (based on monthly logo churn) ----
  if (monthlyLogoChurn <= 0.02) {
    mainResult += '\\uD83D\\uDFE2 HEALTHY: Monthly logo churn under 2% is excellent. Keep doing what you are doing.\\n';
  } else if (monthlyLogoChurn <= 0.05) {
    mainResult += '\\uD83D\\uDFE1 AVERAGE: 2-5% monthly logo churn is typical for SaaS. There is room for improvement.\\n';
  } else {
    mainResult += '\\uD83D\\uDD34 HIGH: Over 5% monthly logo churn means you are losing ~46%+ of customers annually. Address this urgently.\\n';
  }

  mainResult += '\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

  // ---- Churn Attribution (when customersLost > 0) ----
  if (customersLost > 0) {
    const voluntaryEst = Math.round(customersLost * 0.6);
    const involuntaryEst = Math.round(customersLost * 0.4);
    mainResult +=
      '\\uD83D\\uDD0D Churn Attribution (' + loc(customersLost) + ' customers lost)\\n' +
      '\\u2022 Voluntary (~60%): ~' + loc(voluntaryEst) + ' customers \\u2014 fix with better onboarding\\n' +
      '\\u2022 Involuntary (~40%): ~' + loc(involuntaryEst) + ' customers \\u2014 fix with dunning emails\\n\\n';
  }

  // ---- Tip ----
  mainResult += '\\uD83D\\uDCA1 Tip: Reducing churn from 5% to 3% monthly is often easier and more profitable than doubling your new customer acquisition. Churn compounds negatively \\u2014 fix it first.';

  results.push(mainResult);

  // ---- 5 comparison scenarios ----
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
    const scenarioGRR = ((1 - churnScenarios[i].churnRate) * 100).toFixed(1);
    let line =
      churnScenarios[i].label + ': Lose ' + lost + ' cust/mo | Annual churn ' + pct(annual) +
      ' | GRR ' + scenarioGRR + '% | End with ' + end + ' customers';
    if (avgRevenue > 0) {
      line += ' | Lose ' + fmt(revLost) + '/mo';
    }
    results.push(line);
  }

  return results;
}

const customFn =
  "var cs=parseInt(inputs.customersStart)||0;" +
  "var cl=parseInt(inputs.customersLost)||0;" +
  "var nc=parseInt(inputs.newCustomers)||0;" +
  "var ar=parseFloat(inputs.avgRevenuePerCustomer)||0;" +
  "var er=parseFloat(inputs.expansionRevenue)||0;" +
  "var mlc=cs>0?cl/cs:0;" +
  "var alc=1-Math.pow(1-mlc,12);" +
  "var ce=cs-cl+nc;" +
  "var ng=ce-cs;" +
  "var gr=cs>0?(ng/cs)*100:0;" +
  "var sr=cs*ar;" +
  "var cr2=cl*ar;" +
  "var mgrc=sr>0?cr2/sr:0;" +
  "var mnrc=sr>0?(cr2-er)/sr:0;" +
  "var grr=sr>0?((sr-cr2)/sr)*100:0;" +
  "var nrr=sr>0?((sr+er-cr2)/sr)*100:0;" +
  "function pctn(n){return (n*100).toFixed(1)+'%'}" +
  "function fmtn(n){return '$'+Math.round(n).toLocaleString()}" +
  "function locn(n){return n.toLocaleString()}" +
  "var mr3='';" +
  "mr3+='\\uD83D\\uDCC9 Logo & Revenue Churn Analysis\\n\\n';" +
  "mr3+='\\u2022 Customers at Start: '+locn(cs)+'\\n';" +
  "mr3+='\\u2022 New Customers Added: '+locn(nc)+'\\n';" +
  "mr3+='\\u2022 Customers Lost: '+locn(cl)+'\\n';" +
  "mr3+='\\u2022 Customers at End: '+locn(ce)+'\\n';" +
  "mr3+='\\u2022 Net Growth: '+(ng>=0?'+':'')+locn(ng)+' ('+gr.toFixed(1)+'%)\\n\\n';" +
  "mr3+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "mr3+='\\uD83D\\uDC65 Logo Churn (Customer Headcount)\\n';" +
  "mr3+='\\u2022 Monthly Logo Churn: '+pctn(mlc)+'\\n';" +
  "mr3+='\\u2022 Annual Logo Churn: '+pctn(alc)+'\\n\\n';" +
  "if(ar>0){" +
  "mr3+='\\uD83D\\uDCB0 Revenue Churn\\n';" +
  "mr3+='\\u2022 Gross Revenue Churn (before expansion): '+pctn(mgrc)+'\\n';" +
  "mr3+='\\u2022 Net Revenue Churn (after expansion): '+pctn(mnrc)+'\\n';" +
  "mr3+='\\u2022 Monthly Revenue Lost to Churn: '+fmtn(cr2)+'\\n';" +
  "mr3+='\\u2022 Annual Revenue Lost to Churn: '+fmtn(cr2*12)+'\\n\\n';" +
  "var nrL='';if(nrr>=120)nrL='\\uD83D\\uDFE2 Best-in-class';else if(nrr>=100)nrL='\\uD83D\\uDFE1 Positive';else nrL='\\uD83D\\uDD34 Shrinking';" +
  "var grL='';if(grr>=90)grL='\\uD83D\\uDFE2 Healthy';else if(grr>=80)grL='\\uD83D\\uDFE1 Watch';else grL='\\uD83D\\uDD34 At risk';" +
  "mr3+='\\uD83D\\uDCC8 GRR / NRR\\n';" +
  "mr3+='\\u2022 GRR = '+grr.toFixed(1)+'% \\u2014 '+grL+'\\n';" +
  "mr3+='\\u2022 NRR = '+nrr.toFixed(1)+'% \\u2014 '+nrL+'\\n\\n';" +
  "}" +
  "mr3+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "if(mlc<=0.02)mr3+='\\uD83D\\uDFE2 HEALTHY: Monthly logo churn under 2% is excellent. Keep doing what you are doing.\\n';" +
  "else if(mlc<=0.05)mr3+='\\uD83D\\uDFE1 AVERAGE: 2-5% monthly logo churn is typical for SaaS. There is room for improvement.\\n';" +
  "else mr3+='\\uD83D\\uDD34 HIGH: Over 5% monthly logo churn means you are losing ~46%+ of customers annually. Address this urgently.\\n';" +
  "mr3+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "if(cl>0){var ve=Math.round(cl*0.6);var ie=Math.round(cl*0.4);mr3+='\\uD83D\\uDD0D Churn Attribution ('+locn(cl)+' customers lost)\\n';mr3+='\\u2022 Voluntary (~60%): ~'+locn(ve)+' customers \\u2014 fix with better onboarding\\n';mr3+='\\u2022 Involuntary (~40%): ~'+locn(ie)+' customers \\u2014 fix with dunning emails\\n\\n';}" +
  "mr3+='\\uD83D\\uDCA1 Tip: Reducing churn from 5% to 3% monthly is often easier and more profitable than doubling your new customer acquisition. Churn compounds negatively \\u2014 fix it first.';" +
  "var results=[mr3];" +
  "var chs=[{l:'Best Case (1% churn)',cr:0.01},{l:'Good (2% churn)',cr:0.02},{l:'Average (3% churn)',cr:0.03},{l:'Warning (5% churn)',cr:0.05},{l:'Critical (8% churn)',cr:0.08}];" +
  "for(var i=0;i<chs.length;i++){var lost=Math.round(cs*chs[i].cr);var end=cs-lost+nc;var ann=1-Math.pow(1-chs[i].cr,12);var revLost=lost*ar;var sgrr=((1-chs[i].cr)*100).toFixed(1);var line=chs[i].l+': Lose '+lost+' cust/mo | Annual churn '+pctn(ann)+' | GRR '+sgrr+'% | End with '+end+' customers';if(ar>0)line+=' | Lose '+fmtn(revLost)+'/mo';results.push(line);}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-churn-rate-calculator',
  title: 'Churn Rate Calculator',
  description: 'Calculate logo churn, revenue churn, GRR/NRR retention metrics, and churn attribution. Compare churn scenarios and see revenue impact.',
  category: 'A',
  inputs: [
    { name: 'customersStart', label: 'Customers at Start of Month', placeholder: 'e.g. 500', type: 'number' },
    { name: 'customersLost', label: 'Customers Lost This Month', placeholder: 'e.g. 15', type: 'number' },
    { name: 'newCustomers', label: 'New Customers This Month', placeholder: 'e.g. 25', type: 'number' },
    { name: 'avgRevenuePerCustomer', label: 'Avg Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'expansionRevenue', label: 'Expansion Revenue ($)', placeholder: 'e.g. 800', type: 'number' },
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
    '📉 Logo & Revenue Churn Analysis\n\n• Customers at Start: 500\n• New Customers Added: 25\n• Customers Lost: 15\n• Customers at End: 510\n• Net Growth: +10 (2.0%)\n\n━━━━━━━━━━━━━━━━━━━━\n\n👥 Logo Churn (Customer Headcount)\n• Monthly Logo Churn: 3.0%\n• Annual Logo Churn: 30.6%\n\n💰 Revenue Churn\n• Gross Revenue Churn (before expansion): 3.0%\n• Net Revenue Churn (after expansion): -0.2%\n• Monthly Revenue Lost to Churn: $750\n• Annual Revenue Lost to Churn: $9,000\n\n📈 GRR / NRR\n• GRR = 97.0% — 🟢 Healthy\n• NRR = 100.2% — 🟡 Positive\n\n━━━━━━━━━━━━━━━━━━━━\n\n🟡 AVERAGE: 2-5% monthly logo churn is typical for SaaS. There is room for improvement.\n\n━━━━━━━━━━━━━━━━━━━━\n\n🔍 Churn Attribution (15 customers lost)\n• Voluntary (~60%): ~9 customers — fix with better onboarding\n• Involuntary (~40%): ~6 customers — fix with dunning emails\n\n💡 Tip: Reducing churn from 5% to 3% monthly is often easier and more profitable than doubling your new customer acquisition. Churn compounds negatively — fix it first.',
    'Best Case (1% churn): Lose 5 cust/mo | Annual churn 11.4% | GRR 99.0% | End with 520 customers | Lose $250/mo',
    'Good (2% churn): Lose 10 cust/mo | Annual churn 21.5% | GRR 98.0% | End with 515 customers | Lose $500/mo',
    'Average (3% churn): Lose 15 cust/mo | Annual churn 30.6% | GRR 97.0% | End with 510 customers | Lose $750/mo',
    'Warning (5% churn): Lose 25 cust/mo | Annual churn 46.0% | GRR 95.0% | End with 500 customers | Lose $1,250/mo',
  ],
  faq: [
    { q: 'What is a good monthly churn rate for SaaS?', a: 'For SMB SaaS, 3-5% monthly logo churn is typical. For enterprise SaaS, aim for under 2% monthly. The best companies like Salesforce have monthly churn under 1%. A 3% monthly churn compounds to ~31% annual — meaning you lose a third of your customers every year if you do not replace them. Focus on reducing churn before scaling acquisition.' },
    { q: 'What is the difference between logo churn and revenue churn?', a: 'Logo churn measures the percentage of customers (headcount) who leave. Revenue churn measures the percentage of revenue lost. They differ when customers pay different amounts — if your highest-paying customers churn, revenue churn exceeds logo churn. Gross Revenue Churn is churned revenue before accounting for expansion; Net Revenue Churn subtracts expansion revenue (upsells, add-ons) that offset losses.' },
    { q: 'What are GRR and NRR, and why do they matter?', a: 'GRR (Gross Revenue Retention) measures how much revenue you retain from existing customers, ignoring expansion. NRR (Net Revenue Retention) includes expansion revenue — NRR above 100% means existing customers are growing despite churn. Best-in-class SaaS companies have NRR above 120%. Investors value NRR highly because it proves product-market fit without relying on new acquisition.' },
    { q: 'How should I think about voluntary vs involuntary churn?', a: 'Voluntary churn (~60% of losses) happens when customers actively cancel — they are not getting enough value. Fix it with better onboarding, proactive customer success, and feature adoption. Involuntary churn (~40%) is passive — failed credit card payments or expired cards. Fix it with dunning emails, retry logic, and payment method updates before expiration.' },
    { q: 'How do I reduce churn effectively?', a: 'Start with onboarding: most churn happens in the first 60 days. Add a guided setup flow, track time-to-value, and trigger outreach when users stall. Then implement proactive customer success — monitor usage signals and reach out before customers go silent. Finally, offer annual contracts with a discount — they lock in customers and eliminate monthly involuntary churn from payment failures.' },
    { q: 'Why does a 3% monthly churn become 31% annual?', a: 'Churn compounds: each month you lose 3% of the remaining customers, not 3% of the original total. The formula is 1 - (1 - 0.03)^12 = 30.6%. This compounding effect is why small monthly improvements have outsized annual impact. Reducing from 5% to 3% monthly takes annual churn from 46% to 31% — a 15-point swing from a 2-point monthly change.' },
    { q: 'When should I track logo churn vs revenue churn?', a: 'Track both from day one. Logo churn tells you if your product is sticky; revenue churn tells you if your business is healthy. A startup with 5% logo churn but 120% NRR (from expansion) may still be growing revenue. Conversely, 2% logo churn with 95% NRR means you are slowly shrinking despite loyal customers. Use both metrics together for a complete picture.' },
  ],
  howToUse: [
    'Enter your total customer count at the beginning of the month.',
    'Enter how many customers cancelled or failed to renew this month.',
    'Enter how many new customers you acquired this month.',
    'Enter your average revenue per customer to unlock revenue churn and GRR/NRR metrics.',
    'Enter expansion revenue (upsells, add-ons, upgrades) from existing customers to see your NRR.',
    'Review the Logo Churn section for your customer headcount churn rate (monthly and annual).',
    'Check the Revenue Churn section for Gross (before expansion) and Net (after expansion) revenue churn.',
    'Evaluate your GRR and NRR scores: NRR above 120% is best-in-class, GRR above 90% is healthy.',
    'Read the Churn Attribution breakdown to identify whether voluntary or involuntary churn is your biggest opportunity, then scroll to the scenario comparisons to see how improving churn rates changes your trajectory.',
  ],
};

registerEngine(engine);
