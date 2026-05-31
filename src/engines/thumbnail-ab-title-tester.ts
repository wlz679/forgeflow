import type { ToolEngine } from './types';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-thumbnail-ab-title-tester',
  title: 'YouTube Thumbnail A/B Title Tester',
  description: 'Generate 2-3 title variations for A/B testing.',
  category: 'E',
  inputs: [
    { name: 'title', label: 'Your Current Title', placeholder: 'e.g. My Honest iPhone Review', type: 'text' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: "var title=inputs.title||'My Video Title';return ['Version A (Clickbait): SHOCKING: '+title+' (You Won\\'t Believe #3)','Version B (SEO): The ULTIMATE '+title+' Guide (2026)','Version C (Story): I Tried '+title+' for 30 Days... Here\\'s What Happened'];",
  },
  generate(inputs) {
    const title = inputs.title || 'My Video Title';
    return [
      `Version A (Clickbait): SHOCKING: ${title} (You Won't Believe #3)`,
      `Version B (SEO): The ULTIMATE ${title} Guide (2026)`,
      `Version C (Story): I Tried ${title} for 30 Days... Here's What Happened`,
    ];
  },
  staticExamples: [
    'Version A (Clickbait): SHOCKING: My Honest iPhone Review (You Won\'t Believe #3)',
    'Version B (SEO): The ULTIMATE My Honest iPhone Review Guide (2026)',
    'Version C (Story): I Tried My Honest iPhone Review for 30 Days... Here\'s What Happened',
  ],
  faq: [
    { q: 'How do I A/B test YouTube titles?', a: 'Upload with one title, monitor CTR for 24-48 hours, then switch to the alternative. Compare performance. Some third-party tools offer automated testing.' },
    { q: 'Which version usually performs best?', a: 'Clickbait often gets higher CTR but may hurt retention if content doesn\'t deliver. SEO titles get lower CTR but higher watch time. Test to find your audience\'s sweet spot.' },
  ],
  howToUse: [
    'Enter your current title.',
    'Click Generate.',
    'Get 3 variations in different styles.',
    'Test each version.',
    'Keep the best performer.',
  ],
};
registerEngine(engine);
