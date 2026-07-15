import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyPI,
  annualNOI,
  annualDebtService,
  dscr,
  maxLoanAtTargetDSCR,
  dscrHealth,
} from '../src/engines/real-estate/dscr-calculator';

// Test 1: DSCR basic — $5K/mo rent, $1.5K/mo OpEx, 5% vacancy, $400K loan @ 7.5%, 30y
//   grossRent = 5K * 12 = 60K
//   effRent = 60K * 0.95 = 57K
//   NOI = 57K - 18K (OpEx) = 39K
//   monthlyPI(400K, 0.625%, 360) ≈ $2,797
//   annualDS = 33,564
//   DSCR = 39,000 / 33,564 ≈ 1.162
test('dscr: basic 5K rent, 1.5K OpEx, 5% vac, 400K loan, 7.5%, 30y → ~1.16', () => {
  const r = dscr({
    monthlyRent: 5000,
    monthlyExpenses: 1500,
    vacancyRate: 5,
    loanAmount: 400000,
    interestRate: 7.5,
    loanTermYears: 30,
  });
  assert.ok(r > 1.0 && r < 1.3, `expected ~1.16, got ${r.toFixed(3)}`);
});

// Test 2: DSCR strong deal (>1.5)
test('dscr: strong deal DSCR > 1.5', () => {
  const r = dscr({
    monthlyRent: 8000,
    monthlyExpenses: 1000,
    vacancyRate: 0,
    loanAmount: 300000,
    interestRate: 7,
    loanTermYears: 30,
  });
  assert.ok(r > 1.5, `expected >1.5, got ${r.toFixed(3)}`);
});

// Test 3: DSCR failing (<1.0)
test('dscr: failing deal DSCR < 1.0', () => {
  const r = dscr({
    monthlyRent: 3000,
    monthlyExpenses: 1500,
    vacancyRate: 10,
    loanAmount: 600000,  // big loan, small rent
    interestRate: 8,
    loanTermYears: 30,
  });
  assert.ok(r < 1.0, `expected <1.0, got ${r.toFixed(3)}`);
});

// Test 4: annualNOI
test('dscr: annualNOI = eff rent - OpEx', () => {
  // rent 5K/mo * 12 * 0.95 = 57K; OpEx 1.5K * 12 = 18K; NOI = 39K
  const noi = annualNOI({
    monthlyRent: 5000, monthlyExpenses: 1500, vacancyRate: 5,
    loanAmount: 0, interestRate: 0, loanTermYears: 30,
  });
  assert.equal(noi, 39000);
});

// Test 5: annualDebtService = monthlyPI * 12
test('dscr: annualDebtService = monthlyPI * 12', () => {
  const ads = annualDebtService({
    loanAmount: 100000, interestRate: 6, loanTermYears: 30, monthlyRent: 0, monthlyExpenses: 0, vacancyRate: 0,
  });
  const m = monthlyPI(100000, 6 / 100 / 12, 360);
  assert.equal(ads, m * 12);
});

// Test 6: maxLoanAtTargetDSCR (binary search)
test('dscr: maxLoanAtTargetDSCR finds reasonable loan at DSCR 1.25', () => {
  // $5K rent, $1.5K OpEx, 5% vac → NOI = 39K
  // At 7.5% 30y, target DSCR 1.25
  const maxLoan = maxLoanAtTargetDSCR({
    monthlyRent: 5000,
    monthlyExpenses: 1500,
    vacancyRate: 5,
    interestRate: 7.5,
    loanTermYears: 30,
  }, 1.25);
  // Reverse verify: at this loan, DSCR should ~1.25
  const verify = dscr({
    monthlyRent: 5000,
    monthlyExpenses: 1500,
    vacancyRate: 5,
    loanAmount: maxLoan,
    interestRate: 7.5,
    loanTermYears: 30,
  });
  assert.ok(Math.abs(verify - 1.25) < 0.05,
    `expected ~1.25, got ${verify.toFixed(3)}`);
  assert.ok(maxLoan > 200000 && maxLoan < 400000,
    `expected $200K-$400K range, got $${maxLoan.toFixed(0)}`);
});

// Test 7: dscrHealth bands
test('dscr: health bands', () => {
  assert.equal(dscrHealth(1.5).emoji, '🟢');   // ≥ 1.25 qualifies
  assert.equal(dscrHealth(1.10).emoji, '🟡');  // 1.0-1.25 marginal
  assert.equal(dscrHealth(0.85).emoji, '🔴');  // < 1.0 fails
  assert.equal(dscrHealth(Infinity).emoji, '🟢');  // no debt = trivially qualifies (treated by guard)
});

// P16-4 defensive test (Layer 2): negative inputs clamp to 0
// Tests the engine.generate() flow (which applies clampNonNegative at the entry point).
// Helper functions monthlyPI/annualNOI/annualDebtService/dscr are raw math and accept
// negative inputs as-is — that's intentional, the engine is the defensive layer.
test('dscr: defensive clampNonNegative guards (P16-4 layer 2)', () => {
  require('../src/engines/real-estate/dscr-calculator');
  const { getEngine } = require('../src/core/engines/registry');
  const engine = getEngine('solopreneur-dscr-calculator');
  assert.ok(engine, 'engine should be registered');
  // Negative inputs should be clamped to 0 inside the engine
  const r = engine!.generate({
    monthlyRent: '-5000',
    monthlyExpenses: '-1500',
    loanAmount: '-400000',
    interestRate: '-7.5',
    loanTermYears: '-30',
    vacancyRate: '-5',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money');
});
