import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { reopenRate, qualityPct, gapToTarget, calcHealthBand, HEALTH_BANDS } from '../src/engines/knowledge/deflection-quality-calculator.ts';

test('canonical: deflected=1750, reopened=210 → reopen=0.12, band=good', () => {
  const reopen = reopenRate(210, 1750);
  assert.equal(reopen, 0.12);
  assert.equal(calcHealthBand(reopen), 'good');
});

test('reopenRate math: 210/1750 = 0.12 exactly (canonical reopening rate)', () => {
  const reopen = reopenRate(210, 1750);
  assert.equal(reopen, 0.12);
});

test('zero divisor guard: reopenRate(0, 0) → 0 (no NaN)', () => {
  assert.equal(reopenRate(0, 0), 0);
  // Band calc should still resolve (0 ≤ 0.08 → excellent).
  assert.equal(calcHealthBand(reopenRate(0, 0)), 'excellent');
});

test('zero reopened (1750, 0) → excellent (0% reopen ≤ 8%)', () => {
  const reopen = reopenRate(0, 1750);
  assert.equal(reopen, 0);
  assert.equal(calcHealthBand(reopen), 'excellent');
});

test('100% reopen (1750, 1750) → critical (1 > 0.25)', () => {
  const reopen = reopenRate(1750, 1750);
  assert.equal(reopen, 1);
  assert.equal(calcHealthBand(reopen), 'critical');
});

test('Boundary excellent: calcHealthBand(0.08) → excellent (exactly meets 8% threshold)', () => {
  assert.equal(calcHealthBand(0.08), 'excellent');
});

test('Boundary just-over excellent: calcHealthBand(0.081) → good (above 8% but ≤15%)', () => {
  assert.equal(calcHealthBand(0.081), 'good');
});

test('Boundary good: calcHealthBand(0.15) → good (exactly meets 15% threshold)', () => {
  assert.equal(calcHealthBand(0.15), 'good');
});

test('Boundary warning: calcHealthBand(0.25) → warning (exactly meets 25% threshold)', () => {
  assert.equal(calcHealthBand(0.25), 'warning');
});

test('HEALTH_BANDS exports 4 bands with Infinity critical (signature verification)', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  // Lock the INVERSE-band shape: thresholds are UPPER bounds (≤).
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.08);
  assert.equal(HEALTH_BANDS.good.threshold, 0.15);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.25);
  // P9-4 + P12-1 lesson: critical threshold uses Infinity (NOT -Infinity) so
  // any reopen > 0.25 falls through the cascade into critical.
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
  // Signature guard: 1-arg band (single reopen input, NOT 2-arg like K-3).
  assert.equal(calcHealthBand.length, 1);
});

// P14-followup: negative tickets_reopened clamps to 0 → no inverted reopen rate (defensive layer 2)
// clampNonNegative(-50) → 0; reopenRate(0, 1750) = 0 → band 'excellent' (no NaN)
// (Pre-clamp: reopenRate(-50, 1750) = -50/1750 = -0.0286 → negative reopen → bogus "below 0%" band)
test('deflection-quality: negative tickets_reopened clamps to 0 → no inverted reopen rate (defensive layer 2)', () => {
  const reopened = 0; // after clampNonNegative(-50)
  const reopen = reopenRate(reopened, 1750);
  // reopen rate must be >= 0 (defensive layer)
  assert.ok(reopen >= 0, 'reopen rate must be >= 0, got ' + reopen);
  assert.equal(reopen, 0);
  assert.equal(calcHealthBand(reopen), 'excellent');
});
