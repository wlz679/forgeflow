# P8 Sales / CRM Calculator Batch Design

**Date:** 2026-07-07
**Status:** DRAFT (brainstorming)
**Author:** Claude (controller direct execution, post P7 series)
**Context:** P8 sub-project — extend 56 v3-standard calculators with a **sales/CRM vertical-depth batch (6 engines)** in a new `sales/` category. Closes the funnel with P6 marketing analytics — Marketing fills the funnel, Sales closes it. Targets B2B SaaS founders, sales managers, and RevOps leads searching for "pipeline value", "sales velocity", "ACV", "win rate by stage", "quota attainment", "pipeline coverage" — 6 distinct sales-pipeline personas in one cluster.

---

## Executive Summary

| Element | Decision |
|---|---|
| **Batch size** | 6 engines (P8-1 through P8-6) — same size as P5/P6/P7 (38→44→50→56), takes us to **56→62** engines. **Total inputs across 6 calcs = 30** (8+4+4+8+3+3) |
| **Category** | New `src/engines/sales/` + `src/data/tools/sales.ts`; **`categoryId: 'S'`** (Sales / CRM — new letter; A/B/C/D/E/F/M/O all used) |
| **Audience** | B2B SaaS founders, sales managers, RevOps leads (10-person SMB SaaS, $1M–$5M ARR anchor) |
| **Coverage matrix** | Pipeline inventory (P8-1 Pipeline Value, P8-6 Pipeline Coverage) · Deal math (P8-2 Sales Velocity, P8-3 ACV) · Conversion (P8-4 Win Rate by Stage) · Performance (P8-5 Quota Attainment) |
| **Output model** | **Business v3 standard** (6+ emoji sections: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip) — applies cleanly because all 6 calcs share "current-vs-target metric" framing |
| **Math depth** | Each engine has distinct math (weighted sum · 4-factor cascade · ratio with expansion · multiplicative funnel · pace projection · coverage ratio) — not thin overlays |
| **i18n** | en + zh (auto-translates via existing pipeline) |
| **Wiring** | Per-calculator 8-file checklist + 2 test count bumps — identical to P5/P6/P7 lesson |
| **Execution** | Controller direct inline — no subagent dispatch (P4-3+ lesson; pure mechanical calculators) |
| **Push cadence** | One commit + per-calculator push (per-calc, not batch) — P5/P6/P7 proven safer for early bug surfacing |
| **TS warnings** | NOT fixed — P6 silent warnings (HEALTH_BANDS re-export ambiguity + categoryId not in type) carry over; pre-existing pattern across P5+P6+P7, non-blocking |

## Why sales/CRM vertical depth (not breadth)

Per brainstorm summary above:
- All 6 topics have proven SEO demand + clear B2B SaaS persona (pipeline value is the most-searched sales KPI; sales velocity is the foundational sales productivity metric)
- Closes the loop with P6 marketing analytics — Marketing fills the funnel (P6 ROAS, P6-2 LTV by Channel, P6-3 Funnel Value, P6-5 Email Campaign ROI, P6-6 Content Marketing ROI), Sales closes it (P8)
- Categories A/B/C/D/E/F/M/O are filled; S is the cleanest semantic landing (no awkward "pipeline value in real-estate?")
- Topical authority: 6 interlinked sales pages form a recognized cluster (pipeline value → sales velocity → ACV → win rate by stage → quota attainment → pipeline coverage — natural reading order matching the "lead → close → forecast" sales cycle)
- Math models are genuinely distinct (weighted sum, 4-factor cascade, ratio with expansion, multiplicative funnel, pace projection, coverage ratio)
- No engine-pattern risk (proven v3 standard, no meta-shift)
- 6 calculators share "benchmark-driven health bands" — Sales as a category IS the meta-shift (define HEALTH_BANDS per file, no shared abstraction across calculators — YAGNI per CLAUDE.md)

### One nuance vs P7

P7 (operations) added 'O' after 'M'. P8 adds 'S' after 'O'. Pattern: every vertical-depth batch claims its own letter, making future sales/finance calcs scalable without crowding other categories. Categories A-F are dense (8-10 calcs each); M and O have 6 each (still growing); S will start at 6.

---

## Architecture

### New directory structure

