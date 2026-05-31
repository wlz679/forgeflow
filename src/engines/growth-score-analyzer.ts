import type { ToolEngine } from './types';
import { registerEngine } from './registry';

function analyzeGrowth(inputs: Record<string, string>): string[] {
  const subs = parseInt(inputs.subscribers) || 0;
  const uploads = parseInt(inputs.uploads) || 0;
  const niche = inputs.niche || 'Other';
  let score = 5;
  const tips: string[] = [];

  if (subs < 100) {
    score -= 2;
    tips.push('Focus on getting your first 100 subscribers — collaborate with other small creators.');
  } else if (subs < 1000) {
    tips.push("You're building momentum. Focus on consistency and finding your niche voice.");
  } else if (subs < 10000) {
    score += 2;
    tips.push("Solid base! Double down on what's working. Analyze your top 5 videos.");
  } else {
    score += 3;
    tips.push('Strong following! Consider brand deals and diversifying content.');
  }

  if (uploads < 4) {
    score -= 2;
    tips.push('Upload more frequently — aim for at least 4 videos per month.');
  } else if (uploads < 12) {
    score += 1;
    tips.push('Good upload frequency. Quality over quantity.');
  } else {
    score += 2;
    tips.push("Great consistency! Make sure you're not burning out.");
  }

  const nicheScores: Record<string, number> = {
    Gaming: 1, Tech: 2, Finance: 3, Education: 2, Entertainment: 0,
    Vlog: -1, Beauty: 1, Music: -1, Sports: 0, Cooking: -1,
  };
  score += nicheScores[niche] || 0;
  score = Math.max(1, Math.min(10, score));

  const emoji = score >= 7 ? '🔥' : score >= 4 ? '📈' : '💪';

  return [
    emoji + ' Growth Score: ' + score + '/10\n\n' +
    '📊 Analysis:\n' +
    '• Subscribers: ' + subs.toLocaleString() + '\n' +
    '• Monthly Uploads: ' + uploads + '\n' +
    '• Niche: ' + niche + '\n\n' +
    '💡 Recommendations:\n' +
    tips.map(function(t) { return '• ' + t; }).join('\n') + '\n\n' +
    '🚀 Ready to grow? Try our Content Planner and Title Generator tools!',
  ];
}

const engine: ToolEngine = {
  slug: 'youtube-growth-score-analyzer',
  title: 'YouTube Growth Score Analyzer',
  description: 'Get a growth score and actionable tips from your channel info.',
  category: 'F',
  inputs: [
    { name: 'subscribers', label: 'Subscriber Count', placeholder: 'e.g. 5000', type: 'text' },
    { name: 'uploads', label: 'Videos Uploaded (per month)', placeholder: 'e.g. 8', type: 'text' },
    { name: 'niche', label: 'Your Niche', placeholder: '', type: 'select', options: ['Gaming', 'Tech', 'Education', 'Entertainment', 'Vlog', 'Beauty', 'Music', 'Sports', 'Cooking', 'Other'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn:
      "var subs=parseInt(inputs.subscribers)||0;var uploads=parseInt(inputs.uploads)||0;var niche=inputs.niche||'Other';var score=5;var tips=[];" +
      "if(subs<100){score-=2;tips.push('Focus on getting your first 100 subscribers \\u2014 collaborate with other small creators.');}" +
      "else if(subs<1000){tips.push('You\\'re building momentum. Focus on consistency and finding your niche voice.');}" +
      "else if(subs<10000){score+=2;tips.push('Solid base! Double down on what\\'s working. Analyze your top 5 videos.');}" +
      "else{score+=3;tips.push('Strong following! Consider brand deals and diversifying content.');}" +
      "if(uploads<4){score-=2;tips.push('Upload more frequently \\u2014 aim for at least 4 videos per month.');}" +
      "else if(uploads<12){score+=1;tips.push('Good upload frequency. Quality over quantity.');}" +
      "else{score+=2;tips.push('Great consistency! Make sure you\\'re not burning out.');}" +
      "var ns={Gaming:1,Tech:2,Finance:3,Education:2,Entertainment:0,Vlog:-1,Beauty:1,Music:-1,Sports:0,Cooking:-1};" +
      "score+=ns[niche]||0;score=Math.max(1,Math.min(10,score));" +
      "var emoji=score>=7?'\\uD83D\\uDD25':score>=4?'\\uD83D\\uDCC8':'\\uD83D\\uDCAA';" +
      "return [emoji+' Growth Score: '+score+'/10\\n\\n\\uD83D\\uDCCA Analysis:\\n\\u2022 Subscribers: '+subs.toLocaleString()+'\\n\\u2022 Monthly Uploads: '+uploads+'\\n\\u2022 Niche: '+niche+'\\n\\n\\uD83D\\uDCA1 Recommendations:\\n'+tips.map(function(t){return '\\u2022 '+t;}).join('\\n')+'\\n\\n\\uD83D\\uDE80 Ready to grow? Try our Content Planner and Title Generator tools!'];",
  },
  generate(inputs: Record<string, string>): string[] {
    return analyzeGrowth(inputs);
  },
  staticExamples: [
    '📈 Growth Score: 6/10\n\n📊 Analysis:\n• Subscribers: 5,000\n• Monthly Uploads: 8\n• Niche: Tech\n\n💡 Recommendations:\n• Solid base! Double down on what\'s working. Analyze your top 5 videos.\n• Good upload frequency. Quality over quantity.\n\n🚀 Ready to grow? Try our Content Planner and Title Generator tools!',
  ],
  faq: [
    { q: 'What is a good growth score?', a: '7+/10 is strong. The score measures your current trajectory based on subscriber count, upload consistency, and niche competitiveness.' },
    { q: 'How can I improve my score?', a: 'Upload consistently (4+ videos/month), optimize titles and thumbnails, and engage with your community through comments and posts.' },
  ],
  howToUse: [
    'Enter your subscriber count.',
    'Enter monthly uploads.',
    'Select niche.',
    'Click Analyze.',
    'Review score and recommendations.',
    'Apply the tips to improve.',
  ],
};

registerEngine(engine);
