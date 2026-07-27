# P118 Tier-2 Round 5 Headers i18n Ship Log

## Summary

P118 translates 28 more tier-2 single-engine headers (1:1 per engine) across 5 namespaces:
`engine_projection.*` (6), `engine_health.*` (7), `engine_snapshot.*` (8), `engine_break_even.*` (2),
`engine_breakdown.*` (5). Spans 14 engines (revenue-projector, affiliate-income, rent-vs-buy,
time-value, mortgage, mrr, freelance-rate, freelance-tax, market-size, burn-multiple-rule-of-40,
equity-dilution, unit-economics, email-list-revenue, course-pricing). Direct continuation of
P113/P114/P115/P117.

**Date:** 2026-07-27
**Batch ID:** P118
**Files touched:** 3 (translations.ts + page template + P103 test)
**Test delta:** 111 → 139 WORKING_KEY_REQUIRED entries (+28 P118 assertions)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts — 28 new keys

```ts
// 6 engine_projection.*
'engine_projection.mrr_milestones': { en: 'MRR Milestones', zh: 'MRR 里程碑' },
'engine_projection.key_milestones': { en: 'Key Milestones', zh: '关键里程碑' },
'engine_projection.growth_scenarios_12_month': { en: 'Growth Scenarios (12-Month Outlook)', zh: '增长情景（12 个月展望）' },
'engine_projection.stay_horizon_milestone': { en: 'Stay-Horizon Milestone:', zh: '停留期里程碑:' },
'engine_projection.time_to_goal': { en: 'Time-to-Goal:', zh: '目标时间:' },
'engine_projection.scale_projection': { en: 'Scale Projection:', zh: '规模化预测:' },
// 7 engine_health.*
'engine_health.funnel': { en: 'Funnel Health:', zh: '漏斗健康:' },
'engine_health.verdict': { en: 'Verdict Health:', zh: '决策健康:' },
'engine_health.utilization': { en: 'Utilization Health:', zh: '利用率健康:' },
'engine_health.saas_quadrant': { en: 'SaaS Health Quadrant:', zh: 'SaaS 健康象限:' },
'engine_health.affordability': { en: 'Affordability Health:', zh: '可负担健康:' },
'engine_health.churn_contraction': { en: 'Churn & Contraction Health', zh: '流失与收缩健康' },
'engine_health.tax_efficiency': { en: 'Tax Efficiency:', zh: '税务效率:' },
// 8 engine_snapshot.*
'engine_snapshot.traffic_conversions': { en: 'Your Traffic & Conversions:', zh: '你的流量与转化:' },
'engine_snapshot.time_wealth': { en: 'Time Wealth Snapshot:', zh: '时间财富快照:' },
'engine_snapshot.rule_of_40': { en: 'Rule of 40 Result:', zh: '40 法则结果:' },
'engine_snapshot.burn_multiple': { en: 'Burn Multiple Result:', zh: '烧钱倍数结果:' },
'engine_snapshot.cap_table': { en: 'Cap Table Snapshot:', zh: '股权快照:' },
'engine_snapshot.monthly_payment': { en: 'Monthly Payment:', zh: '月供:' },
'engine_snapshot.rate_ladder': { en: 'Rate Ladder (market context):', zh: '费率阶梯（市场背景）:' },
'engine_snapshot.reality_check': { en: 'Reality Check', zh: '现实校验' },
// 2 engine_break_even.*
'engine_break_even.runway_breakeven': { en: 'Runway & Breakeven', zh: '跑道与盈亏平衡' },
'engine_break_even.loan_term': { en: 'Loan Term Comparison:', zh: '贷款期限对比:' },
// 5 engine_breakdown.*
'engine_breakdown.monthly_mrr': { en: 'Monthly MRR Breakdown', zh: '月度 MRR 明细' },
'engine_breakdown.time_to_value': { en: 'Time-to-Value Ratios:', zh: '时间价值比:' },
'engine_breakdown.dilution_per_round': { en: 'Dilution per Round:', zh: '每股轮次稀释:' },
'engine_breakdown.scaling_economics': { en: 'Scaling Economics', zh: '规模化经济' },
'engine_breakdown.funnel_metrics': { en: 'Funnel Metrics:', zh: '漏斗指标:' },
```

### Page template — extended post-processor (97 → 125 keys)

`headerKeys` array grows by 28 entries. Post-processor's `out.split(en).join(zh)` exact-match
handles all forms (with/without trailing colon, with/without `&`, with parentheses).

### P103 test — 28 new assertions

WORKING_KEY_REQUIRED total: 111 → 139 entries.

## Why 5 namespaces (P113/P114/P115/P117 pattern continues)

