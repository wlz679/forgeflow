---
slug: 'solopreneur-attrition-cost-calculator'
engine_ref: 'solopreneur-attrition-cost-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'SHRM — 2022 Human Capital Benchmarking Report'
    url: 'https://www.shrm.org/topics-tools/research/2022-human-capital-benchmarking-report'
  - name: 'Gallup — State of the Global Workplace 2024'
    url: 'https://www.gallup.com/workplace/349484/state-of-the-global-workplace.aspx'
  - name: 'Pave — Compensation Benchmarks 2024'
    url: 'https://www.pave.com/compensation-benchmarks'
---

## What This Calculator Measures

Attrition cost (离职成本) is the **fully-loaded cost** of losing a single
employee — every dollar that the company spends, or fails to capture,
because the person left. It bundles three components: **recruiting**
(external recruiter fees, job board, interview time, signing bonus),
**ramp** (the new hire's weeks at half-productivity while the team is
short-handed), and **lost productivity** (the team and the leaver's
network producing less during the transition window). The result is
expressed both as a dollar total and a percentage of annual salary —
the latter is what SHRM uses to anchor the "1.5x–2x annual salary"
folk-heuristic, and what flags every leaver for retention review.

## How It Works (Methodology)

```
recruitingCost       = recruiting_cost
rampCost             = (annual_salary / 52) × ramp_weeks × 0.5
lostProductivityCost = (annual_salary / 12) × lost_productivity_months × roleMultiplier

roleMultiplier = 1.0 (IC) | 1.5 (Manager)

totalCost       = recruiting + ramp + lost_productivity
pctOfSalary     = totalCost / annual_salary × 100
```

| Variable                   | Meaning                                                       |
| -------------------------- | ------------------------------------------------------------- |
| `annual_salary`            | Annual base salary of the role                                |
| `recruiting_cost`          | Recruiter fees + job board + interview time + signing bonus   |
| `ramp_weeks`               | Weeks for the new hire to reach productivity (backfill)       |
| `lost_productivity_months` | Months of team stabilization (typically 3–9)                  |
| `role_level`               | `IC` or `Manager` (Manager multiplier 1.5x)                   |
| `pctOfSalary`              | totalCost as % of annual salary (SHRM anchor metric)         |

Bands (lower % = better retention practices): 🟢 Excellent ≤50% — lean
attrition cost, strong retention or friction-free backfill · 🟡 Good
50–100% — typical SHRM range, flag anyone >1.5x salary · 🟠 Warning
100–200% — flight risk concentrated in critical roles, investigate
manager tenure · 🔴 Critical >200% — every leaver is a major business
event. `annual_salary = 0` returns 0% (zero-division guard); all inputs
clamped non-negative.

## Limitations & When Not To Use

This treats attrition as a **single transition event** — it does not
model the cascading effects of a leaver's network leaving within
6 months (which SHRM 2022 cites as 25–35% of leavers trigger ≥1
additional departure). Voluntary and involuntary attrition are
**not** separated: involuntary typically has lower ramp_cost (faster
decision to backfill) but higher recruiting_cost (reputation damage
+ severance — lump severance in `recruiting_cost` per common practice).
The 50% productivity assumption during ramp is a flat average — for
more granular modeling, fit a curve with **Productivity Ramp Curve
Calculator** and integrate over the ramp period. The Manager 1.5×
multiplier is empirical (SHRM 2022) and averages over a wide range —
a VP-level departure may be 2.5×; an exit ramp for a known-weak
manager may be closer to 1.0×.

## Worked Example

Imagine an IC Backend Engineer at $120K base leaves — `annual_salary = 120,000`,
`recruiting_cost = 8,000`, `ramp_weeks = 12`, `lost_productivity_months = 6`,
`role_level = IC`:

1. `recruitingCost` = **$8,000**
2. `rampCost` = (120,000 / 52) × 12 × 0.5 = $13,846
3. `lostProductivityCost` = (120,000 / 12) × 6 × 1.0 = **$60,000**
4. `totalCost` = $8,000 + $13,846 + $60,000 = **$81,846**
5. `pctOfSalary` = 81,846 / 120,000 × 100 = **68.2%** → 🟡 Good (within SHRM range)

If the same role is filled at Manager level: `roleMultiplier` = 1.5 →
`lostProductivityCost` = 120,000 / 12 × 6 × 1.5 = **$90,000** →
`totalCost` = $111,846 → **93.2%** → still 🟡 Good but right at the
threshold. The 40% jump from 68.2% to 93.2% is the **Manager tax** —
a real budget line for backfilling management roles. To hit 🟢 Excellent
(≤50%), need `lost_productivity_months ≤ 4` (cuts $20K from
lost_productivity) **OR** cut recruiting + ramp costs proportionally
(e.g. negotiate $5K in-house instead of $8K agency — saves 2.5pp).
Pair with **Fully-Loaded Employee Cost Calculator** to factor the
backfill hire's ongoing overhead into the carry analysis, and with
**Equity Refresh Calculator** to model retention-intervention ROI.
