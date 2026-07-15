import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/freelance/hourly-vs-fixed-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs from
// propagating to math layer. Inputs: annualIncomeGoal, billableHoursPerWeek,
// weeksOffPerYear, annualExpenses.
test('hourly-vs-fixed: clampNonNegative returns 0 for negative inputs (defensive layer 2)', () => {
  assert.equal(clampNonNegative(-100000), 0, 'negative incomeGoal clamps to 0');
  assert.equal(clampNonNegative(-40), 0, 'negative billable hours clamps to 0');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
  assert.equal(clampNonNegative(100000), 100000, 'positive passes through unchanged');
});

test('hourly-vs-fixed: engine handles negative inputs without throwing (defensive layer 2)', () => {
  const engine = getEngine('solopreneur-hourly-vs-fixed-calculator');
  assert.ok(engine, 'engine should be registered');
  const result = engine!.generate({
    annualIncomeGoal: '-100000',
    billableHoursPerWeek: '30',
    weeksOffPerYear: '4',
    annualExpenses: '5000',
  });
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'engine returns at least one result line');
});
