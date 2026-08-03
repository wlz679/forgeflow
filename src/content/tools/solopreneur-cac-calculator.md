---
engine_ref: 'solopreneur-cac-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'OpenView SaaS Benchmarks 2026 — CAC by Channel'
    url: 'https://openviewpartners.com/blog/saas-benchmarks/'
  - name: 'SaaS Capital — CAC Payback Benchmarks'
    url: 'https://www.saas-capital.com/blog/lTV'
  - name: 'a16z — Cost of Customer Acquisition'
    url: 'https://a16z.com/marketplace-100/'
---

## What This Calculator Measures

Customer Acquisition Cost (CAC) is the total sales and marketing spend required to win one new paying customer. This calculator isolates blended CAC across all channels, then derives the **CAC payback period** — the number of months of gross profit needed to recover acquisition spend. CAC alone is meaningless: a $500 CAC is great if LTV is $3,000, disastrous if LTV is $300. Always evaluate CAC alongside LTV:CAC ratio (target ≥ 3:1) and payback (target ≤ 12 months).

## How It Works (Methodology)

The v3 blended-CAC formula:

```
CAC         = (MarketingSpend + SalesSpend) ÷ NewCustomers
GrossProfit = AvgRevenue × (GrossMargin ÷ 100)
Payback     = CAC ÷ GrossProfit  (months)
```

| Variable        | Meaning                                                       |
| --------------- | ------------------------------------------------------------- |
| `MarketingSpend`| Paid ads, content, SEO tools, events, marketing staff         |
| `SalesSpend`    | SDR/AE salaries, commissions, sales tools, CRM licenses        |
| `NewCustomers`  | Net new paying customers acquired in the same period          |
| `GrossMargin`   | % of revenue left after COGS (hosting, support, payment fees) |
| `AvgRevenue`    | Monthly revenue per customer                                  |

The calculator benchmarks blended CAC against SMB ($100-300), mid-market ($300-700), and enterprise ($700+) tiers. The **scenario strip** models 5 spend levels (cut 50% → double 200%) holding conversion rate constant to show whether scaling acquisition spend improves unit economics or just inflates CAC.

## Limitations & When Not To Use

Blended CAC hides channel-level variance: your SEO channel might be $50 CAC while LinkedIn ads are $500 — the $200 average looks fine but is masking a budget-allocation problem. Always instrument CAC **per channel** via UTM parameters and CRM lead source. This calculator also does not include founder time on sales calls (which for solopreneurs can be the largest single line item) — include imputed salary at your hourly rate × hours/month on sales. For pre-revenue startups with $0 marketing spend, CAC = $0 is technically correct but misleading: organic word-of-mouth has hidden opportunity cost.

## Worked Example

Imagine a B2B SaaS spending $5,000/mo on Google Ads + content, $3,000/mo on an SDR (part-time), and acquiring 40 new customers per month at $50/mo ARPU with 80% gross margin.

1. **Total Spend** = $5,000 + $3,000 = **$8,000**
2. **CAC** = $8,000 ÷ 40 = **$200 per customer**
3. **Gross Profit per Customer** = $50 × 80% = **$40/mo**
4. **Payback Period** = $200 ÷ $40 = **5.0 months** — healthy (under 12-month target)
5. **First-Year Value** = $50 × 12 × 80% = **$480 per customer** → LTV target at 3:1 = **$600**

If you cut spend 25% (focus on top channel): $6,000 total ÷ ~30 customers (proportional) = $200 CAC, but reduces total customers acquired. The scenario strip shows whether you should **scale spend** (when payback stays <12 months at higher spend) or **concentrate budget** on best channel.