import type { ToolEngine } from './types';
import { registerEngine } from './registry';

const engine: ToolEngine = {
  slug: 'youtube-video-seo-checklist',
  title: 'YouTube Video SEO Checklist',
  description: 'Complete SEO checklist to maximize rankings before publishing.',
  category: 'D',
  inputs: [],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `return ['Checklist ready! Check these items before publishing:\\n\\n☐ Keyword in title (first 60 characters)\\n☐ Compelling thumbnail with 3 words or less\\n☐ Description has 200+ words with keywords\\n☐ 10-15 relevant tags added\\n☐ Hashtags in description (3 max)\\n☐ Chapters/timestamps added\\n☐ End screen and cards set up\\n☐ Captions/subtitles uploaded\\n☐ Playlist added\\n☐ Pinned comment with CTA\\n☐ Custom thumbnail uploaded (not auto-generated)\\n☐ Video file named with keyword (before upload)'];`,
  },
  generate() {
    return ['Checklist ready! Check these items before publishing:\n\n☐ Keyword in title (first 60 characters)\n☐ Compelling thumbnail with 3 words or less\n☐ Description has 200+ words with keywords\n☐ 10-15 relevant tags added\n☐ Hashtags in description (3 max)\n☐ Chapters/timestamps added\n☐ End screen and cards set up\n☐ Captions/subtitles uploaded\n☐ Playlist added\n☐ Pinned comment with CTA\n☐ Custom thumbnail uploaded (not auto-generated)\n☐ Video file named with keyword (before upload)'];
  },
  staticExamples: [
    'Checklist ready! Check these items before publishing:\n\n☐ Keyword in title (first 60 characters)\n☐ Compelling thumbnail with 3 words or less\n☐ Description has 200+ words with keywords\n☐ 10-15 relevant tags added\n☐ Hashtags in description (3 max)\n☐ Chapters/timestamps added\n☐ End screen and cards set up\n☐ Captions/subtitles uploaded\n☐ Playlist added\n☐ Pinned comment with CTA\n☐ Custom thumbnail uploaded (not auto-generated)\n☐ Video file named with keyword (before upload)',
  ],
  faq: [
    { q: 'Do I really need to do all these steps?', a: 'Each item improves a different SEO factor. Skipping steps reduces your chances of ranking. The checklist ensures consistency.' },
    { q: 'How often should I use this checklist?', a: 'Before every upload. Make it part of your publishing workflow.' },
  ],
  howToUse: [
    'Review the checklist.',
    'Check off items as you complete them.',
    'Use before every upload for consistent SEO.',
  ],
};
registerEngine(engine);
