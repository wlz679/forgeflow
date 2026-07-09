# P9 Retention & Customer Success Calculator Batch Design

**Date:** 2026-07-09
**Status:** DRAFT (brainstorming)
**Author:** Claude (controller direct execution, post P8 series)
**Context:** P9 sub-project — extend 62 v3-standard calculators with a **retention & customer success vertical-depth batch (6 engines)** in a new `retention/` category. Closes the funnel with P6 marketing analytics (acquisition) and P8 sales (closing) — CS handles retention, expansion, and health scoring, the third leg of the B2B SaaS flywheel. Targets mid-market B2B SaaS ($10M–$50M ARR) CSMs and RevOps leads searching for "NRR calculator", "GRR calculator", "expansion revenue", "logo churn rate", "customer health score", "renewal rate" — 6 distinct retention/expansion personas in one cluster.

---

## Executive Summary

| Element | Decision |
|---|---|
| **Batch size** | 6 engines (P9-1 through P9-6) — same as P5/P6/P7/P8 (38→44→50→56→62), takes us to **62→68** engines. **Total inputs across 6 calcs = 19** (4+3+3+2+5+1 select+2) |
| **Category** | New `src/engines/retention/` + `src/data/tools/retention.ts`; **`categoryId: 'R'`** (Retention & Customer Success — new letter; A/B/C/D/E/F/M/O/S all used) |
| **Audience** | Mid-market B2B SaaS ($10M–$50M ARR) CSMs, RevOps leads, founders wearing CS hat (post-PMF, formal CSM role, QBR cadence established) |
| **Coverage matrix** | Retention outcome (P9-1 NRR, P9-2 GRR) · Expansion lever (P9-3 Expansion Revenue) · Churn analysis (P9-4 Logo Churn Rate) · Health/operational (P9-5 Customer Health Score) · Renewal performance (P9-6 Renewal Rate) |
| **Output model** | **Business v3 standard** (6+ emoji sections: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip) — applies cleanly because all 6 calcs share "current-vs-target metric" framing |
| **Math depth** | Each engine has distinct math (4-MRR cascade · 3-MRR ratio · 3-MRR sum · 2-customer ratio · weighted 5-signal composite · 2-ARR ratio) — not thin overlays |
| **i18n** | en + zh (auto-translates via existing pipeline) |
| **Wiring** | Per-calculator 8-file checklist + 2 test count bumps — identical to P5/P6/P7/P8 lesson |
| **Execution** | Controller direct inline — no subagent dispatch (P4-3+ lesson; pure mechanical calculators) |
| **Push cadence** | One commit + per-calculator push (per-calc, not batch) — P5/P6/P7/P8 proven safer for early bug surfacing |
| **TS warnings** | NOT fixed — P6 silent warnings (HEALTH_BANDS re-export ambiguity + categoryId not in type) carry over; pre-existing pattern across P5+P6+P7+P8, non-blocking |

## Why retention/CS vertical depth (not breadth)

Per brainstorm summary:
- All 6 topics have proven SEO demand + clear mid-market B2B SaaS persona (NRR is the most-searched retention KPI; GRR is the leading indicator that strips expansion noise; logo churn is the count-based complement to GRR)
- Closes the loop with P6 marketing (acquisition) + P8 sales (closing) — Customer Success handles retention + expansion + health, the third leg of the B2B SaaS flywheel
- Categories A/B/C/D/E/F/M/O/S are filled; **R** is the cleanest semantic landing ("Retention" is the unified industry term for NRR/GRR/Logo Churn/Renewal Rate)
- Topical authority: 6 interlinked CS pages form a recognized cluster (NRR → GRR → Expansion → Logo Churn → Health Score → Renewal Rate — natural reading order matching the "diagnose → intervene → renew" CS cycle)
- Math models are genuinely distinct (4-MRR cascade · 3-MRR ratio · 3-MRR sum · 2-customer ratio · weighted 5-signal composite · 2-ARR ratio)
- No engine-pattern risk (proven v3 standard, no meta-shift)
- Health Score is the only one with 4 weight presets (P6-5 supplier scorecard pattern) — drives richness without cross-file abstraction
- Different ARR anchor from P8 ($1M–$5M SMB) is intentional: P8 is "founder does sales", P9 is "dedicated CSM at mid-market" — they cover different stages of company growth

### One nuance vs P8

