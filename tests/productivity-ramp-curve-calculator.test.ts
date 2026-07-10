import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { productivityAtMonth, findP50Month, calcHealthBand, HEALTH_BANDS } from '../src/engines/hiring-team/productivity-ramp-curve-calculator.ts';

test('productivityAtMonth: S-Curve 6mo starting 0% at month 0 = ~0%', () => {
  const p = productivityAtMonth(0, 6, 0, 'S-Curve');
  assert.ok(p < 1, `expected near 0, got ${p}`);
});

test('productivityAtMonth: S-Curve 6mo starting 0% at month 3 = ~50% (inflection)', () => {
  const p = productivityAtMonth(3, 6, 0, 'S-Curve');
  assert.ok(Math.abs(p - 50) < 1, `expected ~50%, got ${p}`);
});

test('productivityAtMonth: S-Curve 6mo starting 0% at month 6 = ~100%', () => {
  const p = productivityAtMonth(6, 6, 0, 'S-Curve');
  assert.ok(p > 99, `expected ~100%, got ${p}`);
});

test('productivityAtMonth: Linear 6mo starting 0% at month 3 = 50%', () => {
  const p = productivityAtMonth(3, 6, 0, 'Linear');
  assert.equal(p, 50);
});

test('productivityAtMonth: SlowStart 6mo starting 0% at month 3 = 25%', () => {
  const p = productivityAtMonth(3, 6, 0, 'SlowStart');
  assert.equal(p, 25);
});

test('productivityAtMonth: S-Curve with starting 20% at month 6 = 100%', () => {
  const p = productivityAtMonth(6, 6, 20, 'S-Curve');
  assert.ok(p > 99, `expected ~100%, got ${p}`);
});

test('findP50Month: S-Curve 6mo 0% returns 3 (P50 inflection at 50% of months_to_full)', () => {
  assert.equal(findP50Month(6, 0, 'S-Curve'), 3);
});

test('findP50Month: Linear 6mo 0% returns 3', () => {
  assert.equal(findP50Month(6, 0, 'Linear'), 3);
});

test('findP50Month: SlowStart 6mo 0% returns ~4.24 (sqrt(0.5)*6)', () => {
  const m = findP50Month(6, 0, 'SlowStart');
  assert.ok(Math.abs(m - 4.243) < 0.1, `expected ~4.24, got ${m}`);
});

test('calcHealthBand: 30% (P50 month as % of months_to_full) → excellent (≤30%)', () => {
  assert.equal(calcHealthBand(30), 'excellent');
});

test('calcHealthBand: 50% → good (30-50%)', () => {
  assert.equal(calcHealthBand(50), 'good');
});

test('calcHealthBand: 80% → critical (>70%)', () => {
  assert.equal(calcHealthBand(80), 'critical');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.30);
  assert.equal(HEALTH_BANDS.good.threshold, 0.50);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.70);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});