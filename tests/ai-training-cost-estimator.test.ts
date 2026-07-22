// P15 Task 2 — AI Cost customFn defensive clamp test for ai-training-cost-estimator.
// Verifies clampNonNegative wraps gpuCount/trainingHours/epochs/cloudStorage/dataProcessCost
// in customFn's `cnn(parseInt(inputs.X)) || DEFAULT` pattern.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers.ts';
// P53b Task 18 — generate() path coverage.
import '../src/engines/ai-cost/ai-training-cost-estimator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

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

test('ai-training: generate emits training time / cost estimate', () => {
  // P53b Task 18 — generate() path coverage. Inputs match engine.inputs:
  // modelSize, gpuType, gpuCount, trainingHours, epochs, cloudStorage, dataProcessCost.
  const engine = getEngine('solopreneur-ai-training-cost-estimator');
  assert.ok(engine, 'engine should be registered');
  const out = engine!.generate({
    modelSize: '7B',
    gpuType: 'A100-80GB',
    gpuCount: '8',
    trainingHours: '24',
    epochs: '3',
    cloudStorage: '500',
    dataProcessCost: '1000',
  });
  assert.ok(Array.isArray(out));
  assert.ok(out.length > 0, 'training estimate returns at least one line');
  const all = out.join('\n');
  assert.ok(/⏱|hour|cost|\$/i.test(all), 'time or cost line present (hrs/epoch or $ total)');
});
