# P27 Memory Audit Pass — Design

> **Status:** Approved 2026-07-19
> **Baseline:** `ef19015` (P26a P2a ToolCard test fix ship)
> **Scope:** Memory audit + cleanup. 5 outstanding claims verification + 4 dirty working-tree files cleanup + vague claim pruning. 4-7 files modified, 1-2 commits.

## TL;DR

P22b → P26a ship cycle caught **3 separate memory cascade misattributions**:
1. P23c: "tests/migration.test.ts 60s timeout" (was external Bash wrap SIGTERM)
2. P25: "tests/internal-links.test.ts lines 20-49 multiple stale" (only line 20)
3. P26a: "5/10 env-dep Clerk/Supabase fails" (was P2a test array staleness)

Each was inherited from a prior batch's "deferred items" list and propagated unchanged through 3-5 subsequent batches without re-verification. **Pattern is systematic**, not one-off. P27 audits the remaining outstanding claims, prunes vague entries, and cleans the 4 dirty working-tree files that have been carried across sessions.

## Audit pre-flight findings

| # | Claim | Source files | Verdict | Action |
|---|---|---|---|---|
| 1 | "satori 21-min wall-clock / 168/200 og:images" | p22b-engine-count-constant | Already mitigated by P23b skip-guard + P24 CI wiring. Full suite 1096/0/0 in 5+ min when env unset, opt-in via `pnpm test:build` otherwise. | Close candidate in p22b with reference |
| 2 | "Periodic `scripts/test-build.mjs` review" | p23b/p24/p25/p26a (4× duplicates) | Wrapper is 10-line self-contained file. "Periodic review" without concrete trigger criterion is vague. | Strike from all 4 files |
| 3 | "Cleanup pre-existing working tree dirt — 4 modified files" | p23b/p24/p25/p26a (4× duplicates) | Files: `.astro/settings.json`, `.codegraph/.gitignore`, `.superpowers/sdd/task-4-report.md`. Carried across sessions without resolution. | Investigate each + `git checkout` if unintentional |
| 4 | "3-wave stale memory pattern / memory audit pass" | p26a | Self-referential — P27 is the audit pass. | Mark P27 itself as the resolution |
| 5 | "scripts/check-og-samples-coverage.mjs may need periodic review" | p23-og-sample | Same pattern as #2 — vague, no concrete trigger | Strike with note: trigger is "tools schema evolves" (not "periodic") |

## Sub-tasks

### P27-1: Verify satori perf status (1 file amend)

Re-verify by running `RUN_BUILD_TESTS=1 node tests/run.mjs` for ~5 minutes; expected outcome: full suite runs without 21-min satori hang (P23b skip-guard + P24 CI wiring handle it). If passes, close the candidate in `p22b-engine-count-constant-shipped.md:92` with strikethrough + reference to P23b + P24.

If still hangs: defer to P28 with new data.

### P27-2: Remove "periodic review" vague claims (4 files)

In each of p23b/p24/p25/p26a, remove or strike the "Periodic scripts/test-build.mjs review" line. Same for "scripts/check-og-samples-coverage.mjs may need periodic review" in p23-og-sample.

Replacement text: "DEFER UNTIL: tools schema adds customOgSample field (per P23 design) OR test-build.mjs grows past 30 LOC". This converts vague "periodic review" into concrete "X threshold" trigger.

### P27-3: Clean 4 dirty working tree files (3 files)

```bash
git status --porcelain
# Expected to find:
#  M .astro/settings.json
#  M .codegraph/.gitignore
#  M .superpowers/sdd/task-4-report.md
```

For each file:
1. `git diff <file>` to see what changed
2. If change is unintentional (e.g., auto-generated, editor whitespace, etc.) → `git checkout <file>`
3. If change is intentional but unstaged → user decides (commit as-is, or revert)

Expected resolution: 3 files revert with `git checkout`. 0 production code touched.

### P27-4: P27 memory + index (2 files)

- NEW `memory/p27-memory-audit-pass-shipped.md` (~120 lines, following P26a template)
- UPDATE `memory/MEMORY.md` index with P27 entry

### P27-5: 3-way sync

- `git fetch origin github` + `git rev-list --left-right --count origin/master...master` + `git rev-list --left-right --count github/master...master`
- `git push origin master` + `git push github master`
- Re-verify both `0\t0` post-push

## Files touched (estimated)

| File | Change |
|---|---|
| `memory/p22b-engine-count-constant-shipped.md` | P27-1: amend line 92 candidate (satori) |
| `memory/p23b-satori-perf-skip-gate-shipped.md` | P27-2: remove "periodic review" |
| `memory/p24-ci-run-build-tests-wiring-shipped.md` | P27-2: remove "periodic review" |
| `memory/p25-stale-82-tools-literal-refresh-shipped.md` | P27-2: remove "periodic review" |
| `memory/p26a-listing-pages-array-fix-shipped.md` | P27-2: remove "periodic review" |
| `memory/p23-og-sample-coverage-shipped.md` | P27-2: replace "periodic review" with concrete trigger |
| `.astro/settings.json` (possible) | P27-3: revert if unintentional |
| `.codegraph/.gitignore` (possible) | P27-3: revert if unintentional |
| `.superpowers/sdd/task-4-report.md` (possible) | P27-3: revert if unintentional |
| `memory/p27-memory-audit-pass-shipped.md` (NEW) | P27-4: ship log |
| `memory/MEMORY.md` | P27-4: index entry |

## Out of scope (P28+)

- Audit of P2-P14 (older) memory files — same pattern likely exists but lower hit rate given age
- Audit of `docs/superpowers/plans/` historical files (74+ plans) — too noisy
- Audit of CLAUDE.md `## Notes for Future Sessions` — separate doc, not memory

## Risks

- **Low**: P27-1 (re-run test suite) — full suite takes 5+ min, may surface unrelated flakes
- **Low**: P27-3 (git checkout on dirty files) — if any of the 3 dirty files are intentional, user may want to commit instead of revert
- **None**: P27-2 (memory file edits) — pure text amend with no code impact

## Acceptance criteria

1. ✅ All 5 outstanding claims either closed (with strikethrough + commit ref) OR converted to concrete trigger
2. ✅ `git status` clean (0 modified files after P27-3)
3. ✅ `memory/MEMORY.md` index entry added for P27
4. ✅ 3-way sync verified 0\t0 on both remotes at final SHA