---
slug: 'solopreneur-deflection-quality-calculator'
engine_ref: 'solopreneur-deflection-quality-calculator'
category_id: 'K'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'TSIA — Knowledge-Centered Service 2024'
    url: 'https://www.tsia.com/blog/knowledge-centered-service'
  - name: 'NN/g — Help and Documentation Usability'
    url: 'https://www.nngroup.com/articles/help-and-documentation/'
  - name: 'Intercom — Help Center Best Practices'
    url: 'https://www.intercom.com/help/articles/what-is-help-center-best-practices'
---

## What This Calculator Measures

Deflection Quality measures the percentage of self-service-deflected tickets
that customers reopen within 30 days — the strongest proxy for content
quality. Volume metrics like "we deflected 1,750 tickets" feel like a win,
but if 25% of those customers come back to file the same question again,
the deflection was a false economy; the customer is more frustrated than if
they had talked to an agent the first time. TSIA 2024 reports mature KBs
run 8-15% reopen; anything above 25% means the content is technically
present but answers the wrong question — the silent failure mode that
deflection-rate dashboards are uniquely bad at surfacing.

## How It Works (Methodology)

```
reopen     = tickets_reopened_30d / tickets_deflected_30d
quality    = 100% − reopen
gap        = target_quality_pct − quality
```

| Variable                  | Meaning                                                    |
| ------------------------- | ---------------------------------------------------------- |
| `tickets_deflected_30d`   | Self-service-closed tickets in the last 30 days            |
| `tickets_reopened_30d`    | Customers who replied within 30 days of self-service close |
| `target_quality_pct`      | Internal goal (e.g. 90%) — informational                   |
| `deflection_source`       | KB / Chatbot / Both — informational triage hint            |

Health bands (INVERSE — LOWER reopen = better): 🟢 ≤8% Excellent · 🟡 8-15%
Good · 🟠 15-25% Warning · 🔴 >25% Critical. Note the inverted direction:
this is the only "lower is better" band in the K category. Chatbot
deflection typically reopens 2-3x higher than KB (chatbots answer narrowly
and miss nuance), so the source selector helps triage.

## Limitations & When Not To Use

A 30-day reopen window is a heuristic — some real-world reopens arrive at
60-90 days, especially for billing or contract questions. If your helpdesk
lets you extend the window, do so and recalibrate; the band thresholds will
shift slightly upward. Deflection quality also depends on **what counts as
a reopen**: if a customer simply replies with "thanks!" the ticket might
stay closed; if they reply with a related but new question, classification
differs by helpdesk. Calibrate against a 100-ticket manual sample before
treating the metric as ground truth. Chatbot reopens have a different
causal chain from KB reopens — chatbot reopens are usually intent-matching
gaps, KB reopens are usually content gaps.

## Worked Example

Imagine a mid-market B2B SaaS that deflected 1,750 tickets via self-service
in 30 days, of which 210 reopened, with a 90% internal quality target:

1. `reopen` = 210 / 1,750 = **12.0%** → 🟡 **Good** band
2. `quality` = 100% − 12.0% = **88.0%** · `gap` = 90 − 88 = **+2.0pp**
3. To reach 🟢 Excellent (≤8% reopen), need **70 fewer reopens/month**
4. At a 10-articles-per-refresh-cycle audit cadence, that is refreshing
   ~**7 top-reopen articles** per cycle
5. Chatbot reopens (if source=Both) typically run 2-3x higher than KB
   reopens — triage the source-specific reopen share first

Pair with **Article Freshness** (K-2): rising reopen rates are almost
always stale-article hotspots first. Run both in the same weekly review.
