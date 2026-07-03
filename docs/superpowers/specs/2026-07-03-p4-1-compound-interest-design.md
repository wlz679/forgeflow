# P4-1 Compound Interest Calculator Design

**Date:** 2026-07-03
**Status:** DRAFT (brainstorming)
**Author:** Claude (subagent-driven-development orchestrator)
**Context:** P4 sub-project 1/6 — extend 32 v3-standard calculators with personal finance entry. Closes the SEO gap for "compound interest calculator" / "savings growth calculator" / "investment growth calculator".

---

## Executive Summary

Add a **savings-account-style compound interest calculator** to the **Investment** category (alongside `time-value-calculator`, `freelance-tax-calculator`). Single self-contained engine file following the v3 standard. No new infrastructure (registry, types, components unchanged).

**Scope (V1, ~200 lines, single task):**

| Element | Decision |
|---|---|
| **Input model** | Principal + monthly contribution + annual rate (%) + compounding frequency (annual/monthly) + years |
| **Output model** | Future value, total contributions, total interest, compound-vs-simple advantage, 5-milestone growth table, time-to-goal thresholds ($100K/$500K/$1M), 5 what-if scenarios, actionable tip |
| **Math** | FV with regular contributions: `FV = P(1+r/n)^(nt) + PMT × [((1+r/n)^(nt) - 1) / (r/n)]` (frequency-aware), plus simple-interest baseline for comparison |
| **Visual elements** | Inline ASCII bar chart per milestone + threshold emoji (🟢🟡🟠🔴); NO external chart library |
| **Category** | E class — file: `src/engines/investment/compound-interest-calculator.ts` |
| **i18n** | 2 locales (en + zh) — see CLAUDE.md |

**V2 deferred (out of scope):**
- Inflation / real return adjustment (separate calculator in pipeline)
- Tax drag modeling (capital gains, dividends)
- Quarterly / daily compounding
- Currency selection (USD only V1)
- CSV export of year-by-year table

---

## Background

### Why this calculator

Personal finance is the **highest SEO volume** segment among the 32 v3 calculators. Existing E-class coverage is sparse (only 2 calculators: `freelance-tax`, `time-value`). Adding compound interest fills the "savings growth" / "investment growth" query space where competitors (Investopedia, Bankrate, NerdWallet) all rank.

**Search volume proxies** (independent estimate, verify at execution):
- "compound interest calculator" — 50K-100K monthly searches (US, English)
- "savings growth calculator" — 5K-15K monthly
- "investment calculator with monthly contributions" — 5K-10K monthly

### Why "savings-account-style" (principal + monthly contribution)

Two competing input models:

