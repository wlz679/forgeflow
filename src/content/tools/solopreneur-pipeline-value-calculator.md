---
slug: 'solopreneur-pipeline-value-calculator'
engine_ref: 'solopreneur-pipeline-value-calculator'
category_id: 'S'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Salesforce — How to Build a Sales Pipeline'
    url: 'https://www.salesforce.com/resources/articles/sales-pipeline/'
  - name: 'HubSpot — Sales Pipeline Management Guide'
    url: 'https://blog.hubspot.com/sales/sales-pipeline'
  - name: 'Pavilion — 2026 B2B Sales Benchmarks'
    url: 'https://www.joinpavilion.com/'
---

## What This Calculator Measures

Sales pipeline value is the probability-weighted dollar amount of every
deal sitting in your funnel right now. Unlike the raw (nominal) pipeline —
which simply multiplies deal count × deal size — the weighted view applies
a stage-specific close probability (Discovery 20%, Proposal 40%,
Negotiation 60%, Closing 80%) so founders and sales managers get a
realistic forecast instead of an inflated ceiling. This number drives
quarterly board reports, rep quota pacing, and the "are we going to hit
the number" conversation every CRO has with their CEO.

## How It Works (Methodology)

The v3 standard formula applies Salesforce-style stage probabilities and
multiplies by deal count and average deal size per stage:

```
Discovery    (count × size × 0.20) → weighted value
Proposal     (count × size × 0.40) → weighted value
Negotiation  (count × size × 0.60) → weighted value
Closing      (count × size × 0.80) → weighted value

weightedPipeline      = Σ(stage weighted values)
nominalPipeline       = Σ(count × size)                 // unweighted face value
weightedForecast      = weightedPipeline × 0.50          // 50% confidence haircut
coverageVsNominal     = weightedPipeline ÷ nominalPipeline
```

| Variable             | Meaning                                                       |
| -------------------- | ------------------------------------------------------------- |
| `Discovery × 20%`    | Top-of-funnel deals; lots of activity, low close probability  |
| `Proposal × 40%`     | Active evaluation; solution mapping and pricing alignment     |
| `Negotiation × 60%`  | Late-stage contract/legal review; champion engaged            |
| `Closing × 80%`      | Ready to sign; red-line review or paperwork                    |
| `weightedForecast`   | Weighted pipeline × 0.50; acknowledges forecast optimism bias  |

**Assumptions.** Stage probabilities are industry defaults — replace them
with your own historical conversion rates for higher accuracy. The 50%
haircut on the weighted forecast reflects the well-documented 2× gap
between rep forecasts and actual close rates (CSO Insights / Pavilion
2026 data). Coverage vs. nominal tells you how much of your raw pipeline
is "real" (e.g., 45.7% means a $470K nominal pipeline is worth $215K
expected).

## Limitations & When Not To Use

This calculator is for **B2B SaaS and consultative sales cycles** with
clear stage definitions (Discovery → Proposal → Negotiation → Closing).
It does not fit transactional e-commerce, retail, or high-velocity
self-serve funnels where stage definitions are meaningless or the
probability model is irrelevant. It also assumes your reps update stage
data accurately — if your CRM is full of zombie deals at "Closing 80%"
that have sat there for 90 days, the weighted number will over-state
forecast. Run a pipeline hygiene pass before trusting the output, and
remember that the formula treats all deal sizes as equal within a stage
(uniform contract values across Discovery hide real mix).

## Worked Example

A B2B SaaS founder with the following pipeline snapshot pulled from
Salesforce: 10 Discovery deals averaging $15K, 5 Proposal deals at
$25K, 3 Negotiation deals at $35K, and 2 Closing deals at $45K:

1. `Discovery`    = 10 × $15,000 × 20% = **$30,000**
2. `Proposal`     = 5 × $25,000 × 40% = **$50,000**
3. `Negotiation`  = 3 × $35,000 × 60% = **$63,000**
4. `Closing`      = 2 × $45,000 × 80% = **$72,000**
5. `weightedPipeline` = 30,000 + 50,000 + 63,000 + 72,000 = **$215,000**
6. `nominalPipeline`  = 150,000 + 125,000 + 105,000 + 90,000 = **$470,000**
7. `weightedForecast` = 215,000 × 50% = **$107,500** (50% confidence board-ready forecast)

Pair this with the **Sales Velocity Calculator** to see whether weak
revenue is a pipeline-fill problem (run pipeline coverage) or a
conversion problem (run win rate by stage).