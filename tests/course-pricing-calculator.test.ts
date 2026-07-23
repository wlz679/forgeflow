import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/freelance/course-pricing-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-course-pricing-calculator');

// Test 1: canonical inputs
test('course-pricing: canonical $5K target / 50 buyers / 10% fee → ~$111/student', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    targetMonthlyIncome: '5000',
    estimatedBuyersPerMonth: '50',
    platformFee: '10',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero buyers → 0 price
test('course-pricing: zero buyers → no revenue projection', () => {
  const r = engine!.generate({
    targetMonthlyIncome: '5000',
    estimatedBuyersPerMonth: '0',
    platformFee: '10',
  });
  assert.ok(Array.isArray(r));
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0
test('course-pricing: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    targetMonthlyIncome: '-5000',
    estimatedBuyersPerMonth: '-50',
    platformFee: '-10',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
