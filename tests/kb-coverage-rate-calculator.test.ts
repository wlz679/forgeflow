import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { coverageRate, gapTickets, calcHealthBand, HEALTH_BANDS } from '../src/engines/knowledge/kb-coverage-rate-calculator.ts';

test('coverageRate: 3500/5000 = 0.70 (canonical)', () => {
  assert.equal(coverageRate(3500, 5000), 0.7);
});

test('coverageRate: zero divisor guard → 0', () => {
  assert.equal(coverageRate(0, 0), 0);
});

test('coverageRate: 0/5000 = 0 (0% coverage edge)', () => {
  assert.equal(coverageRate(0, 5000), 0);
});

test('coverageRate: 5000/5000 = 1.0 (100% coverage edge)', () => {
  assert.equal(coverageRate(5000, 5000), 1.0);
});

test('gapTickets: matched=3500, total=5000 → 1500 (canonical gap math)', () => {
  assert.equal(gapTickets(3500, 5000), 1500);
});

test('gapTickets: matched=5000, total=5000 → 0 (no gap)', () => {
  assert.equal(gapTickets(5000, 5000), 0);
});

test('calcHealthBand: 0.85 → excellent (≥85%)', () => {
  assert.equal(calcHealthBand(0.85), 'excellent');
});

test('calcHealthBand: 0.70 → good (60-85%, canonical)', () => {
  assert.equal(calcHealthBand(0.70), 'good');
});

test('calcHealthBand: 0.45 → warning (40-60%)', () => {
  assert.equal(calcHealthBand(0.45), 'warning');
});

test('calcHealthBand: 0.30 → critical (<40%)', () => {
  assert.equal(calcHealthBand(0.30), 'critical');
});

test('calcHealthBand: 0.60 exact boundary → good', () => {
  assert.equal(calcHealthBand(0.60), 'good');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.85);
  assert.equal(HEALTH_BANDS.good.threshold, 0.60);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.40);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});