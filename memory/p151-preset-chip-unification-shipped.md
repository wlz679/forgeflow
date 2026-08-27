---
name: p151-preset-chip-unification-shipped
description: P151 closes feat/ai-cost-preset-chip-unification (June 2026 WIP branch) on master. Replaces 4 inline AI cost preset button JSX blocks with reusable <PresetChips> component driven by engine.presets[] field. Adds Preset interface (src/core/engines/types.ts), deletes 4 dead `const PRESETS` constants, 24 i18n preset keys (4 engines × 6 presets × en+zh) wired via component. Net: -63 lines in [slug].astro, +103/-143 across 8 files. ZERO engine semantic changes — input field values preserved verbatim.
metadata:
  type: project
  shipped: 2026-08-27
  parent_commit: 480d296 (P5A-T7)
  commits:
    - 24ca554 (chore(meta) P0)
    - c16322b (chore(i18n) P150)
    - f28c9fa (stage 1: Preset + PresetChips)
    - 41747b1 (stage 1.5: dead-i18n-keys-guard JSON cast)
    - b825467 (stage 2a: ai-image)
    - c96417c (stage 2b: ai-training)
    - ed11fee (stage 2c: gpu-cloud)
    - 6e37493 (stage 2d: ai-api-comparison)
    - 86a3a86 (stage 3: [slug].astro refactor)
    - d0636f7 (P150 follow-up: check-engine-count-by-category AGENTS.md fallback)
---

# P151 — AI Cost Preset Chip Unification — SHIPPED

**Date:** 2026-08-27
**Branch:** `feat/preset-chip-cherrypick-p151` (fast-forwarded to master)
**Cadence:** direct-to-master (matches Phase 1 P137/P140f-b2 cadence for engine directory touching changes)
**Parent:** `480d296` (P5A-T7) → head `d0636f7`

---

## Background

`feat/ai-cost-preset-chip-unification` was a June 2026 WIP branch that:
1. Added a `Preset` interface to `src/core/engines/types.ts`
2. Added a reusable `<PresetChips>` Astro component
3. Moved 4 AI cost engines from dead `const PRESETS` blocks to the new `engine.presets[]` field
4. Refactored `[slug].astro` to use the new component
5. Deleted the dead inline preset button JSX (4 blocks)

8 months later, master had progressed significantly (P5A-T7 was the latest P-series). The WIP branch conflicted with master because:
- `src/engines/*.ts` had been reorganized into `src/engines/ai-cost/*.ts` (subdir per category)
- `[slug].astro` had grown 540 → 2240 lines (P137/P140f/P140g/P147 series)
- `src/i18n/translate-helper.ts` had been extracted (P141-B1-T3)
- `src/data/i18n-needed.json` had been replaced by per-locale JSON (P150)

## Approach taken

Instead of force-merging the 11 WIP commits or starting over, took the cherry-pick + manual rebuild route:

1. **Cherry-pick attempt**: Only `471ff2b` (types.ts) cherry-picked cleanly. The 10 other commits had path conflicts on engine files (because of the directory restructuring) and on `[slug].astro` (because of 1700+ line additions).

2. **Manual rebuild**: Re-implemented each stage by hand on master:
   - Stage 1: Re-merged types.ts (Preset interface + presets? field) using both sides. Created PresetChips.astro.
   - Stage 1.5: Fixed `tests/dead-i18n-keys-guard.test.ts` TS7053 by casting JSON imports as `Record<string, string>` (P150 follow-up — `import en from './en.json'` infers as literal-key union).
   - Stages 2a-2d: For each of 4 AI cost engines:
     - Deleted the `const PRESETS: Record<string, ...>` block
     - Added `presets: Preset[]` field after `generate()` in `const engine: ToolEngine = { ... }`
     - Re-keyed preset names from Title Case to kebab-case to match the existing i18n keys (which master had already prepared when v3 preset chip UI was first designed)
   - Stage 3: Replaced 4 inline JSX blocks in `[slug].astro` (isAiApiCostComparison / isImage / isTraining / isGpu, ~67 lines) with single `<PresetChips presets={engine.presets} slug={slug!} lang={lang} />` call (~4 lines).

3. **Side fix (P150 follow-up)**: `scripts/check-engine-count-by-category.mjs` Layer 3 still hardcoded to read `CLAUDE.md` (deleted in P150). Updated to fall back to `AGENTS.md`, which already had the codegen markers + engine count table.

## Files touched

| File | Change | Stage |
|---|---|---|
| `src/core/engines/types.ts` | +Preset interface + presets?: Preset[] | 1 |
| `src/components/PresetChips.astro` | new file (33 lines) | 1 |
| `tests/dead-i18n-keys-guard.test.ts` | JSON import cast to Record | 1.5 |
| `src/engines/ai-cost/ai-image-generation-cost-calculator.ts` | -PRESETS const + presets[] field | 2a |
| `src/engines/ai-cost/ai-training-cost-estimator.ts` | -PRESETS const + presets[] field | 2b |
| `src/engines/ai-cost/gpu-cloud-cost-calculator.ts` | -PRESETS const + presets[] field | 2c |
| `src/engines/ai-cost/ai-api-cost-comparison.ts` | -PRESETS const + presets[] field | 2d |
| `src/pages/[lang]/[slug].astro` | -4 inline blocks + PresetChips call | 3 |
| `scripts/check-engine-count-by-category.mjs` | CLAUDE.md → AGENTS.md fallback | P150 follow-up |
| `AGENTS.md` | (already had codegen markers + table, no change) | — |
| `memory/p151-preset-chip-unification-shipped.md` | this file | post-ship |

## Architecture final decision

**Single source of truth for preset definitions: `engine.presets[]` field.**

