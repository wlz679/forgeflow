# P4-4 Burn Multiple / Rule of 40 Calculator Design

**Date:** 2026-07-03
**Status:** DRAFT (brainstorming)
**Author:** Claude (subagent-driven-development orchestrator)
**Context:** P4 sub-project 4/6 — extend 35 v3-standard calculators with SaaS efficiency metrics. Closes SEO gap for "burn multiple calculator" / "rule of 40 calculator" / "SaaS efficiency metrics" / "capital efficiency".

---

## Executive Summary

Add a **Burn Multiple / Rule of 40 Calculator** to the **Valuation** category (alongside `saas-valuation-calculator`, `stripe-fee-calculator`, `safe-convertible-note-calculator`). Single self-contained engine file following v3 standard.

**Scope (V1, ~280 lines, single task):**

| Element | Decision |
|---|---|
| **Input model** | Revenue growth % + profit margin % + net burn ($) + net new ARR ($) — 4 fields |
| **Output model** | Metrics snapshot · Rule of 40 result · Burn Multiple result · Capital efficiency · SaaS health quadrant · 5 what-if scenarios · 3 conditional tips · 5 SEO comparison rows |
| **Math** | `Rule of 40 = growthRate% + profitMargin%` (must be ≥ 40 to pass); `Burn Multiple = netBurn / netNewARR` (lower is better; <1 = great) |
| **Visual elements** | ASCII quadrant chart (growth × margin) + 🟢🟡🟠🔴 for both metrics; comparison rows at 5 growth/margin combos |
| **Category** | Valuation (categoryId `C`) — file: `src/engines/valuation/burn-multiple-rule-of-40-calculator.ts` |
| **i18n** | en + zh (auto-translates via existing pipeline) |

**V2 deferred (out of scope):**
- Magic Number analysis (sales efficiency)
- LTV/CAC payback period
- Months of runway
- Net Dollar Retention
- Cohort analysis
- ARR breakdowns (new / expansion / contraction / churn)

---

## Background

### Why this calculator

SaaS founders and investors track **capital efficiency** — how much cash you burn to grow ARR. Two key metrics dominate the conversation:

1. **Burn Multiple** (coined by David Sacks, Craft Ventures): `Net Burn / Net New ARR`. Tells you how many dollars of cash you burn to add $1 of ARR. Lower is better.
2. **Rule of 40** (Bessemer Venture Partners): `Revenue Growth % + Profit Margin %`. If the sum is ≥ 40, the SaaS is "efficient enough" — high growth can offset low margins, and vice versa.

Both are headline metrics that VCs look at first. Every founder should be able to compute and improve them.

**Search volume proxies** (independent estimate):
- "burn multiple calculator" — 2K-5K monthly searches
- "rule of 40 calculator" — 3K-8K monthly
- "SaaS efficiency metrics" — 1K-3K monthly
- "capital efficiency SaaS" — 1K-2K monthly
- "burn multiple by stage" — 500-2K monthly

### Why both metrics in one calculator

Burn Multiple and Rule of 40 are complementary:
- **Burn Multiple** is backward-looking ("how efficient was my spending last quarter?")
- **Rule of 40** is forward-looking ("is my growth + margin trajectory sustainable?")

Founders need both. Combining them in one tool saves user friction (one calculator vs two) and lets us show the **SaaS health quadrant** — a 2×2 that places you in one of 4 quadrants:
1. **Stars** (high growth + positive margin): 🟢 unicorn territory
2. **Growers** (high growth + negative margin): 🟡 typical VC-backed SaaS
3. **Profitable Plowhorses** (low growth + positive margin): 🟡 mature SaaS
4. **Zombies** (low growth + negative margin): 🔴 trouble

### Why 4 inputs, not more

Minimum useful set:
- **Revenue growth %** (year-over-year or annualized)
- **Profit margin %** (EBITDA, can be negative)
- **Net burn ($)** — total cash spent in period
- **Net new ARR ($)** — ARR added in period

4 inputs is enough to compute both metrics. ARR (total) is contextual; user can derive it.

---

## V1 Design

### Input Model (4 fields)

