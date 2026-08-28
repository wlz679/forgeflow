# P150 + P151 Retrospective — Implicit Brainstorming Decisions

**Date**: 2026-08-28
**Status**: Draft (superpowers compliance retroactive document)
**Coverage**: 14 commits on master (24ca554 through 79cbb7c)
**Purpose**: Record what was decided and why during P150 / P151 / meta work, which was done without explicit `superpowers:brainstorming` invocation. This is a retroactive recording for compliance, not a critique.

---

## Context

Between 2026-08-18 and 2026-08-28 the project shipped:

- **P150** (`c16322b`): `translations.ts` to per-locale JSON migration (3816 keys)
- **P151** (`f28c9fa`..`86a3a86`): Preset interface + `PresetChips.astro` + 4 AI cost engines wired
- **Meta** (`24ca554`, `d0636f7`, `842da27`, `79cbb7c`): Claude Code to Qoder migration, dependency fix, FAQ i18n backfill

The decision documentation for these changes was implicit (brainstorming skill was not invoked). This document is the retroactive recording.

---

## Section 1: P150 decisions (6)

### 1.1 — JSON location

**What**: Keys live in `src/i18n/locales/{en,zh}.json` (not `src/data/i18n/` or `src/i18n/{en,zh}.json`).
**Why**: Matches existing `src/i18n/` directory convention from master; Astro i18n tooling already expects `src/i18n/`.

### 1.2 — Key naming kept verbatim

**What**: Every key from `translations.ts` copied verbatim into JSON files (no namespace flattening, no slug rename).
**Why**: Consistency over breaking change. P140b era already shipped 100 engines reading `tools.X.faq.N.q` keys; changing the key shape would force engine template re-wire.

### 1.3 — Multiline string handling

**What**: Migration script uses regex `[\s\S]*?` (lazy any-char including newline) for both single-quote and double-quote strings.
**Why**: Master file uses multiline string literals; a regular `.+?` would fail to capture across newlines.

### 1.4 — zh values: English placeholder for new keys

**What**: New keys (100 engines * FAQ entries 8-14, 200 blog keys) have `zh` value identical to `en` (English placeholder).
**Why**: Progress over quality. Real Chinese translation deferred to a separate P-series. Translating 1300+ keys in-line would have blocked the build gate for hours.

### 1.5 — Hard cutover (no transition)

**What**: `translations.ts` deleted in the same commit as JSON files were written (`c16322b`). No period where both existed.
**Why**: Clean break over dual-support complexity. The 6 caller consumers (3 `.client.ts` scripts + `translate-helper.ts` + 2 test files) were updated in the same commit.

### 1.6 — Forward slash in keys: rejected

**What**: Engine slugs use dot-separated namespaces (`tools.solopreneur-mrr-calculator.title`), not slash (`tools/solopreneur-mrr-calculator/title`).
**Why**: Matches existing flat-key convention from `translations.ts`. Flat keys are easier to grep and don't require URL-encoded lookup logic.

---

## Section 2: P151 decisions (4)

### 2.1 — PRESETS const to engine.presets field

**What**: 4 AI cost engines (`ai-image-generation`, `ai-training`, `gpu-cloud`, `ai-api-comparison`) moved their inline `PRESETS: Record<string, Record<string, string>>` const into the new `ToolEngine.presets?: Preset[]` field on the type.
**Why**: Type safety + reuse. The new `Preset` interface (`{ key, emoji, fields }`) gives each preset a typed shape; previously each engine used untyped string-map-of-string-map.

### 2.2 — New PresetChips.astro component

**What**: 4 inline preset-button JSX blocks in `src/pages/[lang]/[slug].astro` replaced by a single `<PresetChips>` component call driven by `engine.presets`.
**Why**: Refactor over duplication. Net `-63 lines` in `[slug].astro` and the component can be reused by future engines.

### 2.3 — 4 engines wired (not all 100)

**What**: Only 4 AI cost engines wired to the new `presets` field in this batch. Other engines still use the legacy `PRESETS` const pattern.
**Why**: Fast iteration in the AI Cost category (the most-visited cluster). Wiring all 100 engines would have been a 50-commit batch with no behavior change for engines that don't use presets.

### 2.4 — kebab-case preset keys

**What**: Preset keys use kebab-case (`solopreneur`, `creator`, `agency`, `budget`, `logos`, `batch-7b`, `lora-7b`, `code-review`) not Title Case (`Solopreneur`, `Code Review`).
**Why**: Matches i18n key naming convention. `tools.${slug}.preset.${key}` reads cleanly when the preset key is also kebab-case.

---

## Section 3: Meta decisions (4)

### 3.1 — `.claude/` deletion

**What**: `.claude/` directory (containing Claude Code session state, settings.json, scheduled_tasks.json) was deleted in commit `24ca554`.
**Why**: Qoder migration. Claude Code artifacts are not relevant to the Qoder IDE runtime; the directory was dead weight.

### 3.2 — `CLAUDE.md` deletion (after merge into `AGENTS.md`)

**What**: `CLAUDE.md` (36 KB project constitution) was migrated verbatim into a new `FORGEFLOWKIT PROJECT CONSTITUTION` block at the bottom of `AGENTS.md`, then deleted.
**Why**: Dedupe. Qoder reads `AGENTS.md`, not `CLAUDE.md`. Single source of truth for project rules.

### 3.3 — AGENTS.md constitution block kept separate from gstack index

**What**: The new project constitution block sits OUTSIDE the `BEGIN/END GSTACK-CODEX MANAGED BLOCK`. The block boundary is explicit (`<!-- BEGIN FORGEFLOWKIT PROJECT CONSTITUTION -->`).
**Why**: `npx gstack-codex init --project` regenerates the gstack block from the upstream template; project-specific rules must not be inside that block or they would be wiped on every gstack refresh.

### 3.4 — 5 orphan keys kept (master long-term debt)

**What**: 5 keys (`favorites.saved_count`, `eeat.reviewed_by`, `eeat.team`, `eeat.author_label`, `eeat.publisher_label`) remain in `en.json` / `zh.json` even though no `t()` call references them. `tests/translation-glossary-guard.test.ts` flags them as orphans; `scripts/check-i18n-completeness.mjs` requires them.
**Why**: Trade-off between build gate (required) and orphan detection (informational). Removing them from the JSON would break the i18n completeness build check. Wiring them into templates is a separate P-series.

---

## Acceptance

- File committed to git at `docs/superpowers/specs/2026-08-28-p150-p151-retrospective-design.md`.
- Coverage: 14 decisions recorded (6 P150 + 4 P151 + 4 meta) covering all 14 commits.
- Reader can answer "what was decided and why" without re-reading commits.

## Out of scope

- **Code review of the 14 commits** for sql safety / llm trust boundaries / conditional side effects: handled by separate `superpowers:requesting-code-review` invocation.
- **finishing-development-branch** retroactive for the `feat/preset-chip-cherrypick-p151 to master` fast-forward merge: handled by separate skill invocation.
- **Critique of decisions**: this doc records what was done, not whether each was right. Future P-series can re-evaluate.