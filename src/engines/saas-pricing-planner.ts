import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function planPricing(inputs: Record<string, string>): string[] {
  const productType = inputs.productType || 'SaaS';
  const targetCustomer = inputs.targetCustomer || 'b2b';
  const competitorPrice = parseFloat(inputs.competitorPrice) || 0;
  const results: string[] = [];

  const models: Array<{ name: string; best: string; low: number; mid: number; high: number; tip: string }> = [
    {
      name: 'Flat-Rate',
      best: 'Simple tools with one clear use case. Best for early-stage products.',
      low: Math.max(5, Math.round(competitorPrice * 0.7)),
      mid: competitorPrice || 29,
      high: Math.round((competitorPrice || 29) * 1.5),
      tip: 'Keep it simple — one price, all features. Add a free trial to reduce friction.',
    },
    {
      name: 'Tiered',
      best: 'Products with power users who will pay more for advanced features.',
      low: Math.max(9, Math.round(competitorPrice * 0.5)),
      mid: competitorPrice || 49,
      high: Math.round((competitorPrice || 49) * 2.5),
      tip: '3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).',
    },
    {
      name: 'Usage-Based',
      best: 'API products, AI tools, or any product where value scales with usage.',
      low: Math.max(5, Math.round(competitorPrice * 0.4)),
      mid: Math.round((competitorPrice || 20) * 1.2),
      high: Math.round((competitorPrice || 20) * 3),
      tip: 'Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption.',
    },
    {
      name: 'Freemium',
      best: 'B2C products or tools that benefit from network effects and word-of-mouth.',
      low: 0,
      mid: Math.round(competitorPrice * 0.8) || 12,
      high: Math.round((competitorPrice || 15) * 1.8),
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

  results.push(
    '🎯 Pricing Recommendations for ' + productType + '\n\n' +
    '👤 Target: ' + targetCustomer + '\n' +
    '💰 Competitor Price: $' + (competitorPrice || 'N/A') + '\n\n' +
    '\n' +
    '⭐ BEST FIT: ' + models[primaryRec].name + ' Pricing\n' +
    models[primaryRec].best + '\n\n' +
    'Suggested Price Points:\n' +
    '• Starter: $' + models[primaryRec].low + '/mo\n' +
    '• Pro (recommended): $' + models[primaryRec].mid + '/mo\n' +
    '• Max: $' + models[primaryRec].high + '/mo\n\n' +
    '💡 ' + models[primaryRec].tip + '\n\n' +
    '\n' +
    '📊 All Models Compared:\n',
  );

  for (let i = 0; i < models.length; i++) {
    const icon = i === primaryRec ? '⭐' : '•';
    results.push(
      icon + ' ' + models[i].name + ': $' + models[i].low + ' – $' + models[i].mid + ' – $' + models[i].high + '/mo\n' +
      '  ' + models[i].best + '\n',
    );
  }

  results.push(
    '🎯 Audience Insight:\n' + (audienceTips[targetCustomer] || audienceTips.b2b) + '\n\n' +
    '📦 Product Insight:\n' + (productTips[productType] || productTips.SaaS) + '\n\n' +
    '🚀 Next step: Pick one model, launch at the mid-tier price, and adjust based on conversion data after 100 visitors.',
  );

  return results;
}

const customFn =
  "var pt=inputs.productType||'SaaS';" +
  "var tc=inputs.targetCustomer||'b2b';" +
  "var cp=parseFloat(inputs.competitorPrice)||0;" +
  "var models=[" +
  "{n:'Flat-Rate',b:'Simple tools with one clear use case. Best for early-stage products.',l:" + Math.max(5, Math.round(0)) + ",m:" + 29 + ",h:" + 44 + ",t:'Keep it simple \\u2014 one price, all features. Add a free trial to reduce friction.'}," +
  "{n:'Tiered',b:'Products with power users who will pay more for advanced features.',l:9,m:49,h:123,t:'3 tiers work best: Starter \\u2192 Pro \\u2192 Enterprise. The middle tier should be the obvious choice (anchor pricing).'}," +
  "{n:'Usage-Based',b:'API products, AI tools, or any product where value scales with usage.',l:5,m:24,h:60,t:'Charge per unit (API calls, seats, credits). Include a generous free tier to drive adoption.'}," +
  "{n:'Freemium',b:'B2C products or tools that benefit from network effects and word-of-mouth.',l:0,m:12,h:27,t:'Free plan must be genuinely useful but leave room for upgrade. 3-5% free-to-paid conversion is good.'}" +
  "];" +
  "var at={'b2b':'B2B buyers expect per-seat pricing and annual contracts. They value ROI calculators and case studies.','b2c':'B2C users prefer monthly subscriptions with easy cancellation. Focus on instant value and social proof.','developers':'Developers expect API-first pricing, generous free tiers, and transparent docs. They hate hidden fees.','creators':'Creators value revenue-share models or flat fees. Keep pricing predictable so they can forecast their margins.'};" +
  "var prt={'SaaS':'SaaS benchmarks: 50-70% gross margins. Aim for LTV:CAC ratio of 3:1 or higher.','ebook':'Ebooks typically sell for $9-$49. Bundle with templates/checklists to increase perceived value.','course':'Online courses range $49-$999. Price based on transformation value, not content length. Cohorts justify premium pricing.','template':'Templates sell for $5-$49. Bundle them into packs to raise AOV. Notion/Gumroad are popular distribution channels.','newsletter':'Newsletters convert 5-15% of free readers to paid. Typical paid tiers: $5-$15/mo or $50-$150/yr.'};" +
  "var pr=0;if(tc==='developers')pr=2;else if(tc==='b2b')pr=1;else if(pt==='newsletter')pr=0;" +
  "var m=models[pr];" +
  "var results=[];" +
  "results.push(" +
  "'\\uD83C\\uDFAF Pricing Recommendations for '+pt+'\\n\\n" +
  "\\uD83D\\uDC64 Target: '+tc+'\\n" +
  "\\uD83D\\uDCB0 Competitor Price: $'+(cp||'N/A')+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\u2B50 BEST FIT: '+m.n+' Pricing\\n" +
  "'+m.b+'\\n\\n" +
  "Suggested Price Points:\\n" +
  "\\u2022 Starter: $'+m.l+'/mo\\n" +
  "\\u2022 Pro (recommended): $'+m.m+'/mo\\n" +
  "\\u2022 Max: $'+m.h+'/mo\\n\\n" +
  "\\uD83D\\uDCA1 '+m.t+'\\n\\n" +
  "\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n" +
  "\\uD83D\\uDCCA All Models Compared:\\n'" +
  ");" +
  "for(var i=0;i<models.length;i++){var m2=models[i];var ic=i===pr?'\\u2B50':'\\u2022';results.push(ic+' '+m2.n+': $'+m2.l+' \\u2013 $'+m2.m+' \\u2013 $'+m2.h+'/mo\\n  '+m2.b+'\\n');}" +
  "results.push(" +
  "'\\uD83C\\uDFAF Audience Insight:\\n'+(at[tc]||at['b2b'])+'\\n\\n" +
  "\\uD83D\\uDCE6 Product Insight:\\n'+(prt[pt]||prt['SaaS'])+'\\n\\n" +
  "\\uD83D\\uDE80 Next step: Pick one model, launch at the mid-tier price, and adjust based on conversion data after 100 visitors.'" +
  ");" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-saas-pricing-planner',
  title: 'SaaS Pricing Planner',
  description: 'Compare flat, tiered, usage-based, and freemium pricing models. Get personalized recommendations based on your product type, audience, and competitor prices.',
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
    '🎯 Pricing Recommendations for SaaS\n\n👤 Target: b2b\n💰 Competitor Price: $29\n\n⭐ BEST FIT: Tiered Pricing\nProducts with power users who will pay more for advanced features.\n\nSuggested Price Points:\n• Starter: $15/mo\n• Pro (recommended): $29/mo\n• Max: $73/mo\n\n💡 3 tiers work best: Starter → Pro → Enterprise. The middle tier should be the obvious choice (anchor pricing).\n\n📊 All Models Compared:',
    '• Flat-Rate: $20 – $29 – $44/mo\n  Simple tools with one clear use case. Best for early-stage products.',
    '⭐ Tiered: $15 – $29 – $73/mo\n  Products with power users who will pay more for advanced features.',
    '• Usage-Based: $12 – $35 – $87/mo\n  API products, AI tools, or any product where value scales with usage.',
    '• Freemium: $0 – $23 – $52/mo\n  B2C products or tools that benefit from network effects and word-of-mouth.',
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
    'Review the best-fit pricing model recommendation.',
    'Compare all 4 models side by side.',
    'Use the audience and product insights to refine your pricing strategy.',
  ],
};

registerEngine(engine);