P8 anchored SMB $1M–$5M; P9 anchors mid-market $10M–$50M. Pattern: every vertical-depth batch can pick its own ARR persona when the domain warrants it. Categories A-F are dense (4-10 calcs each); M/O/S have 6 each; R will start at 6.

---

## Architecture

### New directory structure

```
src/
  engines/
    retention/                                    # NEW
      index.ts                                    # 6 imports + re-export
      nrr-calculator.ts                           # P9-1
      grr-calculator.ts                           # P9-2
      expansion-revenue-calculator.ts             # P9-3
      logo-churn-rate-calculator.ts               # P9-4
      customer-health-score-calculator.ts         # P9-5 (4 weight presets)
      renewal-rate-calculator.ts                  # P9-6
  data/
    tools/
      retention.ts                                # NEW — 6 ToolMeta entries
    categories.ts                                 # +1 entry 'R' Retention & CS
  pages/
    [lang]/
      retention.astro                             # NEW — category landing page
docs/
  superpowers/
    specs/
      2026-07-09-p9-retention-batch-design.md     # this file
```

### Per-calculator file structure

Each engine mirrors P6/P7/P8 file pattern (proven in P6-spec-as-plan and validated through 24 shipped calcs):

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

1. `src/engines/retention/<slug>-calculator.ts` — engine + customFn + HEALTH_BANDS + helpers + calculate
2. `src/engines/retention/index.ts` — +1 import + barrel re-export
3. `scripts/codegen-examples.mjs` — +1 ENGINES entry (alphabetical)
4. `src/data/tools/retention.ts` — +1 ToolMeta entry
5. `src/data/og-samples.json` — +1 og-sample line (no emoji in headline, P6-1 fix)
6. `tests/ab-split.test.ts` — 63→N tool count (P9-0 scaffold sets 63, P9-1 increments to 64)
7. `tests/internal-links.test.ts` — 63→N tool count (P9-0 scaffold sets 63, P9-1 increments to 64)
8. `tests/<slug>-calculator.test.ts` — new test file with 6-10 math tests

P9-1 also adds (in addition to the above):
- `src/data/seo-schemas/listingPages.ts` — 'R' category entry (P7-0 lesson: dist/ must auto-rebuild)

### Batch scaffolding (Task 0 — separate commit before per-calc push)

