# P50 — codegen-customfn drift guard — design

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a static structural + reverse-mapping + dual integration smoke drift guard for `scripts/codegen-customfn.mjs`, mirroring the P47 (`tests/codegen-drift-guard.test.ts`) + P49 (`tests/engine-count-by-category.test.ts`) patterns. Closes the silent-drift class where codegen-customfn's internal lookup tables / engine array / marker strings / idempotence can regress without triggering the existing `--check` exit-1 path.

**Architecture:** 1 NEW test file (`tests/codegen-customfn-drift-guard.test.ts`) at `tests/` root. No production code changes. 7 assertions in 3 categories:
- **structural** (T1-T3): source-level `assert.match` against `scripts/codegen-customfn.mjs` — FAMILY_SHORT / ICON lookup tables present, fmt() precision regression guard.
- **reverse-mapping** (T4-T5): `src/engines/ai-cost/*.ts` ↔ ENGINES[] array 1:1 coverage + every source file contains its registered end-marker (catches silent-skip on missing marker).
- **integration smoke** (T6-T7): `--check` exit-0 + bare-rerun idempotence (writes 0 files).

**Tech Stack:** Node 20.19+ `node:test` (existing); `spawnSync` for subprocess smoke; `fs.readFileSync` for static assertions. No new deps. Pattern reused from P47 + P49.

## Global Constraints

These constraints apply to every task. Each task's requirements implicitly include this section.

1. **Test location MUST be `tests/` root, NOT `tests/scripts/` or `tests/lib/`** — P22b ESM trap: `tests/run.mjs` reads `tests/*.test.ts` only. Subdir placement is silently skipped by `pnpm test:unit`.
2. **Use `node --import tsx` style is NOT needed** — P47 + P49 both load via plain `fs.readFileSync` (script is `.mjs`, not `.ts`). No tsx subprocess spawn needed for the script source read.
3. **T7 mutation detection MUST use try/finally backup-restore** — running `scripts/codegen-customfn.mjs` (without `--check`) writes to disk on drift; test must restore file contents even on assertion failure.
4. **T7 stdout assertion is `"Done. 0 engine(s) updated."`** — this is the exact string format from `scripts/codegen-customfn.mjs` L463. If that script's print format changes, this assertion must update correspondingly.
5. **`src/engines/ai-cost/index.ts` is a barrel export — exclude from file counting** — 8 real engines + 1 barrel = 9 `.ts` files in the directory, but only 8 are ENGINES[] targets.
6. **`ai-training-cost-estimator.ts` is registered TWICE in ENGINES[]** — gpuTypes section + modelSizes section share one file. `file:` field appears 2× in source; reverse-mapping must count entries not unique-files.
7. **No production code changes** — `scripts/codegen-customfn.mjs` is the guarded object, not the modifier. No edits to scripts / package.json / .githooks.
8. **pnpm check target: 1110 → 1117 (+7 assertions)** — matches P47 (6+1) and P49 (7) baselines. No new `check:` slot in `package.json` (test runs via `pnpm test:unit` slot 7).
9. **Dual-push target: 3-way sync `0  0`** — apply P43 (pre-push fetch) + P44 (hook stale cache bypass) lessons from P49.
10. **Ship memory writes to `~/.claude/projects/D--E-----youtube-tools/memory/`** — P47 + P49 patterns. MEMORY.md index updated.

## Architecture overview

```
                ┌─────────────────────────────────┐
                │ scripts/codegen-customfn.mjs     │
                │  (the guarded object, unchanged) │
                └────────────┬────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
   structural (T1-T3):              reverse-mapping (T4-T5):
   FAMILY_SHORT + ICON +            ai-cost/*.ts ↔ ENGINES[]
   fmt() precision                  + marker presence
                  │                     │
                  └──────────┬──────────┘
                             ▼
              integration smoke (T6-T7):
              --check exit 0 + bare-rerun idempotence
                             │
                             ▼
              ┌──────────────────────────────┐
              │ tests/codegen-customfn-       │
              │   drift-guard.test.ts         │
              │   (NEW, ~190 lines)           │
              └──────────────────────────────┘
```

## Task surface

| Task | Files | Type | LOC | Description |
|---|---|---|---|---|
| 1 | `tests/codegen-customfn-drift-guard.test.ts` (NEW) | [INTEGRATION] | ~190 | 7 assertions across 3 categories. Pattern: P47 + P49 hybrid. try/finally for T7 mutation detection. |
| 2 | (git push only) | [INTEGRATION] | 0 | Dual-push with P43+P44 lessons. 3-way sync `0  0`. |
| 3 | `~/.claude/.../memory/p50-*.md` (NEW) + MEMORY.md update | [MECHANICAL] | ~250 | Ship memory + index entry. |

