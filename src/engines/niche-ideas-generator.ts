import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';
import { registerEngine } from './registry';

const templates = [
  '{interest} for {audience}',
  '{style} {interest} Tutorials',
  '{interest} {contentType} Channel',
  '{audience} {interest} Tips',
  '{interest} Reviews & {comparison}',
  'Hidden World of {interest}',
  '{interest} on a {budget} Budget',
  '{style} {interest} for {audience}',
  '{interest} {contentType} for {audience}',
  'The {interest} {style}',
  '{interest} {format}',
  'Everything {interest} — {format}',
  '{interest} That {angle}',
  '{style} {interest} {contentType}',
  'Why Everyone Loves {interest} — {format}',
];

const wordPools: Record<string, string[]> = {
  audience: ['Beginners', 'Professionals', 'Students', 'Parents', 'Teens', 'Seniors', 'Busy People', 'Freelancers', 'Entrepreneurs', 'Creatives'],
  style: ['Minimalist', 'Advanced', 'Beginner-Friendly', 'Funny', 'ASMR', 'Satisfying', 'Cinematic', 'Raw', 'Educational'],
  contentType: ['Reviews', 'Tutorials', 'Vlogs', 'Challenges', 'Experiments', 'Reactions', 'Documentaries', 'Shorts'],
  comparison: ['Comparisons', 'Unboxings', 'Tests', 'Showdowns', 'Rankings'],
  budget: ['Low', 'Zero', '$10', '$50', '$100', 'Tiny'],
  format: ['Explained Simply', 'in 60 Seconds', 'That Actually Work', 'Without the BS', 'for Real People'],
  angle: ['No One Talks About', 'Actually Works', 'Will Surprise You', 'Changed Everything', 'Goes Wrong'],
};

const engine: ToolEngine = {
  slug: 'youtube-niche-ideas-generator',
  title: 'YouTube Niche Ideas Generator',
  description: 'Find the perfect channel niche and sub-niche ideas for beginners.',
  category: 'A',
  inputs: [
    { name: 'interest', label: 'Your Interest or Skill', placeholder: 'e.g. drawing, coding, cooking', type: 'text' },
  ],
  clientConfig: { type: 'templates', templates, wordPools },
  generate(inputs) {
    return generateFromTemplates(templates, wordPools, inputs, 10);
  },
  staticExamples: [
    'Drawing for Beginners',
    'Beginner-Friendly Coding Tutorials',
    'Cooking Reviews & Comparisons',
    'The Hidden World of Woodworking',
    'Photography on a Low Budget',
  ],
  faq: [
    { q: 'How do I pick the right niche?', a: "Look for the intersection of what you enjoy, what you're good at, and what has audience demand." },
    { q: 'How many niches are too many?', a: 'For a new channel, focus on ONE niche. Mixed content grows slower.' },
    { q: 'Can I change my niche later?', a: 'Yes, but expect a temporary view drop. Transition gradually.' },
    { q: 'Is this tool free?', a: 'Yes, completely free. No signup required.' },
  ],
  howToUse: [
    'Enter a skill or interest (e.g., "playing piano").',
    'Click "Generate Niche Ideas" for 10 suggestions.',
    'Each suggestion combines your interest with audience, style, or format.',
    'Copy ideas you like and research them on YouTube.',
    'Pick one niche to start with — you can expand later.',
  ],
};

registerEngine(engine);
