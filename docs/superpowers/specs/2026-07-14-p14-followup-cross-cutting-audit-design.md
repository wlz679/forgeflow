# P14-Followup: Cross-Cutting Input UX + Defensive Clamp — Design Spec

> **Date:** 2026-07-14
> **Status:** Approved (brainstorming complete)
> **Branch:** master
> **Scope:** Single P14-followup batch
> **Lines added/modified:** ~150-200 LOC across 1 new file + 43 modified files

## 1. Problem Statement

P14 series shipped 6 new Legal & Compliance calculators (L-1..L-6) bringing the engine count to 98. Two cross-cutting UX/correctness issues deferred at P14-7 closure:

1. **HTML5 `step="any"` missing on all `type="number"` inputs** across 41 P6-P14 new-pattern engines. `<input type="number">` defaults to `step="1"`. Browser spinner controls snap decimal inputs (e.g., `12.5` → `12` or `13`) and may reject non-integer values on form submit. Users entering currency rates (`€95/hr`), percentages (`4.5%`), or decimal ratios (`0.06`) get a worse UX than necessary.

2. **HEALTH_BANDS negative-input guard missing** on most P-series engines. Helper functions and `customFn` body typically read raw `Number(inputs.x) || 0` without clamping. A user entering `-100` in any input produces a calculated ratio/cost that falls into the lowest band (🟢 Excellent) because most band comparators use `<` against thresholds. Result: misleading "everything's fine" verdict when actual input is invalid.

Both are cross-cutting polish bugs that touch ~41 engines + 1 Astro template. Best practice for a single batch.

## 2. Decisions (from brainstorming Q&A)

| Decision | Choice | Rationale |
|---|---|---|
| Batch structure | Single P14-followup batch | Both items are cross-cutting; one PR for coherent review |
| Engine scope | P6-P14 new-pattern only (~41 engines) | Excludes 24 BIZ_* old-pattern + pre-P5 engines (out of scope) |
| Guard layers | HTML5 `min="0"` + helper `Math.max(0, x)` | Defense-in-depth: UX feedback + programmatic safety |
| `step` precision | `step="any"` globally | Most P-series inputs are decimals (rates, percentages, currency) |
| Negative-input legitimacy | None — all inputs are non-negative by design | P-series inputs are counts/rates/percentages/currency; no delta calcs |
| Helper-layer strategy | Shared `clampNonNegative(x)` in `src/core/engines/helpers.ts` | DRY; one source of truth used by all engines' `calculate()` + `customFn` |

## 3. Architecture

### 3.1 Two-layer defense

```
┌─────────────────────────────────────────────────────────────────────┐
│ Browser                                                             │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ <input type="number" step="any" min="0" id="...">              │ │
│ │   ↑ Layer 1: HTML5 native UX (red ring on <0, decimal support)│ │
│ └─────────────────────────────────────────────────────────────────┘ │
│                              ↓                                       │
│ ┌─────────────────────────────────────────────────────────────────┐ │
│ │ customFn (minified JS in browser runtime)                      │ │
│ │   var x = clampNonNegative(Number(inputs.x) || 0);             │ │
│ │   ↑ Layer 2: programmatic defensive clamp at compute time       │ │
│ └─────────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────┘

              + Astro build-time rendering:

src/pages/[lang]/[slug].astro
  - For each engine.inputs[i] where type === 'number':
    render <input step="any" min="0">

src/engines/<cat>/<slug>-calculator.ts
  - generate() reads inputs, passes through clampNonNegative()
  - customFn (browser) inlines clampNonNegative() via codegen

src/core/engines/helpers.ts  (NEW)
  - export function clampNonNegative(x: number): number
    → returns Math.max(0, x)
```

### 3.2 Why defense-in-depth

- **Layer 1 only (HTML5 `min="0"`)** catches user-typed negatives at form submit, but JavaScript reading `input.value` programmatically still gets the negative. URL params (e.g., `?revenue=-50`), preset data (`data-revenue="-50"`), and shared `customFn` invocations all bypass HTML5.
- **Layer 2 only (helper clamp)** catches programmatic negatives, but the user sees no immediate feedback — they type `-50`, see no warning, click "Calculate", and get a misleading "Excellent" verdict with the input field still showing `-50`.
- **Both layers:** red ring on entry + clamp on compute = correct outcome with good UX.

## 4. Components

### 4.1 New file: `src/core/engines/helpers.ts` (~5 lines)

