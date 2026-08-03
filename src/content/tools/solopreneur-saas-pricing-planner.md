---
slug: 'solopreneur-saas-pricing-planner'
engine_ref: 'solopreneur-saas-pricing-planner'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'OpenView SaaS Benchmarks 2026 — Pricing & Packaging'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'Stripe Atlas — SaaS Pricing Models'
    url: 'https://stripe.com/atlas/guides/revenue'
  - name: 'Harvard Business Review — The Psychology of Pricing'
    url: 'https://hbr.org/topic/subject/pricing'
---

## What This Calculator Measures

This calculator helps solopreneurs and indie founders pick a defensible
pricing model for SaaS, ebooks, courses, templates, and newsletters.
It isolates the trade-off between **flat-rate / tiered / usage-based /
freemium** and surfaces the per-tier gross margin, MRR contribution,
LTV, and break-even customer count so you can launch at a price that
recovers product costs within 12 months — without leaving money on the
table. Use it before publishing a pricing page, before a price increase,
or when evaluating a freemium-vs-paid split.

## How It Works (Methodology)

The v3 standard formula set we use:

```
basePrice = max(competitorPrice, 29)
targetMargin = 0.70
assumedChurn = 3% monthly

For each tier (Starter, Pro, Max, Enterprise):
  monthlyMrr       = midPrice × customerCount
  costPerCustomer  = midPrice × (1 − tierMargin)
  ltv              = (midPrice − costPerCustomer) / assumedChurn
  breakEvenCount   = ceil(2,000 / (tierMargin × midPrice))
weightedMargin    = Σ(margin × monthlyMrr) / Σ monthlyMrr
```

| Variable            | Meaning                                                    |
| ------------------- | ---------------------------------------------------------- |
| `competitorPrice`   | Average monthly price of the top 3 competitors ($/mo)     |
| `productType`       | SaaS / ebook / course / template / newsletter             |
| `targetCustomer`    | b2b / b2c / developers / creators                          |
| `tierMargin`        | Gross margin per tier (Starter 85% → Enterprise 65%)       |
| `assumedChurn`      | 3% monthly — median for $30-$100/mo SaaS (OpenView 2026)  |
| `ltv`               | Customer lifetime value at current price and margin        |
| `breakEvenCount`    | Customers needed to cover $2K/mo of fixed tier costs       |

The LTV formula `(price × margin) / monthly churn` is the textbook SaaS
equation; break-even customers assume $2,000/mo of fixed costs per
tier (hosting, support, payment fees) — adjust for your overhead.

## Limitations & When Not To Use

This calculator assumes a **recurring subscription** business. If you
sell one-time goods (physical products, services priced per project,
custom consulting) the LTV math collapses because churn is undefined
and break-even is one sale. It also bakes in US-style margin and churn
norms; for emerging-market SaaS the multiplier is often lower (cheaper
CAC) and churn higher. For high-touch enterprise sales with custom
contracts, skip the freemium/usage-based outputs entirely — they do
not apply.

## Worked Example

Imagine launching a B2B SaaS targeting developers, with a competitor
benchmark of $29/mo:

1. `basePrice` = `competitorPrice` = **$29/mo** (Starter → Max tiers
   scale around this anchor).
2. **Pro tier** at $38/mo with 75% margin and 400 customers = **$15,200 MRR**.
3. **Enterprise tier** at $499/mo with 65% margin and 12 customers =
   **$5,988 MRR** (anchor tier — only ~4% of customers but ~14% of MRR).
4. **Total MRR** across 4 tiers and 1,492 customers = **$44,508/mo**.
5. **Average LTV** at 3% monthly churn and 76.8% blended margin ≈ **$763**.
6. **Pricing Health** flags green for blended margin ≥ 70% target but
   warns orange that Pro is 30%+ above the $29 competitor benchmark —
   price-objection risk. The Calculator's **What-If** section then
   models a 20% price cut (recovers deal-flow) vs a 20% raise (tests
   willingness to pay). Pair this with the **MRR Calculator** to project
   12-month revenue at each price point.