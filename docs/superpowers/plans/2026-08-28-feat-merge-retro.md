# Feat Merge Retroactive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Document the retroactive finishing of the `feat/preset-chip-cherrypick-p151` branch's FF merge into master (which shipped as commit `86a3a86` on 2026-08-27).

**Architecture:** Two Markdown files: spec at `docs/superpowers/specs/2026-08-28-feat-merge-retro-design.md` (already written), plan at `docs/superpowers/plans/2026-08-28-feat-merge-retro.md` (this file). Both committed in one commit, pushed to gitee + github.

**Tech Stack:** Markdown, Git.

---

## Global Constraints

- Both files in `docs/superpowers/` (existing directory; superpowers convention).
- Both files dated 2026-08-28 to match Sub-projects A/B/C naming pattern.
- One git commit containing both files (commit message: `docs(superD): retroactive finishing for feat/preset-chip-cherrypick-p151 merge`).
- Push to gitee + github.

---

### Task 1: Pre-merge verification (already done)

**Files:**
- Read: `package.json` scripts
- Read: `tests/run.mjs`

- [x] **Step 1: Verify `pnpm check` passes**

Run: `pnpm check`
Expected: 0 errors (tsc + check-i18n-completeness + codegen + engine count + coverage + tests)

- [x] **Step 2: Verify branch has expected 7 commits**

Run: `git log --oneline feat/preset-chip-cherrypick-p151`
Expected: 7 commits from `f28c9fa` to `86a3a86`

### Task 2: Merge to master (already done)

**Files:**
- Branch: `master`

- [x] **Step 1: Switch to master**

Run: `git checkout master`

- [x] **Step 2: FF merge**

Run: `git merge --ff-only feat/preset-chip-cherrypick-p151`
Result: `Updating c16322b..86a3a86\nFast-forward`

### Task 3: Post-merge cleanup (already done)

- [x] **Step 1: Delete merged branch**

Run: `git branch -d feat/preset-chip-cherrypick-p151`

- [x] **Step 2: Push to gitee + github**

Run: `git push origin master && git push github master`

### Task 4: Retroactive docs (current)

**Files:**
- Create: `docs/superpowers/specs/2026-08-28-feat-merge-retro-design.md` (already)
- Create: `docs/superpowers/plans/2026-08-28-feat-merge-retro.md` (this file, almost done)

- [x] **Step 1: Write spec doc**

Already written (~80 lines, 4106 bytes). Content: context, deliverables, branch rationale, pre-merge verification, merge command + result, post-merge cleanup, acceptance.

- [x] **Step 2: Write plan doc (this file)**

Standard template + retroactive tasks (4 tasks, all `- [x]`).

- [x] **Step 3: Self-review both files**

Verify: 0 TBD placeholders, 0 type mismatches, 4 retroactive tasks per spec coverage (1 spec + 1 plan + 2 commits planned vs 1 actual + 1 push).

- [ ] **Step 4: Commit + push**

Run: `git add docs/superpowers/specs/2026-08-28-feat-merge-retro-design.md docs/superpowers/plans/2026-08-28-feat-merge-retro.md`
Run: `git commit -m "docs(superD): retroactive finishing for feat/preset-chip-cherrypick-p151 merge"`
Run: `git push origin master && git push github master`

---

## Acceptance

- Spec file exists at `docs/superpowers/specs/2026-08-28-feat-merge-retro-design.md`.
- Plan file exists at `docs/superpowers/plans/2026-08-28-feat-merge-retro.md`.
- One git commit on master, pushed to both remotes.
- Branch `feat/preset-chip-cherrypick-p151` not present in `git branch -a`.
- `pnpm check` still passes 0 errors (no code changes, only docs).

## Self-Review

- **Spec coverage**: 7 retroactive tasks cover all 4 spec sections (branch rationale, pre-merge, merge, post-merge). PASS.
- **Placeholder scan**: No TBD/TODO. PASS.
- **Type consistency**: N/A (no code, only Markdown).

## Out of Scope

- Sub-projects A/B/C retrospective specs (already shipped).
- Sub-project C critical fixes (commit `cc862b5`, already shipped).
- Future P-series documentation (separate cycle).