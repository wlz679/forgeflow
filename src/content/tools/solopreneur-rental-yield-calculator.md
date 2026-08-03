---
slug: 'solopreneur-rental-yield-calculator'
engine_ref: 'solopreneur-rental-yield-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'BiggerPockets — Cash-on-Cash Return'
    url: 'https://www.biggerpockets.com/rei/glossary/cash-on-cash-return/'
  - name: 'Bankrate — Cash-on-Cash Return'
    url: 'https://www.bankrate.com/real-estate/cash-on-cash-return/'
  - name: 'NCREIF — Real Estate Returns Index'
    url: 'https://www.ncreif.org/'
  - name: 'NYU Stern — S&P 500 Historical Returns'
    url: 'https://pages.stern.nyu.edu/~adamodar/New_Home_Page/data.html'
---

## What This Calculator Measures

This calculator computes three yield metrics on a leveraged rental property — **gross yield**, **net yield**, and **cash-on-cash return (CoC)** — and grades each against market benchmarks. Gross yield tells you the headline rent-vs-price ratio. Net yield strips out vacancy and operating expenses. Cash-on-cash return is the most decision-relevant: it tells you what your actual deployed capital earns per year, given the mortgage. The output includes a negative cash flow warning for appreciation-only markets (SF, NYC), and a 5-scenario sensitivity table so you can see how CoC responds to vacancy, rent, rate, term, and leverage changes.

## How It Works (Methodology)

Three nested ratios, each one refining the previous:

```
Gross Yield        = (Annual Rent / Purchase Price) × 100
Net Yield          = (Annual Cash Flow / Purchase Price) × 100
Cash-on-Cash (CoC) = (Annual Cash Flow / Total Cash Invested) × 100

where:
  Annual Cash Flow = Effective Rent − Annual Mortgage P&I − Annual OpEx
  Effective Rent   = Monthly Rent × 12 × (1 − Vacancy Rate)
  Total Cash Invested = Down Payment + 3% closing costs
```

For a $300,000 property at 25% down, $225,000 loan at 7% over 30 years, $2,500/month rent, $600/month OpEx, 5% vacancy, the math is:

- Effective Rent = $2,500 × 12 × 0.95 = **$28,500**
- Annual mortgage P&I = `225000 × 0.005833 / (1 − 1.005833^−360) × 12` ≈ **$17,963**
- Annual cash flow = $28,500 − $17,963 − $7,200 = **$3,337**
- Total cash invested = $75,000 + $9,000 (3% closing) = **$84,000**
- CoC = $3,337 / $84,000 × 100 = **3.97%**

| Variable              | Plain-English meaning                                        |
| --------------------- | ------------------------------------------------------------ |
| `Gross Yield`         | Quick rent-vs-price ratio (ignores vacancy, expenses, debt). |
| `Net Yield`           | Cash flow divided by price (ignores debt).                   |
| `Cash-on-Cash (CoC)`  | Cash flow divided by actual cash you put in (captures leverage). |
| `Total Cash Invested` | Down payment + closing costs. Excludes the bank-financed portion. |

**The leverage multiplier**: the same $300,000 property bought all-cash (no loan) generates ~7% CoC (the cap rate). With 75% LTV at 7%, CoC lifts to varying degrees depending on rate. This is the foundation of the BRRRR strategy — pull cash out at refi to deploy on the next property.

## Limitations & When Not To Use

The model assumes a **fixed-rate, fixed-payment mortgage** for the full term. For ARMs, the cash flow will shift materially when the rate resets. It also ignores tax effects (depreciation can shelter much of the rental income, making the *after-tax* CoC much higher than the pre-tax figure shown). Property management — included in the OpEx line — is the most commonly underestimated item; if you self-manage, the cash flow appears better than it actually is. For appreciation-driven markets (SF, NYC), this calculator will show low or negative CoC; that is **expected and intentional**, not a reason to skip the deal — those markets bet on capital gains, not yield. For the appreciation half of the strategy, evaluate explicitly.

## Worked Example

You're buying a $300,000 rental with 25% down ($75,000), financing $225,000 at 7% over 30 years, projecting $2,500/month rent, $600/month OpEx, 5% vacancy:

1. Total cash invested = $75,000 + $9,000 (3% of $300K) = **$84,000**
2. Effective rent = $2,500 × 12 × 0.95 = **$28,500/yr**
3. Annual mortgage P&I ≈ **$17,963** (full 30-year amortization at 7%)
4. Annual OpEx = $600 × 12 = **$7,200**
5. Net cash flow = $28,500 − $17,963 − $7,200 = **$3,337/yr**
6. CoC = $3,337 / $84,000 × 100 = **3.97%** (below the 8% target)

A 3.97% CoC underperforms the long-run S&P 500 average (~7–10% per NYU Stern data). The 5 what-ifs tell you where the levers are: rent +$200/mo pushes CoC to 6.69%; rate −1pp lifts to 6.09%; switching to 15-year term actually drops CoC to **−3.53%** (higher monthly payment wipes out cash flow). 100% down (no leverage) collapses to 1.08% — leverage is doing real work here. **Pair with the BRRRR Calculator** to model the recovery half of the strategy (refinance the asset to pull out capital for the next deal).
