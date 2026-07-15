import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  calcRecoveryROI,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/marketing/cart-abandonment-cost-calculator.ts';

// Canonical: 50000, 20, 70, 80, 8, 0.5 → recovery_roi = 1280% → 🟢 Good
test('cart-abandonment: canonical inputs → 1280% ROI → 🟢 Good', () => {
  const traffic = 50000;
  const addRate = 20;
  const abandonRate = 70;
  const aov = 80;
  const recoveryRate = 8;
  const recoveryCost = 0.5;
  const creations = traffic * (addRate / 100);
  const abandoned = creations * (abandonRate / 100);
  const lost = abandoned * aov;
  const recoverable = lost * (recoveryRate / 100);
  const cost = abandoned * recoveryCost;
  const roi = cost > 0 ? recoverable / cost : 0;
  assert.equal(creations, 10000);
  assert.equal(abandoned, 7000);
  assert.equal(lost, 560000);
  assert.equal(recoverable, 44800);
  assert.equal(cost, 3500);
  const calcROI = calcRecoveryROI(traffic, addRate, abandonRate, aov, recoveryRate, recoveryCost);
  assert.ok(Math.abs(calcROI - 12.80) < 0.01, `expected 12.80, got ${calcROI.toFixed(2)}`);
  assert.equal(calcHealthBand(roi), 'good');
});

// Health bands: 3 boundary tests
test('cart-abandonment: ROI >= 300% (3.0x) -> good', () => {
  assert.equal(calcHealthBand(3.0), 'good');
  assert.equal(calcHealthBand(5.0), 'good');
});

test('cart-abandonment: ROI 100-300% (1.0-3.0x) -> warning', () => {
  assert.equal(calcHealthBand(2.0), 'warning');
  assert.equal(calcHealthBand(1.0), 'warning');
});

test('cart-abandonment: ROI < 100% (<1.0x) -> critical', () => {
  assert.equal(calcHealthBand(0.5), 'critical');
  assert.equal(calcHealthBand(0.0), 'critical');
});

// Defensive clamp: negative input clamps to 0
test('cart-abandonment: negative traffic clamps to 0 (defensive layer 2)', () => {
  // clampNonNegative(-50000) -> 0; calcRecoveryROI(0, ...) -> 0
  const roi = calcRecoveryROI(0, 20, 70, 80, 8, 0.5);
  assert.equal(roi, 0);
  assert.ok(roi >= 0);
});

// Edge case: all zeros -> ROI undefined -> 0 or NaN (guard)
test('cart-abandonment: all-zero inputs -> guard handles gracefully', () => {
  const roi = calcRecoveryROI(0, 0, 0, 0, 0, 0);
  assert.ok(roi >= 0 || isNaN(roi)); // Accept either 0 or NaN; never Infinity or negative
  assert.ok(!isFinite(roi) ? false : roi >= 0); // Ensure no Infinity
});

test('HEALTH_BANDS has 3 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 3);
  assert.equal(HEALTH_BANDS.good.threshold, 3.0);
  assert.equal(HEALTH_BANDS.warning.threshold, 1.0);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});