Before P151:
- Each engine had `const PRESETS = {...}` (dead — never rendered)
- Each engine ALSO had inline JSX preset button arrays duplicated in `[slug].astro` (the actual rendered UI)
- i18n keys (`tools.${slug}.preset.${key}`) were orphaned (defined in translations.ts but no UI referenced them)

After P151:
- Single field on the engine: `presets?: Preset[]`
- Single Astro component renders them: `<PresetChips presets={engine.presets} slug={slug!} lang={lang} />`
- i18n lookup unified: `t(\`tools.${slug}.preset.${key}\`, lang)` inside the component

## Preset keys per engine (24 total)

| Engine | Keys |
|---|---|
| ai-image-generation-cost-calculator | `solopreneur / creator / agency / budget / logos / artistic` |
| ai-training-cost-estimator | `lora-7b / mid-13b / full-70b / enterprise-180b / budget-7b / pro-405b` |
| gpu-cloud-cost-calculator | `budget-single-gpu / standard-dev-box / training-rig-4xa100 / enterprise-h100 / cheapest-h200 / pro-8xh100` |
| ai-api-cost-comparison | `support-bot / rag-qa / code-review / content-gen / data-analysis / batch` |

All 24 keys verified present in both `src/i18n/locales/en.json` and `src/i18n/locales/zh.json` (en/zh match perfectly per engine).

## Verification

`pnpm check` final summary at `d0636f7`:
- typecheck: 0 P151-related errors. 7 master-pre-existing errors remain (zod 缺失 + build-og-images.ts Buffer type变化 + 2 implicit any) — unrelated to P151.
- check:i18n: ✅ 411 required + 230 dynamic + 100 engineKey=true engines fully translated
- codegen-examples --check: ✅ PASSED (all 100 engines in sync)
- codegen-customfn --check: ✅ No drift detected
- check-engine-count-by-category --check: ✅ PASSED (Layer 1 const map + Layer 2 total=100 + Layer 3 AGENTS.md snapshot)
- check-engine-coverage: ✅ 100 engines
- tests/run.mjs: ✅ 0 fail (19 skipped via skip-mode — `RUN_BUILD_TESTS` not set; 47 build-dep suites deferred to `pnpm test:build`)

## Net effect on codebase

| Dimension | Before | After |
|---|---|---|
| Dead code | 4 `const PRESETS` blocks (85 lines) | 0 |
| Inline preset JSX | 4 conditional blocks in [slug].astro (~67 lines) | 1 component call (4 lines) |
| Rendered preset UI source | 2 (engine const + inline JSX array, drifting) | 1 (engine.presets) |
| i18n key source | Orphans in translations.ts | Used by PresetChips component |
| Total lines | — | -63 in [slug].astro, +103/-143 across 8 files |

## Caveats / followups

1. **No client-side click handler**: master had no `fillForm` logic on the inline preset buttons (verified: no `preset-btn.addEventListener` or `click` handler in `src/scripts/*.client.ts`). P151 preserved this dead-UI state — clicking a chip is a no-op. Filling the form is a future P153+ candidate (would require a generic `applyPreset(btn)` function reading `data-*` attributes and setting form inputs).

2. **PresetChips emoji labels**: PresetChips reads emoji from `engine.presets[].emoji` field. The 24 emojis come from the original inline blocks (verified identical to `feat/ai-cost-preset-chip-unification` WIP). No i18n key for the emoji itself (emoji is universal).

3. **`isAiApiCostComparison` / `isImage` / `isTraining` / `isGpu` flag variables** in `[slug].astro` line 459-461 are now unused by the preset block but **still used** by the "Available:" model-hint section (e.g. `solopreneur-gpt-5-mini,...` for openai tokens). Kept for that purpose.

4. **Engine `presets[]` field is optional (`presets?: Preset[]`)** so adding presets to non-AI-cost engines is opt-in. Currently only the 4 AI cost engines have presets; the 24 other engines that have inline preset JSX in `[slug].astro` (burn-rate / mrr / churn-rate / etc.) are not migrated — out of P151 scope.

## Lessons learned

1. **Cherry-pick vs. rebuild tradeoff**: When a WIP branch is 8 months stale and conflicts on file paths (not just contents), cherry-picking wastes effort. The 11-commit WIP had only 1 cleanly-cherry-pickable commit (`471ff2b` types); the rest were manually re-implemented faster than force-resolving diffs.

2. **Kebab-case i18n key convention**: When the WIP branch used Title Case preset names (`'Quick LoRA 7B'`), but master had already migrated to kebab-case i18n keys (`tools.${slug}.preset.quick-lora-7b`), the migration **must** preserve the existing key shape to avoid invalidating 24 i18n entries. Always check the i18n key shape BEFORE re-keying in the engine code.

3. **No client-side handler = pure refactor**: Removing inline preset JSX without verifying click handlers is safe IF the inline JSX was always decorative. A grep for `preset-btn` in `src/scripts/*.client.ts` confirmed zero handlers — a necessary pre-condition for the refactor.

4. **Component-vs-inline decision**: Component wins when ≥3 sites duplicate identical markup + data. The 4 inline blocks had near-identical structure (label, container div, button array, button JSX) but slightly different data shapes — perfect candidate for a typed `<PresetChips>` driven by `engine.presets`.

## Reference

- WIP branch: `feat/ai-cost-preset-chip-unification` (June 2026, 11 commits, abandoned)
- AGENTS.md: `<!-- BEGIN FORGEFLOWKIT PROJECT CONSTITUTION -->` block contains v3 standard + 100 engine count invariants
- Defense-in-Depth matrix: `tests/` — preset-related guards (engineKey coverage, i18n completeness) already exist; P151 didn't add new guards