| Field | Type | Default | Placeholder | Notes |
|---|---|---|---|---|
| `revenueGrowth` | number | 100 | e.g. 100 | YoY or annualized growth % |
| `profitMargin` | number | -20 | e.g. -20 | EBITDA margin % (can be negative) |
| `netBurn` | number | 2000000 | e.g. 2000000 | Net cash burned in period (USD) |
| `netNewARR` | number | 1500000 | e.g. 1500000 | ARR added in period (USD) |

**Defaults rationale:**
- `100% growth` — typical early-stage SaaS
- `-20% margin` — burning cash to grow
- `$2M net burn` — moderate burn for seed/Series A
- `$1.5M new ARR` — Burn Multiple = 1.33 (good)

### Output Model (v3 Business variant)

**9 sections, each with emoji header + `━━━━━` divider:**

1. **⏰ Burn Multiple / Rule of 40 Calculator** (title block)
2. **💰 Metrics Snapshot**
   - Revenue Growth: X%
   - Profit Margin: X%
   - Net Burn: $X
   - Net New ARR: $X
   - Period: implied (default: quarterly)
3. **📐 Rule of 40 Result**
   - Sum: growth% + margin% = X%
   - Verdict: 🟢 PASS (≥40) / 🟡 borderline (25-40) / 🟠 below (10-25) / 🔴 fail (<10)
   - Component breakdown: "Growth X% + Margin Y% = Z%"
4. **🩺 Burn Multiple Result**
   - Ratio: $X burned per $1 of new ARR
   - Verdict: 🟢 great (<1) / 🟡 good (1-1.5) / 🟠 concerning (1.5-3) / 🔴 inefficient (>3)
   - Capital efficiency: "Each $1 of new ARR costs $X in cash"
5. **🎯 SaaS Health Quadrant**
   - Quadrant: 🟢 Stars / 🟡 Growers / 🟡 Profitable Plowhorses / 🔴 Zombies
   - ASCII 2×2 chart with current position marked
6. **⚖️ Capital Efficiency Benchmarks**
   - By stage: Seed (Burn Multiple ~1-2 is great), Series A (~1-1.5 is great), Series B+ (<1 is great)
   - Your ratio: $X per $1 ARR
   - vs. median SaaS at stage: better/worse
7. **🔄 What-If Scenarios** (5 variations)
   - 2× growth (same burn, 2× new ARR) → Burn Multiple halves
   - Improve margin by 20pp → Rule of 40 changes
   - Cut burn 50% → Burn Multiple halves
   - Add $5M ARR (same burn) → Burn Multiple 0.4
   - Aim for "great" (Burn Multiple <1) — required ARR / required burn cut
8. **💡 Tip** (3 conditional variants)
   - Default: "Healthy SaaS hits Rule of 40 with Burn Multiple <1.5. If you're <1, you're top-quartile. If >3, fix the model or extend runway before raising."
   - Burn Multiple >3: "Inefficient. Either cut non-revenue-generating spend (overhead, R&D) or invest more in sales/marketing efficiency."
   - Rule of 40 <0: "Below 0% — burning cash without growing fast enough. Refocus on product-market fit or fundraising."
9. **5 Comparison Rows** (SEO long-tail): at growth 50%/100%/150%/200%/300% × margin -50%/-20%/0%

### Math Model

#### Rule of 40

```typescript
function ruleOf40Score(growthRate: number, profitMargin: number): number {
  return growthRate + profitMargin;
}

function ruleOf40Health(score: number): { emoji: string; label: string } {
  if (score >= 40) return { emoji: '🟢', label: 'PASS — top-quartile efficiency' };
  if (score >= 25) return { emoji: '🟡', label: 'borderline — close to Rule of 40' };
  if (score >= 10) return { emoji: '🟠', label: 'below — needs improvement' };
  return { emoji: '🔴', label: 'fail — burning without growth' };
}
```

#### Burn Multiple

```typescript
function burnMultiple(netBurn: number, netNewARR: number): number {
  if (netNewARR <= 0) return Infinity;
  return netBurn / netNewARR;
}

function burnMultipleHealth(ratio: number): { emoji: string; label: string } {
  if (ratio < 1) return { emoji: '🟢', label: 'great — <$1 burned per $1 ARR' };
  if (ratio < 1.5) return { emoji: '🟡', label: 'good — efficient growth' };
  if (ratio < 3) return { emoji: '🟠', label: 'concerning — needs tightening' };
  return { emoji: '🔴', label: 'inefficient — too much burn' };
}
```

