import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';
import { clampNonNegative } from '../../core/engines/helpers';

function calculateEmailRevenue(inputs: Record<string, string>): string[] {
  const subscriberCount = clampNonNegative(parseFloat(inputs.subscriberCount) || 0);
  const openRate = clampNonNegative(parseFloat(inputs.openRate) || 0);
  const clickRate = clampNonNegative(parseFloat(inputs.clickRate) || 0);
  const conversionRate = clampNonNegative(parseFloat(inputs.conversionRate) || 0);
  const avgOrderValue = clampNonNegative(parseFloat(inputs.avgOrderValue) || 0);
  const emailsPerMonth = clampNonNegative(parseFloat(inputs.emailsPerMonth) || 4);
  const unsubscribeRate = clampNonNegative(parseFloat(inputs.unsubscribeRate) || 0.5);
  const results: string[] = [];

  const opens = subscriberCount * (openRate / 100);
  const clicks = opens * (clickRate / 100);
  const conversions = clicks * (conversionRate / 100);
  const revenuePerSend = conversions * avgOrderValue;
  const monthlyRevenue = revenuePerSend * emailsPerMonth;
  const annualRevenue = monthlyRevenue * 12;
  const revenuePerSubscriber = subscriberCount > 0 ? annualRevenue / subscriberCount : 0;
  const revenuePerSendPerSub = subscriberCount > 0 ? revenuePerSend / subscriberCount : 0;
  const breakEvenSubs = avgOrderValue > 0 && conversionRate > 0 && clickRate > 0 && openRate > 0
    ? (1 / (openRate / 100) / (clickRate / 100) / (conversionRate / 100) / avgOrderValue / emailsPerMonth * 12)
    : 0;

  const fmt = (n: number) => '$' + n.toFixed(2);
  const fmt0 = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct2 = (n: number) => n.toFixed(2);
  const pct1 = (n: number) => n.toFixed(1);
  const loc = (n: number) => Math.round(n).toLocaleString();

  results.push(
    '📧 Email List Revenue Calculator\n\n' +
    '📊 Funnel Metrics:\n' +
    '• Subscribers:           ' + loc(subscriberCount) + '\n' +
    '• Open Rate:             ' + pct1(openRate) + '%  → ' + loc(opens) + ' opens\n' +
    '• Click Rate:            ' + pct1(clickRate) + '%  → ' + loc(clicks) + ' clicks\n' +
    '• Conversion Rate:       ' + pct1(conversionRate) + '%  → ' + conversions.toFixed(2) + ' conversions\n' +
    '• Avg Order Value:       ' + fmt(avgOrderValue) + '\n' +
    '• Emails/Month:          ' + emailsPerMonth + '  (industry avg 2-8)\n' +
    '• Monthly Unsubscribes:  ~' + pct1(unsubscribeRate) + '%  (' + loc(subscriberCount * unsubscribeRate / 100) + '/mo)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Revenue Snapshot:\n' +
    '• Revenue Per Send:      ' + fmt(revenuePerSend) + '\n' +
    '• Monthly Revenue:       ' + fmt0(monthlyRevenue) + '/mo\n' +
    '• Annual Revenue:        ' + fmt0(annualRevenue) + '/yr\n' +
    '• Per Subscriber (yr):   ' + fmt(revenuePerSubscriber) + '/sub/yr\n' +
    '• Per Subscriber (mo):   ' + '$' + (revenuePerSubscriber / 12).toFixed(2) + '/sub/mo\n' +
    '• Per Send Per Sub:      ' + '$' + revenuePerSendPerSub.toFixed(4) + '\n' +
    '• Total Annual Conversions: ' + loc(conversions * emailsPerMonth * 12) + ' sales/yr\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 List Economics:\n' +
    '• Revenue/Send:          ' + fmt(revenuePerSend) + '\n' +
    '• Revenue/1000 Opens:    ' + '$' + (opens > 0 ? ((conversions * avgOrderValue) / opens * 1000).toFixed(2) : '0.00') + '\n' +
    '• Revenue/1000 Clicks:   ' + '$' + (clicks > 0 ? ((conversions * avgOrderValue) / clicks * 1000).toFixed(2) : '0.00') + '\n' +
    '• Click-to-Open Rate:    ' + pct1(opens > 0 ? (clicks / opens) * 100 : 0) + '%  (CTOR — industry: 10-15%)\n' +
    '• Revenue per Email:     ' + fmt(revenuePerSend) + ' (per send)\n' +
    '• Industry Benchmark:    $1-2/sub/yr baseline | $5-20/sub/yr top performers\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 List Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (openRate > 25
      ? '• 🟢 Open rate ' + pct1(openRate) + '% is strong (industry avg 20-25%).\n'
      : openRate >= 15
      ? '• 🟡 Open rate ' + pct1(openRate) + '% is on industry average.\n'
      : openRate >= 10
      ? '• 🟠 Open rate ' + pct1(openRate) + '% is below average — test subject lines.\n'
      : '• 🔴 Open rate ' + pct1(openRate) + '% is weak — clean list, test sender reputation.\n') +
    (clickRate >= 4
      ? '• 🟢 Click rate ' + pct1(clickRate) + '% is healthy.\n'
      : clickRate >= 2
      ? '• 🟡 Click rate ' + pct1(clickRate) + '% is OK — test better CTAs.\n'
      : '• 🔴 Click rate ' + pct1(clickRate) + '% is weak — rewrite for relevance.\n') +
    (revenuePerSubscriber >= 5
      ? '• 🟢 $' + fmt(revenuePerSubscriber) + '/sub/yr — strong monetization.\n'
      : revenuePerSubscriber >= 2
      ? '• 🟡 $' + fmt(revenuePerSubscriber) + '/sub/yr — workable, improvable.\n'
      : revenuePerSubscriber >= 0.5
      ? '• 🟠 $' + fmt(revenuePerSubscriber) + '/sub/yr — below benchmark.\n'
      : subscriberCount > 0
      ? '• 🔴 $' + fmt(revenuePerSubscriber) + '/sub/yr — very low.\n'
      : '') +
    (unsubscribeRate < 0.3
      ? '• 🟢 Unsub rate ' + pct1(unsubscribeRate) + '% — strong list retention.\n'
      : unsubscribeRate < 1
      ? '• 🟡 Unsub rate ' + pct1(unsubscribeRate) + '% — typical.\n'
      : '• 🔴 Unsub rate ' + pct1(unsubscribeRate) + '% — too high, prune inactive subs.\n') +
    '\n🎯 List Growth Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    'Assuming ' + pct1(unsubscribeRate) + '% monthly churn and 10% monthly net growth:\n' +
    '• Net monthly growth:    ' + pct1(10 - unsubscribeRate) + '%  (10% new - ' + pct1(unsubscribeRate) + '% churn)\n' +
    '• List in 6 months:      ' + loc(subscriberCount * Math.pow(1 + (0.10 - unsubscribeRate / 100), 6)) + '  (compound)\n' +
    '• List in 12 months:     ' + loc(subscriberCount * Math.pow(1 + (0.10 - unsubscribeRate / 100), 12)) + '\n' +
    '• Revenue in 12 months:  ' + fmt0(annualRevenue * Math.pow(1 + (0.10 - unsubscribeRate / 100), 12)) + '/yr  (projected)\n' +
    '• Net adds needed:       ' + loc(subscriberCount * 0.10) + ' new subs/mo to sustain\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Per-Sub Value Break-Even:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Current $/sub/yr:      ' + fmt(revenuePerSubscriber) + '\n' +
    '• Industry target:       $1-2/sub/yr  (avg lists)\n' +
    '• Top performer:         $5-20/sub/yr\n' +
    (revenuePerSubscriber >= 2
      ? '• 🟢 Above $2/sub/yr — monetizing well.\n'
      : revenuePerSubscriber >= 1
      ? '• 🟡 At $1-2/sub/yr — meeting baseline.\n'
      : '• 🔴 Below $1/sub/yr — focus on segmentation + offer quality.\n') +
    '• To hit $5K/yr:         ' + loc(5000 / Math.max(revenuePerSubscriber, 0.01)) + ' engaged subscribers\n' +
    '• To hit $50K/yr:        ' + loc(50000 / Math.max(revenuePerSubscriber, 0.01)) + ' engaged subscribers\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise open rate 2x:    Annual ' + fmt0(annualRevenue * 2) + '  (better subject lines + send time)\n' +
    '• Raise click rate 2x:   Annual ' + fmt0(annualRevenue * 2) + '  (clearer CTAs + better content)\n' +
    '• 2x subscribers:        Annual ' + fmt0(annualRevenue * 2) + '  (lead magnets + list growth)\n' +
    '• All combined:          Annual ' + fmt0(annualRevenue * 8) + '  (max upside)\n' +
    '• Send 2x more emails:   Annual ' + fmt0(annualRevenue * 2) + '  (more touch points)\n\n' +
    '💡 Tip: The industry benchmark is $1-2 per subscriber per year. To beat this, segment your list by interest and past purchases, then send targeted offers. A segmented campaign can generate 760% more revenue than a broadcast to everyone.',
  );

  const listSizes = [500, 1000, 2500, 5000, 10000, 25000, 50000, 100000, 250000];
  for (let i = 0; i < listSizes.length; i++) {
    const s = listSizes[i];
    const o = s * (openRate / 100);
    const c = o * (clickRate / 100);
    const conv = c * (conversionRate / 100);
    const rps = conv * avgOrderValue;
    const mr = rps * emailsPerMonth;
    const ar = mr * 12;
    results.push(
      loc(s) + ' subs: ' + fmt(mr) + '/mo | ' + fmt0(ar) + '/yr | ' + fmt(s > 0 ? ar / s : 0) + '/sub/yr',
    );
  }

  return results;
}

