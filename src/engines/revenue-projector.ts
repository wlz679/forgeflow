import type { ToolEngine } from '../core/engines/types';
import { registerEngine } from '../core/engines/registry';

function projectRevenue(inputs: Record<string, string>): string[] {
  const currentMRR = parseFloat(inputs.currentMRR) || 0;
  const growthRate = parseFloat(inputs.monthlyGrowthRate) || 0;
  const months = parseInt(inputs.months) || 12;
  const results: string[] = [];

  const monthlyRate = growthRate / 100;
  let projected = currentMRR;
  let totalRevenue = 0;
  let projection = '';

  const loc = (n: number) => '$' + Math.round(n).toLocaleString();

  projection += '📈 Revenue Projection (' + months + ' months at ' + growthRate + '% monthly growth)\n\n';
  projection += 'Month 0  (Now):       ' + loc(projected) + '/mo\n';

  for (let m = 1; m <= months; m++) {
    projected = projected * (1 + monthlyRate);
    totalRevenue += projected;
    projection += 'Month ' + m + ':  ' + loc(projected) + '/mo';
    if (m % 3 === 0) projection += ' ← Quarter ' + (m / 3);
    projection += '\n';
  }

  projection += '\n━━━━━━━━━━━━━━━━━━━━\n';
  projection += '📊 Summary:\n';
  projection += '• Starting MRR: ' + loc(currentMRR) + '\n';
  projection += '• Ending MRR: ' + loc(projected) + '\n';
  projection += '• Total Revenue: ' + loc(totalRevenue) + '\n';
  projection += '• Growth Multiple: ' + (projected / currentMRR).toFixed(1) + 'x\n\n';

  if (growthRate >= 10) {
    projection += '🔥 Exceptional growth! At this rate you\'ll hit $100K MRR in ' + Math.ceil(Math.log(100000 / currentMRR) / Math.log(1 + monthlyRate)) + ' months.\n';
  } else if (growthRate >= 5) {
    projection += '🚀 Strong growth. Focus on sustaining this rate — churn is the biggest threat to compounding.\n';
  } else if (growthRate >= 2) {
    projection += '📈 Steady growth. Small improvements in conversion can compound significantly over 12+ months.\n';
  } else {
    projection += '💪 Slow and steady. At this rate, focus on reducing churn and increasing LTV rather than chasing growth hacks.\n';
  }

  projection += '\n💡 Compound growth is powerful: a 5% monthly improvement compounds to 80% annual growth. Small wins matter.';

  results.push(projection);

  const scenarios = [
    { rate: 1, label: 'Conservative (1%/mo)' },
    { rate: 3, label: 'Moderate (3%/mo)' },
    { rate: 5, label: 'Good (5%/mo)' },
    { rate: 8, label: 'Strong (8%/mo)' },
    { rate: 10, label: 'Aggressive (10%/mo)' },
    { rate: 15, label: 'Viral (15%/mo)' },
    { rate: 20, label: 'Hyper-Growth (20%/mo)' },
    { rate: 2, label: 'Side Hustle (2%/mo)' },
    { rate: 7, label: 'Funded Startup (7%/mo)' },
  ];

  for (let i = 0; i < scenarios.length; i++) {
    let s = currentMRR;
    for (let m = 0; m < Math.min(months, 12); m++) {
      s = s * (1 + scenarios[i].rate / 100);
    }
    results.push(
      scenarios[i].label + ': $' + Math.round(currentMRR).toLocaleString() +
      ' → $' + Math.round(s).toLocaleString() + ' in ' + Math.min(months, 12) + ' months (' + scenarios[i].rate + '%/mo)',
    );
  }

  return results;
}

const customFn =
  "var mrr=parseFloat(inputs.currentMRR)||0;" +
  "var gr=parseFloat(inputs.monthlyGrowthRate)||0;" +
  "var months=parseInt(inputs.months)||12;" +
  "var mr=gr/100;" +
  "var p=mrr;var total=0;var proj='';" +
  "function loc(n){return '$'+Math.round(n).toLocaleString()}" +
  "proj+='\\uD83D\\uDCC8 Revenue Projection ('+months+' months at '+gr+'% monthly growth)\\n\\n';" +
  "proj+='Month 0  (Now):       '+loc(p)+'/mo\\n';" +
  "for(var m=1;m<=months;m++){p=p*(1+mr);total+=p;proj+='Month '+m+':  '+loc(p)+'/mo';if(m%3===0)proj+=' \\u2190 Quarter '+(m/3);proj+='\\n';}" +
  "proj+='\\n\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "proj+='\\uD83D\\uDCCA Summary:\\n';" +
  "proj+='\\u2022 Starting MRR: '+loc(mrr)+'\\n';" +
  "proj+='\\u2022 Ending MRR: '+loc(p)+'\\n';" +
  "proj+='\\u2022 Total Revenue: '+loc(total)+'\\n';" +
  "proj+='\\u2022 Growth Multiple: '+(p/mrr).toFixed(1)+'x\\n\\n';" +
  "if(gr>=10)proj+='\\uD83D\\uDD25 Exceptional growth! At this rate you\\'ll hit $100K MRR in '+Math.ceil(Math.log(100000/mrr)/Math.log(1+mr))+' months.\\n';" +
  "else if(gr>=5)proj+='\\uD83D\\uDE80 Strong growth. Focus on sustaining this rate \\u2014 churn is the biggest threat to compounding.\\n';" +
  "else if(gr>=2)proj+='\\uD83D\\uDCC8 Steady growth. Small improvements in conversion can compound significantly over 12+ months.\\n';" +
  "else proj+='\\uD83D\\uDCAA Slow and steady. At this rate, focus on reducing churn and increasing LTV rather than chasing growth hacks.\\n';" +
  "proj+='\\n\\uD83D\\uDCA1 Compound growth is powerful: a 5% monthly improvement compounds to 80% annual growth. Small wins matter.';" +
  "var results=[proj];" +
  "var scs=[{r:1,l:'Conservative (1%/mo)'},{r:3,l:'Moderate (3%/mo)'},{r:5,l:'Good (5%/mo)'},{r:8,l:'Strong (8%/mo)'},{r:10,l:'Aggressive (10%/mo)'},{r:15,l:'Viral (15%/mo)'},{r:20,l:'Hyper-Growth (20%/mo)'},{r:2,l:'Side Hustle (2%/mo)'},{r:7,l:'Funded Startup (7%/mo)'}];" +
  "for(var i=0;i<scs.length;i++){var s=mrr;for(var j=0;j<Math.min(months,12);j++){s=s*(1+scs[i].r/100);}results.push(scs[i].l+': $'+Math.round(mrr).toLocaleString()+' \\u2192 $'+Math.round(s).toLocaleString()+' in '+Math.min(months,12)+' months ('+scs[i].r+'%/mo)');}" +
  "return results;";

