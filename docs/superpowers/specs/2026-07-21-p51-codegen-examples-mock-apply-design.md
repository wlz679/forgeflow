# P51 — codegen-examples mock-apply drift guard — design

> **For agentic workers:** This is a design spec. Read it once, then run superpowers:writing-plans to produce the implementation plan.

**Goal:** Add a 5-assertion drift guard that verifies `scripts/codegen-examples.mjs`'s P42 Date mock is actually applied at runtime when an engine's `generate()` runs. Closes the runtime gap left by P47's structural-only guard.

**Architecture:** 1 NEW file `tests/codegen-examples-mock-apply.test.ts` (placed at `tests/` root per the P22b ESM trap). 5 assertions in 2 categories (T1+T2 static structural / T3+T4 runtime apply via temp-dir mini tsx runner / T5 integration smoke). Mirrors P47 pattern (structural) + P50 T7 pattern (runtime try/finally cleanup with temp fs isolation).

**Tech Stack:** Node.js `node:test` + `node:assert` + `child_process.spawnSync` + `fs.mkdtempSync` + `os.tmpdir()` + `tsx` subprocess. Same toolkit as P50 `tests/codegen-customfn-drift-guard.test.ts`.

## Background

P42 (`docs/superpowers/specs/2026-07-19-p42-date-drift-proof-codegen-design.md`) injected a `Date` mock into `scripts/codegen-examples.mjs:buildRunnerScript()` so that the runner script's `engine.generate()` calls receive a stable `REFERENCE_DATE = new Date('2026-07-15T00:00:00Z')` instead of the wall-clock `Date.now()`. This makes `staticExamples[0]` date labels drift-proof across month boundaries (closed the P41 `mrr-calculator` Sep→Oct 2027 drift class).

P47 (`tests/codegen-drift-guard.test.ts`) added 7 structural assertions that the mock exists in source, `REFERENCE_DATE` is locked at 2026-07-15, the mock is ordered before `main()`, and `Date.now()` is overridden. But P47 **does not** verify the mock actually applies at runtime — that the date returned to `engine.generate()` is in fact `REFERENCE_DATE`'s instant. A refactor that:
- moves the mock to a separate helper module that the runner no longer imports,
- misorders the mock after a `main()` call,
- monkey-patches the wrong symbol (e.g. `globalThis.Date` vs `globalThis as any).Date`),

…could pass P47's structural guards while silently breaking the drift-proofing at runtime. This spec closes that gap.

