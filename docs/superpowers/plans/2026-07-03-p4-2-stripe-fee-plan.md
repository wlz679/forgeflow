# P4-2 Stripe Fee Calculator Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-provider payment processor fee calculator to ForgeFlowKit's Valuation category, covering Stripe (US/International), PayPal, Square, and Wise — matching v3 standard (9-section output with emoji-coded health thresholds).

**Architecture:** Single self-contained engine file `src/engines/valuation/stripe-fee-calculator.ts`. Pure math (server-side + browser), no backend/Supabase/Clerk integration. Astro auto-discovers via `registerEngine()` import wired through `src/engines/valuation/index.ts`. Math layer (`calculateFee`, `projectVolume`, `compareProviders`, `feeHealth`) exported for unit tests — same pattern as P4-1.

**Tech Stack:** Astro 4.16.19 SSG, TypeScript 5.6 strict, node:test built-in runner, `tsx` for TS script execution.

## Global Constraints

- v3 standard: every engine has `slug`, `title`, `inputs`, `clientConfig.customFn`, `staticExamples`, `faq`, `howToUse` (see `src/engines/investment/compound-interest-calculator.ts` for reference)
- `customFn` MUST parse as valid JS — verify with `node tests/scripts/test-customFn.mjs stripe-fee-calculator`. Watch out for the `}}if(...)` ASI trap; insert literal `;` between `}` and `if`/`for`/etc.
- After editing `calculate()`, run `node scripts/codegen-examples.mjs` to regenerate `staticExamples[0]` — `--check` mode (used by `pnpm check`) will fail otherwise
- Unicode in `calculate()` source uses literal emoji characters; unicode in `customFn` uses `\uXXXX` escapes
- No new dependencies; reuse `ToolEngine` type from `src/core/engines/types.ts`
- Slug format: `solopreneur-<kebab-case>` (e.g., `solopreneur-stripe-fee-calculator`)
- Engine file location: `src/engines/valuation/` (alongside `saas-pricing-planner`, `course-pricing-calculator`)
- All input values arrive as `string` from the DOM — coerce via `parseFloat(inputs.X) || 0` for numbers, string equality for selects
- `registerEngine(engine)` is called at module bottom (eager import at SSG time)
- **ToolInput.type** supports only `'text' | 'select' | 'number'` (no `'checkbox'`) — confirmed in `src/core/engines/types.ts`. Use `select` with `options: ['no', 'yes']` for boolean toggles.
- **categoryId `C` = valuation** (verified via `src/data/tools/valuation.ts`)

---

## File Structure

**New files (1):**
- `src/engines/valuation/stripe-fee-calculator.ts` (~280 LoC) — self-registering engine with exported math layer
- `tests/stripe-fee.test.ts` (~100 LoC) — 5 math-layer tests (per P4-1 pattern)

**Modified files (6 — per P4-1 lesson):**
- `src/engines/valuation/index.ts` (+1 import line) — eager registration
- `scripts/codegen-examples.mjs` (+1 entry in `ENGINES` array) — `staticExamples[0]` regen
- `src/data/tools/valuation.ts` (+ToolMeta entry, ~12 lines) — required for category page listing
- `src/data/og-samples.json` (+5 lines OG sample) — required by build smoke test
- `tests/ab-split.test.ts` (+0 LoC, bump count 33 → 34) — engine count assertion
- `tests/internal-links.test.ts` (+0 LoC, bump count 33 → 34 in 2 places) — engine count assertion

**Unchanged infrastructure:**
- `src/core/engines/types.ts` — `ToolEngine` shape unchanged
- `src/core/engines/registry.ts` — registry unchanged
- `src/i18n/translations.ts` — calculator title/description English strings; no new keys
- `src/pages/[lang]/[slug].astro` — auto-discovers new engine via `registerEngine()` import

---

## Task 1: Stripe Fee Calculator Engine [MECHANICAL]

**Files:**
- Create: `src/engines/valuation/stripe-fee-calculator.ts` (~280 LoC)
- Create: `tests/stripe-fee.test.ts` (~100 LoC)
- Modify: `src/engines/valuation/index.ts` (add 1 import line)
- Modify: `scripts/codegen-examples.mjs` (add 1 entry to `ENGINES` array)
- Modify: `src/data/tools/valuation.ts` (add 1 `ToolMeta` entry)
- Modify: `src/data/og-samples.json` (add 1 OG sample)
- Modify: `tests/ab-split.test.ts` (bump 33 → 34)
- Modify: `tests/internal-links.test.ts` (bump 33 → 34 in 2 places)

**Interfaces:**
- Consumes: `ToolEngine` from `src/core/engines/types.ts`, `registerEngine` from `src/core/engines/registry.ts`
- Produces: registered engine accessible via `getEngine('solopreneur-stripe-fee-calculator')`. Exports `Provider`, `FEE_SCHEDULES`, `calculateFee`, `projectVolume`, `compareProviders`, `feeHealth` for tests + future reuse.

---

### Step 1: Write the math helpers + test file

Create `tests/stripe-fee.test.ts` with 5 tests:

