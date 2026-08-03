---
engine_ref: 'solopreneur-stripe-fee-calculator'
category_id: 'C'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-07-31'
sources:
  - name: 'Stripe Pricing — Standard US Rates'
    url: 'https://stripe.com/pricing'
  - name: 'PayPal Merchant Fees'
    url: 'https://paypal.com/us/webapps/mpp/paypal-fees'
  - name: 'Square Payment Processing Pricing'
    url: 'https://squareup.com/us/en/payments/pricing'
---

## What This Calculator Measures

Payment processing fees are the silent margin killer for online businesses. Stripe's headline rate is 2.9% + 30¢ per transaction, but actual effective rates swing wildly based on transaction size (fixed fees dominate small charges), international cards (add 1.5% surcharge), and monthly volume (negotiable above $50K MRR). This calculator compares 5 processors — Stripe US, Stripe International, PayPal, Square, Wise — at any charge amount, projects monthly + annual fee burden, and surfaces the **5 cheapest fee-reduction levers** for your specific scenario.

## How It Works (Methodology)

The fee decomposition:

```
PercentageFee = ChargeAmount × ProviderPercentage
FixedFee      = 0 or 30¢ (provider-specific; hasFixed flag)
TotalFee      = PercentageFee + FixedFee
NetReceived   = ChargeAmount − TotalFee
EffectiveRate = TotalFee ÷ ChargeAmount
```

| Provider                  | % Fee | Fixed | Best For                        |
| ------------------------- | ----- | ----- | ------------------------------- |
| Stripe US                 | 2.9%  | 30¢   | Standard SaaS / e-commerce      |
| Stripe International      | 4.4%  | 30¢   | Cross-border card charges       |
| PayPal                    | 3.5%  | 0¢    | Small transactions (<$5)        |
| Square                    | 2.6%  | 10¢   | In-person + online (omni)       |
| Wise                      | 1.5%  | 0¢    | US-to-US transfers (cheapest)   |

Annual projection = monthlyTransactions × monthlyGrossFee × 12. Savings scenarios: raise price $1, pass fees to customer, switch to annual billing (saves 11 fixed fees/year), negotiate 0.5% volume discount at $50K MRR, bundle 12 transactions into 1 annual charge.

## Limitations & When Not To Use

This calculator covers **standard card transactions** only. It does not model: (1) ACH / wire transfer fees (typically 0.8% capped at $5 for Stripe ACH), (2) chargeback fees ($15 per dispute regardless of outcome), (3) currency conversion fees (0.5% if you receive in non-account currency), (4) subscription billing dunning fees, (5) Connect / marketplace split-payment fees. For high-risk industries (CBD, gambling, adult), standard rates don't apply — processors charge 3.5-6% + higher fixed fees. Volume discounts shown are estimates; actual negotiation depends on industry, chargeback history, and processing volume mix. Always get written quotes from at least 2 providers before switching.

## Worked Example

Imagine a SaaS charging $100/mo subscriptions, processing 100 transactions/mo via Stripe US.

1. **Per-transaction fee** = $100 × 2.9% + $0.30 = **$3.20**
2. **Monthly gross** = $100 × 100 = **$10,000**
3. **Monthly fees** = $3.20 × 100 = **$320**
4. **Annual fees** = $320 × 12 = **$3,840/year**
5. **Wise comparison**: $100 × 1.5% = **$1.50/transaction** → $150/mo, $1,800/year — saves **$2,040/year**
6. **If you raise price by $3 (pass fees to customer)**: net stays at $100, fees absorbed by buyer

The **What-If** scenarios show that switching to Wise saves the most for pure US-to-US, but for businesses with international customers (where Wise's cross-border rates climb), Stripe's volume negotiation at $50K MRR is more practical. Pair with the **SaaS Valuation Calculator** to see how $2K/year fee savings compounds over a 5-year exit window.