# P7 Operations / Inventory Calculator Batch Design

**Date:** 2026-07-06
**Status:** DRAFT (brainstorming)
**Author:** Claude (controller direct execution, post P6 series)
**Context:** P7 sub-project — extend 50 v3-standard calculators with an **operations/inventory vertical-depth batch (6 engines)** in a new `operations/` category. Closes SEO gaps for "inventory turnover" / "carrying cost" / "stockout cost" / "reorder point" / "fulfillment cost" / "supplier scorecard" — 6 distinct operations/ops personas in one cluster.

---

## Executive Summary

| Element | Decision |
|---|---|
| **Batch size** | 6 engines (P7-1 through P7-6) — same size as P5/P6 (38→44→50), takes us to **50→56** engines. **Total inputs across 6 calcs = 33** (4+6+6+5+7+5) |
| **Category** | New `src/engines/operations/` + `src/data/tools/operations.ts`; **`categoryId: 'O'`** (Operations — new letter; A/B/C/D/E/F/M all used) |
| **Audience** | Mixed: physical-product solopreneurs (Shopify / Amazon FBA / DTC brands) + service businesses that hold inventory (agencies, SaaS with hardware SKU, course creators with merch). Inputs are domain-neutral; benchmarks labeled "B2B generic" |
| **Coverage matrix** | Inventory health (P7-1 Turnover, P7-2 Carrying Cost) · Stockout risk (P7-3 Stockout, P7-4 ROP) · Fulfillment ops (P7-5 Cost) · Vendor management (P7-6 Scorecard) |
| **Output model** | **Business v3 standard** (6+ emoji sections: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip) — applies cleanly because all 6 calcs share "current-vs-target metric" framing; `Break-Even` is interpretable as "where you cross from warning to excellent band" |
| **Math depth** | Each engine has distinct math (turnover ratio · carrying cost compound · lost revenue + LTV cascade · reorder point with safety stock · fulfillment cost decomposition · weighted supplier composite) — not thin overlays |
| **i18n** | en + zh (auto-translates via existing pipeline) |
| **Wiring** | Per-calculator 7-file checklist + 2 test count bumps — identical to P5/P6 lesson |
| **Execution** | Controller direct inline — no subagent dispatch (P4-3+ lesson; pure mechanical calculators) |
| **Push cadence** | One commit + per-calculator push (per-calc, not batch) — P5/P6 proven safer for early bug surfacing |
| **TS warnings** | NOT fixed — P6 silent warnings (HEALTH_BANDS re-export ambiguity + categoryId not in type) carry over; pre-existing pattern across P5+P6, non-blocking |

## Why operations-inventory vertical depth (not breadth)

Per brainstorm summary above:
- All 6 topics have proven SEO demand + clear solopreneur persona (Shopify/Amazon FBA sellers search these daily; agencies track fulfillment costs in COGS line)
- Categories A/B/C/D/E/F/M are filled; O is the cleanest semantic landing (no awkward "stockout in real-estate?")
- Topical authority: 6 interlinked operations pages form a recognized cluster (inventory health → carrying → stockout risk → reorder → fulfillment → supplier reliability — natural reading order)
- Math models are genuinely distinct (ratio, percentage compound, lost-customer LTV cascade, statistical ROP, time-cost decomposition, weighted score)
- No engine-pattern risk (proven v3 standard, no meta-shift)
- 6 calculators share "Benchmark-driven health bands" — Operations as a category IS the meta-shift (define HEALTH_BANDS per file, no shared abstraction across calculators — YAGNI per CLAUDE.md)

### One nuance vs P6

P6 (marketing) added a brand-new letter 'M'. P7 adds 'O' (after M). Pattern: every vertical-depth batch claims its own letter, making future marketing/ops calcs scalable without crowding other categories. Categories A-F are dense (8-10 calcs each); M has 6 (still growing); O will start at 6.

---

## Architecture

### New directory structure

