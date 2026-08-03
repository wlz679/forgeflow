---
slug: 'solopreneur-email-list-revenue-calculator'
engine_ref: 'solopreneur-email-list-revenue-calculator'
category_id: 'D'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'ConvertKit — Creator Email Revenue Benchmarks & $/Subscriber'
    url: 'https://convertkit.com/'
  - name: 'beehiiv — Newsletter Monetization & Open Rate Reports'
    url: 'https://www.beehiiv.com/'
  - name: 'Mailchimp — Email Marketing Benchmarks by Industry'
    url: 'https://mailchimp.com/resources/email-marketing-benchmarks/'
---

## What This Calculator Measures

Email list revenue is the **per-subscriber-per-year** dollar figure that
every newsletter operator, course creator, and ecommerce founder cares
about most. This calculator turns your list size, open rate, click rate,
conversion rate, average order value, and send frequency into the four
numbers that show whether your list is a real business or just a vanity
metric: **revenue per send**, **monthly revenue**, **annual revenue**,
and **$/subscriber/year**. It also projects list growth at a realistic
net-add rate and shows how many engaged subscribers you need to hit
$5K, $50K, or $100K/year. It is built for newsletter operators on
ConvertKit, beehiiv, Substack, Mailchimp, and Kit, plus any creator using
email as the primary distribution channel.

## How It Works (Methodology)

The four-stage funnel every ESP tracks in its analytics dashboard:

```
Opens        = Subscribers × (OpenRate ÷ 100)
Clicks       = Opens × (ClickRate ÷ 100)
Conversions  = Clicks × (ConversionRate ÷ 100)
RevenuePerSend = Conversions × AvgOrderValue
MonthlyRevenue = RevenuePerSend × EmailsPerMonth
AnnualRevenue  = MonthlyRevenue × 12
RevenuePerSubscriber = AnnualRevenue ÷ Subscribers
NetGrowthRate  = 10% − MonthlyUnsubscribeRate  // 10% acquisition baseline
```

| Variable             | Meaning                                                      |
| -------------------- | ------------------------------------------------------------ |
| `Subscribers`        | Total list size (engaged + dormant)                          |
| `OpenRate`           | % of subscribers who open a given send (industry 20-30%)     |
| `ClickRate`          | % of openers who click any link (typical 2-5% of opens)     |
| `ConversionRate`     | % of clickers who buy (typical 1-3%)                         |
| `AvgOrderValue`      | Mean purchase from email-driven traffic                      |
| `EmailsPerMonth`     | Send cadence (industry 2-8, sweet spot 4)                    |
| `UnsubscribeRate`    | Monthly churn (typical 0.3-1%)                               |

**Assumptions.** The model assumes the funnel metrics are independent
(open → click → convert), which is realistic for broadcast sends but
underestimates automated sequences where each step lifts the next. The
10% net monthly growth baseline assumes an active lead magnet and
consistent publishing; dormant lists grow much slower. Revenue is
gross — it does not deduct ESP fees (ConvertKit, beehiiv) or payment
processor fees (Stripe 2.9% + $0.30), which can total 4-8% combined.

## Limitations & When Not To Use

This calculator models **broadcast sends to the full list**. It is not
the right tool for sponsorship/revenue forecasting (where one placement
pays a flat CPM regardless of clicks), lead-magnet funnel modeling (which
needs its own stage-by-stage view), or B2B email sequences (where each
touchpoint has a different goal and offer). It also assumes a single
monetization model — most lists blend products, affiliate offers, and
sponsorships, so use the calculator to size the *product* slice. For
segmented lists, run the calculator once per segment (or once per
broadcast subgroup); the overall $/sub/yr figure should weight-average
across them. International creators should convert AOV and target
revenue to the same currency before inputting.

## Worked Example

A 10,000-subscriber newsletter on ConvertKit, 25% open rate (industry
average for engaged creator lists), 5% click rate (healthy), 2% click-to-
purchase conversion, $50 average order value, 4 emails per month, and
0.5% monthly unsubscribe rate:

1. `Opens` = 10,000 × 25% = **2,500 opens/send**
2. `Clicks` = 2,500 × 5% = **125 clicks/send**
3. `Conversions` = 125 × 2% = **2.5 sales/send**
4. `RevenuePerSend` = 2.5 × $50 = **$125/send**
5. `MonthlyRevenue` = $125 × 4 = **$500/mo**
6. `AnnualRevenue` = $500 × 12 = **$6,000/yr**
7. `RevenuePerSubscriber` = $6,000 ÷ 10,000 = **$0.60/sub/yr** (below the $1-2 baseline)

The calculator flags this as below industry benchmark and shows that
hitting $5K/year requires ~8,333 engaged subscribers, while $50K/year
needs ~83,333. With 9.5% net monthly growth (10% acquisition − 0.5%
churn), the list compounds to 29,715 subscribers in 12 months — which
at the same funnel metrics projects to **$17,829/yr**. To hit top-
quartile $/sub/yr ($5-20), segment by interest and past purchase history:
targeted sends routinely outperform broadcasts by 3-10x. Pair this with
the **Affiliate Income Calculator** if you also run an affiliate
recommendation block in each send.