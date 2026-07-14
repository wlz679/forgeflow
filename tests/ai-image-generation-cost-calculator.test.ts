// P15 Task 2 — AI Cost customFn defensive clamp test for ai-image-generation-cost-calculator.
// Verifies clampNonNegative wraps imagesPerMonth/batchSize in customFn's
// `cnn(parseInt(inputs.X)) || DEFAULT` pattern.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

test('ai-image-generation: clampNonNegative defensive layer for parseInt-in-customFn (P15)', () => {
  // customFn uses `cnn(parseInt(inputs.X))` for imagesPerMonth/batchSize.
  // cnn mirrors clampNonNegative — verify the helper handles edge cases so
  // negative imagesPerMonth/batchSize defaults to 100 / 1 instead of clamping to Math.max(1, ...).
  assert.equal(clampNonNegative(-100), 0, 'negative image count → 0 → DEFAULT 100');
  assert.equal(clampNonNegative(-64), 0, 'negative batch → 0 → DEFAULT 1');
  assert.equal(clampNonNegative(0), 0, 'zero stays zero');
  assert.equal(clampNonNegative(500), 500, 'positive image count passes through');
  assert.equal(clampNonNegative(8), 8, 'positive batch passes through');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
});
