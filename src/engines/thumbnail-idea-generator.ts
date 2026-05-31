import type { ToolEngine } from './types';
import { generateFromTemplates } from './helpers';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-thumbnail-idea-generator',
  title: 'YouTube Thumbnail Idea Generator',
  description: 'Get thumbnail design concepts and composition ideas.',
  category: 'E',
  inputs: [
    { name: 'topic', label: 'Video Topic', placeholder: 'e.g. morning routine, unboxing', type: 'text' },
  ],
  clientConfig: {
    type: 'templates',
    templates: [
      '{expression} face next to {topic} with text "{action} THIS?"',
      'Split screen: {before} vs {after} {topic}',
      '{topic} on a {color} background with {emotion} emoji',
      'Close-up of hands holding {topic} with shocked expression',
      'Before/After transformation of {topic} (arrow in middle)',
      '{number} {topic} items ranked on a table (tier list style)',
      'Red circle around hidden detail in {topic} screenshot',
      'Money stack next to {topic} — "${money} with this {topic} hack"',
      '{topic} with a giant red X or green checkmark overlay',
      'Side-by-side comparison: {topic} vs competitor',
      'Screenshot of {topic} with "99% DON\'T KNOW THIS" overlay',
      'Magnifying glass over specific part of {topic}',
      '{topic} on fire background (literally or metaphorically)',
      'Person pointing at {topic} with "{emotion}" text bubble',
      'Question mark over {topic} — "Is {topic} Worth It?"',
    ],
    wordPools: {
      expression: ['Shocked','Confused','Excited','Scared','Amazed','Suspicious'],
      action: ['TRY','BUY','WATCH','SEE','DO'],
      before: ['BEFORE','CHEAP','OLD','WRONG WAY','BUDGET'],
      after: ['AFTER','EXPENSIVE','NEW','RIGHT WAY','PREMIUM'],
      color: ['red','yellow','black','neon green','orange'],
      emotion: ['SHOCKING','INSANE','UNBELIEVABLE','GENIUS','WARNING','MUST SEE'],
      number: ['3','5','10','20','50'],
      money: ['$10','$100','$1000','$10K','$1M'],
    },
  },
  generate(inputs) {
    return generateFromTemplates(this.clientConfig.templates!, this.clientConfig.wordPools, inputs, 10);
  },
  staticExamples: [
    'Shocked face next to morning routine with text "TRY THIS?"',
    'Split screen: BEFORE vs AFTER morning routine',
    'unboxing on a red background with SHOCKING emoji',
    'Close-up of hands holding morning routine with shocked expression',
    'Before/After transformation of unboxing (arrow in middle)',
  ],
  faq: [
    { q: 'What makes a good YouTube thumbnail?', a: 'High contrast, clear focal point, 2-4 words of text, emotional facial expression, and consistency with your brand.' },
    { q: 'Should I use my face in thumbnails?', a: 'Yes. Thumbnails with faces (especially expressive ones) consistently get higher CTR than those without.' },
  ],
  howToUse: [
    'Enter your video topic.',
    'Click Generate for thumbnail concepts.',
    'Use ideas as creative direction for your designer or yourself.',
    'Focus on concepts that create curiosity or show contrast.',
  ],
};
registerEngine(engine);
