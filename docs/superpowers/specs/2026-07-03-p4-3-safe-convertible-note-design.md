# P4-3 SAFE / Convertible Note Calculator Design

**Date:** 2026-07-03
**Status:** DRAFT (brainstorming)
**Author:** Claude (subagent-driven-development orchestrator)
**Context:** P4 sub-project 3/6 — extend 34 v3-standard calculators with startup-funding modeling entry. Closes SEO gap for "SAFE calculator" / "post-money SAFE" / "convertible note calculator" / "YC SAFE terms".

---

## Executive Summary

Add a **SAFE (Simple Agreement for Future Equity) / Convertible Note Calculator** to the **Valuation** category (alongside `saas-valuation-calculator`, `equity-dilution-calculator`, `stripe-fee-calculator`). Single self-contained engine file following v3 standard.

**Scope (V1, ~280 lines, single task):**

| Element | Decision |
|---|---|
| **Input model** | Investment amount + post-money valuation cap + discount rate (%) + existing fully diluted shares + next round valuation (default = cap) |
| **Output model** | Deal snapshot · Conversion mechanics (cap price / discount price / conversion price / shares issued) · Deal health · Ownership outcomes (founder/existing/SAFE %) · Dilution analysis · 5 what-if scenarios · 3 conditional tips · 5 SEO comparison rows at different cap levels |
| **Math** | `capPrice = postMoneyCap / (existingShares + SAFEshares)`, `discountPrice = nextRoundPrice × (1 - discountRate)`, `conversionPrice = min(capPrice, discountPrice)`, `SAFEshares = investment / conversionPrice`, `SAFEownership% = SAFEshares / (existingShares + SAFEshares)` |
| **Visual elements** | ASCII pie chart for ownership split + 🟢🟡🟠🔴 for deal health; comparison table at 5 cap levels |
| **Category** | Valuation (categoryId `C`) — file: `src/engines/valuation/safe-convertible-note-calculator.ts` |
| **i18n** | en + zh (auto-translates via existing pipeline) |

