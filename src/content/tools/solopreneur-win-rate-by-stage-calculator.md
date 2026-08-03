---
slug: 'solopreneur-win-rate-by-stage-calculator'
engine_ref: 'solopreneur-win-rate-by-stage-calculator'
category_id: 'S'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'HubSpot — Sales Funnel Conversion Benchmarks'
    url: 'https://blog.hubspot.com/sales/sales-funnel'
  - name: 'HubSpot — Sales Conversion Rate Benchmarks 2026'
    url: 'https://blog.hubspot.com/sales/sales-conversion-rate'
  - name: 'Gartner — 2026 B2B Sales Funnel Conversion Report'
    url: 'https://www.gartner.com/'
---

## What This Calculator Measures

Win rate by stage reveals exactly where your funnel is leaking by
decomposing overall win rate into four multiplicative stage transitions
(SQL→Opp, Opp→Proposal, Proposal→Negotiation, Negotiation→Won). It
identifies the single bottleneck stage — the one with the lowest
conversion — because funnel math is multiplicative: improving that one
stage compounds through every subsequent transition. HubSpot's 2026
benchmark puts median B2B SaaS win rates at 15–25%; Gartner's 2026
report shows top-quartile teams achieving ≥25% by aggressively fixing
their weakest stage, not by adding more SQLs.

## How It Works (Methodology)

The v3 standard formula treats the funnel as a multiplicative cascade:

```
stageRate[i]    = advanced ÷ entered       // per-transition conversion
overallWinRate  = stageRate[0] × stageRate[1] × stageRate[2] × stageRate[3]
bottleneckStage = argmin(stageRate)         // 0-indexed
```

| Variable          | Meaning                                                       |
| ----------------- | ------------------------------------------------------------- |
| `SQL → Opp`       | MQL/SQL qualification to qualified opportunity                |
| `Opp → Proposal`  | Discovery to active evaluation with documented needs           |
| `Proposal → Neg`  | Pricing alignment to legal/procurement negotiation             |
| `Negotiation → Won` | Final negotiation to signed contract                        |

**Health bands** (overall win rate × 100):
- 🟢 ≥ 25% — excellent funnel (top-quartile B2B SaaS)
- 🟡 15%–25% — good (mid-market B2B SaaS typical)
- 🟠 5%–15% — warning (significant leakage at one or more stages)
- 🔴 < 5% — critical (funnel rebuild urgent)

**Assumptions.** Each stage transition is independent in the
multiplicative model — in reality they correlate (a poorly qualified
SQL loses at every downstream stage), which means the bottleneck
diagnosis is the priority lever. Stage rates are computed from raw
entered/advanced counts (unrounded intermediates) to avoid floating
point drift. Use trailing 6-month cohorts to smooth seasonality.

## Limitations & When Not To Use

Win rate by stage is built for **B2B SaaS or consultative sales with
defined stage gates**. It does not fit transactional or self-serve
funnels where stages are ill-defined. It also assumes your reps update
stage progression accurately — if "advanced to Proposal" is a clerical
checkbox rather than a meaningful qualification event, the rates will
understate the real bottleneck. The multiplicative model implies stage
independence; for high-correlation funnels (e.g. enterprise with
gate-by-gate procurement), supplement with cohort analysis. Very small
samples (<30 deals per stage) make rates noisy — combine 2–3 quarters
of data before drawing conclusions.

## Worked Example

A B2B SaaS funnel with 100 SQLs entered → 50 advanced to Opp → 30 to
Proposal → 20 to Negotiation → 15 closed-won:

1. `SQL→Opp` = 50 ÷ 100 = **50.0%**
2. `Opp→Proposal` = 30 ÷ 50 = **60.0%**
3. `Proposal→Neg` = 20 ÷ 30 = **66.7%**
4. `Negotiation→Won` = 15 ÷ 20 = **75.0%**
5. `overallWinRate` = 0.50 × 0.60 × 0.667 × 0.75 = **15%**
6. Bottleneck: **SQL→Opp at 50.0%** (lowest stage rate)
7. Health band: 🟡 Good (15–25%) — mid-market typical
8. What-if: lift SQL→Opp 50%→65% → overall jumps to 20% (+5pp); lift Negotiation→Won 75%→85% → overall 17% (+2pp)
9. Path to 🟢 (25%): lift SQL→Opp from 50% to ~83% (or equivalent lift elsewhere — top of funnel has highest ROI)

Pair with **Sales Velocity Calculator** to fix the leak first, then
optimize throughput; pair with **Pipeline Value Calculator** for
forecast accuracy.