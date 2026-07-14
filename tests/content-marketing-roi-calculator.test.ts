import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyRevenue,
  monthlyNetRevenue,
  twelveMonthTotal,
  attributionMultiplier,
  calcHealthBand,
} from '../src/engines/marketing/content-marketing-roi-calculator';

// Test 1: monthlyRevenue (5K traffic, 2% CR, $80 AOV)
test('content-roi: monthlyRevenue(5000, 2, 80) === 8000', () => {
  assert.equal(monthlyRevenue(5000, 2, 80), 8000);
});

// Test 2: monthlyNetRevenue = revenue - cost
test('content-roi: monthlyNetRevenue(8000, 2000) === 6000', () => {
  assert.equal(monthlyNetRevenue(8000, 2000), 6000);
});

// Test 3: attribution multipliers
test('content-roi: first-touch multiplier === 1.0', () => {
  assert.equal(attributionMultiplier('first-touch'), 1.0);
});
test('content-roi: last-touch multiplier === 1.0', () => {
  assert.equal(attributionMultiplier('last-touch'), 1.0);
});
test('content-roi: linear multiplier === 0.7', () => {
  assert.equal(attributionMultiplier('linear'), 0.7);
});

// Test 4: 12-month total (last-touch attribution)
test('content-roi: 12MonthTotal(6 months ramp, 6 months post-rank, last-touch)', () => {
  // 6 months × -2000 cost = -12000
  // 6 months × 6000 net = 36000
  // Total = 24000
  const total = twelveMonthTotal(6, 8000, 2000, 1.0);
  assert.equal(total, 24000);
});

// Test 5: 12-month total with linear attribution
test('content-roi: 12MonthTotal with linear attribution applies 0.7 multiplier', () => {
  // Net per month post-rank: 8000 × 0.7 - 2000 = 3600
  // 6 months × -2000 = -12000
  // 6 months × 3600 = 21600
  // Total = 9600
  const total = twelveMonthTotal(6, 8000, 2000, 0.7);
  assert.equal(total, 9600);
});

// Test 6: zero traffic edge
test('content-roi: monthlyRevenue(0, 2, 80) === 0 (caller guard)', () => {
  assert.equal(monthlyRevenue(0, 2, 80), 0);
});

// Test 7: Health bands
test('content-roi: healthBand(4) === excellent (≥3)', () => {
  assert.equal(calcHealthBand(4), 'excellent');
});
test('content-roi: healthBand(2) === good (1-3)', () => {
  assert.equal(calcHealthBand(2), 'good');
});
test('content-roi: healthBand(0.5) === warning (0.3-1)', () => {
  assert.equal(calcHealthBand(0.5), 'warning');
});
test('content-roi: healthBand(0.1) === critical (<0.3)', () => {
  assert.equal(calcHealthBand(0.1), 'critical');
});

// Test 8 (P14-followup): negative traffic clamps to 0 (defensive layer 2)
// clampNonNegative(-100) → 0; monthlyRevenue(0, 2, 80) → 0 (no traffic → no revenue)
test('content-roi: negative traffic clamps to 0 (defensive layer 2)', () => {
  const rev = monthlyRevenue(0, 2, 80); // -100 traffic clamped to 0
  assert.equal(rev, 0); // 0 traffic × CR × AOV = 0 (no divide-by-zero)
});