# P90 HTML Canonical URL CI Guard Ship Log

## Summary

P90 adds a build-dep CI guard that verifies every page's `<link rel="canonical">` is self-referential and on the correct domain. Catches misconfigured canonical URLs that would cause search engines to consolidate en/zh variants under one URL.

**Date:** 2026-07-26
**Batch ID:** P90
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1184 → 1185 pass (+1 from new canonical-url-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/canonical-url-guard.test.ts`** — 18th build-dep suite
  - Walks `dist/en/**/index.html` and `dist/zh/**/index.html` (898 pages)
  - For each page, verifies:
    1. Exactly 1 `<link rel="canonical">` element present
    2. Canonical href uses `https://forgeflowkit.com` domain (no cross-domain)
    3. Canonical href points to the SAME page (self-referential, not a redirect)
- **[scripts] `tests/run.mjs` count 17 → 18 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

BaseLayout.astro:136 emits `<link rel="canonical" href="...">`. A misconfigured canonical can:
- Cause search engines to consolidate multiple pages under one URL
- Suppress en/zh variants from search results
- Break canonical URL hierarchy

P90 catches regressions of BaseLayout.astro:136. Future refactors that break the template (or change `Astro.url.pathname` semantics) fail in CI.

## TDD verification

1. **Baseline PASS**: Run against current state → 1 pass / 0 fail (136ms)
2. **Simulate regression**: Change canonical to `https://wrong-domain.example.com/zh/about/` → run → 1 fail / 0 pass (caught the wrong domain)
3. **Restore**: `cp /tmp/zh-about-before2.html` → re-run → 1 pass / 0 fail ✓

Confirmed the test is not a silent-pass.

## Implementation challenges (debug notes)

Initial implementation had 2 bugs that took iterations to fix:

1. **Trailing `/index.html` in expected URL**: My test expected `https://forgeflowkit.com/en/about/index.html` but Astro's `Astro.url.pathname` returns the directory form `/en/about/` (no `index.html`). First run produced 448 violations. Fixed by stripping `/index.html` from rel.

2. **Root URL case (`/en/` instead of `/en/index.html`)**: After fix #1, 2 violations remained for the root page. My regex `rel.replace(/\/index\.html$/, '')` doesn't match `index.html` (no leading slash). Fixed by adding `^index\.html$` pattern. Second run produced 0 violations.

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
| **Canonical URL (P90)** | **`canonical-url-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 18 tests** (17 build-dep + 2 in 1 source-only file)

## SEO four-layer defense (post-P90)

```
Layer 1: HTML head hreflang emission (BaseLayout.astro)
  ↓ P88 (html-hreflang-guard)

Layer 2: Sitemap hreflang annotations (astro.config.mjs)
  ↓ P87 (sitemap-hreflang-guard)

Layer 3: en/zh page set parity
  ↓ P89 (sitemap-url-coverage-guard)

Layer 4: Canonical URL self-referential
  ↓ P90 (canonical-url-guard)
```

All 4 layers CI-guarded. Complete SEO defense-in-depth.

## Engineering metrics

| Metric | Before P90 | After P90 |
|---|---|---|
| pnpm check | 1184 / 0 / 0 | **1185 / 0 / 0** |
| Build-dep suites | 17 | **18** |
| SEO coverage | 3/4 | **4/4** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add og:image / og:locale CI guard (image generation scope, lower priority)
- ❌ Did NOT add og:description / twitter:description CI guard (low risk; P80/P81 verified manually)
- ❌ Did NOT add meta keywords / description length guard (separate SEO concerns)

## Related references

- **P87** — sitemap hreflang CI guard
- **P88** — HTML head hreflang CI guard
- **P89** — sitemap URL coverage CI guard
- **BaseLayout.astro:136** — canonical URL source code (`<link rel="canonical" href={...}>`)
- **P86** — original hreflang emission era

## P91+ candidate

- **SaaS calc output i18n** — similar to P85a for SaaS category (~3 engines)
- **OG image localization** — image generation scope
- **OG meta tags CI guard** — verify og:title/og:description/og:image properly i18n'd per lang
- **Audit script migration** — extract parser logic to shared library