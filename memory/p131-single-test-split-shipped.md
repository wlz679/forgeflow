---
name: p131-single-test-split-shipped
description: P131 split P123 (zh) and P124 (en) composite i18n guards from 2 monolithic files (329 + 328 lines) into 6 single-dimension tests (input/faq/howto × zh/en). 3 walker functions extracted to tests/_composite-i18n-walkers.ts. Failure isolation improved dramatically. Title + description coverage already provided by P121/P122.
metadata:
  type: project
---

# P131 Single-Test Split Ship Log

## Summary

P131 replaces P123/P124 (composite 5-dimension i18n guards, 329 + 328 lines) with 6 single-dimension tests (~70-100 lines each) plus 1 shared walker helper (~120 lines). After P131, an input-label regression fails only `engine-zh-input-i18n-guard.test.ts` / `engine-en-input-i18n-guard.test.ts` instead of failing P123/P124 with a confusing "composite i18n violation" message. Walker patterns (firstInput / faqCount / howToCount) extracted to `tests/_composite-i18n-walkers.ts` for reuse + future audits.

**Date:** 2026-07-29
**Batch ID:** P131
**Files touched:** 11 (1 helper + 6 tests + 2 deletes + 1 run.mjs + memory + MEMORY.md)
**Test delta:** +6 build-dep suites (-2 P123/P124 + 6 new) → 34 → 38 build-dep suites (delta +4 files, +4 subtests)
**Commits:** 5 (feat-helper + feat-3-zh + feat-3-en + feat-cleanup + docs-memory)
**3-way sync:** `0	0` at HEAD

## What shipped

### Walker extraction

`tests/_composite-i18n-walkers.ts` (NEW, ~120 lines):
- `buildSlugToFirstInput()` (P127 lineage) — slug → first input name
- `buildSlugToFaqCount()` (P128 lineage) — slug → FAQ entry count
- `buildSlugToHowToCount()` (P128 lineage) — slug → howToUse entry count
- `escapeForHtml(s)` — HTML-escape for probe comparison
- `buildTranslationKeyRegex(key)` — returns regex with 4 capture groups (P129 alternation pattern)
- `extractAllEngineSlugs(text)` — sorted slug list from translations.ts

### 3 zh single-dimension tests (NEW)

- `tests/engine-zh-input-i18n-guard.test.ts` — zh input label rendered
- `tests/engine-zh-faq-i18n-guard.test.ts` — zh FAQ q + a rendered (all entries, P128+P129 pattern)
- `tests/engine-zh-howto-i18n-guard.test.ts` — zh how_to_use steps rendered (all entries, P128+P129 pattern)

### 3 en single-dimension tests (NEW)

- `tests/engine-en-input-i18n-guard.test.ts` — en input label rendered (with escape-strip)
- `tests/engine-en-faq-i18n-guard.test.ts` — en FAQ q + a rendered (with escape-strip)
- `tests/engine-en-howto-i18n-guard.test.ts` — en how_to_use steps rendered (with escape-strip)

### Files deleted

- `tests/engine-composite-i18n-guard.test.ts` (P123, 329 lines) — replaced by 3 zh tests
- `tests/engine-en-composite-i18n-guard.test.ts` (P124, 328 lines) — replaced by 3 en tests

### run.mjs skip-mode summary updated

- Count: 34 → 38 build-dep suites
- Removed: `engine-composite-i18n-guard`, `engine-en-composite-i18n-guard`
- Added: 6 new dimension names (alphabetically ordered within language-specific block)

## Why this batch exists

After P127/P128/P129, P123/P124 had grown to 657 lines across 2 files with 3 walkers × 2 files + 6 regex alternation sites × 2 files + 3 assert sites × 2 files. A failure in any of 5 dimensions (title/desc/input/faq/how_to_use) surfaced as "composite i18n violation (N)" with up to 20 sample violations but no dimension grouping. After P131, the test name itself identifies the dimension: `engine-zh-faq-i18n-guard.test.ts` failing tells you "FAQ probe broke for zh pages" without reading any violation text.

Title and description coverage were already provided by P121/P122 (which cover both en + zh in single files). P131 focuses on the 3 dimensions NOT yet independently covered (input/FAQ/how_to_use) — total 6 new files instead of 10.

## P131 lessons

1. **Test files can grow unwieldy even when each test is small.** P123/P124 each had 1 test but 329/328 lines of setup + walkers + probe loops. Splitting by dimension reduces per-file complexity more than per-test complexity.
2. **Pre-existing single-dimension guards (P121/P122) reduce P131's scope.** Original P128 memory listed 5 dimensions × 2 langs = 10 new files. After checking P121/P122 cover title/description for both langs, P131 dropped to 3 dimensions × 2 langs = 6 new files. **Always grep before splitting** to avoid duplicating existing coverage.
3. **Walker extraction pays off at 3+ users.** P131's 3 walkers (`buildSlugToFirstInput`, `buildSlugToFaqCount`, `buildSlugToHowToCount`) now have 2 users each (zh + en side of each dimension test). Extracting to `tests/_composite-i18n-walkers.ts` removes ~240 lines of duplication across the 6 new test files.
4. **Naming "composite" should reflect actual composition.** P123/P124 were called "composite" because they covered 5 dimensions. The 6 new tests each cover 1 dimension, so they drop "composite" from the name (matches P121/P122 convention).

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| 6 new build-dep tests | 6/6 pass ✓ |
| Walker counts vs P128 baseline | 541 FAQ + 638 howTo (unchanged) ✓ |
| P129's 16 silently-skipped keys | all probed correctly ✓ |
| Skip-mode suite count | 34 → 38 (delta +4 files, +4 subtests) ✓ |
| `pnpm test:unit` baseline | 1200 (unchanged — new tests are build-dep) ✓ |
| Working tree | clean (excluding plan file) ✓ |

## Related references

- **P121** — engine titles i18n guard (zh+en combined)
- **P122** — engine descriptions i18n guard (zh+en combined)
- **P123** — zh composite i18n guard (P131 deletes; replaced by 3 zh tests)
- **P124** — en composite i18n guard (P131 deletes; replaced by 3 en tests)
- **P127** — firstInput walker pattern (P131 extracts)
- **P128** — faqCount + howToCount walker patterns (P131 extracts)
- **P129** — regex alternation + missing-key assert promotion (P131's helper preserves)
- **P130** — CHANGELOG catch-up v7 (P131's predecessor; covers P126-P129)

## P132+ candidates

- **CLAUDE.md additional invariants** — extend P125 to assert commit count, last-ship date, category names
- **Tier-2 round 7** — composite data-driven lines (NEW approach)
- **P123/P124 defensive audit** — 3rd-party review for latent silent-skip paths now that walker + regex are extracted (easier to audit single function)
- **Input labels i18n backfill** — backfill 29 engines × 3-6 inputs = ~100-150 `tools.${slug}.input.${name}.label` keys (P131's walker enables)
- **CHANGELOG catch-up v8** — covers P131 (1 batch)