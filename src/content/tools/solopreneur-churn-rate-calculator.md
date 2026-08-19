---
slug: 'solopreneur-churn-rate-calculator'
engine_ref: 'solopreneur-churn-rate-calculator'
category_id: 'A'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ChartMogul — SaaS Churn Benchmarks & NRR Definitions'
    url: 'https://chartmogul.com/'
  - name: 'OpenView SaaS Benchmarks 2026 — NRR/GRR Report'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'ICONIQ Growth — State of B2B SaaS Retention'
    url: 'https://iconiqcapital.com/growth/state-of-b2b-spend'
---

## What This Calculator Measures

Churn is the rate at which a business loses customers or revenue from its
existing base. **Logo churn** measures customer headcount loss; **revenue
churn** measures the dollar value lost. The two diverge when customers
pay different amounts — losing your top 5 enterprise contracts hurts
revenue churn 100× more than losing 5 SMB self-serve accounts. This
calculator also derives the two most important retention ratios in SaaS:
**GRR (Gross Revenue Retention)** — revenue kept from existing customers,
ignoring expansion; and **NRR (Net Revenue Retention)** — same but
*including* upsell, cross-sell, and reactivation. NRR above 100% means
your existing book of business is growing without any new sales.

## How It Works (Methodology)

The v3 standard formulas:

```
MonthlyLogoChurn    = CustomersLost ÷ CustomersStart
AnnualLogoChurn     = 1 − (1 − MonthlyLogoChurn)^12
GrossRevenueChurn   = (CustomersLost × ARPU) ÷ StartingMRR
NetRevenueChurn     = (ChurnedRevenue − ExpansionRevenue) ÷ StartingMRR
GRR                 = (StartingMRR − ChurnedRevenue) ÷ StartingMRR × 100
NRR                 = (StartingMRR + ExpansionRevenue − ChurnedRevenue)
                      ÷ StartingMRR × 100
```

| Variable              | Meaning                                                           |
| --------------------- | ----------------------------------------------------------------- |
| `CustomersStart`      | Paying customers on the first day of the month                    |
| `CustomersLost`       | Cancellations + non-renewals during the month                     |
| `NewCustomers`        | Net new paying customers acquired in the month                    |
| `ARPU`                | Average revenue per customer (per month)                          |
| `ExpansionRevenue`    | Upsell, cross-sell, and seat additions from existing customers    |
| `ChurnAttribution`    | ~60% voluntary (cancellation) + ~40% involuntary (failed payment) |

**Assumptions.** Churn compounds monthly: a 3% monthly rate becomes
1 − (1 − 0.03)^12 = 30.6% annually, not 36% — the formula above is
correct, the naive linear view is not. Voluntary vs. involuntary split
is a 60/40 industry default (Recurly, ChartMogul); your real ratio
depends on your billing model (annual contracts push involuntary toward
0, monthly pushes it higher).

Source for these bands: Recurly's annual Subscription Benchmarks Report (B2C SaaS logo churn rates by vertical), ChartMogul's SaaS Churn Rate Benchmarks (gross MRR churn by company stage), and SaaS Capital's published B2B SaaS cohort churn data.

## Limitations & When Not To Use

This calculator assumes a **subscription business with monthly billing
cycles**. For annual or multi-year contracts, the unit of churn is the
renewal cohort, not the calendar month — replace the monthly inputs with
annual contract data and divide by 12. It also does not handle
**delinquent** customers (still on the books but past due); those belong
in your dunning pipeline, not your churn rate. For transactional
businesses, use repeat-purchase rate or 90-day repurchase rate instead.

## Assumptions

- Churn is measured as the share of customers (or MRR) lost in a given period — does not include downgrades (use NRR/GRR calculators for downgrade-adjusted churn).
- Voluntary vs involuntary split assumes 60/40 industry default (Recurly/ChartMogul); for B2B enterprise SaaS, involuntary tends to be higher (15-25%) due to procurement-driven cancellations.
- Annualized churn = monthly churn × 12; this linear extrapolation overstates true churn (compounding effect), prefer cohort-based annualized churn for accuracy.

## Common Mistakes

- Mixing gross churn with net churn — gross churn is total lost customers; net churn accounts for upgrades/expansion; for investor reporting, always show net.
- Reporting logo churn vs revenue churn — logo churn can miss expansion impact (negative net churn from upsell); both metrics tell different stories, report both.
- Optimizing for low churn via product stickiness without measuring expansion — best-in-class SaaS has negative net churn (expansion > churn); pure retention is a low bar.

## Worked Example

A vertical SaaS with 500 customers at the start of the month, 15 lost,
25 new, $50 ARPU, and $500 of expansion revenue from existing accounts:

1. `MonthlyLogoChurn` = 15 ÷ 500 = **3.0%**  →  annualized 30.6%
2. `GrossRevenueChurn` = (15 × 50) ÷ 25,000 = **3.0%** (matches logo because pricing is uniform)
3. `NetRevenueChurn` = (750 − 500) ÷ 25,000 = **1.0%** (expansion offsets half the loss)
4. `GRR` = (25,000 − 750) ÷ 25,000 = **97.0%** — within the "Healthy" 90%+ band
5. `NRR` = (25,000 + 500 − 750) ÷ 25,000 = **99.0%** — below 100%, so existing book is shrinking slightly
6. Verdict: cut churn from 3% to 2% and expansion covers the gap; NRR crosses 100%
