// P15 Task 2 — AI Cost customFn defensive clamp test for gpu-cloud-cost-calculator.
// Verifies clampNonNegative wraps gpuCount/hoursPerDay in customFn's
// `cnn(parseInt(inputs.X)) || DEFAULT` pattern.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

test('gpu-cloud: clampNonNegative defensive layer for parseInt-in-customFn (P15)', () => {
  // customFn uses `cnn(parseInt(inputs.X))` for gpuCount/hoursPerDay.
  // cnn mirrors clampNonNegative — verify the helper handles edge cases so
  // negative gpuCount defaults to 1 and negative hoursPerDay defaults to 8
  // (instead of clamping to MIN Math.max(1)/Math.max(0.5)).
  assert.equal(clampNonNegative(-100), 0, 'negative gpuCount → 0 → DEFAULT 1');
  assert.equal(clampNonNegative(-24), 0, 'negative hoursPerDay → 0 → DEFAULT 8');
  assert.equal(clampNonNegative(0), 0, 'zero stays zero');
  assert.equal(clampNonNegative(8), 8, 'positive gpuCount passes through');
  assert.equal(clampNonNegative(24), 24, 'positive hoursPerDay passes through');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
});
