---
engine_ref: 'solopreneur-burn-multiple-rule-of-40-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Craft Ventures — Burn Multiple (David Sacks)'
    url: 'https://www.craftventures.com/burn-multiple'
  - name: 'Bessemer Venture Partners — Rule of 40'
    url: 'https://www.bvp.com/atlas/rule-of-40'
  - name: 'SaaS Capital — Capital Efficiency Benchmarks'
    url: 'https://www.saas-capital.com/blog/lTV'
---

## What This Calculator Measures

Two VC-favorite capital efficiency metrics in one view. **Burn Multiple** (coined by David Sacks at Craft Ventures) is the ratio of net cash burned to net new ARR added — lower is better, <1 means you added more ARR than you burned in cash. **Rule of 40** (popularized by Bessemer Venture Partners) states that a SaaS is healthy if growth rate + profit margin ≥ 40%. Together they answer the question: *are you growing efficiently?* Use this calculator in fundraising prep to position your efficiency story, or in board updates to track capital efficiency over time.

## How It Works (Methodology)

Two formulas, one calculator:

```
RuleOf40Score = RevenueGrowth(%) + ProfitMargin(%)
BurnMultiple  = NetBurn ÷ NetNewARR
                (∞ if NetNewARR ≤ 0)
SaaSQuadrant  = 2×2 matrix: HighGrowth (≥40%) × PositiveMargin (≥0%)
                → Stars / Growers / Plowhorses / Zombies
```

| Stage Benchmark       | Burn Multiple Tiers                       |
| --------------------- | ----------------------------------------- |
| Seed (pre-PMF)        | <2 great, 2-3 good, >3 concerning         |
| Series A              | <1.5 great, 1.5-2 good, >2 concerning     |
| Series B+             | <1 great, 1-1.5 good, >1.5 concerning     |

| Rule of 40 Score | Verdict                              |
| ---------------- | ------------------------------------ |
| ≥ 40%            | 🟢 PASS — top-quartile efficiency    |
| 25-40%           | 🟡 borderline                        |
| 10-25%           | 🟠 below — needs improvement         |
| < 10%            | 🔴 fail — burning without growth     |

## Limitations & When Not To Use

Both metrics depend on the **period** you measure. Quarterly burn multiple can swing wildly (one large customer win in Q4 makes your multiple look great); use trailing-12-month (TTM) or annualized figures for stability. Rule of 40 includes margin which can be noisy due to one-time charges (restructuring, write-offs) — use **EBITDA-based** margin, not GAAP. The 2×2 SaaS Quadrant hides a third dimension: net dollar retention. A "Stars" company with 90% NDR is very different from one with 130% NDR. This calculator also does not distinguish between **organic growth** (low CAC) and **paid growth** (high CAC, marketing-driven) — two companies with identical Rule of 40 scores can have radically different unit economics.

## Worked Example

Imagine a Series A SaaS growing 100% YoY, with −20% EBITDA margin, $2M quarterly net burn, $1.5M quarterly net new ARR.

1. **Rule of 40** = 100% + (−20%) = **80.0%** → 🟢 PASS (top-quartile)
2. **Burn Multiple** = $2M ÷ $1.5M = **$1.33 burned per $1 ARR** → 🟡 good (efficient)
3. **Quadrant** = High growth + Negative margin = **🟡 Growers**
4. **Stage benchmark (Series A)** = $1.33 < 1.5 → **🟢 top-quartile for A**

What-If scenarios: doubling growth (new ARR $3M, same burn) drops Burn Multiple to **$0.67** (top-quartile across all stages). Cutting burn 50% (to $1M) drops it to **$0.67** as well. Adding $5M ARR (new ARR $7M, same burn) drops it to **$0.29** — unicorn territory. The 5 growth/margin combos in the comparison strip show that 50% growth + −20% margin = 30% (borderline), but 100% + −20% = 80% (clear pass) — Rule of 40's strength is allowing high growth to compensate for negative margins.