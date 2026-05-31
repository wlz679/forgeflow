import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, fillTemplate } from './helpers';
import { registerEngine } from './registry';

const templates = [
  "Stop scrolling. This {topic} video is different.",
  "I'm about to {action} everything you know about {topic}.",
  "{number} seconds. That's all it took for {topic} to change my life.",
  "If you struggle with {topic}, this is for you.",
  "I tried {topic} for {duration} — the result was NOT what I expected.",
  "Most people get {topic} WRONG. Here's the truth.",
  "In {number} minutes, you'll know more about {topic} than 99% of people.",
  "The {topic} industry is hiding this from you.",
  "I spent ${money} on {topic}. Was it worth it?",
  "This {topic} mistake is costing you {number} views. Let me fix it.",
  "What if I told you everything you know about {topic} is wrong?",
  "I wish I knew this before I started {topic}.",
];

const wordPools = {
  number: ['3', '5', '10', '30', '60'],
  duration: ['30 days', 'a week', '24 hours', 'a month', '7 days'],
  action: ['change', 'fix', 'improve', 'redefine', 'revolutionize'],
  money: ['100', '500', '1000', '5000', '10000'],
};

const engine: ToolEngine = {
  slug: 'youtube-hook-generator',
  title: 'YouTube Hook Generator',
  description: 'Generate scroll-stopping first 3-second hooks for your videos.',
  category: 'B',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. how I learned Spanish in 30 days', type: 'text' },
  ],
  clientConfig: {
    type: 'templates',
    templates,
    wordPools,
  },
  generate(inputs) {
    return generateFromTemplates(templates, wordPools, inputs, 10);
  },
  staticExamples: [
    'Stop scrolling. This cooking video is different.',
    "I'm about to change everything you know about fitness.",
    "5 seconds. That's all it took for travel to change my life.",
    'If you struggle with guitar, this is for you.',
    'I tried meal prep for 30 days — the result was NOT what I expected.',
  ],
  faq: [
    {
      q: 'What makes a good video hook?',
      a: 'The first 3 seconds must create curiosity, emotion, or promise value. Strong hooks boost retention dramatically.',
    },
    {
      q: 'How long should my hook be?',
      a: '3-5 seconds. Get to the point immediately — viewers decide to stay or leave in the first 3 seconds.',
    },
    {
      q: 'Should I use the same hook pattern every video?',
      a: 'No. Vary your hooks to avoid predictability. Different patterns work for different video types.',
    },
    { q: 'Is this tool free?', a: 'Yes.' },
  ],
  howToUse: [
    'Enter your video topic.',
    'Click "Generate Hooks".',
    'Review 10 scroll-stopping hooks.',
    'Copy the best ones.',
    'Test different hooks to see what works for your audience.',
  ],
};

registerEngine(engine);
