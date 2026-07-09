import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/time-to-value-calculator.ts';

test('calcHealthBand: 0 days -> excellent (<=1, fast aha)', () => {
  assert.equal(calcHealthBand(0), 'excellent');
});

test('calcHealthBand: 0.5 days -> excellent (<=1)', () => {
  assert.equal(calcHealthBand(0.5), 'excellent');
});

test('calcHealthBand: 1 day exact boundary -> excellent', () => {
  assert.equal(calcHealthBand(1), 'excellent');
});

test('calcHealthBand: 2 days -> good (<=3)', () => {
  assert.equal(calcHealthBand(2), 'good');
});

test('calcHealthBand: 3 days exact -> good', () => {
  assert.equal(calcHealthBand(3), 'good');
});

test('calcHealthBand: 5 days -> warning (<=7)', () => {
  assert.equal(calcHealthBand(5), 'warning');
});

test('calcHealthBand: 7 days exact -> warning', () => {
  assert.equal(calcHealthBand(7), 'warning');
});

test('calcHealthBand: 10 days -> critical (>7)', () => {
  assert.equal(calcHealthBand(10), 'critical');
});

test('calcHealthBand: negative days -> critical (safe handle)', () => {
  assert.equal(calcHealthBand(-1), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked INVERSE thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  // INVERSE direction: lower is better
  assert.equal(HEALTH_BANDS.excellent.threshold, 1);
  assert.equal(HEALTH_BANDS.good.threshold, 3);
  assert.equal(HEALTH_BANDS.warning.threshold, 7);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});
