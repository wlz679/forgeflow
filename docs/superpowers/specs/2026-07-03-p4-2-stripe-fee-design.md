# P4-2 Stripe Fee Calculator Design

**Date:** 2026-07-03
**Status:** DRAFT (brainstorming)
**Author:** Claude (subagent-driven-development orchestrator)
**Context:** P4 sub-project 2/6 — extend 33 v3-standard calculators with e-commerce / solopreneur entry. Closes the SEO gap for "stripe fee calculator" / "payment processor fee calculator" / "stripe vs paypal".

---

## Executive Summary

Add a **multi-provider payment processor fee calculator** to the **Valuation** category (alongside `saas-pricing-planner`, `course-pricing-calculator` — both pricing-class). Single self-contained engine file following v3 standard.

**Scope (V1, ~260 lines, single task):**

| Element | Decision |
|---|---|
| **Input model** | Charge amount + provider (Stripe / Stripe International / PayPal / Square / Wise) + monthly transactions (batch projection) |
| **Output model** | Single charge breakdown (amount / % fee / fixed fee / total fee / net received) · 5-provider comparison table · monthly/yearly batch projection · 5 what-if scenarios · actionable tip on fee reduction |
| **Math** | `fee = amount × percentage + fixed`, where `(percentage, fixed)` per provider. International Stripe surcharge: `+1.5%`. Wise: no fixed fee (varies by corridor, use 0 for V1 with disclaimer). |
| **Visual elements** | Inline ASCII bars + 🟢🟡🟠🔴 for fee efficiency vs industry average; 5-row comparison table; NO external chart library |
| **Category** | C class — file: `src/engines/valuation/stripe-fee-calculator.ts` |
| **i18n** | en + zh (calculator page auto-translates via existing pipeline) |

**V2 deferred (out of scope):**
- Refund modeling (Stripe refunds % fee, keeps fixed)
- Chargeback fee ($15)
- Subscription billing fees (different model)
- Stripe Tax / VAT calculation
- Multi-currency conversion (Wise corridor-specific)
- Volume discounts (Stripe negotiated rates >$1M monthly)

---

## Background

### Why this calculator

Independent sites, e-commerce founders, SaaS charging customers — every Stripe transaction loses 2.9% + 30¢. Over a year at $10K MRR, that's $3,500 in fees. Users want to:
- Know "if I charge $X, how much do I actually receive?"
- Compare Stripe vs PayPal vs Square vs Wise for their volume
- Project monthly/yearly fee burden

**Search volume proxies** (independent estimate, verify at execution):
- "stripe fee calculator" — 15K-30K monthly searches (US, English)
- "payment processor fee calculator" — 3K-8K monthly
- "stripe vs paypal fees" — 5K-10K monthly
- "stripe 2.9% + 30¢" — branded query, very high intent

### Why multi-provider (4) instead of Stripe-only

| Approach | Audience | Trade-off |
|---|---|---|
| **Stripe-only** | Solopreneurs already using Stripe | Simple but ignores 40% of "Stripe vs PayPal" / "payment processor comparison" queries |
| **Multi-provider (4)** | Anyone shopping for a processor | Slightly more complex; one extra input field; captures competitor comparison SEO |

V1 picks **multi-provider** — the comparison table is auto-generated (no extra inputs), so the complexity is contained while the SEO coverage expands significantly.

### Why these 4 providers (V1)

| Provider | Standard rate | Why include |
|---|---|---|
| **Stripe** | 2.9% + 30¢ | Industry default; highest query volume |
| **Stripe International** | 2.9% + 1.5% + 30¢ | Common variant; cross-border adds 1.5% |
| **PayPal** | 3.5% (no fixed) | Most common alternative; no fixed fee, higher % |
| **Square** | 2.6% + 10¢ | Lower rate; popular for in-person + online |
| **Wise** | 1.5% + $0 (US) | Lowest rate; newer entrant; growing fast |

V2 candidates: Adyen (volume-discount), Braintree (PayPal-owned), 2Checkout, Apple Pay fees (0% from processor but merchant pays card fee).

---

## V1 Design

### Input Model (3-4 fields depending on provider)

