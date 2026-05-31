import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, fillTemplate } from './helpers';
import { registerEngine } from './registry';

const allClickbait = [
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
];

const allSeo = [
  "How to {action} {topic} — Complete Guide {year}",
  "{topic} for Beginners: Step-by-Step Tutorial",
  "Best {topic} Tips {year} — Expert Advice",
  "{topic} Guide: Everything You Need to Know",
  "Top {number} {topic} Strategies That Work in {year}",
  "How I {action} {topic} (Full Tutorial)",
  "{topic} 101: A Beginner's Guide",
  "Ultimate {topic} Guide for {audience}",
  "Learn {topic} in {number} Minutes — Quick Start Guide",
  "{topic} Tutorial: From Zero to Pro",
];

const allEmotional = [
  "This {topic} Changed My Life Forever",
  "I Still Can't Believe What Happened During {topic}",
  "{topic} Made Me Cry (In a Good Way)",
  "The Most BEAUTIFUL {topic} You'll Ever See",
  "I Was NOT Ready for This {topic}",
  "{topic} Gave Me Goosebumps — Here's Why",
  "Why {topic} Is the Best Thing I've Ever Done",
  "I Quit Everything for {topic} — Was It Worth It?",
  "{topic} Restored My Faith in Humanity",
  "What {topic} Taught Me About Life",
];

const allHowTo = [
  "How to {action} {topic} in {number} Easy Steps",
  "{topic} for Absolute Beginners (No Experience Needed)",
  "Learn {topic} FAST — {number}-Minute Crash Course",
  "How I {action} {topic} — My Exact Process",
  "The Simplest Way to {action} {topic}",
  "{topic} Made Easy: A Visual Guide",
  "How to Start {topic} With ZERO Budget",
  "{topic} Cheat Sheet: {number} Pro Tips",
  "How to Master {topic} in {number} Days",
  "{topic} for Lazy People — Minimal Effort, Maximum Results",
];

const allTemplates = [...allClickbait, ...allSeo, ...allEmotional, ...allHowTo];

const wordPools = {
  number: ['3', '5', '7', '10', '15', '30', '101'],
  platform: ['YouTube', 'TikTok', 'Instagram', 'Google'],
  year: ['2026', '2025'],
  action: ['Master', 'Start', 'Learn', 'Improve', 'Build', 'Grow', 'Create', 'Fix', 'Optimize'],
  audience: ['Beginners', 'Professionals', 'Students', 'Creators', 'Entrepreneurs'],
};

