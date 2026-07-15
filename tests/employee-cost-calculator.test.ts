import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/cost/employee-cost-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs from
// propagating to math layer. The clampNonNegative helper itself must produce
// non-negative output for any negative or NaN input.
test('employee-cost: clampNonNegative returns 0 for negative annualSalary (defensive layer 2)', () => {
  assert.equal(clampNonNegative(-80000), 0, 'negative salary clamps to 0');
  assert.equal(clampNonNegative(-1), 0, 'small negative clamps to 0');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
  assert.equal(clampNonNegative(80000), 80000, 'positive passes through unchanged');
});

test('employee-cost: engine handles negative annualSalary without throwing (defensive layer 2)', () => {
  const engine = getEngine('solopreneur-employee-cost-calculator');
  assert.ok(engine, 'engine should be registered');
  // generate() with negative inputs — clampNonNegative in calculate()/customFn
  // ensures the math layer sees non-negative values and produces a string[].
  const result = engine!.generate({
    annualSalary: '-80000',
    benefitsPercentage: '30',
    location: 'us',
  });
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'engine returns at least one result line');
});
