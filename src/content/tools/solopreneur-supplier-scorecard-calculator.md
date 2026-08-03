---
slug: 'solopreneur-supplier-scorecard-calculator'
engine_ref: 'solopreneur-supplier-scorecard-calculator'
category_id: 'O'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Scoreboard — Supplier Scorecard Templates & Methodology'
    url: 'https://www.scoreboard.com/supplier-scorecard/'
  - name: 'Smartsheet — Supplier Performance Scorecard Guide'
    url: 'https://www.smartsheet.com/supplier-scorecard'
  - name: 'ISO 9001 / ISO 28000 — Supplier Evaluation & Quality Standards'
    url: 'https://www.iso.org/standard/62085.html'
---

## What This Calculator Measures

A supplier scorecard collapses four messy, hard-to-compare supplier KPIs
into one weighted score and a letter grade (A/B/C/D). It's the operator's
answer to "should I keep this vendor, dual-source, or replace?" — built
on the SCOR model's "Source" pillar and the same four dimensions ISO
9001 procurement audits look at: **on-time delivery, defect rate, lead
time variance, cost variance**. The composite lets you rank 10 suppliers
side by side without comparing apples and oranges.

## How It Works (Methodology)

The v3 standard formula we use:

```
OnTimeScore   = clamp(OnTimePct,                       0, 100)
DefectScore   = clamp(100 − DefectRatePct × 10,        0, 100)
LeadScore     = clamp(100 − LeadVarianceDays × 5,      0, 100)
CostScore     = clamp(100 − |CostVariancePct| × 2,    0, 100)

Composite     = Σ (SubScore_i × WeightPreset_i)
Grade         = A (≥90) · B (80–90) · C (70–80) · D (<70)
```

| Variable             | Meaning                                                                                |
| -------------------- | -------------------------------------------------------------------------------------- |
| `OnTimePct`          | % of orders delivered by the promised date.                                            |
| `DefectRatePct`      | % of orders with defects or returns (1% = 10-pt deduction).                            |
| `LeadVarianceDays`   | Std dev of actual lead time around the quoted (1 day = 5-pt deduction).                 |
| `CostVariancePct`    | % deviation of actual cost from quote (1% = 2-pt deduction).                           |
| `WeightPreset`       | `balanced` (40/30/15/15) · `quality` (25/50/15/10) · `speed` (50/20/25/5) · `cost` (20/20/10/50). |

Health bands mirror the grade thresholds: 🟢 ≥ 90 (A) · 🟡 80–90 (B) · 🟠
70–80 (C) · 🔴 < 70 (D). The four sub-scoring formulas match the
de-facto industry convention from the SCOR metrics and ISO 9001 §8.4
procurement clauses.

## Limitations & When Not To Use

The four-input model assumes you can measure each dimension. **Small
operators without purchase-order tracking** (typically < 50 POs/year
with a supplier) lack the sample size to compute meaningful variance —
use a 12-month rolling window or skip the scorecard for low-volume
suppliers. The composite is also unidimensional; **a high cost variance
from a strategic supplier may be worth tolerating** if on-time is perfect
and the alternative would be slower. Pair the score with qualitative notes
for true replacement decisions.

## Worked Example

A DTC brand audits a key supplier: 88% on-time, 2.5% defect rate,
3-day lead std dev, 5% cost variance, balanced weights:

1. `OnTimeScore` = min(100, 88) = **88**
2. `DefectScore` = clamp(100 − 2.5 × 10) = **75**
3. `LeadScore` = clamp(100 − 3 × 5) = **85**
4. `CostScore` = clamp(100 − |5| × 2) = **90**
5. `Composite` = 88 × 0.40 + 75 × 0.30 + 85 × 0.15 + 90 × 0.15
   = 35.2 + 22.5 + 12.75 + 13.5 = **84.0** → Grade **B** → 🟡 monitor.
6. What-If: defect rate drops to 0.5% → DefectScore jumps to 95, composite
   rises to 90.0 → Grade **A**. **+6 composite points** often enough to
   justify a 6-month longer-term contract.
