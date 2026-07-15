import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  futureValue,
  simpleFinalValue,
  rateHealth,
  yearsToTarget,
} from '../src/engines/investment/compound-interest-calculator.ts';

// Test 1: futureValue at 0% is principal + total contributions
test('compound-interest: futureValue at 0% is principal + total contributions', () => {
  const fv = futureValue(10000, 500, 0, 'monthly', 20);
  assert.equal(fv, 10000 + 500 * 12 * 20);
});

// Test 2: futureValue with positive rate
test('compound-interest: futureValue at 7% monthly > principal + contributions', () => {
  const fv = futureValue(10000, 500, 7, 'monthly', 20);
  const noInterest = 10000 + 500 * 12 * 20;
  assert.ok(fv > noInterest, `expected FV ${fv.toFixed(0)} > no-interest sum ${noInterest}`);
});

// Test 3: simpleFinalValue
test('compound-interest: simpleFinalValue $10K + $500/mo at 5% for 10y', () => {
  const sfv = simpleFinalValue(10000, 500, 5, 10);
  assert.equal(sfv, 15000 + 500 * 12 * 10);
});

// Test 4: yearsToTarget
test('compound-interest: yearsToTarget $500K at $10K seed/$500/mo/7% monthly', () => {
  const y = yearsToTarget(500000, 10000, 500, 7, 'monthly');
  assert.ok(y > 0 && y < 50, `expected years between 0-50, got ${y}`);
});

// Test 5: rateHealth bands
test('compound-interest: rateHealth bands', () => {
  assert.equal(rateHealth(8).emoji, '🟢');
  assert.equal(rateHealth(5).emoji, '🟡');
  assert.equal(rateHealth(2).emoji, '🟠');
  assert.equal(rateHealth(0.5).emoji, '🔴');
});

// Test 6: engine.generate() exists and returns array
test('compound-interest: engine generate() returns string[]', () => {
  // Lazy import for engine registration
  const { getEngine } = require('../src/core/engines/registry.ts');
  const engine = getEngine('solopreneur-compound-interest-calculator');
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    principal: '10000',
    monthlyContribution: '500',
    annualRate: '7',
    compoundFrequency: 'monthly',
    years: '20',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('compound-interest: negative inputs clamp to 0 (defensive layer 2)', () => {
  const { getEngine } = require('../src/core/engines/registry.ts');
  const engine = getEngine('solopreneur-compound-interest-calculator');
  assert.ok(engine);
  const r = engine!.generate({
    principal: '-1000',
    monthlyContribution: '-100',
    annualRate: '-5',
    compoundFrequency: 'monthly',
    years: '-10',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  for (const line of r) {
    assert.ok(!/NaN|Infinity/.test(line), `output contains NaN/Infinity: ${line}`);
  }
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + r.join('\n').match(/-\$\d|\$-/));
});
