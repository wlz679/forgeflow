import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  logoChurnPct, retainedCustomers, calcHealthBand, HEALTH_BANDS,
} from '../src/engines/retention/logo-churn-rate-calculator.ts';

test('logoChurnPct: 8 / 100 = 0.08 (canonical)', () => {
  assert.equal(logoChurnPct(100, 8), 0.08);
});

test('retainedCustomers: 100 - 8 = 92', () => {
  assert.equal(retainedCustomers(100, 8), 92);
});

test('calcHealthBand: 0.04 → excellent (INVERSE band direction)', () => {
  assert.equal(calcHealthBand(0.04), 'excellent');
});

test('calcHealthBand: 0.05 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(0.05), 'good');
});

test('calcHealthBand: 0.10 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(0.10), 'warning');
});

test('calcHealthBand: 0.20 → critical (exact boundary)', () => {
  assert.equal(calcHealthBand(0.20), 'critical');
});

test('Zero churn: logoChurnPct(100, 0) === 0 → excellent', () => {
  assert.equal(logoChurnPct(100, 0), 0);
});

test('HEALTH_BANDS exported with correct thresholds (INVERSE direction)', () => {
  assert.deepEqual(HEALTH_BANDS.excellent, [0, 0.05]);
  assert.deepEqual(HEALTH_BANDS.good, [0.05, 0.10]);
  assert.deepEqual(HEALTH_BANDS.warning, [0.10, 0.20]);
  assert.deepEqual(HEALTH_BANDS.critical, [0.20, Infinity]);
});