---
slug: 'solopreneur-sales-velocity-calculator'
engine_ref: 'solopreneur-sales-velocity-calculator'
category_id: 'S'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'HubSpot — Sales Velocity: The KPI That Ties It All Together'
    url: 'https://blog.hubspot.com/sales/sales-velocity'
  - name: 'Gong.io — The 4 Levers of Sales Velocity'
    url: 'https://www.gong.io/blog/sales-velocity'
  - name: 'Forrester — B2B Sales Compensation and Productivity Benchmarks 2026'
    url: 'https://www.forrester.com/'
---

## What This Calculator Measures

Sales velocity is the daily revenue throughput of your pipeline — how
many dollars per day your sales engine is generating from open
opportunities. It is the only KPI that captures all four levers of
sales productivity at once: number of opportunities × average deal size
× win rate ÷ sales cycle length. Founders use it to answer "are we
generating enough revenue per day to hit our number," and to identify
which of the four levers to invest in next (volume, size, win rate, or
cycle compression). A $5K+/day velocity is excellent; sub-$500/day is a
stalled engine.

## How It Works (Methodology)

The v3 standard formula uses the HubSpot/Gong 4-factor cascade:

```
dailyVelocity   = (openOpps × avgDealSize × winRate) ÷ cycleDays
monthlyVelocity = dailyVelocity × 30
annualVelocity  = dailyVelocity × 365
```

| Variable        | Meaning                                                       |
| --------------- | ------------------------------------------------------------- |
| `openOpps`      | Currently-qualified open opportunities in your pipeline        |
| `avgDealSize`   | Average contract value of closed-won deals (not list price)    |
| `winRate`       | Closed-won ÷ (closed-won + closed-lost) as a percentage        |
| `cycleDays`     | Average days from first touch to closed-won                   |

**Health bands** (daily velocity in USD):
- 🟢 ≥ $5,000/day — excellent (≈ $1.8M/year throughput)
- 🟡 $2,000–$5,000/day — productive mid-market SaaS
- 🟠 $500–$2,000/day — slow; pipeline needs more volume or faster cycle
- 🔴 < $500/day — critical; sales engine stalling

**Assumptions.** Inputs are trailing 90-day averages (not all-time) to
smooth seasonality. Cycle length uses the same cohort of closed-won
deals as the win-rate calculation — mixing cohorts distorts the cascade.
Forrester's 2026 B2B benchmark reports $4,200/day as the median for
mid-market SaaS companies (50–200 reps), which aligns with the 🟡 band.

## Limitations & When Not To Use

Sales velocity is built for **consultative B2B sales with measurable
cycle length**. It does not fit transactional e-commerce, retail, or
self-serve product-led growth funnels — those businesses measure
throughput by activation rate, conversion rate, or traffic-to-revenue,
not by per-day revenue per rep. It also assumes your CRM reports cycle
days from first touch, not from MQL/SQL handoff — different teams use
different definitions, and comparing velocities across orgs requires
agreement on the start point. Finally, very long enterprise cycles
(>180 days) make daily velocity a noisy leading indicator; in those
cases, supplement with quarterly NRR and contract value growth.

## Worked Example

A B2B SaaS with 20 qualified open opportunities, $25K average deal size,
25% win rate, and a 45-day sales cycle:

1. `dailyVelocity` = (20 × $25,000 × 25%) ÷ 45 = $125,000 ÷ 45 = **$2,777.78/day**
2. `monthlyVelocity` = 2,777.78 × 30 = **$83,333.33/month**
3. `annualVelocity` = 2,777.78 × 365 = **$1,013,888.89/year**
4. Health band: 🟡 **Good** ($2K–$5K/day) — productive but room to grow
5. Break-even to 🟢: lift win rate to 45% OR compress cycle to 25 days, OR add 16 more open opps at current conversion
6. Cycle compression 45→30 days alone lifts daily velocity 50.0% (→ $4,167/day, just under 🟢)

Pair with the **Pipeline Coverage Calculator** to confirm whether the
velocity is supported by enough pipeline, and with **Win Rate by Stage**
to see where the funnel is leaking if velocity is sub-🟡.