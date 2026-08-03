---
engine_ref: 'solopreneur-ltv-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — LTV / Churn Benchmarks'
    url: 'https://www.saas-capital.com/blog/lTV'
  - name: 'OpenView SaaS Benchmarks 2026 — NRR / LTV'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'ICONIQ Growth Benchmarks — LTV:CAC'
    url: 'https://www.iconiqcapital.com/growth/benchmarks'
---

## What This Calculator Measures

Customer Lifetime Value (LTV) is the total gross profit a single customer generates over their entire relationship with you. It is the **denominator** in the unit-economics ratio that determines whether your SaaS is a business or a charity: LTV:CAC. A 3:1 LTV:CAC ratio is the long-cited industry benchmark — below 3:1, you spend too much acquiring customers relative to their value; above 5:1, you are likely under-investing in growth. Pair this calculator with the **CAC Calculator** to compute the ratio.

## How It Works (Methodology)

The closed-form LTV formula (constant-churn assumption):

```
AvgLifetime   = 1 ÷ MonthlyChurnRate  (capped at 120 months if churn ≈ 0)
GrossProfit   = MonthlyRevenue × (GrossMargin ÷ 100)
LTV           = GrossProfit × AvgLifetime
LTV:CAC       = LTV ÷ CustomerAcquisitionCost
```

| Variable          | Meaning                                                |
| ----------------- | ------------------------------------------------------ |
| `MonthlyRevenue`  | ARPU — average revenue per user per month              |
| `GrossMargin`     | % of revenue after COGS, support, payment processing   |
| `MonthlyChurn`    | % of customers lost each month (logo churn)            |
| `CAC`             | Customer Acquisition Cost (sales + marketing ÷ buyers) |

The 5-churn-rate scenario strip (1%, 2%, 3%, 5%, 8%) shows how small churn reductions compound — cutting monthly churn from 5% to 3% nearly doubles LTV because lifetime = 1/churn is a reciprocal function.

## Limitations & When Not To Use

LTV assumes **constant churn** — which is rarely true in practice. In reality, churn is higher in the first 90 days (onboarding failures), drops to a stable baseline, then ticks up at month 12 (annual renewals). For early-stage startups with <6 months of cohort data, the LTV estimate has wide error bars. The formula also assumes revenue per customer is flat — but expansion revenue (upsells, seat growth) often grows 10-30% annually for healthy SaaS. For more accurate modeling, use **cohort retention curves** from your billing system. The **3:1 LTV:CAC** benchmark applies to SaaS with gross margin >70% — for services businesses with 30-50% gross margin, the threshold drops to 2:1.

## Worked Example

Imagine a B2B SaaS at $50/mo ARPU, 80% gross margin, 3% monthly churn, $150 CAC.

1. **Avg Lifetime** = 1 ÷ 3% = **33.3 months**
2. **Gross Profit/Month** = $50 × 80% = **$40**
3. **LTV** = $40 × 33.3 = **$1,333**
4. **LTV:CAC** = $1,333 ÷ $150 = **8.9:1** — top-quartile
5. **Payback** = $150 ÷ $40 = **3.75 months** — well under 12-month target

If churn drops to 2% (better onboarding): lifetime = 50 months, LTV = $2,000, LTV:CAC = 13.3:1. The calculator surfaces this in the **What-If** section: churn reduction is almost always a higher-leverage investment than acquisition optimization because of the reciprocal relationship.