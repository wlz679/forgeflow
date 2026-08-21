---
name: p140f-b2-letter-k-extension-shipped
description: P140f-B2 Wave K — Letter K Tier 1 extension. 2 Topics (article-freshness-optimization + search-effectiveness-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: 16f665b
---

# P140f-B2 Letter K Knowledge Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `16f665b` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-h-extension-shipped]] (Wave H, commit c4f4d3d)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| K | `article-freshness-optimization` | Article Freshness Optimization | 知识库新鲜度优化 | `solopreneur-article-freshness-calculator` |
| K | `search-effectiveness-optimization` | KB Search Effectiveness Optimization | 知识库搜索效果优化 | `solopreneur-search-effectiveness-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (567 → 575).

## Content highlights

**article-freshness-optimization** (DIFFERENT LENS from anchor — editorial maintenance cadence):
- Review cadence by tier: P0 critical 30 days / P1 high-traffic 90 days / P2 medium 180 days / P3 evergreen 365 days
- Freshness 4-band: 🟢 Excellent ≥80% / 🟡 Good 55-80% / 🟠 Warning 40-55% / 🔴 Critical <40%
- Decay function: linear vs exponential (6-month half-life)
- Stale-content impact: 20-30% of avoidable tickets
- Editorial FTE allocation: 1 per 500-1000 articles (P0-heavy = 1.5x)
- Sources: NN/g Help & Documentation 2024, TSIA Knowledge-Centered Service 2024, Intercom Help Center Best Practices, Zendesk CX Trends 2024, Help Scout SaaS Knowledge Benchmarks, HubSpot Service Hub Industry Benchmarks, Salesforce State of Service 2024, KnowledgeOwl KB Health Report, Tettra Knowledge Base Benchmarks, Docurated Content Lifecycle Research, Gartner Customer Service 2024 (11 distinct)

**search-effectiveness-optimization** (DIFFERENT LENS from anchor — search UX quality):
- CTR health: 🟢 >75% / 🟡 60-75% / 🟠 40-60% / 🔴 <40%
- No-result rate: 🟢 <8% / 🟡 8-15% / 🟠 15-25% / 🔴 >25%
- Reformulation rate health: <15%
- Search-to-ticket rate health: <8%
- Mean rank-clicked: <3.0 (pogo-stick prevention)
- Semantic search lift: 20-40% over keyword-only
- Synonym coverage target: 90%+
- Typo tolerance: 95%+
- Sources: Algolia Search Trends 2024, Coveo Search Benchmark, Elastic Search Relevance 2024, NN/g Help & Documentation 2024, Zendesk CX Trends + Search Analytics, Help Scout SaaS Knowledge Benchmarks, HubSpot Service Hub Industry Benchmarks, Intercom Articles / Help Center Best Practices, Lucidworks Search & Discovery, Gartner Customer Service 2024 (10 distinct)

Both Topics: ~4-9k chars en + ~1.5-7k chars zh Guide; ~600-1000 chars + 8-row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='K', domain='customer')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS K reduced from 2 to 0 (21 → 19; K category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (64s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (43s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (2.0s) |
| pnpm build | 567 → 575 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-h-extension-shipped]] — Wave H (Letter H Hiring)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)