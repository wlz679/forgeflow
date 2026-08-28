# Sub-project B: Retrospective Plan Docs

**Date**: 2026-08-28
**Status**: Draft
**Parent**: Sub-project A retrospective spec (`docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md`)
**Goal**: Produce three retrospective plan docs for P150, P151, and meta work using the strict `superpowers:writing-plans` template.

---

## Context

Sub-project A produced a spec that records the 14 implicit brainstorming decisions for the 14 commits between 2026-08-18 and 2026-08-28. Sub-project B produces the implementation-plan companion: three plan docs that synthesize the bite-sized tasks that were executed to ship those decisions.

The plan docs are retrospective (already-done work); all task checkboxes will be marked `- [x]`. They exist for two reasons: (a) so future P-series can clone the structure, and (b) so superpowers:finishing-a-development-branch (Sub-project D) has a clean plan-of-record to retro-sign.

---

## Deliverables

Three Markdown plan files, all in `docs/superpowers/plans/`:

1. `2026-08-28-p150-i18n-migration.md` (P150 — `c16322b`)
2. `2026-08-28-p151-preset-chip.md` (P151 — `f28c9fa..86a3a86`)
3. `2026-08-28-meta-qoder-migration.md` (Meta — `24ca554`, `d0636f7`, `842da27`, `79cbb7c`)

One git commit containing all three files.

---

## Per-doc structure (strict `superpowers:writing-plans` template)

Each plan must start with the standard header:

```markdown
# [Feature Name] Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** [one sentence]
**Architecture:** [2-3 sentences]
**Tech Stack:** [key libraries / versions]

## Global Constraints

[copied verbatim from Sub-project A spec, where applicable]
```

Body: bite-sized tasks (2-5 min each), all `- [x]` (retroactive).

Trailer:
- `## Acceptance` block listing commit SHA(s), test status, push status.
- `## Self-Review` block confirming spec coverage / no placeholders / type consistency.
- `## Out of Scope` block referencing the other 14 commits that are NOT in this doc.

---

## Per-doc task decomposition

### P150 doc (7 tasks)

1. Verify `src/i18n/translations.ts` source.
2. Write one-shot migration script.
3. Run migration, verify 3816 keys written.
4. Update 6 consumer call sites (5 test files + `index.ts`).
5. Delete `translations.ts`.
6. Run `pnpm check` — verify 0 errors.
7. Commit + push (`c16322b`).

### P151 doc (6 tasks)

1. Add `Preset` interface + `presets?: Preset[]` field to `src/core/engines/types.ts`.
2. Create `src/components/PresetChips.astro`.
3. Add `presets: [...]` to 4 AI cost engines (ai-image / ai-training / gpu-cloud / ai-api-comparison).
4. Refactor `src/pages/[lang]/[slug].astro` inline preset JSX to `<PresetChips>` call.
5. Run `pnpm check` — verify typecheck + tests pass.
6. Commit + push (6 commits: `f28c9fa`, `41747b1`, `b825467`, `c96417c`, `ed11fee`, `6e37493`, `86a3a86`).

### Meta doc (4 tasks)

1. Migrate `CLAUDE.md` content to `AGENTS.md` (new FORGEFLOWKIT PROJECT CONSTITUTION block).
2. Delete `.claude/` directory (4 tracked files).
3. Delete `CLAUDE.md` (36 KB).
4. Commit + push (`24ca554`).

(Out of scope for this doc: the 4 ship-related fix commits — those are in Sub-project C / D retrospectives.)

---

## Acceptance

- Three plan files exist at the paths specified.
- All tasks in all docs are marked `- [x]` (retroactive).
- All three docs reference their commit SHA(s) and final status.
- One git commit with message `docs(superplan): retrospective plan docs for P150 + P151 + meta`.
- Push to gitee + github succeeds.
- Self-review confirms 17 total tasks across 3 docs (7+6+4).

## Out of scope

- **Sub-project A retrospective spec**: already shipped (`972c99f`).
- **Sub-project C code review of 14 commits**: separate `superpowers:requesting-code-review` cycle.
- **Sub-project D branch merge retro**: separate `superpowers:finishing-a-development-branch` cycle.