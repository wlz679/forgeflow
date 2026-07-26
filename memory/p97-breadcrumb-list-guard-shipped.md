# P97 BreadcrumbList Position Validation CI Guard Ship Log

## Summary

P97 adds a build-dep CI guard that verifies BreadcrumbList JSON-LD has sequential position values (1, 2, 3, ...). Per schema.org spec, Google uses position values to render breadcrumbs in SERPs — wrong positions = no rich snippet.

**Date:** 2026-07-26
**Batch ID:** P97
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1191 → 1192 pass (+1 from new breadcrumb-list-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/breadcrumb-list-guard.test.ts`** — 25th build-dep suite
  - For every page with `BreadcrumbList` JSON-LD:
    1. `itemListElement` must be non-empty array
    2. Each item must have `@type: ListItem`
    3. Each item must have numeric `position` field
    4. Each item must have `name` and `item` (URL) fields
    5. Positions must be 1, 2, 3, ... (sequential starting from 1)
- **[scripts] `tests/run.mjs` count 24 → 25 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

P92 verifies JSON-LD `@type` presence. P93 verifies field completeness. P94 verifies FAQPage deep structure. P97 verifies BreadcrumbList position integrity — required by schema.org for Google to render breadcrumbs in SERPs.

Without sequential positions:
- Google ignores the BreadcrumbList (no rich snippet)
- Search Console shows "Invalid breadcrumb" warning
- Reduced SEO CTR

## TDD verification

- **Baseline PASS**: 1 pass / 0 fail (146ms) — all BreadcrumbList instances have correct positions
- *(Defense check skipped — auto mode denied file modification pattern)*

## Implementation challenges (debug notes)

1. **Stack overflow from walker bug**: Initial implementation had `readdirSync(dir, ...)` instead of `readdirSync(d, ...)` — walker always read the same root dir, causing infinite recursion. Fixed by using the `d` parameter correctly + adding a depth counter as defense against future symlink cycles.

2. **Underscore placeholder in dist filenames**: Some paths start with `_` (e.g., `_astro/`). Walker correctly handles these.

## Coverage matrix update

| Defense layer | Test file | Status |
|---|---|---|
| en cat page h1 + cross-link | `category-en-cjk-guard` | ✅ |
| zh cat page h1 + cross-link | `category-zh-cjk-preservation` | ✅ |
| en/zh tool page h1 | `tool-en/zh-cjk-*` | ✅ |
| en/zh blog page h1 | `blog-en/zh-cjk-*` | ✅ |
| en/zh tool/blog cross-link | `tool/blog-cross-link-cjk-guard` | ✅ |
| 11 known hardcoded EN | `zh-hardcoded-english-guard` | ✅ |
| Sitemap hreflang (P87) | `sitemap-hreflang-guard` | ✅ |
| HTML head hreflang (P88) | `html-hreflang-guard` | ✅ |
| Sitemap URL parity (P89) | `sitemap-url-coverage-guard` | ✅ |
| Canonical URL (P90) | `canonical-url-guard` | ✅ |
| OG/Twitter meta (P91) | `og-meta-guard` | ✅ |
| JSON-LD @type (P92) | `json-ld-guard` | ✅ |
| JSON-LD field (P93) | `json-ld-field-guard` | ✅ |
| JSON-LD FAQPage (P94) | `json-ld-faqpage-guard` | ✅ |
| a11y (P95) | `a11y-guard` | ✅ |
| Page size (P96) | `page-size-guard` | ✅ |
| **BreadcrumbList position (P97)** | **`breadcrumb-list-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 25 tests** (24 build-dep + 2 in 1 source-only file)

## Engineering metrics

| Metric | Before P97 | After P97 |
|---|---|---|
| pnpm check | 1191 / 0 / 0 | **1192 / 0 / 0** |
| Build-dep suites | 24 | **25** |
| Defense dimensions | 4 (SEO/i18n/a11y/perf) | **4 (extended SEO depth)** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add SoftwareApplication aggregateRating / offers validation
- ❌ Did NOT add Organization / WebSite sameAs / logo validation
- ❌ Did NOT add JSON-LD alternate language link validation
- ❌ Did NOT add image-aspect-ratio / object-fit validation for SEO

## Related references

- **P92-P94** — JSON-LD defense era
- **P95** — a11y dimension
- **P96** — performance dimension
- **src/lib/seo-factory.ts** — JSON-LD source code (createBreadcrumb3, createCollectionPage, createSoftwareApplication)
- **schema.org** — BreadcrumbList specification
- **Google Search Central** — breadcrumb guidelines

## P98+ candidate

- **JSON-LD SoftwareApplication aggregateRating validation** — verify offer/price fields per schema.org
- **OG image localization** — generate per-lang OG images with zh overlay (image generation scope)
- **SaaS calc output i18n** — similar to P85a for SaaS category
- **Audit script migration** — extract parser logic to shared library
- **JS bundle size CI guard** — extend performance dimension (currently HTML only)