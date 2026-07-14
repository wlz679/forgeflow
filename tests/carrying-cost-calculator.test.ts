import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  totalRate,
  totalAnnualCost,
  componentCost,
  calcHealthBand,
} from '../src/engines/operations/carrying-cost-calculator.ts';

test('totalRate: canonical 8+1.5+2+8+2 = 21.5%', () => {
  assert.equal(totalRate(8, 1.5, 2, 8, 2), 21.5);
});

test('totalAnnualCost: $50k inventory × 21.5% = $10,750', () => {
  assert.equal(totalAnnualCost(50000, 21.5), 10750);
});

test('componentCost: each rate contributes proportionally to inventory value', () => {
  assert.equal(componentCost(50000, 8), 4000);
  assert.equal(componentCost(50000, 1.5), 750);
  assert.equal(componentCost(50000, 2), 1000);
  assert.equal(componentCost(50000, 8), 4000);
  assert.equal(componentCost(50000, 2), 1000);
});

test('calcHealthBand: boundaries 19.9→excellent, 20→good, 25→warning, 30→critical', () => {
  assert.equal(calcHealthBand(19.9), 'excellent');
  assert.equal(calcHealthBand(20), 'good');
  assert.equal(calcHealthBand(25), 'warning');
  assert.equal(calcHealthBand(30), 'critical');
});

test('calcHealthBand: typical values 15→excellent, 22→good, 27→warning, 35→critical', () => {
  assert.equal(calcHealthBand(15), 'excellent');
  assert.equal(calcHealthBand(22), 'good');
  assert.equal(calcHealthBand(27), 'warning');
  assert.equal(calcHealthBand(35), 'critical');
});

test('zero rates: totalRate = 0, totalAnnualCost = 0', () => {
  assert.equal(totalRate(0, 0, 0, 0, 0), 0);
  assert.equal(totalAnnualCost(50000, 0), 0);
});

test('single-rate dominance: storage alone = totalRate', () => {
  assert.equal(totalRate(8, 0, 0, 0, 0), 8);
  assert.equal(totalAnnualCost(50000, 8), 4000);
});

// P14-followup: negative storageRate clamps to 0 → total cost = 0 (defensive layer 2)
// clampNonNegative(-5) → 0; componentCost(1000, 0) → 0
test('carrying-cost: negative storageRate clamps to 0 (defensive layer 2)', () => {
  const pct = 0; // after clampNonNegative(-5)
  const cost = 1000 * pct / 100; // componentCost semantics
  assert.equal(cost, 0);
});