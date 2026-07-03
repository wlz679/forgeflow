# P4-3 SAFE / Convertible Note Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a SAFE (Simple Agreement for Future Equity) / Convertible Note calculator to ForgeFlowKit's Valuation category, modeling cap + discount conversion mechanics — matching v3 standard (9-section output with emoji-coded deal health).

**Architecture:** Single self-contained engine file `src/engines/valuation/safe-convertible-note-calculator.ts`. Pure math (server-side + browser), no backend/Supabase/Clerk integration. Astro auto-discovers via `registerEngine()` import wired through `src/engines/valuation/index.ts`. Math layer (`safeSharesAtCap`, `capPrice`, `discountPrice`, `conversionPrice`, `safeOwnership`, `dealHealth`, `discountHealth`, `safeType`) exported for unit tests — same pattern as P4-1/P4-2.

**Tech Stack:** Astro 4.16.19 SSG, TypeScript 5.6 strict, node:test built-in runner, `tsx` for TS script execution.

## Global Constraints

- v3 standard: every engine has `slug`, `title`, `inputs`, `clientConfig.customFn`, `staticExamples`, `faq`, `howToUse` (see `src/engines/investment/compound-interest-calculator.ts` for reference)
- `customFn` MUST parse as valid JS — verify with `node tests/scripts/test-customFn.mjs safe-convertible-note-calculator`. Watch out for the `}}if(...)` ASI trap; insert literal `;` between `}` and `if`/`for`/etc.
- After editing `calculate()`, run `node scripts/codegen-examples.mjs` to regenerate `staticExamples[0]` — `--check` mode (used by `pnpm check`) will fail otherwise
- Unicode in `calculate()` source uses literal emoji characters; unicode in `customFn` uses `\uXXXX` escapes
- No new dependencies; reuse `ToolEngine` type from `src/core/engines/types.ts`
- Slug format: `solopreneur-<kebab-case>` (e.g., `solopreneur-safe-convertible-note-calculator`)
- Engine file location: `src/engines/valuation/` (alongside `saas-valuation-calculator`, `stripe-fee-calculator`, `equity-dilution-calculator`)
- All input values arrive as `string` from the DOM — coerce via `parseFloat(inputs.X) || 0` for numbers
- `registerEngine(engine)` is called at module bottom (eager import at SSG time)
- **ToolInput.type** supports only `'text' | 'select' | 'number'` (no `'checkbox'`) — confirmed in `src/core/engines/types.ts`
- **categoryId `C` = valuation** (verified via `src/data/tools/valuation.ts`)
- **`ToolMeta.inputs` is `ToolInput[]` STRUCTURED form** (P4-2 lesson) — NOT `string[]` array. Use `{ name, label, placeholder, type, options? }[]` shape matching sibling valuation entries.
- **Live = static parity invariant (P4-2 lesson)**: any fix to a math helper MUST be mirrored in the customFn. If `compareProviders` is sorted dynamically in the math helper, the customFn's `cmp` (or equivalent) must also sort dynamically.

---

## File Structure

**New files (1):**
- `src/engines/valuation/safe-convertible-note-calculator.ts` (~300 LoC) — self-registering engine with exported math layer
- `tests/safe-convertible.test.ts` (~100 LoC) — 5 math-layer tests (per P4-1/P4-2 pattern)

**Modified files (6 — per P4-1/P4-2 lesson):**
- `src/engines/valuation/index.ts` (+1 import line) — eager registration
- `scripts/codegen-examples.mjs` (+1 entry in `ENGINES` array) — `staticExamples[0]` regen
- `src/data/tools/valuation.ts` (+ToolMeta entry, ~25 lines, with structured `ToolInput[]` inputs) — required for category page listing
- `src/data/og-samples.json` (+5 lines OG sample) — required by build smoke test
- `tests/ab-split.test.ts` (+0 LoC, bump count 34 → 35) — engine count assertion
- `tests/internal-links.test.ts` (+0 LoC, bump count 34 → 35 in 2 places) — engine count assertion

**Unchanged infrastructure:**
- `src/core/engines/types.ts` — `ToolEngine` shape unchanged
- `src/core/engines/registry.ts` — registry unchanged
- `src/i18n/translations.ts` — calculator title/description English strings; no new keys
- `src/pages/[lang]/[slug].astro` — auto-discovers new engine via `registerEngine()` import

---

## Task 1: SAFE / Convertible Note Calculator Engine [MECHANICAL]

**Files:**
- Create: `src/engines/valuation/safe-convertible-note-calculator.ts` (~300 LoC)
- Create: `tests/safe-convertible.test.ts` (~100 LoC)
- Modify: `src/engines/valuation/index.ts` (add 1 import line)
- Modify: `scripts/codegen-examples.mjs` (add 1 entry to `ENGINES` array)
- Modify: `src/data/tools/valuation.ts` (add 1 `ToolMeta` entry with structured inputs)
- Modify: `src/data/og-samples.json` (add 1 OG sample)
- Modify: `tests/ab-split.test.ts` (bump 34 → 35)
- Modify: `tests/internal-links.test.ts` (bump 34 → 35 in 2 places)

**Interfaces:**
- Consumes: `ToolEngine` from `src/core/engines/types.ts`, `registerEngine` from `src/core/engines/registry.ts`
- Produces: registered engine accessible via `getEngine('solopreneur-safe-convertible-note-calculator')`. Exports `safeSharesAtCap`, `capPrice`, `discountPrice`, `conversionPrice`, `safeOwnership`, `dealHealth`, `discountHealth`, `safeType` for tests + future reuse.

---

### Step 1: Write the math helpers + test file

Create `tests/safe-convertible.test.ts` with 5 tests:

