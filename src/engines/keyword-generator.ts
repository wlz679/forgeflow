import type { ToolEngine } from './types';
import { randomPickN } from './helpers';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-keyword-generator',
  title: 'YouTube Keyword Generator',
  description: 'Expand your seed keyword into target keywords.',
  category: 'D',
  inputs: [
    { name: 'keyword', label: 'Seed Keyword', placeholder: 'e.g. guitar lessons', type: 'text' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var kw=inputs.keyword||'keyword'; var mods=['best','top','how to','free','easy','new','vs','review','guide','tutorial','tips','for beginners','2026','near me','online']; var qs=['how to '+kw,'what is '+kw,'why '+kw,'when to '+kw,'where to '+kw,'who '+kw,kw+' for beginners','is '+kw+' worth it',kw+' vs','best '+kw]; var all=mods.map(function(m){return m+' '+kw}).concat(qs); var results=[]; var used={}; while(results.length<15){var k=pick(all); if(!used[k]){used[k]=true;results.push(k)}} return [results.join(', ')];`,
  },
  generate(inputs) {
    const kw = inputs.keyword || 'keyword';
    const mods = ['best', 'top', 'how to', 'free', 'easy', 'new', 'vs', 'review', 'guide', 'tutorial', 'tips', 'for beginners', '2026', 'near me', 'online'];
    const questions = [`how to ${kw}`, `what is ${kw}`, `why ${kw}`, `when to ${kw}`, `where to ${kw}`, `who ${kw}`, `${kw} for beginners`, `is ${kw} worth it`, `${kw} vs`, `best ${kw}`];
    return [randomPickN([...mods.map(m => `${m} ${kw}`), ...questions], 15).join(', ')];
  },
  staticExamples: [
    "best guitar lessons, how to guitar lessons, free guitar lessons, guitar lessons for beginners, guitar lessons 2026, how to guitar lessons, what is guitar lessons, guitar lessons vs, best guitar lessons",
  ],
  faq: [
    { q: 'What is keyword research for YouTube?', a: 'Finding the search terms people use to find videos. Targeting these terms in titles, descriptions, and tags improves visibility.' },
    { q: 'How do I use these keywords?', a: 'Include the main keyword in your title, description, and tags. Sprinkle secondary keywords naturally in your description.' },
  ],
  howToUse: [
    'Enter a seed keyword.',
    'Click Generate.',
    'Copy expanded keywords.',
    'Use main keywords in title and description.',
  ],
};
registerEngine(engine);
