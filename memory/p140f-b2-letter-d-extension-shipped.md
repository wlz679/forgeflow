---
name: p140f-b2-letter-d-extension-shipped
description: P140f-B2 Wave D — Letter D Tier 1 extension. 2 Topics (project-profitability-optimization + saas-pricing-strategy) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-20
  commit: d85c5b7
---

# P140f-B2 Letter D Freelance Extension — SHIPPED

**Date:** 2026-08-20
**Commit:** `d85c5b7` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-c-extension-shipped]] (Wave C, commit 61d0cc4)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| D | `project-profitability-optimization` | Project Profitability Optimization | 项目盈利能力优化 | `solopreneur-project-profitability-calculator` |
| D | `saas-pricing-strategy` | SaaS Pricing Strategy | SaaS 定价策略 | `solopreneur-saas-pricing-planner` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (535 → 543).

## Content highlights

**project-profitability-optimization**:
- Effective hourly rate vs posted rate realization: 60-75%
- Utilization by career stage: junior 50-65%, mid 60-75%, senior 70-85%
- Project margin health bands: 🟢 >30% / 🟡 15-30% / 🟠 5-15% / 🔴 ≤0%
- Scope creep impact: 5-15% of project value
- Overhead allocation: 15-30% of revenue
- Sources: Upwork, Toptal, Glassdoor, Payscale, Braintree, HoneyBook, Bonsai, FreshBooks, Freelancers Union, IRS Schedule C, McKinsey, HBR, American Express, Editorial Freelancers (14 distinct)

**saas-pricing-strategy**:
- Tier conversion: Starter→Pro 15-25%, Pro→Enterprise 5-10%
- Usage-based pricing adoption: 40-60% of new SaaS
- Annual prepay discount: 10-20%
- Value-based pricing premium: 20-50% over cost-plus
- Price elasticity by segment: SMB -1.5 to -2.5, Enterprise -0.3 to -0.5
- Geo pricing: EMEA/APAC 60-80% of US, LATAM 50-70%
- Sources: OpenView, Bessemer, ICONIQ Growth, SaaS Capital, KeyBanc, ProfitWell, SaaStr, Stripe Atlas, McKinsey B2B Pulse, Bain, Gartner, Forrester (12 distinct)

Both Topics: ~7-9k chars en + ~3-4k chars zh Guide; ~600-1000 chars + 8-16 row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='D', domain='finance')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS D reduced from 2 to 0 (29 → 27; D category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (59s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (42s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.6s) |
| pnpm build | 535 → 543 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-c-extension-shipped]] — Wave C (Letter C Valuation)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)