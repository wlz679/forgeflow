# P6 Marketing Analytics Calculator Batch Design

**Date:** 2026-07-04
**Status:** DRAFT (brainstorming)
**Author:** Claude (controller direct execution, post P5 series)
**Context:** P6 sub-project — extend 44 v3-standard calculators with a **marketing-analytics vertical-depth batch (6 engines)** in a new `marketing/` category. Closes SEO gaps for "ROAS calculator" / "LTV by channel" / "funnel value" / "cohort retention" / "email campaign ROI" / "content marketing ROI" — 6 distinct marketing analytics audiences in one cluster.

---

## Executive Summary

| Element | Decision |
|---|---|
| **Batch size** | 6 engines (P6-1 through P6-6) — same size as P5 series (38→44), takes us to **44→50** engines. **Total inputs across 6 calcs = 45** (4+15+6+7+6+7 — note P6-2 has 15 inputs due to 5-channel structure) |
| **Category** | New `src/engines/marketing/` + `src/data/tools/marketing.ts`; **`categoryId: 'M'`** (Marketing Analytics — new letter since A-F all used) |
| **Coverage matrix** | Performance marketer (P6-1 ROAS, P6-2 LTV by Channel) · Growth analyst (P6-3 Funnel Value, P6-4 Cohort Retention) · Retention/email/content (P6-5 Email ROI, P6-6 Content ROI) |
| **Output model** | **Business v3 standard** (6+ emoji sections: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip) per CLAUDE.md — applies because marketing analytics shares the "time/value" duality with finance, and `Break-Even` is interpretable as "payback" / "lead-to-revenue breakeven" |
| **Math depth** | Each engine has distinct math (ROAS ratio · per-channel LTV:CAC ranking · funnel cascade value · retention decay curve · email ROI · content SEO pipeline) — not thin overlays |
| **i18n** | en + zh (auto-translates via existing pipeline) |
| **Wiring** | Per-calculator 6-file checklist + 2 test count bumps — identical to P5 lesson |
| **Execution** | Controller direct inline — no subagent dispatch (P4-3+ lesson; pure mechanical calculators) |
| **Push cadence** | One commit + per-calculator push (per-calc, not batch) — P5 series proven safer for early bug surfacing |

## Why marketing-analytics vertical depth (not breadth)

Per brainstorm summary above:
- All 6 topics have proven SEO demand + clear solopreneur/SaaS persona (Google Ads, Meta, TikTok, lifecycle marketing all use these daily)
- Categories A-F are filled; M is the cleanest semantic landing (no awkward "ROAS in real-estate?")
- Topical authority: 6 interlinked marketing pages form a recognized cluster
- Math models are genuinely distinct (ratio, ranked table, decay cascade, time series, sensitivity, attribution)
- No engine-pattern risk (proven v3 standard, no meta-shift)
- 6 calculators share "Benchmark-driven health bands" — Marketing Analytics as a category IS the meta-shift (define HEALTH_BANDS per file, no shared abstraction across calculators — YAGNI per CLAUDE.md)

### One nuance vs P5

P5 (real-estate) crammed into category 'F' (Investment & ROI) — semantically OK but loose. P6 adds a brand-new letter 'M' specifically for Marketing Analytics, since:
- (a) Future marketing calculators can extend this category without crowding
- (b) 'M' isn't taken (F was at letter-skipping distance from E)
- (c) Topical authority cluster strengthens when category is its own letter

---

## Architecture

### New directory structure

```
src/
  engines/
    marketing/                                 # NEW
      index.ts                                 # 6 imports + re-export
      roas-calculator.ts                       # P6-1
      ltv-by-channel-calculator.ts             # P6-2 (5 channels)
      funnel-value-calculator.ts               # P6-3
      cohort-retention-calculator.ts           # P6-4
      email-campaign-roi-calculator.ts         # P6-5
      content-marketing-roi-calculator.ts      # P6-6
  data/
    tools/
      marketing.ts                             # NEW — 6 ToolMeta entries with `ToolInput[]` structured form
    categories.ts                              # +1 entry 'M' Marketing Analytics
docs/
  superpowers/
    plans/
      2026-07-04-p6-marketing-analytics-batch.md   # [MECHANICAL] 6-task implementation plan
specs/
  2026-07-04-p6-marketing-analytics-batch-design.md   # this file
```

### Per-calculator file structure

Each engine mirrors P5-1..P5-6 file pattern (proven in P5-spec-as-plan):

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

### Wiring checklist (per calculator — 6 files)

