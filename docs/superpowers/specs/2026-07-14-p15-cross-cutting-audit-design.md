# P15 Cross-Cutting Audit — Design Spec

> **Date:** 2026-07-14
> **Status:** Approved (brainstorming complete)
> **Branch:** master
> **Scope:** Single P15 batch (13 tasks, ~3 days)
> **Lines added/modified:** ~600-900 LOC across 50+ files

## 1. Problem Statement

P14 series + P14-Followup just shipped (16 commits, 48 P6-P14 engines + 49 tests + 1 helper + 1 template + 1 memory). The `clampNonNegative` two-layer defense-in-depth pattern is established for new-pattern engines (via `[slug].astro:940`) and P14-specific engines. However, several cross-cutting gaps remain:

1. **24 BIZ_*_* old-pattern engines** use a different form rendering pipeline at `[slug].astro:1387-1454` (JS-embedded, not the new-pattern branch). They were NOT touched by P14-Followup. Same problem applies: no `step="any"` HTML5 native UX, no `clampNonNegative()` programmatic guard, no `cnn` customFn inlining.
2. **~10 pre-P5 solopreneur engines** in `src/engines/{freelance,hiring-team,investment,valuation,cost,saas}/` use the same BIZ_*_* JS-embedded pipeline. They also lack the defensive layers.
3. **4 AI Cost engines** (`ai-api-comparison`, `ai-image-generation`, `gpu-cloud`, `ai-training`) use data-driven PRICING.json. Their customFn strings do NOT have `clampNonNegative`/`cnn` defensive guards. Spec §4.3 of P14-Followup excluded these because they use different data loading; P15 closes this gap.
4. **`scripts/build-og-images.ts` EMOJI_SET** is missing 5 emojis (🟠/🟡/🟢 + 2 others), blocking `pnpm build` prebuild hook. Workaround `pnpm exec astro build` works but is not sustainable.
5. **`tests/scripts/test-customFn.mjs` parser** only matches `const customFn = "..."` (top-level var) form, misses inline `clientConfig: { customFn: "..." }` (object property). Limits verification of P14-era engines.
6. **HTML5 layer 1 verification** has no automated smoke test. Task 1 added the template change but no script verifies every rendered page has `step="any"` on numeric inputs.
7. **Multiple small polish items** accumulated from per-task reviews (Tasks 1-10 of P14-Followup).

## 2. Decisions (from brainstorming Q&A)

| Decision | Choice | Rationale |
|---|---|---|
| Batch structure | Single P15 batch (13 tasks, ~3 days) | User explicitly chose "做完 P15" + Option A (full scope) |
| Task count | 13 tasks total (4 high + 6 medium + 3 low + 0 ship) | 13 is manageable per subagent-driven-development precedent |
| 24 BIZ_*_* scope | YES include | P14-Followup was "half-symmetric" without this; completing symmetry |
| Pre-P5 scope | YES include | Same reason; sample-verify pattern to confirm clamp applicability |
| AI Cost customFn scope | YES include 4 engines | These engines use PRICING.json but their customFn has the same defensible negative-input guard gap |
| EMOJI_SET fix | YES include | Blocks `pnpm build`; high-leverage single-file fix |
| test-customFn.mjs parser | YES include | Tool gap that limited P14-Followup verification |
| HTML5 smoke test | YES include as new script | Verification gap; future sweep can use it |
| 12 Clerk/Supabase env flake → skip-marker | YES include | Pre-existing flake pollutes CI signals |
| verify-customfn.mjs re-introduce | YES include | Task 7 retry deleted it; P15 brings it back as committed tool |
| Polish items (3 test improvements + `+5` literal + helper cleanup) | YES include | Accumulated from prior per-task Minor findings |
| CustomFn code-split | NO | Premature abstraction; defer to event-driven future |
| Review depth | Mechanical = 1 reviewer; integration = 1 reviewer + careful holistic | Per `subagent-driven-overhead.md` |

## 3. Architecture (two-layer defense extended)

