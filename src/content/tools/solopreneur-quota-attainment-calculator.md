---
slug: 'solopreneur-quota-attainment-calculator'
engine_ref: 'solopreneur-quota-attainment-calculator'
category_id: 'S'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'HubSpot — Sales Quota: Definition, Setting, & Tracking'
    url: 'https://blog.hubspot.com/sales/sales-quota'
  - name: 'HubSpot — Setting Sales Quotas That Motivate Reps'
    url: 'https://blog.hubspot.com/sales/setting-sales-quota'
  - name: 'Xactly — 2026 Sales Performance & Quota Attainment Benchmarks'
    url: 'https://www.xactlycorp.com/'
---

## What This Calculator Measures

Quota attainment answers the only question that matters at quarter-end
or year-end: am I on track to hit my number? It computes three
diagnostic numbers from your annual quota, months elapsed, and actual
revenue closed: attainment % (what you closed ÷ what you committed),
required monthly pace (what you must close per month for the rest of
the year), and on-track status (whether that pace is achievable). Xactly's
2026 Sales Performance Benchmark reports median B2B SaaS rep
attainment at 65–80% — meaning roughly half of all quota-carrying reps
finish below 80%. Tracking early in the year is critical because pace
compounds: missing March by $50K means May needs an extra $50K on top.

## How It Works (Methodology)

The v3 standard formula computes attainment %, expected at-pace revenue,
gap, required monthly pace, and on-track status:

```
attainmentPct    = (actualRevenue ÷ annualQuota) × 100
expectedAtPace   = annualQuota × (monthsElapsed ÷ 12)
gap              = annualQuota − actualRevenue
remainingMonths  = 12 − monthsElapsed
requiredPerMonth = gap ÷ remainingMonths
projectedYearEnd = actualRevenue + gap              // = annualQuota when remainingMonths > 0
onTrack          = projectedYearEnd ≥ annualQuota
```

| Variable             | Meaning                                                  |
| -------------------- | -------------------------------------------------------- |
| `annualQuota`        | Full-year committed revenue target                       |
| `monthsElapsed`      | 0–12, current month index in the fiscal year             |
| `actualRevenue`      | Closed-won revenue so far this year                      |
| `expectedAtPace`     | What revenue would be if you were hitting 100% by Dec    |
| `requiredPerMonth`   | What you must close each remaining month to hit quota    |

**Health bands** (attainment %):
- 🟢 ≥ 100% — excellent (quota hit or exceeded; overachieving)
- 🟡 80%–100% — good (on track to hit quota)
- 🟠 50%–80% — warning (behind expected pace, gap closable)
- 🔴 < 50% — critical (urgent catch-up; risk of missing quota)

**Assumptions.** Quota is annualized; quota period = 12 months (for
fiscal years of different length, scale accordingly). Months elapsed is
clamped to [0, 12]. The on-track flag is *achievability* — even a
mathematically on-track pace may be unrealistic if it requires 2× your
typical close rate. Pair with sales velocity diagnostics.

## Limitations & When Not To Use

Quota attainment is built for **quota-carrying sales reps and teams**
with a single annual target. It does not fit consumption-based or
usage-priced businesses (no fixed quota), nor does it handle mid-year
quota resets well (the months-elapsed denominator assumes a stable
target). It treats all revenue as equal-weight, so a 6-month mega-deal
that closes in December looks identical to 12 small monthly deals in
the pacing diagnostic — in reality, deal-size variance changes the
feasibility of the required monthly close. Use **Pipeline Coverage** to
diagnose forward-looking capacity, and **Sales Velocity** to identify
the lever (volume, size, win rate, cycle) to lift.

## Worked Example

A B2B SaaS AE with a $1,000,000 annual quota, 6 months elapsed, and
$400,000 closed-to-date:

1. `attainmentPct` = $400,000 ÷ $1,000,000 × 100 = **40%** (🔴 Critical)
2. `expectedAtPace` = $1,000,000 × (6 ÷ 12) = **$500,000** (should have closed this much)
3. `gap` = $1,000,000 − $400,000 = **$600,000** (need to close this in 6 remaining months)
4. `remainingMonths` = 12 − 6 = **6 months**
5. `requiredPerMonth` = $600,000 ÷ 6 = **$100,000/month**
6. `currentPace` = $400,000 ÷ 6 = **$67,000/month** (behind required by 33%)
7. `onTrack` = ✅ mathematically yes (hitting $100K/mo for 6 months closes the gap), but required pace is 50% above current pace
8. What-if: maintain $67K/mo → year-end $800K (80%, 🟡 Good); accelerate to $120K/mo → year-end $1.12M (112%, 🟢 Excellent)

Pair with **Pipeline Coverage Calculator** to verify you have enough
in-pipeline deals to actually hit $100K/mo for 6 months.