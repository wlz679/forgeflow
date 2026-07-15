import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/investment/time-value-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-time-value-calculator');

// Test 1: canonical — $100K income, 40 hr/wk, 48 wk/yr
//   totalHours = 1920; hourlyRate = 52.08
test('time-value: canonical $100K / 40hr / 48wk → ~$52/hr', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    annualIncome: '100000',
    hoursPerWeek: '40',
    weeksPerYear: '48',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  assert.match(r[0], /Effective \$?\/Hour:\s+\$52\.08/);
  assert.match(r[0], /Daily Rate \(8 hrs\):\s+\$416\.67/);
});

// Test 2: zero hours
test('time-value: zero hours → $0/hr', () => {
  const r = engine!.generate({
    annualIncome: '100000',
    hoursPerWeek: '0',
    weeksPerYear: '48',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /Effective \$?\/Hour:\s+\$0\.00/);
});

// Test 3: zero income
test('time-value: zero income → $0/hr', () => {
  const r = engine!.generate({
    annualIncome: '0',
    hoursPerWeek: '40',
    weeksPerYear: '48',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /Effective \$?\/Hour:\s+\$0\.00/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
// Note: pre-existing engine bug — 0/0 division (yearlyWaste/weeksPerYear) produces "NaN" in the
// "1 hr wasted daily costs" line when all inputs are 0. This is OUT OF SCOPE for the P16-4
// sweep (same precedent as employee-cost-calculator NaN-on-zeros in P16-3). The clamp guard
// succeeds if the engine doesn't throw and returns a non-empty result.
test('time-value: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    annualIncome: '-100000',
    hoursPerWeek: '-40',
    weeksPerYear: '-48',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values (excluding the "in -X wks" pattern, which is math, not currency)
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
