---
slug: 'solopreneur-consent-revenue-impact-calculator'
engine_ref: 'solopreneur-consent-revenue-impact-calculator'
category_id: 'L'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'GDPR Recital 32 — Conditions for consent (cookie consent under ePrivacy)'
    url: 'https://gdpr-info.eu/recitals/no-32/'
  - name: 'IAB Europe — Transparency and Consent Framework (TCF) v2.2'
    url: 'https://iabeurope.eu/tcf-for-vendors/'
  - name: 'OneTrust — Consent rate benchmarks 2024'
    url: 'https://www.onetrust.com/blog/consent-rate-benchmarks/'
  - name: 'ICO — Cookies and similar technologies (detailed guidance)'
    url: 'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/cookies-and-similar-technologies/'
---

## What This Calculator Measures

Under GDPR ePrivacy Recital 32, EU/EEA visitors must give explicit consent before non-essential cookies fire. Visitors who reject marketing and analytics cookies convert at 40-60% lower rates than those who accept (per OneTrust 2024 benchmark). The Cookie Consent Revenue Impact calculator quantifies the monthly and annual revenue recoverable by closing the gap between your current consent rate and a realistic target, assuming €80 AOV (mid-market B2B SaaS ARPU benchmark). It is the revenue-side complement to the CMP ROI calculator (L-6) and helps Growth, Privacy, and Product teams align on consent-UX investment priorities.

## How It Works (Methodology)

```
consent_gap           = max(0, target_consent_rate_pct - current_consent_rate_pct)
recoverable_visitors  = monthly_visitors × (consent_gap / 100)
monthly_recovered     = recoverable_visitors × (conversion_rate_pct / 100) × aov
annual_recovered      = monthly_recovered × 12
```

| Variable                    | Meaning                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| `monthly_visitors`          | EU/EEA traffic (Google Analytics segment by EU geo)                                       |
| `current_consent_rate_pct`  | % of visitors clicking "Accept All" on the consent banner (CMP analytics, IAB TCF v2.2)  |
| `target_consent_rate_pct`   | Realistic upper bound — 70% per OneTrust 2024; >75% risks dark-pattern territory         |
| `conversion_rate_pct`       | Site-wide or EU-segmented conversion rate                                                |
| `aov` (€80, hardcoded)      | Mid-market B2B SaaS ARPU benchmark per spec                                              |

Bands: 🟢 Excellent <5pp gap · 🟡 Good 5-15pp · 🟠 Warning 15-30pp · 🔴 Critical ≥30pp.

## Limitations & When Not To Use

The AOV is hardcoded at €80 (mid-market B2B SaaS ARPU benchmark per spec); recovered revenue scales linearly with AOV — if your ARPU is €200, multiply the result by 2.5×. The model assumes consent-rejecting visitors do not convert at all; in practice some still complete purchases, so this is a conservative upper bound on lost revenue. Targeting consent rates above 75% crosses into dark-pattern territory — CNIL and ICO have issued fines for "consent by design" patterns that nudge toward acceptance — so the practical ceiling sits at 70%.

## Worked Example

A B2B SaaS with 200,000 EU visitors/month, 55% current consent rate, 75% target consent rate, 2% conversion, €80 AOV:

1. `consent_gap` = 75 - 55 = **20pp → 🟠 Warning**
2. `recoverable_visitors` = 200,000 × 0.20 = **40,000/mo**
3. `monthly_recovered` = 40,000 × 0.02 × €80 = **€64,000/mo**
4. `annual_recovered` = €64,000 × 12 = **€768,000/yr**

If consent climbs to 70% (gap = 5pp → 🟡 Good), the recoverable drops to €192,000/year. Premium CMP vendors typically lift consent rates by 10-15pp within 4-6 weeks, so closing the gap from 20pp to 5-10pp is operationally achievable. Pair with the CMP ROI Calculator (L-6) — a premium CMP unlocks that consent lift — and the Funnel Step Calculator (P-1), since the consent wall is the top step-leak for EU traffic.
