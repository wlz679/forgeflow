# P49 — Engine Count per Category Table — Design

> **Status:** Design (brainstorming approved)
> **Date:** 2026-07-20
> **Author:** Claude (per user "继续" → P49 = Engine count per category table → A + A + A brainstorming choices)

## Goal

Codegen-enforce the engine-count-per-category invariant to close the P46 categories drift root cause class. Future AI sessions that modify `src/data/tools/*.ts` (add/remove/re-categorize engines) will be caught by both CI guard AND pre-commit hook, eliminating the "manually-updated CLAUDE.md claim drifts" failure mode that P46 had to audit away.

## Scope

| In scope | Out of scope |
|---|---|
| Per-category engine count invariant (15 categories) | Total cost / category-quality / v3 section counts |
| Standalone script that emits markdown table + verifies | Auto-rewrite of CLAUDE.md (deferred to P50+ if pattern proves valuable) |
| Pre-commit hook + pnpm check integration | UI dashboard / visualization |
| Drift guard test (mirrors P47 pattern at `tests/` root) | New categories (P49 doesn't add any) |
| CLAUDE.md table snapshot (copy-paste from script output, between codegen markers) | Live-render the table at runtime |
| Extend `tests/lib/engine-count.ts` with `EXPECTED_ENGINES_BY_CATEGORY` map (double-layer check) | Refactor existing `EXPECTED_ENGINE_COUNT` constant |

## Architecture

```
src/data/categories.ts          (15 canonical categories)
       ↓
src/data/tools/*.ts             (16 barrels, 100 ToolMeta entries, each with categoryId)
       ↓
scripts/check-engine-count-by-category.mjs
       ↓
  ┌────┴────┐
  ↓         ↓
stdout    --check mode → exit 0/1
(markdown
 table)
  ↓
CLAUDE.md table snapshot (between `<!-- codegen:start -->` / `<!-- codegen:end -->` markers)
  ↓
tests/engine-count-by-category.test.ts (drift guard, 7 assertions)
  ↓
pnpm check chain (slot 6)
  ↓
.githooks/pre-commit (slot 5, before codegen-examples)
```

## Files to Create/Modify

| Action | File | Purpose |
|---|---|---|
| MODIFY | `tests/lib/engine-count.ts` | Add `EXPECTED_ENGINES_BY_CATEGORY: Record<string, number>` (extends existing const) |
| CREATE | `scripts/check-engine-count-by-category.mjs` | Standalone script: count + emit table + `--check` mode |
| MODIFY | `package.json` | Add `check:engines-by-category` script + insert into `pnpm check` chain (slot 6, after check-i18n-completeness) |
| MODIFY | `CLAUDE.md` | Replace L41 "92 business + 8 AI cost" with new auto-generated table (between codegen markers) |
| CREATE | `tests/engine-count-by-category.test.ts` | Drift guard test (mirrors P47 pattern at `tests/` root) |
| MODIFY | `.githooks/pre-commit` | Add `check:engines-by-category` before `codegen-examples --check` |

## Script Interface

`scripts/check-engine-count-by-category.mjs`:

```bash
# Default mode: emit markdown table to stdout, exit 0
node scripts/check-engine-count-by-category.mjs

# Verify mode: assert CLAUDE.md snapshot matches + const matches ToolMeta, exit 0/1
node scripts/check-engine-count-by-category.mjs --check
```

**Output format** (markdown table, sorted by category letter):
```markdown
| Letter | Category Name | Engine Count |
|--------|---------------|--------------|
| A      | SaaS Metrics              | 30 |
| B      | AI Cost Tools             |  8 |
| C      | Valuation & Exit          |  7 |
| D      | Freelance Pricing         |  6 |
| E      | Cost & Efficiency         |  3 |
| F      | Investment & Real Estate  |  6 |
| H      | Hiring & Team             |  6 |
| K      | Knowledge                 |  6 |
| L      | Legal & Compliance        |  6 |
| M      | Marketing Analytics       |  6 |
| O      | Operations                |  6 |
| P      | Product Analytics         |  6 |
| R      | Retention & Customer Success | 6 |
| S      | Sales                     |  6 |
| T      | Customer Support          |  6 |
| **Total** |                       | **100** |
```

(Actual numbers above are illustrative; script derives from current ToolMeta state. Initial run will reveal true counts.)

## Constants Design

`tests/lib/engine-count.ts` — add after existing `EXPECTED_ENGINE_COUNT`:

```typescript
// P49: per-category engine count map. Double-layer check alongside
// EXPECTED_ENGINE_COUNT (P22b). When a future batch adds/removes/re-
// categorizes engines, this map is the canonical declaration; the
// script (scripts/check-engine-count-by-category.mjs) emits it as a
// markdown table for CLAUDE.md, and tests/engine-count-by-category.test.ts
// asserts the runtime ToolMeta state matches.
//
// Initial values derived from `node scripts/check-engine-count-by-category.mjs`
// on 2026-07-20 (P49 ship day). Update via:
//   1. Edit src/data/tools/*.ts (add/remove/re-categorize engine)
//   2. Update this map
//   3. Run `node scripts/check-engine-count-by-category.mjs` to get new table
//   4. Copy-paste table into CLAUDE.md between `<!-- codegen:start -->` markers
export const EXPECTED_ENGINES_BY_CATEGORY: Record<string, number> = {
  A: 30,  // SaaS Metrics
  B:  8,  // AI Cost Tools
  // ... 13 more categories
};
```

**Double-layer rationale**:
- `EXPECTED_ENGINE_COUNT = 100` catches "total changed"
- `EXPECTED_ENGINES_BY_CATEGORY` catches "total stayed 100 but category distribution shifted"
- Together: full structural invariant enforcement

## CLAUDE.md Integration

Replace current L41:
```
**v3 status (P16 milestone locked 2026-07-15/16):** All 100 engines at the v3 standard. 8 AI cost engines meet the AI Cost v3 variant; 92 business engines meet the Business v3 variant (across 15 categories). UI wiring (`BIZ_CONFIG_MAP` + 4 `BIZ_*_CONFIG` + 205 preset-chip references) and i18n (15 × 6 preset keys per engine) complete. Historical batch reference: see `docs/superpowers/plans/2026-06-22-close-v3-gap-7-business-calculators.md` for the original 7-batch close.
```

With:
```
**v3 status (P16 milestone locked 2026-07-15/16):** All 100 engines at the v3 standard. Engine count per category:

<!-- codegen:start engine-count -->
| Letter | Category Name | Engine Count |
|--------|---------------|--------------|
| A | SaaS Metrics | 30 |
| B | AI Cost Tools | 8 |
| ... |
| **Total** | | **100** |
<!-- codegen:end -->

8 AI cost engines meet the AI Cost v3 variant; 92 business engines meet the Business v3 variant (across 15 categories). UI wiring (...) and i18n (...) complete. Historical batch reference: see `docs/superpowers/plans/2026-06-22-close-v3-gap-7-business-calculators.md` for the original 7-batch close.
```

The markers allow `--check` mode to diff cleanly against expected output.

## Drift Guard Test

`tests/engine-count-by-category.test.ts` (at `tests/` root, mirrors P47 pattern):

| # | Assertion | Type |
|---|---|---|
| T1 | `EXPECTED_ENGINE_COUNT === sum(EXPECTED_ENGINES_BY_CATEGORY.values)` | Cross-const consistency |
| T2 | `Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length === categories.length` (15) | Categories covered |
| T3 | Each category in `categories.ts` has a key in `EXPECTED_ENGINES_BY_CATEGORY` | Reverse mapping |
| T4 | Each ToolMeta entry's `categoryId` exists in `categories.ts` | No orphan categories |
| T5 | `tools.length === EXPECTED_ENGINE_COUNT` (100) | Runtime match total |
| T6 | `sum(groupBy(tools, 'categoryId').values) === EXPECTED_ENGINE_COUNT` | Runtime match per-cat sum |
| T7 | `node scripts/check-engine-count-by-category.mjs --check` exits 0 | Integration smoke |

Test runs under `node --import tsx tests/engine-count-by-category.test.ts` (matches P47 pattern). Lives at `tests/` root so `tests/run.mjs` picks it up (P22b ESM trap avoidance).

## Verification Plan

| Step | Command | Pass criterion |
|---|---|---|
| 1 | `node scripts/check-engine-count-by-category.mjs` | Markdown table prints to stdout, exit 0 |
| 2 | Copy-paste table into CLAUDE.md between markers | Visual review |
| 3 | `node scripts/check-engine-count-by-category.mjs --check` | Exit 0, "PASSED" message |
| 4 | `node --import tsx tests/engine-count-by-category.test.ts` standalone | 7/7 pass |
| 5 | `pnpm check` | 1110 pass / 0 fail / 0 skip (+7 over P47 baseline) |
| 6 | `node --import tsx tests/codegen-drift-guard.test.ts` standalone | P47 test still passes (no regression) |
| 7 | Mutate `EXPECTED_ENGINES_BY_CATEGORY['A'] = 31` + run guard | FAIL (then restore) |
| 8 | Pre-commit hook fires on staged CLAUDE.md change | Hook reports engine-count-by-category OK |

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| Pre-commit hook order conflict | Low | Insert before `codegen-examples --check` (lighter weight, no deps on it) |
| Marker text drift in CLAUDE.md | Low | `--check` fails fast if markers missing → operator must update markers first |
| New category added without updating const | Medium | T3 catches immediately at test run |
| Per-category count drift | Medium | T5+T6 catch at test run |
| Script runtime > 5s (acceptable for pnpm check) | Low | Script reads small TS files via tsx (proven pattern from codegen-examples.mjs) |
| `tools` barrel re-export adds ambiguity | Low | Script uses `src/data/tools/index.ts` aggregate, not individual barrels |

## Why NOT Auto-Rewrite CLAUDE.md

Considered auto-edit (script detects marker content, replaces, writes file). Rejected because:
1. Merge conflict risk — auto-edit during commit creates noisy diffs in human-facing docs
2. CLAUDE.md is hand-curated; auto-rewrite violates "human review gate" pattern
3. P-series prefers "detect-then-warn" over "auto-fix" (P23 OG samples: detection + manual regen)
4. P46 audit batch showed CLAUDE.md prose + table can coexist with snapshot pattern (history callout preserved)

The copy-paste pattern (script emits → operator commits table) matches existing codegen pattern (codegen-examples.mjs emits → operator regenerates examples). Familiar workflow.

## P50+ candidates (for future planning)

- `tests/codegen-customfn-drift-guard.test.ts` (same pattern as P47; closes P40 INDEX flagged drift concern)
- Move `tests/lib/engine-count.test.ts` to `tests/engine-count.test.ts` (P22b subdir inconsistency cleanup; both `engine-count.test.ts` and `engine-count-by-category.test.ts` should live at root)
- `scripts/check-ai-cost-by-model.mjs` — analogous table for AI cost engines per LLM provider (uses `src/data/ai-pricing.json` as source of truth; analogous structural invariant for the 8 data-driven engines)

## See also

- [p46-categories-drift-audit-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p46-categories-drift-audit-shipped.md) — P46 categories audit that flagged this invariant gap
- [p48-claude-md-lessons-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p48-claude-md-lessons-shipped.md) — P48 ship (previous batch; established cascade audit + plan amendment patterns)
- [p47-codegen-drift-guard-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p47-codegen-drift-guard-shipped.md) — P47 drift-guard pattern (template for P49 test)
- [p22b-engine-count-constant-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p22b-engine-count-constant-shipped.md) — P22b EXPECTED_ENGINE_COUNT constant origin
- [p27-memory-audit-pass-shipped.md](../../../.claude/projects/D--E-----youtube-tools/memory/p27-memory-audit-pass-shipped.md) — cascade audit pattern formalized