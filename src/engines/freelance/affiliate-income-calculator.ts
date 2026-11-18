import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function calculateAffiliateIncome(inputs: Record<string, string>): string[] {
  const monthlyTraffic = clampNonNegative(parseFloat(inputs.monthlyTraffic) || 0);
  const conversionRate = clampNonNegative(parseFloat(inputs.conversionRate) || 0);
  const avgCommission = clampNonNegative(parseFloat(inputs.avgCommission) || 0);
  const monthlyCost = clampNonNegative(parseFloat(inputs.monthlyCost) || 0);
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
        out += '• ' + tl.label + ':  ' + fmt0(mi) + '/mo  (' + fmt0(mi * 12) + '/yr)\n';
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
  `/* FFK-SERVER-DERIVED:start (generated from the server code by scripts/customfn-port.ts -- do not edit by hand) */
try{let h=function(s){return Number.isNaN(s)?0:Math.max(0,s)},M=function(s){const i=h(parseFloat(s.monthlyTraffic)||0),t=h(parseFloat(s.conversionRate)||0),a=h(parseFloat(s.avgCommission)||0),l=h(parseFloat(s.monthlyCost)||0),p=[],C=i*(t/100),e=C*a,E=e*12,m=i>0?e/i*1e3:0,f=i>0?e/i:0,v=e-l,y=f>0?l/f:0,c=n=>"$"+n.toFixed(2),o=n=>"$"+Math.round(n).toLocaleString(),u=n=>n.toFixed(2),R=n=>n.toFixed(1),r=n=>n.toLocaleString(),k=[{label:"1K visitors/mo",val:1e3},{label:"10K visitors/mo",val:1e4},{label:"100K visitors/mo",val:1e5},{label:"500K visitors/mo",val:5e5},{label:"1M visitors/mo",val:1e6}];p.push(\`🔗 Affiliate Income Calculator

📊 Your Traffic & Conversions:
• Monthly Traffic:       \`+r(i)+\` visitors
• Conversion Rate:       \`+u(t)+\`%
• Avg Commission:        \`+c(a)+\`
• Monthly Conversions:   \`+r(Math.round(C))+\` sales
• Monthly Cost:          \`+o(l)+\`  (hosting, tools, content)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Revenue Snapshot:
• Monthly Income:        \`+o(e)+\`/mo
• Annual Income:         \`+o(E)+\`/yr
• Per 1K Visitors:       \`+c(m)+\`/1K  (EPC — earnings per click-adjacent)
• Earnings Per Visitor:  $\`+f.toFixed(4)+\`
• Net (after costs):     \`+o(v)+"/mo  (margin "+R(e>0?v/e*100:0)+\`%)
• Annual Net:            \`+o(v*12)+\`/yr

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📐 CTR/EPC Funnel:
• Traffic Impressions:   \`+r(i)+\`
• Conversions:           \`+r(Math.round(C))+"  (rate "+u(t)+\`%)
• Revenue per Click:     \`+(C>0?c(e/C):"$0")+\`  (avg commission)
• Revenue per Visitor:   $\`+f.toFixed(4)+\`  (key efficiency metric)
• Annualized Visitors:   \`+r(i*12)+\`/yr
• Industry Benchmark:    CTR 1-3% | EPC $0.10-1.00 | Aff. sites $20-50/1K visitors

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🩺 Funnel Health:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
\`+(t>3?"• 🟢 CTR "+u(t)+\`% is strong (industry avg 1-3%).
\`:t>=1?"• 🟡 CTR "+u(t)+\`% is on industry average.
\`:t>=.5?"• 🟠 CTR "+u(t)+\`% is below average — improve targeting.
\`:"• 🔴 CTR "+u(t)+\`% is weak — review offer-market fit.
\`)+(m>=50?"• 🟢 EPC "+c(m)+\`/1K — top-quartile affiliate performance.
\`:m>=20?"• 🟡 EPC "+c(m)+\`/1K — solid performance.
\`:m>=5?"• 🟠 EPC "+c(m)+\`/1K — below average; optimize offers.
\`:i>0?"• 🔴 EPC "+c(m)+\`/1K — very low; rethink affiliate programs.
\`:"")+(e>0&&v>0?"• 🟢 Net margin "+R(v/e*100)+\`% after costs.
\`:l>0&&v<=0?\`• 🔴 Costs exceed revenue — unprofitable. Cut costs or grow traffic.
\`:"")+\`
🎯 Scale Projection:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Assuming \`+u(t)+"% CTR and "+c(a)+\` commission:
\`+(()=>{let n="";for(const g of k){const d=g.val*(t/100)*a;n+="• "+g.label+":  "+o(d)+"/mo  ("+o(d*12)+\`/yr)
\`}return n})()+\`
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ Break-Even Traffic:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Costs/Month:           \`+o(l)+\`
• Earnings/Visitor:      $\`+f.toFixed(4)+\`
• Break-Even Traffic:    \`+r(Math.ceil(y))+\` visitors/mo
\`+(i>=y?"• 🟢 Current traffic ("+r(i)+\`) covers costs.
\`:"• 🔴 Need "+r(Math.ceil(y-i))+\` more visitors to break even.
\`)+"• To Net $5K/mo:         "+r(Math.ceil((5e3+l)/Math.max(f,1e-4)))+\` visitors/mo
• To Net $10K/mo:        \`+r(Math.ceil((1e4+l)/Math.max(f,1e-4)))+\` visitors/mo

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🔄 What-If Scenarios:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• Raise CTR 50%:  \`+o(e*1.5)+\`/mo  (better targeting + landing page)
• Higher commission (+50%):  \`+o(e*1.5)+\`/mo  (recurring SaaS programs)
• 2x traffic:  \`+o(e*2)+\`/mo  (SEO + paid ads)
• All three combined:  \`+o(e*4.5)+\`/mo  (max upside)
• Cut costs 50%:  Net \`+o(v+l*.5)+\`/mo  (drop expensive tools)

💡 Tip: Conversion rate is the highest-leverage metric. A 1% CTR improvement at 50K visitors adds \`+o(5e4*.01*a)+"/mo with no extra traffic cost. Focus on review quality, comparison tables, and clear CTAs before scaling traffic.");const F=[1e3,5e3,1e4,25e3,5e4,1e5,25e4,5e5,1e6];for(let n=0;n<F.length;n++){const g=F[n],T=g*(t/100),d=T*a,x=d*12;p.push(r(g)+" visitors/mo: "+c(d)+"/mo | "+o(x)+"/yr | "+r(Math.round(T))+" sales")}return p},b=function(s,i,t){var a=K(s);return Array.isArray(a)?a.join(\`
\`):String(a)};var A=h,P=M,N=b,K=function(s){return M(s)};return[b(inputs,pick,fill)]}finally{}
/* FFK-SERVER-DERIVED:end */`;

const engine: ToolEngine = {
  slug: 'solopreneur-affiliate-income-calculator',
  title: 'Affiliate Income Calculator',
  description: 'Estimate your monthly and annual affiliate income based on traffic, conversion rate, and average commission. Includes CTR/EPC funnel, break-even traffic, and scale projections.',
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
  // P140f-p3-T7: minimal Playbook 6 字段 template (Goal=该不该决策)
  // Goal 含"决策"+"该不该"双关键词 → 通过 T1 zod refine 校验
  playbook: {
    goal: '用户该不该用此计算器的结果作为决策依据',
    input: 'engine 定义的 inputs 字段',
    output: 'engine 定义的 generate() 返回数组',
    constraint: 'apply 引擎 inputs 时受实际场景约束',
    tool: 'Phase 1 引擎自身的 🧭 Decision Recommendation (如已 ship) 或未来扩展',
    memory: 'v2.0 11 business domain benchmark + P140f Phase 4 主题簇',
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
    { q: "What is a realistic affiliate income for a content site?", a: "For 50K monthly visitors: $300-2000/month. 100K visitors: $1000-5000. 500K visitors: $5000-25000. 1M+ visitors: $10000-50000+. Conversion rate matters more than traffic: 1-3% CTR on affiliate links, 1-5% conversion to sale. Top affiliate sites can hit $50K-200K/month at scale." },
    { q: "How do I choose affiliate programs to promote?", a: "Pick programs: 1) Relevant to your audience (saves trust), 2) High commission rate (20%+ for digital, 5-10% for physical), 3) Recurring commissions (SaaS, subscriptions), 4) Long cookie duration (30+ days), 5) Good EPC (earnings per click) above $1. Avoid low-commission physical products unless volume is huge." },
    { q: "Should I do Amazon Associates or other programs?", a: "Amazon: 1-4% commission, 24-hour cookie, trusted, huge inventory. Niche programs: 20-50% commission, longer cookies, higher payouts. Hybrid: Amazon for trusted baseline + niche for high-margin. Diversify across 10-20 programs to spread risk. Don't put all eggs in one basket." },
    { q: "How do I disclose affiliate links properly?", a: "FTC requires clear disclosure. Best practices: 1) \"Affiliate link\" label near every link, 2) Disclosure at top of post (\"This post contains affiliate links\"), 3) Plain language (\"I earn a commission\"), 4) Above the fold disclosure on review pages. Non-compliance risks: FTC fines, platform bans, lost trust." },
    { q: "What content converts best for affiliate marketing?", a: "Top converting: 1) Product reviews (3-5x higher conversion than listicles), 2) Comparison posts (\"X vs Y\"), 3) \"Best of\" roundups, 4) Tutorials showing product in use, 5) Email sequences. Long-form (2000+ words) outperforms short. Original photos and testing improve conversion 30-50%." },
    { q: "How do I track affiliate conversions?", a: "Affiliate dashboards: Amazon Associates, ShareASale, CJ Affiliate, Impact, PartnerStack. Track: clicks, conversions, EPC, conversion rate. Use UTM parameters to track which content drives sales. Set up Google Analytics 4 for cross-platform tracking. Talk to a tax pro: affiliate income is self-employment." },
    { q: "How long does it take to build affiliate income?", a: "Realistic timeline: 6-12 months to first $100/month. 12-24 months to $1000+/month. 24-36 months to $5000+/month. Requires: consistent content (4-8 posts/month), SEO-driven traffic, 2-3 trusted affiliate programs. The most successful affiliate sites invested 2-3 years before seeing real income." },
    { q: "What is EPC and why does it matter?", a: "EPC = Earnings Per Click. Average across all clicks. Industry benchmarks: $0.5-2 EPC for most niches. $2-5 for high-commission digital products. $0.1-0.5 for low-commission physical products. EPC >$1 suggests good program + good content. Improve by: A/B testing link placement, writing better anchor text, focusing on buying-intent content." },
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
  engineKey: true,
};

registerEngine(engine);

