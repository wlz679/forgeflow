import type { ToolEngine } from './types';
import { randomPick } from './helpers';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-thumbnail-ctr-optimizer',
  title: 'YouTube Thumbnail CTR Optimizer',
  description: 'Optimize title and thumbnail combo for max click-through rate.',
  category: 'E',
  inputs: [
    { name: 'topic', label: 'Video Topic / Title Idea', placeholder: 'e.g. how to save $10k in a year', type: 'text' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: "var topic=inputs.topic||'your video';var pick=function(a){return a[Math.floor(Math.random()*a.length)]};var titles=['\"'+topic+': The TRUTH They Don\\'t Want You to Know\"','\"I Tried '+topic+' — You Won\\'t Believe What Happened\"','\"Why Your '+topic+' Isn\\'t Working (Fix in 5 Min)\"','\"The '+topic+' SECRET That Changed Everything\"','\"Don\\'t '+topic+' Until You Watch This\"'];var texts=['\"'+pick(['INSANE','WOW','GONE WRONG','SHOCKING'])+'!\"','\"'+pick(['99% FAIL','WORKS 100%','TRY THIS','DON\\'T BUY'])+'\"','\"'+pick(['BEFORE/AFTER','REAL RESULTS','$0 TO $10K','RATED #1'])+'\"'];var results=titles.map(function(t){return 'Title: '+t+'\\nThumbnail Text: '+pick(texts)+'\\n'});return [results.slice(0,5).join('---\\n')];",
  },
  generate(inputs) {
    const topic = inputs.topic || 'your video';
    const titles = [
      `"${topic}: The TRUTH They Don't Want You to Know"`,
      `"I Tried ${topic} — You Won't Believe What Happened"`,
      `"Why Your ${topic} Isn't Working (Fix in 5 Min)"`,
      `"The ${topic} SECRET That Changed Everything"`,
      `"Don't ${topic} Until You Watch This"`,
    ];
    const texts = [
      `"${randomPick(['INSANE','WOW','GONE WRONG','SHOCKING'])}!"`,
      `"${randomPick(['99% FAIL','WORKS 100%','TRY THIS','DON\'T BUY'])}"`,
      `"${randomPick(['BEFORE/AFTER','REAL RESULTS','$0 TO $10K','RATED #1'])}"`,
    ];
    return [titles.map(t => `Title: ${t}\nThumbnail Text: ${randomPick(texts)}\n`).slice(0, 5).join('---\n')];
  },
  staticExamples: [
    `Title: "how to save $10k in a year: The TRUTH They Don't Want You to Know"
Thumbnail Text: "GONE WRONG!"
---
Title: "I Tried how to save $10k in a year — You Won't Believe What Happened"
Thumbnail Text: "99% FAIL"`,
  ],
  faq: [
    { q: 'What is a good CTR for YouTube?', a: '4-8% is average. 10%+ is excellent. CTR varies heavily by niche — gaming tends lower, finance higher.' },
    { q: 'How do I improve my CTR?', a: 'Test different thumbnail styles, use contrasting colors, add emotional faces, and A/B test titles.' },
  ],
  howToUse: [
    'Enter your topic.',
    'Click Generate.',
    'Review title + thumbnail text combos.',
    'Use the combo that creates the strongest curiosity gap.',
    'A/B test different combos.',
  ],
};
registerEngine(engine);
