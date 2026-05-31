import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, fillTemplate } from './helpers';
import { registerEngine } from './registry';

const templates = [
  "{number} {topic} Secrets {platform} Doesn't Want You to Know",
  "The REAL Truth About {topic} (I Was SHOCKED)",
  "You're Doing {topic} WRONG — Here's the Fix",
  "{topic}: The SCAM Nobody Talks About",
  "I Can't Believe This {topic} Trick Actually Works",
  "Don't Buy {topic} Until You Watch This",
  "{topic} Is DEAD — Here's What's Replacing It",
  "The $1M {topic} Strategy (That Anyone Can Copy)",
  "This {topic} Video Will Make You RICH",
  "I Tested {number} {topic} Products — #3 Is INSANE",
  "I PAID {number} {expert} to {action} My {topic}",
  "{topic} Lawyer Is Suing Me (I'm Scared)",
  "The POLICE Shut Down My {topic} Video",
  "I Confronted a {topic} SCAMMER in Real Life",
  "My {topic} Went VIRAL and RUINED My Life",
  "You'll NEVER Guess What Happened When I Tried {topic}",
  "{topic} at 3am CHALLENGE (GONE WRONG)",
  "I Let a STRANGER Control My {topic} for {duration}",
  "{topic} but the LAST Person to Leave Wins $1000",
  "I Built the WORLD'S BIGGEST {topic}",
];

const wordPools = {
  number: ['3', '5', '10', '100', '1000', '10000'],
  expert: ['Expert', 'Pro', 'Hacker', 'Millionaire', 'CEO', 'Scientist'],
  action: ['Rate', 'Fix', 'Destroy', 'Rebuild', 'Control', 'Judge'],
  duration: ['24 Hours', 'a Week', '30 Days', '100 Days'],
  platform: ['YouTube', 'TikTok', 'Instagram', 'Google'],
};

const engine: ToolEngine = {
  slug: 'youtube-clickbait-title-generator',
  title: 'YouTube Clickbait Title Generator',
  description: 'Create high-CTR titles using emotion, curiosity gaps, and bold claims.',
  category: 'B',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. my weight loss journey', type: 'text' },
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
    'I PAID 10 Experts to Rate My Cooking',
    'My Tech Review Went VIRAL and RUINED My Life',
    'Gaming at 3am CHALLENGE (GONE WRONG)',
    'I Let a STRANGER Control My Life Hacks for 24 Hours',
    "You'll NEVER Guess What Happened When I Tried Travel",
  ],
  faq: [
    {
      q: 'What makes a title "clickbait"?',
      a: 'Clickbait titles use curiosity gaps, strong emotions, bold claims, and numbers to drive clicks.',
    },
    {
      q: 'Is clickbait bad for my channel?',
      a: 'Not if you deliver on the promise. "Good clickbait" hooks viewers with an intriguing premise you actually fulfill.',
    },
    {
      q: 'Will YouTube penalize clickbait titles?',
      a: "Only if the content doesn't match the title. YouTube rewards high CTR when paired with strong retention.",
    },
    { q: 'Is this tool free?', a: 'Yes.' },
  ],
  howToUse: [
    'Enter your video topic.',
    'Click Generate.',
    'Review high-CTR title options.',
    'Copy the titles that match your video content.',
    "Always deliver on your title's promise.",
  ],
};

registerEngine(engine);
