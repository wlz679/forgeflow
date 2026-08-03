---
slug: 'solopreneur-brrrr-calculator'
engine_ref: 'solopreneur-brrrr-calculator'
category_id: 'F'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'BiggerPockets — BRRRR Calculator Guide'
    url: 'https://www.biggerpockets.com/blog/brrrr-calculator/'
  - name: 'BiggerPockets — BRRRR Investing Strategy'
    url: 'https://www.biggerpockets.com/real-estate-investing/brrrr-investing/'
  - name: 'Fannie Mae — Cash-Out Refinance Guidelines'
    url: 'https://www.knowyouroptions.com/buy/refinance-options'
  - name: 'HUD — 203(k) Rehab Lending Reference'
    url: 'https://www.hud.gov/program_offices/housing/sfh/203k'
---

## What This Calculator Measures

This calculator models the **BRRRR real estate investment strategy** — Buy, Rehab, Rent, Refinance, Repeat — by tracking investor cash through all five stages and answering the central question: did the deal achieve **cash-out success** (refinance returns ≥ 100% of your invested capital) or **cash-in** (capital still trapped)? It also enforces the classic **70% rule** (purchase price + rehab should be ≤ 70% of after-repair value), runs forced-appreciation sensitivity, and projects post-refi cash-on-cash return. Use it to stress-test a fix-and-flip-to-rental pipeline before contract.

## How It Works (Methodology)

The model tracks investor cash as a single ledger across the five stages:

```
Stage 1 (Buy):
  initialOutlay = downPayment + 3% closing
  initialLoan   = purchasePrice − downPayment

Stage 2 (Rehab):
  holdingCost = (initialLoan × monthlyRate + $200 utilities) × holdingMonths
  totalStage2 = rehabCost + holdingCost

Stage 3 (Rent):
  interimRent = monthlyRent × min(2, holdingMonths − 1)   (limited capture)

Stage 4 (Refinance):
  refiLoan = afterRepairValue × 0.75         (standard 75% LTV refi)
  cashOutFromRefi = refiLoan − initialLoan   (positive = cash back to investor)

Stage 5 (Repeat):
  cashOut (cash invested) = stage1 + stage2 + holding
  cashIn  (cash returned) = interim rent + cash from refi
  cashLeftInDeal          = cashOut − cashIn
  cash-level verdict:     ≤ 0 → 🟢 cash-out success; > 15% → 🟠 trapped
```

**The 70% Rule** is the deal-screening screen: `max_allowed_bid = (ARV × 0.7) − rehab_cost`. If your purchase price exceeds this, the deal likely fails regardless of execution. **Forced appreciation** is then the active skill — it is the dollar gain `(ARV − purchase_price − rehab_cost)` your rehab creates, on top of market appreciation.

| Variable           | Plain-English meaning                                           |
| ------------------ | --------------------------------------------------------------- |
| `ARV`              | After-Repair Value — appraised value after the rehab completes. |
| `Forced Appreciation` | The value your rehab adds. Profitability driver of BRRRR.    |
| `70% Rule`         | (ARV × 0.7) ≥ purchase + rehab. The single most important pre-screen. |
| `Cash-Left-in-Deal`| The capital you have NOT yet recovered via refi. Target ≤ 0 for success. |
| `Post-Refi CoC`    | Annual cash flow / cash remaining in deal. ∞ when cash-out success. |

The post-refi cash flow uses the same PMT formula as the **Mortgage Calculator**, with the new (refi) loan instead of the original purchase loan. Cap-rate math from the **Cap Rate Calculator** governs the rent side.

## Limitations & When Not To Use

The model assumes the **refinance appraisal lands at your ARV estimate** — in reality, appraisals frequently come in 5–15% below, and each 10% gap drops refi cash by 10K+ per $100K of ARV. Always run the "ARV −$20K" what-if before contracting. The interim rent capture is capped at 2 months (rehab typically means vacant). For deals using **hard money** (short-term, high-rate, interest-only loans), holding cost math should be modeled with the actual hard-money rate, not the eventual refi rate. BRRRR is fragile in rising-rate environments (2026's 6.5–7.5% range compresses refi cash-out materially); shorter rehab timelines and higher forced appreciation are required to keep the deal viable.

## Worked Example

You find a $150,000 distressed property. The ARV (after comparable-analysis) is $220,000. Your contractor bids $30,000 for the rehab. You put 25% down, refinance at 7.5% over 30 years on the after-repair value, and project $1,800/month rent with $400/month OpEx:

1. **Buy**: $37,500 down + $4,500 closing = **$42,000 out** (initial loan $112,500)
2. **Rehab**: $30,000 + $5,419 holding (interest + $200/mo utilities × 6mo) = **$35,419 out**
3. **Rent**: $1,800 × 1mo interim = **$1,800 in** (one month interim only)
4. **Refinance**: $220,000 × 0.75 = $165,000 refi loan; minus $112,500 initial loan = **$52,500 cash back**
5. **Tally**: cash-out $77,419, cash-in $54,300 → **$21,119 left in deal** 🟠 significant cash-in

The 70% rule fails (max bid $124,000 vs your $150,000 — $26K gap). To make the deal work, you'd need to: (1) negotiate down at least $26K, (2) reduce rehab scope, or (3) push ARV above $250K (the +$30K lift would close the gap). The 6 ARV sensitivity rows show that **$250K ARV** crosses the cash-out threshold (left-in-deal goes negative). **Pair with the Rental Yield Calculator** to model the post-refi holding economics, and the **DSCR Calculator** before applying for the refi.
