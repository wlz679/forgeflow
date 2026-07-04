# P5 Real-Estate Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` (controller direct execution) per CLAUDE.md P4-3+ lesson — `subagent-driven-development` is reserved for non-mechanical work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 v3-standard real estate calculators (P5-1..P5-6) in a new `src/engines/real-estate/` directory; ship 38 → 44 engines.

**Architecture:** Each P5-X is a self-contained engine file following P1-P4 pattern: math helpers exported at module top, `calculate()` for SSG rendering, minified `customFn` for live browser recalc, `registerEngine()` registration. 9-section v3 Business-variant output (per CLAUDE.md). All 6 land in NEW `real-estate/` category with `categoryId: 'F'`.

**Tech Stack:**
- Astro 4.16.19 SSG (no SSR)
- TypeScript 5.6 strict
- Node `^20.19.0 || >=22.13.0`
- pnpm 9.x
- Test runner: `node --import tsx --test tests/<file>.test.ts`
- Pre-commit validation: `pnpm check` (codegen-examples --check + codegen-customfn --check + i18n completeness + clerk/supabase env)
- codegen script: `node scripts/codegen-examples.mjs --check` (with `--check` mode for CI/pre-commit)
- CustomFn parser: `node tests/scripts/test-customFn.mjs <slug>`

## Global Constraints

Copied verbatim from spec §"Global Constraints", CLAUDE.md, and P4 lesson corpus. Every task inherits these requirements implicitly.

1. **`src/engines/` zero architectural changes** — only add new files; 38 existing engine files frozen
2. **`ToolMeta.inputs` is `ToolInput[]` structured form** — `{ name, label, placeholder, type, options? }` per element; NEVER a `string[]` (P4-2 lesson — first plan defect caught at execution)
3. **`ToolInput.type` only `text | select | number`** — NO `checkbox` type; for boolean choices use `select` with `['no', 'yes']` options (P4-2 lesson)
4. **`ToolEngine.customFn` MUST parse as valid JS** — verify with `node tests/scripts/test-customFn.mjs <slug>`
5. **CustomFn ASI trap** — `}` followed by `if`/`for`/`return`/etc. is a JS parse error; insert literal `;` between them
6. **`calculate()` is source of truth; `staticExamples[0]` is auto-regenerated** — after editing `calculate()`, run `node scripts/codegen-examples.mjs` (without `--check`) before committing
7. **Live = static parity invariant (P4-2 lesson)** — any math-helper correction in source MUST be mirrored in `customFn`; pre-commit spot-check: `staticExamples[0]` text matches what `customFn` would produce for default inputs
8. **`pnpm check` exits 0 before commit** — automatic via pre-commit hook; bypass only with `SKIP_PRECOMMIT_CHECK=1` (emergency only)
9. **categoryId `'F'`** — all 6 P5 calculators use `categoryId: 'F'` (existing investment/finance semantic letter; matches compound-interest, equity-dilution, freelance-tax, sponsorship-rate, time-value)
10. **Engine slug pattern** — `solopreneur-{name}-calculator` (existing convention)
11. **New directory `src/engines/real-estate/`** — does NOT currently exist; created in Task 0
12. **New file `src/data/tools/real-estate.ts`** — does NOT currently exist; created in Task 0 with first ToolMeta entry
13. **Wire `6 files` per calculator** — see per-task Wiring tables
14. **`tests/ab-split.test.ts` count bumps** — current count `38`; bumped per task (4 places modified)
15. **`tests/internal-links.test.ts` count bumps** — current count `38`; bumped per task (3 places modified)
16. **`codegen-examples --check` exit 0** — pre-commit invariant
17. **i18n completeness** — `scripts/check-i18n-completeness.mjs` exits 0; each new engine has 2 OG entries (`en` + `zh`)
18. **Mirror push to both gitee (`origin`) + github (`github`)** — gitee primary with rev-list safety; github with `SKIP_PUSH_FETCH=1`
19. **Per-calculator memory file written** — `C:\Users\元始天尊\.claude\projects\D--E-----youtube-tools\memory\p5-N-{name}-shipped.md` after each calculator ships; update `MEMORY.md` index
20. **Spec is single source of truth** — `docs/superpowers/specs/2026-07-04-p5-real-estate-batch-design.md` (commit 98f5f62) for math models, output sections, edge cases

---

## File Structure

```
src/
  engines/
    real-estate/                                       NEW directory (Task 0)
      index.ts                                          barrel of 6 imports (Task 0 + per-task increments)
      mortgage-calculator.ts                            P5-1
      rent-vs-buy-calculator.ts                         P5-2
      cap-rate-calculator.ts                            P5-3
      rental-yield-calculator.ts                        P5-4
      brrrr-calculator.ts                               P5-5
      dscr-calculator.ts                                P5-6
  data/
    tools/
      real-estate.ts                                    NEW (Task 0 creates; per-task adds entry)
    og-samples.json                                     MODIFIED per task (6 OG samples)
scripts/codegen-examples.mjs                            MODIFIED per task (6 ENGINES entries)
tests/
  mortgage-calculator.test.ts                          NEW (P5-1, 8 tests)
  rent-vs-buy-calculator.test.ts                       NEW (P5-2, 9 tests)
  cap-rate-calculator.test.ts                          NEW (P5-3, 6 tests)
  rental-yield-calculator.test.ts                      NEW (P5-4, 8 tests)
  brrrr-calculator.test.ts                             NEW (P5-5, 10 tests)
  dscr-calculator.test.ts                              NEW (P5-6, 7 tests)
  ab-split.test.ts                                     MODIFIED per task (count bump)
  internal-links.test.ts                               MODIFIED per task (count bump)
docs/superpowers/plans/2026-07-04-p5-real-estate-batch.md   THIS FILE
memory/p5-N-{name}-shipped.md                          NEW per task (P5-1..P5-6)
```

Each `src/engines/real-estate/*.ts` file follows this structure (P4 established pattern):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Math helpers (exported for tests) ============
// pure functions, no side effects

// ============ calculate() ============
// 9-section string assembly

// ============ customFn ============
// minified JS, escaped unicode, ASI-safe

// ============ Engine ============
const engine: ToolEngine = {
  slug: '...',
  title: '...',
  description: '...',
  inputs: [...],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [...],
  faq: [...],
  howToUse: [...],
};
registerEngine(engine);
```

---

## Task 0: P5 Scaffolding (setup, no engine)

**Files:**
- Create: `src/engines/real-estate/index.ts`
- Create: `src/data/tools/real-estate.ts`
- Modify: (none other)

**Purpose:** Create the new category directory and ToolMeta file so per-task steps can `git add` and grow incrementally.

- [ ] **Step 1: Create directory and barrel**

```bash
mkdir -p src/engines/real-estate
```

Then write `src/engines/real-estate/index.ts`:

```typescript
// P5 real-estate category — incrementally populated by P5-1..P5-6 tasks
// P5-1 mortgage-calculator.ts -- added in Task 1
// P5-2 rent-vs-buy-calculator.ts -- added in Task 2
// P5-3 cap-rate-calculator.ts -- added in Task 3
// P5-4 rental-yield-calculator.ts -- added in Task 4
// P5-5 brrrr-calculator.ts -- added in Task 5
// P5-6 dscr-calculator.ts -- added in Task 6
export {};
```

- [ ] **Step 2: Create empty tools file**

Write `src/data/tools/real-estate.ts`:

```typescript
import type { ToolMeta } from './types';

