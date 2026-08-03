---
slug: 'solopreneur-customer-health-score-calculator'
engine_ref: 'solopreneur-customer-health-score-calculator'
category_id: 'R'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Gainsight — Customer Health Score Framework'
    url: 'https://www.gainsight.com/blog/customer-health-score/'
  - name: 'ChurnZero — Building a Customer Health Score'
    url: 'https://www.churnzero.com/customer-health-score/'
---

## What This Calculator Measures

Customer Health Score is a composite 0–100 score computed from five
weighted customer signals: product usage, NPS, support tickets, engagement,
and contract value. It is the CSM team's early-warning system — a single
number that flags an account as at-risk months before churn shows up in
NRR or renewal-rate views. The exact weighting matters: a product-led
growth motion should weight usage heavily, while an enterprise
sales-led motion should weight contract value and engagement. This
calculator exposes four weight presets (Balanced, Product-led,
Service-led, Sales-led) so you can tune the model to your GTM without
re-engineering the math every quarter.

## How It Works (Methodology)

The v3 standard formula we use:

```
Score (0–100) = Σ normalize(signal[i]) × weight[i],   i ∈ {1..5}

Signals           Normalization function              Mapping
────────────────  ───────────────────────────────────  ────────────────────
productUsage      identity                            0–100 (input as-is)
nps               (value + 100) ÷ 2                   -100..+100 → 0..100
supportTickets    100 − min(value × 4, 100)           0..∞ → 100..0 (inverted)
engagement        identity                            0–100 (input as-is)
contractValue     identity                            0–100 (input as-is)
```

| Preset        | Usage | NPS | Support | Engagement | Contract |
| ------------- | ----- | --- | ------- | ---------- | -------- |
| Balanced      | 20%   | 20% | 20%     | 20%        | 20%      |
| Product-led   | 50%   | 15% | 10%     | 15%        | 10%      |
| Service-led   | 10%   | 20% | 35%     | 25%        | 10%      |
| Sales-led     | 15%   | 25% | 10%     | 10%        | 40%      |

Score is clamped via each input's domain (productUsage 0–100, nps ±100,
supportTickets ≥ 0, engagement/contractValue 0–100). Health bands:
🟢 ≥80 (expand motion), 🟡 60–80 (monitor), 🟠 40–60 (at-risk — save play),
🔴 <40 (emergency).

## Limitations & When Not To Use

The score is only as good as the **inputs you can actually measure**. If
your product doesn't expose usage telemetry or your CS team doesn't track
NPS, several signals default to zero and the composite collapses. The
metric also depends on **preset choice** — flipping Product-led to
Service-led on the same account can swing the score by 10–15 points, so
make sure every review-team member agrees on the preset before score
deltas are used as a save-play trigger. Finally, health scores are a
**point-in-time** snapshot; pair with a 30-day trend (was usage flat or
falling?) before pulling the save trigger — a high score that's sliding
down is a worse signal than a low score that's steady.

## Worked Example

A mid-market SaaS CSM evaluates an enterprise account with these signals:
product usage 75, NPS +40, 5 support tickets in last 90 days, engagement
80, contract value 60, on the **Balanced** preset. Walk through:

1. Normalize: usage 75.0, NPS (40+100)/2 = 70.0, support 100−min(20,100) = 80.0, engagement 80.0, contract 60.0
2. Apply weights (20% each): 75.0×0.20 + 70.0×0.20 + 80.0×0.20 + 80.0×0.20 + 60.0×0.20
3. `Score` = 15.0 + 14.0 + 16.0 + 16.0 + 12.0 = **73.0** → 🟡 Good band

Pair with **NRR Calculator** for the dollar view of retention, and with
**Renewal Rate Calculator** to align save-play resource against the
renewal calendar.
