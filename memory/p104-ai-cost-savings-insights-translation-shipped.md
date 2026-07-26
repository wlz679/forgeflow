# P104 AI Cost '💰 Savings Insights' Translation Ship Log

## Summary

P104 closes the last P85a i18n gap by translating the `💰 Savings Insights` section header that appears in all 4 LLM API cost engines (claude, deepseek, gemini, openai). P85a shipped 6 ai_cost keys but missed this one. The ZH translation `💰 节省洞察` was previously used by the P102-deleted dead key `ops_cost.section.savings_insights` — this batch reuses it in the correct `ai_cost` namespace.

**Date:** 2026-07-26
**Batch ID:** P104
**Files touched:** 3 (translations.ts + page template + P103 test)
**Test delta:** 1192 → 1192 (same; working key promoted from forbidden)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### translations.ts
- **Added**: `'ai_cost.section.savings_insights': { en: '💰 Savings Insights', zh: '💰 节省洞察' }`

### Page template `translateCalcOutput`
- Added `'ai_cost.section.savings_insights'` to headerKeys array (now 12 keys total)

### P103 test (dead-i18n-keys-guard)
- **Removed**: `'💰 节省洞察'` from forbidden strings list (it's now a working key, not dead)
- **Added**: 4 positive assertions requiring `💰 节省洞察` to appear on each AI cost engine zh page

## Investigation history

The P103 test was originally designed to flag `💰 节省洞察` as a dead key — but P104 promoted it back to working. The test was updated in lockstep:
- P103 FORBID list: `['💰 节省洞察', '📊 使用场景（每月成本）']` → `['📊 使用场景（每月成本）']`
- P103 REQUIRED list: 2 ops_cost engines → 6 engines (2 ops_cost + 4 ai_cost)

## Why this matters

Before P104:
- 4 LLM API cost engines showed `💰 Savings Insights` on zh pages (raw English)
- This was a visible quality gap — the most popular calculator category had untranslated section headers

After P104:
- All 4 engines show `💰 节省洞察` (3x each in visible HTML)
- 5 remaining `Savings Insights` occurrences per page are in `<script>` tags (customFn JS source, legitimate code — `s.indexOf('Savings Insights')` substring matching targets)

## Verified translations

**After P104:**
- `dist/zh/solopreneur-claude-api-cost-calculator/index.html`: 3x `💰 节省洞察` ✓
- `dist/zh/solopreneur-openai-token-calculator/index.html`: 3x ✓
- `dist/zh/solopreneur-gemini-api-cost-calculator/index.html`: 3x ✓
- `dist/zh/solopreneur-deepseek-api-cost-calculator/index.html`: 3x ✓
- en pages unchanged (raw English preserved)

## Cross-file consistency check

The reviewer flag (commit hook) was concerned about cross-file consistency. Verified:
- `translations.ts`: key `ai_cost.section.savings_insights` defined ✓
- `src/pages/[lang]/[slug].astro`: same key in headerKeys array ✓
- `tests/dead-i18n-keys-guard.test.ts`: positive assertion enforces translation ✓
- Build + test: dead-i18n-keys-guard 2/2 pass ✓

## What was NOT done

- ❌ Did NOT translate `📊 Usage Scenarios (monthly cost at 100 reqs/day)` (different suffix — AI cost engines use a longer variant; separate key would be needed)
- ❌ Did NOT extend post-processor to all staticExamples (still [0] only)
- ❌ Did NOT extend to customFn JS source strings (JS code, should not be translated)

## Related references

- **P85a** — original AI cost post-processor (6 keys, missed `savings_insights`)
- **P102** — deleted dead `ops_cost.section.savings_insights` (same ZH translation)
- **P103** — dead-keys CI guard (now updated for P104 working key)
- **P104** — this batch (promote dead ZH translation to ai_cost namespace)
- `src/pages/[lang]/[slug].astro:53-86` — `translateCalcOutput` function

## P105+ candidates

- **Translate `📊 Usage Scenarios (monthly cost at 100 reqs/day)`** — AI cost variant with longer suffix
- **Per-engine i18n keys for cost/ops/valuation headers** (large scope, ~20+ keys)
- **JS bundle size CI guard** — extends performance dimension
- **Audit script migration** — extract parser logic to shared library
- **CHANGELOG catch-up** — P66b-P104 (39 batches since P65)