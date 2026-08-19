---
slug: 'solopreneur-cohort-retention-calculator'
engine_ref: 'solopreneur-cohort-retention-calculator'
category_id: 'M'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ProfitWell — Cohort Analysis'
    url: 'https://www.profitwell.com/blog/cohort-analysis'
  - name: 'Amplitude — Cohort Analysis Guide'
    url: 'https://amplitude.com/blog/cohort-analysis'
  - name: 'Help Scout — Customer Retention Rate'
    url: 'https://www.helpscout.com/blog/customer-retention-rate'
  - name: 'Mixpanel — Cohort Analysis'
    url: 'https://mixpanel.com/blog/cohort-analysis/'
---

## What This Calculator Measures

Cohort Retention Calculator takes the canonical 5-point monthly retention
curve (M1 / M2 / M3 / M6 / M12) and projects a 12-month cumulative LTV
per user. It identifies the **biggest drop month** (the point of steepest
churn) and the M6 health band (the cohort-analysis metric investors
look at first). It also computes CAC payback months when you pair it
with an acquisition cost figure. Use it whenever you need to forecast
revenue from a subscriber base, model a SaaS pricing change, or build
the case for retention investment vs. acquisition spend.

## How It Works (Methodology)

Inputs: `cohortSize` + retention at M1/M2/M3/M6/M12 (in %) + monthly
revenue per active user.

```
Retention(t) = linear interpolation between known months
            = R(m_lower) + (R(m_higher) - R(m_lower)) × (t - m_lower)
                                                       / (m_higher - m_lower)
Cumulative LTV  = Σ (Retention(m) × RevPerUser) for m = 1..12
M6 Health Band  = 🟢 ≥ 90% · 🟡 70–90% · 🟠 50–70% · 🔴 < 50%
CAC Payback (mo) = CAC / (Retention(M1) × RevPerUser)   (approximate)
```

| Variable           | Meaning                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `cohortSize`       | New customers acquired in the measurement period (e.g. 1,000)       |
| `M1..M12Retention` | % of cohort still active at month 1, 2, 3, 6, 12                     |
| `RevPerUser`       | Average monthly revenue per **active** user (not per original cohort) |

Months 4, 5, 7, 8, 9, 10, 11 are filled by linear interpolation between
adjacent known months. The engine surfaces the **biggest drop month**
as the steepest absolute change between consecutive known months.

Source for these benchmarks: Mixpanel's cohort analysis documentation (industry retention curves and decay models), Amplitude's cohort retention methodology guide, and the Recurly Subscription Metrics Benchmark Report 2024 (cohort retention curves by vertical).

## Limitations & When Not To Use

Linear interpolation between known months is a deliberate simplification.
If your real retention curve has a known "smile" pattern (slight uptick
at month 6 from re-engagement emails), the interpolated M4–M5 will
understate retention. The calculator is also single-cohort — if you run
multiple pricing tiers with very different retention shapes, average
across them and you'll smooth away the tier signal. For multi-cohort
analysis, export to Amplitude / Mixpanel / a Looker cohort view.

## Assumptions

- Cohort retention is measured as the share of users from a given acquisition cohort who are still active at month N — does not control for cohort size or seasonality.
- Decay model assumes a fixed retention curve shape (linear or exponential); for cohorts with step-function churn (e.g. annual contracts), prefer curve-fitting with retention heatmap data.
- Time window defaults to 12 months; for shorter product cycles (e.g. consumer apps), use 90-day or 30-day cohort windows.

## Common Mistakes

- Reporting average retention across cohorts vs curve-based retention — average masks the actual shape (e.g. steep early drop then plateau); always report the curve, not a single number.
- Mixing voluntary and involuntary churn — voluntary (cancellation) is a product/marketing signal; involuntary (payment failure) is a billing signal; report separately.
- Ignoring cohort size — small cohorts (n<50) have noisy retention curves; report confidence intervals or hide small-cohort data from dashboards.

## Worked Example

Imagine a B2B SaaS with 1,000 new signups in January. Retention curve:
M1 80%, M2 60%, M3 45%, M6 30%, M12 20%. ARPU = $30/month.

1. `Retention(1)` = 80%, `(2)` = 60%, `(3)` = 45%
2. Interpolated: M4 ≈ 40%, M5 ≈ 35%, M6 = 30%, M7–M11 ≈ 25%, M12 = 20%
3. `Cumulative LTV` = $30 × (0.80 + 0.60 + 0.45 + 0.40 + 0.35 + 0.30
   + 0.28 + 0.26 + 0.24 + 0.22 + 0.21 + 0.20) ≈ $30 × 4.31 = **$129.30**
4. **Biggest drop month** = M1 → M2 (80% → 60% = −20 pp)
5. **M6 health band** = 30% → 🔴 critical (would need a 60-point jump to
   reach the 🟢 band)

The Dashboard's What-If will model: "If M3 retention lifts 45% → 60%
(+15 pp), cumulative 12-month LTV climbs ~$45/user — across 1,000
cohort members that's $45,000 of incremental revenue on the same
acquisition spend." Pair with the **NRR / GRR** calculators to confirm
the lift comes from genuine retention, not expansion revenue.
