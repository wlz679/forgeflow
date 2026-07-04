import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  effectiveGrossIncome,
  noi,
  capRate,
  cashOnCashAllCash,
  impliedValue,
  capRateHealth,
} from '../src/engines/real-estate/cap-rate-calculator';

// Test 1: capRate basic — $500K value, $36K rent, $12K expenses, 5% vacancy
//   effGI = 36000 * 0.95 = 34200
//   NOI   = 34200 - 12000 = 22200
//   cap   = 22200/500000 * 100 = 4.44%
test('cap-rate: basic 500K/36K/12K/5% vacancy → ~4.44%', () => {
  const cap = capRate({ propertyValue: 500000, annualRentIncome: 36000, annualExpenses: 12000, vacancyRate: 5 });
  assert.ok(cap > 4.4 && cap < 4.5, `expected ~4.44%, got ${cap.toFixed(2)}%`);
});

// Test 2: cashOnCashAllCash — same numbers, all-cash purchase
//   Same NOI / value = 4.44% (in all-cash scenario)
test('cap-rate: all-cash return', () => {
  const coc = cashOnCashAllCash({ propertyValue: 500000, annualRentIncome: 36000, annualExpenses: 12000, vacancyRate: 5 });
  assert.ok(coc > 4.4 && coc < 4.5, `expected ~4.44%, got ${coc.toFixed(2)}%`);
});

// Test 3: zero vacancy — effGI = annualRentIncome (no adjustment)
test('cap-rate: effectiveGrossIncome zero vacancy', () => {
  assert.equal(effectiveGrossIncome(36000, 0), 36000);
});

// Test 4: full vacancy (100%) — effGI = 0
test('cap-rate: effectiveGrossIncome 100% vacancy → 0', () => {
  assert.equal(effectiveGrossIncome(36000, 100), 0);
});

// Test 5: impliedValue reverse — at target 7% cap, NOI 22.2K → value ~$317K
//   value = NOI / (capRate/100) = 22200 / 0.07 = 317142
test('cap-rate: impliedValue reverse at 7% target', () => {
  const v = impliedValue(22200, 7);
  assert.ok(v > 315000 && v < 320000, `expected ~$317K, got $${v.toFixed(0)}`);
});

// Test 6: health bands
test('cap-rate: health bands', () => {
  // 7% → residential mid-range → 🟢
  assert.match(capRateHealth(7).label, /typical/i);
  assert.equal(capRateHealth(7).emoji, '🟢');
  // 3.5% → low HCOL → 🟡
  assert.match(capRateHealth(3.5).label, /low|coastal/i);
  assert.equal(capRateHealth(3.5).emoji, '🟡');
  // 10% → high distressed → 🟡 (still in 9-12% range)
  assert.equal(capRateHealth(10).emoji, '🟡');
  // 13% → outside → 🟠
  assert.equal(capRateHealth(13).emoji, '🟠');
  // 2.5% → outside below 🟡's 3-5% band → 🟠
  assert.equal(capRateHealth(2.5).emoji, '🟠');
});
