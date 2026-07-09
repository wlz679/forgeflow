# P8-3 Shipped: ACV Calculator (2026-07-08)

P8-3 已 ship 2026-07-08 (commit e2ed39a, 1 commit + dual push)。

## What shipped
- **Engine:** `src/engines/sales/acv-calculator.ts` (mirror P8-1/P8-2 structure exactly)
- **Slug:** `solopreneur-acv-calculator`
- **Math:** `baseACV = totalContractValue / numCustomers`, then `monthlyACV = baseACV / contractLength`, `annualACV = monthlyACV × 12` (Math.rounded for display), `expansionAdjustedACV = annualACV × (100 + rate) / 100` (integer math to avoid JS float drift)
- **Inputs (4):** totalContractValue (300000), contractLength (12), numCustomers (12), expansionRate (10)
- **Health bands:** 🟢 ≥$50K · 🟡 $10K-$50K · 🟠 $2K-$10K · 🔴 <$2K
- **6-section v3 output:** Health · Inputs Snapshot · What-If · Break-Even · Milestone · Tip

## Test count
- 59 engines (was 58)
- **488 pass / 0 fail / 0 skipped** (was 480 pass)
- **8 new tests** in `tests/acv-calculator.test.ts` (8 verbatim from spec)

## Display precision (the P8-2 lesson applied)
P8-2's cent-level bug (`$83,333.33/month` → `$83,333/month`) was averted here:
- **`monthlyACV` = unrounded 2083.333...** in math path; **`Math.round(×100)/100` = 2083.33** only for display
- **`annualACV(monthly) = Math.round(monthly × 12)`** — required because the canonical 2083.33 × 12 = 24999.96 (not 25000) in JS. Math.round → 25000 = spec display `$25,000/year`
- **`expansionAdjustedACV` uses integer math** `× (100 + rate) / 100` to avoid `25000 * 1.10 = 27500.000000000004` (not 27500)
- **`moneyExact()`** formatter (inline, mirrors P8-2) used only for the monthly line `$2,083.33/month`; `money()` integer formatter used for the integer lines ($25,000/year, $27,500/year)

Spec display values confirmed: `$25,000/year` + `$2,083.33/month` + `$27,500/year` ✓

## Files wired (7)
1. `src/engines/sales/acv-calculator.ts` (new)
2. `src/engines/sales/index.ts` (+1 line: barrel import)
3. `src/data/tools/sales.ts` (+1 ToolMeta entry)
4. `src/data/og-samples.json` (+1 OG sample: `$25,000/yr`, descriptive label "ACV: $25,000/year (12 customers, $300K total)", no emoji)
5. `scripts/codegen-examples.mjs` (+1 ENGINES entry)
6. `tests/ab-split.test.ts` (58→59 in 2 tests)
7. `tests/internal-links.test.ts` (58→59 in 1 test)
+ `tests/acv-calculator.test.ts` (new, 8 math tests)

## Build verification
- `pnpm build` green: **219 pages** (was 217; +2 for ACV in en + zh)
- OG image count: 118 = 59 tools × 2 langs ✓

## Spec deviations (minor, documented)
- **Break-Even Path A**: spec example said "Need 3 more customers (15 total) for 🟢" — but adding more customers at the same per-customer contract value actually REDUCES per-customer ACV (denominator grows). Implemented both Path A (raise total contract value) and Path B (reduce customer base for fewer, higher-value contracts) with a note explaining the math.
- **Expansion-adjusted test 3**: `expansionAdjustedACV(25000, 10) === 27500` initially failed in JS because `25000 * 1.10 = 27500.000000000004` under float multiply. Fixed by using integer math `× (100 + rate) / 100` which gives the exact 27500. Same pattern applies to the customFn.

## P8-3 learnings
- **P8-2 lesson applied**: cents-precision trap caught at design time. The monthly→annual derivation needs `Math.round` because `2083.33 × 12 = 24999.96`. Without it, spec display `$25,000/year` becomes `$24,999.96/year`.
- **Float multiply drift in `× 1.10`**: same family of JS float bugs. Integer math (×110/100) is the clean fix.
- **P8-0/P8-1 carries forward**: barrel imports (`engines/index.ts`, `tools/index.ts`) already cover `./sales` — no edits needed. `internal-links.ts` auto-fills the 4-related-entries invariant for the now-3-tool sales category (1 same-cat + 2 cross-cat fills).
- **TS warnings pre-existing**: HEALTH_BANDS re-export ambiguity + categoryId not in ToolEngine type are non-blocking (P7 series precedent; P8-1/P8-2 also ship them).

## Next
- P8-4: Win Rate by Stage Calculator
- P8 series target: 56 → 62 engines (4 of 6 calcs done)
- P8-4 spec section to read: `docs/superpowers/specs/2026-07-07-p8-sales-batch-design.md` lines 326+
