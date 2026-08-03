---
slug: 'solopreneur-productivity-score'
engine_ref: 'solopreneur-productivity-score'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'Cal Newport — Deep Work (Rules for Focused Success)'
    url: 'https://calnewport.com/books/deep-work/'
  - name: 'Stack Overflow Developer Survey 2024 — Hours Worked'
    url: 'https://survey.stackoverflow.co/2024/work'
  - name: 'Asana Anatomy of Work Index 2024 — Tool Sprawl'
    url: 'https://asana.com/anatomy-of-work'
---

## What This Calculator Measures

Solopreneur productivity is not about hours logged — it's about the
**ratio of deep work to shallow work** and the **tool stack that
amplifies rather than fragments attention**. This calculator scores
your weekly deep work hours, tool count, and meeting load into a
single 0-100 score, then projects the impact of three practical
changes (+5 deep work hours, cut meetings to 2/wk, trim tool stack to
3-5) over a 30-day window. Use it monthly to catch creeping meeting
load or tool bloat before they compound.

## How It Works (Methodology)

The v3 standard formula we use:

```
baseScore    = 50
deepWorkPts  = 0 if < 5 hrs | 5 if 5-9 | 10 if 10-19 | 20 if 20-29 | 25 if 30+
toolPts      = 0 if 0 or > 8 | 8 if 1-2 | 15 if 3-5 | 5 if 6-8
meetingPts   = 0 if > 10    | 0 if 6-10 | 10 if 3-5 | 20 if ≤ 2
score        = clamp(10, 100, baseScore + deepWorkPts + toolPts + meetingPts)
productivityTier = A (≥85) | B (70-84) | C (50-69) | D (30-49) | F (<30)
```

| Variable            | Meaning                                              |
| ------------------- | ---------------------------------------------------- |
| `weeklyDeepWorkHours` | Uninterrupted focused hours (no Slack/email/phone) |
| `toolsUsed`         | Distinct apps touched in a typical work week         |
| `meetingsPerWeek`   | Synchronous meetings on the calendar                 |
| `deepWorkPts`       | Cal Newport 4-hr/day threshold = +25 max              |
| `toolPts`           | 3-5 tools = "Goldilocks zone" — 15 pts               |
| `meetingPts`        | Maker-time protection: ≤ 2/wk = +20 pts              |
| `productivityTier`  | Letter grade for the composite score                 |

Cal Newport's research (Deep Work, 2016) shows 4 hours/day of
uninterrupted focus produces full-time knowledge-worker output.
Stack Overflow 2024 reports the median developer logs 6-8 hours but
self-reports only 2-3 hours of actual deep work. The tool sweet
spot (3-5) comes from Asana Anatomy of Work 2024, which found >6
tools increases context-switching cost faster than automation savings.

## Limitations & When Not To Use

The score is a **diagnostic, not a benchmark** — context matters. A
"Meeting-Heavy Founder" (60/100) running a $1M-ARR services business
may be more productive than a 95/100 "Ideal Solopreneur" building
products no one buys. The model also assumes solo or very small teams;
once you have 5+ direct reports, your meeting load legitimately
climbs because 1:1s and recruiting scale with headcount. Customer
calls and sales demos are excluded from the "meetings" penalty —
internal status meetings are the real target.

## Worked Example

Imagine a solopreneur with 15 deep work hrs/wk, 5 tools, 3 meetings/wk:

1. `deepWorkPts` = 10 (15 falls in 10-19 band).
2. `toolPts` = 15 (5 is the Goldilocks zone).
3. `meetingPts` = 10 (3 falls in 3-5 band).
4. `score` = 50 + 10 + 15 + 10 = **85/100** → **A — Elite**.
5. **Deep Work % of week** = 38% (target 40%+).
6. **Meetings-to-Deep Ratio** = 20% (lower is better).
7. **30-day projection** — push +5 deep work hrs/wk → **100/100**;
   cut meetings to 2/wk → **95/100**; trim tools → no change (already
   optimal).

The Calculator's **Top Lever** then reads "You are on track. Protect
your current systems. The next 5 points come from going deeper, not
wider." Pair with the **Meeting Cost Calculator** to model the dollar
value of freeing 5 hours/wk of meeting time for deep work at $75/hr
fully-loaded = ~$18,000/yr reclaimed.