1. `src/engines/marketing/index.ts` — 6 imports + barrel (first commit only; subsequent calcs append)
2. `scripts/codegen-examples.mjs` — 6 ENGINES entries (alphabetical)
3. `src/data/tools/marketing.ts` — 6 ToolMeta entries (`ToolInput[]` structured form, per P4-2 lesson)
4. `src/data/og-samples.json` — 6 OG samples (headline + headlineUnit + headlineLabel)
5. `tests/ab-split.test.ts` — count bump 44 → 45, 46, 47, 48, 49, 50
6. `tests/internal-links.test.ts` — count bump 44 → 45, 46, 47, 48, 49, 50

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

### Cross-cutting batch scaffolding (Task 0)

A single scaffold commit creates:
- `src/engines/marketing/index.ts` (empty barrel — comments-only)
- `src/data/tools/marketing.ts` (empty exports array — comments-only)
- `src/data/categories.ts` (add `{ id: 'M', name: 'Marketing Analytics', slug: 'marketing-analytics', description: '...' }`)
- `src/data/og-samples.json` (empty objects for 6 new slugs)
- `tests/ab-split.test.ts` (count = 44, but the 6 new entries will fail-check until each calc ships)
- `tests/internal-links.test.ts` (count = 44, same)
- **No** `scripts/codegen-examples.mjs` entries yet (those only appear when an engine is being added)

The 2 test-count files use `≥ N` matching (verified in P5 series), so scaffold bumps the *baseline* count and each calc bumps it again. Run `pnpm check` after scaffold to confirm scaffold doesn't break anything (it should pass — bigger threshold just means older check still passes).

---

## P6-1: ROAS Calculator

**Slug:** `solopreneur-roas-calculator`

### Inputs (4)

| Name | Label | Type | Placeholder | Default |
|---|---|---|---|---|
| `adSpend` | Ad Spend ($) | number | e.g. 5000 | 5000 |
| `revenue` | Gross Revenue Generated ($) | number | e.g. 20000 | 20000 |
| `grossMargin` | Gross Margin (%) | number | e.g. 60 | 60 |
| `attributionWindow` | Attribution Window | select | '7d' / '14d' / '28d' / '90d' | '28d' |

### Math model

```
roasRatio = revenue / adSpend                                              // gross ROAS
netRevenue = revenue * (grossMargin / 100)                                // profit attributable
netROAS = (netRevenue - adSpend) / adSpend * 100                          // net profit %
cpa = adSpend / (revenue / avgOrderValue_optional_unused_here)            // simplified: derive from inputs
effectiveCPM = (adSpend / revenue) * 1000                                 // $ per $1000 revenue (cost ratio)
```

### Health bands (ROAS ratio — gross)

| Band | Range | Color |
|---|---|---|
| Excellent | ≥ 4.0x | 🟢 |
| Good | 2.0x – 4.0x | 🟡 |
| Warning | 1.0x – 2.0x | 🟠 |
| Critical | < 1.0x | 🔴 |

### Outputs (6 sections)

- 🩺 **Health** — ROAS band + Net ROAS band
- 📊 **Inputs Snapshot** — ad spend, revenue, margin, window
- 🔄 **What-If** — "If you +20% revenue → ROAS = 4.8x · If you −20% spend → ROAS = 6.0x" (3 sensitivity rows)
- ⚖️ **Break-Even** — "To break even at 1.0x net ROAS, you need margin = 80% or revenue ↑ 250%"
- 🎯 **Milestone** — "Scaling ad spend 2x at same ROAS = $X revenue, $Y profit / month"
- 💡 **Tip** — Contextual based on band (e.g. 🟢 "Scale to test more channels" / 🟠 "Audit underperforming creatives")

### Math tests (6)

1. `calcROAS(5000, 20000) === 4.0` (canonical: 4x case)
2. `calcNetROAS(5000, 20000, 60) === ((20000*0.6 - 5000)/5000)*100 = 140`
3. `calcROAS(10000, 5000) === 0.5` (losing-money edge case → 🔴)
4. `calcROAS(0, 1000) === Infinity` (zero spend → tip "Enter spend > 0")
5. `effectiveCPM(5000, 20000) === 250` — sanity check ratio
6. What-if scenarios: `+20% revenue` and `−20% spend` produce expected ratios

---

## P6-2: LTV by Channel Calculator

**Slug:** `solopreneur-ltv-by-channel-calculator`

### Inputs (15) — 5 channels × (adSpend, conversions, ltvPerUser)