| Model | Audience | Trade-off |
|---|---|---|
| **Lump-sum only** (principal + rate + years) | Textbook / one-time windfall | Simple but ignores the dominant use case (recurring savings) |
| **Savings-style** (principal + monthly contribution + rate + years) | 90% of personal finance users (retirement, emergency fund, kids' college) | Slightly more inputs but matches "I save $500/mo" mental model |

V1 picks **savings-style** — it matches the user question, not the textbook formula. (See Open Questions §Q1 for the alternative considered.)

### Why annual + monthly only (not quarterly/daily)

Compounding frequency options are industry-standard (FDIC, APR vs APY math):

| Frequency | Use case | V1 priority |
|---|---|---|
| Annually (1×/yr) | Bonds, CDs, simple interest | ✅ Yes |
| Monthly (12×/yr) | Savings accounts, brokerage dividends | ✅ Yes |
| Quarterly (4×/yr) | Some bonds, money market | ❌ V2 |
| Daily (365×/yr) | Crypto, some HYSA | ❌ V2 |

Industry consensus: **annual vs monthly is the meaningful comparison**. The gap between monthly and daily is <0.1% over 20 years. YAGNI on quarterly/daily.

---

## V1 Design

### Input Model (5 fields)

| Field | Type | Default | Placeholder | Validation |
|---|---|---|---|---|
| `principal` | number | 0 | e.g. 10000 | >= 0 |
| `monthlyContribution` | number | 0 | e.g. 500 | >= 0 |
| `annualRate` | number (percent) | 7 | e.g. 7 | 0-50 |
| `compoundFrequency` | select | monthly | — | `annually` \| `monthly` |
| `years` | number | 20 | e.g. 20 | 1-50 |

**Defaults rationale:**
- `annualRate: 7%` — S&P 500 historical real return benchmark
- `years: 20` — typical mid-career savings horizon
- `compoundFrequency: monthly` — most common for retail savings

### Output Model (v3 Business variant — matches `time-value-calculator.ts`)

**9 sections, each with emoji header + `━━━━━` divider:**

1. **⏰ Compound Interest Calculator** (title block)
2. **💰 Growth Snapshot**
   - Principal: $X
   - Total Contributions: $X (monthly × 12 × years)
   - Total Interest Earned: $X (compound - principal - contributions)
   - **Final Balance: $X** (the headline)
   - Multiplier: $X grew to $Yx (Zx growth)
3. **📐 Milestone Growth** (5 milestones: 5y / 10y / 15y / 20y / final)
   - Each milestone: year, balance, contributed, interest earned, mini bar `████░░░░░░ 40%`
4. **🩺 Compounding Health**
   - Rate tier: 🟢 ≥7% strong / 🟡 4-7% average / 🟠 1-4% low / 🔴 <1% below inflation
   - Frequency impact: monthly vs annual gap (typically <0.5% over 20 years)
   - Contribution ratio: % of final balance that came from contributions vs interest
5. **🎯 Time-to-Goal Milestones**
   - Years to $100K (if not yet reached)
   - Years to $500K (if not yet reached)
   - Years to $1M (if not yet reached)
   - "Already there!" if current balance exceeds threshold
6. **⚖️ Compound vs Simple Break-Even**
   - Simple interest final balance
   - Compound final balance
   - Compound advantage (dollars + %)
   - Rule: "Compound interest = interest on interest. Time is the multiplier."
7. **🔄 What-If Scenarios** (5 variations)
   - Add $100/mo extra: new final balance
   - Increase rate by 1%: new final balance + extra earnings
   - Extend period by 5 years: new final balance
   - Switch to monthly compounding (if currently annual): extra earnings
   - Delay start by 1 year: lost earnings (cost of procrastination)
8. **💡 Tip**
   - Actionable: "Time in the market beats timing the market. Starting 10 years earlier typically doubles the final balance."
   - Reinforces reinvestment assumption
   - Ties rate tier to user's health 🟢🟡🟠🔴

### Math Model

#### Future Value (FV)

```typescript
function futureValue(
  principal: number,
  monthlyContribution: number,
  annualRatePercent: number,    // e.g. 7 for 7%
  compoundFrequency: 'annually' | 'monthly',
  years: number,
): number {
  if (annualRatePercent === 0) {
    return principal + monthlyContribution * 12 * years;
  }
  const r = annualRatePercent / 100;
  if (compoundFrequency === 'monthly') {
    const r_m = r / 12;
    const n = years * 12;
    const fvP = principal * Math.pow(1 + r_m, n);
    // PMT made at end of each month → ordinary annuity formula
    const fvPMT = monthlyContribution * ((Math.pow(1 + r_m, n) - 1) / r_m);
    return fvP + fvPMT;
  } else {
    // annual compounding: PMT treated as end-of-year contributions
    const fvP = principal * Math.pow(1 + r, years);
    const fvPMT = monthlyContribution * 12 * ((Math.pow(1 + r, years) - 1) / r);
    return fvP + fvPMT;
  }
}
```

**Note on PMT timing:** V1 uses ordinary annuity (PMT at end of period). This is standard in financial calculators and is conservative (begin annuity would be slightly higher but rarely matters for retail decisions).

#### Simple Interest Comparison

```typescript
function simpleFinalValue(principal, monthlyContribution, annualRatePercent, years): number {
  const r = annualRatePercent / 100;
  const totalContrib = monthlyContribution * 12 * years;
  // Simple interest on principal only, contributions earn no interest
  return principal * (1 + r * years) + totalContrib;
}
```

#### Milestone Growth Table

For each milestone year `y` in `[5, 10, 15, 20, final]`:
```typescript
const fvAtYear = futureValue(principal, monthlyContribution, rate, freq, y);
const contributedAtYear = principal + monthlyContribution * 12 * y;
const interestAtYear = fvAtYear - contributedAtYear;
const growthPercent = (fvAtYear / contributedAtYear - 1) * 100;
// mini bar: 20 chars total, filled proportional to interest share
const barWidth = 20;
const filled = Math.min(barWidth, Math.round((interestAtYear / fvAtYear) * barWidth));
const bar = '█'.repeat(filled) + '░'.repeat(barWidth - filled);
```

#### Time-to-Goal (binary search)

For each target `$100K / $500K / $1M`:
```typescript
function yearsToTarget(target: number, ...inputs): number {
  // Find smallest t in [0, 50] where futureValue(...) >= target
  // Linear search with 0.5-year resolution is sufficient for display
  if (futureValue(...inputs, 50) < target) return Infinity;
  for (let t = 0.5; t <= 50; t += 0.5) {
    if (futureValue(...inputs, t) >= target) return t;
  }
  return Infinity;
}
```

#### Health Thresholds

```typescript
function rateHealth(rate: number): { emoji: string; label: string } {
  if (rate >= 7) return { emoji: '🟢', label: 'strong (S&P 500 historical)' };
  if (rate >= 4) return { emoji: '🟡', label: 'average (HYSA / CDs)' };
  if (rate >= 1) return { emoji: '🟠', label: 'low (basic savings account)' };
  return { emoji: '🔴', label: 'below inflation — consider alternatives' };
}
```

### Edge Cases

| Scenario | Behavior |
|---|---|
| `rate = 0` | FV = P + PMT×12×years (no growth); What-If section shows rate increase as dominant lever |
| `principal = 0, PMT > 0` | Pure contribution growth; labeled "starting from $0" |
| `years = 0` | FV = principal; "Set years > 0 to see growth projection" |
| `years > 50` | Clamp to 50 (UI safety); V2 may extend |
| `annualRate > 50` | Clamp display but compute accurately; warning emoji |
| All inputs = 0 | Show "Enter inputs to see projection" message (not error) |
| Negative inputs | Coerce to 0 (UI prevents negatives via `min` attr) |

### What-If Scenarios (5)

1. **Add $100/mo extra**: `futureValue(P, PMT+100, rate, freq, years)` - FV
2. **Increase rate by 1%**: `futureValue(P, PMT, rate+1, freq, years)` - FV
3. **Extend period by 5 years**: `futureValue(P, PMT, rate, freq, years+5)` - FV
4. **Switch to monthly compounding** (if currently annual): difference in dollars
5. **Delay start by 1 year**: `FV - futureValue(P, PMT, rate, freq, years-1)` (cost of procrastination)

### Tip Variants

The Tip is dynamically chosen based on inputs:

| Trigger | Tip text |
|---|---|
| `years >= 30` | "Time in the market beats timing the market. $X/mo for 30 years at Y% builds $Z. Starting 10 years earlier doubles the final balance." |
| `principal = 0 && PMT > 0` | "Starting from $0 is fine — the habit of consistent contributions matters more than the seed amount. $X/mo for Y years builds $Z." |
| `rate < 1%` | "At Y% you're likely below inflation (currently ~3%). Consider HYSA, I-bonds, or index funds to keep pace." |
| Default | "Compounding multiplies money over time. Reinvest all interest — withdrawal breaks the chain. The rate tier you've selected (Z) compounds most effectively over Y+ years." |

---

## Components & Files

### New code (~250 lines, single file)

**File: `src/engines/investment/compound-interest-calculator.ts`**

Structure (following `time-value-calculator.ts` pattern):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// === Pure math functions (testable) ===
function futureValue(...): number { /* see Math Model */ }
function simpleFinalValue(...): number { /* see Math Model */ }
function yearsToTarget(...): number { /* see Math Model */ }
function rateHealth(...): { emoji; label } { /* see Math Model */ }

// === calculate function (server-side + static example generation) ===
function calculateCompoundInterest(inputs: Record<string, string>): string[] {
  // Parse inputs
  // Compute all metrics
  // Build 9-section output string (with emojis, dividers, bar charts)
  // Push to results[]
  return results;
}

// === customFn (minified JS, runs in browser via new Function) ===
const customFn =
  "var p=parseFloat(inputs.principal)||0;" +
  "var mc=parseFloat(inputs.monthlyContribution)||0;" +
  // ... (full minified version of calculate logic)
  "return results;";

// === Engine definition ===
const engine: ToolEngine = {
  slug: 'solopreneur-compound-interest-calculator',
  title: 'Compound Interest Calculator',
  description: 'See how your savings grow with compound interest. Model principal + monthly contributions, compare annual vs monthly compounding, and project your final balance at 5 milestones.',
  inputs: [
    { name: 'principal', label: 'Initial Deposit ($)', placeholder: 'e.g. 10000', type: 'number' },
    { name: 'monthlyContribution', label: 'Monthly Contribution ($)', placeholder: 'e.g. 500', type: 'number' },
    { name: 'annualRate', label: 'Annual Interest Rate (%)', placeholder: 'e.g. 7', type: 'number' },
    { name: 'compoundFrequency', label: 'Compounding Frequency', placeholder: '', type: 'select', options: ['annually', 'monthly'] },
    { name: 'years', label: 'Investment Period (years)', placeholder: 'e.g. 20', type: 'number' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs: Record<string, string>): string[] {
    return calculateCompoundInterest(inputs);
  },
  staticExamples: [ /* generated by codegen-examples.mjs */ ],
  faq: [ /* 5 Q&A entries */ ],
  howToUse: [ /* 5 steps */ ],
};
registerEngine(engine);
```

### Modified code

**None.** Engine is fully self-contained. No registry / type / component changes needed. No new dependencies. (Note: `inputs` field already supports `type: 'select'` per CLAUDE.md — verify by reading an existing select-type engine or `core/engines/types.ts`.)

### Unchanged infrastructure

- `src/core/engines/types.ts` — `ToolEngine` shape unchanged
- `src/core/engines/registry.ts` — registry unchanged
- `src/i18n/translations.ts` — calculator title/description English strings; no new i18n keys needed (calculator is English-only at v3 standard — verify existing calculators don't have zh mirrors)
- `src/pages/[lang]/[slug].astro` — auto-discovers new engine via `registerEngine()` import
- `src/scripts/codegen-examples.mjs` — will auto-regenerate `staticExamples[0]` after calculate() is finalized
- `scripts/codegen-examples.mjs --check` — must pass in pre-commit

### Total

| Metric | Value |
|---|---|
| New files | 1 |
| Modified files | 0 |
| Approx LoC | 250 (engine file: 50 math + 100 calculate + 80 customFn minified + 20 engine) |
| New tests | 4 (see Test Plan) |
| New dependencies | 0 |

---

## Data Flow

```
User loads /en/compound-interest-calculator
  ↓
Astro page renders [slug].astro
  ↓
Astro imports all engines (eager import via index.ts)
  ↓
registerEngine(ourEngine) runs at import time
  ↓
Astro calls engine.generate(staticInputs) for SSR rendering
  ↓
calculateCompoundInterest(staticInputs) returns string[]
  ↓
HTML embeds string[0] as initial display
  ↓
User changes input → browser customFn runs → updates DOM
  ↓
customFn = minified JS string, executed via new Function('inputs', 'pick', 'fill', customFn)
```

No backend calls. No Supabase / Clerk interaction. Pure client-side math.

---

## Error Handling

| Error source | Behavior |
|---|---|
| `Math.pow` overflow (rate=1000%, years=50) | Cap display at $999,999,999,999 |
| `yearsToTarget` linear search misses | Return "Never (within 50 years)" — explicit message |
| All inputs = 0 | Output "Enter inputs above to see projection" |
| `annualRate < 0` | Coerce to 0 (UI min=0); no negative rate warning |
| `principal < 0` | Coerce to 0 |
| `monthlyContribution < 0` | Coerce to 0 |
| Browser `customFn` parse error | **CRITICAL** — page silently fails (per CLAUDE.md note). Use `node tests/scripts/test-customFn.mjs <slug>` to verify. Watch for `}}if(...)` ASI trap. |
| `codegen-examples.mjs --check` drift | Run `node scripts/codegen-examples.mjs` to regen `staticExamples[0]` |

---

## Test Plan (4 tests)

`tests/compound-interest.test.ts` (new file, follows P3-1 lesson: per-test child process isolation):

| Test | Input | Expected |
|---|---|---|
| 1. Pure principal, annual compounding | P=$10000, PMT=$0, rate=5%, freq=annually, years=10 | FV ≈ $16,288.95 (standard textbook answer) |
| 2. Principal + monthly contributions, monthly compounding | P=$10000, PMT=$500, rate=7%, freq=monthly, years=20 | FV ≈ $301,706 (verify against Investopedia) |
| 3. Zero rate edge case | P=$10000, PMT=$500, rate=0%, freq=monthly, years=10 | FV = $70,000 (no growth) |
| 4. yearsToTarget convergence | P=$0, PMT=$500, rate=7%, freq=monthly | Years to $100K ≈ 11.3 (verify with golden test) |

**Math validation source:** Investor.gov compound interest calculator, Investopedia compound interest calculator, or formula `FV = P(1+r/n)^(nt) + PMT × [((1+r/n)^(nt) - 1) / (r/n)]` cross-checked.

---

## V2 (out of scope, record for future)

| Feature | Why deferred |
|---|---|
| Quarterly / daily compounding | YAGNI — gap to monthly is <0.1% over 20 years |
| Inflation / real return adjustment | Separate calculator in gap pipeline (#future-personal-finance) |
| Tax drag modeling (capital gains, dividend tax) | Significant complexity; affects FV meaningfully for taxable accounts |
| Currency selection (USD/EUR/CNY) | Independent i18n concern; V1 is USD with zh locale label only |
| CSV export of full year-by-year table | Useful but adds export plumbing; deferred to "data export" sub-project |
| Begin-of-period annuity (PMT at start of month) | Mathematically different by ~0.5% over long horizons; ordinary annuity is industry standard |
| Real-time stock / bond data integration | Out of scope — this is a calculator, not a tracker |
| Withdrawal modeling (de-accumulation phase) | "FIRE calculator" territory; large separate calculator |
| Multi-account / portfolio aggregation | Scope creep; defer to portfolio tracker |
| Goal-based scenarios ("Save for $X by year Y") | Could be added as preset chip; V2 polish |

---

## Open Questions for User Review

> **Q1: Input scope.** I picked savings-style (principal + monthly contribution). Alternative was lump-sum-only (textbook formula). If you prefer lump-sum-only, calculator becomes ~50 lines simpler but covers only ~30% of user searches.
>
> **Q2: Compounding frequency.** I picked annual + monthly. Alternative was full set (annual/quarterly/monthly/daily) — adds 2 dropdown options but quarterly/daily usage is <5% of queries.
>
> **Q3: Category placement.** I placed under `src/engines/investment/` (alongside `time-value-calculator`). Alternative was new `src/engines/personal-finance/` folder. The latter requires creating a new category and updating `index.ts` registry.
>
> **Q4: V2 features priority.** If you want any V2 item pulled into V1 (e.g., real return with inflation), say so before I write the plan.

Defaults if no response: Q1=savings-style, Q2=annual+monthly, Q3=investment/, Q4=V2 stays deferred.