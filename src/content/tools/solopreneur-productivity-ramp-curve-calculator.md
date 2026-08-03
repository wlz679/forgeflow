---
slug: 'solopreneur-productivity-ramp-curve-calculator'
engine_ref: 'solopreneur-productivity-ramp-curve-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Bersin by Deloitte — Talent Acquisition Research'
    url: 'https://www.bersin.com/research/talent-acquisition/'
  - name: 'Andrew Chen — The Cold Start Problem'
    url: 'https://andrewchen.co/the-cold-start-problem/'
  - name: 'Reforge — Growth Loops & Productivity Curves'
    url: 'https://www.reforge.com/blog/growth-loops'
---

## What This Calculator Measures

The productivity ramp curve (生产力 ramp 曲线) models **how productivity
grows over time** for a new hire — not just how long until first output.
The engine fits one of three canonical shapes (`SlowStart` for training-
heavy roles like Sales bootcamp or compliance cert, `Linear` for the
simplest baseline, `S-Curve` for knowledge work like engineering or PM
where the first weeks are slow while they learn but the curve accelerates
mid-period). The metric it returns is **P50 month** — the first month at
which the hire reaches 50% of full productivity — expressed as a
percentage of `months_to_full`. Lower P50% = steeper ramp = better
onboarding signal. The ramp curve pairs with Time to Productivity
(see Tool P11-2): that one measures **when**; this one measures **how
the curve looks in between**.

## How It Works (Methodology)

```
productivity(t) = startingPct + (100 − startingPct) × shape(t)

shape(t):
  Linear:      t / months_to_full
  SlowStart:   (t / months_to_full)²
  S-Curve:     1 / (1 + e^(−k(t − t0))),  k = 12 / months_to_full, t0 = months_to_full / 2
```

| Variable         | Meaning                                                       |
| ---------------- | ------------------------------------------------------------- |
| `months_to_full` | Months until the hire reaches 100% productivity (typical 3–9) |
| `starting_pct`   | Productivity at month 0 (0 for external hire, 20–40% for internal transfer) |
| `curve_shape`    | `SlowStart`, `Linear`, `S-Curve`                              |
| `monthly_cost`   | Fully-loaded monthly cost (annual fully-loaded ÷ 12)          |
| `P50Month`       | First month productivity hits 50%, found by 0.1-month scan    |

P50% bands (lower = steeper = better): 🟢 ≤30% — excellent, P50 reached
before 30% of `months_to_full` · 🟡 30–50% — healthy, typical S-Curve ·
🟠 50–70% — slow, onboarding program likely needs scope/buddy support ·
🔴 >70% — very slow, hire takes >70% of `months_to_full` just to hit
half-output. Inputs are clamped to non-negative; `months_to_full = 0`
returns the band ceiling immediately.

## Limitations & When Not To Use

This is a **single-hire** model. It does not capture cohort-onboarding
slowdowns (5+ hires at once typically shifts P50% +20pp because mentor
attention divides). It also does not capture **quality** of output —
a hire at "100% productivity" but at sub-P50 quality is still a
retention risk. Real production data (HRIS performance scores, deploy
velocity, OKR completion rate) should be used to **fit** the parameters
to your org; the defaults are reasonable starting points, not the law.
Finally, this calculator outputs a curve — not a total ramp cost. For
the dollar carry during ramp, pair with **Fully-Loaded Employee Cost
Calculator** and integrate `monthly_cost × (1 − productivity(t)/100)`
over the ramp period.

## Worked Example

Imagine a Senior Backend Engineer with `months_to_full = 6`, `starting_pct = 0`,
`curve_shape = S-Curve`, `monthly_cost = $14,833`:

1. `S-Curve` shape: `k = 12/6 = 2.0`, `t0 = 6/2 = 3`
2. Scan month-by-month: `productivity(3.0) ≈ 50%` (the logistic inflection)
3. `P50Month = 3.0`, `P50Pct = 3.0 / 6 = 50.0%` → 🟡 Good (30–50% band)
4. Compare shapes for same `months_to_full = 6`: Linear hits P50 at month 3
   (same as S-Curve here); SlowStart hits P50 at month 4.3 (slower — the
   quadratic curve puts more gain later in the period)
5. Cost projection: at month 3 the hire is ~50% productive, so over the
   full 6-month ramp the cumulative non-productive carry is roughly
   `$14,833 × 6 × (1 − ~0.45 avg productivity) = ~$48,949`

To hit 🟢 Excellent (P50 ≤30% of `months_to_full`): use a **shorter
`months_to_full`** (3–4 months is achievable for IC engineers with a
pre-onboarding code-academy week), or pre-load the curve with a
non-zero `starting_pct` (e.g. internal transfers starting at 30%).