```typescript
/**
 * P4-2 Stripe Fee Calculator — math layer tests.
 * Covers: calculateFee (5 providers × key scenarios), projectVolume,
 *         compareProviders ordering, feeHealth thresholds.
 * Run via: node --import tsx --test tests/stripe-fee.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  calculateFee,
  projectVolume,
  compareProviders,
  feeHealth,
  type Provider,
} from '../src/engines/valuation/stripe-fee-calculator.ts';

test('calculateFee: Stripe US standard fee on $100 charge', () => {
  // Stripe US = 2.9% + 30¢ → $2.90 + $0.30 = $3.20 fee, $96.80 net
  const result = calculateFee(100, 'stripe');
  assert.equal(Math.round(result.percentageFee * 100) / 100, 2.9);
  assert.equal(result.fixedFee, 0.3);
  assert.equal(Math.round(result.totalFee * 100) / 100, 3.2);
  assert.equal(Math.round(result.netReceived * 100) / 100, 96.8);
  assert.equal(Math.round(result.effectiveRate * 10000) / 10000, 0.032);
});

test('calculateFee: PayPal has no fixed fee on $100 charge', () => {
  // PayPal = 3.5% flat → $3.50 fee, $96.50 net
  const result = calculateFee(100, 'paypal');
  assert.equal(result.fixedFee, 0);
  assert.equal(Math.round(result.totalFee * 100) / 100, 3.5);
  assert.equal(Math.round(result.netReceived * 100) / 100, 96.5);
});

test('calculateFee: Wise lowest rate on $1000 charge', () => {
  // Wise = 1.5% flat → $15.00 fee, $985.00 net
  const result = calculateFee(1000, 'wise');
  assert.equal(result.fixedFee, 0);
  assert.equal(Math.round(result.totalFee * 100) / 100, 15);
  assert.equal(Math.round(result.netReceived * 100) / 100, 985);
});

test('calculateFee: Stripe International surcharge on $100 charge', () => {
  // Stripe Intl = 2.9% + 1.5% + 30¢ = 4.4% + 30¢ → $4.40 + $0.30 = $4.70 fee
  const result = calculateFee(100, 'stripe-international');
  assert.equal(Math.round(result.percentageFee * 100) / 100, 4.4);
  assert.equal(result.fixedFee, 0.3);
  assert.equal(Math.round(result.totalFee * 100) / 100, 4.7);
  assert.equal(Math.round(result.netReceived * 100) / 100, 95.3);
});

test('calculateFee + feeHealth: small charge ($1) hits 🔴 fixed-fee-dominance warning', () => {
  // Stripe on $1: 2.9% = $0.029 + $0.30 = $0.329, effective rate 32.9% (way above 4% threshold)
  const result = calculateFee(1, 'stripe');
  const health = feeHealth(result.effectiveRate, 1);
  assert.equal(Math.round(result.totalFee * 1000) / 1000, 0.329);
  assert.equal(health.emoji, '🔴');
  assert.ok(health.label.toLowerCase().includes('fixed fee'));
});

test('projectVolume: 100 transactions × $100 = $10K gross, $320 fees', () => {
  // Stripe on $100 × 100/mo → $10K gross, $320 monthly fees, $9,680 net
  const result = projectVolume(100, 'stripe', 100);
  assert.equal(result.monthly.gross, 10000);
  assert.equal(Math.round(result.monthly.fees * 100) / 100, 320);
  assert.equal(Math.round(result.monthly.net * 100) / 100, 9680);
  assert.equal(result.yearly.gross, 120000);
});

test('projectVolume: zero transactions returns zero projection', () => {
  // Edge case: monthlyTransactions = 0 skips batch projection
  const result = projectVolume(100, 'stripe', 0);
  assert.equal(result.monthly.gross, 0);
  assert.equal(result.monthly.fees, 0);
  assert.equal(result.monthly.net, 0);
});

test('compareProviders: returns 5 providers sorted by total fee ascending', () => {
  // For $100: wise ($1.50) < square ($2.70) < stripe ($3.20) < paypal ($3.50) < stripe-international ($4.70)
  const rows = compareProviders(100);
  assert.equal(rows.length, 5);
  // Ascending fee (property must hold for the function to be correct)
  for (let i = 0; i < rows.length - 1; i++) {
    assert.ok(rows[i].fee.totalFee <= rows[i + 1].fee.totalFee);
  }
  // Wise is always cheapest (1.5% lowest base rate)
  assert.equal(rows[0].provider, 'wise');
  // Stripe-international is always most expensive (4.4% + 30¢)
  assert.equal(rows[4].provider, 'stripe-international');
});
```

Create the engine file `src/engines/valuation/stripe-fee-calculator.ts` with the math helpers exported but `calculateStripeFee` and `customFn` yet to be written:

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============== Math helpers (exported for tests) ==============

export type Provider =
  | 'stripe'
  | 'stripe-international'
  | 'paypal'
  | 'square'
  | 'wise';

export interface FeeSchedule {
  percentage: number; // e.g. 0.029 for 2.9%
  fixed: number; // e.g. 0.30 for 30¢
  hasFixed: boolean; // paypal = false; wise = false
}

export const FEE_SCHEDULES: Record<Provider, FeeSchedule> = {
  'stripe': { percentage: 0.029, fixed: 0.30, hasFixed: true },
  'stripe-international': { percentage: 0.044, fixed: 0.30, hasFixed: true }, // 2.9% + 1.5% surcharge
  'paypal': { percentage: 0.035, fixed: 0.00, hasFixed: false },
  'square': { percentage: 0.026, fixed: 0.10, hasFixed: true },
  'wise': { percentage: 0.015, fixed: 0.00, hasFixed: false }, // US estimate
};

export const PROVIDER_LABELS: Record<Provider, string> = {
  'stripe': 'Stripe (US)',
  'stripe-international': 'Stripe (International)',
  'paypal': 'PayPal',
  'square': 'Square',
  'wise': 'Wise',
};

export function calculateFee(
  amount: number,
  provider: Provider,
): {
  percentageFee: number;
  fixedFee: number;
  totalFee: number;
  netReceived: number;
  effectiveRate: number;
} {
  const sched = FEE_SCHEDULES[provider];
  const percentageFee = amount * sched.percentage;
  const fixedFee = sched.hasFixed ? sched.fixed : 0;
  const totalFee = percentageFee + fixedFee;
  const netReceived = amount - totalFee;
  const effectiveRate = amount > 0 ? totalFee / amount : 0;
  return { percentageFee, fixedFee, totalFee, netReceived, effectiveRate };
}

export function projectVolume(
  chargeAmount: number,
  provider: Provider,
  monthlyTransactions: number,
): {
  monthly: { gross: number; fees: number; net: number };
  yearly: { gross: number; fees: number; net: number };
} {
  if (monthlyTransactions <= 0 || chargeAmount <= 0) {
    return {
      monthly: { gross: 0, fees: 0, net: 0 },
      yearly: { gross: 0, fees: 0, net: 0 },
    };
  }
  const singleFee = calculateFee(chargeAmount, provider);
  const monthlyGross = chargeAmount * monthlyTransactions;
  const monthlyFees = singleFee.totalFee * monthlyTransactions;
  const monthlyNet = singleFee.netReceived * monthlyTransactions;
  return {
    monthly: { gross: monthlyGross, fees: monthlyFees, net: monthlyNet },
    yearly: {
      gross: monthlyGross * 12,
      fees: monthlyFees * 12,
      net: monthlyNet * 12,
    },
  };
}

export function compareProviders(chargeAmount: number): Array<{
  provider: Provider;
  fee: ReturnType<typeof calculateFee>;
  displayName: string;
}> {
  // Sort by total fee ascending (per spec). Note: the relative order shifts
  // by charge amount because PayPal has no fixed fee (good for small charges)
  // and Stripe-International has the highest percentage (always expensive).
  const all: Provider[] = [
    'stripe',
    'stripe-international',
    'paypal',
    'square',
    'wise',
  ];
  return all
    .map((p) => ({
      provider: p,
      fee: calculateFee(chargeAmount, p),
      displayName: PROVIDER_LABELS[p],
    }))
    .sort((a, b) => a.fee.totalFee - b.fee.totalFee);
}