```typescript
/**
 * P4-3 SAFE / Convertible Note Calculator — math layer tests.
 * Covers: capPrice + safeSharesAtCap (post-money SAFE convention),
 *         discountPrice, conversionPrice (min of cap/discount),
 *         safeOwnership, dealHealth, discountHealth.
 * Run via: node --import tsx --test tests/safe-convertible.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  safeSharesAtCap,
  capPrice,
  discountPrice,
  conversionPrice,
  safeOwnership,
  dealHealth,
  discountHealth,
  safeType,
} from '../src/engines/valuation/safe-convertible-note-calculator.ts';

test('post-money SAFE basic: $500K on $5M cap with 1M shares → 10% SAFE ownership', () => {
  // Standard YC post-money SAFE: $5M cap, $500K investment, 1M existing shares
  // Math: capPrice = ($5M - $500K) / 1M = $4.50, SAFE shares = $500K / $4.50 = 111,111
  // SAFE ownership = 111,111 / 1,111,111 = 10%
  const shares = safeSharesAtCap(500000, 5000000, 1000000);
  assert.equal(Math.round(shares), 111111);
  const price = capPrice(5000000, 5000000 - 500000, 1000000);
  assert.equal(price, 4.5);
  const own = safeOwnership(shares, 1000000);
  assert.equal(Math.round(own * 1000) / 1000, 0.1); // 10% with floating-point tolerance
});

test('discount governs: $500K on $5M cap with 20% discount, next round at $5M', () => {
  // discountPrice = $5M / 1M × 0.8 = $4.00 (per share)
  // capPrice = $4.50 (from test 1)
  // conversionPrice = min($4.00, $4.50) = $4.00 (DISCOUNT GOVERNS)
  // shares = $500K / $4.00 = 125,000
  // SAFE ownership = 125,000 / 1,125,000 = 11.1%
  const dp = discountPrice(5000000, 1000000, 20);
  assert.equal(dp, 4.0);
  const cp = capPrice(5000000, 5000000 - 500000, 1000000);
  assert.equal(cp, 4.5);
  const cvp = conversionPrice(cp, dp);
  assert.equal(cvp, 4.0); // discount governs
  const shares = 500000 / cvp;
  const own = safeOwnership(shares, 1000000);
  assert.equal(Math.round(own * 10000) / 10000, 0.1111);
});

test('cap dominates: $500K on $5M cap with 20% discount, next round at $10M', () => {
  // discountPrice = $10M / 1M × 0.8 = $8.00
  // capPrice = $4.50
  // conversionPrice = min($4.50, $8.00) = $4.50 (CAP GOVERNS)
  const dp = discountPrice(10000000, 1000000, 20);
  assert.equal(dp, 8.0);
  const cp = capPrice(5000000, 5000000 - 500000, 1000000);
  assert.equal(cp, 4.5);
  const cvp = conversionPrice(cp, dp);
  assert.equal(cvp, 4.5); // cap governs
});

test('discount dominates with very high cap: $500K on $50M cap with 20% discount, next round at $5M', () => {
  // capPrice = ($50M - $500K) / 1M = $49.50 (very high)
  // discountPrice = $5.00
  // conversionPrice = min($49.50, $5.00) = $5.00 (DISCOUNT GOVERNS via next round, not cap)
  const cp = capPrice(50000000, 50000000 - 500000, 1000000);
  assert.equal(Math.round(cp * 100) / 100, 49.5);
  const dp = discountPrice(5000000, 1000000, 20);
  assert.equal(dp, 4.0);
  const cvp = conversionPrice(cp, dp);
  assert.equal(cvp, 4.0);
});

test('edge case: cap equals investment throws / returns null', () => {
  // $5M investment, $5M cap → capPrice is undefined (divide by zero in formula)
  // Behavior: return null for capPrice, so calculate() can show error
  const price = capPrice(5000000, 5000000 - 5000000, 1000000); // effectivePreMoney = 0
  assert.equal(price, 0); // Or some sentinel; calculate() handles this case explicitly
});

test('dealHealth: 10:1 cap-to-investment ratio is 🟡 standard', () => {
  const h = dealHealth(10); // $5M / $500K = 10
  assert.equal(h.emoji, '🟡');
  assert.ok(h.label.toLowerCase().includes('standard'));
});

test('discountHealth: 0% discount is 🟢 no discount (post-money standard)', () => {
  const h = discountHealth(0);
  assert.equal(h.emoji, '🟢');
  assert.ok(h.label.toLowerCase().includes('no discount'));
});

test('safeType: 0% discount with cap → "Post-Money SAFE (YC Standard)"', () => {
  const t = safeType(5000000, 0);
  assert.equal(t, 'Post-Money SAFE (YC Standard)');
});

test('safeType: 20% discount with cap → "Post-Money SAFE with Discount"', () => {
  const t = safeType(5000000, 20);
  assert.equal(t, 'Post-Money SAFE with Discount');
});
```

Create the engine file `src/engines/valuation/safe-convertible-note-calculator.ts` with the math helpers exported but `calculateSafe` and `customFn` yet to be written:

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============== Math helpers (exported for tests) ==============

/**
 * Number of SAFE shares issued at conversion, given the cap.
 * Closed-form algebra from capPrice = (postMoneyCap - investment) / existingShares:
 *   SAFEshares = investment / capPrice = investment × existingShares / (postMoneyCap - investment)
 * Returns 0 if cap <= investment (caller should validate).
 */
export function safeSharesAtCap(
  investment: number,
  postMoneyCap: number,
  existingShares: number,
): number {
  const effectivePreMoney = postMoneyCap - investment;
  if (effectivePreMoney <= 0 || existingShares <= 0) return 0;
  return (investment * existingShares) / effectivePreMoney;
}

/**
 * Cap price per share: (postMoneyCap - investment) / existingShares.
 * This is the per-share price at which SAFE converts if the cap governs.
 * Returns 0 if effective pre-money is non-positive.
 */
export function capPrice(
  postMoneyCap: number,
  effectivePreMoney: number,
  existingShares: number,
): number {
  if (effectivePreMoney <= 0 || existingShares <= 0) return 0;
  return effectivePreMoney / existingShares;
}

/**
 * Discount price per share: (nextRoundValuation / existingShares) × (1 - discountRate/100).
 * If nextRoundValuation = 0 or existingShares = 0, returns Infinity (so cap always wins).
 */
export function discountPrice(
  nextRoundValuation: number,
  existingShares: number,
  discountRatePercent: number,
): number {
  if (nextRoundValuation <= 0 || existingShares <= 0) return Infinity;
  return (nextRoundValuation / existingShares) * (1 - discountRatePercent / 100);
}

/**
 * Conversion price = min(capPrice, discountPrice). The SAFE converts at whichever is lower
 * (better for the SAFE investor).
 */
export function conversionPrice(
  capP: number,
  discountP: number,
): number {
  return Math.min(capP, discountP);
}

/**
 * SAFE investor ownership at conversion, as a fraction (0-1).
 *   own = SAFEshares / (existingShares + SAFEshares)
 */
export function safeOwnership(
  safeShares: number,
  existingShares: number,
): number {
  const total = existingShares + safeShares;
  if (total <= 0) return 0;
  return safeShares / total;
}

/**
 * Health assessment based on cap-to-investment ratio.
 *   ratio < 5 → 🟠 aggressive (low cap)
 *   ratio 5-10 → 🟡 standard
 *   ratio >= 10 → 🟢 founder-friendly (high cap)
 */
export function dealHealth(capToInvestmentRatio: number): {
  emoji: string;
  label: string;
} {
  if (capToInvestmentRatio < 5)
    return { emoji: '🟠', label: 'low cap — aggressive for founder' };
  if (capToInvestmentRatio < 10)
    return { emoji: '🟡', label: 'standard cap' };
  return { emoji: '🟢', label: 'founder-friendly cap' };
}

