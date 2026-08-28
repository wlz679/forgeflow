# Meta: Qoder Migration + AGENTS.md Constitution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the project from Claude Code to Qoder IDE: move `CLAUDE.md` content to a new block in `AGENTS.md`, then delete the Claude Code residue (`.claude/` directory + `CLAUDE.md`).

**Architecture:** Single atomic migration: (1) Append the FORGEFLOWKIT PROJECT CONSTITUTION block (copied verbatim from CLAUDE.md) to `AGENTS.md` after the existing GSTACK-CODEX MANAGED BLOCK. (2) Delete `.claude/` directory (4 tracked files: `scheduled_tasks.json`, `settings.json`, `settings.local.json`, `worktrees/`). (3) Delete root `CLAUDE.md`. (4) Commit. The `.gitignore` already lists these paths, so any tracked-but-then-ignored file produces a `D` status that needs `git rm` in the commit.

**Tech Stack:** Markdown, Git.

## Global Constraints

- The new FORGEFLOWKIT PROJECT CONSTITUTION block must sit OUTSIDE the BEGIN/END GSTACK-CODEX MANAGED BLOCK (or `npx gstack-codex init --project` will wipe it on every refresh).
- Block boundaries explicit: `<!-- BEGIN FORGEFLOWKIT PROJECT CONSTITUTION -->` ... `<!-- END FORGEFLOWKIT PROJECT CONSTITUTION -->`.
- The existing AGENTS.md rule "Skill 调用必须可见" stays in the gstack block (it's a superpowers rule, not project-specific).
- `.claude/settings.local.json` is large (~103 KB) — committed deletion frees up repo size but is not required.

---

### Task 1: Migrate `CLAUDE.md` content to `AGENTS.md`

**Files:**
- Read: `CLAUDE.md` (36 KB)
- Modify: `AGENTS.md`

- [x] **Step 1: Read CLAUDE.md content**

Run: `wc -l CLAUDE.md`
Expected: `~448 CLAUDE.md`

- [x] **Step 2: Append the FORGEFLOWKIT PROJECT CONSTITUTION block to AGENTS.md**

The block content is the full CLAUDE.md body (minus the top header), inserted between `<!-- END GSTACK-CODEX MANAGED BLOCK -->` and the next section.

Boundary markers:
```
<!-- BEGIN FORGEFLOWKIT PROJECT CONSTITUTION -->

> **Section boundary**: ...

# ForgeFlowKit — Project Constitution
[...full CLAUDE.md body...]
<!-- end
---

### Task 2: Delete `.claude/` directory (tracked files)

**Files:**
- Delete: `.claude/scheduled_tasks.json`
- Delete: `.claude/settings.json`
- Delete: `.claude/settings.local.json`

Note: `.claude/worktrees/` directory is untracked (not in git); do not `git rm` it.

- [x] **Step 1: Verify which files are tracked**

Run: `git ls-files .claude/`
Expected output: 3 files (`scheduled_tasks.json`, `settings.json`, `settings.local.json`).

- [x] **Step 2: git rm the tracked files**

Run: `git rm .claude/scheduled_tasks.json .claude/settings.json .claude/settings.local.json`
Expected: 3 deletions staged.

### Task 3: Delete `CLAUDE.md`

**Files:**
- Delete: `CLAUDE.md` (36 KB)

- [x] **Step 1: git rm CLAUDE.md**

Run: `git rm CLAUDE.md`
Expected: 1 deletion staged.

### Task 4: Commit + push

- [x] **Step 1: Stage changes**

Run: `git add -A`

- [x] **Step 2: Verify status**

Run: `git status --short`
Expected: 4 deletions (`D`) and 1 modification (`M AGENTS.md`).

- [x] **Step 3: Commit**

Run: `git commit -m "chore(meta): switch to Qoder - migrate CLAUDE.md project constitution to AGENTS.md"`
Result: `24ca554`

- [x] **Step 4: Push to gitee + github**

Run: `git push origin master && git push github master`

---

## Acceptance

- `AGENTS.md` contains a new FORGEFLOWKIT PROJECT CONSTITUTION block (between BEGIN/END markers).
- `.claude/` tracked files deleted (3 files).
- `CLAUDE.md` deleted (1 file).
- Commit `24ca554` exists on master, pushed to both remotes.
- Diff stat: `4 files changed, 457 insertions(+), 463 deletions(-)`.

## Self-Review

- **Spec coverage**: 4 tasks cover all 4 spec decisions (.claude deletion, CLAUDE.md merge, constitution block placement, dedupe). PASS.
- **Placeholder scan**: No TBD/TODO. PASS.
- **Type consistency**: N/A (no code).

## Out of Scope

- The 4 ship-related fix commits (`09236e6`, `c4f4136`, `842da27`, `79cbb7c`) — those are i18n/FAQ cleanup work, not meta migration.
- Updating `AGENTS.md` content inside the gstack block — managed by `npx gstack-codex init --project`.
- Documenting the merge in `memory/` — already done in `memory/adsense-reapply-checklist-2026-09-01.md` (separate from this plan).