**V2 deferred (out of scope):**
- Cap table modeling beyond SAFE (priced round dilution, multiple SAFE stacks)
- Interest accrual on convertible notes (SAFEs don't accrue interest)
- Maturity date / change-of-control trigger modeling
- 409A valuation integration
- Pro-rata rights modeling (mentioned in input but not computed)
- Tax implications (Section 1202 QSBS, etc.)

---

## Background

### Why this calculator

Early-stage startup founders evaluating a SAFE (YC's post-money form is the de facto standard since 2018) need to know:
- What ownership % will the SAFE investor get at conversion?
- How does the cap + discount interact?
- How much dilution will I (founder) experience?
- What's the effective post-money valuation at conversion?

**Search volume proxies** (independent estimate, verify at execution):
- "SAFE calculator" — 5K-15K monthly searches
- "post-money SAFE calculator" — 1K-5K monthly
- "convertible note calculator" — 3K-8K monthly
- "YC SAFE calculator" — branded, very high intent
- "pre-money vs post-money SAFE" — informational, long-tail

### Why this isn't covered by `equity-dilution-calculator` (existing engine)

`equity-dilution-calculator` models **priced-round dilution** (Series Seed/A/B with explicit valuation and share price). SAFE is structurally different:
- SAFE has **no fixed share price at issuance** — conversion price is computed at next round from cap/discount
- SAFE has **no board seat, no preferred stock, no anti-dilution** — much simpler than priced round
- SAFE has **no interest accrual** (vs convertible note which does)

The new calculator focuses on the conversion math; `equity-dilution-calculator` can be linked in the "See also" sidebar for priced-round analysis.

### Why 5 inputs, not more

A SAFE calculator needs at minimum:
- **Investment amount** — the dollar amount being raised
- **Valuation cap** — the post-money cap that bounds conversion price
- **Discount rate** — typically 0% (post-money SAFE) or 20% (pre-money SAFE / older notes)
- **Existing shares** — needed to compute cap price (`cap / total fully diluted`)
- **Founder ownership** — needed to compute founder's post-SAFE %

5 inputs is the minimum useful set. Pro-rata rights, MFN clauses, vesting schedules all deferred to V2.

---

## V1 Design

### Input Model (5 fields)

| Field | Type | Default | Placeholder | Notes |
|---|---|---|---|---|
| `investmentAmount` | number | 500000 | e.g. 500000 | Dollar amount of SAFE investment (USD) |
| `postMoneyCap` | number | 5000000 | e.g. 5000000 | Post-money valuation cap (USD) |
| `discountRate` | number | 0 | e.g. 0 or 20 | Discount on next round price (0% = no discount, 20% = typical pre-money SAFE) |
| `existingShares` | number | 1000000 | e.g. 1000000 | Existing fully diluted shares (founder + prior SAFE + options pool) |
| `nextRoundValuation` | number | 5000000 | e.g. 5000000 | Expected next priced round valuation (default = cap). Only matters when `discountRate > 0`. |

**Defaults rationale:**
- `$500K SAFE` — typical seed-stage round size
- `$5M cap` — typical seed-stage post-money cap
- `0% discount` — YC's standard post-money SAFE since 2018
- `1M shares` — typical initial founder allocation
- `5M next round` — assume next round happens at the cap (default for capPrice proxy)

### Output Model (v3 Business variant)

**9 sections, each with emoji header + `━━━━━` divider:**

1. **⏰ SAFE Calculator** (title block)
2. **💰 Deal Snapshot**
   - Investment: $X
   - Post-Money Cap: $X
   - Discount Rate: X%
   - Effective Pre-Money: $X (post-money - investment)
   - SAFE Type: post-money (no discount) / pre-money with discount
3. **📐 Conversion Mechanics**
   - Cap Price: $X per share (postMoneyCap / (existingShares + SAFEshares))
   - Discount Price: $X per share (next round price × (1 - discountRate)) — or "n/a (no discount)"
   - **Conversion Price: $X per share** (min of cap and discount)
   - Shares Issued at Conversion: X shares
   - SAFE Investor Ownership: X%
4. **🩺 Deal Health**
   - Term assessment: 🟢 founder-friendly (high cap) / 🟡 standard / 🟠 aggressive (low cap)
   - Cap-to-investment ratio: X:1 (typical: 8-15:1)
   - Discount assessment: 🟢 0% (standard post-money) / 🟡 1-15% / 🟠 16-25% / 🔴 >25%
5. **🎯 Ownership Outcomes**
   - Existing Pool (founder + prior investors + options): X% post-SAFE (down from 100% pre-SAFE)
   - SAFE Holder: X% at conversion
   - ASCII pie chart: `▓▓▓▓▓░░░░ Existing 90%  ▓▓ SAFE 10%`
6. **⚖️ Dilution Analysis**
   - Existing pool dilution: -X% (from 100% to (existingShares / (existingShares + SAFEshares)) × 100%)
   - SAFE-as-%-of-post: X% (ownership % at conversion)
   - Effective post-money at conversion: $X (cap governs) or $X (next round valuation if discount governs)
   - Cap sensitivity: at 2x cap, SAFE holder gets X% instead of Y%
7. **🔄 What-If Scenarios** (5 variations)
   - Double the SAFE ($1M) → existing pool drops to X%, SAFE holder rises to Y%
   - Lower cap to $3M → SAFE holder gets more, existing pool less
   - Add 20% discount → conversion price drops (if discount governs), SAFE gets more shares
   - No cap (discount only) → discount governs, set cap to $100M
   - Stack with prior $250K SAFE at $4M cap → cumulative dilution analysis
8. **💡 Tip** (3 conditional variants)
   - Default: "Post-money SAFE (YC standard) protects founders by fixing SAFE holder's post-money % at conversion. Pre-money SAFE with discount gives investor more upside — only use for strategic investors who deserve it."
   - Cap<5M + discount>15%: "Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low."
   - Existing pool <50% post-SAFE: "Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor."
9. **5 Comparison Rows** (SEO long-tail): at $1M / $3M / $5M / $10M / $20M caps

### Math Model

#### Cap Price (post-money SAFE convention)

In YC's post-money SAFE, the cap IS the post-money valuation. The conversion price is:

```
capPrice = postMoneyCap / (existingShares + SAFEshares)
```

This is iterative because SAFEshares depend on capPrice. Solve via Newton iteration or closed-form algebra.

**Closed-form:** Let `C = cap`, `I = investment`, `E = existingShares`.

```
SAFEshares = I / capPrice
capPrice = C / (E + SAFEshares)
SAFEshares = I × (E + SAFEshares) / C
SAFEshares × C = I × E + I × SAFEshares
SAFEshares × (C - I) = I × E
SAFEshares = I × E / (C - I)
```

Check: `capPrice = C / (E + I×E/(C-I)) = C / (E × (1 + I/(C-I))) = C × (C-I) / (E × C) = (C-I) / E` — clean.

**Final:**
- `SAFEshares = I × E / (C - I)`
- `capPrice = (C - I) / E`

For a $500K SAFE on $5M cap with 1M existing shares:
- `SAFEshares = 500000 × 1000000 / (5000000 - 500000) = 500000000000 / 4500000 = 111,111.11`
- `capPrice = (5000000 - 500000) / 1000000 = 4.5` per share
- `SAFEownership = 111111.11 / (1000000 + 111111.11) = 10%` ✓

**Verification:** Post-money is $5M cap. SAFE holder should get $500K / $5M = 10% at conversion. ✓

#### Discount Price

If discount rate > 0, the SAFE can convert at the next round's price × (1 - discount). But the **next round price is unknown** until the round closes. For the calculator, we model the discount as an alternative path:

```
discountPrice = nextRoundPrice × (1 - discountRate)
```

Default `nextRoundPrice = postMoneyCap` (assume the next round is at the cap). User can override if desired.

#### Conversion Price

```
conversionPrice = min(capPrice, discountPrice)
sharesIssued = investment / conversionPrice
SAFEownership = sharesIssued / (existingShares + sharesIssued)
```

For discount-only SAFE (no cap, only discount), use `capPrice = Infinity` so discount governs.

#### Health Thresholds

```typescript
function dealHealth(capToInvestmentRatio: number, discountRate: number): { emoji: string; label: string } {
  // Cap-to-investment ratio thresholds
  if (capToInvestmentRatio < 5) return { emoji: '🟠', label: 'low cap — aggressive for founder' };
  if (capToInvestmentRatio < 10) return { emoji: '🟡', label: 'standard cap' };
  return { emoji: '🟢', label: 'founder-friendly cap' };
}

function discountHealth(discountRate: number): { emoji: string; label: string } {
  if (discountRate === 0) return { emoji: '🟢', label: 'no discount (standard post-money)' };
  if (discountRate <= 15) return { emoji: '🟡', label: 'moderate discount' };
  if (discountRate <= 25) return { emoji: '🟠', label: 'high discount' };
  return { emoji: '🔴', label: 'very high discount — unusual' };
}
```

#### Effective Pre-Money

```
effectivePreMoney = postMoneyCap - investment
```

For $5M cap / $500K SAFE: effective pre-money = $4.5M. This is what the next priced round will see.

### Edge Cases

| Scenario | Behavior |
|---|---|
| `investmentAmount = 0` | Output "Enter investment amount > $0 to see SAFE conversion" |
| `postMoneyCap <= investmentAmount` | Cap too low — show "cap must exceed investment" warning |
| `postMoneyCap < 2 × investmentAmount` | Flag: cap is too low (effectively <50% safe) |
| `discountRate = 0` | Skip discount calculation; show "n/a (no discount)" |
| `existingShares = 0` | Output "Enter existing fully diluted shares" |
| `discountRate < 0` | Clamp to 0 |
| `existingShares < 0` | Clamp to 0 |
| All inputs = 0 | Show "Enter inputs above to see conversion mechanics" |

### What-If Scenarios (5)

1. **Double the SAFE ($1M instead of $500K)**: same cap → SAFE holder gets 2× shares, existing pool drops more
2. **Lower cap to $3M**: SAFE holder gets more (16.7% vs 10%), existing pool drops more
3. **Add 20% discount**: cap governs (likely), but at next round >$5M, discount might govern
4. **No cap (discount only)**: set cap to very high ($100M) so only discount path matters
5. **Stack with prior $250K SAFE at $4M cap**: cumulative dilution analysis (10% + ~5.9% = 15.9% SAFE holders total)

### Tip Variants

| Trigger | Tip text |
|---|---|
| `discountRate === 0` | "Post-money SAFE (YC standard) protects founders by fixing SAFE holder's post-money % at conversion. Avoid pre-money SAFE with discount unless investor is strategic." |
| `discountRate > 15 && capToInvestmentRatio < 8` | "Aggressive terms: low cap + high discount = double protection for investor. Push back on discount if cap is already low." |
| `existingOwnership_post < 50` (post-SAFE) | "Heavy dilution ahead. Consider raising smaller, increasing your cap, or negotiating a higher cap with investor." |
| Default | "Standard terms: $5M post-money cap on $500K raise → ~10% dilution. If investor asks for >20% discount, that's a red flag. Pro-rata rights are negotiable but rarely granted at SAFE stage." |

### SAFE Type Display

```typescript
function safeType(discountRate: number, hasCap: boolean): string {
  if (hasCap && discountRate === 0) return 'Post-Money SAFE (YC Standard)';
  if (hasCap && discountRate > 0) return 'Post-Money SAFE with Discount';
  if (!hasCap && discountRate > 0) return 'Discount-Only SAFE (Pre-Conversion)';
  return 'Custom SAFE';
}
```

---

## Components & Files

### New code (~280 lines, single file)

**File: `src/engines/valuation/safe-convertible-note-calculator.ts`**

Structure (follows `compound-interest-calculator.ts` and `stripe-fee-calculator.ts` patterns exactly):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// === Pure math functions (exported for tests) ===
export function safeSharesAtCap(investment: number, postMoneyCap: number, existingShares: number): number { ... }
export function capPrice(postMoneyCap: number, investment: number, existingShares: number): number { ... }
export function discountPrice(nextRoundPrice: number, discountRate: number): number { ... }
export function conversionPrice(...): number { ... }
export function safeOwnership(...): number { ... }
export function dealHealth(...): { emoji: string; label: string } { ... }
export function discountHealth(...): { emoji: string; label: string } { ... }
export function safeType(...): string { ... }

// === calculate() — server-side + static example generation ===
function calculateSafe(inputs: Record<string, string>): string[] { /* 9-section output */ }

// === customFn (minified JS, runs in browser via new Function) ===
const customFn = "/* minified equivalent — must mirror calculateSafe logic exactly */";

// === Engine definition ===
const engine: ToolEngine = {
  slug: 'solopreneur-safe-convertible-note-calculator',
  title: 'SAFE / Convertible Note Calculator',
  description: '...',
  inputs: [/* 5 fields */],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculateSafe(inputs); },
  staticExamples: [/* codegen-regenerated */],
  faq: [/* 5 Q&A */],
  howToUse: [/* 7 steps */],
};
registerEngine(engine);
```

### Modified code (per P4-1/P4-2 lesson, plan scope extended to match existing pattern)

| File | Action | LoC | Purpose |
|---|---|---|---|
| `src/engines/valuation/index.ts` | Modify | +1 | Add `import './safe-convertible-note-calculator';` |
| `scripts/codegen-examples.mjs` | Modify | +2 | Add entry to `ENGINES` array with default inputs |
| `src/data/tools/valuation.ts` | Modify | +12 | Add `ToolMeta` entry (categoryId C, slug, title, description, structured ToolInput[] inputs, keywords, tags, sources) — **required per P4-1/P4-2 lesson** |
| `src/data/og-samples.json` | Modify | +5 | Add OG image sample — **required by build smoke test** |
| `tests/ab-split.test.ts` | Modify | +0 | Bump engine count 34 → 35 |
| `tests/internal-links.test.ts` | Modify | +0 | Bump engine count 34 → 35 |

### Unchanged infrastructure

- `src/core/engines/types.ts` — `ToolEngine` shape unchanged
- `src/core/engines/registry.ts` — registry unchanged
- `src/i18n/translations.ts` — calculator title/description English strings; no new keys
- `src/pages/[lang]/[slug].astro` — auto-discovers new engine via `registerEngine()` import

### Total

| Metric | Value |
|---|---|
| New files | 2 (engine + test) |
| Modified files | 6 (1 + 5 wiring per P4-1/P4-2 lesson) |
| Approx LoC | 280 (engine file) + 100 (test) + 20 wiring |
| New tests | 5 (see Test Plan) |
| New dependencies | 0 |

---

## Data Flow

```
User loads /en/safe-convertible-note-calculator
  ↓
Astro page renders [slug].astro
  ↓
Astro imports all engines (eager import via index.ts)
  ↓
registerEngine(ourEngine) runs at import time
  ↓
Astro calls engine.generate(staticInputs) for SSR rendering
  ↓
calculateSafe(staticInputs) returns string[]
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
| `investmentAmount = 0` | Show "Enter investment amount > $0 to see SAFE conversion" |
| `postMoneyCap <= investmentAmount` | Show "cap must exceed investment" warning |
| `existingShares = 0` | Show "Enter existing fully diluted shares" |
| `existingShares < 0` | Clamp to 0 |
| Very large `investmentAmount` (> $100M) | Cap display, flag "unusually large SAFE — verify" |
| Invalid discount rate (negative) | Clamp to 0 |
| Browser `customFn` parse error | **CRITICAL** — page silently fails. Use `node tests/scripts/test-customFn.mjs <slug>` to verify. |
| `codegen-examples.mjs --check` drift | Run `node scripts/codegen-examples.mjs` to regen `staticExamples[0]` |

---

## Test Plan (5 tests)

`tests/safe-convertible.test.ts` (new file):

| Test | Input | Expected |
|---|---|---|
| 1. Post-money SAFE basic | $500K investment, $5M cap, 0% discount, 1M shares, $5M next round | SAFE gets 10% (111,111 shares at $4.50), existing pool 90% |
| 2. Pre-money with 20% discount | $500K investment, $5M cap, 20% discount, 1M shares | Cap governs (capPrice $4.50 < discountPrice $5.00 if next round at $6.25) — cap-based math |
| 3. Cap dominates | $500K investment, $5M cap, 20% discount, 1M shares, next round at $10M | Cap wins: conversionPrice = $4.50 (not $8.00 discount price) |
| 4. Discount dominates | $500K investment, $50M cap, 20% discount, 1M shares, next round at $5M | Discount wins: conversionPrice = $4.00 (not capPrice ~$49.50) |
| 5. Edge case: cap < investment | $5M investment, $5M cap | Show error: "cap must exceed investment" — no math computed |

Math verification:
- Test 1: $5M cap / 1M shares = $5/share initial. After $500K SAFE: capPrice = ($5M - $500K) / 1M = $4.50. SAFE shares = $500K / $4.50 = 111,111. SAFE % = 111,111 / 1,111,111 = 10%. ✓
- Test 2: With 20% discount and next round at cap ($5M): discountPrice = $5M × 0.8 = $4M / 1M shares = $4.00. Wait, this depends on what the next round price per-share is.

Let me reconsider. The "next round price" per share is not the same as the next round valuation. Let me think again.

Actually, the conversion math for SAFE is:
- Cap price: `capPrice = postMoneyCap / totalFullyDilutedSharesAtNextRound` — but we don't know those shares
- Discount price: based on next round's share price × (1 - discount)

For V1 simplicity, let me model it as:
- `capPrice = postMoneyCap / (existingShares + SAFEshares)` — using existing shares as proxy for next round fully diluted
- `discountPrice = nextRoundPricePerShare × (1 - discountRate)` — needs a "next round price per share" input

OR, simpler: assume the next round's price per share equals the current cap price (i.e., next round happens at the cap, so price per share = cap / current shares).

```
discountPrice = (postMoneyCap / existingShares) × (1 - discountRate)
```

For Test 1 ($5M cap, 1M shares, 0% discount):
- `capPrice = ($5M - $500K) / 1M = $4.50` (after-SAFE cap price)
- `discountPrice = $5.00 × 1.0 = $5.00` (since discount = 0)
- `conversionPrice = min($4.50, $5.00) = $4.50` ✓
- `SAFEshares = $500K / $4.50 = 111,111`
- `SAFEownership = 111,111 / 1,111,111 = 10%` ✓

For Test 2 ($5M cap, 20% discount, 1M shares, next round at $5M):
- `capPrice = $4.50` (same as above)
- `discountPrice = $5.00 × 0.8 = $4.00`
- `conversionPrice = min($4.50, $4.00) = $4.00` (DISCOUNT GOVERNS)
- `SAFEshares = $500K / $4.00 = 125,000`
- `SAFEownership = 125,000 / 1,125,000 = 11.1%`

For Test 3 (cap dominates): if next round is at $10M, then `discountPrice = $10.00 × 0.8 = $8.00`, cap governs at $4.50.

For Test 4 (discount dominates): cap at $50M is too high to matter, discount at $5M → $4.00 wins.

Hmm, I need to add a "next round valuation" input for the discount math to work properly. Let me add it as 6th input.

OR, assume next round = cap (most conservative for founder when discount is high; most generous for founder when discount is low).

Decision: Add `nextRoundValuation` as 6th input, default to `postMoneyCap` (assume next round = cap).

But that's 6 inputs, getting bloated. Let me consolidate:

| Field | Type | Default | Notes |
|---|---|---|---|
**Final 5 inputs:**

1. `investmentAmount` (number) — Dollar amount of SAFE investment
2. `postMoneyCap` (number) — Post-money valuation cap
3. `discountRate` (number, default 0) — Discount on next round price
4. `existingShares` (number) — Existing fully diluted shares
5. `nextRoundValuation` (number, default = cap) — Expected next priced round valuation

**Why no `founderOwnership` field:** the existing share pool (founder + prior investors + options) is 100% pre-SAFE by construction. Post-SAFE ownership is computed: `existingOwnership%_post = existingShares / (existingShares + SAFEshares) × 100`. So the founder/existing dilution is implicit in the share-count arithmetic.

Cleaner.

Let me update the test plan:

| Test | Input | Expected |
|---|---|---|
| 1. Post-money SAFE basic | $500K investment, $5M cap, 0% discount, 1M shares, $5M next round | SAFE gets 10% (111,111 shares at $4.50) |
| 2. Discount governs (20% off $5M next round) | $500K investment, $5M cap, 20% discount, 1M shares, $5M next round | Conversion $4.00 (discount), 125,000 shares, 11.1% |
| 3. Cap dominates (next round > cap × 1.25) | $500K investment, $5M cap, 20% discount, 1M shares, $10M next round | Cap $4.50 governs, 10% ownership |
| 4. Discount dominates (very high cap) | $500K investment, $50M cap, 20% discount, 1M shares, $5M next round | Discount $4.00 wins |
| 5. Edge: cap < investment | $5M investment, $5M cap | Show "cap must exceed investment" — no math |

This gives 5 tests with distinct math paths, all meaningful.

---

## V2 (out of scope, record for future)

| Feature | Why deferred |
|---|---|
| Cap table modeling | Beyond SAFE — separate calculator territory |
| Interest accrual on notes | SAFEs don't accrue interest (only convertible notes) |
| Maturity date modeling | 10-year maturity is standard; rarely triggers conversion |
| 409A valuation integration | Different price stream; sophisticated use case |
| Pro-rata rights modeling | Simple boolean, not a calculation |
| Section 1202 QSBS | Tax-specific; defer to tax calc |
| Multiple SAFE stacking | Combinatorial; needs full cap table |

---

## Open Questions for User Review

> **Q1: Input scope.** I picked 5 fields (investment, cap, discount, existing shares, next round valuation). Alternative: simpler 4-field without `nextRoundValuation` (default it to cap automatically — what round at cap means for the user). If you want fewer inputs, say so.
>
> **Q2: Category.** Valuation (alongside saas-valuation-calculator). Alternative: new `src/engines/funding/` folder for SAFE/equity/investor modeling. The latter requires creating a new category.
>
> **Q3: SAFE type display.** I show "Post-Money SAFE (YC Standard)" / "Post-Money SAFE with Discount" / "Discount-Only SAFE" / "Custom SAFE". The YC standard is post-money, no discount, cap-only. If you want different naming, say so.
>
> **Q4: V2 features priority.** If you want any V2 item pulled into V1 (e.g., pro-rata rights), say so.

Defaults if no response: Q1=5 fields, Q2=valuation/, Q3=current naming, Q4=V2 stays deferred.

---

## Plan Execution Checklist (lessons from P4-1/P4-2)

The implementer must do ALL of these (P4-1/P4-2 implementers correctly extended scope beyond plan — call out here to avoid rediscovery):

1. ✅ Create `src/engines/valuation/safe-convertible-note-calculator.ts`
2. ✅ Create `tests/safe-convertible.test.ts`
3. ✅ Add import to `src/engines/valuation/index.ts`
4. ✅ Add ENGINES entry to `scripts/codegen-examples.mjs`
5. ✅ Add ToolMeta entry to `src/data/tools/valuation.ts` — **use `ToolInput[]` structured form, NOT string array** (P4-2 lesson)
6. ✅ Add OG sample to `src/data/og-samples.json`
7. ✅ Bump engine count in `tests/ab-split.test.ts` + `tests/internal-links.test.ts` (34 → 35)
8. ✅ Run `node tests/scripts/test-customFn.mjs valuation/safe-convertible-note-calculator` → OK
9. ✅ Run `node scripts/codegen-examples.mjs` → regenerate staticExamples[0]
10. ✅ Run `node scripts/codegen-examples.mjs --check` → exit 0
11. ✅ Run `pnpm test:unit` → pass
12. ✅ Run `pnpm build` → 164 pages succeed (was 163 + 1 = 164)
13. ✅ Pre-flight: **apply any math-helper fixes to BOTH the math helper AND the customFn mirror** (P4-2 lesson — live = static parity invariant)
14. ✅ Commit + push to gitee + github
