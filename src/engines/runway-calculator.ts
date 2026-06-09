import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateRunway(inputs: Record<string, string>): string[] {
  const cashOnHand = parseFloat(inputs.cashOnHand) || 0;
  const monthlyBurn = parseFloat(inputs.monthlyBurn) || 0;
  const monthlyRevenue = parseFloat(inputs.monthlyRevenue) || 0;
  const results: string[] = [];

  const netBurn = monthlyBurn - monthlyRevenue;
  const monthsOfRunway = netBurn > 0 ? cashOnHand / netBurn : Infinity;
  const burnMultiple = monthlyRevenue > 0 ? netBurn / monthlyRevenue : (netBurn > 0 ? Infinity : 0);

  const now = new Date();
  let runOutDate = '';
  if (netBurn <= 0) {
    runOutDate = 'Never — you are cash-flow positive or break-even';
  } else if (!isFinite(monthsOfRunway)) {
    runOutDate = 'Cannot determine';
  } else {
    const runOut = new Date(now.getTime() + monthsOfRunway * 30.437 * 24 * 60 * 60 * 1000);
    runOutDate = runOut.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const loc = (n: number) => n.toLocaleString();

  let mainResult =
    '\\uD83D\\uDE80 Runway Analysis\\n\\n' +
    '\\u2022 Cash on Hand: ' + fmt(cashOnHand) + '\\n' +
    '\\u2022 Monthly Burn: ' + fmt(monthlyBurn) + '\\n' +
    '\\u2022 Monthly Revenue: ' + fmt(monthlyRevenue) + '\\n' +
    '\\u2022 Net Monthly Burn: ' + fmt(netBurn) + '\\n' +
    '\\u2022 Burn Multiple: ' + (isFinite(burnMultiple) ? burnMultiple.toFixed(2) + 'x' : 'N/A') + '\\n\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

  if (netBurn <= 0) {
    mainResult += '\\uD83C\\uDF89 You are cash-flow positive! Your revenue covers your burn. Focus on growth.\\n\\n';
    mainResult += '\\u2022 Months of Runway: Unlimited (profitable)\\n';
    mainResult += '\\u2022 Cash Run-out Date: Never\\n';
  } else if (!isFinite(monthsOfRunway)) {
    mainResult += '\\u26A0\\uFE0F Your burn rate is zero — check your inputs.\\n';
  } else {
    mainResult += '\\u2022 Months of Runway: ' + monthsOfRunway.toFixed(1) + ' months\\n';
    mainResult += '\\u2022 Cash Run-out Date: ' + runOutDate + '\\n\\n';
    if (monthsOfRunway < 3) {
      mainResult += '\\uD83D\\uDD34 CRITICAL: Less than 3 months of runway. Raise funds or cut costs immediately.\\n';
    } else if (monthsOfRunway < 6) {
      mainResult += '\\uD83D\\uDFE1 WARNING: 3-6 months of runway. Start fundraising conversations now.\\n';
    } else if (monthsOfRunway < 12) {
      mainResult += '\\uD83D\\uDFE2 CAUTION: 6-12 months of runway. You have time but should plan ahead.\\n';
    } else if (monthsOfRunway < 18) {
      mainResult += '\\uD83D\\uDFE2 HEALTHY: 12-18 months of runway — the standard VC recommendation.\\n';
    } else {
      mainResult += '\\uD83D\\uDFE2 STRONG: 18+ months of runway. You have ample time to experiment and grow.\\n';
    }
  }

  mainResult += '\\n\\uD83D\\uDCA1 Tip: Aim for 18-24 months of runway after each fundraise. This gives you enough time to hit the next milestone before needing to raise again.';

  results.push(mainResult);

  // 5 comparison scenarios at different burn rates
  const burnScenarios = [
    { label: 'Reduce burn 10%', multiplier: 0.9 },
    { label: 'Reduce burn 25%', multiplier: 0.75 },
    { label: 'Reduce burn 50%', multiplier: 0.5 },
    { label: 'Increase burn 10%', multiplier: 1.1 },
    { label: 'Increase burn 25%', multiplier: 1.25 },
  ];

  for (let i = 0; i < burnScenarios.length; i++) {
    const adjBurn = monthlyBurn * burnScenarios[i].multiplier;
    const adjNet = adjBurn - monthlyRevenue;
    const adjRunway = adjNet > 0 ? cashOnHand / adjNet : Infinity;
    const monthsStr = adjNet <= 0 ? 'Infinite (profitable)' : (isFinite(adjRunway) ? adjRunway.toFixed(1) + ' months' : 'N/A');
    results.push(
      burnScenarios[i].label + ': Burn ' + fmt(adjBurn) + '/mo \\u2192 ' + monthsStr + ' of runway',
    );
  }

  return results;
}

const customFn =
  "var coh=parseFloat(inputs.cashOnHand)||0;" +
  "var mb=parseFloat(inputs.monthlyBurn)||0;" +
  "var mr=parseFloat(inputs.monthlyRevenue)||0;" +
  "var nb=mb-mr;" +
  "var runway=nb>0?coh/nb:Infinity;" +
  "var bm=mr>0?nb/mr:(nb>0?Infinity:0);" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "var now=new Date();" +
  "var rod='';" +
  "if(nb<=0){rod='Never \\u2014 you are cash-flow positive or break-even';}" +
  "else if(!isFinite(runway)){rod='Cannot determine';}" +
  "else{var ro=new Date(now.getTime()+runway*30.437*86400000);rod=ro.toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'});}" +
  "var mr1='';" +
  "mr1+='\\uD83D\\uDE80 Runway Analysis\\n\\n';" +
  "mr1+='\\u2022 Cash on Hand: '+fmt(coh)+'\\n';" +
  "mr1+='\\u2022 Monthly Burn: '+fmt(mb)+'\\n';" +
  "mr1+='\\u2022 Monthly Revenue: '+fmt(mr)+'\\n';" +
  "mr1+='\\u2022 Net Monthly Burn: '+fmt(nb)+'\\n';" +
  "mr1+='\\u2022 Burn Multiple: '+(isFinite(bm)?bm.toFixed(2)+'x':'N/A')+'\\n\\n';" +
  "mr1+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "if(nb<=0){mr1+='\\uD83C\\uDF89 You are cash-flow positive! Your revenue covers your burn. Focus on growth.\\n\\n';mr1+='\\u2022 Months of Runway: Unlimited (profitable)\\n';mr1+='\\u2022 Cash Run-out Date: Never\\n';}" +
  "else if(!isFinite(runway)){mr1+='\\u26A0\\uFE0F Your burn rate is zero \\u2014 check your inputs.\\n';}" +
  "else{mr1+='\\u2022 Months of Runway: '+runway.toFixed(1)+' months\\n';mr1+='\\u2022 Cash Run-out Date: '+rod+'\\n\\n';" +
  "if(runway<3)mr1+='\\uD83D\\uDD34 CRITICAL: Less than 3 months of runway. Raise funds or cut costs immediately.\\n';" +
  "else if(runway<6)mr1+='\\uD83D\\uDFE1 WARNING: 3-6 months of runway. Start fundraising conversations now.\\n';" +
  "else if(runway<12)mr1+='\\uD83D\\uDFE2 CAUTION: 6-12 months of runway. You have time but should plan ahead.\\n';" +
  "else if(runway<18)mr1+='\\uD83D\\uDFE2 HEALTHY: 12-18 months of runway \\u2014 the standard VC recommendation.\\n';" +
  "else mr1+='\\uD83D\\uDFE2 STRONG: 18+ months of runway. You have ample time to experiment and grow.\\n';}" +
  "mr1+='\\n\\uD83D\\uDCA1 Tip: Aim for 18-24 months of runway after each fundraise. This gives you enough time to hit the next milestone before needing to raise again.';" +
  "var results=[mr1];" +
  "var bs=[{l:'Reduce burn 10%',m:0.9},{l:'Reduce burn 25%',m:0.75},{l:'Reduce burn 50%',m:0.5},{l:'Increase burn 10%',m:1.1},{l:'Increase burn 25%',m:1.25}];" +
  "for(var i=0;i<bs.length;i++){var ab=mb*bs[i].m;var an=ab-mr;var ar=an>0?coh/an:Infinity;var ams=an<=0?'Infinite (profitable)':(isFinite(ar)?ar.toFixed(1)+' months':'N/A');results.push(bs[i].l+': Burn '+fmt(ab)+'/mo \\u2192 '+ams+' of runway');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-runway-calculator',
  title: 'Runway Calculator',
  description: 'Calculate how many months your startup can survive at current burn rate. Compare scenarios by adjusting burn rates to extend your runway.',
  category: 'A',
  inputs: [
    { name: 'cashOnHand', label: 'Cash on Hand ($)', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'monthlyBurn', label: 'Monthly Burn Rate ($)', placeholder: 'e.g. 15000', type: 'number' },
    { name: 'monthlyRevenue', label: 'Monthly Revenue ($)', placeholder: 'e.g. 3000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateRunway(inputs);
  },
  staticExamples: [
    '🚀 Runway Analysis\n\n• Cash on Hand: $50,000\n• Monthly Burn: $15,000\n• Monthly Revenue: $3,000\n• Net Monthly Burn: $12,000\n• Burn Multiple: 4.00x\n\n━━━━━━━━━━━━━━━━━━━━\n\n• Months of Runway: 4.2 months\n• Cash Run-out Date: October 15, 2026\n\n🟡 WARNING: 3-6 months of runway. Start fundraising conversations now.\n\n💡 Tip: Aim for 18-24 months of runway after each fundraise. This gives you enough time to hit the next milestone before needing to raise again.',
    'Reduce burn 10%: Burn $13,500/mo → 5.2 months of runway',
    'Reduce burn 25%: Burn $11,250/mo → 7.1 months of runway',
    'Reduce burn 50%: Burn $7,500/mo → 16.7 months of runway',
    'Increase burn 10%: Burn $16,500/mo → 3.5 months of runway',
  ],
  faq: [
    { q: 'What is a good runway for a startup?', a: 'Most VCs recommend 18-24 months of runway after each funding round. This gives you enough time to hit milestones for the next round without being under immediate pressure. For bootstrapped solopreneurs, 6-12 months is a reasonable minimum — but more is always better.' },
    { q: 'What is a burn multiple and why does it matter?', a: 'Burn multiple = net burn / net new ARR. A burn multiple under 1.0x is excellent, 1.0-1.5x is good, and above 2.0x is concerning. It measures how efficiently you turn cash into growth. Investors scrutinize this metric heavily.' },
    { q: 'How can I extend my runway without raising money?', a: 'Three ways: (1) Cut costs — audit every subscription and tool, negotiate with vendors. (2) Increase revenue — raise prices, upsell existing customers, launch a new pricing tier. (3) Improve cash collection — switch to annual billing, shorten payment terms, offer discounts for upfront payments.' },
    { q: 'Should I include my own salary in the burn rate?', a: 'Yes. Your burn rate should include ALL operating expenses: salaries (including your own), rent, SaaS tools, marketing, legal, and a 10-15% buffer for unexpected costs. Underestimating burn is one of the most common reasons startups run out of cash.' },
    { q: 'What if my revenue covers my burn?', a: 'If you are cash-flow positive, congratulations! You have effectively infinite runway. At this stage, reinvest profits into growth to compound faster. Consider hiring, increasing marketing spend, or building a cash buffer for strategic opportunities.' },
  ],
  howToUse: [
    'Enter your total cash on hand (bank balance + accessible funds).',
    'Enter your total monthly burn rate (all operating expenses).',
    'Enter your current monthly revenue (if any).',
    'Review your runway in months and the exact date your cash runs out.',
    'Check the burn multiple to see how efficiently you are using cash.',
    'Scroll down to see 5 comparison scenarios with adjusted burn rates.',
  ],
};

registerEngine(engine);