1. Create `src/engines/retention/` directory + `index.ts` (empty barrel)
2. Create `src/data/tools/retention.ts` (empty array)
3. Add `R` entry to `src/data/categories.ts` (id='R', name='Retention & Customer Success', slug='retention', description='Calculate NRR, GRR, expansion revenue, logo churn rate, customer health score, and renewal rate for mid-market B2B SaaS CSMs and RevOps leads.')
4. Create `src/pages/[lang]/retention.astro` (mirror `sales.astro` with `CATEGORY_ID = 'R'`)
5. Bump `tests/ab-split.test.ts` count: 62→**63** (P8-0 over-bump 56→62 was wrong; P9-0 follows correct +1 pattern)
6. Bump `tests/internal-links.test.ts` count: 62→**63**
7. Verify `pnpm check` green + `pnpm build` still produces 225 pages (P9-0 doesn't add new pages — listing page reuses existing pattern; pages total 225→231 after P9-1 because each new tool gets a detail page in both en + zh = +12)

### Shared conventions (within file, no cross-file abstraction per YAGNI)

- All `HEALTH_BANDS` constants **per-file** (P6+ pattern; shared helper is premature)
- `STAGE_PROBABILITIES` / `WEIGHT_PRESETS` only where the math actually has named stages
- Math helpers **exported** with explicit type signatures for testability
- `calculate()` returns `string[]` of exactly **6** entries (the 6 v3 sections)
- `staticExamples[0]` **regenerated by `codegen-examples.mjs`** after any `calculate()` edit (P4-2 lesson: drift detected by `--check`)
- `customFn` is minified JS, escaped unicode, ASI-safe; verified by `node tests/scripts/test-customfn.mjs <slug>`

### Boundary convention (per P7-2/P7-5 lesson)

- Each `calcHealthBand(value)` uses consistent `>=` / `<` direction per band
- All exact-boundary test cases (`=== threshold`) included in test file
- Implementer verifies boundary direction **literally** from spec, not from spec's verbal description

---

## The 6 Calculators

### P9-1: NRR Calculator (Net Revenue Retention)

**Slug:** `solopreneur-nrr-calculator`

**Purpose:** Compute net revenue retention — the headline SaaS metric every board reports. NRR measures how much revenue you keep + grow from existing customers, isolating retention from new sales.

**Formula:**
```
NRR = (startingMRR + expansionMRR - downgradeMRR - churnedMRR) / startingMRR
```

**Inputs (4):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `startingMRR` | Starting MRR (USD) | number | 100000 | e.g. 100000 |
| `expansionMRR` | Expansion MRR (upsell + cross-sell) | number | 15000 | e.g. 15000 |
| `downgradeMRR` | Downgrade MRR | number | 5000 | e.g. 5000 |
| `churnedMRR` | Churned MRR | number | 8000 | e.g. 8000 |

**Math model:**
```ts
netRetainedMRR = startingMRR + expansionMRR - downgradeMRR - churnedMRR
nrr = netRetainedMRR / startingMRR  // expressed as ratio; display as percent
```

**Canonical computation (defaults):**
- netRetainedMRR = 100000 + 15000 - 5000 - 8000 = **102000**
- nrr = 102000 / 100000 = **1.02** → display **102%** (band: 🟠 warning, 100-110)

**Health bands (mid-market $10M-$50M B2B SaaS):**
- 🟢 excellent: `≥ 120%` (top-quartile; Snowflake/Datadog 130%+, mid-market best-in-class)
- 🟡 good: `110% ≤ nrr < 120%` (top-quartile SaaS average)
- 🟠 warning: `100% ≤ nrr < 110%` (growing but at risk; median mid-market)
- 🔴 critical: `nrr < 100%` (revenue declining even before new sales)

**6-section output:**
1. 🩺 Health — band + NRR% + retained MRR (absolute)
2. 📊 Inputs Snapshot — startingMRR / expansionMRR / downgradeMRR / churnedMRR
3. 🔄 What-If — "If churnedMRR 8000→5000: NRR 105% (🟠→🟡)"; "If expansionMRR 15000→25000: NRR 112% (🟠→🟡)"
4. ⚖️ Break-Even — "Need churnedMRR 8000→0 OR expansionMRR 15000→25000 for 🟡"
5. 🎯 Milestone — "8pp to next tier (🟡 Good at 110%)"
6. 💡 Tip — band-driven (🟢 maintain cadence; 🟡 focus on reducing churn; 🟠 expansion motion is critical; 🔴 urgent: retention emergency)

**Tests (8):**
1. `nrr(100000, 15000, 5000, 8000) === 1.02` (canonical)
2. `netRetainedMRR(100000, 15000, 5000, 8000) === 102000`
3. `calcHealthBand(0.99) === 'critical'`
4. `calcHealthBand(1.00) === 'warning'` (exact boundary, 100% = at-risk threshold)
5. `calcHealthBand(1.10) === 'good'` (exact boundary)
6. `calcHealthBand(1.20) === 'excellent'` (exact boundary)
7. Zero everything: `nrr(0, 0, 0, 0) → 0 → critical` (zero division guard)
8. Pure expansion: `nrr(100000, 25000, 0, 0) === 1.25` (excellent scenario)

---

### P9-2: GRR Calculator (Gross Revenue Retention)

**Slug:** `solopreneur-grr-calculator`

**Purpose:** Compute gross revenue retention — the pure retention signal that strips out expansion. GRR ≤ 100% always (no expansion). Investors use GRR to assess the "leaky bucket" before counting expansion as a save.

**Formula:**
```
GRR = (startingMRR - downgradeMRR - churnedMRR) / startingMRR
```

**Inputs (3):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `startingMRR` | Starting MRR (USD) | number | 100000 | e.g. 100000 |
| `downgradeMRR` | Downgrade MRR | number | 5000 | e.g. 5000 |
| `churnedMRR` | Churned MRR | number | 8000 | e.g. 8000 |

**Math model:**
```ts
retainedMRR = startingMRR - downgradeMRR - churnedMRR
grr = retainedMRR / startingMRR
```

**Canonical computation (defaults):**
- retainedMRR = 100000 - 5000 - 8000 = **87000**
- grr = 87000 / 100000 = **0.87** → display **87%** (band: 🟠 warning, 80-90)

**Health bands (mid-market $10M-$50M B2B SaaS):**
- 🟢 excellent: `≥ 95%` (best-in-class; top-quartile SaaS)
- 🟡 good: `90% ≤ grr < 95%` (top-quartile SaaS average; SaaS Capital median 90-92%)
- 🟠 warning: `80% ≤ grr < 90%` (high churn; mid-market median)
- 🔴 critical: `grr < 80%` (severe churn; unsustainable)

**6-section output:**
1. 🩺 Health — band + GRR% + churned + downgraded (combined loss)
2. 📊 Inputs Snapshot — startingMRR / downgradeMRR / churnedMRR
3. 🔄 What-If — "If churnedMRR 8000→3000: GRR 92% (🟠→🟡)"; "If downgradeMRR 5000→0: GRR 92%"
4. ⚖️ Break-Even — "Need churned+downgrade reduce by 7pp (13%→6%) for 🟡"
5. 🎯 Milestone — "3pp to next tier (🟡 Good at 90%)"
6. 💡 Tip — band-driven (🟢 maintain; 🟡 monitor at-risk accounts; 🟠 intervention needed; 🔴 urgent: churn is bleeding the business)

**Tests (7):**
1. `grr(100000, 5000, 8000) === 0.87` (canonical)
2. `retainedMRR(100000, 5000, 8000) === 87000`
3. `calcHealthBand(0.79) === 'critical'`
4. `calcHealthBand(0.80) === 'warning'` (exact boundary)
5. `calcHealthBand(0.90) === 'good'` (exact boundary)
6. `calcHealthBand(0.95) === 'excellent'` (exact boundary)
7. Zero loss: `grr(100000, 0, 0) === 1.0` (best case, still warning since <120% would be wrong; but 1.0 should be 'warning' per spec band table — explicit)

---

### P9-3: Expansion Revenue Calculator

**Slug:** `solopreneur-expansion-revenue-calculator`

**Purpose:** Compute expansion revenue as % of starting MRR — the top-line growth lever from existing customers. Separates upsell (same product, more seats/usage) from cross-sell (new product). High expansion is what enables NRR > 100% even when GRR is mediocre.

**Formula:**
```
expansionMRR = upsellMRR + crossSellMRR
expansionPct = expansionMRR / startingMRR
```

**Inputs (3):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `startingMRR` | Starting MRR (USD) | number | 100000 | e.g. 100000 |
| `upsellMRR` | Upsell MRR (same product, more usage) | number | 12000 | e.g. 12000 |
| `crossSellMRR` | Cross-sell MRR (additional products) | number | 5000 | e.g. 5000 |

**Math model:**
```ts
expansionMRR = upsellMRR + crossSellMRR
expansionPct = expansionMRR / startingMRR
```

**Canonical computation (defaults):**
- expansionMRR = 12000 + 5000 = **17000**
- expansionPct = 17000 / 100000 = **0.17** → display **17%** (band: 🟡 good, 15-25%)

**Health bands (mid-market $10M-$50M B2B SaaS):**
- 🟢 excellent: `≥ 25%` (best-in-class; mid-market strong motion)
- 🟡 good: `15% ≤ expansionPct < 25%` (top-quartile mid-market)
- 🟠 warning: `5% ≤ expansionPct < 15%` (motion exists but underweight)
- 🔴 critical: `expansionPct < 5%` (no expansion motion; pure retention play)

**6-section output:**
1. 🩺 Health — band + expansionPct% + total expansion MRR + upsell vs cross-sell split
2. 📊 Inputs Snapshot — startingMRR / upsellMRR / crossSellMRR
3. 🔄 What-If — "If upsellMRR 12000→20000: expansion 25% (🟡→🟢)"; "If crossSellMRR 5000→15000: expansion 27%"
4. ⚖️ Break-Even — "Need upsellMRR 12000→20000 (OR crossSellMRR 5000→10000) for 🟢"
5. 🎯 Milestone — "8pp to next tier (🟢 Excellent at 25%)"
6. 💡 Tip — band-driven (🟢 strong motion, double down; 🟡 identify upsell triggers; 🟠 land-and-expand playbook needed; 🔴 expansion play absent)

**Tests (6):**
1. `expansionPct(100000, 12000, 5000) === 0.17` (canonical)
2. `expansionMRR(12000, 5000) === 17000`
3. `calcHealthBand(0.04) === 'critical'`
4. `calcHealthBand(0.05) === 'warning'` (exact boundary)
5. `calcHealthBand(0.15) === 'good'` (exact boundary)
6. `calcHealthBand(0.25) === 'excellent'` (exact boundary)

---

### P9-4: Logo Churn Rate Calculator

**Slug:** `solopreneur-logo-churn-rate-calculator`

**Purpose:** Compute customer (logo) churn rate — count-based, complement to GRR (revenue-based). Logo Churn counts lost customers; GRR counts lost revenue. They diverge when customers at different price tiers churn at different rates.

**Formula:**
```
logoChurnPct = lostCustomers / startCustomers
```

**Inputs (2):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `startCustomers` | Customers at period start | number | 100 | e.g. 100 |
| `lostCustomers` | Customers lost during period | number | 8 | e.g. 8 |

**Math model:**
```ts
logoChurnPct = lostCustomers / startCustomers
retainedCustomers = startCustomers - lostCustomers
```

**Canonical computation (defaults):**
- logoChurnPct = 8 / 100 = **0.08** → display **8%** (band: 🟡 good, 5-10%)
- retainedCustomers = 92

**Health bands (mid-market $10M-$50M B2B SaaS, annual):**
- 🟢 excellent: `logoChurnPct < 5%` (best-in-class retention)
- 🟡 good: `5% ≤ logoChurnPct < 10%` (top-quartile)
- 🟠 warning: `10% ≤ logoChurnPct < 20%` (high churn; needs intervention)
- 🔴 critical: `logoChurnPct ≥ 20%` (severe; business model at risk)

**6-section output:**
1. 🩺 Health — band + logoChurnPct% + retained customers count
2. 📊 Inputs Snapshot — startCustomers / lostCustomers
3. 🔄 What-If — "If lostCustomers 8→5: churn 5% (🟡→🟢)"; "If lostCustomers 8→3: churn 3%"
4. ⚖️ Break-Even — "Need lostCustomers 8→4 (or 4% churn) for 🟢"
5. 🎯 Milestone — "3pp to next tier (🟢 Excellent at 5%)"
6. 💡 Tip — band-driven (🟢 maintain; 🟡 monitor at-risk; 🟠 save play needed; 🔴 emergency: business model review)

**Tests (6):**
1. `logoChurnPct(100, 8) === 0.08` (canonical)
2. `retainedCustomers(100, 8) === 92`
3. `calcHealthBand(0.04) === 'excellent'`
4. `calcHealthBand(0.05) === 'good'` (exact boundary)
5. `calcHealthBand(0.10) === 'warning'` (exact boundary)
6. `calcHealthBand(0.20) === 'critical'` (exact boundary)

---

### P9-5: Customer Health Score Calculator

**Slug:** `solopreneur-customer-health-score-calculator`

**Purpose:** Compute composite customer health score (0-100) from 5 weighted signals. The early warning system for at-risk accounts. 4 weight presets let CSMs tune the model to their motion (Product-led / Service-led / Sales-led / Balanced).

**Formula:**
```
For each signal:
  normalized = normalize(signal)  // 0-100
score = sum(normalized[i] * weight[i])  for i in 5 signals
```
Where weights are determined by selected preset.

**Inputs (5 + 1 select):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `productUsage` | Product usage score (0-100) | number | 75 | e.g. 75 |
| `nps` | NPS (-100 to +100) | number | 40 | e.g. 40 |
| `supportTickets` | Support tickets (last 90 days) | number | 5 | e.g. 5 |
| `engagement` | Engagement score (0-100) | number | 80 | e.g. 80 |
| `contractValue` | Contract value score (0-100) | number | 60 | e.g. 60 |
| `weightPreset` | Weight preset | select | balanced | ['balanced', 'product-led', 'service-led', 'sales-led'] |

**Normalization rules (input → 0-100):**
- `productUsage` already 0-100; pass through
- `nps` -100 to +100; normalize as `(nps + 100) / 2` (NPS -100→0, 0→50, +100→100)
- `supportTickets` 0-50; normalize as `100 - min(tickets * 4, 100)` (inverse: 0 tickets→100, 25+ tickets→0)
- `engagement` already 0-100; pass through
- `contractValue` already 0-100; pass through

**Weight presets:**

| Preset | Product | NPS | Support | Engagement | Contract |
|---|---|---|---|---|---|
| `balanced` (default) | 20% | 20% | 20% | 20% | 20% |
| `product-led` | 50% | 15% | 10% | 15% | 10% |
| `service-led` | 10% | 20% | 35% | 25% | 10% |
| `sales-led` | 15% | 25% | 10% | 10% | 40% |

**Math model:**
```ts
function normalize(signalName: string, value: number): number {
  if (signalName === 'nps') return (value + 100) / 2;
  if (signalName === 'supportTickets') return 100 - Math.min(value * 4, 100);
  return value;  // productUsage, engagement, contractValue already 0-100
}
const PRESETS = {
  balanced:   [0.20, 0.20, 0.20, 0.20, 0.20],
  'product-led': [0.50, 0.15, 0.10, 0.15, 0.10],
  'service-led': [0.10, 0.20, 0.35, 0.25, 0.10],
  'sales-led':   [0.15, 0.25, 0.10, 0.10, 0.40],
};
function healthScore(productUsage, nps, supportTickets, engagement, contractValue, preset): number {
  const signals = [productUsage, nps, supportTickets, engagement, contractValue].map((v, i) =>
    normalize(['productUsage', 'nps', 'supportTickets', 'engagement', 'contractValue'][i], v)
  );
  const weights = PRESETS[preset];
  return signals.reduce((sum, sig, i) => sum + sig * weights[i], 0);
}
```

**Canonical computation (defaults, balanced preset):**
- normalized: [75, (40+100)/2=70, 100-min(5*4, 100)=80, 80, 60] = [75, 70, 80, 80, 60]
- weights: [0.20, 0.20, 0.20, 0.20, 0.20]
- score = 75×0.2 + 70×0.2 + 80×0.2 + 80×0.2 + 60×0.2 = 15 + 14 + 16 + 16 + 12 = **73** (band: 🟡 good, 60-80)

**Health bands (mid-market $10M-$50M B2B SaaS):**
- 🟢 excellent: `score ≥ 80` (healthy; expand motion)
- 🟡 good: `60 ≤ score < 80` (monitor; engagement check)
- 🟠 warning: `40 ≤ score < 60` (at risk; save play needed)
- 🔴 critical: `score < 40` (critical; emergency intervention)

**6-section output:**
1. 🩺 Health — band + healthScore (0-100) + preset name + active weights display
2. 📊 Inputs Snapshot — 5 signals raw + normalized + preset weights table
3. 🔄 What-If — "If NPS 40→70: score 77 (still 🟡 good, close to 🟢)"; "If productUsage 75→90: score 76"
4. ⚖️ Break-Even — "Need score 73→80 (7 more points) for 🟢 — try raising productUsage 75→95 OR reducing supportTickets 5→2"
5. 🎯 Milestone — "7 points to next tier (🟢 Excellent at 80)"
6. 💡 Tip — band-driven + preset-aware (🟢+product-led: focus on adoption depth; 🟢+service-led: maintain response quality; 🟠+service-led: support tickets = leading indicator; 🔴 any preset: emergency save)

**Tests (10):**
1. `normalize('nps', 0) === 50`
2. `normalize('nps', 100) === 100`
3. `normalize('nps', -100) === 0`
4. `normalize('supportTickets', 0) === 100`
5. `normalize('supportTickets', 25) === 0` (25+ tickets saturates)
6. `normalize('supportTickets', 5) === 80` (canonical)
7. `healthScore(75, 40, 5, 80, 60, 'balanced') === 73` (canonical)
8. `healthScore(0, -100, 50, 0, 0, 'balanced') === 12.5` (worst case normalization)
9. `healthScore(100, 100, 0, 100, 100, 'balanced') === 100` (best case)
10. Preset weights sum to 1: all 4 presets `Σ weights === 1.0`

---

### P9-6: Renewal Rate Calculator

**Slug:** `solopreneur-renewal-rate-calculator`

**Purpose:** Compute renewal rate — the % of ARR up for renewal that actually closed. The operational metric for CSM team performance and QBR cadence. Distinct from NRR/GRR (which are customer-based) and from retention (which is logo-based).

**Formula:**
```
renewalRate = renewedARR / upForRenewalARR
```

**Inputs (2):**

| Name | Label | Type | Default | Placeholder |
|---|---|---|---|---|
| `upForRenewalARR` | ARR up for renewal (USD) | number | 1000000 | e.g. 1000000 |
| `renewedARR` | ARR renewed (USD) | number | 850000 | e.g. 850000 |

**Math model:**
```ts
renewalRate = renewedARR / upForRenewalARR
churnedARR = upForRenewalARR - renewedARR
```

**Canonical computation (defaults):**
- renewalRate = 850000 / 1000000 = **0.85** → display **85%** (band: 🟡 good, 80-90%)
- churnedARR = 150000

**Health bands (mid-market $10M-$50M B2B SaaS):**
- 🟢 excellent: `renewalRate ≥ 90%` (best-in-class CSM team)
- 🟡 good: `80% ≤ renewalRate < 90%` (top-quartile; Gainsight CSM practice ≥85% is healthy)
- 🟠 warning: `70% ≤ renewalRate < 80%` (below benchmark; playbook review needed)
- 🔴 critical: `renewalRate < 70%` (severe; CSM team or product-market fit issue)

**6-section output:**
1. 🩺 Health — band + renewalRate% + renewed + churned (absolute ARR)
2. 📊 Inputs Snapshot — upForRenewalARR / renewedARR
3. 🔄 What-If — "If renewedARR 850K→900K: renewal 90% (🟡→🟢)"; "If renewedARR 850K→750K: renewal 75% (🟡→🟠)"
4. ⚖️ Break-Even — "Need renewedARR 850K→900K (+$50K) for 🟢"
5. 🎯 Milestone — "5pp to next tier (🟢 Excellent at 90%)"
6. 💡 Tip — band-driven (🟢 CSM team strong; 🟡 monitor save plays; 🟠 QBR cadence review; 🔴 emergency: CSM process + product fit review)

**Tests (6):**
1. `renewalRate(1000000, 850000) === 0.85` (canonical)
2. `churnedARR(1000000, 850000) === 150000`
3. `calcHealthBand(0.69) === 'critical'`
4. `calcHealthBand(0.70) === 'warning'` (exact boundary)
5. `calcHealthBand(0.80) === 'good'` (exact boundary)
6. `calcHealthBand(0.90) === 'excellent'` (exact boundary)

---

## Health Bands Summary

| Calc | Unit | 🟢 | 🟡 | 🟠 | 🔴 |
|---|---|---|---|---|---|
| NRR | % | ≥120 | 110-120 | 100-110 | <100 |
| GRR | % | ≥95 | 90-95 | 80-90 | <80 |
| Expansion | % | ≥25 | 15-25 | 5-15 | <5 |
| Logo Churn | % | <5 | 5-10 | 10-20 | ≥20 |
| Health Score | 0-100 | ≥80 | 60-80 | 40-60 | <40 |
| Renewal Rate | % | ≥90 | 80-90 | 70-80 | <70 |

All boundaries are **inclusive lower** (`≥`) and **exclusive upper** (`<`), per P7-2/P7-5 lesson. Tests verify exact boundary behavior.

---

## Default Input Values (Mid-market B2B SaaS anchor)

Canonical defaults chosen to hit the "warning" or "good" band on first render (so users see a realistic, not aspirational, baseline):

| Calc | Defaults | Result | Band |
|---|---|---|---|
| NRR | start=100K, exp=15K, down=5K, churn=8K | 102% | 🟠 warning |
| GRR | start=100K, down=5K, churn=8K | 87% | 🟠 warning |
| Expansion | start=100K, up=12K, cross=5K | 17% | 🟡 good |
| Logo Churn | start=100, lost=8 | 8% | 🟡 good |
| Health Score | 75/40/5/80/60, balanced | 73 | 🟡 good |
| Renewal Rate | upFor=1M, renewed=850K | 85% | 🟡 good |

These defaults give first-time visitors a **realistic mid-market CSM snapshot** — not a "best-case" dashboard that misleads.

---

## Wiring (per-calc commit)

Each P9-N commit modifies:
1. `src/engines/retention/<slug>-calculator.ts` — new engine file
2. `src/engines/retention/index.ts` — add import + registerEngine
3. `scripts/codegen-examples.mjs` — add ENGINES entry
4. `src/data/tools/retention.ts` — add ToolMeta entry
5. `src/data/og-samples.json` — add og-sample line (no emoji in headline, P6-1 fix)
6. `tests/ab-split.test.ts` — 63→N tool count
7. `tests/internal-links.test.ts` — 63→N tool count
8. `tests/<slug>-calculator.test.ts` — new test file with 6-10 math tests

P9-1 also adds (in addition to the above):
- `src/data/seo-schemas/listingPages.ts` — 'R' category entry (P7-0 lesson: dist/ must auto-rebuild)

---

## Implementation Sequence

```
spec(p9) → plan(p9) → scaffold(p9-0) → 6× calc commits → holistic(p9-7)
```

8 commits + 1 holistic review.

### Per-Calc Workflow (~30 min/calc, B 档 math)
1. Write `tests/<slug>-calculator.test.ts` with math helper tests
2. Run tests — expect RED
3. Write `src/engines/retention/<slug>-calculator.ts` math helpers (export for tests)
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
- `tests/run.mjs` (all 514+ tests pass)

---

## P9-7 Holistic Review

Before P9 series close, review:

| Check | Risk |
|-------|------|
| 6 engine HEALTH_BANDS no cross-leakage | Wrong threshold (used other calc's) |
| 6 calc defaults render correctly in v3 output | Text rendering bug |
| 6 customFn all parse | ASI / template string |
| `og-samples.json` 6 entries no emoji (P6-1 fix) | SEO/OG bug |
| `internal-links.ts` all 68 tools have 4 related | Cross-cat fallback |
| Health Score preset weights sum to 1.0 in all 4 presets | Math bug |
| `tests/run.mjs` full pass / 0 fail | Math bug |
| `pnpm check` all green | Typecheck/i18n drift |
| `pnpm build` 231 static pages (225 + 12: 6 tools × 2 langs) | SSR issue |

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| 43 boundary tests fail (P7-2/P7-5 lesson) | Spec writes explicit `≥` / `<` notation per calc; implementers verify boundary direction literally |
| Spec canonical expected value miscomputed (P7-3 lesson) | Spec manually computes each calc's default input → output; cross-check by implementer before writing test |
| Health Score normalization off-by-one (NPS edge -100, +100; support edge 25) | Tests verify exact boundary at -100, 0, +100 for NPS and 0, 25, 50 for support |
| Health Score preset weights don't sum to 1.0 | Test 10 explicitly verifies all 4 presets sum to 1.0 |
| 6 customFn ASI trap | Run `test-customfn.mjs <slug>` per calc (not just at end) |
| Time exceeds 30 min/calc (breaks cadence) | All formulas simple arithmetic (B 档 math); P9-5 is most complex but still mechanical |
| Health band threshold direction ambiguity | Each calc's health band uses consistent `≥ / <` notation; tests verify exact direction |
| ARR anchor mismatch (P8 SMB vs P9 mid-market) | Intentional; spec is explicit about persona. Per-calc intro sentence states "mid-market $10M–$50M" |

---

## Cross-Cutting Carry-Forward (P6-1 fixes still apply)

- `src/data/internal-links.ts` Tier-2 score-0 fallback handles 'R' category seed phase
- `src/data/seo-schemas/listingPages.ts` already supports array of categories (P6-1 fix)
- `src/data/og-samples.json` no emoji in headlines (P6-1 fix)
- `src/engines/<cat>/index.ts` barrel pattern (P7/P8 proven)

No new cross-cutting fixes expected for P9.

---

## Memory Files (post-ship)

After P9 ships:
1. `memory/p9-0-scaffold-shipped.md`
2. `memory/p9-1-nrr-shipped.md`
3. `memory/p9-2-grr-shipped.md`
4. `memory/p9-3-expansion-revenue-shipped.md`
5. `memory/p9-4-logo-churn-rate-shipped.md`
6. `memory/p9-5-customer-health-score-shipped.md`
7. `memory/p9-6-renewal-rate-shipped.md`
8. `memory/p9-series-shipped.md` (final retrospective, includes P9-7 holistic review findings)
9. Update `memory/MEMORY.md` index

---

## P9 Completion Criteria

- [ ] All 6 calcs shipped, 0 mid-flight fix (P7-6 lesson: clean ships possible when spec is verified)
- [ ] tests/run.mjs: 514 + 43 = 557 pass / 0 fail / 0 skip
- [ ] pnpm check: 0 errors
- [ ] pnpm build: 231 static pages (was 225)
- [ ] Both mirrors synced (github forgeflow 62→68 + gitee calcKit 62→68)
- [ ] 8 memory files written + MEMORY.md index updated
- [ ] User-facing P9 README/summary post created (if applicable)
