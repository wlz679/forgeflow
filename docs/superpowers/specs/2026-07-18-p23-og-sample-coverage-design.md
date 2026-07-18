# P23 OG-Sample Coverage — Design

> **Status:** Approved (brainstorming 2026-07-18)
> **Baseline:** `ace65f1` (P22b Engine Count Constant ship)
> **Scope:** 4-file fix — 1 JSON backfill (2 entries) + 1 build script improvement (collect-all-then-throw) + 1 new coverage check script + 1 precommit hook line. Unlocks 5 build-dependent test failures as side effect.
> **Deferred (P23+ candidates):** 5 env-dependent Clerk/Supabase fails (unchanged baseline); og-card text quality audit on the 2 new entries; `tests/internal-links.test.ts:19` "all 82 tools" stale literal.

## 1. Goal

Eliminate the `Missing og-sample` build cascade by backfilling 2 missing entries in `src/data/og-samples.json`, upgrading `scripts/build-og-images.ts` to report ALL missing slugs (not just the first), and adding a precommit guard that prevents future drift. Convert "every tool has an og-sample" from an implicit P-series convention into a CI-enforced contract.

## 2. Approach: Backfill + Improve + Guard

**Approach chosen: B+C combined** (per brainstorming recap §1).

| Component | What | Why |
|---|---|---|
| Backfill | Add `solopreneur-coupon-attribution-calculator` and `solopreneur-cart-abandonment-cost-calculator` to `src/data/og-samples.json` | These were both missed in P16 batch (verified by `scripts/.scratch/find-missing-og.ts: 99/100`) |
| Improve | Move the per-render "missing og-sample" check in `scripts/build-og-images.ts:149-150` to an upfront collect-all-then-throw in `main()` | The old code threw at the first missing slug, hiding cart-abandonment behind coupon-attribution |
| Guard | New `scripts/check-og-samples-coverage.mjs` (~35 LOC) that exits non-zero if any tool slug has no og-sample (or vice versa) | Prevents future drift — once a batch omits og-sample for an engine, precommit fails the commit before push |
| Hook | +1 line in `.githooks/pre-commit` to invoke the guard before commit | Per CLAUDE.md "Pre-commit hook" documented pattern |

**Why not alternative D** (engine registry validation in `src/core/engines/registry.ts`):
- Cross-cutting framework change — touches 100 engine files
- Validation belongs at the data layer (JSON files), not the code layer (engine registration)
- Scope creep — `registerEngine()` is well-tested and battle-proven across P6-P22b; modifying it for a data-completeness check risks regression
- Test runner already has `tests/ab-split.test.ts` that asserts `tools.length === EXPECTED_ENGINE_COUNT`; adding a parallel JSON-tool cross-check would duplicate coverage

## 3. Scope

### Files touched

| File | Action | LOC delta |
|---|---|---|
| `src/data/og-samples.json` | MODIFY (add 2 entries) | +24 lines JSON |
| `scripts/build-og-images.ts` | MODIFY (collect-all-then-throw upfront) | ~12 lines (10 add + 2 refactor) |
| `scripts/check-og-samples-coverage.mjs` | CREATE | ~35 lines |
| `.githooks/pre-commit` | MODIFY (add 1 line guard invocation) | +1 line |
| `memory/p22b-engine-count-constant-shipped.md` | MODIFY (P23 task) | amend 2 lines |
| `memory/p23-og-sample-coverage-shipped.md` | CREATE (P23 task) | new file ~70 lines |
| `memory/MEMORY.md` | MODIFY (P23 task) | +1 index line |

**Total scope:**
- 4 source/build files modified (1 JSON, 1 .ts, 1 new .mjs, 1 hook)
- 3 memory files modified or created (P23 task)

### Sample entry shape (verbatim, for implementation)

Per `scripts/build-og-images.ts:45-50` `Sample` interface:
```ts
interface Sample {
  headline: Record<Lang, string>;
  headlineUnit: Record<Lang, string>;
  headlineLabel: Record<Lang, string>;
  trend?: Record<Lang, string>;
}
```

