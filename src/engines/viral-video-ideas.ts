import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';
import { registerEngine } from './registry';

const templates = [
  'I Spent {duration} Doing {topic} — The Results SHOCKED Me',
  'Trying {topic} for {duration} (UNBELIEVABLE Results)',
  '{topic} GONE WRONG (What Actually Happened)',
  'The REAL Reason {topic} Is Going Viral',
  'I Tried The VIRAL {topic} Trend — Does It Work?',
  '{topic} That Will Break the Internet in 2026',
  'EXPOSED: The TRUTH About {topic}',
  'Why Everyone Is WRONG About {topic}',
  '{topic} — The Moment Everything Changed',
  'Testing IMPOSSIBLE {topic} — 24 Hour Challenge',
  'I Let AI Control My {topic} for {duration}',
  '{topic} But Every View Makes It More EXTREME',
  'The $1 vs $1000 {topic} Challenge',
  'Reacting to the CRAZIEST {topic} on YouTube',
  "If This {topic} Video Gets {number} Views I'll Do {extremeAction}",
  "I Did {topic} for {duration} and Here's What I Learned",
  "The DARK SIDE of {topic} Nobody Talks About",
  'Trying {topic} From EASIEST to HARDEST',
  'I Got a PROFESSIONAL to Review My {topic}',
  'The {topic} That Made Me QUIT My Job',
];

const wordPools: Record<string, string[]> = {
  duration: ['24 Hours', '7 Days', '30 Days', '100 Days', 'a Week', 'a Month', '48 Hours'],
  number: ['1000', '10000', '100000', '1 Million', '10 Million'],
  extremeAction: ['Shave My Head', 'Get a Tattoo', 'Delete My Channel', 'Give Away $1000', 'Eat a Ghost Pepper', 'Jump in a Frozen Lake'],
};

const engine: ToolEngine = {
  slug: 'youtube-viral-video-ideas',
  title: 'YouTube Viral Video Ideas Generator',
  description: 'Get viral-worthy video ideas based on proven viral formats.',
  category: 'A',
  inputs: [
    { name: 'topic', label: 'Your Topic', placeholder: 'e.g. life hacks, experiments', type: 'text' },
  ],
  clientConfig: { type: 'templates', templates, wordPools },
  generate(inputs) {
    return generateFromTemplates(templates, wordPools, inputs, 10);
  },
  staticExamples: [
    'I Spent 24 Hours Doing Life Hacks — The Results SHOCKED Me',
    'Trying Experiments for 7 Days (UNBELIEVABLE Results)',
    'Life Hacks GONE WRONG (What Actually Happened)',
    'The REAL Reason This Experiment Is Going Viral',
    'I Tried The VIRAL Life Hack Trend — Does It Work?',
  ],
  faq: [
    { q: 'What makes a video go viral?', a: 'Strong emotional hook in first 3 seconds, 70%+ retention, compelling title/thumbnail, shareable concept.' },
    { q: 'Are Shorts easier to go viral?', a: 'Yes, lower barrier via Shorts feed, but RPM is lower. Balance both formats.' },
    { q: 'How long should a viral video be?', a: "Reactions: 8-12 min. Challenges: 10-20 min. Story-driven: 12-18 min. Hold attention — length doesn't matter if viewers drop off." },
    { q: 'Is this tool free?', a: 'Yes, completely free. No signup required.' },
  ],
  howToUse: [
    'Enter your topic or content area.',
    'Click "Generate Viral Ideas" for 10 concepts.',
    'Each uses a proven viral format.',
    'Copy ideas with clear hooks that fit your style.',
    'Execution matters more than the idea — great ideas fail with poor delivery.',
  ],
};

registerEngine(engine);
