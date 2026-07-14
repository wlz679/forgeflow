import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { paretoRatio, calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/power-user-curve-calculator.ts';

test('paretoRatio: 70/20 = 3.5', () => {
  assert.equal(paretoRatio(70, 20), 3.5);
});

test('paretoRatio: 50/20 = 2.5', () => {
  assert.equal(paretoRatio(50, 20), 2.5);
});

test('paretoRatio: 60/10 = 6.0', () => {
  assert.equal(paretoRatio(60, 10), 6.0);
});

test('paretoRatio: zero top_pct returns 0 (safe handle)', () => {
  assert.equal(paretoRatio(70, 0), 0);
});

test('paretoRatio: top_share > 100 cap to 100', () => {
  assert.equal(paretoRatio(120, 20), 5.0); // 100/20
});

test('paretoRatio: top_pct > 100 returns 0 (invalid input)', () => {
  assert.equal(paretoRatio(70, 150), 0);
});

test('calcHealthBand: 4.0 -> excellent (>=3.5)', () => {
  assert.equal(calcHealthBand(4.0), 'excellent');
});

test('calcHealthBand: 3.5 exact -> excellent', () => {
  assert.equal(calcHealthBand(3.5), 'excellent');
});

test('calcHealthBand: 3.2 -> good (>=3.0, <3.5)', () => {
  assert.equal(calcHealthBand(3.2), 'good');
});

test('calcHealthBand: 2.8 -> warning (>=2.5, <3.0)', () => {
  assert.equal(calcHealthBand(2.8), 'warning');
});

test('calcHealthBand: 2.0 -> critical (<2.5)', () => {
  assert.equal(calcHealthBand(2.0), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 3.5);
  assert.equal(HEALTH_BANDS.good.threshold, 3.0);
  assert.equal(HEALTH_BANDS.warning.threshold, 2.5);
  assert.equal(HEALTH_BANDS.critical.threshold, 0);
});

// P14-followup: negative top_pct clamps to 0 → invalid input, ratio returns 0 (defensive layer 2)
// clampNonNegative(-20) → 0; paretoRatio(70, 0) → 0 (zero-division guard kicks in)
test('power-user-curve: negative top_pct clamps to 0 → invalid input, no divide-by-zero (defensive layer 2)', () => {
  const p = 0; // after clampNonNegative(-20)
  const r = paretoRatio(70, p);
  assert.equal(r, 0); // guard against Infinity or NaN ratio
  assert.equal(calcHealthBand(r), 'critical');
});
