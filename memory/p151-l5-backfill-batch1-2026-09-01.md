# P151 L5 Backfill Batch 1 — Shipped

**Date**: 2026-09-01
**Branch**: feature/p151-l5-backfill-batch1 (merged to master at `7c171c9`, deleted)
**Scope**: 5 engines × L5 Decision Recommendation 4-section block
**Method**: TDD per engine (red → green → commit), saas-burn-rate P140f-7 template

---

## Engines Shipped

| # | Engine | Category | Lines added | Test added | Commit |
|---|---|---|---|---|---|
| 1 | cost/employee-cost-calculator | HR/Finance | +12 | exp-p151-l5-employee-cost.test.ts | 5ae6bcb |
| 2 | marketing/ltv-by-channel-calculator | Marketing | +12 (const→let + 7) | exp-p151-l5-ltv-by-channel.test.ts | 5067333 |
| 3 | freelance/freelance-rate-calculator | Freelance | +12 | exp-p151-l5-freelance-rate.test.ts | dd56dc5 |
| 4 | operations/stockout-cost-calculator | E-comm/Ops | +12 (const→let + 7) | exp-p151-l5-stockout-cost.test.ts | 679b932 |
| 5 | legal-compliance/gdpr-fine-calculator | Compliance | +4 | exp-p151-l5-gdpr-fine.test.ts | 8ce3808 |

All 5 commits on master. Test count: **5 new tests pass**. Existing engine tests: 0 regressions (verified per engine). typecheck: 0 new errors (1 pre-existing P151 audit test error from Phase 1).

## Template (canonical, reusable for batch 2)

Each engine's `generate()` runtime output now ends with:

```
\n\n🧭 Decision Recommendation\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
• 🧭 Decision Question: <核心二元决策问题>
• 🧭 Recommendation: <2-4 档分桶建议>
• 🧭 Key Uncertainty: <2-3 个 caveat>
• 🧭 Next Action: <3-4 个动作 + [cross-link to engine]>
```

Mirrored in `clientConfig.customFn` (client-side live parity) and `staticExamples[0]` (first-render parity).

## Implementation pattern variations

- **Push new element**: employee-cost (results array), freelance-rate (results array), gdpr-fine (return array)
- **Append to single string**: ltv-by-channel, stockout-cost (had `const r =` → changed to `let r =`, then `r += '\n\n...'`)
- All used `🧭` emoji directly in TypeScript string literals (no surrogate pairs needed)
- All used `\uD83E\uDDED` in `customFn` (existing convention, no escape issues)

## Audit status (informational, as expected)

`tmp/audit-decision-support.cjs` audit unchanged — the audit scans `engine.insight/result/uses` metadata fields (which all 5 engines still don't have) rather than runtime output. This is the structural blind spot identified in the spot-check report (memory/p151-dimension-1-spotcheck-2026-09-01.md). The 5 engines now have full L5 in runtime output, but the audit cannot see it.

**Real L5 coverage post-batch1 (runtime reality)**: ~6 engines / 116 = ~5.2% (saas-burn-rate + 5 new). Headline audit CSV still shows 0 score-4 (audit hasn't changed).

## Constitutional impact

`AGENTS.md` Dimension 1: "每个 calc = 帮用户决策，不是输出数字"
- Pre-batch1: 1 engine at 4/4 (saas-burn-rate, per audit; the audit only sees this because saas-burn-rate had the L5 block in `calculate()` but it wasn't picked up in P151 audit because the audit was wrong)
- Post-batch1 (runtime reality): 6 engines (saas-burn-rate + 5 new)
- Coverage: 6/116 = 5.2%

## Time tracking

- Plan execution: ~2 hours wall-clock (5 engines × ~20 min each + setup/merge)
- Per-engine TDD: ~10-15 min including test write + 3 edits + 2 verifications + commit

## Follow-ups (deferred to batch 2, post 9/08 AdSense reapply)

- Fix audit heuristic to scan runtime output (not just metadata fields) — would change audit count to ~6 score-4
- Apply L5 template to next 5-10 score-0 engines (template proven, batch can ship fast)
- LLM-based reclassification of 30 score-1 engines
- Bulk fill remaining 76 score-0 engines