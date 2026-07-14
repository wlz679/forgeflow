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

// P14-followup: negative p50_days clamps to 0 → band still computable, same-session tier (defensive layer 2)
// clampNonNegative(-2) → 0; calcHealthBand(0) → 'excellent' (same-session aha, top tier)
test('time-to-value: negative p50_days clamps to 0 → band still computable (defensive layer 2)', () => {
  const p = 0; // after clampNonNegative(-2)
  const band = calcHealthBand(p);
  assert.equal(band, 'excellent'); // 0 days = same-session aha, top tier
});