/**
 * Discount assessment.
 *   0% → 🟢 no discount (post-money standard)
 *   1-15% → 🟡 moderate
 *   16-25% → 🟠 high
 *   > 25% → 🔴 very high
 */
export function discountHealth(discountRatePercent: number): {
  emoji: string;
  label: string;
} {
  if (discountRatePercent === 0)
    return { emoji: '🟢', label: 'no discount (post-money standard)' };
  if (discountRatePercent <= 15)
    return { emoji: '🟡', label: 'moderate discount' };
  if (discountRatePercent <= 25)
    return { emoji: '🟠', label: 'high discount' };
  return { emoji: '🔴', label: 'very high discount — unusual' };
}

/**
 * SAFE type label for display.
 */
export function safeType(
  postMoneyCap: number,
  discountRatePercent: number,
): string {
  if (postMoneyCap > 0 && discountRatePercent === 0)
    return 'Post-Money SAFE (YC Standard)';
  if (postMoneyCap > 0 && discountRatePercent > 0)
    return 'Post-Money SAFE with Discount';
  if (postMoneyCap <= 0 && discountRatePercent > 0)
    return 'Discount-Only SAFE (Pre-Conversion)';
  return 'Custom SAFE';
}

// ============== calculate() — to be filled in Step 3 ==============

function calculateSafe(inputs: Record<string, string>): string[] {
  // Filled in Step 3
  return [];
}

// ============== customFn — to be minified in Step 5 ==============

const customFn = ''; // filled in Step 5

// ============== Engine — to be filled in Step 6 ==============

const engine: ToolEngine = {
  slug: 'solopreneur-safe-convertible-note-calculator',
  title: 'SAFE / Convertible Note Calculator',
  description: 'Model your SAFE (Simple Agreement for Future Equity) round. See how valuation cap and discount rate interact, what ownership % the SAFE investor gets at conversion, and how much existing shareholders are diluted. Covers YC post-money SAFE, pre-money SAFE with discount, and discount-only structures.',
  inputs: [],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateSafe(inputs);
  },
  staticExamples: [''],
  faq: [],
  howToUse: [],
};

