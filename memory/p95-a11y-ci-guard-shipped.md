# P95 a11y CI Guard Ship Log

## Summary

P95 adds the **first non-SEO, non-i18n CI guard** — foundational accessibility (a11y) checks per W3C WCAG 2.1. Verifies every page has exactly 1 h1, all images have alt attribute, all buttons have text/aria-label, and no heading-level skip.

**Date:** 2026-07-26
**Batch ID:** P95
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1189 → 1190 pass (+1 from new a11y-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/a11y-guard.test.ts`** — 23rd build-dep suite
  - For every page (898 pages = 449 en + 449 zh):
    1. **Exactly 1 h1 per page** — multiple h1 or no h1 = screen reader navigation defect
    2. **All `<img>` tags have `alt` attribute** — image description for screen readers (decorative `alt=""` is allowed)
    3. **All `<button>` tags have text OR aria-label** — interactive element accessibility
    4. **No heading-level skip** — h1 → h3 (without h2) breaks document outline

### Changed
- **[scripts] `tests/run.mjs` count 22 → 23 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

After P87-P94 covered SEO 8/8 dimensions, P95 pivots to a new dimension: **accessibility (a11y)**. SEO and a11y overlap in some areas (alt text helps both), but a11y also covers:
- Screen reader navigation (heading hierarchy, h1 count)
- Keyboard navigation (button focus, label association)
- Document outline (h1 → h2 → h3, no skipping)

Catches defects that would:
- Fail W3C WCAG 2.1 audits
- Reduce screen reader usability
- Miss SEO/a11y compliance certifications

## TDD verification

1. **Baseline PASS**: Run against current state → 1 pass / 0 fail (194ms)
2. **Simulate regression**: Remove `<h1>` from `dist/en/about/index.html` → run → 1 fail / 0 pass (caught the missing h1)
3. **Restore**: `cp /tmp/about-before.html` → re-run → 1 pass / 0 fail ✓

Confirmed the test is not a silent-pass.

## Implementation details

The guard strips `<script>`, `<style>`, and JSON-LD blocks before structural checks. This focuses on user-visible DOM and avoids false positives from inline script content (e.g., a JSON-LD might contain template strings that look like HTML to a naive parser).

Heading-level skip detection logic:
- Collect all h1-h6 levels in document order
- If h1 is seen, and the next new level is h3+ (skipping h2), flag
- Repeated h2/h3 etc. are not flagged (e.g., multiple h2 sections are normal)

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
| **a11y (P95)** | **`a11y-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 23 tests** (22 build-dep + 2 in 1 source-only file)

## Engineering metrics

| Metric | Before P95 | After P95 |
|---|---|---|
| pnpm check | 1189 / 0 / 0 | **1190 / 0 / 0** |
| Build-dep suites | 22 | **23** |
| Defense dimensions | SEO 8/8 + i18n 2/2 | **SEO 8/8 + i18n 2/2 + a11y** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add form input label validation (low impact; most forms use placeholder + aria-label)
- ❌ Did NOT add image alt quality check (decorative `alt=""` is valid; can't validate content)
- ❌ Did NOT add color contrast checks (requires computed styles; out of scope for static analysis)
- ❌ Did NOT add keyboard navigation testing (requires interactive testing; static analysis limitation)
- ❌ Did NOT add ARIA roles validation (low impact; project uses semantic HTML)
- ❌ Did NOT add link text validation (no "click here" or "read more" without context)

## Related references

- **P87-P94** — SEO defense era (8/8 dimensions)
- **P62-P83** — i18n defense-in-depth era
- **W3C WCAG 2.1** — Web Content Accessibility Guidelines
- **axe-core** — accessibility testing library (inspiration for check types)
- **CLAUDE.md** "Cascade audit pattern" — every P-series memory should have commit ref or trigger criterion

## P96+ candidate

- **JSON-LD BreadcrumbList position validation** — verify `position: 1, 2, 3...` (SEO depth)
- **OG image localization** — generate per-lang OG images with zh overlay (image generation scope)
- **SaaS calc output i18n** — similar to P85a for SaaS category
- **Audit script migration** — extract parser logic to shared library
- **Performance / security CI guard** — new dimension beyond SEO/i18n/a11y