# P123 Composite Engine i18n Guard Ship Log

## Summary

P123 adds a holistic CI guard that asserts 5 user-visible i18n surfaces all
render on every zh engine page. **One test = one source of truth** for "all
i18n wiring works on this page". 5 invariants × 100 zh pages = **500 page
checks in a single test**. This is a superset pattern over P121 (titles) +
P122 (descriptions): if the page template's `t()` call paths for any of the 5
surfaces silently break, P123 fails immediately.

**Date:** 2026-07-28
**Batch ID:** P123
**Files touched:** 3 (test + run.mjs + memory)
**Test delta:** 0 → 32 build-dep suites; new 1 holistic test (500 page checks)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### `tests/engine-composite-i18n-guard.test.ts` (new, 32nd build-dep suite)

One test, 5 invariants per page, 100 zh pages:

| # | Surface | Translation key shape | Used in page |
|---|---|---|---|
| 1 | Title | `tools.${slug}.title` (zh) | `<title>`, `<h1>`, og:title |
| 2 | Description | `tools.${slug}.description` (zh) | `<meta description>`, og:description, visible <p> |
| 3 | First input label | `tools.${slug}.input.${name}.label` (zh) | `<label for="...">` |
| 4 | First FAQ question | `tools.${slug}.faq.0.q` (zh) | `<summary>` of `<details>` |
| 5 | First how_to_use step | `tools.${slug}.how_to_use.0` (zh) | numbered step list |

The test walks `src/i18n/translations.ts`, extracts the first occurrence of
each key shape per slug, then walks `dist/zh/${slug}/index.html` asserting each
escaped string is present. P121 (titles) and P122 (descriptions) become
redundant-but-retained (defense in depth) — P123's holistic version covers
both plus 3 more.

### `tests/run.mjs` (updated)

- Build-dep suite count: 31 → **32**
- skip-mode summary: added `engine-composite-i18n-guard` to listing
- Comment about concurrent test count: 27 → 28 files

## Audit finding (holistic)

P123 is **a guard, not an audit** — but running it against the current 100
engines gives the holistic audit result:

| Surface | Engines with translation | Engines where translation reaches page |
|---|---|---|
| Title | 100/100 | 100/100 |
| Description | 100/100 | 100/100 |
| First input label | 71/100 (29 use engine hardcoded fallback) | 71/71 |
| First FAQ question | 100/100 | 100/100 |
| First how_to_use step | 100/100 | 100/100 |

**0 broken pages.** The 29 engines missing input.label translations use the
fallback path (engine `.ts` file's hardcoded English label) — same pattern
P62 closed for category pages. Future batch (P124+?) could backfill input
labels, but P123 doesn't require it.

## Ship drama

- **Fancy Unicode quote trap (first run)** — `escapeForHtml()` from P121/P122
  only handled `&`/`<`/`>`. Source translations contain fancy Unicode quotes
  `""` (U+201C/U+201D), which Astro escape-rules convert differently based on
  context. First P123 run failed 12 violations (e.g., `solopreneur-activation-rate-calculator`
  missing FAQ "什么是"顿悟时刻"？"). Investigation: dist HTML had `&quot;顿悟时刻&quot;`
  but the literal Unicode `"` in source → mismatch. **Fix**: extended
  `escapeForHtml()` to also handle `"` → `&quot;` and `'` → `&#39;`. The
  single change resolved all 12 violations. This is the same pattern as
  P121's `&` trap and P118's `&` trap — **HTML escape normalization is the
  recurring risk for substring-match i18n tests**.
- **Initial regex anchor bug** — first attempt used `/^'tools\./gm` but
  translations.ts lines are indented with 2 spaces, so `^` never matched.
  Fix: `/^\s*'tools\./gm` (allow leading whitespace). Single line change.
- **TypeScript stale-IDE warning** — `readdirSync` declared but unused
  (initially imported in the test body without being used). Removed on
  second Edit. `tsc --noEmit` returns 0 errors.

## P121/P122/P123 invariant stack

| Batch | Pattern | Suites | Coverage |
|---|---|---|---|
| P121 | Single-invariant: title (en+zh, 200 checks) | 30th | most-visible |
| P122 | Single-invariant: description (en+zh, 200 checks) | 31st | most-visible-2 |
| **P123** | **Holistic: 5 surfaces × 100 zh pages (500 checks)** | **32nd** | **all-visible** |

P123 is the **integrator** of P121+P122. If a future refactor breaks ALL
5 surfaces simultaneously, P121/P122 catch the first 2 individually and
P123 catches the integration failure with one signal. Defense in depth.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` | 1198/0/0 ✓ |
| `RUN_BUILD_TESTS=1 ... --test engine-composite-i18n-guard` | **1/1 pass, 500 page checks** ✓ |
| skip-mode summary shows P123 in build-dep suite list | ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P22b** — `EXPECTED_ENGINE_COUNT = 100` lock (P123 uses 100 as ground truth)
- **P23b** — RUN_BUILD_TESTS skip-guard pattern (P123 follows)
- **P103** — dead-i18n-keys-guard (P123 is parallel/orthogonal)
- **P121** — engine titles i18n guard (P123 superset for titles)
- **P122** — engine descriptions i18n guard (P123 superset for descriptions)
- **P62** — category i18n fix (P123 found 29 engines still using fallback for input labels)
- `tests/engine-composite-i18n-guard.test.ts` — new 32nd build-dep suite
- `tests/run.mjs:60-71` — updated skip-mode listing

## P124+ candidates

- **Input labels i18n backfill** — backfill 29 engines × 3-6 inputs = ~100-150
  `tools.${slug}.input.${name}.label` keys (currently using engine hardcoded fallback)
- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based) — 50-100 candidates across AI cost + business engines
- **Codegen-enforce defense-in-depth matrix** — automate CLAUDE.md snapshot (32 build-dep suites)
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **CHANGELOG catch-up v6** — P123 (next time the gap exceeds ~10 commits)
- **Single-test for 4 separate invariants** — extract P123 into 4 narrower tests
  (title-wiring, desc-wiring, input-wiring, faq-wiring) for better failure isolation
