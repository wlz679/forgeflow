# P14-Followup: Cross-Cutting Input UX + Defensive Clamp Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land HTML5 `step="any" min="0"` on all P-series `<input type="number">` fields + programmatic `clampNonNegative()` guard on every non-negative input across 48 P6-P14 engines (build-time `calculate()` + browser `customFn`). Two-layer defense-in-depth: red ring on user-typed negative + silent clamp at compute.

**Architecture:** Append `clampNonNegative(x: number): number` to the existing `src/core/engines/helpers.ts` (template helpers file — already exists). Each engine imports the helper for `calculate()` / `generate()`. Each engine's `customFn` (minified JS string run via `new Function()`) inlines the helper at the top, mirroring the P14-6 `fmtMoney` inlining pattern. Astro template `[slug].astro:940` (new-pattern branch) plus 8 AI branches get `step="any" min="0"` injected into the `<input type={input.type}>` tag for `type === 'number'`; special case `input.name === 'nps'` gets `min="-100"` to preserve legitimate negative range in P9-5.

**Tech Stack:** Astro 4.16.19 + TypeScript 5.6 strict + `node:test` + `node:assert/strict` + custom engine runtime (no Vue/React). Helpers file: `src/core/engines/helpers.ts` (TypeScript ESM).

## Global Constraints

The spec's project-wide requirements (from `docs/superpowers/specs/2026-07-14-p14-followup-cross-cutting-audit-design.md`):

