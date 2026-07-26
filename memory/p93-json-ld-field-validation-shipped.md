# P93 JSON-LD Field Validation CI Guard + Real Defects Ship Log

## Summary

P93 ships 2 things:
1. **CI guard** for JSON-LD field completeness per @type
2. **Real defect fixes** — Article missing `image` (200 pages) and CollectionPage missing `url` (12 pages)

**Date:** 2026-07-26
**Batch ID:** P93
**Files touched:** 4 (1 new test + 1 page template fix + 1 seo-factory fix + 1 run.mjs count + 1 memory)
**Test delta:** 1187 → 1188 pass (+1 from new json-ld-field-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/json-ld-field-guard.test.ts`** — 21st build-dep suite
  - Verifies required fields per @type (per schema.org best practices)
  - Required fields defined per type:
    - `Article`: `headline`, `image`, `datePublished`, `author`
    - `FAQPage`: `mainEntity`
    - `BreadcrumbList`: `itemListElement`
    - `SoftwareApplication`: `name`, `description`
    - `WebPage`, `CollectionPage`, `AboutPage`, `WebSite`: per type
  - Validates non-empty values (no `undefined` / `null` / `''` / `[]`)

### Fixed (real defects found by guard)
- **[pages] `src/pages/[lang]/blog/[slug].astro:52`** — added `image` field to Article JSON-LD:
  ```js
  image: `${SITE_URL}/og/${post.toolSlug}-${lang}.png`,
  ```
  - **Impact**: 200 blog pages (100 en + 100 zh) now have Article.image field per schema.org spec
- **[lib] `src/lib/seo-factory.ts:27`** — added `url` field to createCollectionPage:
  ```js
  url: `${SITE_URL}/${lang}/${categorySlug}/`,
  ```
  - **Impact**: 12 category pages (6 en + 6 zh) now have CollectionPage.url field

### Changed
- **[scripts] `tests/run.mjs` count 20 → 21 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

P92 (json-ld-guard) verifies each page has JSON-LD with the right @type. P93 complements by verifying the FIELDS within each @type are complete per schema.org best practices.

**P93 caught 2 real defects**:
1. **Article missing `image`** — 200 blog pages (all blog posts lacked `image` field required by schema.org Article spec)
2. **CollectionPage missing `url`** — 12 category pages (6 en + 6 zh)

Without these fields, Google Search Console shows warnings, and rich snippet eligibility is reduced.

## TDD verification

1. **Baseline FAIL (caught defects)**: First run → 212 violations (200 Article + 12 CollectionPage)
2. **Fix Article** (add image to blog page template) → re-run → 12 violations
3. **Fix CollectionPage** (add url to seo-factory) → re-run → 0 violations
4. **Final PASS**: 1 pass / 0 fail (175ms)

The guard is not silent-pass — it caught 212 real defects.

## Implementation challenges (debug notes)

Initial implementation had 1 challenge:

1. **Debug script encoding issue** — used Python `print()` which failed on CJK characters in JSON-LD values. Worked around by writing to file with `utf-8` encoding.
2. **Defense check Python regex** — `\\s` in Python string is literal `\s`, not regex `\s`. Used `br'\s'` raw string for next attempt (but skipped as the main TDD via build cycle was already verified).

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
| JSON-LD @type presence (P92) | `json-ld-guard` | ✅ |
| **JSON-LD field completeness (P93)** | **`json-ld-field-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 21 tests** (20 build-dep + 2 in 1 source-only file)

## SEO seven-layer defense (post-P93)

```
Layer 1: HTML head hreflang emission
  ↓ P88 (html-hreflang-guard)

Layer 2: Sitemap hreflang annotations
  ↓ P87 (sitemap-hreflang-guard)

Layer 3: en/zh page set parity
  ↓ P89 (sitemap-url-coverage-guard)

Layer 4: Canonical URL self-referential
  ↓ P90 (canonical-url-guard)

Layer 5: OG/Twitter meta completeness
  ↓ P91 (og-meta-guard)

Layer 6: JSON-LD @type presence
  ↓ P92 (json-ld-guard)

Layer 7: JSON-LD field completeness
  ↓ P93 (json-ld-field-guard) ← NEW (caught 212 real defects)
```

All 7 layers CI-guarded. SEO defense-in-depth complete.

## Engineering metrics

| Metric | Before P93 | After P93 |
|---|---|---|
| pnpm check | 1187 / 0 / 0 | **1188 / 0 / 0** |
| Build-dep suites | 20 | **21** |
| SEO coverage | 6/7 | **7/7** |
| Article missing `image` | **200 pages** | **0 pages (fixed)** |
| CollectionPage missing `url` | **12 pages** | **0 pages (fixed)** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add FAQPage field validation (mainEntity is checked but no deeper schema check on Question/Answer types)
- ❌ Did NOT add SoftwareApplication field validation (name/description checked, but not aggregateRating, offers, etc.)
- ❌ Did NOT add BreadcrumbList position validation (itemListElement must have `position: 1, 2, 3...`)
- ❌ Did NOT add JSON-LD alternate language link (Article.inLanguage alternate)
- ❌ Did NOT detect duplicate JSON-LD blocks (multiple WebSite on same page)

## Related references

- **P91** — also caught real defect (og:locale); P93 follows same pattern
- **P92** — JSON-LD @type guard (sister guard for field completeness)
- **P87-P91** — preceding SEO guards
- **schema.org** — structured data specification
- **Google Search Central** — structured data guidelines

## P94+ candidate

- **OG image localization** — generate per-lang OG images with zh overlay (image generation scope)
- **JSON-LD FAQPage deep validation** — verify mainEntity contains Question/Answer with proper name/acceptedAnswer.text
- **SaaS calc output i18n** — similar to P85a for SaaS category
- **Audit script migration** — extract parser logic to shared library
- **New dimension** (a11y, performance, security CI guard)