import type { ToolEngine } from './types';
import { randomPick, randomPickN } from './helpers';
import { registerEngine } from './registry';

const customFn = `var niche = (inputs.niche || 'content').replace(/\\s+/g,''); var broad = ['#shorts','#youtubeshorts','#viral','#fyp','#trending']; var nicheTags = ['#'+niche,'#'+niche+'shorts','#'+niche+'tips','#'+niche+'video','#'+niche+'community']; var trending = ['#viralshorts','#shortsvideo','#youtubecreator','#contentcreator','#smallcreator','#growonyoutube']; var all = broad.concat(nicheTags).concat(trending); var results = []; var used = {}; while (results.length < 10) { var t = pick(all); if (!used[t]) { used[t] = true; results.push(t); } } return [results.join(' ')];`;

const wordPools: Record<string, string[]> = {};

const engine: ToolEngine = {
  slug: 'youtube-shorts-hashtag-generator',
  title: 'YouTube Shorts Hashtag Generator',
  description: 'Generate the best hashtag combinations for Shorts discovery.',
  category: 'C',
  inputs: [
    { name: 'niche', label: 'Your Niche', placeholder: 'e.g. gaming, beauty', type: 'text' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools,
    customFn,
  },
  generate(inputs: Record<string, string>): string[] {
    const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];
    const fill = (t: string, v: Record<string, string>): string =>
      t.replace(/\{(\w+)\}/g, (_, k: string) => v[k] ?? `{${k}}`);
    const fn = new Function('inputs', 'pick', 'fill', customFn);
    return fn(inputs, pick, fill) as string[];
  },
  staticExamples: [
    '#shorts #youtubeshorts #gaming #gamingshorts #gamingtips #gamingvideo #gamingcommunity #viral #fyp #trending',
  ],
  faq: [
    { q: 'How many hashtags should I use for Shorts?', a: '3-5 is optimal. Too many looks spammy. Include #shorts and 2-4 niche-specific tags.' },
    { q: 'Which hashtag is most important?', a: '#shorts — it signals YouTube to show your content in the Shorts feed.' },
  ],
  howToUse: [
    'Enter your niche.',
    'Click Generate.',
    'Copy the hashtag combination.',
    'Paste into your Shorts title or description.',
  ],
};

registerEngine(engine);
