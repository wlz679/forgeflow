import { defineConfig } from 'astro/config';
import cloudflare from '@astrojs/cloudflare';
import tailwindcss from '@tailwindcss/vite';
import sitemap from '@astrojs/sitemap';
// P149: Last-Modified meta tag injection. See src/integrations/last-modified.mjs
import { getMtimeForHtmlPath } from './src/integrations/last-modified.mjs';
import fsSync from 'node:fs';
import pathMod from 'node:path';
import { fileURLToPath } from 'node:url';

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

// P149: Astro integration that walks dist/ after build and injects
// <meta http-equiv="last-modified" content="<RFC1123>"> into every HTML file.
// Source mtime comes from src/integrations/last-modified.mjs reverse-path-map.
const lastModifiedIntegration = {
  name: 'last-modified-injection',
  hooks: {
    'astro:build:done': async ({ dir }) => {
      // Astro 4 passes dir as a file:// URL object. Use fileURLToPath for
      // safe OS path conversion (handles Chinese chars + Windows quirks).
      let distDir;
      try {
        if (dir && typeof dir === 'object' && 'href' in dir) {
          // URL object
          distDir = fileURLToPath(dir.href);
        } else if (typeof dir === 'string') {
          distDir = dir;
        } else {
          distDir = pathMod.join(process.cwd(), 'dist');
        }
      } catch {
        distDir = pathMod.join(process.cwd(), 'dist');
      }
      let injected = 0;
      let skipped = 0;
      const failed = [];
      function walk(currentDir) {
        if (!fsSync.existsSync(currentDir)) return;
        for (const e of fsSync.readdirSync(currentDir, { withFileTypes: true })) {
          const full = pathMod.join(currentDir, e.name);
          if (e.isDirectory()) walk(full);
          else if (e.name.endsWith('.html')) {
            const mtime = getMtimeForHtmlPath(full);
            if (!mtime) {
              // Source file not found via reverse-path-map (likely deep
              // wildcard routes like [lang]/[letter]/[topic]-guide.astro).
              // Fall back to dist/ file mtime = build time. Better than nothing.
              try {
                const stat = fsSync.statSync(full);
                const httpDate = stat.mtime.toUTCString();
                injectMeta(full, httpDate);
                injected++;
              } catch {
                failed.push(full);
              }
              continue;
            }
            const httpDate = mtime.toUTCString();
            try {
              injectMeta(full, httpDate);
              injected++;
            } catch {
              failed.push(full);
            }
          }
        }
      }
      function injectMeta(filePath, httpDate) {
        let content = fsSync.readFileSync(filePath, 'utf8');
        const metaTag = `<meta http-equiv="last-modified" content="${httpDate}">`;
        // Skip if already present (idempotent)
        if (/<meta\s+http-equiv=["']last-modified["']/i.test(content)) {
          skipped++;
          return;
        }
        // Inject before </head> so charset stays first (HTML5 spec).
        if (/<\/head>/i.test(content)) {
          content = content.replace(/<\/head>/i, `    ${metaTag}\n  </head>`);
        } else if (/<head>/i.test(content)) {
          content = content.replace(/<head>/i, `<head>\n    ${metaTag}`);
        } else if (/<html([^>]*)>/i.test(content)) {
          content = content.replace(/<html([^>]*)>/i, `<html$1>\n<head>\n    ${metaTag}\n</head>`);
        } else {
          throw new Error(`No <head> or <html> tag found in ${filePath}`);
        }
        fsSync.writeFileSync(filePath, content);
      }
      walk(distDir);
      console.log(`[last-modified-injection] injected=${injected} skipped=${skipped} failed=${failed.length}`);
      if (failed.length > 0) {
        console.warn(`[last-modified-injection] Failed to inject into ${failed.length} files (first 5):`);
        failed.slice(0, 5).forEach((f) => console.warn('  ' + f));
      }
    },
  },
};

export default defineConfig({
  site: SITE_URL,
  output: 'hybrid',
  adapter: cloudflare(),
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
          // P149: include lastmod from source-file mtime so Googlebot can
          // detect newly-shipped pages and prioritize recrawl.
          lastmod: (() => {
            const mtime = getMtimeForHtmlPath(item.url.replace(SITE_URL, ''));
            return mtime ? mtime.toISOString() : new Date().toISOString();
          })(),
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
    lastModifiedIntegration,
  ],
  vite: { plugins: [tailwindcss()] },
});