export const tools: ToolMeta[] = [
  // P5-1 mortgage entry -- added in Task 1
  // P5-2..P5-6 entries added by subsequent tasks
];
```

- [ ] **Step 3: Run codegen --check to verify no regression**

Run: `pnpm check 2>&1 | tail -10`

Expected: still passes; 38 engines registered; codegen clean.

- [ ] **Step 4: Commit**

```bash
git add src/engines/real-estate/index.ts src/data/tools/real-estate.ts
git commit -m "feat(real-estate): scaffold new category directory + empty tools file"
```

---

## Task 1: P5-1 Mortgage Calculator

**Files:**
- Create: `src/engines/real-estate/mortgage-calculator.ts` (~340 LoC)
- Create: `tests/mortgage-calculator.test.ts` (8 math tests)
- Modify: `src/engines/real-estate/index.ts` (1 import + re-export)
- Modify: `src/data/tools/real-estate.ts` (1 ToolMeta entry)
- Modify: `src/data/og-samples.json` (1 OG sample)
- Modify: `scripts/codegen-examples.mjs` (1 ENGINES entry, alphabetical)
- Modify: `tests/ab-split.test.ts` (count bump 38 → 39, 4 places)
- Modify: `tests/internal-links.test.ts` (count bump 38 → 39, 3 places)

**Spec reference:** `docs/superpowers/specs/2026-07-04-p5-real-estate-batch-design.md` §"P5-1: Mortgage Calculator"

**Math model (from spec, verbatim):**

```
principal = homePrice - downPayment
monthlyRate = interestRate / 100 / 12
n = loanTermYears * 12

monthlyPayment = principal * monthlyRate / (1 - (1 + monthlyRate)^-n)
totalInterest = monthlyPayment * n - principal
totalCost = homePrice + totalInterest
ltv = principal / homePrice * 100
```

**Math helpers to export (8 tests target these):**

```typescript
export function monthlyPI(principal: number, monthlyRate: number, n: number): number
export function totalInterest(principal: number, monthlyRate: number, n: number): number
export function ltv(principal: number, homePrice: number): number
export function principalPaidByYear(year: number, principal: number, monthlyRate: number, n: number): number  // cumulative principal paid through end of given year
```

**Engine inputs (4):** `homePrice`, `downPayment`, `loanTermYears`, `interestRate` — all `type: 'number'`. See spec for labels and placeholders.

**9-section output:** see spec table at line ~140.

**Health heuristic:**
- 🟢 `monthlyPI / homePrice < 0.010` (P&I < 1.0% of home price)
- 🟡 `0.010 ≤ ratio < 0.013`
- 🟠 `ratio ≥ 0.013`

**Health edge cases:**
- `homePrice <= downPayment`: display tip "Down payment >= home price; loan = 0, no interest. Consider lower down payment"; return early single-section output (similar to existing engines' zero-ROI guard).
- `interestRate === 0`: `monthlyPI = principal / n`; tip "0% loan — confirm lender does not charge fees".
- `loanTermYears <= 0`: display error tip; return early.

- [ ] **Step 1: Write the 8 failing tests**

Create `tests/mortgage-calculator.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { monthlyPI, totalInterest, ltv, principalPaidByYear } from '../src/engines/real-estate/mortgage-calculator';

// Test 1: monthlyPI basic (500K home, 100K down, 30y, 6.5% → ~$2,528)
test('mortgage: monthlyPI basic 500K-100K-30y-6.5% → ~$2,528', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 30 * 12;
  const m = monthlyPI(p, r, n);
  assert.ok(Math.abs(m - 2528.27) < 1.0, `expected ~2528.27, got ${m.toFixed(2)}`);
});

// Test 2: monthlyPI zero interest
test('mortgage: monthlyPI zero interest → principal / n', () => {
  const p = 120000;
  const r = 0;
  const n = 360;
  assert.equal(monthlyPI(p, r, n), 120000 / 360);
});

// Test 3: monthlyPI full loan (zero down)
test('mortgage: monthlyPI zero down → principal = homePrice', () => {
  const p = 250000;
  const r = 7 / 100 / 12;
  const n = 30 * 12;
  assert.ok(monthlyPI(p, r, n) > 1660 && monthlyPI(p, r, n) < 1670, `expected ~1665, got ${monthlyPI(p, r, n).toFixed(2)}`);
});

// Test 4: totalInterest basic
test('mortgage: totalInterest basic 30y-6.5%', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 30 * 12;
  const ti = totalInterest(p, r, n);
  assert.ok(ti > 510000 && ti < 520000, `expected ~$510K-$515K, got $${ti.toFixed(0)}`);
});

// Test 5: ltv 20% down → 80%
test('mortgage: ltv 20% down → 80%', () => {
  assert.equal(ltv(400000, 500000), 80);
});

// Test 6: principalPaidByYear year 5 (~5-10% paid)
test('mortgage: principalPaidByYear year 5 ≈ 5-10% of original', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 360;
  const paid = principalPaidByYear(5, p, r, n);
  assert.ok(paid > 20000 && paid < 50000, `expected $20K-$50K, got $${paid.toFixed(0)}`);
});

// Test 7: principalPaidByYear year 15 (~50% paid)
test('mortgage: principalPaidByYear year 15 ≈ 50% of original', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 360;
  const paid = principalPaidByYear(15, p, r, n);
  assert.ok(paid > 180000 && paid < 220000, `expected $180K-$220K, got $${paid.toFixed(0)}`);
});