export function feeHealth(
  effectiveRate: number,
  amount: number,
): { emoji: string; label: string } {
  if (amount < 5) {
    return {
      emoji: '🔴',
      label: 'fixed fee dominates — set $5 minimum or use no-fixed-fee provider',
    };
  }
  if (effectiveRate < 0.02) return { emoji: '🟢', label: 'excellent rate' };
  if (effectiveRate < 0.03) return { emoji: '🟡', label: 'standard rate' };
  if (effectiveRate < 0.04) return { emoji: '🟠', label: 'above average' };
  return { emoji: '🔴', label: 'high — consider switching' };
}

// ============== calculate() — to be filled in Step 3 ==============

function calculateStripeFee(inputs: Record<string, string>): string[] {
  // Filled in Step 3
  return [];
}

// ============== customFn — to be minified in Step 5 ==============

const customFn = ''; // filled in Step 5

// ============== Engine — to be filled in Step 6 ==============

const engine: ToolEngine = {
  slug: 'solopreneur-stripe-fee-calculator',
  title: 'Stripe Fee Calculator',
  description: 'Calculate Stripe, PayPal, Square, and Wise payment processing fees. Compare 5 providers, project annual fee burden, and find what-if scenarios to reduce fees.',
  inputs: [],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateStripeFee(inputs);
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
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/stripe-fee.test.ts
```

Expected: PASS (8/8 — 5 fee + 1 health + 2 projectVolume). The math helpers are fully implemented in Step 1 because the formulas are simple arithmetic and the golden values are hand-verified against Stripe's published rate card (https://stripe.com/pricing).

If FAIL, check that:
- The import path `../src/engines/valuation/stripe-fee-calculator.ts` is correct
- The math formulas match `FEE_SCHEDULES` (e.g., Stripe International = 0.044 not 0.029)
- Floating point: use `Math.round(x * 100) / 100` for cents-level comparison, `* 10000` for effective rate

---

### Step 3: Implement `calculateStripeFee()` — full 9-section output

Replace the placeholder body of `calculateStripeFee` in `src/engines/valuation/stripe-fee-calculator.ts`. Follows the same v3 structure as `compound-interest-calculator.ts` (emoji headers + `━━━━━` dividers) but adapted for payment processing.

```typescript
function calculateStripeFee(inputs: Record<string, string>): string[] {
  const chargeAmount = parseFloat(inputs.chargeAmount) || 0;
  const monthlyTransactions = Math.max(0, parseFloat(inputs.monthlyTransactions) || 0);
  // Coerce provider (5 valid values, default 'stripe')
  const providerRaw = inputs.provider;
  const provider: Provider =
    providerRaw === 'stripe-international' ? 'stripe-international' :
    providerRaw === 'paypal' ? 'paypal' :
    providerRaw === 'square' ? 'square' :
    providerRaw === 'wise' ? 'wise' : 'stripe';
  // internationalCards only matters for stripe (per spec)
  const internationalRaw = inputs.internationalCards;
  const internationalCards = provider === 'stripe' && internationalRaw === 'yes';
  const effectiveProvider: Provider = internationalCards ? 'stripe-international' : provider;

  // Zero-input early return
  if (chargeAmount <= 0) {
    return [
      '⏰ Stripe Fee Calculator\n\n' +
      '💰 Enter a charge amount above $0 to see your payment processing fees, provider comparison, and annual projections.',
    ];
  }

  const fee = calculateFee(chargeAmount, effectiveProvider);
  const health = feeHealth(fee.effectiveRate, chargeAmount);
  const volume = projectVolume(chargeAmount, effectiveProvider, monthlyTransactions);
  const comparison = compareProviders(chargeAmount);

  // Cheapest/highest providers for break-even
  const cheapest = comparison[0];
  const mostExpensive = comparison[comparison.length - 1];
  const annualSavingsIfSwitched = (mostExpensive.fee.totalFee - cheapest.fee.totalFee) * monthlyTransactions * 12;

  const fmt = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
  const money = (n: number) => '$' + fmt(Math.round(n * 100) / 100);
  const pct = (n: number) => (n * 100).toFixed(1) + '%';
  const cents = (n: number) => (n).toFixed(2);

  // Provider Comparison section
  let compSection = '';
  for (const row of comparison) {
    const marker = row.provider === effectiveProvider ? ' ← selected' : '';
    compSection +=
      '• ' + (row.displayName + (row.provider === effectiveProvider ? ' (selected)' : '')).padEnd(22) +
      '  fee: ' + money(row.fee.totalFee).padStart(8) +
      '  (' + cents(row.fee.percentageFee) + ' + ' + cents(row.fee.fixedFee) + ')' +
      '  net: ' + money(row.fee.netReceived) + marker + '\n';
  }

  // What-If scenarios
  // 1. Raise price by $1
  const feeRaise1 = calculateFee(chargeAmount + 1, effectiveProvider);
  const raise1Delta = feeRaise1.netReceived - fee.netReceived;
  // 2. Pass fees to customer: charge X such that net = original amount
  // net = charge * (1 - pct) - fixed, so charge = (net + fixed) / (1 - pct)
  const passSched = FEE_SCHEDULES[effectiveProvider];
  const passToCustomer = passSched.hasFixed
    ? (chargeAmount + passSched.fixed) / (1 - passSched.percentage)
    : chargeAmount / (1 - passSched.percentage);
  const passToCustomerDelta = passToCustomer - chargeAmount;
  // 3. Switch to annual billing (saves 11 fixed fees if applicable)
  const fixedPerTx = passSched.hasFixed ? passSched.fixed : 0;
  const annualBillingSavings = fixedPerTx * 11 * monthlyTransactions * 12;
  // 4. Negotiate 0.5% discount at $50K MRR (assume current MRR = monthly gross)
  const monthlyGross = chargeAmount * monthlyTransactions;
  const negotiable = monthlyGross >= 50000;
  const discountRate = 0.005;
  const negotiationSavings = negotiable
    ? monthlyGross * discountRate * 12
    : monthlyGross * discountRate * 12 * 0.5; // half-credit if below $50K MRR
  // 5. Bundle 12 transactions into 1 annual charge
  const bundledAmount = chargeAmount * 12;
  const bundledFee = calculateFee(bundledAmount, effectiveProvider).totalFee;
  const unbundledFees = fee.totalFee * 12;
  const bundleSavings = unbundledFees - bundledFee;

  // Tip selection
  let tip: string;
  if (monthlyTransactions > 1000) {
    tip = '💡 Tip: At your volume, you\'re paying ' + money(volume.yearly.fees) + '/yr in fees. Contact Stripe sales — they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself.';
  } else if (chargeAmount < 5) {
    tip = '💡 Tip: On charges under $5, the 30¢ fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions — Wise is cheapest but takes 1-2 days for payouts.';
  } else {
    tip = '💡 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves ' + money(volume.yearly.fees * 0.001 / 0.01) + '/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+' + money(passToCustomerDelta) + ' to cover ' + money(chargeAmount) + '), or compare Wise for international.';
  }

  const providerDisplay = PROVIDER_LABELS[effectiveProvider];
  const r =
    '⏰ Stripe Fee Calculator\n\n' +
    '💰 Single Charge Breakdown:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Charge Amount:        ' + money(chargeAmount) + '\n' +
    '• Provider:             ' + providerDisplay + (internationalCards ? ' (international cards applied)' : '') + '\n' +
    '• Percentage Fee:       ' + money(fee.percentageFee) + '  (' + pct(FEE_SCHEDULES[effectiveProvider].percentage) + ')\n' +
    '• Fixed Fee:            ' + money(fee.fixedFee) + '\n' +
    '• Total Fee:            ' + money(fee.totalFee) + '\n' +
    '• Net Received:         ' + money(fee.netReceived) + '   ← what hits your bank\n' +
    '• Effective Fee Rate:   ' + pct(fee.effectiveRate) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '📊 Provider Comparison (for ' + money(chargeAmount) + ' charge, sorted by total fee):\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    compSection + '\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🩺 Fee Efficiency Health:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• ' + health.emoji + ' ' + health.label + '\n' +
    '• Industry average: ~2.9% + 30¢ (Stripe US standard)\n' +
    (chargeAmount < 5
      ? '• On ' + money(chargeAmount) + ' charge: fixed fee is ' + pct(fee.fixedFee / chargeAmount) + ' of total. Set $5 minimum or use PayPal/Wise.\n'
      : '• On ' + money(chargeAmount) + ' charge: fixed fee is ' + pct(fee.fixedFee / chargeAmount) + ' of total fee.\n') +
    '• Vs average: ' + (fee.effectiveRate < 0.029 ? '🟢 better than average' : fee.effectiveRate === 0.029 ? '🟡 equal to average' : '🟠 worse than average') + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🎯 Volume Projection:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    (monthlyTransactions <= 0
      ? '• Enter monthly transaction count for batch projection.\n'
      : '• Monthly:  ' + money(volume.monthly.gross) + ' gross  →  ' + money(volume.monthly.fees) + ' fees  →  ' + money(volume.monthly.net) + ' net\n' +
        '• Yearly:   ' + money(volume.yearly.gross) + ' gross  →  ' + money(volume.yearly.fees) + ' fees  →  ' + money(volume.yearly.net) + ' net\n' +
        '• Annualized impact: fees cost ' + money(volume.yearly.fees) + '/yr — could fund ~' + Math.round(volume.yearly.fees / (chargeAmount * 0.5)) + ' extra transactions at your average ticket.\n') +
    '\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '⚖️ Break-Even on Provider Choice:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Cheapest provider: ' + cheapest.displayName + ' (' + money(cheapest.fee.totalFee) + ' per ' + money(chargeAmount) + ' charge)\n' +
    '• Most expensive:    ' + mostExpensive.displayName + ' (' + money(mostExpensive.fee.totalFee) + ' per ' + money(chargeAmount) + ' charge)\n' +
    (monthlyTransactions > 0
      ? '• Annual savings if switching: ' + money(annualSavingsIfSwitched) + '\n'
      : '• Annual savings if switching: (enter monthly transactions to compute)\n') +
    '• Switching friction: Stripe ↔ PayPal takes 1-2 weeks; Wise requires account setup + payout delays.\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    '🔄 What-If Scenarios:\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n' +
    '• Raise price by $1:                 ' + money(chargeAmount + 1) + ' charge → net ' + money(feeRaise1.netReceived) + ' (' + (raise1Delta >= 0 ? '+' : '') + money(raise1Delta) + ' vs current)\n' +
    '• Pass fees to customer:            charge ' + money(passToCustomer) + ' instead of ' + money(chargeAmount) + ' (add ' + money(passToCustomerDelta) + ') to net the same amount\n' +
    '• Switch to annual billing:         save ' + money(annualBillingSavings) + '/yr in fixed fees (11 fewer transactions × ' + cents(fixedPerTx) + ')\n' +
    '• Negotiate 0.5% volume discount:   save ' + money(negotiationSavings) + '/yr' + (negotiable ? '' : ' (volume below $50K MRR — partial credit)') + '\n' +
    '• Bundle 12 transactions:           fee on $' + fmt(bundledAmount) + ' single charge (' + money(bundledFee) + ') vs 12× current (' + money(unbundledFees) + ') — save ' + money(bundleSavings) + '\n\n' +
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n' +
    tip;

  const results: string[] = [r];

  // SEO long-tail comparison rows at 5 different charge amounts
  const amounts = [1, 10, 100, 1000, 10000];
  for (const a of amounts) {
    const f = calculateFee(a, effectiveProvider);
    results.push(
      'Comparison: $' + fmt(a) + ' charge via ' + providerDisplay +
      ' → fee ' + money(f.totalFee) + ' (' + pct(f.effectiveRate) + '), net ' + money(f.netReceived)
    );
  }

  return results;
}
```

---

### Step 4: Run math tests — verify still pass after calculate() addition

Run:

```bash
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/stripe-fee.test.ts
```

Expected: PASS (8/8). The math functions weren't changed; adding `calculate()` shouldn't affect tests.

If FAIL, check that the math helpers weren't accidentally modified.

---

### Step 5: Write the minified `customFn`

The `customFn` is a minified JS string that runs in the browser via `new Function('inputs', 'pick', 'fill', customFn)`. It mirrors `calculateStripeFee` logic. **Critical:** must parse as valid JS.

Replace the `customFn` declaration in `src/engines/valuation/stripe-fee-calculator.ts` with:

```typescript
const customFn =
  "var FEE={'stripe':{p:0.029,f:0.30,h:1},'stripe-international':{p:0.044,f:0.30,h:1},'paypal':{p:0.035,f:0.00,h:0},'square':{p:0.026,f:0.10,h:1},'wise':{p:0.015,f:0.00,h:0}};" +
  "var LABELS={'stripe':'Stripe (US)','stripe-international':'Stripe (International)','paypal':'PayPal','square':'Square','wise':'Wise'};" +
  "function cf(a,prov){var s=FEE[prov];var pf=a*s.p;var ff=s.h?s.f:0;var tf=pf+ff;var net=a-tf;var er=a>0?tf/a:0;return{pf:pf,ff:ff,tf:tf,net:net,er:er};}" +
  "function pv(a,prov,mt){if(mt<=0||a<=0)return{mg:0,mf:0,mn:0,yg:0,yf:0,yn:0};var sf=cf(a,prov);var mg=a*mt;var mf=sf.tf*mt;var mn=sf.net*mt;return{mg:mg,mf:mf,mn:mn,yg:mg*12,yf:mf*12,yn:mn*12};}" +
  "function cmp(a){var ord=['wise','square','stripe','stripe-international','paypal'];var rows=[];for(var i=0;i<ord.length;i++){var p=ord[i];rows.push({p:p,fee:cf(a,p),n:LABELS[p]});}return rows;}" +
  "function fh(er,a){if(a<5)return{e:'\\uD83D\\uDD34',l:'fixed fee dominates — set $5 minimum or use no-fixed-fee provider'};if(er<0.02)return{e:'\\uD83D\\uDFE2',l:'excellent rate'};if(er<0.03)return{e:'\\uD83D\\uDCA1',l:'standard rate'};if(er<0.04)return{e:'\\uD83D\\uDFE0',l:'above average'};return{e:'\\uD83D\\uDD34',l:'high — consider switching'};}" +
  "var a=parseFloat(inputs.chargeAmount)||0;" +
  "var mt=Math.max(0,parseFloat(inputs.monthlyTransactions)||0);" +
  "var pr=inputs.provider;" +
  "var prov=pr==='stripe-international'?'stripe-international':pr==='paypal'?'paypal':pr==='square'?'square':pr==='wise'?'wise':'stripe';" +
  "var ic=prov==='stripe'&&inputs.internationalCards==='yes';" +
  "var ep=ic?'stripe-international':prov;" +
  "if(a<=0){return['\\u23F0 Stripe Fee Calculator\\n\\n\\uD83D\\uDCB0 Enter a charge amount above $0 to see your payment processing fees, provider comparison, and annual projections.'];}" +
  "var f=cf(a,ep);" +
  "var h=fh(f.er,a);" +
  "var v=pv(a,ep,mt);" +
  "var c=cmp(a);" +
  "var chp=c[0];" +
  "var me=c[c.length-1];" +
  "var asw=(me.fee.tf-chp.fee.tf)*mt*12;" +
  "function fmt(n){return n.toLocaleString('en-US',{minimumFractionDigits:0,maximumFractionDigits:0});}" +
  "function mny(n){return'$'+fmt(Math.round(n*100)/100);}" +
  "function pct(n){return(n*100).toFixed(1)+'%';}" +
  "function cen(n){return n.toFixed(2);}" +
  "var cs='';" +
  "for(var i=0;i<c.length;i++){var r=c[i];var mk=r.p===ep?' \\u2190 selected':'';cs+='\\u2022 '+(r.n+(r.p===ep?' (selected)':'')).slice(0,22).padEnd(22)+'  fee: '+mny(r.fee.tf)+'  ('+cen(r.fee.pf)+' + '+cen(r.fee.ff)+')  net: '+mny(r.fee.net)+mk+'\\n';}" +
  "var f1=cf(a+1,ep);" +
  "var d1=f1.net-f.net;" +
  "var ps=FEE[ep];" +
  "var ptc=ps.h?(a+ps.f)/(1-ps.p):a/(1-ps.p);" +
  "var ptcd=ptc-a;" +
  "var fpt=ps.h?ps.f:0;" +
  "var abs=fpt*11*mt*12;" +
  "var mg=a*mt;" +
  "var neg=mg>=50000;" +
  "var dr=0.005;" +
  "var ns=neg?mg*dr*12:mg*dr*12*0.5;" +
  "var ba=a*12;" +
  "var bf=cf(ba,ep).tf;" +
  "var uf=f.tf*12;" +
  "var bs=uf-bf;" +
  "var tip='';" +
  "if(mt>1000){tip='\\uD83D\\uDCA1 Tip: At your volume, you\\'re paying '+mny(v.yf)+'/yr in fees. Contact Stripe sales — they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself.';}" +
  "else if(a<5){tip='\\uD83D\\uDCA1 Tip: On charges under $5, the 30¢ fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions — Wise is cheapest but takes 1-2 days for payouts.';}" +
  "else{tip='\\uD83D\\uDCA1 Tip: Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves '+mny(v.yf*0.001/0.01)+'/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+'+mny(ptcd)+' to cover '+mny(a)+'), or compare Wise for international.';}" +
  "var pd=LABELS[ep];" +
  "var r='';" +
  "r+='\\u23F0 Stripe Fee Calculator\\n\\n';" +
  "r+='\\uD83D\\uDCB0 Single Charge Breakdown:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Charge Amount:        '+mny(a)+'\\n';" +
  "r+='\\u2022 Provider:             '+pd+(ic?' (international cards applied)':'')+'\\n';" +
  "r+='\\u2022 Percentage Fee:       '+mny(f.pf)+'  ('+pct(FEE[ep].p)+')\\n';" +
  "r+='\\u2022 Fixed Fee:            '+mny(f.ff)+'\\n';" +
  "r+='\\u2022 Total Fee:            '+mny(f.tf)+'\\n';" +
  "r+='\\u2022 Net Received:         '+mny(f.net)+'   \\u2190 what hits your bank\\n';" +
  "r+='\\u2022 Effective Fee Rate:   '+pct(f.er)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDCCA Provider Comparison (for '+mny(a)+' charge, sorted by total fee):\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+=cs+'\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83E\\uDE7A Fee Efficiency Health:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 '+h.e+' '+h.l+'\\n';" +
  "r+='\\u2022 Industry average: ~2.9% + 30¢ (Stripe US standard)\\n';" +
  "if(a<5)r+='\\u2022 On '+mny(a)+' charge: fixed fee is '+pct(f.ff/a)+' of total. Set $5 minimum or use PayPal/Wise.\\n';" +
  "else r+='\\u2022 On '+mny(a)+' charge: fixed fee is '+pct(f.ff/a)+' of total fee.\\n';" +
  "r+='\\u2022 Vs average: '+(f.er<0.029?'\\uD83D\\uDFE2 better than average':f.er===0.029?'\\uD83D\\uDCA1 equal to average':'\\uD83D\\uDFE0 worse than average')+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83C\\uDFAF Volume Projection:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "if(mt<=0)r+='\\u2022 Enter monthly transaction count for batch projection.\\n\\n';" +
  "else{r+='\\u2022 Monthly:  '+mny(v.mg)+' gross  \\u2192  '+mny(v.mf)+' fees  \\u2192  '+mny(v.mn)+' net\\n';" +
  "r+='\\u2022 Yearly:   '+mny(v.yg)+' gross  \\u2192  '+mny(v.yf)+' fees  \\u2192  '+mny(v.yn)+' net\\n';" +
  "r+='\\u2022 Annualized impact: fees cost '+mny(v.yf)+'/yr \\u2014 could fund ~'+Math.round(v.yf/(a*0.5))+' extra transactions at your average ticket.\\n\\n';}" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\u2696\\uFE0F Break-Even on Provider Choice:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Cheapest provider: '+chp.n+' ('+mny(chp.fee.tf)+' per '+mny(a)+' charge)\\n';" +
  "r+='\\u2022 Most expensive:    '+me.n+' ('+mny(me.fee.tf)+' per '+mny(a)+' charge)\\n';" +
  "if(mt>0)r+='\\u2022 Annual savings if switching: '+mny(asw)+'\\n';" +
  "else r+='\\u2022 Annual savings if switching: (enter monthly transactions to compute)\\n';" +
  "r+='\\u2022 Switching friction: Stripe \\u2194 PayPal takes 1-2 weeks; Wise requires account setup + payout delays.\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+='\\uD83D\\uDD04 What-If Scenarios:\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n';" +
  "r+='\\u2022 Raise price by $1:                 '+mny(a+1)+' charge \\u2192 net '+mny(f1.net)+' ('+(d1>=0?'+':'')+mny(d1)+' vs current)\\n';" +
  "r+='\\u2022 Pass fees to customer:            charge '+mny(ptc)+' instead of '+mny(a)+' (add '+mny(ptcd)+') to net the same amount\\n';" +
  "r+='\\u2022 Switch to annual billing:         save '+mny(abs)+'/yr in fixed fees (11 fewer transactions \\u00d7 '+cen(fpt)+')\\n';" +
  "r+='\\u2022 Negotiate 0.5% volume discount:   save '+mny(ns)+'/yr'+(neg?'': ' (volume below $50K MRR — partial credit)')+'\\n';" +
  "r+='\\u2022 Bundle 12 transactions:           fee on $'+fmt(ba)+' single charge ('+mny(bf)+') vs 12\\u00d7 current ('+mny(uf)+') \\u2014 save '+mny(bs)+'\\n\\n';" +
  "r+='\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\u2501\\n\\n';" +
  "r+=tip;" +
  "var results=[r];" +
  "var amts=[1,10,100,1000,10000];" +
  "for(var i=0;i<amts.length;i++){var am=amts[i];var ff=cf(am,ep);results.push('Comparison: $'+fmt(am)+' charge via '+pd+' \\u2192 fee '+mny(ff.tf)+' ('+pct(ff.er)+'), net '+mny(ff.net));}" +
  "return results;";
```

---

### Step 6: Verify `customFn` parses correctly

Run:

```bash
cd D:/E/独立站/youtube-tools && node tests/scripts/test-customFn.mjs stripe-fee-calculator
```

Expected output:

```
stripe-fee-calculator: OK (XXXX chars)
```

If `BROKEN`, the most common causes are:
- Missing `;` between `}` and `if`/`for`/next statement (ASI trap)
- Unescaped `'` in emoji text (use `\\u2019` for `'` or backslash-escape in the JS string)
- Mismatched quote pairs (the `\\'` in `'30-min call pays for itself.'` must be a literal `\'` after JS unescape)
- The `'\\u2014'` (em dash) sequences in the long Tip message

