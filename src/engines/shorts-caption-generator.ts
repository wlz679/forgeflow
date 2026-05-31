import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, randomPickN } from './helpers';
import { registerEngine } from './registry';

const templates: string[] = [
  'POV: {topic} {audience}',
  'When someone asks me about {topic} 😤',
  'Me explaining {topic} to my {audience}',
  '{topic} be like: {reaction}',
  'Nobody: ... Me doing {topic}: 💀',
  'My {audience} after watching my {topic}: {reaction}',
  '{topic} in a nutshell',
  'The two types of {topic} people 👀',
  "How it started vs how it's going: {topic} edition",
  'Tag a friend who needs this {topic} tip 🏷️',
];

const wordPools: Record<string, string[]> = {
  audience: ['beginners', 'friends', 'mom', 'haters', 'subscribers', 'fans', 'boss'],
  reaction: ['😭', '🤯', '💀', '😤', '🔥', '📉', '📈'],
};

const engine: ToolEngine = {
  slug: 'youtube-shorts-caption-generator',
  title: 'YouTube Shorts Caption Generator',
  description: 'Generate engaging captions and text overlays for Shorts.',
  category: 'C',
  inputs: [
    { name: 'topic', label: 'Shorts Topic', placeholder: 'e.g. gym transformation', type: 'text' },
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
    'POV: gym transformation beginners',
    'When someone asks me about cooking 😤',
    'Me explaining fitness to my friends',
    'Life hacks be like: 🤯',
    'Nobody: ... Me doing art: 💀',
  ],
  faq: [
    { q: 'Should I add captions to every Short?', a: 'Yes. Many viewers watch without sound. Captions boost retention and accessibility.' },
    { q: 'Where should captions appear?', a: 'Center or top-center of the frame. Avoid the bottom where UI elements overlap.' },
  ],
  howToUse: [
    'Enter your Shorts topic.',
    'Click Generate.',
    'Copy captions.',
    'Add as text overlay in your editing app.',
  ],
};

registerEngine(engine);
