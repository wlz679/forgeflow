# P8-4 Shipped: Win Rate by Stage Calculator (2026-07-08)

P8-4 已 ship 2026-07-08 (single commit + dual push)。

## What shipped
- **Engine:** `src/engines/sales/win-rate-by-stage-calculator.ts` (mirror P8-1/P8-2/P8-3 structure)
- **Slug:** `solopreneur-win-rate-by-stage-calculator`
- **Math:** Multiplicative funnel — `overallWinRate = (sqlAdv/sqlEnt) × (oppAdv/oppEnt) × (proposalAdv/proposalEnt) × (negAdv/negEnt)`; bottleneck = argmin(stageRates)
- **Inputs (8):** sqlEntered (100), sqlAdvanced (50), oppEntered (50), oppAdvanced (30), proposalEntered (30), proposalAdvanced (20), negEntered (20), negAdvanced (15)
- **Health bands (on overallWinRate × 100):** 🟢 ≥25% · 🟡 15%-25% · 🟠 5%-15% · 🔴 <5%
- **6-section v3 output:** Health · Inputs Snapshot · What-If · Break-Even · Milestone · Tip (bottleneck-aware)

## Test count
- 60 engines (was 59)
- **497 pass / 0 fail / 0 skipped** (was 488 pass)
- **9 new tests** in `tests/win-rate-by-stage-calculator.test.ts`

## Float-precision lesson (per task brief)
**Spec literal `[0.5, 0.6, 0.667, 0.75]` does NOT multiply to 0.15** — the literal gives 0.150075. The math only works with unrounded intermediate values:
- Engine derives `stageRate(advanced, entered)` as raw division (e.g. `20/30 = 0.6666...`, not 0.667)
- Defaults `50/100 × 30/50 × 20/30 × 15/20 = 0.5 × 0.6 × 0.6666... × 0.75 = 0.15` exactly
- Test 2 uses exact fractions: `overallWinRate([50/100, 30/50, 20/30, 15/20])` asserts `< 1e-9` of 0.15

## Bottleneck detection
- `bottleneckStage([0.5, 0.6, 0.667, 0.75]) === 0` (SQL→Opp at 50%, lowest) ✓
- 0-indexed: 0=SQL→Opp, 1=Opp→Proposal, 2=Proposal→Negotiation, 3=Negotiation→Won
- Tip logic: band + bottleneck combo drives 11 distinct tip variants (🟢×3 bottleneck positions, 🟡×3, 🟠×3, 🔴×1 generic + 1 leak-specific per case)

## Files wired (8)
1. `src/engines/sales/win-rate-by-stage-calculator.ts` (new, 60 engines)
2. `src/engines/sales/index.ts` (+1 line: barrel import)
3. `src/data/tools/sales.ts` (+1 ToolMeta entry, 8 inputs)
4. `src/data/og-samples.json` (+1 OG sample: `15%` win rate, descriptive label "Win rate: 15% (bottleneck: SQL→Opp)", no emoji per P6-1 lesson)
5. `scripts/codegen-examples.mjs` (+1 ENGINES entry)
6. `tests/ab-split.test.ts` (59→60 in 2 tests)
7. `tests/internal-links.test.ts` (59→60 in 2 tests)
+ `tests/win-rate-by-stage-calculator.test.ts` (new, 9 math tests)
+ `memory/p8-4-win-rate-by-stage-shipped.md` (this file)

## Mid-flight fix
- **customFn parse error** on first run: `\\u219Won` (missing `2`) on `Negotiation→Won` literal at line 279. Caught by dedicated parser, fixed to `\\u2192Won`. Lesson: when hand-writing 5-digit unicode escapes, double-check each one — JS parser is strict and the bug is silent until the page tries to load.

## relatedTools auto-update verified
- P8-1, P8-2, P8-3 all got P8-4 added to their related lists (now 4 entries each, all from same-category 'S' fill)
- P8-4's array: pipeline-value, sales-velocity, acv, funnel-value (cross-category, score-0 fill since 'S' now has exactly 4 tools)
- internal-links.ts algorithm handles the low-density state gracefully

## P8-4 learnings
- **Float-precision math is multiplicative**: each stage rate is a raw division, not a rounded percentage. Rounding at the intermediate stage loses precision in the product. The display layer rounds, not the math layer.
- **Bottleneck detection is band-agnostic**: the same `argmin` works for any band. The band only affects the tip wording, not the math.
- **TS warnings pre-existing pattern** continues: HEALTH_BANDS re-export + categoryId not in ToolEngine type are non-blocking (P7/P8 series precedent).
- **Tip variants scale with (band × bottleneck)** = 4 × 3 + 1 generic = 13 if fully enumerated. The 11 distinct strings I wrote cover all reasonable cases; mid-funnel leak uses 2 variants (warning/good × {start/middle/end}) and special-cases Negotiation→Won for its higher per-stage value.

## Next
- P8-5: Quota Attainment Calculator
- P8 series target: 56 → 62 engines (5 of 6 calcs done)
- P8-5 spec section to read: `docs/superpowers/specs/2026-07-07-p8-sales-batch-design.md` lines 384+
