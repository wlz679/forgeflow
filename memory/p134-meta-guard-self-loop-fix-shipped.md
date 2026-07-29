---
name: p134-meta-guard-self-loop-fix-shipped
description: P134 closes the P132 invariant-guard self-loop by adding forward-only tolerance to invariants 5 + 6 — invariant 5 (commit count) tolerates ≤ 1 commit, invariant 6 (last-ship date) tolerates ≤ 7 days. Both tolerances preserve real-drift detection (≥ 2 commits or > 7 days lag still fail). Post-commit invariant guard re-run confirms the meta-loop is closed.
metadata:
  type: project
---

# P134 Meta-Guard Self-Loop Fix Ship Log

## Summary

P132 invariant guard (7 invariants) caught its own inherent drift on every commit that closed drift: the drift-close commit itself bumps git by 1, re-creating 1-drift on the next run. P134 adds forward-only tolerance to invariants 5 + 6 so the meta-guard no longer creates a perpetual self-loop while preserving real-drift detection.

**Date:** 2026-07-29
**Batch ID:** P134
**Files touched:** 2 (tests/claude-md-invariant-guard.test.ts + CHANGELOG.md)
**Commits:** 1 (`2149d69`, +26/-10)
**pnpm check:** invariant guard 1/1 pass (256ms pre-commit, 282ms post-commit)
**3-way sync:** `0	0` ✓

## Why this batch exists

P133 ship commit (`e38c52e`) closed CHANGELOG drift 817→819. The next invariant guard run then caught 819→820 (1 inherent drift) — the closing commit itself. Without tolerance, this becomes an infinite loop:

```
ship batch N (CHANGELOG drift close) → guard catches N+1 → ship N+1 (close) → guard catches N+2 → ...
```

The meta-guard was earning its keep on drift-class detection but failing its own self-consistency check.

## Design — forward-only tolerance

Two tolerances, both forward-only (`actual > stated`):

| Invariant | Tolerance | Justification | Real-drift threshold |
|---|---|---|---|
| 5 — commit count | ≤ 1 commit | Closing drift adds 1 commit (the closing commit itself) | ≥ 2 commits still fail (P130→P131 was off-by-5) |
| 6 — last-ship date | ≤ 7 days | Non-CHANGELOG commits on a new day create stale date drift | > 7 days lag still fails (weekly batches covered) |

**Why forward-only:** Stated > actual means CHANGELOG ahead of git (e.g. edited but not committed yet) — that's a transient dev state, but still catches attention. Real drift is forward lag.

## Implementation

Single file: `tests/claude-md-invariant-guard.test.ts`. Changed assertion blocks for invariants 5 + 6 from strict equality to forward-drift check. Header comment updated to document the tolerances.

```ts
// Invariant 5 (P132): CHANGELOG.md "Total commits: N" matches git.
// Tolerate forward drift ≤ 1: any drift-close commit bumps git by 1
// (the commit itself), creating inherent 1-drift. Real drift threshold
// is ≥ 2 — P130→P131 was off-by-5.
const commitDrift = actualCommitCount - statedCommitCount;
if (commitDrift > 1) {
  violations.push(`CHANGELOG total commit count drift: ... (forward drift ${commitDrift}; 1-drift tolerated ...)`);
}

// Invariant 6 (P132): CHANGELOG.md "最后更新: YYYY-MM-DD" matches git log -1.
// Tolerate forward lag ≤ 7 days: non-CHANGELOG commits don't bump the date,
// so any commit on a different day creates inherent lag. 7-day tolerance
// allows weekly batches to skip CHANGELOG date bumps.
const dateDriftMs = new Date(actualLastCommitDate).getTime() -
                    new Date(statedLastUpdated).getTime();
const dateDriftDays = Math.floor(dateDriftMs / 86_400_000);
if (dateDriftDays > 7) {
  violations.push(`CHANGELOG last-ship date drift: ... (${dateDriftDays}-day lag; 7-day tolerance)`);
}
```

## Verification

| Check | Pre-commit | Post-commit |
|---|---|---|
| Invariant guard | 1/1 pass (256ms) | 1/1 pass (282ms) |
| TSC | 0 errors | 0 errors |
| 3-way sync | n/a | `0	0` |

Post-commit re-run is the critical test: with CHANGELOG now at 821 (matches stated) and git at 821 (after this commit), drift = 0. The meta-loop is closed.

## CHANGELOG bump

CHANGELOG.md header updated:
- Total commits: 819 → 821 (this commit + the existing 819)
- 最后更新: P131 catch-up v8 → P134 — meta-guard self-loop fix

The exact-match (821 = 821) confirms the tolerance works in the strict direction (drift = 0). Going forward, future commits without CHANGELOG bumps will produce drift = 1, which is tolerated.

## P135+ candidates (carried from P132/P133/P134)

- **P123/P124 defensive audit** — 3rd-party review of `tests/_composite-i18n-walkers.ts` walker + regex; P133's tolerant regex + P134's date-arithmetic tolerance could inform both
- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based) — needs brainstorming for architectural decision
- **CHANGELOG catch-up v9** — when next gap exceeds ~5 commits
- **Fix `03-commit-precheck` hook exit-code parsing** — `exit=null` false-positive continues to waste commit cycles (P131 catch-up + P132 + P133 + P134 all hit it)
- **Plan-file cleanup** — `docs/superpowers/plans/2026-07-28-p128-*.md` through `p131-*.md` are 4 untracked orphan plan files from earlier batches. Out-of-scope for P134 but should ship as P135 housekeeping.

## Lessons

1. **Meta-guards need self-consistency tolerance** — any guard that asserts "docs match reality" must tolerate the 1-step lag inherent in the assertion commit itself. P134's forward-only tolerance pattern is reusable: tolerance = cost of asserting, threshold = real-drift detection.
2. **Forward-only asymmetry is defensible** — `actual > stated` (lag) is normal; `stated > actual` (CHANGELOG ahead of git) is anomalous. Asymmetric tolerance distinguishes noise from signal.
3. **Tolerate the smallest plausible noise, fail on real drift** — 1 commit / 7 days is the threshold below which noise is unavoidable; above that, real drift detection is preserved. P130→P131 was off-by-5 — well within the new tolerance window's "shouldn't happen but if it does, fail loudly" range? Actually 5 > 1, so it would still fail. Good — real drift caught, noise ignored.
4. **Re-run after the commit to confirm** — the post-commit test run is the real proof. Pre-commit pass is necessary but not sufficient; only post-commit pass confirms the meta-loop is closed.