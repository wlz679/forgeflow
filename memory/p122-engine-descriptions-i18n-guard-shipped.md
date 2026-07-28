# P122 Engine Descriptions i18n Guard Ship Log

## Summary

P122 audits 100/100 engine descriptions i18n completeness and adds a build-dep CI guard
preventing regression. **Audit result: 100/100 engines already have `tools.${slug}.description`
in `src/i18n/translations.ts` — 0 missing, 0 extra, 0 empty en/zh.** The new guard is
therefore a **verify-only / regression-proof** test, like P121. P122 is the direct
sibling of P121 (titles) — same invariant structure, longer string scope.

**Date:** 2026-07-28
**Batch ID:** P122
**Files touched:** 3 (test + run.mjs + memory)
**Test delta:** 0 → 31 build-dep suites; new 2 test cases (en + zh, 200 page checks)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## Audit finding (P122-1)

| Metric | Count |
|---|---|
| Engine files (src/engines/**/*.ts) | 100 (P22b lock honored) |
| `tools.${slug}.description` keys in translations.ts | 100 |
| Engine slugs missing description | **0** |
| Translation descriptions without matching engine | **0** |
| Empty en descriptions | **0** |
| Empty zh descriptions | **0** |

**All 100 engines have en + zh description translations.** No backfill needed.

## What shipped

### `tests/engine-descriptions-i18n-guard.test.ts` (new, 31st build-dep suite)

Two test cases:

1. **`every engine slug has tools.${slug}.description in translations.ts (en + zh)`**
   - Walks `src/engines/**` via readdirSync, regex-extracts all `slug:` fields
   - Regex-extracts all `tools.<slug>.description` keys (with balanced-brace matcher
     for values that may contain apostrophes — unlike P121 title matcher)
   - Asserts count = 100, asserts every slug has a description key with both en + zh
     non-empty
   - Catches: new engine added without description key, description key removed,
     en or zh empty

2. **`every engine description appears in corresponding dist page (en + zh, 200 page checks)`**
   - For each of 100 slugs × 2 langs, reads `dist/${lang}/${slug}/index.html`
   - Asserts en page contains en description (HTML-escaped for `&`/`</`/`>`)
   - Asserts zh page contains zh description
   - Catches: page template (src/pages/[lang]/[slug].astro) stops wiring
     `t(\`tools.\${slug}.description\`, lang)` into `<meta name="description">`

### `tests/run.mjs` (updated)

- Build-dep suite count: 30 → **31**
- skip-mode summary: added `engine-descriptions-i18n-guard` to listing
- Comment about concurrent test count: 26 → 27 files

## P121 ↔ P122 invariant parallelism

| Aspect | P121 (titles) | P122 (descriptions) |
|---|---|---|
| Namespace | `tools.${slug}.title` | `tools.${slug}.description` |
| Page call site | [slug].astro:43 `toolTitle` | [slug].astro:44 `toolDescription` |
| HTML usage | `<title>`, og:title, twitter:title, h1 | `<meta name="description">`, og:description, twitter:description, visible <p> |
| Audit result | 100/100 | 100/100 |
| Build-dep suite | 30th | **31st** |
| String escape | `&` → `&amp;` only | `&` → `&amp;`, `<` → `&lt;`, `>` → `&gt;` |
| Value matcher | single-quote terminator (titles short, no apostrophes) | balanced-brace regex `[^'\\]|\\.` (descriptions can contain apostrophes) |

## P103 WORKING_KEY_REQUIRED unaffected

Like P121, the new test is **orthogonal** to P103 (which asserts `mustContain`
substrings on specific pages). P122 asserts **whole descriptions on all 200 pages**.
P103 cumulative: **150 entries** — unchanged.

## Ship drama

None — P122 ran cleanly on first try. P121's `&` HTML-escape trap was anticipated
and `escapeForHtml()` was extended to handle `<` and `>` in the same call. No
TypeScript stale-IDE warnings. No cron race during push window.

## Why this batch exists

The P121 ↔ P122 pair closes the **most user-visible strings** of each engine:
- P121 — `<title>` (browser tab, search results, og:title for social)
- P122 — `<meta name="description">` (search snippets, og:description, page intro <p>)

Before these guards, both invariants were implicit. Now they are explicit and
tested: any new engine missing translation fails the build; any key removed
fails; any page template regression fails.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` | 1197/0/0 ✓ |
| `RUN_BUILD_TESTS=1 ... --test engine-descriptions-i18n-guard` | **2/2 pass, 200 page checks** ✓ |
| skip-mode summary shows P122 in build-dep suite list | ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P22b** — `EXPECTED_ENGINE_COUNT = 100` lock (P122-1 uses 100 as ground truth)
- **P23b** — RUN_BUILD_TESTS skip-guard pattern (P122 follows)
- **P103** — dead-i18n-keys-guard (P122 is parallel/orthogonal)
- **P121** — engine titles i18n guard (P122's direct sibling — same structure)
- `tests/engine-descriptions-i18n-guard.test.ts` — new 31st build-dep suite
- `tests/run.mjs:60-71` — updated skip-mode listing

## P123+ candidates

- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based) — 50-100 candidates across AI cost + business engines
- **Codegen-enforce defense-in-depth matrix** — automate CLAUDE.md snapshot (30→31 build-dep suites after P122)
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **CHANGELOG catch-up v6** — P122 (next time the gap exceeds ~10 commits)
- **FAQ / how_to_use / input labels i18n audit** — next P121/P122-sibling invariants
  (similar structure, 3 more audit pairs × 200 page checks each = ~600 more checks)
- **Engine-related i18n composite audit** — single test walking 100 pages asserting
  title + description + at least one input label + at least one FAQ each present
