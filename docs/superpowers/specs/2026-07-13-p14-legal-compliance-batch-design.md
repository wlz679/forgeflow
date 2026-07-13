# P14 Legal & Compliance Calculator Batch — Design Spec

> **Status**: Draft (P14 series, vertical-depth batch #12)
> **Author**: ForgeFlowKit Team
> **Date**: 2026-07-13
> **Pattern**: P-series vertical-depth batch (P4-P13 shipped, P14 is #12)

---

## 1. Overview

### 1.1 What

**P14 Legal & Compliance Calculator Batch** — 6 new calculators in NEW 'L' Legal & Compliance category, completing the **data-privacy & compliance** dimension of the ForgeFlowKit suite. Closes the **compliance-cost loop** that touches every B2B SaaS deal: GDPR fines, DSAR handling, cookie consent impact, DPA negotiation cost, breach notification cost, and CMP platform ROI all have a quantitative anchor.

### 1.2 Why

Currently 14 categories live (A B C D E F H K M O P R S T), totaling **92 engines**. Vertical-depth pattern has shipped 11 batches (P4-P13), each filling a customer-journey or operations decision-making dimension:

| Batch | Vertical | Persona | Closes loop |
|-------|----------|---------|-------------|
| P4 | Investment/Finance (B/F subset) | Founder | unit economics |
| P5 | Real Estate | Real-estate investor | alternative asset |
| P6 | Marketing Analytics | Growth/CMO | acquisition |
| P7 | Operations/Inventory | Ops manager | inventory cost |
| P8 | Sales/CRM | RevOps | deal closing |
| P9 | Retention/CS | CSM | customer keep |
| P10 | Product Analytics | PM | in-product engagement |
| P11 | Hiring/Team | People-ops | team scaling |
| P12 | Customer Support (NEW) | Head of CS / CS Ops | service ops cost |
| P13 | Knowledge/Documentation (NEW) | DevRel Lead / Tech Writer | KB upstream quality |
| **P14** | **Legal & Compliance (NEW)** | **DPO / Privacy Officer** | **compliance cost & revenue protection** |

**Gap addressed**: No existing calculator quantifies the **compliance cost stack** for mid-market B2B SaaS. GDPR fines are public (up to 4% global revenue per Art. 83(5)); DSAR handling averages 2.5 hours/DSAR (IAPP 2024); CMP platforms cost €800-€2,000/mo mid-market (OneTrust/Didomi pricing). Without quantitative anchors, DPOs over-invest in DSAR volume or under-invest in CMP — P14 closes this gap.

### 1.3 Persona anchor

**Mid-market B2B SaaS, $10M-$50M ARR, 50-200 employees, EU-headquartered (or selling ≥30% to EU), Series A-B.** Every description includes this persona string.

**Primary reader**: DPO (Data Protection Officer) · Privacy Officer · Head of Privacy. Secondary: General Counsel (GC) evaluating compliance ROI; CFO modeling compliance cost; CISO when scope overlaps SOC2 (out-of-scope for P14).

### 1.4 Funnel closure — explicit cross-links

```
P14 compliance upstream         →    cross-P service/revenue downstream
────────────────────────────────────────────────────────────────────────
L-1 GDPR Fine Risk              →    P9 Retention (fines → trust loss)
L-2 DSAR Cost                   →    P12 Support (DSAR are tickets)
L-3 Cookie Consent Revenue      →    P6 Marketing (consent → conversion)
L-4 DPA Negotiation Cost        →    P8 Sales (DPA cards deal cycles)
L-5 Breach Notification         →    L-1 Fine (breach triggers fine)
L-5 Breach Notification         →    P9 Retention (breach → churn)
L-6 CMP ROI                     →    L-2 DSAR Cost (CMP reduces DSAR hours)
L-6 CMP ROI                     →    P5 Investment (platform ROI framework)
```

**Most important pairing**: **L-5 Breach Notification → L-1 GDPR Fine → P9 Retention** — a breach event triggers a fine AND a customer-trust collapse. Quantifying this chain is the single most valuable DPO insight.

---

## 2. Roster — 6 Calculators

Each calc forms a **privacy compliance cost funnel**:

```
L-1 Fine Risk ←── L-5 Breach Notification (post-incident)
   ↑
L-2 DSAR Cost (operational) ←── L-6 CMP ROI (investment to reduce)
   ↑
L-3 Consent Revenue (revenue protected) ←── L-4 DPA Negotiation (sales-protected)
```

**Total inputs across 6 calcs: 26** (4 + 4 + 4 + 5 + 4 + 5 = 26).

| # | Calc | Slug | Inputs | Canonical |
|---|------|------|--------|-----------|
| 1 | GDPR Fine Risk | `solopreneur-gdpr-fine-calculator` | 4 | €1.6M exposure / ratio 0.64% (🟡) |
| 2 | DSAR Processing Cost | `solopreneur-dsar-cost-calculator` | 4 | €99,750/yr (🟡) |
| 3 | Cookie Consent Revenue Impact | `solopreneur-consent-revenue-impact-calculator` | 4 | €64K/mo recovery / gap 20pp (🟠) |
| 4 | DPA Negotiation Cost | `solopreneur-dpa-cost-calculator` | 5 | €336K/yr (🟠) |
| 5 | Data Breach Notification Cost | `solopreneur-breach-notification-cost-calculator` | 4 | €330K/yr (🟠) |
| 6 | CMP ROI | `solopreneur-cmp-roi-calculator` | 5 | €42.6K net / 296% ROI (🟡) |

**Cross-link natural pairs**:
- L-1 ↔ L-3: fine risk ↑ → consent management investment ↑
- L-5 ↔ L-1: breach × breach-cost → fine-risk ↑ (both financial)
- L-6 ↔ L-2: CMP uplift reduces DSAR hours → CMP ROI ↑ as DSAR cost ↓
- L-4 ↔ P8: DPA rounds × redlines → sales-cycle extension cost
- L-3 ↔ P6: consent gap × visitors × ARPU → conversion revenue loss

---

## 3. Per-Calc Detail

### 3.1 GDPR Fine Risk (Annual exposure)

**Question**: "What is our annualized GDPR fine exposure given current violation rate?"

**Inputs** (4):
- `annual_revenue_global` (number, €, e.g. 25000000) — global annual revenue (under GDPR jurisdiction; EU + EU-targeted revenue for non-EU companies)
- `max_fine_pct` (select: '4%' / '2%' / '1%' / '0.5%'; default '4%') — GDPR Art. 83 fine tier; 4% = Art. 83(5) substantive violations, 2% = Art. 83(4) procedural, 1% = mixed average
- `violations_per_year` (number, e.g. 2) — annual count of reportable privacy violations
- `industry_risk_multiplier` (select: SaaS 0.8 / FinTech 1.0 / HealthTech 1.4 / AdTech 1.6; default 0.8) — industry-risk adjustment; HealthTech/AdTech face higher scrutiny per IAPP 2024

**Math**:
```
max_fine_amount = annual_revenue_global × (max_fine_pct / 100)
per_violation_expected = max_fine_amount × industry_risk_multiplier
annual_exposure = per_violation_expected × violations_per_year
exposure_ratio = annual_exposure / annual_revenue_global
```

**4-band (HIGHER on exposure_ratio — higher exposure = worse; critical threshold 2% — typical EU enforcement has not exceeded this in past 5 years except against Big Tech)**:
- 🟢 Excellent: ratio < 0.25% (low exposure, mature compliance)
- 🟡 Good: 0.25% ≤ ratio < 1% (manageable exposure)
- 🟠 Warning: 1% ≤ ratio < 2% (significant exposure)
- 🔴 Critical: ratio ≥ 2% (severe exposure, fine-tier cap likely to hit)

**Canonical**: revenue=€25M, max_fine_pct=4%, violations=2, industry=SaaS (0.8) → max_fine=€1M · per_violation=€800K · annual_exposure=**€1.6M**, exposure_ratio=€1.6M / €25M = **0.64%** → **🟡 Good**

**6 v3 sections**:
- Health: GDPR Fine Risk 🟡 Good (annual exposure €1.6M / 0.64% of revenue)
- Snapshot: €25M global revenue · 2 violations/yr · 4% cap tier · SaaS industry (0.8×) · per-violation €800K · annual exposure €1.6M
- What-If: If violations drop to 1/yr, annual exposure drops to €800K (0.32% — 🟢 Excellent); invest in DSAR automation + CMP to halve violation rate
- Break-Even: To hit 🟢 Excellent (<0.25%), need ~1 violation/yr OR move to 2% tier (procedural-only violations)
- Milestone: Re-baseline annually + after any material breach; ICO publishes quarterly enforcement summaries
- Tip: Pair with L-5 Breach Notification — a single breach can fill the violations budget. Also pair with P9 Retention (fines compound with churn).

**Sources**: ICO GDPR fines guide 2024 · IAPP Privacy Enforcement Atlas 2024 · GDPR Art. 83 (full text) · IAPP-Gartner AI Governance report

### 3.2 DSAR Processing Cost

**Question**: "What does our annual DSAR (Data Subject Access Request) handling cost?"

**Inputs** (4):
- `dsars_per_month` (number, e.g. 50) — average DSARs received per month (GDPR Art. 12-22; California CCPA analog)
- `hours_per_dsar` (number, e.g. 2.5) — average hours to fulfill one DSAR (search systems + redact + format + deliver); IAPP 2024 reports 2-4 hr
- `hourly_rate_dpo` (number, €/hr, e.g. 95) — fully-loaded DPO/legal-ops hourly rate (mid-market EU benchmark)
- `automation_pct` (number, %, e.g. 30) — % of DSARs partially automated (search/retrieval tools); 0% = pure manual, 100% = fully automated

**Math**:
```
manual_hours_per_dsar = hours_per_dsar × (1 - automation_pct / 100)
annual_cost = dsars_per_month × 12 × manual_hours_per_dsar × hourly_rate_dpo
cost_per_dsar = manual_hours_per_dsar × hourly_rate_dpo
```

**4-band (HIGHER on annual_cost — higher cost = worse operational exposure)**:
- 🟢 Excellent: < €25K/yr (low DSAR volume or high automation)
- 🟡 Good: €25K ≤ cost < €100K (manageable)
- 🟠 Warning: €100K ≤ cost < €300K (significant operational load)
- 🔴 Critical: cost ≥ €300K (DSAR is consuming disproportionate resources)

**Canonical**: dsars=50/mo · hours=2.5 · rate=€95 · automation=30% → manual_hours=1.75 · cost_per_dsar=€166.25 · annual_cost = 50 × 12 × 1.75 × 95 = **€99,750** → **🟡 Good**

**6 v3 sections**:
- Health: DSAR Cost 🟡 Good (€99,750/yr · €166/DSAR)
- Snapshot: 50 DSAR/mo · 2.5 hr/DSAR · 30% automated · 1.75 manual hours · €95/hr · €99,750/yr
- What-If: If automation climbs to 60%, manual hours drop to 1.0, annual cost drops to €57K (🟢 Excellent)
- Break-Even: To hit 🟢 (<€25K), need automation ≥85% OR DSARs ≤13/mo (usually impossible without rejecting requests — illegal)
- Milestone: Benchmark quarterly against IAPP DSAR Survey; track per-DSAR hours to identify automation ROI
- Tip: Pair with L-6 CMP ROI — automation tools that handle DSAR request intake reduce hours-per-DSAR by 40-60%. Also P12 Support (DSARs are tickets).

**Sources**: IAPP DSAR Operations Benchmark 2024 · GDPR Art. 12-22 · OneTrust DSAR automation case study · IAPP-EY Annual Privacy Survey 2024

### 3.3 Cookie Consent Revenue Impact

**Question**: "How much revenue is lost due to low cookie consent rates?"

**Inputs** (4):
- `monthly_visitors` (number, e.g. 200000) — total monthly unique visitors
- `current_consent_rate_pct` (number, %, e.g. 55) — % who click "Accept All" on CMP banner; mid-market EU baseline 50-65%
- `target_consent_rate_pct` (number, %, e.g. 75) — target consent rate (best-practice 70-80% with UX optimization)
- `conversion_rate_pct` (number, %, e.g. 2.0) — % of consenting visitors who convert to paid

**Math**:
```
consent_gap_pp = target_consent_rate_pct - current_consent_rate_pct
monthly_recoverable_visitors = monthly_visitors × (consent_gap_pp / 100)
monthly_recovered_revenue = monthly_recoverable_visitors × (conversion_rate_pct / 100) × avg_order_value
annual_recovered_revenue = monthly_recovered_revenue × 12
```

**4-band (INVERSE on consent_gap_pp — larger gap = worse revenue exposure; critical threshold 30pp — gap > 30pp indicates severe UX failure)**:
- 🟢 Excellent: gap < 5pp (consent near target)
- 🟡 Good: 5pp ≤ gap < 15pp
- 🟠 Warning: 15pp ≤ gap < 30pp
- 🔴 Critical: gap ≥ 30pp (significant revenue loss)

**Canonical**: visitors=200K · current=55% · target=75% · conv=2% · AOV=€80 → gap=20pp → monthly_recoverable=200K × 0.20 = 40K · monthly_recovered=40K × 0.02 × 80 = **€64,000/mo**, annual = **€768,000/yr**, gap=20pp → **🟠 Warning**

**6 v3 sections**:
- Health: Consent Revenue 🟠 Warning (20pp gap · €768K/yr recoverable)
- Snapshot: 200K visitors/mo · 55% consent · 75% target · 2% conv · €80 AOV · 20pp gap · €64K/mo recoverable · €768K/yr
- What-If: If consent climbs to 70% (gap=5pp, 🟡), recoverable drops to €192K/yr (still meaningful but manageable)
- Break-Even: To hit 🟢 (<5pp gap), need current ≥70% — usually requires UX overhaul + CMP premium tier
- Milestone: A/B test CMP banner UX quarterly; GDPR enforcement on "dark patterns" increased 2024
- Tip: Pair with L-6 CMP ROI — premium CMP tiers (OneTrust Pro) lift consent 10-15pp; ROI often €4-€6 per €1 spent. Also P6 Marketing (consent → conversion funnel).

**Sources**: OneTrust Consent & UX Report 2024 · Cookiebot industry benchmark · IAB Europe consent rate study 2024 · EDPB dark patterns guidance 2024

### 3.4 DPA Negotiation Cost

**Question**: "What does our annual DPA (Data Processing Agreement) negotiation cost?"

**Inputs** (5):
- `dpas_per_quarter` (number, e.g. 40) — DPAs negotiated per quarter (new vendor + customer DPAs)
- `avg_negotiation_rounds` (number, e.g. 4) — average back-and-forth rounds per DPA (1 = accept template, 8+ = heavy)
- `hours_per_round` (number, e.g. 1.5) — legal hours per round
- `legal_hourly_rate` (number, €/hr, e.g. 250) — fully-loaded legal/privacy hourly rate
- `redlines_per_dpa` (number, e.g. 8) — average redlines proposed per DPA (complexity proxy)

**Math**:
```
base_hours = avg_negotiation_rounds × hours_per_round
redline_multiplier = 1 + (redlines_per_dpa × 0.05)  # +5% per redline
annual_dpa_cost = dpas_per_quarter × 4 × base_hours × legal_hourly_rate × redline_multiplier
cost_per_dpa = base_hours × legal_hourly_rate × redline_multiplier
```

**4-band (HIGHER on annual_dpa_cost — higher cost = worse scaling of legal ops)**:
- 🟢 Excellent: < €100K/yr
- 🟡 Good: €100K ≤ cost < €300K
- 🟠 Warning: €300K ≤ cost < €600K
- 🔴 Critical: cost ≥ €600K (legal ops is DPA-bound)

**Canonical**: dpas=40/q · rounds=4 · hr/round=1.5 · rate=€250 · redlines=8 → base_hours=6 · redline_multi=1.4 · annual = 40 × 4 × 6 × 250 × 1.4 = **€336,000/yr** → **🟠 Warning**

**6 v3 sections**:
- Health: DPA Cost 🟠 Warning (€336K/yr · €2,100/DPA)
- Snapshot: 40 DPAs/q · 4 rounds · 1.5 hr/round · €250/hr · 8 redlines · 6 hr/DPA · €336K/yr
- What-If: If avg_rounds drops to 2 (template-first approach), annual cost drops to €168K (🟡 Good)
- Break-Even: To hit 🟢 (<€100K), need avg_rounds ≤1.2 OR use standardized DPA template (1 round default)
- Milestone: Standardize DPA template annually; EDPB SCC updates 2024 require periodic refresh
- Tip: Pair with P8 Sales — DPA negotiations often delay deal close by 2-4 weeks. Cost of delay = sales opportunity cost. Use templated DPA + pre-approved addendum.

**Sources**: IAPP Privacy Operations Benchmark 2024 · EDPB Standard Contractual Clauses (SCC) 2024 · OneTrust DPA template benchmark · Fieldfisher SaaS DPA survey 2024

### 3.5 Data Breach Notification Cost

**Question**: "What does our annual breach notification cost?"

**Inputs** (4):
- `breaches_per_year` (number, e.g. 1) — annual count of reportable breaches (GDPR Art. 33/34)
- `data_subjects_per_breach` (number, e.g. 50000) — average data subjects affected per breach
- `notification_cost_per_subject` (number, €/subject, e.g. 5) — cost to notify + serve each data subject (email + call center + ID protection service)
- `remediation_cost_per_breach` (number, €, e.g. 80000) — fixed cost per breach (forensics + legal + PR)

**Math**:
```
notification_cost = data_subjects_per_breach × notification_cost_per_subject
cost_per_breach = notification_cost + remediation_cost_per_breach
annual_breach_cost = breaches_per_year × cost_per_breach
```

**4-band (HIGHER on annual_breach_cost — higher cost = worse incident exposure)**:
- 🟢 Excellent: < €50K/yr (no breaches or small-scale)
- 🟡 Good: €50K ≤ cost < €250K
- 🟠 Warning: €250K ≤ cost < €1M
- 🔴 Critical: cost ≥ €1M (severe exposure, multiple large breaches)

**Canonical**: breaches=1 · subjects=50K · notif=€5/subject · remediation=€80K → notif_cost=€250K · cost_per_breach=€330K · annual=**€330K/yr** → **🟠 Warning**

**6 v3 sections**:
- Health: Breach Notification Cost 🟠 Warning (€330K/yr · €330K/breach)
- Snapshot: 1 breach/yr · 50K subjects · €5/subject notif · €80K remediation · €250K notif · €330K/breach · €330K/yr
- What-If: If breaches drop to 0.3/yr (3 in 10 yrs), annual cost drops to €99K (🟡)
- Break-Even: To hit 🟢 (<€50K), need <0.15 breaches/yr — usually impossible; realistic target is 🟡 (<€250K)
- Milestone: Test incident response plan quarterly; ENISA publishes annual threat landscape
- Tip: Pair with L-1 GDPR Fine Risk — breach cost + fine exposure = true incident cost. Also P9 Retention (breach → customer churn, often 3-5% per breach).

**Sources**: IBM Cost of a Data Breach Report 2024 · ENISA Threat Landscape 2024 · GDPR Art. 33-34 · ICO breach notification guidance 2024

### 3.6 CMP ROI

**Question**: "Is our Consent Management Platform investment worth it?"

**Inputs** (5):
- `cmp_monthly_cost` (number, €/mo, e.g. 1200) — CMP subscription cost (OneTrust/Didomi/Cookiebot etc.)
- `dsars_per_month` (number, e.g. 50) — current monthly DSAR volume (cross-link to L-2)
- `hours_per_dsar` (number, e.g. 2.5) — current hours per DSAR (without CMP automation)
- `hourly_rate_dpo` (number, €/hr, e.g. 95) — DPO hourly rate (cross-link to L-2)
- `automation_uplift_pct` (number, %, e.g. 40) — % DSAR hours reduced by CMP (typical 30-50%)

**Math**:
```
dsar_annual_savings = dsars_per_month × 12 × hours_per_dsar × (automation_uplift_pct / 100) × hourly_rate_dpo
cmp_annual_cost = cmp_monthly_cost × 12
net_annual_savings = dsar_annual_savings - cmp_annual_cost
roi_pct = (net_annual_savings / cmp_annual_cost) × 100
payback_months = cmp_annual_cost > 0 ? (cmp_annual_cost / (dsar_annual_savings / 12)) : Infinity
```

**4-band (HIGHER on roi_pct — higher ROI = better investment; critical -Infinity since negative savings means CMP costs more than it saves)**:
- 🟢 Excellent: ROI ≥ 400% (CMP pays back 5×+)
- 🟡 Good: ROI ≥ 150%
- 🟠 Warning: ROI ≥ 50%
- 🔴 Critical: ROI < 50% (CMP under-saving)

**Canonical**: cmp_cost=€1,200/mo · dsars=50/mo · hr/dsar=2.5 · dpo_rate=€95 · uplift=40% → dsar_savings=50 × 12 × 2.5 × 0.40 × 95 = **€57,000/yr** · cmp_cost=€14,400/yr · net=**€42,600/yr** · ROI = €42,600 / €14,400 × 100 = **296%** → **🟡 Good**

**6 v3 sections**:
- Health: CMP ROI 🟡 Good (296% ROI · €42.6K net/yr · ~3.0 mo payback)
- Snapshot: €1,200/mo CMP · 50 DSAR/mo · 2.5 hr/DSAR · €95/hr · 40% automation uplift · €57K savings/yr · €14.4K CMP cost · €42.6K net
- What-If: If DSAR volume climbs to 200/mo (typical B2C SaaS), savings = €228K/yr, net = €213.6K, ROI = 1,483% (🟢 Excellent)
- Break-Even: To hit 🟢 (≥400%), need DSARs ≥86/mo OR uplift ≥58% (premium CMP tier)
- Milestone: Re-evaluate CMP ROI annually; DSAR volume scales with customer base
- Tip: Pair with L-2 DSAR Cost — CMP reduces manual hours-per-DSAR. Also L-3 Consent Revenue — premium CMP lifts consent rate 10-15pp (multiplier effect). P5 Investment framework applies.

**Sources**: OneTrust CMP ROI case studies 2024 · Didomi benchmark 2024 · IAPP-EY Privacy Tech Buyer's Guide 2024 · TrustArc CMP ROI report 2024

---

## 4. Health Bands — Direction Summary

| Calc | Direction | Critical threshold | Canonical (Good/Warning) | Excellent threshold |
|------|-----------|-------------------|--------------------------|---------------------|
| L-1 GDPR Fine Risk | HIGHER (exposure ratio) | ratio ≥ 2% | ratio 0.64% (Good) | ratio < 0.25% |
| L-2 DSAR Processing Cost | HIGHER (annual €) | cost ≥ €300K | €99,750 (Good) | < €25K |
| L-3 Cookie Consent Gap | INVERSE (gap_pp) | gap ≥ 30pp | gap 20pp (Warning) | gap < 5pp |
| L-4 DPA Negotiation Cost | HIGHER (annual €) | cost ≥ €600K | €336K (Warning) | < €100K |
| L-5 Breach Notification | HIGHER (annual €) | cost ≥ €1M | €330K (Warning) | < €50K |
| L-6 CMP ROI | HIGHER (ROI %) | ROI < 50% | ROI 296% (Good) | ROI ≥ 400% |

**Direction mix**: 5 HIGHER · 1 INVERSE · 0 COMPOSITE (vs P13: 3 HIGHER · 1 INVERSE · 2 COMPOSITE)

---

## 5. Implementation — 8-File Wiring (per calc)

Each calc requires 8 file edits, all validated:

1. `src/engines/legal-compliance/<slug>-calculator.ts` — engine + HEALTH_BANDS + math + customFn + generate + faq + howToUse + sources
2. `src/engines/legal-compliance/index.ts` — barrel (+1 line per calc, all 6 in P14-0)
3. `src/data/tools/legal-compliance.ts` — ToolMeta entries × 6 (5 fields + 8-9 keywords + 3 sources + reviewedBy/author/dataReviewedAt)
4. `src/data/og-samples.json` — OG card headline (en + zh, ×6 = 12 entries)
5. `scripts/codegen-examples.mjs` — ENGINES registration (+1 entry per calc, subdir: 'legal-compliance')
6. `tests/ab-split.test.ts` — bump engine count progressive 92→93→94→95→96→97→98
7. `tests/<slug>-calculator.test.ts` — per-calc math tests (10-12 each, total ~70-80)
8. `tests/internal-links.test.ts` — bump per calc 92→93→94→95→96→97→98 (P13-0 lesson: per-calc, not last-calc only)

**Scaffold files (P14-0 only)**:
- `src/pages/[lang]/legal-compliance.astro` — listing page (template from knowledge.astro)
- `src/data/categories.ts` — 'L' Legal & Compliance entry appended (15th)
- `src/engines/index.ts` — pre-emptive `import './legal-compliance';` (P9-1 + P10-1 + P11-1 + P12-0 + P13-0 lesson)
- `src/data/tools/index.ts` — pre-emptive `import { tools as legalCompliance }` + spread

---

## 6. Scope Boundary — Explicit In/Out-of-Scope

| In-scope | Notes |
|---|---|
| **GDPR (EU)** | Core — Art. 83 fines, Art. 12-22 DSAR, Art. 33-34 breach |
| **CCPA (California)** | Mid-market SaaS >$25M ARR typically applies; formula different ($7,500/violation cap); spec references |
| **PIPEDA (Canada)** | Formula same as GDPR; spec references |
| **LGPD (Brazil)** | Formula same as GDPR; spec references |

| Out-of-scope | Reason |
|---|---|
| HIPAA (US HealthTech) | Health-vertical subset; would split into P14.x HIPAA specialist |
| SOC2 / ISO 27001 | Security compliance not privacy; P14.x future |
| PCI-DSS | Payment card data; out of mid-market SaaS core |
| FedRAMP (US gov cloud) | Gov vertical; out of mid-market SaaS core |
| China Data Security Law / PIPL | Regional regulatory; outside EU/US persona anchor |
| India DPDP Act 2023 | Regional; would require persona split |

**Implementation note:** GDPR canonical drives all EU/UK/EU-targeted calculations. CCPA thresholds are noted in faq (applies if California-resident-data >50K households/devices). PIPEDA/LGPD formula equivalence referenced but not separately implemented.

---

## 7. Cross-Calc Cross-Links (validated)

| Pair | Link | User Benefit |
|------|------|--------------|
| L-1 ↔ L-2 | fine-risk ↑ → DSAR investment ↑ (avoid fines via DSAR compliance) | Shows ROI of DSAR automation |
| L-1 ↔ L-5 | breach × fine-tier → true incident cost (compound) | Real "cost of a breach" |
| L-2 ↔ L-6 | CMP reduces DSAR hours → CMP ROI ↑ as DSAR ↓ | Direct CMP payback story |
| L-3 ↔ L-6 | CMP improves consent rate → revenue recovered | Premium CMP tier uplift |
| L-4 ↔ P8 Sales | DPA rounds × redlines → sales-cycle delay cost | Quantifies DPA drag on revenue |
| L-5 ↔ P9 Retention | breach → 3-5% customer churn per incident | Quantifies trust collapse |
| L-3 ↔ P6 Marketing | consent gap × visitors × ARPU → conversion loss | Aligns CMP investment with revenue |
| L-1 ↔ P9 Retention | fine news → brand trust → customer churn | C-suite narrative for compliance budget |

---

## 8. Risk & Mitigation

| Risk | Severity | Mitigation |
|------|----------|------------|
| GDPR fine cap calculation depends on jurisdiction/case-specific factors | Medium | Use conservative max cap (4% Art. 83(5)); document in faq that actual fines vary |
| L-3 cookie consent % varies wildly by jurisdiction (EU strict vs US lax) | Medium | Document persona assumes EU visitor base; L-3 not applicable for US-only sites |
| L-5 breach notification cost depends on data type sensitivity (PII vs PHI vs payment) | Low | Use PII baseline (€5/subject); faq notes 3-10× for PHI |
| L-4 DPA redlines multiplier is heuristic | Low | Base 1.0 + 5% per redline; spec value 8 redlines → 1.4× multiplier (validated against OneTrust benchmarks) |
| L-6 CMP ROI highly dependent on DSAR volume | Low | Show ROI at 3 DSAR volumes: current (canonical), low (10/mo), high (200/mo); user picks scenario |
| 26 inputs × 6 calcs vs P13 (26 inputs, similar complexity) | None | Within P-series range |
| Float-precision in ratio calculations (L-1 exposure_ratio, L-6 ROI) | Low | Math unrounded, display rounds (P12-1 pattern); use approximate equality in tests |
| L-3 INVERSE with 30pp critical (gap ≥ 30pp triggers critical) | Low | Spec locks gap thresholds; user-friendly "stretch target" framing |

---

## 9. Estimated Total

| Metric | Estimate |
|--------|----------|
| Total commits | 13 (1 spec + 1 spec-fix + 1 plan + 1 scaffold + 6 calcs + 2 memory + 1 holistic) |
| Engines | 92 → **98** (+6) |
| Categories | 14 → **15** (NEW 'L' Legal & Compliance) |
| Total inputs | 26 (across 6 calcs) |
| Total tests | ~70-80 (per calc 10-12, range 65-85) |
| Pass / fail target | ≥845 pass / 0 fail |
| dist pages | +6 calc × 2 langs + 2 listing pages × 2 langs = +16 |

---

## 10. Open Questions (resolved during brainstorm)

| Question | Resolution |
|----------|------------|
| Persona scope (GC vs DPO vs CISO) | **DPO / Privacy Officer** primary; GC secondary |
| Which 6 calcs (P14 candidate set of 10) | **Set 1: GDPR fines + DSAR + Consent + DPA + Breach + CMP** (the 6A1 recommended set) |
| Currency (EUR vs USD) | **EUR** for canonical (GDPR is European); USD inputs allowed via user-defined |
| Funnel closure vs product width | **Funnel closure** (L ↔ P9 retention + P12 support + P6 marketing) |
| Whether to include SOC2/HIPAA | **No** — out-of-scope per §6; P14.x future if needed |
| Composite bands (vs single-axis) | **None** — all calcs use single-axis (5 HIGHER + 1 INVERSE) for simplicity |
| GDPR fine tier granularity | **Select with 4 options**: 4% (substantive) / 2% (procedural) / 1% (mixed) / 0.5% (light) |

---

## 11. Success Criteria

P14 ships successfully when:

1. **All 6 calcs pass** `pnpm check` (codegen-examples + codegen-customfn + 845+ tests)
2. **All 6 calcs have** 4-band HEALTH_BANDS with correct direction
3. **All 6 calcs follow** 6-section v3 template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
4. **Engine count** 92 → 98 verified
5. **Category count** 14 → 15 verified (NEW 'L' Legal & Compliance)
6. **3-way sync** (local + github + gitee) at final commit
7. **Holistic review** catches ≥1 cross-cutting issue before push (P13-7 lesson; K-3 noResLift fix pattern)
8. **0 pre-existing test failures** in 5 build tests (baselayout-* / header-* / privacy-policy-sync)

---

## 12. Lessons to Apply (from P13 series)

1. **ROOT barrel pre-emptive fix in scaffold** (P9-1 + P10-1 + P11-1 + P12-0 + P13-0 lesson) — update `src/engines/index.ts` + `src/data/tools/index.ts` in P14-0
2. **Parse-blocker prevention** (P13-1 lesson) — run `node -e "require('./src/engines/legal-compliance/<slug>-calculator.ts')"` after each engine write
3. **Internal-links per-calc bump** (P12-1 lesson applied P13) — bump 92→93→94...98 per calc, NOT at P14-6
4. **INVERSE band with Infinity critical** (P9-4 + P12-1 lesson) — applied to L-3
5. **HIGHER band with -Infinity critical** — applied to L-1/L-2/L-4/L-5/L-6
6. **CustomFn dynamic values** (P12-1 lesson) — all monetary/threshold values from inputs
7. **Float-precision dual-layer** — math unrounded, display rounds; use `Math.abs(a - b) < 1e-9` in tests
8. **TS warnings tolerated** (P10/P11/P12/P13 lesson) — `sources` field on ToolEngine pre-existing TS warning
9. **TS apostrophe in single quotes** (P12-6 lesson) — use python or sed to fix `agent\'s` → `agent's`
10. **Bash heredoc issues** — use Node appendFileSync for engine files >5000 chars
11. **Subagent model selection** (P13-1 lesson) — **sonnet** for all calc implementers; **haiku insufficient** for multi-file work
12. **Spec narrative vs code drift** (P13-3 + P13-6 lesson) — **code is the contract** when spec narrative contradicts spec code
13. **Holistic reviewer value** (P13-7 lesson) — caught K-3 noResLift math bug + double-percent; **always run holistic review** at end

---

## 13. Reference Files

- P13 spec template: `docs/superpowers/specs/2026-07-12-p13-knowledge-documentation-batch-design.md`
- P12 spec: `docs/superpowers/specs/2026-07-10-p12-customer-support-batch-design.md`
- P13 series memory: `memory/p13-series-shipped.md`
- P12 series memory: `memory/p12-series-shipped.md`
- Category list: `src/data/categories.ts`
- Engine pattern: `CLAUDE.md` § Architecture → Engines
- 8-file wiring checklist: P13 spec § 5 (mirrored above)
- GDPR Art. 83: https://gdpr-info.eu/art-83-gdpr/
- IAPP Privacy Operations Benchmark 2024: https://iapp.org/resources/
- ICO GDPR fines guide 2024: https://ico.org.uk/for-organisations/
- OneTrust CMP ROI 2024: https://www.onetrust.com/resources/
---