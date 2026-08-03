---
engine_ref: 'solopreneur-equity-dilution-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Y Combinator — Equity Dilution & Cap Tables'
    url: 'https://www.ycombinator.com/library'
  - name: 'a16z — Startup Funding & Dilution Math'
    url: 'https://a16z.com/venture-capital/'
  - name: 'NVCA — Pre-Money vs Post-Money Valuation'
    url: 'https://www.nvca.org/'
---

## What This Calculator Measures

Equity dilution measures how an investment round reduces existing shareholders' ownership percentage. Each priced round dilutes founders, prior investors, and the option pool — and the dilution is often larger than naive math suggests because most rounds also include an **expanded option pool** that comes out of the pre-money valuation. This calculator models: post-money valuation, founder vs investor ownership split, option pool impact (default 10%), and founder exit proceeds across 5 valuation outcomes.

## How It Works (Methodology)

The dilution waterfall:

```
PostMoneyValuation = PreMoneyValuation + Investment
InvestorOwnership  = Investment ÷ PostMoneyValuation  (% of company)
InvestorShares     = FounderShares × (Investment ÷ PreMoneyValuation)
TotalSharesAfter   = FounderShares + InvestorShares
FounderOwnership   = FounderShares ÷ TotalSharesAfter  (post-investment)
DilutionPct        = 100% − FounderOwnership

OptionPoolImpact   = 10% pool → founder effective stake drops further
                    FounderAfterPool = FounderShares ÷ (TotalSharesAfter + PoolShares)
```

| Variable            | Meaning                                            |
| ------------------- | -------------------------------------------------- |
| `PreMoneyValuation` | Company value before this investment               |
| `Investment`        | New cash coming in this round                       |
| `FounderShares`     | Total founder shares currently issued              |

Founder control threshold: >60% strong control; 40-60% minority (watch blocking rights); 20-40% losing majority; <20% minority stake, investors likely control board.

## Limitations & When Not To Use

This calculator uses a simplified **single-class share structure**. It does not model: (1) preferred stock liquidation preferences (1x non-participating is standard; 2x or participating prefs shift exit waterfall materially), (2) anti-dilution provisions (weighted-average vs full-ratchet), (3) pro-rata rights for existing investors, (4) advisor shares and ESOP grants. For convertible note / SAFE rounds, dilution does not occur immediately — use the **SAFE / Convertible Note Calculator** instead. This calculator assumes a single priced round with a fixed 10% option pool; real rounds often include 15-20% option pool expansion as a precondition, which further dilutes founders before the new investor's shares are even counted.

## Worked Example

Imagine a startup with $5M pre-money valuation raising $1M, with 10M founder shares currently issued.

1. **Post-Money** = $5M + $1M = **$6M**
2. **Investor Ownership** = $1M ÷ $6M = **16.67%**
3. **Investor Shares** = 10M × ($1M ÷ $5M) = **2,000,000 shares**
4. **Founder Ownership** = 10M ÷ 12M = **83.33%** (16.67% dilution)
5. **Option Pool (10%)**: founder drops further to **75.00%** effective
6. **At $50M exit (10× pre-money)**: founder take = 75% × $50M = **$37.5M**

If you negotiate pre-money to $6.25M (25% higher): dilution drops to 13.79%, founder effective stays at 79.17% — saves ~3 percentage points and signals momentum to future investors. The What-If section models raising half ($500K) for 9.09% dilution if you want to preserve more ownership.