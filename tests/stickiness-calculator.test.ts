import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { stickiness, calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/stickiness-calculator.ts';

test('stickiness: 650/5000 = 0.13 (Good)', () => {
  assert.equal(stickiness(650, 5000), 0.13);
});

test('stickiness: 1000/5000 = 0.20 (Excellent)', () => {
  assert.equal(stickiness(1000, 5000), 0.20);
});

test('stickiness: zero MAU returns 0 (safe handle)', () => {
  assert.equal(stickiness(100, 0), 0);
});

test('stickiness: DAU >= MAU caps at 1.0', () => {
  assert.equal(stickiness(6000, 5000), 1.0);
});

test('calcHealthBand: 0.25 -> excellent (>=0.20)', () => {
  assert.equal(calcHealthBand(0.25), 'excellent');
});

test('calcHealthBand: 0.13 -> good (>=0.05, <0.20)', () => {
  assert.equal(calcHealthBand(0.13), 'good');
});

test('calcHealthBand: 0.10 -> warning (>=0.05, <0.13)', () => {
  assert.equal(calcHealthBand(0.10), 'warning');
});

test('calcHealthBand: 0.03 -> critical (<0.05)', () => {
  assert.equal(calcHealthBand(0.03), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.20);
  assert.equal(HEALTH_BANDS.good.threshold, 0.13);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.05);
  assert.equal(HEALTH_BANDS.critical.threshold, 0);
});
