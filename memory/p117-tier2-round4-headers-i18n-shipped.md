# P117 Tier-2 Round 4 Headers i18n Ship Log

## Summary

P117 translates 22 more tier-2 single-engine headers (1:1 per engine) using 5 namespaces:
`engine_projection.*` (8), `engine_health.*` (5), `engine_snapshot.*` (4), `engine_break_even.*` (3),
`engine_breakdown.*` (2). Direct continuation of P113/P114/P115.

**Date:** 2026-07-27
**Batch ID:** P117
**Files touched:** 3 (translations.ts + page template + P103 test)
**Test delta:** 89 → 111 WORKING_KEY_REQUIRED entries (+22 P117 assertions)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts — 22 new keys

```ts
// 8 engine_projection.*
'engine_projection.ltv_by_tier': { en: '🎯 LTV by Tier:', zh: '🎯 按层级 LTV:' },
'engine_projection.ownership_outcomes': { en: '🎯 Ownership Outcomes:', zh: '🎯 持股结果:' },
'engine_projection.quarterly_payment_plan': { en: '🎯 Quarterly Payment Plan:', zh: '🎯 季度付款计划:' },
'engine_projection.exit_value_by_round': { en: '🎯 Exit Value by Round:', zh: '🎯 各轮退出价值:' },
'engine_projection.mrr_milestone_projections': { en: '🎯 MRR Milestone Projections', zh: '🎯 MRR 里程碑预测' },
'engine_projection.action_plan': { en: '🎯 Action Plan', zh: '🎯 行动计划' },
'engine_projection.revenue_at_scale': { en: '🎯 Revenue at Scale:', zh: '🎯 规模化收入:' },
'engine_projection.time_to_goal_milestones': { en: '🎯 Time-to-Goal Milestones:', zh: '🎯 目标时间里程碑:' },
// 5 engine_health.*
'engine_health.rate': { en: '🩺 Rate Health:', zh: '🩺 费率健康:' },
'engine_health.compounding': { en: '🩺 Compounding Health:', zh: '🩺 复利健康:' },
'engine_health.founder': { en: '🩺 Founder Health:', zh: '🩺 创始人健康:' },
'engine_health.market_position': { en: '🩺 Market Position:', zh: '🩺 市场定位:' },
'engine_health.yield': { en: '🩺 Yield Health:', zh: '🩺 收益率健康:' },
// 4 engine_snapshot.*
'engine_snapshot.loan': { en: '💰 Loan Snapshot:', zh: '💰 贷款快照:' },
'engine_snapshot.cost_summary': { en: '💰 Cost Summary', zh: '💰 成本摘要' },
'engine_snapshot.property': { en: '💰 Property Snapshot:', zh: '💰 房产快照:' },
'engine_snapshot.investment': { en: '💰 Investment Snapshot:', zh: '💰 投资快照:' },
// 3 engine_break_even.*
'engine_break_even.forward_valuation': { en: '⚖️ Forward Valuation:', zh: '⚖️ 前向估值:' },
'engine_break_even.self_employed_vs_w2': { en: '⚖️ Self-Employed vs W-2 Break-Even:', zh: '⚖️ 自雇 vs W-2 盈亏平衡:' },
'engine_break_even.profitable_hourly': { en: '⚖️ Profitable Hourly:', zh: '⚖️ 盈利时薪:' },
// 2 engine_breakdown.*
'engine_breakdown.ctr_epc_funnel': { en: '📐 CTR/EPC Funnel:', zh: '📐 CTR/EPC 漏斗:' },
'engine_breakdown.key_saas_metrics': { en: '📐 Key SaaS Metrics', zh: '📐 关键 SaaS 指标' },
```

### Page template — extended post-processor (75 → 97 keys)

`headerKeys` array grows by 22 entries. 4 of 22 lack trailing colon (`MRR Milestone
Projections`, `Action Plan`, `Cost Summary`, `Key SaaS Metrics`) — post-processor's exact
match handles both forms.

### P103 test — 22 new assertions

WORKING_KEY_REQUIRED total: 89 → 111 entries.

## Why 5 namespaces (P113/P114/P115 pattern continues)

| Namespace | P113 | P114 | P115 | P117 | Cumulative |
|---|---|---|---|---|---|
| `engine_projection.*` | 0 | 4 | 8 | **8** | 20 |
| `engine_health.*` | 11 | 2 | 6 | **5** | 24 |
| `engine_snapshot.*` | 7 | 0 | 3 | **4** | 14 |
| `engine_break_even.*` | 0 | 3 | 3 | **3** | 9 |
| `engine_breakdown.*` | 0 | 3 | 2 | **2** | 7 |
| **Total tier-2 keys** | 18 | 12 | 22 | **22** | **74** |

Plus 7 `business.section.*` from P111 = **81 total post-processor keys**.

## Source string colon variance (carried forward from P114/P115)

| Form | P117 count | Examples |
|---|---|---|
| With trailing `:` | 18 | `LTV by Tier:`, `Rate Health:`, `Loan Snapshot:` |
| Without `:` | 4 | `MRR Milestone Projections`, `Action Plan`, `Cost Summary`, `Key SaaS Metrics` |

Post-processor's `out.split(en).join(zh)` exact-match handles both forms.

## Verification

| Check | Result |
|---|---|
| `pnpm check` | 1195/0/0 ✓ |
| P103 standalone (RUN_BUILD_TESTS=1) | **2/2 pass, 111 entries** ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

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
| P115 | 22 | 75 |
| **P117** | **22** | **97** |

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
| **P117** | **22** | **111** |

## Related references

- **P111** — tier-1 business section keys
- **P113/P114/P115** — tier-2 rounds 1/2/3 (52 keys)
- **P117** — tier-2 round 4 (22 keys)
- `src/pages/[lang]/[slug].astro:54-167` — translateCalcOutput (now 97 keys)
- `tests/dead-i18n-keys-guard.test.ts:85-196` — WORKING_KEY_REQUIRED (now 111 entries)

## P118+ candidates

- **Tier-2 round 5** — ~30 remaining static headers (Compounding subheaders, Cost Breakdown, Funnel Metrics, etc.)
- **Tier-2 round 6** — composite data-driven lines (need new approach: source-level translation or customFn-based)
- **Codegen-enforce defense-in-depth matrix** — automate the CLAUDE.md snapshot
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **CHANGELOG catch-up v5** — P117 (single batch this era)