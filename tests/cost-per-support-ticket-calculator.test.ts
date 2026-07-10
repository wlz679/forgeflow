import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { weightedAvgCost, monthlyTotalCost, calcHealthBand, HEALTH_BANDS } from '../src/engines/customer-support/cost-per-support-ticket-calculator.ts';

test('weightedAvgCost: T1 $8 × 55% + T2 $25 × 30% + T3 $70 × 15% = $22.40', () => {
  // t3_share = 100 - 55 - 30 = 15%
  assert.equal(weightedAvgCost(8, 25, 70, 55, 30), 22.4);
});

test('weightedAvgCost: all zero → 0', () => {
  assert.equal(weightedAvgCost(0, 0, 0, 0, 0), 0);
});

test('weightedAvgCost: t3 share dominates → avg ~$70 if all 100%', () => {
  // T1 0% / T2 0% / T3 100% → $70
  assert.equal(weightedAvgCost(8, 25, 70, 0, 0), 70);
});

test('monthlyTotalCost: $22.40 × 5000 = $112,000', () => {
  assert.equal(monthlyTotalCost(22.4, 5000), 112000);
});

test('monthlyTotalCost: 0 volume → 0', () => {
  assert.equal(monthlyTotalCost(22.4, 0), 0);
});

test('calcHealthBand: 8 → excellent (≤$10)', () => {
  assert.equal(calcHealthBand(8), 'excellent');
});

test('calcHealthBand: 22.4 → good ($10-$25)', () => {
  assert.equal(calcHealthBand(22.4), 'good');
});

test('calcHealthBand: 35 → warning ($25-$50)', () => {
  assert.equal(calcHealthBand(35), 'warning');
});

test('calcHealthBand: 60 → critical (>$50)', () => {
  assert.equal(calcHealthBand(60), 'critical');
});

test('calcHealthBand: 25 exact boundary → good', () => {
  assert.equal(calcHealthBand(25), 'good');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 10);
  assert.equal(HEALTH_BANDS.good.threshold, 25);
  assert.equal(HEALTH_BANDS.warning.threshold, 50);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});