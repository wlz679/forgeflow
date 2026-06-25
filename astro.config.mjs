import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { classifyUrl } from './scripts/classify-url.ts';

export default defineConfig({
  site: 'https://forgeflowkit.com',
  integrations: [
    sitemap({
      entryLimit: 45000,
      serialize(item) {
        const c = classifyUrl(item.url);
        return { ...item, changefreq: c.changefreq, priority: c.priority };
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
