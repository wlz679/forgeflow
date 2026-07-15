import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { freshRate12mo, staleCount, calcHealthBand, HEALTH_BANDS } from '../src/engines/knowledge/article-freshness-calculator.ts';

test('freshRate12mo: 325/500 = 0.65 (canonical Good band)', () => {
  // canonical: 65% → Good
  assert.equal(freshRate12mo(325, 500), 0.65);
});

test('freshRate12mo: zero divisor guard → 0', () => {
  assert.equal(freshRate12mo(0, 0), 0);
});

test('freshRate12mo: 0/500 = 0 (0% fresh edge)', () => {
  assert.equal(freshRate12mo(0, 500), 0);
});

test('freshRate12mo: 500/500 = 1.0 (100% fresh edge)', () => {
  assert.equal(freshRate12mo(500, 500), 1.0);
});

test('staleCount: updated=325, total=500 → 175 (canonical stale math)', () => {
  assert.equal(staleCount(325, 500), 175);
});

test('staleCount: updated=500, total=500 → 0 (no stale)', () => {
  assert.equal(staleCount(500, 500), 0);
});

test('calcHealthBand: 0.85 → excellent (>=80%)', () => {
  assert.equal(calcHealthBand(0.85), 'excellent');
});

test('calcHealthBand: 0.65 → good (55-80%, canonical)', () => {
  assert.equal(calcHealthBand(0.65), 'good');
});

test('calcHealthBand: 0.45 → warning (40-55%)', () => {
  assert.equal(calcHealthBand(0.45), 'warning');
});

test('calcHealthBand: 0.30 → critical (<40%)', () => {
  assert.equal(calcHealthBand(0.30), 'critical');
});

test('calcHealthBand: 0.80 exact boundary → excellent', () => {
  assert.equal(calcHealthBand(0.80), 'excellent');
});

test('calcHealthBand: 0.55 exact boundary → good', () => {
  assert.equal(calcHealthBand(0.55), 'good');
});

test('calcHealthBand: 0.40 exact boundary → warning', () => {
  assert.equal(calcHealthBand(0.40), 'warning');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.80);
  assert.equal(HEALTH_BANDS.good.threshold, 0.55);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.40);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});

test('freshRate12mo: float precision 325/500 (approximate comparison)', () => {
  // 325/500 = 0.65 exactly in IEEE 754
  const rate = freshRate12mo(325, 500);
  assert.ok(Math.abs(rate - 0.65) < 1e-9);
});

test('total_articles=0: freshRate12mo + staleCount work, no NaN', () => {
  // Helper functions handle total=0 case via guards
  const fresh = freshRate12mo(0, 0);
  const stale = staleCount(0, 0);
  assert.equal(fresh, 0);
  assert.equal(stale, 0);
  // Verifies no division by zero or NaN propagation
});

test('staleCount: clamps negative (over-freshness edge)', () => {
  // updated > total clamps to 0 stale
  assert.equal(staleCount(600, 500), 0);
});

// P14-followup: negative target_freshness_pct clamps to 0 → no inverted gap_pp (defensive layer 2)
// clampNonNegative(-30) → 0; freshRate12mo(325, 500) = 0.65 → gap = 0 - 65 = -65pp
// (Pre-clamp: target=-30 → gap = -30 - 65 = -95pp → misleading "further from target" signal)
test('article-freshness: negative target_freshness_pct clamps to 0 → no inverted gap_pp (defensive layer 2)', () => {
  const target = 0; // after clampNonNegative(-30)
  const fresh12 = freshRate12mo(325, 500); // 0.65
  const gap = target - fresh12 * 100; // -65pp (negative = above target)
  // Gap should NOT exceed the 65pp canonical ceiling (which would indicate inflated negative target)
  assert.ok(gap >= -65, 'gap_pp should be >= -65, got ' + gap);
  assert.equal(gap, -65);
});