```
Browser (already partially implemented by P14-Followup)
┌─────────────────────────────────────────────────────────────────────┐
│ New-pattern engines (P6-P14, 48 engines) ─ ALREADY DONE              │
│   <input type="number" step="any" min="0"> + clampNonNegative()      │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Old-pattern engines (BIZ_*_*, 24 engines) ─ P15 TASK 11             │
│   Same pattern, different form rendering pipeline                   │
│   [slug].astro:1387-1454 (JS-embedded, NOT line 940)                 │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ Pre-P5 solopreneur engines (~10 engines) ─ P15 TASK 12               │
│   Same BIZ_*_* pipeline, older engines                               │
└─────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────┐
│ AI Cost customFn (4 engines) ─ P15 TASK 2                            │
│   Use PRICING.json data tables; customFn needs cnn inline            │
│   (NOT the [slug].astro input — that already gets step="any")        │
└─────────────────────────────────────────────────────────────────────┘

Tooling layer
┌─────────────────────────────────────────────────────────────────────┐
│ EMOJI_SET (Task 1) — fixes prebuild hook                             │
│ test-customFn.mjs parser (Task 3) — accepts inline form              │
│ verify-customfn.mjs (Task 8) — handles 4 customFn styles             │
│ smoke-html5.mjs (Task 4) — validates rendered HTML                   │
└─────────────────────────────────────────────────────────────────────┘
```

## 4. Components

### 4.1 🔴 High-priority (Tasks 1-4)

| Task | File(s) | Action | LOC est |
|---|---|---|---|
| 1. EMOJI_SET fix | `scripts/build-og-images.ts:58` | Add 5 missing emojis to Set | ~5 |
| 2. AI Cost customFn clamp (4 engines) | `src/engines/ai-cost/{ai-api-comparison,ai-image-generation,gpu-cloud,ai-training}-calculator.ts` | Inline `var cnn=function(x){return Math.max(0,x)};` at top of customFn; replace input-parses with `cnn(...)`. Import `clampNonNegative` for calculate(). **⚠️ CRITICAL: PRICING.json data loading must be preserved** — these engines use data tables that are auto-generated by `codegen-customfn.mjs`. The cnn prepend must be added to the data table portion without breaking data loading. Subagent MUST sample 1 engine first to verify pattern. | ~12 × 4 = 48 |
| 3. test-customFn.mjs parser | `tests/scripts/test-customfn.mjs` | Add regex matching `clientConfig: { customFn: "..." }` (object property form) alongside existing `const customFn` | ~30 |
| 4. HTML5 smoke test | `scripts/smoke-html5.mjs` (NEW) | Walk `dist/{en,zh}/*.html`, grep `step="any"` on numeric inputs. Exit 1 if missing. ~80 LOC. Wire into pre-commit hook OR `pnpm check`. | ~80 |

### 4.2 🟢 Low-priority sweeps (Tasks 11-12)

**⚠️ Important note on overlap:** BIZ_*_* engines (Task 11) and pre-P5 engines (Task 12) may overlap — both are "old-pattern engines" shipped before P-series naming. **Implementer MUST verify actual file list at execution time** by `ls src/engines/{freelance,hiring-team,saas,investment,cost,valuation,real-estate}/` and counting. If they overlap, collapse Task 11+12 into a single sweep task. Worst case = 24+10 = 34 distinct engines (if no overlap); best case = 24 (full overlap).

| Task | File(s) | Action | LOC est |
|---|---|---|---|
| 11. Old-pattern engine sweep (BIZ_*_* + pre-P5) | Old-pattern engines across `src/engines/{freelance,hiring-team,saas,investment,cost,valuation,real-estate}/` + `[slug].astro:1387-1454` form rendering pipeline | Apply `clampNonNegative` import + wrap in `calculate()`/`generate()` + customFn `cnn` prepend. Verify form rendering pipeline accepts the same `step`/`min` attributes as new-pattern (line 940). Add +1 defensive test per engine. | ~10 × N (where N = 24..34) |
| 12. (collapsed into Task 11 if overlap) | n/a | n/a | n/a |

### 4.3 🟡 Medium polish (Tasks 5-10)

