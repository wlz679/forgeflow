---
slug: 'solopreneur-dsar-cost-calculator'
engine_ref: 'solopreneur-dsar-cost-calculator'
category_id: 'L'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'GDPR Article 15 — Right of access by the data subject (official consolidated text)'
    url: 'https://gdpr-info.eu/art-15-gdpr/'
  - name: 'ICO — Right of access (detailed guidance for organisations)'
    url: 'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/individual-rights/right-of-access/'
  - name: 'IAPP 2024 Privacy Operations Survey'
    url: 'https://iapp.org/news/a/2024-privacy-operations-survey/'
  - name: 'OneTrust — DSAR Automation product page (uplift benchmarks)'
    url: 'https://www.onetrust.com/products/dsar-automation/'
---

## What This Calculator Measures

Data Subject Access Requests (DSARs) under GDPR Article 15 are a fixed operational cost: every EU data subject can ask what you hold on them, get a copy, and demand correction or deletion. The DSAR Processing Cost calculator quantifies the annualized labor cost of fulfilling those requests given your monthly volume, manual hours, DPO hourly rate, and current automation level. It is a run-rate privacy-ops budget metric for DPOs and Heads of Privacy at mid-market B2B SaaS, sized to the typical 30-100 DSARs/month range reported in the IAPP 2024 Privacy Operations Survey.

## How It Works (Methodology)

```
manual_hours_per_dsar = hours_per_dsar × (1 - automation_pct / 100)
cost_per_dsar         = manual_hours_per_dsar × hourly_rate_dpo
annual_cost           = dsars_per_month × 12 × manual_hours_per_dsar × hourly_rate_dpo
```

| Variable             | Meaning                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------- |
| `dsars_per_month`    | Average monthly DSAR volume (privacy ticketing system; IAPP 2024: 30-100 for mid-market) |
| `hours_per_dsar`     | Avg manual hours per fulfillment — search + redaction + reply (ICO: 2-4 hr baseline)     |
| `hourly_rate_dpo`    | Fully-loaded DPO rate (EU mid-market: €80-€150/hr incl. benefits + overhead)              |
| `automation_pct`     | Share of workflow handled by tooling (OneTrust 2024: 30-60% realistic; 0% = fully manual) |

Bands: 🟢 Excellent <€25K/yr · 🟡 Good €25-100K · 🟠 Warning €100-300K · 🔴 Critical ≥€300K.

## Limitations & When Not To Use

The model excludes non-labor costs: redaction-tooling subscriptions, secure file-transfer infrastructure, and training overhead are not included. DSAR volume can spike sharply — post-CMP rollout, post-breach disclosure, or after regulatory action often doubles or triples monthly volume for one to two quarters — so the annual cost can run materially above the steady-state estimate. The automation % is self-reported and tends to be optimistic; 30% on paper often equals 10-15% in practice, so consider a 0.7-0.8× haircut before committing savings to budget.

## Worked Example

A mid-market B2B SaaS with 50 DSARs/month, 2.5 hr/DSAR, €95/hr DPO rate, 30% automation:

1. `manual_hours_per_dsar` = 2.5 × (1 - 0.30) = **1.75 hr**
2. `cost_per_dsar` = 1.75 × €95 = **€166**
3. `annual_cost` = 50 × 12 × 1.75 × €95 = **€99,750 → 🟡 Good**
4. If automation climbs to 60% (template responses + auto-discovery), manual hours drop to 1.00 and annual cost falls to **€57,000 (🟡 Good, lower band)**
5. To reach 🟢 Excellent (<€25K), automation must reach roughly 82% or DSAR volume must drop to ≤13/month.

Pair with the CMP ROI Calculator (L-6) — a CMP reduces DSAR volume by 30-50% via consent logging — and the Cost-per-Ticket Calculator to size the broader privacy-ops budget.
