---
slug: 'solopreneur-ltv-by-channel-calculator'
engine_ref: 'solopreneur-ltv-by-channel-calculator'
category_id: 'M'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ProfitWell — CAC by Channel'
    url: 'https://www.profitwell.com/blog/cac-by-channel'
  - name: 'HubSpot — Customer Acquisition Cost'
    url: 'https://www.hubspot.com/marketing/cac'
  - name: 'SaaStr — How to Think About Customer Acquisition Cost'
    url: 'https://www.saastr.com/customer-acquisition-cost/'
  - name: 'ChartMogul — LTV:CAC Benchmarks'
    url: 'https://chartmogul.com/'
---

## What This Calculator Measures

LTV by Channel compares up to 5 paid channels on a single, decision-ready
axis: the LTV:CAC ratio — i.e. lifetime value earned per customer divided
by the cost to acquire that customer. It is the canonical "where should
the next dollar go?" question for performance marketers, because
top-of-funnel volume alone hides unit-economics damage. Pair it with
**LTV Cohort** when you need to verify the LTV figure itself, or with
**Multi-Touch Attribution** when you suspect last-click is mis-attributing
assisted conversions.

## How It Works (Methodology)

The v3 standard formulas (per channel):

```
CAC       = ChannelSpend / Conversions
LTV:CAC   = LTVperUser / CAC
BlendedCAC = TotalSpend / TotalConversions (across all 5 channels)
```

| Variable          | Meaning                                                                                  |
| ----------------- | ---------------------------------------------------------------------------------------- |
| `ChannelSpend`    | Total ad spend on that channel in the measurement window (e.g. last 30 days)            |
| `Conversions`     | New customers acquired from that channel (NOT total orders — repeat buyers excluded)    |
| `LTVperUser`      | Predicted lifetime gross margin per acquired customer for that cohort                    |
| `LTV:CAC`         | The "rule of 3" benchmark: ≥ 3x is healthy; < 1x means each new customer loses money    |

Health bands (LTV:CAC): 🟢 ≥ 3.0x · 🟡 1.0–3.0x · 🟠 0.5–1.0x · 🔴 < 0.5x.

The Calculator surfaces a ranked table (best LTV:CAC at top), a blended
CAC across all 5 channels, and a reallocation suggestion: shift spend
from the lowest-ratio channel into the highest until that channel's ratio
falls below the 3x line.

Source for these benchmarks: Shopify's LTV guides for ecommerce, ChartMogul's SaaS LTV benchmarks by acquisition channel (organic, paid, referral), Recurly's subscription LTV analysis, and Customer Lifetime Value research from Harvard Business Review (freemium vs paid LTV differentials).

## Limitations & When Not To Use

LTV per user must be a **forward-looking** estimate that includes
predicted repeat purchases and gross margin — not just the first-order
revenue. If you only have first-order AOV in the LTV field, the ratio
will look much worse than reality. Also, LTV:CAC ignores **time**:
a channel with 4x LTV:CAC but 18-month payback is worse than a channel
with 2.5x and 3-month payback. For payback-aware comparison, layer the
**CAC Payback** calculator on top.

## Assumptions

- `LTV is forward-looking estimate based on observed retention + ARPU over a fixed time window (12-24 months typical); past behavior does not guarantee future retention.`
- `Channel attribution assumes first-touch (channel-of-acquisition) — last-touch LTV would assign all revenue to the final channel before purchase; choose model that matches your measurement framework.`
- `Discount rate (when used) defaults to 10% annual; for SaaS with negative working capital, use higher rate (15-20%); for e-commerce, use lower rate (5-8%).`

## Common Mistakes

- `Comparing LTV across channels with different attribution windows — organic LTV typically 24-36 month window, paid LTV often only 6-12 months; normalize before comparison.`
- `Ignoring CAC payback period — high-LTV channels with high CAC may have longer payback; pair with CAC payback calculator for full ROI picture.`
- `Treating gross LTV as net — gross LTV is total revenue; net LTV subtracts CAC + COGS + retention costs; only net LTV is comparable to CAC.`

## Worked Example

Imagine a SaaS running 4 paid channels with the following 30-day
numbers (LTV pulled from the cohort retention calc, predicted 24-month
gross margin per user):

| Channel    | Spend  | Conv | LTV/user | CAC      | LTV:CAC |
| ---------- | ------ | ---- | -------- | -------- | ------- |
| Google     | $1,000 | 50   | $500     | $20.00   | 25.0x 🟢|
| Meta       | $1,500 | 30   | $800     | $50.00   | 16.0x 🟢|
| LinkedIn   | $  800 | 20   | $600     | $40.00   | 15.0x 🟢|
| TikTok     | $1,200 | 40   | $400     | $30.00   | 13.3x 🟢|
| Reddit     | $  600 | 15   | $700     | $40.00   | 17.5x 🟢|

All five clear the 3x bar, so the reallocation suggestion is to
**scale uniformly** rather than reallocate, and run a payback-month
analysis to confirm which channel recoups fastest. If Reddit had
LTV/user = $70 instead (LTV:CAC = 1.75x 🟡), the engine would flag it
as the candidate to pause or restructure.
