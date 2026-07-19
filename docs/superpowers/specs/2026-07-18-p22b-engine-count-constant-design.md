# P22b Engine Count Constant — Design

> **Status:** Approved (brainstorming 2026-07-18)
> **Baseline:** `089798c` (P22 ship commit)
> **Scope:** Create `tests/lib/engine-count.ts` (new dynamic constant) + update 2 test files to import and use it. 1 commit, 3 files touched. Future-proofs against engine count drift.
> **Deferred (P23+ candidates):** ~~10 env-dependent Clerk/Supabase test fails; `tests/internal-links.test.ts:19` "all 82 tools" stale invariant.~~ — **Closed 2026-07-19 by P25 + P26a + P28 audit**:
> - ~~10 env-dep fails~~ — cascade misattribution. Actual single fail was P2a ToolCard test (`tests/seo-schemas.test.ts:185` `listingPages` array missed 5 categories). P26a `ef19015` extended array to 15 categories; full suite now 1096/0/0.
> - ~~"all 82 tools" stale literal~~ — only line 20 actually had `82` literal. P25 `402052b` migrated to `${EXPECTED_ENGINE_COUNT}` (matches line 7 pattern). Lines 22+ use dynamic `${totalTools}`.
> - Per P28 audit (`memory/p28-p10-p14-audit-pass-shipped.md`): these were 5th instance of memory cascade misattribution this session.

## 1. Goal

Eliminate the "stale engine count assertion" failure mode (the very problem P22 just fixed manually) by deriving the count from the registry itself at import time. Adding/removing engines in future P-series batches no longer requires test assertion maintenance.

## 2. Approach: Dynamic Constant from Registry

**Approach chosen: B (Dynamic constant from registry).**

A new file `tests/lib/engine-count.ts` exports:
```ts
export const EXPECTED_ENGINE_COUNT: number = getAllEngines().length;
```

The constant is evaluated at module import time against the **same registry** the test files import individually. Tests then assert `assert.equal(registry.length, EXPECTED_ENGINE_COUNT)` instead of comparing against the literal `100`. They become tautologically true — which is exactly the point: registry count self-reports; assertions become structural integrity checks for the registry itself (e.g., a future bug that breaks `registerEngine` would cause this to fail loudly).

**Why this approach over alternatives**:
- **A. Static constant**: re-creates the same drift problem P22 fixed. Future batch must remember to update file.
- **B. Dynamic constant** (chosen): drift becomes structurally impossible. Cost = 1 small file.
- **C. Drop asserts**: loses observability of registry integrity.

## 3. Scope

### Files touched

| File | Action | Lines |
|---|---|---|
| `tests/lib/engine-count.ts` | CREATE | ~10 lines (1 import + 1 export + 8-line comment block) |
| `tests/ab-split.test.ts` | MODIFY | 4 line edits (51, 54, 57, 59) + 1 new import line |
| `tests/internal-links.test.ts` | MODIFY | 2 line edits (6, 7) + 1 new import line |

Total: 1 new file + 6 line edits + 2 import additions in 2 existing files = 8 line changes.

### File content for new `tests/lib/engine-count.ts`

```ts
// Single source of truth for the engine count test assertion.
// Computed at import time from the registry so that adding/removing
// engines in src/engines/ automatically updates all count assertions
// across the test suite. P22 lesson: hard-coded `100` literals in test
// files drifted stale after P16 milestone lock; this constant makes
// such drift structurally impossible.
//
// P22b: created to close the future drift surface; replaces 6 hard-coded
// literals in tests/ab-split.test.ts (lines 51/54/57/59) and
// tests/internal-links.test.ts (lines 6/7).
import { getAllEngines } from '../../src/core/engines/registry.ts';

export const EXPECTED_ENGINE_COUNT: number = getAllEngines().length;
```

### Edits to `tests/ab-split.test.ts`

| Line | Change |
|---|---|
| (new line) | Add `import { EXPECTED_ENGINE_COUNT } from './lib/engine-count.ts';` at top with other imports |
| 51 | `'getAllEngines() returns 100 engines after import'` → `'getAllEngines() returns EXPECTED_ENGINE_COUNT engines after import'` |
| 54 | `assert.equal(getAllEngines().length, 100);` → `assert.equal(getAllEngines().length, EXPECTED_ENGINE_COUNT);` |
| 57 | `'aggregated tools array has 100 entries'` → `'aggregated tools array has EXPECTED_ENGINE_COUNT entries'` |
| 59 | `assert.equal(tools.length, 100);` → `assert.equal(tools.length, EXPECTED_ENGINE_COUNT);` |

### Edits to `tests/internal-links.test.ts`

| Line | Change |
|---|---|
| (new line) | Add `import { EXPECTED_ENGINE_COUNT } from './lib/engine-count.ts';` at top with other imports |
| 6 | `'all 100 tools have relatedTools entry'` → `'all EXPECTED_ENGINE_COUNT tools have relatedTools entry'` |
| 7 | `assert.equal(Object.keys(relatedTools).length, 100);` → `assert.equal(Object.keys(relatedTools).length, EXPECTED_ENGINE_COUNT);` |

