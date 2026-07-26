# P88 HTML hreflang CI Guard Ship Log

## Summary

P88 adds a build-dep CI guard for HTML `<head>` hreflang annotations. Complements P87 (sitemap hreflang guard) by verifying the other half of i18n SEO — each page's HTML head declares en/zh/x-default alternate URLs.

**Date:** 2026-07-26
**Batch ID:** P88
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1182 → 1183 pass (+1 from new html-hreflang-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/html-hreflang-guard.test.ts`** — 16th build-dep suite
  - Walks all `dist/en/**/index.html` and `dist/zh/**/index.html` (449 pages × 2 langs)
  - For each page, verifies:
    - 3 `<link rel="alternate" hreflang="...">` elements present: `en`, `zh`, `x-default`
    - Each hreflang URL's path exists as a sibling page (en sibling exists for /zh/, vice versa)
  - Catches regressions where BaseLayout.astro template stops emitting hreflang annotations

### Changed
- **[scripts] `tests/run.mjs` count 15 → 16 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

P86 added hreflang to sitemap; P87 added CI guard for sitemap emission. But BaseLayout.astro:137-139 emits HTML head hreflang separately — if a future refactor breaks that template, search engines lose i18n SEO benefit even though sitemap is correct.

P88 closes the second half of the hreflang defense. Two guards together = complete i18n SEO coverage:
- `sitemap-hreflang-guard` (P87): sitemap emission
- `html-hreflang-guard` (P88): HTML head emission

## TDD verification

1. **Baseline PASS**: Run against current state → 1 pass / 0 fail (135ms)
2. **Simulate regression**: Remove `<link rel="alternate" hreflang="zh" href="https://forgeflowkit.com/zh/about/">` from `dist/zh/about/index.html` → run → 1 fail / 0 pass (caught the missing hreflang)
3. **Restore**: `cp /tmp/zh-about-before.html` → re-run → 1 pass / 0 fail ✓

Confirmed the test is not a silent-pass.

## Implementation challenges (debug notes)

Initial implementation had 3 bugs that took iterations to fix:

1. **Walker path bug**: `${relBase}/${entry.name}` with `relBase = ''` produces `/about/` (leading slash). Fixed by `rel = relBase ? ... : entry.name` — but this was already correct in my final version.

2. **URL strip bug**: hreflang URLs are `/en/about/` (with lang prefix), but page Set has `about/index.html` (no prefix). Fixed by stripping `/en/` or `/zh/` prefix before comparing: `u.pathname.replace(/^\/(en|zh)\//, '')`.

3. **Trailing slash bug**: After strip, path is `about/` (with trailing slash). Need to strip trailing slash: `.replace(/\/$/, '')`. Then convert `about` → `about/index.html`.

These bugs caused initial failures; final fix handles all three correctly.

## Coverage matrix update

| Defense layer | Test file | Status |
|---|---|---|
| en cat page h1 + cross-link | `category-en-cjk-guard` | ✅ |
| zh cat page h1 + cross-link | `category-zh-cjk-preservation` | ✅ |
| en/zh tool page h1 | `tool-en/zh-cjk-*` | ✅ |
| en/zh blog page h1 | `blog-en/zh-cjk-*` | ✅ |
| en/zh tool/blog cross-link | `tool/blog-cross-link-cjk-guard` | ✅ |
| 11 known hardcoded EN | `zh-hardcoded-english-guard` | ✅ |
| **Sitemap hreflang (P87)** | `sitemap-hreflang-guard` | ✅ |
| **HTML head hreflang (P88)** | **`html-hreflang-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 16 tests** (15 build-dep + 2 in 1 source-only file)

## Engineering metrics

| Metric | Before P88 | After P88 |
|---|---|---|
| pnpm check | 1182 / 0 / 0 | **1183 / 0 / 0** |
| Build-dep suites | 15 | **16** |
| HTML head regression detection | None | **Permanent CI guard** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT change BaseLayout.astro (already correct per existing lines 137-139)
- ❌ Did NOT add sitemap URL coverage CI guard (separate concern: verifies all 224 zh pages have en sibling + vice versa)
- ❌ Did NOT add og:description / twitter:description CI guard (low risk; P80/P81 verified manually)
- ❌ Did NOT add HTML head canonical URL guard (separate concern)

## Related references

- **P86** — original hreflang emission (sitemap + HTML head)
- **P87** — sitemap hreflang CI guard (sister guard for HTML)
- **P62-P83** — page-level i18n defense-in-depth era
- **BaseLayout.astro:137-139** — HTML head hreflang source code

## P89+ candidate

- **Sitemap URL coverage CI guard** — verify all 224 zh pages have en sibling + vice versa (extends P87)
- **HTML canonical URL CI guard** — verify `<link rel="canonical">` points to current URL (separate SEO concern)
- **SaaS calc output i18n** — similar to P85a but SaaS category
- **OG image localization** — image generation scope
- **Audit script migration** — extract parser logic to shared library