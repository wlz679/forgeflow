import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyPI,
  totalInterest,
  ltv,
  principalPaidByYear,
} from '../src/engines/real-estate/mortgage-calculator';

// Test 1: monthlyPI basic (400K principal, 30y, 6.5% → ~$2,528)
test('mortgage: monthlyPI basic 30y 6.5% → ~$2,528', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 360;
  const m = monthlyPI(p, r, n);
  assert.ok(Math.abs(m - 2528.27) < 1.0, `expected ~2528.27, got ${m.toFixed(2)}`);
});

// Test 2: monthlyPI zero interest
test('mortgage: monthlyPI zero interest → principal / n', () => {
  const p = 120000;
  const r = 0;
  const n = 360;
  assert.equal(monthlyPI(p, r, n), 120000 / 360);
});

// Test 3: monthlyPI zero down → principal = homePrice
test('mortgage: monthlyPI full-principal 250K 30y 7% → ~$1,663', () => {
  const p = 250000;
  const r = 7 / 100 / 12;
  const n = 360;
  const m = monthlyPI(p, r, n);
  assert.ok(m > 1660 && m < 1670, `expected ~$1,663, got ${m.toFixed(2)}`);
});

// Test 4: totalInterest basic 30y 6.5% on $400K → ~$510K
test('mortgage: totalInterest basic 30y 6.5% on $400K', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 360;
  const ti = totalInterest(p, r, n);
  assert.ok(ti > 505000 && ti < 520000, `expected ~$510K-$515K, got $${ti.toFixed(0)}`);
});

// Test 5: ltv 20% down → 80%
test('mortgage: ltv 20% down → 80%', () => {
  assert.equal(ltv(400000, 500000), 80);
});

// Test 6: principalPaidByYear year 5 (~$22K-$50K for $400K loan)
test('mortgage: principalPaidByYear year 5 ≈ low single-digit %', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 360;
  const paid = principalPaidByYear(5, p, r, n);
  assert.ok(paid > 22000 && paid < 50000, `expected $22K-$50K, got $${paid.toFixed(0)}`);
});

// Test 7: principalPaidByYear year 15 (~27% paid on 30y 6.5%)
test('mortgage: principalPaidByYear year 15 ≈ 27% of original', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const n = 360;
  const paid = principalPaidByYear(15, p, r, n);
  assert.ok(paid > 100000 && paid < 130000, `expected $100K-$130K, got $${paid.toFixed(0)}`);
});

// Test 8: 15y vs 30y — 15y payment higher but total interest lower
test('mortgage: 15y payment > 30y; 15y totalInterest < 30y', () => {
  const p = 300000;
  const r = 6 / 100 / 12;
  const m15 = monthlyPI(p, r, 180);
  const m30 = monthlyPI(p, r, 360);
  assert.ok(m15 > m30, `15y should be higher: m15=${m15.toFixed(0)} m30=${m30.toFixed(0)}`);
  const ti15 = totalInterest(p, r, 180);
  const ti30 = totalInterest(p, r, 360);
  assert.ok(ti15 < ti30, `15y totalInterest should be lower: $${ti15.toFixed(0)} vs $${ti30.toFixed(0)}`);
});

// Test 9 (edge): zero principal (down payment = home price edge case)
test('mortgage: monthlyPI zero principal → 0', () => {
  const m = monthlyPI(0, 6.5 / 100 / 12, 360);
  assert.equal(m, 0);
});

// Test 10 (edge): negative rate clamped downstream — confirm Math.max(0, ...) is upstream guard
test('mortgage: monthlyPI handles very large principal (no overflow)', () => {
  // $100M loan at 6.5% over 30 years — sanity check, should not NaN/Infinity
  const p = 100_000_000;
  const r = 6.5 / 100 / 12;
  const m = monthlyPI(p, r, 360);
  assert.ok(m > 600000 && m < 700000, `expected ~$632K/mo on $100M loan, got $${m.toFixed(0)}`);
  assert.ok(isFinite(m), 'should not be Infinity');
});

// Test 11 (edge): negative rate or n handled (callers use Math.max(0, ...))
test('mortgage: monthlyPI zero n → 0 (loan term guard)', () => {
  assert.equal(monthlyPI(100000, 0.005, 0), 0);
  assert.equal(monthlyPI(100000, 0.005, -12), 0);
});
