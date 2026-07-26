# P77 CLAUDE.md Standing Rule (.superpowers/ gitignore) Ship Log

## Summary

P77 adds a permanent standing rule to `CLAUDE.md` "Notes for Future Sessions" — formalizes the P70 root-cause fix for `.superpowers/` scratch pollution. Future AI sessions will read this rule and know not to `git add` files under that path.

**Date:** 2026-07-26
**Batch ID:** P77
**Files touched:** 1 (CLAUDE.md)
**Test delta:** unchanged
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### CLAUDE.md — new standing rule added

In "## Notes for Future Sessions" section (after the P48 GH Action rule and P44 pre-push hook rule), added:

```markdown
- **Never `git add` files under `.superpowers/`** — the `.gitignore` rule
  (`.superpowers/`) intentionally excludes ALL files in that path because they're
  runtime scratch (subagent task reports, brainstorm HTML output, etc.). P67a
  first surfaced this when `.superpowers/sdd/task-4-report.md` was mutated by
  subagents over 3 days; P70 fixed it via `git rm --cached -r .superpowers/`
  (7 historically-tracked scratch files removed) but the `.gitignore` rule
  doesn't retroactively untrack. Future subagent sessions should treat any
  `.superpowers/` file as scratch — write freely, but never `git add` or
  `git commit`. If a file under `.superpowers/` shows up in `git status`,
  that's a scratch mutation in progress; revert with
  `git checkout HEAD -- .superpowers/` rather than committing it. See P70
  ship memory for the root-cause analysis.
```

### Placement rationale

The new rule is positioned with the other git workflow lessons:
- P48 GH Action cron race rule (line 205)
- P44 Pre-push hook false-negative rule (line 207)
- **P70 .superpowers/ gitignore rule (NEW)**

All three are git hygiene lessons discovered through operational issues. Grouping them makes future sessions more likely to encounter related rules together when looking for git workflow guidance.

## Why this exists

P70 fixed a real bug (7 scratch files tracked in git despite `.gitignore` rule) but the LESSON was never permanently recorded in CLAUDE.md. Per the CLAUDE.md "cascade audit pattern" (also in Notes section):
> Every P-series memory file should have either a commit ref (closed) or a concrete trigger criterion for any pending item.

P70's lesson was "closed" (P70 commit exists, files untracked) but the **behavioral prevention** wasn't documented for future sessions. Without this standing rule, a future subagent session could:
1. Mutate `.superpowers/sdd/task-4-report.md` (or any tracked scratch file)
2. See it appear in `git status` as modified
3. Without explicit guidance, decide to commit it
4. Reproduce the original bug

The new standing rule explicitly:
- Warns future sessions NOT to `git add` files under `.superpowers/`
- Explains WHY (the gitignore rule + historical root-cause)
- Provides remediation (`git checkout HEAD -- .superpowers/`) if a scratch file appears
- Cites P70 ship memory for deeper analysis

## Trigger criterion

This is a "closed" P-series memory file (no trigger needed for followup). The lesson is permanently documented in CLAUDE.md, which:
- Loads automatically at the start of every Claude Code session
- Is the authoritative source-of-truth per the file's own opening line: "CLAUDE.md is THE source of truth for future AI sessions"

## What was NOT done

- ❌ Did NOT modify CHANGELOG.md — CLAUDE.md changes are documentation/hygiene, not user-visible release notes
- ❌ Did NOT modify MEMORY.md — the auto-memory file is for session-to-session handoff, not standing rules
- ❌ Did NOT add a test — standing rule is documentation, not behavioral enforcement (would require git hook)
- ❌ Did NOT add a CI guard — existing `.gitignore` rule + this standing rule is sufficient defense

## Related references

- **P70** — original root-cause fix (commit `b183f0c`): `git rm --cached -r .superpowers/` + gitignore clarification
- **P67a** — first revert of scratch mutation (without root-cause fix)
- **CLAUDE.md** "Cascade audit pattern" — framework this P77 follows

## P78+ candidate

- **Footer/breadcrumb i18n audit** — another round
- **OG image localization** — image generation scope
- **Translation glossary file** — formalize EN/CN terminology
- **CI guard list extension** — add new hardcoded EN strings as discovered