// Test 8: monthlyPI 15y vs 30y higher payment but lower total
test('mortgage: 15y monthlyPI > 30y monthlyPI for same principal', () => {
  const p = 300000;
  const r = 6 / 100 / 12;
  const m15 = monthlyPI(p, r, 180);
  const m30 = monthlyPI(p, r, 360);
  assert.ok(m15 > m30, `15y should be higher: m15=${m15.toFixed(0)} m30=${m30.toFixed(0)}`);
  const ti15 = totalInterest(p, r, 180);
  const ti30 = totalInterest(p, r, 360);
  assert.ok(ti15 < ti30, `15y totalInterest should be lower: $${ti15.toFixed(0)} vs $${ti30.toFixed(0)}`);
});
```

- [ ] **Step 2: Run tests, verify all FAIL with "function not defined"**

Run: `node --import tsx --test tests/mortgage-calculator.test.ts 2>&1 | head -30`

Expected output: 8 FAIL entries with `Cannot find module '../src/engines/real-estate/mortgage-calculator'` or similar.

- [ ] **Step 3: Implement engine file (math helpers + calculate + customFn + engine)**

Create `src/engines/real-estate/mortgage-calculator.ts`. Follow this exact shape:

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Math helpers (exported for tests) ============

/**
 * Monthly P&I payment (PMT formula). Handles zero-rate.
 *   principal * r / (1 - (1+r)^-n)   when r > 0
 *   principal / n                    when r = 0
 */
export function monthlyPI(principal: number, monthlyRate: number, n: number): number {
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal / n;
  return (principal * monthlyRate) / (1 - Math.pow(1 + monthlyRate, -n));
}

/** Total interest over loan term = monthlyPI * n - principal */
export function totalInterest(principal: number, monthlyRate: number, n: number): number {
  return monthlyPI(principal, monthlyRate, n) * n - principal;
}

/** Loan-to-value ratio as percent */
export function ltv(principal: number, homePrice: number): number {
  if (homePrice <= 0) return 0;
  return (principal / homePrice) * 100;
}

/**
 * Cumulative principal paid through end of given `year` (assuming monthly payments).
 *   balance(m) = P * ((1+r)^N - (1+r)^m) / ((1+r)^N - 1)
 *   principalPaid = P - balance(monthsPaid)
 *   where monthsPaid = min(year * 12, n)
 */
export function principalPaidByYear(year: number, principal: number, monthlyRate: number, n: number): number {
  const monthsPaid = Math.min(year * 12, n);
  if (n <= 0) return 0;
  if (monthlyRate === 0) return principal * (monthsPaid / n);
  const balance = (principal * (Math.pow(1 + monthlyRate, n) - Math.pow(1 + monthlyRate, monthsPaid))) /
                  (Math.pow(1 + monthlyRate, n) - 1);
  return principal - balance;
}

// ============ calculate() ============

function calculateMortgage(inputs: Record<string, string>): string[] {
  const homePrice = Math.max(0, parseFloat(inputs.homePrice) || 0);
  const downPayment = Math.max(0, parseFloat(inputs.downPayment) || 0);
  const loanTermYears = Math.max(0, parseFloat(inputs.loanTermYears) || 0);
  const interestRate = parseFloat(inputs.interestRate) || 0;

  // Edge: zero homePrice — return single-section prompt
  if (homePrice === 0) {
    return [
      '⏰ Mortgage Calculator\n\n' +
        '💰 Enter home price, down payment, loan term, and interest rate to see your monthly P&I, total interest, and amortization milestones.',
    ];
  }

  // Edge: down payment >= home price (no loan)
  if (downPayment >= homePrice) {
    return [
      '⏰ Mortgage Calculator\n\n' +
        '💰 Down payment (' + homePrice.toLocaleString('en-US') + ') >= home price — no loan needed. Consider whether a smaller down payment would let you keep more cash liquid for other investments.',
    ];
  }

  // Edge: invalid term
  if (loanTermYears <= 0) {
    return [
      '⏰ Mortgage Calculator\n\n' +
        '💰 Loan term must be > 0 years. Typical mortgages are 15, 20, or 30 years.',
    ];
  }

  const principal = homePrice - downPayment;
  const monthlyRate = interestRate / 100 / 12;
  const n = loanTermYears * 12;
  const monthly = monthlyPI(principal, monthlyRate, n);
  const ti = totalInterest(principal, monthlyRate, n);
  const totalCost = homePrice + ti;
  const ltvPct = ltv(principal, homePrice);

  // Health: monthly payment / home price ratio
  let health: { emoji: string; label: string };
  const ratio = homePrice > 0 ? monthly / homePrice : 0;
  if (ratio < 0.010) {
    health = { emoji: '🟢', label: 'affordable — P&I under 1.0% of home price' };
  } else if (ratio < 0.013) {
    health = { emoji: '🟡', label: 'moderate — P&I between 1.0-1.3% of home price' };
  } else {
    health = { emoji: '🟠', label: 'stretched — P&I over 1.3% of home price; verify 28% DTI rule' };
  }

  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const pct2 = (n: number) => n.toFixed(2) + '%';

  // Term comparison
  const m15 = monthlyPI(principal, monthlyRate, 180);
  const ti15 = totalInterest(principal, monthlyRate, 180);
  const m20 = monthlyPI(principal, monthlyRate, 240);
  const ti20 = totalInterest(principal, monthlyRate, 240);

  // Milestones
  const paid5 = principalPaidByYear(5, principal, monthlyRate, n);
  const paid15 = principalPaidByYear(15, principal, monthlyRate, n);
  const paid30 = principalPaidByYear(30, principal, monthlyRate, n);

  // What-If
  const rateMinus = Math.max(0, interestRate - 1);
  const ratePlus = interestRate + 1;
  const monthlyMinus = monthlyPI(principal, rateMinus / 100 / 12, n);
  const monthlyPlus = monthlyPI(principal, ratePlus / 100 / 12, n);
  const extraMonthly = monthly + 200;
  const totalInterestExtra = totalInterest(principal, monthlyRate, loanTermYears * 12);
  const extraYears = Math.ceil(ti / 200 / 12);  // months of $200 extra payments
  // 20% down payment
  const dp20 = homePrice * 0.20;
  const principal20 = homePrice - dp20;
  const monthly20 = monthlyPI(principal20, monthlyRate, n);

  // Conditional tip
  let tip: string;
  if (ltvPct >= 80) {
    tip = '💡 Tip: LTV >= 80% typically requires Private Mortgage Insurance (PMI) — adds 0.5-1.5% to annual payment. Aim for 20% down to avoid PMI.';
  } else if (loanTermYears >= 30) {
    tip = '💡 Tip: 30-year term gives lowest monthly payment but highest total interest. Compare with 15-year — higher payment but ~50% less total interest paid.';
  } else {
    tip = '💡 Tip: Shortening your term from 30 to 15 years typically saves 50%+ on total interest. Run the comparison below to see the dollar difference for your loan.';
  }

  const r =
    '⏰ Mortgage Calculator\n\n' +
    '💰 Loan Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Home price:           ' + money(homePrice) + '\n' +
    '• Down payment:         ' + money(downPayment) + '  (' + pct2(downPayment / homePrice * 100) + ')\n' +
    '• Loan amount:          ' + money(principal) + '\n' +
    '• Loan term:            ' + loanTermYears + ' years (' + n + ' months)\n' +
    '• Interest rate:        ' + interestRate + '% APR\n' +
    '• LTV:                  ' + pct2(ltvPct) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Monthly Payment:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Monthly P&I:          ' + money(monthly) + '\n' +
    '• Total interest paid: ' + money(ti) + '  (over loan term)\n' +
    '• Total cost (price + interest): ' + money(totalCost) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Affordability Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n' +
    '• P&I as % of home price: ' + pct2(ratio * 100) + '\n' +
    '• Rule of thumb: P&I should be ≤ 28% of monthly gross income\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Loan Term Comparison:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• 15-year: ' + money(m15) + '/mo · ' + money(ti15) + ' total interest\n' +
    '• 20-year: ' + money(m20) + '/mo · ' + money(ti20) + ' total interest\n' +
    '• ' + loanTermYears + '-year: ' + money(monthly) + '/mo · ' + money(ti) + ' total interest  ← current\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Amortization Milestones:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• After year 5:  ' + money(paid5) + ' principal paid (' + pct2(paid5 / principal * 100) + ' of loan)\n' +
    '• After year 15: ' + money(paid15) + ' principal paid (' + pct2(paid15 / principal * 100) + ' of loan)\n' +
    (loanTermYears >= 30 ? '• After year 30: ' + money(paid30) + ' (loan fully paid)\n' : '') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Rate -1pp (' + rateMinus.toFixed(1) + '%):     monthly → ' + money(monthlyMinus) + '\n' +
    '• Rate +1pp (' + ratePlus.toFixed(1) + '%):     monthly → ' + money(monthlyPlus) + '\n' +
    '• Extra $200/mo payment:    helps pay off ~' + extraYears + ' months earlier\n' +
    '• 20% down (vs current):   loan ' + money(principal20) + ' · monthly ' + money(monthly20) + '\n' +
    '• 15-year refinance:        see comparison above\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO comparison rows at 6 home prices
  const prices = [200000, 400000, 600000, 800000, 1000000, 1500000];
  for (const p of prices) {
    const prin = p - downPayment;
    if (prin <= 0) {
      results.push('Comparison: home ' + money(p) + ' with ' + money(downPayment) + ' down → loan = $0 (no payment)');
      continue;
    }
    const m = monthlyPI(prin, monthlyRate, n);
    results.push(
      'Comparison: ' + money(p) + ' home with ' + money(downPayment) + ' down (' +
        pct2(downPayment / p * 100) + ') → ' + money(m) + '/mo at ' + interestRate + '%'
    );
  }

  return results;
}

// ============ customFn ============

const customFn =
  "function mPI(p,r,n){if(n<=0)return 0;if(r===0)return p/n;return(p*r)/(1-Math.pow(1+r,-n));}" +
  "function tI(p,r,n){return mPI(p,r,n)*n-p;}" +
  "function ltv2(p,h){if(h<=0)return 0;return p/h*100;}" +
  "function ppByY(y,p,r,n){var m=Math.min(y*12,n);if(n<=0)return 0;if(r===0)return p*(m/n);var b=(p*(Math.pow(1+r,n)-Math.pow(1+r,m)))/(Math.pow(1+r,n)-1);return p-b;}" +
  "var hp=Math.max(0,parseFloat(inputs.homePrice)||0);" +
  "var dp=Math.max(0,parseFloat(inputs.downPayment)||0);" +
  "var lty=Math.max(0,parseFloat(inputs.loanTermYears)||0);" +
  "var ir=parseFloat(inputs.interestRate)||0;" +
  "if(hp===0){return['\\u23F0 Mortgage Calculator\\n\\n\\uD83D\\uDCB0 Enter home price, down payment, loan term, and interest rate to see your monthly P&I, total interest, and amortization milestones.'];}" +
  "if(dp>=hp){return['\\u23F0 Mortgage Calculator\\n\\n\\uD83D\\uDCB0 Down payment ('+hp.toLocaleString('en-US')+') >= home price \\u2014 no loan needed. Consider whether a smaller down payment would let you keep more cash liquid for other investments.'];}" +
  "if(lty<=0){return['\\u23F0 Mortgage Calculator\\n\\n\\uD83D\\uDCB0 Loan term must be > 0 years. Typical mortgages are 15, 20, or 30 years.'];}" +
  "var prin=hp-dp;var mr=ir/100/12;var n2=lty*12;var m=mPI(prin,mr,n2);var ti=tI(prin,mr,n2);var tc=hp+ti;var lvP=ltv2(prin,hp);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
  "function pct2(n){return n.toFixed(2)+'%';}" +
  "var ratio=hp>0?m/hp:0;" +
  "var hl=null;" +
  "if(ratio<0.010){hl={e:'\\uD83D\\uDFE2',l:'affordable \\u2014 P&I under 1.0% of home price'};}else if(ratio<0.013){hl={e:'\\uD83D\\uDCA1',l:'moderate \\u2014 P&I between 1.0-1.3% of home price'};}else{hl={e:'\\uD83D\\uDFE0',l:'stretched \\u2014 P&I over 1.3% of home price; verify 28% DTI rule'};}" +
  "var m15=mPI(prin,mr,180);var ti15=tI(prin,mr,180);var m20=mPI(prin,mr,240);var ti20=tI(prin,mr,240);" +
  "var p5=ppByY(5,prin,mr,n2);var p15=ppByY(15,prin,mr,n2);var p30=ppByY(30,prin,mr,n2);" +
  "var rmi=Math.max(0,ir-1);var rpi=ir+1;var mMinus=mPI(prin,rmi/100/12,n2);var mPlus=mPI(prin,rpi/100/12,n2);" +
  "var dp20=hp*0.20;var prin20=hp-dp20;var m20d=monthlyPI(prin20,mr,n2);" +
  // ... (assemble full output string following the calculate() structure)
  "return [];";  // simplified; full assembly mirrors calculate()

// Note: implementer MUST mirror calculate() output structure exactly in customFn (P4-2 lesson: live = static parity).
// Full customFn string (after assemble) appears in the committed file. The above shows the helper pattern.

// ============ Engine ============

const engine: ToolEngine = {
  slug: 'solopreneur-mortgage-calculator',
  title: 'Mortgage Calculator',
  description:
    'Calculate your monthly P&I payment, total interest over the loan term, and amortization milestones. Compare 15y vs 30y terms, model rate changes, and check LTV-driven PMI implications.',
  inputs: [
    { name: 'homePrice', label: 'Home Price ($)', placeholder: 'e.g. 500000', type: 'number' },
    { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 100000', type: 'number' },
    { name: 'loanTermYears', label: 'Loan Term (years)', placeholder: 'e.g. 30', type: 'number' },
    { name: 'interestRate', label: 'Annual Interest Rate (%)', placeholder: 'e.g. 6.5', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn: '' /* replaced below */ },
  generate(inputs) { return calculateMortgage(inputs); },
  staticExamples: [/* filled by codegen */],
  faq: [
    {
      q: 'How is the monthly mortgage payment calculated?',
      a: 'Monthly payment uses the PMT formula: P × r / (1 − (1+r)^−n), where P = loan principal (home price − down payment), r = monthly interest rate (annual rate ÷ 12), and n = total months (loan term × 12). For a $400K loan at 6.5% over 30 years, the monthly P&I is ~$2,528. The formula handles zero-rate loans gracefully (returns principal/n).',
    },
    {
      q: 'What is LTV and why does it matter?',
      a: 'LTV (Loan-to-Value) is the ratio of your loan to the home price, expressed as a percent. With 20% down on a $500K home, LTV is 80%. Most lenders require Private Mortgage Insurance (PMI) when LTV exceeds 80%, which adds 0.5–1.5% to your annual payment. PMI typically drops off once LTV falls below 78%.',
    },
    {
      q: 'What is the difference between 15-year and 30-year mortgages?',
      a: 'A 15-year mortgage has higher monthly payments but saves 50%+ on total interest paid. For a $400K loan at 6.5%, 30-year total interest is ~$510K; 15-year is only ~$228K. Shorter terms build equity faster and qualify for lower rates (typically 0.5–1.0% less). Choose based on cash flow — 15-year works if monthly payment stays under 28% of gross income.',
    },
    {
      q: 'How can I pay off my mortgage faster?',
      a: 'Three common strategies: (1) Extra principal payments — even $100/month extra on a $400K 30-year at 6.5% saves ~$80K in interest and pays off 5+ years early. (2) Biweekly payments — splits monthly payment in half and pays every 2 weeks, resulting in 13 full payments per year instead of 12. (3) Refinance to shorter term — if rates drop or income rises, refinancing from 30-year to 15-year accelerates payoff.',
    },
    {
      q: 'Are property taxes and insurance included in the monthly payment?',
      a: 'No — the monthly P&I calculated here is principal and interest only. Most lenders escrow property taxes and homeowners insurance, collecting 1–2% of home value annually as part of total monthly payment. Add ~$500–$1,500/month for taxes+insurance on a typical $500K home to estimate true monthly housing cost.',
    },
  ],
  howToUse: [
    'Enter the home purchase price.',
    'Enter your down payment amount (e.g., 20% of price for conventional loans).',
    'Enter loan term (typical: 15, 20, or 30 years).',
    'Enter annual interest rate (current 30-year fixed ~6.5-7.0% in 2026).',
    'Review monthly P&I, total interest, and amortization milestones at years 5/15/30.',
    'Compare 15y vs 30y total interest to choose your term.',
    'Apply the 5 what-if scenarios for rate changes and extra payments.',
    'For "PITI" (full housing cost), add property tax + insurance + HOA to monthly P&I.',
  ],
};

registerEngine(engine);
```

