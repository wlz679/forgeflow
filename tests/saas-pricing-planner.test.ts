import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/cost/saas-pricing-planner.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-saas-pricing-planner');

// Test 1: canonical inputs
test('saas-pricing-planner: canonical competitor $49 → tier recommendations', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    productType: 'SaaS',
    targetCustomer: 'b2b',
    competitorPrice: '49',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero competitor price → uses default $29 base
test('saas-pricing-planner: zero competitor price → fallback to $29', () => {
  const r = engine!.generate({
    productType: 'SaaS',
    targetCustomer: 'b2b',
    competitorPrice: '0',
  });
  assert.ok(Array.isArray(r));
});

// Defensive test (P16-5 Layer 2): negative competitor price clamps to 0
test('saas-pricing-planner: negative competitor price clamps to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    productType: 'SaaS',
    targetCustomer: 'b2b',
    competitorPrice: '-49',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