#### SaaS Health Quadrant

```typescript
function saasQuadrant(growthRate: number, profitMargin: number): { emoji: string; label: string } {
  const highGrowth = growthRate >= 40;
  const positiveMargin = profitMargin >= 0;
  if (highGrowth && positiveMargin) return { emoji: '🟢', label: 'Stars (high growth + positive margin)' };
  if (highGrowth && !positiveMargin) return { emoji: '🟡', label: 'Growers (high growth + negative margin)' };
  if (!highGrowth && positiveMargin) return { emoji: '🟡', label: 'Profitable Plowhorses (low growth + positive margin)' };
  return { emoji: '🔴', label: 'Zombies (low growth + negative margin)' };
}
```

#### Capital Efficiency Stage Benchmarks

| Stage | Burn Multiple (great) | Burn Multiple (good) | Burn Multiple (concerning) |
|---|---|---|---|
| Seed | <2 | 2-3 | >3 |
| Series A | <1.5 | 1.5-2 | >2 |
| Series B+ | <1 | 1-1.5 | >1.5 |

```typescript
function stageBenchmark(ratio: number, stage: 'seed' | 'a' | 'b'): string {
  const benchmarks = {
    seed: { great: 2, good: 3 },
    a: { great: 1.5, good: 2 },
    b: { great: 1, good: 1.5 },
  };
  const b = benchmarks[stage];
  if (ratio < b.great) return '🟢 top-quartile for ' + stage;
  if (ratio < b.good) return '🟡 on par for ' + stage;
  return '🟠 above median for ' + stage;
}
```

### Edge Cases

| Scenario | Behavior |
|---|---|
| All inputs = 0 | Show "Enter inputs above to see Rule of 40 and Burn Multiple" |
| `netNewARR = 0` (no growth) | Burn Multiple = Infinity; show "no new ARR — Burn Multiple is infinite" |
| `netNewARR < 0` (churn > new) | Burn Multiple is meaningless; show "negative net new ARR" |
| `netBurn = 0` (profitable) | Burn Multiple = 0; Rule of 40 depends on growth |
| `netBurn < 0` (cash flow positive) | Burn Multiple negative; show "you're net cash positive" |
| Very large `netBurn` (> $100M) | Cap display, flag "unusually large" |
| Negative `revenueGrowth` (revenue declining) | Show "revenue declining" warning |

### What-If Scenarios (5)

1. **2× growth** (same burn, 2× new ARR): e.g., $1.5M → $3M → Burn Multiple halves
2. **Improve margin by 20pp**: e.g., -20% → 0% → Rule of 40 +20
3. **Cut burn 50%**: e.g., $2M → $1M → Burn Multiple halves
4. **Add $5M ARR** (same burn): Burn Multiple becomes very low
5. **Aim for "great" (Burn Multiple <1)**: compute required ARR or required burn cut

### Tip Variants

| Trigger | Tip text |
|---|---|
| `burnMultiple > 3` | "Inefficient. Either cut non-revenue-generating spend (overhead, R&D) or invest more in sales/marketing efficiency." |
| `ruleOf40 < 0` | "Below 0% — burning cash without growing fast enough. Refocus on product-market fit or fundraising." |
| `ruleOf40 >= 40 && burnMultiple < 1.5` | "Top-quartile efficiency. Use this in your fundraising narrative and consider raising at premium valuation." |
| Default | "Healthy SaaS hits Rule of 40 with Burn Multiple <1.5. If you're <1, you're top-quartile. If >3, fix the model or extend runway before raising." |

### ASCII Quadrant Chart

```
                Margin →
              Negative        Positive
            ┌─────────────┬─────────────┐
Growth High │  Growers 🟡  │   Stars 🟢  │
            │  (you're here)
            ├─────────────┼─────────────┤
       Low  │  Zombies 🔴  │  Plowhorses │
            │              │    🟡       │
            └─────────────┴─────────────┘
```

---

## Components & Files

### New code (~280 lines, single file)

**File: `src/engines/valuation/burn-multiple-rule-of-40-calculator.ts`**