| Field | Type | Default | Placeholder | Notes |
|---|---|---|---|---|
| `chargeAmount` | number | 100 | e.g. 100 | Single transaction amount (USD) |
| `provider` | select | stripe | — | `stripe` / `stripe-international` / `paypal` / `square` / `wise` |
| `monthlyTransactions` | number | 100 | e.g. 100 | Batch projection; 0 = single charge only |
| `internationalCards` | checkbox | false | — | Only matters when `provider === 'stripe'` |

**Defaults rationale:**
- `chargeAmount: $100` — typical SaaS / digital product price point
- `monthlyTransactions: 100` — modest volume, shows batch projection impact
- `provider: stripe` — most common
- `internationalCards: false` — default to US domestic

### Output Model (v3 Business variant)

**9 sections, each with emoji header + `━━━━━` divider:**

1. **⏰ Stripe Fee Calculator** (title block)
2. **💰 Single Charge Breakdown**
   - Charge Amount: $X
   - Provider: $X (with international marker)
   - Percentage Fee: $X (X.X%)
   - Fixed Fee: $X
   - **Total Fee: $X**
   - **Net Received: $X** (the headline)
   - Effective Fee Rate: X.XX%
3. **📊 Provider Comparison** (5-row table)
   - Each row: provider name, % fee, fixed fee, total fee for current amount, net received
   - Highlight current selection with marker
   - Sort by total fee ascending
4. **🩺 Fee Efficiency Health**
   - vs industry average (~2.9% + 30¢): 🟢 better / 🟡 equal / 🟠 worse
   - Effective rate tier: 🟢 <2% / 🟡 2-3% / 🟠 3-4% / 🔴 >4%
   - Per-transaction burden on small charges (e.g., 30¢ on $1 = 30%)
5. **🎯 Volume Projection**
   - Monthly: X transactions × $Y amount = $Z gross, $A fees, $B net
   - Yearly: × 12 = $C gross, $D fees, $E net
   - Annualized impact: "fees cost you $D/yr — could fund X months of [Y]"
6. **⚖️ Break-Even on Provider Choice**
   - Cheapest provider for current volume
   - Annual savings if switching: $X
   - Switching friction caveat: "Stripe ↔ PayPal migration takes 1-2 weeks; Wise requires account setup"
7. **🔄 What-If Scenarios** (5 variations)
   - Raise price by $1 to offset fees
   - Add 10% to charge to pass fees to customer
   - Switch to annual billing (fewer transactions, less fee burden)
   - Negotiate volume discount (assumes 0.5% reduction at $50K MRR)
   - Bundle 12 transactions into 1 annual charge (saves X fees)
8. **💡 Tip** (3 conditional variants)
   - Default: "Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves $X/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+$Y to cover $X), or compare Wise for international."
   - High-volume (monthly transactions > 1000): "At your volume, you're paying $X/yr in fees. Contact Stripe sales — they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself."
   - Small charges (amount < $5): "On charges under $5, the 30¢ fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions — Wise is cheapest but takes 1-2 days for payouts."
9. **5 Comparison Rows** (SEO long-tail): show fee impact at 5 different charge amounts ($1, $10, $100, $1000, $10000)

### Math Model

#### Fee Calculation per Provider

```typescript
type Provider = 'stripe' | 'stripe-international' | 'paypal' | 'square' | 'wise';

interface FeeSchedule {
  percentage: number;       // e.g. 0.029 for 2.9%
  fixed: number;            // e.g. 0.30 for 30¢
  hasFixed: boolean;        // paypal = false; wise = false
}

const FEE_SCHEDULES: Record<Provider, FeeSchedule> = {
  'stripe':              { percentage: 0.029, fixed: 0.30, hasFixed: true },
  'stripe-international': { percentage: 0.044, fixed: 0.30, hasFixed: true }, // 2.9% + 1.5% surcharge
  'paypal':              { percentage: 0.035, fixed: 0.00, hasFixed: false },
  'square':              { percentage: 0.026, fixed: 0.10, hasFixed: true },
  'wise':                { percentage: 0.015, fixed: 0.00, hasFixed: false }, // 1.5% for US, varies by corridor
};

function calculateFee(amount: number, provider: Provider): {
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
```

#### Batch Projection

