---
slug: 'solopreneur-revenue-projector'
engine_ref: 'solopreneur-revenue-projector'
category_id: 'A'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Stripe Atlas — SaaS Financial Modeling'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'Bessemer — Cloud Index & Rule of 40'
    url: 'https://www.bvp.com/atlas/state-of-the-cloud-2025'
  - name: 'OpenView SaaS Benchmarks 2026 — Net Growth & NRR'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
---

## What This Calculator Measures

The SaaS Financial Forecaster projects a subscription business forward
over a 6/12/24-month horizon and answers five questions operators actually
ask: *where does MRR land? when do I hit break-even? how much runway
do I have? what does my CAC payback look like? and which one or two
levers move the number most?* It combines the standard SaaS
**net-growth compounding** model with **burn multiple, Rule of 40,
LTV:CAC, and CAC payback** — the four ratios that Bessemer and OpenView
track as the canonical investor benchmarks. It's a single dashboard for
the "is my SaaS healthy?" question.

## How It Works (Methodology)

The v3 standard formulas:

```
NetMonthlyRate     = (GrossGrowthRate − MonthlyChurnRate) ÷ 100
EndingMRR          = CurrentMRR × (1 + NetMonthlyRate)^Months
TotalRevenue       = Σ  CurrentMRR × (1 + NetMonthlyRate)^m   for m=1..Months
AnnualizedNetRate  = (1 + NetMonthlyRate)^12 − 1
Runway             = CashOnHand ÷ (MonthlyExpenses − CurrentMRR)   (if burning)
BreakevenMonths    = ⌈log(MonthlyExpenses ÷ CurrentMRR) ÷ log(1 + NetMonthlyRate)⌉
CACPayback         = CAC ÷ (ARPU × (1 − ChurnRate÷100))
LTV                = ARPU ÷ (ChurnRate÷100)
LTV:CAC            = LTV ÷ CAC
RuleOf40           = NetMonthlyRate×100 + ProfitMargin
```

| Variable              | Meaning                                                                |
| --------------------- | ---------------------------------------------------------------------- |
| `CurrentMRR`          | Today's monthly recurring revenue                                      |
| `GrossGrowthRate`     | Monthly new + expansion MRR as % of current MRR                        |
| `MonthlyChurnRate`    | Monthly cancellation + contraction as % of MRR                         |
| `MonthlyExpenses`     | Total monthly operating expenses (gross burn)                          |
| `CashOnHand`          | Liquid balance in the operating account                                |
| `ARPU`                | Average revenue per user (per month)                                   |
| `CustomGrowthRate`    | Optional "what if I grow slower/faster?" rate                          |
| `CAC`                 | Customer acquisition cost (blended, per new customer)                  |
| `Months`              | Projection horizon — 6, 12, or 24                                      |

**Assumptions.** Net growth is compounded monthly on the current MRR
base — it does not model new-product launches, hiring ramps, or pricing
changes mid-period. Profit margin is computed off today's expenses (not
a forward-looking cost trajectory). For a solopreneur with no payroll
shocks, this is a tight approximation; for a venture-backed team that
plans to hire 5 people mid-projection, re-run the model with the
post-hire cost base.

## Limitations & When Not To Use

This dashboard assumes a **subscription business with a single
recurring-revenue stream**. If you have a meaningful services or
hardware line, layer it in separately (or extend the model) — a 70/30
SaaS/services split behaves very differently from a pure-play SaaS
forecast. The compound-growth formula also over-smooths real-world
volatility: actual MRR zig-zags month to month, and a 3-month marketing
lapse can shave 5pp off net growth without warning. Use the **Custom
Growth Rate** scenario to model a slowdown before it happens, not after.

## Worked Example

A B2B SaaS at $5,000 MRR, 8% gross monthly growth, 3% monthly churn,
$3,000/month expenses, $60,000 in the bank, $25 ARPU, and $200 CAC,
projecting 12 months:

1. `NetMonthlyRate` = (8 − 3) ÷ 100 = **+5%/mo** (compounded)
2. `EndingMRR` = $5,000 × 1.05¹² = **$8,979/mo** (+80% over the year)
3. `TotalRevenue` = Σ over 12 months ≈ **$80,000**
4. `MonthlyBurn` = 3,000 − 5,000 = **−$2,000/mo (profit)** → already at break-even
5. `Runway` = ∞ (profitable), but zero-revenue runway = 60,000 ÷ 3,000 = **20 months** as a safety floor
6. `CACPayback` = 200 ÷ (25 × 0.97) = **8.2 months** (🟢 under 12-month benchmark)
7. `LTV:CAC` = (25 ÷ 0.03) ÷ 200 = **4.2×** (🟢 above the 3× investor bar)
8. `RuleOf40` = 5 + 0 = **5%** (🔴 under 20%) — profitability now, but growth slows; reinvest into a second acquisition channel
