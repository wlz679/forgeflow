import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyPI,
  annualMortgagePayment,
  effectiveAnnualRent,
  annualCashFlow,
  totalCashInvested,
  grossYield,
  netYield,
  cashOnCashReturn,
  cocHealth,
} from '../src/engines/real-estate/rental-yield-calculator';

// Test 1: grossYield basic — $300K price, $2.5K/mo rent
//   grossAnnualRent = 2500 * 12 = 30000
//   grossYield = 30000 / 300000 * 100 = 10%
test('rental-yield: grossYield basic 300K/2.5K → 10%', () => {
  const g = grossYield(300000, 2500);
  assert.ok(Math.abs(g - 10) < 0.01, `expected 10%, got ${g.toFixed(2)}%`);
});

// Test 2: cashOnCash basic — $300K price, $75K down, $225K loan @ 7%, 30y
//   monthlyPI ≈ $1,496; annual = $17,955
//   effRent @ 5% vac = 2500 * 12 * 0.95 = $28,500
//   annualCashFlow = 28500 - 17955 - 12*600 = 28500 - 17955 - 7200 = $3,345
//   closingCosts = 9000, totalCashInvested = 75000 + 9000 = $84,000
//   CoC = 3345 / 84000 * 100 ≈ 3.98%
test('rental-yield: cashOnCash basic', () => {
  const coc = cashOnCashReturn({
    purchasePrice: 300000,
    downPayment: 75000,
    loanAmount: 225000,
    interestRate: 7,
    loanTermYears: 30,
    monthlyRent: 2500,
    monthlyExpenses: 600,
    vacancyRate: 5,
  });
  // Looser tolerance for compound math
  assert.ok(coc > 3 && coc < 5, `expected ~4%, got ${coc.toFixed(2)}%`);
});

// Test 3: negative cash flow scenario
test('rental-yield: negative cash flow when mortgage > rent', () => {
  const cf = annualCashFlow({
    purchasePrice: 300000,
    downPayment: 75000,
    loanAmount: 225000,
    interestRate: 7,
    loanTermYears: 30,
    monthlyRent: 1500,  // low rent, can't cover mortgage
    monthlyExpenses: 600,
    vacancyRate: 5,
  });
  assert.ok(cf < 0, `expected negative cash flow, got $${cf.toFixed(0)}`);
});

// Test 4: all-cash purchase (loanAmount=0)
//   annualCashFlow = effRent - 0 - expenses = 28500 - 7200 = $21,300
test('rental-yield: all-cash purchase', () => {
  const cf = annualCashFlow({
    purchasePrice: 300000,
    downPayment: 300000,
    loanAmount: 0,
    interestRate: 0,
    loanTermYears: 30,
    monthlyRent: 2500,
    monthlyExpenses: 600,
    vacancyRate: 5,
  });
  assert.ok(Math.abs(cf - 21300) < 100, `expected ~$21,300, got $${cf.toFixed(0)}`);
});

// Test 5: vacancy impact — 5% vs 15% cash flow delta
test('rental-yield: vacancy impact 5% vs 15%', () => {
  const cf5 = annualCashFlow({
    purchasePrice: 300000, downPayment: 75000, loanAmount: 225000,
    interestRate: 7, loanTermYears: 30, monthlyRent: 2500, monthlyExpenses: 600, vacancyRate: 5,
  });
  const cf15 = annualCashFlow({
    purchasePrice: 300000, downPayment: 75000, loanAmount: 225000,
    interestRate: 7, loanTermYears: 30, monthlyRent: 2500, monthlyExpenses: 600, vacancyRate: 15,
  });
  // Each +10pp vacancy loses 12 * 2500 / 12 = $3K annually; 5%→15% = $3K delta
  assert.ok(cf5 - cf15 > 2500 && cf5 - cf15 < 3500,
    `expected ~$3K delta, got $${(cf5 - cf15).toFixed(0)}`);
});

// Test 6: closingCosts = 3% of purchase
test('rental-yield: closingCosts = 3% of price', () => {
  // totalCashInvested(downPayment, purchasePrice) = downPayment + 3% * price
  assert.equal(totalCashInvested(75000, 300000), 75000 + 9000);
});

// Test 7: effectiveAnnualRent with 10% vacancy
test('rental-yield: effectiveAnnualRent $2K/mo 10% vac → $21.6K', () => {
  const e = effectiveAnnualRent(2000, 10);
  assert.equal(e, 21600);
});

// Test 8: health bands
test('rental-yield: health bands', () => {
  assert.equal(cocHealth(10).emoji, '🟢');   // 8-12% 🟢
  assert.equal(cocHealth(6).emoji, '🟡');    // 4-8% 🟡 low
  assert.equal(cocHealth(14).emoji, '🟡');   // 12-15% 🟡 high
  assert.equal(cocHealth(3).emoji, '🟠');    // outside below
  assert.equal(cocHealth(20).emoji, '🟠');   // outside above
});
