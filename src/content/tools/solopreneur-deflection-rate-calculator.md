---
slug: 'solopreneur-deflection-rate-calculator'
engine_ref: 'solopreneur-deflection-rate-calculator'
category_id: 'T'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'TSIA — Self-Service Benchmark 2024'
    url: 'https://www.tsia.com/blog/self-service-benchmark'
  - name: 'Zendesk — Customer Experience Trends 2024'
    url: 'https://www.zendesk.com/customer-experience-trends/'
  - name: 'Freshworks — Customer Service Benchmark'
    url: 'https://www.freshworks.com/customer-service-benchmark/'
  - name: 'Gartner — Customer Service & Support Research'
    url: 'https://www.gartner.com/en/customer-service-support'
---

## What This Calculator Measures

Self-service deflection is the share of inbound tickets that are **fully
resolved by KB articles, in-product help, or chatbot BEFORE they reach a
human T1 agent**. The calculator surfaces deflection rate, gross cost
saved, net savings after self-service tooling, and ROI — so a Head-of-CS
can justify the KB platform + chatbot subscription line item.

## How It Works (Methodology)

The v3 standard formula we use:

```
DeflectedVolume  = MonthlyTickets × (Deflection% / 100)
GrossSavings     = DeflectedVolume × CostPerTicket
NetSavings       = GrossSavings − ToolMonthlyCost
ROI%             = (NetSavings / ToolMonthlyCost) × 100
```

| Variable           | Meaning                                                              |
| ------------------ | -------------------------------------------------------------------- |
| `MonthlyTickets`   | Total inbound tickets expected this month                            |
| `Deflection%`      | % resolved by KB / chatbot without human intervention                |
| `CostPerTicket`    | Fully-loaded $/ticket (use the Cost-per-Support-Ticket result)       |
| `ToolMonthlyCost`  | Combined KB platform + chatbot subscription cost                     |
| `TargetDeflection` | Internal benchmark for "good" deflection                             |

Health bands (higher is better): 🟢 ≥40% · 🟡 25–40% · 🟠 10–25% · 🔴 <10%.
Deflection >50% can mean KB is masking product gaps — audit the top
deflected tickets quarterly to confirm self-service is healthy, not papering
over real issues.

## Limitations & When Not To Use

This assumes every deflected ticket is **fully** resolved without a human.
Tickets where the chatbot attempted and then escalated to T1 count against
deflection. Also, deflection ≠ customer satisfaction — a customer who finds
a wrong KB answer and then opens a ticket is a double-cost event.

## Worked Example

The team expects 5,000 inbound tickets/month, deflects 35% via KB + chatbot,
and pays $24/ticket. KB platform + chatbot runs $1,500/month.

1. `DeflectedVolume` = 5,000 × 0.35 = **1,750 tickets/mo**
2. `GrossSavings` = 1,750 × $24 = **$42,000/mo**
3. `NetSavings` = $42,000 − $1,500 = **$40,500/mo**
4. `ROI` = $40,500 / $1,500 = **2,700%**

To reach 🟢 Excellent (≥40%), need **+5.0pp** more deflection. Pair this
calculator with the Cost-per-Support-Ticket Calculator to model the full
cost reduction as deflection climbs.
