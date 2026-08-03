---
slug: 'solopreneur-grr-calculator'
engine_ref: 'solopreneur-grr-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SaaS Capital — SaaS Retention Metrics'
    url: 'https://www.saas-capital.com/blog-posts/saas-retention-metrics/'
  - name: 'OpenView Partners — The Real Story Behind Net Dollar Retention'
    url: 'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/'
  - name: 'ICONIQ Growth — Gross Retention Definitions'
    url: 'https://www.iconiqcapital.com/growth/tte-net-dollar-retention'
---

## What This Calculator Measures

Gross Revenue Retention (GRR) measures how much recurring revenue you keep
from existing customers, **excluding** expansion. It always sits at or below
100% — by construction, no upsell or cross-sell can save you here. GRR is
the "is the bucket leaking?" signal that investors look at to verify your
retention engine is real before they credit any expansion growth. GRR below
80% means your existing-customer revenue base is shrinking fast enough that
no amount of new-logo wins or upsell motion can compensate; it is also the
cleanest read on whether your customer success team is winning at
retention, separate from whether sales is winning at expansion.

## How It Works (Methodology)

The v3 standard formula we use:

```
Retained MRR = Starting MRR − Downgrade MRR − Churned MRR
GRR (%)      = Retained MRR ÷ Starting MRR × 100
```

| Variable        | Meaning                                                              |
| --------------- | -------------------------------------------------------------------- |
| `Starting MRR`  | Total MRR from existing customers at the start of the period         |
| `Downgrade MRR` | MRR lost from tier/seat downgrades (not cancellations)                |
| `Churned MRR`   | MRR lost from full cancellations during the period                   |

A `Starting MRR` of zero returns GRR = 0 (zero-division guard). Health
bands: 🟢 ≥95% (best-in-class retention), 🟡 90–95% (SaaS Capital median),
🟠 80–90% (mid-market median — intervention needed), 🔴 <80% (severe,
unsustainable churn). GRR tells you the absolute floor on your retention
engine — if GRR is mediocre, NRR above 100% is doing all the heavy lifting
through expansion.

## Limitations & When Not To Use

GRR is designed for **subscription-style** businesses with predictable
recurring revenue. If you sell multi-year contracts with lump-sum
recognition, GRR will flicker across reporting boundaries and lose meaning.
GRR is also cohort-dependent: a single large contract churning in a quarter
will swing the percentage even when the underlying base is stable. For
**early-stage** companies with fewer than 30 customers, GRR is noisy and
easily distorted by a single account — wait until the base is large enough
that no single logo accounts for more than 5% of MRR. Use NRR, not GRR, when
you want to credit expansion.

## Worked Example

A mid-market B2B SaaS with $1,000,000 of starting MRR lost $80,000 of MRR
to tier downgrades and $20,000 to full churn during Q2. The math:

1. `Starting MRR` = $1,000,000
2. `Downgrade MRR` = −$80,000
3. `Churned MRR` = −$20,000
4. `Retained MRR` = $1,000,000 − $80,000 − $20,000 = **$900,000**
5. `GRR` = $900,000 ÷ $1,000,000 × 100 = **90%** → 🟡 Good band

If the same business had $200,000 of upsell + cross-sell during the same
quarter, **NRR would land at 110%** — illustrating how GRR isolates pure
retention while NRR lets expansion lift the headline. Pair with **NRR
Calculator** to see the full retention + growth story side-by-side.