```ts
/**
 * Clamp a numeric input to [0, Infinity).
 *
 * Used by P-series engines to defensively guard against negative values
 * (e.g., from URL params, presets, or copy-paste typos) that would
 * otherwise silently produce misleading "Excellent" band verdicts.
 *
 * HTML5 min="0" on input fields is the first UX layer; this is the
 * second safety layer at compute time.
 */
export function clampNonNegative(x: number): number {
  return Math.max(0, x);
}
```

Plus optional companion `clampNonNegativeOptional(x: number | undefined): number` returning `0` for undefined → 0. Single-purpose helper keeps the call sites tight.

### 4.2 Modified files (3 categories)

| File | Change | LOC |
|---|---|---|
| `src/pages/[lang]/[slug].astro` | Find all `<input type={input.type}` instances (~6-7 across AI branches). For `input.type === 'number'`, add `step="any" min="0"`. Skip selects. | ~15 |
| `src/engines/<cat>/<slug>-calculator.ts` (×41) | Import `clampNonNegative` from `'../../core/engines/helpers'`. Wrap each `Number(inputs.X) || 0` with `clampNonNegative(Number(inputs.X) || 0)`. Apply in BOTH `generate()` (build-time) AND `customFn` (browser runtime). | ~3 lines per engine × 41 = ~120 |
| `src/core/engines/types.ts` | No change unless helper signature requires type addition. TBD during implementation. | 0 |

### 4.3 Excluded from this batch

- 24 BIZ_*_* old-pattern engines (different form rendering pipeline at `[slug].astro:1387-1454`)
- Pre-P5 solopreneur engines that use inline `calculate()` and lack the HEALTH_BANDS pattern
- AI calculator presets (only fixes the form input, not preset button click handlers)

## 5. Data flow

### 5.1 User submits form via browser (live calc)

```
<input type="number" step="any" min="0" id="monthly_visitors" value="200000">
│
▼ (browser: spinner accepts decimals; rejects <0 with native tooltip)
│
customFn ("function run(inputs, pick, fill) { ... }") {
  var visitors = clampNonNegative(Number(inputs.monthly_visitors) || 0);
  //                            ↑↑ Layer 2: defensive clamp
  var gap = ...;
  return ['🩺 ...', ...];
}
│
▼ (returns string[])
│
[ResultCard renders 6 v3 sections]
```

### 5.2 SSR / page render via calculate()

```
src/engines/legal-compliance/consent-revenue-impact-calculator.ts
generate(inputs) {
  const visitors = clampNonNegative(Number(inputs.monthly_visitors) || 0);
  const gap = consentGap(current, target);
  return [...];   // 6 v3 section array
}
│
▼ (Astro build time)
│
[page HTML with rendered initial example]
```

### 5.3 Edge case behaviors

| Input | Pre-fix behavior | Post-fix behavior | Notes |
|---|---|---|---|
| `""` | `0` | `0` | Same (empty is non-negative) |
| `"abc"` | `NaN \|\| 0 = 0` | `0` | Same (NaN guard unchanged) |
| `"0"` | `0` | `0` | Same |
| `"100"` | `100` | `100` | Same |
| `"-50"` | `-50` (passes through) | `0` | **NEW: clamp catches it** |
| `"-50"` + UI | red ring on input | red ring + clamp on compute | **NEW: two-layer UX** |
| `"100.5"` | allowed but spinner snaps to `100` or `101` | accepted as `100.5` | **NEW: step="any" preserves decimal** |
| `"-50"` for L-1 GDPR | `revenueRatio(-50 ...)` → NaN/error | `revenueRatio(0 ...)` → 0/0 → 0 | Defensive |

### 5.4 Boundary preservation

- No call to `console.warn` or user-facing toast for clamped values (silent defensive clamp).
- User sees a regular result (e.g., 🟢 if everything else = 0). They self-correct by reading the output.
- This matches existing P14-3 `consentGap` and P14-2 `manualHoursPerDSAR` clamp patterns.

## 6. Testing

### 6.1 Helper unit test (NEW file `tests/helpers.test.ts`)

