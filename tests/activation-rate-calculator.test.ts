import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { activationRate, calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/activation-rate-calculator.ts';

test('activationRate: 150/500 = 0.30 (Good)', () => {
  assert.equal(activationRate(150, 500), 0.30);
});

test('activationRate: 250/500 = 0.50 (Excellent)', () => {
  assert.equal(activationRate(250, 500), 0.50);
});

test('activationRate: 50/500 = 0.10 (Critical)', () => {
  assert.equal(activationRate(50, 500), 0.10);
});

test('activationRate: 500/500 = 1.0 (capped)', () => {
  assert.equal(activationRate(500, 500), 1.0);
});

test('activationRate: zero signups returns 0 (safe handle)', () => {
  assert.equal(activationRate(50, 0), 0);
});

test('activationRate: activated > signups returns capped 1.0', () => {
  assert.equal(activationRate(800, 500), 1.0);
});

test('calcHealthBand: 0.45 -> excellent (>=0.40)', () => {
  assert.equal(calcHealthBand(0.45), 'excellent');
});

test('calcHealthBand: 0.30 -> good (>=0.25, <0.40)', () => {
  assert.equal(calcHealthBand(0.30), 'good');
});

test('calcHealthBand: 0.20 -> warning (>=0.15, <0.25)', () => {
  assert.equal(calcHealthBand(0.20), 'warning');
});

test('calcHealthBand: 0.10 -> critical (<0.15)', () => {
  assert.equal(calcHealthBand(0.10), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.40);
  assert.equal(HEALTH_BANDS.good.threshold, 0.25);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.15);
  assert.equal(HEALTH_BANDS.critical.threshold, 0);
});