Structure (follows `safe-convertible-note-calculator.ts` pattern exactly):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// === Pure math functions (exported for tests) ===
export function ruleOf40Score(growthRate: number, profitMargin: number): number { ... }
export function ruleOf40Health(score: number): { emoji: string; label: string } { ... }
export function burnMultiple(netBurn: number, netNewARR: number): number { ... }
export function burnMultipleHealth(ratio: number): { emoji: string; label: string } { ... }
export function saasQuadrant(growthRate: number, profitMargin: number): { emoji: string; label: string } { ... }
export function stageBenchmark(ratio: number, stage: 'seed' | 'a' | 'b'): string { ... }

// === calculate() — server-side + static example generation ===
function calculateBurnMultiple(inputs: Record<string, string>): string[] { /* 9-section output */ }

// === customFn (minified JS, runs in browser via new Function) ===
const customFn = "/* minified equivalent — must mirror calculateBurnMultiple logic exactly */";

// === Engine definition ===
const engine: ToolEngine = {
  slug: 'solopreneur-burn-multiple-rule-of-40-calculator',
  title: 'Burn Multiple / Rule of 40 Calculator',
  description: '...',
  inputs: [/* 4 fields */],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculateBurnMultiple(inputs); },
  staticExamples: [/* codegen-regenerated */],
  faq: [/* 5 Q&A */],
  howToUse: [/* 5 steps */],
};
registerEngine(engine);
```

### Modified code (per P4-1/P4-2/P4-3 lesson, plan scope extended to match existing pattern)

| File | Action | LoC | Purpose |
|---|---|---|---|
| `src/engines/valuation/index.ts` | Modify | +1 | Add `import './burn-multiple-rule-of-40-calculator';` |
| `scripts/codegen-examples.mjs` | Modify | +2 | Add entry to `ENGINES` array with default inputs |
| `src/data/tools/valuation.ts` | Modify | +12 | Add `ToolMeta` entry (categoryId C, slug, title, description, **structured `ToolInput[]`** per P4-2 lesson, keywords, tags, sources) |
| `src/data/og-samples.json` | Modify | +5 | Add OG image sample (headline + headlineUnit + headlineLabel) |
| `tests/ab-split.test.ts` | Modify | +0 | Bump engine count 35 → 36 |
| `tests/internal-links.test.ts` | Modify | +0 | Bump engine count 35 → 36 |

### Unchanged infrastructure

- `src/core/engines/types.ts` — `ToolEngine` shape unchanged
- `src/core/engines/registry.ts` — registry unchanged
- `src/i18n/translations.ts` — calculator title/description English strings; no new keys
- `src/pages/[lang]/[slug].astro` — auto-discovers new engine via `registerEngine()` import

### Total

| Metric | Value |
|---|---|
| New files | 2 (engine + test) |
| Modified files | 6 (1 + 5 wiring) |
| Approx LoC | 280 (engine file) + 100 (test) + 20 wiring |
| New tests | 5 (see Test Plan) |
| New dependencies | 0 |

---

## Data Flow

```
User loads /en/burn-multiple-rule-of-40-calculator
  ↓
Astro page renders [slug].astro
  ↓
Astro imports all engines (eager import via index.ts)
  ↓
registerEngine(ourEngine) runs at import time
  ↓
Astro calls engine.generate(staticInputs) for SSR rendering
  ↓
calculateBurnMultiple(staticInputs) returns string[]
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
| All inputs = 0 | Show "Enter inputs above to see Rule of 40 and Burn Multiple" |
| `netNewARR = 0` | Burn Multiple = Infinity; show "no new ARR — Burn Multiple is infinite" |
| `netNewARR < 0` | Show "negative net new ARR" warning |
| `netBurn = 0` | Burn Multiple = 0 (great); show "net cash flow positive" |
| `netBurn < 0` | Show "net cash positive — you're profitable" |
| Very large `netBurn` | Cap display, flag "unusually large" |
| Browser `customFn` parse error | **CRITICAL** — page silently fails. Use `node tests/scripts/test-customFn.mjs <slug>` to verify. |
| `codegen-examples.mjs --check` drift | Run `node scripts/codegen-examples.mjs` to regen `staticExamples[0]` |

