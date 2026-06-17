import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateAffiliateIncome(inputs: Record<string, string>): string[] {
  const monthlyTraffic = parseFloat(inputs.monthlyTraffic) || 0;
  const conversionRate = parseFloat(inputs.conversionRate) || 0;
  const avgCommission = parseFloat(inputs.avgCommission) || 0;
  const results: string[] = [];

  const monthlyConversions = monthlyTraffic * (conversionRate / 100);
  const monthlyIncome = monthlyConversions * avgCommission;
  const annualIncome = monthlyIncome * 12;
  const incomePerThousand = monthlyTraffic > 0 ? (monthlyIncome / monthlyTraffic) * 1000 : 0;

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  let assessment: string;
  if (monthlyIncome >= 10000) {
    assessment = '🚀 Full-time affiliate income! $' + loc(Math.round(monthlyIncome)) + '/mo is a sustainable business. Diversify your traffic sources and affiliate programs to protect this income.';
  } else if (monthlyIncome >= 3000) {
    assessment = '✅ Solid side income. $' + loc(Math.round(monthlyIncome)) + '/mo covers major expenses. With continued traffic growth, this can become full-time income within 6-12 months.';
  } else if (monthlyIncome >= 1000) {
    assessment = '📈 Growing steadily. $' + loc(Math.round(monthlyIncome)) + '/mo is a great start. Focus on improving one metric at a time — traffic, conversion rate, or commission value.';
  } else if (monthlyIncome >= 100) {
    assessment = '🌱 Early stage. You are earning but not yet at meaningful scale. Double down on content production and SEO to grow traffic 10x.';
  } else {
    assessment = '🔰 Just starting. Build your content foundation first — income will follow traffic. Aim for 10,000 monthly visitors as your first milestone.';
  }

  results.push(
    '🔗 Affiliate Income Calculator\n\n' +
    '' +
    '📊 Your Traffic & Conversions\n' +
    '\n' +
    '• Monthly Traffic:              ' + loc(monthlyTraffic) + ' visitors\n' +
    '• Conversion Rate:           ' + conversionRate + '%\n' +
    '• Avg Commission:          $' + fmt(avgCommission) + '\n' +
    '• Monthly Conversions:  ' + loc(Math.round(monthlyConversions)) + ' sales\n\n' +
    '' +
    '💰 Revenue Projections\n' +
    '\n' +
    '• Monthly Income:            $' + fmt(monthlyIncome) + '\n' +
    '• Annual Income:               $' + fmt(annualIncome) + '\n' +
    '• Income Per 1K Visitors: $' + fmt(incomePerThousand) + '\n\n' +
    '🩺 Income Health:\n' +
    (monthlyIncome >= 10000
      ? '• 🟢 Strong affiliate income — $' + Math.round(monthlyIncome).toLocaleString() + '/mo is a full-time replacement.\n'
      : monthlyIncome >= 2000
      ? '• 🟢 Solid — $' + Math.round(monthlyIncome).toLocaleString() + '/mo is meaningful side income.\n'
      : monthlyIncome >= 500
      ? '• 🟡 Modest — $' + Math.round(monthlyIncome).toLocaleString() + '/mo is a start; needs scaling.\n'
      : '• 🟠 Minimal — under $500/mo, traffic or commission needs lift.\n') +
    (incomePerThousand >= 50
      ? '• ✅ Your traffic converts at $' + Math.round(incomePerThousand) + '/1K visitors — efficient funnel.\n'
      : incomePerThousand >= 20
      ? '• ⚠️ $' + Math.round(incomePerThousand) + '/1K is below industry median ($30-50).\n'
      : '• 🔴 $' + Math.round(incomePerThousand) + '/1K is very low — review offer-market fit.\n') +
    '\n🔄 What-If Scenarios:\n' +
    '• 2x traffic:  $' + Math.round(monthlyIncome * 2).toLocaleString() + '/mo  (SEO + paid ads)\n' +
    '• 2x conversion rate:  $' + Math.round(monthlyIncome * 2).toLocaleString() + '/mo  (better targeting + landing page)\n' +
    '• Higher commission (+50%):  $' + Math.round(monthlyIncome * 1.5).toLocaleString() + '/mo  (recurring programs, premium offers)\n' +
    '• All three combined:  $' + Math.round(monthlyIncome * 6).toLocaleString() + '/mo  (max upside)\n\n' +
    assessment + '\n\n' +
    loc(Math.round(50 * avgCommission)) + '/mo.',
  );

  const trafficLevels = [1000, 5000, 10000, 25000, 50000, 100000, 250000, 500000, 1000000];
  for (let i = 0; i < 9; i++) {
    const t = trafficLevels[i];
    const mc = t * (conversionRate / 100);
    const mi = mc * avgCommission;
    const ai = mi * 12;
    results.push(
      'Comparison: ' + loc(t) + ' visitors/mo → $' + fmt(mi) + '/mo | $' + fmt(ai) + '/yr | ' + loc(Math.round(mc)) + ' sales/mo',
    );
  }

  return results;
}

