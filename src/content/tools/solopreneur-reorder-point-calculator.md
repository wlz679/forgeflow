---
slug: 'solopreneur-reorder-point-calculator'
engine_ref: 'solopreneur-reorder-point-calculator'
category_id: 'O'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Investopedia — Reorder Point Definition & Formula'
    url: 'https://www.investopedia.com/terms/r/reorder-point.asp'
  - name: 'Shopify — Reorder Point and Safety Stock'
    url: 'https://www.shopify.com/blog/reorder-point'
  - name: 'NetSuite — How to Calculate Reorder Point'
    url: 'https://www.netSuite.com/portal/resource/articles/inventory-management/reorder-point.shtml'
---

## What This Calculator Measures

The reorder point (ROP) is the inventory level at which you should fire the
next purchase order — **before** you run out. Getting it wrong in either
direction is expensive: too low and you stock out and lose customers
(Stockout Cost Calculator); too high and you tie up capital in deadstock
(Carrying Cost Calculator). This calculator blends **lead-time demand**
with a **service-level Z-score** so the buffer is statistically sized, not
guessed.

## How It Works (Methodology)

The v3 standard formula we use:

```
LeadTimeDemand = AvgDailyDemand × LeadTimeDays
SafetyStock    = Z × DemandStdDev × √(LeadTimeDays / ReviewPeriod)
ReorderPoint   = LeadTimeDemand + SafetyStock
```

| Variable          | Meaning                                                                                |
| ----------------- | -------------------------------------------------------------------------------------- |
| `AvgDailyDemand`  | Units sold per day (use 30/60/90-day moving average).                                  |
| `LeadTimeDays`    | Supplier order-to-delivery time (days).                                                |
| `ServiceLevel`    | Target cycle-service level: 90% / 95% / 99% → Z = 1.28 / 1.65 / 2.33.                  |
| `DemandStdDev`    | Day-to-day demand std dev (use historical weekly variability).                         |
| `ReviewPeriod`    | How often you check inventory and reorder (default 7 = weekly).                        |

The √(lead-time / review-period) factor captures the "you might be
mid-cycle when demand spikes" risk — a longer lead time relative to your
review cadence demands more safety stock, but only as the square root.
Service-level Z-scores follow the SCOR model and the APICS CSCP body of
knowledge. Health bands: 🟢 ≥ 95% · 🟡 90% · 🟠 85% · 🔴 < 85%.

## Limitations & When Not To Use

The model assumes demand is **stationary** — no trend, no seasonality.
For fashion, holiday, or any SKU with a 3×+ demand swing, multiply the
base lead-time demand by a seasonal index before plugging in. For
perishables, also subtract residual shelf life. The model is per-SKU;
**aggregate the math per SKU and sum** — never compute ROP on a category
total or the safety stock will be wildly wrong.

## Worked Example

A DTC brand moves 50 units/day, 14-day supplier lead time, 95% service
level (Z = 1.65), 10 units/day demand std dev, 7-day review cadence:

1. `LeadTimeDemand` = 50 × 14 = **700 units**
2. `SafetyStock` = 1.65 × 10 × √(14/7) = 1.65 × 10 × 1.414 ≈ **23 units**
3. `ReorderPoint` = 700 + 23 = **723 units** → fire PO when stock hits 723.
4. What-If: lead time doubles to 28 days → ROP becomes 1,433 units,
   safety stock grows by only 10 units (the √2 factor, not 2×).
5. Pair with **Stockout Cost Calculator**: 723-unit threshold means ~51
   orders/year with 1,200 units of buffer — quantify the avoided lost
   sales to justify the safety-stock investment to finance.