Per-channel structure (repeats 5 times):

| Channel | spend | conv | ltv | cac | ratio | rank |
|---|---|---|---|---|---|---|
| 1 | $X | N | $L | spend/N | L/cac | — |
| 2 | $X | N | $L | spend/N | L/cac | — |
| 3 | $X | N | $L | spend/N | L/cac | — |
| 4 | $X | N | $L | spend/N | L/cac | — |
| 5 | $X | N | $L | spend/N | L/cac | — |

Form uses 15 individual fields (5×3), not a nested object — mirrors P5-1 input style (flat ToolInput[]).

| Name | Label | Type | Placeholder | Default |
|---|---|---|---|---|
| `ch1_spend` / `ch2_spend` / `ch3_spend` / `ch4_spend` / `ch5_spend` | Ad Spend Ch1..Ch5 ($) | number | e.g. 1000 | 1000 |
| `ch1_conv` / `ch2_conv` / `ch3_conv` / `ch4_conv` / `ch5_conv` | Conversions Ch1..Ch5 | number | e.g. 50 | 50 |
| `ch1_ltv` / `ch2_ltv` / `ch3_ltv` / `ch4_ltv` / `ch5_ltv` | LTV per User Ch1..Ch5 ($) | number | e.g. 500 | 500 |

### Math model

```
perChannel:
  cac = chX_spend / chX_conv  (per channel)
  ratio = chX_ltv / cac       (LTV:CAC ratio per channel)

aggregate:
  totalSpend = sum(5 channels)
  totalConv = sum(5 channels)
  blendedCAC = totalSpend / totalConv
  winner = channel with max(ratio)
  loser = channel with min(ratio) (excluding zero-conversion rows)
```

### Health bands (LTV:CAC ratio per channel)

| Band | Range | Color |
|---|---|---|
| Excellent | ≥ 3.0 | 🟢 |
| Good | 1.0 – 3.0 | 🟡 |
| Warning | 0.5 – 1.0 | 🟠 |
| Critical | < 0.5 | 🔴 |

Whole-table verdict = lowest health band of any non-zero channel.

### Outputs

- 🩺 **Health** — Per-channel color stripe; whole-table verdict = lowest
- 📊 **Inputs Snapshot** — Channel × {Spend, Conv, LTV, CAC, Ratio} table
- 🔄 **What-If** — "If Ch3 spend ↓ 20%, its ratio becomes X (effectively promoted from 🟡 to 🟢)"
- ⚖️ **Break-Even** — "To hit 🟢 on Ch3, need CAC ↓ to $X" — derived per lowest-band channel
- 🎯 **Milestone** — "Reallocating budget from Ch-loser to Ch-winner: spend shift Y → projected Z"
- 💡 **Tip** — "Double down on Ch-winner / audit Ch-loser creative"

### Math tests (8)

1. `cac(1000, 50) === 20` (canonical)
2. `ratio(500, 20) === 25` (5x = excellent)
3. `winner([...channels]) === index of max ratio`
4. `loser([...channels]) === index of min ratio` (excluding zero)
5. `blendedCAC([1000,500,0],[50,10,0]) === 18.75` — note zero-conv case
6. Handling zero-conv edge: `cac(1000, 0) === Infinity` → trigger tip "Channel has no conversions"
7. Reallocation calc: shift 25% from loser to winner recalculates correctly
8. Health band table = `{ excellent: 3, good: 1, warning: 0.5, critical: 0 }` matches threshold ratios

---

## P6-3: Funnel Value Calculator

**Slug:** `solopreneur-funnel-value-calculator`

### Inputs (6) — standard 4-stage funnel + AOV + margin

| Name | Label | Type | Placeholder | Default |
|---|---|---|---|---|
| `impressions` | Top-of-funnel Impressions | number | e.g. 100000 | 100000 |
| `ctr` | Click-Through Rate (%) | number | e.g. 2.5 | 2.5 |
| `leadRate` | Lead Conversion Rate (% of clickers) | number | e.g. 15 | 15 |
| `saleRate` | Sale Conversion Rate (% of leads) | number | e.g. 5 | 5 |
| `aov` | Average Order Value ($) | number | e.g. 80 | 80 |
| `grossMargin` | Gross Margin (%) | number | e.g. 70 | 70 |

### Math model

