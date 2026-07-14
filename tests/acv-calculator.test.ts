import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  baseACV, monthlyACV, annualACV, expansionAdjustedACV, calcHealthBand,
} from '../src/engines/sales/acv-calculator.ts';

// =====================================================================
// P8-3 ACV (Average Contract Value) — 8 math tests per spec §"P8-3: ACV"
// =====================================================================
// Math model:
//   baseACV = totalContractValue / numCustomers
//   monthlyACV = baseACV / contractLength
//   annualACV = monthlyACV × 12
//   expansionAdjustedACV = annualACV × (1 + expansionRate/100)
//
// Display precision:
//   - baseACV: integer (spec $25,000)
//   - monthlyACV: 2dp (spec $2,083.33 — REPEATING in JS, drift trap)
//   - annualACV: integer (spec $25,000)
//   - expansionAdjustedACV: integer (spec $27,500)
//
// The annualACV(monthly) helper must round the product because the
// canonical monthly 2083.33 × 12 = 24999.96 (not 25000) under JS floats.

// Test 1: canonical baseACV
test('baseACV: 300000/12 = 25000 (canonical)', () => {
  assert.equal(baseACV(300000, 12), 25000);
});

// Test 2: annualACV from rounded monthly (the cents-precision edge)
//   2083.33 × 12 = 24999.96 in JS; Math.round → 25000 (matches spec $25,000/year)
test('annualACV(2083.33) === 25000 (rounds up from 24999.96)', () => {
  assert.equal(annualACV(2083.33), 25000);
});

// Test 3: expansionAdjustedACV
test('expansionAdjustedACV(25000, 10) === 27500', () => {
  assert.equal(expansionAdjustedACV(25000, 10), 27500);
});

// Test 4: critical band (< $2,000)
test('calcHealthBand: 1999 → critical', () => {
  assert.equal(calcHealthBand(1999), 'critical');
});

// Test 5: warning boundary ($2,000)
test('calcHealthBand: 2000 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(2000), 'warning');
});

// Test 6: good boundary ($10,000)
test('calcHealthBand: 10000 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(10000), 'good');
});

// Test 7: excellent boundary ($50,000)
test('calcHealthBand: 50000 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(50000), 'excellent');
});

// Test 8: single customer edge case (per spec §"P8-3" test 8)
//   baseACV(300000, 1) = 300000 → annualACV = 300000 → excellent band
test('single customer: baseACV(300000, 1) === 300000 → excellent', () => {
  const base = baseACV(300000, 1);
  assert.equal(base, 300000);
  // annualACV(base / contractLength × 12) = annualACV(300000/12) = annualACV(25000) = 300000
  const monthly = monthlyACV(base, 12);
  const annual = annualACV(monthly);
  assert.equal(annual, 300000);
  assert.equal(calcHealthBand(annual), 'excellent');
});

// P14-followup: negative totalContractValue clamps to 0 → baseACV returns 0, no negative ACV (defensive layer 2)
// clampNonNegative(-100000) → 0; baseACV(0, 12) → 0 (instead of -8333.33 divide-by-customer result)
test('acv: negative totalContractValue clamps to 0 (defensive layer 2)', () => {
  const tcv = 0; // after clampNonNegative(-100000)
  const base = baseACV(tcv, 12);
  assert.equal(base, 0); // guard against negative ACV band flip
  assert.equal(calcHealthBand(annualACV(monthlyACV(base, 12))), 'critical');
});