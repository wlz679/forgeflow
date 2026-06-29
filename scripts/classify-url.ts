// Pure URL classifier for sitemap serialization.
// Exported separately from astro.config.mjs so it's testable.

export type PageKind = 'home' | 'tool' | 'blog' | 'static' | 'category';
export interface Classification {
  kind: PageKind;
  priority: number;
  changefreq: 'daily' | 'weekly' | 'monthly';
}

const STATIC_SLUGS = new Set(['about', 'contact', 'privacy-policy', 'terms']);
const CATEGORY_SLUGS = new Set(['saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing', 'cost-efficiency', 'investment-roi']);

export function classifyUrl(url: string): Classification {
  // strip origin
  const path = url.replace(/^https?:\/\/[^/]+/, '');
  // path is like '/en/foo/' or '/en/blog/foo/'

  // Home: /, /en/, /zh/ (with or without trailing slash, no further segments)
  if (/^\/(en|zh)?\/?$/.test(path)) {
    return { kind: 'home', priority: 1.0, changefreq: 'daily' };
  }

  // Blog: /<lang>/blog/ or /<lang>/blog/<post>/
  if (/^\/(en|zh)\/blog(\/|$)/.test(path)) {
    return { kind: 'blog', priority: 0.7, changefreq: 'weekly' };
  }

  // Static: /<lang>/<static-slug>/
  const staticMatch = path.match(/^\/(en|zh)\/([^/]+)\/?$/);
  if (staticMatch && STATIC_SLUGS.has(staticMatch[2])) {
    return { kind: 'static', priority: 0.5, changefreq: 'monthly' };
  }

  // Category: /<lang>/<category-slug>/
  if (staticMatch && CATEGORY_SLUGS.has(staticMatch[2])) {
    return { kind: 'category', priority: 0.8, changefreq: 'weekly' };
  }

  // Default: tool
  return { kind: 'tool', priority: 0.9, changefreq: 'monthly' };
}
