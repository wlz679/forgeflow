# P42 — Date Drift-Proof Codegen (mrr/burn-rate)

> **Date:** 2026-07-19
> **Trigger:** P41 ship memory surfacing P41+ candidate "drift-proof permanence" + burn-rate-calculator latent risk
> **Status:** Design → Implementation

## TL;DR

Inject a `Date` mock in `codegen-examples.mjs` runner script so `new Date()` returns a fixed reference date (2026-07-15) during codegen. This makes `staticExamples[0]` for date-bearing engines (currently `mrr-calculator.ts` + latently `burn-rate-calculator.ts`) drift-proof permanently. **0 engine files touched.** Runtime behavior (browser live calc + `customFn`) is completely unchanged — still uses real `new Date()`.

## Problem

P41 fixed an immediate mrr-calculator staticExamples[0] drift (`$50K MRR: 14.4 months (~Sep 2027)` → `(~Oct 2027)`) by regenerating the example. But this is a **time-passive fix** — drift will recur on next month boundary (2026-08-15 or so).

Audit findings (P42 pre-flight):
- **2 engines use `new Date()`** in their `calculate()` body: `mrr-calculator.ts` (L36) + `burn-rate-calculator.ts` (L41)
- **mrr-calculator.ts:35-41** has a `dateLabel(monthsFromNow)` closure that writes absolute month labels into output → drifts every month
- **burn-rate-calculator.ts:41-42** computes `runOutLabel` for cash-runout date → **currently latent**: the staticExample uses cash-positive scenario (`currentCash=500000, monthlyRevenue=20000 > monthlyExpenses=60000` → wait, expenses > revenue → net burn positive), so the example happens to hit the cash-positive branch that doesn't print run-out date. **But** the next input tweak could expose the drift.
- 98 other engines do not use `new Date()` inside `calculate()` — confirmed via grep

## Design Options Considered

| Option | Mechanism | Pros | Cons |
|---|---|---|---|
| A. `generate(inputs, opts?: {referenceDate?: Date})` signature | Codegen passes fixed date via second arg | Explicit, type-safe | 100 engine `generate()` signatures must change |
| B. `process.env.CODEGEN_REFERENCE_DATE` | Codegen spawn sets env var; engine reads | Zero per-engine change | Hidden; tsx child may not inherit env cleanly; runtime would also see it (global env leak) |
| C. `globalThis.__CODEGEN_MODE__` flag | Codegen sets flag; engine reads | Zero per-engine change | Hidden; globalThis pollution |
| D. AST transform at codegen | Replace `new Date()` with `new Date(REFERENCE)` via Babel/SWC | Codegen-only | Brittle; doesn't fix underlying pattern |
| **E. Monkey-patch `Date` constructor in runner script** ✅ | Override `globalThis.Date` in runner script so `new Date()` returns fixed date during codegen only | **Zero engine changes**; clean; codegen-local; runtime unaffected | Subtle pattern (relies on globalThis mock) |

**Decision: Option E** — minimal scope, cleanest separation, no engine code touched.

## Implementation

### Step 1: Inject Date mock at top of `buildRunnerScript()` in `scripts/codegen-examples.mjs`

Insert immediately after the imports, before `async function main() {`:

```ts
// ═══ Date mock for drift-proof codegen (P42) ═══
// During codegen, new Date() returns this fixed reference date so staticExamples[0]
// date labels stay stable across month boundaries. Runtime (browser live calc + customFn)
// is unaffected — those use the real Date constructor in their own context.
// Drift pattern background: P41 fixed mrr-calculator Sep→Oct 2027 label drift.
const REFERENCE_DATE = new Date('2026-07-15T00:00:00Z');
const RealDate = Date;
(globalThis as any).Date = class extends RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(REFERENCE_DATE.getTime());
      return;
    }
    super(...(args as []));
  }
  static now() {
    return REFERENCE_DATE.getTime();
  }
} as any;
```

### Step 2: Verify