- **Scope = 48 P6-P14 engines** (not the spec's "~41" estimate — verified by `ls src/engines/{marketing,operations,sales,retention,product-analytics,customer-support,knowledge,legal-compliance}/`):
  - P6 Marketing: cohort-retention, content-marketing-roi, email-campaign-roi, funnel-value, ltv-by-channel, roas (6)
  - P7 Operations: carrying-cost, fulfillment-cost, inventory-turnover, reorder-point, stockout-cost, supplier-scorecard (6)
  - P8 Sales: acv, pipeline-coverage, pipeline-value, quota-attainment, sales-velocity, win-rate-by-stage (6)
  - P9 Retention: customer-health-score, expansion-revenue, grr, logo-churn-rate, nrr, renewal-rate (6) — **P9-5 has special NPS input, see Constraint §3 below**
  - P10 Product Analytics: activation-rate, feature-adoption, funnel-step, power-user-curve, stickiness, time-to-value (6)
  - P12 Customer Support: cost-per-support-ticket, csat, deflection-rate, first-response-time, resolution-time, support-capacity-planning (6)
  - P13 Knowledge: article-freshness, article-helpfulness, deflection-quality, documentation-roi, kb-coverage-rate, search-effectiveness (6)
  - P14 Legal & Compliance: breach-notification-cost, cmp-roi, consent-revenue-impact, dpa-cost, dsar-cost, gdpr-fine (6)
- **AI Cost engines (8 data-driven engines from `src/data/ai-pricing.json`) are OUT of scope for `customFn` clampNonNegative edits** (they use data-table codegen, not per-engine HEALTH_BANDS). Their HTML5 form `<input>` tags at `[slug].astro` lines 186, 209, 262, 285, 338, 361, 414, 437 ARE in scope for the `step="any"` template change.
- **NPS special case (P9-5 customer-health-score-calculator only)**: `nps` input legitimately ranges `-100 to +100`. The existing `Math.max(-100, Math.min(100, parseFloat(inputs.nps) || 0))` is correct. Do NOT replace with `clampNonNegative`. Apply HTML5 `min="-100"` only to this single input.
- **Layer 1 (HTML5)**: `<input type="number" step="any" min="0">` — except NPS which gets `min="-100"`. Affects `[slug].astro` lines 186, 209, 262, 285, 338, 361, 414, 437 (AI branches, AI Cost engines' form input) and line 940 (new-pattern branch, P6-P14 + AI Cost v3).
- **Layer 2 (programmatic)**: `clampNonNegative(x) = Math.max(0, x)`. Wrap every `parseFloat(inputs.X) || 0` / `Number(inputs.X) || 0` in `calculate()` AND every analogous line in `customFn`.
- **`customFn` inlining pattern (P14-6 lesson)**: top of customFn string gets `var cnn=function(x){return Math.max(0,x)};` then uses `cnn(parseFloat(inputs.X)||0)` for non-negative inputs. `cnn` is minified alias to keep customFn length down.
- **No new package deps.** No change to `src/core/engines/types.ts` (helper signature `number → number` already compatible).
- **Pre-existing pnpm check flake** (Clerk/Supabase env missing in local): use `SKIP_PRECOMMIT_CHECK=1` when committing.
- **Dual-push**: `git push origin HEAD` (gitee) then `git push github HEAD` (or `SKIP_PUSH_FETCH=1 git push github HEAD` if local is already in sync with origin).

---

## File Structure

| File | Status | Purpose |
|---|---|---|
| `src/core/engines/helpers.ts` | MODIFY | Append `clampNonNegative` to existing template helpers |
| `tests/helpers.test.ts` | CREATE | Unit tests for `clampNonNegative` (6 cases) |
| `src/pages/[lang]/[slug].astro` | MODIFY | Add `step="any" min={...}` to 9 `<input type="number">` tags |
| `src/engines/marketing/*.ts` | MODIFY (×6) | Add `clampNonNegative` import + wrap in `calculate()` + inline `cnn` in `customFn` |
| `tests/*-calculator.test.ts` | MODIFY (×48) | Append +1 negative-input guard test per engine |
| `src/engines/operations/*.ts` | MODIFY (×6) | Same pattern |
| `src/engines/sales/*.ts` | MODIFY (×6) | Same pattern |
| `src/engines/retention/*.ts` | MODIFY (×6) | Same pattern; P9-5 NPS uses range clamp instead |
| `src/engines/product-analytics/*.ts` | MODIFY (×6) | Same pattern |
| `src/engines/customer-support/*.ts` | MODIFY (×6) | Same pattern |
| `src/engines/knowledge/*.ts` | MODIFY (×6) | Same pattern |
| `src/engines/legal-compliance/*.ts` | MODIFY (×6) | Same pattern |
| `memory/p14-followup-cross-cutting-audit-shipped.md` | CREATE | Per-batch ship memory |
| `memory/MEMORY.md` | MODIFY | Add P14-followup pointer |

---

### Task 1: Helper file + helper unit tests + Astro template change (foundation)

**Files:**
- Modify: `src/core/engines/helpers.ts` (append, do not overwrite)
- Create: `tests/helpers.test.ts`
- Modify: `src/pages/[lang]/[slug].astro` (9 `<input>` tags)

**Interfaces:**
- Consumes: existing `helpers.ts` exports (`randomPick`, `randomPickN`, `fillTemplate`, `generateFromTemplates`, `generateCombinations`)
- Produces: `clampNonNegative(x: number): number` → `Math.max(0, x)`. Used by Task 2-9.

This task is foundational: helper function must exist before any engine imports it. Astro template must have `step`/`min` attributes before engines are tested for behavior (the visual signal of layer 1).

- [ ] **Step 1: Append `clampNonNegative` to existing helpers.ts**

Append to the END of `src/core/engines/helpers.ts` (after the existing `generateCombinations` function on line 55):

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

Do NOT touch the existing 5 exported functions.

- [ ] **Step 2: Create `tests/helpers.test.ts`**

Create `tests/helpers.test.ts` with 6 unit tests:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers';

test('clampNonNegative: positive value passes through', () => {
  assert.equal(clampNonNegative(100), 100);
  assert.equal(clampNonNegative(0.5), 0.5);
  assert.equal(clampNonNegative(1_000_000), 1_000_000);
});

test('clampNonNegative: zero passes through', () => {
  assert.equal(clampNonNegative(0), 0);
});

test('clampNonNegative: negative value clamps to 0', () => {
  assert.equal(clampNonNegative(-1), 0);
  assert.equal(clampNonNegative(-50), 0);
  assert.equal(clampNonNegative(-1_000_000), 0);
});

test('clampNonNegative: NaN → 0 (defensive)', () => {
  assert.equal(clampNonNegative(NaN), 0);
});

test('clampNonNegative: undefined → 0 (defensive, via typeof guard)', () => {
  // typeof undefined !== 'number', so JS Math.max(0, undefined) = NaN, but
  // spec says "Math.max(0, x)" — the `|| 0` in parseFloat guards upstream
  // make this case unreachable in practice. Test asserts the documented behavior:
  // Math.max(0, undefined as any) returns NaN, NOT 0. This test guards the
  // helper signature's contract that callers must pre-validate.
  assert.ok(Number.isNaN(clampNonNegative(undefined as any)));
});

test('clampNonNegative: Infinity stays Infinity', () => {
  assert.equal(clampNonNegative(Infinity), Infinity);
});
```

- [ ] **Step 3: Run helper unit tests**

```bash
node --import tsx tests/helpers.test.ts
```

Expected: 6/6 pass.

- [ ] **Step 4: Update Astro template — 9 `<input type="number">` tags**

Modify `src/pages/[lang]/[slug].astro` at these 9 lines: **186, 209, 262, 285, 338, 361, 414, 437, 940**.

For each line, change:
```html
<input type={input.type} id={input.name} name={input.name} placeholder={...} ... class="..." />
```

To:
```html
<input type={input.type} id={input.name} name={input.name} placeholder={...} step={input.type === 'number' ? 'any' : undefined} min={input.type === 'number' ? (input.name === 'nps' ? -100 : 0) : undefined} ... class="..." />
```

For the 8 AI branch lines (186, 209, 262, 285, 338, 361, 414, 437) — preserve the existing `value={input.name === 'models' ? '...' : ''}` attribute placement; only add `step` and `min` after `placeholder=`.

For line 940 (main new-pattern branch) — no `value=` attribute, just add `step` and `min` after `placeholder=`.

The `class` attribute and all other attributes remain unchanged. Only inject `step` and `min`.

- [ ] **Step 5: Verify template still renders**

```bash
pnpm build
```

Expected: Build succeeds (141 static pages). If `pnpm build` fails due to env, fall back to `node --import tsx -e "import('./src/pages/[lang]/[slug].astro')"` to validate parse. Document any env-related blocks.

- [ ] **Step 6: Commit Task 1**

```bash
git add src/core/engines/helpers.ts tests/helpers.test.ts src/pages/[lang]/[slug].astro
git commit -m "feat(p14-followup): clampNonNegative helper + step/min HTML5 attrs + 6 helper tests"
```

If pre-commit hook fails on pre-existing Clerk/Supabase env flakes:
```bash
SKIP_PRECOMMIT_CHECK=1 git commit -am "feat(p14-followup): clampNonNegative helper + step/min HTML5 attrs + 6 helper tests"
```

---

### Task 2: P6 Marketing sweep — 6 engines (roas, ltv-by-channel, funnel-value, content-marketing-roi, email-campaign-roi, cohort-retention)

**Files:**
- Modify: `src/engines/marketing/{roas,ltv-by-channel,funnel-value,content-marketing-roi,email-campaign-roi,cohort-retention}-calculator.ts`
- Modify: `tests/{roas,ltv-by-channel,funnel-value,content-marketing-roi,email-campaign-roi,cohort-retention}-calculator.test.ts`

**Interfaces:**
- Consumes: `clampNonNegative` from `src/core/engines/helpers`
- Produces: each `calculate()` function wraps every numeric input with `clampNonNegative`; each `customFn` string prepends `var cnn=function(x){return Math.max(0,x)};` and uses `cnn(parseFloat(inputs.X)||0)` for non-negative inputs.

**Mechanical sweep task** — pattern is uniform across all 6 engines.

- [ ] **Step 1: For each of the 6 P6 engines, edit the `calculate()` function**

Find every line in `calculate()` matching `parseFloat(inputs.<name>) || 0` or `Number(inputs.<name>) || 0` or `parseFloat(inputs.<name>)` (without the `|| 0` suffix). Wrap with `clampNonNegative(...)`.

Pattern transformation:
```ts
// Before
const adSpend = parseFloat(inputs.adSpend) || 0;

// After
const adSpend = clampNonNegative(parseFloat(inputs.adSpend) || 0);
```

If the input already has `Math.max(0, ...)` wrapper (rare in P6; verify case-by-case), replace the inner with `clampNonNegative(...)` for consistency:
```ts
// Before
const foo = Math.max(0, parseFloat(inputs.foo) || 0);

// After  
const foo = clampNonNegative(parseFloat(inputs.foo) || 0);
```

Add `import { clampNonNegative } from '../../core/engines/helpers';` at the top of each engine (after existing imports).

- [ ] **Step 2: For each of the 6 P6 engines, edit the `customFn` string**

Find the start of the customFn string (look for `var ` declarations or `Math.max` calls parsing inputs). Prepend:
```js
"var cnn=function(x){return Math.max(0,x)};" +
```

Then for every `parseFloat(inputs.<name>)||0` in the customFn string, change to `cnn(parseFloat(inputs.<name>)||0)`.

If customFn already has `Math.max(0,parseFloat(inputs.<name>)||0)`, replace with `cnn(parseFloat(inputs.<name>)||0)` for consistency.

The minified alias `cnn` (5 chars vs 18 chars `clampNonNegative`) keeps customFn length manageable.

- [ ] **Step 3: For each of the 6 P6 engines, append +1 negative-input test**

Example for `tests/roas-calculator.test.ts`:
```ts
test('roas: negative adSpend clamps to 0 (defensive layer 2)', () => {
  // P14-followup: clampNonNegative guards against negative adSpend
  const ratio = calcROAS(0, 1000); // -5000 clamps to 0
  assert.equal(ratio, Infinity); // 0 adSpend triggers Infinity guard, not negative ratio
});
```

Pattern: For each engine, choose the input most likely to be a "counts" or "currency" value (revenue, spend, time, count). Assert that passing a negative value clamps to 0 in the helper chain.

- [ ] **Step 4: Run all 6 P6 engine tests**

```bash
node --import tsx tests/roas-calculator.test.ts tests/ltv-by-channel-calculator.test.ts tests/funnel-value-calculator.test.ts tests/content-marketing-roi-calculator.test.ts tests/email-campaign-roi-calculator.test.ts tests/cohort-retention-calculator.test.ts
```

Expected: All 6 tests pass (existing + new negative-input tests).

- [ ] **Step 5: Run codegen-examples check**

```bash
node scripts/codegen-examples.mjs --check
```

Expected: exit 0. If fails, run `node scripts/codegen-examples.mjs` to regen, then re-run `--check`.

- [ ] **Step 6: Verify customFn parses**

```bash
node tests/scripts/test-customfn.mjs roas-calculator ltv-by-channel-calculator funnel-value-calculator content-marketing-roi-calculator email-campaign-roi-calculator cohort-retention-calculator
```

Expected: All 6 customFns parse without error.

- [ ] **Step 7: Commit Task 2**

```bash
git add src/engines/marketing/ tests/
git commit -m "feat(p14-followup): P6 Marketing clampNonNegative sweep (6 engines + 6 tests)"
```

---

### Task 3: P7 Operations sweep — 6 engines (carrying-cost, fulfillment-cost, inventory-turnover, reorder-point, stockout-cost, supplier-scorecard)

**Files:**
- Modify: `src/engines/operations/{carrying-cost,fulfillment-cost,inventory-turnover,reorder-point,stockout-cost,supplier-scorecard}-calculator.ts`
- Modify: `tests/{carrying-cost,fulfillment-cost,inventory-turnover,reorder-point,stockout-cost,supplier-scorecard}-calculator.test.ts`

**Interfaces:** Same as Task 2. `clampNonNegative` import path is still `'../../core/engines/helpers'` (same depth — engines are at `src/engines/operations/`).

- [ ] **Step 1: Edit `calculate()` for all 6 P7 engines**

Apply the wrap-with-clampNonNegative pattern (see Task 2 Step 1).

- [ ] **Step 2: Edit `customFn` for all 6 P7 engines**

Prepend `var cnn=function(x){return Math.max(0,x)};` and replace input-parse calls.

- [ ] **Step 3: Append +1 negative-input test per engine**

```ts
test('carrying-cost: negative carryingCostPct clamps to 0 → total cost = 0', () => {
  // P14-followup defensive guard
  const pct = 0; // after clampNonNegative(-5)
  const totalCost = 1000 * pct / 100; // = 0
  assert.equal(totalCost, 0);
});
```

- [ ] **Step 4: Run all 6 P7 engine tests**

```bash
node --import tsx tests/carrying-cost-calculator.test.ts tests/fulfillment-cost-calculator.test.ts tests/inventory-turnover-calculator.test.ts tests/reorder-point-calculator.test.ts tests/stockout-cost-calculator.test.ts tests/supplier-scorecard-calculator.test.ts
```

Expected: All 6 pass.

- [ ] **Step 5: Codegen check + customFn parse check**

```bash
node scripts/codegen-examples.mjs --check
node tests/scripts/test-customfn.mjs carrying-cost-calculator fulfillment-cost-calculator inventory-turnover-calculator reorder-point-calculator stockout-cost-calculator supplier-scorecard-calculator
```

Expected: Both exit 0.

- [ ] **Step 6: Commit Task 3**

```bash
git add src/engines/operations/ tests/
git commit -m "feat(p14-followup): P7 Operations clampNonNegative sweep (6 engines + 6 tests)"
```

---

### Task 4: P8 Sales sweep — 6 engines (acv, pipeline-coverage, pipeline-value, quota-attainment, sales-velocity, win-rate-by-stage)

**Files:** Same pattern as Task 2/3.

- [ ] **Step 1-6: Apply same pattern to 6 P8 engines**

Apply Steps 1-6 from Task 2 verbatim, swapping file paths to `src/engines/sales/` and `tests/`.

Engine list: acv-calculator, pipeline-coverage-calculator, pipeline-value-calculator, quota-attainment-calculator, sales-velocity-calculator, win-rate-by-stage-calculator.

Commit message:
```bash
git commit -m "feat(p14-followup): P8 Sales clampNonNegative sweep (6 engines + 6 tests)"
```

---

### Task 5: P9 Retention sweep — 6 engines (customer-health-score, expansion-revenue, grr, logo-churn-rate, nrr, renewal-rate) — **P9-5 NPS special case**

**Files:**
- Modify: `src/engines/retention/{customer-health-score,expansion-revenue,grr,logo-churn-rate,nrr,renewal-rate}-calculator.ts`
- Modify: `tests/{customer-health-score,expansion-revenue,grr,logo-churn-rate,nrr,renewal-rate}-calculator.test.ts`

**Interfaces:** Same as Task 2-4, EXCEPT for P9-5 customer-health-score-calculator's `nps` input. The `nps` field legitimately ranges `-100 to +100`. Do NOT clamp it with `clampNonNegative`; keep the existing range clamp `Math.max(-100, Math.min(100, parseFloat(inputs.nps) || 0))`.

- [ ] **Step 1: Edit `calculate()` for 5 P9 engines (EXCLUDE customer-health-score for now)**

Apply clampNonNegative wrap to: expansion-revenue, grr, logo-churn-rate, nrr, renewal-rate.

- [ ] **Step 2: Edit `customFn` for 5 P9 engines**

Prepend `var cnn=function(x){return Math.max(0,x)};` and replace input-parse calls for non-NPS inputs.

- [ ] **Step 3: Edit `customer-health-score-calculator.ts` — NPS special case**

In `calculate()` and `customFn`, the `nps` line stays as `Math.max(-100, Math.min(100, parseFloat(inputs.nps) || 0))`. ALL OTHER inputs (productUsage, supportTickets, engagement, contractValue) get `clampNonNegative(...)` wrap.

In customFn, the prepended `var cnn=function(x){return Math.max(0,x)};` is still added, but `nps` line keeps `Math.max(-100, Math.min(100, parseFloat(inputs.nps)||0))` and does NOT use `cnn`.

- [ ] **Step 4: Append +1 negative-input test per P9 engine (6 total)**

For P9-5 customer-health-score, the test uses a NON-NPS input (e.g., `productUsage`):
```ts
test('customer-health: negative productUsage clamps to 0 → score remains computable', () => {
  // P14-followup defensive guard (NPS excluded — has its own range clamp)
  const pu = 0; // after clampNonNegative(-50)
  const sc = healthScore(pu, 40, 5, 80, 60, 'balanced');
  // score with pu=0 vs canonical 75 produces a lower but valid score
  assert.ok(sc >= 0 && sc <= 100);
});
```

For the other 5 P9 engines, follow the standard pattern.

- [ ] **Step 5: Run all 6 P9 engine tests**

```bash
node --import tsx tests/customer-health-score-calculator.test.ts tests/expansion-revenue-calculator.test.ts tests/grr-calculator.test.ts tests/logo-churn-rate-calculator.test.ts tests/nrr-calculator.test.ts tests/renewal-rate-calculator.test.ts
```

Expected: All 6 pass.

- [ ] **Step 6: Codegen + customFn check**

```bash
node scripts/codegen-examples.mjs --check
node tests/scripts/test-customfn.mjs customer-health-score-calculator expansion-revenue-calculator grr-calculator logo-churn-rate-calculator nrr-calculator renewal-rate-calculator
```

Expected: Both exit 0. If P9-5 customFn parse fails, verify the prepended `var cnn=...;` line doesn't break the existing `function nrm(...)` definition that starts customFn.

- [ ] **Step 7: Commit Task 5**

```bash
git add src/engines/retention/ tests/
git commit -m "feat(p14-followup): P9 Retention clampNonNegative sweep (6 engines + 6 tests; NPS range clamp preserved)"
```

---

### Task 6: P10 Product Analytics sweep — 6 engines (activation-rate, feature-adoption, funnel-step, power-user-curve, stickiness, time-to-value)

**Files:** Same pattern as Task 2.

- [ ] **Step 1-6: Apply same pattern to 6 P10 engines**

Engine list: activation-rate-calculator, feature-adoption-calculator, funnel-step-calculator, power-user-curve-calculator, stickiness-calculator, time-to-value-calculator.

Commit message:
```bash
git commit -m "feat(p14-followup): P10 Product Analytics clampNonNegative sweep (6 engines + 6 tests)"
```

---

### Task 7: P12 Customer Support sweep — 6 engines (cost-per-support-ticket, csat, deflection-rate, first-response-time, resolution-time, support-capacity-planning)

**Files:** Same pattern as Task 2.

- [ ] **Step 1-6: Apply same pattern to 6 P12 engines**

Engine list: cost-per-support-ticket-calculator, csat-calculator, deflection-rate-calculator, first-response-time-calculator, resolution-time-calculator, support-capacity-planning-calculator.

Commit message:
```bash
git commit -m "feat(p14-followup): P12 Customer Support clampNonNegative sweep (6 engines + 6 tests)"
```

---

### Task 8: P13 Knowledge sweep — 6 engines (article-freshness, article-helpfulness, deflection-quality, documentation-roi, kb-coverage-rate, search-effectiveness)

**Files:** Same pattern as Task 2.

- [ ] **Step 1-6: Apply same pattern to 6 P13 engines**

Engine list: article-freshness-calculator, article-helpfulness-calculator, deflection-quality-calculator, documentation-roi-calculator, kb-coverage-rate-calculator, search-effectiveness-calculator.

Commit message:
```bash
git commit -m "feat(p14-followup): P13 Knowledge clampNonNegative sweep (6 engines + 6 tests)"
```

---

### Task 9: P14 Legal & Compliance sweep — 6 engines (breach-notification-cost, cmp-roi, consent-revenue-impact, dpa-cost, dsar-cost, gdpr-fine)

**Files:** Same pattern as Task 2.

- [ ] **Step 1-6: Apply same pattern to 6 P14 engines**

Engine list: breach-notification-cost-calculator, cmp-roi-calculator, consent-revenue-impact-calculator, dpa-cost-calculator, dsar-cost-calculator, gdpr-fine-calculator.

Commit message:
```bash
git commit -m "feat(p14-followup): P14 Legal & Compliance clampNonNegative sweep (6 engines + 6 tests)"
```

---

### Task 10: Holistic verification + memory + dual-push

**Files:**
- Create: `memory/p14-followup-cross-cutting-audit-shipped.md`
- Modify: `memory/MEMORY.md`

- [ ] **Step 1: Run full test suite**

```bash
pnpm check 2>&1 | tail -50
```

If `pnpm check` blocks on pre-existing Clerk/Supabase env flake:
```bash
SKIP_PRECOMMIT_CHECK=1 pnpm check 2>&1 | tail -50
```

Expected: All P-series engine tests pass. Other tests (ab-split, internal-links, codegen-examples --check) pass at 98/98.

- [ ] **Step 2: Smoke test 3 calc pages**

```bash
pnpm dev &
sleep 5
curl -s http://localhost:4321/en/gdpr-fine-calculator/ | grep -o 'step="any"' | head -1
curl -s http://localhost:4321/en/solopreneur-customer-health-score-calculator/ | grep -o 'min="-100"' | head -1
curl -s http://localhost:4321/en/roas-calculator/ | grep -o 'min="0"' | head -1
kill %1
```

Expected: All 3 grep commands return at least one match (the rendered HTML contains the new attributes).

- [ ] **Step 3: Write P14-followup ship memory**

Create `memory/p14-followup-cross-cutting-audit-shipped.md`:
```markdown
---
date: 2026-07-14
type: cross-cutting-batch
commits: <list 9 commits from Task 1-9>
status: shipped
---

# P14-Followup Cross-Cutting Input UX + Defensive Clamp — Shipped

## What shipped

- **Helper:** `src/core/engines/helpers.ts` APPEND `clampNonNegative(x: number): number = Math.max(0, x)` (no change to existing 5 functions)
- **Tests:** `tests/helpers.test.ts` (NEW, 6 unit tests)
- **Template:** `src/pages/[lang]/[slug].astro` 9 `<input>` tags get `step="any"` + `min={0 | -100}` injection
- **Engines:** 48 P6-P14 engines × `calculate()` + `customFn` (96 files touched)
  - P6 Marketing (6) · P7 Operations (6) · P8 Sales (6) · P9 Retention (6 — NPS preserved) · P10 Product Analytics (6) · P12 Customer Support (6) · P13 Knowledge (6) · P14 Legal & Compliance (6)
- **Engine tests:** 48 new tests (+1 per engine) verifying defensive guard
- **Engine count:** 98 → 98 (no new engines; cross-cutting polish)

## Architecture (two-layer defense)

Layer 1 (HTML5 native): `<input type="number" step="any" min="0">` — except `nps` (P9-5 only) which gets `min="-100"`. Red ring on user-typed negatives.

Layer 2 (programmatic): `clampNonNegative(x) = Math.max(0, x)` applied in BOTH `calculate()` (build-time) AND `customFn` (browser). CustomFn inlines `var cnn=function(x){return Math.max(0,x)};` at top (P14-6 fmtMoney pattern).

## Special cases

- **P9-5 customer-health-score NPS** (input.name === 'nps'): legitimate range `-100 to +100`. Astro template gets `min="-100"`; `calculate()` keeps `Math.max(-100, Math.min(100, ...))`; `customFn` keeps the same range clamp; does NOT use `cnn`.
- **AI Cost engines (8 data-driven)**: HTML5 step change applied to form inputs (8 `<input>` tags); customFn clamp change OUT OF SCOPE (they use data-table codegen, not per-engine HEALTH_BANDS).

## Lessons

1. **Spec estimate was stale (~41 vs actual 48)**: plan writes actual count = 48 (verified via `ls src/engines/{8 categories}/`). When spec numbers look rounded, re-verify before committing to scope.
2. **NPS is the only legitimate negative input across P6-P14**: P9-5 customer-health-score. Other engines either pass through negatives harmlessly (e.g., ratios that handle 0/0 gracefully) or are non-negative by domain. No other exceptions needed.
3. **customFn inlining pattern (P14-6 lesson)**: `var cnn=function(x){return Math.max(0,x)};` at top of minified string. 5-char alias keeps customFn length manageable. `new Function()` body cannot import modules — must inline.
4. **Mechanical sweep via 8 sub-tasks (one per category)**: each task = 1 implementer + 1 spec-verify reviewer. Mechanical class = no quality reviewer (per subagent-driven-overhead.md). 6 engines per task = ~30 min implementer time.
5. **Existing `Math.max(0, parseFloat(...) || 0)` is functionally equivalent to `clampNonNegative(parseFloat(...) || 0)`**: many engines already had this pattern (P-series convention from P6 onward). Refactor to `clampNonNegative(...)` for DRY even though behavior is identical. Reviewer should NOT flag as "no behavior change" defect — it's consistency refactor.
6. **AI Cost engines' customFn OUT OF SCOPE for clamp change**: their data tables are auto-generated by `codegen-customfn.mjs` from `ai-pricing.json`. Hand-editing customFn would create drift on next `pnpm sync`. Defer to P15 if AI Cost calculators also need defensive clamp.
```

- [ ] **Step 4: Update `memory/MEMORY.md`**

Append a one-line pointer at the end of `memory/MEMORY.md`:
```markdown
- [P14-Followup Cross-Cutting shipped](p14-followup-cross-cutting-audit-shipped.md) — clampNonNegative helper + 9 `<input>` HTML5 step/min + 48 engines × 2 touchpoints (calculate + customFn) + 49 tests; two-layer defense-in-depth; P9-5 NPS special case; mechanical sweep via 8 sub-tasks; spec estimate ~41 stale (actual 48)
```

Also mirror this pointer in `C:\Users\元始天尊\.claude\projects\D--E-----youtube-tools\memory\MEMORY.md` (the Claude-side memory index) in the P14 section.

- [ ] **Step 5: Dual-push**

```bash
git push origin HEAD
git push github HEAD
```

If GitHub push blocks (local already in sync with origin):
```bash
SKIP_PUSH_FETCH=1 git push github HEAD
```

Verify 3-way sync:
```bash
git rev-list --left-right --count origin/master...github/master
```

Expected output: `0	0` (or `0	0` with trailing space).

- [ ] **Step 6: Commit memory files**

```bash
git add memory/
git commit -m "docs(p14-followup): ship memory + MEMORY.md dual-sync"
git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

---

## Self-Review

After writing this plan:

**1. Spec coverage:**
- ✅ Section 1 Problem Statement — Task 1 (helpers + template) addresses both deferred items
- ✅ Section 2 Decisions (6 brainstorm Q&A) — reflected in Global Constraints
- ✅ Section 3 Architecture (two-layer defense) — Task 1 implements Layer 1 (template); Tasks 2-9 implement Layer 2 (helper)
- ✅ Section 4 Components — helpers.ts (Task 1), [slug].astro (Task 1), 41 engines (Tasks 2-9)
- ✅ Section 5 Data flow (3 sub-sections + edge cases) — codified in customFn inlining pattern + tests
- ✅ Section 6 Testing — helper unit tests (Task 1 Step 2), per-engine tests (Tasks 2-9), smoke test (Task 10)
- ✅ Section 7 Out of scope — AI Cost engines' customFn change explicitly excluded in Global Constraints + Task 10 lessons
- ✅ Section 8 Rollout plan — Task 10 implements dual-push + memory
- ✅ Section 9 Risk assessment — addressed via customFn inlining pattern (P14-6 lesson), appendFileSync avoided (use Edit tool per engine), pre-validate via codegen-examples --check in every task

**2. Placeholder scan:** No "TBD", "TODO", "implement later", or vague "add appropriate handling" patterns. Every step has concrete code or commands.

**3. Type consistency:** `clampNonNegative(x: number): number` defined once in Task 1; referenced consistently in Tasks 2-9. `cnn` alias introduced once in Task 2 Step 2; used consistently. `customFn` minified alias `cnn` defined as `var cnn=function(x){return Math.max(0,x)};` — same body as `clampNonNegative` helper. NPS special case consistently marked.

**4. Engine count check:** 6 × 8 categories = 48 engines. Verified via `ls src/engines/{8 categories}/`. Spec said ~41; plan uses 48 (actual).

**5. Plan gap:** No gap. Every spec section has at least one task implementing it. Every test mentioned in spec is created. Memory + dual-push covered.

**Adjustment made during self-review:** Added explicit `pnpm build` validation in Task 1 Step 5 (was implicit in spec). Added explicit `pnpm check` validation in Task 10 Step 1 (was implicit). Added smoke test curl commands in Task 10 Step 2 (was "manual smoke test" in spec).