```
src/
  engines/
    sales/                                        # NEW
      index.ts                                    # 6 imports + re-export
      pipeline-value-calculator.ts                # P8-1
      sales-velocity-calculator.ts                # P8-2
      acv-calculator.ts                           # P8-3
      win-rate-by-stage-calculator.ts             # P8-4
      quota-attainment-calculator.ts              # P8-5
      pipeline-coverage-calculator.ts             # P8-6
  data/
    tools/
      sales.ts                                    # NEW — 6 ToolMeta entries
    categories.ts                                 # +1 entry 'S' Sales / CRM
  pages/
    [lang]/
      sales.astro                                 # NEW — category landing page
docs/
  superpowers/
    specs/
      2026-07-07-p8-sales-batch-design.md         # this file
```

### Per-calculator file structure

Each engine mirrors P6/P7 file pattern (proven in P6-spec-as-plan and validated through 18 shipped calcs):

```ts
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Health band constants (per-file, NOT shared) ============
export const HEALTH_BANDS = { excellent: ..., good: ..., warning: ..., critical: ... };

// ============ Math helpers (exported for tests) ============
// ... mathematical primitives, no side effects

// ============ calculate() ============
// 6-section string assembly: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip

// ============ customFn ============
// minified JS, escaped unicode, ASI-safe (}if → }; if)

// ============ Engine ============
const engine: ToolEngine = { /* slug, title, inputs, clientConfig, generate, staticExamples, faq, howToUse */ };
registerEngine(engine);
```

### Wiring checklist (per calculator — 8 files)

1. `src/engines/sales/<slug>.ts` — engine + customFn + HEALTH_BANDS + helpers + calculate
2. `src/engines/sales/index.ts` — +1 import + barrel re-export
3. `scripts/codegen-examples.mjs` — +1 ENGINES entry (alphabetical)
4. `src/data/tools/sales.ts` — +1 ToolMeta entry (`ToolInput[]` structured form, per P4-2 lesson)
5. `src/data/og-samples.json` — +1 OG sample (headline + headlineUnit + headlineLabel; no emoji in trend line, P6-1 fix)
6. `tests/<slug>.test.ts` — NEW test file with 8-9 math tests (Node --test, strict assert)
7. `tests/ab-split.test.ts` — count bump 56→N
8. `tests/internal-links.test.ts` — count bump 56→N
9. `src/data/internal-links.ts` — auto-generated by codegen (P6-2 lesson: cross-cat fallback fills gaps during low-density seeding; we add explicit entry so order is correct)

### Batch scaffolding (Task 0 — separate commit before per-calc push)

A single scaffold commit creates:
- `src/engines/sales/index.ts` (empty barrel — comments-only + `export {};`)
- `src/data/tools/sales.ts` (empty exports array)
- `src/data/categories.ts` — `+1` entry `'S' Sales / 销售管理` (alphabetical position: between 'O' Operations and end of array)
- `src/pages/[lang]/sales.astro` (mirror `operations-inventory.astro`; `CATEGORY_ID = 'S'`, `CATEGORY_SLUG = 'sales'`)
- `tests/ab-split.test.ts` — count bump 56 → 62
- `tests/internal-links.test.ts` — count bump 56 → 62

Deferred to P8-1 commit (P7-0 lesson: dist/ must auto-rebuild before listingPages added):
- `src/data/seo-schemas/listingPages.ts` — `'S'` category entry (alongside 'M' and 'O')

### Shared conventions (within file, no cross-file abstraction per YAGNI)

| Pattern | Convention | Reason |
|---|---|---|
| Sign convention | Money positive (`$1,234`), percentages display as %, ratios as `1.5x` | User-friendly |
| Money formatting | `$1,234,567` (en-US locale) | Matches existing engines |
| Edge case (zero / NaN) | Return safe default + visible tip "Enter value > 0" | Avoids `NaN` / `Infinity` crashes (P5-1 lesson) |
| Health thresholds | 🟢🟡🟠🔴 per value-appropriate bands; document thresholds in spec not code | Easier to review |
| Health thresholds sharing | `export const HEALTH_BANDS = {...}` per file, NOT imported — visible diff, no premature abstraction | YAGNI |
| Tip selection | Conditional based on output band (multiple tips, one selected) | Contextual advice |
| v3 section names | 🩺 Health · 📊 Inputs Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip | Business v3 standard |
| Benchmarks | Single-layer SMB SaaS anchor (10-person, $1M-$5M ARR) | A档 benchmark per brainstorm Q3 |

### Boundary convention (per P7-2/P7-5 lesson)

