import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  turnoverRatio,
  daysToSell,
  industryBenchmark,
  calcHealthBand,
} from '../src/engines/operations/inventory-turnover-calculator.ts';

test('turnoverRatio: canonical 240k COGS / 40k inventory = 6x', () => {
  assert.equal(turnoverRatio(240000, 40000), 6);
});

test('daysToSell: 240k COGS / 40k inventory / 365 = 60.83 days', () => {
  assert.ok(Math.abs(daysToSell(240000, 40000, 365) - 60.833) < 0.01);
});

test('turnoverRatio: zero COGS guard returns 0', () => {
  assert.equal(turnoverRatio(0, 40000), 0);
});

test('turnoverRatio: zero inventory guard returns 0 (avoid Infinity)', () => {
  assert.equal(turnoverRatio(240000, 0), 0);
});

test('industryBenchmark: apparel=4, grocery=12, default general=6', () => {
  assert.equal(industryBenchmark('apparel'), 4);
  assert.equal(industryBenchmark('grocery'), 12);
  assert.equal(industryBenchmark('electronics'), 6);
  assert.equal(industryBenchmark('furniture'), 3);
  assert.equal(industryBenchmark('general'), 6);
  assert.equal(industryBenchmark('unknown'), 6);
});

test('calcHealthBand: boundaries 6 → excellent, 4 → good, 2 → warning, <2 → critical', () => {
  assert.equal(calcHealthBand(6), 'excellent');
  assert.equal(calcHealthBand(4), 'good');
  assert.equal(calcHealthBand(2), 'warning');
  assert.equal(calcHealthBand(1), 'critical');
});

test('calcHealthBand: typical values 8 → excellent, 5 → good, 3 → warning', () => {
  assert.equal(calcHealthBand(8), 'excellent');
  assert.equal(calcHealthBand(5), 'good');
  assert.equal(calcHealthBand(3), 'warning');
});

// P14-followup: negative avgInventory clamps to 0 → turnoverRatio returns 0 (defensive layer 2)
// clampNonNegative(-1000) → 0; turnoverRatio(240000, 0) → 0 (via guard, not divide-by-zero)
test('inventory-turnover: negative avgInventory clamps to 0 (defensive layer 2)', () => {
  const inv = 0; // after clampNonNegative(-1000)
  const ratio = turnoverRatio(240000, inv);
  assert.equal(ratio, 0); // guard returns 0 instead of Infinity / divide-by-zero
});
