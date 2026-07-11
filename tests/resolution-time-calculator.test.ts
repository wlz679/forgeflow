import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  tailRatio,
  tailRatioHealth,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/customer-support/resolution-time-calculator.ts';

test('tailRatio: p90 36hr / median 8hr = 4.5', () => {
  assert.equal(tailRatio(8, 36), 4.5);
});

test('tailRatio: p90 == median → uniform (1.0)', () => {
  assert.equal(tailRatio(8, 8), 1);
});

test('tailRatio: 0 median → 0 (no division by zero)', () => {
  assert.equal(tailRatio(0, 36), 0);
});

test('tailRatioHealth: tail 4.5 → heavy (above 3x warning)', () => {
  assert.equal(tailRatioHealth(4.5), 'heavy');
});

test('tailRatioHealth: tail 1.0 → uniform', () => {
  assert.equal(tailRatioHealth(1.0), 'uniform');
});

test('calcHealthBand: 85 exact boundary → excellent', () => {
  assert.equal(calcHealthBand(85), 'excellent');
});

test('calcHealthBand: 75 → good', () => {
  assert.equal(calcHealthBand(75), 'good');
});

test('calcHealthBand: 60 → warning', () => {
  assert.equal(calcHealthBand(60), 'warning');
});

test('calcHealthBand: 49.9 → critical', () => {
  assert.equal(calcHealthBand(49.9), 'critical');
});

test('HEALTH_BANDS has 4 HIGHER-is-better thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 85);
  assert.equal(HEALTH_BANDS.good.threshold, 70);
  assert.equal(HEALTH_BANDS.warning.threshold, 50);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});