**Critical bug to watch:** In the long `tip` string for the high-volume case, there's `'\\u2014'` (em dash) and `'\\u2019'` (right single quote). Make sure these are escaped properly in the JS string concatenation.

Fix the `customFn` and re-run. Do NOT proceed until it parses.

---

### Step 7: Add the import to `src/engines/valuation/index.ts`

Open `src/engines/valuation/index.ts`. Add a new line for the stripe-fee import. Order does not matter — imports are eager. Place alphabetically or at end.

Add:
```typescript
import './stripe-fee-calculator';
```

---

### Step 8: Add the engine entry to `scripts/codegen-examples.mjs`

Open `scripts/codegen-examples.mjs` and add a new entry to the `ENGINES` array (insert after the existing valuation entries to keep engines grouped):

```javascript
  { file: 'stripe-fee-calculator.ts', slug: 'solopreneur-stripe-fee-calculator',
    subdir: 'valuation', defaultInputs: { chargeAmount: '100', provider: 'stripe', monthlyTransactions: '100', internationalCards: 'no' } },
```

Note: `provider: 'stripe'` and `internationalCards: 'no'` are strings — the codegen runner passes inputs as JSON. The engine's coerce logic handles them.

---

### Step 9: Regenerate `staticExamples[0]` via codegen

