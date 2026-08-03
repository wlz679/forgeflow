---
engine_ref: 'solopreneur-safe-convertible-note-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Y Combinator — Post-Money SAFE Standard'
    url: 'https://www.ycombinator.com/documents'
  - name: 'Y Combinator Library — SAFE Mechanics'
    url: 'https://www.ycombinator.com/library'
  - name: 'Fenwick & West — SAFE vs Convertible Note'
    url: 'https://www.fnv.com/blog/safe-vs-convertible-note'
---

## What This Calculator Measures

A SAFE (Simple Agreement for Future Equity) is Y Combinator's standardized contract for early-stage startup funding — no fixed share price at signing, converts to equity at a future priced round. This calculator models the **conversion mechanics**: how valuation cap and discount rate interact, what ownership % the SAFE investor gets at conversion, and how much existing shareholders are diluted. Covers YC's post-money SAFE (current standard since 2018), pre-money SAFE with discount, and discount-only structures. Use it before signing a SAFE to model dilution outcomes at different future round valuations.

## How It Works (Methodology)

The conversion price algorithm:

```
EffectivePreMoney = PostMoneyCap − Investment
CapPrice          = EffectivePreMoney ÷ ExistingShares
DiscountPrice     = (NextRoundValuation ÷ ExistingShares) × (1 − DiscountRate÷100)
ConversionPrice   = min(CapPrice, DiscountPrice)  ← whichever is lower
SAFEshares        = Investment ÷ ConversionPrice
SAFEownership     = SAFEshares ÷ (ExistingShares + SAFEshares)
```

| Variable              | Meaning                                          |
| --------------------- | ------------------------------------------------ |
| `Investment`          | Dollar amount from SAFE investor                 |
| `PostMoneyCap`        | Cap on post-money valuation (e.g., $5M)          |
| `DiscountRate`        | Discount vs next round price (0% for YC std)     |
| `ExistingShares`      | Fully diluted shares (founder + prior + options) |
| `NextRoundValuation`  | Expected valuation at conversion round           |

Cap-vs-discount **whichever-is-lower** rule is the SAFE holder's protection: they get the better deal. For YC post-money SAFE (0% discount), the cap always governs → SAFE holder's % at conversion is fixed at `Investment ÷ PostMoneyCap`.

## Limitations & When Not To Use

This calculator models a **single SAFE conversion event** at one priced round. It does not model: (1) stacked SAFEs with MFN (Most Favored Nation) clauses where later SAFEs can upgrade earlier ones, (2) interest accrual (irrelevant for SAFEs, but matters for convertible notes which do accrue), (3) maturity date triggers (typically 10 years — rarely reached), (4) pro-rata rights for SAFE holders in subsequent rounds, (5) the impact of subsequent option pool expansion at the priced round (which dilutes everyone including the SAFE holder). For modeling what happens at a priced round with multiple stacked SAFEs + new investors + option pool refresh, use a full cap-table simulator (Carta, Capshare). The 5 comparison rows show sensitivity at $1M-$20M caps — for caps outside this range, the dilution math changes materially.

## Worked Example

Imagine a startup raising a $500K SAFE at a $5M post-money cap, 0% discount (YC standard), with 1M existing fully diluted shares.

1. **Cap Price** = ($5M − $500K) ÷ 1M = **$4.50/share**
2. **Conversion Price** = $4.50 (cap governs, no discount) = **$4.50/share**
3. **SAFE Shares Issued** = $500K ÷ $4.50 = **111,111 shares**
4. **SAFE Ownership at Conversion** = 111,111 ÷ 1,111,111 = **10.0%**
5. **Existing Pool Dilution** = −10.0% (from 100% to 90.0%)

What-If scenarios: if cap were $3M (lower → more dilution), SAFE holder gets **16.7%**. If discount were 20%, conversion price would be $4.00/share and SAFE gets **11.1%**. If you raise $1M instead of $500K at the same cap, SAFE gets **20%** — twice the dilution. This is why negotiating the **cap** is the single biggest lever in SAFE terms; discount rate matters less for post-money SAFEs.