| Namespace | P113 | P114 | P115 | P117 | **P118** | Cumulative |
|---|---|---|---|---|---|---|
| `engine_projection.*` | 0 | 4 | 8 | 8 | **6** | 26 |
| `engine_health.*` | 11 | 2 | 6 | 5 | **7** | 31 |
| `engine_snapshot.*` | 7 | 0 | 3 | 4 | **8** | 22 |
| `engine_break_even.*` | 0 | 3 | 3 | 3 | **2** | 11 |
| `engine_breakdown.*` | 0 | 3 | 2 | 2 | **5** | 12 |
| **Total tier-2 keys** | 18 | 12 | 22 | 22 | **28** | **102** |

Plus 7 `business.section.*` from P111 = **109 total post-processor keys**.

## Engines covered

| Engine | New keys |
|---|---|
| `solopreneur-revenue-projector` | 5 (mrr_milestones, key_milestones, growth_scenarios_12_month, runway_breakeven, monthly_mrr) |
| `solopreneur-affiliate-income-calculator` | 3 (traffic_conversions, funnel, scale_projection) |
| `solopreneur-time-value-calculator` | 4 (time_wealth, utilization, time_to_goal, time_to_value) |
| `solopreneur-mortgage-calculator` | 3 (affordability, monthly_payment, loan_term) |
| `solopreneur-burn-multiple-rule-of-40-calculator` | 3 (rule_of_40, burn_multiple, saas_quadrant) |
| `solopreneur-rent-vs-buy-calculator` | 2 (stay_horizon_milestone, verdict) |
| `solopreneur-freelance-rate-calculator` | 1 (rate_ladder) |
| `solopreneur-freelance-tax-calculator` | 1 (tax_efficiency) |
| `solopreneur-mrr-calculator` | 1 (churn_contraction) |
| `solopreneur-market-size-estimator` | 1 (reality_check) |
| `solopreneur-equity-dilution-calculator` | 2 (cap_table, dilution_per_round) |
| `solopreneur-unit-economics-calculator` | 1 (scaling_economics) |
| `solopreneur-email-list-revenue-calculator` | 1 (funnel_metrics) |
| `solopreneur-course-pricing-calculator` | (0 — keys deferred, see P119 candidates) |

**14 engines, 28 keys, 1:1 per engine pattern (some engines emit 1-5 new headers).**

## Source string variance (carried forward from P114/P115/P117)

| Form | P118 count | Examples |
|---|---|---|
| With trailing `:` | 19 | `Stay-Horizon Milestone:`, `Tax Efficiency:`, `Monthly Payment:` |
| Without `:` | 9 | `MRR Milestones`, `Churn & Contraction Health`, `Reality Check` |
| With `&` | 3 | `Your Traffic & Conversions:`, `Churn & Contraction Health`, `Runway & Breakeven` |
| With parentheses | 2 | `Growth Scenarios (12-Month Outlook)`, `Rate Ladder (market context):` |

Post-processor's `out.split(en).join(zh)` exact-match handles all forms.

## Verification

| Check | Result |
|---|---|
| `pnpm build` | 449 pages ✓ |
| `pnpm check` | 1195/0/0 ✓ |
| P103 standalone (RUN_BUILD_TESTS=1) | **2/2 pass, 139 entries** ✓ |
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
| P117 | 22 | 97 |
| **P118** | **28** | **125** |

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
| **P118** | **28** | **139** |

## Related references

- **P111** — tier-1 business section keys
- **P113/P114/P115/P117** — tier-2 rounds 1/2/3/4 (74 keys)
- **P118** — tier-2 round 5 (28 keys)
- `src/pages/[lang]/[slug].astro:54-167` — translateCalcOutput (now 125 keys)
- `tests/dead-i18n-keys-guard.test.ts:85-200` — WORKING_KEY_REQUIRED (now 139 entries)

## P119+ candidates

- **Tier-2 round 6** — ~15-20 remaining static headers (course-pricing `Revenue Projection:`/`Pricing Metrics:`/`Launch Revenue:`, unit-economics `Optimization Levers`/`Lever Impact Ranking`, freelance-tax `Take-Home Breakdown:`, project-profitability `Net Profit + Margin:`, email-list-revenue `List Economics:`, freelance-rate `Target Rate Snapshot:`, market-size `Market Health:`)
- **Tier-2 round 7** — composite data-driven lines (need new approach: source-level translation or customFn-based)
- **Codegen-enforce defense-in-depth matrix** — automate the CLAUDE.md snapshot
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check
- **CHANGELOG catch-up v5** — P117 + P118 (2 batches this era)