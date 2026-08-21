---
name: p140f-b2-letter-s-extension-shipped
description: P140f-B2 Wave S — Letter S Tier 1 extension. 2 Topics (sales-velocity-optimization + acv-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: 49bb4e1
---

# P140f-B2 Letter S Sales / Pipeline Management Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `49bb4e1` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-t-extension-shipped]] (Wave T, commit 5d1b97a)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| S | `sales-velocity-optimization` | Sales Velocity Optimization | 销售速度优化 | `solopreneur-sales-velocity-calculator` |
| S | `acv-optimization` | ACV (Annual Contract Value) Optimization | ACV（年度合同价值）优化 | `solopreneur-acv-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (623 → 631).

## Content highlights

**sales-velocity-optimization** (DIFFERENT LENS from anchor — output throughput via 4-lever compounding):
- 4-lever compounding formula: (opps × ACV × win rate) ÷ cycle length
- Velocity health bands: 🟢 ≥$5K/day / 🟡 $2-5K / 🟠 $500-2K / 🔴 <$500
- Velocity by segment:
  - SMB: <30d cycle / 15-25% win rate / 8-15 deals/FTE/month
  - Mid-market: 30-90d / 15-20% / 5-10 deals/FTE/month
  - Enterprise: 90-180d / 15-25% / 2-5 deals/FTE/month
- ACV sweet spots by segment
- Slowest-lever diagnostic: 1pp on slowest > 5pp on fastest
- Sources: Salesforce State of Sales 2024 (8th ed), HubSpot Sales Enablement Report 2024, Gartner CSO Survey 2024, Xactly Sales Compensation Report 2024, Pavilion Sales Benchmarks, Outreach Sales Engagement Report 2024, SalesLoft Sales Engagement Benchmark 2024, ZoomInfo SalesOS, Gong Labs Deal Velocity, Insivia Sales Velocity benchmarks (10 distinct)

**acv-optimization** (DIFFERENT LENS from anchor — deal size uplift):
- ACV growth healthy: 15-25%/yr
- Tier migration rate: 10-15%/yr
- Multi-year deal share: 30-50% with 10-15% discount
- Expansion ACV: 30-50% NRR contribution
- ACV bands by segment: SMB <$10K, Mid $25-100K, Enterprise $100K-1M+, Strategic $1M+
- ACV ↔ NRR linkage: 0.5-1pp NRR per 10% ACV lift
- Sources: Salesforce State of Sales 2024, OpenView Partners 2024, ICONIQ Growth, SaaS Capital, Pavilion, ChartMogul, Vitally, Gainsight, TSIA, ProfitWell, Xactly (11 distinct)

Both Topics: ~5-6k chars en + ~1.6-2.5k chars zh Guide; ~600-2000 chars + 8-row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='S', domain='marketing')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS S reduced from 2 to 0 (7 → 5; S category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (39s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (30s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.6s) |
| pnpm build | 623 → 631 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Process note

Wave S was originally scheduled between R (Wave 14) and T (Wave 16) per the plan task order. In execution, Wave T (FRT + Resolution Time) shipped first at commit 5d1b97a, then Wave S (Sales Velocity + ACV) followed at commit 49bb4e1. The actual ship order is T→S, not S→T. No functional impact — all 15 letter waves are now shipped.

## Related

- [[p140f-b2-letter-t-extension-shipped]] — Wave T (Letter T Support) — shipped just prior
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)