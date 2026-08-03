---
slug: 'solopreneur-remote-vs-office-calculator'
engine_ref: 'solopreneur-remote-vs-office-calculator'
category_id: 'E'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'Stanford Study on Remote Work — Bloom (2015, updated 2023)'
    url: 'https://wfhresearch.com/research/'
  - name: 'BLS Employer Costs for Employee Compensation (ECEC) 2026'
    url: 'https://www.bls.gov/news.release/ecec.toc.htm'
  - name: 'Harvard Business Review — The Future of Hybrid Work'
    url: 'https://hbr.org/topic/subject/hybrid-work'
---

## What This Calculator Measures

Office rent scales linearly with real estate; remote stipends scale
with headcount — and the math flips somewhere between 20 and 50
people. This calculator isolates the **true annual cost** of fully-
remote, fully-office, and 50/50 hybrid setups, factors in one-time
setup per person, and overlays a **productivity delta** to show the
real cost per unit of work. Use it when negotiating a lease renewal,
drafting a return-to-office policy, or modeling the cost of a
headcount expansion.

## How It Works (Methodology)

The v3 standard formula set we use:

```
officeCost(headcount, salary, officeOH, setup) =
    headcount × (salary + 12 × officeOH) + headcount × setup

remoteCost(headcount, salary, stip, setup) =
    headcount × (salary + 12 × stip) + headcount × setup

hybridCost(...) =
    headcount × (salary + 12 × (0.5×officeOH + 0.5×stip)) + headcount × setup

productivityAdjusted = remoteCost / (1 + productivityDelta / 100)
perPersonSavings    = 12 × (officeOH − stip)
```

| Variable          | Meaning                                              |
| ----------------- | ---------------------------------------------------- |
| `headcount`       | Total team size (full-time equivalents)               |
| `avgSalary`       | Loaded annual base pay, fully-loaded basis           |
| `officeOH`        | Rent + utilities + janitorial, per person per month  |
| `stip`            | Remote stipend: internet + coworking + phone stipend |
| `setup`           | One-time: laptop + monitor + peripherals (year-1)    |
| `productivityDelta` | % change in output for remote vs office (±20%)    |
| `perPersonSavings` | 12 × (office overhead − stipend) — break-even per person |

Office overhead varies by city: $500-$1,000/mo in mid-size (Tulsa,
Indianapolis), $1,500-$2,500 in mid-tier (Austin, Denver), $2,500-
$4,000 in Tier-1 (SF, NYC). The 1.5× context-switch penalty from
Atlassian State of Teams 2024 is **not** baked in here — the
productivity delta input captures it instead, so you can pick a
scenario-specific number.

## Limitations & When Not To Use

The model does **not** include lease termination fees (typically 3-6
months of rent remaining), furniture liquidation losses, or the
legal/tax cost of converting employees to EOR contractors across
borders — those one-time transition costs are typically $100K-$500K
for a 50-person team and should be budgeted separately. The
productivity delta is a single global number; in practice it varies
by role (junior -10%, senior +5%), tenure, and collaboration
intensity. For <5 person teams the savings are too small to matter;
for >100 person teams the cultural and recruiting math dominates the
real-estate math and this calculator stops being decision-useful.

## Worked Example

Imagine a 10-person team, $80K avg salary, $1,500/mo office overhead
per person, $500/mo remote stipend, $3,000 one-time setup:

1. `officeCost` = 10 × ($80K + 12 × $1,500) + 10 × $3,000
   = **$1,010,000/yr** ($101K per person).
2. `remoteCost` = 10 × ($80K + 12 × $500) + 10 × $3,000
   = **$890,000/yr** ($89K per person).
3. `hybridCost` = **$950,000/yr** (50/50 blend).
4. **Annual savings** by going remote = **$120,000/yr**
   (=$12K per person × 10).
5. **3-year TCO** = $3,030,000 office vs $2,670,000 remote
   (**$360K saved**).
6. With 0% productivity delta, **decision health = STRONG** —
   remote saves money AND is neutral on output.

The Calculator's **What-If** section models hot-desking at 30% less
office ($54K savings), bumping stipend to $1,000 (+$60K cost),
2-day-in-office hybrid (+$48K vs full remote), and hiring 5 more
people ($60K saved per 5 hires). Pair with the **Meeting Cost
Calculator** to model how a hybrid schedule changes the meeting
overhead.