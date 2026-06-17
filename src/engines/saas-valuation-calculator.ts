import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateValuation(inputs: Record<string, string>): string[] {
  const annualRevenue = parseFloat(inputs.annualRevenue) || 0;
  const growthRate = parseFloat(inputs.growthRate) || 0;
  const profitMargin = parseFloat(inputs.profitMargin) || 0;
  const results: string[] = [];

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';

  // Determine multiple range based on growth rate and profit margin
  let lowMultiple = 3;
  let highMultiple = 8;
  let baseMultiple = 5;

  if (growthRate >= 100) { lowMultiple = 8; highMultiple = 15; baseMultiple = 10; }
  else if (growthRate >= 50) { lowMultiple = 6; highMultiple = 12; baseMultiple = 8; }
  else if (growthRate >= 30) { lowMultiple = 5; highMultiple = 10; baseMultiple = 7; }
  else if (growthRate >= 10) { lowMultiple = 4; highMultiple = 8; baseMultiple = 5.5; }

  if (profitMargin >= 30) { lowMultiple += 1; highMultiple += 1; baseMultiple += 0.5; }
  else if (profitMargin < 10 && profitMargin > 0) { lowMultiple = Math.max(2, lowMultiple - 1); highMultiple = Math.max(3, highMultiple - 2); baseMultiple = Math.max(2.5, baseMultiple - 1); }

  const valuationLow = annualRevenue * lowMultiple;
  const valuationHigh = annualRevenue * highMultiple;
  const valuationBase = annualRevenue * baseMultiple;
  const profit = annualRevenue * (profitMargin / 100);
  const exitValue = profit > 0 ? profit * baseMultiple * 1.5 : valuationBase;

  let mainResult =
    '\\uD83D\\uDCB0 SaaS Valuation Estimate\\n\\n' +
    '\\u2022 Annual Revenue (ARR): ' + fmt(annualRevenue) + '\\n' +
    '\\u2022 YoY Growth Rate: ' + pct(growthRate) + '\\n' +
    '\\u2022 Profit Margin: ' + pct(profitMargin) + '\\n' +
    '\\u2022 Annual Profit: ' + fmt(profit) + '\\n\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n' +
    '\\uD83D\\uDCCA Valuation Range (Revenue Multiple):\\n\\n' +
    '\\u2022 Conservative (' + lowMultiple.toFixed(1) + 'x): ' + fmt(valuationLow) + '\\n' +
    '\\u2022 Base Case (' + baseMultiple.toFixed(1) + 'x): ' + fmt(valuationBase) + '\\n' +
    '\\u2022 Optimistic (' + highMultiple.toFixed(1) + 'x): ' + fmt(valuationHigh) + '\\n\\n' +
    '\\u2022 Estimated Exit Value: ' + fmt(exitValue) + '\\n\\n' +
    '\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';

  if (growthRate >= 50) {
    mainResult += '\\uD83D\\uDE80 You have high-growth SaaS metrics. Your multiple range reflects the premium that high-growth companies command. Focus on sustaining growth while improving margins.\\n\\n';
  } else if (growthRate >= 20) {
    mainResult += '\\uD83D\\uDCC8 Solid growth trajectory. Improving your growth rate from ' + pct(growthRate) + ' to 30%+ could increase your valuation multiple by 2-3x.\\n\\n';
  } else {
    mainResult += '\\uD83D\\uDCAA Steady business. To increase valuation, focus on either accelerating growth or improving profit margins above 20%. Higher margins directly increase your multiple.\\n\\n';
  }

  mainResult += '\\uD83D\\uDCA1 Tip: SaaS companies typically sell for 3-10x ARR. Growth rate is the #1 driver of multiples. A company growing 100% YoY can command 10-20x, while a flat company might sell for 2-3x. Profitability matters too — profitable SaaS companies get 1-3x premium.';

  // 🔄 What-If Scenarios
  if (annualRevenue > 0) {
    const raisedGrowth = Math.min(150, growthRate + 30);
    const raisedMult = raisedGrowth >= 100 ? 10 : raisedGrowth >= 50 ? 8 : raisedGrowth >= 30 ? 7 : 5.5;
    const raisedVal = annualRevenue * raisedMult;
    const raisedProfit = profitMargin + 10;
    const profitMult = baseMultiple + (raisedProfit >= 30 ? 0.5 : 0);
    const profitVal = annualRevenue * profitMult;
    mainResult += '\\n\\n\\uD83D\\uDD04 What-If Scenarios\\n';
    mainResult += '\\u2022 If growth \\u2192 ' + raisedGrowth.toFixed(0) + '% YoY:  multiple ' + raisedMult.toFixed(1) + 'x  \\u2192 $' + Math.round(raisedVal).toLocaleString() + ' (vs $' + Math.round(valuationBase).toLocaleString() + ')\\n';
    mainResult += '\\u2022 If margin \\u2192 ' + raisedProfit.toFixed(0) + '%:  multiple ' + profitMult.toFixed(1) + 'x  \\u2192 $' + Math.round(profitVal).toLocaleString() + '\\n';
    mainResult += '\\u2022 Distress floor (2x):  $' + Math.round(annualRevenue * 2).toLocaleString() + '  (asset-only sale)\\n';
  }

  results.push(mainResult);

  // 5 comparison scenarios at different multiples
  const multipleScenarios = [
    { label: 'Distressed Sale (2x)', multiple: 2 },
    { label: 'Flat Growth (4x)', multiple: 4 },
    { label: 'Steady Growth (6x)', multiple: 6 },
    { label: 'High Growth (10x)', multiple: 10 },
    { label: 'Hyper-Growth (15x)', multiple: 15 },
  ];

  for (let i = 0; i < multipleScenarios.length; i++) {
    const val = annualRevenue * multipleScenarios[i].multiple;
    results.push(
      multipleScenarios[i].label + ': ' + fmt(annualRevenue) + ' ARR \\u00d7 ' +
      multipleScenarios[i].multiple + 'x = ' + fmt(val) + ' valuation',
    );
  }

  return results;
}

