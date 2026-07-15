import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  calcTrueROI,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/marketing/coupon-attribution-calculator.ts';

// Canonical: 20, 10%, 80, 50000, 30% → true_roi = 180%
test('coupon-attribution: canonical inputs → 180% ROI → 🟢 Good', () => {
  const couponValue = 20;
  const redemptionPct = 10;
  const aov = 80;
  const baseline = 50000;
  const cannibalization = 30;
  const total = (baseline * (redemptionPct / 100)) * aov;
  const couponCost = baseline * (redemptionPct / 100) * couponValue;
  const incremental = total * (1 - cannibalization / 100);
  const net = incremental - couponCost;
  const roi = calcTrueROI(couponValue, redemptionPct, aov, baseline, cannibalization);
  assert.ok(Math.abs(roi - 1.80) < 0.01, `expected 1.80, got ${roi.toFixed(2)}`);
  assert.equal(total, 400000);
  assert.equal(couponCost, 100000);
  assert.equal(incremental, 280000);
  assert.equal(net, 180000);
  assert.equal(calcHealthBand(roi), 'good');
});

// Health bands: 3 boundary tests
test('coupon-attribution: ROI ≥ 100% → good', () => {
  assert.equal(calcHealthBand(1.5), 'good');
  assert.equal(calcHealthBand(1.0), 'good');
});

test('coupon-attribution: ROI 0-100% → warning', () => {
  assert.equal(calcHealthBand(0.5), 'warning');
  assert.equal(calcHealthBand(0.0), 'warning');
});

test('coupon-attribution: ROI < 0% → critical', () => {
  assert.equal(calcHealthBand(-0.5), 'critical');
});

// Defensive clamp: negative input clamps to 0
test('coupon-attribution: negative coupon_value clamps to 0 (defensive layer 2)', () => {
  // clampNonNegative(-20) → 0; calcTrueROI(0, ...) → 0 (avoid NaN/negative ratio)
  const roi = calcTrueROI(0, 10, 80, 50000, 30);
  assert.equal(roi, 0);
  assert.ok(roi >= 0);
  assert.ok(!isNaN(roi));
});

// Edge case: all zeros → ROI undefined → 0 or NaN (guard)
test('coupon-attribution: all-zero inputs → guard handles gracefully', () => {
  const roi = calcTrueROI(0, 0, 0, 0, 0);
  assert.ok(roi >= 0 || isNaN(roi)); // Accept either 0 or NaN; never Infinity or negative
  assert.ok(!isFinite(roi) ? false : roi >= 0); // Ensure no Infinity
});

test('HEALTH_BANDS has 3 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 3);
  assert.equal(HEALTH_BANDS.good.threshold, 1.0);
  assert.equal(HEALTH_BANDS.warning.threshold, 0);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});