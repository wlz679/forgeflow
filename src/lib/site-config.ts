/**
 * Site-wide constants. Single source of truth for the production URL.
 *
 * Centralized so future deployments to a different domain (or split
 * environments) only need to flip one string instead of 10.
 *
 * See plan: docs/superpowers/plans/2026-06-30-v2-cleanup-site-url-de-dup.md
 */
export const SITE_URL = 'https://forgeflowkit.com';

// P141-B3-T4: sitemap / HSTS / robots 路径集中
export const SITE_CONFIG = {
  sitemap: {
    index: '/sitemap-index.xml',
    static: '/sitemap-0.xml',
  },
  robots: '/robots.txt',
  hsts: 'max-age=63072000; includeSubDomains; preload',
} as const;
