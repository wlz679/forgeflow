import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://calckit.com',
  integrations: [sitemap({ entryLimit: 45000, changefreq: 'weekly', priority: 0.7 })],
  vite: { plugins: [tailwindcss()] },
});
