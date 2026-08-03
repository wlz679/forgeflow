---
slug: 'solopreneur-stickiness-calculator'
engine_ref: 'solopreneur-stickiness-calculator'
category_id: 'P'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: "Mixpanel — 2024 Product Benchmarks Report"
    url: 'https://mixpanel.com/blog/2024-product-benchmarks/'
  - name: "Lenny's Newsletter — DAU/MAU Stickiness"
    url: 'https://www.lennysnewsletter.com/p/dau-mau-stickiness'
  - name: 'Amplitude — How to Calculate Stickiness'
    url: 'https://amplitude.com/blog/calculate-stickiness'
---

## What This Calculator Measures

Stickiness (DAU/MAU) measures the fraction of your monthly-active users
who come back on a given day — answering the PM question *"is this
product something users open habitually, or only when they remember
it exists?"* It is the leading indicator of churn: if MAU users
stop returning daily, monthly retention will drop in 2–4 weeks. The
ratio also reveals product-market-fit depth: social apps (Slack,
Discord) sustain 20%+; high-engagement B2B SaaS sustains 13–20%;
median SaaS sits around 5%.

## How It Works (Methodology)

The v3 standard formula:

```
Stickiness = DAU / MAU
DaysPerWeek = Stickiness × 7
```

| Variable     | Meaning                                                                            |
| ------------ | ---------------------------------------------------------------------------------- |
| `DAU`        | Distinct users active today (or 7-day average for stability)                       |
| `MAU`        | Distinct users active in the last 30 days                                          |
| `DaysPerWeek`| Approximate number of days/week each MAU user uses the product (Stickiness × 7)   |

Health bands (community benchmarks): green ≥20% (social-app tier,
world-class) · yellow 13–20% (high-engagement SaaS) · orange 5–13%
(SaaS median, churn-risk signal) · red <5% (very low engagement).
Multiplied by 7, a 13% stickiness equals ~0.9 days/week — meaning
the typical user opens the product about once a week, not daily.

## Limitations & When Not To Use

DAU/MAU is sensitive to **how you define "active"** — events counted
(sessions, page views, key actions) move the ratio without the
product changing. For B2B products with multi-seat accounts, decide
whether DAU is per-user or per-account with-any-activity (the two
definitions diverge significantly). DAU is also a moving target:
pulling DAU on a Monday vs Sunday gives different answers; use a
7-day rolling average for stable comparisons. Stickiness below 5%
does not always mean a bad product — some perfectly successful B2B
SaaS (project management, accounting) is intrinsically weekly not
daily, in which case WAU/MAU or session-quality measures fit better.

## Worked Example

A B2B SaaS analytics platform pulls today's DAU: 650 unique users.
Their 30-day MAU is 5,000 unique users.

1. `Stickiness` = 650 / 5,000 = **13.0%** (yellow band — at the Good threshold).
2. `DaysPerWeek` = 0.13 × 7 ≈ **0.9 days/week** — the typical user opens the product about once weekly, not daily.
3. What-If: launching a daily digest email that drives +5% of non-daily MAU back to daily (roughly 217 additional DAU) lifts stickiness to 17.3% (~1.2 days/week), solidly in the Good band.
4. Break-Even: 13% is exactly at the threshold; pushing to Good (13%+) requires at minimum 650 DAU. The next milestone target is Excellent (20%), which would need 1,000 DAU out of 5,000 MAU.
5. Milestone: stickiness rarely shifts without improving core-loop frequency or onboarding. Pair with the **GRR Calculator** (R category) to confirm the stickiness-retention relationship, and the **Time-to-Value Calculator** (P category) to speed up first-session-to-first-value.
