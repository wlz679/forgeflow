# P112 Extend P103 Guard with P111 Assertions Ship Log

## Summary

P112 extends the `tests/dead-i18n-keys-guard.test.ts` (P103) with 27 new WORKING_KEY_REQUIRED assertions for the 7 new `business.section.*` keys shipped in P111. Closes a defense-in-depth gap: P111 added 7 keys translating 132+ string occurrences across 44 engine-instances, but the regression guard didn't cover them.

**Date:** 2026-07-27
**Batch ID:** P112
**Files touched:** 1 (test file, 21 lines added)
**Test delta:** 1198 → 1201 (+3 subtests: 1 net new P112 = 27 entries × 1 test path-resolution; P103 test count unchanged at 2)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### tests/dead-i18n-keys-guard.test.ts — 27 new WORKING_KEY_REQUIRED assertions

| Assertion group | Engines | Asserts |
|---|---|---|
| 4 ops-specific keys (🩺 健康, 📊 输入快照, 🔄 假设分析, 🎯 里程碑) | 6 ops × 4 = 24 | Each ops engine has all 4 headers translated |
| 🔄 假设场景 (cross-cat) | 1 (meeting-cost) | what_if_scenarios translates |
| 📐 关键指标 (cost) | 1 (employee-cost) | key_metrics translates |
| 📊 关键结果 (valuation) | 1 (ltv) | key_results translates |
| **Total** | **27 assertions** | |

### Why 6 ops engines × 4 keys = 24 (not 4 × 1 = 4)

Earlier batches (P102, P104, P105) added 1 assertion per key per engine. P111's 4 ops-specific keys apply to 6 ops engines, so 24 assertions catch regressions on ANY of the 6 ops engines.

## Why this matters

Without P112, P111 could regress silently:
- A future batch could accidentally delete one of the 7 keys from translations.ts
- The post-processor's `headerKeys` array could lose an entry
- An engine's staticExamples could change to a different string the key doesn't match

P112 catches all 3 classes of regression via the 27 assertions.

## Bug found and fixed during implementation

**Initial test run failed with 24 violations**: path template was `solopreneur-${slug}` but `slug` already included `solopreneur-` prefix, causing `solopreneur-solopreneur-...` paths. Fixed by using `${slug}/index.html` directly (slug already has full path).

**Lesson learned**: When generating paths from a list of slugs, the slugs should be FULL relative paths (e.g., `solopreneur-carrying-cost-calculator`), not short names that need prefixing. The P102/P104/P105 entries used literal paths, not lists, so this trap didn't surface earlier.

## Coverage matrix (now defended)

| Batch | Keys added | Assertions | Total assertions |
|---|---|---|---|
| P102 (initial) | 2 ops_cost | 2 (break-even-calculator + remote-vs-office) | 2 |
| P104 | 1 ai_cost | 4 (4 LLM API engines) | 6 |
| P105 | 3 ai_cost variants | 4 (4 LLM API engines) | 10 |
| **P112** (this) | 7 business | **27** (6 ops × 4 + 3 cross-cat) | **37** |

## Verification

| Check | Result |
|---|---|
| `RUN_BUILD_TESTS=1` direct test | 2/2 pass ✓ |
| `check-i18n-completeness` | 411 keys ✓ |
| `codegen-examples --check` | 100 engines in sync ✓ |
| `check-engine-count-by-category --check` | PASSED ✓ |

## What is NOT done

- ❌ Did NOT add per-page assertions for all 44 engine-instances (focused on representative coverage)
- ❌ Did NOT extend to 60+ tier-2 single-engine headers (those aren't translated yet)
- ❌ Did NOT codegen the assertion list (P111 keys are hand-curated)

## Related references

- **P103** — original dead-i18n-keys-guard (P102/P104/P105 assertions)
- **P111** — 7 new business.section.* keys
- **P112** — this batch (P111 assertions, defense-in-depth continuation)
- `tests/dead-i18n-keys-guard.test.ts:85-119` — WORKING_KEY_REQUIRED (now 37 entries)

## P113+ candidates

- **Codegen-enforce defense-in-depth matrix** — automate the snapshot
- **Audit script migration** — extract parser logic to shared library
- **Per-engine single-header keys** — 60+ keys for tier-2 single-engine headers
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check