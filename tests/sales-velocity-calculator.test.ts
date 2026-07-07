import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  dailyVelocity, monthlyVelocity, annualVelocity, calcHealthBand,
} from '../src/engines/sales/sales-velocity-calculator.ts';

// Test 1: canonical dailyVelocity (20 opps × $25K × 25% win / 45 days)
test('dailyVelocity: canonical 20×25000×0.25/45 ≈ $2,777.78/day', () => {
  assert.equal(dailyVelocity(20, 25000, 25, 45), 2777.78);
});

// Test 2: monthlyVelocity = dailyVelocity × 30 (literal JS float of 2777.78 * 30 = 83333.4)
//   Note: spec displays $83,333.33 (rounded to display precision from unrounded daily).
//   The literal 2777.78 input × 30 yields 83333.4 in exact JS arithmetic.
test('monthlyVelocity(2777.78) === 83333.4 (literal JS float)', () => {
  assert.equal(monthlyVelocity(2777.78), 83333.4);
});

// Test 3: annualVelocity = dailyVelocity × 365 (literal JS float of 2777.78 * 365 = 1013889.7)
test('annualVelocity(2777.78) === 1013889.7 (literal JS float)', () => {
  assert.equal(annualVelocity(2777.78), 1013889.7);
});

// Test 3b: sanity check that monthly/annual from unrounded daily matches spec display values
test('monthlyVelocity(unrounded daily 2777.7777...) ≈ 83333.33', () => {
  const unrounded = 125000 / 45; // 2777.7777...
  assert.equal(monthlyVelocity(unrounded), 83333.33);
});

test('annualVelocity(unrounded daily 2777.7777...) ≈ 1013888.89', () => {
  const unrounded = 125000 / 45;
  assert.equal(annualVelocity(unrounded), 1013888.89);
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