```bash
node scripts/codegen-examples.mjs --check  # must exit 0
git diff --stat  # expect 0 lines changed in engine files (only codegen script + staticExamples drift)
pnpm check       # expect 1096 pass / 0 fail
```

### Step 3: Sanity check

Run codegen twice in a row. Between runs, simulate "month boundary crossed" by changing `REFERENCE_DATE` to a different fixed value. The output should change ONLY in expected date fields (e.g. `$50K MRR: 14.4 months (~Oct 2027)` → `(~Nov 2027)`), with all other content byte-identical.

This confirms the mock is scoped correctly to the codegen child process.

## Why This Is Drift-Proof

- `Date` is a global constructor. `new Date()` resolves to `globalThis.Date` at runtime.
- tsx child process runs the runner script with our mock applied. When engine `calculate()` calls `new Date()`, it invokes the mock.
- After tsx child exits, the mock is gone — the parent codegen process and any subsequent runtime use real `Date`.
- `customFn` (browser live calc) runs in a totally separate JS context (the user's browser); it never sees the mock.

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Some engine legitimately calls `new Date(arg)` with explicit args | Mock passes args through unchanged (only zero-arg `new Date()` returns reference date) |
| `Date.now()` static called somewhere in calculate() | Mock returns `REFERENCE_DATE.getTime()` for `.now()` |
| `Date.UTC(...)` or other statics called | NOT mocked — but no engine uses them (grep confirmed) |
| Future engine author unaware of mock | Add comment block in spec + memory note; existing engines already work |
| Mock persists across imports within same tsx process | INTENTIONAL — codegen runs to completion in single tsx process then exits |

## Out of Scope

- **CustomFn date logic** — runtime should always show real "today"; never mocked
- **Other engines using `new Date()` for non-display purposes** — none exist (audit confirms)
- **Testing infrastructure for the mock** — over-engineering; `--check` exit 0 is sufficient verification

## Files Changed

| File | Change | Lines |
|---|---|---|
| `scripts/codegen-examples.mjs` | Add 16-line Date mock block at top of `buildRunnerScript()` output | +16 |

**Total: 1 file / +16 lines.**

## Verification Plan

1. `node scripts/codegen-examples.mjs --check` → exit 0
2. `git diff --stat src/engines/` → 0 lines (only codegen file + expected staticExamples re-pin)
3. `git diff scripts/codegen-examples.mjs` → only the +16 mock block
4. `pnpm check` → 1096 pass / 0 fail / 0 skip
5. Visual inspection of regenerated mrr-calculator staticExamples[0]: `$50K MRR: 14.4 months (~Jul 2027)` (was Sep→Oct 2027, now pinned to Jul 2027 based on REFERENCE_DATE = 2026-07-15)
6. Sanity test: change REFERENCE_DATE to 2027-01-15 → re-run codegen → output should change ONLY date labels (~$50K → Feb 2028), everything else byte-identical

## Rollback

If mock causes unexpected behavior:
1. Revert `scripts/codegen-examples.mjs` (single file)
2. Re-run `node scripts/codegen-examples.mjs` to regenerate staticExamples at real "today"
3. No engine changes to revert

## Lessons (anticipated)

1. **Codegen-local mocks are a powerful drift-proof pattern** — when output depends on time/random/env, inject control at the codegen boundary instead of refactoring engines
2. **`globalThis.Date` mock is sufficient** — no need for jsdom, happy-dom, or sinon's heavier machinery
3. **P41 was correct as immediate fix; P42 closes root cause** — the SKIP → fix → drift-proof progression is the right pattern

## P42+ candidates (not in this spec)

- Audit `customFn` minified strings for any `new Date()` calls that don't match `calculate()` behavior
- Add a `tests/codegen-drift-guard.test.ts` that runs codegen twice with different REFERENCE_DATE values and asserts only date fields differ
- Extend mock to control `Math.random()` for engines that use it (none currently, but defensive)
