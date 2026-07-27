# P119 Tier-2 Round 6 Headers i18n Ship Log

## Summary

P119 closes the **1:1 per-engine static tier-2 pattern** with 11 final keys across 5 namespaces:
`engine_projection.*` (1), `engine_health.*` (1), `engine_snapshot.*` (6), `engine_breakdown.*` (3).
Spans 7 engines (course-pricing, email-list-revenue, freelance-rate, freelance-tax, market-size,
project-profitability, unit-economics). This is the last static 1:1 per-engine tier-2 batch —
remaining untranslated output is composite data-driven lines that require a different approach.

**Date:** 2026-07-27
**Batch ID:** P119
**Files touched:** 3 (translations.ts + page template + P103 test)
**Test delta:** 139 → 150 WORKING_KEY_REQUIRED entries (+11 P119 assertions)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts — 11 new keys

```ts
// 1 engine_projection.*
'engine_projection.revenue_projection': { en: 'Revenue Projection:', zh: '收入预测:' },
// 1 engine_health.*
'engine_health.market': { en: 'Market Health:', zh: '市场健康:' },
// 6 engine_snapshot.*
'engine_snapshot.launch_revenue': { en: 'Launch Revenue:', zh: '发布收入:' },
'engine_snapshot.pricing_metrics': { en: 'Pricing Metrics:', zh: '定价指标:' },
'engine_snapshot.list_economics': { en: 'List Economics:', zh: '列表经济:' },
'engine_snapshot.target_rate': { en: 'Target Rate Snapshot:', zh: '目标费率快照:' },
'engine_snapshot.annualized_profit': { en: 'Annualized Profit:', zh: '年化利润:' },
'engine_snapshot.net_profit_margin': { en: 'Net Profit + Margin:', zh: '净利润与利润率:' },
// 3 engine_breakdown.*
'engine_breakdown.take_home': { en: 'Take-Home Breakdown:', zh: '实收明细:' },
'engine_breakdown.lever_impact': { en: 'Lever Impact Ranking', zh: '杠杆影响排名' },
'engine_breakdown.optimization_levers': { en: 'Optimization Levers', zh: '优化杠杆' },
```

### Page template — extended post-processor (125 → 136 keys)

`headerKeys` array grows by 11 entries.

### P103 test — 11 new assertions

WORKING_KEY_REQUIRED total: 139 → 150 entries.

## Engines covered

| Engine | New keys |
|---|---|
| `solopreneur-course-pricing-calculator` | 3 (revenue_projection, launch_revenue, pricing_metrics) |
| `solopreneur-project-profitability-calculator` | 2 (annualized_profit, net_profit_margin) |
| `solopreneur-unit-economics-calculator` | 2 (lever_impact, optimization_levers) |
| `solopreneur-email-list-revenue-calculator` | 1 (list_economics) |
| `solopreneur-freelance-rate-calculator` | 1 (target_rate) |
| `solopreneur-freelance-tax-calculator` | 1 (take_home) |
| `solopreneur-market-size-estimator` | 1 (market) |

**7 engines, 11 keys, 1:1 per engine pattern (course-pricing 3 most, project-profitability/unit-economics 2 each).**

## Cumulative tier-2 closure

| Batch | Keys | Cumulative |
|---|---|---|
| P113 | 18 | 18 |
| P114 | 12 | 30 |
| P115 | 22 | 52 |
| P117 | 22 | 74 |
| P118 | 28 | 102 |
| **P119** | **11** | **113** |

Plus 7 `business.section.*` from P111 = **120 total post-processor keys**.

**P119 closes the 1:1 per-engine static tier-2 pattern** — all remaining tier-2 candidates from
P118 round 5 memory have been translated. Subsequent tier-2 work (P120+) must target composite
data-driven lines (e.g., `Cheapest: GPT X at $Y/mo`, `Batch pricing: $X/req ($Y/mo) — save 50%`,
`Cost Comparison (100 reqs/day)`, bar chart labels, etc.) which need a different approach
(source-level translation or customFn-side i18n).

## P103 WORKING_KEY_REQUIRED cumulative

| Batch | Assertions | Cumulative |
|---|---|---|
| P102 | 2 | 2 |
| P104 | 4 | 6 |
| P105 | 4 | 10 |
| P112 | 27 | 37 |
| P113 | 18 | 55 |
| P114 | 12 | 67 |
| P115 | 22 | 89 |
| P117 | 22 | 111 |
| P118 | 28 | 139 |
| **P119** | **11** | **150** |

## Verification

| Check | Result |
|---|---|
| `pnpm build` | 449 pages ✓ |
| `pnpm check` | exit 0 ✓ |
| P103 standalone (RUN_BUILD_TESTS=1) | **2/2 pass, 150 entries** ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P111** — tier-1 business section keys (7)
- **P113/P114/P115/P117/P118** — tier-2 rounds 1/2/3/4/5 (102 keys)
- **P119** — tier-2 round 6 final (11 keys)
- `src/pages/[lang]/[slug].astro:54-167` — translateCalcOutput (now 136 keys)
- `tests/dead-i18n-keys-guard.test.ts:85-200` — WORKING_KEY_REQUIRED (now 150 entries)

## P120+ candidates

- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based):
  - AI cost engines: `Cost Comparison (X reqs/day)`, `Cheapest: X at $Y/mo`, `Best value: X at $Y/mo`, `Batch pricing: $X/req ($Y/mo) — save Z%`
  - Business engines: dynamic projection rows, bar chart labels
  - Likely 50-100 candidates total
- **Codegen-enforce defense-in-depth matrix** — automate the CLAUDE.md snapshot
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **CHANGELOG catch-up v5** — P117 + P118 + P119 (3 batches this era)
- **Engine titles i18n** — `t(\`tools.${slug}.title\`, lang)` already used in [slug].astro:43; verify 100/100 translated