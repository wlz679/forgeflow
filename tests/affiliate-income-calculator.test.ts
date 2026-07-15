import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/freelance/affiliate-income-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs from
// propagating to math layer. Inputs: monthlyTraffic, conversionRate,
// avgCommission, monthlyCost.
test('affiliate-income: clampNonNegative returns 0 for negative inputs (defensive layer 2)', () => {
  assert.equal(clampNonNegative(-50000), 0, 'negative traffic clamps to 0');
  assert.equal(clampNonNegative(-5), 0, 'negative rate clamps to 0');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
  assert.equal(clampNonNegative(50000), 50000, 'positive passes through unchanged');
});

test('affiliate-income: engine handles negative inputs without throwing (defensive layer 2)', () => {
  const engine = getEngine('solopreneur-affiliate-income-calculator');
  assert.ok(engine, 'engine should be registered');
  const result = engine!.generate({
    monthlyTraffic: '-50000',
    conversionRate: '3',
    avgCommission: '50',
    monthlyCost: '200',
  });
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'engine returns at least one result line');
});
