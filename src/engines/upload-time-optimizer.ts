import type { ToolEngine } from './types';
import { registerEngine } from './registry';

const timeMap: Record<string, { days: string; times: string; reason: string }> = {
  'North America': { days: 'Thursday, Friday, Saturday', times: '2-4 PM EST / 12-2 PM PST', reason: 'Viewers browse during lunch and after work.' },
  'Europe': { days: 'Wednesday, Thursday, Friday', times: '4-6 PM CET / 5-7 PM GMT', reason: 'Peak evening browsing across EU timezones.' },
  'Asia': { days: 'Friday, Saturday, Sunday', times: '7-9 PM IST / 9-11 PM JST', reason: 'Weekend evening peak across Asian markets.' },
  'South America': { days: 'Thursday, Friday', times: '5-7 PM BRT', reason: 'Evening hours show highest engagement.' },
  'Australia': { days: 'Wednesday, Thursday', times: '6-8 PM AEST', reason: 'Mid-week evening peak.' },
  'Global': { days: 'Thursday, Friday', times: '12-2 PM EST', reason: 'Captures US afternoon + EU evening simultaneously.' },
};

function getRecommendation(inputs: Record<string, string>): string[] {
  const region = inputs.audience || 'Global';
  const t = timeMap[region] || timeMap['Global'];
  return [
    '📅 Best Days: ' + t.days + '\n⏰ Best Times: ' + t.times + '\n📊 Why: ' + t.reason + '\n\n💡 Tip: Upload 2-3 hours before peak time to allow YouTube to process and index your video.',
  ];
}

const engine: ToolEngine = {
  slug: 'youtube-upload-time-optimizer',
  title: 'YouTube Upload Time Optimizer',
  description: 'Find the best day and time to upload for maximum views.',
  category: 'F',
  inputs: [
    { name: 'niche', label: 'Your Niche', placeholder: 'e.g. gaming, beauty, education', type: 'text' },
    { name: 'audience', label: 'Primary Audience Region', placeholder: '', type: 'select', options: ['North America', 'Europe', 'Asia', 'South America', 'Australia', 'Global'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn:
      "var niche=inputs.niche||'general';var region=inputs.audience||'Global';" +
      "var map={" +
      "'North America':{days:'Thursday, Friday, Saturday',times:'2-4 PM EST / 12-2 PM PST',reason:'Viewers browse during lunch and after work.'}," +
      "'Europe':{days:'Wednesday, Thursday, Friday',times:'4-6 PM CET / 5-7 PM GMT',reason:'Peak evening browsing across EU timezones.'}," +
      "'Asia':{days:'Friday, Saturday, Sunday',times:'7-9 PM IST / 9-11 PM JST',reason:'Weekend evening peak across Asian markets.'}," +
      "'South America':{days:'Thursday, Friday',times:'5-7 PM BRT',reason:'Evening hours show highest engagement.'}," +
      "'Australia':{days:'Wednesday, Thursday',times:'6-8 PM AEST',reason:'Mid-week evening peak.'}," +
      "'Global':{days:'Thursday, Friday',times:'12-2 PM EST',reason:'Captures US afternoon + EU evening simultaneously.'}" +
      "};" +
      "var t=map[region]||map['Global'];" +
      "return ['\\uD83D\\uDCC5 Best Days: '+t.days+'\\n\\u23F0 Best Times: '+t.times+'\\n\\uD83D\\uDCCA Why: '+t.reason+'\\n\\n\\uD83D\\uDCA1 Tip: Upload 2-3 hours before peak time to allow YouTube to process and index your video.'];",
  },
  generate(inputs: Record<string, string>): string[] {
    return getRecommendation(inputs);
  },
  staticExamples: [
    '📅 Best Days: Thursday, Friday, Saturday\n⏰ Best Times: 2-4 PM EST / 12-2 PM PST\n📊 Why: Viewers browse during lunch and after work.\n\n💡 Tip: Upload 2-3 hours before peak time to allow YouTube to process and index your video.',
  ],
  faq: [
    { q: 'Does upload time really matter?', a: 'It matters most in the first 48 hours. Uploading when your audience is most active boosts initial views, which signals YouTube to promote your video.' },
    { q: 'How do I find my specific best time?', a: 'Check YouTube Studio Analytics → Audience tab → "When your viewers are on YouTube". This shows your specific audience\'s peak hours.' },
  ],
  howToUse: [
    'Enter your niche.',
    'Select your primary audience region.',
    'Click "Find Best Time".',
    'Use the recommended days and times for your upload schedule.',
  ],
};

registerEngine(engine);
