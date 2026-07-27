# P115 Tier-2 Round 3 Headers i18n Ship Log

## Summary

P115 translates 22 more tier-2 single-engine headers (1:1 per engine) using 5 namespaces:
`engine_projection.*` (8), `engine_health.*` (6), `engine_snapshot.*` (3), `engine_break_even.*` (3),
`engine_breakdown.*` (2). Direct continuation of P113/P114.

**Date:** 2026-07-27
**Batch ID:** P115
**Files touched:** 3 (translations.ts + page template + P103 test)
**Test delta:** 67 → 89 WORKING_KEY_REQUIRED entries (+22 P115 assertions)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts — 22 new keys

```ts
// 8 engine_projection.*
'engine_projection.ltv_milestones': { en: '🎯 LTV Milestones', zh: '🎯 LTV 里程碑' },
'engine_projection.multiple_ranges': { en: '🎯 Multiple Ranges by Stage:', zh: '🎯 分阶段倍数范围:' },
'engine_projection.brrrr_targets': { en: '🎯 BRRRR Targets:', zh: '🎯 BRRRR 目标:' },
'engine_projection.market_benchmarks': { en: '🎯 Market Benchmarks (Class A/B/C by city tier):', zh: '🎯 市场基准（A/B/C 类，按城市分级）:' },
'engine_projection.lender_thresholds': { en: '🎯 Lender Thresholds:', zh: '🎯 贷款机构阈值:' },
'engine_projection.list_growth': { en: '🎯 List Growth Projection:', zh: '🎯 列表增长预测:' },
'engine_projection.income_ladder': { en: '🎯 Income Ladder:', zh: '🎯 收入阶梯:' },
'engine_projection.yield_benchmarks': { en: '🎯 Yield Benchmarks:', zh: '🎯 收益率基准:' },
// 6 engine_health.*
'engine_health.burn': { en: '🩺 Burn Health:', zh: '🩺 烧钱健康:' },
'engine_health.cap_rate': { en: '🩺 Cap Rate Health:', zh: '🩺 资本化率健康:' },
'engine_health.churn': { en: '🩺 Churn Health:', zh: '🩺 流失健康:' },
'engine_health.dscr': { en: '🩺 DSCR Health:', zh: '🩺 DSCR 健康:' },
'engine_health.list': { en: '🩺 List Health:', zh: '🩺 列表健康:' },
'engine_health.margin': { en: '🩺 Margin Health:', zh: '🩺 利润健康:' },
// 3 engine_snapshot.*
'engine_snapshot.revenue': { en: '💰 Revenue Snapshot:', zh: '💰 收入快照:' },
'engine_snapshot.growth': { en: '💰 Growth Snapshot:', zh: '💰 增长快照:' },
'engine_snapshot.decision': { en: '💰 Decision Snapshot:', zh: '💰 决策快照:' },
// 3 engine_break_even.*
'engine_break_even.amortization_milestones': { en: '⚖️ Amortization Milestones:', zh: '⚖️ 摊销里程碑:' },
'engine_break_even.side_by_side': { en: '⚖️ Side-by-Side:', zh: '⚖️ 并排对比:' },
'engine_break_even.return_composition': { en: '⚖️ Return Composition:', zh: '⚖️ 收益构成:' },
// 2 engine_breakdown.*
'engine_breakdown.cap_rate_math': { en: '📐 Cap Rate Math:', zh: '📐 资本化率计算:' },
'engine_breakdown.rate_multipliers': { en: '📐 Rate Multipliers:', zh: '📐 费率倍数:' },
```

### Page template — extended post-processor (53 → 75 keys)

`headerKeys` array grows by 22 entries. Source strings vary in colon usage:
`'🎯 LTV Milestones'` has NO colon (ltv-calculator), others have colon. Post-processor uses
`out.split(en).join(zh)` so exact-string-match handles both forms.

### P103 test — 22 new assertions

WORKING_KEY_REQUIRED total: 67 → 89 entries.

## Why 5 namespaces (already established pattern from P113/P114)

| Namespace | Round 1 (P113) | Round 2 (P114) | Round 3 (P115) | Cumulative |
|---|---|---|---|---|
| `engine_projection.*` | 0 | 4 | **8** | 12 |
| `engine_health.*` | 11 | 2 | **6** | 19 |
| `engine_snapshot.*` | 7 | 0 | **3** | 10 |
| `engine_break_even.*` | 0 | 3 | **3** | 6 |
| `engine_breakdown.*` | 0 | 3 | **2** | 5 |
| **Total tier-2 keys** | 18 | 12 | **22** | **52** |

Each pattern keeps its own namespace for clarity. Engine-representative key per engine
distributed across 6/6 health + 8/8 projection + 3/3 snapshot.

## Source string colon variance

Some engines emit `'🎯 LTV Milestones'` (no colon) while siblings emit
`'🎯 Multiple Ranges by Stage:'` (with colon). Post-processor matches exact EN source so
both forms coexist in the key set.

## Verification

| Check | Result |
|---|---|
| `pnpm check` | 1195/0/0 ✓ |
| `pnpm build` (449 pages) | ✓ |
| P103 standalone (RUN_BUILD_TESTS=1) | **2/2 pass, 89 entries** ✓ |
| Working tree | clean ✓ |

Full build-dep test suite (`RUN_BUILD_TESTS=1 pnpm test:unit`) is slow due to repeated
`pnpm build` triggers when each suite encounters missing dist/. Standalone P103 run confirms
the 22 new assertions validate correctly.

## Post-processor headerKeys cumulative

| Batch | Keys | Cumulative |
|---|---|---|
| P85a | 6 | 6 |
| P98 | 4 | 10 |
| P99/P102 | 2 | 12 |
| P104 | 1 | 13 |
| P105 | 3 | 16 |
| P111 | 7 | 23 |
| P113 | 18 | 41 |
| P114 | 12 | 53 |
| **P115** | **22** | **75** |

## P103 WORKING_KEY_REQUIRED cumulative

| Batch | Assertions | Cumulative |
|---|---|---|
| P102 | 2 | 2 |
| P104 | 4 | 6 |
| P105 | 4 | 10 |
| P112 | 27 | 37 |
| P113 | 18 | 55 |
| P114 | 12 | 67 |
| **P115** | **22** | **89** |

## Related references

- **P111/P112** — tier-1 multi-engine v3 headers
- **P113** — tier-2 round 1 (health/snapshot)
- **P114** — tier-2 round 2 (2 health gap-fill + 4 projection + 3 break-even + 3 breakdown)
- **P115** — tier-2 round 3 (8 projection + 6 health + 3 snapshot + 3 break-even + 2 breakdown)
- `src/pages/[lang]/[slug].astro:54-145` — translateCalcOutput (now 75 keys)
- `tests/dead-i18n-keys-guard.test.ts:85-174` — WORKING_KEY_REQUIRED (now 89 entries)

## P116+ candidates

- **Tier-2 round 4** — 60+ remaining keys (composite data-driven lines like '📊 Snapshot: ...'
  with values embedded, AI cost engine 'Batch pricing' tip lines, engine titles, result lines)
- **Codegen-enforce defense-in-depth matrix** — automate the CLAUDE.md snapshot
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **CHANGELOG catch-up v4** — P110-P115 (6 batches: defense-in-depth matrix + 3 tier-2 rounds + 3 size guards)