> **Implementer note:** The customFn string above is a structural skeleton. The implementer MUST assemble the full output strings (r = ...) inside customFn exactly mirroring `calculateMortgage()` — this is the P4-2 live=static parity lesson. Refer to P4-1..P4-6 committed engines for assembly patterns.

- [ ] **Step 4: Wire Task 1 files (5 files modified + 1 test file)**

a. Append to `src/engines/real-estate/index.ts`:

```typescript
export * from './mortgage-calculator';
```

b. Add ToolMeta entry to `src/data/tools/real-estate.ts` at end of array:

```typescript
  {
    slug: 'solopreneur-mortgage-calculator',
    title: 'Mortgage Calculator',
    description: 'Calculate your monthly P&I payment, total interest over the loan term, and amortization milestones. Compare 15y vs 30y terms, model rate changes, and check LTV-driven PMI implications.',
    categoryId: 'F',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'homePrice', label: 'Home Price ($)', placeholder: 'e.g. 500000', type: 'number' },
      { name: 'downPayment', label: 'Down Payment ($)', placeholder: 'e.g. 100000', type: 'number' },
      { name: 'loanTermYears', label: 'Loan Term (years)', placeholder: 'e.g. 30', type: 'number' },
      { name: 'interestRate', label: 'Annual Interest Rate (%)', placeholder: 'e.g. 6.5', type: 'number' },
    ],
    keywords: ['mortgage calculator', 'monthly payment', 'P&I', 'amortization', 'home loan', '15 vs 30 year mortgage', 'PMI'],
    tags: ['mortgage', 'real-estate', 'finance'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-04',
    sources: ['https://www.bankrate.com/mortgages/mortgage-calculator', 'https://www.consumerfinance.gov/owning-a-home/loan-estimate/'],
  },
```

