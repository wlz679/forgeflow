import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { fullyLoadedCost, costMultiplier, calcHealthBand, HEALTH_BANDS } from '../src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts';

test('fullyLoadedCost: $120K + 25% + 8% + 15% = $177600 (display rounds to $178K)', () => {
  assert.equal(fullyLoadedCost(120000, 25, 8, 15), 177600);
});

test('fullyLoadedCost: $100K + 30% + 10% + 20% = $160K', () => {
  assert.equal(fullyLoadedCost(100000, 30, 10, 20), 160000);
});

test('fullyLoadedCost: $0 base = $0', () => {
  assert.equal(fullyLoadedCost(0, 25, 8, 15), 0);
});

test('costMultiplier: $178K / $120K = 1.4833...', () => {
  assert.ok(Math.abs(costMultiplier(178000, 120000) - 1.4833) < 0.01);
});

test('costMultiplier: $100K / $100K = 1.0', () => {
  assert.equal(costMultiplier(100000, 100000), 1);
});

test('calcHealthBand: 1.20 → excellent (≤1.25)', () => {
  assert.equal(calcHealthBand(1.20), 'excellent');
});

test('calcHealthBand: 1.30 → good (>1.25, ≤1.4)', () => {
  assert.equal(calcHealthBand(1.30), 'good');
});

test('calcHealthBand: 1.483 → warning (>1.4, ≤1.6)', () => {
  assert.equal(calcHealthBand(1.483), 'warning');
});

test('calcHealthBand: 1.80 → critical (>1.6)', () => {
  assert.equal(calcHealthBand(1.80), 'critical');
});

test('calcHealthBand: 1.25 exact boundary → excellent', () => {
  assert.equal(calcHealthBand(1.25), 'excellent');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 1.25);
  assert.equal(HEALTH_BANDS.good.threshold, 1.4);
  assert.equal(HEALTH_BANDS.warning.threshold, 1.6);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});
