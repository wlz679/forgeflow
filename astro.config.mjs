import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
import { classifyUrl } from './scripts/classify-url.ts';

const SITE_URL = 'https://forgeflowkit.com';

export default defineConfig({
  site: SITE_URL,
  integrations: [
    sitemap({
      entryLimit: 45000,
      serialize(item) {
        const c = classifyUrl(item.url);
        // P86: emit <xhtml:link rel="alternate" hreflang="..."> for every URL
        // so search engines can serve the right language version. Pair each
        // URL with its en/zh sibling by swapping the leading /en|/zh prefix.
        const u = new URL(item.url);
        const path = u.pathname;
        let enPath = path;
        let zhPath = path;
        if (path.startsWith('/zh/') || path === '/zh') enPath = '/en' + path.slice(3);
        else if (path.startsWith('/en/') || path === '/en') zhPath = '/zh' + path.slice(3);
        const enUrl = `${SITE_URL}${enPath}`;
        const zhUrl = `${SITE_URL}${zhPath}`;
        return {
          ...item,
          changefreq: c.changefreq,
          priority: c.priority,
          // The `links` field renders as <xhtml:link> children of <url>.
          // Includes x-default per Google i18n SEO best practice.
          links: [
            { lang: 'en', url: enUrl },
            { lang: 'zh', url: zhUrl },
            { lang: 'x-default', url: enUrl },
          ],
        };
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
