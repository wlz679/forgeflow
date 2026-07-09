# P8-2 Shipped: Sales Velocity Calculator (2026-07-07)

P8-2 已 ship 2026-07-07 (commit a30ba8c, 1 commit + dual push)。

## What shipped
- **Engine:** `src/engines/sales/sales-velocity-calculator.ts` (358 lines, mirror P8-1 structure exactly)
- **Slug:** `solopreneur-sales-velocity-calculator`
- **Math:** `dailyVelocity = (openOpps × avgDealSize × (winRate/100)) / cycleDays`, then `monthly = daily × 30`, `annual = daily × 365`. All 3 helpers round to 2dp for display stability.
- **Inputs (4):** openOpps (default 20), avgDealSize (25000), winRate (25), cycleDays (45)
- **Health bands:** 🟢 ≥$5K/day · 🟡 $2K-$5K · 🟠 $500-$2K · 🔴 <$500
- **6-section v3 output:** Health · Inputs Snapshot · What-If · Break-Even · Milestone · Tip

## Test count
- 58 engines (was 57)
- **480 pass / 0 fail** (was 469 pass)
- **11 new tests** in `tests/sales-velocity-calculator.test.ts`:
  - 9 verbatim from spec (test 1-9)
  - 2 sanity tests for monthlyVelocity/annualVelocity from unrounded daily (matching spec display precision 83333.33 / 1013888.89)

## Files wired (7)
1. `src/engines/sales/sales-velocity-calculator.ts` (new)
2. `src/engines/sales/index.ts` (+1 line: barrel import)
3. `src/data/tools/sales.ts` (+1 ToolMeta entry)
4. `src/data/og-samples.json` (+1 OG sample: $2,778/day headline, descriptive label, no emoji)
5. `scripts/codegen-examples.mjs` (+1 ENGINES entry)
6. `tests/ab-split.test.ts` (57→58 in 2 tests)
7. `tests/internal-links.test.ts` (57→58 in 1 test)
+ `tests/sales-velocity-calculator.test.ts` (new, 11 math tests)

## Spec deviations (minor, documented)
- **Math helpers round to 2dp** (e.g., `dailyVelocity` returns `2777.78` not `2777.7777...`) — needed for strict `assert.equal` test 1.
- **Test 2 spec value 83333.33 cannot pass strict equal** when input is the rounded 2777.78 literal (2777.78 × 30 = 83333.4 exactly in JS). Tests use JS-exact values 83333.4/1013889.7 + sanity tests proving the unrounded dailyVelocity path yields spec's 83333.33/1013888.89. Same pattern as P8-1's spec-verbatim math but with float-precision awareness.

## P8-2 learnings
- **Float precision trap in spec:** When spec gives `=== 2777.78` (a 2dp display value) AND derives test 2/3 from unrounded math, the two are strictly incompatible. Pick: round helpers (display precision) → tests 2/3 fail strictly; OR don't round → test 1 fails strictly. **Solution used here:** round + add sanity tests proving both paths work.
- **P8-1 reviewer fix carried forward:** barrel imports (`src/engines/index.ts`, `src/data/tools/index.ts`) already include `./sales` from P8-0/P8-1 — no edits needed.
- **TS warnings pre-existing:** HEALTH_BANDS re-export ambiguity + categoryId not in ToolEngine type are non-blocking (P7 series precedent).
- **relatedTools auto-fills:** no manual fill needed; `internal-links.ts` for-loop picks P8-2 as 2nd same-cat entry for P8-1 once it lands.

## Next
- P8-3: Average Contract Value Calculator
- P8 series target: 56 → 62 engines (6 calcs)
- P8-3 spec section to read in same file (lines 269+)