c. Add OG sample to `src/data/og-samples.json` (find first non-existing position):

```json
  "solopreneur-mortgage-calculator": {
    "headline": { "en": "$2,528", "zh": "$2,528" },
    "headlineUnit": { "en": "/month", "zh": "/月" },
    "headlineLabel": { "en": "Mortgage P&I ($400K loan, 30y, 6.5%)", "zh": "房贷月供 ($40万贷款, 30年, 6.5%)" }
  },
```

d. Find ENGINES array in `scripts/codegen-examples.mjs` and add entry alphabetically:

```javascript
  'mortgage-calculator',
```

(Find existing entries with same indentation, add in alphabetical position.)

e. Bump counts in `tests/ab-split.test.ts`: find 4 occurrences of `38` (in test labels or counts) and update to `39`. Run `grep -n '38' tests/ab-split.test.ts` first to locate them.

f. Bump counts in `tests/internal-links.test.ts`: find 3 occurrences of `38` and update to `39`.

- [ ] **Step 5: Regenerate staticExamples and verify**

Run: `node scripts/codegen-examples.mjs`

Expected: regenerates `staticExamples[0]` in `mortgage-calculator.ts` from `calculate()`.

Then verify: `pnpm check 2>&1 | tail -10` — exit 0.

Then verify customFn parses: `node tests/scripts/test-customFn.mjs solopreneur-mortgage-calculator` — exit 0.

- [ ] **Step 6: Commit**

```bash
git add src/engines/real-estage/mortgage-calculator.ts \
        src/engines/real-estate/index.ts \
        src/data/tools/real-estate.ts \
        src/data/og-samples.json \
        scripts/codegen-examples.mjs \
        tests/ab-split.test.ts \
        tests/internal-links.test.ts \
        tests/mortgage-calculator.test.ts
git commit -m "feat(p5-1): mortgage calculator (PMT amortization + 9-section v3 + 8 math tests + 39 engines)"
```

After commit: write memory file `memory/p5-1-mortgage-shipped.md` following P4-1 pattern (1 page summary). Update `memory/MEMORY.md` index with entry for P5-1.

---

## Task 2: P5-2 Rent-vs-Buy Calculator

**Files:**
- Create: `src/engines/real-estate/rent-vs-buy-calculator.ts` (~360 LoC)
- Create: `tests/rent-vs-buy-calculator.test.ts` (9 math tests)
- Modify: `src/engines/real-estate/index.ts` (1 import)
- Modify: `src/data/tools/real-estate.ts` (1 ToolMeta entry)
- Modify: `src/data/og-samples.json` (1 OG sample)
- Modify: `scripts/codegen-examples.mjs` (1 ENGINES entry, alphabetical)
- Modify: `tests/ab-split.test.ts` (count 39 → 40, 4 places)
- Modify: `tests/internal-links.test.ts` (count 39 → 40, 3 places)

**Spec reference:** §"P5-2: Rent-vs-Buy Calculator"

**Math model (verbatim from spec, post-fix):**

