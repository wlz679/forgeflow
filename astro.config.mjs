import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  site: 'https://youtubetools.com',
  vite: { plugins: [tailwindcss()] },
});