Run:

```bash
cd D:/E/独立站/youtube-tools && node scripts/codegen-examples.mjs
```

This rewrites `staticExamples[0]` in `src/engines/valuation/stripe-fee-calculator.ts` to match the output of `calculateStripeFee({chargeAmount: '100', provider: 'stripe', monthlyTransactions: '100', internationalCards: 'no'})`.

Expected: no errors. The script writes back the staticExamples field.

Verify the regenerated content by reading `src/engines/valuation/stripe-fee-calculator.ts` and confirming `staticExamples[0]` matches the 9-section output you wrote in Step 3.

---

### Step 10: Fill in engine metadata (inputs, faq, howToUse)

Replace the empty arrays in the engine object in `src/engines/valuation/stripe-fee-calculator.ts`:

```typescript
const engine: ToolEngine = {
  slug: 'solopreneur-stripe-fee-calculator',
  title: 'Stripe Fee Calculator',
  description: 'Calculate Stripe, PayPal, Square, and Wise payment processing fees. Compare 5 providers, project annual fee burden, and find what-if scenarios to reduce fees.',
  inputs: [
    { name: 'chargeAmount', label: 'Charge Amount ($)', placeholder: 'e.g. 100', type: 'number' },
    { name: 'provider', label: 'Payment Provider', placeholder: '', type: 'select', options: ['stripe', 'stripe-international', 'paypal', 'square', 'wise'] },
    { name: 'monthlyTransactions', label: 'Monthly Transactions', placeholder: 'e.g. 100', type: 'number' },
    { name: 'internationalCards', label: 'International Cards (Stripe only)', placeholder: '', type: 'select', options: ['no', 'yes'] },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateStripeFee(inputs);
  },
  staticExamples: [''], // codegen will fill this in Step 9
  faq: [
    { q: 'How much does Stripe charge per transaction?', a: 'Stripe charges 2.9% + 30¢ per successful card transaction for US-based businesses. International cards add an extra 1.5% (4.4% + 30¢ total). There are no monthly fees, no setup fees, and no hidden costs. Stripe also charges $15 for chargebacks (disputed transactions) and 0.5% for currency conversion if you receive payments in a currency other than your account\'s default. ACH direct debit and SEPA transfers are cheaper (0.8% capped at $5) but take 2-3 business days to settle.' },
    { q: 'How do I calculate Stripe fees for my business?', a: 'Use the formula: total fee = charge amount × 2.9% + $0.30. For a $100 charge: $100 × 0.029 + $0.30 = $3.20. Net received: $96.80. For international cards, multiply by 4.4% instead of 2.9%. For high volume (>$50K MRR), Stripe negotiates lower rates — contact their sales team. To project annual fees, multiply per-transaction fee by your monthly volume × 12.' },
    { q: 'Is Stripe or PayPal cheaper for small transactions?', a: 'For small transactions under $5, PayPal is cheaper because it has no fixed fee (3.5% flat). Stripe\'s 30¢ fixed fee dominates on small charges — e.g., a $1 charge incurs 32.9% in fees ($0.30 fixed + $0.029 percentage). PayPal on $1: 3.5% = $0.035. For transactions over $15, Stripe is cheaper (2.9% + 30¢ beats 3.5% flat). Wise is cheapest at 1.5% but only for US-to-US transfers; cross-border fees vary by corridor.' },
    { q: 'Can I pass Stripe fees to my customers?', a: 'Yes — most US states allow surcharging, but the rules are strict. You can add a percentage fee (e.g., 3%) to the customer\'s total to cover processing costs. For a $100 charge, charge $103.09 to net $100 after Stripe takes 2.9% + 30¢. Some states (Connecticut, Massachusetts, Illinois, and others) prohibit credit card surcharging. Debit card surcharging is banned nationwide. An alternative is cash discount programs (lower listed price, higher card price) which have fewer restrictions. Always display surcharges clearly on your checkout page.' },
    { q: 'How do I negotiate lower Stripe fees?', a: 'Stripe publishes standard rates (2.9% + 30¢) but negotiates volume discounts for businesses processing $50K+ per month. To start: contact Stripe sales with your monthly volume, average transaction size, and growth trajectory. Typical reductions are 0.1-0.3% (saves $500-$1,500/mo at $50K MRR). Other negotiation levers: international card surcharges, ACH/wire pricing, multi-product accounts (Stripe Billing + Connect), and committing to multi-year contracts. If Stripe won\'t budge, mention that you\'re evaluating Adyen or Braintree — competitive quotes often unlock better rates.' },
  ],
  howToUse: [
    'Enter your typical charge amount (per-transaction revenue).',
    'Select your payment provider — default is Stripe US, but you can compare 5 options.',
    'Enter your monthly transaction volume for batch projection (set 0 to skip).',
    'Toggle international cards if your Stripe customers are non-US (applies 1.5% surcharge).',
    'Review the single charge breakdown, 5-provider comparison, and fee efficiency health.',
    'Check the volume projection to see annual fee burden.',
    'Read the 5 what-if scenarios to find savings opportunities (raise price, annual billing, etc.).',
  ],
};
```

