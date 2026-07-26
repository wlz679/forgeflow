# P87 Sitemap hreflang CI Guard Ship Log

## Summary

P87 adds a build-dep CI guard that verifies `dist/sitemap-0.xml` has complete hreflang annotations for every URL. Defends against regressions of P86's hreflang emission.

**Date:** 2026-07-26
**Batch ID:** P87
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1181 → 1182 pass (+1 from new sitemap-hreflang-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/sitemap-hreflang-guard.test.ts`** — 15th build-dep suite
  - Parses `dist/sitemap-0.xml` with regex
  - Verifies every `<url>` has 3 `<xhtml:link>` children: `en`, `zh`, `x-default`
  - Verifies each hreflang URL exists as its own `<url>` entry in sitemap (sibling check)

### Changed
- **[scripts] `tests/run.mjs` count 14 → 15 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

## Why this exists

P86 added 1347 hreflang annotations to `dist/sitemap-0.xml` (449 URLs × 3 langs). Without a guard, future refactors could silently regress this — e.g., someone removes the `links` field from `serialize()` callback and search engines lose i18n SEO benefit.

P87 catches such regressions in CI before they ship.

## TDD verification

1. **Baseline PASS**: Run against current state → 1 pass / 0 fail
2. **Simulate regression**: Remove one `<xhtml:link rel="alternate" hreflang="zh" href="...zh/about/">` from sitemap → run → 1 fail / 0 pass (caught the missing hreflang + reported the page URL)
3. **Restore**: `cp /tmp/sitemap-before.xml` → re-run → 1 pass / 0 fail ✓

Confirmed the test is not a silent-pass.

## Coverage matrix update

| Defense layer | Test file | Status |
|---|---|---|
| en cat page h1 + cross-link | `category-en-cjk-guard` | ✅ |
| zh cat page h1 + cross-link | `category-zh-cjk-preservation` | ✅ |
| en/zh tool page h1 | `tool-en/zh-cjk-*` | ✅ |
| en/zh blog page h1 | `blog-en/zh-cjk-*` | ✅ |
| en/zh tool/blog cross-link | `tool-cross-link-cjk-guard`, `blog-cross-link-cjk-guard` | ✅ |
| 11 known hardcoded EN | `zh-hardcoded-english-guard` | ✅ |
| **Sitemap hreflang (P87)** | **`sitemap-hreflang-guard` (NEW)** | ✅ |
| Structural i18n keys (every tool/blog/category has keys) | `translation-glossary-guard` test 1 | ✅ |
| No orphan translation keys | `translation-glossary-guard` test 2 | ✅ |

**Total: 15 tests** (14 build-dep + 2 in 1 source-only file)

## Engineering metrics

| Metric | Before P87 | After P87 |
|---|---|---|
| pnpm check | 1181 / 0 / 0 | **1182 / 0 / 0** |
| Build-dep suites | 14 | **15** |
| Sitemap regression detection | None | **Permanent CI guard** |
| Working tree | clean | **clean** |

## What was NOT done

- ❌ Did NOT add HTML head hreflang CI guard (BaseLayout.astro:137-139 already emits them; P86 verified manually)
- ❌ Did NOT add SEO meta tag guard (description/og:title/og:description all already i18n'd per P80/P81)
- ❌ Did NOT add sitemap URL coverage CI guard (would verify all 449 URLs have en sibling + vice versa)

## Related references

- **P86** — original hreflang emission (`astro.config.mjs` sitemap serialize)
- **P62-P83** — page-level i18n defense-in-depth era
- **CLAUDE.md** "Hard-breakpoint exemption" — similar pattern of audit-grade documentation for design choices
- **`@astrojs/sitemap` 3.2.1** — supports `links` field in serialize callback

## P88+ candidate

- **HTML head hreflang CI guard** — verify dist/zh pages still emit `<link rel="alternate" hreflang>` (no regression on BaseLayout.astro:137-139)
- **Sitemap URL coverage CI guard** — verify all 224 zh pages have en sibling + vice versa
- **SaaS calc output i18n** — similar to P85a for SaaS category
- **OG image localization** — image generation scope
- **Audit script migration** — extract parser logic to shared library

## Engineering pattern notes

P87 follows the same pattern as P74 (`zh-hardcoded-english-guard`), P82/P83 (`translation-glossary-guard`):
1. **Source-file scan** (no `pnpm build` required for parser logic, but `pnpm build` for sitemap output)
2. **State-machine or regex parser** of relevant file
3. **Structured assertions** with detailed violation lists
4. **TDD defense check** before ship (proven via temporary edit + restore)

Each guard adds ~50-200 lines of TypeScript + ~100 lines of run.mjs updates. Self-contained, no cross-dependencies.