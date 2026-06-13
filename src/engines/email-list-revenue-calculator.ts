import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function calculateEmailRevenue(inputs: Record<string, string>): string[] {
  const subscriberCount = parseFloat(inputs.subscriberCount) || 0;
  const openRate = parseFloat(inputs.openRate) || 0;
  const clickRate = parseFloat(inputs.clickRate) || 0;
  const conversionRate = parseFloat(inputs.conversionRate) || 0;
  const avgOrderValue = parseFloat(inputs.avgOrderValue) || 0;
  const results: string[] = [];

  const emailsPerMonth = 4;
  const opens = subscriberCount * (openRate / 100);
  const clicks = opens * (clickRate / 100);
  const conversions = clicks * (conversionRate / 100);
  const revenuePerSend = conversions * avgOrderValue;
  const monthlyRevenue = revenuePerSend * emailsPerMonth;
  const annualRevenue = monthlyRevenue * 12;
  const revenuePerSubscriber = subscriberCount > 0 ? annualRevenue / subscriberCount : 0;

  const fmt = (n: number) => n.toFixed(2);
  const loc = (n: number) => n.toLocaleString();

  let assessment: string;
  if (revenuePerSubscriber >= 12) {
    assessment = '🚀 Elite performance. $' + fmt(revenuePerSubscriber) + '/subscriber/year means you are monetizing extremely well. Your email list is a major revenue engine.';
  } else if (revenuePerSubscriber >= 5) {
    assessment = '✅ Strong monetization. $' + fmt(revenuePerSubscriber) + '/subscriber/year is above average. Your offers resonate and your audience trusts you.';
  } else if (revenuePerSubscriber >= 2) {
    assessment = '📈 Good baseline. $' + fmt(revenuePerSubscriber) + '/subscriber/year is typical. Room to improve with better segmentation and more targeted offers.';
  } else if (revenuePerSubscriber >= 0.5) {
    assessment = '🌱 Room to grow. At $' + fmt(revenuePerSubscriber) + '/subscriber/year, you have room to improve open rates, click rates, or offer value.';
  } else {
    assessment = '🔰 Early stage. Focus on growing your list and improving engagement before optimizing for revenue. A healthy list with good engagement monetizes naturally.';
  }

  results.push(
    '📧 Email List Revenue Calculator\n\n' +
    '' +
    '📊 Funnel Metrics\n' +
    '\n' +
    '• Subscribers:                   ' + loc(subscriberCount) + '\n' +
    '• Open Rate:                      ' + openRate + '% → ' + loc(Math.round(opens)) + ' opens\n' +
    '• Click Rate:                       ' + clickRate + '% → ' + loc(Math.round(clicks)) + ' clicks\n' +
    '• Conversion Rate:          ' + conversionRate + '% → ' + fmt(conversions) + ' conversions\n' +
    '• Avg Order Value:          $' + fmt(avgOrderValue) + '\n\n' +
    '' +
    '💰 Revenue Estimates (4 emails/mo)\n' +
    '\n' +
    '• Revenue Per Email Send: $' + fmt(revenuePerSend) + '\n' +
    '• Monthly Revenue:             $' + fmt(monthlyRevenue) + '\n' +
    '• Annual Revenue:                $' + fmt(annualRevenue) + '\n' +
    '• Revenue Per Subscriber:  $' + fmt(revenuePerSubscriber) + '/yr\n\n' +
    assessment + '\n\n' +
    '',
  );

  const listSizes = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
  for (let i = 0; i < 9; i++) {
    const s = listSizes[i];
    const o = s * (openRate / 100);
    const c = o * (clickRate / 100);
    const conv = c * (conversionRate / 100);
    const rps = conv * avgOrderValue;
    const mr = rps * emailsPerMonth;
    const ar = mr * 12;
    results.push(
      'Comparison: ' + loc(s) + ' subs → $' + fmt(mr) + '/mo | $' + fmt(ar) + '/yr | $' + fmt(s > 0 ? ar / s : 0) + '/sub/yr',
    );
  }

  return results;
}

