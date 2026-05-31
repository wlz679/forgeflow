import type { ToolEngine } from './types';
import { generateFromTemplates, randomPick, fillTemplate } from './helpers';
import { registerEngine } from './registry';

const customFn =
  // prettier-ignore
  "var topic = inputs.topic || 'this topic'; var style = inputs.style || 'Review'; var pick = function(a){return a[Math.floor(Math.random()*a.length)]}; var hooks = {Review: ['I tested ' + topic + ' so you don\\'t have to.','Is ' + topic + ' worth the hype? Let\\'s find out.'],Tutorial: ['Today I\\'m going to teach you exactly how to ' + topic + '.','By the end of this video, you\\'ll know how to ' + topic + '.'],Vlog: ['Come with me as I ' + topic + '.','You won\\'t believe what happened during ' + topic + '.'],Listicle: ['Here are the top things you need to know about ' + topic + '.','I ranked every ' + topic + ' from worst to best.'],Commentary: ['Let\\'s talk about ' + topic + ' — because nobody else is.','The ' + topic + ' situation is getting out of hand.']}; var h = hooks[style] || hooks.Review; return ['🎬 INTRO (First 3 seconds):\\n' + pick(h) + '\\n\\n📝 BODY (Main content):\\n• Key point 1 about ' + topic + '\\n• Key point 2 about ' + topic + '\\n• Key point 3 about ' + topic + '\\n\\n🔚 OUTRO (Call to action):\\nIf you enjoyed this, subscribe for more ' + topic + ' content. See you in the next one!'];";

const engine: ToolEngine = {
  slug: 'youtube-script-generator',
  title: 'YouTube Script Generator',
  description: 'Create a structured video script outline with intro, body, and CTA.',
  category: 'B',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. MacBook Pro M4 review', type: 'text' },
    {
      name: 'style',
      label: 'Video Style',
      placeholder: '',
      type: 'select',
      options: ['Review', 'Tutorial', 'Vlog', 'Listicle', 'Commentary'],
    },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn,
  },
  generate(inputs) {
    const topic = inputs.topic || 'this topic';
    const style = inputs.style || 'Review';
    const hooks: Record<string, string[]> = {
      Review: [`I tested ${topic} so you don't have to.`, `Is ${topic} worth the hype? Let's find out.`],
      Tutorial: [
        `Today I'm going to teach you exactly how to ${topic}.`,
        `By the end of this video, you'll know how to ${topic}.`,
      ],
      Vlog: [`Come with me as I ${topic}.`, `You won't believe what happened during ${topic}.`],
      Listicle: [
        `Here are the top things you need to know about ${topic}.`,
        `I ranked every ${topic} from worst to best.`,
      ],
      Commentary: [
        `Let's talk about ${topic} — because nobody else is.`,
        `The ${topic} situation is getting out of hand.`,
      ],
    };
    const h = hooks[style] || hooks.Review;
    return [
      `🎬 INTRO (First 3 seconds):\n${randomPick(h)}\n\n📝 BODY (Main content):\n• Key point 1 about ${topic}\n• Key point 2 about ${topic}\n• Key point 3 about ${topic}\n\n🔚 OUTRO (Call to action):\nIf you enjoyed this, subscribe for more ${topic} content. See you in the next one!`,
    ];
  },
  staticExamples: [
    `🎬 INTRO (First 3 seconds):
I tested MacBook Pro M4 so you don't have to.

📝 BODY (Main content):
• Key point 1 about MacBook Pro M4
• Key point 2 about MacBook Pro M4
• Key point 3 about MacBook Pro M4

🔚 OUTRO (Call to action):
If you enjoyed this, subscribe for more MacBook Pro M4 content. See you in the next one!`,
  ],
  faq: [
    {
      q: 'Do I need to follow the script exactly?',
      a: 'No! The script is an outline. Add your personality, stories, and ad-libs to make it authentic.',
    },
    {
      q: 'How long should each section be?',
      a: 'Intro: 10-15 sec. Body: 80% of video. Outro: 15-30 sec. Adjust based on your video length.',
    },
    {
      q: 'Should I memorize the script?',
      a: 'For most styles, bullet points work better than word-for-word scripts. Only memorize key transitions and the hook.',
    },
    { q: 'Is this tool free?', a: 'Yes.' },
  ],
  howToUse: [
    'Enter your video topic.',
    'Select video style (Review, Tutorial, etc.).',
    'Click "Generate Script".',
    'Use the INTRO/BODY/OUTRO structure as your outline.',
    'Add your personal stories and details to each section.',
  ],
};

registerEngine(engine);
