import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/freelance/freelance-rate-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs from
// propagating to math layer. Inputs: annualIncome, expenses, billableHrs, profit.
test('freelance-rate: clampNonNegative returns 0 for negative inputs (defensive layer 2)', () => {
  assert.equal(clampNonNegative(-100000), 0, 'negative income clamps to 0');
  assert.equal(clampNonNegative(-1000), 0, 'negative expenses clamps to 0');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
  assert.equal(clampNonNegative(100000), 100000, 'positive passes through unchanged');
});

test('freelance-rate: engine handles negative inputs without throwing (defensive layer 2)', () => {
  const engine = getEngine('solopreneur-freelance-rate-calculator');
  assert.ok(engine, 'engine should be registered');
  const result = engine!.generate({
    annualIncome: '-100000',
    expenses: '5000',
    billableHrs: '1200',
    profit: '20000',
  });
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'engine returns at least one result line');
});