registerEngine(engine);
```

---

### Step 2: Run the tests — verify they pass

Run:

```bash
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/safe-convertible.test.ts
```

Expected: PASS (9/9 — 5 cap/discount math + 2 health + 2 safeType). The math helpers are fully implemented in Step 1 because the formulas are derived from first principles (closed-form algebra for post-money SAFE).

If FAIL, check that:
- The import path `../src/engines/valuation/safe-convertible-note-calculator.ts` is correct
- The math formulas match: `safeSharesAtCap = investment × existingShares / (postMoneyCap - investment)`, `capPrice = effectivePreMoney / existingShares`, `discountPrice = (nextRoundValuation / existingShares) × (1 - discountRate/100)`
- Floating point: use `Math.round(x * N) / N` for tolerance

---

### Step 3: Implement `calculateSafe()` — full 9-section output

Replace the placeholder body of `calculateSafe` in `src/engines/valuation/safe-convertible-note-calculator.ts`. Follows the same v3 structure as P4-1/P4-2 (emoji headers + `━━━━━` dividers) but adapted for SAFE conversion analysis.

```typescript
function calculateSafe(inputs: Record<string, string>): string[] {
  const investment = Math.max(0, parseFloat(inputs.investmentAmount) || 0);
  const postMoneyCap = Math.max(0, parseFloat(inputs.postMoneyCap) || 0);
  const discountRate = Math.max(0, parseFloat(inputs.discountRate) || 0);
  const existingShares = Math.max(0, parseFloat(inputs.existingShares) || 0);
  const nextRoundValuation = Math.max(0, parseFloat(inputs.nextRoundValuation) || 0);

  // Edge case: cap must exceed investment
  if (postMoneyCap > 0 && postMoneyCap <= investment) {
    return [
      '⏰ SAFE / Convertible Note Calculator\n\n' +
      '💰 The post-money cap ($' + postMoneyCap.toLocaleString() + ') must exceed the investment amount ($' + investment.toLocaleString() + '). A SAFE cannot have a cap lower than the investment it represents.',
    ];
  }
  if (investment <= 0 || postMoneyCap <= 0 || existingShares <= 0) {
    return [
      '⏰ SAFE / Convertible Note Calculator\n\n' +
      '💰 Enter investment amount, post-money cap, and existing fully diluted shares to see SAFE conversion mechanics.',
    ];
  }

  // Core math
  const effectivePreMoney = postMoneyCap - investment;
  const cp = capPrice(postMoneyCap, effectivePreMoney, existingShares);
  const dp = discountPrice(
    nextRoundValuation > 0 ? nextRoundValuation : postMoneyCap,
    existingShares,
    discountRate,
  );
  const cvp = conversionPrice(cp, dp);
  const safeShares = investment / cvp;
  const own = safeOwnership(safeShares, existingShares);
  const existingOwn = 1 - own;
  const capToInvestmentRatio = postMoneyCap / investment;
  const dh = dealHealth(capToInvestmentRatio);
  const dish = discountHealth(discountRate);
  const type = safeType(postMoneyCap, discountRate);

  // Format helpers
  const fmt = (n: number) => n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(n);
  const money2 = (n: number) => '$' + n.toFixed(2);
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const shares = (n: number) => Math.round(n).toLocaleString('en-US');

  // Ownership pie chart (20 chars wide)
  const safeBars = Math.round(own * 20);
  const existingBars = 20 - safeBars;
  const pieChart =
    '▓'.repeat(existingBars) + '░'.repeat(safeBars) +
    '  Existing ' + pct(existingOwn) + '  |  SAFE ' + pct(own);

  // Effective post-money at conversion
  const effectivePostMoney = cvp * (existingShares + safeShares);
  const capGoverns = cvp === cp;

  // What-If scenarios
  // 1. Double the SAFE ($1M instead of $500K)
  const doubleShares = safeSharesAtCap(investment * 2, postMoneyCap, existingShares);
  const doubleOwn = safeOwnership(doubleShares, existingShares);
  // 2. Lower cap to $3M
  const lowerCap = investment * 6; // 6:1 ratio
  const lowerCapShares = lowerCap > investment ? safeSharesAtCap(investment, lowerCap, existingShares) : 0;
  const lowerCapOwn = lowerCap > investment ? safeOwnership(lowerCapShares, existingShares) : 0;
  // 3. Add 20% discount
  const withDiscountCvp = conversionPrice(
    cp,
    discountPrice(postMoneyCap, existingShares, 20),
  );
  const withDiscountShares = investment / withDiscountCvp;
  const withDiscountOwn = safeOwnership(withDiscountShares, existingShares);
  // 4. No cap (cap = $100M, effectively capless)
  const noCapShares = safeSharesAtCap(investment, 100000000, existingShares);
  const noCapOwn = safeOwnership(noCapShares, existingShares);
  // 5. Stack with prior $250K SAFE at $4M cap
  const priorSafeShares = safeSharesAtCap(250000, 4000000, existingShares);
  const stackedShares = priorSafeShares + safeShares;
  const stackedOwn = safeOwnership(stackedShares, existingShares);

  // Tip selection
  let tip: string;
  if (discountRate === 0) {
    tip = '💡 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder\'s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.';
  } else if (discountRate > 15 && capToInvestmentRatio < 8) {
    tip = '💡 Tip: Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low.';
  } else if (existingOwn < 0.5) {
    tip = '💡 Tip: Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor.';
  } else {
    tip = '💡 Tip: Standard terms: $5M post-money cap on $500K raise → ~10% dilution. If investor asks for >20% discount, that\'s a red flag. Pro-rata rights are negotiable but rarely granted at SAFE stage.';
  }

  const r =
    '⏰ SAFE / Convertible Note Calculator\n\n' +
    '💰 Deal Snapshot:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Investment:          ' + money(investment) + '\n' +
    '• Post-Money Cap:      ' + money(postMoneyCap) + '\n' +
    '• Discount Rate:       ' + discountRate + '%\n' +
    '• Effective Pre-Money: ' + money(effectivePreMoney) + '  (cap − investment)\n' +
    '• SAFE Type:           ' + type + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📐 Conversion Mechanics:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cap Price:           ' + money2(cp) + ' per share  (post-money cap / (existing + SAFE shares))\n' +
    (discountRate > 0
      ? '• Discount Price:      ' + money2(dp) + ' per share  (next round × (1 − discount))\n'
      : '• Discount Price:      n/a (no discount)\n') +
    '• Conversion Price:    ' + money2(cvp) + ' per share  ← ' + (capGoverns ? 'CAP GOVERNS' : 'DISCOUNT GOVERNS') + '\n' +
    '• Shares Issued:       ' + shares(safeShares) + '  (' + money(investment) + ' ÷ ' + money2(cvp) + ')\n' +
    '• SAFE Ownership:      ' + pct(own) + ' at conversion\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Deal Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + dh.emoji + ' ' + dh.label + ' (cap is ' + capToInvestmentRatio.toFixed(1) + '× investment)\n' +
    '• ' + dish.emoji + ' ' + dish.label + '\n' +
    '• Conversion trigger:  whichever is lower (cap or discount) at next priced round\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Ownership Outcomes:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Existing Pool (founder + prior investors + options):\n' +
    '    pre-SAFE:  100.0%  (' + shares(existingShares) + ' shares)\n' +
    '    post-SAFE: ' + pct(existingOwn) + '  (' + shares(existingShares) + ' of ' + shares(existingShares + safeShares) + ' shares)\n' +
    '• SAFE Holder: ' + pct(own) + '  (' + shares(safeShares) + ' shares at conversion)\n' +
    '• Pie: ' + pieChart + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Dilution Analysis:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Existing pool dilution: −' + pct(own) + '  (from 100% to ' + pct(existingOwn) + ')\n' +
    '• SAFE-as-%-of-post: ' + pct(own) + '\n' +
    '• Effective post-money at conversion: ' + money(effectivePostMoney) + '  (' + (capGoverns ? 'cap governs' : 'discount governs') + ')\n' +
    '• Cap sensitivity: at 2× cap ($' + fmt(postMoneyCap * 2) + '), SAFE holder would get ' + pct(safeOwnership(safeSharesAtCap(investment, postMoneyCap * 2, existingShares), existingShares)) + ' instead of ' + pct(own) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Double the SAFE ($' + fmt(investment * 2) + '):            existing pool drops to ' + pct(1 - doubleOwn) + ', SAFE holder rises to ' + pct(doubleOwn) + '\n' +
    '• Lower cap to $' + fmt(lowerCap) + ':                SAFE holder gets ' + pct(lowerCapOwn) + ', existing pool drops to ' + pct(1 - lowerCapOwn) + '\n' +
    '• Add 20% discount:                conversion at ' + money2(withDiscountCvp) + ' per share, SAFE holder gets ' + pct(withDiscountOwn) + '\n' +
    '• No cap (cap = $100M):            effectively discount-only, SAFE holder gets ' + pct(noCapOwn) + '\n' +
    '• Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership ' + pct(stackedOwn) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 different cap levels
  const caps = [1000000, 3000000, 5000000, 10000000, 20000000];
  for (const c of caps) {
    const sShares = safeSharesAtCap(investment, c, existingShares);
    const sOwn = safeOwnership(sShares, existingShares);
    results.push(
      'Comparison: $' + fmt(c) + ' cap on $' + fmt(investment) + ' SAFE → SAFE holder gets ' + pct(sOwn) + ' (' + shares(sShares) + ' shares)'
    );
  }

  return results;
}
```

---

### Step 4: Run math tests — verify still pass after calculate() addition

Run:

```bash
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/safe-convertible.test.ts
```

Expected: PASS (9/9). The math functions weren't changed; adding `calculate()` shouldn't affect tests.

If FAIL, check that the math helpers weren't accidentally modified.

---

### Step 5: Write the minified `customFn`

The `customFn` is a minified JS string that runs in the browser via `new Function('inputs', 'pick', 'fill', customFn)`. It mirrors `calculateSafe` logic. **Critical:** must parse as valid JS.

Replace the `customFn` declaration in `src/engines/valuation/safe-convertible-note-calculator.ts` with:

```typescript
const customFn =
  "function sShares(i,c,e){var ep=c-i;if(ep<=0||e<=0)return 0;return i*e/ep;}" +
  "function cpFn(c,ep,e){if(ep<=0||e<=0)return 0;return ep/e;}" +
  "function dpFn(nr,e,dr){if(nr<=0||e<=0)return Infinity;return nr/e*(1-dr/100);}" +
  "function cvpFn(c,d){return Math.min(c,d);}" +
  "function ownFn(s,e){var t=e+s;if(t<=0)return 0;return s/t;}" +
  "function dhFn(r){if(r<5)return{e:'\\uD83D\\uDFE0',l:'low cap \\u2014 aggressive for founder'};if(r<10)return{e:'\\uD83D\\uDCA1',l:'standard cap'};return{e:'\\uD83D\\uDFE2',l:'founder-friendly cap'};}" +
  "function dishFn(d){if(d===0)return{e:'\\uD83D\\uDFE2',l:'no discount (post-money standard)'};if(d<=15)return{e:'\\uD83D\\uDCA1',l:'moderate discount'};if(d<=25)return{e:'\\uD83D\\uDFE0',l:'high discount'};return{e:'\\uD83D\\uDD34',l:'very high discount \\u2014 unusual'};}" +
  "function typeFn(c,d){if(c>0&&d===0)return'Post-Money SAFE (YC Standard)';if(c>0&&d>0)return'Post-Money SAFE with Discount';if(c<=0&&d>0)return'Discount-Only SAFE (Pre-Conversion)';return'Custom SAFE';}" +
  "var i=Math.max(0,parseFloat(inputs.investmentAmount)||0);" +
  "var c=Math.max(0,parseFloat(inputs.postMoneyCap)||0);" +
  "var d=Math.max(0,parseFloat(inputs.discountRate)||0);" +
  "var e=Math.max(0,parseFloat(inputs.existingShares)||0);" +
  "var nr=Math.max(0,parseFloat(inputs.nextRoundValuation)||0);" +
  "if(c>0&&c<=i){return['\\u23F0 SAFE / Convertible Note Calculator\\n\\n\\uD83D\\uDCB0 The post-money cap ($'+c.toLocaleString()+') must exceed the investment amount ($'+i.toLocaleString()+'). A SAFE cannot have a cap lower than the investment it represents.'];}" +
  "if(i<=0||c<=0||e<=0){return['\\u23F0 SAFE / Convertible Note Calculator\\n\\n\\uD83D\\uDCB0 Enter investment amount, post-money cap, and existing fully diluted shares to see SAFE conversion mechanics.'];}" +
  "var ep=c-i;" +
  "var cp=cpFn(c,ep,e);" +
  "var dp=dpFn(nr>0?nr:c,e,d);" +
  "var cvp=cvpFn(cp,dp);" +
  "var sShares1=i/cvp;" +
  "var own=ownFn(sShares1,e);" +
  "var eOwn=1-own;" +
  "var r=c/i;" +
  "var dh=dhFn(r);" +
  "var dish=dishFn(d);" +
  "var type=typeFn(c,d);" +
  "function fmt(n){return n.toLocaleString('en-US',{maximumFractionDigits:0});}" +
  "function money(n){return'$'+fmt(n);}" +
  "function money2(n){return'$'+n.toFixed(2);}" +
  "function pct(n){return(n*100).toFixed(1)+'%';}" +
  "function shares(n){return Math.round(n).toLocaleString('en-US');}" +
  "var sb=Math.round(own*20);" +
  "var eb=20-sb;" +
  "var pie='\\u2593'.repeat(eb)+'\\u2591'.repeat(sb)+'  Existing '+pct(eOwn)+'  |  SAFE '+pct(own);" +
  "var effPost=cvp*(e+sShares1);" +
  "var capGov=cvp===cp;" +
  "var dblSh=sShares(i*2,c,e);" +
  "var dblOwn=ownFn(dblSh,e);" +
  "var lc=i*6;" +
  "var lcSh=lc>i?sShares(i,lc,e):0;" +
  "var lcOwn=lc>i?ownFn(lcSh,e):0;" +
  "var wdcvp=cvpFn(cp,dpFn(c,e,20));" +
  "var wdSh=i/wdcvp;" +
  "var wdOwn=ownFn(wdSh,e);" +
  "var ncSh=sShares(i,100000000,e);" +
  "var ncOwn=ownFn(ncSh,e);" +
  "var prSh=sShares(250000,4000000,e);" +
  "var stSh=prSh+sShares1;" +
  "var stOwn=ownFn(stSh,e);" +
  "var tip='';" +
  "if(d===0)tip='\\uD83D\\uDCA1 Tip: Post-money SAFE (YC standard) protects founders by fixing SAFE holder\\'s post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic.';" +
  "else if(d>15&&r<8)tip='\\uD83D\\uDCA1 Tip: Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low.';" +
  "else if(eOwn<0.5)tip='\\uD83D\\uDCA1 Tip: Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor.';" +
  "else tip='\\uD83D\\uDCA1 Tip: Standard terms: $5M post-money cap on $500K raise → ~10% dilution. If investor asks for >20% discount, that\\'s a red flag. Pro-rata rights are negotiable but rarely granted at SAFE stage.';" +
  "var r2='';" +
  "r2+='\\u23F0 SAFE / Convertible Note Calculator\\n\\n';" +
  "r2+='\\uD83D\\uDCB0 Deal Snapshot:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Investment:          '+money(i)+'\\n';" +
  "r2+='\\u2022 Post-Money Cap:      '+money(c)+'\\n';" +
  "r2+='\\u2022 Discount Rate:       '+d+'%\\n';" +
  "r2+='\\u2022 Effective Pre-Money: '+money(ep)+'  (cap \\u2212 investment)\\n';" +
  "r2+='\\u2022 SAFE Type:           '+type+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDCD0 Conversion Mechanics:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Cap Price:           '+money2(cp)+' per share  (post-money cap / (existing + SAFE shares))\\n';" +
  "if(d>0)r2+='\\u2022 Discount Price:      '+money2(dp)+' per share  (next round \\u00d7 (1 \\u2212 discount))\\n';" +
  "else r2+='\\u2022 Discount Price:      n/a (no discount)\\n';" +
  "r2+='\\u2022 Conversion Price:    '+money2(cvp)+' per share  \\u2190 '+(capGov?'CAP GOVERNS':'DISCOUNT GOVERNS')+'\\n';" +
  "r2+='\\u2022 Shares Issued:       '+shares(sShares1)+'  ('+money(i)+' \\u00f7 '+money2(cvp)+')\\n';" +
  "r2+='\\u2022 SAFE Ownership:      '+pct(own)+' at conversion\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83E\\uDE7A Deal Health:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 '+dh.e+' '+dh.l+' (cap is '+r.toFixed(1)+'\\u00d7 investment)\\n';" +
  "r2+='\\u2022 '+dish.e+' '+dish.l+'\\n';" +
  "r2+='\\u2022 Conversion trigger:  whichever is lower (cap or discount) at next priced round\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83C\\uDFAF Ownership Outcomes:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Existing Pool (founder + prior investors + options):\\n';" +
  "r2+='    pre-SAFE:  100.0%  ('+shares(e)+' shares)\\n';" +
  "r2+='    post-SAFE: '+pct(eOwn)+'  ('+shares(e)+' of '+shares(e+sShares1)+' shares)\\n';" +
  "r2+='\\u2022 SAFE Holder: '+pct(own)+'  ('+shares(sShares1)+' shares at conversion)\\n';" +
  "r2+='\\u2022 Pie: '+pie+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\u2696\\uFE0F Dilution Analysis:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Existing pool dilution: \\u2212'+pct(own)+'  (from 100% to '+pct(eOwn)+')\\n';" +
  "r2+='\\u2022 SAFE-as-%-of-post: '+pct(own)+'\\n';" +
  "r2+='\\u2022 Effective post-money at conversion: '+money(effPost)+'  ('+(capGov?'cap governs':'discount governs')+')\\n';" +
  "r2+='\\u2022 Cap sensitivity: at 2\\u00d7 cap ($'+fmt(c*2)+'), SAFE holder would get '+pct(ownFn(sShares(i,c*2,e),e))+' instead of '+pct(own)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r2+='\\u2022 Double the SAFE ($'+fmt(i*2)+'):            existing pool drops to '+pct(1-dblOwn)+', SAFE holder rises to '+pct(dblOwn)+'\\n';" +
  "r2+='\\u2022 Lower cap to $'+fmt(lc)+':                SAFE holder gets '+pct(lcOwn)+', existing pool drops to '+pct(1-lcOwn)+'\\n';" +
  "r2+='\\u2022 Add 20% discount:                conversion at '+money2(wdcvp)+' per share, SAFE holder gets '+pct(wdOwn)+'\\n';" +
  "r2+='\\u2022 No cap (cap = $100M):            effectively discount-only, SAFE holder gets '+pct(ncOwn)+'\\n';" +
  "r2+='\\u2022 Stack with prior $250K SAFE at $4M cap: cumulative SAFE ownership '+pct(stOwn)+'\\n\\n';" +
  "r2+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r2+=tip;" +
  "var results=[r2];" +
  "var caps=[1000000,3000000,5000000,10000000,20000000];" +
  "for(var i=0;i<caps.length;i++){var c1=caps[i];var s1=sShares(i,c1,e);var o1=ownFn(s1,e);results.push('Comparison: $'+fmt(c1)+' cap on $'+fmt(i)+' SAFE \\u2192 SAFE holder gets '+pct(o1)+' ('+shares(s1)+' shares)');}" +
  "return results;";