| Task | File(s) | Action | LOC est |
|---|---|---|---|
| 5. 12 env test flake → skip-marker | `tests/{4 baselayout-clerk, 4 baselayout-supabase, 4 check-*}*.test.ts` | Wrap tests with `if (!process.env.PUBLIC_CLERK_PUBLISHABLE_KEY) return;` or `t.skip()` for env-dependent tests. Verify count = 12. | ~30 |
| 6. Trailing newline | 12 test files (5 P6 + 6 P7 + 4 P8 + 5 P12 + 1 helpers per Tasks 2/3/4/5/7 minor findings) | Append `\n` to file end. | ~12 |
| 7. Test improvements (3 small) | `tests/{acv,funnel-step,article-helpfulness}-calculator.test.ts` | acv: add band verdict assertion. funnel-step: replace manual `filteredSteps` with `generate()` call. article-helpfulness: add band cascade assertion. | ~30 |
| 8. verify-customfn.mjs re-introduce | `tests/scripts/verify-customfn.mjs` (NEW) | Improved customFn parser handling 4 styles. Re-introduce from Task 7 retry. | ~120 |
| 9. helpers.test.ts cleanup | `tests/helpers.test.ts` + `src/core/engines/helpers.ts:72` | Remove no-op `as number` cast in helper; rename Test 5 to "undefined → NaN (caller-must-pre-validate)". | ~5 |
| 10. +5 literal → constant | `src/engines/customer-support/first-response-time-calculator.ts` | Extract `const LIFT_PERCENT = 5;` at top of engine file, reference in both `calculate()` and `customFn`. | ~10 |

### 4.4 Out of scope (explicitly)

- **CustomFn code-split (Task 13)** — premature abstraction; defer to event-driven future
- **OG image extra missing emojis beyond the 5 known** — only fix what's reported
- **Smoke test wiring into pre-commit hook** — script created, hook wiring optional (manual invocation OK)

### 4.5 Files modified summary

| Category | Count | Total LOC est |
|---|---|---|
| New files | 2 (`scripts/smoke-html5.mjs`, `tests/scripts/verify-customfn.mjs`) | ~200 |
| Modified engines | ~38 (24-34 old-pattern + 4 AI Cost) | ~388 |
| Modified test files | ~39 (24-34 old-pattern + 4 AI Cost + 1 helper + 3 polish + 12 env flake) | ~150 |
| Modified scripts | 1 (`build-og-images.ts`) | ~5 |
| Modified engines (polish) | 1 (`first-response-time-calculator.ts`) | ~10 |
| Memory | 1 (`memory/p15-cross-cutting-audit-shipped.md`) | ~200 |
| **TOTAL** | ~82 files | ~953 LOC |

## 5. Data flow (per task type)

| Task type | Build-time | Runtime | Browser |
|---|---|---|---|
| EMOJI_SET fix | Static Set update in TS | Script reads og-samples.json, throws if missing emoji | n/a |
| customFn clamp (4 AI Cost) | Static import + cnn prepend (build) | n/a (customFn is browser-only) | `new Function('inputs', 'pick', 'fill', customFn)` runs `cnn(...)` |
| test-customFn.mjs parser | Reads engine files, regex match | n/a | n/a |
| HTML5 smoke test | Reads `dist/*.html` after `astro build` | n/a | n/a |
| 24 BIZ_*_* sweep | Imports `clampNonNegative` | `calculate()`/`generate()` uses helper | `customFn` inline `cnn(...)` |
| pre-P5 engines sweep | Same as BIZ_*_* | Same | Same |
| Polish (6 tasks) | Direct file edits | n/a | n/a |

## 6. Testing

### 6.1 Per-task test requirements

