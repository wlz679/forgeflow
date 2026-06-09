import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateCAC(inputs: Record<string, string>): string[] {
  const marketingSpend = parseFloat(inputs.marketingSpend) || 0;
  const salesSpend = parseFloat(inputs.salesSpend) || 0;
  const newCustomers = parseInt(inputs.newCustomers) || 0;
  const avgRevenuePerCustomer = parseFloat(inputs.avgRevenuePerCustomer) || 0;
  const grossMargin = parseFloat(inputs.grossMargin) || 80;
  const results: string[] = [];

  const totalSpend = marketingSpend + salesSpend;
  const cac = newCustomers > 0 ? totalSpend / newCustomers : 0;
  const grossProfitPerCustomer = avgRevenuePerCustomer * (grossMargin / 100);
  const paybackMonths = grossProfitPerCustomer > 0 ? cac / grossProfitPerCustomer : 0;
  const marketingPct = totalSpend > 0 ? (marketingSpend / totalSpend) * 100 : 0;
  const salesPct = totalSpend > 0 ? (salesSpend / totalSpend) * 100 : 0;

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';
  const loc = (n: number) => n.toLocaleString();

  let mainResult =
    '\\uD83C\\uDFAF Customer Acquisition Cost (CAC)\\n\\n' +
    '\\u2022 Marketing Spend: ' + fmt(marketingSpend) + ' (' + pct(marketingPct) + ' of total)\\n' +
    '\\u2022 Sales Spend: ' + fmt(salesSpend) + ' (' + pct(salesPct) + ' of total)\\n' +
    '\\u2022 Total Acquisition Spend: ' + fmt(totalSpend) + '\\n' +
    '\\u2022 New Customers Acquired: ' + loc(newCustomers) + '\\n\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n' +
    '\\uD83D\\uDCCA Key Results:\\n\\n' +
    '\\u2022 Customer Acquisition Cost (CAC): ' + fmt(cac) + ' per customer\\n';

  if (avgRevenuePerCustomer > 0) {
    mainResult += '\\u2022 Avg Revenue per Customer: ' + fmt(avgRevenuePerCustomer) + '/mo\\n';
    mainResult += '\\u2022 Gross Profit per Customer: ' + fmt(grossProfitPerCustomer) + '/mo\\n';
    mainResult += '\\u2022 CAC Payback Period: ' + paybackMonths.toFixed(1) + ' months\\n';
  }

  mainResult += '\\n';

  if (avgRevenuePerCustomer > 0) {
    const firstYearValue = avgRevenuePerCustomer * 12 * (grossMargin / 100);
    const ltvEstimate = paybackMonths > 0 ? cac * 3 : 0; // assume 3:1 LTV:CAC target
    mainResult += '\\u2022 Est. First-Year Customer Value: ' + fmt(firstYearValue) + '\\n';
    if (ltvEstimate > 0) {
      mainResult += '\\u2022 Target LTV (at 3:1 ratio): ' + fmt(ltvEstimate) + '\\n';
    }
    mainResult += '\\n';

    if (paybackMonths <= 6) {
      mainResult += '\\uD83D\\uDFE2 STRONG: CAC payback in ' + paybackMonths.toFixed(1) + ' months is excellent. You recover acquisition costs quickly and can reinvest faster.\\n';
    } else if (paybackMonths <= 12) {
      mainResult += '\\uD83D\\uDFE1 GOOD: CAC payback in ' + paybackMonths.toFixed(1) + ' months is within the 12-month benchmark. Keep optimizing channel mix.\\n';
    } else if (paybackMonths <= 18) {
      mainResult += '\\uD83D\\uDFE1 WARNING: ' + paybackMonths.toFixed(1) + ' months payback is above the 12-month ideal. Review your acquisition channels for efficiency.\\n';
    } else {
      mainResult += '\\uD83D\\uDD34 CRITICAL: ' + paybackMonths.toFixed(1) + ' months payback is too long. Your cash flow is strained. Cut underperforming channels immediately.\\n';
    }
  }

  mainResult += '\\n\\uD83D\\uDCA1 Tip: Break down CAC by channel. You might have an overall CAC of $200, but LinkedIn ads might be $500/customer while SEO content might be $50/customer. Shift budget to your most efficient channels.';

  results.push(mainResult);

  // 5 comparison scenarios at different spend levels
  const spendScenarios = [
    { label: 'Cut spend 50%', marketing: marketingSpend * 0.5, sales: salesSpend * 0.5 },
    { label: 'Cut spend 25%', marketing: marketingSpend * 0.75, sales: salesSpend * 0.75 },
    { label: 'Current', marketing: marketingSpend, sales: salesSpend },
    { label: 'Increase spend 25%', marketing: marketingSpend * 1.25, sales: salesSpend * 1.25 },
    { label: 'Double spend', marketing: marketingSpend * 2, sales: salesSpend * 2 },
  ];

  for (let i = 0; i < spendScenarios.length; i++) {
    const s = spendScenarios[i];
    const total = s.marketing + s.sales;
    // Assume customers acquired scales proportionally
    const scaledCustomers = newCustomers > 0 && totalSpend > 0
      ? Math.round(newCustomers * (total / totalSpend))
      : newCustomers;
    const cacScen = scaledCustomers > 0 ? total / scaledCustomers : 0;
    const paybackScen = grossProfitPerCustomer > 0 ? cacScen / grossProfitPerCustomer : 0;
    results.push(
      s.label + ': $' + Math.round(total).toLocaleString() + ' total spend, ' +
      scaledCustomers + ' customers, CAC ' + fmt(cacScen) +
      (avgRevenuePerCustomer > 0 ? ', Payback ' + paybackScen.toFixed(1) + ' mo' : ''),
    );
  }

  return results;
}

