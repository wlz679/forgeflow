# A+B Split — engines/ Subdirectories + tools.ts Multi-File — Design Spec

**Date**: 2026-06-26
**Status**: Draft (pending user review)
**Author**: brainstorming session
**Scope**: Reorganize `src/engines/` (32 files flat → 6 subdirectories) and split `src/data/tools.ts` (467 lines single file → 6 category files + index.ts). Zero public API change, zero consumer migration, zero data drift.
**Roadmap position**: Second major refactor in the infrastructure-layer series. Blocked-by is `2026-06-26-drift-fix-engines-category-design.md` (already completed in commits `db616a8` + `68f9e20`).

---

## Problem

`src/engines/` is a flat directory of 32 engine files plus a 32-line manual `import './X'` list in `engines/index.ts`. As the engine count grows toward 100+ (per project roadmap), this organization becomes painful:

- Hard to scan for "all SaaS metric engines" — no visual grouping
- Adding a new engine requires 2 edits: create file + add import line in `index.ts`
- Manual import list will drift from actual files (similar bug class to the just-fixed `category` field drift)

`src/data/tools.ts` is a single 467-line file holding 32 `ToolMeta` entries inline. Issues:

- 4 consumers all need the full 32-entry array
- Single file forces everyone to load everything (no tree-shaking by category)
- No clear ownership per category
- 467 lines is past the "comfortable single-file read" threshold

**Pre-conditions already met:**

- `tools.ts` `categoryId` is the sole source of truth for tool category (drift fixed in `db616a8`)
- 32 engines have stable slugs (no rename needed)
- 4 consumers use only `tools: ToolMeta[]` export (verified by grep)

## Goals

1. **Visual grouping**: 6 subdirectories of `engines/` match the 6 business categories A-F
2. **Zero manual import lists**: `engines/index.ts` and `tools/index.ts` use `import.meta.glob` for auto-aggregation
3. **Zero public API change**: consumer import paths unchanged (e.g. `from './tools'` still works because TS resolves to `tools/index.ts`)
4. **Zero data drift risk**: split is mechanical; no `categoryId` re-mapping, no slug rename
5. **Tree-shakeable by category**: each category file is independently importable (e.g. `import { tools as saas } from './data/tools/saas'`)
6. **Total diff manageable**: ~470 lines redistributed across 14 files (6 engines subdirs already exist as dirs, 6 tools files + 1 index + 1 types), no net new files added beyond the new subdirectories

## Non-Goals

- ❌ Reorganize `src/components/` (deferred to a separate spec)
- ❌ Change `categoryId` values (A-F preserved exactly)
- ❌ Change any slug (32 `solopreneur-...-calculator` slugs preserved)
- ❌ Touch `i18n/translations.ts` (keys are slug-derived, slugs unchanged)
- ❌ Modify `application-categories.ts` or `internal-links.ts` (consumers, not affected)
- ❌ Modify `blog-posts.ts` (consumer of `tools` array, import path unchanged)
- ❌ Modify OG image system (`public/og/`)
- ❌ Modify any engine's `calculate()` / `customFn` / `staticExamples` / `faq` / `howToUse` business logic
- ❌ Modify any visual / UI element
- ❌ Rename any engine file (preserve `cac-calculator.ts` form, just move it)
- ❌ Add a new category beyond A-F (32 tools fit cleanly into the 6 existing)

## Design

### Section 1: Architecture overview

