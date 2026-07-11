import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  deflectedVolume,
  savedCost,
  netSavings,
  roiPct,
  gapToTarget,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/customer-support/deflection-rate-calculator.ts';

test('deflectedVolume: 5000 × 35% = 1750', () => {
  assert.equal(deflectedVolume(5000, 35), 1750);
});

test('deflectedVolume: 0 → 0', () => {
  assert.equal(deflectedVolume(0, 35), 0);
});

test('savedCost: 1750 × $24 = $42000', () => {
  assert.equal(savedCost(1750, 24), 42000);
});

test('netSavings: $42000 - $1500 = $40500', () => {
  assert.equal(netSavings(42000, 1500), 40500);
});

test('netSavings: 0 tool cost = gross saved', () => {
  assert.equal(netSavings(42000, 0), 42000);
});

test('roiPct: $40500 / $1500 × 100 = 2700%', () => {
  assert.equal(roiPct(40500, 1500), 2700);
});

test('roiPct: 0 tool cost → Infinity', () => {
  assert.equal(roiPct(40500, 0), Infinity);
});

test('gapToTarget: 35% vs 40% target → -5pp', () => {
  assert.equal(gapToTarget(35, 40), -5);
});

test('calcHealthBand: 40 → excellent (≥40)', () => {
  assert.equal(calcHealthBand(40), 'excellent');
});

test('calcHealthBand: 35 → good', () => {
  assert.equal(calcHealthBand(35), 'good');
});

test('calcHealthBand: 20 → warning', () => {
  assert.equal(calcHealthBand(20), 'warning');
});

test('calcHealthBand: 5 → critical', () => {
  assert.equal(calcHealthBand(5), 'critical');
});

test('HEALTH_BANDS has 4 HIGHER-is-better thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 40);
  assert.equal(HEALTH_BANDS.good.threshold, 25);
  assert.equal(HEALTH_BANDS.warning.threshold, 10);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});