New entries (no `trend` field — it's optional; matches the pattern of simpler existing entries like `solopreneur-mrr-calculator`):

```json
"solopreneur-coupon-attribution-calculator": {
  "headline": { "en": "Coupon Attribution Calculator", "zh": "优惠券归因计算器" },
  "headlineUnit": { "en": "attributed revenue / mo", "zh": "月度归因营收" },
  "headlineLabel": { "en": "from $X spend", "zh": "$X 投入" }
},
"solopreneur-cart-abandonment-cost-calculator": {
  "headline": { "en": "Cart Abandonment Cost Calculator", "zh": "购物车放弃成本计算器" },
  "headlineUnit": { "en": "lost revenue / mo", "zh": "月度流失营收" },
  "headlineLabel": { "en": "from X% abandonment", "zh": "X% 放弃率" }
}
```

## 4. Architecture + Implementation Strategy

### A. Build script upgrade (`scripts/build-og-images.ts`)

Move from per-render fail-fast to upfront collect-all-then-throw:

```ts
// NEW: insert after assertEmojiSet() (line 222) and before mkdirSync (line 223)
const targets = buildTargets();
const missingOgSamples = [...new Set(targets.map(t => t.slug).filter(s => !ogSamples[s]))];
if (missingOgSamples.length > 0) {
  throw new Error(
    `Missing ${missingOgSamples.length} og-sample entries in src/data/og-samples.json:\n` +
    missingOgSamples.map(s => `  - ${s}`).join('\n') +
    `\nAdd entries to src/data/og-samples.json.`
  );
}
```

The per-render check at line 149-150 stays as defense-in-depth (P14-Followup pattern) but its throw message points to the upfront report.

### B. Coverage script (`scripts/check-og-samples-coverage.mjs`, NEW)

```js
#!/usr/bin/env node
import { tools } from '../src/data/tools/index.ts';
import ogSamples from '../src/data/og-samples.json' with { type: 'json' };

const toolSlugs = new Set(tools.map(t => t.slug));
const sampleSlugs = new Set(Object.keys(ogSamples));

const missing = tools.map(t => t.slug).filter(s => !sampleSlugs.has(s));
const orphan = Object.keys(ogSamples).filter(s => !toolSlugs.has(s));

if (missing.length === 0 && orphan.length === 0) {
  console.log(`OK: ${toolSlugs.size}/${toolSlugs.size} og-samples present (zero missing, zero orphan)`);
  process.exit(0);
}

if (missing.length > 0) {
  console.error(`MISSING og-samples for ${missing.length} tools:`);
  for (const s of missing) console.error(`  - ${s}`);
}
if (orphan.length > 0) {
  console.error(`ORPHAN og-samples (no matching tool): ${orphan.length} entries:`);
  for (const s of orphan) console.error(`  - ${s}`);
}
process.exit(1);
```

### C. Precommit hook (`.githooks/pre-commit`)

Add 1 line:
```bash
pnpm exec tsx scripts/check-og-samples-coverage.mjs || { echo "og-samples coverage check failed"; exit 1; }
```

Pattern matches the existing `codegen-examples.mjs --check` line (per CLAUDE.md).

### D. Why this design (decomposition clarity)

- `check-og-samples-coverage.mjs` has ONE job: report JSON-tool cross-check
- `build-og-images.ts` keeps its renderer + assertion responsibility
- The two roles don't overlap (renderer is invoked once at build time; checker is invoked on each commit)
- Coverage script intentionally does NOT touch `build-og-images.ts`; the upfront check is in build-og-images.ts because that's where the failure originated (P22b lesson: collect errors at their actual source)

## 5. Global Constraints

1. **No new dependencies** — script uses Node built-ins + `tsx` (already in `devDependencies` for codegen scripts).
2. **No new module directories OUTSIDE `scripts/`** — new file in `scripts/`, alongside existing scripts (`build-og-images.ts`, `sync-pricing.mjs`, `codegen-customfn.mjs`).
3. **3-way sync required at end** — both `origin` (gitee: wlz679/calcKit) and `github` (github: wlz679/forgeflow) must reflect final commits. Run `git fetch origin github && git rev-list --left-right --count origin/master...master && git rev-list --left-right --count github/master...master`, both must be `0\t0`.
4. **Pre-commit gate** — `SKIP_PRECOMMIT_CHECK=1` available per P22b precedent; P23's new check integrates with `.githooks/pre-commit`.
5. **raw-key invariant** — N/A (P23 doesn't touch `src/i18n/`).
6. **byte-identical invariant** — N/A (no regenerated artifacts tracked in git).
7. **No engine registration changes** — `src/core/engines/registry.ts` and `src/engines/index.ts` are read-only for P23.
8. **P22b memory amend** — `memory/p22b-engine-count-constant-shipped.md` has stale line claiming "only cart-abandonment got og-sample" — both are missing, amend in P23-4.

## 6. Task Class + Execution

| Task | Class | Why |
|---|---|---|
| P23-1 (spec) | INLINE | 1 file write + commit |
| P23-2 (plan) | INLINE | 1 file write + commit |
| P23-3 (4-file edit + verify) | INTEGRATION | cross-cutting: 4 source files + hook + new script + cascading test unlock |
| P23-4 (memory + amend + sync) | INTEGRATION | memory writes + P22b amend + 3-way push |

P23-3 is INTEGRATION because:
- Modifies a build script (`build-og-images.ts`) that's on the critical path for `pnpm build` (and therefore for `tests/_clerk-build-helper.runBuild`)
- Adds a precommit hook line (cross-process boundary)
- Backfills JSON data whose shape must match existing entries (consistency review needed)

Per CLAUDE.md review depth guidance: 1 implementer + 1 spec-verify reviewer per task. No holistic review needed (3 files + 1 hook = bounded diff).

## 7. Success Criteria

| Criterion | Verification |
|---|---|
| Spec committed | `git log --oneline -1` shows new spec commit |
| Plan committed | `git log --oneline` shows plan commit after spec |
| Task commits land | `git log --oneline ace65f1..HEAD` shows ≥4 commits (1 spec + 1 plan + 1 fix + 1 memory) |
| `scripts/build-og-images.ts` does NOT short-circuit | Re-running with old `Missing og-sample for X` failure mode now reports all missing |
| `scripts/check-og-samples-coverage.mjs` exits 0 | Standalone `pnpm exec tsx scripts/check-og-samples-coverage.mjs` returns `OK: 100/100` |
| Test count rises from 1067 → ≥1072 / fail drops 10 → ≤5 | `node tests/run.mjs` shows lower fail count (5 env-dep baseline) |
| Precommit hook wired | `git config core.hooksPath .githooks && git commit --dry-run` invokes guard |
| P22b memory line 87 + 91 amended | `grep "both" memory/p22b-engine-count-constant-shipped.md` returns the new wording |
| 3-way sync verified | `rev-list --left-right --count origin/master...master` AND `github/master...master` both = `0\t0` |

## 8. Self-Review

1. **Placeholder scan:** No TBD/TODO. JSON entries verbatim provided. Build script edit verbatim provided. Coverage script verbatim provided.
2. **Internal consistency:** Goal (§1) → Scope (§3) → Verification (§7). Task class (§6) ↔ global constraints (§5). Out-of-scope (§3 end) bounded.
3. **Scope check:** Single bug + 1 guard improvement. Single implementation plan.
4. **Ambiguity check:** "Both P16 marketing engines missing" stated once at Goal + once at Task 6. Clear wording.

**Self-review verdict:** Ready for user review → writing-plans (or user-approved entry to Inline Execution if scope is bounded per P22b precedent).
