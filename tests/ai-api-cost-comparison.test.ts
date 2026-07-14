// P15 Task 2 — AI Cost customFn defensive clamp test for ai-api-cost-comparison.
// Verifies the clampNonNegative wrapper around parseInt(...) protects against
// negative inputs in customFn's `cnn(parseInt(inputs.X)) || DEFAULT` pattern.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

test('ai-api-cost-comparison: clampNonNegative defensive layer for parseInt-in-customFn (P15)', () => {
  // customFn uses `cnn(parseInt(inputs.X))` for inputTokens/outputTokens/requestsPerDay.
  // `cnn` mirrors `clampNonNegative` — verify the helper behaves correctly so
  // any negative or NaN input leaks to 0 → DEFAULT fallback path.
  assert.equal(clampNonNegative(-100), 0, 'negative input → 0 (used as falsy, triggers DEFAULT)');
  assert.equal(clampNonNegative(-10_000_000), 0, 'large negative → 0');
  assert.equal(clampNonNegative(0), 0, 'zero stays zero');
  assert.equal(clampNonNegative(1), 1, 'positive passes through');
  assert.equal(clampNonNegative(1_000), 1_000, 'large positive passes through');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0 (prevents silent NaN leaks)');
});
