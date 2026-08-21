---
name: p140f-b2-letter-r-extension-shipped
description: P140f-B2 Wave R — Letter R Tier 1 extension. 2 Topics (grr-optimization + customer-health-score-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: c1a4872
---

# P140f-B2 Letter R Retention & Customer Success Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `c1a4872` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-p-extension-shipped]] (Wave P, commit 58cac25)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| R | `grr-optimization` | GRR (Gross Revenue Retention) Optimization | 毛收入留存优化 | `solopreneur-grr-calculator` |
| R | `customer-health-score-optimization` | Customer Health Score Optimization | 客户健康评分优化 | `solopreneur-customer-health-score-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (607 → 615).

## Content highlights

**grr-optimization** (DIFFERENT LENS from anchor NRR — expansion-stripped floor):
- GRR 4-band: 🟢 >95% / 🟡 90-95% / 🟠 80-90% / 🔴 <80%
- GRR by segment: Enterprise 92-96% / Mid-market 85-92% / SMB 75-85%
- Monthly logo churn bands by stage
- Voluntary vs involuntary churn split: 60-70% / 30-40%
- Save rate bands: 20-30% / 30-40% / >40%
- Save-the-customer play ROI: 3-5x / 5-10x
- Contraction rate (downgrade as leading indicator of churn)
- Early warning lead time: 60-90 days
- Cohort decay velocity analysis
- 1pp GRR lift = $5K-$50K MRR retained
- Sources: OpenView Partners, Bessemer State of the Cloud, SaaS Capital Metrics Guide + Retention Metrics, KeyBanc SaaS Survey, ICONIQ Growth, Gainsight CS Benchmarks + Health Framework, Vitally CS, ChartMogul, Recurly State of Subscriptions, Customer Gauge B2B Retention (10 distinct)

**customer-health-score-optimization** (DIFFERENT LENS from anchor NRR — leading-indicator 30-90 days ahead):
- CHS bands: 🟢 Healthy >70 / 🟡 At-risk 40-70 / 🔴 Critical <40
- Signal category weights: product usage 30-40%, support sentiment 15-25%, commercial 15-20%, engagement 10-15%, NPS/CSAT 10-15%
- Lead time bands: 🟢 30-60 days / 🟡 15-30 days / 🟠 7-15 days / 🔴 <7 days
- Prediction accuracy healthy: >75%
- Intervention lift: 2-4x vs no-action
- Sources: Gainsight Customer Success Benchmarks 2024, Vitally Customer Success Benchmarks 2024, ChurnZero State of Customer Churn 2024, Totango Customer Success Compass 2024, Catalyst Customer Success Industry Report 2024, ClientSuccess benchmark reports 2024, Planhat CS benchmarks 2024, Custify CS benchmarks 2024, OpenView SaaS Benchmarks 2024, Bessemer Venture Partners State of the Cloud 2024 (10 distinct)

Both Topics: ~5-6k chars en + ~2-3k chars zh Guide; ~3-4k chars + 8-14 row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='R', domain='customer')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS R reduced from 2 to 0 (11 → 9; R category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (77s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (41s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.7s) |
| pnpm build | 607 → 615 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-p-extension-shipped]] — Wave P (Letter P Product)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)