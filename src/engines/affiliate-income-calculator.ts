import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateAffiliateIncome(inputs: Record<string, string>): string[] {
  const monthlyTraffic = parseFloat(inputs.monthlyTraffic) || 0;
  const conversionRate = parseFloat(inputs.conversionRate) || 0;
  const avgCommission = parseFloat(inputs.avgCommission) || 0;
  const monthlyCost = parseFloat(inputs.monthlyCost) || 0;
  const results: string[] = [];

  const monthlyConversions = monthlyTraffic * (conversionRate / 100);
  const monthlyIncome = monthlyConversions * avgCommission;
  const annualIncome = monthlyIncome * 12;
  const incomePerThousand = monthlyTraffic > 0 ? (monthlyIncome / monthlyTraffic) * 1000 : 0;
  const earningsPerVisitor = monthlyTraffic > 0 ? monthlyIncome / monthlyTraffic : 0;
  const netMonthly = monthlyIncome - monthlyCost;
  const breakEvenTraffic = earningsPerVisitor > 0 ? monthlyCost / earningsPerVisitor : 0;

  const fmt = (n: number) => '$' + n.toFixed(2);
  const fmt0 = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct2 = (n: number) => n.toFixed(2);
  const pct1 = (n: number) => n.toFixed(1);
  const loc = (n: number) => n.toLocaleString();

  const trafficLevels = [
    { label: '1K visitors/mo', val: 1000 },
    { label: '10K visitors/mo', val: 10000 },
    { label: '100K visitors/mo', val: 100000 },
    { label: '500K visitors/mo', val: 500000 },
    { label: '1M visitors/mo', val: 1000000 },
  ];

  results.push(
    '🔗 Affiliate Income Calculator\n\n' +
    '📊 Your Traffic & Conversions:\n' +
    '• Monthly Traffic:       ' + loc(monthlyTraffic) + ' visitors\n' +
    '• Conversion Rate:       ' + pct2(conversionRate) + '%\n' +
    '• Avg Commission:        ' + fmt(avgCommission) + '\n' +
    '• Monthly Conversions:   ' + loc(Math.round(monthlyConversions)) + ' sales\n' +
    '• Monthly Cost:          ' + fmt0(monthlyCost) + '  (hosting, tools, content)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Revenue Snapshot:\n' +
    '• Monthly Income:        ' + fmt0(monthlyIncome) + '/mo\n' +
    '• Annual Income:         ' + fmt0(annualIncome) + '/yr\n' +
    '• Per 1K Visitors:       ' + fmt(incomePerThousand) + '/1K  (EPC — earnings per click-adjacent)\n' +
    '• Earnings Per Visitor:  ' + '$' + earningsPerVisitor.toFixed(4) + '\n' +
    '• Net (after costs):     ' + fmt0(netMonthly) + '/mo  (margin ' + pct1(monthlyIncome > 0 ? (netMonthly / monthlyIncome) * 100 : 0) + '%)\n' +
    '• Annual Net:            ' + fmt0(netMonthly * 12) + '/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 CTR/EPC Funnel:\n' +
    '• Traffic Impressions:   ' + loc(monthlyTraffic) + '\n' +
    '• Conversions:           ' + loc(Math.round(monthlyConversions)) + '  (rate ' + pct2(conversionRate) + '%)\n' +
    '• Revenue per Click:     ' + (monthlyConversions > 0 ? fmt(monthlyIncome / monthlyConversions) : '$0') + '  (avg commission)\n' +
    '• Revenue per Visitor:   ' + '$' + earningsPerVisitor.toFixed(4) + '  (key efficiency metric)\n' +
    '• Annualized Visitors:   ' + loc(monthlyTraffic * 12) + '/yr\n' +
    '• Industry Benchmark:    CTR 1-3% | EPC $0.10-1.00 | Aff. sites $20-50/1K visitors\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Funnel Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (conversionRate > 3
      ? '• 🟢 CTR ' + pct2(conversionRate) + '% is strong (industry avg 1-3%).\n'
      : conversionRate >= 1
      ? '• 🟡 CTR ' + pct2(conversionRate) + '% is on industry average.\n'
      : conversionRate >= 0.5
      ? '• 🟠 CTR ' + pct2(conversionRate) + '% is below average — improve targeting.\n'
      : '• 🔴 CTR ' + pct2(conversionRate) + '% is weak — review offer-market fit.\n') +
    (incomePerThousand >= 50
      ? '• 🟢 EPC ' + fmt(incomePerThousand) + '/1K — top-quartile affiliate performance.\n'
      : incomePerThousand >= 20
      ? '• 🟡 EPC ' + fmt(incomePerThousand) + '/1K — solid performance.\n'
      : incomePerThousand >= 5
      ? '• 🟠 EPC ' + fmt(incomePerThousand) + '/1K — below average; optimize offers.\n'
      : monthlyTraffic > 0
      ? '• 🔴 EPC ' + fmt(incomePerThousand) + '/1K — very low; rethink affiliate programs.\n'
      : '') +
    (monthlyIncome > 0 && netMonthly > 0
      ? '• 🟢 Net margin ' + pct1((netMonthly / monthlyIncome) * 100) + '% after costs.\n'
      : monthlyCost > 0 && netMonthly <= 0
      ? '• 🔴 Costs exceed revenue — unprofitable. Cut costs or grow traffic.\n'
      : '') +
    '\n🎯 Scale Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Assuming ' + pct2(conversionRate) + '% CTR and ' + fmt(avgCommission) + ' commission:\n' +
    (() => {
      let out = '';
      for (const tl of trafficLevels) {
        const mc = tl.val * (conversionRate / 100);
        const mi = mc * avgCommission;
        out += '• ' + tl.label + ':  ' + fmt0(mi) + '/mo  ($' + fmt0(mi * 12) + '/yr)\n';
      }
      return out;
    })() +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even Traffic:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Costs/Month:           ' + fmt0(monthlyCost) + '\n' +
    '• Earnings/Visitor:      ' + '$' + earningsPerVisitor.toFixed(4) + '\n' +
    '• Break-Even Traffic:    ' + loc(Math.ceil(breakEvenTraffic)) + ' visitors/mo\n' +
    (monthlyTraffic >= breakEvenTraffic
      ? '• 🟢 Current traffic (' + loc(monthlyTraffic) + ') covers costs.\n'
      : '• 🔴 Need ' + loc(Math.ceil(breakEvenTraffic - monthlyTraffic)) + ' more visitors to break even.\n') +
    '• To Net $5K/mo:         ' + loc(Math.ceil((5000 + monthlyCost) / Math.max(earningsPerVisitor, 0.0001))) + ' visitors/mo\n' +
    '• To Net $10K/mo:        ' + loc(Math.ceil((10000 + monthlyCost) / Math.max(earningsPerVisitor, 0.0001))) + ' visitors/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise CTR 50%:  ' + fmt0(monthlyIncome * 1.5) + '/mo  (better targeting + landing page)\n' +
    '• Higher commission (+50%):  ' + fmt0(monthlyIncome * 1.5) + '/mo  (recurring SaaS programs)\n' +
    '• 2x traffic:  ' + fmt0(monthlyIncome * 2) + '/mo  (SEO + paid ads)\n' +
    '• All three combined:  ' + fmt0(monthlyIncome * 4.5) + '/mo  (max upside)\n' +
    '• Cut costs 50%:  Net ' + fmt0(netMonthly + monthlyCost * 0.5) + '/mo  (drop expensive tools)\n\n' +
    '💡 Tip: Conversion rate is the highest-leverage metric. A 1% CTR improvement at 50K visitors adds ' + fmt0(50000 * 0.01 * avgCommission) + '/mo with no extra traffic cost. Focus on review quality, comparison tables, and clear CTAs before scaling traffic.',
  );

  const tlArr = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  for (let i = 0; i < tlArr.length; i++) {
    const t = tlArr[i];
    const mc = t * (conversionRate / 100);
    const mi = mc * avgCommission;
    const ai = mi * 12;
    results.push(
      loc(t) + ' visitors/mo: ' + fmt(mi) + '/mo | ' + fmt0(ai) + '/yr | ' + loc(Math.round(mc)) + ' sales',
    );
  }

  return results;
}