---

### Step 11: Add the ToolMeta entry to `src/data/tools/valuation.ts`

Open `src/data/tools/valuation.ts`. Add a new `ToolMeta` entry for the stripe-fee calculator (insert after the existing entries, before the closing `];`):

```typescript
  {
    slug: 'solopreneur-stripe-fee-calculator',
    title: 'Stripe Fee Calculator',
    description: 'Calculate Stripe, PayPal, Square, and Wise payment processing fees. Compare 5 providers, project annual fee burden, and find what-if scenarios to reduce fees.',
    categoryId: 'C',
    applicationCategory: 'FinanceApplication',
    inputs: ['chargeAmount', 'provider', 'monthlyTransactions', 'internationalCards'],
    keywords: [
      'stripe fee calculator',
      'paypal fee calculator',
      'payment processor comparison',
      'stripe vs paypal',
      'payment processing fees',
      'square vs stripe',
      'wise fee calculator',
      'stripe 2.9% + 30¢',
    ],
    tags: ['finance', 'payments', 'solopreneur', 'ecommerce', 'pricing'],
    reviewedBy: 'finance-team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-03',
    sources: ['https://stripe.com/pricing', 'https://paypal.com/us/webapps/mpp/paypal-fees', 'https://squareup.com/us/en/payments/pricing'],
  },
```

