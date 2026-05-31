import type { ToolEngine } from './types';
import { registerEngine } from './registry';

const cpmMap: Record<string, number> = {
  Finance: 12,
  Tech: 8,
  Gaming: 3,
  'Beauty & Fashion': 5,
  Education: 6,
  Entertainment: 3,
  Music: 2,
  Travel: 4,
  Cooking: 3,
  Fitness: 4,
};

function calculateEarnings(inputs: Record<string, string>): string[] {
  const views = parseInt(inputs.views) || 0;
  const cpm = cpmMap[inputs.niche] || 5;
  const rpm = cpm * 0.55;
  const monthly = (views / 1000) * rpm;
  const yearly = monthly * 12;
  const fmt = (n: number) => n.toFixed(2);

  return [
    '📊 Monthly Views: ' + views.toLocaleString() +
    '\n💰 Estimated CPM: $' + cpm +
    '\n📉 Effective RPM (after YouTube cut): $' + fmt(rpm) +
    '\n\n💵 Estimated Monthly Earnings: $' + fmt(monthly) +
    '\n💵 Estimated Yearly Earnings: $' + fmt(yearly) +
    '\n\n⚠️ This is an estimate. Actual earnings depend on watch time, ad types, viewer location, and seasonality.',
  ];
}

const engine: ToolEngine = {
  slug: 'youtube-cpm-calculator',
  title: 'YouTube CPM Revenue Calculator',
  description: 'Estimate YouTube earnings based on views and niche CPM rates.',
  category: 'F',
  inputs: [
    { name: 'views', label: 'Monthly Views', placeholder: 'e.g. 100000', type: 'text' },
    { name: 'niche', label: 'Video Niche', placeholder: '', type: 'select', options: ['Gaming', 'Tech', 'Finance', 'Beauty & Fashion', 'Education', 'Entertainment', 'Music', 'Travel', 'Cooking', 'Fitness'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn:
      "var views=parseInt(inputs.views)||0;" +
      "var cpmMap={Finance:12,Tech:8,Gaming:3,'Beauty & Fashion':5,Education:6,Entertainment:3,Music:2,Travel:4,Cooking:3,Fitness:4};" +
      "var cpm=cpmMap[inputs.niche]||5;" +
      "var rpm=cpm*0.55;" +
      "var monthly=(views/1000)*rpm;" +
      "var yearly=monthly*12;" +
      "function fmt(n){return n.toFixed(2)};" +
      "return ['\\uD83D\\uDCCA Monthly Views: '+views.toLocaleString()+'\\n\\uD83D\\uDCB0 Estimated CPM: $'+cpm+'\\n\\uD83D\\uDCC9 Effective RPM (after YouTube cut): $'+fmt(rpm)+'\\n\\n\\uD83D\\uDCB5 Estimated Monthly Earnings: $'+fmt(monthly)+'\\n\\uD83D\\uDCB5 Estimated Yearly Earnings: $'+fmt(yearly)+'\\n\\n\\u26A0\\uFE0F This is an estimate. Actual earnings depend on watch time, ad types, viewer location, and seasonality.'];",
  },
  generate(inputs: Record<string, string>): string[] {
    return calculateEarnings(inputs);
  },
  staticExamples: [
    '📊 Monthly Views: 100,000\n💰 Estimated CPM: $8\n📉 Effective RPM (after YouTube cut): $4.40\n\n💵 Estimated Monthly Earnings: $440.00\n💵 Estimated Yearly Earnings: $5280.00\n\n⚠️ This is an estimate. Actual earnings depend on watch time, ad types, viewer location, and seasonality.',
  ],
  faq: [
    { q: 'What is CPM?', a: 'Cost Per Mille — how much advertisers pay per 1000 ad views. Your RPM (Revenue Per Mille) is typically 55% of CPM after YouTube\'s cut.' },
    { q: 'How accurate is this calculator?', a: 'It provides estimates based on average niche CPMs. Actual earnings vary by season, audience location, and video length.' },
    { q: 'Which niche pays the most?', a: 'Finance ($12-20 CPM), Tech ($8-12), and Education ($6-10) typically have the highest CPMs.' },
  ],
  howToUse: [
    'Enter your monthly views.',
    'Select your niche.',
    'View estimated earnings.',
    'Remember: CPM varies by season. Holiday season (Q4) typically has the highest CPM.',
  ],
};

registerEngine(engine);
