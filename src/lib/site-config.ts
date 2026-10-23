/**
 * Site-wide constants. Single source of truth for the production URL.
 *
 * Centralized so future deployments to a different domain (or split
 * environments) only need to flip one string instead of 10.
 *
 * See plan: docs/superpowers/plans/2026-06-30-v2-cleanup-site-url-de-dup.md
 */
export const SITE_URL = 'https://forgeflowkit.com';

/**
 * Default social-preview image for pages that have no per-tool OG image
 * (home / category / guide / compare / about / terms / 404 — 237 pages
 * measured 2026-10-22).
 *
 * P153-B′: `public/og-default.png` was a 1×1 transparent PNG until
 * 2026-10-22 — the 2026-06-25 SEO round created it as a deliberate
 * placeholder ("until Plan B ships real images") and Plan B never shipped.
 * A 1×1 PNG still returns HTTP 200, so scrapers rendered a *blank* card
 * rather than an error: a failure that is invisible to every monitor.
 * Both files are now real 1200×630 cards, and they are TRACKED in git
 * (unlike `public/og/`, which is a gitignored build artifact) so they are
 * served even when the deploy runs `pnpm build` instead of
 * `pnpm build:full`.
 *
 * The English card's filename is NEW (og-default-en.png) while the
 * historical og-default.png is still published with the same bytes. Reason:
 * social platforms cache an og:image BY URL, and /og-default.png served a 1x1
 * transparent PNG until 2026-10-22 — a platform that fetched it back then may
 * still be showing a blank card, and that cache is not ours to invalidate.
 * A URL no platform has seen is always re-fetched. The old path stays alive so
 * anything that already links to it still gets a real card instead of a 404.
 *
 * Single source of truth: this function is the only place that knows which
 * card belongs to which locale. The layout, both topic templates, and the
 * `og-default-card-guard` all read it, so they cannot drift apart.
 */
export function defaultOgImage(lang: string): string {
  return lang === 'zh' ? '/og-default-zh.png' : '/og-default-en.png';
}
