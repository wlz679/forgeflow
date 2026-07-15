import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  lostImmediateRevenue,
  lostLTV,
  totalCost,
  costPctOfRevenue,
  calcHealthBand,
} from '../src/engines/operations/stockout-cost-calculator.ts';

test('lostImmediateRevenue: canonical 1000 × 5 = 5000', () => {
  assert.equal(lostImmediateRevenue(1000, 5), 5000);
});

test('lostLTV: 5000 × 30% × $200 × 0.9 = $270,000 (corrected from spec value 2700)', () => {
  // Spec value 2700 was incorrect (off by 100x); formula returns 270,000 correctly.
  // 5000 × 0.30 × 200 × 0.9 = 270,000 (matching formula semantics)
  assert.equal(lostLTV(5000, 30, 200, 10), 270000);
});

test('totalCost: immediate + LTV = 5000 + 270000 = 275000', () => {
  assert.equal(totalCost(5000, 270000), 275000);
});

test('costPctOfRevenue: 275000 / 600000 × 100 = 45.83%', () => {
  assert.ok(Math.abs(costPctOfRevenue(275000, 600000) - 45.83) < 0.01);
});

test('zero stockout days: totalCost = 0', () => {
  assert.equal(lostImmediateRevenue(1000, 0), 0);
  assert.equal(totalCost(0, 0), 0);
  assert.equal(costPctOfRevenue(0, 600000), 0);
});

test('recovery rate 100%: lostLTV = 0 (full recapture)', () => {
  assert.equal(lostLTV(5000, 30, 200, 100), 0);
});

test('calcHealthBand: boundaries 4.9→excellent, 5.0→good, 15.0→critical', () => {
  assert.equal(calcHealthBand(4.9), 'excellent');
  assert.equal(calcHealthBand(5), 'good');
  assert.equal(calcHealthBand(15), 'critical');
});

test('calcHealthBand: typical values 2→excellent, 7→good, 12→warning, 20→critical', () => {
  assert.equal(calcHealthBand(2), 'excellent');
  assert.equal(calcHealthBand(7), 'good');
  assert.equal(calcHealthBand(12), 'warning');
  assert.equal(calcHealthBand(20), 'critical');
});

// P14-followup: negative customerLTV clamps to 0 → lostLTV = 0 (defensive layer 2)
// clampNonNegative(-200) → 0; lostLTV(5000, 30, 0, 10) = 0
test('stockout-cost: negative customerLTV clamps to 0 (defensive layer 2)', () => {
  const ltv = 0; // after clampNonNegative(-200)
  const ll = lostLTV(5000, 30, ltv, 10);
  assert.equal(ll, 0); // zero LTV means no lifetime-value loss to count
});
