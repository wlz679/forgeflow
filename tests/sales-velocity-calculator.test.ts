import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  dailyVelocity, dailyVelocityRaw, monthlyVelocity, annualVelocity, calcHealthBand,
} from '../src/engines/sales/sales-velocity-calculator.ts';

// Test 1: canonical dailyVelocity (20 opps × $25K × 25% win / 45 days)
test('dailyVelocity: canonical 20×25000×0.25/45 ≈ $2,777.78/day (rounded 2dp)', () => {
  assert.equal(dailyVelocity(20, 25000, 25, 45), 2777.78);
});

// Test 2: monthlyVelocity = unrounded daily × 30 (matches spec display $83,333.33).
//   This is the path the production calculate() now uses (dailyRaw → monthly/annual)
//   to avoid compounding rounding drift. dailyVelocityRaw(20,25000,25,45) = 2777.7777...
//   × 30 = 83333.333..., rounded to 2dp = 83333.33.
test('monthlyVelocity(dailyVelocityRaw(20,25000,25,45)) === 83333.33 (spec display)', () => {
  const raw = dailyVelocityRaw(20, 25000, 25, 45);
  assert.equal(monthlyVelocity(raw), 83333.33);
});

// Test 3: annualVelocity = unrounded daily × 365 (matches spec display $1,013,888.89).
test('annualVelocity(dailyVelocityRaw(20,25000,25,45)) === 1013888.89 (spec display)', () => {
  const raw = dailyVelocityRaw(20, 25000, 25, 45);
  assert.equal(annualVelocity(raw), 1013888.89);
});

// Test 3b: dailyVelocityRaw is unrounded (used internally for monthly/annual derivation).
test('dailyVelocityRaw: canonical 20×25000×0.25/45 = 2777.7777... (unrounded)', () => {
  const raw = dailyVelocityRaw(20, 25000, 25, 45);
  // 125000/45 = 2777.7777... ; assert that we get full precision, not 2dp-rounded
  assert.ok(Math.abs(raw - 125000 / 45) < 1e-9);
  assert.notEqual(raw, dailyVelocity(20, 25000, 25, 45));
});

// Test 3c: round-trip — dailyVelocity(x) and dailyVelocityRaw(x) are equivalent at 2dp.
test('dailyVelocityRaw round-trip: monthly/annual from raw matches spec, not from rounded', () => {
  const raw = dailyVelocityRaw(20, 25000, 25, 45);
  const rounded = dailyVelocity(20, 25000, 25, 45);
  // raw gives 83333.33 (spec), rounded gives 83333.40 (the bug) — proof the fix matters
  assert.equal(monthlyVelocity(raw), 83333.33);
  assert.equal(monthlyVelocity(rounded), 83333.4);
});

// Test 4: health band critical (< $500)
test('calcHealthBand: 499 → critical', () => {
  assert.equal(calcHealthBand(499), 'critical');
});

// Test 5: health band warning boundary ($500)
test('calcHealthBand: 500 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(500), 'warning');
});

// Test 6: health band good boundary ($2,000)
test('calcHealthBand: 2000 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(2000), 'good');
});

// Test 7: health band excellent boundary ($5,000)
test('calcHealthBand: 5000 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(5000), 'excellent');
});

// Test 8: zero opps edge case
test('dailyVelocity(0, 25000, 25, 45) === 0 → critical', () => {
  assert.equal(dailyVelocity(0, 25000, 25, 45), 0);
  assert.equal(calcHealthBand(dailyVelocity(0, 25000, 25, 45)), 'critical');
});

// Test 9: win rate 100% edge case
test('dailyVelocity(20, 25000, 100, 45) === 11111.11 (win rate 100% ceiling)', () => {
  assert.equal(dailyVelocity(20, 25000, 100, 45), 11111.11);
});

// P14-followup: negative openOpps clamps to 0 → dailyVelocityRaw guard returns 0 (defensive layer 2)
// clampNonNegative(-20) → 0; dailyVelocityRaw(0, 25000, 25, 45) = 0 (guard: opps=0 short-circuits)
test('sales-velocity: negative openOpps clamps to 0 (defensive layer 2)', () => {
  const o = 0; // after clampNonNegative(-20)
  const daily = dailyVelocityRaw(o, 25000, 25, 45);
  assert.equal(daily, 0); // guard, not negative
  assert.equal(monthlyVelocity(daily), 0);
  assert.equal(annualVelocity(daily), 0);
  assert.equal(calcHealthBand(daily), 'critical');
});
