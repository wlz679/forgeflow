# P8-5 Quota Attainment shipped (2026-07-08)

**Status**: DONE
**Commit**: (see git log)
**Engine count**: 60 → 61
**Test count**: 497 → 506 (+9 math tests)

## Spec details

Spec §"P8-5: Quota Attainment Calculator" at `docs/superpowers/specs/2026-07-07-p8-sales-batch-design.md:385-442`.

**Slug**: `solopreneur-quota-attainment-calculator`
**3 inputs**: `annualQuota` (default 1000000), `monthsElapsed` (default 6), `actualRevenue` (default 400000)
**Math**: attainmentPct, expectedAtPace, gap, remainingMonths, requiredPerMonth, projectedYearEnd, onTrack
**Health bands (attainmentPct)**: 🟢 ≥100% · 🟡 80%-100% · 🟠 50%-80% · 🔴 <50%

## Canonical values (defaults)

- attainmentPct = 400000 / 1000000 × 100 = **40%** → 🔴 critical (40% < 50%, strict spec band)
- expectedAtPace = 1000000 × 6/12 = $500,000
- gap = $600,000
- remainingMonths = 6
- requiredPerMonth = $100,000/month
- projectedYearEnd = $1,000,000
- onTrack = true (just barely, by tautology with the spec formula)

## Key findings / decisions

1. **Spec tautology**: `projectedYearEnd = actualRevenue + gap = annualQuota` (when remainingMonths > 0). Spec acknowledges this in a comment. So `onTrack` is `true` whenever the year is not over. The brief's "🟠 offTrack" branch is unreachable under default math — only fires when `actualRevenue > annualQuota` (which still gives onTrack = true). I implemented the spec literally; the Tip section is structured to show different messaging for the warning/critical bands regardless.

2. **Spec annotation drift**: Brief says "attainmentPct = 40% (band: 🟠 warning)" but the spec bands definition puts 40% in 🔴 critical (40% < 50%). I followed the spec bands strictly. The 4 boundary tests (49→critical, 50→warning, 80→good, 100→excellent) match the spec bands definition.

3. **Float precision**: P8-5 has no compounding math. All values are exact integers for the defaults. No `moneyExact` formatter needed.

4. **What-If section**: 3 scenarios — maintain current pace / hit required pace / accelerate 20%. With defaults: $67K/mo → $800K total (80% good), $100K/mo → $1M total (100% excellent), $120K/mo → $1.12M total (112% excellent).

5. **Edge cases handled**:
   - `monthsElapsed = 12`: `remainingMonths = 0` → `requiredPerMonth = 0` (ternary guard)
   - `monthsElapsed = 0`: `currentPacePerMonth = 0` (zero guard)
   - `actualRevenue = 0`: `attainmentPct = 0`, `gap = annualQuota`, `requiredPerMonth = gap / remainingMonths`
   - `actualRevenue >= annualQuota`: `attainmentPct >= 100` → 🟢 excellent, celebration tip

6. **Pace diagnostics**: Added `currentPacePerMonth`, `expectedPacePerMonth` (= annualQuota/12), and `paceGap` to show the user their closing rate vs the required steady rate. This makes the "behind/ahead" status more actionable than just attainment%.

## Files changed (10)

- `src/engines/sales/quota-attainment-calculator.ts` (new) — engine + helpers + customFn
- `src/engines/sales/index.ts` — barrel import
- `src/data/tools/sales.ts` — ToolMeta entry (3 inputs)
- `src/data/og-samples.json` — OG headline (40% attainment, descriptive label)
- `scripts/codegen-examples.mjs` — defaults entry for staticExamples regen
- `tests/quota-attainment-calculator.test.ts` (new) — 9 math tests
- `tests/ab-split.test.ts` — 60→61
- `tests/internal-links.test.ts` — 60→61
- `memory/p8-5-quota-attainment-shipped.md` (this file)
- `.superpowers/sdd/task-5-report.md` (task report)

## Test results

- `pnpm check` (after `pnpm build` to refresh dist/): **506/506 pass, 0 fail**
- 9 new math tests: all pass with spec's exact boundary values
- `node tests/scripts/test-customFn.mjs sales/quota-attainment-calculator`: OK (9096 chars)
- `pnpm build`: 223 pages built, no errors
