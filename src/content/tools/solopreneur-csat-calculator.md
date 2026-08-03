---
slug: 'solopreneur-csat-calculator'
engine_ref: 'solopreneur-csat-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'CustomerGauge — CSAT Benchmarks'
    url: 'https://www.customergauge.com/blog/csat-benchmarks'
  - name: 'Gainsight — Customer Success Benchmarks'
    url: 'https://www.gainsight.com/blog/customer-success-benchmarks/'
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'ICMI — Contact Center Performance Research'
    url: 'https://www.icmi.com/research/contact-center-performance'
---

## What This Calculator Measures

CSAT (Customer Satisfaction) is the share of customers who rate their support
interaction positively (typically 4 or 5 on a 5-point scale). This calculator
turns a single CSAT number into a **95% confidence interval** plus a target
gap, so a CS Ops manager can see whether a result is statistically real or
just sample noise — and whether the team is winning or losing against
internal targets.

## How It Works (Methodology)

The v3 standard formula we use:

```
p               = CSAT% / 100
MarginOfError   = 1.96 × √(p × (1 − p) / n) × 100
ConfidenceInt   = [CSAT% − MarginOfError, CSAT% + MarginOfError]
TargetGap       = CSAT% − InternalTarget%
```

| Variable       | Meaning                                                              |
| -------------- | -------------------------------------------------------------------- |
| `CSAT%`        | Share of "satisfied" (4–5/5) ratings in the window                   |
| `ResponseRate` | % of surveyed customers who actually rated their interaction         |
| `SampleSize`   | Total ratings collected                                              |
| `TargetCSAT`   | Internal company target for "good" CSAT                              |

Health bands (higher is better): 🟢 ≥90% · 🟡 80–90% · 🟠 70–80% · 🔴 <70%.
CustomerGauge 2024 reports a B2B SaaS median around 82%. Response rate
<20% = biased sample (only the most happy/angry respond); aim for ≥30% for
a representative signal.

## Limitations & When Not To Use

CSAT is a per-interaction metric, not a relationship metric. A high CSAT
with falling NRR means the support experience is good but the customer
outcome is not. Pair CSAT with NPS or NRR before declaring a CS program
"healthy." Also, response rate bias is fatal: a 90% CSAT from a 10% response
rate is not a real signal.

## Worked Example

The team collected 200 responses at 87% CSAT and 35% response rate, against
a 90% internal target.

1. `MarginOfError` = 1.96 × √(0.87 × 0.13 / 200) × 100 = **4.7pp**
2. `ConfidenceInt` = [87 − 4.7, 87 + 4.7] = **[82.3%, 91.7%]** at 95% confidence
3. `TargetGap` = 87 − 90 = **−3.0pp** (under target)
4. To reach 🟢 Excellent (≥90%), need **3.0pp** more — the CI already brushes
   90% so a small CS program nudge closes the gap

CSAT is the leading indicator of NRR. A drop of >5pp week-over-week is the
signal to escalate to the Head-of-CS before NRR moves.