```

**CRITICAL pre-flight reminder (P4-2 lesson):** The customFn's mirror of math helpers MUST stay in sync. If any test-driven fix changes `cpFn` / `dpFn` / `cvpFn` / `ownFn` / `dhFn` / `dishFn` / `typeFn` behavior, the customFn must be updated to match. Live = static parity is a hard invariant.

---

### Step 6: Verify `customFn` parses correctly

Run:

```bash
cd D:/E/独立站/youtube-tools && node tests/scripts/test-customFn.mjs safe-convertible-note-calculator
```

Expected output:

```
safe-convertible-note-calculator: OK (XXXX chars)
```

If `BROKEN`, the most common causes are:
- Missing `;` between `}` and `if`/`for`/next statement (ASI trap)
- Unescaped `'` in tip text (use `\\'` for backslash-escaped apostrophe, or `\\u2019` for typographic)
- Mismatched quote pairs

Fix and re-run. Do NOT proceed until it parses.

---

### Step 7: Add the import to `src/engines/valuation/index.ts`

Open `src/engines/valuation/index.ts`. Add a new line for the safe-convertible import. Order does not matter.

Add:
```typescript
import './safe-convertible-note-calculator';
```

---

### Step 8: Add the engine entry to `scripts/codegen-examples.mjs`

Open `scripts/codegen-examples.mjs` and add a new entry to the `ENGINES` array (insert after the existing valuation entries to keep engines grouped):

```javascript
  { file: 'safe-convertible-note-calculator.ts', slug: 'solopreneur-safe-convertible-note-calculator',
    subdir: 'valuation', defaultInputs: { investmentAmount: '500000', postMoneyCap: '5000000', discountRate: '0', existingShares: '1000000', nextRoundValuation: '5000000' } },
