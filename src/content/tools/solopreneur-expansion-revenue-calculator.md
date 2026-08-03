---
slug: 'solopreneur-expansion-revenue-calculator'
engine_ref: 'solopreneur-expansion-revenue-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — SaaS Retention Metrics'
    url: 'https://www.saas-capital.com/blog-posts/saas-retention-metrics/'
  - name: 'OpenView Partners — Net Dollar Retention Drivers'
    url: 'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/'
---

## What This Calculator Measures

Expansion Revenue measures the share of additional recurring revenue you
generate from existing customers, expressed as a percentage of starting
MRR. It is the top-line growth lever that lets a SaaS business deliver
NRR above 100% even when GRR is mediocre. Expansion comes from two
distinct motions: **upsell** (more of the same product — extra seats,
higher tier, more usage) and **cross-sell** (a different product from your
portfolio bought by an existing account). This calculator separates the two
so you can see which motion is actually carrying the expansion engine; that
separation matters because they have different margins, sales cycles, and
product-fit prerequisites.

## How It Works (Methodology)

The v3 standard formula we use:

```
Expansion MRR  = Upsell MRR + Cross-sell MRR
Expansion (%)  = Expansion MRR ÷ Starting MRR × 100
```

| Variable         | Meaning                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `Starting MRR`   | Total MRR from existing customers at the start of the period         |
| `Upsell MRR`     | Net MRR added by more seats / higher tier / more usage of the same product |
| `Cross-sell MRR` | Net MRR added by selling an additional product from your portfolio   |

A `Starting MRR` of zero returns Expansion = 0 (zero-division guard).
Health bands follow OpenView / ICONIQ mid-market SaaS benchmarks: 🟢 ≥25%
(best-in-class), 🟡 15–25% (top-quartile), 🟠 5–15% (motion exists but
underweight), 🔴 <5% (no expansion motion — pure retention play). Inputs
are clamped to non-negative.

## Limitations & When Not To Use

Expansion revenue is a **mid-market B2B SaaS** metric. It does not generalize
to consumer self-serve products (where expansion is rare and uneven) or
services-led businesses with no multi-product portfolio to cross-sell into.
The metric is also **GTM-dependent**: a pure-PLG motion will get most
expansion from usage-tier upgrades, while a sales-led enterprise motion will
get it from annual contract value increases — two very different operational
playbooks. Finally, the upsell/cross-sell split depends on your product
taxonomy; if your pricing lacks clear tiers, the numbers may not be cleanly
decomposable. Pair with **NRR Calculator** to see how expansion lifts your
net retention number, and with **Logo Churn Rate Calculator** to make sure
the expansion engine isn't masking churn.

## Worked Example

Imagine a B2B SaaS with $1,000,000 of starting MRR executing a disciplined
expansion motion during Q2: $120,000 from seat upgrades on growing customer
teams (upsell) and $50,000 from cross-selling the analytics add-on to
accounts that already use the core product (cross-sell). The walk:

1. `Starting MRR` = $1,000,000
2. `Upsell MRR` (more seats on existing accounts) = +$120,000
3. `Cross-sell MRR` (analytics add-on) = +$50,000
4. `Total Expansion MRR` = $120,000 + $50,000 = **$170,000**
5. `Expansion %` = $170,000 ÷ $1,000,000 × 100 = **17%** → 🟡 Good band

Pair this with **NRR Calculator**: if you also had $80,000 of downgrades
and $20,000 of churn that quarter, NRR lands at 107% — illustrating how the
expansion engine lifts NRR above the 100% break-even.