```
stage1Visitors = impressions
stage2Clickers = impressions * (ctr / 100)
stage3Leads    = stage2Clickers * (leadRate / 100)
stage4Sales    = stage3Leads * (saleRate / 100)

totalRevenue  = stage4Sales * aov
totalProfit   = totalRevenue * (grossMargin / 100)

dropOffS2S3   = stage2Clickers - stage3Leads
dropOffS3S4   = stage3Leads - stage4Sales
biggestLeak   = max(dropOffS2S3, dropOffS3S4)

overallCR     = stage4Sales / impressions * 100   // baseline for health
```

### Health bands (overall funnel conversion rate)

| Band | Range | Color |
|---|---|---|
| Excellent | ≥ 5% | 🟢 |
| Good | 1% – 5% | 🟡 |
| Warning | 0.1% – 1% | 🟠 |
| Critical | < 0.1% | 🔴 |

### Outputs

- 🩺 **Health** — Overall CR band + per-stage leak severity
- 📊 **Inputs Snapshot** — Stage × {Visitors, Drop-off %, Cumulative} table
- 🔄 **What-If** — "If leadRate +30% (15% → 19.5%), overall CR ↑ from X% to Y%; revenue gain $Z"
- ⚖️ **Break-Even** — "To reach 🟢 (≥5% CR), need leadRate ≥ X% OR saleRate ≥ Y% — and the revenue at that point would be $Z"
- 🎯 **Milestone** — "Scaling impressions 2x = stage4 sales = N; revenue = $M/month"
- 💡 **Tip** — Stage-specific advice (biggest leak → "Test CTA on landing page")

### Math tests (9)

1. `stage2(100000, 2.5) === 2500`
2. `stage3(2500, 15) === 375`
3. `stage4(375, 5) === 18.75` (note: fractional sales acceptable for estimation)
4. `totalRevenue(18.75, 80) === 1500`
5. `overallCR(18.75, 100000) === 0.01875`
6. `dropOff(2500, 375) === 2125` — between stage 2 and 3
7. `biggestLeak(2125, 19)` — when stage-2→3 leak > stage-3→4 → "leak at top-of-funnel interest"
8. Zero-impression edge: `overallCR(0, 0) === 0` → "Enter impressions > 0"
9. What-if scenarios (+30% leadRate) re-runs math correctly

---

## P6-4: Cohort Retention Curve Calculator

**Slug:** `solopreneur-cohort-retention-calculator`

### Inputs (7) — retention rate table for 6 months + cohort size

| Name | Label | Type | Placeholder | Default |
|---|---|---|---|---|
| `cohortSize` | Cohort Size (users) | number | e.g. 1000 | 1000 |
| `m1Retention` | Month 1 Retention (%) | number | e.g. 80 | 80 |
| `m2Retention` | Month 2 Retention (%) | number | e.g. 60 | 60 |
| `m3Retention` | Month 3 Retention (%) | number | e.g. 45 | 45 |
| `m6Retention` | Month 6 Retention (%) | number | e.g. 30 | 30 |
| `m12Retention` | Month 12 Retention (%) | number | e.g. 20 | 20 |
| `revenuePerUser` | Avg Monthly Revenue / User ($) | number | e.g. 30 | 30 |

(Only M1/M2/M3/M6/M12 — 5 distinct months — not 6 entries; matches how SaaS retention tables actually report. M6 and M12 are headline-grabbing; M1/M2/M3 fill the early curve.)

### Math model

```
retentionByMonth = { 1: m1, 2: m2, 3: m3, 6: m6, 12: m12 }

cumulativeRevenue[1] = cohortSize * (m1/100) * revenuePerUser
cumulativeRevenue[N] = (interpolated retention × cohortSize × revenuePerUser)
// Interpolate linearly between known months

ltvFromCurve = sum(monthly revenue × monthly retention) for 12 months
averageRetention = sum of all known rates / count
churnRateByMonth = 100 - retentionByMonth[M]

biggestDropMonth = argmax(churnRateByMonth - prevChurnRate)
```

### Health bands (Month-6 retention rate)

| Band | Range | Color |
|---|---|---|
| Excellent | ≥ 90% | 🟢 |
| Good | 70% – 90% | 🟡 |
| Warning | 50% – 70% | 🟠 |
| Critical | < 50% | 🔴 |

### Outputs

- 🩺 **Health** — M6 retention band; "drop-off curve shape" descriptor (e.g. "SMooth decay" vs "Cliff at M2")
- 📊 **Inputs Snapshot** — Retention table (M1/M2/M3/M6/M12) + revenue/user
- 🔄 **What-If** — "If M1 retention ↑ 10pp (80→90), M6 retention interpolation predicts X → 12-mo LTV from $Y → $Z"
- ⚖️ **Break-Even** — "To hit 🟢 (≥90% M6), need to recover Y% early-cohort; cumulative LTV gain = $Z/user"
- 🎯 **Milestone** — "12-mo LTV projection = $X (assuming decay continues); if CAC = $Y, payback = N months"
- 💡 **Tip** — Curve-specific ("Linear decay → cohort is healthy; cliff at M2 → check onboarding")