Each band uses **inclusive lower bound / exclusive upper bound**:
- `≥ X → excellent`
- `Y ≤ x < X → good`  (X is exclusive upper of good, inclusive lower of excellent)
- `Z ≤ x < Y → warning`
- `< Z → critical`

Every test boundary value MUST be verified against this direction. Spec authors and implementers must read the band definition literally — do NOT infer from neighboring bands.

---

## The 6 Calculators

### P8-1: Pipeline Value Calculator

**Slug:** `solopreneur-pipeline-value-calculator`

**Purpose:** Compute the weighted value of your sales pipeline by stage probability. The most fundamental sales KPI — answers "how much real revenue is sitting in my pipeline right now?"

**Inputs (8):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `discoveryCount` | Discovery deals | number | 10 | e.g. 10 |
| `discoverySize` | Discovery avg deal size (USD) | number | 15000 | e.g. 15000 |
| `proposalCount` | Proposal deals | number | 5 | e.g. 5 |
| `proposalSize` | Proposal avg deal size (USD) | number | 25000 | e.g. 25000 |
| `negotiationCount` | Negotiation deals | number | 3 | e.g. 3 |
| `negotiationSize` | Negotiation avg deal size (USD) | number | 35000 | e.g. 35000 |
| `closingCount` | Closing deals | number | 2 | e.g. 2 |
| `closingSize` | Closing avg deal size (USD) | number | 45000 | e.g. 45000 |

**Stage probabilities (hard-coded, displayed in UI):**
- Discovery: 20%
- Proposal: 40%
- Negotiation: 60%
- Closing: 80%

**Math model:**
```ts
stageValue(count, size, probability) = count * size * probability
totalPipeline(discoveryVal, proposalVal, negotiationVal, closingVal) = sum of all 4
nominalPipeline = Σ(count × size)         // unweighted face value
weightedForecast = totalPipeline * 0.5    // 50% confidence forecast
```

**Canonical computation (defaults):**
- discoveryVal = 10 × 15000 × 0.20 = $30,000
- proposalVal = 5 × 25000 × 0.40 = $50,000
- negotiationVal = 3 × 35000 × 0.60 = $63,000
- closingVal = 2 × 45000 × 0.80 = $72,000
- totalPipeline = $215,000 (band: 🟡 good)
- nominalPipeline = $470,000
- weightedForecast = $107,500

**Health bands:**
- 🟢 excellent: `≥ $500,000`
- 🟡 good: `$200,000 ≤ x < $500,000`
- 🟠 warning: `$50,000 ≤ x < $200,000`
- 🔴 critical: `< $50,000`

**6-section output:**
1. 🩺 Health — band + weighted pipeline + nominal pipeline + weighted forecast
2. 📊 Inputs Snapshot — each stage: count × size × probability = value
3. 🔄 What-If — "If Proposal probability 40%→50%: +$12,500"; "If Closing has 3 deals: +$36,000"
4. ⚖️ Break-Even — "Need 2 more Closing deals ($90K) for 🟢"
5. 🎯 Milestone — "$285,000 to next tier (🟢 Excellent)"
6. 💡 Tip — band-driven (🟢 maintain cadence; 🟡 focus on late-stage acceleration; 🟠 generate top-of-funnel; 🔴 urgent: pipeline rebuild)

**Tests (8):**
1. `stageValue(10, 15000, 0.20) === 30000` (Discovery stage)
2. `totalPipeline(30000, 50000, 63000, 72000) === 215000` (canonical sum)
3. `calcHealthBand(49999) === 'critical'`
4. `calcHealthBand(50000) === 'warning'` (exact boundary)
5. `calcHealthBand(200000) === 'good'` (exact boundary)
6. `calcHealthBand(500000) === 'excellent'` (exact boundary)
7. All-zero: `totalPipeline(0, 0, 0, 0) === 0 → critical`
8. Single stage only: `totalPipeline(30000, 0, 0, 0) === 30000`

---

### P8-2: Sales Velocity Calculator

**Slug:** `solopreneur-sales-velocity-calculator`

**Purpose:** Measure how fast your sales engine generates revenue — `(opps × avgDealSize × winRate) / cycleDays`. The 4-factor cascade that tells you where to invest next. Anchor formula for B2B SaaS sales productivity.

