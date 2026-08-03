---
slug: 'solopreneur-breach-notification-cost-calculator'
engine_ref: 'solopreneur-breach-notification-cost-calculator'
category_id: 'L'
reviewed_by: ['wlz']
author: 'wlz'
data_reviewed_at: '2026-08-03'
sources:
  - name: 'GDPR Article 33 — Notification of a personal data breach to the supervisory authority'
    url: 'https://gdpr-info.eu/art-33-gdpr/'
  - name: 'GDPR Article 34 — Communication of a personal data breach to the data subject'
    url: 'https://gdpr-info.eu/art-34-gdpr/'
  - name: 'ICO — Personal data breaches: a guide for organisations'
    url: 'https://ico.org.uk/for-organisations/guide-to-data-protection/guide-to-the-general-data-protection-regulation-gdpr/personal-data-breaches/'
  - name: 'ENISA Threat Landscape 2024 (mid-market incident benchmarks)'
    url: 'https://www.enisa.europa.eu/publications/enisa-threat-landscape-2024'
---

## What This Calculator Measures

Under GDPR Article 33, controllers must notify the supervisory authority within 72 hours of becoming aware of a personal data breach. Under Article 34, data subjects must be notified "without undue delay" if the breach is likely to result in a high risk to their rights. This calculator quantifies the annualized cost of breach notification and remediation — covering per-subject notification (postal letters, email, call-center, credit monitoring) plus per-breach remediation (forensics, legal counsel, regulator liaison, system hardening). It is a privacy-incident-exposure metric for DPOs, CISOs, and Heads of Risk at mid-market B2B SaaS.

## How It Works (Methodology)

```
notification_cost_per_breach = data_subjects_per_breach × notification_cost_per_subject
cost_per_breach             = notification_cost_per_breach + remediation_cost_per_breach
annual_breach_cost          = breaches_per_year × cost_per_breach
```

| Variable                       | Meaning                                                                                       |
| ------------------------------ | --------------------------------------------------------------------------------------------- |
| `breaches_per_year`            | Reportable breaches per year (GDPR Art. 4(12); ENISA 2024: 0.5-2 for mid-market SaaS)         |
| `data_subjects_per_breach`     | Average data subjects affected per breach                                                     |
| `notification_cost_per_subject`| Postal, email, call-center, credit monitoring (ICO 2024: £2-£8/subject B2C; €1-€3 B2B)        |
| `remediation_cost_per_breach`  | Forensics, legal, regulator liaison, hardening (ENISA 2024: €50K-€200K mid-market)            |

Bands: 🟢 Excellent <€50K/yr · 🟡 Good €50-250K · 🟠 Warning €250K-1M · 🔴 Critical ≥€1M.

## Limitations & When Not To Use

Notification cost varies by jurisdiction and audience: B2C postal campaigns cost €5-€10/subject, while B2B consolidated enterprise contracts run €1-€3/subject — adjust the input to match the affected population. Remediation is highly tail-driven: a single ransomware recovery can exceed €500K, so the annual average materially understates worst-case exposure. The model excludes the separate GDPR Art. 83 fine (pair with L-1 GDPR Fine Risk for true single-incident cost) and excludes the detection latency between breach occurrence and awareness — the 72-hour clock starts on awareness, not occurrence.

## Worked Example

A mid-market SaaS with 1 breach/yr, 50,000 subjects affected, €5/subject notification cost, €80,000 remediation per breach:

1. `notification_cost_per_breach` = 50,000 × €5 = **€250,000**
2. `cost_per_breach` = €250,000 + €80,000 = **€330,000**
3. `annual_breach_cost` = 1 × €330,000 = **€330,000 → 🟠 Warning**
4. If breach frequency drops to 0.3/yr (3 in 10 years), annual cost falls to **€99,000 (🟡 Good)** — a 70% reduction driven by control investment (MFA, EDR, tabletop exercises).

To reach 🟢 Excellent (<€50K), subject reduction alone is infeasible here because remediation (€80K) already exceeds the threshold — the easier path is reducing breach frequency. Pair with the GDPR Fine Calculator (L-1) — a single breach can fill the entire violations budget — and the NRR Calculator (R-1), since breach disclosure typically causes a 5-10pp NRR drop in the 12 months following the incident.
