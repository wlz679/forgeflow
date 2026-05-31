import type { ToolEngine } from './types';
import { randomPickN } from './helpers';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-tag-generator',
  title: 'YouTube Tag Generator',
  description: 'Generate SEO tags optimized for YouTube search.',
  category: 'D',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. beginner piano tutorial', type: 'text' },
    { name: 'category', label: 'Video Category', placeholder: '', type: 'select', options: ['Gaming', 'Music', 'Education', 'Entertainment', 'How-To', 'Vlog', 'Tech', 'Sports', 'Beauty', 'Cooking'] },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `var topic = inputs.topic || 'video'; var cat = inputs.category || 'How-To'; var prefixes = ['best','top','how to','new','free','easy','ultimate','complete','beginner','pro','advanced','simple','quick','step by step','full']; var suffixes = ['tutorial','guide','review','tips','tricks','explained','walkthrough','for beginners','2026','vs']; var tags = [topic, cat, topic+' '+cat]; for (var i=0;i<prefixes.length;i++) tags.push(prefixes[i]+' '+topic); for (var j=0;j<suffixes.length;j++) tags.push(topic+' '+suffixes[j]); var results=[]; var used={}; while(results.length<15){var t=pick(tags); if(!used[t]){used[t]=true;results.push(t)}} return [results.join(', ')];`,
  },
  generate(inputs) {
    const topic = inputs.topic || 'video';
    const cat = inputs.category || 'How-To';
    const prefixes = ['best', 'top', 'how to', 'new', 'free', 'easy', 'ultimate', 'complete', 'beginner', 'pro', 'advanced', 'simple', 'quick', 'step by step', 'full'];
    const suffixes = ['tutorial', 'guide', 'review', 'tips', 'tricks', 'explained', 'walkthrough', 'for beginners', '2026', 'vs'];
    const tags: string[] = [topic, cat, `${topic} ${cat}`];
    for (const p of prefixes) tags.push(`${p} ${topic}`);
    for (const s of suffixes) tags.push(`${topic} ${s}`);
    return [randomPickN(tags, 15).join(', ')];
  },
  staticExamples: [
    "beginner piano tutorial, Music, beginner piano tutorial Music, best beginner piano tutorial, how to beginner piano tutorial, beginner piano tutorial guide, beginner piano tutorial for beginners",
  ],
  faq: [
    { q: 'How many tags should I use?', a: 'YouTube allows up to 500 characters. Use 10-20 relevant tags. Put most important ones first.' },
    { q: 'Do tags still matter for SEO?', a: 'Yes, but less than title and description. Tags help YouTube understand context and related topics.' },
    { q: 'Free?', a: 'Yes.' },
  ],
  howToUse: [
    'Enter video topic.',
    'Select video category.',
    'Click Generate.',
    'Copy tags.',
    'Paste into the Tags field when uploading.',
  ],
};
registerEngine(engine);
