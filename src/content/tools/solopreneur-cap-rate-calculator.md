---
slug: 'solopreneur-cap-rate-calculator'
engine_ref: 'solopreneur-cap-rate-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'BiggerPockets — Cap Rate Explained'
    url: 'https://www.biggerpockets.com/blog/cap-rate-explained/'
  - name: 'Bankrate — Cap Rate Calculator'
    url: 'https://www.bankrate.com/real-estate/cap-rate/'
  - name: 'CBRE — U.S. Real Estate Market Cap Rates'
    url: 'https://www.cbre.com/insights'
  - name: 'Federal Reserve — Commercial Real Estate Data'
    url: 'https://www.federalreserve.gov/data/commercial-real-estate.htm'
---

## What This Calculator Measures

The capitalization rate (cap rate) is the single most important metric for comparing rental property investments independent of how they are financed. It expresses a property's **Net Operating Income (NOI)** as a percentage of its value — i.e., how much the property earns per dollar of price. Use it to compare a duplex in Cleveland to a fourplex in Tampa, to negotiate purchase prices, and to spot over- or under-priced listings. The calculator also runs the reverse calc: given your expected NOI, what property value supports a target cap rate (5%, 7%, 8%, 10%)?

## How It Works (Methodology)

Cap rate is NOI divided by value, expressed as a percent:

```
Cap Rate = (NOI / Property Value) × 100

where:
  NOI = Effective Gross Income − Operating Expenses
  Effective Gross Income = Gross Rent × (1 − Vacancy Rate)
  Operating Expenses = property tax + insurance + maintenance + management
  (excludes mortgage payments)
```

For a $500,000 property with $36,000 gross rent, 5% vacancy, and $12,000 annual operating expenses, the math is `(36000 × 0.95 − 12000) / 500000 × 100 = 4.44%`. The reverse calc (`implied value = NOI / target_cap_rate`) lets you back-solve: at NOI of $22,200 and a 7% target, implied value is `$22,200 / 0.07 = $317,143`.

| Variable                | Plain-English meaning                                     |
| ----------------------- | --------------------------------------------------------- |
| `Effective Gross Income` | Annual rent minus the vacancy reserve.                    |
| `Operating Expenses`    | All costs of running the property EXCEPT the mortgage.    |
| `NOI`                   | True income the property produces before debt service.    |
| `Cap Rate`              | NOI ÷ Value — pure property yield, financing-blind.      |

**Class benchmarks** (the calculator displays these): Class A urban (NYC, SF) 3–5%; Class B mid-tier cities 5–8%; Class C value-add 8–12%; distressed > 12% (verify assumptions); rural / lower-tier 10–15% (often appreciation-limited). A 5% cap rate in Manhattan is normal; a 12% cap rate in Manhattan usually signals a problem.

## Limitations & When Not To Use

Cap rate **excludes financing** — for an all-cash purchase, cap rate equals your cash-on-cash return. For a leveraged deal, the actual return on your cash is much higher (or lower) depending on the mortgage terms; use the **Cash-on-Cash / Rental Yield Calculator** for that view. The metric also assumes **stable rent and expenses** — in real life, rents drift up with inflation, expenses are volatile, and major capital items (roof, HVAC, water heater) hit at irregular intervals. Always reserve 5–10% of NOI for replacement reserves when screening with cap rate. For sub-3% markets (high-coast or ultra-hot appreciation markets), the metric becomes less useful as the deal math is driven by capital gains, not yield.

## Worked Example

You're evaluating a $500,000 duplex. The seller projects $36,000 in annual gross rent; you estimate 5% vacancy and $12,000 in property tax + insurance + maintenance + management:

1. Effective Gross Income = $36,000 × (1 − 0.05) = **$34,200**
2. NOI = $34,200 − $12,000 = **$22,200**
3. Cap Rate = $22,200 / $500,000 × 100 = **4.44%**

A 4.44% cap rate signals a Class A or Class B market with appreciation upside (likely coastal or fast-growing Sun Belt). If you target a 7% minimum yield (your hurdle), the implied value is `$22,200 / 0.07 = $317,143` — the seller is asking roughly $183K more than your 7% benchmark. Either negotiate down, accept the lower yield for appreciation, or move on. The "Cap Rate on Vacancy +5pp" what-if drops the metric to 4.08% — sensitive but not catastrophic. **Pair with the DSCR Calculator** to confirm the deal will qualify for financing at the price you offer.
