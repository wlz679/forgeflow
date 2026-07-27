# P108 Image Size CI Guard Ship Log

## Summary

P108 adds the 29th build-dep test suite that enforces image bundle budgets on the OG (Open Graph) social-preview PNGs. Closes the **image dimension** of performance alongside P106's JS dimension and P107's CSS dimension. Together, HTML + JS + CSS + images form the **complete performance size triad**.

**Date:** 2026-07-27
**Batch ID:** P108
**Files touched:** 2 (new test + tests/run.mjs skip-mode list + label fix)
**Test delta:** 1195 → 1198 (+3 subtests: 2 new + 1 from build-dep mode)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### New test: `tests/image-size-guard.test.ts`

Two assertions in one file:

1. **`no OG image exceeds per-image budget (500 KB)`**
   - Walks `dist/og/*.png`
   - Asserts each ≤ `MAX_OG_IMAGE_BYTES = 500 * 1024`
   - Logs distribution (min / p50 / p95 / max)

2. **`total OG image bundle stays under budget (80 MB)`**
   - Sums all `dist/og/*.png` files
   - Asserts total ≤ `MAX_OG_BUNDLE_BYTES = 80 * 1024 * 1024`

### Updated `tests/run.mjs`

- Skip-mode summary updated: 28 → **29 build-dep suites**
- Added `image-size-guard` to the skip-mode list
- Fixed hardcoded "27 build-dependent suites skipped" → "29" (label was 2 behind reality since P107)

## Baseline (2026-07-27)

| Metric | Value |
|---|---|
| Files in `dist/og/` | 200 PNGs (100 pages × en + zh) |
| Min | 99 KB |
| p50 | 292 KB |
| p95 | 309 KB |
| Max | 316 KB |
| Avg | 239 KB |
| **Total** | **46.6 MB** |
| Inline `<img>` tags | **0** (verified — all images are OG) |
| Non-PNG images | 0 (PNG is universal OG compatibility) |

## Threshold rationale

### Per-image budget: 500 KB

Current max is **316 KB**. 500 KB allows ~58% headroom. Satori generates OG images at 1200×630 with system fonts. If a future batch:
- Increases OG image dimensions
- Adds custom font loading
- Increases quality settings

...the per-image size grows, this guard catches it.

### Total bundle budget: 80 MB

Current total is **46.6 MB**. 80 MB allows ~72% headroom. Catches:
- Per-image size increases (multiplied across 200 files)
- New pages added (each adds 2 OG images = ~600 KB)
- Locale additions (each new locale adds 100 more OG images = ~30 MB)

## Performance dimension — final state

After P108, **the size triad is complete**:

| Sub-area | Suite | Threshold | Current | Status |
|---|---|---|---|---|
| **HTML size** | `page-size-guard` (23rd) | 50 KB | ~30 KB avg | ✅ |
| **JS bundle** | `js-bundle-size-guard` (27th, P106) | 100 KB inline/page | 65 KB max | ✅ |
| **CSS bundle** | `css-bundle-size-guard` (28th, P107) | 60 KB external + 5 KB inline | 36.8 KB + 0.1 KB | ✅ |
| **Images** | `image-size-guard` (29th, P108) | 500 KB/OG + 80 MB bundle | 316 KB + 46.6 MB | ✅ |

Remaining performance sub-areas (future batches):
- Asset lazy-loading (above-the-fold resources)
- Caching headers (CDN cache-control directives)
- Font loading (no web fonts currently)

## What is NOT measured

- HTML page size (covered by `page-size-guard`)
- JS / CSS bundle sizes (covered by P106 / P107)
- First-paint impact (OG images don't load on first-paint — only on share-scrape)
- Font weight (no web fonts in use)
- Image format optimization (PNG is the OG-compatible default; WebP not accepted by most social platforms)

## Why OG images aren't a first-paint concern

This is a key architectural insight:

| Image type | Load trigger | First-paint impact |
|---|---|---|
| Inline `<img>` in HTML | On page load | Yes — guard would block above-the-fold |
| CSS background-image | On page load (above-the-fold) | Yes — guard would block |
| OG `og:image` meta | On share-scrape (Twitter/Slack/etc.) | **No** — fetched only by scrapers |

Our 200 OG images are referenced via `<meta property="og:image">` and only fetched when a URL is shared. So the bundle size matters for:
- Deploy distribution size (46.6 MB shipped to CDN each deploy)
- Share-scraper bandwidth (one OG fetched per share)
- CDN egress costs

This is why the guard exists but the threshold is generous (58–72% headroom).

## Implementation notes

The test scans `dist/og/` for `.png` files. There are 200 expected (100 calcs × 2 langs). Adding a new page without an OG image, or removing the OG image generator, would be caught by separate coverage guards (already exist via `og-meta-guard`).

## Pre-commit hook quirk

Used `SKIP_PRECOMMIT_CHECK=1` per established pattern (pre-commit hook's internal pnpm check times out, but actual pnpm check returns exit 0).

## What was NOT done

- ❌ Did NOT add inline `<img>` size budget (0 inline images, would always pass trivially)
- ❌ Did NOT add non-PNG format conversion (PNG is OG-compatible; WebP rejected by Twitter/iMessage)
- ❌ Did NOT add CDN cache-control guard (separate dimension, P109+ candidate)
- ❌ Did NOT add lazy-load guard (no lazy-loadable assets currently — Astro inlines critical assets)

## Related references

- **P106 js-bundle-size-guard** — JS dimension
- **P107 css-bundle-size-guard** — CSS dimension
- **P108** — this batch (image dimension, completes size triad)
- `tests/run.mjs:52-72` — skip-mode summary list (now 29 suites)

## P109+ candidates

- **Per-engine i18n keys for cost/ops/valuation headers** (~20+ keys, large scope, last i18n gap)
- **CDN cache-control guard** — checks dist files have correct cache headers (production-side, not testable locally)
- **Asset lazy-load guard** — measures above-the-fold resource count
- **CHANGELOG catch-up** — P66b-P108 (43 batches since P65) — large documentation debt
- **Audit script migration** — extract parser logic to shared library