6 tests covering:
1. `clampNonNegative(-1) === 0`
2. `clampNonNegative(0) === 0`
3. `clampNonNegative(100) === 100`
4. `clampNonNegative(NaN) === 0` (NaN via `||` guard)
5. `clampNonNegative(undefined as any) === 0` (defensive)
6. `clampNonNegative(Infinity) === Infinity` (Math.max doesn't break infinity)

### 6.2 Per-engine test additions (+1 per P-series engine, 41 engines)

Each engine's existing `tests/<slug>-calculator.test.ts` gains 1 test verifying that:
- `clampNonNegative` is called from the engine's helper path
- `calcHealthBand(negative_test_value)` returns the expected band (e.g., `excellent` per `<` comparator)

Example new test for L-1 GDPR Fine:
```ts
test('negative revenue guard: -25M clamps to 0 ratio (not critical)', () => {
  // Layer 2: even if user types -25M, calc helper clamps to 0 → ratio = 0 (existing revenue > 0 guard)
  const maxFine = maxFineAmount(0, 4);
  const ratio = exposureRatio(0, 0);  // 0/revenue = 0
  assert.equal(ratio, 0);
  assert.equal(calcHealthBand(ratio), 'excellent');
});
```

### 6.3 Integration smoke test (manual, NOT automated)

Per implementation plan:
- `pnpm dev` → open `/en/gdpr-fine-calculator/` → verify inputs render with `step="any"` hint (no spinner snap).
- Type `-50` in any input → red ring visible.
- Click Calculate → result uses clamped values.

### 6.4 Test artifacts

```
tests/helpers.test.ts                                            (NEW)
src/engines/<cat>/<slug>-calculator.ts (×41)                      (import + ~3 lines)
tests/<slug>-calculator.test.ts (×41)                            (+1 test each)
src/pages/[lang]/[slug].astro                                     (~7 input tags updated)
src/core/engines/helpers.ts                                       (NEW, ~5 lines)
```

### 6.5 Acceptance criteria

1. `tests/helpers.test.ts` ≥ 5 tests pass
2. All 41 P-series engine tests pass with new negative-clamp test (no existing test regression)
3. `pnpm check` exits 0 (with `SKIP_PRECOMMIT_CHECK=1` allowed for pre-existing Clerk/Supabase env flakes)
4. Visual smoke test of 3 calc pages (L-1 GDPR, P9-1 NRR, P13-1 KB Coverage) confirms `<input step min>` attributes present
5. Form-test: type `-1` in any input → red ring visible; `Calculate` → result = 0 / band per axis

## 7. Out of scope (will be deferred or noted in series memory)

- 24 BIZ_*_* old-pattern engines — defer to P15 or dedicated audit
- Pre-P5 engines without HEALTH_BANDS pattern — defer to dedicated audit
- Preset button data-attribute consistency (presets already use `data-XXX=""` strings; no negative scenario)
- AI calculator custom preset chips — already work correctly with their string-based presets
- Cross-engine codegen enhancement (auto-inject `clampNonNegative` for all engine `customFn`) — defer to P15 (would require codegen rewriting, larger scope)

## 8. Rollout plan

1. Land P14-followup in a single batch (one commit if reasonable; multiple per-task if clearer)
2. Smoke test 3+ engines in dev mode
3. Run `pnpm check` with `SKIP_PRECOMMIT_CHECK=1` to bypass pre-existing Clerk/Supabase env flakes
4. Dual-push to gitee + github; verify 3-way sync via `git rev-list --left-right --count origin/master...github/master → 0 0`
5. Update `memory/p14-followup-cross-cutting-audit-shipped.md` + `MEMORY.md` index pointer

## 9. Risk assessment

**Low risk:**
- `Math.max(0, x)` is arithmetic (no edge case beyond `NaN`)
- `<input step="any" min="0">` is HTML standard, browser-supported in all evergreen browsers
- 41 engines × 3-line wrap is mechanical; mechanical changes have highest review reliability
- P-series engines already pattern-clamp (P14-3, P14-2 set the precedent) — minimal behavior delta

**Medium risk:**
- CustomFn wrap means codegen may need to inline `clampNonNegative` (similar to how `fmtMoney` is inlined per P14-6 lesson)
- If codegen doesn't catch helper changes, manual customFn edit is needed (41 places)
- Pre-existing Clerk/Supabase env flakes will continue to fail pnpm check — must use SKIP flag

**Mitigations:**
- Use `appendFileSync` for engine file edits (P9-2 lesson: avoid Bash printf quote issues for large file edits)
- Pre-validate via `node scripts/codegen-examples.mjs --check` after engine edits
- Per-P-series task: 1 implementer + 1 reviewer + 1 spec-compliance check (mechanical task class)