const customFn =
  "var mt=parseFloat(inputs.monthlyTraffic)||0;" +
  "var cr=parseFloat(inputs.conversionRate)||0;" +
  "var ac=parseFloat(inputs.avgCommission)||0;" +
  "var mc2=parseFloat(inputs.monthlyCost)||0;" +
  "var mconv=mt*(cr/100);" +
  "var mi=mconv*ac;" +
  "var ai=mi*12;" +
  "var ipt=mt>0?(mi/mt)*1000:0;" +
  "var epv=mt>0?mi/mt:0;" +
  "var net=mi-mc2;" +
  "var bet=epv>0?mc2/epv:0;" +
  "function fmt(n){return '$'+n.toFixed(2)}" +
  "function fmt0(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct2(n){return n.toFixed(2)}" +
  "function pct1(n){return n.toFixed(1)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\uD83D\\uDD17 Affiliate Income Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCCA Your Traffic & Conversions:\\n';" +
  "r+='\\u2022 Monthly Traffic:       '+loc(mt)+' visitors\\n';" +
  "r+='\\u2022 Conversion Rate:       '+pct2(cr)+'%\\n';" +
  "r+='\\u2022 Avg Commission:        '+fmt(ac)+'\\n';" +
  "r+='\\u2022 Monthly Conversions:   '+loc(Math.round(mconv))+' sales\\n';" +
  "r+='\\u2022 Monthly Cost:          '+fmt0(mc2)+'  (hosting, tools, content)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Revenue Snapshot:\\n';" +
  "r+='\\u2022 Monthly Income:        '+fmt0(mi)+'/mo\\n';" +
  "r+='\\u2022 Annual Income:         '+fmt0(ai)+'/yr\\n';" +
  "r+='\\u2022 Per 1K Visitors:       '+fmt(ipt)+'/1K  (EPC \\u2014 earnings per click-adjacent)\\n';" +
  "r+='\\u2022 Earnings Per Visitor:  '+'$'+epv.toFixed(4)+'\\n';" +
  "r+='\\u2022 Net (after costs):     '+fmt0(net)+'/mo  (margin '+pct1(mi>0?(net/mi)*100:0)+'%)\\n';" +
  "r+='\\u2022 Annual Net:            '+fmt0(net*12)+'/yr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 CTR/EPC Funnel:\\n';" +
  "r+='\\u2022 Traffic Impressions:   '+loc(mt)+'\\n';" +
  "r+='\\u2022 Conversions:           '+loc(Math.round(mconv))+'  (rate '+pct2(cr)+'%)\\n';" +
  "r+='\\u2022 Revenue per Click:     '+(mconv>0?fmt(mi/mconv):'$0')+'  (avg commission)\\n';" +
  "r+='\\u2022 Revenue per Visitor:   '+'$'+epv.toFixed(4)+'  (key efficiency metric)\\n';" +
  "r+='\\u2022 Annualized Visitors:   '+loc(mt*12)+'/yr\\n';" +
  "r+='\\u2022 Industry Benchmark:    CTR 1-3% | EPC $0.10-1.00 | Aff. sites $20-50/1K visitors\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Funnel Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(cr>3){r+='\\u2022 \\uD83D\\uDFE2 CTR '+pct2(cr)+'% is strong (industry avg 1-3%).\\n';}" +
  "else if(cr>=1){r+='\\u2022 \\uD83D\\uDFE1 CTR '+pct2(cr)+'% is on industry average.\\n';}" +
  "else if(cr>=0.5){r+='\\u2022 \\uD83D\\uDFE0 CTR '+pct2(cr)+'% is below average \\u2014 improve targeting.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 CTR '+pct2(cr)+'% is weak \\u2014 review offer-market fit.\\n';}" +
  "if(ipt>=50){r+='\\u2022 \\uD83D\\uDFE2 EPC '+fmt(ipt)+'/1K \\u2014 top-quartile affiliate performance.\\n';}" +
  "else if(ipt>=20){r+='\\u2022 \\uD83D\\uDFE1 EPC '+fmt(ipt)+'/1K \\u2014 solid performance.\\n';}" +
  "else if(ipt>=5){r+='\\u2022 \\uD83D\\uDFE0 EPC '+fmt(ipt)+'/1K \\u2014 below average; optimize offers.\\n';}" +
  "else if(mt>0){r+='\\u2022 \\uD83D\\uDD34 EPC '+fmt(ipt)+'/1K \\u2014 very low; rethink affiliate programs.\\n';}" +
  "if(mi>0&&net>0){r+='\\u2022 \\uD83D\\uDFE2 Net margin '+pct1((net/mi)*100)+'% after costs.\\n';}" +
  "else if(mc2>0&&net<=0){r+='\\u2022 \\uD83D\\uDD34 Costs exceed revenue \\u2014 unprofitable. Cut costs or grow traffic.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF Scale Projection:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='Assuming '+pct2(cr)+'% CTR and '+fmt(ac)+' commission:\\n';" +
  "var tls=[{l:'1K visitors/mo',v:1000},{l:'10K visitors/mo',v:10000},{l:'100K visitors/mo',v:100000},{l:'500K visitors/mo',v:500000},{l:'1M visitors/mo',v:1000000}];" +
  "for(var i=0;i<tls.length;i++){" +
  "var mc3=tls[i].v*(cr/100);" +
  "var mi2=mc3*ac;" +
  "r+='\\u2022 '+tls[i].l+':  '+fmt0(mi2)+'/mo  ($'+fmt0(mi2*12)+'/yr)\\n';" +
  "}" +
  "r+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Break-Even Traffic:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Costs/Month:           '+fmt0(mc2)+'\\n';" +
  "r+='\\u2022 Earnings/Visitor:      '+'$'+epv.toFixed(4)+'\\n';" +
  "r+='\\u2022 Break-Even Traffic:    '+loc(Math.ceil(bet))+' visitors/mo\\n';" +
  "if(mt>=bet){r+='\\u2022 \\uD83D\\uDFE2 Current traffic ('+loc(mt)+') covers costs.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Need '+loc(Math.ceil(bet-mt))+' more visitors to break even.\\n';}" +
  "r+='\\u2022 To Net $5K/mo:         '+loc(Math.ceil((5000+mc2)/Math.max(epv,0.0001)))+' visitors/mo\\n';" +
  "r+='\\u2022 To Net $10K/mo:        '+loc(Math.ceil((10000+mc2)/Math.max(epv,0.0001)))+' visitors/mo\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise CTR 50%:  '+fmt0(mi*1.5)+'/mo  (better targeting + landing page)\\n';" +
  "r+='\\u2022 Higher commission (+50%):  '+fmt0(mi*1.5)+'/mo  (recurring SaaS programs)\\n';" +
  "r+='\\u2022 2x traffic:  '+fmt0(mi*2)+'/mo  (SEO + paid ads)\\n';" +
  "r+='\\u2022 All three combined:  '+fmt0(mi*4.5)+'/mo  (max upside)\\n';" +
  "r+='\\u2022 Cut costs 50%:  Net '+fmt0(net+mc2*0.5)+'/mo  (drop expensive tools)\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: Conversion rate is the highest-leverage metric. A 1% CTR improvement at 50K visitors adds '+fmt0(50000*0.01*ac)+'/mo with no extra traffic cost. Focus on review quality, comparison tables, and clear CTAs before scaling traffic.';" +
  "results.push(r);" +
  "var tla=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];" +
  "for(var i=0;i<tla.length;i++){" +
  "var t=tla[i];" +
  "var mc4=t*(cr/100);" +
  "var mi3=mc4*ac;" +
  "var ai2=mi3*12;" +
  "results.push(loc(t)+' visitors/mo: '+fmt(mi3)+'/mo | '+fmt0(ai2)+'/yr | '+loc(Math.round(mc4))+' sales');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-affiliate-income-calculator',
  title: 'Affiliate Income Calculator',
  description: 'Estimate your monthly and annual affiliate income based on traffic, conversion rate, and average commission. Includes CTR/EPC funnel, break-even traffic, and scale projections.',
  category: 'C',
  inputs: [
    { name: 'monthlyTraffic', label: 'Monthly Traffic (visitors)', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'conversionRate', label: 'Conversion Rate (%)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'avgCommission', label: 'Average Commission ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'monthlyCost', label: 'Monthly Costs ($)', placeholder: 'e.g. 200', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateAffiliateIncome(inputs);
  },
  staticExamples: [
    '🔗 Affiliate Income Calculator\n\n📊 Your Traffic & Conversions:\n• Monthly Traffic:       50,000 visitors\n• Conversion Rate:       2.00%\n• Avg Commission:        $50.00\n• Monthly Conversions:   1,000 sales\n• Monthly Cost:          $200  (hosting, tools, content)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Revenue Snapshot:\n• Monthly Income:        $50,000/mo\n• Annual Income:         $600,000/yr\n• Per 1K Visitors:       $1000.00/1K  (EPC — earnings per click-adjacent)\n• Earnings Per Visitor:  $1.0000\n• Net (after costs):     $49,800/mo  (margin 99.6%)\n• Annual Net:            $597,600/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 CTR/EPC Funnel:\n• Traffic Impressions:   50,000\n• Conversions:           1,000  (rate 2.00%)\n• Revenue per Click:     $50.00  (avg commission)\n• Revenue per Visitor:   $1.0000  (key efficiency metric)\n• Annualized Visitors:   600,000/yr\n• Industry Benchmark:    CTR 1-3% | EPC $0.10-1.00 | Aff. sites $20-50/1K visitors\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Funnel Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 CTR 2.00% is on industry average.\n• 🟢 EPC $1000.00/1K — top-quartile affiliate performance.\n• 🟢 Net margin 99.6% after costs.\n\n🎯 Scale Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAssuming 2.00% CTR and $50.00 commission:\n• 1K visitors/mo:  $1,000/mo  ($12,000/yr)\n• 10K visitors/mo:  $10,000/mo  ($120,000/yr)\n• 100K visitors/mo:  $100,000/mo  ($1,200,000/yr)\n• 500K visitors/mo:  $500,000/mo  ($6,000,000/yr)\n• 1M visitors/mo:  $1,000,000/mo  ($12,000,000/yr)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even Traffic:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Costs/Month:           $200\n• Earnings/Visitor:      $1.0000\n• Break-Even Traffic:    200 visitors/mo\n• 🟢 Current traffic (50,000) covers costs.\n• To Net $5K/mo:         5,200 visitors/mo\n• To Net $10K/mo:        10,200 visitors/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise CTR 50%:  $75,000/mo  (better targeting + landing page)\n• Higher commission (+50%):  $75,000/mo  (recurring SaaS programs)\n• 2x traffic:  $100,000/mo  (SEO + paid ads)\n• All three combined:  $225,000/mo  (max upside)\n• Cut costs 50%:  Net $49,900/mo  (drop expensive tools)\n\n💡 Tip: Conversion rate is the highest-leverage metric. A 1% CTR improvement at 50K visitors adds $25,000/mo with no extra traffic cost. Focus on review quality, comparison tables, and clear CTAs before scaling traffic.\n1,000 visitors/mo: $1000.00/mo | $12,000/yr | 20 sales\n5,000 visitors/mo: $5000.00/mo | $60,000/yr | 100 sales\n10,000 visitors/mo: $10000.00/mo | $120,000/yr | 200 sales\n25,000 visitors/mo: $25000.00/mo | $300,000/yr | 500 sales\n50,000 visitors/mo: $50000.00/mo | $600,000/yr | 1,000 sales\n100,000 visitors/mo: $100000.00/mo | $1,200,000/yr | 2,000 sales\n250,000 visitors/mo: $250000.00/mo | $3,000,000/yr | 5,000 sales\n500,000 visitors/mo: $500000.00/mo | $6,000,000/yr | 10,000 sales\n1,000,000 visitors/mo: $1000000.00/mo | $12,000,000/yr | 20,000 sales',
    '1,000 visitors/mo: $1,000.00/mo | $12,000/yr | 20 sales',
    '10,000 visitors/mo: $10,000.00/mo | $120,000/yr | 200 sales',
    '50,000 visitors/mo: $50,000.00/mo | $600,000/yr | 1,000 sales',
    '1,000,000 visitors/mo: $1,000,000.00/mo | $12,000,000/yr | 20,000 sales',
  ],
  faq: [
    { q: 'What is a good conversion rate for affiliate content?', a: 'For well-targeted review and comparison content, 1-5% is typical. Top-performing affiliate sites can reach 5-10%. If you are below 0.5%, your content likely is not matching purchase intent — revisit your keyword strategy and content format.' },
    { q: 'How can I increase my average commission?', a: 'Promote higher-ticket products, negotiate better rates with affiliate managers once you have volume, and look for recurring commission programs (SaaS tools often pay 20-30% recurring). Bundling complementary products in your content can also increase average order value.' },
    { q: 'How long does it take to build meaningful affiliate traffic?', a: 'Most affiliate sites take 12-18 months to reach 25K+ monthly visitors with consistent content production. Expect 6-12 months before seeing meaningful income. The key is publishing 2-4 high-quality, SEO-optimized posts per week consistently.' },
    { q: 'Which affiliate programs pay the most?', a: 'SaaS and software affiliate programs often pay the highest commissions (20-30% recurring). Premium hosting, online courses, and financial products also have high payouts. Amazon Associates has lower rates (1-10%) but converts easily due to brand trust.' },
    { q: 'Do I need a large email list for affiliate marketing?', a: 'Not necessarily. Most affiliate income comes from organic search traffic directly to your content. However, an email list lets you promote affiliate offers repeatedly without relying on new traffic. Build both channels — SEO for acquisition, email for retention and repeat promotions.' },
  ],
  howToUse: [
    'Enter your average monthly website traffic.',
    'Enter your affiliate link conversion rate (typically 1-5% for review content).',
    'Enter the average commission you earn per sale.',
    'Optionally enter monthly costs (hosting, tools, content production).',
    'Review your monthly and annual income projections plus earnings per visitor.',
    'See your break-even traffic and how many visitors you need for $5K/$10K net income.',
    'Scroll down to see income projections across 9 different traffic levels.',
  ],
};

registerEngine(engine);