```typescript
function projectVolume(
  chargeAmount: number,
  provider: Provider,
  monthlyTransactions: number,
): {
  monthly: { gross: number; fees: number; net: number };
  yearly: { gross: number; fees: number; net: number };
  annualSavingsIfSwitched: number; // vs highest-cost provider in comparison
} {
  if (monthlyTransactions <= 0) {
    return { monthly: { gross: 0, fees: 0, net: 0 }, yearly: { gross: 0, fees: 0, net: 0 }, annualSavingsIfSwitched: 0 };
  }
  const singleFee = calculateFee(chargeAmount, provider);
  const monthlyGross = chargeAmount * monthlyTransactions;
  const monthlyFees = singleFee.totalFee * monthlyTransactions;
  const monthlyNet = singleFee.netReceived * monthlyTransactions;
  return {
    monthly: { gross: monthlyGross, fees: monthlyFees, net: monthlyNet },
    yearly: { gross: monthlyGross * 12, fees: monthlyFees * 12, net: monthlyNet * 12 },
    annualSavingsIfSwitched: 0, // computed separately in break-even section
  };
}
```

#### Provider Comparison (5 rows)

```typescript
function compareProviders(chargeAmount: number): Array<{
  provider: Provider;
  fee: ReturnType<typeof calculateFee>;
  displayName: string;
}> {
  const order: Provider[] = ['wise', 'square', 'stripe', 'stripe-international', 'paypal'];
  return order.map(p => ({
    provider: p,
    fee: calculateFee(chargeAmount, p),
    displayName: PROVIDER_LABELS[p],
  }));
}
```

#### Health Thresholds

```typescript
function feeHealth(effectiveRate: number, amount: number): { emoji: string; label: string } {
  if (amount < 5) return { emoji: '🔴', label: 'fixed fee dominates — set $5 minimum or use no-fixed-fee provider' };
  if (effectiveRate < 0.02) return { emoji: '🟢', label: 'excellent rate' };
  if (effectiveRate < 0.03) return { emoji: '🟡', label: 'standard rate' };
  if (effectiveRate < 0.04) return { emoji: '🟠', label: 'above average' };
  return { emoji: '🔴', label: 'high — consider switching' };
}
```

### Edge Cases

| Scenario | Behavior |
|---|---|
| `chargeAmount = 0` | Output "Enter charge amount > $0 to see fees" |
| `chargeAmount < 5` | Show warning: "Fixed fee 30¢ = X% on small charges. Consider $5 minimum." |
| `monthlyTransactions = 0` | Skip volume projection; show "Enter monthly transaction count for batch projection" |
| `monthlyTransactions > 1_000_000` | Clamp display; flag with "high volume — negotiate directly with Stripe" |
| `internationalCards = true` but `provider !== 'stripe'` | Coerce to false (surcharge only applies to Stripe) |
| Wise with non-US corridor | V1 disclaimer: "Wise fee varies by corridor. US estimate shown." |
| All inputs = 0 | Show "Enter inputs above to see breakdown" |

### What-If Scenarios (5)

1. **Raise price by $1**: `calculateFee(chargeAmount + 1, provider)` — show how it offsets fees
2. **Pass fees to customer (+X% to charge)**: compute new charge needed to net original amount
3. **Switch to annual billing**: same yearly revenue, but only 1 transaction instead of 12 → saves 11 fixed fees
4. **Negotiate volume discount**: assume 0.5% rate reduction at $50K MRR — show annual savings
5. **Bundle 12 transactions into 1 annual charge**: fees on $1,200 single charge vs 12 × $100

### Tip Variants

| Trigger | Tip text |
|---|---|
| `monthlyTransactions > 1000` | "At your volume, you're paying $X/yr in fees. Contact Stripe sales — they negotiate 0.1-0.3% off at $50K MRR. The 30-min call pays for itself." |
| `chargeAmount < 5` | "On charges under $5, the 30¢ fixed fee dominates. Charge $5 minimum, or use PayPal (3.5% flat) for small transactions — Wise is cheapest but takes 1-2 days for payouts." |
| Default | "Stripe fees are unavoidable but negotiable at $50K+ MRR. Each 0.1% reduction saves $X/yr at your volume. Consider annual plans (lower per-tx fees), pass fees to customers (+$Y to cover $X), or compare Wise for international." |

### Provider Display Names

