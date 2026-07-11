import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  overallAttainment,
  attainmentGapToExcellent,
  tierAttainmentSpread,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/customer-support/first-response-time-calculator.ts';

test('overallAttainment: T1 85% / T2 80% / T3 90% = 85.0%', () => {
  assert.equal(overallAttainment(85, 80, 90), 85);
});

test('overallAttainment: equal-weighted tiers, not ticket-volume weighted', () => {
  assert.equal(overallAttainment(100, 0, 0), 100 / 3);
});

test('overallAttainment: decimal tier rates average exactly', () => {
  assert.equal(overallAttainment(99.9, 88.8, 77.7), 88.8);
});

test('attainmentGapToExcellent: 85% needs +5pp to reach 90%', () => {
  assert.equal(attainmentGapToExcellent(85), 5);
});

test('tierAttainmentSpread: canonical tier spread is 10pp', () => {
  assert.equal(tierAttainmentSpread(85, 80, 90), 10);
});

test('calcHealthBand: 90 exact boundary → excellent', () => {
  assert.equal(calcHealthBand(90), 'excellent');
});

test('calcHealthBand: 85 → good', () => {
  assert.equal(calcHealthBand(85), 'good');
});

test('calcHealthBand: 60 exact boundary → warning', () => {
  assert.equal(calcHealthBand(60), 'warning');
});

test('calcHealthBand: 59.9 → critical', () => {
  assert.equal(calcHealthBand(59.9), 'critical');
});

test('HEALTH_BANDS has 4 HIGHER-is-better thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 90);
  assert.equal(HEALTH_BANDS.good.threshold, 80);
  assert.equal(HEALTH_BANDS.warning.threshold, 60);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});
