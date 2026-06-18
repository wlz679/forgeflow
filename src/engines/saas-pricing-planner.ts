import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function planPricing(inputs: Record<string, string>): string[] {
  const productType = inputs.productType || 'SaaS';
  const targetCustomer = inputs.targetCustomer || 'b2b';
  const competitorPrice = parseFloat(inputs.competitorPrice) || 0;

  const basePrice = competitorPrice || 29;
  const targetMargin = 0.70;
  const assumedChurn = 0.03;

  const tiers = [
    { name: 'Starter', low: Math.max(5, Math.round(basePrice * 0.5)), mid: Math.max(9, Math.round(basePrice * 0.6)), high: Math.max(15, Math.round(basePrice * 0.7)), margin: 0.85, customers: 1000 },
    { name: 'Pro', low: Math.max(19, Math.round(basePrice * 1.0)), mid: Math.max(29, Math.round(basePrice * 1.3)), high: Math.max(49, Math.round(basePrice * 1.7)), margin: 0.75, customers: 400 },
    { name: 'Max', low: Math.max(49, Math.round(basePrice * 2.0)), mid: Math.max(79, Math.round(basePrice * 2.5)), high: Math.max(149, Math.round(basePrice * 4.0)), margin: 0.70, customers: 80 },
    { name: 'Enterprise', low: Math.max(199, Math.round(basePrice * 5)), mid: Math.max(499, Math.round(basePrice * 10)), high: Math.max(999, Math.round(basePrice * 20)), margin: 0.65, customers: 12 },
  ];

  const models = [
    {
      name: 'Flat-Rate',
      best: 'Simple tools with one clear use case. Best for early-stage products.',
      low: Math.max(5, Math.round(basePrice * 0.7)),
      mid: basePrice,
      high: Math.round(basePrice * 1.5),
      tip: 'Keep it simple — one price, all features. Add a free trial to reduce friction.',
    },
    {
      name: 'Tiered',
      best: 'Products with power users who will pay more for advanced features.',
      low: Math.max(9, Math.round(basePrice * 0.5)),
      mid: basePrice,
      high: Math.round(basePrice * 2.5),
      tip: '3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).',
    },
    {
      name: 'Usage-Based',
      best: 'API products, AI tools, or any product where value scales with usage.',
      low: Math.max(5, Math.round(basePrice * 0.4)),
      mid: Math.round(basePrice * 1.2),
      high: Math.round(basePrice * 3),
      tip: 'Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption.',
    },
    {
      name: 'Freemium',
      best: 'B2C products or tools that benefit from network effects and word-of-mouth.',
      low: 0,
      mid: Math.round(basePrice * 0.8) || 12,
      high: Math.round(basePrice * 1.8),
      tip: 'Free plan must be genuinely useful but leave room for upgrade. 3-5% free-to-paid conversion is good.',
    },
  ];

  const audienceTips: Record<string, string> = {
    b2b: 'B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.',
    b2c: 'B2C users prefer monthly subscriptions with easy cancellation. Focus on instant value and social proof.',
    developers: 'Developers expect API-first pricing, generous free tiers, and transparent docs. They hate hidden fees.',
    creators: 'Creators value revenue-share models or flat fees. Keep pricing predictable so they can forecast their margins.',
  };

  const productTips: Record<string, string> = {
    SaaS: 'SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.',
    ebook: 'Ebooks typically sell for $9-$49. Bundle with templates/checklists to increase perceived value.',
    course: 'Online courses range $49-$999. Price based on transformation value, not content length. Cohorts justify premium pricing.',
    template: 'Templates sell for $5-$49. Bundle them into packs to raise AOV. Notion/Gumroad are popular distribution channels.',
    newsletter: 'Newsletters convert 5-15% of free readers to paid. Typical paid tiers: $5-$15/mo or $50-$150/yr.',
  };

  let primaryRec = 0;
  if (targetCustomer === 'developers') primaryRec = 2;
  else if (targetCustomer === 'b2b') primaryRec = 1;
  else if (productType === 'newsletter') primaryRec = 0;

  const tierOutput = tiers.map((t) => {
    const monthlyMrr = t.mid * t.customers;
    const costPerCustomer = t.mid * (1 - t.margin);
    const ltv = (t.mid - costPerCustomer) / assumedChurn;
    const breakEvenCustomers = Math.ceil(2000 / t.margin / t.mid);
    return { ...t, monthlyMrr, costPerCustomer, ltv, breakEvenCustomers };
  });

  const totalMrr = tierOutput.reduce((s, t) => s + t.monthlyMrr, 0);
  const totalCustomers = tierOutput.reduce((s, t) => s + t.customers, 0);
  const arpu = totalCustomers > 0 ? totalMrr / totalCustomers : 0;
  const weightedMargin = totalMrr > 0
    ? tierOutput.reduce((s, t) => s + t.margin * t.monthlyMrr, 0) / totalMrr
    : 0;

  const results: string[] = [];

  const fmt = (n: number) => '$' + Math.round(n).toLocaleString();
  const pct = (n: number) => n.toFixed(1) + '%';

  let mainResult =
    '🎯 SaaS Pricing Planner\n\n' +
    '📦 Product: ' + productType + '  |  👤 Target: ' + targetCustomer + '  |  💰 Competitor: ' + (competitorPrice ? '$' + competitorPrice + '/mo' : 'N/A') + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '💰 Tier Snapshot:\n' +
    '• Starter:      ' + fmt(tiers[0].mid) + '/mo  × ' + tiers[0].customers + ' customers = ' + fmt(tierOutput[0].monthlyMrr) + ' MRR\n' +
    '• Pro:            ' + fmt(tiers[1].mid) + '/mo  × ' + tiers[1].customers + ' customers = ' + fmt(tierOutput[1].monthlyMrr) + ' MRR\n' +
    '• Max:            ' + fmt(tiers[2].mid) + '/mo  × ' + tiers[2].customers + ' customers = ' + fmt(tierOutput[2].monthlyMrr) + ' MRR\n' +
    '• Enterprise: ' + fmt(tiers[3].mid) + '/mo  × ' + tiers[3].customers + ' customers = ' + fmt(tierOutput[3].monthlyMrr) + ' MRR\n' +
    '• Total MRR:                  ' + fmt(totalMrr) + '\n' +
    '• Total Customers:       ' + totalCustomers.toLocaleString() + '\n' +
    '• ARPU:                            ' + fmt(arpu) + '/mo\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Key Metrics:\n' +
    '• Weighted Gross Margin:    ' + pct(weightedMargin * 100) + '  (blended across tiers)\n' +
    '• Target Margin:                    ' + pct(targetMargin * 100) + '  (industry benchmark: 70-80%)\n' +
    '• ARPU by Tier:                     $' + tiers[0].mid + ' / $' + tiers[1].mid + ' / $' + tiers[2].mid + ' / $' + tiers[3].mid + '\n' +
    '• Margin by Tier:                ' + pct(tiers[0].margin * 100) + ' / ' + pct(tiers[1].margin * 100) + ' / ' + pct(tiers[2].margin * 100) + ' / ' + pct(tiers[3].margin * 100) + '\n' +
    '• Enterprise % of MRR:        ' + pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) + '  (high = strong moat)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Pricing Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n';

  const unhealthyTiers = tiers.filter((t) => t.margin < 0.5);
  if (unhealthyTiers.length === 0) {
    mainResult += '• 🟢 All tiers above 50% margin — healthy pricing structure.\n';
  } else {
    mainResult += '• 🔴 ' + unhealthyTiers.length + ' tier(s) below 50% margin: ' + unhealthyTiers.map((t) => t.name).join(', ') + ' — review feature costs.\n';
  }
  if (tierOutput[3].monthlyMrr / totalMrr > 0.25) {
    mainResult += '• 🟢 Enterprise = ' + pct((tierOutput[3].monthlyMrr / totalMrr) * 100) + ' of MRR — strong enterprise traction.\n';
  } else if (tierOutput[3].monthlyMrr / totalMrr > 0.10) {
    mainResult += '• 🟡 Enterprise = ' + pct((tierOutput[3].monthlyMrr / totalMrr) * 100) + ' of MRR — healthy mix.\n';
  } else {
    mainResult += '• 🟠 Enterprise = only ' + pct((tierOutput[3].monthlyMrr / Math.max(totalMrr, 1)) * 100) + ' of MRR — opportunity to expand upmarket.\n';
  }
  if (weightedMargin >= targetMargin) {
    mainResult += '• 🟢 Blended margin (' + pct(weightedMargin * 100) + ') hits target.\n';
  } else {
    mainResult += '• 🟡 Blended margin (' + pct(weightedMargin * 100) + ') below target — raise prices or cut costs.\n';
  }
  if (competitorPrice > 0 && tiers[1].mid < competitorPrice * 0.7) {
    mainResult += '• 🟢 Pro tier well below competitor — could raise 20-30% without losing deals.\n';
  } else if (competitorPrice > 0 && tiers[1].mid > competitorPrice * 1.3) {
    mainResult += '• 🟠 Pro tier 30%+ above competitor — risk of price objection.\n';
  }

  mainResult += '\n🎯 LTV by Tier:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Starter:           $' + Math.round(tierOutput[0].ltv).toLocaleString() + '  (' + pct(tiers[0].margin * 100) + ' margin, ' + pct(assumedChurn * 100) + ' monthly churn)\n' +
    '• Pro:                  $' + Math.round(tierOutput[1].ltv).toLocaleString() + '  (' + pct(tiers[1].margin * 100) + ' margin)\n' +
    '• Max:                  $' + Math.round(tierOutput[2].ltv).toLocaleString() + '  (' + pct(tiers[2].margin * 100) + ' margin)\n' +
    '• Enterprise:    $' + Math.round(tierOutput[3].ltv).toLocaleString() + '  (' + pct(tiers[3].margin * 100) + ' margin)\n' +
    '• Average LTV:      $' + Math.round(tierOutput.reduce((s, t) => s + t.ltv * t.customers, 0) / Math.max(totalCustomers, 1)).toLocaleString() + '\n' +
    '• LTV Formula:      (Price × Margin) / Monthly Churn\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even Customers per Tier:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Starter:           ~' + tierOutput[0].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• Pro:                  ~' + tierOutput[1].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• Max:                  ~' + tierOutput[2].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• Enterprise:    ~' + tierOutput[3].breakEvenCustomers + ' customers  to break even on $2K/mo costs\n' +
    '• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise all tiers 20%:   Pro becomes $' + Math.round(tiers[1].mid * 1.2) + '/mo, MRR → ' + fmt(totalMrr * 1.2) + '  (test willingness to pay)\n' +
    '• Cut Starter by 50%:    Convert funnel to Pro — gain $' + Math.round(tiers[1].mid * 0.3 * tiers[0].customers) + '/mo\n' +
    '• Add annual discount (15% off):   $' + Math.round(tiers[1].mid * 12 * 0.85) + '/yr  vs $' + (tiers[1].mid * 12) + '/yr monthly\n' +
    '• Move 10% of Pro users to Max:   +$' + Math.round((tiers[2].mid - tiers[1].mid) * tiers[1].customers * 0.1).toLocaleString() + '/mo MRR\n' +
    '• Drop lowest-margin tier (' + (unhealthyTiers[0]?.name || 'none') + '):   refocus on profitable tiers\n\n' +
    '💡 Tip: ' + models[primaryRec].tip + '\n\n' +
    '📌 Recommended Action: Launch with Tiered model, Pro at $' + tiers[1].mid + '/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.';

  results.push(mainResult);

  for (let i = 0; i < models.length; i++) {
    const m = models[i];
    const icon = i === primaryRec ? '⭐' : '•';
    results.push(
      icon + ' ' + m.name + ': $' + m.low + ' – $' + m.mid + ' – $' + m.high + '/mo\n' +
      '  ' + m.best,
    );
  }

  results.push(
    '🎯 Audience Insight:\n' + (audienceTips[targetCustomer] || audienceTips.b2b) +
    '\n\n📦 Product Insight:\n' + (productTips[productType] || productTips.SaaS) +
    '\n\n🚀 Next step: Pick one model, launch at the Pro tier ($' + tiers[1].mid + '/mo), and adjust pricing after collecting 100+ conversion data points.',
  );

  return results;
}

