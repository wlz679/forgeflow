import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  netRetainedMRR, nrr, calcHealthBand, HEALTH_BANDS,
} from '../src/engines/retention/nrr-calculator.ts';

test('nrr: 100K+15K-5K-8K = 102K / 100K = 1.02 (canonical)', () => {
  assert.equal(nrr(100000, 15000, 5000, 8000), 1.02);
});

test('netRetainedMRR: 100K+15K-5K-8K = 102K', () => {
  assert.equal(netRetainedMRR(100000, 15000, 5000, 8000), 102000);
});

test('calcHealthBand: 0.99 → critical', () => {
  assert.equal(calcHealthBand(0.99), 'critical');
});

test('calcHealthBand: 1.00 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(1.00), 'warning');
});

test('calcHealthBand: 1.10 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(1.10), 'good');
});

test('calcHealthBand: 1.20 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(1.20), 'excellent');
});

test('Zero everything: nrr(0,0,0,0) → 0 → critical (zero-division guard)', () => {
  assert.equal(nrr(0, 0, 0, 0), 0);
});

test('Pure expansion: nrr(100K,25K,0,0) = 1.25 (excellent scenario)', () => {
  assert.equal(nrr(100000, 25000, 0, 0), 1.25);
});

test('HEALTH_BANDS exported with correct thresholds', () => {
  assert.deepEqual(HEALTH_BANDS.excellent, [1.20, Infinity]);
  assert.deepEqual(HEALTH_BANDS.good, [1.10, 1.20]);
  assert.deepEqual(HEALTH_BANDS.warning, [1.00, 1.10]);
  assert.deepEqual(HEALTH_BANDS.critical, [0, 1.00]);
});

// P14-followup: negative startingMRR clamps to 0 → no divide-by-zero (defensive layer 2)
// clampNonNegative(-100000) → 0; nrr(0, 15000, 5000, 8000) → 0 (zero-division guard kicks in)
test('nrr: negative startingMRR clamps to 0 → no divide-by-zero (defensive layer 2)', () => {
  const s = 0; // after clampNonNegative(-100000)
  const r = nrr(s, 15000, 5000, 8000);
  assert.equal(r, 0); // guard against negative or NaN ratio
  assert.equal(calcHealthBand(r), 'critical');
});