# P125 CLAUDE.md Invariant Matrix Guard Ship Log

## Summary

P125 adds the **meta-guard** — a CI test that asserts CLAUDE.md's numeric
invariants match reality. Catches the documentation-drift class that
occurred 4 times this thread (P121/P122/P123/P124 added 4 build-dep suites
without CLAUDE.md updates). Single test, 4 invariants.

**Date:** 2026-07-28
**Batch ID:** P125
**Files touched:** 5 (test + run.mjs + CLAUDE.md + memory + MEMORY.md)
**Test delta:** 33 → 34 build-dep suites; new 1 test (4 invariants)
**3-way sync:** `0\t0` at HEAD `eeb81de`

## What shipped

### `tests/claude-md-invariant-guard.test.ts` (new, 34th build-dep suite)

Single test, 4 invariants:

| # | Invariant | Source of truth | Why it matters |
|---|---|---|---|
| 1 | Build-dep suite count | `tests/run.mjs` skip-mode listing length | Drifted 29→33 this thread |
| 2 | Defense-in-Depth arithmetic | "N build-dep + N source-only = total" self-check | Catches typos in the totals line |
| 3 | Engine count | `tests/engine-count.ts:EXPECTED_ENGINE_COUNT` | Ground truth for 100-engine lock |
| 4 | Category count | `src/data/categories.ts` letter ID count | Ground truth for 15-category lock |

### `CLAUDE.md` (updated)

Closed the drift that accumulated over P121/P122/P123/P124:

- Line 77: "All 29 build-dep CI guards" → "All **34** build-dep CI guards"
- Line 90: "29 build-dep suites + 8 source-only = **37**" → "**34** build-dep suites + 8 source-only = **42**"

### `tests/run.mjs` (updated)

- Build-dep suite count: 33 → **34**
- skip-mode summary: added `claude-md-invariant-guard`
- Concurrent test count comment: 29 → 30 files

## Ship drama

### Drama 1 — Path typo: `tests/lib/engine-count.ts` doesn't exist

First attempt read `tests/lib/engine-count.ts` (wrong path). Actual file is
`tests/engine-count.ts` at the project root (per P22b). Fixed in single Edit.

### Drama 2 — Type annotation regex miss

The regex `/EXPECTED_ENGINE_COUNT\s*=\s*(\d+)/` failed because the source
file has `: number` type annotation between name and `=`:
```ts
export const EXPECTED_ENGINE_COUNT: number = 100;
```

Fixed regex: `/EXPECTED_ENGINE_COUNT\s*(?::\s*\w+\s*)?=\s*(\d+)/` to allow
optional `: <type>` between identifier and `=`.

### Drama 3 — First-run FAIL (intended, surfaced drift)

The first successful run produced the expected failure message:
```
Build-dep suite count drift: CLAUDE.md says 29, reality says 33
```

This is the intended first-run behavior — the test caught the 4-batch drift
that had accumulated silently since P121. Fixed CLAUDE.md in same batch;
second run passed.

### Drama 4 — Suite-count double-jump

After updating `tests/run.mjs` to add `claude-md-invariant-guard`, the real
count became 34 (not 33). CLAUDE.md was updated to 33 first, then to 34
after the second failure. Two-step fix was straightforward but worth
noting: **the meta-guard catches its own addition** — adding the suite
itself changes the count it asserts.

### Drama 5 — Multi-suite-per-line skip-mode regex

The skip-mode block in `tests/run.mjs` uses comma-separated suites on
single lines (e.g., `console.log('[skip-mode]   baselayout-clerk-script, baselayout-sync-script,');`).
First regex `console\.log\('\[skip-mode\]\s+([a-z0-9-]+)'\);` only matched
single-name lines and returned count = 1. Fixed by extracting all log
content, splitting by comma, and filtering to lowercase-hyphen identifiers
(suite-name pattern). Handles both single- and multi-name lines correctly.

## P125 invariant matrix

| Pattern | Drift this thread | Caught by P125? |
|---|---|---|
| Build-dep suite count | 29 → 30 → 31 → 32 → 33 → 34 (5 drifts) | ✓ |
| Source-only count | 8 (stable) | ✓ (cross-check via arithmetic) |
| Engine count | 100 (P22b lock) | ✓ |
| Category count | 15 (P46 lock) | ✓ |

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `RUN_BUILD_TESTS=1 ... --test claude-md-invariant-guard` | **1/1 pass, 4 invariants** ✓ |
| skip-mode summary shows P125 in build-dep suite list | ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P22b** — `EXPECTED_ENGINE_COUNT = 100` lock (P125 asserts this)
- **P23b** — RUN_BUILD_TESTS skip-guard pattern (P125 follows)
- **P46** — 15-category lock (P125 asserts this)
- **P110** — CLAUDE.md defense-in-depth matrix (P125 is the meta-guard for it)
- **P121/P122/P123/P124** — the 4 sibling batches whose drift P125 catches
- `tests/claude-md-invariant-guard.test.ts` — new 34th build-dep suite
- `tests/run.mjs:60-71` — updated skip-mode listing

## P126+ candidates

- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level
  translation or customFn-based) — 50-100 candidates
- **FAQ answers + how_to_use[1+] coverage** — extend P123/P124 to second-half
  of these arrays
- **P123 fix** — apply `buildSlugToFirstInput()` walker to P123 (close latent
  bug)
- **Single-test split** — extract P123 into 4 narrower tests for better
  failure isolation
- **CHANGELOG catch-up v6** — P125 (gap now 16 commits since P120)
- **CLAUDE.md additional invariants** — extend P125 to assert more facts
  (e.g., total commit count, last-ship date, category names A/B/C/...)