---
slug: 'solopreneur-stockout-cost-calculator'
engine_ref: 'solopreneur-stockout-cost-calculator'
category_id: 'O'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Shopify — How to Handle Out-of-Stock Products'
    url: 'https://www.shopify.com/blog/how-to-handle-out-of-stock-products'
  - name: 'Invensia — Estimating the True Cost of a Stockout'
    url: 'https://www.invensia.net/wp-content/uploads/2016/09/Estimating-stockout-cost.pdf'
  - name: 'Supply Chain Brain — The Real Cost of Stockouts'
    url: 'https://www.supplychainbrain.com/blogs/1-think-tank/post/29319-the-real-cost-of-stockouts'
---

## What This Calculator Measures

A stockout is more than a missed sale — it is a **lost customer**. Industry
research (Invensia, 2016) shows 30–60% of shoppers who hit an out-of-stock
page defect to a competitor and never return. This calculator quantifies
**both** the immediate revenue loss *and* the silent lifetime-value
erosion behind it, expressed as a percentage of annual revenue so you can
sit it next to your cost-of-acquisition line.

## How It Works (Methodology)

The v3 standard formula we use:

```
LostImmediate = LostSalesPerDay × StockoutDays
LostLTV       = LostImmediate × LostCustomerRate% × CustomerLTV × (1 − RecoveryRate%)
TotalCost     = LostImmediate + LostLTV
CostPctRev    = TotalCost / AnnualRevenue × 100
```

| Variable           | Meaning                                                                                |
| ------------------ | -------------------------------------------------------------------------------------- |
| `LostSalesPerDay`  | Revenue (or units × AOV) lost per day during the stockout event.                       |
| `StockoutDays`     | Average duration of the stockout window.                                                |
| `LostCustomerRate` | % of stockout shoppers who defect forever (30–60% is typical retail).                   |
| `CustomerLTV`      | Average lifetime value of a customer (use the LTV calculator if unknown).               |
| `RecoveryRate`     | % of lost customers you win back via email/ads (10–25% with good flows).                |
| `AnnualRevenue`    | Used to express stockout cost as % of top line for benchmarking.                       |

Health bands (% of annual revenue): 🟢 < 5% · 🟡 5–10% · 🟠 10–15% · 🔴 ≥ 15%.
Benchmarks derive from SCOR / CSCMP working papers on retail service-level cost.

## Limitations & When Not To Use

The customer-loss rate is a **soft input** — most operators don't measure
it directly. Use a survey, a holdout email-A/B test, or industry proxies
(30% conservative, 50% for commoditized SKUs). For perishable inventory
(grocery, food delivery), the immediate-revenue number dominates and
LTV-loss modeling adds little. Service-only businesses should skip this
calculator entirely — they have no SKUs to stock out.

## Worked Example

A DTC brand sees $1,000/day lost sales, 5-day stockouts, 30% customer
loss, $200 LTV, 10% win-back, $600,000 annual revenue:

1. `LostImmediate` = $1,000 × 5 = **$5,000**
2. `LostLTV` = $5,000 × 0.30 × $200 × (1 − 0.10) = **$270,000**
3. `TotalCost` = $5,000 + $270,000 = **$275,000/year**
4. `CostPctRev` = $275,000 / $600,000 = **45.83%** → 🔴 critical.
5. What-If: cut stockout days 50% AND raise recovery to 25% → total
   cost drops to ~$115,000, **saving ~$160,000/year** — enough to fund
   a multi-supplier pilot for the top 3 SKUs.
