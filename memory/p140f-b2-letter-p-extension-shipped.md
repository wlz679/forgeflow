---
name: p140f-b2-letter-p-extension-shipped
description: P140f-B2 Wave P — Letter P Tier 1 extension. 2 Topics (feature-adoption-optimization + stickiness-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: 58cac25
---

# P140f-B2 Letter P Product Analytics Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `58cac25` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-o-extension-shipped]] (Wave O, commit 806c08f)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| P | `feature-adoption-optimization` | Feature Adoption Optimization | 功能采用优化 | `solopreneur-feature-adoption-calculator` |
| P | `stickiness-optimization` | Stickiness Optimization | 用户粘性优化 | `solopreneur-stickiness-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (599 → 607).

## Content highlights

**feature-adoption-optimization** (DIFFERENT LENS from anchor — per-feature micro-product):
- Per-feature lifecycle: awareness → discovery → activation → habituation
- Adoption rate bands: 🟢 >40% / 🟡 20-40% / 🟠 10-20% / 🔴 <10%
- Time-to-first-use bands: 🟢 <7d / 🟡 7-30d / 🟠 30-90d / 🔴 >90d
- Breadth (features/user) by tier: power / regular / casual
- Depth (uses/session)
- Feature retirement threshold
- Power-user curve shape
- Sources: Amplitude Product Benchmarks 2024, Mixpanel 2024, Heap 2024, Pendo Adoption Benchmark 2024, Appcues 2024, Userpilot State of Product Engagement 2024, Hotjar, ProductPlan 2024, Gartner Hype Cycle 2024, NN/g feature-discovery research 2024 (10 distinct)

**stickiness-optimization** (DIFFERENT LENS from anchor — retention-curve shape + engagement frequency):
- DAU/MAU by category: social 50%+, messaging 60-70%, gaming 20-30%, productivity 13-25%, ecommerce 10-15%, streaming 30-40%
- D7 retention bands: 🟢 >40% / 🟡 25-40% / 🟠 15-25% / 🔴 <15%
- D30 retention bands (4-tier)
- Sessions/week by category
- Power-user threshold (top 10%)
- Session duration by category
- WAU/MAU weekly stickiness: 50-70%
- Push notification re-engagement: 3-8%
- Sources: Mixpanel, Amplitude, Localytics (Urban Airship) Mobile App Engagement Benchmarks 2024, AppsFlyer State of App Engagement 2024, Adjust Mobile Benchmarks 2024, Singular Retention Benchmarks 2024, Branch Engagement Metrics 2024, App Annie/data.ai State of Mobile 2024, Sensor Tower Engagement Benchmarks 2024, ChartMogul SaaS Retention Benchmarks 2024, OpenView Partners SaaS Benchmarks 2024 (11 distinct)

Both Topics: ~6-8k chars en + ~2-3k chars zh Guide; ~600-1000 chars + 8-13 row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='P', domain='product')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS P reduced from 2 to 0 (13 → 11; P category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (79s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (35s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.7s) |
| pnpm build | 599 → 607 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-o-extension-shipped]] — Wave O (Letter O Operations)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)