```
BEFORE                              AFTER
src/engines/                        src/engines/
  cac-calculator.ts                   saas/
  ltv-calculator.ts                     burn-rate-calculator.ts
  mrr-calculator.ts                     churn-rate-calculator.ts
  ... (32 flat files)                   market-size-estimator.ts
                                        mrr-calculator.ts
  index.ts (32 hand-written imports)    revenue-projector.ts
                                      ai-cost/
                                        openai-token-calculator.ts
                                        claude-api-cost-calculator.ts
                                        deepseek-api-cost-calculator.ts
                                        gemini-api-cost-calculator.ts
                                        ai-image-generation-cost-calculator.ts
                                        ai-training-cost-estimator.ts
                                        gpu-cloud-cost-calculator.ts
                                        ai-api-cost-comparison.ts
                                      valuation/
                                        [9 files]
                                      freelance/
                                        [3 files]
                                      cost/
                                        [3 files]
                                      investment/
                                        [4 files]
                                      index.ts (import.meta.glob, 4 lines)

src/data/tools.ts (467 lines)        src/data/tools/
                                        saas.ts         (5 entries, A)
                                        ai-cost.ts      (8 entries, B)
                                        valuation.ts    (9 entries, C)
                                        freelance.ts    (3 entries, D)
                                        cost.ts         (3 entries, E)
                                        investment.ts   (4 entries, F)
                                        types.ts        (ToolMeta interface)
                                        index.ts        (import.meta.glob, 8 lines)
                                      (src/data/tools.ts DELETED)
```

**Core mechanism:**
- `engines/index.ts` uses `import.meta.glob('./*/*.ts', { eager: true })` to auto-aggregate engine files from all subdirectories
- `tools/index.ts` uses `import.meta.glob('./*.ts', { eager: true })` to auto-aggregate sibling category files
- Zero codegen scripts, zero manual maintenance

### Section 2: engines/ split details

**32 files → 6 subdirectories mapping (by `categoryId`):**

| Subdirectory | categoryId | Files | Engines |
|---|---|---:|---|
| `engines/saas/` | A | 5 | burn-rate, churn-rate, market-size, mrr, revenue-projector |
| `engines/ai-cost/` | B | 8 | openai-token, claude-api, deepseek-api, gemini-api, ai-image, ai-training, gpu-cloud, ai-api-comparison |
| `engines/valuation/` | C | 9 | unit-economics, cac, ltv, saas-valuation, break-even, course-pricing, email-list-revenue, project-profitability, saas-pricing-planner |
| `engines/freelance/` | D | 3 | affiliate-income, freelance-rate, hourly-vs-fixed |
| `engines/cost/` | E | 3 | employee-cost, meeting-cost, productivity-score |
| `engines/investment/` | F | 4 | equity-dilution, freelance-tax, sponsorship-rate, time-value |

Total: 5 + 8 + 9 + 3 + 3 + 4 = **32** ✓

**File name convention:** preserve current `xxx-calculator.ts` form (already without `solopreneur-` prefix). No engine file is renamed. Slug is unchanged: `solopreneur-cac-calculator` stays the same, so all i18n keys remain valid.

**`engines/index.ts` new content (32 hand-written imports → 4 lines):**

```ts
// Auto-aggregate all engines from subdirectories.
// import.meta.glob is Vite/Astro-native: zero maintenance, zero runtime cost.
// Side effects (registerEngine) run on import; the return value is intentionally unused.
import.meta.glob<unknown>('./*/*.ts', { eager: true });
```

**Key behavior:**
- `./*/*.ts` pattern matches all `.ts` files inside any first-level subdirectory of `engines/`
- Does NOT match `engines/index.ts` itself (it lives at the root, not inside a subdirectory)
- `eager: true` is equivalent to a static `import` — it triggers the top-level `registerEngine(engine)` call in each engine file
- TypeScript strict mode accepts this because the call has side effects (Vite treats it as an `import` statement for lint purposes)

### Section 3: tools.ts split details

**6 category files + 1 types + 1 index:**

| File | Lines (approx) | Entries | categoryId |
|---|---:|---:|---|
| `src/data/tools/types.ts` | ~10 | (interface) | — |
| `src/data/tools/saas.ts` | ~70 | 5 | A |
| `src/data/tools/ai-cost.ts` | ~120 | 8 | B |
| `src/data/tools/valuation.ts` | ~140 | 9 | C |
| `src/data/tools/freelance.ts` | ~40 | 3 | D |
| `src/data/tools/cost.ts` | ~30 | 3 | E |
| `src/data/tools/investment.ts` | ~50 | 4 | F |
| `src/data/tools/index.ts` | ~10 | (aggregator) | — |

Total: 32 entries preserved.

**Each category file structure (example: `saas.ts`):**

