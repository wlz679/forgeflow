---
name: p135-plan-file-cleanup-shipped
description: P135 ships 4 untracked P128-P131 plan files as historical record + deletes dead scratch audit script (`scripts/.scratch/_audit-input-labels.mjs`, superseded by permanent `tests/input-labels-i18n-audit.test.ts`). Pure housekeeping batch — no code/test logic changes. Closes the orphan-files drift surfaced by P134 ship memory §P135+ candidates.
metadata:
  type: project
---

# P135 Plan-File Cleanup Ship Log

## Summary

P134 ship memory flagged 4 untracked P128-P131 plan files + 1 dead scratch audit script as drift candidates. P135 closes the gap: commits the 4 plan files as historical record (no edits — they document shipped batches as-planned), deletes the scratch script (P133 promoted its logic to a permanent test).

**Date:** 2026-07-29
**Batch ID:** P135
**Files touched:** 6 (4 new plan files + CHANGELOG.md + scratch deletion)
**Commits:** 2 (`2c98bb1` plan files + scratch cleanup, `d7838fb` CHANGELOG bump)
**pnpm check:** invariant guard 1/1 pass post-ship (577ms)
**3-way sync:** `0	0` ✓

## Why this batch exists

P134 ship memory §P135+ candidates listed:

> **Plan-file cleanup** — `docs/superpowers/plans/2026-07-28-p128-*.md` through `p131-*.md` are 4 untracked orphan plan files from earlier batches. Out-of-scope for P134 but should ship as P135 housekeeping.

These plan files document shipped batches (P128 FAQ/howtouse coverage, P129 missing-translation assertion, P130 CHANGELOG catch-up v7, P131 single-test split) but were never committed at execution time. Same root cause as P67a working-tree cleanup (2026-07-25): batches ship code without committing planning artifacts.

Plus `scripts/.scratch/_audit-input-labels.mjs` — P133's throwaway audit script, superseded by the permanent `tests/input-labels-i18n-audit.test.ts`. Dead code.

## What shipped

| File | Action | Size | Notes |
|---|---|---|---|
| `docs/superpowers/plans/2026-07-28-p128-faq-howtouse-coverage-extension.md` | add | 24754 | P128 plan |
| `docs/superpowers/plans/2026-07-28-p129-missing-translation-assertion.md` | add | 25681 | P129 plan |
| `docs/superpowers/plans/2026-07-28-p130-changelog-catchup-v7.md` | add | 23094 | P130 plan |
| `docs/superpowers/plans/2026-07-28-p131-single-test-split.md` | add | 56569 | P131 plan |
| `scripts/.scratch/_audit-input-labels.mjs` | delete | -5809 | dead scratch (was never tracked) |
| `CHANGELOG.md` | edit | -2/+2 | header bump: 821→823 + last-updated note |

Total: 4 new tracked files + 1 deletion (untracked, so no diff) + CHANGELOG header.

## Design choices

### Plans committed unedited

CLAUDE.md says "Don't save what the repo already records". These plans ARE process documentation — they explain WHY each batch was designed the way it was, what alternatives were considered, what risks were identified. That's worth preserving as historical record.

I considered editing for stale refs (e.g., commit counts, build-dep suite numbers) but rejected: editing historical docs creates false history. Future readers should see the plan as it was when the batch shipped, not retroactively corrected.

### Scratch deletion vs gitignore

CLAUDE.md says "scratch files should NOT be committed". `scripts/.scratch/` is not gitignored (only `.superpowers/` is). Two options:

1. **Delete** the file (chosen): removes the dead code. P133 promoted the logic; no future use.
2. **Add `scripts/.scratch/` to .gitignore**: prevents future accidents. Adds permanent gitignore line for a category that's already mostly empty.

Chose delete because:
- `scripts/.scratch/` is mostly empty (only `_archive/` + this deleted file). Adding gitignore for ~1 file is over-engineering.
- The `_archive/` subdirectory suggests scratch is intentional (not gitignored by design — devs can keep throwaway work there without polluting git status).

If future batches keep adding to `scripts/.scratch/`, revisit adding gitignore. For now, delete is the lighter intervention.

## Verification

| Check | Result |
|---|---|
| `git status` after batch | `nothing to commit, working tree clean` ✓ |
| Invariant guard (post-both-commits) | 1/1 pass (577ms) ✓ |
| TSC | 0 errors ✓ |
| 3-way sync | `0	0` ✓ |

## Post-batch state

- Working tree clean for first time since P60 (per P67a memory)
- All planned + shipped batches from P128-P131 have committed plan files (closes the orphan-files drift class)
- Scratch directory cleaned of dead P133 audit script

## P136+ candidates (carried from P132/P133/P134/P135)

- **P123/P124 defensive audit** — 3rd-party review of `tests/_composite-i18n-walkers.ts` walker + regex; P134's forward-only tolerance pattern + P135's "committed unedited" pattern are reusable for future audits
- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based) — needs brainstorming for architectural decision
- **CHANGELOG catch-up v9** — when next gap exceeds ~5 commits
- **Fix `03-commit-precheck` hook** — exit-code parsing false-positive continues to waste commit cycles (P131 catch-up + P132 + P133 + P134 all hit it)
- **Add `scripts/.scratch/` to .gitignore** — only if scratch usage grows again; defer until pattern recurs

## Lessons

1. **Orphan plan files accumulate silently** — batches ship code but skip plan-file commits. P67a closed this once; P135 closed it again 4 days later. Pattern: every 4-5 batches, working tree has accumulated plan files. Could add a CI guard that fails if `docs/superpowers/plans/` has untracked .md files, but that's heavy-handed for a low-cost housekeeping task.
2. **Committed unedited is defensible for historical docs** — editing plans retroactively creates false history. The cost is "future readers see slightly stale numbers" (acceptable for context); the benefit is "history preserved accurately".
3. **Scratch deletion > gitignore for low-volume scratch dirs** — adding permanent gitignore rules for transient code paths is over-engineering. Delete the dead code, defer gitignore until pattern recurs.
4. **Housekeeping batches are valid P-series content** — P135 isn't a "real" feature but it's drift closure. CLAUDE.md invariant guard + ship memory pattern keeps it traceable + reviewable.