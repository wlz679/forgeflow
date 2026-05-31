import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, randomPickN } from './helpers';
import { registerEngine } from './registry';

const templates: string[] = [
  '{number}-Second {niche} Hack You Need to Know',
  'Trying This VIRAL {niche} Trend',
  '{niche} in {number} Seconds — The Only Video You Need',
  'POV: You Finally Master {niche}',
  'The TRUTH About {niche} (Shorts Edition)',
  'One {niche} Tip That Changed Everything',
  '{niche} Before vs After — {number} Second Transformation',
  'STOP Doing This in {niche} (99% of People Do)',
  'The EASIEST Way to {niche} — No Experience Needed',
  'Ranking {niche} Products from 1-{number}',
  'If You Do {niche}, Watch This',
  '{reaction} {niche} — You Won\'t Believe #3',
  'My {number}-Minute {niche} Routine',
  'This {niche} Trend Is INSANE Right Now',
  'Day in the Life of a {niche} Creator ({number}s)',
];

const wordPools: Record<string, string[]> = {
  number: ['5', '10', '15', '30', '60', '100'],
  reaction: ['Reacting to', 'Trying', 'Testing', 'Ranking'],
};

const engine: ToolEngine = {
  slug: 'youtube-shorts-idea-generator',
  title: 'YouTube Shorts Idea Generator',
  description: 'Generate quick, engaging Shorts video ideas for fast growth.',
  category: 'C',
  inputs: [
    { name: 'niche', label: 'Your Niche', placeholder: 'e.g. cooking, dance, comedy', type: 'text' },
  ],
  clientConfig: {
    type: 'templates',
    templates,
    wordPools,
  },
  generate(inputs: Record<string, string>): string[] {
    return generateFromTemplates(templates, wordPools, inputs, 10);
  },
  staticExamples: [
    '5-Second Cooking Hack You Need to Know',
    'Trying This VIRAL Dance Trend',
    'Fitness in 30 Seconds — The Only Video You Need',
    'POV: You Finally Master Guitar',
    'The TRUTH About Productivity (Shorts Edition)',
  ],
  faq: [
    { q: 'How are Shorts ideas different from regular video ideas?', a: 'Shorts need quick, visual punch. Ideas work best when they show a transformation, reaction, or quick tip in under 60 seconds.' },
    { q: 'How many Shorts should I post per day?', a: '1-3 Shorts per day is optimal for growth. Consistency matters more than volume.' },
    { q: 'Do Shorts help grow my long-form channel?', a: 'Yes! Shorts can funnel viewers to your long-form content. Use related videos and end screens.' },
    { q: 'Free?', a: 'Yes.' },
  ],
  howToUse: [
    'Enter your niche.',
    'Click Generate.',
    'Review Shorts-specific ideas.',
    'Copy the best ones.',
    'Film quick, vertical videos (under 60s).',
  ],
};

registerEngine(engine);