```ts
import type { ToolMeta } from './types';

export const tools: ToolMeta[] = [
  {
    slug: 'solopreneur-burn-rate-calculator',
    title: 'Burn Rate Calculator',
    description: '...',
    categoryId: 'A',
    applicationCategory: 'BusinessApplication',
    inputs: [...],
  },
  // ... 4 more entries
];
```

**`tools/types.ts` content (moved from `src/data/tools.ts:1-8`):**

```ts
export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  applicationCategory: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
}
```

**`tools/index.ts` content (aggregator):**

```ts
import type { ToolMeta } from './types';

// Auto-aggregate all ToolMeta entries from sibling category files.
// import.meta.glob is Vite/Astro-native: zero maintenance, zero runtime cost.
// Side effect of each sibling file is a top-level `export const tools: ToolMeta[] = [...]`.
// `index.ts` itself doesn't export `tools` named, so it is naturally filtered out.
const modules = import.meta.glob<{ tools?: ToolMeta[] }>('./*.ts', { eager: true });

export const tools: ToolMeta[] = Object.values(modules)
  .filter((m): m is { tools: ToolMeta[] } => Array.isArray(m.tools))
  .flatMap(m => m.tools);

export type { ToolMeta };
```

**Why the `Array.isArray` filter is required:** Vite's `import.meta.glob` with `eager: true` matches all files in the pattern, including the file containing the glob call itself. At the moment `index.ts` is being evaluated, its own `tools` export is still `undefined` (not yet assigned), so `modules['./index.ts'].tools` is `undefined`. The filter cleanly excludes it.

**Consumer impact: ZERO changes required.**

| Consumer | Current import | After A+B |
|---|---|---|
| `src/data/blog-posts.ts` | `from './tools'` | `from './tools'` (unchanged — TS resolves to `tools/index.ts`) |
| `src/data/internal-links.ts` | `from './tools'` | `from './tools'` (unchanged) |
| `src/pages/[lang]/index.astro` | `from '../../data/tools'` | `from '../../data/tools'` (unchanged) |
| `src/pages/[lang]/[slug].astro` | `from '../../data/tools'` | `from '../../data/tools'` (unchanged) |

TypeScript's default module resolution algorithm checks `tools.ts` first, then `tools/index.ts`. Deleting `tools.ts` and creating `tools/index.ts` is a transparent transition.

### Section 4: Verification + Non-Goals + Acceptance Criteria

See "Files Touched", "Acceptance Criteria", and "Risks & Mitigations" sections below.

## Files Touched

| File | Status | Lines (approx) | Notes |
|---|---|---:|---|
| `src/engines/index.ts` | Modify | 33 → 4 | Hand imports → `import.meta.glob` |
| `src/engines/*.ts` × 32 | Move (no content change) | 0 net | Move to 6 subdirs |
| `src/engines/saas/` | Create (dir + 5 files moved) | — | A category |
| `src/engines/ai-cost/` | Create (dir + 8 files moved) | — | B category |
| `src/engines/valuation/` | Create (dir + 9 files moved) | — | C category |
| `src/engines/freelance/` | Create (dir + 3 files moved) | — | D category |
| `src/engines/cost/` | Create (dir + 3 files moved) | — | E category |
| `src/engines/investment/` | Create (dir + 4 files moved) | — | F category |
| `src/data/tools.ts` | Delete | −467 | Replaced by `tools/index.ts` |
| `src/data/tools/types.ts` | Create | +10 | ToolMeta interface (moved from tools.ts:1-8) |
| `src/data/tools/saas.ts` | Create | +70 | 5 A entries |
| `src/data/tools/ai-cost.ts` | Create | +120 | 8 B entries |
| `src/data/tools/valuation.ts` | Create | +140 | 9 C entries |
| `src/data/tools/freelance.ts` | Create | +40 | 3 D entries |
| `src/data/tools/cost.ts` | Create | +30 | 3 E entries |
| `src/data/tools/investment.ts` | Create | +50 | 4 F entries |
| `src/data/tools/index.ts` | Create | +10 | Aggregator (import.meta.glob) |