const customFn =
  "var mt=parseFloat(inputs.monthlyTraffic)||0;" +
  "var cr=parseFloat(inputs.conversionRate)||0;" +
  "var ac=parseFloat(inputs.avgCommission)||0;" +
  "var mconv=mt*(cr/100);" +
  "var mi=mconv*ac;" +
  "var ai=mi*12;" +
  "var ipt=mt>0?(mi/mt)*1000:0;" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var assess;" +
  "if(mi>=10000)assess='\\uD83D\\uDE80 Full-time affiliate income! $'+loc(Math.round(mi))+'/mo is a sustainable business. Diversify your traffic sources and affiliate programs to protect this income.';" +
  "else if(mi>=3000)assess='\\u2705 Solid side income. $'+loc(Math.round(mi))+'/mo covers major expenses. With continued traffic growth, this can become full-time income within 6-12 months.';" +
  "else if(mi>=1000)assess='\\uD83D\\uDCC8 Growing steadily. $'+loc(Math.round(mi))+'/mo is a great start. Focus on improving one metric at a time \\u2014 traffic, conversion rate, or commission value.';" +
  "else if(mi>=100)assess='\\uD83C\\uDF31 Early stage. You are earning but not yet at meaningful scale. Double down on content production and SEO to grow traffic 10x.';" +
  "else assess='\\uD83D\\uDD30 Just starting. Build your content foundation first \\u2014 income will follow traffic. Aim for 10,000 monthly visitors as your first milestone.';" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDD17 Affiliate Income Calculator\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCCA Your Traffic & Conversions\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Monthly Traffic:              '+loc(mt)+' visitors\\n" +
  "\\u2022 Conversion Rate:           '+cr+'%\\n" +
  "\\u2022 Avg Commission:          $'+fmt(ac)+'\\n" +
  "\\u2022 Monthly Conversions:  '+loc(Math.round(mconv))+' sales\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCB0 Revenue Projections\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Monthly Income:            $'+fmt(mi)+'\\n" +
  "\\u2022 Annual Income:               $'+fmt(ai)+'\\n" +
  "\\u2022 Income Per 1K Visitors: $'+fmt(ipt)+'\\n\\n" +
  "'+assess+'\\n\\n" +
  "\\uD83D\\uDCA1 Tip: The fastest way to grow affiliate income is improving conversion rate (write better reviews, add comparison tables, use clear CTAs) rather than just increasing traffic. A 1% conversion rate improvement at 50K visitors adds $'+loc(Math.round(50*ac))+'/mo.'" +
  ");" +
  "var tl=[1000,5000,10000,25000,50000,100000,250000,500000,1000000];" +
  "for(var i=0;i<9;i++){" +
  "var t=tl[i];" +
  "var c=t*(cr/100);" +
  "var inc=c*ac;" +
  "var ainc=inc*12;" +
  "results.push('Comparison: '+loc(t)+' visitors/mo \\u2192 $'+fmt(inc)+'/mo | $'+fmt(ainc)+'/yr | '+loc(Math.round(c))+' sales/mo');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-affiliate-income-calculator',
  title: 'Affiliate Income Calculator',
  description: 'Estimate your monthly and annual affiliate income based on traffic, conversion rate, and average commission.',
  category: 'C',
  inputs: [
    { name: 'monthlyTraffic', label: 'Monthly Traffic (visitors)', placeholder: 'e.g. 50000', type: 'number' },
    { name: 'conversionRate', label: 'Conversion Rate (%)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'avgCommission', label: 'Average Commission ($)', placeholder: 'e.g. 50', type: 'number' },
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
    '🔗 Affiliate Income Calculator\n\n📊 Your Traffic & Conversions\n\n• Monthly Traffic:              50,000 visitors\n• Conversion Rate:           2%\n• Avg Commission:          $50.00\n• Monthly Conversions:  1,000 sales\n\n💰 Revenue Projections\n\n• Monthly Income:            $50,000.00\n• Annual Income:               $600,000.00\n• Income Per 1K Visitors: $1,000.00\n\n🚀 Full-time affiliate income! $50,000/mo is a sustainable business. Diversify your traffic sources and affiliate programs to protect this income.\n',
    'Comparison: 1,000 visitors/mo → $1,000.00/mo | $12,000.00/yr | 20 sales/mo',
    'Comparison: 10,000 visitors/mo → $10,000.00/mo | $120,000.00/yr | 200 sales/mo',
    'Comparison: 100,000 visitors/mo → $100,000.00/mo | $1,200,000.00/yr | 2,000 sales/mo',
    'Comparison: 1,000,000 visitors/mo → $1,000,000.00/mo | $12,000,000.00/yr | 20,000 sales/mo',
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
    'Review your monthly and annual income projections.',
    'Check your income per 1,000 visitors — a key efficiency metric.',
    'Scroll down to see income projections across 9 different traffic levels.',
  ],
};

registerEngine(engine);
