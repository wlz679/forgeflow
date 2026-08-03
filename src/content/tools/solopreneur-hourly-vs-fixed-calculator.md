---
slug: 'solopreneur-hourly-vs-fixed-calculator'
engine_ref: 'solopreneur-hourly-vs-fixed-calculator'
category_id: 'D'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Glassdoor — Freelance Compensation Benchmarks'
    url: 'https://www.glassdoor.com/research/'
  - name: 'Upwork — Freelance Pricing & Billable Hours Reports'
    url: 'https://www.upwork.com/research/'
  - name: 'Bonsai — Freelancer Pricing Survey (Hourly vs Fixed)'
    url: 'https://www.hellobonsai.com/blog/'
---

## What This Calculator Measures

The single biggest pricing question independent professionals face is
**hourly vs fixed-fee** — bill by the hour and you get paid for every
minute, but your income is capped by clock time; charge fixed-price and
your efficiency becomes your upside, but scope creep can sink the
project. This calculator solves for the hourly rate, daily rate, weekly
rate, monthly retainer, and per-project fee all required to hit the same
annual income goal, then compares hourly and fixed-fee revenue at your
realistic billable utilization. It is built for designers, developers,
copywriters, consultants, and any freelancer pricing recurring work or
multi-week client engagements.

## How It Works (Methodology)

The required-rate model used by pricing coaches and the Bonsai /
Freshbooks pricing surveys:

```
WorkingWeeks         = 52 − WeeksOffPerYear
AnnualBillableHours  = BillableHoursPerWeek × WorkingWeeks
NetAnnualTarget      = AnnualIncomeGoal + AnnualExpenses
RequiredHourly       = NetAnnualTarget ÷ AnnualBillableHours
RequiredDaily        = RequiredHourly × 8
RequiredWeekly       = RequiredHourly × BillableHoursPerWeek
MonthlyRetainer      = NetAnnualTarget ÷ 12
FixedProject4W       = NetAnnualTarget ÷ (WorkingWeeks ÷ 4)
Utilization          = min(100, round(BillableHoursPerWeek ÷ 40 × 100))
```

| Variable             | Meaning                                                      |
| -------------------- | ------------------------------------------------------------ |
| `AnnualIncomeGoal`   | Take-home income you want from freelancing                   |
| `BillableHoursPerWeek`| Realistic billable hours/week (industry 20-30)              |
| `WeeksOffPerYear`    | Vacation, holidays, sick days, training weeks                |
| `AnnualExpenses`     | Software, insurance, equipment, taxes                        |
| `Utilization`        | Billable hours as a % of a 40-hour workweek                  |
| `FixedProject4W`     | What to charge for a 4-week project at your hourly rate      |

**Assumptions.** `AnnualExpenses` does not include self-employment tax
(US 15.3%) — multiply the take-home goal by 1.3 to get a gross-revenue
target that covers taxes and benefits. The fixed-project calculation
assumes the same number of hours as the hourly model would bill — i.e.,
fixed fee does not reward or punish efficiency, it just transfers
risk. The income ladder ($30K, $60K, $100K, $150K, $200K, $300K)
assumes the same expense and utilization inputs.

## Limitations & When Not To Use

This calculator assumes a **single-pricing-model freelance business**.
If you blend hourly retainers, fixed-fee projects, and productized
services, model each revenue stream separately and sum them. The
hourly-vs-fixed comparison section assumes the project scope is
identical under both models — in reality, fixed-fee projects often
attract looser scope and require scope-change orders to protect margin.
The utilization metric is computed against a 40-hour workweek, but
freelancers commonly work 50-60 hours when billable + non-billable are
combined. **Seasonality** is not modeled: most freelancers see 20-40%
of revenue concentrated in 3 months (Q4 holiday projects, end-of-year
budget spend, January planning).

## Worked Example

A full-time freelancer targets $100,000 annual income, has $5,000 in
business expenses, bills 30 hours/week, and takes 4 weeks off per year
(48 working weeks):

1. `AnnualBillableHours` = 30 × 48 = **1,440 hrs/yr**
2. `NetAnnualTarget` = $100,000 + $5,000 = **$105,000**
3. `RequiredHourly` = $105,000 ÷ 1,440 = **$72.92/hr**
4. `RequiredDaily` = $72.92 × 8 = **$583/day**
5. `RequiredWeekly` = $72.92 × 30 = **$2,188/wk**
6. `MonthlyRetainer` = $105,000 ÷ 12 = **$8,750/mo**
7. `FixedProject4W` = $105,000 ÷ (48 ÷ 4) = **$8,750/project**
8. `Utilization` = 30 ÷ 40 = **75%** — sustainable without burnout

At this rate, a 4-week project billed hourly yields $72.92 × 120 hrs =
$8,750 — the same as the fixed-fee project, so the model is roughly
break-even and pricing choice should be driven by client preference and
scope clarity. The income ladder shows the same inputs at $30K (need
$24.31/hr), $60K ($45.14/hr), and $300K ($211.81/hr). To earn the
classic **$45/hr × 25 billable hr/week × 48 weeks = $54,000/yr gross**
starting point, this calculator shows you need to bill 25 hrs/week at
that rate, taking the rest of the 48-week year as non-billable
(proposals, admin, learning). Pair this with the **Project
Profitability Calculator** to validate that any specific fixed-fee
project you take actually delivers above break-even.