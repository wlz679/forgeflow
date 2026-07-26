# P102 Dead i18n Keys Cleanup Ship Log

## Summary

P102 deletes 4 dead i18n keys added in P99/P100 that referenced strings not present in any engine staticExamples. Also adds 1 new working key for remote-vs-office-calculator (the existing `breakeven_analysis` key only matched break-even-calculator's `📊` variant, not remote-vs-office's `🎯` variant).

**Date:** 2026-07-26
**Batch ID:** P102
**Files touched:** 2 (translations.ts + page template)
**Test delta:** 1192 → 1191 (-1 key count)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts
- **Deleted 4 dead keys**: `ops_cost.section.savings_insights`, `ops_cost.section.usage_scenarios`, `misc.section.savings_insights`, `misc.section.usage_scenarios`
- **Kept 1 working key**: `ops_cost.section.breakeven_analysis` (matches `📊 Break-Even Analysis` in break-even-calculator)
- **Added 1 new working key**: `ops_cost.section.target_break_even` (matches `🎯 Break-Even Analysis:` in remote-vs-office-calculator)

### Page template `translateCalcOutput` function
- `headerKeys` array now has 2 ops_cost keys (was 5: 3 ops_cost + 2 misc)
- Net change: -3 key entries, -4 dead translations, +1 working translation (remote-vs-office)

## Why P101 root cause analysis was partially wrong

P101 documented that the post-processor only modifies `staticExamples[0]`, and section headers in some engines are in later examples or customFn. **This was correct for 4 of 5 P99/P100 keys** — those strings (`💰 Savings Insights`, `📊 Usage Scenarios (monthly costs)`) really don't appear in any cost/ops/valuation engine output. The keys were speculative, never translated anything.

But for `ops_cost.section.breakeven_analysis`, the string IS in `staticExamples[0]` of break-even-calculator and DOES translate. The P101 investigation was wrong about this specific key.

## Emoji variant mismatch (key finding)

Investigation revealed two distinct string variants for "Break-Even Analysis" across engines:

| Engine | Variant | Translation key |
|---|---|---|
| `valuation/break-even-calculator.ts` | `📊 Break-Even Analysis` (bar chart, no colon) | `ops_cost.section.breakeven_analysis` ✓ |
| `cost/remote-vs-office-calculator.ts` | `🎯 Break-Even Analysis:` (target, with colon) | needed new key |

The post-processor uses exact string match, so emoji/colon differences matter. A single key can't cover both — that's why P102 adds a second key.

## Why the dead keys existed

P99/P100 assumed ops/cost/valuation engines use the same **standardized** section header pattern as AI cost engines (P85a works because AI cost engines use `💰 Cost Breakdown`, `📈 Growth Projection`, etc. consistently).

But cost/ops/valuation engines use **engine-specific** headers:
- `carrying-cost-calculator`: `💰 Inventory Investment Breakdown`
- `employee-cost-calculator`: `💰 True Cost Breakdown`
- `meeting-cost-calculator`: `💰 Cost Snapshot`
- `remote-vs-office-calculator`: `💰 Cost Comparison (Annual)`
- `break-even-calculator`: `📊 Break-Even Analysis`

Each engine has its own naming convention. No generic key can cover all of them. The right approach for these engines is per-engine i18n keys (large scope, deferred).

## Verified translations

**After P102:**
- `dist/zh/solopreneur-break-even-calculator/index.html`: `<h3>📊 盈亏平衡分析</h3>` ✓
- `dist/zh/solopreneur-remote-vs-office-calculator/index.html`: `🎯 盈亏平衡分析:` ✓
- en pages unchanged (raw English preserved)

## Pattern implications for future i18n work

**Lesson learned** (should be added to P102+ plan templates):
- Before adding a generic post-processor key, **grep all 100 engine staticExamples** to confirm the exact string exists in at least one engine's [0]
- If the string varies by engine (different emoji, punctuation), add **per-variant keys** instead of one generic key
- For cost/ops/valuation categories, expect **engine-specific** headers, not standardized ones

## What was NOT done

- ❌ Did NOT add per-engine i18n keys for all 25 cost/ops/valuation engines (large scope, deferred)
- ❌ Did NOT extend post-processor to all staticExamples (low value — section headers generally in [0] only)
- ❌ Did NOT add build-dep test guarding against future dead-key additions (could be P103+)
- ❌ Did NOT investigate why `engines/operations/stockout-cost-calculator.ts` etc. don't have savings/usage sections matching the deleted keys (they use different terminology)

## Related references

- **P85a** — original post-processor pattern for AI cost engines (standardized headers)
- **P98** — extended to SaaS section headers
- **P99** — added ops/cost/valuation keys (3, of which 2 were dead code)
- **P100** — added misc duplicates (2, both dead code)
- **P101** — root cause investigation, partially incorrect findings
- **P102** — this batch (cleanup + new working key)
- `src/pages/[lang]/[slug].astro:53-86` — `translateCalcOutput` function

## P103+ candidates

- **Add build-dep test** to prevent future dead-key additions (walks 100 zh pages, asserts no `💰 Savings Insights` / `📊 Usage Scenarios (monthly costs)` appears untranslated — would catch re-additions)
- **Per-engine i18n keys** for cost/ops/valuation section headers (large scope, ~20+ keys)
- **JS bundle size CI guard** — extends performance dimension
- **Audit script migration** — extract parser logic to shared library
- **CHANGELOG catch-up** — P66b-P102 (37 batches) since P65 catch-up