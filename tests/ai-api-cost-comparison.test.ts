// P15 Task 2 — AI Cost customFn defensive clamp test for ai-api-cost-comparison.
// Verifies the clampNonNegative wrapper around parseInt(...) protects against
// negative inputs in customFn's `cnn(parseInt(inputs.X)) || DEFAULT` pattern.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers.ts';
// P53b Task 18 — Agent D P1 D1 follow-up: exercise actual generate() path.
import '../src/engines/ai-cost/ai-api-cost-comparison.ts';
import { getEngine } from '../src/core/engines/registry.ts';

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

test('ai-api-cost-comparison: generate emits cross-provider comparison', () => {
  // P53b Task 18 — generate() path coverage. Inputs match engine.inputs:
  // inputTokens, outputTokens, requestsPerDay, pricingMode.
  const engine = getEngine('solopreneur-ai-api-cost-comparison');
  assert.ok(engine, 'engine should be registered');
  const out = engine!.generate({
    inputTokens: '1000',
    outputTokens: '500',
    requestsPerDay: '100',
    pricingMode: 'realtime',
  });
  assert.ok(Array.isArray(out));
  assert.ok(out.length > 0, 'cross-provider comparison returns at least one line');
  const all = out.join('\n');
  // Should mention at least one provider name.
  assert.ok(/OpenAI|Claude|Gemini|DeepSeek|GPT|Anthropic|Google/i.test(all),
    'cross-provider comparison should mention at least one provider');
});