**Inputs (4):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `openOpps` | Open opportunities | number | 20 | e.g. 20 |
| `avgDealSize` | Average deal size (USD) | number | 25000 | e.g. 25000 |
| `winRate` | Win rate (%) | number | 25 | e.g. 25 |
| `cycleDays` | Sales cycle (days) | number | 45 | e.g. 45 |

**Math model:**
```ts
dailyVelocity = (openOpps * avgDealSize * (winRate / 100)) / cycleDays
monthlyVelocity = dailyVelocity * 30
annualVelocity = dailyVelocity * 365
```

**Canonical computation (defaults):**
- dailyVelocity = (20 × 25000 × 0.25) / 45 = **$2,777.78/day** (band: 🟡 good)
- monthlyVelocity = $83,333.33/month
- annualVelocity = $1,013,888.89/year

**Health bands:**
- 🟢 excellent: `≥ $5,000/day`
- 🟡 good: `$2,000 ≤ x < $5,000`
- 🟠 warning: `$500 ≤ x < $2,000`
- 🔴 critical: `< $500`

**6-section output:**
1. 🩺 Health — band + daily velocity + monthly velocity + annual velocity
2. 📊 Inputs Snapshot — openOpps / avgDealSize / winRate / cycleDays
3. 🔄 What-If — "If win rate 25%→30%: $3,333/day (+20%)"; "If cycle 45→30 days: $4,167/day (+50%)"
4. ⚖️ Break-Even — "Need cycle 45→30 days for 🟢 (or win rate 25%→45%)"
5. 🎯 Milestone — "$2,222/day to next tier (🟢 Excellent)"
6. 💡 Tip — band-driven (🟢 maintain; 🟡 focus on win rate or cycle compression; 🟠 deal size or volume; 🔴 urgent: full funnel audit)

**Tests (9):**
1. `dailyVelocity(20, 25000, 25, 45) === 2777.78` (canonical)
2. `monthlyVelocity(2777.78) === 83333.33`
3. `annualVelocity(2777.78) === 1013888.89`
4. `calcHealthBand(499) === 'critical'`
5. `calcHealthBand(500) === 'warning'` (exact boundary)
6. `calcHealthBand(2000) === 'good'` (exact boundary)
7. `calcHealthBand(5000) === 'excellent'` (exact boundary)
8. Zero opps: `dailyVelocity(0, 25000, 25, 45) === 0 → critical`
9. Win rate 100% edge: `dailyVelocity(20, 25000, 100, 45) === 11111.11`

---

### P8-3: ACV Calculator (Average Contract Value)

**Slug:** `solopreneur-acv-calculator`

**Purpose:** Compute average contract value with monthly/annual toggle and expansion adjustment. The fundamental SaaS pricing metric — how much revenue per customer.

**Inputs (4):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `totalContractValue` | Total contract value (USD) | number | 300000 | e.g. 300000 |
| `contractLength` | Contract length (months) | number | 12 | e.g. 12 |
| `numCustomers` | Number of customers | number | 12 | e.g. 12 |
| `expansionRate` | Annual expansion rate (%) | number | 10 | e.g. 10 |

**Math model:**
```ts
baseACV = totalContractValue / numCustomers
monthlyACV = baseACV / contractLength
annualACV = monthlyACV * 12
expansionAdjustedACV = annualACV * (1 + expansionRate / 100)
```

**Canonical computation (defaults):**
- baseACV = 300000 / 12 = **$25,000**
- monthlyACV = 25000 / 12 = $2,083.33/month
- annualACV = 2083.33 × 12 = $25,000/year
- expansionAdjustedACV = 25000 × 1.10 = **$27,500/year** (band: 🟡 good)

**Health bands (applied to annualACV):**
- 🟢 excellent: `≥ $50,000/year`
- 🟡 good: `$10,000 ≤ x < $50,000`
- 🟠 warning: `$2,000 ≤ x < $10,000`
- 🔴 critical: `< $2,000`

**6-section output:**
1. 🩺 Health — band + baseACV + annualACV + expansionAdjustedACV
2. 📊 Inputs Snapshot — totalContractValue / contractLength / numCustomers / expansionRate
3. 🔄 What-If — "If expansion 10%→20%: $30,000/year (+9%)"; "If contract length 12→24 months: $12,500/year base (-50%)"
4. ⚖️ Break-Even — "Need 3 more customers (15 total) for 🟢"
5. 🎯 Milestone — "$22,500 to next tier (🟢 Excellent $50K)"
6. 💡 Tip — band-driven (🟢 enterprise-grade; 🟡 mid-market sweet spot; 🟠 SMB; 🔴 micro-txn — focus on upsell)