const customFn =
  // prettier-ignore
  "var allClickbait = ['{number} {topic} Secrets {platform} Doesn\\'t Want You to Know','The REAL Truth About {topic} (I Was SHOCKED)','You\\'re Doing {topic} WRONG — Here\\'s the Fix','{topic}: The SCAM Nobody Talks About','I Can\\'t Believe This {topic} Trick Actually Works','Don\\'t Buy {topic} Until You Watch This','{topic} Is DEAD — Here\\'s What\\'s Replacing It','The $1M {topic} Strategy (That Anyone Can Copy)','This {topic} Video Will Make You RICH','I Tested {number} {topic} Products — #3 Is INSANE']; var allSeo = ['How to {action} {topic} — Complete Guide {year}','{topic} for Beginners: Step-by-Step Tutorial','Best {topic} Tips {year} — Expert Advice','{topic} Guide: Everything You Need to Know','Top {number} {topic} Strategies That Work in {year}','How I {action} {topic} (Full Tutorial)','{topic} 101: A Beginner\\'s Guide','Ultimate {topic} Guide for {audience}','Learn {topic} in {number} Minutes — Quick Start Guide','{topic} Tutorial: From Zero to Pro']; var allEmotional = ['This {topic} Changed My Life Forever','I Still Can\\'t Believe What Happened During {topic}','{topic} Made Me Cry (In a Good Way)','The Most BEAUTIFUL {topic} You\\'ll Ever See','I Was NOT Ready for This {topic}','{topic} Gave Me Goosebumps — Here\\'s Why','Why {topic} Is the Best Thing I\\'ve Ever Done','I Quit Everything for {topic} — Was It Worth It?','{topic} Restored My Faith in Humanity','What {topic} Taught Me About Life']; var allHowTo = ['How to {action} {topic} in {number} Easy Steps','{topic} for Absolute Beginners (No Experience Needed)','Learn {topic} FAST — {number}-Minute Crash Course','How I {action} {topic} — My Exact Process','The Simplest Way to {action} {topic}','{topic} Made Easy: A Visual Guide','How to Start {topic} With ZERO Budget','{topic} Cheat Sheet: {number} Pro Tips','How to Master {topic} in {number} Days','{topic} for Lazy People — Minimal Effort, Maximum Results']; var t; var style = inputs.style || 'All Styles'; if (style === 'Clickbait') t = allClickbait; else if (style === 'SEO-Friendly') t = allSeo; else if (style === 'Emotional') t = allEmotional; else if (style === 'How-To') t = allHowTo; else t = allClickbait.concat(allSeo).concat(allEmotional).concat(allHowTo); var results = []; var seen = {}; var v = {topic: inputs.topic || 'your topic', niche: inputs.topic || 'your niche'}; var pools = {number: ['3','5','7','10','15','30','101'], platform: ['YouTube','TikTok','Instagram','Google'], year: ['2026','2025'], action: ['Master','Start','Learn','Improve','Build','Grow','Create','Fix','Optimize'], audience: ['Beginners','Professionals','Students','Creators','Entrepreneurs']}; var attempts = 0; while (results.length < 10 && attempts < 150) { attempts++; for (var k in pools) v[k] = pick(pools[k]); var r = fill(pick(t), v).trim(); if (r && !seen[r]) { seen[r] = true; results.push(r); } } return results;";

const engine: ToolEngine = {
  slug: 'youtube-title-generator',
  title: 'YouTube Title Generator',
  description: 'Generate 10 catchy, SEO-optimized video titles in multiple styles.',
  category: 'B',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. iPhone 15 review', type: 'text' },
    {
      name: 'style',
      label: 'Title Style',
      placeholder: '',
      type: 'select',
      options: ['All Styles', 'Clickbait', 'SEO-Friendly', 'Emotional', 'How-To'],
    },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs) {
    const style = inputs.style || 'All Styles';
    let templates: string[];
    if (style === 'Clickbait') templates = allClickbait;
    else if (style === 'SEO-Friendly') templates = allSeo;
    else if (style === 'Emotional') templates = allEmotional;
    else if (style === 'How-To') templates = allHowTo;
    else templates = allTemplates;
    return generateFromTemplates(templates, wordPools, inputs, 10);
  },
  staticExamples: [
    "5 iPhone 15 Secrets YouTube Doesn't Want You to Know",
    'How to Master iPhone 15 Review — Complete Guide 2026',
    'This iPhone 15 Changed My Life Forever',
    'How to Start iPhone 15 Review in 3 Easy Steps',
    'iPhone 15 for Beginners: Step-by-Step Tutorial',
  ],
  faq: [
    {
      q: 'How does the Title Generator work?',
      a: 'It combines proven YouTube title formulas with your topic across 4 styles: Clickbait, SEO, Emotional, and How-To.',
    },
    {
      q: 'Which title style performs best?',
      a: 'Depends on your niche. Gaming: Clickbait. Education: SEO. Vlogs: Emotional. Tutorials: How-To.',
    },
    {
      q: 'Are these titles SEO-optimized?',
      a: 'Yes, SEO-style titles include high-volume keywords and follow YouTube SEO best practices.',
    },
    { q: 'How many titles per generation?', a: '10 titles.' },
    { q: 'Is this tool free?', a: 'Yes, completely free.' },
  ],
  howToUse: [
    'Enter your video topic.',
    'Select a title style or "All Styles".',
    'Click "Generate Titles".',
    'Review 10 titles in your chosen style.',
    'Copy individual titles or use Copy All.',
  ],
};

registerEngine(engine);
