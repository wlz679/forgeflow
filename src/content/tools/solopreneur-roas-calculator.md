---
slug: 'solopreneur-roas-calculator'
engine_ref: 'solopreneur-roas-calculator'
category_id: 'M'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Meta Business Help — Ads Performance Measurement'
    url: 'https://www.meta.com/business/help/430291176997522/'
  - name: 'Google Ads Help — Return on Ad Spend (ROAS)'
    url: 'https://support.google.com/google-ads/answer/14090053'
  - name: 'HubSpot — How to Calculate ROAS'
    url: 'https://blog.hubspot.com/marketing/roas'
  - name: 'Shopify — Return on Ad Spend (ROAS) Guide'
    url: 'https://www.shopify.com/blog/roas'
---

## What This Calculator Measures

Return on Ad Spend (ROAS) measures the gross revenue generated for every
dollar spent on advertising, and — once you factor in gross margin — also
surfaces the net-profit contribution of that same spend. It isolates the
question every paid-media manager faces: "If I spend another $1,000 on
this campaign tomorrow, how much gross (and net) return should I expect?"
Pair it with **Customer Acquisition Cost (CAC)** when you need the unit-
economics view instead of the top-line revenue view.

## How It Works (Methodology)

The v3 standard formulas:

```
Gross ROAS    = Revenue / AdSpend
Net Profit    = (Revenue × GrossMargin%) − AdSpend
Net ROAS %    = ((Revenue × GrossMargin%) − AdSpend) / AdSpend × 100
Effective CPM = (AdSpend / Revenue) × 1000   (cost per $1000 of revenue)
```

| Variable        | Meaning                                                                                    |
| --------------- | ------------------------------------------------------------------------------------------ |
| `AdSpend`       | Total paid-media spend in the same period (Meta, Google, TikTok, LinkedIn, etc.)          |
| `Revenue`       | Gross revenue attributed to that spend inside your chosen attribution window               |
| `GrossMargin`   | Gross margin % (1 − COGS%) — what fraction of every revenue dollar survives after product cost |
| `Net Profit`    | Cash left over after paying both ad spend and cost-of-goods                                |

Health bands: 🟢 ≥ 4.0x · 🟡 2.0–4.0x · 🟠 1.0–2.0x · 🔴 < 1.0x.

The `Attribution Window` input is preserved as a model assumption: Meta
defaults to 7-day click, Google Ads to 28-day click, and B2B or high-AOV
funnels often extend to 90 days. The ratio itself does not change with
the window, but the **time horizon over which you should re-measure** does.

## Limitations & When Not To Use

ROAS flatters campaigns that drive high-revenue but low-margin orders
(the classic "loss-leader" SKU). If your catalog has wide margin
dispersion, run **Net ROAS** instead and exclude loss-leaders from the
media plan. ROAS is also single-channel — for cross-channel
incremental lift you need a geo holdout or switch to Marketing Mix
Modeling (MMM). Finally, last-click ROAS overstates channels that close
but underclaims awareness channels like YouTube or podcast; pair this
calculator with a multi-touch attribution view before reallocating budget.

## Worked Example

Imagine a DTC skincare brand running Meta ads: $10,000 ad spend,
$45,000 attributed revenue, 60% gross margin:

1. `Gross ROAS` = $45,000 / $10,000 = **4.5x** (🟢 excellent band)
2. `Net Profit` = ($45,000 × 0.60) − $10,000 = $27,000 − $10,000 = **$17,000**
3. `Net ROAS %` = $17,000 / $10,000 × 100 = **170%** net return
4. `Effective CPM` = ($10,000 / $45,000) × 1000 = **$222** per $1,000 of revenue

The Dashboard section shows a 2x scale-up projection (would $20K ad
spend yield $90K revenue if the curve holds?) and a break-even
revenue threshold ($16,667 — the revenue at which Net ROAS = 0%).
Pair with **Cohort Retention** to confirm those buyers repeat-purchase
before scaling spend.
