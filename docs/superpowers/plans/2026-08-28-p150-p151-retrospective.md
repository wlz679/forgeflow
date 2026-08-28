# Sub-project A: P150 + P151 Retrospective Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Record the 14 implicit brainstorming decisions made during P150 / P151 / meta work as a retroactive spec doc, satisfying superpowers compliance trigger "documentation of brainstorming".

**Architecture:** Single Markdown spec doc at `docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md`. No code changes. Future sub-projects (B / C / D) reference this spec as their input.

**Tech Stack:** Markdown only.

---

## Global Constraints

- Spec must cover exactly 14 commits (P150: 1, P151: 5, meta: 4 + 4 ship-related fixes).
- Each decision recorded as "what" + "why" pair.
- No critique of decisions (recording only). User explicitly chose "A. What + Why 快速录" depth.
- File path: `docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md`.
- Self-review must confirm 14 decisions, 14 What blocks, 14 Why blocks, no TBD placeholders.

---

### Task 1: Spec doc written, self-reviewed, committed, pushed

**Files:**
- Create: `docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md` (114 lines, 6901 bytes)

**Interfaces:**
- Consumes: nothing (spec is the deliverable).
- Produces: spec doc + commit 972c99f on master.

- [x] **Step 1: Write the spec doc**

```markdown
# P150 + P151 Retrospective — Implicit Brainstorming Decisions

(Date 2026-08-28, Coverage 14 commits, Status Draft retroactive)
```

(See repo for full content; 6 P150 decisions + 4 P151 decisions + 4 meta decisions.)

- [x] **Step 2: Self-review the spec**

Run: `node tmp/self-review.c.js`
Expected output:
```
P150 decisions: 6 expected: 6
P151 decisions: 4 expected: 4
Meta decisions: 4 expected: 4
Total: 14 expected: 14
Acceptance mentions 14: true
What blocks: 14 Why blocks: 14
```

- [x] **Step 3: Commit and push**

```bash
git add docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md
git commit -F .git/COMMIT_EDITMSG_NEW  # message: "docs(superspec): retroactive brainstorming audit for P150 + P151 + meta"
git push origin master
git push github master
```

Result: commit `972c99f` on master, pushed to gitee (`wlz679/calcKit.git`) and github (`wlz679/forgeflow.git`).

---

## Acceptance

- File exists at `docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md`.
- Commit `972c99f` exists on master.
- Spec self-review passes (14 decisions, 14 What blocks, 14 Why blocks).
- Push succeeded to both remotes.
- User reviewed and approved the spec.

## Self-Review (per writing-plans checklist)

1. **Spec coverage**: 14 commits -> 14 decisions (6+4+4). PASS.
2. **Placeholder scan**: No "TBD" / "TODO" / "FIXME" / "implement later". PASS.
3. **Type consistency**: No types defined (Markdown doc). N/A.

## Out of Scope (for future sub-projects)

- Sub-project B — writing retrospective plan docs (`superpowers:writing-plans`) for the same 14 commits.
- Sub-project C — code review of the 14 commits (`superpowers:requesting-code-review`).
- Sub-project D — retroactive `superpowers:finishing-a-development-branch` for the feat/preset-chip-cherrypick-p151 -> master fast-forward merge.