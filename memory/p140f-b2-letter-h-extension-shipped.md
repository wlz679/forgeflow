---
name: p140f-b2-letter-h-extension-shipped
description: P140f-B2 Wave H — Letter H Tier 1 extension. 2 Topics (fully-loaded-employee-cost-optimization + attrition-cost-optimization) × 2 templates = 4 new pages.
metadata:
  type: project
  shipped: 2026-08-21
  commit: c4f4d3d
---

# P140f-B2 Letter H Hiring & Team Extension — SHIPPED

**Date:** 2026-08-21
**Commit:** `c4f4d3d` (master, direct)
**Branch:** master (direct-to-master cadence)
**Parent:** [[p140f-b2-letter-f-extension-shipped]] (Wave F, commit d92cc4e)

---

## Change

| Letter | Tier 1 Topic ID | en Title | zh Title | Calculator |
|---|---|---|---|---|
| H | `fully-loaded-employee-cost-optimization` | Fully-Loaded Employee Cost Optimization | 员工全负担成本优化 | `solopreneur-fully-loaded-employee-cost-calculator` |
| H | `attrition-cost-optimization` | Attrition Cost Optimization | 员工流失成本优化 | `solopreneur-attrition-cost-calculator` |

**Total**: 2 new Tier 1 Topics × 2 templates × 2 langs = **8 new pages** (559 → 567).

## Content highlights

**fully-loaded-employee-cost-optimization** (DIFFERENT LENS from anchor — per-component decomposition + negotiation playbook):
- BLS ECEC multiplier US: 1.25-1.40x base salary
- Benefits composition: 25-35% (health 8-12%, 401k 3-6%, PTO 4-6%, other 2-5%)
- Payroll tax: 7.65-15.3% (FICA 7.65% + FUTA 0.6% + SUTA 0.5-5.3%)
- Equity add-on: 10-30% (median 20% L5/L6)
- Regional multipliers: US tier-1 1.0 / US mid 0.85-0.95 / EU 0.80-1.10 / China tier-1 0.60-0.75 / India 0.40-0.55 / LatAm 0.50-0.65
- Signing bonus amortization: 2-3yr (IRS §409A 2-yr defer if > 2x comp limit)
- Healthcare premium inflation: 5-7%/yr
- Sources: BLS ECEC 2024 Q3, SHRM 2024 Benefits, CompTIA 2024, Mercer 2024, Aon Radford 2024, Payscale 2024, Pave 2024, China MoHRSS 2024, KFF 2024, IRS Pub 15, IRS §409A, ASC 710, Zylo 2024 (13 distinct)

**attrition-cost-optimization** (DIFFERENT LENS from anchor — attrition quantification + prevention ROI):
- Industry attrition rates: tech 13-15%, healthcare 20-25%, retail 60-70%, hospitality 70-80%, financial 12-15%, manufacturing 30-40%
- Replacement cost by level: entry 50% salary, mid 100-150%, senior 150-200%, executive 200-400%
- Regrettable attrition: tech 7-9%, sales 20-30%, support 25-35%
- Retention program ROI: 2-4x
- Time-to-productivity by role: 2-12 months
- Sources: SHRM 2022 Human Capital Benchmarking, LinkedIn Workforce Reports 2024, Gallup State of Global Workplace 2024, Mercer Turnover Survey 2024, BLS JOLTS 2024, CompTIA Workforce Reports 2024, Saratoga/PwC, Pave 2024, AHLA lodging report, NAM manufacturing report (10 distinct)

Both Topics: ~7-8k chars en + ~2-3k chars zh Guide; ~600-1000 chars + 8-row Benchmark data table × 2 langs.

## Data layer updates

- `src/data/topics.ts`: +2 entries (tier=1, letterId='H', domain='people')
- `src/data/topic-content.ts`: +4 entries
- `src/data/prose-tiers.ts`: TIER_2_SLUGS H reduced from 2 to 0 (23 → 21; H category fully extended)

## Verification

| Check | Result |
|---|---|
| tsc --noEmit | clean |
| topic-guide-shape-guard (build-dep) | 1/1 pass (55s) |
| topic-benchmark-shape-guard (build-dep) | 1/1 pass (42s) |
| topic-content-coverage-guard (build-dep) | 1/1 pass (1.4s) |
| pnpm build | 559 → 567 pages (+8) |
| 3-way divergence | 0/0 after commit |

## Related

- [[p140f-b2-letter-f-extension-shipped]] — Wave F (Letter F Real Estate)
- P140f Phase 2 plan (`docs/superpowers/plans/2026-08-20-p140f-phase2-tier1-extension.md`)