---
name: p140f-b2-letter-f-extension-shipped
description: P140f-B2 Wave F — Letter F Tier 1 extension. 2 Topics (compound-interest-optimization + cap-rate-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: d92cc4e
---

# P140f-B2 Letter F Investment & Real Estate Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `d92cc4e` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-e-extension-shipped]] (Wave E, commit 34be762)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| F | `compound-interest-optimization` | Compound Interest Optimization | 复利优化 | `solopreneur-compound-interest-calculator` |
| F | `cap-rate-optimization` | Cap Rate Optimization | 资本化率优化 | `solopreneur-cap-rate-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (551 → 559).

## Content highlights

**compound-interest-optimization**:
- Long-term asset class returns: S&P 500 nominal ~10% / real ~6.5-7%; IG bonds 4-5% / real 2-3%; cash 0.4-0.6%; HYSA 4-5%
- Tax drag by account type (taxable vs tax-deferred vs tax-free)
- Rule of 72 by rate: 4% → 18yr, 7% → 10yr, 10% → 7yr, 12% → 6yr
- Sequence-of-returns risk + 3.5-4% SWR (safe withdrawal rate)
- Contribution frequency impact (monthly vs annual)
- Rebalancing uplift: 0.3-0.5%/yr
- Sources: Ibbotson/SBBI, S&P Dow Jones Indices, Vanguard Capital Markets Model + Advisor's Alpha, Fidelity, BlackRock CMA, Morningstar State of Retirement Income + Mind the Gap, J.P. Morgan Guide to the Markets, BLS CPI-U, Federal Reserve H.15 / FDIC, IRS Pub 590-A/B (10 distinct)

**cap-rate-optimization**:
- NOI-based valuation methodology
- Cap rate by class: Class A 4.0-5.5%, Class B 5.5-7.0%, Class C 7.0-9.5%, Class D 10%+
- Cap rate by market: gateway -50 to -100bp spread (premium), tertiary +75 to +150bp spread
- Cap rate by sector: multifamily 4.5-6.5%, office CBD 7.0-10.0%
- Going-in cap vs exit cap; equity multiple targets by hold period
- Sources: CBRE Cap Rate Survey 2025, JLL Investor Intelligence 2025, Cushman & Wakefield Investor Insights, Marcus & Millichap National Multifamily Index 2025, NAR Commercial Real Estate Outlook 2025, RealPage multifamily data, Freddie Mac Multifamily Investment Index 2025, Federal Reserve Senior Loan Officer Survey (8 distinct)

Both Topics: ~6-7k chars en + ~2-3k chars zh Guide; ~600-1000 chars + 8-row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='F', domain='finance')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS F reduced from 2 to 0 (25 → 23; F category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (40s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (43s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (0.6s) |
| pnpm build | 551 → 559 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-e-extension-shipped]] — Wave E (Letter E Cost)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)