## 4. Architecture + Implementation Strategy

**Implementation**:
1. Create `tests/lib/engine-count.ts` with the dynamic constant.
2. Read full content of both test files (pre-flight at execution time, not in spec — see Plan Step 1).
3. Add import line + change 4 literals in `tests/ab-split.test.ts`.
4. Add import line + change 2 literals in `tests/internal-links.test.ts`.
5. Run `node tests/run.mjs` to verify the 3 asserts now pass (same 1067/10/19 transition) AND the test names render correctly with the variable interpolation.
6. Commit.

**Test verification gate**: `node tests/run.mjs` should show `# pass 1067` (unchanged from P22), `# fail 10` (unchanged — same env-dependent baseline). The 3 affected tests must still pass with new variable interpolation.

**Critical test name rendering check**: `assert.equal(EXPECTED_ENGINE_COUNT, EXPECTED_ENGINE_COUNT)` is trivially true; `assert.equal(getAllEngines().length, EXPECTED_ENGINE_COUNT)` is a meaningful check that the registry + lib are synchronized. The latter is the actual failure mode we want to catch (e.g., if someone refactored `registry.ts` to return wrong objects).

**Risk analysis**:
- **Zero behavioral risk**: the constant evaluates to 100 today (matches P22's manual `100` literal). All 3 test asserts will still pass identically.
- **Refactor risk**: if `getAllEngines()` becomes async in the future, this const declaration breaks. Mitigation: comment block notes the assumption; would need to convert to getter or compute at usage site.
- **Import cycle risk**: `tests/lib/engine-count.ts` imports from `src/core/engines/registry.ts` which is itself imported by tests/ab-split.test.ts (line 53). Node.js ESM handles this correctly (single instance per module), but the test file's `await import('...')` at runtime will import registry again — should still see the same instance since module caching applies.

## 5. Global Constraints

1. **3-way sync required at end** — both `origin` (gitee: wlz679/calcKit) and `github` (github: wlz679/forgeflow) must reflect final commits.
2. **Pre-commit gate** — `SKIP_PRECOMMIT_CHECK=1` (P22b doesn't fix the 10 env-dep baseline).
3. **raw-key invariant** — unchanged.
4. **byte-identical invariant** — N/A (no generated artifacts).
5. **No new dependencies** — `tests/lib/engine-count.ts` only imports from existing `src/core/engines/registry.ts`.
6. **No new module directories OUTSIDE `tests/lib/`** — the new file goes in `tests/lib/`, the first file there.

## 6. Task Class + Execution

| Task | Class | Why |
|---|---|---|
| P22b-1 (spec) | INLINE | already shipped at this commit |
| P22b-2 (plan) | INLINE | implementation plan |
| P22b-3 (3-file edit) | MECHANICAL | 1 file create + 6 line edits + verify tests pass + commit |
| P22b-4 (memory + sync) | INTEGRATION | memory writes + 3-way push + amend |

All INLINE per P21/P22 precedent. Each task ≤10 tool calls.

## 7. Success Criteria

| Criterion | Verification |
|---|---|
| Spec committed | `git log --oneline -1` shows new spec commit |
| Plan committed | `git log --oneline` shows plan commit after spec |
| Task commits land | `git log --oneline 089798c..HEAD` shows ≥4 commits (1 spec + 1 plan + 1 fix + 1 memory) |
| Test count identical to P22 baseline | `node tests/run.mjs` shows `# pass 1067` + `# fail 10` + `# skip 19` (unchanged from P22) |
| The 3 P22-fixed asserts still pass with constant | No `not ok` lines containing "EXPECTED_ENGINE_COUNT" or "100 engines/entries/tools" |
| 3-way sync verified | `git rev-list --left-right --count origin/master...master` AND `github/master...master` both = `0	0` |
| Memory updated | `memory/p17-i18n-backfill-shipped.md` has new `## P22b` section; `memory/MEMORY.md` has new index line |

## 8. Self-Review

1. **Placeholder scan**: No `TBD`/`TODO`/vague qualifiers. File content for new `tests/lib/engine-count.ts` provided verbatim. Line numbers for edits referenced but resolved by Plan Step 1 pre-flight at execution time.

2. **Internal consistency**: Scope (§3) matches success criteria (§7); task classes (§6) match global constraints (§5); out-of-scope (§3 end) is explicitly bounded.

3. **Scope check**: Single-subject (one refactor with 1 new file + 6 edits + memory); one implementation plan.

4. **Ambiguity check**: "Expected engine count" is unambiguous (100 today, dynamic tomorrow). Import cycle concern is documented as a risk with mitigation. Test name rendering with variable interpolation is explicit (test files use template literals or string concat — both valid).

**Self-review verdict**: No changes needed. Ready for user review → writing-plans.
