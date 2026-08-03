---
engine_ref: 'solopreneur-unit-economics-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'OpenView SaaS Benchmarks 2026 — Unit Economics'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'SaaS Capital LTV / Payback Period Reports'
    url: 'https://www.saas-capital.com/blog/lTV'
  - name: 'Bessemer State of the Cloud — Unit Economics'
    url: 'https://www.bvp.com/atlas/saas-multiples'
---

## What This Calculator Measures

Unit economics decomposes your SaaS into per-customer profit mechanics: how much revenue each customer generates (including expansion upsells), what it costs to serve them, and how long they stay. It answers the core founder question: *is each customer profitable on their own?* If your unit economics are positive, you have the foundation of a sustainable business; if negative, scaling only accelerates cash burn. Use this calculator before deciding how much to spend on growth — it tells you the ceiling on CAC and the floor on payback period.

## How It Works (Methodology)

The v3 unit economics decomposition:

```
NetContribution = AvgRevenue + Expansion − CostToServe
LTV             = NetContribution × AvgLifetime
                  (lifetime = 1 ÷ monthlyChurnRate, capped at 120 months)
PaybackMonths   = CAC ÷ NetContribution
```

| Variable          | Meaning                                                     |
| ----------------- | ----------------------------------------------------------- |
| `AvgRevenue`      | Monthly base subscription per customer                      |
| `Expansion`       | Monthly upsell / add-on revenue per customer                |
| `CostToServe`     | Hosting, support, payment processing per customer per month |
| `monthlyChurnRate`| % of customers lost each month                              |
| `CAC`             | Customer Acquisition Cost (sales + marketing ÷ new buyers)  |

The scaling model assumes 10% cost-to-serve reduction per 10× customer growth (bulk hosting, automation, support efficiency). Optimization levers are ranked by LTV impact: reducing churn by 1% vs. growing expansion by 10% — the larger impact wins.

## Limitations & When Not To Use

This calculator assumes churn is stable and cost-to-serve scales linearly. It does not model: (1) one-time onboarding costs that amortize over the customer lifetime, (2) usage-based pricing where revenue fluctuates month-to-month, (3) multi-product lines with cross-subsidies. For B2B SaaS with annual contracts paid upfront, net contribution may underestimate month-one revenue. For marketplaces or transaction businesses, use revenue-take-rate modeling instead — unit economics in those businesses is driven by GMV, not subscription dollars.

## Worked Example

Imagine a B2B SaaS with $100/mo base subscription, $30/mo expansion (seat upgrades), $30/mo cost to serve, $300 CAC, and 5% monthly churn.

1. **Net Contribution** = $100 + $30 − $30 = **$100/mo per customer** (76.9% margin)
2. **Avg Lifetime** = 1 ÷ 5% = 20 months
3. **LTV** = $100 × 20 = **$2,000**
4. **Payback** = $300 ÷ $100 = **3.0 months** — top-quartile for SaaS
5. **LTV:CAC** = $2,000 ÷ $300 = **6.7:1** — above the 3:1 healthy threshold

At scale: 10,000 customers × $100 net = $1M/mo gross profit, with cost-to-serve dropping 10% (economies of scale) lifts that to $1.03M/mo. Pair this with the **SaaS Valuation Calculator** to see what that LTV:CAC translates to in revenue-multiple exit value.