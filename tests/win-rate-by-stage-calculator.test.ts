import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  stageRate, overallWinRate, bottleneckStage, calcHealthBand,
} from '../src/engines/sales/win-rate-by-stage-calculator.ts';

// =====================================================================
// P8-4 Win Rate by Stage — 9 math tests per spec §"P8-4: Win Rate by Stage"
// =====================================================================
// Math model:
//   stageRates = [sqlAdvanced/sqlEntered, oppAdvanced/oppEntered,
//                 proposalAdvanced/proposalEntered, negAdvanced/negEntered]
//   overallWinRate = stageRates[0] * stageRates[1] * stageRates[2] * stageRates[3]
//   bottleneckStage = argmin(stageRates)  // 0-indexed (0 = SQL→Opp)
//
// Health bands by overallWinRate × 100:
//   🟢 ≥ 25% — excellent
//   🟡 15%–25% — good
//   🟠 5%–15% — warning
//   🔴 < 5% — critical
//
// CRITICAL float-precision note (per task brief):
//   Spec literal `[0.5, 0.6, 0.667, 0.75]` does NOT multiply to 0.15
//   (0.5 × 0.6 × 0.667 × 0.75 = 0.150075). Tests below use either
//   exact fractions (20/30 ≈ 0.6666...) or default inputs to derive
//   unrounded intermediates, producing exactly 0.15.

// Test 1: canonical stageRate (SQL→Opp)
test('stageRate: 50/100 = 0.50 (canonical SQL→Opp)', () => {
  assert.equal(stageRate(50, 100), 0.5);
});

// Test 2: overallWinRate using exact fractions gives 0.15
//   Using 50/100 × 30/50 × 20/30 × 15/20:
//   0.5 × 0.6 × 0.6666... × 0.75 = 0.15 exactly
test('overallWinRate with exact fractions = 0.15', () => {
  // Use unrounded intermediate values: 20/30 not 0.667 (spec's literal is wrong by 0.000075)
  const r = overallWinRate([50 / 100, 30 / 50, 20 / 30, 15 / 20]);
  assert.ok(Math.abs(r - 0.15) < 1e-9, `expected 0.15, got ${r}`);
});

// Test 3: bottleneckStage canonical
test('bottleneckStage([0.5, 0.6, 0.667, 0.75]) === 0 (canonical SQL→Opp)', () => {
  assert.equal(bottleneckStage([0.5, 0.6, 0.667, 0.75]), 0);
});

// Test 4: critical band (4.9%)
test('calcHealthBand: 4.9 → critical', () => {
  assert.equal(calcHealthBand(4.9), 'critical');
});

// Test 5: warning boundary (5%)
test('calcHealthBand: 5 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(5), 'warning');
});

// Test 6: good boundary (15%)
test('calcHealthBand: 15 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(15), 'good');
});

// Test 7: excellent boundary (25%)
test('calcHealthBand: 25 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(25), 'excellent');
});

// Test 8: All 100% funnel — overallWinRate([1, 1, 1, 1]) === 1 → excellent
test('all 100%: overallWinRate([1, 1, 1, 1]) === 1 → excellent', () => {
  const r = overallWinRate([1, 1, 1, 1]);
  assert.equal(r, 1);
  assert.equal(calcHealthBand(r * 100), 'excellent');
});

// Test 9: Zero entered guard — stageRate(0, 0) === 0 (handle division-by-zero)
test('zero entered guard: stageRate(0, 0) === 0', () => {
  assert.equal(stageRate(0, 0), 0);
});