```typescript
const PROVIDER_LABELS: Record<Provider, string> = {
  'stripe': 'Stripe (US)',
  'stripe-international': 'Stripe (International)',
  'paypal': 'PayPal',
  'square': 'Square',
  'wise': 'Wise',
};
```

---

## Components & Files

### New code (~280 lines, single file)

**File: `src/engines/valuation/stripe-fee-calculator.ts`**

Structure (follows `compound-interest-calculator.ts` pattern exactly):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// === Pure math functions (exported for tests) ===
export type Provider = 'stripe' | 'stripe-international' | 'paypal' | 'square' | 'wise';
export interface FeeSchedule { percentage: number; fixed: number; hasFixed: boolean; }
export const FEE_SCHEDULES: Record<Provider, FeeSchedule> = { /* ... */ };

export function calculateFee(amount: number, provider: Provider): { /* ... */ } { /* see Math Model */ }
export function projectVolume(...): { /* ... */ } { /* see Math Model */ }
export function compareProviders(chargeAmount: number): Array<{ /* ... */ }> { /* see Math Model */ }
export function feeHealth(...): { emoji: string; label: string } { /* see Math Model */ }

// === calculate() — server-side + static example generation ===
function calculateStripeFee(inputs: Record<string, string>): string[] { /* 9-section output */ }

// === customFn (minified JS, runs in browser via new Function) ===
const customFn = "/* minified equivalent */";

// === Engine definition ===
const engine: ToolEngine = {
  slug: 'solopreneur-stripe-fee-calculator',
  title: 'Stripe Fee Calculator',
  description: 'Calculate Stripe, PayPal, Square, and Wise payment processing fees. Compare providers, project annual fee burden, and find what-if scenarios to reduce fees.',
  inputs: [/* 4 fields */],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculateStripeFee(inputs); },
  staticExamples: [/* codegen-regenerated */],
  faq: [/* 5 Q&A */],
  howToUse: [/* 5 steps */],
};
registerEngine(engine);
```

### Modified code (per P4-1 lesson, plan scope extended to match existing pattern)

| File | Action | LoC | Purpose |
|---|---|---|---|
| `src/engines/valuation/index.ts` | Modify | +1 | Add `import './stripe-fee-calculator';` |
| `scripts/codegen-examples.mjs` | Modify | +2 | Add entry to `ENGINES` array with default inputs |
| `src/data/tools/valuation.ts` | Modify | +12 | Add `ToolMeta` entry (categoryId, slug, title, description, etc.) — **required per P4-1 lesson** |
| `src/data/og-samples.json` | Modify | +5 | Add OG image sample — **required by build smoke test per P4-1 lesson** |
| `tests/ab-split.test.ts` | Modify | +0 | Bump engine count 33 → 34 |
| `tests/internal-links.test.ts` | Modify | +0 | Bump engine count 33 → 34 |

### Unchanged infrastructure

- `src/core/engines/types.ts` — `ToolEngine` shape unchanged
- `src/core/engines/registry.ts` — registry unchanged
- `src/i18n/translations.ts` — calculator title/description English strings; no new keys (existing pattern)
- `src/pages/[lang]/[slug].astro` — auto-discovers new engine via `registerEngine()` import

### Total

| Metric | Value |
|---|---|
| New files | 1 |
| Modified files | 6 (1 + 5 wiring per P4-1 lesson) |
| Approx LoC | 280 (engine file) + 20 wiring |
| New tests | 4 (see Test Plan) |
| New dependencies | 0 |

---

## Data Flow

```
User loads /en/stripe-fee-calculator
  ↓
Astro page renders [slug].astro
  ↓
Astro imports all engines (eager import via index.ts)
  ↓
registerEngine(ourEngine) runs at import time
  ↓
Astro calls engine.generate(staticInputs) for SSR rendering
  ↓
calculateStripeFee(staticInputs) returns string[]
  ↓
HTML embeds string[0] as initial display
  ↓
