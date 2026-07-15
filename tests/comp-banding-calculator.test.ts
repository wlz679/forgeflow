import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { compPercentile, calcHealthBand, HEALTH_BANDS } from '../src/engines/hiring-team/comp-banding-calculator.ts';

test('compPercentile: $160K vs P25 $130K/P50 $155K/P75 $185K = ~P54', () => {
  const p = compPercentile(160000, 130000, 155000, 185000);
  assert.ok(Math.abs(p - 54.17) < 0.5, `expected ~54.17, got ${p}`);
});

test('compPercentile: base = P50 = 50', () => {
  assert.equal(compPercentile(155000, 130000, 155000, 185000), 50);
});

test('compPercentile: base = P25 = 25', () => {
  assert.equal(compPercentile(130000, 130000, 155000, 185000), 25);
});

test('compPercentile: base = P75 = 75', () => {
  assert.equal(compPercentile(185000, 130000, 155000, 185000), 75);
});

test('compPercentile: base below P25 = <25', () => {
  const p = compPercentile(65000, 130000, 155000, 185000);
  assert.ok(p < 25, `expected <25, got ${p}`);
});

test('compPercentile: base above P75 capped at 100', () => {
  const p = compPercentile(370000, 130000, 155000, 185000);
  assert.equal(p, 100);
});

test('calcHealthBand: 80 → excellent (≥P75)', () => {
  assert.equal(calcHealthBand(80), 'excellent');
});

test('calcHealthBand: 54 → good (P50-P75)', () => {
  assert.equal(calcHealthBand(54), 'good');
});

test('calcHealthBand: 30 → warning (P25-P50)', () => {
  assert.equal(calcHealthBand(30), 'warning');
});

test('calcHealthBand: 20 → critical (<P25)', () => {
  assert.equal(calcHealthBand(20), 'critical');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 75);
  assert.equal(HEALTH_BANDS.good.threshold, 50);
  assert.equal(HEALTH_BANDS.warning.threshold, 25);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});
