---
slug: 'solopreneur-nrr-calculator'
engine_ref: 'solopreneur-nrr-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — SaaS Retention Metrics'
    url: 'https://www.saas-capital.com/blog-posts/saas-retention-metrics/'
  - name: 'OpenView Partners — The Real Story Behind Net Dollar Retention'
    url: 'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/'
  - name: 'ICONIQ Growth — Net Dollar Retention'
    url: 'https://www.iconiqcapital.com/growth/tte-net-dollar-retention'
---

## What This Calculator Measures

Net Revenue Retention (NRR) measures how much recurring revenue you keep and
grow from your existing customer base — the single headline number every SaaS
board tracks when evaluating CS, expansion, and pricing health. NRR above
100% means your existing customers grew net of churn and contraction; below
100% means your installed base is shrinking even as you book new logos. It
is the most-cited retention metric in board decks, fundraising diligence, and
public-company SaaS filings for good reason: it strips out new-logo noise and
isolates the health of the revenue you already own.

## How It Works (Methodology)

The v3 standard formula we use:

```
Net Retained MRR = Starting MRR + Expansion MRR − Downgrade MRR − Churned MRR
NRR (%)         = Net Retained MRR ÷ Starting MRR × 100
```

| Variable         | Meaning                                                              |
| ---------------- | -------------------------------------------------------------------- |
| `Starting MRR`   | Total MRR from existing customers at the beginning of the period    |
| `Expansion MRR`  | Net new MRR from upsell + cross-sell within the existing base        |
| `Downgrade MRR`  | MRR lost from tier/seat downgrades (not cancellations — those count as churn) |
| `Churned MRR`    | MRR lost from full cancellations during the period                   |

A starting MRR of zero returns NRR = 0 (zero-division guard). Health bands
follow OpenView / ICONIQ conventions: 🟢 ≥120% (top-quartile), 🟡 110–120%
(healthy expansion), 🟠 100–110% (fragile, expansion barely covers churn),
🔴 <100% (net contraction). All inputs are clamped to non-negative — if your
billing system reports a negative churn adjustment, isolate it before
feeding it here.

## Limitations & When Not To Use

NRR is a **mid-market B2B SaaS** metric. It does not generalize cleanly to
self-serve consumer subscription products (cohort sizes are tiny, expansion
is rare), transactional businesses with no recurring base, or pure services
firms. The metric also conflates very different motions: a 110% NRR built on
aggressive price increases is structurally different from a 110% NRR built
on organic seat growth — both look identical here. Finally, NRR is **point-
in-time** and **cohort-dependent**: a single quarter's expansion surge takes
roughly 12 months to fully compound, so always pair it with a trailing
12-month NRR view when discussing with investors.

## Worked Example

Imagine a B2B SaaS entering Q2 with $1,000,000 of starting MRR and these
flows during the quarter: $200,000 of upsell + cross-sell (Expansion MRR),
$80,000 of tier downgrades, $20,000 of full churn. Walk through:

1. `Starting MRR` = $1,000,000
2. `Expansion MRR` = +$200,000
3. `Downgrade MRR` = −$80,000
4. `Churned MRR` = −$20,000
5. `Net Retained MRR` = $1,000,000 + $200,000 − $80,000 − $20,000 = **$1,100,000**
6. `NRR` = $1,100,000 ÷ $1,000,000 × 100 = **110%** → 🟡 Good band

Pair this calculator with **GRR Calculator** to isolate pure retention (no
expansion) and with **Expansion Revenue Calculator** to size the
expansion engine that drove the +20pp lift above your GRR.
