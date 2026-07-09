import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  coverageRatio, weightedPipeline, weightedCoverage, gap,
  requiredAdditionalPipeline, calcHealthBand,
} from '../src/engines/sales/pipeline-coverage-calculator.ts';

// =====================================================================
// P8-6 Pipeline Coverage — 8 math tests per spec §"P8-6: Pipeline Coverage"
// =====================================================================
// Math model:
//   coverageRatio = pipelineValue / quotaTarget
//   weightedPipeline = pipelineValue * (winRate / 100)
//   weightedCoverage = weightedPipeline / quotaTarget
//   gap = quotaTarget - weightedPipeline
//   requiredAdditionalPipeline = (winRate > 0) ? gap / (winRate / 100) : 0
//
// Health bands by coverageRatio:
//   🟢 ≥ 3.0x — excellent (3x rule)
//   🟡 2.0 ≤ x < 3.0 — good
//   🟠 1.0 ≤ x < 2.0 — warning
//   🔴 < 1.0 — critical

// Test 1: canonical coverageRatio
test('coverageRatio(1500000, 1000000) === 1.5 (canonical)', () => {
  assert.equal(coverageRatio(1500000, 1000000), 1.5);
});

// Test 2: weightedCoverage canonical (with default winRate=25%)
//   1500000 × 0.25 = 375000; 375000 / 1000000 = 0.375
test('weightedCoverage(1500000, 25, 1000000) === 0.375 (canonical)', () => {
  assert.equal(weightedCoverage(1500000, 25, 1000000), 0.375);
});

// Test 3: requiredAdditionalPipeline canonical
//   gap=625000, winRate=25 → 625000 / 0.25 = 2500000
test('requiredAdditionalPipeline(625000, 25) === 2500000 (canonical)', () => {
  assert.equal(requiredAdditionalPipeline(625000, 25), 2500000);
});

// Test 4: critical band (just below 1.0x)
test('calcHealthBand: 0.99 → critical', () => {
  assert.equal(calcHealthBand(0.99), 'critical');
});

// Test 5: warning band exact boundary (1.0x)
test('calcHealthBand: 1.0 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(1.0), 'warning');
});

// Test 6: good band exact boundary (2.0x)
test('calcHealthBand: 2.0 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(2.0), 'good');
});

// Test 7: excellent band exact boundary (3.0x — 3x rule)
test('calcHealthBand: 3.0 → excellent (exact boundary, 3x rule)', () => {
  assert.equal(calcHealthBand(3.0), 'excellent');
});

// Test 8: zero win rate guard (avoid Infinity)
test('zero win rate guard: requiredAdditionalPipeline(625000, 0) === 0 (avoid Infinity)', () => {
  assert.equal(requiredAdditionalPipeline(625000, 0), 0);
});
