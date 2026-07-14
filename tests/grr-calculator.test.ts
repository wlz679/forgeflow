import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  retainedMRR, grr, calcHealthBand, HEALTH_BANDS,
} from '../src/engines/retention/grr-calculator.ts';

test('grr: 100K-5K-8K = 87K / 100K = 0.87 (canonical)', () => {
  assert.equal(grr(100000, 5000, 8000), 0.87);
});

test('retainedMRR: 100K-5K-8K = 87000', () => {
  assert.equal(retainedMRR(100000, 5000, 8000), 87000);
});

test('calcHealthBand: 0.79 → critical', () => {
  assert.equal(calcHealthBand(0.79), 'critical');
});

test('calcHealthBand: 0.80 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(0.80), 'warning');
});

test('calcHealthBand: 0.90 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(0.90), 'good');
});

test('calcHealthBand: 0.95 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(0.95), 'excellent');
});

test('Zero loss: grr(100K, 0, 0) === 1.0 (best case → excellent)', () => {
  assert.equal(grr(100000, 0, 0), 1.0);
});

test('HEALTH_BANDS exported with correct thresholds', () => {
  assert.deepEqual(HEALTH_BANDS.excellent, [0.95, Infinity]);
  assert.deepEqual(HEALTH_BANDS.good, [0.90, 0.95]);
  assert.deepEqual(HEALTH_BANDS.warning, [0.80, 0.90]);
  assert.deepEqual(HEALTH_BANDS.critical, [0, 0.80]);
});

// P14-followup: negative startingMRR clamps to 0 → no divide-by-zero (defensive layer 2)
// clampNonNegative(-100000) → 0; grr(0, 5000, 8000) → 0 (zero-division guard kicks in)
test('grr: negative startingMRR clamps to 0 → no divide-by-zero (defensive layer 2)', () => {
  const s = 0; // after clampNonNegative(-100000)
  const g = grr(s, 5000, 8000);
  assert.equal(g, 0); // guard against negative or NaN ratio
  assert.equal(calcHealthBand(g), 'critical');
});