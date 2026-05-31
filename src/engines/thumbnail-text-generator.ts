import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-thumbnail-text-generator',
  title: 'YouTube Thumbnail Text Generator',
  description: 'Generate short, punchy text for thumbnails that drives clicks.',
  category: 'E',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. budget travel tips', type: 'text' },
  ],
  clientConfig: {
    type: 'templates',
    templates: [
      '{emoji} {number}X {result}',
      '{result} in {number} {timeUnit}',
      '{negation} {action} {topic}',
      '{shock}!',
      '{number} {secret}',
      '{topic}: {before} VS {after}',
      'I {action} {topic}',
      '{number} {topic} {truth}',
      '{action} {topic}?',
      '${money} {topic}',
    ],
    wordPools: {
      emoji: ['😱','🔥','💀','🤯','😮','⚠️'],
      number: ['3','5','10','100','1000'],
      result: ['RESULTS','BETTER','FASTER','EASIER','BEFORE','AFTER'],
      timeUnit: ['DAYS','HOURS','WEEKS','MINUTES'],
      negation: ['DON\'T','NEVER','STOP'],
      action: ['BUY','DO','TRY','MAKE','USE'],
      shock: ['GONE WRONG','EXPOSED','SHOCKING','UNBELIEVABLE'],
      secret: ['SECRETS','HACKS','TRICKS','TIPS','MISTAKES'],
      before: ['BEFORE','CHEAP','BUDGET','WRONG'],
      after: ['AFTER','EXPENSIVE','PREMIUM','RIGHT'],
      truth: ['THE TRUTH','EXPLAINED','GONE WRONG','NOBODY TELLS YOU'],
      money: ['0','10','100','1000','1M'],
    },
  },
  generate(inputs) {
    return generateFromTemplates(this.clientConfig.templates!, this.clientConfig.wordPools, inputs, 10);
  },
  staticExamples: [
    '😱 10X RESULTS',
    'BETTER in 5 DAYS',
    'DON\'T BUY budget travel tips',
    'GONE WRONG!',
    '3 SECRETS',
    'budget travel tips: BEFORE VS AFTER',
    'I TRY budget travel tips',
    '5 budget travel tips THE TRUTH',
    'BUY budget travel tips?',
    '$100 budget travel tips',
  ],
  faq: [
    { q: 'How many words should thumbnail text have?', a: '2-4 words max. Viewers scan thumbnails in under a second. Text must be instantly readable.' },
    { q: 'What font size for thumbnail text?', a: 'Use large, bold fonts — at least 20% of the thumbnail height. Sans-serif fonts like Impact or Montserrat work best.' },
  ],
  howToUse: [
    'Enter your video topic.',
    'Click Generate.',
    'Copy short text options.',
    'Add to your thumbnail with contrasting colors.',
  ],
};
registerEngine(engine);
