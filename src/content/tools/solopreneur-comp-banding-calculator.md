---
slug: 'solopreneur-comp-banding-calculator'
engine_ref: 'solopreneur-comp-banding-calculator'
category_id: 'H'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Pave — Compensation Benchmarks 2024'
    url: 'https://www.pave.com/compensation-benchmarks'
  - name: 'Levels.fyi — Comp Data 2024'
    url: 'https://www.levels.fyi/comp-data'
  - name: 'Carta — Equity Benchmarks 2024'
    url: 'https://carta.com/data/equity-benchmarks/'
---

## What This Calculator Measures

Compensation banding (薪酬带) maps an offered base salary against market
percentile benchmarks (P25, P50, P75) and tells you **where you stand**
in the talent market for that role. The output is a continuous percentile
between 0 and 100 — not a band label — so you can see exactly how much
above P50 or below P75 your offer lands. Paying at or above P75 is the
top-quartile retention signal (LinkedIn / Pave 2024 cite ~40% lower
flight risk at P75 vs P50); paying below P25 is a flight-risk emergency
where counter-offers usually arrive within 6 months. This is the
calculator your People Ops and Finance teams use to **price an offer
defensively** before candidate negotiation starts.

## How It Works (Methodology)

```
percentile = piecewise-linear interp(base_salary, market_p25/50/75)

if base ≤ p25:  pct = (base / p25) × 25
elif base ≤ p50: pct = 25 + ((base − p25) / (p50 − p25)) × 25
elif base ≤ p75: pct = 50 + ((base − p50) / (p75 − p50)) × 25
else:            pct = min(100, 75 + ((base − p75) / p75) × 25)
```

| Variable       | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `role_title`   | Role label (for context; doesn't enter the math)              |
| `base_salary`  | Offered annual base                                           |
| `market_p25`   | 25th percentile of base for this role/region (from Pave / Levels.fyi) |
| `market_p50`   | 50th percentile (median)                                      |
| `market_p75`   | 75th percentile                                               |
| `percentile`   | Where the offer lands, in P-rank terms (0–100, capped)         |

Bands (higher = paying competitively = better): 🟢 Excellent ≥P75 —
top-quartile retention signal · 🟡 Good P50–P75 — competitive but not
top-quartile · 🟠 Warning P25–P50 — below market median, flight-risk
to competitors offering P50+ · 🔴 Critical <P25 — significantly below
market, expect counter-offer pressure inside 6 months. Inputs clamped
non-negative; identical P25/P50/P75 inputs (degenerate benchmarks)
return 25/50/75 respectively.

## Limitations & When Not To Use

This is **base-salary only** — it does not include bonus, equity
(RSU/options), or sign-on. Total-comp percentiles require a different
model that NPV-discounts equity and expected-values bonus (Pave and
Carta both publish total-comp cuts, but the math is fundamentally
different). Geo-adjustment is critical: P50 in the SF Bay is roughly
**equivalent to a Senior Engineer in most of the country** — use Pave /
Levels.fyi geo filters, not national medians. The percentile above P75
is a coarse linear extrapolation — going to P85–P95 may be reasonable
for retention hot-stocks but you may be paying more than necessary.
Pair with **Equity Refresh Calculator** to balance cash vs equity.

## Worked Example

Imagine a Senior Software Engineer offer with `base_salary = $160,000`
vs `market_p25 = $130,000`, `market_p50 = $155,000`, `market_p75 = $185,000`:

1. `base = $160,000` sits between P50 ($155K) and P75 ($185K)
2. `percentile = 50 + ((160,000 − 155,000) / (185,000 − 155,000)) × 25 = 50 + (5,000/30,000) × 25 = 50 + 4.17 ≈ 54.2 → P54`
3. Band: **🟡 Good (P54)** — paying above market median, $25K below P75
4. Delta to P75 = $185,000 − $160,000 = **$25,000**
5. Retention risk at P75: Pave 2024 cites ~40% drop in voluntary attrition vs P50

If the candidate counters at P75 budget ($185K), the People Ops team
now has a $25K cash delta to either approve (top-quartile retention)
or balance with **Equity Refresh Calculator** to bridge the gap via
shares instead of cash (typically 0.10–0.20% dilution). If your `P50`
comes from a **non-geo-adjusted** source and the candidate is SF-based,
the effective P75 may be closer to $215K — re-pull with SF Bay filter
before quoting the offer.
