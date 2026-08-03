---
slug: 'solopreneur-equity-refresh-calculator'
engine_ref: 'solopreneur-equity-refresh-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Pave — Compensation Benchmarks 2024 (Equity Refresh)'
    url: 'https://www.pave.com/compensation-benchmarks'
  - name: 'Carta — Equity Benchmarks 2024'
    url: 'https://carta.com/data/equity-benchmarks/'
  - name: 'Y Combinator — Handbook for People Operations'
    url: 'https://www.ycombinator.com/library/4A-handbook-for-people-operations'
---

## What This Calculator Measures

An equity refresh grant (股权刷新) is a **new** equity grant given to an
existing employee, typically at a vesting anniversary (year 2–4), to
combat dilution from continued vesting, recognize ongoing contribution,
and create fresh retention incentives — refresh grants **supplement**
the original grant, they do not replace it. This calculator computes the
recommended grant size (in shares and as a percentage of fully-diluted
shares) given the company's refresh pool size, the employee's current
shares, the time since their original grant, and the role's criticality.
The YC People Ops playbook and Pave 2024 data anchor the role-target
percentages (15% / 8% / 3% of pool for High / Med / Low criticality) and
the refresh pool sizing (0.5–2.0% of fully-diluted for a healthy pool).

## How It Works (Methodology)

```
poolSize      = totalCompanyShares × refreshPoolPct / 100
roleTargetPct = 0.15 (High) | 0.08 (Med) | 0.03 (Low)
yearsFactor   = 1.0                      if yearsSinceGrant ≥ 4
              = 1.0 + (4 − yearsSince)/4 if yearsSinceGrant < 4

refreshShares   = round(poolSize × roleTargetPct × yearsFactor)
dilutionPct     = refreshShares / totalCompanyShares × 100
```

| Variable              | Meaning                                                       |
| --------------------- | ------------------------------------------------------------- |
| `current_shares`      | Employee's existing shares (decorative — doesn't enter math)  |
| `years_since_grant`   | Years since the original grant (refresh typical at year 2–4)  |
| `refresh_pool_pct`    | Refresh pool as % of fully-diluted shares (typical 0.5–2.0%) |
| `total_company_shares`| Fully-diluted share count (incl. all options, RSUs, converts) |
| `role_criticality`    | `High` (15% of pool) / `Med` (8%) / `Low` (3%)               |
| `yearsFactor`         | +0.25/year boost for grants <4yrs old (caps at 1.0)           |

Bands (higher dilution = stronger retention signal = better):
🟢 Excellent ≥0.20% — top-quartile refresh · 🟡 Good 0.10–0.20% —
solid, market competitive · 🟠 Warning 0.05–0.10% — below market,
employee may not see meaningful upside vs original · 🔴 Critical
<0.05% — trivial refresh, retention risk, likely already shopping.
`total_company_shares = 0` returns 0% dilution (zero-division guard).

## Limitations & When Not To Use

This computes the **grant size only** — the vesting schedule (typically
4-year with 1-year cliff, same as original grant; some companies tie
refresh to OKR achievement for senior roles) is a separate decision.
Performance-vested refreshes (refresh tied to promotion cycle or
business milestone) require a different model that incorporates
achievement probability. The role_criticality tier is a 3-bucket
subjective cut — a Staff Engineer in a non-revenue-critical org may
warrant `Med` rather than `High`. Cumulative dilution from refresh
grants compounds: 100 employees × 0.15%/year refresh ≈ 15% dilution
over 5 years — that's why the **refresh pool** (input) is the budget
lever, not per-employee target.

## Worked Example

Imagine a Senior Engineering Manager at year 3 (refresh eligible) in a
mid-market B2B SaaS: `current_shares = 10,000`, `years_since_grant = 3`,
`refresh_pool_pct = 1.5`, `total_company_shares = 10,000,000`,
`role_criticality = Med`:

1. `poolSize` = 10,000,000 × 1.5 / 100 = **150,000 shares**
2. `roleTargetPct` (Med) = **0.08** (8% of pool)
3. `yearsFactor` = 1.0 + (4 − 3) / 4 = **1.25** (newer-grant boost)
4. `refreshShares` = round(150,000 × 0.08 × 1.25) = **15,000 shares**
5. `dilutionPct` = 15,000 / 10,000,000 × 100 = **0.15%** → 🟡 Good

If you bump `role_criticality` from Med to High:
`refreshShares` = round(150,000 × 0.15 × 1.25) = **28,125 shares** →
**0.28% dilution** → 🟢 Excellent. The 13,125-share delta is the
"invest in retention" question — at 0.28% the employee has real
upside left in their package; at 0.15% the grant is competitive but
not differentiated. Pair with **Compensation Banding Calculator** to
size the **cash** companion offer, and with **Attrition Cost
Calculator** to model the cost of losing this employee.
