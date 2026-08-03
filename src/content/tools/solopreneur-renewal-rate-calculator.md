---
slug: 'solopreneur-renewal-rate-calculator'
engine_ref: 'solopreneur-renewal-rate-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'OpenView Partners — 2024 SaaS Benchmarks'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'ICONIQ Growth — SaaS Retention Metrics'
    url: 'https://iconiqcapital.com/growth/saas-retention-metrics'
  - name: 'SaaS Capital — Retention Benchmark Study'
    url: 'https://www.saascapital.com/insights-private-company-benchmarks'
---

## What This Calculator Measures

Renewal Rate isolates one specific moment in the retention motion: when a
contract comes up for renewal, does it actually get renewed? It is the
cleanest "gross" read on customer commitment because it excludes
mid-cycle downgrades and any expansion — both of which can mask whether
the renewal conversation itself is going well. When a board member asks
"are customers staying when they have a choice?", this is the metric.
For mid-market B2B SaaS on annual contracts, renewal rate is the
quarterly heartbeat of the CS org. Pair it with **GRR Calculator** for
the full gross retention picture (downgrades + churn folded in) and with
**NRR Calculator** to see how expansion lifts the net number.

## How It Works (Methodology)

The v3 standard formula we use:

```
Renewal Rate (%) = ARR Renewed ÷ ARR Up For Renewal × 100
```

| Variable              | Meaning                                                              |
| --------------------- | -------------------------------------------------------------------- |
| `ARR Up For Renewal`  | Total ARR on contracts that came up for renewal during the period     |
| `ARR Renewed`         | Of that ARR, how much actually renewed (excludes expansion)          |

A `ARR Up For Renewal` of zero returns Renewal Rate = 0 (zero-division
guard). Health bands follow OpenView / ICONIQ annual-contract SaaS
benchmarks: 🟢 ≥90% (world-class gross retention), 🟡 80–90% (healthy
mid-market median ~85%), 🟠 70–80% (warning — CS coverage gap),
🔴 <70% (critical — major intervention required). All inputs are
clamped to non-negative. Expansion (upsell/cross-sell) is intentionally
**not** counted in the renewal number — it lives in NRR instead, where it
belongs.

## Limitations & When Not To Use

Renewal rate is only meaningful for businesses with a defined renewal
moment — annual or multi-year contracts are the natural fit. For pure
month-to-month subscriptions without a contract decision, "renewal"
collapses to "did the customer stay another month" and the metric
overlaps with logo churn, so use **Logo Churn Rate Calculator** instead.
For usage-based or consumption-priced contracts with auto-renew, the
denominator is fuzzy and the number can mislead — report renewal rate on
your committed-contraction lines, not metered revenue. Renewal rate also
**excludes mid-cycle downgrades** by design; if a customer downgrades in
month 4 and renews in month 12 for the lower amount, both halves count
or neither counts depending on how you split — be consistent.

## Worked Example

A mid-market B2B SaaS with annual contracts starts the quarter with
$1,000,000 of ARR up for renewal across 47 contracts; $850,000 of that
ARR actually renews. Working through:

1. `ARR Up For Renewal` = $1,000,000
2. `ARR Renewed` = $850,000
3. `Renewal Rate` = $850,000 ÷ $1,000,000 × 100 = **85.0%** → 🟡 Good band

Each +5pp improvement at this scale recovers $50,000 of ARR per quarter.
Pair with **GRR Calculator** to see the full gross retention view; pair
with **NRR Calculator** to see how much of the renewal-year delta came
from expansion on the renewing accounts.