const customFn =
  "var ms=parseFloat(inputs.marketingSpend)||0;" +
  "var ss=parseFloat(inputs.salesSpend)||0;" +
  "var nc2=parseInt(inputs.newCustomers)||0;" +
  "var arc=parseFloat(inputs.avgRevenuePerCustomer)||0;" +
  "var gm2=parseFloat(inputs.grossMargin)||80;" +
  "function fmt4(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct4(n){return n.toFixed(1)+'%'}" +
  "function loc4(n){return n.toLocaleString()}" +
  "var ts=ms+ss;" +
  "var cac2=nc2>0?ts/nc2:0;" +
  "var gpc=arc*(gm2/100);" +
  "var pbm=gpc>0?cac2/gpc:0;" +
  "var mp=ts>0?(ms/ts)*100:0;" +
  "var sp=ts>0?(ss/ts)*100:0;" +
  "var mr6='';" +
  "mr6+='\\uD83C\\uDFAF Customer Acquisition Cost (CAC)\\n\\n';" +
  "mr6+='\\u2022 Marketing Spend: '+fmt4(ms)+' ('+pct4(mp)+' of total)\\n';" +
  "mr6+='\\u2022 Sales Spend: '+fmt4(ss)+' ('+pct4(sp)+' of total)\\n';" +
  "mr6+='\\u2022 Total Acquisition Spend: '+fmt4(ts)+'\\n';" +
  "mr6+='\\u2022 New Customers Acquired: '+loc4(nc2)+'\\n\\n';" +
  "mr6+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "mr6+='\\uD83D\\uDCCA Key Results:\\n\\n';" +
  "mr6+='\\u2022 Customer Acquisition Cost (CAC): '+fmt4(cac2)+' per customer\\n';" +
  "if(arc>0){mr6+='\\u2022 Avg Revenue per Customer: '+fmt4(arc)+'/mo\\n';mr6+='\\u2022 Gross Profit per Customer: '+fmt4(gpc)+'/mo\\n';mr6+='\\u2022 CAC Payback Period: '+pbm.toFixed(1)+' months\\n';}" +
  "mr6+='\\n';" +
  "if(arc>0){var fyv=arc*12*(gm2/100);var ltvE=pbm>0?cac2*3:0;mr6+='\\u2022 Est. First-Year Customer Value: '+fmt4(fyv)+'\\n';if(ltvE>0)mr6+='\\u2022 Target LTV (at 3:1 ratio): '+fmt4(ltvE)+'\\n';mr6+='\\n';" +
  "if(pbm<=6)mr6+='\\uD83D\\uDFE2 STRONG: CAC payback in '+pbm.toFixed(1)+' months is excellent. You recover acquisition costs quickly and can reinvest faster.\\n';" +
  "else if(pbm<=12)mr6+='\\uD83D\\uDFE1 GOOD: CAC payback in '+pbm.toFixed(1)+' months is within the 12-month benchmark. Keep optimizing channel mix.\\n';" +
  "else if(pbm<=18)mr6+='\\uD83D\\uDFE1 WARNING: '+pbm.toFixed(1)+' months payback is above the 12-month ideal. Review your acquisition channels for efficiency.\\n';" +
  "else mr6+='\\uD83D\\uDD34 CRITICAL: '+pbm.toFixed(1)+' months payback is too long. Your cash flow is strained. Cut underperforming channels immediately.\\n';}" +
  "mr6+='\\n\\uD83D\\uDCA1 Tip: Break down CAC by channel. You might have an overall CAC of $200, but LinkedIn ads might be $500/customer while SEO content might be $50/customer. Shift budget to your most efficient channels.';" +
  "var results=[mr6];" +
  "var ss5=[{l:'Cut spend 50%',mk:ms*0.5,sk:ss*0.5},{l:'Cut spend 25%',mk:ms*0.75,sk:ss*0.75},{l:'Current',mk:ms,sk:ss},{l:'Increase spend 25%',mk:ms*1.25,sk:ss*1.25},{l:'Double spend',mk:ms*2,sk:ss*2}];" +
  "for(var i=0;i<ss5.length;i++){var st=ss5[i].mk+ss5[i].sk;var sc2=nc2>0&&ts>0?Math.round(nc2*(st/ts)):nc2;var cacS=sc2>0?st/sc2:0;var pbS=gpc>0?cacS/gpc:0;results.push(ss5[i].l+': $'+Math.round(st).toLocaleString()+' total spend, '+sc2+' customers, CAC '+fmt4(cacS)+(arc>0?', Payback '+pbS.toFixed(1)+' mo':''));}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-cac-calculator',
  title: 'CAC Calculator',
  description: 'Calculate your Customer Acquisition Cost and payback period. Compare different spend scenarios to find your most efficient acquisition budget.',
  category: 'B',
  inputs: [
    { name: 'marketingSpend', label: 'Marketing Spend ($)', placeholder: 'e.g. 5000', type: 'number' },
    { name: 'salesSpend', label: 'Sales Spend ($)', placeholder: 'e.g. 3000', type: 'number' },
    { name: 'newCustomers', label: 'New Customers Acquired', placeholder: 'e.g. 40', type: 'number' },
    { name: 'avgRevenuePerCustomer', label: 'Avg Monthly Revenue per Customer ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'grossMargin', label: 'Gross Margin (%)', placeholder: 'e.g. 80', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateCAC(inputs);
  },
  staticExamples: [
    '🎯 Customer Acquisition Cost (CAC)\n\n• Marketing Spend: $5,000 (62.5% of total)\n• Sales Spend: $3,000 (37.5% of total)\n• Total Acquisition Spend: $8,000\n• New Customers Acquired: 40\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 Key Results:\n\n• Customer Acquisition Cost (CAC): $200 per customer\n• Avg Revenue per Customer: $50/mo\n• Gross Profit per Customer: $40/mo\n• CAC Payback Period: 5.0 months\n\n• Est. First-Year Customer Value: $480\n• Target LTV (at 3:1 ratio): $600\n\n🟢 STRONG: CAC payback in 5.0 months is excellent. You recover acquisition costs quickly and can reinvest faster.\n\n💡 Tip: Break down CAC by channel. You might have an overall CAC of $200, but LinkedIn ads might be $500/customer while SEO content might be $50/customer. Shift budget to your most efficient channels.',
    'Cut spend 50%: $4,000 total spend, 20 customers, CAC $200, Payback 5.0 mo',
    'Cut spend 25%: $6,000 total spend, 30 customers, CAC $200, Payback 5.0 mo',
    'Current: $8,000 total spend, 40 customers, CAC $200, Payback 5.0 mo',
    'Double spend: $16,000 total spend, 80 customers, CAC $200, Payback 5.0 mo',
  ],
  faq: [
    { q: 'What is a good CAC for SaaS?', a: 'There is no universal "good" CAC — it depends on your LTV. What matters is the LTV:CAC ratio, which should be 3:1 or higher. If your LTV is $900, a CAC of $300 is great. If your LTV is $150, a CAC of $200 is disastrous. Always calculate CAC alongside LTV.' },
    { q: 'How do I calculate CAC by channel?', a: 'Track UTM parameters and lead sources in your CRM. For each channel (Google Ads, LinkedIn, SEO, referrals), divide the channel spend by the number of customers acquired from that channel. You will often find that 1-2 channels drive 80% of efficient acquisitions while others waste money.' },
    { q: 'What is the difference between CAC and CPA (Cost Per Acquisition)?', a: 'CAC measures cost per paying customer. CPA is broader and may include free trial signups, leads, or any "acquisition" event. When reporting, always use CAC (paying customers only) for unit economics. CPA for individual funnel stages (e.g., cost per trial signup) helps diagnose funnel issues.' },
    { q: 'Should I include founder time in CAC?', a: 'For early-stage solopreneurs, include an imputed salary for your sales time. If you spend 20 hours/month on sales and value your time at $100/hr, add $2,000 to your sales spend. This gives you a realistic CAC that accounts for the opportunity cost of your time.' },
    { q: 'How can I lower my CAC?', a: 'Five proven ways: (1) Improve targeting — narrow your ideal customer profile to reduce wasted ad spend. (2) Build organic channels — SEO and content marketing have zero marginal CAC after initial investment. (3) Optimize conversion rates — small CVR improvements compound. (4) Leverage referrals — referred customers have near-zero CAC. (5) Test different channels — you may find a cheaper channel you have not tried yet.' },
  ],
  howToUse: [
    'Enter your total marketing spend for the period.',
    'Enter your total sales spend (salaries, tools, commissions).',
    'Enter the number of new paying customers acquired in the period.',
    'Optionally enter average monthly revenue per customer and gross margin.',
    'Review your CAC, payback period, and unit economics health indicator.',
    'Scroll down to see 5 comparison scenarios at different total spend levels.',
  ],
};

registerEngine(engine);
