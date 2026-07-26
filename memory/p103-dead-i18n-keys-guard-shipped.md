# P103 Dead i18n Keys CI Guard Ship Log

## Summary

P103 adds the 26th build-dep test suite that prevents future re-addition of P102-deleted dead i18n keys. Walks dist/zh user-visible HTML and asserts forbidden ZH translations never appear, plus working keys translate correctly on their target pages.

**Date:** 2026-07-26
**Batch ID:** P103
**Files touched:** 2 (new test file + tests/run.mjs skip-mode list)
**Test delta:** 1192 → 1195 (+3 subtests in full build-dep mode)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### New test: `tests/dead-i18n-keys-guard.test.ts`

**Test 1**: Forbidden dead-key strings never appear in user-visible zh HTML
- Walks `dist/zh/**/*.html`
- Strips `<script>`, `<style>`, JSON-LD blocks (same filter as zh-hardcoded-english-guard)
- Asserts ZH versions of deleted keys never appear:
  - `💰 节省洞察` (zh translation of deleted `ops_cost.section.savings_insights`)
  - `📊 使用场景（每月成本）` (zh translation of deleted `ops_cost.section.usage_scenarios`)

**Test 2**: Working i18n keys translate on their target pages
- `dist/zh/solopreneur-break-even-calculator/index.html` must contain `📊 盈亏平衡分析`
- `dist/zh/solopreneur-remote-vs-office-calculator/index.html` must contain `🎯 盈亏平衡分析:`

### Updated `tests/run.mjs`

Skip-mode summary updated: 25 → 26 build-dep suites, added `dead-i18n-keys-guard` to the list.

## Why ZH versions, not EN versions

The P99/P100 deleted keys had EN versions:
- `💰 Savings Insights`
- `📊 Usage Scenarios (monthly costs)`

But **AI cost engines LEGITIMATELY use `💰 Savings Insights`** as a user-visible section header in their staticExamples[0]. So flagging the EN versions globally would fail these 4 AI cost engines.

The ZH versions `💰 节省洞察` and `📊 使用场景（每月成本）` are guaranteed dead — no engine output reaches them (they were P99/P100's target translations, never reachable from any engine). If these re-appear, someone re-added the deleted keys.

## Why strip <script>/<style>/JSON-LD

The strings `Savings Insights` also appear inside `customFn` JS source code as string-matching targets:
```js
if (s.indexOf('Savings Insights') >= 0 || s.indexOf('Savings vs') >= 0) { ... }
```

This is **legitimate JS code** — translating it would break the substring matching. The strip filter (same as P72 audit + zh-hardcoded-english-guard) excludes these script blocks from the check.

## Investigation history (false-positive fixes during dev)

First attempt used EN forbidden strings → 200 false positives (customFn JS source).
Second attempt used `💰 Savings Insights` (with emoji) → 4 false positives (AI cost engines with this as visible header).
Third attempt used ZH versions + stripNonBody → 0 violations, 2/2 pass ✓

## Coverage extension possible (not done)

The test could also catch untranslated `💰 Savings Insights` in AI cost engines by adding a positive assertion (zh page must contain `💰 节省洞察` if EN page contains `💰 Savings Insights`). This is a P104+ candidate.

## What was NOT done

- ❌ Did NOT add translation for `💰 Savings Insights` in AI cost engines (untranslated, but not dead — separate batch P104+)
- ❌ Did NOT add per-engine i18n keys for cost/ops/valuation headers (large scope, deferred)
- ❌ Did NOT add CJK guard variants for the new test (existing `zh-hardcoded-english-guard` covers CJK already)

## Related references

- **P99/P100** — added the 4 dead keys
- **P102** — deleted the 4 dead keys, added 1 new working key
- **P103** — this batch (CI guard)
- `tests/zh-hardcoded-english-guard.test.ts` — stripNonBody pattern reference
- `tests/run.mjs:57-69` — skip-mode summary list (now 26 suites)

## P104+ candidates

- **AI cost `💰 Savings Insights` translation** — add positive assertion + i18n key (closes the only remaining i18n gap from P85a)
- **Per-engine i18n keys for cost/ops/valuation headers** (large scope, ~20+ keys)
- **JS bundle size CI guard** — extends performance dimension
- **Audit script migration** — extract parser logic to shared library
- **CHANGELOG catch-up** — P66b-P103 (38 batches since P65)