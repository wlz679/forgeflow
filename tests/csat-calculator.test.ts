import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  marginOfError,
  confidenceInterval,
  gapToTarget,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/customer-support/csat-calculator.ts';

test('marginOfError: 87% at n=200 → ~4.66pp', () => {
  const m = marginOfError(87, 200);
  assert.ok(Math.abs(m - 4.66) < 0.05, `expected ~4.66, got ${m}`);
});

test('marginOfError: n=0 → Infinity (avoid division by zero)', () => {
  assert.equal(marginOfError(87, 0), Infinity);
});

test('marginOfError: 50% at n=400 → max error (~4.9pp at z=1.96)', () => {
  const m = marginOfError(50, 400);
  assert.ok(Math.abs(m - 4.9) < 0.1, `expected ~4.9, got ${m}`);
});

test('confidenceInterval: 87 ± 4.66 → [82.34, 91.66]', () => {
  const ci = confidenceInterval(87, 200);
  assert.equal(ci.low, 87 - marginOfError(87, 200));
  assert.equal(ci.high, 87 + marginOfError(87, 200));
});

test('gapToTarget: 87 vs 90 → -3pp (below)', () => {
  assert.equal(gapToTarget(87, 90), -3);
});

test('gapToTarget: 95 vs 90 → +5pp (above)', () => {
  assert.equal(gapToTarget(95, 90), 5);
});

test('calcHealthBand: 90 → excellent (≥90)', () => {
  assert.equal(calcHealthBand(90), 'excellent');
});

test('calcHealthBand: 87 → good', () => {
  assert.equal(calcHealthBand(87), 'good');
});

test('calcHealthBand: 75 → warning', () => {
  assert.equal(calcHealthBand(75), 'warning');
});

test('HEALTH_BANDS has 4 HIGHER-is-better thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 90);
  assert.equal(HEALTH_BANDS.good.threshold, 80);
  assert.equal(HEALTH_BANDS.warning.threshold, 70);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});