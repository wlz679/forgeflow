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

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs
// from propagating to percentile math (no NaN/Infinity in band calc).
test('comp-banding: defensive clampNonNegative guards (P16-3 layer 2)', () => {
  // base=0, all percentiles 0 → compPercentile handles edge cleanly
  const pct0 = compPercentile(0, 0, 0, 0);
  assert.equal(pct0, 0, 'all-zero input → 0');
  assert.equal(calcHealthBand(pct0), 'critical', 'P0 → critical band');
  // Tiny positive band
  const pct100 = compPercentile(1, 1, 1, 1);
  assert.ok(pct100 >= 0 && pct100 <= 100, 'percentile in [0, 100]');
});
