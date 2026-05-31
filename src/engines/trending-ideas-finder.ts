import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';
import { registerEngine } from './registry';

const templates = [
  '{niche} Trends That Will EXPLODE in 2026',
  'Is {trend} the Future of {niche}?',
  'Why Everyone Is Talking About {trend} in {niche}',
  "{niche} Predictions for {year}: What's Next?",
  "The Rise of {trend} in {niche} (Don't Miss Out)",
  '{year} {niche} Trends You NEED to Try',
  'The Next BIG Thing in {niche} ({trend})',
  '{platform} Just Changed {niche} Forever — Here\'s How',
  'Why {niche} Creators Are Switching to {trend}',
  "The DEATH of Old {niche} — What's Replacing It",
  '{number} Underrated {niche} Trends That Are About to Blow Up',
  'How AI Is Changing {niche} Right Now',
  'The Biggest {niche} Controversy of {year}',
  "{niche} Secrets the Top Creators Don't Share",
  'What {number} Million Views Taught Me About {niche}',
];

const wordPools: Record<string, string[]> = {
  number: ['3', '5', '7', '10', '100', '1000'],
  year: ['2026', '2025'],
  trend: ['AI-Generated Content', 'Live Streaming', 'Short-Form Video', 'VR Content', 'Interactive Videos', 'Community Posts', 'Educational Content', 'Niche Communities', 'Raw Unedited Footage', 'Story-Driven Content', 'Minimalist Editing', 'Voice-Only Content'],
  platform: ['YouTube', 'TikTok', 'Instagram', 'Twitch'],
};

const engine: ToolEngine = {
  slug: 'youtube-trending-ideas-finder',
  title: 'YouTube Trending Ideas Finder',
  description: 'Discover potential trending video directions based on your niche.',
  category: 'A',
  inputs: [
    { name: 'niche', label: 'Your Niche', placeholder: 'e.g. fitness, gaming, personal finance', type: 'text' },
  ],
  clientConfig: { type: 'templates', templates, wordPools },
  generate(inputs) {
    return generateFromTemplates(templates, wordPools, inputs, 10);
  },
  staticExamples: [
    'Fitness Trends That Will EXPLODE in 2026',
    'Is AI-Generated Content the Future of Gaming?',
    'Why Everyone Is Talking About Short-Form Video in Personal Finance',
    "Tech Predictions for 2026: What's Next?",
    "The Rise of Story-Driven Content in Cooking (Don't Miss Out)",
  ],
  faq: [
    { q: 'Where do these trending ideas come from?', a: 'Templates are based on YouTube trend analysis — format shifts, content style changes, and emerging topics across major niches.' },
    { q: 'How often should I check for new trends?', a: 'YouTube trends shift rapidly. Check weekly and adapt your content calendar accordingly.' },
    { q: 'Can I target trends in a specific country?', a: 'Include your target country in the niche field (e.g., "Indian tech reviews").' },
    { q: 'Is this tool free?', a: 'Yes, completely free. No signup required.' },
  ],
  howToUse: [
    'Enter your channel niche.',
    'Click "Generate Trending Ideas" for 10 trending directions.',
    'Review each idea and consider how to adapt it to your style.',
    'Copy ideas that resonate with your audience.',
    'Research trends further on YouTube to validate demand.',
  ],
};

registerEngine(engine);
