import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  attainmentPct, expectedAtPace, gap, requiredPerMonth,
  projectedYearEnd, onTrack, calcHealthBand,
} from '../src/engines/sales/quota-attainment-calculator.ts';

// =====================================================================
// P8-5 Quota Attainment — 9 math tests per spec §"P8-5: Quota Attainment"
// =====================================================================
// Math model:
//   attainmentPct      = (actualRevenue / annualQuota) * 100
//   expectedAtPace     = annualQuota * (monthsElapsed / 12)
//   gap                = annualQuota - actualRevenue
//   remainingMonths    = 12 - monthsElapsed
//   requiredPerMonth   = (remainingMonths > 0) ? gap / remainingMonths : 0
//   projectedYearEnd   = actualRevenue + gap  // = annualQuota when remainingMonths > 0
//   onTrack            = projectedYearEnd >= annualQuota
//
// Health bands by attainmentPct:
//   🟢 ≥ 100% — excellent
//   🟡 80%–100% — good
//   🟠 50%–80% — warning
//   🔴 < 50% — critical

// Test 1: canonical attainmentPct
test('attainmentPct(400000, 1000000) === 40 (canonical)', () => {
  assert.equal(attainmentPct(400000, 1000000), 40);
});

// Test 2: expectedAtPace canonical
test('expectedAtPace(1000000, 6) === 500000 (canonical)', () => {
  assert.equal(expectedAtPace(1000000, 6), 500000);
});

// Test 3: requiredPerMonth canonical (gap=600000, remainingMonths=6)
test('requiredPerMonth(600000, 6) === 100000 (canonical)', () => {
  assert.equal(requiredPerMonth(600000, 6), 100000);
});

// Test 4: projectedYearEnd = actualRevenue + gap = annualQuota when remainingMonths > 0
test('projectedYearEnd(400000, 600000) === 1000000 (canonical)', () => {
  assert.equal(projectedYearEnd(400000, 600000), 1000000);
});

// Test 5: onTrack = projectedYearEnd >= annualQuota (boundary true)
test('onTrack(1000000, 1000000) === true (canonical, just barely)', () => {
  assert.equal(onTrack(1000000, 1000000), true);
});

// Test 6: critical band (49.9%)
test('calcHealthBand: 49 → critical (exact boundary)', () => {
  assert.equal(calcHealthBand(49), 'critical');
});

// Test 7: warning band boundary (50%)
test('calcHealthBand: 50 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(50), 'warning');
});

// Test 8: good band boundary (80%)
test('calcHealthBand: 80 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(80), 'good');
});

// Test 9: excellent band boundary (100%)
test('calcHealthBand: 100 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(100), 'excellent');
});