### Math tests (8)

1. `interpolateRetention(M1=80, M3=45, M=2) === 62.5` (linear mid)
2. `cumulativeRevenue(1000, {1:80, 2:60, 3:45}, 30) === sum(month × retained × revenue)` — assert specific M=2 cumulative value
3. `biggestDropMonth([80, 60, 45, 30, 20]) === 2` (between M1 and M2)
4. `biggestDropMonth([80, 75, 70, 60, 50]) === 1` (steady decay, biggest relative drop is M1→M2)
5. LTV computation: 1000 users × decay → expected sum rounded to nearest dollar
6. Zero-cohort edge: `cumulativeRevenue(0, ...) === 0`
7. What-if +10pp M1 → re-runs LTV correctly
8. Health band threshold checks (50%, 70%, 90% cut points)

---

## P6-5: Email Campaign ROI Calculator

**Slug:** `solopreneur-email-campaign-roi-calculator`

### Inputs (6)

| Name | Label | Type | Placeholder | Default |
|---|---|---|---|---|
| `listSize` | Email List Size (subscribers) | number | e.g. 10000 | 10000 |
| `openRate` | Open Rate (%) | number | e.g. 25 | 25 |
| `ctr` | Click-Through Rate (% of openers) | number | e.g. 5 | 5 |
| `aovPerClick` | Revenue per Click ($) | number | e.g. 25 | 25 |
| `campaignCost` | Campaign Cost ($) — copy/design/ESP fees | number | e.g. 500 | 500 |
| `numEmails` | Number of Emails in Campaign | number | e.g. 4 | 4 |

### Math model

```
emailsDelivered = listSize * numEmails
opens = emailsDelivered * (openRate / 100)
clicks = opens * (ctr / 100)

grossRevenue = clicks * aovPerClick
netRevenue = grossRevenue - campaignCost
roiPercent = (netRevenue / campaignCost) * 100
costPerClick = campaignCost / clicks (if clicks > 0)
costPerOpen = campaignCost / opens (if opens > 0)
```

### Health bands (ROI %)

| Band | Range | Color |
|---|---|---|
| Excellent | ≥ 300% | 🟢 |
| Good | 100% – 300% | 🟡 |
| Warning | 0% – 100% | 🟠 |
| Critical | < 0% (loss) | 🔴 |

### Outputs

- 🩺 **Health** — ROI band + "open rate vs industry 21%" benchmark comparison
- 📊 **Inputs Snapshot** — List, opens, clicks, revenue, cost, ROI %, $/click
- 🔄 **What-If** — "If openRate ↑ 5pp → opens +20%, revenue $X → $Y, ROI = Z%"
- ⚖️ **Break-Even** — "To hit 🟢 ROI (≥300%), need opens × AOV ≥ 4× campaign cost. At current rates, N opens required → openRate ↑ X%"
- 🎯 **Milestone** — "Repeating this campaign Q1..Q4 with list growth +5%/quarter → annual revenue $X, annual ROI $Y%"
- 💡 **Tip** — Based on weakest link (openRate < 21%? → "Test subject lines"; ctr < 2%? → "Test CTA placement"; ROI > 500%? → "Scale send cadence")

### Math tests (7)

1. `grossRevenue(10000, 25, 5, 25, 4, 500)` — `10000*4 * 0.25 * 0.05 * 25 = 12500 - 500 = $12000 net → 2400% ROI`
2. `costPerClick(500, 100)` — `5`
3. `costPerOpen(500, 1000)` — `0.50`
4. Health bands: ROI > 300% = 🟢; ROI < 0% = 🔴
5. Zero-click edge: `costPerClick(500, 0) === Infinity` → tip "No clicks — re-check CTR"
6. What-if +5pp openRate: re-runs grossRevenue correctly
7. List growth +5% × 4 quarters → annual projection math

---

## P6-6: Content Marketing ROI Calculator

**Slug:** `solopreneur-content-marketing-roi-calculator`

### Inputs (7) — 6 numeric + 1 select (attribution)