---

## Test Plan (5 tests)

`tests/burn-multiple.test.ts` (new file):

| Test | Input | Expected |
|---|---|---|
| 1. Rule of 40 PASS | Growth 100%, Margin -50% | Score 50%, 🟢 PASS |
| 2. Rule of 40 borderline | Growth 50%, Margin -10% | Score 40%, 🟢 PASS (exactly 40) |
| 3. Rule of 40 fail | Growth 20%, Margin -50% | Score -30%, 🔴 fail |
| 4. Burn Multiple great | Burn $1M, ARR $2M | Ratio 0.5, 🟢 great |
| 5. Burn Multiple infinite when ARR=0 | Burn $2M, ARR $0 | Ratio Infinity, special handling |

Math verification:
- Test 1: 100 + (-50) = 50 ≥ 40 → 🟢 PASS ✓
- Test 2: 50 + (-10) = 40 ≥ 40 → 🟢 PASS (boundary) ✓
- Test 3: 20 + (-50) = -30 < 10 → 🔴 fail ✓
- Test 4: 1M / 2M = 0.5 < 1 → 🟢 great ✓
- Test 5: 2M / 0 = Infinity → special handling ✓

---

## V2 (out of scope, record for future)

| Feature | Why deferred |
|---|---|
| Magic Number (sales efficiency) | Different metric, different input model |
| LTV/CAC payback | Different input model (LTV, CAC, ARPU) |
| Months of runway | Just (cash / burn) — too simple for V1 |
| Net Dollar Retention | Cohort-based, needs retention curves |
| Cohort analysis | Same as above |
| ARR breakdown (new/expansion/churn) | Decomposes existing metric, not a new one |

---

## Open Questions for User Review

> **Q1: Input scope.** I picked 4 fields (growth, margin, net burn, net new ARR). Alternative: simpler 2-field (growth, margin) for Rule of 40 only. If you want fewer inputs and split into 2 calculators, say so.
>
> **Q2: Period.** I model the period as "implied quarterly" in the output. Alternative: add a 5th input for period (monthly/quarterly/annual). The math is the same, but the labels change.
>
> **Q3: Stage benchmark.** I include Seed/Series A/Series B+ benchmarks but don't ask for stage as input. Default: show all 3 in the output. If you want a single stage as input, say so.
>
> **Q4: V2 features priority.** If you want any V2 item pulled into V1 (e.g., Magic Number), say so.

Defaults if no response: Q1=4 fields (both metrics), Q2=implied quarterly, Q3=show all 3 stages, Q4=V2 stays deferred.

---

## Plan Execution Checklist (lessons from P4-1/P4-2/P4-3)

The implementer must do ALL of these:

1. ✅ Create `src/engines/valuation/burn-multiple-rule-of-40-calculator.ts`
2. ✅ Create `tests/burn-multiple.test.ts`
3. ✅ Add import to `src/engines/valuation/index.ts`
4. ✅ Add ENGINES entry to `scripts/codegen-examples.mjs`
5. ✅ Add ToolMeta entry to `src/data/tools/valuation.ts` — **use `ToolInput[]` structured form, NOT string array** (P4-2 lesson)
6. ✅ Add OG sample to `src/data/og-samples.json`
7. ✅ Bump engine count in `tests/ab-split.test.ts` + `tests/internal-links.test.ts` (35 → 36)
8. ✅ Run `node tests/scripts/test-customFn.mjs valuation/burn-multiple-rule-of-40-calculator` → OK
9. ✅ Run `node scripts/codegen-examples.mjs` → regenerate staticExamples[0]
10. ✅ Run `node scripts/codegen-examples.mjs --check` → exit 0
11. ✅ Run `pnpm test:unit` → pass
12. ✅ Run `pnpm build` → 166 pages succeed (was 165 + 1 = 166)
13. ✅ Pre-flight: **apply any math-helper fixes to BOTH the math helper AND the customFn mirror** (P4-2 lesson)
14. ✅ Commit + push to gitee + github

**Process change for P4-3+ (controller direct execution):** For well-specified [MECHANICAL] plans with code-level detail, controller can execute directly without subagent dispatch. Faster + lower token cost. Skip if plan has unclear spec or [INTEGRATION] complexity.
