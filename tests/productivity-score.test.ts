import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/cost/productivity-score.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs from
// propagating to math layer. Inputs: weeklyDeepWorkHours, toolsUsed, meetingsPerWeek.
test('productivity-score: clampNonNegative returns 0 for negative inputs (defensive layer 2)', () => {
  assert.equal(clampNonNegative(-15), 0, 'negative deepWork hours clamps to 0');
  assert.equal(clampNonNegative(-5), 0, 'negative tools count clamps to 0');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
  assert.equal(clampNonNegative(15), 15, 'positive passes through unchanged');
});

test('productivity-score: engine handles negative inputs without throwing (defensive layer 2)', () => {
  const engine = getEngine('solopreneur-productivity-score');
  assert.ok(engine, 'engine should be registered');
  const result = engine!.generate({
    weeklyDeepWorkHours: '-15',
    toolsUsed: '5',
    meetingsPerWeek: '3',
  });
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'engine returns at least one result line');
});
