# P89 Sitemap URL Coverage Guard Ship Log

## Summary

P89 adds a build-dep CI guard that verifies en/zh page parity — every page must have a sibling in the other language. Complements P87 (sitemap hreflang guard) and P88 (HTML head hreflang guard) by covering the third dimension: URL set parity.

**Date:** 2026-07-26
**Batch ID:** P89
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1183 → 1184 pass (+1 from new sitemap-url-coverage-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/sitemap-url-coverage-guard.test.ts`** — 17th build-dep suite
  - Walks `dist/en/**/index.html` and `dist/zh/**/index.html`
  - Verifies every zh page has a corresponding en page (same path) — and vice versa
  - Detects missing siblings that would break i18n navigation
- **[scripts] `tests/run.mjs` count 16 → 17 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

P87 (sitemap-hreflang-guard) verifies hreflang tags point to siblings that exist. P88 (html-hreflang-guard) verifies HTML head emits hreflang correctly. P89 closes the third dimension:

- **P87**: Are hreflang annotations correct?
- **P88**: Are HTML head hreflangs emitted correctly?
- **P89 (this)**: Do en/zh page sets have full parity?

A page could exist in en but not zh (or vice versa), and P87/P88 wouldn't catch it — both guards only check hreflang emission, not the actual file set.

P89 catches this kind of drift. Currently all 224 en + 224 zh pages have siblings (full parity). Future refactors that add a page in one lang without the other will fail CI.

## TDD verification

1. **Baseline PASS**: Run against current state → 1 pass / 0 fail (32ms)
2. **Simulate orphan zh page**: `mkdir -p dist/zh/only-zh-test && touch dist/zh/only-zh-test/index.html` → run → 1 fail / 0 pass (caught the orphan)
3. **Restore**: `rm -rf dist/zh/only-zh-test` → re-run → 1 pass / 0 fail ✓

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
| **Sitemap hreflang (P87)** | `sitemap-hreflang-guard` | ✅ |
| **HTML head hreflang (P88)** | `html-hreflang-guard` | ✅ |
| **Sitemap URL parity (P89)** | **`sitemap-url-coverage-guard` (NEW)** | ✅ |
| Structural i18n keys | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 17 tests** (16 build-dep + 2 in 1 source-only file)

## i18n SEO three-layer defense (post-P89)

```
Layer 1: HTML head hreflang emission (BaseLayout.astro)
  ↓ verified by
  P88 (html-hreflang-guard)

Layer 2: Sitemap hreflang annotations (astro.config.mjs)
  ↓ verified by
  P87 (sitemap-hreflang-guard)

Layer 3: en/zh page set parity
  ↓ verified by
  P89 (sitemap-url-coverage-guard)
```

All three layers CI-guarded. Future refactors can't break i18n SEO without detection.

## Engineering metrics

| Metric | Before P89 | After P89 |
|---|---|---|
| pnpm check | 1183 / 0 / 0 | **1184 / 0 / 0** |
| Build-dep suites | 16 | **17** |
| i18n SEO coverage | 2/3 (sitemap + HTML) | **3/3 (sitemap + HTML + parity)** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add HTML canonical URL guard (`<link rel="canonical">` verification) — separate SEO concern, lower priority
- ❌ Did NOT add og:description / twitter:description guard (low risk; P80/P81 verified manually)
- ❌ Did NOT add og:image / og:locale guard (image generation scope, future P-series)
- ❌ Did NOT modify sitemap emission (P86 already correct)

## Related references

- **P86** — original sitemap hreflang emission (`astro.config.mjs` sitemap serialize)
- **P87** — sitemap hreflang CI guard
- **P88** — HTML head hreflang CI guard
- **P62-P83** — page-level i18n defense-in-depth era
- **CLAUDE.md** "Cascade audit pattern" — every P-series memory file should have commit ref or trigger criterion

## P90+ candidate

- **HTML canonical URL CI guard** — verify `<link rel="canonical">` points to current URL
- **SaaS calc output i18n** — similar to P85a for SaaS category (~3 engines)
- **Ops/Cost/Valuation calc output i18n** — broader scope
- **OG image localization** — image generation scope (different from text)
- **Audit script migration** — extract parser logic to shared library