const engine: ToolEngine = {
  slug: 'solopreneur-revenue-projector',
  title: 'Revenue Projector',
  description: 'Project your MRR growth over 6, 12, or 24 months. Compare different growth rate scenarios to plan your financial future.',
  category: 'C',
  inputs: [
    { name: 'currentMRR', label: 'Current MRR ($)', placeholder: 'e.g. 2000', type: 'number' },
    { name: 'monthlyGrowthRate', label: 'Monthly Growth Rate (%)', placeholder: 'e.g. 5', type: 'number' },
    { name: 'months', label: 'Projection Period', placeholder: '', type: 'select', options: ['6', '12', '24'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    return projectRevenue(inputs);
  },
  staticExamples: [
    '📈 Revenue Projection (12 months at 5% monthly growth)\n\nMonth 0  (Now):       $2,000/mo\nMonth 1:  $2,100/mo\nMonth 2:  $2,205/mo\nMonth 3:  $2,315/mo ← Quarter 1\nMonth 4:  $2,431/mo\nMonth 5:  $2,553/mo\nMonth 6:  $2,680/mo ← Quarter 2\nMonth 7:  $2,814/mo\nMonth 8:  $2,955/mo\nMonth 9:  $3,103/mo ← Quarter 3\nMonth 10:  $3,258/mo\nMonth 11:  $3,421/mo\nMonth 12:  $3,592/mo ← Quarter 4\n\n━━━━━━━━━━━━━━━━━━━━\n📊 Summary:\n• Starting MRR: $2,000\n• Ending MRR: $3,592\n• Total Revenue: $30,397\n• Growth Multiple: 1.8x\n\n🚀 Strong growth. Focus on sustaining this rate — churn is the biggest threat to compounding.\n\n💡 Compound growth is powerful: a 5% monthly improvement compounds to 80% annual growth. Small wins matter.',
    'Conservative (1%/mo): $2,000 → $2,254 in 12 months (1%/mo)',
    'Moderate (3%/mo): $2,000 → $2,852 in 12 months (3%/mo)',
    'Good (5%/mo): $2,000 → $3,592 in 12 months (5%/mo)',
    'Strong (8%/mo): $2,000 → $5,036 in 12 months (8%/mo)',
  ],
  faq: [
    { q: 'What is a good monthly growth rate for a SaaS?', a: '5-10% monthly growth is considered good for early-stage SaaS. 2-3% is healthy for mature products. Anything above 10% is exceptional.' },
    { q: 'How do I increase my monthly growth rate?', a: 'Focus on three levers: increase traffic (SEO, content, ads), improve conversion rate (better landing page, free trial), and reduce churn (onboarding, customer success).' },
    { q: 'Is linear or exponential growth more realistic?', a: 'SaaS growth is typically exponential in the early stages and linear as you saturate your market. This calculator models exponential growth, which fits most early-stage products.' },
    { q: 'What if my growth rate varies month to month?', a: 'Use your 3-month average. If you had 8%, 5%, and 3%, your average is ~5.3%. Conservative estimates are better for planning.' },
    { q: 'When should I expect growth to slow?', a: 'Growth naturally slows as you capture your initial market. At $10K MRR, 5% is great. At $100K MRR, 2-3% is healthy. The law of large numbers applies.' },
  ],
  howToUse: [
    'Enter your current Monthly Recurring Revenue (MRR).',
    'Enter your average monthly growth rate as a percentage.',
    'Select your projection period (6, 12, or 24 months).',
    'Review the month-by-month projection.',
    'Scroll down to compare 9 different growth rate scenarios.',
    'Use the insights to set realistic targets and identify which growth levers to pull.',
  ],
};

registerEngine(engine);
