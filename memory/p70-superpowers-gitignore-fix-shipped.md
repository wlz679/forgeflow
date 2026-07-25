# P70 .superpowers/ Gitignore Root-Cause Fix Ship Log

## Summary

P70 removes the historical git tracking of scratch files under `.superpowers/` that was caused by `.gitignore` not retroactively applying. Prevents future subagent scratch pollution from accidentally being committed.

**Date:** 2026-07-25
**Batch ID:** P70
**Files touched:** 8 (7 untracked from git + 1 gitignore comment clarification)
**Test delta:** unchanged (no production code change)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Removed from git tracking (kept on disk)
- **[scratch] `.superpowers/sdd/task-4-report.md`** — historically tracked scratch file. Caused P67a revert (3 days of accumulated subagent mutations).
- **[scratch] `.superpowers/brainstorm/1024-1780203776/content/*.html`** — 4 brainstorm HTML files (design-summary, homepage-layout, tool-page-layout, waiting)
- **[scratch] `.superpowers/brainstorm/1024-1780203776/state/*`** — 2 brainstorm state files (server-stopped, server.pid)

### Changed
- **[.gitignore]** — clarified comment near `.superpowers/` rule, explicitly notes P70 untracked these files and warns future contributors not to `git add` files under this path.

## Why this exists

### Original problem (P67a trigger)

P67a's discovery: working tree showed `M .superpowers/sdd/task-4-report.md` — a tracked scratch file mutated by subagents over 3 days. The `.gitignore` had `.superpowers/` rule (line 13) but gitignore doesn't retroactively untrack already-tracked files. P67a reverted the modification but didn't address the root cause.

### Root cause

Three commits (P59 era, P27, etc.) added `.superpowers/sdd/task-4-report.md` and `.superpowers/brainstorm/*` to git tracking **before** the `.gitignore` rule for `.superpowers/` was added (or before the rule was strengthened to cover these subdirs). Once tracked, `.gitignore` doesn't apply.

### Impact

Without this fix:
- Subagents writing to `.superpowers/sdd/task-4-report.md` (or any tracked file under `.superpowers/`) would mutate tracked content
- Future `git status` would show unexpected modifications
- Pre-commit hooks might fail or produce confusing output
- Cumulative drift across batches

With this fix:
- All `.superpowers/` files are gitignored (rule already in place; just enforced retroactively via `git rm --cached`)
- Subagent scratch writes stay local — no risk of accidental commit
- Future contributors see clean status output
- Defense in depth: even if a contributor accidentally runs `git add .superpowers/...`, files won't be tracked because gitignore prevents `git add` from staging ignored paths (with default flags)

## Implementation

```bash
git rm --cached -r .superpowers/   # untrack all 7 files, keep on disk
# .gitignore already has .superpowers/ rule — strengthened comment
git add .gitignore
git commit -m "chore(p70): untrack .superpowers/ scratch files (root-cause fix for P67a scratch mutation)"
```

## Verification

- `git ls-files .superpowers/` returns 0 entries ✓
- `find .superpowers -type f` returns 262 files on disk (preserved) ✓
- `git status --short` shows only the 8 expected changes (7 deletions + 1 gitignore modification) ✓
- Working tree otherwise unchanged ✓

## Related references

- **P67a** — first revert of `.superpowers/sdd/task-4-report.md` scratch mutation (didn't fix root cause)
- **P27** — added `.superpowers/` to `.gitignore` (didn't retroactively untrack)
- **P55** — brainstorm skill that wrote `.superpowers/brainstorm/1024-*` files
- **CLAUDE.md** "Notes for Future Sessions" — should add note about `.superpowers/` gitignore for future agents (defer to P71+)

## P70+ candidate

- **CLAUDE.md invariant**: add a standing rule "Never `git add` files under `.superpowers/`" to the "Notes for Future Sessions" section.
- **Cross-link CJK guard full-layer** — extend P63/P66b's cross-link checks to tool + blog pages (currently only h1 is scanned for tool + blog).
- **Blog translation review pass** — human review of 200 AI-generated zh translations.
- **Blog body content i18n** — larger scope: translate ~50K words across 100 markdown bodies.