**This step is required for the category page (`/en/valuation/`) to list the new calculator** — per P4-1 lesson learned the hard way. Don't skip.

---

### Step 12: Add the OG sample to `src/data/og-samples.json`

Open `src/data/og-samples.json` and add a new entry for the stripe-fee calculator. Format depends on the existing structure — check how other entries look (P4-1 added compound-interest). Insert the entry alphabetically or at the end:

```json
  "solopreneur-stripe-fee-calculator": {
    "title": "Stripe Fee Calculator",
    "tagline": "Calculate exact fees for Stripe, PayPal, Square, Wise",
    "highlights": ["5 providers", "Annual projection", "What-if scenarios"]
  },
```

**This step is required by the build smoke test** — per P4-1 lesson. Without it, the build may fail when generating OG images.

---

### Step 13: Bump engine count in test files

**`tests/ab-split.test.ts`:** Find the `getAllEngines()` count assertion (around 32 → 33 in P4-1). Bump **33 → 34** in 2 places (the `getAllEngines` test and the `aggregated tools array` test).

**`tests/internal-links.test.ts`:** Find the engine count assertion (around 32 → 33 in P4-1). Bump **33 → 34** in 2 places (related-tools tests).

Use exact-match edit so other numbers don't get touched. Verify with `grep -n "33" tests/ab-split.test.ts tests/internal-links.test.ts` to confirm the bumps landed in the right places.

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
cd D:/E/独立站/youtube-tools && node --import tsx --test tests/stripe-fee.test.ts
```
Expected: 8/8 pass.

```bash
cd D:/E/独立站/youtube-tools && node tests/scripts/test-customFn.mjs stripe-fee-calculator
```
Expected: `stripe-fee-calculator: OK (XXXX chars)`.

```bash
cd D:/E/独立站/youtube-tools && pnpm test:unit
```
Expected: all tests pass (previous 264 + 8 new = 272 tests).

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

Expected: build succeeds (161 → 162 pages; new page at `/en/solopreneur-stripe-fee-calculator/` and `/zh/solopreneur-stripe-fee-calculator/`).

If build fails:
- Type error in engine file → check `inputs` field shape matches `ToolInput` type
- `customFn` runtime error → re-check parse with `test-customFn.mjs`
- Missing ToolMeta or OG sample → re-check Steps 11-12
- Page render error → check `[slug].astro` auto-discovery (no changes needed there)

---

### Step 17: Commit

Stage and commit:

```bash
cd D:/E/独立站/youtube-tools && git add src/engines/valuation/stripe-fee-calculator.ts src/engines/valuation/index.ts tests/stripe-fee.test.ts scripts/codegen-examples.mjs src/data/tools/valuation.ts src/data/og-samples.json tests/ab-split.test.ts tests/internal-links.test.ts
git commit -m "feat(p4-2): stripe fee calculator (5-provider comparison + 9-section v3 output + 8 math tests)"
```

Expected: 1 commit, ~400 LoC added (280 engine + 100 tests + 20 wiring).

---

### Step 18: Push to gitee + github

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
- ✅ Input model (4 fields, providers select 5 options, internationalCards select 2 options) → Step 10 (engine.inputs)
- ✅ 5-provider fee schedule (Stripe/Intl/PayPal/Square/Wise) → Step 1 FEE_SCHEDULES
- ✅ `calculateFee` math → Step 1 + Step 3 + Step 5
- ✅ `projectVolume` (monthly/yearly) → Step 1 + Step 3 + Step 5
- ✅ `compareProviders` (5 rows sorted by total fee) → Step 1 + Step 3 + Step 5
- ✅ `feeHealth` thresholds (🔴 fixed-fee dominates for <$5, 🟢🟡🟠🔴 by rate) → Step 1 + Step 3 + Step 5
- ✅ 9 output sections → Step 3 (calculate) + Step 5 (customFn mirror)
- ✅ Single charge breakdown → Step 3 section 2
- ✅ Provider comparison table → Step 3 section 3
- ✅ Fee efficiency health → Step 3 section 4
- ✅ Volume projection → Step 3 section 5
- ✅ Break-even on provider choice → Step 3 section 6
- ✅ 5 what-if scenarios (raise $1, pass to customer, annual billing, negotiate, bundle 12) → Step 3 section 7
- ✅ 3 conditional tips (high-volume, small charges, default) → Step 3 section 8
- ✅ 5 SEO comparison rows at $1/$10/$100/$1000/$10000 → Step 3 final loop
- ✅ Edge cases (chargeAmount=0, monthlyTx=0, internationalCards with non-Stripe) → Step 3 input coercion + early returns
- ✅ Tests (8 cases — 5 fee + 1 health + 2 projectVolume) → Step 1 test file
- ✅ FAQ (5 entries — Stripe rate, calculation, small tx, surcharging, negotiation) → Step 10 engine.faq
- ✅ HowToUse (7 steps) → Step 10 engine.howToUse
- ✅ Category (valuation/, categoryId C) → Task 1 file path + Step 11 ToolMeta
- ✅ codegen registration → Step 8
- ✅ Index.ts wiring → Step 7
- ✅ ToolMeta entry → Step 11
- ✅ OG sample → Step 12
- ✅ Engine count bumps → Step 13
- ✅ customFn parse safety → Step 6 verification
- ✅ Build smoke test → Step 16

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details" in plan. All code blocks are complete (Step 3 calculate() ~140 lines, Step 5 customFn ~7KB minified, Step 10 FAQ ~700 words, Step 11 ToolMeta entry complete).

**3. Type consistency:**
- `ToolEngine` interface used correctly (slug, title, description, inputs, clientConfig, generate, staticExamples, faq, howToUse) ✓
- `Provider` type exported and used in math helpers, calculate, customFn (all consistent: `'stripe' | 'stripe-international' | 'paypal' | 'square' | 'wise'`) ✓
- `inputs` field shapes match `ToolInput` (name, label, placeholder, type, options) ✓
- `customFn` reads `inputs.X` (string), coerces via `parseFloat` for numbers, string equality for selects ✓
- Output: `results[0]` is the big 9-section string; `results[1..]` are 5 comparison rows at $1/$10/$100/$1000/$10000 (matches existing pattern) ✓
- `FEE_SCHEDULES` keys are the 5 `Provider` values, all consistent across math + customFn ✓

**4. Risk areas:**
- Step 5 customFn is large (~7KB) — implementer must keep math helpers (cf/pv/cmp/fh) defined at the start of the string and reuse them; ASI trap is the main risk
- Step 3 internationalCards coercion: if user picks PayPal + internationalCards=yes, the spec says coerce to false (surcharge only applies to Stripe). The plan implements this via `internationalCards = provider === 'stripe' && internationalRaw === 'yes'`. Confirm this matches spec.
- Step 11 ToolMeta is REQUIRED (per P4-1 lesson) — don't skip
- Step 12 OG sample is REQUIRED (per P4-1 lesson) — don't skip
- Step 16 build verifies the page actually renders; this is the integration smoke test

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-03-p4-2-stripe-fee-plan.md`. Single [MECHANICAL] task. Recommended execution: **subagent-driven-development** — 1 implementer + 1 spec-compliance reviewer.

- Implementer: sonnet (mechanical, single self-contained file)
- Reviewer: spec-compliance only (verify each step matches plan, check customFn parses, codegen drift = 0, build = pass, engine count bumps in 2 test files, ToolMeta + OG sample added)
- Holistic pre-merge review: NOT needed (single self-contained file + 6 wiring files, no cross-file concerns, <8 files touched)
- Push: gitee primary + github with `SKIP_PUSH_FETCH=1`

After P4-2 ships, proceed to P4-3 (SAFE / Convertible Note Calculator) following the same flow.
