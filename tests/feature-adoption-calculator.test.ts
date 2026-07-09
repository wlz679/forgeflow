import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { featureAdoption, calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/feature-adoption-calculator.ts';

test('featureAdoption: 750/3000 = 0.25', () => {
  assert.equal(featureAdoption(750, 3000), 0.25);
});

test('featureAdoption: 1200/2000 = 0.60', () => {
  assert.equal(featureAdoption(1200, 2000), 0.6);
});

test('featureAdoption: 50/1000 = 0.05 (low-adoption, near dead)', () => {
  assert.equal(featureAdoption(50, 1000), 0.05);
});

test('featureAdoption: zero active_users returns 0 (safe handle)', () => {
  assert.equal(featureAdoption(100, 0), 0);
});

test('featureAdoption: feature_users > active_users returns capped 1.0', () => {
  assert.equal(featureAdoption(5000, 1000), 1.0);
});

test('calcHealthBand: 0.50 -> excellent (>=0.40)', () => {
  assert.equal(calcHealthBand(0.5), 'excellent');
});

test('calcHealthBand: 0.25 -> good (>=0.20, <0.40)', () => {
  assert.equal(calcHealthBand(0.25), 'good');
});

test('calcHealthBand: 0.15 -> warning (>=0.10, <0.20)', () => {
  assert.equal(calcHealthBand(0.15), 'warning');
});

test('calcHealthBand: 0.05 -> critical (<0.10)', () => {
  assert.equal(calcHealthBand(0.05), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.40);
  assert.equal(HEALTH_BANDS.good.threshold, 0.20);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.10);
  assert.equal(HEALTH_BANDS.critical.threshold, 0);
});
