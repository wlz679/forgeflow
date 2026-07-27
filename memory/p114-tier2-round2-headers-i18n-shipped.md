# P114 Tier-2 Round 2 Headers i18n Ship Log

## Summary

P114 translates 12 more tier-2 single-engine headers (1:1 per engine) using 4 namespaces: `engine_health.*` (LTV/CAC gap fill from P113), `engine_projection.*`, `engine_break_even.*`, `engine_breakdown.*`. Direct continuation of P113.

**Date:** 2026-07-27
**Batch ID:** P114
**Files touched:** 3 (translations.ts + page template + P103 test)
**Test delta:** 1201 → 1201 (no new tests; +12 P114 assertions in P103)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts — 12 new keys

```ts
// 2 engine_health.* (P113 gap fill)
'engine_health.ltv': { en: '🩺 LTV Health:', zh: '🩺 LTV 健康:' },
'engine_health.cac': { en: '🩺 CAC Health:', zh: '🩺 CAC 健康:' },
// 4 engine_projection.*
'engine_projection.annual': { en: '🎯 Annual Projection:', zh: '🎯 年度预测:' },
'engine_projection.quarterly_annual': { en: '🎯 Quarterly & Annual Projection:', zh: '🎯 季度与年度预测:' },
'engine_projection.improvement': { en: '🎯 Improvement Projection:', zh: '🎯 改善预测:' },
'engine_projection.volume': { en: '🎯 Volume Projection:', zh: '🎯 交易量预测:' },
// 3 engine_break_even.*
'engine_break_even.contractor': { en: '⚖️ Full-Time vs Contractor Break-Even:', zh: '⚖️ 全职 vs 合同工盈亏平衡:' },
'engine_break_even.async_sync': { en: '⚖️ Async vs Sync Break-Even:', zh: '⚖️ 异步 vs 同步盈亏平衡:' },
'engine_break_even.deep_shallow': { en: '⚖️ Deep Work vs Shallow Work Break-Even:', zh: '⚖️ 深度工作 vs 浅层工作盈亏平衡:' },
// 3 engine_breakdown.*
'engine_breakdown.per_employee': { en: '📐 Per-Employee Breakdown:', zh: '📐 人均明细:' },
'engine_breakdown.multiple': { en: '📐 Multiple Determination:', zh: '📐 倍数确定:' },
'engine_breakdown.conversion': { en: '📐 Conversion Mechanics:', zh: '📐 转换机制:' },
```

### Page template — extended post-processor (41 → 53 keys)

`headerKeys` array grows by 12: `engine_health.{ltv,cac}` + `engine_projection.*` (4) + `engine_break_even.*` (3) + `engine_breakdown.*` (3).

### P103 test — 12 new assertions

WORKING_KEY_REQUIRED total: 55 → 67 entries.

## Why 4 namespaces

Each pattern (Health / Projection / Break-Even / Breakdown) has its own namespace for clarity. Future batches can add `engine_insight.*` (e.g., `🎯 Audience Insight:`, `📦 Product Insight:`) following the same pattern.

## P113 gap discovery

P114 includes 2 `engine_health.*` keys (LTV, CAC) that P113 missed. P113 cataloged 11 `🩺 X Health:` headers from the cost/operations clusters but skipped the valuation cluster's LTV + CAC health headers. P114 closes this gap.

35+ remaining tier-2 headers still untranslated (specific X patterns + engine titles + result lines).

## Verification

| Check | Result |
|---|---|
| Build (449 pages) | ✓ |
| 12 sample translations on zh pages | **12/12 verified** ✓ (3x each) |
| `dead-i18n-keys-guard` (P103 + P111 + P112 + P113 + P114) | 2/2 pass, 67 entries |
| `check-i18n-completeness` | 411 keys ✓ |
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
| **P114** | 12 | **53** |

## P103 WORKING_KEY_REQUIRED cumulative

| Batch | Assertions | Cumulative |
|---|---|---|
| P102 | 2 | 2 |
| P104 | 4 | 6 |
| P105 | 4 | 10 |
| P112 | 27 | 37 |
| P113 | 18 | 55 |
| **P114** | 12 | **67** |

## Related references

- **P111/P112** — tier-1 multi-engine v3 headers
- **P113** — tier-2 round 1 (health/snapshot)
- **P114** — this batch (tier-2 round 2: 2 health gap fill + 4 projection + 3 break-even + 3 breakdown)
- `src/pages/[lang]/[slug].astro:53-99` — translateCalcOutput (now 53 keys)

## P115+ candidates

- **Tier-2 round 3** — remaining 23+ keys (specific X patterns like LTV Milestones, Multiple Ranges, Ownership Outcomes; engine titles; result lines)
- **Codegen-enforce defense-in-depth matrix** — automate the snapshot
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check