# P4-6 ARR Multiple / Valuation Multiplier Calculator Design

**Date:** 2026-07-03
**Status:** DRAFT (brainstorming)
**Author:** Claude (subagent-driven-development orchestrator)
**Context:** P4 sub-project 6/6 — extend 37 v3-standard calculators with SaaS valuation framework. Closes SEO gap for "ARR multiple calculator" / "SaaS valuation multiple" / "revenue multiple" / "valuation to ARR ratio". **Final P4 calculator.**

---

## Executive Summary

Add an **ARR Multiple / Valuation Multiplier Calculator** to the **Valuation** category (alongside `saas-valuation-calculator`, `stripe-fee-calculator`, `safe-convertible-note-calculator`, `burn-multiple-rule-of-40-calculator`). Single self-contained engine file following v3 standard.

**Scope (V1, ~280 lines, single task):**

| Element | Decision |
|---|---|
| **Input model** | ARR ($) + Valuation ($) + Growth rate (%) + Profit margin (%) — 4 fields |
| **Output model** | Valuation snapshot · Multiple determination · Health vs expected · Stage benchmarks · Forward valuation · 5 what-if scenarios · 3 conditional tips · 5 SEO comparison rows |
| **Math** | `multiple = valuation / ARR`; `expectedMultiple = 5 + growthRate/10 + profitMargin/5`; health = actualMultiple vs expectedMultiple ratio |
| **Visual elements** | ASCII bar showing actual vs expected multiple + 🟢🟡🟠🔴 health; comparison rows at 5 ARR levels |
| **Category** | Valuation (categoryId `C`) — file: `src/engines/valuation/arr-multiple-valuation-calculator.ts` |
| **i18n** | en + zh (auto-translates via existing pipeline) |

**V2 deferred (out of scope):**
- EV/Revenue, EV/EBITDA, P/E for public SaaS
- DCF valuation modeling
- Comparable company analysis
- Forward multiples (NTM revenue)
- Gross margin adjustment
- Cohort / retention multipliers

---

## Background

### Why this calculator

The SaaS valuation conversation centers on one number: **ARR multiple** (valuation / ARR). This is the headline metric VCs use to compare companies. A startup with $5M ARR raising at $50M is at a 10x multiple. A startup at $100M ARR raising at $2B is at 20x. The multiple depends on:
- **Growth rate** (faster growth = higher multiple)
- **Profit margin** (higher margin = higher multiple)
- **Retention** (high NRR = higher multiple, but not modeled in V1)
- **Market** (vertical SaaS vs horizontal)

Founders and investors need a quick tool: "given my ARR + growth + margin, what's a fair multiple? Is my last round above or below market?"

**Search volume proxies** (independent estimate):
- "ARR multiple calculator" — 2K-5K monthly
- "SaaS valuation multiple" — 3K-8K monthly
- "revenue multiple SaaS" — 2K-5K monthly
- "valuation to ARR ratio" — 1K-3K monthly
- "SaaS multiples by growth rate" — 1K-2K monthly

### Why 4 inputs, not more

Minimum useful set:
- **ARR** — the metric to be valued
- **Valuation** — the actual or proposed number
- **Growth rate** — drives the multiple (most important variable)
- **Profit margin** — secondary driver

Retention/NRR is the third major driver but harder to model (cohorts, not a single number). Deferred to V2.

### Why "expected multiple" formula is heuristic

There's no industry-standard formula for ARR multiple. Public SaaS trades at 5-20x revenue depending on growth, but private rounds can be 10-50x for hyper-growth. The formula `expected = 5 + growth/10 + margin/5` is a rough heuristic:
- Slow growth (10%): 5 + 1 + 0 = 6x (for 0% margin)
- Medium growth (50%): 5 + 5 + 0 = 10x
- Fast growth (100%): 5 + 10 + 0 = 15x
- Hyper growth (200%): 5 + 20 + 0 = 25x
- Each 5% margin = +1x (e.g., 50% growth + 20% margin = 5 + 5 + 4 = 14x)

