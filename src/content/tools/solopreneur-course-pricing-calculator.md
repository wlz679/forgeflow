---
slug: 'solopreneur-course-pricing-calculator'
engine_ref: 'solopreneur-course-pricing-calculator'
category_id: 'D'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Teachable — Course Pricing & Platform Fee Benchmarks'
    url: 'https://teachable.com/'
  - name: 'Gumroad — Creator Pricing & Platform Fee Structure'
    url: 'https://gumroad.com/'
  - name: 'ConvertKit — Creator Income & Course Creator Reports'
    url: 'https://convertkit.com/'
---

## What This Calculator Measures

Course pricing is the single highest-leverage decision a course creator
makes — a $50 difference on a 50-buyer month is $30,000 of annual
revenue, and most creators underprice on launch and never recover. This
calculator solves for the **optimal price point** that hits your target
monthly income after the platform takes its cut, plus a creator-economics
view (**$/hour of creation effort**), gross margin after platform fees,
and a self-study vs cohort break-even. It is built for solo creators
selling on Teachable, Podia, Gumroad, Thinkific, Kajabi, or self-hosted
WordPress + Stripe, not for creators running paid ads at scale.

## How It Works (Methodology)

The optimal-price inversion used by pricing strategists:

```
FeeMultiplier     = 1 ÷ (1 − PlatformFee ÷ 100)
BreakevenPrice    = TargetMonthlyIncome ÷ BuyersPerMonth
OptimalPrice      = BreakevenPrice × FeeMultiplier
GrossRevenue      = OptimalPrice × BuyersPerMonth
PlatformTake      = GrossRevenue × (PlatformFee ÷ 100)
NetRevenue        = GrossRevenue − PlatformTake
DollarPerHourEffort = (NetRevenue × 12) ÷ (EffortHours × 12)
LTV               = OptimalPrice × 1.5   // 50% upsell take rate
CohortPremium     = OptimalPrice × 3.5   // cohort commands 3.5x self-study
```

| Variable               | Meaning                                                      |
| ---------------------- | ------------------------------------------------------------ |
| `TargetMonthlyIncome`  | Net dollars you want to take home each month                 |
| `BuyersPerMonth`       | Realistic monthly sales at launch → sustained run rate      |
| `PlatformFee`          | % the platform keeps (Teachable 5%, Gumroad 10%, Udemy 3-63%) |
| `EffortHours`          | Total creator hours to produce the course once (40 baseline) |
| `FeeMultiplier`        | Inverts the platform cut so you can recover the target net   |

**Assumptions.** The model assumes buyers are spread evenly across the
month — a single launch week can concentrate 50-70% of annual revenue
into 7-14 days. Platform fees are flat; payment processors (Stripe 2.9%
+ $0.30) are not added on top. The 1.5x LTV multiplier assumes a 50%
take rate on a downstream upsell (cohort, coaching, template pack); if
your upsell converts worse than 30%, lower the multiplier manually.

## Limitations & When Not To Use

This calculator models a **single course in steady state**. If you sell
multiple courses, a membership, or a bundle, model each tier separately
and sum the projected revenue. Launch pricing distortions (early-bird
discounts, cohort bonuses, deadline timers) are not modeled — the
**Launch Revenue** section assumes a 30% launch discount on average.
The $/hour-of-effort metric treats all creation hours as equal, but the
first 20 hours (research, outline, voice-over script) and the last 20
hours (production polish) have very different value — use the metric as
a directional anchor, not a time-tracking input. Currency is fixed at
USD; international creators should convert target income to USD before
inputting.

## Worked Example

A creator wants $5,000/month from a new self-study course, expects 50
buyers/month sustained (2,500-subscriber email list at 2% conversion),
and is selling on Teachable with the platform taking 10%:

1. `BreakevenPrice` = $5,000 ÷ 50 = **$100/student**
2. `FeeMultiplier` = 1 ÷ (1 − 0.10) = **1.111**
3. `OptimalPrice` = $100 × 1.111 = **$111.11/student**
4. `GrossRevenue` = $111.11 × 50 = **$5,556/mo**
5. `PlatformTake` = $5,556 × 10% = **$556/mo**
6. `NetRevenue` = $5,556 − $556 = **$5,000/mo** = **$60,000/yr**
7. `DollarPerHourEffort` = ($60,000) ÷ (40 × 12) = **$125/hr of creation**

The calculator's pricing ladder then shows your revenue at $29, $49,
$97, $147, $197, $297, $497, $697, and $997 — at $297 the same 50-buyer
month nets $13,365/month, and adding a 30%-take cohort tier at 3.5x
premium unlocks another $70,000/year. Pair this with the **Email List
Revenue Calculator** to size the launch audience you need, and the
**Project Profitability Calculator** to model whether the creation
effort is worth your time.