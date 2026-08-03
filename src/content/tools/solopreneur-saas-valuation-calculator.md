---
engine_ref: 'solopreneur-saas-valuation-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ICONIQ Growth Benchmarks — SaaS Valuation Multiples'
    url: 'https://www.iconiqcapital.com/growth/benchmarks'
  - name: 'Bessemer Venture Partners — State of the Cloud'
    url: 'https://www.bvp.com/atlas/saas-multiples'
  - name: 'Meritech Capital — SaaS Valuation Metrics'
    url: 'https://www.meritechcapital.com/blog/saas-metrics'
---

## What This Calculator Measures

SaaS valuation estimates what your subscription business is worth based on **Annual Recurring Revenue (ARR)**, **growth rate**, and **profit margin**. The output is a range (conservative / base / optimistic revenue multiples) anchored to public-market SaaS comparables. Use it before raising capital to sanity-check term sheets, or before an exit to set negotiation anchors. Note: this is a **revenue multiple** valuation — for solopreneur SaaS under $1M ARR, buyers typically pay 2-4× annual profit (SDE), not ARR multiples, so check the Acquire.com / MicroAcquire market for actual transaction data on small deals.

## How It Works (Methodology)

The tiered revenue-multiple framework:

```
BaseCase_Multiple = 5x  (mature SaaS floor)
+ GrowthBoost     = growthRate ÷ 10    (each 10% growth adds ~1x)
+ MarginBoost     = margin ÷ 5  (if margin ≥ 30%)  (each 5% margin adds ~1x)
Valuation         = ARR × BaseCase_Multiple  (or LowMultiple for floor, HighMultiple for ceiling)
```

| Tier        | Growth   | BaseMult | Range    |
| ----------- | -------- | -------- | -------- |
| Slow        | 10-30%   | 5x       | 4-8x     |
| Medium      | 30-50%   | 7x       | 5-10x    |
| Fast        | 50-100%  | 8-10x    | 6-12x    |
| Hyper       | 100%+    | 10x      | 8-15x    |

Profitability adds **+0.5x to +1x** premium (profitable SaaS gets 1-3x more than unprofitable peers per ICONIQ / Bessemer benchmarks). Profit margin < 10% with positive growth subtracts 1-2x from the base.

## Limitations & When Not To Use

Revenue-multiple valuation assumes you have **recurring revenue** to value. If ARR is <$100K or your revenue is mostly transactional / one-time fees, this model will over-state value — investors use different frameworks (Berkus method, scorecard, comparable transactions) for sub-$1M ARR deals. The model also ignores: (1) net dollar retention — NDR >120% commands a 2-4x premium; (2) gross margin profile — sub-60% gross margin reduces multiples materially; (3) market size and competitive moat — large TAM and defensible IP warrant upside; (4) capital intensity — capital-heavy businesses (infrastructure, hardware) trade at lower multiples. For pre-revenue startups, use the scorecard method or risk-factor summation instead.

## Worked Example

Imagine a SaaS at $2M ARR, 60% YoY growth, 25% profit margin.

1. **Tier** = Fast growth (50-100%): base 8x, range 6-12x
2. **Margin boost** = 25% is below 30% threshold → no +0.5x adjustment
3. **Conservative** = $2M × 6x = **$12M**
4. **Base Case** = $2M × 8x = **$16M**
5. **Optimistic** = $2M × 12x = **$24M**

If margin hits 30%: +0.5x → base becomes 8.5x → $17M base. If growth accelerates to 100%: tier shifts to Hyper, base 10x → $20M base. The calculator's **Milestones** section projects how many years until you hit $10M ARR at current growth: `log(10M / 2M) / log(1.6) = 4.3 years`. Pair with the **ARR Multiple Calculator** for the inverse view (multiple as a function of growth + margin).