```

---

### Step 9: Regenerate `staticExamples[0]` via codegen

Run:

```bash
cd D:/E/独立站/youtube-tools && node scripts/codegen-examples.mjs
```

This rewrites `staticExamples[0]` to match the output of `calculateSafe({investmentAmount: '500000', postMoneyCap: '5000000', discountRate: '0', existingShares: '1000000', nextRoundValuation: '5000000'})`.

Expected: no errors. The script writes back the staticExamples field.

---

### Step 10: Fill in engine metadata (inputs, faq, howToUse)

Replace the empty arrays in the engine object in `src/engines/valuation/safe-convertible-note-calculator.ts`:

```typescript
const engine: ToolEngine = {
  slug: 'solopreneur-safe-convertible-note-calculator',
  title: 'SAFE / Convertible Note Calculator',
  description: 'Model your SAFE (Simple Agreement for Future Equity) round. See how valuation cap and discount rate interact, what ownership % the SAFE investor gets at conversion, and how much existing shareholders are diluted. Covers YC post-money SAFE, pre-money SAFE with discount, and discount-only structures.',
  inputs: [
    { name: 'investmentAmount', label: 'Investment Amount ($)', placeholder: 'e.g. 500000', type: 'number' },
    { name: 'postMoneyCap', label: 'Post-Money Valuation Cap ($)', placeholder: 'e.g. 5000000', type: 'number' },
    { name: 'discountRate', label: 'Discount Rate (%)', placeholder: 'e.g. 0 or 20', type: 'number' },
    { name: 'existingShares', label: 'Existing Fully Diluted Shares', placeholder: 'e.g. 1000000', type: 'number' },
    { name: 'nextRoundValuation', label: 'Expected Next Round Valuation ($)', placeholder: 'e.g. 5000000', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateSafe(inputs);
  },
  staticExamples: [''], // codegen will fill this in Step 9
  faq: [
    { q: 'What is a SAFE and how does conversion work?', a: 'A SAFE (Simple Agreement for Future Equity) is Y Combinator\'s standardized contract for early-stage startup funding. Unlike a priced round, a SAFE has no fixed share price at signing — instead, it converts to equity at a future priced round. The conversion price is the lower of two values: the valuation cap price (a discount to the cap) or the discount price (a discount to the next round). For a $500K SAFE on a $5M cap with 1M existing shares, the SAFE holder gets ~10% at conversion (post-money SAFE convention, YC standard since 2018).' },
    { q: 'What is the difference between pre-money and post-money SAFE?', a: 'Pre-money SAFE (YC\'s older form, pre-2018): the cap refers to pre-money valuation, so the SAFE holder\'s ownership at conversion depends on the size of the priced round — bigger rounds = more dilution for SAFE holder. Post-money SAFE (YC standard since 2018): the cap refers to post-money valuation, so the SAFE holder\'s % is fixed at conversion. For founders, post-money SAFE is dramatically better because the math is predictable. Always use post-money SAFE unless the investor is strategic and willing to negotiate the discount differently.' },
    { q: 'How does the discount rate interact with the cap?', a: 'A SAFE typically has both a valuation cap (e.g., $5M) and a discount rate (e.g., 20%). At conversion, the SAFE holder gets the lower of: (1) the cap price = cap / total fully diluted shares, or (2) the discount price = next round price per share × (1 - discount). Example: $5M cap, 20% discount, next round at $10M → cap price = $4.50/share, discount price = $8.00/share, SAFE converts at $4.50 (cap wins). But if next round is at $5M → cap price $4.50, discount price $4.00, SAFE converts at $4.00 (discount wins).' },
    { q: 'What is MFN (Most Favored Nation) in a SAFE?', a: 'MFN is a clause that gives the SAFE holder the right to upgrade to better terms if you issue a subsequent SAFE with more favorable terms (lower cap, higher discount, or other sweeteners). MFN is common for early SAFEs to protect the first investor from being penalized for being early. The downside for founders: each new SAFE with MFN can create a chain of upgrades that erodes your future flexibility. Most YC post-money SAFEs don\'t include MFN by default — only add it if the investor is a strategic anchor.' },
    { q: 'When does a SAFE convert and what triggers it?', a: 'A SAFE converts at a "liquidity event" — most commonly a priced equity round (Series Seed, Series A, etc.) where the company issues preferred stock to new investors. At conversion, the SAFE holder\'s investment is converted to shares at the conversion price (min of cap and discount). Other less common triggers: an IPO, an acquisition (change of control), or the maturity date (typically 10 years after issuance — rarely reached in practice). Note: SAFEs do not accrue interest (unlike convertible notes), so the investment amount at conversion is exactly what was originally invested.' },
  ],
  howToUse: [
    'Enter the SAFE investment amount (e.g., $500,000).',
    'Set the post-money valuation cap (e.g., $5,000,000 for a typical seed round).',
    'Enter the discount rate (0% for standard post-money SAFE, 20% for pre-money SAFE).',
    'Enter your existing fully diluted shares (founder + prior investors + option pool).',
    'Set the expected next round valuation (default = cap; adjust if you expect a different round size).',
    'Review the conversion mechanics, deal health, and ownership outcomes.',
    'Check the 5 what-if scenarios for sensitivity analysis (double SAFE, lower cap, etc.).',
  ],
};
```

---

### Step 11: Add the ToolMeta entry to `src/data/tools/valuation.ts`

Open `src/data/tools/valuation.ts`. Add a new `ToolMeta` entry for the safe-convertible calculator (insert after the existing entries, before the closing `];`).

**CRITICAL P4-2 lesson:** `ToolMeta.inputs` is `ToolInput[]` STRUCTURED form (`{ name, label, placeholder, type, options? }[]`), NOT `string[]` array. Use the structured form matching sibling valuation entries.

```typescript
  {
    slug: 'solopreneur-safe-convertible-note-calculator',
    title: 'SAFE / Convertible Note Calculator',
    description: 'Model your SAFE (Simple Agreement for Future Equity) round. See how valuation cap and discount rate interact, what ownership % the SAFE investor gets at conversion, and how much existing shareholders are diluted. Covers YC post-money SAFE, pre-money SAFE with discount, and discount-only structures.',
    categoryId: 'C',
    applicationCategory: 'FinanceApplication',
    inputs: [
      { name: 'investmentAmount', label: 'Investment Amount ($)', placeholder: 'e.g. 500000', type: 'number' },
      { name: 'postMoneyCap', label: 'Post-Money Valuation Cap ($)', placeholder: 'e.g. 5000000', type: 'number' },
      { name: 'discountRate', label: 'Discount Rate (%)', placeholder: 'e.g. 0 or 20', type: 'number' },
      { name: 'existingShares', label: 'Existing Fully Diluted Shares', placeholder: 'e.g. 1000000', type: 'number' },
      { name: 'nextRoundValuation', label: 'Expected Next Round Valuation ($)', placeholder: 'e.g. 5000000', type: 'number' },
    ],
    keywords: [
      'SAFE calculator',
      'post-money SAFE calculator',
      'convertible note calculator',
      'YC SAFE calculator',
      'valuation cap',
      'SAFE conversion',
      'pre-money SAFE',
      'startup funding calculator',
    ],
    tags: ['finance', 'startup', 'fundraising', 'solopreneur', 'valuation'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-03',
    sources: ['https://www.ycombinator.com/documents', 'https://www.ycombinator.com/library/4Yh8aSbZJE2KQ3gZ2KQ3gZ2/safe-primer', 'https://www.fnv.com/blog/2014/03/03/safe-vs-convertible-note'],
  },
```

---

### Step 12: Add the OG sample to `src/data/og-samples.json`

Open `src/data/og-samples.json` and add a new entry for the safe-convertible calculator. Format matches existing entries (P4-1 added compound-interest, P4-2 added stripe-fee):

```json
  "solopreneur-safe-convertible-note-calculator": {
    "title": "SAFE / Convertible Note Calculator",
    "tagline": "Model cap, discount, and conversion for your SAFE round",
    "highlights": ["Post-money SAFE", "Cap vs discount", "Ownership % at conversion"]
  },
```

---

### Step 13: Bump engine count in test files

**`tests/ab-split.test.ts`:** Bump **34 → 35** in 2 places.

**`tests/internal-links.test.ts`:** Bump **34 → 35** in 2 places.

Use exact-match edit so other numbers don't get touched. Verify with `grep -nE "34|35" tests/ab-split.test.ts tests/internal-links.test.ts` to confirm the bumps landed in the right places.

---

### Step 14: Run the codegen drift check (must pass)

Run:

```bash
cd D:/E/独立站/youtube-tools && node scripts/codegen-examples.mjs --check
```

Expected: exit 0, no drift errors. If drift detected, re-run `node scripts/codegen-examples.mjs` (without `--check`) to regenerate, then re-run `--check`.

---

### Step 15: Run full unit test suite + customFn parse check + typecheck

Run in sequence:

```bash
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/safe-convertible.test.ts
```
Expected: 9/9 pass.

```bash
cd D:/E/独立站/youtube-tools && node tests/scripts/test-customFn.mjs safe-convertible-note-calculator
```
Expected: `safe-convertible-note-calculator: OK (XXXX chars)`.

```bash
cd D:/E/独立站/youtube-tools && pnpm test:unit
```
Expected: 9 new tests added on top of existing (no new failures from this change).

```bash
cd D:/E/独立站/youtube-tools && pnpm exec astro check
```
Expected: 0 type errors.

If any fail, fix the underlying code (do NOT modify tests to make them pass — tests are the contract).

---

### Step 16: Verify the page renders (build smoke test)

Run:

```bash
cd D:/E/独立站/youtube-tools && pnpm build
```

Expected: build succeeds (163 → 164 pages; new page at `/en/solopreneur-safe-convertible-note-calculator/` and `/zh/solopreneur-safe-convertible-note-calculator/`).

If build fails:
- Type error in engine file → check `inputs` field shape matches `ToolInput` type
- `customFn` runtime error → re-check parse with `test-customFn.mjs`
- Missing ToolMeta or OG sample → re-check Steps 11-12
- Page render error → check `[slug].astro` auto-discovery (no changes needed there)

---

### Step 17: Pre-flight check — live = static parity (P4-2 lesson)

Before committing, manually inspect `staticExamples[0]` and compare with what `customFn` would render. Specifically check:

1. **Ownership split section**: should show ~90% existing / ~10% SAFE for the default $500K / $5M / 1M shares input.
2. **Conversion price**: should be $4.50 (cap price, since discount = 0 means no discount).
3. **Cap governs label**: should appear (cap governs when discount = 0).
4. **Tip text**: should be the post-money SAFE tip (since discountRate = 0).

If any of these differ from the math helper's `calculateSafe()` output, the customFn has drift from the math helper. **Apply the fix to BOTH files** before committing.

---

### Step 18: Commit

Stage and commit:

```bash
cd D:/E/独立站/youtube-tools && git add src/engines/valuation/safe-convertible-note-calculator.ts src/engines/valuation/index.ts tests/safe-convertible.test.ts scripts/codegen-examples.mjs src/data/tools/valuation.ts src/data/og-samples.json tests/ab-split.test.ts tests/internal-links.test.ts
git commit -m "feat(p4-3): SAFE / convertible note calculator (cap + discount + 9-section v3 + 9 math tests)"
```

Expected: 1 commit, ~500 LoC added (300 engine + 100 tests + 25 wiring + 75 metadata).

---

### Step 19: Push to gitee + github

```bash
cd D:/E/独立站/youtube-tools && git fetch origin && git rev-list --left-right --count origin/master...master
```

Expected: `0	1` (1 local commit ahead of origin).

Push to gitee (primary mirror):

```bash
cd D:/E/独立站/youtube-tools && git push origin master
```

Push to github (secondary mirror, skip fetch hook):

```bash
cd D:/E/独立站/youtube-tools && SKIP_PUSH_FETCH=1 git push github master
```

Both should report success with the 1-commit delta.

---

## Self-Review (run before handoff)

**1. Spec coverage:** Each spec section → which plan step implements it?
- ✅ Input model (5 fields: investment, cap, discount, existing shares, next round) → Step 10 (engine.inputs)
- ✅ Cap price + safeSharesAtCap math → Step 1 (math helpers) + Step 3 (calculate) + Step 5 (customFn)
- ✅ Discount price → Step 1 + Step 3 + Step 5
- ✅ Conversion price (min of cap and discount) → Step 1 + Step 3 + Step 5
- ✅ SAFE ownership calculation → Step 1 + Step 3 + Step 5
- ✅ 9 output sections → Step 3 (calculate) + Step 5 (customFn mirror)
- ✅ Deal Snapshot → Step 3 section 2
- ✅ Conversion Mechanics → Step 3 section 3
- ✅ Deal Health (cap ratio + discount assessment) → Step 1 dealHealth + discountHealth + Step 3 section 4
- ✅ Ownership Outcomes (with pie chart) → Step 3 section 5
- ✅ Dilution Analysis → Step 3 section 6
- ✅ 5 what-if scenarios (double SAFE, lower cap, add discount, no cap, stack with prior) → Step 3 section 7
- ✅ 3 conditional tips (post-money standard, aggressive, heavy dilution, default) → Step 3 section 8
- ✅ 5 SEO comparison rows at $1M/$3M/$5M/$10M/$20M caps → Step 3 final loop
- ✅ Edge cases (cap<investment, zero inputs, negative inputs) → Step 3 early returns + input coercion
- ✅ Tests (9 cases — 5 cap/discount math + 1 edge + 2 health + 2 safeType) → Step 1 test file
- ✅ FAQ (5 entries — what is SAFE, pre-money vs post-money, cap+discount interaction, MFN, conversion triggers) → Step 10 engine.faq
- ✅ HowToUse (7 steps) → Step 10 engine.howToUse
- ✅ Category (valuation/, categoryId C) → Task 1 file path + Step 11 ToolMeta
- ✅ codegen registration → Step 8
- ✅ Index.ts wiring → Step 7
- ✅ ToolMeta entry with structured ToolInput[] → Step 11
- ✅ OG sample → Step 12
- ✅ Engine count bumps → Step 13
- ✅ customFn parse safety → Step 6 verification
- ✅ Pre-flight live = static parity check → Step 17
- ✅ Build smoke test → Step 16

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details" in plan. All code blocks are complete (Step 3 calculate() ~150 lines, Step 5 customFn ~6KB minified, Step 10 FAQ ~800 words, Step 11 ToolMeta entry complete).

**3. Type consistency:**
- `ToolEngine` interface used correctly (slug, title, description, inputs, clientConfig, generate, staticExamples, faq, howToUse) ✓
- Math helpers exported and used consistently in math + calculate + customFn ✓
- `inputs` field shapes match `ToolInput` (name, label, placeholder, type) ✓
- `customFn` reads `inputs.X` (string), coerces via `parseFloat` ✓
- `ToolMeta.inputs` uses structured ToolInput[] form (P4-2 lesson) ✓
- Output: `results[0]` is the big 9-section string; `results[1..]` are 5 comparison rows at $1M/$3M/$5M/$10M/$20M caps (matches existing pattern) ✓

**4. Risk areas:**
- Step 5 customFn is large (~6KB) — implementer must keep math helpers (sShares/cpFn/dpFn/cvpFn/ownFn/dhFn/dishFn/typeFn) defined at the start of the string and reuse them; ASI trap is the main risk
- Step 11 ToolMeta inputs MUST be structured ToolInput[] form (P4-2 lesson — plan was wrong, implementer must use correct form)
- Step 17 pre-flight check: live = static parity invariant (P4-2 lesson — apply fixes to BOTH files if any drift detected)
- Step 16 build verifies the page actually renders; this is the integration smoke test

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-03-p4-3-safe-convertible-note-plan.md`. Single [MECHANICAL] task. Recommended execution: **subagent-driven-development** — 1 implementer + 1 spec-compliance reviewer.

- Implementer: sonnet (mechanical, single self-contained file + 6 wiring files)
- Reviewer: spec-compliance only (verify each step matches plan, check customFn parses, codegen drift = 0, build = pass, engine count bumps in 2 test files, ToolMeta + OG sample added, **live = static parity**)
- Holistic pre-merge review: NOT needed (single self-contained file + 6 wiring files, no cross-file concerns, <8 files touched)
- Push: gitee primary + github with `SKIP_PUSH_FETCH=1`

After P4-3 ships, proceed to P4-4 (Burn Multiple / Rule of 40) following the same flow.
