---
slug: 'solopreneur-freelance-rate-calculator'
engine_ref: 'solopreneur-freelance-rate-calculator'
category_id: 'D'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Glassdoor — Freelance & Self-Employed Compensation Data'
    url: 'https://www.glassdoor.com/research/'
  - name: 'Upwork — Freelance Rate Insights & Skills Pricing'
    url: 'https://www.upwork.com/research/'
  - name: 'Contena — Freelance Rate Reports by Discipline'
    url: 'https://contena.com/'
---

## What This Calculator Measures

Your hourly rate is the single number that determines whether freelancing
is a side project or a business. This calculator solves for the **hourly
rate you need to charge** to hit a target annual net income after
business expenses and profit margin are factored in, then layers on the
four multipliers the market uses to anchor pricing — junior, mid, senior,
and expert — and shows where your rate sits relative to each tier. It is
built for designers, developers, writers, marketers, consultants, and
any independent professional who bills by the hour or wants to know what
they *should* bill.

## How It Works (Methodology)

The rate inversion used by freelance-business coaches and rate calculators:

```
NetIncome   = AnnualIncome − AnnualExpenses
BaseRate    = (NetIncome + DesiredProfit) ÷ BillableHoursPerYear
SkilledRate = BaseRate × 1.25
PremiumRate = BaseRate × 1.50
ExpertRate  = BaseRate × 2.00
DailyRate   = HourlyRate × 8
MonthlyRate = DailyRate × 5 × 4.33
YearlyRate  = MonthlyRate × 12
BreakEvenRate = AnnualExpenses ÷ BillableHoursPerYear
```

| Variable              | Meaning                                                      |
| --------------------- | ------------------------------------------------------------ |
| `AnnualIncome`        | Target net income you want to keep after expenses            |
| `AnnualExpenses`      | Software, equipment, insurance, coworking, taxes             |
| `BillableHoursPerYear`| Hours clients pay for (industry realistic: 900-1,400)        |
| `DesiredProfit`       | Margin above net income (15-30% is healthy solopreneur zone) |
| `BaseRate`            | Your required hourly rate to hit the goal                    |

**Assumptions.** `BillableHoursPerYear` is treated as a hard ceiling —
the model assumes non-billable time (admin, marketing, learning,
proposals) happens outside this number. Real-world freelancing bills
20-30 hours/week; the calculator takes whatever number you give it but
flags below-900 or above-1,400 utilization in the **Market Position**
section. The four multipliers (1x, 1.25x, 1.5x, 2x) are anchored to
the Contena / Glassdoor rate-ladder convention, not to your specific
discipline — designers and copywriters at the same skill level earn
similar premiums.

## Limitations & When Not To Use

This calculator is anchored to **hourly billing**. If you charge
fixed-price per project, value-based pricing (e.g., 10-20% of client
ROI), or retainers, the rate you charge per hour is a derived number,
not the primary contract term — use the **Project Profitability
Calculator** to model fixed-price projects and the **Hourly vs Fixed
Calculator** to compare. The expense line does not model self-employment
tax (US: ~15.3%), health insurance, or retirement contributions; if you
want $80K take-home, target $80K × 1.3 = $104K gross in your hourly
rate math. International freelancers should adjust `AnnualExpenses` to
local equivalents (VAT, national insurance, mandatory benefits) before
running the model.

## Worked Example

A freelance designer in year 4 wants $80,000 net annual income, runs
$10,000 of business expenses (software, equipment, coworking), targets
$20,000 of profit, and realistically bills 1,200 hours per year (24
hours/week × 50 weeks):

1. `NetIncome` = $80,000 − $10,000 = **$70,000**
2. `BaseRate` = ($70,000 + $20,000) ÷ 1,200 = **$75/hr**
3. `DailyRate` = $75 × 8 = **$600/day**
4. `MonthlyRate` = $600 × 5 × 4.33 = **$12,990/mo**
5. `SkilledRate` = $75 × 1.25 = **$94/hr** (proven track record premium)
6. `ExpertRate` = $75 × 2.0 = **$150/hr** (top-tier authority)
7. `BreakEvenRate` = $10,000 ÷ 1,200 = **$8.33/hr** — anything above covers expenses

A **classic example** for comparison: $45/hr × 25 billable hr/week × 48
weeks = **$54,000/yr gross** — a healthy starting point for a mid-level
freelancer. The calculator's **What-If Scenarios** shows that raising
the rate 20% to $90/hr pushes gross to $108,000/yr at the same
utilization, and moving to expert tier (2x) at $150/hr unlocks
$180,000/yr. Pair this with the **Project Profitability Calculator** to
sanity-check that any fixed-fee project you take actually beats this
break-even rate per hour.