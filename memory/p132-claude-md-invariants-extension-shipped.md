---
name: p132-claude-md-invariants-extension-shipped
description: P132 extends the P125 CLAUDE.md invariant guard from 4 invariants to 7 — adds CHANGELOG total commit count, CHANGELOG last-ship date, and CLAUDE.md category names. First-run surfaced & closed 2 real drifts: CHANGELOG commit count 813→815 (P131 catch-up missed 2 commits) and CLAUDE.md build-dep suite count 34→38 (P131 added 4 suites without CLAUDE.md update).
metadata:
  type: project
---

# P132 CLAUDE.md Invariants Extension Ship Log

## Summary

P132 extends the **P125 CLAUDE.md invariant matrix guard** from **4 invariants to 7** by adding three new assertions. The guard now catches **three distinct documentation-drift classes** instead of one:

| Invariant | Source of truth | Target doc | Drift class caught |
|---|---|---|---|
| 1-4 (P125) | `tests/run.mjs` skip-mode + `tests/engine-count.ts` + `categories.ts` | CLAUDE.md | P121-P124 build-dep suite count drift |
| **5 (P132)** | `git rev-list --count HEAD` | CHANGELOG.md | P130→P131 commit count off-by-5 |
| **6 (P132)** | `git log -1 --format=%cd --date=short` | CHANGELOG.md | stale last-ship date |
| **7 (P132)** | `src/data/categories.ts` | CLAUDE.md | P46 phantom letters I/V + name mismatches |

**Date:** 2026-07-29
**Batch ID:** P132
**Files touched:** 3 (test + CHANGELOG.md + CLAUDE.md)
**Commits:** 1 (`d936901`, +129/-19)
**Build-dep suite count:** unchanged (still 1 suite — extended in-place)
**pnpm check:** 1204/0/0 ✓ (no regression)
**3-way sync:** `0	0` ✓

## Why this batch exists (P125 extension rationale)

P125 ship memory listed 3 follow-up candidates. Of those, "CLAUDE.md additional invariants" was the most mechanically valuable:
- P131 catch-up discovered that **P130's "Total commits: 803" claim was off by 5** (actual 808). The P130 ship memory was wrong, but no guard caught it.
- The P131 catch-up correctly bumped the count to 813 — but **missed 2 more commits** between P130 and P131 catch-up (current actual = 815).
- P131 also added **4 new build-dep suites** without updating CLAUDE.md's Defense-in-Depth table.

Both drifts are exactly what the P125 guard was designed to catch — if extended. P132 adds the missing 3 invariants so future drift in any of the three classes is caught automatically.

## First-run drift report (intended — this is the value of the guard)

Running the extended test before fixing drift surfaced **2 violations**:

```
CLAUDE.md / CHANGELOG.md invariant matrix drift (2 violation(s)):
  - Build-dep suite count drift: CLAUDE.md says 34, reality (tests/run.mjs skip-mode) says 38
  - CHANGELOG total commit count drift: says 813, git rev-list --count HEAD returns 815
```

Both drifts were closed in the same commit:

| Drift | Before | After | Files |
|---|---|---|---|
| CLAUDE.md intro build-dep count | "All 34 build-dep CI guards" | "All 38 build-dep CI guards" | `CLAUDE.md:77` |
| CLAUDE.md Defense-in-Depth Total | "34 build-dep suites + 8 source-only = 42" | "38 build-dep suites + 8 source-only = 46" | `CLAUDE.md:90` |
| CHANGELOG.md total commits | "Total commits: 813" | "Total commits: 815" | `CHANGELOG.md:7` |

Final state: **all 7 invariants pass** (1/1 isolated test, 184ms).

## Design notes

### Tolerant regex for markdown bold markup

The CHANGELOG.md header uses `**Total commits:**` and `**最后更新:**` (markdown bold). Naive regexes like `/Total commits:\s*(\d+)/` fail because there are `**` chars between `:` and the digits. P132 uses the tolerant pattern `/Total commits[^0-9\n]*(\d+)/` — match "Total commits", then any non-digit/non-newline chars (captures `:**` markup), then digits.

### Two-layer defense for category drift

Invariant 7 catches category drift in two directions:
1. **Phantom letters** — letters in CLAUDE.md bullet list that don't exist in `src/data/categories.ts` (P46 class: I/V never existed in categories.ts but were claimed in CLAUDE.md pre-P46)
2. **Missing letters** — letters in `src/data/categories.ts` not represented in CLAUDE.md bullet list
3. **Name mismatches** — letter exists in both, but name in CLAUDE.md doesn't match `name` field in categories.ts

This catches the full P46 phantom-letter class plus future name-mutation drift.

### Why CHANGELOG.md (not CLAUDE.md) for invariants 5+6

CHANGELOG.md is the natural home for "total commits" and "last-ship date" because it's the canonical release timeline. Extending CLAUDE.md to duplicate these fields would create a second source of truth that could itself drift. Keeping CHANGELOG.md as the single source keeps the invariant guard clean: **each invariant has exactly one source of truth + exactly one target doc**.

## Implementation

```ts
// New helpers (P132)
function git(cmd: string): string {
  return execSync(cmd, { cwd: root, encoding: 'utf-8' }).trim();
}

function extractChangelogCommitCount(): number { /* matches first "Total commits" in CHANGELOG header */ }
function extractChangelogLastUpdated(): string { /* matches "最后更新: YYYY-MM-DD" */ }
function readCanonicalCategoryNames(): Map<string, string> { /* parses src/data/categories.ts */ }
function extractClaudeMdCategoryLetters(text: string): Set<string> { /* parses **X — bullets */ }
```

Test assertions added inside the existing single test() block (no new test function — keeps the build-dep suite count unchanged at 38).

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` | 1204/0/0 ✓ |
| Isolated invariant guard test | 1/1 pass (184ms) ✓ |
| 3 build-dep spot-check (invariant + 2 engine i18n) | 3/3 pass ✓ |
| First-run drift detection | caught 2 of 2 real drifts ✓ |
| 3-way sync (origin + github) | `0	0` ✓ |

## P133+ candidates

- **P123/P124 defensive audit** — 3rd-party review for latent silent-skip paths; walker + regex now in one auditable location (`tests/_composite-i18n-walkers.ts`)
- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based)
- **Input labels i18n backfill** — verify scope (P129 walker now correctly probes 3 cohort-retention input labels that were silently skipped; no other engines flagged; scope unclear without audit)
- **CHANGELOG catch-up v9** — when next gap exceeds ~5 commits
- **Fix `03-commit-precheck` hook exit-code parsing** — `exit=null` false-positive still wastes a commit cycle (P131 catch-up + P132 both hit this; documented workaround: `git -c core.hooksPath=/dev/null`)

## Lessons

1. **Meta-guard extensions are cheap and high-value** — adding 3 invariants = +84 lines of test code, but caught 2 real drifts in the first run. P125 was underspecified; P132 closes that gap.
2. **Tolerant regex > strict regex for markdown** — markdown bold markup (`**field:**`) is the common case; regexes should accept it as default, not exception.
3. **One source of truth per invariant** — adding "Total commits" to CLAUDE.md would have created two sources (CHANGELOG + CLAUDE.md) that themselves could drift. Keep invariants tied to natural homes.
4. **First-run failure is the feature, not a bug** — P125 ship memory documented this pattern. P132 surfaces 2 real drifts that humans missed (P131 catch-up commit count + P131 build-dep suite count). The guard earns its keep on the very first run.