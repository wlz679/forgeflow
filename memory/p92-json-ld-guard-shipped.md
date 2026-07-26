# P92 JSON-LD / Structured Data CI Guard Ship Log

## Summary

P92 adds a build-dep CI guard that verifies JSON-LD structured data completeness — every page has valid `@type` matching its kind, JSON is parseable, URLs use the correct domain.

**Date:** 2026-07-26
**Batch ID:** P92
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1186 → 1187 pass (+1 from new json-ld-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/json-ld-guard.test.ts`** — 20th build-dep suite
  - Parses every `<script type="application/ld+json">` block on every page
  - Verifies JSON is parseable (no `__parseError`)
  - Verifies at least 1 JSON-LD block per page
  - Verifies expected `@type` per page kind:
    - `blog/best-*` → `WebSite` + `Article`
    - `solopreneur-*` → `WebSite` + `SoftwareApplication`
    - category pages → `WebSite` (+ page-specific)
    - about / contact / privacy / terms → `WebSite` (+ page-specific)
  - Recursively scans for URLs in JSON-LD (`@id`, `url`, `@graph`, `mainEntity`) — must use `forgeflowkit.com`

### Changed
- **[scripts] `tests/run.mjs` count 19 → 20 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

BaseLayout.astro + per-page templates emit JSON-LD via `<script type="application/ld+json">` blocks. Schema.org structured data enables rich snippets in search results, knowledge graph integration, and improved SEO.

Without a guard, JSON-LD can drift:
- New pages might forget to emit JSON-LD
- JSON syntax errors can break parsing (search engines ignore broken JSON-LD silently)
- Off-domain URLs can confuse schema validation
- Wrong `@type` per page reduces rich snippet eligibility

P92 closes the third dimension of SEO structured data defense.

## TDD verification

1. **Baseline FAIL (false positive)**: First run → 200 violations (my expectedTypes said blog → `Blog`, actual is `Article`)
2. **Fix guard**: Update `expectedTypes` to use `Article` for blog posts
3. **Final PASS**: 1 pass / 0 fail (146ms)
4. **Simulate regression**: Corrupt JSON-LD by removing closing brace → run → 1 fail / 0 pass (caught)
5. **Restore**: `cp /tmp/en-about-before3.html` → re-run → 1 pass / 0 fail ✓

Confirmed the test is not a silent-pass.

## Implementation challenges (debug notes)

Initial implementation had 1 false-positive bug:

1. **Wrong `@type` for blog posts**: My `expectedTypes` said blog posts should have `@type Blog`. Actual codebase uses `Article` (more specific schema.org type for blog posts). 200 violations caught, then fix.

Lesson: even with 1 false positive, the guard is still valuable — the iteration to fix it forced me to confirm actual `@type` patterns.

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
| **JSON-LD (P92)** | **`json-ld-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 20 tests** (19 build-dep + 2 in 1 source-only file)

## SEO six-layer defense (post-P92)

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

Layer 6: JSON-LD / structured data
  ↓ P92 (json-ld-guard) ← NEW
```

All 6 layers CI-guarded. SEO defense-in-depth complete.

## Engineering metrics

| Metric | Before P92 | After P92 |
|---|---|---|
| pnpm check | 1186 / 0 / 0 | **1187 / 0 / 0** |
| Build-dep suites | 19 | **20** |
| SEO coverage | 5/6 | **6/6** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add schema.org property validation (e.g., FAQPage should have `mainEntity[]` with `Question` types) — would require deep schema knowledge
- ❌ Did NOT add JSON-LD field cardinality check (e.g., Article should have headline, datePublished, author)
- ❌ Did NOT add multi-language JSON-LD alternates (e.g., Article inLanguage alternate) — would require coordinating with i18n strategy
- ❌ Did NOT detect duplicate JSON-LD blocks (multiple WebSite on same page) — outside scope

## Related references

- **P87-P91** — preceding SEO guards (hreflang, canonical, OG/Twitter)
- **P91** — also caught a real defect (og:locale missing); P92 follows same pattern
- **BaseLayout.astro** + per-page templates — JSON-LD source code
- **schema.org** — structured data specification
- **Google Search Central** — structured data guidelines

## P93+ candidate

- **OG image localization** — generate per-lang OG images with zh overlay (image generation scope)
- **JSON-LD field validation** — verify Article has headline/datePublished/author; FAQPage has mainEntity with Question
- **SaaS calc output i18n** — similar to P85a for SaaS category
- **Audit script migration** — extract parser logic to shared library