---
slug: 'solopreneur-meeting-cost-calculator'
engine_ref: 'solopreneur-meeting-cost-calculator'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'Atlassian State of Teams 2024'
    url: 'https://www.atlassian.com/blog/state-of-teams'
  - name: 'Asana Anatomy of Work Index 2024'
    url: 'https://asana.com/anatomy-of-work'
  - name: 'Harvard Business Review — The Cost of Meetings'
    url: 'https://hbr.org/2017/08/the-cost-of-meetings'
---

## What This Calculator Measures

Meetings are the single largest controllable cost on a solopreneur's
calendar. This calculator translates a meeting's **attendees × hourly
rate × duration × frequency** into per-meeting dollar cost, weekly /
quarterly / annual burn, and person-hour waste — then layers a 1.5×
**context-switch penalty** (Atlassian State of Teams 2024) to surface
the true productivity drag. Use it to kill recurring meetings that no
longer earn their keep, or to justify replacing a $500/wk sync with a
Loom-and-thread.

## How It Works (Methodology)

The v3 standard formula we use:

```
costPerMeeting      = attendees × avgHourlyRate × (meetingMinutes / 60)
weeklyCost          = costPerMeeting × meetingsPerWeek
quarterlyCost       = (weeklyCost × 48) / 4
annualCost          = weeklyCost × 48                // 48 working weeks
trueCostWithContext = annualCost × 1.5               // recovery + ramp-down
annualHours         = attendees × (meetingMinutes / 60) × meetingsPerWeek × 48
contextSwitchMult   = 1.5                              // Atlassian 2024 baseline
asyncCost           = weeklyCost × 0.1                 // Slack/Loom/Notion proxy
```

| Variable          | Meaning                                                  |
| ----------------- | -------------------------------------------------------- |
| `attendees`       | Headcount present (count executives + ICs separately)    |
| `avgHourlyRate`   | Fully-loaded hourly cost (salary ÷ 2,080)                |
| `meetingMinutes`  | Block length, including overrun (round up)               |
| `meetingsPerWeek` | Frequency — recurring meeting default is 1×               |
| `contextSwitch`   | 1.5× multiplier = 30 min focus loss for 30 min meeting    |
| `annualHours`     | Person-hours absorbed by this meeting per calendar year |

The 48-week year accounts for 4 weeks PTO/holidays (BLS-tracked US
median). The 1.5× context switch overhead is the lower bound —
Microsoft's Workplace Analytics places the figure at 2× for deep work
disruption. The async cost is a deliberately conservative estimate
(Licenses + writer time); in practice, well-run async work can replace
90% of a meeting's value at 5-10% of the cost.

## Limitations & When Not To Use

The model assumes **synchronous, all-attendee attendance**. If a
meeting is presentation-style (one speaker, 10 passive listeners) the
asynchronous equivalent (a 5-minute Loom) captures 90% of the value at
near-zero cost. The calculator also bakes in a single `avgHourlyRate`
— for executive-heavy meetings, weighting the attendee cost up by 30-
50% better captures real opportunity cost (Atlassian 2024 cites $1,200/
hr for senior engineers in tech). Customer-facing and sales meetings
are out of scope; treat them as revenue-generating, not cost.

## Worked Example

Imagine a 30-minute weekly sync with 6 people at $75/hr fully-loaded:

1. `costPerMeeting` = 6 × $75 × (30/60) = **$225/meeting**.
2. `weeklyCost` = $225 × 1 = **$225/wk** (3 person-hours).
3. `annualCost` = $225 × 48 = **$10,800/yr** (144 person-hours).
4. **With context switch (×1.5)** = **$16,200/yr** of true productivity drag.
5. **Annual equivalent FTEs** = 144 / 2,080 = **0.07 FTE** absorbed.
6. **Async alternative** at ~$22/wk (Loom + Slack) saves **$9,720/yr**.

The Calculator's **What-If** section models cutting attendees in half
(saves $5,400/yr), shortening by 25% (saves $2,700/yr), switching from
30-min to 25-min defaults (saves $1,836/yr), and going fully async
(saves the full $10,800/yr). Pair with the **Employee Cost Calculator**
to see what each meeting attendee actually costs you per hour.