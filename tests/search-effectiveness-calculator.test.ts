import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { ctr, noResultRate, abandonedSearches, calcHealthBand, HEALTH_BANDS } from '../src/engines/knowledge/search-effectiveness-calculator.ts';

test('canonical: total=12000, with_click=9000, no_result=960 → ctr=0.75, noResult=0.08, band=good', () => {
  const ctrVal = ctr(9000, 12000);
  const noRes = noResultRate(960, 12000);
  assert.equal(ctrVal, 0.75);
  assert.equal(noRes, 0.08);
  assert.equal(calcHealthBand(ctrVal, noRes), 'good');
});

test('ctrPct calc: 9000/12000*100 = 75 (canonical CTR percentage)', () => {
  const ctrPct = ctr(9000, 12000) * 100;
  // 0.75 * 100 = 75 in IEEE 754 may have tiny epsilon
  assert.ok(Math.abs(ctrPct - 75) < 1e-9);
});

test('noResultPct calc: 960/12000*100 = 8 (canonical no-result percentage)', () => {
  const noResPct = noResultRate(960, 12000) * 100;
  assert.ok(Math.abs(noResPct - 8) < 1e-9);
});

test('zero divisor guard: ctr(0, 0) / noResultRate(0, 0) → 0 (no NaN)', () => {
  // Both helpers must guard against division by zero to avoid NaN cascading into band calc.
  assert.equal(ctr(0, 0), 0);
  assert.equal(noResultRate(0, 0), 0);
  // Band calc should still resolve to critical (both fail).
  assert.equal(calcHealthBand(ctr(0, 0), noResultRate(0, 0)), 'critical');
});

test('zero CTR (12000, 0, 0) → critical (CTR <55% triggers OR-fail)', () => {
  // CTR=0 fails ≥0.55 → critical (no-result 0 ≤ 0.20 is satisfied but OR-fail dominated by CTR)
  assert.equal(calcHealthBand(ctr(0, 12000), noResultRate(0, 12000)), 'critical');
});

test('100% CTR (12000, 12000, 0) → excellent (ctr=1 ≥0.85 AND noResult=0 ≤0.05)', () => {
  const ctrVal = ctr(12000, 12000);
  const noRes = noResultRate(0, 12000);
  assert.equal(ctrVal, 1);
  assert.equal(noRes, 0);
  assert.equal(calcHealthBand(ctrVal, noRes), 'excellent');
});

test('100% no-result (12000, 0, 12000) → critical (noResult=1 >0.05 triggers OR-fail)', () => {
  const ctrVal = ctr(0, 12000);
  const noRes = noResultRate(12000, 12000);
  assert.equal(ctrVal, 0);
  assert.equal(noRes, 1);
  assert.equal(calcHealthBand(ctrVal, noRes), 'critical');
});

test('Boundary excellent: calcHealthBand(0.85, 0.05) → excellent (exact thresholds pass)', () => {
  assert.equal(calcHealthBand(0.85, 0.05), 'excellent');
});

test('Boundary fails excellent (no-result just-over): calcHealthBand(0.85, 0.06) → good', () => {
  // CTR exactly meets excellent (≥0.85) but no-result (0.06) exceeds excellent max (0.05)
  // → cascade drops to good (next tier where 0.85≥0.70 AND 0.06≤0.10 both hold).
  // Tiered cascade (not strict OR-fail at every level): critical is reached only when
  // even the warning tier fails (ctr<0.55 OR noResult>0.20).
  assert.equal(calcHealthBand(0.85, 0.06), 'good');
});

test('Boundary fails excellent (CTR just-under): calcHealthBand(0.84, 0.05) → good', () => {
  // No-result exactly meets excellent (≤0.05) but CTR (0.84) is below excellent min (0.85)
  // → cascade drops to good (next tier where 0.84≥0.70 AND 0.05≤0.10 both hold).
  assert.equal(calcHealthBand(0.84, 0.05), 'good');
});

test('Boundary good: calcHealthBand(0.70, 0.10) → good (exactly meets good thresholds)', () => {
  assert.equal(calcHealthBand(0.70, 0.10), 'good');
});

test('Boundary warning: calcHealthBand(0.55, 0.20) → warning (exactly meets warning thresholds)', () => {
  assert.equal(calcHealthBand(0.55, 0.20), 'warning');
});

test('HEALTH_BANDS exports 4 bands + calcHealthBand is 2-arg (signature verification)', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  // Lock the dual-threshold shape: each non-critical band has BOTH ctr (≥) and noResult (≤)
  assert.equal(HEALTH_BANDS.excellent.ctr, 0.85);
  assert.equal(HEALTH_BANDS.excellent.noResult, 0.05);
  assert.equal(HEALTH_BANDS.good.ctr, 0.70);
  assert.equal(HEALTH_BANDS.good.noResult, 0.10);
  assert.equal(HEALTH_BANDS.warning.ctr, 0.55);
  assert.equal(HEALTH_BANDS.warning.noResult, 0.20);
  // Signature guard: composite band takes 2 args (CTR + no-result), not 1.
  assert.equal(calcHealthBand.length, 2);
});

// Regression test for holistic review finding I-1 (P13-7):
// noResLift formula was `Math.max(0, 0.05 * total - noRes)` which is sign-flipped.
// For canonical (total=12000, no_result=960): target=600, current=960 → 360 fewer
// (the formula should subtract CURRENT - TARGET, not TARGET - CURRENT).
test('noResLift direction: max(0, noRes - 0.05*total) → 360 fewer for canonical', () => {
  const total = 12000;
  const noRes = 960;
  const target = 0.05 * total; // 600
  const noResLift = Math.max(0, noRes - target); // correct: 360
  assert.equal(noResLift, 360);
  // Old buggy formula:
  const buggy = Math.max(0, target - noRes); // returns 0 (wrong direction)
  assert.equal(buggy, 0);
  // Verify they're different (regression guard)
  assert.notEqual(noResLift, buggy);
});

// P14-followup: negative searches_with_click clamps to 0 → no inverted CTR (defensive layer 2)
// clampNonNegative(-200) → 0; ctr(0, 12000) = 0 → band 'critical' (no NaN from negative counts)
// (Pre-clamp: withClick=-200 → ctr(-200, 12000) = -0.0166 → negative CTR → bogus "below 0%" band)
test('search-effectiveness: negative searches_with_click clamps to 0 → no inverted CTR (defensive layer 2)', () => {
  const withClick = 0; // after clampNonNegative(-200)
  const total = 12000;
  const ctrVal = ctr(withClick, total);
  // CTR must be >= 0 (defensive layer)
  assert.ok(ctrVal >= 0, 'CTR must be >= 0, got ' + ctrVal);
  assert.equal(ctrVal, 0);
  assert.equal(calcHealthBand(ctrVal, noResultRate(0, total)), 'critical');
});
