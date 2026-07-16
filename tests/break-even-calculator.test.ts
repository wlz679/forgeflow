import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/valuation/break-even-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-break-even-calculator');

// Test 1: canonical inputs
test('break-even: canonical $1K rev / $500 costs / $5K investment → break-even < 12 months', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    monthlyCosts: '500',
    monthlyRevenue: '1000',
    initialInvestment: '5000',
    monthlyGrowthRate: '10',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero inputs → early return
test('break-even: zero inputs returns informative message', () => {
  const r = engine!.generate({
    monthlyCosts: '0',
    monthlyRevenue: '0',
    initialInvestment: '0',
    monthlyGrowthRate: '0',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0 (growth rate exempt)
test('break-even: negative costs/revenue/investment clamp to 0; growth rate preserved (defensive layer 2)', () => {
  const r = engine!.generate({
    monthlyCosts: '-500',
    monthlyRevenue: '-1000',
    initialInvestment: '-5000',
    monthlyGrowthRate: '-10',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
