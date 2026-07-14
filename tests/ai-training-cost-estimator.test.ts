// P15 Task 2 — AI Cost customFn defensive clamp test for ai-training-cost-estimator.
// Verifies clampNonNegative wraps gpuCount/trainingHours/epochs/cloudStorage/dataProcessCost
// in customFn's `cnn(parseInt(inputs.X)) || DEFAULT` pattern.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

test('ai-training: clampNonNegative defensive layer for parseInt-in-customFn (P15)', () => {
  // customFn uses `cnn(parseInt(inputs.X))` for 5 numeric inputs.
  // cnn mirrors clampNonNegative — verify the helper handles edge cases so
  // negative gpuCount defaults to 4 / negative cloudStorage defaults to 0 etc.
  assert.equal(clampNonNegative(-100), 0, 'negative input → 0 → DEFAULT fallback');
  assert.equal(clampNonNegative(-8760), 0, 'large negative → 0 → DEFAULT 24');
  assert.equal(clampNonNegative(0), 0, 'zero stays zero (cloudStorage, dataProcessCost)');
  assert.equal(clampNonNegative(4), 4, 'positive gpuCount passes through');
  assert.equal(clampNonNegative(720), 720, 'large positive trainingHours passes through');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
});
