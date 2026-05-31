import type { ToolEngine } from './types';
import { registerEngine } from './registry';

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateDescription(inputs: Record<string, string>): string[] {
  const name = inputs.channelName || '[Channel Name]';
  const niche = inputs.niche || 'content creation';
  const descs = [
    'Welcome to ' + name + '! 🎥\n\nI create ' + niche + ' videos to help you ' + pick(['learn', 'improve', 'grow', 'master', 'succeed']) + '. New videos every ' + pick(['week', 'Tuesday', 'Thursday', 'Monday and Friday']) + '.\n\nSubscribe and join the community! 🔔',
    name + " is your go-to channel for all things " + niche + ". Whether you're a " + pick(['beginner', 'pro', 'enthusiast', 'creator']) + ", I've got you covered with " + pick(['tutorials', 'reviews', 'tips', 'guides']) + " that actually work.\n\nHit subscribe and let's grow together! 🚀",
  ];
  return [pick(descs)];
}

const engine: ToolEngine = {
  slug: 'youtube-channel-description-generator',
  title: 'YouTube Channel Description Generator',
  description: 'Write a compelling channel description that converts visitors.',
  category: 'F',
  inputs: [
    { name: 'niche', label: 'Channel Niche', placeholder: 'e.g. travel vlogging, coding tutorials', type: 'text' },
    { name: 'channelName', label: 'Channel Name', placeholder: 'e.g. Wanderlust Diaries', type: 'text' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn:
      "var name=inputs.channelName||'[Channel Name]';var niche=inputs.niche||'content creation';var pick=function(a){return a[Math.floor(Math.random()*a.length)]};" +
      "var descs=[" +
      "'Welcome to '+name+'! \\uD83C\\uDFA5\\n\\nI create '+niche+' videos to help you '+pick(['learn','improve','grow','master','succeed'])+'. New videos every '+pick(['week','Tuesday','Thursday','Monday and Friday'])+'.\\n\\nSubscribe and join the community! \\uD83D\\uDD14'," +
      "name+' is your go-to channel for all things '+niche+'. Whether you\\'re a '+pick(['beginner','pro','enthusiast','creator'])+', I\\'ve got you covered with '+pick(['tutorials','reviews','tips','guides'])+' that actually work.\\n\\nHit subscribe and let\\'s grow together! \\uD83D\\uDE80'" +
      "];return [pick(descs)];",
  },
  generate(inputs: Record<string, string>): string[] {
    return generateDescription(inputs);
  },
  staticExamples: [
    'Welcome to Wanderlust Diaries! 🎥\n\nI create travel vlogging videos to help you explore. New videos every Tuesday.\n\nSubscribe and join the community! 🔔',
  ],
  faq: [
    { q: 'How long should a channel description be?', a: 'Aim for 100-200 words. Include your upload schedule, what viewers can expect, and relevant keywords for SEO.' },
    { q: 'Should I include keywords in my channel description?', a: 'Yes. YouTube uses channel descriptions for search ranking. Include 2-3 primary keywords naturally.' },
  ],
  howToUse: [
    'Enter your niche.',
    'Enter your channel name.',
    'Click Generate.',
    'Copy description and paste into your YouTube channel settings.',
    'Customize the schedule and details.',
  ],
};

registerEngine(engine);