const customFn =
  "var sc=parseFloat(inputs.subscriberCount)||0;" +
  "var orate=parseFloat(inputs.openRate)||0;" +
  "var crate=parseFloat(inputs.clickRate)||0;" +
  "var cvr=parseFloat(inputs.conversionRate)||0;" +
  "var aov=parseFloat(inputs.avgOrderValue)||0;" +
  "var epm=4;" +
  "var opens=sc*(orate/100);" +
  "var clicks=opens*(crate/100);" +
  "var convs=clicks*(cvr/100);" +
  "var rps=convs*aov;" +
  "var mr=rps*epm;" +
  "var ar=mr*12;" +
  "var rpsub=sc>0?ar/sc:0;" +
  "function fmt(n){return n.toFixed(2)}" +
  "function loc(n){return n.toLocaleString()}" +
  "var assess;" +
  "if(rpsub>=12)assess='\\uD83D\\uDE80 Elite performance. $'+fmt(rpsub)+'/subscriber/year means you are monetizing extremely well. Your email list is a major revenue engine.';" +
  "else if(rpsub>=5)assess='\\u2705 Strong monetization. $'+fmt(rpsub)+'/subscriber/year is above average. Your offers resonate and your audience trusts you.';" +
  "else if(rpsub>=2)assess='\\uD83D\\uDCC8 Good baseline. $'+fmt(rpsub)+'/subscriber/year is typical. Room to improve with better segmentation and more targeted offers.';" +
  "else if(rpsub>=0.5)assess='\\uD83C\\uDF31 Room to grow. At $'+fmt(rpsub)+'/subscriber/year, you have room to improve open rates, click rates, or offer value.';" +
  "else assess='\\uD83D\\uDD30 Early stage. Focus on growing your list and improving engagement before optimizing for revenue. A healthy list with good engagement monetizes naturally.';" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83D\\uDCE7 Email List Revenue Calculator\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCCA Funnel Metrics\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Subscribers:                   '+loc(sc)+'\\n" +
  "\\u2022 Open Rate:                      '+orate+'% \\u2192 '+loc(Math.round(opens))+' opens\\n" +
  "\\u2022 Click Rate:                       '+crate+'% \\u2192 '+loc(Math.round(clicks))+' clicks\\n" +
  "\\u2022 Conversion Rate:          '+cvr+'% \\u2192 '+fmt(convs)+' conversions\\n" +
  "\\u2022 Avg Order Value:          $'+fmt(aov)+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n" +
  "\\uD83D\\uDCB0 Revenue Estimates (4 emails/mo)\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2022 Revenue Per Email Send: $'+fmt(rps)+'\\n" +
  "\\u2022 Monthly Revenue:             $'+fmt(mr)+'\\n" +
  "\\u2022 Annual Revenue:                $'+fmt(ar)+'\\n" +
  "\\u2022 Revenue Per Subscriber:  $'+fmt(rpsub)+'/yr\\n\\n" +
  "'+assess+'\\n\\n" +
  "\\uD83D\\uDCA1 Tip: The industry benchmark is $1-$2 per subscriber per year. To beat this, segment your list by interest and past purchases, then send targeted offers. A segmented campaign can generate 760% more revenue than a broadcast to everyone.'" +
  ");" +
  "var ls=[500,1000,2500,5000,10000,25000,50000,100000,250000];" +
  "for(var i=0;i<9;i++){" +
  "var s=ls[i];" +
  "var o=s*(orate/100);" +
  "var c=o*(crate/100);" +
  "var co=c*(cvr/100);" +
  "var r=co*aov;" +
  "var m=r*epm;" +
  "var a=m*12;" +
  "results.push('Comparison: '+loc(s)+' subs \\u2192 $'+fmt(m)+'/mo | $'+fmt(a)+'/yr | $'+fmt(s>0?a/s:0)+'/sub/yr');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-email-list-revenue-calculator',
  title: 'Email List Revenue Calculator',
  description: 'Calculate how much revenue your email list generates per send, per month, and per year based on your funnel metrics.',
  category: 'C',
  inputs: [
    { name: 'subscriberCount', label: 'Number of Subscribers', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'openRate', label: 'Open Rate (%)', placeholder: 'e.g. 25', type: 'number' },
    { name: 'clickRate', label: 'Click Rate (% of opens)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'conversionRate', label: 'Conversion Rate (% of clicks)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'avgOrderValue', label: 'Avg Order Value ($)', placeholder: 'e.g. 50', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateEmailRevenue(inputs);
  },
  staticExamples: [
    '📧 Email List Revenue Calculator\n\n📊 Funnel Metrics\n\n• Subscribers:                   10,000\n• Open Rate:                      25% → 2,500 opens\n• Click Rate:                       5% → 125 clicks\n• Conversion Rate:          2% → 2.50 conversions\n• Avg Order Value:          $50.00\n\n💰 Revenue Estimates (4 emails/mo)\n\n• Revenue Per Email Send: $125.00\n• Monthly Revenue:             $500.00\n• Annual Revenue:                $6,000.00\n• Revenue Per Subscriber:  $0.60/yr\n\n🌱 Room to grow. At $0.60/subscriber/year, you have room to improve open rates, click rates, or offer value.\n',
    'Comparison: 500 subs → $25.00/mo | $300.00/yr | $0.60/sub/yr',
    'Comparison: 5,000 subs → $250.00/mo | $3,000.00/yr | $0.60/sub/yr',
    'Comparison: 25,000 subs → $1,250.00/mo | $15,000.00/yr | $0.60/sub/yr',
    'Comparison: 100,000 subs → $5,000.00/mo | $60,000.00/yr | $0.60/sub/yr',
  ],
  faq: [
    { q: 'What is a good open rate for marketing emails?', a: '20-30% is the industry average across all sectors. Niche audiences and highly engaged lists can reach 30-45%. If you are below 15%, clean your list of inactive subscribers (who have not opened in 90+ days) and improve subject lines. A smaller engaged list outperforms a large disengaged one.' },
    { q: 'How often should I email my list?', a: '1-4 times per week is the sweet spot for most creators. Daily emails work for high-value niches like trading or breaking news but risk higher unsubscribes. Weekly is the minimum to stay top-of-mind. Test frequency by monitoring open rates and unsubscribe rates — if opens drop, send less frequently.' },
    { q: 'What affects click rate the most?', a: 'Relevance and placement. Emails with one clear CTA outperform those with multiple links. Personalize based on past behavior. Plain-text emails often get higher click rates than heavily designed templates because they feel more personal. The first link in an email typically gets 40-60% of all clicks.' },
    { q: 'How do I calculate revenue per subscriber?', a: 'Total annual email revenue divided by total subscribers. The benchmark is $1-$2/subscriber/year for most industries. Top performers reach $5-$20+. This is your single most important email KPI — it captures the health of your entire email monetization funnel.' },
    { q: 'What is the biggest mistake email marketers make?', a: 'Sending the same offer to everyone. Segmenting your list by purchase history, engagement level, and expressed interests can increase email revenue 3-10x. A new subscriber should receive a different sequence than someone who has purchased 3 times. Use tagging and automation to deliver the right offer to the right person at the right time.' },
  ],
  howToUse: [
    'Enter your current email subscriber count.',
    'Enter your typical open rate (industry average is 20-30%).',
    'Enter your click rate as a percentage of opens (typical is 2-5%).',
    'Enter your conversion rate from clicks to purchases (typical is 1-3%).',
    'Enter the average value of an order from your emails.',
    'Scroll down to see revenue projections across 9 different list sizes.',
  ],
};

registerEngine(engine);
