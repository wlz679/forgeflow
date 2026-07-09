# P8-6 Pipeline Coverage shipped (2026-07-09)

**Status**: DONE
**Commit**: `8c4298c` (1 commit + dual push github + gitee)
**Engine count**: 61 → 62
**Test count**: 506 → 514 (+8 math tests)

## Spec details

Spec §"P8-6: Pipeline Coverage" at `docs/superpowers/specs/2026-07-07-p8-sales-batch-design.md:443-500`.

**Slug**: `solopreneur-pipeline-coverage-calculator`
**3 inputs**: `quotaTarget` (default 1000000), `pipelineValue` (default 1500000), `winRate` (default 25)
**Math**: coverageRatio, weightedPipeline, weightedCoverage, gap, requiredAdditionalPipeline
**Health bands (coverageRatio)**: 🟢 ≥3.0x (3x rule) · 🟡 2.0x-3.0x · 🟠 1.0x-2.0x · 🔴 <1.0x

## Canonical values (defaults)

- coverageRatio = 1500000 / 1000000 = **1.5** → 🟠 warning
- weightedPipeline = 1500000 × 0.25 = $375,000
- weightedCoverage = 375000 / 1000000 = 0.375
- gap = 1000000 - 375000 = $625,000
- requiredAdditionalPipeline = 625000 / 0.25 = $2,500,000
- 3x rule target = $3,000,000 (gap: $1,500,000)

## Key findings / decisions

1. **3x rule as central concept**: B2B SaaS benchmark for reliable quota attainment. Used in: Health band threshold (🟢 ≥ 3.0x), What-If "3x path" implicit, Break-Even section, Milestone next-tier label.

2. **Coverage ratio is unweighted** (raw pipeline / quota). Win rate enters via `weightedCoverage` diagnostic (weighted pipeline / quota). Better win rate alone doesn't change the band — only the weighted number improves. Documented inline.

3. **What-If section**: 3 scenarios — pipeline boost ($1.5M→$2M = 2.0x 🟡), win rate boost (25%→50% = weighted 0.75x still 🟠 but closer to 🟡), both (2.0M + 50% = 2.0x 🟡 boundary).

4. **Break-Even section**: 3x rule ($3M), 1x break-even ($4M at 25% win rate), and "win rate alone" reverse path (67% win rate at current $1.5M pipeline to hit 1x break-even).

5. **Edge cases handled**:
   - All zero inputs → "Enter your values" prompt
   - `winRate = 0` → `requiredAdditionalPipeline = 0` (avoid Infinity)
   - `quotaTarget = 0` → coverageRatio and weightedCoverage return 0
   - `pipelineValue = 0` → `winRateFor1X = 0` (zero guard)
   - Excellent band (≥3.0x) → "0x (3x rule maintained)" milestone message

6. **Format helpers**: `formatRatio1` for coverage (1 decimal + "x" → "1.5x"), `formatRatio2` for weighted (2 decimals + "x" → "0.38x"). Money formatters `money()` (full $) and `moneyK()` (compact $1.5M / $200K).

7. **Dead code removed during cleanup**: 
   - `ifBetterWinBand` declared but never read (win rate doesn't change coverageRatio so the band is identical to current) — removed in P8-6 cleanup
   - Customfn had a dead conditional `fR1(ibtBd===band(ibtc)?ibtc:cR(ibp,qt))` (always evaluates to `ibtc` since `ibtBd` IS `band(ibtc)`) — simplified to `fR1(ibtc)` to match calculate() output

## Files changed (10)

- `src/engines/sales/pipeline-coverage-calculator.ts` (new) — engine + helpers + customFn
- `src/engines/sales/index.ts` — barrel import
- `src/data/tools/sales.ts` — ToolMeta entry (3 inputs)
- `src/data/og-samples.json` — OG headline (1.5x coverage, descriptive label, no emoji)
- `scripts/codegen-examples.mjs` — defaults entry for staticExamples regen
- `tests/pipeline-coverage-calculator.test.ts` (new) — 8 math tests
- `tests/ab-split.test.ts` — 61→62
- `tests/internal-links.test.ts` — 61→62
- `memory/p8-2-sales-velocity-shipped.md` (cleanup: untracked from P8-2)
- `memory/p8-3-acv-shipped.md` (cleanup: untracked from P8-3)

## Test results

- P8-6 math tests (8): all pass, verified with `node --import tsx --test tests/pipeline-coverage-calculator.test.ts`
- `node tests/scripts/test-customFn.mjs sales/pipeline-coverage-calculator`: OK (9120 chars)
- `node tests/scripts/codegen-examples.mjs --check`: in sync (62 engines)
- `node tests/scripts/codegen-customfn.mjs --check`: no drift
- `pnpm build`: 225 pages built, 24.87s

## Cleanup actions during ship

1. Deleted 3 temp debug scripts: `tests/scripts/debug-pc.mjs`, `tests/scripts/parse-pc.mjs`, `tests/scripts/parse-acv-customfn.mjs` (left over from P8-3/P8-6 implementation)
2. Reverted unrelated `.superpowers/sdd/task-4-report.md` modification (P3-1 content overwrite by previous implementer)
3. Restored unrelated `.astro/settings.json` deletion (artifact of build process)
4. Removed dead `ifBetterWinBand` declaration from `calculate()` (line 136)
5. Simplified dead conditional in customFn's "If both" line
6. Regenerated `staticExamples[0]` to match updated `calculate()` output
7. Committed 2 untracked memory files (p8-2, p8-3) for cleanup

## Notes on flaky tests

- Pnpm check occasionally shows 1-2 failures in `header-clerk-render.test.ts` (P3-1 tests) due to Node --test concurrency and Windows EPERM on `dist/chunks/` — pre-existing flakiness documented in `check-gap-fixes-shipped.md`. Not P8-6 related. Header-clerk tests pass cleanly in isolation with `--test-concurrency=1`.