```
src/
  engines/
    operations/                                  # NEW
      index.ts                                   # 6 imports + re-export
      inventory-turnover-calculator.ts           # P7-1
      carrying-cost-calculator.ts                # P7-2
      stockout-cost-calculator.ts                # P7-3
      reorder-point-calculator.ts                # P7-4
      fulfillment-cost-calculator.ts             # P7-5
      supplier-scorecard-calculator.ts           # P7-6
  data/
    tools/
      operations.ts                              # NEW — 6 ToolMeta entries
    categories.ts                                # +1 entry 'O' Operations / Inventory
  pages/
    [lang]/
      operations-inventory.astro                 # NEW — category listing page
docs/
  superpowers/
    specs/
      2026-07-06-p7-operations-batch-design.md   # this file
```

### Per-calculator file structure

Each engine mirrors P6 file pattern (proven in P6-spec-as-plan):

```ts
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Health band constants (per-file, NOT shared) ============
const HEALTH_BANDS = { excellent: ..., good: [...], warning: [...], critical: ... };

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

### Wiring checklist (per calculator — 7 files)

1. `src/engines/operations/<slug>.ts` — engine + customFn + HEALTH_BANDS + helpers + calculate
2. `src/engines/operations/index.ts` — +1 import + barrel re-export
3. `scripts/codegen-examples.mjs` — +1 ENGINES entry (alphabetical)
4. `src/data/tools/operations.ts` — +1 ToolMeta entry (`ToolInput[]` structured form, per P4-2 lesson)
5. `src/data/og-samples.json` — +1 OG sample (headline + headlineUnit + headlineLabel; no emoji in trend line)
6. `tests/<slug>.test.ts` — NEW test file with 6-7 math tests (Node --test, strict assert)
7. `src/data/internal-links.ts` — +1 relatedTools entry (P6-2 lesson: cross-cat fallback fills gaps during low-density seeding; we add explicit entry so order is correct)

### Batch scaffolding (Task 0 — separate commit before per-calc push)

A single scaffold commit creates:
- `src/engines/operations/index.ts` (empty barrel — comments-only + `export {};`)
- `src/data/tools/operations.ts` (empty exports array)
- `src/data/categories.ts` — `+1` entry `'O' Operations / 库存运营` (alphabetical position: between 'M' Marketing Analytics and end of array)
- `src/pages/[lang]/operations-inventory.astro` (mirror `marketing-analytics.astro`; `CATEGORY_ID = 'O'`, `CATEGORY_SLUG = 'operations-inventory'`)
- `tests/ab-split.test.ts` — count bump 50 → 56 (initial — pre-P7-1 only adds the 6-tool assumption)
- `tests/internal-links.test.ts` — count bump 50 → 56 + per-tool related count dict grows
- `src/data/internal-links.ts` — +6 relatedTools entries (initial empty arrays; per-calc fills them)

### Shared conventions (within file, no cross-file abstraction per YAGNI)

| Pattern | Convention | Reason |
|---|---|---|
| Sign convention | Money positive (`$1,234`), percentages display as % | User-friendly |
| Money formatting | `$1,234,567` (en-US locale) | Matches existing engines |
| Edge case (zero / NaN) | Return safe default + visible tip "Enter value > 0" | Avoids `NaN` / `Infinity` crashes (P5-1 lesson) |
| Health thresholds | 🟢🟡🟠🔴 per value-appropriate bands; document thresholds in spec not code | Easier to review |
| Health thresholds sharing | `export const HEALTH_BANDS = {...}` per file, NOT imported — visible diff, no premature abstraction | YAGNI |
| Tip selection | Conditional based on output band (multiple tips, one selected) | Contextual advice |
| v3 section names | 🩺 Health · 📊 Inputs Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip | Business v3 standard |
| Benchmarks | Label "B2B generic" for physical-product + service — avoid hard-coding specific verticals | Audience-mix decision (user) |

---

## The 6 Calculators

### P7-1: Inventory Turnover Calculator

**Slug:** `solopreneur-inventory-turnover-calculator`

**Purpose:** Measure how many times per year inventory cycles through (COGS / avg inventory) and how many days to sell. The fundamental "inventory health" metric — too slow = capital trapped; too fast = stockout risk.

**Inputs (4):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `annualCOGS` | Annual Cost of Goods Sold (COGS) | number | 240000 | 240000 |
| `avgInventory` | Average Inventory Value | number | 40000 | 40000 |
| `periodDays` | Period (days) | number | 365 | 365 |
| `industry` | Industry benchmark | select | general | general · apparel · electronics · grocery · furniture |

**Math model:**
```ts
turnoverRatio = annualCOGS / avgInventory           // times/year
daysToSell = periodDays / turnoverRatio             // days
// Industry health lookup
benchmark = { general: 6, apparel: 4, electronics: 6, grocery: 12, furniture: 3 }[industry]
```

**Health bands:**
- 🟢 excellent: `turnoverRatio ≥ 6` (general); above industry benchmark
- 🟡 good: `4 ≤ ratio < 6`
- 🟠 warning: `2 ≤ ratio < 4`
- 🔴 critical: `ratio < 2`

**6-section output:**
1. 🩺 Health — band + ratio + daysToSell
2. 📊 Inputs Snapshot — COGS / inventory / period / industry
3. 🔄 What-If — "What if COGS drops 10%?" (ratio change)
4. ⚖️ Break-Even — `inventory = COGS / benchmark` (target avg inventory for 🟢)
5. 🎯 Milestone — 12-mo projection: if ratio improves +1, capital freed = `inventory − COGS/(ratio+1)`
6. 💡 Tip — band-driven (🟢 maintain; 🟡 optimize SKU mix; 🟠 identify slow-movers; 🔴 urgent SKU rationalization)

**Tests (6):**
1. `turnoverRatio(240000, 40000) === 6` (canonical)
2. `daysToSell(240000, 40000, 365) === 60.83` (≈ 61 days)
3. `turnoverRatio(0, 40000) === 0` (zero COGS guard)
4. `turnoverRatio(240000, 0) === Infinity` (zero inventory guard — handled in calc)
5. Industry lookup: `benchmark('apparel') === 4`, `benchmark('grocery') === 12`
6. Boundary: `turnoverRatio(240000, 30000) === 8` (🟢), `turnoverRatio(240000, 100000) === 2.4` (🟠)

---

### P7-2: Carrying Cost Calculator

**Slug:** `solopreneur-carrying-cost-calculator`

**Purpose:** Total annual cost of holding inventory — storage + insurance + shrinkage + opportunity cost + other. Industry rule of thumb: 20-30% of inventory value/year.

**Inputs (6):**

| Name | Label | Type | Default |
|---|---|---|---|
| `avgInventoryValue` | Average Inventory Value | number | 50000 |
| `storageRate` | Storage Cost (% of inventory) | number | 8 |
| `insuranceRate` | Insurance Cost (%) | number | 1.5 |
| `shrinkageRate` | Shrinkage / Damage (%) | number | 2 |
| `oppCostRate` | Opportunity Cost (%) | number | 8 |
| `otherCostsPct` | Other Carrying Costs (%) | number | 2 |

**Math model:**
```ts
totalRate = storageRate + insuranceRate + shrinkageRate + oppCostRate + otherCostsPct  // sum %
totalAnnualCost = avgInventoryValue × (totalRate / 100)
```

**Health bands (% of inventory value):**
- 🟢 excellent: `< 20%`
- 🟡 good: `20% ≤ x < 25%`
- 🟠 warning: `25% ≤ x < 30%`
- 🔴 critical: `≥ 30%`

**6-section output:**
1. 🩺 Health — total rate + band + breakdown pie
2. 📊 Inputs Snapshot — each rate %
3. 🔄 What-If — "What if shrinkage drops to 0.5%?"
4. ⚖️ Break-Even — `targetStorage = 20 − (other rates)` (max storage for 🟢)
5. 🎯 Milestone — 12-mo savings if rate drops 2pp: `inventory × 0.02`
6. 💡 Tip — band-driven (🟢 audit annually; 🟡 negotiate storage; 🟠 reduce SKU count; 🔴 urgent: renegotiate 3PL)

**Tests (6):**
1. `totalRate(8, 1.5, 2, 8, 2) === 21.5` (canonical)
2. `totalAnnualCost(50000, 21.5) === 10750`
3. Sum breakdown: each rate contributes correctly
4. Boundary: 19.9 → 🟢, 20.0 → 🟡, 25.0 → 🟡, 30.0 → 🔴
5. Zero guard: `totalRate(0,0,0,0,0) === 0`
6. Single-rate dominance: storageRate alone = totalRate

---

### P7-3: Stockout Cost Calculator

**Slug:** `solopreneur-stockout-cost-calculator`

**Purpose:** Quantify the cost of running out of stock — lost immediate revenue + lost customer LTV (some defect forever). Often higher than carrying cost; the invisible expense.

**Inputs (6):**

| Name | Label | Type | Default |
|---|---|---|---|
| `lostSalesPerDay` | Lost Sales per Day (units or $) | number | 1000 |
| `avgStockoutDays` | Average Stockout Duration (days) | number | 5 |
| `lostCustomerRate` | % of Stockout Customers Lost Forever | number | 30 |
| `customerLTV` | Customer Lifetime Value ($) | number | 200 |
| `annualRevenue` | Annual Revenue (for % calc) | number | 600000 |
| `recoveryRate` | Win-back / Recovery Rate (%) | number | 10 |

**Math model:**
```ts
lostImmediateRevenue = lostSalesPerDay × avgStockoutDays
lostCustomers = (lostImmediateRevenue / avgOrderValue)  // simplified: assume 1 unit = 1 customer
lostLTV = lostCustomers × (lostCustomerRate / 100) × customerLTV × (1 − recoveryRate / 100)
totalCost = lostImmediateRevenue + lostLTV
costPctOfRevenue = (totalCost / annualRevenue) × 100
```

**Health bands (% of annual revenue):**
- 🟢 excellent: `< 5%`
- 🟡 good: `5% ≤ x < 10%`
- 🟠 warning: `10% ≤ x < 15%`
- 🔴 critical: `≥ 15%`

**6-section output:**
1. 🩺 Health — total cost + % of revenue + band
2. 📊 Inputs Snapshot — daily loss / duration / LTV factors
3. 🔄 What-If — "What if we reduce stockout days by 50%?"
4. ⚖️ Break-Even — max stockoutDays for 🟢 (target ≤ 2 days given inputs)
5. 🎯 Milestone — 12-mo savings if stockout cut 50%
6. 💡 Tip — band-driven (🟢 monitor; 🟡 add safety stock; 🟠 reorder point review; 🔴 urgent: switch to multi-supplier)

**Tests (7):**
1. `lostImmediateRevenue(1000, 5) === 5000` (canonical)
2. `lostLTV(5000, 30, 200, 10) === 2700` (30% lost × $200 × 0.9 unrecovered)
3. `totalCost(5000, 2700) === 7700`
4. `costPctOfRevenue(7700, 600000) === 1.28`
5. Zero stockout days: totalCost = 0
6. Recovery 100%: lostLTV = 0
7. Boundary: costPct 4.9 → 🟢, 5.0 → 🟡, 15.0 → 🔴

---

### P7-4: Reorder Point Calculator

**Slug:** `solopreneur-reorder-point-calculator`

**Purpose:** Compute when to reorder — lead-time demand + safety stock. Includes service-level Z-score for statistical safety buffer.

**Inputs (5):**

| Name | Label | Type | Default |
|---|---|---|---|
| `avgDailyDemand` | Average Daily Demand (units) | number | 50 |
| `leadTimeDays` | Supplier Lead Time (days) | number | 14 |
| `serviceLevel` | Service Level | select | 95 |
| `demandStdDev` | Daily Demand Std Dev (units) | number | 10 |
| `reviewPeriod` | Review Period (days) | number | 7 |

**Math model:**
```ts
Z_SCORES = { 90: 1.28, 95: 1.65, 99: 2.33 }
z = Z_SCORES[serviceLevel]
leadTimeDemand = avgDailyDemand × leadTimeDays
safetyStock = z × demandStdDev × sqrt(leadTimeDays / reviewPeriod)
reorderPoint = leadTimeDemand + safetyStock
```

**Health bands (by service level chosen):**
- 🟢 excellent: `serviceLevel ≥ 95%` (recommended for high-margin / critical SKU)
- 🟡 good: `serviceLevel = 90%`
- 🟠 warning: `serviceLevel = 85%`
- 🔴 critical: `serviceLevel < 85%` (default risk tolerance)

**6-section output:**
1. 🩺 Health — service level band + reorder point
2. 📊 Inputs Snapshot — demand / lead time / Z / std dev
3. 🔄 What-If — "What if lead time doubles?" (safety stock grows with sqrt)
4. ⚖️ Break-Even — min service level for low-stockout risk (≥ 95%)
5. 🎯 Milestone — 12-mo: units between ROP and stockout = inventory headroom
6. 💡 Tip — band-driven (🟢 review quarterly; 🟡 raise SL to 95%; 🟠 reduce lead time variance; 🔴 demand forecast review)

**Tests (7):**
1. Z-scores: Z(95) === 1.65, Z(90) === 1.28, Z(99) === 2.33
2. `leadTimeDemand(50, 14) === 700`
3. `safetyStock(1.65, 10, 14, 7) === 23.34` (1.65 × 10 × √(14/7) = 16.5 × 1.4142 ≈ 23.34)
4. `reorderPoint(700, 23.34) === 723.34`
5. Zero std dev: safetyStock = 0, reorderPoint = leadTimeDemand
6. Zero lead time: reorderPoint = 0
7. Boundary: SL 95% → 🟢, 90% → 🟡, 85% → 🟠, 80% → 🔴

---

### P7-5: Order Fulfillment Cost Calculator

**Slug:** `solopreneur-fulfillment-cost-calculator`

**Purpose:** Per-order cost decomposition — labor + shipping + packaging + returns handling. The "true cost" of fulfilling one order; often higher than expected.

**Inputs (7):**

| Name | Label | Type | Default |
|---|---|---|---|
| `ordersPerMonth` | Orders per Month | number | 500 |
| `pickMin` | Pick Time (min/order) | number | 3 |
| `packMin` | Pack Time (min/order) | number | 2 |
| `shippingCost` | Shipping Cost per Order ($) | number | 5.50 |
| `packagingCost` | Packaging Cost per Order ($) | number | 1.20 |
| `laborRate` | Labor Rate ($/hour) | number | 18 |
| `returnRate` | Return Rate (%) | number | 8 |

**Math model:**
```ts
laborMinPerOrder = pickMin + packMin
laborCostPerOrder = (laborMinPerOrder / 60) × laborRate
returnHandlingPerOrder = (returnRate / 100) × 4.50  // avg return handling cost $4.50
perOrderCost = laborCostPerOrder + shippingCost + packagingCost + returnHandlingPerOrder
monthlyTotal = perOrderCost × ordersPerMonth
annualTotal = monthlyTotal × 12
```

**Health bands ($/order):**
- 🟢 excellent: `< $5`
- 🟡 good: `$5 ≤ x < $10`
- 🟠 warning: `$10 ≤ x < $20`
- 🔴 critical: `≥ $20`

**6-section output:**
1. 🩺 Health — per-order cost + band + breakdown
2. 📊 Inputs Snapshot — pick / pack / ship / pkg / labor / return rate
3. 🔄 What-If — "What if returns drop to 3%?"
4. ⚖️ Break-Even — max pickMin+packMin for 🟢
5. 🎯 Milestone — 12-mo total + savings if cost drops $1/order
6. 💡 Tip — band-driven (🟢 optimize shipping; 🟡 batch pick; 🟠 automate; 🔴 3PL review)

**Tests (7):**
1. `laborMinPerOrder(3, 2) === 5`
2. `laborCostPerOrder(5, 18) === 1.50` (5/60 × 18)
3. `returnHandlingPerOrder(8) === 0.36` (8% × $4.50)
4. `perOrderCost(1.50, 5.50, 1.20, 0.36) === 8.56`
5. `monthlyTotal(8.56, 500) === 4280`
6. Zero labor rate: perOrderCost = shipping + pkg + returns
7. Boundary: perOrderCost 4.99 → 🟢, 5.0 → 🟡, 10.0 → 🟡, 20.0 → 🔴

---

### P7-6: Supplier Performance Scorecard

**Slug:** `solopreneur-supplier-scorecard-calculator`

**Purpose:** Weighted composite supplier score — on-time delivery + defect rate + lead-time variance + cost variance. Letter grade A/B/C/D for vendor comparison.

**Inputs (5):**

| Name | Label | Type | Default |
|---|---|---|---|
| `onTimePct` | On-Time Delivery (%) | number | 88 |
| `defectRatePct` | Defect / Return Rate (%) | number | 2.5 |
| `leadVarianceDays` | Lead Time Variance (days, std dev) | number | 3 |
| `costVariancePct` | Cost Variance (%) | number | 5 |
| `weightPreset` | Weight Preset | select | balanced |

**Math model:**
```ts
scoreOnTime = min(100, onTimePct)             // 0-100
scoreDefect = clamp(100 - defectRatePct × 10, 0, 100)
scoreLead = clamp(100 - leadVarianceDays × 5, 0, 100)
scoreCost = clamp(100 - |costVariancePct| × 2, 0, 100)