**Tests (8):**
1. `baseACV(300000, 12) === 25000` (canonical)
2. `annualACV(2083.33) === 25000`
3. `expansionAdjustedACV(25000, 10) === 27500`
4. `calcHealthBand(1999) === 'critical'`
5. `calcHealthBand(2000) === 'warning'` (exact boundary)
6. `calcHealthBand(10000) === 'good'` (exact boundary)
7. `calcHealthBand(50000) === 'excellent'` (exact boundary)
8. Single customer edge: `baseACV(300000, 1) === 300000 → excellent`

---

### P8-4: Win Rate by Stage Calculator

**Slug:** `solopreneur-win-rate-by-stage-calculator`

**Purpose:** Compute overall win rate as a multiplicative funnel across 4 stage transitions, with bottleneck detection. Reveals which stage is leaking the most deals.

**Inputs (8):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `sqlEntered` | SQL entered | number | 100 | e.g. 100 |
| `sqlAdvanced` | SQL → Opp advanced | number | 50 | e.g. 50 |
| `oppEntered` | Opp entered | number | 50 | e.g. 50 |
| `oppAdvanced` | Opp → Proposal advanced | number | 30 | e.g. 30 |
| `proposalEntered` | Proposal entered | number | 30 | e.g. 30 |
| `proposalAdvanced` | Proposal → Negotiation advanced | number | 20 | e.g. 20 |
| `negEntered` | Negotiation entered | number | 20 | e.g. 20 |
| `negAdvanced` | Negotiation → Won | number | 15 | e.g. 15 |

**Math model:**
```ts
stageRates = [sqlAdvanced/sqlEntered, oppAdvanced/oppEntered,
              proposalAdvanced/proposalEntered, negAdvanced/negEntered]
overallWinRate = stageRates[0] * stageRates[1] * stageRates[2] * stageRates[3]
bottleneckStage = argmin(stageRates)  // 0-indexed (0 = SQL→Opp)
bottleneckName = ['SQL→Opp', 'Opp→Proposal', 'Proposal→Negotiation', 'Negotiation→Won'][bottleneckStage]
```

**Canonical computation (defaults):**
- stageRates = [0.50, 0.60, 0.667, 0.75]
- overallWinRate = 0.5 × 0.6 × 0.667 × 0.75 = **15%** (band: 🟡 good)
- bottleneck = 0 (SQL→Opp at 50%, lowest stage rate)

**Health bands (applied to overallWinRate × 100):**
- 🟢 excellent: `≥ 25%`
- 🟡 good: `15% ≤ x < 25%`
- 🟠 warning: `5% ≤ x < 15%`
- 🔴 critical: `< 5%`

**6-section output:**
1. 🩺 Health — band + overallWinRate + each stage rate + bottleneck
2. 📊 Inputs Snapshot — 4 transitions: entered/advanced
3. 🔄 What-If — "If SQL→Opp 50%→65%: 19.5% overall"; "If Neg→Won 75%→85%: 17% overall"
4. ⚖️ Break-Even — "Need Neg→Won 75%→85% (or SQL→Opp 50%→67%) for 🟢"
5. 🎯 Milestone — "10pp to next tier (🟢 Excellent 25%)"
6. 💡 Tip — band-driven + bottleneck-aware (🟢 + SQL leak → tighten qualification; 🟡 + Neg leak → sales coaching; 🟠 + SQL leak → lead gen; 🔴 + any → funnel rebuild)

**Tests (9):**
1. `stageRate(50, 100) === 0.50` (canonical SQL→Opp)
2. `overallWinRate([0.5, 0.6, 0.667, 0.75]) === 0.15`
3. `bottleneckStage([0.5, 0.6, 0.667, 0.75]) === 0` (canonical bottleneck at SQL→Opp)
4. `calcHealthBand(0.049 * 100) === 'critical'` (4.9%)
5. `calcHealthBand(5) === 'warning'` (exact boundary)
6. `calcHealthBand(15) === 'good'` (exact boundary)
7. `calcHealthBand(25) === 'excellent'` (exact boundary)
8. All 100%: `overallWinRate([1, 1, 1, 1]) === 1 → excellent`
9. Zero entered guard: `stageRate(0, 0) === 0` (handle division-by-zero)

---

### P8-5: Quota Attainment Calculator

