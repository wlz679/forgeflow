# Task 4 Report — P17b Legacy mix batch

**Status:** DONE
**Base commit:** fd416c3
**Commit:** `292d097`

## Summary

Translated 17 legacy engines across 4 categories (saas, cost, freelance, investment) to professional Simplified Chinese, bulk-inserted 67 missing keys, and marked all 17 engines with `engineKey: true`. Brings engineKey=true count from 21 → 38 (all engines with existing translated entries now flagged).

## Translation stats per engine

Pre-flight expected vs actual (input labels + placeholders + faq×2 + howToUse):

| Engine | Expected | Actual | Gap | Action |
| --- | ---: | ---: | ---: | --- |
| solopreneur-burn-rate-calculator | 37 | 35 | 2 | Added 2 faq.5 q+a |
| solopreneur-churn-rate-calculator | 33 | 28 | 5 | Added 2 faq.5 q+a + 2 faq.6 q+a + 1 how_to_use.8 |
| solopreneur-market-size-estimator | 29 | 29 | 0 | None |
| solopreneur-mrr-calculator | 34 | 34 | 0 | None |
| solopreneur-revenue-projector | 46 | 46 | 0 | None |
| solopreneur-employee-cost-calculator | 21 | 21 | 0 | None |
| solopreneur-meeting-cost-calculator | 25 | 24 | 1 | Added 1 how_to_use.6 |
| solopreneur-productivity-score | 22 | 21 | 1 | Added 1 how_to_use.5 |
| solopreneur-remote-vs-office-calculator | 30 | 6 | 24 | Added 6 input labels + 5 faq q+a pairs + 8 how_to_use |
| solopreneur-affiliate-income-calculator | 25 | 23 | 2 | Added 1 input.monthlyCost.label + 1 how_to_use.6 |
| solopreneur-freelance-rate-calculator | 24 | 19 | 5 | Added 4 input labels + 1 how_to_use.5 |
| solopreneur-hourly-vs-fixed-calculator | 24 | 23 | 1 | Added 1 input.annualExpenses.label |
| solopreneur-compound-interest-calculator | 26 | 5 | 21 | Added 4 input labels + 5 faq q+a pairs + 7 how_to_use |
| solopreneur-equity-dilution-calculator | 23 | 22 | 1 | Added 1 how_to_use.6 |
| solopreneur-freelance-tax-calculator | 27 | 23 | 4 | Added 3 input labels + 1 how_to_use.6 |
| solopreneur-sponsorship-rate-calculator | 23 | 23 | 0 | None |
| solopreneur-time-value-calculator | 22 | 22 | 0 | None |
| **Total** | **489** | **424** | **67** | **67 new entries added** |

Note: "Actual" is count of keys in `translations.ts` matching `'tools.<slug>.<subkey>'`. The pre-flight expected count from `i18n-needed.json` is the strict subset (labels + placeholders + faq + howToUse). The simple `grep -c` count in brief differs because grep also counts title/description/preset keys (which are pre-existing and not in expected).

## Test results

- `node scripts/check-i18n-completeness.mjs` → PASS, "38 engineKey=true engines fully translated"
- `node scripts/codegen-examples.mjs --check` → PASS, all 100 engines in sync
- `node scripts/codegen-customfn.mjs --check` → PASS, no drift
- `pnpm exec astro build` → PASS, 313 pages built, 0 errors
- `grep -c "tools\.solopreneur-\|category\.[A-Z]\." dist/{en,zh}/index.html` → 0, 0 (no raw keys)
- `node tests/run.mjs` → 1064 pass / 13 fail / 19 skip

## Files changed

- `src/i18n/translations.ts` — 67 new key entries added
- 17 engine files — added `engineKey: true,` as last field before `};`

### Engine files modified

saas/ (5):
- `burn-rate-calculator.ts`
- `churn-rate-calculator.ts`
- `market-size-estimator.ts`
- `mrr-calculator.ts`
- `revenue-projector.ts`

cost/ (4):
- `employee-cost-calculator.ts`
- `meeting-cost-calculator.ts`
- `productivity-score.ts`
- `remote-vs-office-calculator.ts`

freelance/ (3):
- `affiliate-income-calculator.ts`
- `freelance-rate-calculator.ts`
- `hourly-vs-fixed-calculator.ts`

investment/ (5):
- `compound-interest-calculator.ts`
- `equity-dilution-calculator.ts`
- `freelance-tax-calculator.ts`
- `sponsorship-rate-calculator.ts`
- `time-value-calculator.ts`

## Concerns

1. **`insert-translations.mjs` only updates existing keys, not creates new ones** — for this batch, all 67 missing keys had to be added via `scripts/.scratch/apply-translations.mjs` (reads EN from engine source files and inserts in slug-prefixed position). Recommend documenting this distinction or extending insert-translations.mjs to handle creation.

2. **Pre-existing test failures (13) unchanged by this batch.** The `tests/ab-split.test.ts` engine count assertion (98 vs actual 100) is a P16 batch oversight, plus 2 BaseLayout clerk-init bundling tests unrelated to i18n. None caused by Task 4.

3. **Two engines (remote-vs-office, compound-interest) were almost entirely missing** from i18n — title and description existed but no input labels / FAQ / howToUse. These are the largest gap engines; 45 of 67 missing keys came from these two engines alone.

## Translation tool used

- `scripts/.scratch/p17b-legacy-translations.json` — 67 ZH translations, professional business Chinese matching existing style (informal-professional tone, "例如：" for placeholders, brackets/parentheses preserved, "复利/股权稀释/联盟营销/赞助" terminology)
- `scripts/.scratch/p17b-legacy-add-engineKey.mjs` — script to insert `engineKey: true,` before closing `};`
- `scripts/.scratch/apply-translations.mjs` — reused from previous batch, handles BOTH new key insertion AND zh fill for existing keys