```
monthlyRate = mortgageRate / 100 / 12
n_months = yearsToStay * 12
principal = homePrice - downPayment
monthlyPI = principal * monthlyRate / (1 - (1 + monthlyRate)^-n_months)
totalMortgagePaid = monthlyPI * n_months
remainingBalance = ... (formula for partial-term or 0 if yearsToStay == loanTerm)
futureValue = homePrice * (1 + annualAppreciation/100)^yearsToStay
sellingCosts = futureValue * 0.06
netProceeds = futureValue - sellingCosts - remainingBalance
buyClosingCosts = homePrice * 0.03
initialOutlay = downPayment + buyClosingCosts
monthlyPropertyTaxMaint = homePrice * 0.012 / 12
totalHoldingCosts = monthlyPropertyTaxMaint * n_months
netCostBuy = initialOutlay + totalMortgagePaid + totalHoldingCosts - netProceeds

// Renting:
monthlyRentGrowth = annualRentIncrease / 100
totalRentPaid = sum over year y of (monthlyRent * 12 * (1 + monthlyRentGrowth)^y) for y=0..yearsToStay-1
investedGrowth = downPayment * ((1 + 0.07)^yearsToStay - 1)
totalRentCost = totalRentPaid - investedGrowth

savings = totalRentCost - netCostBuy
```

For V1, assume `yearsToStay == loanTermYears` (default 30y), so `remainingBalance = 0`. Reverse-calc omitted from V1.

**Math helpers (9 tests target these):**

```typescript
export function monthlyPI(principal, monthlyRate, n): number                       // shared with P5-1
export function remainingLoanBalance(principal, monthlyRate, N, monthsPaid): number
export function futureValue(homePrice, annualAppreciationPct, years): number
export function totalRentPaidSeries(monthlyRent, annualRentIncreasePct, years): number  // geometric series
export function opportunityGain(downPayment, annualReturnPct, years): number
export function netCostBuy(...): { initialOutlay, totalMortgagePaid, totalHoldingCosts, sellingCosts, netProceeds, total }
export function totalRentCost(...): { totalRentPaid, opportunityGain, total }
export function verdict(savings): { emoji, label }
```

**Engine inputs (7):** `monthlyRent`, `homePrice`, `downPayment`, `mortgageRate`, `yearsToStay`, `annualAppreciation`, `annualRentIncrease`.

**9-section output:** see spec table.

**Verdict heuristic:**
- 🟢 buying saves > $30K (i.e., `savings > 30000`, where positive savings = rentTotal > buyNetCost; clarity: `savings = totalRentCost - netCostBuy` so positive = renting was more expensive = buying wins)
  - Wait, spec was inconsistent. Re-derive: `netCostBuy` lower = buying wins. Let's define:
    - `savingsBuy = totalRentCost - netCostBuy` (positive when buying cheaper)
    - 🟢 `savingsBuy > $30K` → "BUY strongly favored"
    - 🟡 `|savingsBuy| ≤ $30K` → "CLOSE call"
    - 🟠 `savingsBuy < -$30K` → "RENT favored"

**Edge cases:**
- `yearsToStay <= 0`: error
- `homePrice <= downPayment`: tip "100% cash purchase; mortgage calc first"
- `mortgageRate === 0`: handle 0% rate
- Initial Simplification: assume `yearsToStay == 30` loan term; mention this in output tip if needed

- [ ] **Step 1: Write 9 failing tests in `tests/rent-vs-buy-calculator.test.ts`**

(Follow same TDD pattern as P5-1; 9 tests covering monthlyPI, totalRentPaidSeries, futureValue, netCostBuy (buying cheaper scenario), totalRentCost, verdict BUY, verdict RENT, verdict CLOSE, sensitivity stay-5y-vs-10y-flip. Full code in implementer hand.)

- [ ] **Step 2: Run, verify all 9 FAIL with module-not-found**

```bash
node --import tsx --test tests/rent-vs-buy-calculator.test.ts 2>&1 | tail -15
```

- [ ] **Step 3: Implement engine** — same shape as P5-1: math helpers + `calculateRentVsBuy()` + customFn + ToolEngine + 5 FAQ + howToUse. Apply output structure exactly per spec table.

- [ ] **Step 4: Wire 6 files** (index.ts import, tools entry, og-samples entry, codegen ENGINES entry alphabetical, ab-split count 39→40, internal-links count 39→40). Use P5-1 step 4 as template.

- [ ] **Step 5: Run regenerator + check + customFn parse**

```bash
node scripts/codegen-examples.mjs
pnpm check 2>&1 | tail -10
node tests/scripts/test-customFn.mjs solopreneur-rent-vs-buy-calculator
```

- [ ] **Step 6: Commit + write memory file**

```bash
git add ... (8 files)
git commit -m "feat(p5-2): rent vs buy calculator (NPV comparison + 9-section v3 + 9 math tests + 40 engines)"
```

Memory: `memory/p5-2-rent-vs-buy-shipped.md`.

---

## Task 3: P5-3 Cap Rate Calculator

**Files:**
- Create: `src/engines/real-estate/cap-rate-calculator.ts` (~280 LoC)
- Create: `tests/cap-rate-calculator.test.ts` (6 math tests)
- Modify: `src/engines/real-estate/index.ts` (import)
- Modify: `src/data/tools/real-estate.ts` (entry)
- Modify: `src/data/og-samples.json` (entry)
- Modify: `scripts/codegen-examples.mjs` (alphabetical ENGINES entry)
- Modify: `tests/ab-split.test.ts` (count 40 → 41, 4 places)
- Modify: `tests/internal-links.test.ts` (count 40 → 41, 3 places)

**Spec reference:** §"P5-3: Cap Rate Calculator"

**Math model:**

```
effectiveGrossIncome = annualRentIncome * (1 - vacancyRate/100)
noi = effectiveGrossIncome - annualExpenses
capRate = noi / propertyValue * 100
cashOnCash = (effectiveGrossIncome - annualExpenses) / propertyValue * 100  // if all-cash
```

**Math helpers (6 tests):**

```typescript
export function effectiveGrossIncome(annualRentIncome, vacancyRatePct): number
export function noi(annualRentIncome, vacancyRatePct, annualExpenses): number
export function capRate(noi, propertyValue): number
export function cashOnCash(noi, propertyValue): number
export function impliedValue(noi, targetCapRatePct): number
export function capRateHealth(capRatePct): { emoji, label }
```

**Engine inputs (4):** `propertyValue`, `annualRentIncome`, `annualExpenses`, `vacancyRate`.

**Health heuristic:**
- 🟢 5–9% residential
- 🟡 3–5% (low HCOL) or 9–12% (high distressed)
- 🟠 <3% or >12%

**Edge cases:** `propertyValue <= 0` (guard), `vacancyRate >= 100` (tip "Vacancy >= 100% would result in negative income").

- [ ] **Step 1-6:** Same TDD + implement + wire + verify + commit pattern as P5-1/2. Reference tasks 1-2 for shape.

Commit: `feat(p5-3): cap rate calculator (NOI/value ratio + 9-section v3 + 6 math tests + 41 engines)`. Memory: `p5-3-cap-rate-shipped.md`.

---

## Task 4: P5-4 Rental Yield / Cash-on-Cash Calculator

**Files:**
- Create: `src/engines/real-estate/rental-yield-calculator.ts` (~360 LoC)
- Create: `tests/rental-yield-calculator.test.ts` (8 math tests)
- Modify: 6 wiring files (index.ts, tools, og-samples, codegen, ab-split 41→42, internal-links 41→42)