**Slug:** `solopreneur-quota-attainment-calculator`

**Purpose:** Track actual revenue vs annual quota with monthly pace projection and year-end forecast. Answers "am I on track to hit my number?"

**Inputs (3):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `annualQuota` | Annual quota (USD) | number | 1000000 | e.g. 1000000 |
| `monthsElapsed` | Months elapsed | number | 6 | e.g. 6 |
| `actualRevenue` | Revenue closed (USD) | number | 400000 | e.g. 400000 |

**Math model:**
```ts
attainmentPct = (actualRevenue / annualQuota) * 100
expectedAtPace = annualQuota * (monthsElapsed / 12)
gap = annualQuota - actualRevenue
remainingMonths = 12 - monthsElapsed
requiredPerMonth = (remainingMonths > 0) ? gap / remainingMonths : 0
projectedYearEnd = actualRevenue + gap  // same as annualQuota when remainingMonths > 0
onTrack = projectedYearEnd >= annualQuota
```

**Canonical computation (defaults):**
- attainmentPct = 400000 / 1000000 × 100 = **40%** (band: 🟠 warning)
- expectedAtPace = 1000000 × 6/12 = $500,000
- gap = $600,000
- remainingMonths = 6
- requiredPerMonth = $100,000/month
- projectedYearEnd = $1,000,000
- onTrack = true (just barely)

**Health bands (applied to attainmentPct):**
- 🟢 excellent: `≥ 100%`
- 🟡 good: `80% ≤ x < 100%`
- 🟠 warning: `50% ≤ x < 80%`
- 🔴 critical: `< 50%`

**6-section output:**
1. 🩺 Health — band + attainmentPct + projectedYearEnd + onTrack
2. 📊 Inputs Snapshot — annualQuota / monthsElapsed / actualRevenue
3. 🔄 What-If — "If last 6 months: $80K/mo: $480K total → 48% (still 🟠)"; "If close $600K in next 6 months: 100% onTrack"
4. ⚖️ Break-Even — "Need $500K closed by month 6 for 🟢"
5. 🎯 Milestone — "40pp to next tier (🟡 Good 80%)"
6. 💡 Tip — band-driven + onTrack-aware (🟢 overachiever — accelerate; 🟡 onTrack — maintain; 🟠 onTrack — execute; 🟠 offTrack — course-correct; 🔴 urgent: pipeline review)

**Tests (9):**
1. `attainmentPct(400000, 1000000) === 40` (canonical)
2. `expectedAtPace(1000000, 6) === 500000`
3. `requiredPerMonth(600000, 6) === 100000` (canonical)
4. `projectedYearEnd(400000, 600000) === 1000000`
5. `onTrack(1000000, 1000000) === true`
6. `calcHealthBand(49) === 'critical'` (exact boundary)
7. `calcHealthBand(50) === 'warning'` (exact boundary)
8. `calcHealthBand(80) === 'good'` (exact boundary)
9. `calcHealthBand(100) === 'excellent'` (exact boundary)

---

### P8-6: Pipeline Coverage Calculator

**Slug:** `solopreneur-pipeline-coverage-calculator`

**Purpose:** Compute pipeline-to-quota coverage with win-rate weighting, applying the B2B SaaS "3x rule" (you need 3× your quota in pipeline to reliably hit target). Answers "do I have enough pipeline?"

**Inputs (3):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `quotaTarget` | Quota target (USD) | number | 1000000 | e.g. 1000000 |
| `pipelineValue` | Current pipeline value (USD) | number | 1500000 | e.g. 1500000 |
| `winRate` | Expected win rate (%) | number | 25 | e.g. 25 |

**Math model:**
```ts
coverageRatio = pipelineValue / quotaTarget
weightedPipeline = pipelineValue * (winRate / 100)
weightedCoverage = weightedPipeline / quotaTarget
gap = quotaTarget - weightedPipeline
requiredAdditionalPipeline = (winRate > 0) ? gap / (winRate / 100) : 0
```

**Canonical computation (defaults):**
- coverageRatio = 1500000 / 1000000 = **1.5x** (band: 🟠 warning)
- weightedPipeline = 1500000 × 0.25 = $375,000
- weightedCoverage = 0.375x
- gap = $625,000
- requiredAdditionalPipeline = 625000 / 0.25 = **$2,500,000**

