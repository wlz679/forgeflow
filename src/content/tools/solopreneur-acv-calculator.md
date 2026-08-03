---
slug: 'solopreneur-acv-calculator'
engine_ref: 'solopreneur-acv-calculator'
category_id: 'S'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Insivia — What is Average Contract Value (ACV)'
    url: 'https://www.insivia.com/blog/what-is-acv/'
  - name: 'HubSpot — Average Contract Value'
    url: 'https://blog.hubspot.com/sales/average-contract-value'
  - name: 'OpenView — 2026 SaaS Pricing & ACV Benchmarks'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
---

## What This Calculator Measures

Average Contract Value (ACV) is the annualized revenue per customer
contract — the fundamental SaaS pricing metric. It tells you how much
each customer is worth on a per-year basis, separate from new logo
versus expansion revenue. ACV drives pricing tier decisions (SMB,
mid-market, enterprise), sales territory sizing, and customer success
investment. The expansion-adjusted variant also incorporates annual
upsell/cross-sell expansion rate, which is critical for Net Revenue
Retention (NRR) and 100%+ NRR aspirants (the benchmark for top-quartile
SaaS companies per OpenView's 2026 SaaS Benchmarks).

## How It Works (Methodology)

The v3 standard formula derives ACV from total contract value, contract
length, customer count, and expansion:

```
baseACV                = totalContractValue ÷ numCustomers
monthlyACV             = baseACV ÷ contractLength (months)
annualACV              = monthlyACV × 12
expansionAdjustedACV   = annualACV × (1 + expansionRate ÷ 100)
```

| Variable          | Meaning                                                          |
| ----------------- | ---------------------------------------------------------------- |
| `totalContractValue` | Sum of all signed contracts across the cohort                 |
| `numCustomers`    | Distinct signed contracts in the cohort                          |
| `contractLength`  | Months per contract (annual = 12, multi-year = 24/36)            |
| `expansionRate`   | Annual upsell/cross-sell expansion as % of existing ACV          |

**Health bands** (annual ACV in USD):
- 🟢 ≥ $50,000 — enterprise-grade (procurement-ready, named CSM)
- 🟡 $10,000–$50,000 — mid-market sweet spot (the most common SaaS band)
- 🟠 $2,000–$10,000 — SMB pricing tier (self-serve or low-touch sales)
- 🔴 < $2,000 — micro-transaction / prosumer (focus on upsell)

**Assumptions.** Annual ACV equals baseACV when contractLength = 12
months. For multi-year contracts, baseACV ÷ contractLength gives the
monthly rate; × 12 annualizes it. The expansion-adjusted variant
assumes expansion compounds annually — for monthly compounding models,
divide rate by 12 first. Note that adding more customers at the same
per-customer value *reduces* ACV when measured on a per-customer basis.

## Limitations & When Not To Use

ACV is a **per-customer pricing metric for subscription businesses**.
It is not appropriate for project-based agencies, professional services
firms, or transaction-driven retailers — those businesses price by
project, hour, or unit, not by annualized contract. It also assumes
contract length is uniform across the cohort; if half your customers
are on 12-month contracts and half on 24-month, baseACV is a weighted
average that smooths the difference but hides true mix. Use the **LTV
Calculator** for lifetime value analysis (incorporating churn and gross
margin) and the **Sales Velocity Calculator** for revenue throughput.

## Worked Example

A B2B SaaS with $300,000 in total contract value, 12 customers on
12-month contracts, and a 10% annual expansion rate:

1. `baseACV` = $300,000 ÷ 12 = **$25,000 per customer**
2. `monthlyACV` = $25,000 ÷ 12 = **$2,083.33/month per customer**
3. `annualACV` = $2,083.33 × 12 = **$25,000/year per customer**
4. `expansionAdjustedACV` = $25,000 × (1 + 10%) = **$27,500/year per customer**
5. Health band: 🟡 **Good** (mid-market sweet spot)
6. Path to 🟢 ($50K): raise total contract value by $300K (same customers, larger deals), OR reduce to ~6 or fewer customers at $50K+ each
7. Adding more customers at $25K each *reduces* per-customer ACV (more dilution than improvement)

Pair with the **Sales Velocity Calculator** to ensure ACV growth isn't
coupled with cycle compression you can't sustain, and with **Pipeline
Value Calculator** to forecast expansion revenue contribution.