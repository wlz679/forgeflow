# P121 Engine Titles i18n Guard Ship Log

## Summary

P121 audits 100/100 engine titles i18n completeness and adds a build-dep CI guard
preventing regression. **Audit result: 100/100 engines already have `tools.${slug}.title`
in `src/i18n/translations.ts` — 0 missing, 0 extra.** The new guard is therefore a
**verify-only / regression-proof** test, not a content batch. P122+ can focus on the
remaining i18n gap (composite data-driven lines — needs new approach per P119 closing
notes).

**Date:** 2026-07-27
**Batch ID:** P121
**Files touched:** 3 (test + run.mjs + memory)
**Test delta:** 0 → 30 build-dep suites; 0 → 2 new test cases (en + zh, 200 page checks)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## Audit finding (P121-1)

| Metric | Count |
|---|---|
| Engine files (src/engines/**/*.ts) | 100 (P22b lock honored) |
| `tools.${slug}.title` keys in translations.ts | 100 |
| Engine slugs missing title | **0** |
| Translation titles without matching engine | **0** |

**All 100 engines have en + zh title translations.** No backfill needed.

## What shipped

### `tests/engine-titles-i18n-guard.test.ts` (new, 30th build-dep suite)

Two test cases:

1. **`every engine slug has tools.${slug}.title in translations.ts (en + zh)`**
   - Walks `src/engines/**` via readdirSync, regex-extracts all `slug:` fields
   - Regex-extracts all `tools.<slug>.title` keys from translations.ts
   - Asserts count = 100, asserts every slug has a title key with both en + zh
   - Catches: new engine added without title key, title key removed, zh empty

2. **`every engine title appears in corresponding dist page (en + zh, 200 page checks)`**
   - For each of 100 slugs × 2 langs, reads `dist/${lang}/${slug}/index.html`
   - Asserts en page contains en title (HTML-escaped for `&` → `&amp;`)
   - Asserts zh page contains zh title
   - Catches: page template (src/pages/[lang]/[slug].astro) stops wiring
     `t(\`tools.\${slug}.title\`, lang)` into `<title>`

### `tests/run.mjs` (updated)

- Build-dep suite count: 29 → **30**
- skip-mode summary: added `engine-titles-i18n-guard` to listing
- Comment about concurrent test count: 25 → 26 files

### P121 ship drama

- **HTML escape trap** — initial test passed for 199/200 pages but failed on
  `solopreneur-burn-multiple-rule-of-40-calculator` (en title "Burn Multiple & Rule of
  40 Calculator"). The `&` is HTML-escaped to `&amp;` by Astro on render. Fix:
  added `escapeForHtml(s) → s.replace(/&/g, '&amp;')` helper before substring
  match. (Same trap as P118 ship drama "Your Traffic & Conversions:" — P103 didn't
  hit it because that test asserts on zh text only.)
- **TypeScript stale-IDE warning** — `escapeForHtml` initially declared-but-unused
  before the second Edit. After using it in both en + zh assertions, `tsc --noEmit`
  returns 0 errors. The warning was a TS server cache lag (P52 / P53a-known issue).

## P103 WORKING_KEY_REQUIRED unaffected

P121's new test is **orthogonal** to P103 (which asserts `mustContain` substrings
on specific pages). P121 asserts **whole titles on all 200 pages**. Different
assertion surface, different invariant: P103 = "post-processor replaced these
emojis on these pages" vs P121 = "every engine's title translation reaches its
page intact".

P103 cumulative table from P120 memory: **150 entries** — unchanged by P121.

## Why this batch exists (the new P121 invariant)

Before P121, the `tools.${slug}.title` translation coverage was implicit — assumed
100/100 by the engine count constant + the existing P103 test. P121 makes it
**explicit and tested**: if a new engine is added without its title key, P121
fails the build. If a title key is removed, P121 fails. If the page template
breaks `<title>` wiring, P121 fails.

This is the 5th source-guard category (after codegen/i18n-structural/a11y/perf/SEO),
closing the "engine title is the most user-visible string" gap.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` (1196 unit tests) | 1196/0/0 ✓ |
| `RUN_BUILD_TESTS=1 ... --test engine-titles-i18n-guard` | **2/2 pass, 200 page checks** ✓ |
| skip-mode summary shows P121 in build-dep suite list | ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P22b** — `EXPECTED_ENGINE_COUNT = 100` lock (P121-1 uses 100 as ground truth)
- **P23b** — RUN_BUILD_TESTS skip-guard pattern (P121 follows)
- **P103** — dead-i18n-keys-guard (P121 is parallel/orthogonal; not a replacement)
- **P118** — ship drama "Your Traffic & Conversions:" (P121 hit the same `&` trap)
- **P120** — P121 picked from P120's "Engine titles i18n audit" candidate
- `tests/engine-titles-i18n-guard.test.ts` — new 30th build-dep suite
- `tests/run.mjs:60-71` — updated skip-mode listing

## P122+ candidates

- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based) — 50-100 candidates across AI cost + business engines
- **Codegen-enforce defense-in-depth matrix** — automate CLAUDE.md snapshot (29 build-dep suites → 30 after P121)
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **CHANGELOG catch-up v6** — P121 (next time the gap exceeds ~10 commits)
- **Engine titles i18n extension** — `tools.${slug}.description` audit (parallel invariant; likely 100/100 like titles)
- **Engine FAQ / how_to_use / input labels i18n audit** — sibling invariants