This matches industry rules of thumb (e.g., ICONIQ Growth's SaaS benchmarks show ~10x for 50% growth, ~15x for 100% growth, ~20x for 150%+).

---

## V1 Design

### Input Model (4 fields)

| Field | Type | Default | Placeholder | Notes |
|---|---|---|---|---|
| `arr` | number | 1000000 | e.g. 1000000 | Annual Recurring Revenue (USD) |
| `valuation` | number | 15000000 | e.g. 15000000 | Current or proposed valuation (USD) |
| `growthRate` | number | 50 | e.g. 50 | Annual revenue growth rate (%) |
| `profitMargin` | number | 0 | e.g. 0 or -10 | EBITDA margin % (can be negative) |

**Defaults rationale:**
- `$1M ARR` — typical early Series A
- `$15M valuation` — 15x multiple (typical for 50% growth)
- `50% growth` — common SaaS growth at this stage
- `0% margin` — breakeven (typical for growth-stage SaaS)

### Output Model (v3 Business variant)

**9 sections, each with emoji header + `━━━━━` divider:**

1. **⏰ ARR Multiple / Valuation Multiplier Calculator** (title block)
2. **💰 Valuation Snapshot**
   - ARR: $X
   - Valuation: $X
   - Multiple: X.XXx (valuation / ARR)
   - Rule of 40 context: if user enters it (optional, just show growth + margin sum)
3. **📐 Multiple Determination**
   - Growth contribution: growth/10 = X
   - Margin contribution: margin/5 = X
   - Base: 5x
   - Expected multiple: 5 + growth/10 + margin/5 = X.Xx
   - Actual multiple: X.XXx
4. **🩺 Multiple Health**
   - Actual vs expected ratio
   - 🟢 reasonable (within 30% of expected)
   - 🟡 above/below market (30-60% off)
   - 🟠 outlier (>60% off expected)
5. **🎯 Multiple Ranges by Stage**
   - Slow growth (<20%): 3-8x
   - Medium growth (20-50%): 8-15x
   - Fast growth (50-100%): 15-25x
   - Hyper growth (>100%): 25-40x
   - Your position: where you fall
6. **⚖️ Forward Valuation**
   - Projected ARR at next round (12 months out): $X × (1 + growthRate)
   - Implied forward multiple: valuation / projected ARR = X.Xx
   - At forward multiple of 10x (typical): target valuation = projected ARR × 10 = $X
7. **🔄 What-If Scenarios** (5 variations)
   - Double growth (100%): multiple rises to X.Xx
   - Improve margin by 20pp: multiple rises by 4x
   - Cut valuation 20%: multiple drops to X.Xx
   - Target 10x multiple: required valuation = ARR × 10 = $X
   - Sell at 20x multiple: required valuation = ARR × 20 = $X
8. **💡 Tip** (3 conditional variants)
   - Default: "ARR multiples depend on growth + margin. 50% growth + 0% margin = 10x is typical. Hyper-growth (100%+) trades at 20-30x. Profitable SaaS commands 2-4x premium over unprofitable peers."
   - Multiple >30x: "Hyper-growth premium. Make sure you can sustain 100%+ growth for 3+ years — investors will haircut your multiple if growth slows."
   - Multiple <5x: "Low multiple. Either growth is slow, retention is weak, or the market doesn't believe in the model. Cut burn and demonstrate PMF before next round."
9. **5 Comparison Rows** (SEO long-tail): at $500K / $1M / $5M / $10M / $50M ARR

### Math Model

#### ARR Multiple (simple ratio)

```typescript
function arrMultiple(valuation: number, arr: number): number {
  if (arr <= 0) return Infinity;
  return valuation / arr;
}

function expectedMultiple(growthRate: number, profitMargin: number): number {
  return 5 + growthRate / 10 + profitMargin / 5;
}

function multipleHealth(actual: number, expected: number): {
  emoji: string;
  label: string;
} {
  if (expected <= 0) return { emoji: '🟡', label: 'neutral (no expected baseline)' };
  const ratio = actual / expected;
  if (ratio >= 0.7 && ratio <= 1.3) return { emoji: '🟢', label: 'reasonable — within 30% of expected' };
  if (ratio >= 0.4 && ratio <= 1.6) return { emoji: '🟡', label: 'above/below market — 30-60% off expected' };
  return { emoji: '🟠', label: 'outlier — >60% off expected' };
}

function multipleTier(growthRate: number): {
  emoji: string;
  label: string;
  range: string;
} {
  if (growthRate < 20) return { emoji: '🟡', label: 'Slow growth', range: '3-8x' };
  if (growthRate < 50) return { emoji: '🟢', label: 'Medium growth', range: '8-15x' };
  if (growthRate < 100) return { emoji: '🟢', label: 'Fast growth', range: '15-25x' };
  return { emoji: '🟢', label: 'Hyper growth', range: '25-40x' };
}

function forwardValuation(valuation: number, arr: number, growthRate: number, forwardMultiple: number): number {
  // Projected ARR in 12 months
  const projectedARR = arr * (1 + growthRate / 100);
  return projectedARR * forwardMultiple;
}
```

#### Expected Multiple Heuristic

The `5 + growth/10 + margin/5` formula:
- Base 5x = mature profitable SaaS floor
- Each 10% growth adds 1x (linear in growth)
- Each 5% margin adds 1x

This matches industry rules of thumb reasonably well:
- 0% growth + 0% margin = 5x (mature, unprofitable)
- 50% growth + 0% margin = 10x
- 100% growth + 0% margin = 15x
- 100% growth + 20% margin = 19x
- 200% growth + 0% margin = 25x (hyper)

### Edge Cases

| Scenario | Behavior |
|---|---|
| `arr = 0` | Show "Enter ARR > 0 to see valuation multiples" |
| `valuation = 0` | Show "Enter valuation to see multiple" |
| `arr < 0` | Clamp to 0 |
| `valuation < 0` | Clamp to 0 |
| All inputs = 0 | Show "Enter inputs above to see multiple analysis" |
| `growthRate = 0` | Show base 5x baseline (no growth premium) |
| `growthRate = 300` | Cap at 35x expected (sanity check) |
| `profitMargin = -100` | factor becomes 0; show "100% loss is unsustainable" |

### What-If Scenarios (5)

1. **Double growth (100%)**: expected multiple = 5 + 100/10 + margin/5 = 15+ (assuming margin unchanged)
2. **Improve margin by 20pp**: expected multiple = base + growth/10 + (margin+20)/5 = +4x
3. **Cut valuation 20%**: actual multiple × 0.8
4. **Target 10x multiple**: required valuation = ARR × 10
5. **Sell at 20x**: required valuation = ARR × 20

### Tip Variants

| Trigger | Tip text |
|---|---|
| `multiple > 30` | "Hyper-growth premium. Make sure you can sustain 100%+ growth for 3+ years — investors will haircut your multiple if growth slows." |
| `multiple < 5` | "Low multiple. Either growth is slow, retention is weak, or the market doesn't believe in the model. Cut burn and demonstrate PMF before next round." |
| Default | "ARR multiples depend on growth + margin. 50% growth + 0% margin = 10x is typical. Hyper-growth (100%+) trades at 20-30x. Profitable SaaS commands 2-4x premium over unprofitable peers." |

### ASCII Multiple Bar

```
              Expected  Actual
Slow growth   3-8x      ─────────
Medium growth 8-15x     ───────────────
Fast growth   15-25x    ────────────────────
Hyper growth  25-40x    ────────────────────────────

Your position: 15.0x (Fast growth tier, at upper bound)
```

---

## Components & Files

### New code (~280 lines, single file)

**File: `src/engines/valuation/arr-multiple-valuation-calculator.ts`**

Structure (follows `burn-multiple-rule-of-40-calculator.ts` pattern exactly):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// === Pure math functions (exported for tests) ===
export function arrMultiple(...): number { ... }
export function expectedMultiple(...): number { ... }
export function multipleHealth(...): { emoji: string; label: string } { ... }
export function multipleTier(...): { emoji: string; label: string; range: string } { ... }
export function forwardValuation(...): number { ... }

// === calculate() — server-side + static example generation ===
function calculateARRMultiple(inputs: Record<string, string>): string[] { /* 9-section output */ }

// === customFn (minified JS, runs in browser via new Function) ===
const customFn = "/* minified equivalent — must mirror calculateARRMultiple logic exactly */";

// === Engine definition ===
const engine: ToolEngine = {
  slug: 'solopreneur-arr-multiple-valuation-calculator',
  title: 'ARR Multiple / Valuation Multiplier Calculator',
  description: '...',
  inputs: [/* 4 fields */],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculateARRMultiple(inputs); },
  staticExamples: [/* codegen-regenerated */],
  faq: [/* 5 Q&A */],
  howToUse: [/* 5 steps */],
};
registerEngine(engine);
```

### Modified code (per P4-1/P4-2/P4-3/P4-4/P4-5 lesson)

| File | Action | LoC | Purpose |
|---|---|---|---|
| `src/engines/valuation/index.ts` | Modify | +1 | Add `import './arr-multiple-valuation-calculator';` |
| `scripts/codegen-examples.mjs` | Modify | +2 | Add entry to `ENGINES` array |
| `src/data/tools/valuation.ts` | Modify | +12 | Add `ToolMeta` entry (categoryId C, with `ToolInput[]` structured form) |
| `src/data/og-samples.json` | Modify | +5 | Add OG image sample |
| `tests/ab-split.test.ts` | Modify | +0 | Bump engine count 37 → 38 |
| `tests/internal-links.test.ts` | Modify | +0 | Bump engine count 37 → 38 |

### Total

| Metric | Value |
|---|---|
| New files | 2 (engine + test) |
| Modified files | 6 (1 + 5 wiring) |
| Approx LoC | 280 (engine) + 100 (test) + 20 wiring |
| New tests | 5 (see Test Plan) |
| New dependencies | 0 |

---

## Test Plan (5 tests)

`tests/arr-multiple.test.ts` (new file):

| Test | Input | Expected |
|---|---|---|
| 1. Basic multiple calc | ARR $1M, val $15M | Multiple = 15x |
| 2. Expected multiple heuristic | 50% growth + 0% margin | Expected = 5 + 5 + 0 = 10x |
| 3. Health reasonable | Actual 10x, expected 10x | 🟢 reasonable |
| 4. Health outlier | Actual 30x, expected 10x | 🟠 outlier (3x expected) |
| 5. Forward valuation | ARR $1M, val $15M, growth 50%, forwardMult 10x | Forward val = $1M × 1.5 × 10 = $15M |
| 6. Multiple tier hyper | Growth 150% | Tier = Hyper (25-40x) |

Math verification:
- Test 1: 15M / 1M = 15 ✓
- Test 2: 5 + 50/10 + 0/5 = 10 ✓
- Test 3: ratio = 1.0 → 🟢 ✓
- Test 4: ratio = 3.0 → 🟠 ✓
- Test 5: 1M × 1.5 × 10 = 15M ✓
- Test 6: 150 ≥ 100 → Hyper tier ✓

---

## V2 (out of scope, record for future)

| Feature | Why deferred |
|---|---|
| NRR (Net Dollar Retention) | Third major driver; needs cohort math |
| Gross margin adjustment | Affects multiple by 5-10% |
| Market category multipliers | Vertical SaaS trades differently than horizontal |
| DCF valuation | Completely different model |
| Comparable company analysis | Needs external data feed |
| Forward multiples (NTM revenue) | Could add as 5th input |

---

## Open Questions for User Review

> **Q1: Input scope.** I picked 4 fields. Alternative: simpler 3-field (ARR + valuation + growthRate) without margin. The margin input is secondary but easy to add.
>
> **Q2: Expected multiple formula.** I used `5 + growth/10 + margin/5`. This is a rough heuristic. Alternative: lookup table by stage (seed/Series A/B/C). The formula is more flexible but less precise.
>
> **Q3: Health threshold.** I use ±30% = reasonable, 30-60% = above/below, >60% = outlier. Alternative: ±20% bands (stricter).
>
> **Q4: V2 features priority.** If you want any V2 item pulled into V1, say so.

Defaults if no response: Q1=4 fields, Q2=heuristic formula, Q3=±30% bands, Q4=V2 stays deferred.

---

## Plan Execution Checklist (lessons from P4-1 through P4-5)

The implementer must do ALL of these:

1. ✅ Create `src/engines/valuation/arr-multiple-valuation-calculator.ts`
2. ✅ Create `tests/arr-multiple.test.ts`
3. ✅ Add import to `src/engines/valuation/index.ts`
4. ✅ Add ENGINES entry to `scripts/codegen-examples.mjs`
5. ✅ Add ToolMeta entry to `src/data/tools/valuation.ts` — **use `ToolInput[]` structured form**
6. ✅ Add OG sample to `src/data/og-samples.json`
7. ✅ Bump engine count in `tests/ab-split.test.ts` + `tests/internal-links.test.ts` (37 → 38)
8. ✅ Run `node tests/scripts/test-customFn.mjs valuation/arr-multiple-valuation-calculator` → OK
9. ✅ Run `node scripts/codegen-examples.mjs` → regenerate staticExamples[0]
10. ✅ Run `node scripts/codegen-examples.mjs --check` → exit 0
11. ✅ Run `pnpm test:unit` → pass
12. ✅ Run `pnpm build` → 170 pages succeed (was 169 + 1 = 170)
13. ✅ Pre-flight: **apply any math-helper fixes to BOTH the math helper AND the customFn mirror**
14. ✅ Commit + push to gitee + github

**Process for P4-6 (final P4):** Controller direct execution per P4-4 lesson. Spec-as-plan. No subagent dispatch needed.

**P4 series completion:** P4-6 will be the 6th and final calculator in the P4 series. After P4-6 ships, the P4 series is complete and ready for the next product development initiative.