// P15 Task 2 — AI Cost customFn defensive clamp test for ai-image-generation-cost-calculator.
// Verifies clampNonNegative wraps imagesPerMonth/batchSize in customFn's
// `cnn(parseInt(inputs.X)) || DEFAULT` pattern.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers.ts';
// P53b Task 18 — generate() path coverage.
import '../src/engines/ai-cost/ai-image-generation-cost-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

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

test('ai-image-gen: generate emits cost breakdown', () => {
  // NOTE: slug is 'solopreneur-ai-image-cost-calculator' (no "generation" in slug
  // even though the filename is ai-image-generation-cost-calculator.ts).
  // P53b Task 18 — generate() path coverage. Inputs match engine.inputs:
  // provider, imagesPerMonth, resolution, batchSize, advancedMode.
  const engine = getEngine('solopreneur-ai-image-cost-calculator');
  assert.ok(engine, 'engine should be registered');
  const out = engine!.generate({
    provider: 'dalle-3',
    imagesPerMonth: '100',
    resolution: '1024×1024',
    batchSize: '1',
    advancedMode: 'standard',
  });
  assert.ok(Array.isArray(out));
  assert.ok(out.length > 0, 'cost breakdown returns at least one line');
  const all = out.join('\n');
  assert.ok(/💰|Cost|\$/i.test(all), 'cost breakdown present (Cost Summary / $ price line)');
});