const customFn =
  "var pt=inputs.productType||'SaaS';" +
  "var tc=inputs.targetCustomer||'b2b';" +
  "var cp=parseFloat(inputs.competitorPrice)||0;" +
  "var bp=cp||29;" +
  "var tm=0.70;" +
  "var ac=0.03;" +
  "var tiers=[" +
  "{n:'Starter',l:Math.max(5,Math.round(bp*0.5)),m:Math.max(9,Math.round(bp*0.6)),h:Math.max(15,Math.round(bp*0.7)),mg:0.85,c:1000}," +
  "{n:'Pro',l:Math.max(19,Math.round(bp*1.0)),m:Math.max(29,Math.round(bp*1.3)),h:Math.max(49,Math.round(bp*1.7)),mg:0.75,c:400}," +
  "{n:'Max',l:Math.max(49,Math.round(bp*2.0)),m:Math.max(79,Math.round(bp*2.5)),h:Math.max(149,Math.round(bp*4.0)),mg:0.70,c:80}," +
  "{n:'Enterprise',l:Math.max(199,Math.round(bp*5)),m:Math.max(499,Math.round(bp*10)),h:Math.max(999,Math.round(bp*20)),mg:0.65,c:12}" +
  "];" +
  "var models=[" +
  "{n:'Flat-Rate',b:'Simple tools with one clear use case. Best for early-stage products.',l:Math.max(5,Math.round(bp*0.7)),m:bp,h:Math.round(bp*1.5),t:'Keep it simple \\u2014 one price, all features. Add a free trial to reduce friction.'}," +
  "{n:'Tiered',b:'Products with power users who will pay more for advanced features.',l:Math.max(9,Math.round(bp*0.5)),m:bp,h:Math.round(bp*2.5),t:'3 tiers work best: Starter \\u2192 Pro \\u2192 Enterprise. The middle tier should be the obvious choice (anchor pricing).'}," +
  "{n:'Usage-Based',b:'API products, AI tools, or any product where value scales with usage.',l:Math.max(5,Math.round(bp*0.4)),m:Math.round(bp*1.2),h:Math.round(bp*3),t:'Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption.'}," +
  "{n:'Freemium',b:'B2C products or tools that benefit from network effects and word-of-mouth.',l:0,m:Math.round(bp*0.8)||12,h:Math.round(bp*1.8),t:'Free plan must be genuinely useful but leave room for upgrade. 3-5% free-to-paid conversion is good.'}" +
  "];" +
  "var at={'b2b':'B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.','b2c':'B2C users prefer monthly subscriptions with easy cancellation. Focus on instant value and social proof.','developers':'Developers expect API-first pricing, generous free tiers, and transparent docs. They hate hidden fees.','creators':'Creators value revenue-share models or flat fees. Keep pricing predictable so they can forecast their margins.'};" +
  "var prt={'SaaS':'SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.','ebook':'Ebooks typically sell for $9-$49. Bundle with templates/checklists to increase perceived value.','course':'Online courses range $49-$999. Price based on transformation value, not content length. Cohorts justify premium pricing.','template':'Templates sell for $5-$49. Bundle them into packs to raise AOV. Notion/Gumroad are popular distribution channels.','newsletter':'Newsletters convert 5-15% of free readers to paid. Typical paid tiers: $5-$15/mo or $50-$150/yr.'};" +
  "var pr=0;if(tc==='developers')pr=2;else if(tc==='b2b')pr=1;else if(pt==='newsletter')pr=0;" +
  "var tout=tiers.map(function(t){var mr=t.m*t.c;var cc=t.m*(1-t.mg);var ltv=(t.m-cc)/ac;var be=Math.ceil(2000/t.mg/t.m);return{n:t.n,l:t.l,m:t.m,h:t.h,mg:t.mg,c:t.c,mr:mr,ltv:ltv,be:be};});" +
  "var tmr=tout.reduce(function(s,t){return s+t.mr},0);" +
  "var tc2=tout.reduce(function(s,t){return s+t.c},0);" +
  "var arpu=tc2>0?tmr/tc2:0;" +
  "var wm=tmr>0?tout.reduce(function(s,t){return s+t.mg*t.mr},0)/tmr:0;" +
  "function fmt(n){return '$'+Math.round(n).toLocaleString()}" +
  "function pct(n){return n.toFixed(1)+'%'}" +
  "var r='';" +
  "r+='\\uD83C\\uDFAF SaaS Pricing Planner\\n\\n';" +
  "r+='\\uD83D\\uDCE6 Product: '+pt+'  |  \\uD83D\\uDC64 Target: '+tc+'  |  \\uD83D\\uDCB0 Competitor: '+(cp?'$'+cp+'/mo':'N/A')+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Tier Snapshot:\\n';" +
  "r+='\\u2022 Starter:      '+fmt(tout[0].m)+'/mo  \\u00d7 '+tout[0].c+' customers = '+fmt(tout[0].mr)+' MRR\\n';" +
  "r+='\\u2022 Pro:            '+fmt(tout[1].m)+'/mo  \\u00d7 '+tout[1].c+' customers = '+fmt(tout[1].mr)+' MRR\\n';" +
  "r+='\\u2022 Max:            '+fmt(tout[2].m)+'/mo  \\u00d7 '+tout[2].c+' customers = '+fmt(tout[2].mr)+' MRR\\n';" +
  "r+='\\u2022 Enterprise: '+fmt(tout[3].m)+'/mo  \\u00d7 '+tout[3].c+' customers = '+fmt(tout[3].mr)+' MRR\\n';" +
  "r+='\\u2022 Total MRR:                  '+fmt(tmr)+'\\n';" +
  "r+='\\u2022 Total Customers:       '+tc2.toLocaleString()+'\\n';" +
  "r+='\\u2022 ARPU:                            '+fmt(arpu)+'/mo\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCD0 Key Metrics:\\n';" +
  "r+='\\u2022 Weighted Gross Margin:    '+pct(wm*100)+'  (blended across tiers)\\n';" +
  "r+='\\u2022 Target Margin:                    '+pct(tm*100)+'  (industry benchmark: 70-80%)\\n';" +
  "r+='\\u2022 ARPU by Tier:                     $'+tiers[0].m+' / $'+tiers[1].m+' / $'+tiers[2].m+' / $'+tiers[3].m+'\\n';" +
  "r+='\\u2022 Margin by Tier:                '+pct(tiers[0].mg*100)+' / '+pct(tiers[1].mg*100)+' / '+pct(tiers[2].mg*100)+' / '+pct(tiers[3].mg*100)+'\\n';" +
  "r+='\\u2022 Enterprise % of MRR:        '+pct((tout[3].mr/Math.max(tmr,1))*100)+'  (high = strong moat)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDCA7 Pricing Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "var ut=tiers.filter(function(t){return t.mg<0.5});" +
  "if(ut.length===0){r+='\\u2022 \\uD83D\\uDFE2 All tiers above 50% margin \\u2014 healthy pricing structure.\\n';}else{r+='\\u2022 \\uD83D\\uDD34 '+ut.length+' tier(s) below 50% margin: '+ut.map(function(t){return t.n}).join(', ')+' \\u2014 review feature costs.\\n';}" +
  "if(tout[3].mr/tmr>0.25){r+='\\u2022 \\uD83D\\uDFE2 Enterprise = '+pct((tout[3].mr/tmr)*100)+' of MRR \\u2014 strong enterprise traction.\\n';}else if(tout[3].mr/tmr>0.10){r+='\\u2022 \\uD83D\\uDFE1 Enterprise = '+pct((tout[3].mr/tmr)*100)+' of MRR \\u2014 healthy mix.\\n';}else{r+='\\u2022 \\uD83D\\uDFE0 Enterprise = only '+pct((tout[3].mr/Math.max(tmr,1))*100)+' of MRR \\u2014 opportunity to expand upmarket.\\n';}" +
  "if(wm>=tm){r+='\\u2022 \\uD83D\\uDFE2 Blended margin ('+pct(wm*100)+') hits target.\\n';}else{r+='\\u2022 \\uD83D\\uDFE1 Blended margin ('+pct(wm*100)+') below target \\u2014 raise prices or cut costs.\\n';}" +
  "if(cp>0&&tiers[1].m<cp*0.7){r+='\\u2022 \\uD83D\\uDFE2 Pro tier well below competitor \\u2014 could raise 20-30% without losing deals.\\n';}else if(cp>0&&tiers[1].m>cp*1.3){r+='\\u2022 \\uD83D\\uDFE0 Pro tier 30%+ above competitor \\u2014 risk of price objection.\\n';}" +
  "r+='\\n\\uD83C\\uDFAF LTV by Tier:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Starter:           $'+Math.round(tout[0].ltv).toLocaleString()+'  ('+pct(tiers[0].mg*100)+' margin, '+pct(ac*100)+' monthly churn)\\n';" +
  "r+='\\u2022 Pro:                  $'+Math.round(tout[1].ltv).toLocaleString()+'  ('+pct(tiers[1].mg*100)+' margin)\\n';" +
  "r+='\\u2022 Max:                  $'+Math.round(tout[2].ltv).toLocaleString()+'  ('+pct(tiers[2].mg*100)+' margin)\\n';" +
  "r+='\\u2022 Enterprise:    $'+Math.round(tout[3].ltv).toLocaleString()+'  ('+pct(tiers[3].mg*100)+' margin)\\n';" +
  "r+='\\u2022 Average LTV:      $'+Math.round(tout.reduce(function(s,t){return s+t.ltv*t.c},0)/Math.max(tc2,1)).toLocaleString()+'\\n';" +
  "r+='\\u2022 LTV Formula:      (Price \\u00d7 Margin) / Monthly Churn\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Break-Even Customers per Tier:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Starter:           ~'+tout[0].be+' customers  to break even on $2K/mo costs\\n';" +
  "r+='\\u2022 Pro:                  ~'+tout[1].be+' customers  to break even on $2K/mo costs\\n';" +
  "r+='\\u2022 Max:                  ~'+tout[2].be+' customers  to break even on $2K/mo costs\\n';" +
  "r+='\\u2022 Enterprise:    ~'+tout[3].be+' customers  to break even on $2K/mo costs\\n';" +
  "r+='\\u2022 (Assumes $2K/mo fixed costs per tier \\u2014 adjust based on actual overhead)\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise all tiers 20%:   Pro becomes $'+Math.round(tiers[1].m*1.2)+'/mo, MRR \\u2192 '+fmt(tmr*1.2)+'  (test willingness to pay)\\n';" +
  "r+='\\u2022 Cut Starter by 50%:    Convert funnel to Pro \\u2014 gain $'+Math.round(tiers[1].m*0.3*tiers[0].c)+'/mo\\n';" +
  "r+='\\u2022 Add annual discount (15% off):   $'+Math.round(tiers[1].m*12*0.85)+'/yr  vs $'+(tiers[1].m*12)+'/yr monthly\\n';" +
  "r+='\\u2022 Move 10% of Pro users to Max:   +$'+Math.round((tiers[2].m-tiers[1].m)*tiers[1].c*0.1).toLocaleString()+'/mo MRR\\n';" +
  "r+='\\u2022 Drop lowest-margin tier ('+(ut[0]&&ut[0].n||'none')+'):   refocus on profitable tiers\\n\\n';" +
  "r+='\\uD83D\\uDCA1 Tip: '+models[pr].t+'\\n\\n';" +
  "r+='\\uD83D\\uDCCC Recommended Action: Launch with Tiered model, Pro at $'+tiers[1].m+'/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.';" +
  "var results=[r];" +
  "for(var i=0;i<models.length;i++){var m=models[i];var ic=i===pr?'\\u2B50':'\\u2022';results.push(ic+' '+m.n+': $'+m.l+' \\u2013 $'+m.m+' \\u2013 $'+m.h+'/mo\\n  '+m.b);}" +
  "results.push('\\uD83C\\uDFAF Audience Insight:\\n'+(at[tc]||at['b2b'])+'\\n\\n\\uD83D\\uDCE6 Product Insight:\\n'+(prt[pt]||prt['SaaS'])+'\\n\\n\\uD83D\\uDE80 Next step: Pick one model, launch at the Pro tier ($'+tiers[1].m+'/mo), and adjust pricing after collecting 100+ conversion data points.');" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-saas-pricing-planner',
  title: 'SaaS Pricing Planner',
  description: 'Plan your SaaS pricing tiers with margin analysis, LTV by tier, break-even customers, and pricing health diagnostics.',
  category: 'C',
  inputs: [
    { name: 'productType', label: 'Product Type', placeholder: '', type: 'select', options: ['SaaS', 'ebook', 'course', 'template', 'newsletter'] },
    { name: 'targetCustomer', label: 'Target Customer', placeholder: '', type: 'select', options: ['b2b', 'b2c', 'developers', 'creators'] },
    { name: 'competitorPrice', label: 'Competitor Average Price ($)', placeholder: 'e.g. 29', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return planPricing(inputs);
  },
  staticExamples: [
    '🎯 SaaS Pricing Planner\n\n📦 Product: SaaS  |  👤 Target: b2b  |  💰 Competitor: $29/mo\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n💰 Tier Snapshot:\n• Starter:      $17/mo  × 1000 customers = $17,000 MRR\n• Pro:            $38/mo  × 400 customers = $15,200 MRR\n• Max:            $79/mo  × 80 customers = $6,320 MRR\n• Enterprise: $499/mo  × 12 customers = $5,988 MRR\n• Total MRR:                  $44,508\n• Total Customers:       1,492\n• ARPU:                            $30/mo\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n📐 Key Metrics:\n• Weighted Gross Margin:    76.8%  (blended across tiers)\n• Target Margin:                    70.0%  (industry benchmark: 70-80%)\n• ARPU by Tier:                     $17 / $38 / $79 / $499\n• Margin by Tier:                85.0% / 75.0% / 70.0% / 65.0%\n• Enterprise % of MRR:        13.5%  (high = strong moat)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🩺 Pricing Health:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• 🟢 All tiers above 50% margin — healthy pricing structure.\n• 🟡 Enterprise = 13.5% of MRR — healthy mix.\n• 🟢 Blended margin (76.8%) hits target.\n• 🟠 Pro tier 30%+ above competitor — risk of price objection.\n\n🎯 LTV by Tier:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starter:           $482  (85.0% margin, 3.0% monthly churn)\n• Pro:                  $950  (75.0% margin)\n• Max:                  $1,843  (70.0% margin)\n• Enterprise:    $10,812  (65.0% margin)\n• Average LTV:      $763\n• LTV Formula:      (Price × Margin) / Monthly Churn\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n⚖️ Break-Even Customers per Tier:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Starter:           ~139 customers  to break even on $2K/mo costs\n• Pro:                  ~71 customers  to break even on $2K/mo costs\n• Max:                  ~37 customers  to break even on $2K/mo costs\n• Enterprise:    ~7 customers  to break even on $2K/mo costs\n• (Assumes $2K/mo fixed costs per tier — adjust based on actual overhead)\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n🔄 What-If Scenarios:\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n• Raise all tiers 20%:   Pro becomes $46/mo, MRR → $53,410  (test willingness to pay)\n• Cut Starter by 50%:    Convert funnel to Pro — gain $11400/mo\n• Add annual discount (15% off):   $388/yr  vs $456/yr monthly\n• Move 10% of Pro users to Max:   +$1,640/mo MRR\n• Drop lowest-margin tier (none):   refocus on profitable tiers\n\n💡 Tip: 3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).\n\n📌 Recommended Action: Launch with Tiered model, Pro at $38/mo as the anchor. Use Starter as a low-friction entry point and Max/Enterprise to capture expansion revenue.\n• Flat-Rate: $20 – $29 – $44/mo\n  Simple tools with one clear use case. Best for early-stage products.\n⭐ Tiered: $15 – $29 – $73/mo\n  Products with power users who will pay more for advanced features.\n• Usage-Based: $12 – $35 – $87/mo\n  API products, AI tools, or any product where value scales with usage.\n• Freemium: $0 – $23 – $52/mo\n  B2C products or tools that benefit from network effects and word-of-mouth.\n🎯 Audience Insight:\nB2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.\n\n📦 Product Insight:\nSaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.\n\n🚀 Next step: Pick one model, launch at the Pro tier ($38/mo), and adjust pricing after collecting 100+ conversion data points.',
    '',
    '',
    '',
    '',
    '',
  ],
  faq: [
    { q: 'Which pricing model is best for a new SaaS?', a: 'Start with flat-rate or two tiers. Validate willingness to pay first, then expand to three tiers once you understand your power users.' },
    { q: 'How much should I charge compared to competitors?', a: 'If you offer more value, charge 20-50% more. If you want fast market entry, charge 20% less. Never compete on price alone — compete on differentiated value.' },
    { q: 'What is anchor pricing?', a: 'Present a high-priced tier to make your mid-tier look like a bargain. The middle tier becomes the obvious choice for most buyers.' },
    { q: 'Should I show pricing on my landing page?', a: 'Yes. Transparent pricing builds trust. If you must hide it (enterprise deals), at least show a starting price or range.' },
    { q: 'When should I raise prices?', a: 'Raise prices when your product has significantly more value than at launch, or when demand outpaces your capacity. Grandfather existing customers to avoid churn.' },
  ],
  howToUse: [
    'Select your product type.',
    'Select your target customer segment.',
    'Enter the average competitor price (or skip if unknown).',
    'Review the 4-tier breakdown with margin, MRR, and LTV analysis.',
    'Check pricing health diagnostics for issues.',
    'Use the what-if scenarios to model pricing changes.',
  ],
};

registerEngine(engine);