WEIGHTS = {
  balanced:     { onTime: 0.40, defect: 0.30, lead: 0.15, cost: 0.15 },
  quality:      { onTime: 0.25, defect: 0.50, lead: 0.15, cost: 0.10 },
  speed:        { onTime: 0.50, defect: 0.20, lead: 0.25, cost: 0.05 },
  cost:         { onTime: 0.20, defect: 0.20, lead: 0.10, cost: 0.50 },
}

composite = (
  scoreOnTime × weights.onTime +
  scoreDefect × weights.defect +
  scoreLead × weights.lead +
  scoreCost × weights.cost
)
```

**Health bands (composite score):**
- 🟢 excellent: `≥ 90` (A — top supplier)
- 🟡 good: `80 ≤ x < 90` (B — solid, monitor)
- 🟠 warning: `70 ≤ x < 80` (C — underperforming)
- 🔴 critical: `< 70` (D — replace)

**6-section output:**
1. 🩺 Health — composite + grade letter (A/B/C/D) + band
2. 📊 Inputs Snapshot — each metric
3. 🔄 What-If — "What if defect rate drops to 0.5%?"
4. ⚖️ Break-Even — min onTime% for grade B (≥ 80% composite given balanced weights)
5. 🎯 Milestone — 12-mo: track monthly score trend; +5 → upgrade grade
6. 💡 Tip — band-driven (🟢 strategic partner; 🟡 review quarterly; 🟠 dual-source; 🔴 replace)

**Tests (6):**
1. `scoreOnTime(88) === 88` (canonical — below 100)
2. `scoreDefect(2.5) === 75` (100 - 25)
3. `scoreLead(3) === 85` (100 - 15)
4. `scoreCost(5) === 90` (100 - 10)
5. `composite(balanced)` for (88, 75, 85, 90) = 88×0.40 + 75×0.30 + 85×0.15 + 90×0.15 = 35.2 + 22.5 + 12.75 + 13.5 = 83.95 → B
6. Boundary: 90 → A 🟢, 89 → B 🟡, 80 → B 🟡, 79 → C 🟠, 70 → C 🟠, 69 → D 🔴

---

## Test counts (per-calc + total)

| Calc | Math tests |
|---|---|
| P7-1 Inventory Turnover | 6 |
| P7-2 Carrying Cost | 6 |
| P7-3 Stockout Cost | 7 |
| P7-4 Reorder Point | 7 |
| P7-5 Fulfillment Cost | 7 |
| P7-6 Supplier Scorecard | 6 |
| **Σ** | **39** |

(Compare: P6 had 53 math tests across 6 calcs; P7 has 39. P6-4 retention + P6-6 content had +11/+12 because of multi-stage cascades; P7 calcs are more single-formula.)

---

## Cross-cutting fixes (P7-1 pre-emptive — done at scaffold)

| # | File | Fix |
|---|---|---|
| 1 | `src/data/categories.ts` | + `'O' Operations / 库存运营` entry |
| 2 | `src/pages/[lang]/operations-inventory.astro` | NEW — category listing page (mirror `marketing-analytics.astro`) |
| 3 | `tests/seo-schemas.test.ts` (P2a test #320) | `listingPages` array includes `'operations-inventory'` |
| 4 | `tests/ab-split.test.ts` | Bump `getAllEngines().length` and `tools.length` from 50 to 56 (initial scaffold; per-calc adjusts) |
| 5 | `tests/internal-links.test.ts` | Bump `Object.keys(relatedTools).length` and `tools.length` from 50 to 56 |
| 6 | `src/data/internal-links.ts` | + 6 relatedTools entries with empty arrays (per-calc fills; tier-2 fallback carries seed-phase) |

**No new fixes needed beyond P6-1's 4** — internal-links tier-2 fallback + og-samples emoji guard + seo-schemas listingPages all carry forward.

---

## Quality gates (per calc commit)

1. `node scripts/codegen-examples.mjs --check` → 0 drift
2. `node tests/scripts/test-customfn.mjs <slug>` → parses OK (catches `}}if` ASI trap)
3. `pnpm check` → full pipeline: clerk-env + supabase-env + i18n + codegen-examples --check + codegen-customfn --check + tests/run.mjs
4. Commit message format: `feat(p7-N): <calc name>`
5. Push to both `origin` (GitHub) and `gitee` (mirror) — 2 push commands per calc

---

## Push cadence (proven P5/P6 pattern)

```
[Spec]    → write 2026-07-06-p7-operations-batch-design.md + commit + push (1 commit)
[Scaffold]→ feat(p7-0): operations category scaffold (1 commit)
[P7-1]    → feat(p7-1): inventory turnover calculator (1 commit + 2 pushes)
[P7-2]    → feat(p7-2): carrying cost calculator (1 commit + 2 pushes)
[P7-3]    → feat(p7-3): stockout cost calculator (1 commit + 2 pushes)
[P7-4]    → feat(p7-4): reorder point calculator (1 commit + 2 pushes)
[P7-5]    → feat(p7-5): fulfillment cost calculator (1 commit + 2 pushes)
[P7-6]    → feat(p7-6): supplier scorecard calculator (1 commit + 2 pushes)
[Holistic]→ pnpm check + 2 mirrors sync + memory write
```

**Total: 9 commits** (1 spec + 1 scaffold + 6 calcs + 1 holistic/final)

**Push strategy:** per-calc push (P6 series proven safer — caught 5 cross-cutting fixes at P6-1; per-calc pattern caught issues earlier at the calc that introduced them).

---

## Things explicitly NOT in scope

1. ❌ **TS warnings** — `HEALTH_BANDS` re-export ambiguity + `categoryId` not in type. Pre-existing across P5+P6, non-blocking (`pnpm check` doesn't run `tsc`). User confirmed "不修".
2. ❌ **ToolEngine type augmentation** — would require adding `categoryId`, `applicationCategory`, `tags`, `keywords`, `sources`, `reviewedBy` to the central type. Out-of-scope; can be addressed in a future dedicated refactor batch.
3. ❌ **Vertical-specific variants** — all 6 calcs use Business v3 standard (6 emoji sections). No "Operations v3" variant needed; user chose "混合 audience" so we don't domain-lock.
4. ❌ **External data integration** — benchmarks are hardcoded in spec/code, not fetched from any industry database. Per YAGNI.
5. ❌ **Multi-supplier comparison** — P7-6 scorecard scores ONE supplier. Multi-supplier side-by-side could be a future calc.
6. ❌ **EOQ (Economic Order Quantity)** — related to reorder point but distinct (calculates optimal order size, not when). Out-of-scope; can be P8+.
7. ❌ **Demand forecasting** — P7-4 ROP assumes demand distribution given; doesn't forecast future demand. Out-of-scope.

---

## Risk assessment

| Risk | Likelihood | Mitigation |
|---|---|---|
| CustomFn ASI trap (`}}if`) | Medium | Test with `test-customfn.mjs` per calc |
| Internal-links tier-2 fallback not triggering (since O has 6 calcs at once, low-density window may be ≤ 2 calcs) | Low | P6-1 fallback handles ≤ 3 same-cat peers; with 6 calcs all at once, the 4th sees density, no fallback activation |
| OG samples emoji rejected | Low | Avoid emoji in trend field (P6-1 lesson); label only — no 🟢🟡🟠🔴 |
| TS warnings accumulating | Low | Pre-existing pattern, non-blocking, user accepted |
| Codegen drift | Medium | Run `codegen-examples.mjs --check` per calc commit |
| Math edge cases (zero/NaN) | Medium | Each helper has explicit zero guard; tests cover boundary |

---

## Execution plan summary

| Phase | Time | Commits |
|---|---|---|
| Spec doc write + commit | 10 min | 1 |
| Scaffold (P7-0) | 5 min | 1 |
| P7-1..P7-6 per-calc (6 × 30 min) | 3 hr | 6 |
| Holistic review + memory + dual push | 15 min | 1 |
| **Total** | **~3.5 hr** | **9** |

**Final state target:**
- 56 engines live (was 50)
- 9 categories: ai-cost, cost, freelance, investment, real-estate, saas, valuation, marketing, **operations (NEW)**
- 33 new inputs / 39 new math tests across P7
- pnpm check passes: **415 + 39 = 454 pass / 0 fail / 0 skip**
- Both mirrors synced: gitee `wlz679/calcKit` 50→56, github `wlz679/forgeflow` 50→56

---

## Process lessons crystallized (from P5/P6 series)

These carry forward to P7:

1. **Per-calc push cadence** — each calculator shipped individually. P5 holistic review caught bugs late; P6 split per-calc caught the same class of bugs earlier at the calc that introduced them (P6-1 had 5 cross-cutting fixes, all caught early).
2. **Per-file `HEALTH_BANDS` export** — YAGNI prevents premature shared abstraction. Each calc owns its thresholds.
3. **ToolEngine type does NOT include `categoryId`/`applicationCategory`/`tags`/`keywords`/`sources`** — all engines use them but type is silent. Could be augmented in future batch.
4. **Mid-flight helper signature fix** (P6-4 interpolateRetention) — when designing helper functions, require callers to pass all needed context explicitly. Sub-segment vs full-segment ambiguity was the root cause.
5. **First batch to ship with full pnpm check 0 fail from P6-1 onwards** — 5/6 P6 calcs passed pnpm check first time after P6-1 pre-emptive fixes. P5 was 0/8 first-time. Apply same scaffold-heavy approach to P7.
6. **`codegen-examples.mjs` only regenerates `staticExamples[0]`** — engines shipping `[1+]`, `[2+]`, ... (alternative scenarios) are not auto-checked. If `generate()` logic changes, verify `[1+]` manually.
7. **customFn JS parse safety** — `}}if(...)` ASI trap. Insert literal `;` between `}` and statement-starter token.

---

## Related documents

- `docs/superpowers/specs/2026-07-04-p6-marketing-analytics-batch-design.md` — direct precedent
- `docs/superpowers/specs/2026-07-04-p5-real-estate-batch-design.md` — vertical-depth pattern origin
- `memory/p6-series-shipped.md` — P6 retrospective
- `memory/p5-series-shipped.md` — P5 retrospective (holistic caught real bug)
- CLAUDE.md — v3 Business standard + 6-section structure