| Name | Label | Type | Placeholder | Default |
|---|---|---|---|---|
| `monthlyPieces` | Content Pieces / Month | number | e.g. 8 | 8 |
| `monthsToRank` | Avg Months to Rank (SEO) | number | e.g. 6 | 6 |
| `peakMonthlyTraffic` | Peak Monthly Organic Traffic (post-rank) | number | e.g. 5000 | 5000 |
| `conversionRate` | Conversion Rate (% of organic visitors) | number | e.g. 2 | 2 |
| `aov` | Average Order Value ($) | number | e.g. 80 | 80 |
| `monthlyContentCost` | Monthly Content Cost ($) — writer + tools | number | e.g. 2000 | 2000 |
| `attributionModel` | Attribution Model | select | 'first-touch' / 'last-touch' / 'linear' | 'last-touch' |

### Math model

```
monthlySales = peakMonthlyTraffic * (conversionRate / 100)
monthlyRevenue = monthlySales * aov
monthlyNetRevenue = monthlyRevenue - monthlyContentCost   // once ranked

timeToValue = monthsToRank
investmentBeforeROI = monthsToRank * monthlyContentCost
breakevenMonth = monthsToRank + (investmentBeforeROI / monthlyRevenue if any)

attributionMultiplier = { first-touch: 1.0, last-touch: 1.0, linear: 0.7 }  // linear distributes credit → effective contribution
effectiveRevenue = monthlyRevenue * attributionMultiplier

12MonthTotal = (monthsToRank * (-monthlyContentCost)) + (12 - monthsToRank) * monthlyNetRevenue * attributionMultiplier
12MonthROI = 12MonthTotal / (12 * monthlyContentCost) * 100
```

### Health bands (Organic conversion rate)

| Band | Range | Color |
|---|---|---|
| Excellent | ≥ 3% | 🟢 |
| Good | 1% – 3% | 🟡 |
| Warning | 0.3% – 1% | 🟠 |
| Critical | < 0.3% | 🔴 |

### Outputs

- 🩺 **Health** — Conversion rate band + ramp-up curve descriptor
- 📊 **Inputs Snapshot** — Pieces, ramp-up months, traffic peak, AOV, cost, attribution
- 🔄 **What-If** — "If conversionRate +1pp → monthly revenue +$X, 12-mo ROI +Y%"
- ⚖️ **Break-Even** — "Cumulative investment vs cumulative revenue: at month N (= monthsToRank + surplus/adoption) you break even"
- 🎯 **Milestone** — "Steady-state (after ramp): $X revenue/month, $Y annual ROI"
- 💡 **Tip** — Attribution-specific + weakest-link ("first-touch: focus on TOFU content"; "if CR < 1% → re-target landing pages"; "scale publishing cadence if ramp pays off")

### Math tests (8)

1. `monthlyRevenue(5000, 2, 80) === 8000`
2. `monthlyNetRevenue(8000, 2000) === 6000`
3. `breakevenMonth(6, 6 * 2000, 8000) === 6 + 1.5 = 7.5` (months out)
4. `12MonthTotal(6, 8000, 2000, 'last-touch') === -12000 + 6*6000 = 24000` (last 6 months post-rank × 6000 net)
5. `12MonthTotal(6, 8000, 2000, 'linear')` — uses 0.7 multiplier
6. Health bands: CR = 2% → 🟡; CR = 4% → 🟢
7. Zero-traffic edge: `monthlyRevenue(0, 2, 80) === 0` → tip "Build before optimize"
8. Attribution multipliers map correctly to calculator output

---

## Cross-cutting checklist (per calculator)

### Files to touch (6 — same as P5)

| # | File | Change |
|---|---|---|
| 1 | `src/engines/marketing/index.ts` | Add import + registerEngine call (Task 0 only creates empty barrel; subsequent calcs append) |
| 2 | `scripts/codegen-examples.mjs` | Add entry in `ENGINES` array (alphabetical: by slug-prefix ordering) |
| 3 | `src/data/tools/marketing.ts` | Add `ToolMeta` entry with `ToolInput[]` structured inputs (P4-2 lesson) |
| 4 | `src/data/og-samples.json` | Add 6 OG samples (en + zh headline / headlineUnit / headlineLabel, optional trend) |
| 5 | `tests/ab-split.test.ts` | Bump `>= N` count (44 → 45 → 50) |
| 6 | `tests/internal-links.test.ts` | Bump `>= N` count (44 → 45 → 50) |

### i18n (en + zh)

