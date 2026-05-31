import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, fillTemplate } from './helpers';
import { registerEngine } from './registry';

const customFn =
  // prettier-ignore
  "var topic = inputs.topic || 'this video'; var kws = (inputs.keywords || topic).split(',').map(function(s){return s.trim()}).filter(Boolean); var pick = function(a){return a[Math.floor(Math.random()*a.length)]}; var result = '📌 ' + pick(['In this video','Today','Welcome back']) + ', I ' + pick(['dive into','explore','cover','break down','share']) + ' ' + topic + '.\\n\\n⏱️ Timestamps:\\n0:00 - Intro\\n0:30 - ' + pick(['The Problem','Background','Context']) + '\\n2:00 - ' + pick(['The Solution','Main Content','Deep Dive']) + '\\n5:00 - ' + pick(['Results','My Experience','Key Takeaways']) + '\\n8:00 - ' + pick(['Final Thoughts','Conclusion','What\\'s Next']) + '\\n\\n🔗 ' + pick(['Resources Mentioned','Links','Useful Tools']) + ':\\n' + kws.slice(0,3).map(function(k){return '- '+k+': https://...'}).join('\\n') + '\\n\\n💬 ' + pick(['Comment below','Let me know in the comments','Drop a comment']) + ': ' + pick(['What topic should I cover next?','What do you think?','Any questions?']) + '\\n\\n📢 ' + pick(['Subscribe for more','Don\\'t forget to subscribe','Hit that subscribe button']) + ' if you enjoy ' + topic + ' content!\\n\\n#' + topic.replace(/\\s+/g,'') + ' #' + kws.slice(0,4).join(' #') + ' #YouTubeCreator'; return [result];";

const engine: ToolEngine = {
  slug: 'youtube-description-generator',
  title: 'YouTube Description Generator',
  description: 'Generate SEO-optimized video descriptions with keywords and chapters.',
  category: 'B',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. how to edit videos on iPhone', type: 'text' },
    {
      name: 'keywords',
      label: 'Key Topics (comma separated)',
      placeholder: 'e.g. iPhone editing, mobile editing, CapCut',
      type: 'text',
    },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs) {
    const topic = inputs.topic || 'this video';
    const kws = (inputs.keywords || topic).split(',').map((s) => s.trim()).filter(Boolean);
    const sections = [
      `📌 ${randomPick(['In this video', 'Today', 'Welcome back'])}, I ${randomPick(['dive into', 'explore', 'cover', 'break down', 'share'])} ${topic}.`,
      '',
      '⏱️ Timestamps:',
      '0:00 - Intro',
      `0:30 - ${randomPick(['The Problem', 'Background', 'Context'])}`,
      `2:00 - ${randomPick(['The Solution', 'Main Content', 'Deep Dive'])}`,
      `5:00 - ${randomPick(['Results', 'My Experience', 'Key Takeaways'])}`,
      `8:00 - ${randomPick(['Final Thoughts', 'Conclusion', "What's Next"])}`,
      '',
      `🔗 ${randomPick(['Resources Mentioned', 'Links', 'Useful Tools'])}:`,
      `${kws.slice(0, 3).map((k) => `- ${k}: https://...`).join('\n')}`,
      '',
      `💬 ${randomPick(['Comment below', 'Let me know in the comments', 'Drop a comment'])}: ${randomPick(['What topic should I cover next?', 'What do you think?', 'Any questions?'])}`,
      '',
      `📢 ${randomPick(['Subscribe for more', "Don't forget to subscribe", 'Hit that subscribe button'])} if you enjoy ${topic} content!`,
      '',
      `#${topic.replace(/\s+/g, '')} #${kws.slice(0, 4).join(' #')} #YouTubeCreator`,
    ];
    return [sections.join('\n')];
  },
  staticExamples: [
    `📌 Today, I explore how to edit videos on iPhone.

⏱️ Timestamps:
0:00 - Intro
0:30 - The Problem
2:00 - The Solution
5:00 - Results
8:00 - Final Thoughts

🔗 Resources Mentioned:
- iPhone editing: https://...
- mobile editing: https://...
- CapCut: https://...

💬 Comment below: What topic should I cover next?

📢 Subscribe for more if you enjoy how to edit videos on iPhone content!

#howtoeditvideosoniPhone #iPhoneediting #mobileediting #CapCut #YouTubeCreator`,
  ],
  faq: [
    {
      q: 'How long should a YouTube description be?',
      a: 'At least 200 words. YouTube scans descriptions for keywords to understand your content.',
    },
    {
      q: 'Should I include timestamps?',
      a: 'Yes, timestamps improve user experience and can appear as "chapters" in search results.',
    },
    {
      q: 'How many hashtags?',
      a: 'YouTube recommends 3 max in the description. They appear above your title.',
    },
    { q: 'Is this tool free?', a: 'Yes.' },
  ],
  howToUse: [
    'Enter your video topic.',
    'Add key topics (comma separated).',
    'Click Generate.',
    'Copy the full description.',
    'Replace placeholder links with your actual URLs.',
  ],
};

registerEngine(engine);