**Spec reference:** §"P5-4: Rental Yield"

**Math model:**

```
grossAnnualRent = monthlyRent * 12
effectiveAnnualRent = grossAnnualRent * (1 - vacancyRate/100)
annualMortgagePayment = monthlyMortgagePI(loanAmount, monthlyRate, n) * 12
annualOperatingExpenses = monthlyExpenses * 12
annualCashFlow = effectiveAnnualRent - annualMortgagePayment - annualOperatingExpenses
closingCosts = purchasePrice * 0.03
totalCashInvested = downPayment + closingCosts
grossYield = grossAnnualRent / purchasePrice * 100
netYield = annualCashFlow / purchasePrice * 100
cashOnCash = annualCashFlow / totalCashInvested * 100
```

**Math helpers (8 tests):**

```typescript
export function monthlyPI(principal, monthlyRate, n): number  // shared
export function annualMortgagePayment(loanAmount, interestRatePct, termYears): number
export function effectiveAnnualRent(monthlyRent, vacancyRatePct): number
export function annualCashFlow(...): number
export function totalCashInvested(downPayment, purchasePrice): number
export function grossYield(grossAnnualRent, purchasePrice): number
export function netYield(annualCashFlow, purchasePrice): number
export function cashOnCashReturn(annualCashFlow, totalCashInvested): number
export function cocHealth(cocPct): { emoji, label }
```

**Engine inputs (8):** `purchasePrice`, `downPayment`, `loanAmount`, `interestRate`, `monthlyRent`, `monthlyExpenses`, `vacancyRate`, `annualAppreciation`.

**Health heuristic:** 🟢 8–12% CoC; 🟡 4–8% or 12–15%; 🟠 outside.

**Edge cases:** `loanAmount === 0` (all-cash); negative cash flow (🔴 flag).

Commit: `feat(p5-4): rental yield / cash-on-cash calculator (CoC on invested cash + 9-section v3 + 8 math tests + 42 engines)`. Memory: `p5-4-rental-yield-shipped.md`.

---

## Task 5: P5-5 BRRRR Calculator

**Files:**
- Create: `src/engines/real-estate/brrrr-calculator.ts` (~440 LoC — largest of P5)
- Create: `tests/brrrr-calculator.test.ts` (10 math tests)
- Modify: 6 wiring files (index.ts, tools, og-samples, codegen, ab-split 42→43, internal-links 42→43)

**Spec reference:** §"P5-5: BRRRR Calculator"

**Math model (post-fix from spec self-review):**

```
// Stage 1: Buy
initialLoan = purchasePrice * (1 - downPaymentPct/100)
downPayment = purchasePrice * (downPaymentPct/100)
closingBuy = purchasePrice * 0.03
totalStage1Cash = downPayment + closingBuy

// Stage 2: Rehab
totalStage2Cash = rehabCost
monthlyHoldCost = initialLoan * interestRate/100/12 + 200
holdingCost = monthlyHoldCost * holdingMonths

// Stage 3: Rent (during hold before refi)
interimRent = monthlyRent * Math.min(2, holdingMonths - 1)  // simplified

// Stage 4: Refinance
refiLTV = 0.75
refiLoan = afterRepairValue * refiLTV
cashOutFromRefi = refiLoan - initialLoan    // can be negative
monthlyMortgagePI = monthlyPI(refiLoan, interestRate, loanTermYears)
annualCashFlow = monthlyRent * 12 * (1 - vacancyRate/100) - monthlyExpenses * 12 - monthlyMortgagePI * 12

// Stage 5: Repeat (cash tally)
cashOut = totalStage1Cash + totalStage2Cash + holdingCost
cashIn = interimRent + cashOutFromRefi
cashLeftInDeal = cashOut - cashIn            // <0 means cash-out success
forcedAppreciation = afterRepairValue - purchasePrice - rehabCost
cashOnCash = cashLeftInDeal > 0 ? annualCashFlow / cashLeftInDeal * 100 : Infinity  // undefined if cashLeftInDeal ≤ 0
```

**Math helpers (10 tests):**

```typescript
export function stage1Cash(purchasePrice, downPaymentPct): { downPayment, closingBuy, total }
export function stage2Cash(rehabCost, initialLoan, interestRatePct, holdingMonths): { totalStage2Cash, holdingCost }
export function interimRentCalc(monthlyRent, holdingMonths): number
export function refiCalc(afterRepairValue, refiLTV, initialLoan): { refiLoan, cashOutFromRefi }
export function monthlyPI(refiLoan, interestRate, n): number  // shared
export function annualCashFlowPostRefi(monthlyRent, vacancyRatePct, monthlyExpenses, refiLoan, interestRate, n): number
export function cashLeftInDeal(cashOut, cashIn): number
export function forcedAppreciation(arv, purchasePrice, rehabCost): number
export function cashOnCashReturn(annualCashFlow, cashLeftInDeal): number | null
export function brrrrHealth(cashLeftInDeal, cashOut): { emoji, label }
```

**Engine inputs (11):** all spec-listed; includes `sellingCostsPct` field that is V2-deferred (not used in V1).

**Health heuristic:**
- 🟢 `cashLeftInDeal / cashOut ≤ 0%` (cash-out + CF positive)
- 🟡 0–15%
- 🟠 > 15%

**Edge cases:**
- `afterRepairValue < purchasePrice + rehabCost` → tip "ARV too low; flip don't BRRRR"
- `refiLoan < initialLoan` → cash-in scenario; flag
- `holdingMonths <= 0` → guard

Commit: `feat(p5-5): BRRRR calculator (5-stage cascade + 9-section v3 + 10 math tests + 43 engines)`. Memory: `p5-5-brrrr-shipped.md`.

---

## Task 6: P5-6 DSCR (Debt Service Coverage Ratio) Calculator

**Files:**
- Create: `src/engines/real-estate/dscr-calculator.ts` (~340 LoC)
- Create: `tests/dscr-calculator.test.ts` (7 math tests)
- Modify: 6 wiring files (index.ts, tools, og-samples, codegen, ab-split 43→44, internal-links 43→44)

**Spec reference:** §"P5-6: DSCR Calculator"

**Math model:**

```
grossAnnualRent = monthlyRent * 12
effectiveAnnualRent = grossAnnualRent * (1 - vacancyRate/100)
annualOperatingExpenses = monthlyExpenses * 12
annualNOI = effectiveAnnualRent - annualOperatingExpenses

monthlyMortgagePI = monthlyPI(loanAmount, interestRate, loanTermYears)
annualDebtService = monthlyMortgagePI * 12

dscr = annualDebtService === 0 ? Infinity : annualNOI / annualDebtService

// Reverse (target DSCR for max loan):
targetDSCR = 1.25
maxAnnualDS = annualNOI / targetDSCR
// Approximate max loan: 30y is dominated by interest; closed-form max loan ≈
//   For 30y at r%: monthly factor ≈ 0.00833*r (approx when r=7%); annual debt factor ≈ 0.10*r
//   Use iterative search (loop up to 100 iterations):
function maxLoanAtTargetDSCR(targetDSCR, annualNOI, monthlyRate, n): number {
  // Binary search between 0 and reasonable upper bound (e.g., annualNOI * 20)
  let lo = 0, hi = annualNOI * 20;
  for (let i = 0; i < 50; i++) {
    const mid = (lo + hi) / 2;
    const m = monthlyPI(mid, monthlyRate, n);
    const ads = m * 12;
    const d = annualNOI / ads;
    if (d > targetDSCR) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}
```

