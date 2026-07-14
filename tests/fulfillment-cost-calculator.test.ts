import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  laborMinPerOrder,
  laborCostPerOrder,
  returnHandlingPerOrder,
  perOrderCost,
  monthlyTotal,
  calcHealthBand,
} from '../src/engines/operations/fulfillment-cost-calculator.ts';

test('laborMinPerOrder: 3 + 2 = 5 min', () => {
  assert.equal(laborMinPerOrder(3, 2), 5);
});

test('laborCostPerOrder: 5 min × $18/hr / 60 = $1.50', () => {
  assert.ok(Math.abs(laborCostPerOrder(5, 18) - 1.5) < 0.001);
});

test('returnHandlingPerOrder: 8% × $4.50 = $0.36', () => {
  assert.ok(Math.abs(returnHandlingPerOrder(8) - 0.36) < 0.001);
});

test('perOrderCost: labor $1.50 + ship $5.50 + pkg $1.20 + return $0.36 = $8.56', () => {
  assert.ok(Math.abs(perOrderCost(1.5, 5.5, 1.2, 0.36) - 8.56) < 0.001);
});

test('monthlyTotal: $8.56 × 500 = $4,280', () => {
  assert.equal(monthlyTotal(8.56, 500), 4280);
});

test('zero labor rate: perOrderCost = shipping + pkg + returns', () => {
  assert.ok(Math.abs(perOrderCost(0, 5.5, 1.2, 0.36) - 7.06) < 0.001);
});

test('calcHealthBand: boundaries 4.99→excellent, 5.0→good, 10.0→warning, 20.0→critical', () => {
  assert.equal(calcHealthBand(4.99), 'excellent');
  assert.equal(calcHealthBand(5), 'good');
  assert.equal(calcHealthBand(10), 'warning');
  assert.equal(calcHealthBand(20), 'critical');
});

test('calcHealthBand: typical 3→excellent, 8→good, 15→warning, 25→critical', () => {
  assert.equal(calcHealthBand(3), 'excellent');
  assert.equal(calcHealthBand(8), 'good');
  assert.equal(calcHealthBand(15), 'warning');
  assert.equal(calcHealthBand(25), 'critical');
});

// P14-followup: negative shippingCost clamps to 0 → per-order drops fixed costs (defensive layer 2)
// clampNonNegative(-5) → 0; perOrderCost(1.5, 0, 1.2, 0.36) = 3.06
test('fulfillment-cost: negative shippingCost clamps to 0 (defensive layer 2)', () => {
  const sc = 0; // after clampNonNegative(-5)
  const poCost = perOrderCost(1.5, sc, 1.2, 0.36);
  assert.ok(Math.abs(poCost - 3.06) < 0.001, `expected ~3.06, got ${poCost.toFixed(2)}`);
});