User changes input → browser customFn runs → updates DOM
```

No backend calls. No Supabase / Clerk interaction. Pure client-side math.

---

## Error Handling

| Error source | Behavior |
|---|---|
| `chargeAmount = 0` | Show "Enter charge amount > $0 to see fees" |
| `monthlyTransactions = 0` | Skip volume projection, show message |
| Very large `chargeAmount` | Cap display at $999,999,999.99 |
| Invalid provider string | Coerce to 'stripe' (default fallback) |
| `internationalCards` true but provider ≠ stripe | Coerce to false |
| Browser `customFn` parse error | **CRITICAL** — page silently fails. Use `node tests/scripts/test-customFn.mjs <slug>` to verify. |
| `codegen-examples.mjs --check` drift | Run `node scripts/codegen-examples.mjs` to regen `staticExamples[0]` |

---

## Test Plan (4 tests)

`tests/stripe-fee.test.ts` (new file, per-test child process isolation per P3-1 lesson — though tests don't need process isolation since they're pure math):

| Test | Input | Expected |
|---|---|---|
| 1. Stripe standard fee | $100 charge, Stripe US | Fee = $2.90 + $0.30 = $3.20, Net = $96.80 |
| 2. PayPal no-fixed fee | $100 charge, PayPal | Fee = $3.50 (no fixed), Net = $96.50 |
| 3. Wise lowest rate | $1000 charge, Wise | Fee = $15.00 (1.5% flat), Net = $985.00 |
| 4. Stripe international surcharge | $100 charge, Stripe International | Fee = $4.40 + $0.30 = $4.70, Net = $95.30 |
| 5. Small charge fixed-fee dominance | $1 charge, Stripe | Fee = $0.029 + $0.30 = $0.329, Effective rate 32.9% (verify health 🔴 warning) |

Math verification: hand-calculate expected values, cross-check Stripe's published rate card (https://stripe.com/pricing).

---

## V2 (out of scope, record for future)

| Feature | Why deferred |
|---|---|
| Refund modeling | Different fee treatment (% refunded, fixed kept); adds complexity |
| Chargeback fee ($15) | Edge case; affects chargeback rate analysis (separate calculator) |
| Subscription billing fees | Different pricing model (Stripe Billing) |
| Stripe Tax / VAT calc | Tax engine territory; separate concern |
| Multi-currency conversion | Wise corridor-specific; rates vary daily |
| Volume discounts (negotiated rates) | Custom per-merchant; not a generic calc |
| ACH / wire transfer fees | Lower than cards; different model |

---

## Open Questions for User Review

> **Q1: Provider scope.** I picked 4 + Stripe International (5 total). Alternative was Stripe-only (simpler) or 6+ providers (broader SEO). If you want fewer/more, say so.
>
> **Q2: International cards model.** I made it a checkbox toggle for Stripe only. Alternative: separate "Stripe International" provider option (which is what I did — both options exist). If you want it strictly as a checkbox that disables provider selection, say so.
>
> **Q3: Category placement.** I put under `src/engines/valuation/` (alongside `saas-pricing-planner`, `course-pricing-calculator`). Alternative was new `src/engines/payment/` folder. The latter requires creating a new category and updating `index.ts` registry.
>
> **Q4: V2 features priority.** If you want any V2 item pulled into V1 (e.g., refund modeling), say so.

Defaults if no response: Q1=4+1 providers, Q2=both checkbox AND separate option (current spec), Q3=valuation/, Q4=V2 stays deferred.

---

## Plan Execution Checklist (lessons from P4-1)

The implementer must do ALL of these (P4-1 implementer correctly extended scope beyond plan — call out here to avoid rediscovery):

1. ✅ Create `src/engines/valuation/stripe-fee-calculator.ts`
2. ✅ Create `tests/stripe-fee.test.ts`
3. ✅ Add import to `src/engines/valuation/index.ts`
4. ✅ Add ENGINES entry to `scripts/codegen-examples.mjs`
5. ✅ Add ToolMeta entry to `src/data/tools/valuation.ts`
6. ✅ Add OG sample to `src/data/og-samples.json`
7. ✅ Bump engine count in `tests/ab-split.test.ts` + `tests/internal-links.test.ts`
8. ✅ Run `node tests/scripts/test-customFn.mjs valuation/stripe-fee-calculator` → OK
9. ✅ Run `node scripts/codegen-examples.mjs` → regenerate staticExamples[0]
10. ✅ Run `node scripts/codegen-examples.mjs --check` → exit 0
11. ✅ Run `pnpm test:unit` → pass
12. ✅ Run `pnpm build` → 162 pages succeed (was 161 + 1 = 162)
13. ✅ Commit + push to gitee + github