- 6 × preset_key (preset chip keyword) × 2 langs = 12 new translations
- Pattern: `(presetKey === 'high' || presetKey === 'low' || ...)` defined in engine TS, mapped via `i18n[key]`
- Sample fields: `{ en: '...', zh: '...' }` for headline copy

### Math helpers export convention

```ts
// Module-level (top of file, NOT inside engine object):
export function calcROAS(adSpend: number, revenue: number): number { ... }
export function calcNetROAS(adSpend: number, revenue: number, margin: number): number { ... }
```

Tests import these directly:
```ts
import { calcROAS, calcNetROAS } from '../src/engines/marketing/roas-calculator';
```

### customFn parity invariant

Every code path in `calculate()` → customFn must produce same numerical output (within rounding). Per P4-2 lesson: any math fix applies to BOTH source and customFn.

For per-channel tables (P6-2) and stage-by-stage tables (P6-3, P6-6), customFn emits the same row-by-row data via `out += ...` string accumulator.

### Test count budget per calculator

| Calculator | Math tests | Boundary tests | Total |
|---|---|---|---|
| P6-1 ROAS | 4 | 2 | 6 |
| P6-2 LTV by Channel | 5 | 3 | 8 |
| P6-3 Funnel Value | 6 | 3 | 9 |
| P6-4 Cohort Retention | 5 | 3 | 8 |
| P6-5 Email Campaign ROI | 4 | 3 | 7 |
| P6-6 Content Marketing ROI | 5 | 3 | 8 |
| **Σ** | **29** | **17** | **46** |

(Total 45 inputs across 6 calcs; verified by P6-X heading counts: 4+15+6+7+6+7=45. 46 math tests.)

### v3 standard output (Business variant)

Per CLAUDE.md "v3 standard — two variants" — Business v3 mandatory sections:

1. ⏰ **Title + Health Band** (combined header — health icon immediately visible)
2. 📊 **Inputs Snapshot** (key values, no restating)
3. 🔄 **What-If** (3 sensitivity rows minimum)
4. ⚖️ **Break-Even** (payback or threshold)
5. 🎯 **Milestone** (12-month forward projection)
6. 💡 **Tip** (1 contextual, band-driven)

For Marketing Analytics:
- "Break-Even" semantically maps to "payback" / "lead-to-revenue breakeven" — applies naturally
- "Milestone" maps to "scaled outcome @ 2x/3x/12-month" — applies naturally

(If user finds Break-Even semantics too forced later, can revisit per-calc; ship time = shipped.)

---

## Execution Plan (P6-7 holistic review)

### Task breakdown

**Task 0 (scaffolding):** Create empty directory + barrel + 0-entry tools/categories wiring.
- `src/engines/marketing/index.ts` (comments only)
- `src/data/tools/marketing.ts` (empty exports array)
- `src/data/categories.ts` (+1 entry M)
- `tests/ab-split.test.ts` (count = 44 → not bumped)
- `tests/internal-links.test.ts` (count = 44 → not bumped)
- `tests/ab-split.test.ts` + `tests/internal-links.test.ts` expected-count lines: leave at 44 (just adds new entries to tools array — ab-split and internal-links handle new categories automatically via glob / category discovery)
- Verify: `pnpm check` still passes (no new failures; same 0 baseline since scaffold adds nothing new to discoverable set)
- Commit: `feat(marketing) scaffold — empty new category`

**Tasks 1–6 (one per calculator):**

Each task:
1. Write test file `tests/<slug-without-prefix>.test.ts` (failing)
2. Verify test fails
3. Implement engine in `src/engines/marketing/<slug>.ts` (math helpers + calculate + customFn + engine)
4. Wire 6 files per checklist
5. Run `node scripts/codegen-examples.mjs` to regenerate `staticExamples[0]`
6. Run `pnpm check` (verifies codegen --check + customFn tables + i18n + tests)
7. Commit single calc:
   - `feat(p6-1): ROAS calculator (gross/net ROAS ratio + 6 math tests + 9-section v3 + 45 engines)`
8. Push (gitee origin + github with SKIP_PUSH_FETCH=1)
9. Write per-calc memory file: `memory/p6-1-roas-shipped.md`
10. Update `memory/MEMORY.md` index

**Task 7 (holistic review + final):**

- Dispatch 1 holistic-review agent covering: cross-file wiring consistency, customFn = calculate parity across 6 engines, HEALTH_BANDS shape uniformity, ab-split and internal-links test count progression, codegen-examples --check fresh-state
- Apply Critical/Important findings via 1 fix subagent
- Mark complete + push final

### Execution budget