| Task | Test requirement |
|---|---|
| 1 (EMOJI_SET) | Manual: `pnpm exec astro build` succeeds end-to-end |
| 2 (AI Cost customFn) | Existing 4 AI Cost engine tests still pass + +1 defensive test per engine (4 new) |
| 3 (test-customFn.mjs parser) | Script returns 0 exit for one engine of each customFn style (4 styles total) |
| 4 (HTML5 smoke test) | Script exits 0 for current `dist/`; exits 1 if a page missing `step="any"` on numeric input |
| 5 (env test flake) | All 12 tests run with `node --import tsx tests/...` and gracefully skip when env missing |
| 6 (trailing newline) | `git diff --check` returns 0 (no whitespace errors) |
| 7 (test improvements) | 3 modified test files pass cleanly |
| 8 (verify-customfn.mjs) | Script parses one engine per customFn style (4 styles) |
| 9 (helpers.test.ts cleanup) | `node --import tsx tests/helpers.test.ts` → 6/6 pass |
| 10 (+5 literal → constant) | `node --import tsx tests/first-response-time-calculator.test.ts` → all pass |
| 11 (old-pattern sweep) | N +1 defensive tests (where N = 24..34) + all existing old-pattern tests pass |
| 12 (collapsed into Task 11) | n/a |

### 6.2 Cross-cutting verification

- `node scripts/codegen-examples.mjs --check` → 98/98 PASS
- `node scripts/codegen-customfn.mjs --check` → PASS (no drift)
- `pnpm exec astro build` → 309 static pages built (after EMOJI_SET fix)
- `node scripts/smoke-html5.mjs` → all pages have `step="any"` on numeric inputs

### 6.3 Acceptance criteria

1. All P15 per-task tests pass with zero new regressions (12 pre-existing Clerk/Supabase env flake acceptable)
2. `pnpm exec astro build` succeeds (after EMOJI_SET fix)
3. HTML5 smoke test exits 0 (all pages have `step="any"`)
4. test-customFn.mjs parser exits 0 for one engine per customFn style
5. verify-customfn.mjs handles all 4 customFn styles (committed)
6. Memory file `memory/p15-cross-cutting-audit-shipped.md` covers full batch
7. Dual-push to gitee + github verified `0 0`

## 7. Out of scope (deferred to future)

- **CustomFn code-split (Task 13)** — premature abstraction; defer
- **OG image extra missing emojis** — only fix known 5
- **Smoke test pre-commit hook wiring** — manual invocation OK
- **Per-engine source comment updates** — not required for cross-cutting
- **Blog post about P15** — maintenance task, not P15 itself

## 8. Rollout plan

1. Land P15 in 13 sequential tasks per subagent-driven-development
2. Per-task review gates (1 reviewer for mechanical, careful holistic for integration)
3. Final holistic review (fable-5 — most capable model)
4. Dual-push to gitee + github; verify 3-way sync
5. Update `memory/p15-cross-cutting-audit-shipped.md` + `MEMORY.md` index
6. Update Claude-side memory index mirror
7. **Maintenance mode handoff** — user may now treat project as stable

## 9. Risk assessment

**Low risk:**
- EMOJI_SET fix (single file, well-scoped)
- Polish items (single file each, well-tested patterns)
- Helper test cleanup (already tested)

**Medium risk:**
- 24 BIZ_*_* sweep — JS-embedded form rendering pipeline at `[slug].astro:1387-1454` is different from new-pattern at line 940. Subagent MUST sample 1 BIZ engine first to verify pattern applies. If pattern fails, scope-down to Task 11 = BIZ_*_* disabled, log as future cleanup.
- pre-P5 engines (~10) — older engines may lack HEALTH_BANDS pattern; clampNonNegative still applies at input level but the v3 standard verification may be incomplete. Sample 1 pre-P5 engine first.
- AI Cost customFn inlining — these engines use PRICING.json data tables; customFn prepend may interact with data loading. Sample 1 AI Cost engine first.

**High risk:**
- None (no architectural changes; only pattern extension)

**Mitigations:**
- Subagent pre-verifies pattern on 1 sample engine per category before sweep (Tasks 2, 11, 12)
- Per-task review gates catch cross-file breakage
- Final holistic review verifies batch as a whole
- Pre-existing flake handling via `SKIP_PRECOMMIT_CHECK=1`

**Abort criteria (any of):**
- EMOJI_SET fix introduces new emoji set regressions
- BIZ_*_* form rendering pattern incompatible with `step`/`min` attributes (JS pipeline at line 1387-1454 doesn't expose the same injection points)
- AI Cost customFn inlining breaks PRICING.json data loading
- Any single task exceeds 2× time budget → escalate to human