The deferral: P47 §"Out of scope" explicitly deferred a "REFERENCE_DATE shift produces proportional date-only output shift" sanity test to a later batch. P51 picks up the simpler half — runtime mock-apply verification — and continues to defer the shift-test as YAGNI (per user decision in this session's brainstorming).

## Design

### File layout

| Path | Status | Purpose |
|---|---|---|
| `tests/codegen-examples-mock-apply.test.ts` | **NEW** | 5-assertion drift guard. `tests/` root, not `tests/scripts/`, per the P22b ESM trap. |
| `scripts/codegen-examples.mjs` | UNCHANGED | Source under test. No production code touched. |

### Test taxonomy (5 assertions, 2 categories)

#### Category 1: Static structural (T1 + T2)

These are redundant with P47 T1+T2 but kept as forward-looking drift signals (future refactors that move the mock to a helper module would first break the in-source regex, alerting reviewers before they break the runtime).

| T# | Assertion | Implementation |
|---|---|---|
| **T1** | `scripts/codegen-examples.mjs` source contains the P42 mock declaration block. | Regex `/globalThis as any\)\.Date = class extends RealDate/` against `SCRIPT_SOURCE`. |
| **T2** | `REFERENCE_DATE = new Date('2026-07-15T00:00:00Z')` is locked at the canonical date. | Regex `/REFERENCE_DATE = new Date\('2026-07-15T00:00:00Z'\)/` against `SCRIPT_SOURCE`. |

Failure mode for T1/T2: silent at first — only T3+T4 would catch the runtime break. But T1/T2 give a *faster* failure signal in CI and a more readable message than a runtime subprocess failure. The cost is ~2 extra assertions.

#### Category 2: Runtime apply + integration smoke (T3 + T4 + T5)

These are the load-bearing assertions. They verify the mock changes the output of `engine.generate()` — that is, that the runtime behavior matches the structural intent.

| T# | Assertion | Implementation |
|---|---|---|
| **T3** | When the mock is applied, `mrr-calculator.generate({defaultInputs})[0]` contains the substring `~Sep 2027` (REFERENCE_DATE + 14.4 months projected). | Spawn a temp-dir mini tsx runner with the inline P42 mock + import `src/engines/saas/mrr-calculator.ts` + call `engine.generate(...)[0]` → assert `~Sep 2027` substring present. |
| **T4** | When the mock is **removed**, the same call's output does **NOT** contain `~Sep 2027` (because wall-clock today is 2026-07-21, +14.4 months projects to ~Oct 2027, not Sep 2027). This is defense-in-depth: proves the mock *changes* the output rather than the substring being a constant in generate(). | Same temp-dir mini tsx runner without the mock block → assert `~Sep 2027` substring absent. |
| **T5** | `node scripts/codegen-examples.mjs --check` exits 0 with stdout containing `PASSED`. | `spawnSync('node', ['scripts/codegen-examples.mjs', '--check'], { cwd: ROOT })` → assert `result.status === 0` + `result.stdout.match(/PASSED/)`. Parity with P47 T7. |

Why `~Sep 2027` specifically:
- `mrr-calculator.ts:50` ships the literal `$50,000.00 MRR: 14.4 months (~Sep 2027)` in its `staticExamples[0]` (regenerated by codegen-examples.mjs against `REFERENCE_DATE = 2026-07-15`).
- `generate()` computes the projection using `new Date()` (internally). With the mock applied, it sees `REFERENCE_DATE`'s instant and projects +14.4 months → ~Sep 2027.
- Without the mock, today is `2026-07-21` and +14.4 months projects to ~Oct 2027 (different month). T4's negative assertion is therefore reliable.

### Temp-dir mini tsx runner

The runtime apply mechanism. Lives in the test file as a helper. Spawns a tsx subprocess that runs an inline TypeScript module with optional P42 mock, imports the mrr-calculator engine, and prints `generate(defaultInputs)[0]` to stdout.

```ts
function runGenerateWithOrWithoutMock(includeMock: boolean): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p51-mock-apply-'));
  const runnerPath = path.join(tmpDir, 'runner.ts');

  const mockBlock = includeMock ? `
    const REFERENCE_DATE = new Date('2026-07-15T00:00:00Z');
    const RealDate = Date;
    (globalThis as any).Date = class extends RealDate {
      constructor(...args: any[]) {
        if (args.length === 0) { super(REFERENCE_DATE.getTime()); return; }
        super(...args);
      }
      static now() { return REFERENCE_DATE.getTime(); }
    };
  ` : '';

  const runnerSource = `
    ${mockBlock}
    import { getEngine } from '${ROOT}/src/core/engines/registry.ts';
    await import('${ROOT}/src/engines/saas/mrr-calculator.ts');
    const engine = getEngine('solopreneur-mrr-calculator');
    const ex0 = engine.generate({
      subscriberCount:'500', monthlyPrice:'29', monthlyChurnRate:'3',
      expansionMRR:'800', newSubsPerMonth:'100', contractionMRR:'150', reactivationMRR:'100'
    })[0];
    process.stdout.write(ex0);
  `;
  fs.writeFileSync(runnerPath, runnerSource, 'utf8');

  try {
    const result = spawnSync('npx.cmd', ['tsx', runnerPath], {
      cwd: ROOT, encoding: 'utf8', shell: true,
    });
    if (result.status !== 0) {
      throw new Error(`runner.ts (mock=${includeMock}) exited ${result.status}.\nstdout: ${result.stdout}\nstderr: ${result.stderr}`);
    }
    return result.stdout;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
```

Why the helper:
- T3 and T4 share 95% of code (only the mock block differs). DRY.
- try/finally guarantees temp dir cleanup even on assertion failure mid-flight.
- `shell: true` for `npx.cmd` resolution on Windows (matches existing P50 T7 pattern).
- `cwd: ROOT` so tsx can resolve `import { getEngine } from '...registry.ts'` from the repo root.

### Anchor engine: why mrr-calculator

| Property | Why |
|---|---|
| Date-sensitive | Uses `Date` for projection (proven by P41 drift class). |
| Drift-proof anchor | P41 + P42 explicitly validated mrr-calculator as the canonical drift-prone engine. |
| Stable defaults | `codegen-examples.mjs:122` ships canonical default inputs, so the test pin to those exact values. |
| Unique pattern | Only one engine currently projects months → uses `~Sep`/`~Oct` literal in staticExamples; the substring check is engine-specific. |

If `mrr-calculator.ts:50` is later refactored to drop the `~Sep 2027` substring (e.g. switch to ISO date), T3/T4 will false-fail. Acceptable: this is a contract change that warrants a test review.

## Out of scope (explicit YAGNI)

Per user decision in this session's brainstorming:

1. **REFERENCE_DATE shift sanity test** — P47 §"Out of scope" deferred a "shift REFERENCE_DATE and verify output shifts proportionally" test. P51 continues to defer it. Reason: codegen-examples.mjs already runs `--check` against the locked date, so a shift would invalidate the entire staticExamples fleet. Drift-proofness is enforced by the lock, not by proportional-shift inspection.

2. **Cross-script expansion** — P51 only fills the runtime gap for codegen-examples. P47 covers structure, P50 covers codegen-customfn, P51 covers codegen-examples runtime. The triple-layer drift-guard is now complete for the two codegen scripts.

3. **Other engines** — mrr-calculator is the only date-projection engine. Adding more engines multiplies runtime cost (~6s per extra tsx subprocess) without adding coverage.

4. **Helper extraction** — `scripts/codegen-examples.mjs:buildRunnerScript()`'s mock block is NOT extracted to a shared helper. P51 only verifies it; refactoring is a separate task.

## Global Constraints

Hard requirements for the plan (every task implicitly inherits these).

1. **Test file location**: `tests/codegen-examples-mock-apply.test.ts` at `tests/` root. NOT `tests/scripts/`. Reason: P22b ESM trap — `tests/run.mjs` reads `tests/*.test.ts` only; subdir placement is silently skipped.

2. **No production code changes**: `scripts/codegen-examples.mjs`, `src/engines/saas/mrr-calculator.ts`, and every other file outside `tests/codegen-examples-mock-apply.test.ts` is UNCHANGED in this batch.

3. **Temp-dir isolation**: runner.ts is written to `os.tmpdir()` under `p51-mock-apply-<random>/runner.ts`, NOT to the repo cwd. try/finally + `fs.rmSync(tmpDir, { recursive: true, force: true })` guarantees cleanup.

4. **No backup-restore needed**: The temp runner is the only file written. `src/engines/saas/mrr-calculator.ts` is read by the tsx subprocess but not modified by the test.

5. **mrr-calculator defaults hard-coded**: Test inlines the 7 default inputs verbatim from `scripts/codegen-examples.mjs:122`. Comment in test points at this ground-truth line. If `codegen-examples.mjs:122` is refactored to change defaults, the test must be updated synchronously.

6. **Substring target**: `~Sep 2027` is the literal substring asserted by T3 (mock-applied) and asserted-absent by T4 (mock-removed). The exact string is in `src/engines/saas/mrr-calculator.ts:50` of the current disk state.

7. **pnpm check target**: 1117/0/0 (P50 final) → 1122/0/0 (+5).

8. **No new package.json slot**: Reuse existing `tests/run.mjs` + `node:test` infrastructure.

9. **No .githooks changes**: pre-commit hook slot 6 (`tests/lib/engine-count.ts`) and slot 7 (`tests/codegen-customfn-drift-guard.test.ts`) already in place; P51 is picked up by slot 7's wildcard `*.test.ts` pattern automatically.

10. **Dual-push 3-way sync target**: `0  0` between local / gitee (origin) / github on master. Apply P43 pre-push fetch + rev-list; apply P44 hook stale-cache bypass if github push blocked.

11. **Ship memory location**: `~/.claude/projects/D--E-----youtube-tools/memory/p51-codegen-examples-mock-apply-shipped.md` (auto-memory flat-file, NOT a git repo; NO `git commit` step — see P50 lesson #2). MEMORY.md index +1 line.

12. **MEMORY.md byte limit**: < 17100 bytes (hook limit). P50 final 16388 bytes; P51 +1 line (~100 bytes) = ~16488, well under.

## Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Tsx subprocess startup slow (~2-3s per call) | High | Low — adds ~6s to pnpm check | Accept. Total T3+T4+T5 ≈ 12s added to ~170s baseline. Not a bottleneck. |
| mrr-calculator default inputs drifted from `codegen-examples.mjs:122` | Low | Medium — false-fail | Test comment points at `codegen-examples.mjs:122` ground truth; sync update required on input refactor. |
| Inline mock block typo in test file | Medium | High — would silently fail T3 + falsely fail T4 | Copy **verbatim** from `scripts/codegen-examples.mjs:buildRunnerScript()` (P42 source-of-truth). Do not edit the inline copy. |
| Temp dir leakage on assertion failure | Low | Low — disk space | try/finally + `recursive: true, force: true` (P50 T7 pattern). |
| `npx.cmd` resolution on Windows | High (P50 T7 history) | Low | `shell: true` flag on `spawnSync`; identical to P50 T7 invocation that already works. |
| `Date.now()` override missing in inline mock | Low | High — T3 fails (generate() uses Date.now() indirectly) | Copy **verbatim** from P42 mock, including the `static now() { return ... }` block. |

## Sequencing dependencies

This spec does not depend on any prior production code change. It only reads:
- `scripts/codegen-examples.mjs` (P42 mock source)
- `src/engines/saas/mrr-calculator.ts` (P41 + P42 drift-proof anchor)
- `src/core/engines/registry.ts` (engine registration mechanism)

And produces one new test file + one ship memory file.

## Verification (post-implementation)

The implementer must run and report:

1. `node tests/codegen-examples-mock-apply.test.ts` standalone → 5/5 pass.
2. `pnpm check` full suite → 1122 pass / 0 fail / 0 skip.
3. `node scripts/codegen-examples.mjs --check` (smoke) → exits 0 + "PASSED".

Pre-merge holistic review (per CLAUDE.md Quality Gates) is warranted: 1 file changed, ~120-180 lines, low complexity → single-file change → task-level review suffices; no separate holistic pre-merge review needed.

## See also

- P41 mrr-calculator drift fix (`memory/p41-mrr-drift-fix-shipped.md`)
- P42 date drift-proof codegen (`memory/p42-date-drift-proof-shipped.md`)
- P47 codegen-drift-guard (`tests/codegen-drift-guard.test.ts`, `memory/p47-codegen-drift-guard-shipped.md`)
- P50 codegen-customfn drift guard (`tests/codegen-customfn-drift-guard.test.ts`, `memory/p50-codegen-customfn-drift-guard-shipped.md`)
- P22b ESM trap (`memory/p22b-engine-count-constant-shipped.md`)
- P43 GH Action sync-pricing divergence (`memory/p43-components-index-shipped.md`)
- P44 stale-cache push hook bypass (`memory/p44-scripts-index-shipped.md`)
