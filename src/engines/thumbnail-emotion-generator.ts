import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-thumbnail-emotion-generator',
  title: 'YouTube Thumbnail Emotion Generator',
  description: 'Generate emotional trigger words for thumbnails.',
  category: 'E',
  inputs: [
    { name: 'topic', label: 'Video Topic / Emotion', placeholder: 'e.g. shocking experiment results', type: 'text' },
  ],
  clientConfig: {
    type: 'templates',
    templates: [
      '{emotion}: {topic} {reaction}',
      '{intensifier} {emotion} — {topic} {reaction}',
      'Viewers were {emotion} by this {topic}',
      'The {emotion} {topic} that {reaction}',
      '{emotion} {topic} Moment ({reaction})',
    ],
    wordPools: {
      emotion: ['SHOCKING','SURPRISING','HEARTWARMING','TERRIFYING','HILARIOUS','UNBELIEVABLE','MIND-BLOWING','JAW-DROPPING','EMOTIONAL','INSANE','CRAZY','GENIUS'],
      intensifier: ['ABSOLUTELY','COMPLETELY','TOTALLY','UTTERLY','BEYOND'],
      reaction: ['WILL SHOCK YOU','LEFT ME SPEECHLESS','MADE ME CRY','CHANGED MY LIFE','NOBODY EXPECTED','BROKE THE INTERNET','WENT VIRAL INSTANTLY','I CAN\'T EXPLAIN','MADE HISTORY','YOU NEED TO SEE'],
    },
  },
  generate(inputs) {
    return generateFromTemplates(this.clientConfig.templates!, this.clientConfig.wordPools, inputs, 10);
  },
  staticExamples: [
    'SHOCKING: shocking experiment results WILL SHOCK YOU',
    'ABSOLUTELY INSANE — shocking experiment results CHANGED MY LIFE',
    'Viewers were JAW-DROPPING by this shocking experiment results',
    'The MIND-BLOWING shocking experiment results that BROKE THE INTERNET',
    'CRAZY shocking experiment results Moment (YOU NEED TO SEE)',
  ],
  faq: [
    { q: 'Why use emotional words in thumbnails?', a: 'Emotions drive clicks. Thumbnails that convey strong emotion (shock, curiosity, joy) consistently outperform neutral ones.' },
    { q: 'Which emotions work best?', a: 'Shock/surprise and curiosity are the top performers. Fear of missing out (FOMO) also drives high CTR.' },
  ],
  howToUse: [
    'Enter your topic.',
    'Click Generate.',
    'Copy emotional trigger words.',
    'Add the best emotional words to your thumbnail text.',
  ],
};
registerEngine(engine);
