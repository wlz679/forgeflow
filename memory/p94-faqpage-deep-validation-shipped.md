# P94 JSON-LD FAQPage Deep Validation CI Guard Ship Log

## Summary

P94 adds a build-dep CI guard that verifies FAQPage structured data has the complete Question/Answer structure required by Google for rich FAQ snippets.

**Date:** 2026-07-26
**Batch ID:** P94
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1188 → 1189 pass (+1 from new json-ld-faqpage-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/json-ld-faqpage-guard.test.ts`** — 22nd build-dep suite
  - For every page with `FAQPage` JSON-LD:
    - `mainEntity` must be non-empty array
    - Each item must have `@type: Question`
    - Each Question must have non-empty `name` (question text)
    - Each Question must have non-empty `acceptedAnswer`
    - Each `acceptedAnswer` must have `@type: Answer`
    - Each `acceptedAnswer` must have non-empty `text` (answer text)
  - These fields are required by schema.org FAQPage spec for Google rich FAQ snippet eligibility
- **[scripts] `tests/run.mjs` count 21 → 22 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

P92 verifies JSON-LD `@type` presence. P93 verifies required fields per `@type`. P94 complements them with deep validation of FAQPage's nested structure (Question inside mainEntity, Answer inside acceptedAnswer).

Without these nested fields:
- Google can't render FAQ rich snippets in search results
- Schema validator warnings
- Reduced CTR for tool pages (which depend on FAQ rich snippets for visibility)

P94 catches regressions of the FAQ emission logic in `src/lib/faq.ts` (and per-engine FAQ definitions).

## TDD verification

1. **Baseline PASS**: Run against current state → 1 pass / 0 fail (155ms). All FAQPage JSON-LD has correct Question/Answer structure.
2. **Simulate regression**: Empty first `text` field in `dist/en/solopreneur-mrr-calculator/index.html` → run → 1 fail / 0 pass (caught)
3. **Restore**: `cp /tmp/mrr-before.html` → re-run → 1 pass / 0 fail ✓

Confirmed the test is not a silent-pass.

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
| JSON-LD field completeness (P93) | `json-ld-field-guard` | ✅ |
| **JSON-LD FAQPage deep (P94)** | **`json-ld-faqpage-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 22 tests** (21 build-dep + 2 in 1 source-only file)

## SEO eight-layer defense (post-P94)

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
  ↓ P93 (json-ld-field-guard)

Layer 8: JSON-LD FAQPage deep validation
  ↓ P94 (json-ld-faqpage-guard) ← NEW
```

All 8 layers CI-guarded. SEO defense-in-depth complete.

## Engineering metrics

| Metric | Before P94 | After P94 |
|---|---|---|
| pnpm check | 1188 / 0 / 0 | **1189 / 0 / 0** |
| Build-dep suites | 21 | **22** |
| SEO coverage | 7/8 | **8/8** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add BreadcrumbList position validation (itemListElement must have `position: 1, 2, 3...`)
- ❌ Did NOT add SoftwareApplication aggregateRating / offers validation
- ❌ Did NOT add Organization / WebSite logo / sameAs validation
- ❌ Did NOT add JSON-LD alternate language link (Article.inLanguage alternate)

## Related references

- **P92** — JSON-LD @type guard (sister guard)
- **P93** — JSON-LD field completeness guard (sister guard, broader scope)
- **P91** — also caught real defect (og:locale); P94 follows same pattern
- **schema.org** — FAQPage specification
- **Google Search Central** — FAQ rich snippet guidelines

## P95+ candidate

- **OG image localization** — generate per-lang OG images with zh overlay (image generation scope)
- **JSON-LD BreadcrumbList position validation** — verify itemListElement has `position: 1, 2, 3...`
- **SaaS calc output i18n** — similar to P85a
- **Audit script migration** — extract parser logic to shared library
- **New dimension** (a11y, performance, security CI guard)