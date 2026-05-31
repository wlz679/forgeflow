import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';
import { registerEngine } from './registry';

const templates = [
  "{number} Things You Didn't Know About {topic}",
  "I Tried {topic} for {number} Days — Here's What Happened",
  "The TRUTH About {topic} Nobody Talks About",
  "{topic} for Beginners: A Complete Guide",
  "{topic} vs {comparison}: Which Is Better?",
  "How {expert} Would {action} {topic}",
  "Ranking Every {topic} From Worst to Best",
  "I Asked {expert} for {topic} Advice — Game Changer",
  "{number} {topic} Tips That Actually Work",
  "Why Your {topic} Isn't Working (And How to Fix It)",
  "The SECRET to {topic} That Pros Don't Share",
  "Trying {topic} for the FIRST TIME",
  "The Most UNDERRATED {topic} Tips",
  "{topic} That Will BLOW Your Mind",
  "What {number} Years of {topic} Taught Me",
  "Reacting to the WORST {topic} Advice Online",
  "{number} {topic} Hacks You Need to Know",
  "The Ultimate {topic} Tier List",
  "Is {topic} Worth It in 2026? Honest Review",
  "Day in the Life of a {topic} Creator",
];

const wordPools: Record<string, string[]> = {
  number: ['3', '5', '7', '10', '15', '20', '25', '50', '100'],
  comparison: ['iPhone', 'Samsung', 'Mac', 'Windows', 'Photoshop', 'CapCut', 'Premiere Pro', 'DaVinci Resolve', 'Shopify', 'Amazon', 'Canon', 'Sony'],
  expert: ['MrBeast', 'Marques Brownlee', 'PewDiePie', 'Lex Fridman', 'Casey Neistat', 'a Professional', 'a Millionaire', 'an Expert Coach', 'a Top Creator'],
  action: ['create', 'review', 'rank', 'react to', 'fix', 'improve', 'build', 'teach'],
};

const engine: ToolEngine = {
  slug: 'youtube-video-idea-generator',
  title: 'YouTube Video Idea Generator',
  description: 'Generate 10 unique video topics from any seed keyword.',
  category: 'A',
  inputs: [
    { name: 'topic', label: 'Video Topic or Niche', placeholder: 'e.g. tech reviews, cooking, travel vlog', type: 'text' },
  ],
  clientConfig: { type: 'templates', templates, wordPools },
  generate(inputs) {
    return generateFromTemplates(templates, wordPools, inputs, 10);
  },
  staticExamples: [
    "5 Things You Didn't Know About Photography",
    "I Tried Meal Prep for 7 Days — Here's What Happened",
    "The TRUTH About Remote Work Nobody Talks About",
    "Gardening for Beginners: A Complete Guide",
    "iPhone vs Samsung: Which Is Better in 2026?",
  ],
  faq: [
    { q: 'How does the Video Idea Generator work?', a: 'Our tool combines proven YouTube content formats with your topic to generate 10 unique video ideas. Each idea is built from templates that reflect popular, high-performing video styles.' },
    { q: 'How many ideas can I generate?', a: 'Each click produces 10 unique ideas. Click multiple times for fresh sets.' },
    { q: 'Are these ideas guaranteed to go viral?', a: 'No tool can guarantee virality, but our templates are based on proven YouTube formats that consistently perform well.' },
    { q: 'Can I use this for any niche?', a: 'Yes! Works for gaming, tech, cooking, fitness, education, vlogging, and more.' },
    { q: 'Is this tool free?', a: 'Yes, completely free. No signup required.' },
  ],
  howToUse: [
    '1. Enter your video topic or niche (e.g., "tech reviews" or "cooking").',
    '2. Click "Generate Ideas".',
    '3. Review the 10 generated video ideas.',
    '4. Click Copy on any idea you like, or use Copy All.',
    '5. Pick your favorite and start creating!',
  ],
};

registerEngine(engine);
