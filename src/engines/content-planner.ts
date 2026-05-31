import type { ToolEngine } from './types';
import { randomPick, fillTemplate } from './helpers';
import { registerEngine } from './registry';

const templates = [
  '{niche} for Beginners: Getting Started',
  'Top {number} {niche} Tips That Actually Work',
  'How I {action} {niche} in {number} Days',
  '{niche} Review — Is It Worth It?',
  'My {niche} Routine — Step by Step',
  'The ULTIMATE {niche} Guide',
  '{niche} Mistakes to Avoid',
  'Trying {niche} for the First Time',
  '{niche} That Will BLOW Your Mind',
  'Reacting to Viral {niche} Videos',
  'Day {number}: {niche} Challenge',
  'Honest {niche} Advice for Beginners',
  'Why I Started {niche}',
  '{niche} vs {niche} — Which Is Better?',
  'What I Wish I Knew Before Starting {niche}',
  'The TRUTH About {niche}',
  '{number} {niche} Hacks That Changed Everything',
  'Behind the Scenes of {niche}',
  'I Asked an Expert About {niche}',
  '{niche} Q&A — Answering Your Questions',
];

const wordPools: Record<string, string[]> = {};

const customFn = "var count = inputs.duration === '30 days' ? 30 : 7; var results = []; var templates = ['{niche} for Beginners: Getting Started','Top {number} {niche} Tips That Actually Work','How I {action} {niche} in {number} Days','{niche} Review — Is It Worth It?','My {niche} Routine — Step by Step','The ULTIMATE {niche} Guide','{niche} Mistakes to Avoid','Trying {niche} for the First Time','{niche} That Will BLOW Your Mind','Reacting to Viral {niche} Videos','Day {number}: {niche} Challenge','Honest {niche} Advice for Beginners','Why I Started {niche}','{niche} vs {niche} — Which Is Better?','What I Wish I Knew Before Starting {niche}','The TRUTH About {niche}','{number} {niche} Hacks That Changed Everything','Behind the Scenes of {niche}','I Asked an Expert About {niche}','{niche} Q&A — Answering Your Questions']; var numberPool = ['3','5','7','10','30']; var actionPool = ['Mastered','Learned','Built','Started','Improved']; for (var i = 0; i < count; i++) { var v = {niche: inputs.niche || 'your niche', number: pick(numberPool), action: pick(actionPool)}; results.push('Day ' + (i+1) + ': ' + fill(pick(templates), v)); } return results;";

const engine: ToolEngine = {
  slug: 'youtube-content-planner',
  title: 'YouTube Content Planner',
  description: 'Generate a 7-day or 30-day content plan with video topics.',
  category: 'A',
  inputs: [
    { name: 'niche', label: 'Channel Niche', placeholder: 'e.g. tech reviews', type: 'text' },
    { name: 'duration', label: 'Plan Duration', placeholder: '', type: 'select', options: ['7 days', '30 days'] },
  ],
  clientConfig: { type: 'custom', wordPools, customFn },
  generate(inputs) {
    const count = inputs.duration === '30 days' ? 30 : 7;
    const results: string[] = [];
    const numberPool = ['3', '5', '7', '10', '30'];
    const actionPool = ['Mastered', 'Learned', 'Built', 'Started', 'Improved'];
    for (let i = 0; i < count; i++) {
      const vars: Record<string, string> = {
        niche: inputs.niche || 'your niche',
        number: randomPick(numberPool),
        action: randomPick(actionPool),
      };
      results.push(`Day ${i + 1}: ${fillTemplate(randomPick(templates), vars)}`);
    }
    return results;
  },
  staticExamples: [
    'Day 1: Tech Reviews for Beginners: Getting Started',
    'Day 2: Top 5 Tech Review Tips That Actually Work',
    'Day 3: How I Mastered Tech Reviews in 7 Days',
    'Day 4: Tech Reviews Review — Is It Worth It?',
    'Day 5: My Tech Review Routine — Step by Step',
    'Day 6: The ULTIMATE Tech Review Guide',
    'Day 7: Tech Review Mistakes to Avoid',
  ],
  faq: [
    { q: 'How do I create a consistent content calendar?', a: 'Mix: 40% search-based (tutorials), 30% trending, 20% community, 10% experimental.' },
    { q: 'Should I post every day?', a: '2-3 videos per week is ideal for most new channels. Consistency > frequency.' },
    { q: 'What day is best to upload?', a: 'Thursday-Saturday generally see higher engagement. Use our Upload Time Optimizer.' },
    { q: 'Is this tool free?', a: 'Yes, completely free. No signup required.' },
  ],
  howToUse: [
    'Enter your channel niche.',
    'Select 7 or 30 day plan.',
    'Click "Generate Plan".',
    'Each day gets a unique video topic. Copy individually or full plan.',
    'Customize to fit your style.',
  ],
};

registerEngine(engine);