const customFn =
  "var ar2=parseFloat(inputs.annualRevenue)||0;" +
  "var gr2=parseFloat(inputs.growthRate)||0;" +
  "var pm=parseFloat(inputs.profitMargin)||0;" +
  "function fmt2(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct2(n){return n.toFixed(1)+'%'}" +
  "var lm=3;var hm=8;var bm=5;" +
  "if(gr2>=100){lm=8;hm=15;bm=10;}" +
  "else if(gr2>=50){lm=6;hm=12;bm=8;}" +
  "else if(gr2>=30){lm=5;hm=10;bm=7;}" +
  "else if(gr2>=10){lm=4;hm=8;bm=5.5;}" +
  "if(pm>=30){lm+=1;hm+=1;bm+=0.5;}" +
  "else if(pm<10&&pm>0){lm=Math.max(2,lm-1);hm=Math.max(3,hm-2);bm=Math.max(2.5,bm-1);}" +
  "var vl=ar2*lm;var vh=ar2*hm;var vb=ar2*bm;" +
  "var profit=ar2*(pm/100);" +
  "var ev=profit>0?profit*bm*1.5:vb;" +
  "var mr4='';" +
  "mr4+='\\uD83D\\uDCB0 SaaS Valuation Estimate\\n\\n';" +
  "mr4+='\\u2022 Annual Revenue (ARR): '+fmt2(ar2)+'\\n';" +
  "mr4+='\\u2022 YoY Growth Rate: '+pct2(gr2)+'\\n';" +
  "mr4+='\\u2022 Profit Margin: '+pct2(pm)+'\\n';" +
  "mr4+='\\u2022 Annual Profit: '+fmt2(profit)+'\\n\\n';" +
  "mr4+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "mr4+='\\uD83D\\uDCCA Valuation Range (Revenue Multiple):\\n\\n';" +
  "mr4+='\\u2022 Conservative ('+lm.toFixed(1)+'x): '+fmt2(vl)+'\\n';" +
  "mr4+='\\u2022 Base Case ('+bm.toFixed(1)+'x): '+fmt2(vb)+'\\n';" +
  "mr4+='\\u2022 Optimistic ('+hm.toFixed(1)+'x): '+fmt2(vh)+'\\n\\n';" +
  "mr4+='\\u2022 Estimated Exit Value: '+fmt2(ev)+'\\n\\n';" +
  "mr4+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "if(gr2>=50)mr4+='\\uD83D\\uDE80 You have high-growth SaaS metrics. Your multiple range reflects the premium that high-growth companies command. Focus on sustaining growth while improving margins.\\n\\n';" +
  "else if(gr2>=20)mr4+='\\uD83D\\uDCC8 Solid growth trajectory. Improving your growth rate from '+pct2(gr2)+' to 30%+ could increase your valuation multiple by 2-3x.\\n\\n';" +
  "else mr4+='\\uD83D\\uDCAA Steady business. To increase valuation, focus on either accelerating growth or improving profit margins above 20%. Higher margins directly increase your multiple.\\n\\n';" +
  "mr4+='\\uD83D\\uDCA1 Tip: SaaS companies typically sell for 3-10x ARR. Growth rate is the #1 driver of multiples. A company growing 100% YoY can command 10-20x, while a flat company might sell for 2-3x. Profitability matters too \\u2014 profitable SaaS companies get 1-3x premium.';" +
  "if(ar2>0){" +
  "var rg=Math.min(150,gr2+30);" +
  "var rm=rg>=100?10:rg>=50?8:rg>=30?7:5.5;" +
  "var rv=ar2*rm;" +
  "var rp=pm+10;var pm2=bm2+(rp>=30?0.5:0);var pv=ar2*pm2;" +
  "mr4+='\\n\\n\\uD83D\\uDD04 What-If Scenarios\\n';" +
  "mr4+='\\u2022 If growth \\u2192 '+rg.toFixed(0)+'% YoY:  multiple '+rm.toFixed(1)+'x  \\u2192 $'+Math.round(rv).toLocaleString()+' (vs $'+Math.round(valuationBase).toLocaleString()+')\\n';" +
  "mr4+='\\u2022 If margin \\u2192 '+rp.toFixed(0)+'%:  multiple '+pm2.toFixed(1)+'x  \\u2192 $'+Math.round(pv).toLocaleString()+'\\n';" +
  "mr4+='\\u2022 Distress floor (2x):  $'+Math.round(ar2*2).toLocaleString()+'  (asset-only sale)\\n';" +
  "}" +
  "var results=[mr4];" +
  "var ms=[{l:'Distressed Sale (2x)',m:2},{l:'Flat Growth (4x)',m:4},{l:'Steady Growth (6x)',m:6},{l:'High Growth (10x)',m:10},{l:'Hyper-Growth (15x)',m:15}];" +
  "for(var i=0;i<ms.length;i++){var val=ar2*ms[i].m;results.push(ms[i].l+': '+fmt2(ar2)+' ARR \\u00d7 '+ms[i].m+'x = '+fmt2(val)+' valuation');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-saas-valuation-calculator',
  title: 'SaaS Valuation Calculator',
  description: 'Estimate your SaaS company valuation based on ARR, growth rate, and profit margin. See how different multiples and scenarios affect your exit value.',
  category: 'B',
  inputs: [
    { name: 'annualRevenue', label: 'Annual Revenue / ARR ($)', placeholder: 'e.g. 200000', type: 'number' },
    { name: 'growthRate', label: 'YoY Growth Rate (%)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'profitMargin', label: 'Profit Margin (%)', placeholder: 'e.g. 25', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateValuation(inputs);
  },
  staticExamples: [
    '💰 SaaS Valuation Estimate\n\n• Annual Revenue (ARR): $200,000\n• YoY Growth Rate: 50.0%\n• Profit Margin: 25.0%\n• Annual Profit: $50,000\n\n📊 Valuation Range (Revenue Multiple):\n\n• Conservative (6.0x): $1,200,000\n• Base Case (8.0x): $1,600,000\n• Optimistic (12.0x): $2,400,000\n\n• Estimated Exit Value: $600,000\n\n🚀 You have high-growth SaaS metrics. Your multiple range reflects the premium that high-growth companies command. Focus on sustaining growth while improving margins.\n',
    'Distressed Sale (2x): $200,000 ARR × 2x = $400,000 valuation',
    'Flat Growth (4x): $200,000 ARR × 4x = $800,000 valuation',
    'Steady Growth (6x): $200,000 ARR × 6x = $1,200,000 valuation',
    'High Growth (10x): $200,000 ARR × 10x = $2,000,000 valuation',
  ],
  faq: [
    { q: 'How are SaaS companies valued?', a: 'SaaS companies are typically valued on a revenue multiple basis, usually 3-10x ARR. The exact multiple depends primarily on growth rate (the #1 driver), followed by profit margin, market size, churn rate, and competitive moat. Public SaaS companies trade at 5-15x revenue on average.' },
    { q: 'What is the Rule of 40 in SaaS valuation?', a: 'The Rule of 40 states that your growth rate + profit margin should equal 40% or more. If you are growing 60% and have a -20% margin, your score is 40 — you pass. If you are growing 15% with a 30% margin, your score is 45 — you also pass. Companies above 40 command premium multiples.' },
    { q: 'Does profitability matter for SaaS valuation?', a: 'Yes, increasingly so. From 2022 onward, the market shifted from "growth at all costs" to "efficient growth." Profitable SaaS companies now command 1-3x higher revenue multiples than unprofitable ones. Aim for at least 10-20% profit margins to maximize your multiple.' },
    { q: 'What is my SaaS actually worth to a buyer?', a: 'Valuation is theoretical — what matters is what someone will pay. For solopreneur SaaS businesses under $1M ARR, expect 2-4x SDE (Seller Discretionary Earnings), not ARR multiples. Marketplaces like Acquire.com and MicroAcquire show real transaction data. Most micro-SaaS sells for 2.5-3.5x annual profit.' },
    { q: 'How can I increase my SaaS valuation?', a: 'Focus on four levers: (1) Accelerate growth — even 10% improvement in growth rate can add 1-2x to your multiple. (2) Improve profit margins — cut costs, raise prices. (3) Reduce churn — lower churn means more predictable revenue. (4) Diversify revenue — multiple customer segments or products reduce buyer risk and increase multiples.' },
  ],
  howToUse: [
    'Enter your annual recurring revenue (ARR).',
    'Enter your year-over-year growth rate as a percentage.',
    'Enter your profit margin as a percentage.',
    'Review your valuation range: conservative, base case, and optimistic.',
    'Check your estimated exit value based on your profit and growth.',
    'Scroll down to see 5 valuation scenarios at different revenue multiples.',
  ],
};

registerEngine(engine);
