---
slug: 'solopreneur-cmp-roi-calculator'
engine_ref: 'solopreneur-cmp-roi-calculator'
category_id: 'L'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'OneTrust — Consent rate benchmarks 2024'
    url: 'https://www.onetrust.com/blog/consent-rate-benchmarks/'
  - name: 'Didomi — CMP pricing comparison 2024'
    url: 'https://www.didomi.io/blog/cmp-pricing-comparison'
  - name: 'Cookiebot — CMP overview and pricing'
    url: 'https://www.cookiebot.com/en/cmp/'
  - name: 'IAB Europe — Transparency and Consent Framework (TCF) v2.2'
    url: 'https://iabeurope.eu/tcf-for-vendors/'
  - name: 'GDPR Article 7 — Conditions for consent'
    url: 'https://gdpr-info.eu/art-7-gdpr/'
---

## What This Calculator Measures

A Consent Management Platform (CMP) — OneTrust, Didomi, Cookiebot, Iubenda, Usercentrics — handles cookie consent UX, DSAR workflow automation, and consent logging at scale. The CMP ROI calculator quantifies the annual return on a CMP from DSAR automation savings minus the platform cost, expressed as a percentage. It is a procurement-side metric for DPOs, Privacy Officers, and Procurement: payback under 6 months is procurement-ready, over 12 months needs a stronger business case (typically higher DSAR volume or richer automation scope). Mid-market CMP subscriptions range from €200/month (Cookiebot) to €3,000/month (OneTrust Pro) per 2024 vendor benchmarks.

## How It Works (Methodology)

```
dsar_annual_savings   = dsars_per_month × 12 × hours_per_dsar × (automation_uplift_pct / 100) × hourly_rate_dpo
cmp_annual_cost       = cmp_monthly_cost × 12
net_annual_savings    = dsar_annual_savings - cmp_annual_cost
roi_pct               = (net_annual_savings / cmp_annual_cost) × 100
payback_months        = cmp_annual_cost / (dsar_annual_savings / 12)
```

| Variable                  | Meaning                                                                            |
| ------------------------- | ---------------------------------------------------------------------------------- |
| `cmp_monthly_cost`        | Subscription €/mo (OneTrust Pro ~€1,500, Didomi ~€800, Cookiebot ~€200, 2024 data) |
| `dsars_per_month`         | Monthly DSAR volume                                                                |
| `hours_per_dsar`          | Manual hours per DSAR before CMP                                                    |
| `hourly_rate_dpo`         | Fully-loaded DPO rate (EU mid-market: €80-€150/hr)                                 |
| `automation_uplift_pct`   | Share of DSAR workflow the CMP handles (OneTrust 2024: 40-55%, Cookiebot: 20-30%)  |

Bands: 🟢 Excellent ROI ≥400% · 🟡 Good 150-400% · 🟠 Warning 50-150% · 🔴 Critical <50%.

## Limitations & When Not To Use

The model isolates DSAR automation savings only — it does not include the consent-revenue lift from higher "Accept All" rates (€10-30K/month for mid-market SaaS per OneTrust 2024, modeled in L-3 Cookie Consent Revenue Impact), vendor consolidation savings, or audit-readiness value. Automation uplift is vendor- and use-case-specific: OneTrust Pro delivers 40-55% on enterprise-grade DSAR, while basic Cookiebot sits at 20-30% — always source the uplift from vendor benchmarks, not aspirational estimates. The calculator excludes one-time migration cost (implementation, training, TCF v2.2 re-certification), which typically runs 10-20% of the first-year subscription.

## Worked Example

A mid-market SaaS evaluating a CMP at €1,200/month, with 50 DSARs/month, 2.5 hr/DSAR, €95/hr DPO, and 40% automation uplift:

1. `dsar_annual_savings` = 50 × 12 × 2.5 × 0.40 × €95 = **€57,000**
2. `cmp_annual_cost` = €1,200 × 12 = **€14,400**
3. `net_annual_savings` = €57,000 - €14,400 = **€42,600**
4. `roi_pct` = €42,600 / €14,400 = **295.8% → 🟡 Good**
5. `payback_months` = €14,400 / (€57,000 / 12) = **3.0 months**

To reach 🟢 Excellent (ROI ≥ 400%), the easier path is raising automation uplift to 50.5% (current 40%, +10.5pp) — well within the OneTrust 2024 benchmark range. Pair with the DSAR Processing Cost Calculator (L-2) for baseline privacy-ops cost and the Cookie Consent Revenue Impact Calculator (L-3) for the revenue lift from a higher consent rate; together they give the full business case for a CMP investment.
