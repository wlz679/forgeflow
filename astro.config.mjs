import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';

// P141-B3-T7d: 不直接 import .ts — astro.config.mjs 由 Astro 原生 ESM 加载，
// 无法解析 .ts 扩展。把 classifyUrl 内联，保持纯 JS config（无外部依赖、
// 不依赖 tsx loader）。原 ./scripts/classify-url.ts 仍保留供 tests/classify-url.test.ts
// 单元测试使用，单一来源逻辑在 .ts；此处为生产路径快照（保持语义一致）。
const STATIC_SLUGS = new Set(['about', 'contact', 'privacy-policy', 'terms']);
const CATEGORY_SLUGS = new Set(['saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing', 'cost-efficiency', 'investment-roi']);
function classifyUrl(url) {
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  if (/^\/(en|zh)?\/?$/.test(path)) {
    return { kind: 'home', priority: 1.0, changefreq: 'daily' };
  }
  if (/^\/(en|zh)\/blog(\/|$)/.test(path)) {
    return { kind: 'blog', priority: 0.7, changefreq: 'weekly' };
  }
  const staticMatch = path.match(/^\/(en|zh)\/([^/]+)\/?$/);
  if (staticMatch && STATIC_SLUGS.has(staticMatch[2])) {
    return { kind: 'static', priority: 0.5, changefreq: 'monthly' };
  }
  if (staticMatch && CATEGORY_SLUGS.has(staticMatch[2])) {
    return { kind: 'category', priority: 0.8, changefreq: 'weekly' };
  }
  return { kind: 'tool', priority: 0.9, changefreq: 'monthly' };
}

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