**Net change:** 7 new subdirectories (6 engines + 1 tools), 8 new files (6 category + types + index), 1 file deletion (tools.ts), 32 files moved. **Zero net content added** (all category data is redistributing existing 467 lines; 50 lines net for the new aggregators and types).

## Acceptance Criteria

- [ ] 6 subdirectories created: `src/engines/{saas,ai-cost,valuation,freelance,cost,investment}/`
- [ ] 32 engine files correctly classified into 6 subdirectories (5/8/9/3/3/4)
- [ ] `engines/index.ts` uses `import.meta.glob('./*/*.ts', { eager: true })`; old 32-line import list removed
- [ ] `src/data/tools.ts` deleted
- [ ] `src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts` created; content is the existing 32 entries split by `categoryId`
- [ ] `src/data/tools/index.ts` created with `import.meta.glob('./*.ts', { eager: true })` aggregator
- [ ] `src/data/tools/types.ts` created with `ToolMeta` interface
- [ ] `pnpm typecheck` exits 0
- [ ] `pnpm test:unit` passes (21/21 expected, including `blog-hero-image.test.ts`)
- [ ] `pnpm check` exits 0 (codegen-examples + codegen-customfn no drift)
- [ ] `pnpm build` produces 141 static pages
- [ ] 4 consumers' import paths unchanged (verify by `grep` that no file references `'./tools'` or `'../../data/tools'` has been edited to add `/index`)
- [ ] `getAllEngines().length === 32` (verified at runtime in test or build)
- [ ] `tools.length === 32` from `src/data/tools/index.ts`
- [ ] Spot check `dist/en/solopreneur-cac-calculator/index.html`: `applicationCategory` = `FinanceApplication`; RelatedTools shows ltv/unit-economics/saas-valuation/break-even
- [ ] Spot check `dist/en/solopreneur-openai-token-calculator/index.html`: `applicationCategory` = `DeveloperApplication`; RelatedTools shows AI Cost tools
- [ ] Spot check `dist/en/blog/best-solopreneur-time-value-calculator/index.html`: contains `<img src="/og/solopreneur-time-value-calculator-en.png" ...>`

## Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Vite `import.meta.glob` self-imports `index.ts`, causing circular reference | Medium | `Array.isArray(m.tools)` filter in `tools/index.ts` cleanly excludes self (its own `tools` is `undefined` at evaluation time) |
| `engines/index.ts` `import.meta.glob` doesn't trigger `registerEngine` side effects | Low | `eager: true` is documented to be equivalent to static `import`; side effects always run |
| TypeScript strict mode warns about unused `import.meta.glob` return value | Low | The glob call is treated as an import statement (has side effects) for lint purposes; no warning |
| File moves lose git history (treated as delete + add instead of rename) | Medium | Use `git mv` for each file move (preserves history); commit moves separately from content changes |
| A category file gets mis-classified entries (e.g. C tool in saas.ts) | Low | Plan specifies strict 1:1 mapping by `categoryId` (drift-fixed, so data is trustworthy); implementer verifies by cross-check |
| `types.ts` location change breaks other importers of `ToolMeta` | Low | `grep -r "ToolMeta" src/` shows only `tools.ts` defines/uses it; after move only `tools/*.ts` import it |
| New subdirectories ignored by `tsc` include patterns | Low | `tsconfig.json` includes `src/**/*.ts` glob; new subdirs are auto-included |
| `engines/index.ts` glob pattern matches itself (e.g. if pattern becomes too broad) | Low | Pattern is `./*/*.ts` (one level deep, subdirs only); `engines/index.ts` is at the root, not matched |
| 141 pages count changes (any page not built or extra page built) | Low | `pnpm build` reports the count; explicit acceptance criterion checks it stays at 141 |
| Component or layout change required for the refactor | Very Low | Out of scope by spec; consumer import paths verified unchanged |

## Open questions

None. All design decisions confirmed during brainstorming session 2026-06-26:
- 6 subdirectory names: `saas/`, `ai-cost/`, `valuation/`, `freelance/`, `cost/`, `investment/` (1:1 A-F mapping)
- Merge mechanism: `import.meta.glob` with `eager: true`
- tools.ts split granularity: 6 category files matching engines subdirs (1:1 symmetry)