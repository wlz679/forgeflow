import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { funnelEndToEnd, biggestDrop, calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/funnel-step-calculator.ts';

test('funnelEndToEnd: 1000→800→500→320 = 0.32', () => {
  assert.equal(funnelEndToEnd([1000, 800, 500, 320]), 0.32);
});

test('funnelEndToEnd: 2-step [500, 100] = 0.20', () => {
  assert.equal(funnelEndToEnd([500, 100]), 0.2);
});

test('funnelEndToEnd: 4-step equal steps [1000, 1000, 1000, 1000] = 1.0', () => {
  assert.equal(funnelEndToEnd([1000, 1000, 1000, 1000]), 1.0);
});

test('biggestDrop: 1000→800→500→320 returns index 1 (step 2→3)', () => {
  assert.equal(biggestDrop([1000, 800, 500, 320]), 1);
});

test('biggestDrop: monotonically decreasing returns index 0', () => {
  assert.equal(biggestDrop([1000, 500]), 0);
});

test('biggestDrop: zero drops (all equal) returns index 0', () => {
  assert.equal(biggestDrop([1000, 1000, 1000]), 0);
});

test('calcHealthBand: 0.50 → excellent (>=0.40)', () => {
  assert.equal(calcHealthBand(0.5), 'excellent');
});

test('calcHealthBand: 0.32 → good (>=0.25, <0.40)', () => {
  assert.equal(calcHealthBand(0.32), 'good');
});

test('calcHealthBand: 0.20 → warning (>=0.15, <0.25)', () => {
  assert.equal(calcHealthBand(0.2), 'warning');
});

test('calcHealthBand: 0.10 → critical (<0.15)', () => {
  assert.equal(calcHealthBand(0.1), 'critical');
});

test('calcHealthBand: 0.40 exact boundary -> excellent', () => {
  assert.equal(calcHealthBand(0.4), 'excellent');
});

test('calcHealthBand: 0.0 -> critical', () => {
  assert.equal(calcHealthBand(0), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.40);
  assert.equal(HEALTH_BANDS.good.threshold, 0.25);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.15);
  assert.equal(HEALTH_BANDS.critical.threshold, 0);
});
