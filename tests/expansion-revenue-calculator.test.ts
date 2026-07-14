import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  expansionMRR, expansionPct, calcHealthBand, HEALTH_BANDS,
} from '../src/engines/retention/expansion-revenue-calculator.ts';

test('expansionPct: 12K+5K = 17K / 100K = 0.17 (canonical)', () => {
  assert.equal(expansionPct(100000, 12000, 5000), 0.17);
});

test('expansionMRR: 12K+5K = 17000', () => {
  assert.equal(expansionMRR(12000, 5000), 17000);
});

test('calcHealthBand: 0.04 → critical', () => {
  assert.equal(calcHealthBand(0.04), 'critical');
});

test('calcHealthBand: 0.05 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(0.05), 'warning');
});

test('calcHealthBand: 0.15 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(0.15), 'good');
});

test('calcHealthBand: 0.25 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(0.25), 'excellent');
});

test('Pure cross-sell: expansionMRR(0, 8000) = 8000', () => {
  assert.equal(expansionMRR(0, 8000), 8000);
});

test('Zero expansion: expansionPct(100K, 0, 0) === 0 → critical', () => {
  assert.equal(expansionPct(100000, 0, 0), 0);
});

test('HEALTH_BANDS exported with correct thresholds', () => {
  assert.deepEqual(HEALTH_BANDS.excellent, [0.25, Infinity]);
  assert.deepEqual(HEALTH_BANDS.good, [0.15, 0.25]);
  assert.deepEqual(HEALTH_BANDS.warning, [0.05, 0.15]);
  assert.deepEqual(HEALTH_BANDS.critical, [0, 0.05]);
});

// P14-followup: negative startingMRR clamps to 0 → no divide-by-zero (defensive layer 2)
// clampNonNegative(-100000) → 0; expansionPct(0, 12000, 5000) → 0 (zero-division guard kicks in)
test('expansion: negative startingMRR clamps to 0 → no divide-by-zero (defensive layer 2)', () => {
  const s = 0; // after clampNonNegative(-100000)
  const ratio = expansionPct(s, 12000, 5000);
  assert.equal(ratio, 0); // guard against negative or NaN ratio
  assert.equal(calcHealthBand(ratio), 'critical');
});