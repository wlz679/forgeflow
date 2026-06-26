import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

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
    '🎯 Customer Acquisition Cost (CAC)\n\n' +
    '• Marketing Spend: ' + fmt(marketingSpend) + ' (' + pct(marketingPct) + ' of total)\n' +
    '• Sales Spend: ' + fmt(salesSpend) + ' (' + pct(salesPct) + ' of total)\n' +
    '• Total Acquisition Spend: ' + fmt(totalSpend) + '\n' +
    '• New Customers Acquired: ' + loc(newCustomers) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Key Results:\n\n' +
    '• Customer Acquisition Cost (CAC): ' + fmt(cac) + ' per customer\n';

  if (avgRevenuePerCustomer > 0) {
    mainResult += '• Avg Revenue per Customer: ' + fmt(avgRevenuePerCustomer) + '/mo\n';
    mainResult += '• Gross Profit per Customer: ' + fmt(grossProfitPerCustomer) + '/mo\n';
    mainResult += '• CAC Payback Period: ' + paybackMonths.toFixed(1) + ' months\n';
  }

  mainResult += '\n';

  if (avgRevenuePerCustomer > 0) {
    const firstYearValue = avgRevenuePerCustomer * 12 * (grossMargin / 100);
    const ltvEstimate = paybackMonths > 0 ? cac * 3 : 0; // assume 3:1 LTV:CAC target
    mainResult += '• Est. First-Year Customer Value: ' + fmt(firstYearValue) + '\n';
    if (ltvEstimate > 0) {
      mainResult += '• Target LTV (at 3:1 ratio): ' + fmt(ltvEstimate) + '\n';
    }
    mainResult += '\n';

    if (paybackMonths <= 6) {
      mainResult += '🟢 STRONG: CAC payback in ' + paybackMonths.toFixed(1) + ' months is excellent. You recover acquisition costs quickly and can reinvest faster.\n';
    } else if (paybackMonths <= 12) {
      mainResult += '🟡 GOOD: CAC payback in ' + paybackMonths.toFixed(1) + ' months is within the 12-month benchmark. Keep optimizing channel mix.\n';
    } else if (paybackMonths <= 18) {
      mainResult += '🟡 WARNING: ' + paybackMonths.toFixed(1) + ' months payback is above the 12-month ideal. Review your acquisition channels for efficiency.\n';
    } else {
      mainResult += '🔴 CRITICAL: ' + paybackMonths.toFixed(1) + ' months payback is too long. Your cash flow is strained. Cut underperforming channels immediately.\n';
    }
  }

  mainResult += '\n💡 Tip: Break down CAC by channel. You might have an overall CAC of $200, but LinkedIn ads might be $500/customer while SEO content might be $50/customer. Shift budget to your most efficient channels.';

  // 🩺 CAC Health (v3)
  if (cac <= 0) {
    mainResult += '\n\n🩺 CAC Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 $0 CAC — organic/word-of-mouth growth. Don\'t get complacent; track how you scale.';
  } else if (cac < 200) {
    mainResult += '\n\n🩺 CAC Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 CAC $' + Math.round(cac) + ' is low. Healthy for SMB SaaS. Pair with LTV to confirm LTV:CAC > 3.';
  } else if (cac < 500) {
    mainResult += '\n\n🩺 CAC Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 CAC $' + Math.round(cac) + ' is mid-range. Verify LTV:CAC ratio is at least 3:1 before scaling spend.';
  } else {
    mainResult += '\n\n🩺 CAC Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🔴 CAC $' + Math.round(cac) + ' is high. Each new customer takes months/years to pay back. Cut CAC or raise LTV.';
  }

  // 🔄 What-If Scenarios (v3)
  mainResult += '\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  if (newCustomers > 0) {
    const halfCac = cac / 2;
    const doubledCust = newCustomers * 2;
    const newCacAtDoubled = (marketingSpend + salesSpend) / doubledCust;
    mainResult += '\n• Cut CAC in half:  $' + Math.round(halfCac) + '  (assumes same spend, better conversion)';
    mainResult += '\n• Double acquisition:  ' + newCustomers + ' → ' + doubledCust + ' customers at $' + Math.round(newCacAtDoubled) + '/customer';
    mainResult += '\n• Industry benchmark CAC:  SMB SaaS $100-300, mid-market $300-700, enterprise $700+';
    mainResult += '\n• Reduce spend 20%:  Same customers → $' + Math.round(cac * 0.8) + ' CAC (if conversion maintained)';
  } else {
    mainResult += '\n• ⚠️ Cannot model — enter marketing spend, sales spend, and new customers to see scenarios.';
  }

  // ⚖️ Break-Even (v3)
  if (avgRevenuePerCustomer > 0 && cac > 0) {
    const targetLtv = cac * 3; // 3:1 LTV:CAC benchmark
    const ltvNow = grossProfitPerCustomer * 12; // conservative 12-month LTV at current GR
    const ltvCacNow = ltvNow / cac;
    let beLine = '\n\n⚖️ Break-Even\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    if (ltvCacNow >= 3) {
      beLine += '\n• 🟢 LTV:CAC = ' + ltvCacNow.toFixed(1) + ':1 — already above the 3:1 break-even. Healthy to scale spend.';
    } else if (ltvCacNow >= 1) {
      beLine += '\n• 🟡 LTV:CAC = ' + ltvCacNow.toFixed(1) + ':1 — above 1:1 (not losing money) but below 3:1 ideal.';
      beLine += '\n• To reach 3:1 at current 12-mo LTV ($' + Math.round(ltvNow).toLocaleString() + '):  target CAC = $' + Math.round(targetLtv).toLocaleString();
    } else {
      beLine += '\n• 🔴 LTV:CAC = ' + ltvCacNow.toFixed(1) + ':1 — losing money per customer. Stop scaling spend until ratio ≥ 1:1.';
    }
    if (paybackMonths > 0) {
      beLine += '\n• Payback break-even:  ≤ 12 months. Your payback = ' + paybackMonths.toFixed(1) + ' mo.';
    }
    mainResult += beLine;
  }

  // 🎯 CAC Milestones (v3)
  if (cac > 0 && grossProfitPerCustomer > 0) {
    mainResult += '\n\n🎯 CAC Milestones\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    mainResult += '\n• ≤ 6 months payback:  CAC ≤ $' + Math.round(grossProfitPerCustomer * 6).toLocaleString();
    mainResult += '\n• ≤ 12 months payback:  CAC ≤ $' + Math.round(grossProfitPerCustomer * 12).toLocaleString();
    mainResult += '\n• ≤ 18 months payback:  CAC ≤ $' + Math.round(grossProfitPerCustomer * 18).toLocaleString();
    if (newCustomers > 0 && totalSpend > 0) {
      const targetCac = grossProfitPerCustomer * 12;
      const budgetFor100 = Math.round(targetCac * 100); // 100 customers at 12-mo payback
      mainResult += '\n• To acquire 100 customers at 12-mo payback:  budget $' + budgetFor100.toLocaleString();
    }
  }

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
  "mr6+='\\n\\uD83D\\uDCA1 Tip: Break down CAC by channel. You might have an overall CAC of $200, but LinkedIn ads might be $500/customer while SEO content might be $50/customer. Shift budget to your most efficient channels.';var results=[mr6];" +
  "var ss5=[{l:'Cut spend 50%',mk:ms*0.5,sk:ss*0.5},{l:'Cut spend 25%',mk:ms*0.75,sk:ss*0.75},{l:'Current',mk:ms,sk:ss},{l:'Increase spend 25%',mk:ms*1.25,sk:ss*1.25},{l:'Double spend',mk:ms*2,sk:ss*2}];" +
  "for(var i=0;i<ss5.length;i++){var st=ss5[i].mk+ss5[i].sk;var sc2=nc2>0&&ts>0?Math.round(nc2*(st/ts)):nc2;var cacS=sc2>0?st/sc2:0;var pbS=gpc>0?cacS/gpc:0;results.push(ss5[i].l+': $'+Math.round(st).toLocaleString()+' total spend, '+sc2+' customers, CAC '+fmt4(cacS)+(arc>0?', Payback '+pbS.toFixed(1)+' mo':''));}" +
  "if(arc>0&&cac2>0){var tl2=cac2*3;var ln2=gpc*12;var lcn2=ln2/cac2;var bl2='\\n\\n\\u2696\\uFE0F Break-Even\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501';if(lcn2>=3)bl2+='\\n\\u2022 \\uD83D\\uDFE2 LTV:CAC = '+lcn2.toFixed(1)+':1 \\u2014 already above the 3:1 break-even. Healthy to scale spend.';else if(lcn2>=1){bl2+='\\n\\u2022 \\uD83D\\uDFE1 LTV:CAC = '+lcn2.toFixed(1)+':1 \\u2014 above 1:1 (not losing money) but below 3:1 ideal.\\n\\u2022 To reach 3:1 at current 12-mo LTV ($'+Math.round(ln2).toLocaleString()+'):  target CAC = $'+Math.round(tl2).toLocaleString();}else bl2+='\\n\\u2022 \\uD83D\\uDD34 LTV:CAC = '+lcn2.toFixed(1)+':1 \\u2014 losing money per customer. Stop scaling spend until ratio \\u2265 1:1.';if(pbm>0)bl2+='\\n\\u2022 Payback break-even:  \\u2264 12 months. Your payback = '+pbm.toFixed(1)+' mo.';mr6+=bl2;}" +
  "if(cac2>0&&gpc>0){mr6+='\\n\\n\\uD83C\\uDFAF CAC Milestones\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501';mr6+='\\n\\u2022 \\u2264 6 months payback:  CAC \\u2264 $'+Math.round(gpc*6).toLocaleString();mr6+='\\n\\u2022 \\u2264 12 months payback:  CAC \\u2264 $'+Math.round(gpc*12).toLocaleString();mr6+='\\n\\u2022 \\u2264 18 months payback:  CAC \\u2264 $'+Math.round(gpc*18).toLocaleString();if(nc2>0&&ts>0){var tc3=gpc*12;var b4=Math.round(tc3*100);mr6+='\\n\\u2022 To acquire 100 customers at 12-mo payback:  budget $'+b4.toLocaleString();}}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-cac-calculator',
  title: 'CAC Calculator',
  description: 'Calculate your Customer Acquisition Cost and payback period. Compare different spend scenarios to find your most efficient acquisition budget.',
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
    '🎯 Customer Acquisition Cost (CAC)\n\n• Marketing Spend: $5,000 (62.5% of total)\n• Sales Spend: $3,000 (37.5% of total)\n• Total Acquisition Spend: $8,000\n• New Customers Acquired: 100\n\n━━━━━━━━━━━━━━━━━━━━\n\n📊 Key Results:\n\n• Customer Acquisition Cost (CAC): $80 per customer\n\n\n💡 Tip: Break down CAC by channel. You might have an overall CAC of $200, but LinkedIn ads might be $500/customer while SEO content might be $50/customer. Shift budget to your most efficient channels.\n\n🩺 CAC Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 CAC $80 is low. Healthy for SMB SaaS. Pair with LTV to confirm LTV:CAC > 3.\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Cut CAC in half:  $40  (assumes same spend, better conversion)\n• Double acquisition:  100 → 200 customers at $40/customer\n• Industry benchmark CAC:  SMB SaaS $100-300, mid-market $300-700, enterprise $700+\n• Reduce spend 20%:  Same customers → $64 CAC (if conversion maintained)\nCut spend 50%: $4,000 total spend, 50 customers, CAC $80\nCut spend 25%: $6,000 total spend, 75 customers, CAC $80\nCurrent: $8,000 total spend, 100 customers, CAC $80\nIncrease spend 25%: $10,000 total spend, 125 customers, CAC $80\nDouble spend: $16,000 total spend, 200 customers, CAC $80',
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
