---
slug: 'solopreneur-logo-churn-rate-calculator'
engine_ref: 'solopreneur-logo-churn-rate-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — SaaS Retention Metrics'
    url: 'https://www.saas-capital.com/blog-posts/saas-retention-metrics/'
  - name: 'OpenView Partners — Logo Churn vs Revenue Churn'
    url: 'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/'
---

## What This Calculator Measures

Logo Churn Rate is the count-based complement to GRR. Instead of weighting
by revenue, it counts the percentage of customer logos lost over a period.
The two metrics look similar but measure different things: GRR captures
dollar-weighted churn (a $500K logo departure hurts more than a $50 logo),
while logo churn treats every customer equally. They diverge when
customers at different price tiers churn at different rates — a common
pattern in mid-market B2B SaaS where enterprise logos are stickier than
SMB. Logo churn is also the cleanest early-warning signal because customer
counts are stable across billing-cycle boundary effects that can distort
revenue retention figures.

## How It Works (Methodology)

The v3 standard formula we use:

```
Retained Customers = Starting Customers − Lost Customers
Logo Churn (%)     = Lost Customers ÷ Starting Customers × 100
```

| Variable             | Meaning                                                  |
| -------------------- | -------------------------------------------------------- |
| `Starting Customers` | Total active customers at the start of the period        |
| `Lost Customers`     | Customers who fully cancelled during the period          |

A `Starting Customers` of zero returns Logo Churn = 0 (zero-division
guard). Health bands follow OpenView / SaaS Capital mid-market
benchmarks, but they run **inverse** (lower is better): 🟢 <5%
(best-in-class), 🟡 5–10% (top-quartile mid-market), 🟠 10–20%
(high — intervention needed), 🔴 ≥20% (severe, business-model risk).
Inputs are clamped to non-negative.

## Limitations & When Not To Use

Logo churn is most meaningful when the customer base is **large enough that
no single logo moves the needle more than 1–2pp** — typically 50+
customers. For early-stage companies with under 30 logos, a single
cancellation looks like a crisis; the metric is too noisy to drive
decisions. Logo churn also hides **mix-shift effects**: if your largest
customers churn, your logo count drops by 1 but your GRR drops by much
more. Finally, "customer" itself must be defined consistently — a parent
account with five subsidiaries counts as one logo or five, and that choice
will dominate the percentage. For pure revenue impact, use **GRR
Calculator** instead.

## Worked Example

Imagine a mid-market B2B SaaS with 100 active customers at the start of the
year who lost 8 of them to full cancellation during the year. Working
through the formula:

1. `Starting Customers` = 100
2. `Lost Customers` = 8
3. `Retained Customers` = 100 − 8 = **92**
4. `Logo Churn %` = 8 ÷ 100 × 100 = **8%** → 🟡 Good band

Pair with **GRR Calculator**: if those 8 lost customers averaged $10K MRR
while your surviving 92 averaged $15K MRR, the company's GRR would land
around 92% — showing that the lost customers were smaller than the average
and so revenue churn was milder than the logo churn number suggests.
