---
slug: 'solopreneur-pipeline-coverage-calculator'
engine_ref: 'solopreneur-pipeline-coverage-calculator'
category_id: 'S'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'HubSpot — The 3x Pipeline Coverage Rule'
    url: 'https://blog.hubspot.com/sales/3x-pipeline-coverage'
  - name: 'HubSpot — Pipeline Coverage Ratio Explained'
    url: 'https://blog.hubspot.com/sales/sales-pipeline-coverage'
  - name: 'Pavilion — 2026 B2B Pipeline Coverage Benchmarks'
    url: 'https://www.joinpavilion.com/'
---

## What This Calculator Measures

Pipeline coverage is the ratio of total open pipeline value to your
sales quota. It answers the forward-looking question: *do I have enough
pipeline to hit my number?* The B2B SaaS heuristic — the **3x rule** —
says you need three times your quota in raw pipeline to reliably hit
target (because even at a 25% win rate, weighted pipeline of 0.75x
gives you roughly a 75% probability of attainment). Pavilion's 2026
B2B Sales Benchmarks confirm that companies tracking ≥3.0x coverage
hit quota 80%+ of the time, while those at 1.0–2.0x hit quota only
40–55% of the time. This calculator surfaces both the unweighted
coverage ratio (the 3x rule diagnostic) and the weighted coverage
(adjusted by your expected win rate).

## How It Works (Methodology)

The v3 standard formula applies the HubSpot 3x rule with win-rate
weighting:

```
coverageRatio    = pipelineValue ÷ quotaTarget
weightedPipeline = pipelineValue × (winRate ÷ 100)
weightedCoverage = weightedPipeline ÷ quotaTarget
gap              = quotaTarget − weightedPipeline
requiredAdditionalPipeline = gap ÷ (winRate ÷ 100)
```

| Variable        | Meaning                                                       |
| --------------- | ------------------------------------------------------------- |
| `quotaTarget`   | Revenue target (quarter, half, or year)                       |
| `pipelineValue` | Total open pipeline (sum of all deals across all stages)      |
| `winRate`       | Historical close rate (%) — used for weighting only           |

**Health bands** (coverage ratio, unweighted):
- 🟢 ≥ 3.0x — excellent (3x rule satisfied; comfortable cushion)
- 🟡 2.0x–3.0x — good (approaching 3x rule, monitor stage progression)
- 🟠 1.0x–2.0x — warning (under the 2x comfort zone; at risk if win rate slips)
- 🔴 < 1.0x — critical (pipeline shortfall; top-of-funnel rebuild urgent)

**Assumptions.** Pipeline is treated as unweighted (face value across
all stages) for the coverage ratio — which is the standard the 3x rule
is built on. Win rate is used only for the weighted coverage diagnostic.
Coverage uses the trailing 90-day average win rate; using a forecast
period (e.g. next quarter only) win rate gives a more forward-looking
view but loses seasonality smoothing.

## Limitations & When Not To Use

Pipeline coverage is built for **B2B SaaS or consultative sales with
long enough cycles that you can't rebuild pipeline mid-quarter**. It
does not fit transactional or PLG funnels (where pipeline is built
hourly, not quarterly), nor is it a leading indicator for businesses
with <90-day sales cycles where pipeline coverage snapshots are stale
within a week. It also assumes pipeline value is reported in a
consistent way (either weighted or unweighted) across the team — mixing
weighted Discovery deals with unweighted Closing deals distorts the
ratio. The 3x rule applies to medium-complexity B2B SaaS (mid-market,
50–200 reps); for enterprise with very long cycles, 4x–5x is the
safer target (Forrester 2026).

## Worked Example

A B2B SaaS AE with a $1,000,000 quota, $1,500,000 in current open
pipeline, and 25% expected win rate:

1. `coverageRatio` = $1,500,000 ÷ $1,000,000 = **1.5x** (🔴 below 2x comfort zone)
2. `weightedPipeline` = $1,500,000 × 25% = **$375,000**
3. `weightedCoverage` = $375,000 ÷ $1,000,000 = **0.38x**
4. `3x rule target` = $1,000,000 × 3 = **$3,000,000** (need $1,500,000 more pipeline)
5. `1x break-even` = $1,000,000 ÷ 25% = **$4,000,000** (or win rate → 67% at current pipeline)
6. Required additional pipeline to hit quota: $2,500,000 (gap ÷ win rate)
7. What-if: pipeline $1.5M→$2M → 2.0x (🟡 Good); win rate 25%→50% → weighted 0.75x (still 🔴 on cov ratio, but weighted pipeline doubled to $750K); both → 2.0x 🟡 with weighted $1M (now safely on quota)
8. Path to 🟢 (3x): need pipeline ≥ $3M (gap $1.5M), or win rate alone can't reach 3x (would need 200% — impossible)

Pair with **Pipeline Value Calculator** to see stage-level quality and
**Quota Attainment Calculator** to track pace against this coverage.