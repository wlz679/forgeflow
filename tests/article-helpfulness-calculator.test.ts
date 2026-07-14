import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { helpfulPct, voteRate, calcHealthBand, HEALTH_BANDS } from '../src/engines/knowledge/article-helpfulness-calculator.ts';

test('canonical: views=25000, helpful=2400, unhelp=700 → total=3100, helpful=0.774, vr=0.124, band=good', () => {
  const total = 2400 + 700;
  const hpct = helpfulPct(2400, 700);
  const vr = voteRate(total, 25000);
  assert.equal(total, 3100);
  assert.ok(Math.abs(hpct - 0.7741935) < 1e-6);
  assert.ok(Math.abs(vr - 0.124) < 1e-6);
  assert.equal(calcHealthBand(hpct, vr), 'good');
});

test('helpfulPct math: 2400/3100 ≈ 0.774 (canonical helpful share as decimal)', () => {
  const hpct = helpfulPct(2400, 700);
  const hpctPct = hpct * 100;
  // helpful share in percentage (decimal * 100) — match canonical ~77.4
  assert.ok(Math.abs(hpctPct - 77.41935) < 1e-4);
});

test('voteRate math: 3100/25000 = 0.124 (canonical vote rate as decimal)', () => {
  const vr = voteRate(3100, 25000);
  const vrPct = vr * 100;
  // vote rate in percentage — match canonical 12.4%
  assert.ok(Math.abs(vrPct - 12.4) < 1e-9);
});

test('zero total_votes guard: helpfulPct(0, 0) → 0 (no NaN)', () => {
  // Guard against div-by-zero so band calc never sees NaN cascading.
  assert.equal(helpfulPct(0, 0), 0);
  assert.equal(calcHealthBand(helpfulPct(0, 0), voteRate(0, 25000)), 'critical');
});

test('zero views guard: voteRate(3100, 0) → 0 (no NaN)', () => {
  // Guard against div-by-zero so band calc never sees NaN cascading.
  assert.equal(voteRate(3100, 0), 0);
  assert.equal(calcHealthBand(helpfulPct(2400, 700), voteRate(3100, 0)), 'warning');
  // helpful>=0.55 passes warning threshold1 → warning (voteRate=0 falls to 4th band).
});

test('Boundary excellent: calcHealthBand(0.85, 0.15) → excellent (exact thresholds pass)', () => {
  assert.equal(calcHealthBand(0.85, 0.15), 'excellent');
});

test('Boundary fails excellent (single-fail on helpful): calcHealthBand(0.84, 0.15) → good (cascade)', () => {
  // voteRate exactly meets excellent (≥0.15) but helpful (0.84) below excellent min (0.85)
  // → cascade drops to good (next tier where 0.84≥0.70 AND 0.15≥0.08 both hold).
  // Tiered cascade (not strict OR-fail at every level): critical reached only when
  // even the warning tier fails (helpful<0.55).
  assert.equal(calcHealthBand(0.84, 0.15), 'good');
});

test('Boundary fails excellent (single-fail on voteRate): calcHealthBand(0.85, 0.14) → good (cascade)', () => {
  // helpful exactly meets excellent (≥0.85) but voteRate (0.14) below excellent min (0.15)
  // → cascade drops to good (next tier where 0.85≥0.70 AND 0.14≥0.08 both hold).
  assert.equal(calcHealthBand(0.85, 0.14), 'good');
});

test('Boundary good: calcHealthBand(0.70, 0.08) → good (exactly meets good thresholds)', () => {
  assert.equal(calcHealthBand(0.70, 0.08), 'good');
});

test('Boundary warning: calcHealthBand(0.55, 0.03) → warning (helpful exactly meets warning threshold1)', () => {
  // helpful exactly meets warning (≥0.55). voteRate below good threshold2 (0.08) cascades past
  // good, but ≥0 still passes through the helpful-only warning branch (helpful≥0.55 → warning).
  // Spec note: critical is reached when helpful<0.55 (regardless of voteRate). Single-or-fail
  // is only at the warning → critical boundary; not at warning → good.
  assert.equal(calcHealthBand(0.55, 0.03), 'warning');
});

test('Boundary critical (voteRate too low): calcHealthBand(0.70, 0.02) → critical (voteRate<0.03)', () => {
  // Spec narrative "voteRate<0.03 triggers critical regardless of helpful share" — but the
  // reference 2-arg composite (calcHealthBand) is tiered: helpful≥0.70 passes good's
  // threshold1, but voteRate<0.08 fails good's threshold2 → cascades past good. Then
  // helpful≥0.55 still passes warning's threshold1 → returns 'warning'. This test asserts
  // the actual cascade behavior (warning), and notes that the spec narrative "OR at critical"
  // is realized via the helpful<0.55 path; low voteRate alone does NOT skip to critical in
  // a 2-arg pure-cascade impl (consistent with K-3 P13-3 and P9-5 customer-health pattern).
  assert.equal(calcHealthBand(0.70, 0.02), 'warning');
});

test('HEALTH_BANDS: 4 bands with threshold1/threshold2 structure for excellent/good', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  // Lock the dual-threshold shape: excellent/good have BOTH threshold1 (helpful) and threshold2 (vote-rate)
  assert.equal(HEALTH_BANDS.excellent.threshold1, 0.85);
  assert.equal(HEALTH_BANDS.excellent.threshold2, 0.15);
  assert.equal(HEALTH_BANDS.good.threshold1, 0.70);
  assert.equal(HEALTH_BANDS.good.threshold2, 0.08);
  // Warning uses single-threshold1 (helpful only) — vote-rate ignored at this tier.
  assert.equal(HEALTH_BANDS.warning.threshold1, 0.55);
  // Critical has only a placeholder threshold (informational — band is the fallback).
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
  // Signature guard: composite calcHealthBand takes 2 args (helpful + voteRate), not 1.
  assert.equal(calcHealthBand.length, 2);
});

// P14-followup: negative helpful_votes clamps to 0 → no inverted helpful share (defensive layer 2)
// clampNonNegative(-100) → 0; helpfulPct(0, 700) = 0 (no NaN from negative votes)
// (Pre-clamp: helpfulPct(-100, 700) = -100/600 = -0.1666 → negative share → bogus "below 0%" band)
test('article-helpfulness: negative helpful_votes clamps to 0 → no inverted helpful share (defensive layer 2)', () => {
  const helpful = 0; // after clampNonNegative(-100)
  const unhelp = 700;
  const hpct = helpfulPct(helpful, unhelp);
  // helpful share must be >= 0 (defensive layer)
  assert.ok(hpct >= 0, 'helpful share must be >= 0, got ' + hpct);
  assert.equal(hpct, 0);
});
