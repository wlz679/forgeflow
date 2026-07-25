# P65 CHANGELOG Catch-up Ship Log

## Summary

P65 closes the CHANGELOG drift from 2026-07-20 (P45 batch) to 2026-07-24 (P64). 19 batches · 78 commits documented in a single M17.0 milestone section. Doc-only batch.

**Date:** 2026-07-24
**Batch ID:** P65
**Files touched:** 1 (`CHANGELOG.md`, +91 / −5)
**Test delta:** 1170 → 1170 (no production code change)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[docs] CHANGELOG M17.0 section** — `2026-07-20 → 2026-07-24 — Maintenance mode continuation (P46-P64)` with 4 themed subsections (test infra + TS sweep + drift fixes + cascade audit)
- **[docs] CHANGELOG header refresh** — `Total commits: 632 → 712`; `Active days: 33 → 38`; last-updated date `2026-07-20 → 2026-07-24`

## Why this exists

Project is in maintenance mode. CHANGELOG is the user-visible release record. Last update was P45 (2026-07-20). Between P45 and P64, 19 batches and 78 commits accumulated unrecorded. P65 closes the gap with a single new M17.0 milestone section.

## Implementation approach

**Subagent-driven-development** dispatched a fresh sonnet subagent to read 4 standalone ship memory files (P60-P63) + extract 15 P46-P59 summaries from `MEMORY.md`. Subagent composed the M17.0 section with:

- 4 themed `### Added` subsections matching M0.x style
- `### Fixed` / `### Changed` continuation sections
- `### Engineering metrics` table mirroring M16.0/M0.x
- `### Ship drama` subsection (P43 cron race, P44 hook bypass, P59 cron race, P60 BLOCKED-fix, etc.)
- `📦 ship log:` links at section end to per-batch memory files

## Coverage

- **M17.0 entries:** 42 bullets across 5 subsections + 9 ship drama items
- **Batches documented:** 19 (P46-P64, with P64 mentioned inline since no standalone ship memory)
- **Commits documented:** 78 (~ incl. 3 cron syncs + 1 merge)
- **Engine count:** 100 (frozen, unchanged)
- **Production engine changes in P46-P64:** 1 (rent-vs-buy Stay-Horizon Milestone — P55 follow-up)

## P65+ candidate

- **docs drift close-out** — `.superpowers/sdd/task-4-report.md` SDD scratch + `docs/superpowers/plans/2026-07-23-p61-m-category-fixes.md` plan archive + `memory/p60-engines-cost-subdir-fix-shipped.md` ship memory commit (this was lost in P60's original commit chain; P65 partially covered content via M17.0 ship drama but the standalone file is still uncommitted)
- **zh preservation test (P66b)** — symmetric defense for P63's en guard
- **multi-script leak guard** — extend P63 to Cyrillic/Arabic/Hebrew