**Health bands (applied to coverageRatio):**
- 🟢 excellent: `≥ 3.0x` (3x rule satisfied)
- 🟡 good: `2.0 ≤ x < 3.0`
- 🟠 warning: `1.0 ≤ x < 2.0`
- 🔴 critical: `< 1.0`

**6-section output:**
1. 🩺 Health — band + coverageRatio + weightedCoverage + requiredAdditionalPipeline
2. 📊 Inputs Snapshot — quotaTarget / pipelineValue / winRate
3. 🔄 What-If — "If pipeline $1.5M→$2M: 2.0x (still 🟡)"; "If win rate 25%→50%: weighted 0.75x (still 🔴)"
4. ⚖️ Break-Even — "Need pipeline ≥ $3M for 🟢 3x rule (or win rate → 100% with $1M pipeline)"
5. 🎯 Milestone — "1.5x to next tier (🟡 Good 2.0x)"
6. 💡 Tip — band-driven (🟢 healthy pipeline; 🟡 need more qualified opps; 🟠 pipeline generation sprint; 🔴 urgent: full pipeline rebuild)

**Tests (8):**
1. `coverageRatio(1500000, 1000000) === 1.5` (canonical)
2. `weightedCoverage(1500000, 25, 1000000) === 0.375`
3. `requiredAdditionalPipeline(625000, 25) === 2500000` (canonical)
4. `calcHealthBand(0.99) === 'critical'`
5. `calcHealthBand(1.0) === 'warning'` (exact boundary)
6. `calcHealthBand(2.0) === 'good'` (exact boundary)
7. `calcHealthBand(3.0) === 'excellent'` (exact boundary, 3x rule)
8. Zero win rate guard: `requiredAdditionalPipeline(625000, 0) === 0` (avoid Infinity)

---

## Health Bands Summary

| Calc | Band Thresholds (USD/%/ratio) |
|------|-------------------------------|
| Pipeline Value | $50K / $200K / $500K |
| Sales Velocity | $500 / $2,000 / $5,000 (USD/day) |
| ACV | $2K / $10K / $50K (USD/year) |
| Win Rate | 5% / 15% / 25% |
| Quota Attainment | 50% / 80% / 100% |
| Pipeline Coverage | 1.0x / 2.0x / 3.0x |

All bands use inclusive lower bound / exclusive upper bound. Boundary direction documented per calc in section 4.

---

## Default Input Values (SMB SaaS anchor)

All defaults anchored to a 10-person SMB SaaS company, $1M–$5M ARR. Default band distribution: 3 × 🟡 good, 3 × 🟠 warning, 0 × 🔴 / 🟢 — reflects "mid-range SMB SaaS" with visible improvement room.

| Calc | Anchor Defaults | Default Band |
|------|-----------------|--------------|
| Pipeline Value | Discovery 10×$15K, Proposal 5×$25K, Negotiation 3×$35K, Closing 2×$45K → $215K | 🟡 good |
| Sales Velocity | 20 opps × $25K × 25% / 45 days → $2,778/day | 🟡 good |
| ACV | $300K / 12 customers / 12 months / 10% expansion → $27.5K/yr | 🟡 good |
| Win Rate | SQL 100→50, Opp 50→30, Prop 30→20, Neg 20→15 → 15% | 🟡 good |
| Quota Attainment | $1M quota, 6mo elapsed, $400K closed → 40% | 🟠 warning |
| Pipeline Coverage | $1M quota, $1.5M pipeline, 25% win → 1.5x | 🟠 warning |

---

## Wiring (per-calc commit)

Each P8-N commit modifies:
1. `src/engines/sales/<slug>-calculator.ts` — new engine file
2. `src/engines/sales/index.ts` — add import + registerEngine
3. `scripts/codegen-examples.mjs` — add ENGINES entry
4. `src/data/tools/sales.ts` — add ToolMeta entry
5. `src/data/og-samples.json` — add og-sample line (no emoji in headline, P6-1 fix)
6. `tests/ab-split.test.ts` — 56→N tool count
7. `tests/internal-links.test.ts` — 56→N tool count
8. `tests/<slug>-calculator.test.ts` — new test file with 8-9 math tests

P8-1 also adds (in addition to the above):
- `src/data/seo-schemas/listingPages.ts` — 'S' category entry (P7-0 lesson: dist/ must auto-rebuild)

---

## Implementation Sequence

```
spec(p8) → plan(p8) → scaffold(p8-0) → 6× calc commits → holistic(p8-7)
```