const customFn =
  "var cnn=function(x){return Math.max(0,x)};" +
  "var sc=cnn(parseFloat(inputs.subscriberCount)||0);" +
  "var orate=cnn(parseFloat(inputs.openRate)||0);" +
  "var crate=cnn(parseFloat(inputs.clickRate)||0);" +
  "var cvr=cnn(parseFloat(inputs.conversionRate)||0);" +
  "var aov=cnn(parseFloat(inputs.avgOrderValue)||0);" +
  "var epm=cnn(parseFloat(inputs.emailsPerMonth)||4);" +
  "var unrate=cnn(parseFloat(inputs.unsubscribeRate)||0.5);" +
  "var opens=sc*(orate/100);" +
  "var clicks=opens*(crate/100);" +
  "var convs=clicks*(cvr/100);" +
  "var rps=convs*aov;" +
  "var mr=rps*epm;" +
  "var ar=mr*12;" +
  "var rpsub=sc>0?ar/sc:0;" +
  "var rpsps=sc>0?rps/sc:0;" +
  "function fmt(n){return '$'+n.toFixed(2)}" +
  "function fmt0(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct2(n){return n.toFixed(2)}" +
  "function pct1(n){return n.toFixed(1)}" +
  "function loc(n){return Math.round(n).toLocaleString()}" +
  "var results=[];" +
  "var r='';" +
  "r+='\\uD83D\\uDCE7 Email List Revenue Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCCA Funnel Metrics:\\n';" +
  "r+='\\u2022 Subscribers:           '+loc(sc)+'\\n';" +
  "r+='\\u2022 Open Rate:             '+pct1(orate)+'%  \\u2192 '+loc(opens)+' opens\\n';" +
  "r+='\\u2022 Click Rate:            '+pct1(crate)+'%  \\u2192 '+loc(clicks)+' clicks\\n';" +
  "r+='\\u2022 Conversion Rate:       '+pct1(cvr)+'%  \\u2192 '+convs.toFixed(2)+' conversions\\n';" +
  "r+='\\u2022 Avg Order Value:       '+fmt(aov)+'\\n';" +
  "r+='\\u2022 Emails/Month:          '+epm+'  (industry avg 2-8)\\n';" +
  "r+='\\u2022 Monthly Unsubscribes:  ~'+pct1(unrate)+'%  ('+loc(sc*unrate/100)+'/mo)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Revenue Snapshot:\\n';" +
  "r+='\\u2022 Revenue Per Send:      '+fmt(rps)+'\\n';" +
  "r+='\\u2022 Monthly Revenue:       '+fmt0(mr)+'/mo\\n';" +
  "r+='\\u2022 Annual Revenue:        '+fmt0(ar)+'/yr\\n';" +
  "r+='\\u2022 Per Subscriber (yr):   '+fmt(rpsub)+'/sub/yr\\n';" +
  "r+='\\u2022 Per Subscriber (mo):   '+'$'+(rpsub/12).toFixed(2)+'/sub/mo\\n';" +
  "r+='\\u2022 Per Send Per Sub:      '+'$'+rpsps.toFixed(4)+'\\n';" +
  "r+='\\u2022 Total Annual Conversions: '+loc(convs*epm*12)+' sales/yr\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 List Economics:\\n';" +
  "r+='\\u2022 Revenue/Send:          '+fmt(rps)+'\\n';" +
  "r+='\\u2022 Revenue/1000 Opens:    '+'$'+(opens>0?((convs*aov)/opens*1000).toFixed(2):'0.00')+'\\n';" +
  "r+='\\u2022 Revenue/1000 Clicks:   '+'$'+(clicks>0?((convs*aov)/clicks*1000).toFixed(2):'0.00')+'\\n';" +
  "r+='\\u2022 Click-to-Open Rate:    '+pct1(opens>0?(clicks/opens)*100:0)+'%  (CTOR \\u2014 industry: 10-15%)\\n';" +
  "r+='\\u2022 Revenue per Email:     '+fmt(rps)+' (per send)\\n';" +
  "r+='\\u2022 Industry Benchmark:    $1-2/sub/yr baseline | $5-20/sub/yr top performers\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A List Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(orate>25){r+='\\u2022 \\uD83D\\uDFE2 Open rate '+pct1(orate)+'% is strong (industry avg 20-25%).\\n';}" +
  "else if(orate>=15){r+='\\u2022 \\uD83D\\uDFE1 Open rate '+pct1(orate)+'% is on industry average.\\n';}" +
  "else if(orate>=10){r+='\\u2022 \\uD83D\\uDFE0 Open rate '+pct1(orate)+'% is below average \\u2014 test subject lines.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Open rate '+pct1(orate)+'% is weak \\u2014 clean list, test sender reputation.\\n';}" +
  "if(crate>=4){r+='\\u2022 \\uD83D\\uDFE2 Click rate '+pct1(crate)+'% is healthy.\\n';}" +
  "else if(crate>=2){r+='\\u2022 \\uD83D\\uDFE1 Click rate '+pct1(crate)+'% is OK \\u2014 test better CTAs.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Click rate '+pct1(crate)+'% is weak \\u2014 rewrite for relevance.\\n';}" +
  "if(rpsub>=5){r+='\\u2022 \\uD83D\\uDFE2 $'+fmt(rpsub)+'/sub/yr \\u2014 strong monetization.\\n';}" +
  "else if(rpsub>=2){r+='\\u2022 \\uD83D\\uDFE1 $'+fmt(rpsub)+'/sub/yr \\u2014 workable, improvable.\\n';}" +
  "else if(rpsub>=0.5){r+='\\u2022 \\uD83D\\uDFE0 $'+fmt(rpsub)+'/sub/yr \\u2014 below benchmark.\\n';}" +
  "else if(sc>0){r+='\\u2022 \\uD83D\\uDD34 $'+fmt(rpsub)+'/sub/yr \\u2014 very low.\\n';}" +
  "if(unrate<0.3){r+='\\u2022 \\uD83D\\uDFE2 Unsub rate '+pct1(unrate)+'% \\u2014 strong list retention.\\n';}" +
  "else if(unrate<1){r+='\\u2022 \\uD83D\\uDFE1 Unsub rate '+pct1(unrate)+'% \\u2014 typical.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Unsub rate '+pct1(unrate)+'% \\u2014 too high, prune inactive subs.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF List Growth Projection:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='Assuming '+pct1(unrate)+'% monthly churn and 10% monthly net growth:\\n';" +
  "r+='\\u2022 Net monthly growth:    '+pct1(10-unrate)+'%  (10% new - '+pct1(unrate)+'% churn)\\n';" +
  "r+='\\u2022 List in 6 months:      '+loc(sc*Math.pow(1+(0.10-unrate/100),6))+'  (compound)\\n';" +
  "r+='\\u2022 List in 12 months:     '+loc(sc*Math.pow(1+(0.10-unrate/100),12))+'\\n';" +
  "r+='\\u2022 Revenue in 12 months:  '+fmt0(ar*Math.pow(1+(0.10-unrate/100),12))+'/yr  (projected)\\n';" +
  "r+='\\u2022 Net adds needed:       '+loc(sc*0.10)+' new subs/mo to sustain\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Per-Sub Value Break-Even:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Current $/sub/yr:      '+fmt(rpsub)+'\\n';" +
  "r+='\\u2022 Industry target:       $1-2/sub/yr  (avg lists)\\n';" +
  "r+='\\u2022 Top performer:         $5-20/sub/yr\\n';" +
  "if(rpsub>=2){r+='\\u2022 \\uD83D\\uDFE2 Above $2/sub/yr \\u2014 monetizing well.\\n';}" +
  "else if(rpsub>=1){r+='\\u2022 \\uD83D\\uDFE1 At $1-2/sub/yr \\u2014 meeting baseline.\\n';}" +
  "else{r+='\\u2022 \\uD83D\\uDD34 Below $1/sub/yr \\u2014 focus on segmentation + offer quality.\\n';}" +
  "r+='\\u2022 To hit $5K/yr:         '+loc(5000/Math.max(rpsub,0.01))+' engaged subscribers\\n';" +
  "r+='\\u2022 To hit $50K/yr:        '+loc(50000/Math.max(rpsub,0.01))+' engaged subscribers\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise open rate 2x:    Annual '+fmt0(ar*2)+'  (better subject lines + send time)\\n';" +
  "r+='\\u2022 Raise click rate 2x:   Annual '+fmt0(ar*2)+'  (clearer CTAs + better content)\\n';" +
  "r+='\\u2022 2x subscribers:        Annual '+fmt0(ar*2)+'  (lead magnets + list growth)\\n';" +
  "r+='\\u2022 All combined:          Annual '+fmt0(ar*8)+'  (max upside)\\n';" +
  "r+='\\u2022 Send 2x more emails:   Annual '+fmt0(ar*2)+'  (more touch points)\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: The industry benchmark is $1-2 per subscriber per year. To beat this, segment your list by interest and past purchases, then send targeted offers. A segmented campaign can generate 760% more revenue than a broadcast to everyone.';" +
  "results.push(r);" +
  "var ls=[500,1000,2500,5000,10000,25000,50000,100000,250000];" +
  "for(var i=0;i<ls.length;i++){" +
  "var s=ls[i];" +
  "var o=s*(orate/100);" +
  "var c=o*(crate/100);" +
  "var co=c*(cvr/100);" +
  "var r=co*aov;" +
  "var m=r*epm;" +
  "var a=m*12;" +
  "results.push(loc(s)+' subs: '+fmt(m)+'/mo | '+fmt0(a)+'/yr | '+fmt(s>0?a/s:0)+'/sub/yr');" +
  "}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-email-list-revenue-calculator',
  title: 'Email List Revenue Calculator',
  description: 'Calculate how much revenue your email list generates per send, per month, and per year based on your funnel metrics, with growth projections and break-even sub counts.',
  inputs: [
    { name: 'subscriberCount', label: 'Number of Subscribers', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'openRate', label: 'Open Rate (%)', placeholder: 'e.g. 25', type: 'number' },
    { name: 'clickRate', label: 'Click Rate (% of opens)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'conversionRate', label: 'Conversion Rate (% of clicks)', placeholder: 'e.g. 2', type: 'number' },
    { name: 'avgOrderValue', label: 'Avg Order Value ($)', placeholder: 'e.g. 50', type: 'number' },
    { name: 'emailsPerMonth', label: 'Emails per Month', placeholder: 'e.g. 4', type: 'number' },
    { name: 'unsubscribeRate', label: 'Monthly Unsubscribe Rate (%)', placeholder: 'e.g. 0.5', type: 'number' },
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
    '📧 Email List Revenue Calculator\n\n📊 Funnel Metrics:\n• Subscribers:           10,000\n• Open Rate:             25.0%  → 2,500 opens\n• Click Rate:            5.0%  → 125 clicks\n• Conversion Rate:       2.0%  → 2.50 conversions\n• Avg Order Value:       $50.00\n• Emails/Month:          4  (industry avg 2-8)\n• Monthly Unsubscribes:  ~0.5%  (50/mo)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Revenue Snapshot:\n• Revenue Per Send:      $125.00\n• Monthly Revenue:       $500/mo\n• Annual Revenue:        $6,000/yr\n• Per Subscriber (yr):   $0.60/sub/yr\n• Per Subscriber (mo):   $0.05/sub/mo\n• Per Send Per Sub:      $0.0125\n• Total Annual Conversions: 120 sales/yr\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 List Economics:\n• Revenue/Send:          $125.00\n• Revenue/1000 Opens:    $50.00\n• Revenue/1000 Clicks:   $1000.00\n• Click-to-Open Rate:    5.0%  (CTOR — industry: 10-15%)\n• Revenue per Email:     $125.00 (per send)\n• Industry Benchmark:    $1-2/sub/yr baseline | $5-20/sub/yr top performers\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 List Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟡 Open rate 25.0% is on industry average.\n• 🟢 Click rate 5.0% is healthy.\n• 🟠 $$0.60/sub/yr — below benchmark.\n• 🟡 Unsub rate 0.5% — typical.\n\n🎯 List Growth Projection:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\nAssuming 0.5% monthly churn and 10% monthly net growth:\n• Net monthly growth:    9.5%  (10% new - 0.5% churn)\n• List in 6 months:      17,238  (compound)\n• List in 12 months:     29,715\n• Revenue in 12 months:  $17,829/yr  (projected)\n• Net adds needed:       1,000 new subs/mo to sustain\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Per-Sub Value Break-Even:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Current $/sub/yr:      $0.60\n• Industry target:       $1-2/sub/yr  (avg lists)\n• Top performer:         $5-20/sub/yr\n• 🔴 Below $1/sub/yr — focus on segmentation + offer quality.\n• To hit $5K/yr:         8,333 engaged subscribers\n• To hit $50K/yr:        83,333 engaged subscribers\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise open rate 2x:    Annual $12,000  (better subject lines + send time)\n• Raise click rate 2x:   Annual $12,000  (clearer CTAs + better content)\n• 2x subscribers:        Annual $12,000  (lead magnets + list growth)\n• All combined:          Annual $48,000  (max upside)\n• Send 2x more emails:   Annual $12,000  (more touch points)\n\n💡 Tip: The industry benchmark is $1-2 per subscriber per year. To beat this, segment your list by interest and past purchases, then send targeted offers. A segmented campaign can generate 760% more revenue than a broadcast to everyone.\n500 subs: $25.00/mo | $300/yr | $0.60/sub/yr\n1,000 subs: $50.00/mo | $600/yr | $0.60/sub/yr\n2,500 subs: $125.00/mo | $1,500/yr | $0.60/sub/yr\n5,000 subs: $250.00/mo | $3,000/yr | $0.60/sub/yr\n10,000 subs: $500.00/mo | $6,000/yr | $0.60/sub/yr\n25,000 subs: $1250.00/mo | $15,000/yr | $0.60/sub/yr\n50,000 subs: $2500.00/mo | $30,000/yr | $0.60/sub/yr\n100,000 subs: $5000.00/mo | $60,000/yr | $0.60/sub/yr\n250,000 subs: $12500.00/mo | $150,000/yr | $0.60/sub/yr',
    '500 subs: $25.00/mo | $300/yr | $0.60/sub/yr',
    '5,000 subs: $250.00/mo | $3,000/yr | $0.60/sub/yr',
    '10,000 subs: $500.00/mo | $6,000/yr | $0.60/sub/yr',
    '100,000 subs: $5,000.00/mo | $60,000/yr | $0.60/sub/yr',
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
    'Enter emails per month and your typical monthly unsubscribe rate.',
    'Review per-sub value, break-even sub counts, and growth projections.',
    'Scroll down to see revenue projections across 9 different list sizes.',
  ],
};

registerEngine(engine);
