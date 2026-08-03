---
slug: 'solopreneur-support-capacity-planning-calculator'
engine_ref: 'solopreneur-support-capacity-planning-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'TSIA — Workforce Optimization Benchmark 2024'
    url: 'https://www.tsia.com/blog/workforce-optimization'
  - name: 'ICMI — Contact Center Performance Research'
    url: 'https://www.icmi.com/research/contact-center-performance'
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'SQM Group — Contact Center Benchmarks'
    url: 'https://www.sqmgroup.com/resources/research/contact-center-benchmarks'
---

## What This Calculator Measures

Support capacity planning answers the question "how many agents do we need
to handle X tickets per month at Y service level?" by combining average
handle time, shrinkage, and target occupancy into a single required-headcount
number plus an actual-utilization band. A Head-of-CS uses it to size the
team for next quarter, defend a hiring request, or detect burnout risk
before attrition hits.

## How It Works (Methodology)

The v3 standard formula we use:

```
TotalHandleMin       = MonthlyTickets × AvgHandleTimeMin
ProductiveMinPerAgent = WorkHours × 60 × (1 − Shrinkage% / 100) × (Occupancy% / 100)
RequiredAgents       = ceil(TotalHandleMin / ProductiveMinPerAgent)
UtilizationActual    = (TotalHandleMin / (RequiredAgents × ProductiveMinPerAgent)) × 100
```

| Variable          | Meaning                                                                 |
| ----------------- | ----------------------------------------------------------------------- |
| `MonthlyTickets`  | Forecast monthly inbound volume                                          |
| `AvgHandleMin`    | Average handle time in minutes per ticket                                |
| `TargetOccupancy` | % of productive time spent on tickets (vs idle / waiting)                |
| `WorkHoursMonth`  | Work hours per agent per month (160 = 40hr/wk × 4wk US standard)         |
| `Shrinkage%`      | Non-productive time — meetings, training, PTO, sick, system issues (25–35%) |
| `TargetRespMin`   | Target first-response time (for context, not in headcount math)         |

Health bands (inverse — lower utilization = more buffer): 🟢 ≤85% (15%+ buffer)
· 🟡 85–100% · 🟠 100–120% (burnout risk) · 🔴 >120% (attrition imminent).

## Limitations & When Not To Use

This is a steady-state model. It does not capture seasonality (Black Friday
spike), product launch bursts, or shift-coverage edge cases. For a 7-day
24/7 team, you also need shift-pattern math on top of headcount. Treat the
output as a baseline; layer seasonality and shift coverage before signing
off on the final hire count.

## Worked Example

A team forecasts 5,000 tickets/month at 18 min AHT, targeting 70% occupancy
with 30% shrinkage and 160 work hours/agent.

1. `TotalHandleMin` = 5,000 × 18 = **90,000 min/mo**
2. `ProductiveMinPerAgent` = 160 × 60 × 0.70 × 0.70 = **4,704 min/agent**
3. `RequiredAgents` = ceil(90,000 / 4,704) = **20 agents**
4. `UtilizationActual` = (90,000 / (20 × 4,704)) × 100 = **95.7%** → 🟡 Good

If volume grows 20% to 6,000 tickets/month, required rises to **23 agents
(+3 hires)** at the same 95.7% utilization. To pull the current state into
🟢 Excellent (≤85% util), hire 1 more agent for **91.1%** utilization.

Pair the result with the Cost-per-Support-Ticket Calculator to size the
financial impact of the next round of hires.
