---
slug: 'solopreneur-market-size-estimator'
engine_ref: 'solopreneur-market-size-estimator'
category_id: 'A'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'a16z Marketplace 100 — Market Sizing Methodology'
    url: 'https://a16z.com/marketplace-100/'
  - name: 'Bessemer Venture Partners — State of the Cloud'
    url: 'https://www.bvp.com/atlas/state-of-the-cloud-2025'
  - name: 'OpenView Partners — TAM/SAM/SOM Framework'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
---

## What This Calculator Measures

Market sizing is the act of putting a number on the buyers you *could*
realistically serve — and separating that number into three layers that
investors and operators use to make decisions. **TAM (Total Addressable
Market)** is the global annual revenue if every potential customer bought
from a vendor like you. **SAM (Serviceable Addressable Market)** is the
slice you can reach given your geography, channel, and product
constraints. **SOM (Serviceable Obtainable Market)** is what you can
actually win in the next 2–3 years. This calculator does both a
**bottom-up** view (count of customers × price) and a **top-down** view
(market share of TAM), and warns you when the two diverge.

## How It Works (Methodology)

The v3 standard formulas:

```
TAM           = TotalAddressableCustomers × AnnualRevenuePerCustomer
SAM           = TAM × SAMPercent ÷ 100
Market3y      = TAM × (1 + GrowthRate)^3
Market5y      = TAM × (1 + GrowthRate)^5
BottomUpRev   = TotalAddressableCustomers × PenetrationRate × ARPU
TopDownRev    = TAM × MarketShare × MarketStageAdjustment
```

| Variable                 | Meaning                                                              |
| ------------------------ | -------------------------------------------------------------------- |
| `TargetMarket`           | Free-text market name (e.g., "US dental clinics")                    |
| `TotalAddressableCustomers` | Count of potential buyers (B2B: firms; B2C: end users)            |
| `AnnualRevenuePerCustomer` | Average annual contract value (or ARPU × 12)                      |
| `MarketGrowthRate`       | Annual market CAGR (compound annual growth rate)                     |
| `SAMPercent`             | % of TAM you can realistically reach with your GTM                   |
| `MarketStage`            | Emerging / Growing / Mature / Declining — adjusts realism           |
| `PenetrationRate`        | Your assumed share in 2–3 years (tiered by market size)              |

**Assumptions.** Bottom-up assumes a uniform ARPU across the customer
base — if pricing varies by segment, use a weighted average. Top-down
applies a **market-stage adjustment** (Emerging 1.5×, Growing 1.0×,
Mature 0.7×, Declining 0.4×) to reflect how hard it is to capture share
in each phase. If bottom-up and top-down diverge by 3× or more, your
inputs need a primary-research check.

## Limitations & When Not To Use

Market sizing is a **directional** exercise, not a forecast. The
calculator uses ARPU × customer count — if your market is a true
two-sided platform (e.g., marketplace with buyers *and* sellers), you
need a transaction-volume model instead. It also assumes you can
realistically reach the entire SAM; in practice, distribution
constraints (channel partners, language barriers, regulatory licenses)
often cut that in half. Use the **Top-Down Cross-Check** to sanity-check
your bottom-up inputs before pitching investors.

## Worked Example

A SaaS targeting "US independent dental clinics" with 30,000 total
clinics, $5,000 ARPU, 12% market CAGR, 25% SAM, and a Growing stage:

1. `TAM` = 30,000 × $5,000 = **$150M/yr**
2. `SAM` = $150M × 25% = **$37.5M/yr** (clinics you can reach)
3. `Market3y` = $150M × 1.12³ = **$210.7M/yr** (compounded growth)
4. Bottom-up at 1% share: 30,000 × 0.01 × $5,000 = **$1.5M/yr** (a small-team target)
5. Top-down at 1% of TAM (no stage adj): $150M × 0.01 = **$1.5M/yr** — converges with bottom-up
6. To reach $100K/yr: need 20 customers — that's 0.07% of TAM, well within the 🟢 "very achievable" band
