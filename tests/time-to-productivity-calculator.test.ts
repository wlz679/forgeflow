import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { adjustedRamp, calcHealthBand, HEALTH_BANDS } from '../src/engines/hiring-team/time-to-productivity-calculator.ts';

test('adjustedRamp: 8w × Med (1.0) = 8w', () => {
  assert.equal(adjustedRamp(8, 'Med'), 8);
});

test('adjustedRamp: 8w × Low (0.75) = 6w', () => {
  assert.equal(adjustedRamp(8, 'Low'), 6);
});

test('adjustedRamp: 8w × High (1.4) = 11.2w', () => {
  assert.ok(Math.abs(adjustedRamp(8, 'High') - 11.2) < 0.01);
});

test('adjustedRamp: 4w × Low (0.75) = 3w', () => {
  assert.equal(adjustedRamp(4, 'Low'), 3);
});

test('calcHealthBand: IC 3w → excellent (≤4)', () => {
  assert.equal(calcHealthBand(3, 'IC'), 'excellent');
});

test('calcHealthBand: IC 8w → good (4-8)', () => {
  assert.equal(calcHealthBand(8, 'IC'), 'good');
});

test('calcHealthBand: IC 12w → warning (8-16)', () => {
  assert.equal(calcHealthBand(12, 'IC'), 'warning');
});

test('calcHealthBand: Manager 4w → excellent (≤8)', () => {
  assert.equal(calcHealthBand(4, 'Manager'), 'excellent');
});

test('calcHealthBand: Manager 12w → good (8-16)', () => {
  assert.equal(calcHealthBand(12, 'Manager'), 'good');
});

test('HEALTH_BANDS has IC + Manager sub-tables with 3 band thresholds each', () => {
  assert.equal(Object.keys(HEALTH_BANDS.IC).length, 4);
  assert.equal(Object.keys(HEALTH_BANDS.Manager).length, 4);
  assert.equal(HEALTH_BANDS.IC.excellent.threshold, 4);
  assert.equal(HEALTH_BANDS.IC.good.threshold, 8);
  assert.equal(HEALTH_BANDS.IC.warning.threshold, 16);
  assert.equal(HEALTH_BANDS.IC.critical.threshold, Infinity);
  assert.equal(HEALTH_BANDS.Manager.excellent.threshold, 8);
  assert.equal(HEALTH_BANDS.Manager.good.threshold, 16);
  assert.equal(HEALTH_BANDS.Manager.warning.threshold, 26);
  assert.equal(HEALTH_BANDS.Manager.critical.threshold, Infinity);
});

// P16-3 defensive layer 2: clampNonNegative guards prevent negative ramp weeks
// from producing negative adjusted ramp time.
test('time-to-productivity: defensive clampNonNegative guards (P16-3 layer 2)', () => {
  // Negative weeks → 0 (clamp); adjustedRamp(0, ...) → 0
  assert.equal(adjustedRamp(0, 'Med'), 0, '0 weeks (clamped from negative) → 0');
  assert.equal(adjustedRamp(0, 'Low'), 0, '0 weeks → 0');
  assert.equal(adjustedRamp(0, 'High'), 0, '0 weeks → 0');
  // Band resolves cleanly
  assert.equal(calcHealthBand(0, 'IC'), 'excellent', '0w IC → excellent');
  assert.equal(calcHealthBand(0, 'Manager'), 'excellent', '0w Manager → excellent');
});