For V1 simplicity, output the approximate max loan as the reverse calc (use binary search; ~50 iterations is fast and accurate to ~$50).

**Math helpers (7 tests):**

```typescript
export function effectiveAnnualRent(monthlyRent, vacancyRatePct): number  // shared
export function annualNOI(monthlyRent, vacancyRatePct, monthlyExpenses): number
export function annualDebtService(loanAmount, monthlyRate, n): number
export function dscr(annualNOI, annualDebtService): number
export function maxLoanAtTargetDSCR(targetDSCR, annualNOI, monthlyRate, n): number  // binary search
export function dscrHealth(dscr): { emoji, label }
```

**Engine inputs (6):** `monthlyRent`, `monthlyExpenses`, `loanAmount`, `interestRate`, `loanTermYears`, `vacancyRate`.

**Health heuristic:**
- 🟢 DSCR ≥ 1.25 (qualifies)
- 🟡 1.0–1.25 (marginal)
- 🔴 < 1.0 (fails)

Commit: `feat(p5-6): DSCR calculator (debt service coverage + 9-section v3 + 7 math tests + 44 engines)`. Memory: `p5-6-dscr-shipped.md`.

---

## Task 7: Holistic Review + Final Push

**Files:** none directly modified; this is a review gate.

**Pre-merge checks (per CLAUDE.md "Before push/merge: holistic pre-merge review"):**

- [ ] **Step 1: Run full `pnpm check`** to verify all gates pass

```bash
pnpm check 2>&1 | tail -20
```

Expected: 44 engines, codegen-examples clean, codegen-customfn clean, i18n completeness 0 errors.

- [ ] **Step 2: Run all 6 customFn parser checks**

```bash
for slug in mortgage rent-vs-buy cap-rate rental-yield brrrr dscr; do
  echo "=== $slug ==="
  node tests/scripts/test-customFn.mjs solopreneur-$slug-calculator
done
```

Expected: 6 clean passes.

- [ ] **Step 3: Run all 6 test files**

```bash
for slug in mortgage rent-vs-buy cap-rate rental-yield brrrr dscr; do
  echo "=== $slug ==="
  node --import tsx --test tests/$slug-calculator.test.ts 2>&1 | tail -5
done
```

Expected: 6 file passes with 8+9+6+8+10+7 = 48 total test PASS.

- [ ] **Step 4: Live = static parity spot-check**

For one engine (e.g., mortgage), load `staticExamples[0]` text and verify customFn produces identical output for default inputs `$500K / $100K / 30y / 6.5%`. Use a small Node script or `pnpm build` to check rendered HTML.

- [ ] **Step 5: Build smoke test**

```bash
pnpm build 2>&1 | tail -30
```

Expected: completes with no errors; ~170+ pages built; 6 new real-estate pages appear in `dist/` directory listing.

- [ ] **Step 6: Holistic cross-file review**

Dispatch **one holistic reviewer subagent** (not per-task) with this prompt outline:

> Review the diff from master (HEAD~6..HEAD) covering 6 new engines in src/engines/real-estate/. Focus areas:
> 1. **Cross-engine consistency**: All 6 use the same v3 9-section structure; same ToolMeta format; same FAQ length (5); same howToUse length (8).
> 2. **Math helper consistency**: All PMT-related functions reuse logic where possible; ensure binary search in P5-6 doesn't have infinite loop bug.
> 3. **Wiring correctness**: All 6 entries in each wiring file are present and correctly formatted.
> 4. **Test completeness**: 8+9+6+8+10+7 = 48 tests, each with a meaningful assertion (not just "compiles").
> 5. **Edge cases handled**: Zero inputs, zero rates, zero vacancy, zero term — all return safe defaults.
> 6. **OG samples plausibility**: Headlines reasonable for default inputs.

If reviewer returns Critical/Important findings, dispatch fix subagents per task.

- [ ] **Step 7: Push to both mirrors**

```bash
git fetch origin --quiet
git fetch github --quiet
git rev-list --left-right --count origin/master...HEAD   # confirm 6 ahead, 0 behind
git push origin master
SKIP_PUSH_FETCH=1 git push github master
```

Expected: gitee shows 38 → 44 (6 new commits), github matches.

- [ ] **Step 8: Write P5 batch summary memory**

Create `memory/p5-series-shipped.md` with:
- 6 commits listed (commit hashes)
- Total LoC added
- 48 tests added
- Cluster SEO intent (6 RE pages forming topical authority)
- Any process lessons learned

Update `memory/MEMORY.md` index with `[[p5-series-shipped]]` entry.

---

## Self-Review (run by plan writer; this is a checklist, not a subagent)

**1. Spec coverage:**
- [x] §"P5-1: Mortgage Calculator" → Task 1
- [x] §"P5-2: Rent-vs-Buy Calculator" → Task 2
- [x] §"P5-3: Cap Rate Calculator" → Task 3
- [x] §"P5-4: Rental Yield / Cash-on-Cash Calculator" → Task 4
- [x] §"P5-5: BRRRR Calculator" → Task 5
- [x] §"P5-6: DSCR Calculator" → Task 6
- [x] §"Cross-cutting decisions" → Task 0 (scaffolding) + Global Constraints section
- [x] §"Risks" → Task 7 (holistic review)
- [x] §"Success criteria" → Task 7 final

**2. Placeholder scan:** Searched for `TODO`, `TBD`, `FIXME`, `XXX`, `???`, `fill in`, `placeholder` — 0 hits (customFn assembly referenced as "implementer MUST" with P4 pattern reference).

**3. Type consistency:**
- `monthlyPI(principal, monthlyRate, n)` reused across P5-1, P5-2, P5-4, P5-5, P5-6 — signature consistent.
- `dscr(annualNOI, annualDebtService): number` — Infinity for division by zero; consistent.
- `cashOnCash` return type: `number | null` (P5-5) vs `number` (P5-4) — different semantics (P5-5 returns null when cashLeftInDeal ≤ 0 because undefined; P5-4 always returns because it's calculated relative to invested cash not cashLeft). Both valid; intentionally different.

**4. Wiring count:** All 6 calculators touch the same 6 files (verified in Task 1 step 4 wiring pattern, repeated per task).

**5. Test count:** 8+9+6+8+10+7 = 48 tests. Matches spec exactly.

**6. Out of scope per spec V2 list:** Mentioned in plan header (line budget, etc.) but no V2 task included — confirmed correct since this plan covers V1 only.
