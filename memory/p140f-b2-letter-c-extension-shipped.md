---
name: p140f-b2-letter-c-extension-shipped
description: P140f-B2 Wave C — Letter C Tier 1 extension. 2 Topics (equity-dilution-optimization + unit-economics-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-20
  commit: 61d0cc4
---

# P140f-B2 Letter C Valuation Extension — SHIPPED

**Date:** 2026-08-20
**Commit:** `61d0cc4` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-b-extension-shipped]] (Wave B, commit c5c4d30)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| C | `equity-dilution-optimization` | Equity Dilution Optimization | 股权稀释优化 | `solopreneur-equity-dilution-calculator` |
| C | `unit-economics-optimization` | Unit Economics Optimization | 单位经济学优化 | `solopreneur-unit-economics-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (527 → 535).

## Content highlights

**equity-dilution-optimization**:
- Dilution % per round: pre-seed 5-10%, seed 15-25%, Series A 15-20%, Series B 10-15%, Series C+ 8-12%
- Founder ownership by stage: pre-seed 80-100%, seed 60-80%, Series A 40-60%, Series B 30-50%, Series C 20-40%, IPO 10-25%
- Option pool top-up: 5-10%/round (often hidden)
- Anti-dilution clauses: broad-based weighted average vs full ratchet
- Sources: YC Post-money SAFE 2024, NVCA model docs, Carta State of Startup Equity 2024, Index Ventures term sheet guide, Cooley venture financing terms 2024, PitchBook, Crunchbase, Equidam, WilmerHale, Bessemer State of the Cloud 2024 (10 distinct)

**unit-economics-optimization**:
- LTV:CAC by stage: seed 1.5-3x, Series A 3-5x, mature 5x+
- Payback by tier: SMB <12mo, mid-market 12-18mo, enterprise 18-24mo
- Gross margin: pure SaaS 70-85%, usage-based 50-70%, marketplace 40-60%
- Rule of 40 + Magic Number 0.75+
- Sources: OpenView 2024, Bessemer State of the Cloud 2024, SaaS Capital Index, ICONIQ Growth 2024, KeyBanc Annual SaaS Survey 2024, ChartMogul 2024, David Skok SaaS Metrics 2.0, Sequoia SaaS Benchmarks, McKinsey SaaS Primer (9 distinct)

Both Topics: ~7-8k chars en + ~3-4k chars zh Guide; ~600-1000 chars + 8-row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='C', domain='finance')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS C reduced from 4 to 2 (31 → 29)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (94s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (41s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.7s) |
| pnpm build | 527 → 535 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-b-extension-shipped]] — Wave B (Letter B AI Cost)
- [[p140f-b2-letter-a-extension-shipped]] — Wave A (Letter A SaaS Metrics)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)