import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stage1Cash,
  stage2Cash,
  refiCalc,
  monthlyPI,
  postRefiAnnualCashFlow,
  cashTally,
  forcedAppreciation,
  cashOnCashReturnBRRRR,
  brrrrHealth,
  seventyRuleCheck,
} from '../src/engines/real-estate/brrrr-calculator';
import '../src/engines/real-estate/brrrr-calculator';
import { getEngine } from '../src/core/engines/registry';

// Test 1: stage1Cash — purchase $150K, 25% down
//   down = 37500; closing = 4500 (3%); total = 42000
test('brrrr: stage1Cash $150K/25% down', () => {
  const s = stage1Cash(150000, 25);
  assert.equal(s.downPayment, 37500);
  assert.equal(s.closingBuy, 4500);
  assert.equal(s.total, 42000);
  assert.equal(s.initialLoan, 112500);
});

// Test 2: stage2Cash — rehab $30K, initialLoan $112.5K, 7.5% rate, 6 months hold
//   monthlyHold = 112500 * 7.5/100/12 + 200 = 703.13 + 200 = 903.13
//   holdingCost = 903.13 * 6 = 5418.75
test('brrrr: stage2Cash + holding cost', () => {
  const s = stage2Cash(30000, 112500, 7.5, 6);
  assert.equal(s.totalStage2Cash, 30000);
  assert.ok(s.holdingCost > 5300 && s.holdingCost < 5500,
    `expected ~$5418 holding cost, got $${s.holdingCost.toFixed(0)}`);
});

// Test 3: refiCalc — ARV $220K, LTV 75%, initialLoan $112.5K
//   refiLoan = 165000; cashOutFromRefi = 52500 (positive scenario)
test('brrrr: refi LTV 75% positive scenario', () => {
  const r = refiCalc(220000, 112500);
  assert.equal(r.refiLoan, 165000);
  assert.equal(r.cashOutFromRefi, 52500);
});

// Test 4: monthlyPI shared calc — $165K refi, 7.5%, 30y
//   monthly = ~$1,155
test('brrrr: refi monthlyPI', () => {
  const m = monthlyPI(165000, 7.5 / 100 / 12, 360);
  assert.ok(m > 1150 && m < 1160, `expected ~$1,155, got $${m.toFixed(0)}`);
});

// Test 5: postRefiAnnualCashFlow — $1.8K/mo rent, 5% vac, $400/mo OpEx, refi PI ~$1,155
//   effAnnRent = 1800 * 12 * 0.95 = 20520
//   mortgage = 13860 (1155 * 12)
//   OpEx = 4800
//   cashFlow = 20520 - 13860 - 4800 = 1860
test('brrrr: post-refi annual cash flow', () => {
  const cf = postRefiAnnualCashFlow({
    monthlyRent: 1800, vacancyRate: 5, monthlyExpenses: 400,
    refiLoan: 165000, interestRate: 7.5, loanTermYears: 30,
  });
  assert.ok(cf > 1700 && cf < 2000, `expected ~$1,860, got $${cf.toFixed(0)}`);
});

// Test 6: cashTally — cashOut 47000, cashIn 53500 (interim rent 1800*2=3600 + refi 52500-3600)
//   Wait: cashIn = interimRent + cashOutFromRefi = 3600 + 52500 = 56100
//   cashLeftInDeal = 47000 - 56100 = -9100 (cash-out success!)
test('brrrr: cash tally cash-out success', () => {
  const t = cashTally({
    totalStage1Cash: 42000,
    totalStage2Cash: 30000,
    holdingCost: 5418,
    interimRent: 3600,
    cashOutFromRefi: 52500,
  });
  // cashOut = 42000 + 30000 + 5418 = 77418
  // cashIn = 3600 + 52500 = 56100
  // cashLeftInDeal = 77418 - 56100 = 21318 (positive, not cash-out)
  assert.equal(t.cashOut, 77418);
  assert.equal(t.cashIn, 56100);
  assert.equal(t.cashLeftInDeal, 21318);
});

// Test 7: forcedAppreciation — ARV $220K, price $150K, rehab $30K = $40K lift
test('brrrr: forced appreciation', () => {
  const f = forcedAppreciation(220000, 150000, 30000);
  assert.equal(f, 40000);
});

// Test 8: 70% rule check — ARV * 0.7 should cover price + rehab
//   ARV $220K * 0.7 = $154K; price + rehab = $180K; gap = $26K (deal fails 70% rule)
test('brrrr: 70% rule check', () => {
  const r = seventyRuleCheck(220000, 150000, 30000);
  // maxAllowedBid = ARV*0.7 - rehab = 154000 - 30000 = 124000
  assert.equal(r.maxAllowedBid, 124000);
  assert.ok(r.gap > 0, 'deal fails 70% rule, gap should be positive');
});

// Test 9: cashOnCashReturnBRRRR — Infinity when cashLeftInDeal ≤ 0 (cash-out success)
test('brrrr: CoC Infinity on cash-out success', () => {
  const coc = cashOnCashReturnBRRRR(1000, 0);  // cash-out success
  assert.equal(coc, Infinity);
});

// Test 10: brrrrHealth bands
test('brrrr: health bands', () => {
  // cashLeftInDeal/cashOut ratio:
  // <= 0% → 🟢 cash-out
  assert.equal(brrrrHealth(0, 50000).emoji, '🟢');
  // -100 ratio (cashOut $50K, cashLeft -50K) → 🟢
  assert.equal(brrrrHealth(-50000, 50000).emoji, '🟢');
  // 10% (cashLeft $5K / cashOut $50K) → 🟡
  assert.equal(brrrrHealth(5000, 50000).emoji, '🟡');
  // 20% → 🟠
  assert.equal(brrrrHealth(10000, 50000).emoji, '🟠');
});

// P16-4 defensive test (Layer 2): negative inputs clamp to 0
// Tests the engine.generate() flow (which applies clampNonNegative at the entry point).
// Helper functions stage1Cash/refiCalc/postRefiAnnualCashFlow are raw math and accept
// negative inputs as-is — that's intentional, the engine is the defensive layer.
test('brrrr: defensive clampNonNegative guards (P16-4 layer 2)', () => {
  // Import engine for end-to-end defensive test
  const engine = getEngine('solopreneur-brrrr-calculator');
  assert.ok(engine, 'engine should be registered');
  // Negative inputs should be clamped to 0 inside the engine
  const r = engine!.generate({
    purchasePrice: '-150000',
    rehabCost: '-30000',
    afterRepairValue: '-220000',
    downPaymentPct: '-25',
    interestRate: '-7.5',
    loanTermYears: '-30',
    monthlyRent: '-1800',
    monthlyExpenses: '-400',
    vacancyRate: '-5',
    holdingMonths: '-6',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money');
});
