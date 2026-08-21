---
name: p140f-b2-letter-o-extension-shipped
description: P140f-B2 Wave O — Letter O Tier 1 extension. 2 Topics (carrying-cost-optimization + reorder-point-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: 806c08f
---

# P140f-B2 Letter O Operations / Inventory Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `806c08f` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-m-extension-shipped]] (Wave M, commit b0d8b83)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| O | `carrying-cost-optimization` | Inventory Carrying Cost Optimization | 库存持有成本优化 | `solopreneur-carrying-cost-calculator` |
| O | `reorder-point-optimization` | Reorder Point Optimization | 再订货点优化 | `solopreneur-reorder-point-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (591 → 599).

## Content highlights

**carrying-cost-optimization** (DIFFERENT LENS from anchor — per-component cost decomposition):
- Per-component cost decomposition: capital 8-12%, storage 2-6%, insurance/tax 1-2%, shrinkage 1-3%, opportunity 5-10%
- Carrying cost by industry: grocery 25-35%, apparel 25-30%, electronics 20-28%, auto 18-25%, pharma 12-18%, furniture 20-30%
- ABC tier distribution: A=20% / B=30% / C=50%
- Dead stock target: <5%
- W/C → ROIC → valuation multiplier linkage (carrying cost cuts → cash freed → multiple lift)
- Sources: APICS/ASCM SCOR, MIT Sloan Working Capital Survey 2024, McKinsey, CSCMP, Deloitte, Shopify Plus, HubSpot, Coresight Research, IHL Group, APICS Dictionary 14th ed, Inventory Optimization Council (11 distinct)

**reorder-point-optimization** (DIFFERENT LENS from anchor — reorder timing focus):
- ROP = (avg daily demand × lead time) + safety stock
- Safety stock formula: Z × σ × √(lead time variance)
- Service level targets by ABC tier: A 99-99.5% (1-2 stockouts/yr), B 95-98% (2-5/yr), C 85-90% (10-20/yr)
- Stockout bands: 🟢 <1% / 🟡 1-3% / 🟠 3-7% / 🔴 >7%
- Fill rate bands: 🟢 >97% / 🟡 92-97% / 🟠 85-92% / 🔴 <85%
- Safety stock weeks by tier: A 4-8wk / B 2-4wk / C 1-2wk
- Lead time variability ratio: <15% / 15-30% / 30-50% / >50%
- Sources: APICS/ASCM SCOR 2024, MIT Sloan Working Capital Survey 2024, CSCMP Supply Chain Quarterly Q3 2024, McKinsey Supply Chain 2030, Inventory Optimization Solutions, Lokad, InventoryOps, ToolsGroup, Slimstock, Deloitte Supply Chain Studies 2024, APICS/ASCM Dictionary 14th ed, Gartner Supply Chain Top 25 (12 distinct)

Both Topics: ~8-9k chars en + ~3-5k chars zh Guide; ~600-1000 chars + 8-row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='O', domain='operations')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS O reduced from 2 to 0 (15 → 13; O category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (54s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (29s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.7s) |
| pnpm build | 591 → 599 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-m-extension-shipped]] — Wave M (Letter M Marketing)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)