## Test design rationale

**Why 7 assertions, not 1 golden snapshot?**

A golden-snapshot test (`expect(codegen_output).toBe(frozen_string)`) would lock the current behavior byte-for-byte. But that conflates two concerns:
- **semantic correctness** (PRICING.json → customFn mapping is right)
- **byte stability** (no whitespace changes ever)

The latter is over-constrained — every `sync-pricing.mjs` weekly cron could break a golden snapshot for cosmetic reasons (reordering, field additions) without indicating a real bug. The 7-assertion structure separates:
- T1-T3: structural pieces that *must* exist
- T4-T5: cross-file mappings that *must* hold
- T6-T7: runtime behavior that *must* hold

A weekly cron that adds a new model to PRICING.json → T7 catches the drift explicitly (stdout says "Done. 1 engine(s) updated." instead of 0). The fail message tells the operator what changed.

**Why T7 instead of T6 alone?**

T6 (`--check exit 0`) is the existing P47-style smoke. It catches drift that codegen-customfn already detects via string-equality diff. But codegen-customfn has a **silent-skip mode** (`buildTableContent()` returns null when markers not found → script prints `⚠ markers not found (skipped)` and proceeds). T6 only fails if drift is reported; a silent-skip produces zero drift output and T6 still passes.

T7's backup-restore pattern catches this:
- If codegen-customfn silently skips an engine, file contents are unchanged, stdout reports "0 updated", T7 **passes** (which is wrong but bounded by T5 which catches the missing marker first).

T5 is the structural counterweight: if a marker is missing in source, T5 fails before T7 runs. T5 + T7 together cover the silent-skip failure mode.

**Why include T3 (fmt precision) as a separate assertion?**

The `Number(n.toFixed(4))` wrapper exists because raw `toFixed()` produces `0.09999999`-style artifacts in the minified customFn. The wrapper was added in commit `1385725` era and not guarded. If a future refactor drops the wrapper, customFn prices silently drift across many engines — T3 catches this with a single line-level regex.

## Out of scope

- `scripts/codegen-examples.mjs` — already guarded by P47.
- `scripts/sync-pricing.mjs` — different layer (LiteLLM fetch + PRICING.json write), not codegen.
- Cross-script consistency (codegen-customfn ↔ codegen-examples) — both serve different purposes; reverse-mapping between them is false-positive risk.
- `package.json` `check:` slot — P50 test runs via `pnpm test:unit` (slot 7) which already picks up new test files at `tests/` root.
- `.githooks/pre-commit` path filter — no new file paths to watch.

## Risks

| Risk | Likelihood | Mitigation |
|---|---|---|
| T7 backup-restore misses a file (e.g., codegen creates new file not in initial readdir) | very low | codegen-customfn does not create files; it only rewrites existing ones. The `engineFiles` set in codegen-customfn is hand-curated, not auto-discovered. |
| T7 `git stash` overhead per test run | n/a | T7 uses try/finally fs.read/write, not git stash. ~50ms for 8 file copies. |
| T4 reverse-mapping fails after a future PR adds an ai-cost engine | low | This is the *intended* fail mode. T4's error message names the orphan file. |
| T6 false positive after `pnpm sync` adds a model | very low | After `pnpm sync`, codegen-customfn writes the new model. T6 would fail until the operator commits. **This is intended fail behavior** — operator should commit the drift, not bypass the test. |
| T7 stdout format drift (script changes "Done. 0 engine(s) updated." wording) | very low | T7's regex is the documented contract; any format change is itself a behavior change requiring a spec update. |

## Self-review checklist

- [x] No "TBD" / "TODO" / placeholder text
- [x] Internal consistency: file paths match between architecture diagram and global constraints
- [x] Scope is single plan: 1 new test file + ship memory
- [x] No ambiguous requirements: 7 assertions each with explicit regex + assertion form
- [x] Reverse-mapping scope (T4-T5) excludes `index.ts` barrel (constraint 5)
- [x] `ai-training-cost-estimator.ts` counted as 2 ENGINES entries (constraint 6)

## Why NOT auto-update the test on drift

This is a guard test, not a regenerator. When PRICING.json adds a model:
- codegen-customfn --check exits 1
- The test fails (T6 / T7)
- Operator runs `pnpm sync` → codegen-customfn rewrites engine files → state is in sync → tests pass

The test never auto-updates itself. That's the `verification-before-completion` boundary: codegen output is operator-reviewed via `git diff`, not auto-accepted.