8 commits + 1 holistic review.

### Per-Calc Workflow (~30 min/calc, B 档 math)
1. Write `tests/<slug>-calculator.test.ts` with math helper tests
2. Run tests — expect RED
3. Write `src/engines/sales/<slug>-calculator.ts` math helpers (export for tests)
4. Run tests — expect GREEN
5. Write `calculate()` function (v3 6-section output)
6. Write `staticExamples[0]`
7. Run `node scripts/codegen-examples.mjs` — auto-regenerate
8. Run `node scripts/codegen-examples.mjs --check` — verify
9. Hand-minify `customFn` JS string (ASI-safe `}}if` → `}; if`)
10. Run `node tests/scripts/test-customfn.mjs <slug>` — verify parse
11. Add ToolMeta entry, barrel import, og-sample, codegen entry
12. Update test counts (ab-split + internal-links)
13. Run `pnpm check` — verify typecheck + tests + i18n + codegen
14. Commit + push (both mirrors: github forgeflow + gitee calcKit)

---

## Pre-Commit Gates (automated)

- `clerk-env` + `supabase-env` check
- `i18n` check (all keys present)
- `codegen-examples --check` (no drift)
- `codegen-customfn --check`
- `tests/run.mjs` (all 461+ tests pass)

---

## P8-7 Holistic Review

Before P8 series close, review:

| Check | Risk |
|-------|------|
| 6 engine HEALTH_BANDS no cross-leakage | Wrong threshold (used other calc's) |
| 6 calc defaults render correctly in v3 output | Text rendering bug |
| 6 customFn all parse | ASI / template string |
| `og-samples.json` 6 entries no emoji (P6-1 fix) | SEO/OG bug |
| `internal-links.ts` all 62 tools have 4 related | Cross-cat fallback |
| `tests/run.mjs` full pass / 0 fail | Math bug |
| `pnpm check` all green | Typecheck/i18n drift |
| `pnpm build` 149 static pages (141 + 8 new) | SSR issue |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 51 boundary tests fail (P7-2/P7-5 lesson) | Section 4 lists all 18 exact band values; spec writes explicit `≤` / `<` notation per calc; implementers verify boundary direction literally |
| Spec canonical expected value miscomputed (P7-3 lesson) | Section 4 manually computes each calc's default input → output; cross-check by implementer before writing test |
| 6 customFn ASI trap | Run `test-customfn.mjs <slug>` per calc (not just at end) |
| Time exceeds 30 min/calc (breaks cadence) | All formulas simple arithmetic (B 档 math); no time-series in scope |
| Health band threshold direction ambiguity | Each calc's health band uses consistent `≥ / ≤< / <` notation; tests verify exact direction |

---

## Cross-Cutting Carry-Forward (P6-1 fixes still apply)

- `src/data/internal-links.ts` Tier-2 score-0 fallback handles 'S' category seed phase
- `src/data/seo-schemas/listingPages.ts` already supports array of categories (P6-1 fix)
- `src/data/og-samples.json` no emoji in headlines (P6-1 fix)
- `src/engines/<cat>/index.ts` barrel pattern (P7 proven)

No new cross-cutting fixes expected for P8.

---

## Memory Files (post-ship)

After P8 ships:
1. `memory/p8-0-scaffold-shipped.md`
2. `memory/p8-1-pipeline-value-shipped.md`
3. `memory/p8-2-sales-velocity-shipped.md`
4. `memory/p8-3-acv-shipped.md`
5. `memory/p8-4-win-rate-by-stage-shipped.md`
6. `memory/p8-5-quota-attainment-shipped.md`
7. `memory/p8-6-pipeline-coverage-shipped.md`
8. `memory/p8-series-shipped.md` (final retrospective, includes P8-7 holistic review findings)
9. Update `memory/MEMORY.md` index

---

## P8 Completion Criteria

- [ ] All 6 calcs shipped, 0 mid-flight fix (P7-6 lesson: clean ships possible when spec is verified)
- [ ] tests/run.mjs: 461 + 51 = 512 pass / 0 fail / 0 skip
- [ ] pnpm check: 0 errors
- [ ] pnpm build: 149 static pages (was 141)
- [ ] Both mirrors synced (github forgeflow 56→62 + gitee calcKit 56→62)
- [ ] 8 memory files written + MEMORY.md index updated
- [ ] Holistic review (P8-7) finds 0 critical issues