| Task | ~minutes |
|---|---|
| 0 scaffolding | 10 |
| 1 ROAS | 25 |
| 2 LTV by Channel (5 ch) | 35 |
| 3 Funnel Value | 30 |
| 4 Cohort Retention | 30 |
| 5 Email Campaign ROI | 25 |
| 6 Content Marketing ROI | 30 |
| 7 Holistic review | 20 |
| **Total** | **~205 min ≈ 3.5 hr** |

### Push cadence

- Per-calc push (after each successful pnpm check)
- Gitee origin (primary, runs hooks)
- GitHub via `SKIP_PUSH_FETCH=1` (mirror)

---

## Quality gates

Each calculator must pass before commit:

- **`pnpm check`** exits 0 — includes:
  - TypeScript --noEmit
  - `tests/run.mjs` (--test-concurrency=1 default; 363+ tests, ~10 min wall-clock)
  - `node scripts/codegen-examples.mjs --check` (no staticExamples drift)
  - `node scripts/codegen-customfn.mjs --check` (PRICING.json alignment; not applicable to marketing since they don't read PRICING.json, but passes trigger)
  - i18n completeness
  - clerk-env + supabase-env
- **`tests/scripts/test-customFn.mjs <slug>`** parses each new customFn
- **`tests/scripts/parse-one.mjs <slug-without-prefix>`** (P5 workaround for subdir; needs replacement vs TODO, but works for P6)
- **Live vs static parity**: `staticExamples[0]` regenerated by codegen-examples matches `calculate(defaultInputs)` output exactly

### Pre-commit gate

`.githooks/pre-commit` runs `pnpm check` (with env to skip test:run for fast feedback). Project's existing fast gate covers codegen + i18n + types; full test gate runs in `prepush` or manually via `pnpm check`.

---

## Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| 5-channel input shape (P6-2) confuses users | Medium | Multi-select per-channel dropdown alternative considered; rejected as more code, less semantic. Default all 5 visible; opt-out via leaving fields empty (engine handles 0-conv as "skip") |
| Marketing benchmarks (industry ROAS, email open rates) go stale | Low | Hardcoded constants NOT auto-updated (P5 pattern); future batch could add separate `marketing-benchmarks.json` synced quarterly, similar to PRICING.json for AI cost |
| Cohort retention interpolation accuracy | Low | Linear interpolation sufficient for v1; exponential curve fit is YAGNI; document assumption in `Math` section |
| Content marketing attribution models (first/last/linear) too coarse | Low | Three models cover 80% of marketer needs; advanced multi-touch is YAGNI for v1 |
| i18n throughput: 6 × 12 preset keys × 2 langs = 144 strings | Low | Follows P5 series verbatim; translation pipeline handles en→zh via existing wordpool |
| CustomFn \uXXXX escape chains in regenerated staticExamples | Medium | Per CLAUDE.md lesson: `codegen-examples --check` flags `\\'` or `\uXXXX`; fix `generate()` to emit raw strings (no escape chains) |

---

## Out of scope (non-goals)

- **Multi-touch attribution beyond first/last/linear** — covered by v2 if requested
- **Real-time benchmark integration** — hardcoded for v1; future quarterly sync
- **ML-based churn prediction** — explicit non-goal (require data corpus)
- **Email list segmentation** — input is aggregate list size; per-segment calc is v2
- **Multi-currency conversion** — USD only (en-US locale); locale-aware currency is v2
- **Cohort rotation matrix** — single cohort per run; cohort-over-cohort comparison is v2

---

## Acceptance criteria (binary checklist)

- [ ] `pnpm check` exits 0 (codegen-examples --check, customFn tables, i18n, types, tests)
- [ ] 50 engines registered (44 + 6)
- [ ] `src/engines/marketing/` exists with 6 engine files + index barrel
- [ ] `src/data/tools/marketing.ts` has 6 entries
- [ ] `src/data/categories.ts` has 'M' entry (Marketing Analytics)
- [ ] `tests/ab-split.test.ts` and `tests/internal-links.test.ts` count >= 50
- [ ] 6 calculator pages render at `/en/<slug>` and `/zh/<slug>` with v3 6-section output
- [ ] Each engine has `dataReviewedAt` + 3+ sources in metadata (EEAT uniform — check f21e7aa review)
- [ ] Both mirrors pushed: gitee (origin) + github (manual push)
- [ ] Memory files `p6-1` through `p6-6` written + index updated
- [ ] `p6-marketing-series.md` written at batch close

---

**Spec complete.** Awaiting user review before invoking writing-plans.
