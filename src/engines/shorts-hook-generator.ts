import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, randomPickN } from './helpers';
import { registerEngine } from './registry';

const templates: string[] = [
  'Wait for it... 😱',
  "You won't believe what happens next.",
  'This {topic} trick is GENIUS.',
  'I tried {topic} and... 💀',
  'POV: You discover this {topic} secret.',
  '3... 2... 1... {topic} MAGIC.',
  'My jaw DROPPED when I saw this {topic}.',
  'They said {topic} was impossible. Watch this.',
  "If you blink, you'll miss the best part of {topic}.",
  'The last {number} seconds of this {topic} video = 🤯',
];

const wordPools: Record<string, string[]> = {
  number: ['3', '5', '10', '15'],
};

const engine: ToolEngine = {
  slug: 'youtube-shorts-hook-generator',
  title: 'YouTube Shorts Hook Generator',
  description: 'Create attention-grabbing first-second hooks for Shorts.',
  category: 'C',
  inputs: [
    { name: 'topic', label: 'Shorts Topic', placeholder: 'e.g. quick recipe, magic trick', type: 'text' },
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
    'Wait for it... 😱',
    "You won't believe what happens next.",
    'This cooking trick is GENIUS.',
    'I tried fitness and... 💀',
    'POV: You discover this gaming secret.',
  ],
  faq: [
    { q: 'How important is the hook in Shorts?', a: 'Critical. You have 1 second to stop the scroll. Shorts autoplay in the feed — no click required.' },
    { q: 'What makes a good Shorts hook?', a: 'Visual change, pattern interrupt, text overlay, or unexpected action in the first frame.' },
  ],
  howToUse: [
    'Enter your topic.',
    'Click Generate.',
    'Copy hooks.',
    'Use as text overlay or first line of your Shorts.',
  ],
};

registerEngine(engine);
