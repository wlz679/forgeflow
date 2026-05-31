export interface Category {
  id: string;
  name: string;
  slug: string;
  description: string;
}

export const categories: Category[] = [
  { id: 'A', name: 'Content Ideas', slug: 'content-ideas', description: 'Generate video topics, trending ideas, and niche suggestions for your channel.' },
  { id: 'B', name: 'Titles & SEO Copy', slug: 'titles-seo-copy', description: 'Create click-worthy titles, descriptions, hooks, and scripts optimized for search.' },
  { id: 'C', name: 'Shorts Growth', slug: 'shorts-growth', description: 'Tools specifically for YouTube Shorts — ideas, hooks, captions, and hashtags.' },
  { id: 'D', name: 'SEO Optimization', slug: 'seo-optimization', description: 'Generate tags, keywords, hashtags, and audit your video SEO before publishing.' },
  { id: 'E', name: 'Thumbnail Optimization', slug: 'thumbnail-optimization', description: 'Craft thumbnail text, design concepts, and optimize CTR for your thumbnails.' },
  { id: 'F', name: 'Channel Growth', slug: 'channel-growth', description: 'Channel naming, descriptions, upload timing, revenue estimates, and growth scoring.' },
];
