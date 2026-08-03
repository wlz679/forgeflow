---
slug: 'solopreneur-burn-rate-calculator'
engine_ref: 'solopreneur-burn-rate-calculator'
category_id: 'A'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Stripe Atlas — Cash Flow & Burn Rate Guide'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'OpenView SaaS Benchmarks 2026'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'SaaS Capital — Burn Multiple & Default Alive Reporting'
    url: 'https://www.saas-capital.com/research/'
---

## What This Calculator Measures

Burn rate is the speed at which a business spends its cash reserve. The
**gross burn** is total monthly operating expenses (team, infra, marketing,
operations); the **net burn** subtracts recurring revenue from that total
to show how fast the bank account is actually shrinking. Together with the
cash balance, burn rate produces **runway** (months of survival at the
current burn) and the **Default Alive / Default Dead** verdict popularized
by Paul Graham — without intervention, will the company still be alive
when it raises its next round or reaches break-even?

## How It Works (Methodology)

The v3 standard formula:

```
GrossBurn = TeamCost + InfraCost + MarketingCost + OpsCost
NetBurn   = GrossBurn − MonthlyRevenue
Runway    = CurrentCash ÷ NetBurn   (months)
BurnMultiple = NetBurn ÷ NetNewRevenueAdded
```

| Variable                | Meaning                                                              |
| ----------------------- | -------------------------------------------------------------------- |
| `TeamCost`              | Fully-loaded monthly payroll (salaries, contractors, benefits)       |
| `InfraCost`             | Hosting, SaaS tools, third-party APIs, cloud storage                 |
| `MarketingCost`         | Paid ads, content production, marketing tooling, agency spend        |
| `OpsCost`               | Office, legal, insurance, accounting, travel, miscellaneous          |
| `MonthlyRevenue`        | Average monthly recurring revenue (3–6 month average is best)        |
| `NetNewRevenueAdded`    | Month-over-month net new MRR (new + expansion − churned)             |
| `CurrentCash`           | Liquid balance in the operating account                              |

**Assumptions.** The runway formula assumes a constant net burn — it does
not model hiring ramps, seasonal revenue, or fundraising events. Net new
revenue is treated as one lump per month rather than a steady drip. For
breakeven, the calculator extrapolates linearly from the current gap; in
practice, growth is usually non-linear, so the breakeven date is a
ballpark, not a guarantee.

## Limitations & When Not To Use

This calculator is built for **subscription businesses and startups with a
predictable cost base**. If you are project-based, retail, or wholesale
(where revenue is lumpy and COGS swings wildly month to month), runway
will be misleading. For those businesses, use cash-flow forecasting that
accounts for accounts-reivable timing and inventory cycles. Burn rate
also assumes you can shut off discretionary spend instantly — if your
fixed costs (leases, severance terms) lock you in, adjust the **Cost-Cut
Scenarios** accordingly.

## Worked Example

A B2B SaaS at $5,000 MRR, with $8,000 team cost, $500 infra, $2,000
marketing, and $1,500 operations, sitting on $50,000 in the bank and
adding roughly $3,000 of net new MRR each month:

1. `GrossBurn` = 8,000 + 500 + 2,000 + 1,500 = **$12,000/mo**
2. `NetBurn` = 12,000 − 5,000 = **$7,000/mo** (and $84,000 annualized)
3. `Runway` = 50,000 ÷ 7,000 = **~7.1 months** → cash runs out around March next year
4. `BurnMultiple` = 7,000 ÷ 3,000 = **2.3×** (the red zone — adding revenue slower than burning)
5. Verdict: **Default Dead** in under 12 months — needs to cut $2,000/mo of cost or double new MRR to extend runway past a year
