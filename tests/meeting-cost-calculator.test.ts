import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/cost/meeting-cost-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
import { clampNonNegative } from '../src/core/engines/helpers.ts';

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs from
// propagating to math layer. Inputs that go through clamp: attendees,
// avgHourlyRate, meetingMinutes, meetingsPerWeek.
test('meeting-cost: clampNonNegative returns 0 for negative inputs (defensive layer 2)', () => {
  assert.equal(clampNonNegative(-10), 0, 'negative attendees clamps to 0');
  assert.equal(clampNonNegative(-75), 0, 'negative rate clamps to 0');
  assert.equal(clampNonNegative(NaN), 0, 'NaN guard → 0');
  assert.equal(clampNonNegative(75), 75, 'positive passes through unchanged');
});

test('meeting-cost: engine handles negative inputs without throwing (defensive layer 2)', () => {
  const engine = getEngine('solopreneur-meeting-cost-calculator');
  assert.ok(engine, 'engine should be registered');
  const result = engine!.generate({
    attendees: '-6',
    avgHourlyRate: '-75',
    meetingMinutes: '30',
    meetingsPerWeek: '1',
  });
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0, 'engine returns at least one result line');
});
