import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, randomPickN } from './helpers';
import { registerEngine } from './registry';

const templates: string[] = [
  '{number}s {topic} Hack 🤯',
  'Try This {topic} Trick ({number}s)',
  '{topic} in {number} Seconds',
  "The {topic} Secret Nobody Tells You #shorts",
  '{topic} Be Like: {reaction}',
  'POV: {topic}',
  'Why {topic} Is Going VIRAL',
  'Do This NOT That — {topic} Edition',
  '{number}-Second {topic} That Will BLOW Your Mind',
  'STOP Scrolling for {topic} Tips... Watch This',
];

const wordPools: Record<string, string[]> = {
  number: ['5', '10', '15', '30', '60'],
  reaction: ['😱', '🤯', '💀', '🔥'],
};

const engine: ToolEngine = {
  slug: 'youtube-shorts-title-generator',
  title: 'YouTube Shorts Title Generator',
  description: 'Create Shorts-optimized titles that drive views.',
  category: 'C',
  inputs: [
    { name: 'topic', label: 'Shorts Topic', placeholder: 'e.g. 5 second productivity hack', type: 'text' },
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
    '5s Productivity Hack 🤯',
    'Try This Coding Trick (10s)',
    'Gaming in 30 Seconds',
    "The Beauty Secret Nobody Tells You #shorts",
    'Life Hacks Be Like: 🔥',
  ],
  faq: [
    { q: 'Are Shorts titles different from regular titles?', a: 'Shorts titles should be shorter (under 40 chars) and work well with hashtags. The hashtag #shorts is essential.' },
    { q: 'Should I always include #shorts?', a: 'Yes. YouTube uses #shorts to categorize content for the Shorts shelf.' },
  ],
  howToUse: [
    'Enter your Shorts topic.',
    'Click Generate.',
    'Copy the title.',
    'Use with #shorts hashtag.',
  ],
};

registerEngine(engine);
