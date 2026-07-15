import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/saas/market-size-estimator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-market-size-estimator');

// Test 1: canonical — 30K addressable customers, $5K/yr per customer, 12% growth
//   TAM = 30K * 5K = $150M
test('market-size: canonical 30K customers × $5K/yr → $150M TAM', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    targetMarket: 'US dental clinics',
    totalAddressableCustomers: '30000',
    annualRevenuePerCustomer: '5000',
    marketGrowthRate: '12',
    samPercent: '25',
    marketStage: 'Growing',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // TAM = 30000 * 5000 = $150M
  assert.match(r[0], /TAM.*\$150\.0M/);
});

// Test 2: zero customers
test('market-size: zero customers → $0 TAM', () => {
  const r = engine!.generate({
    targetMarket: 'test market',
    totalAddressableCustomers: '0',
    annualRevenuePerCustomer: '5000',
    marketGrowthRate: '0',
    samPercent: '25',
    marketStage: 'Growing',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /TAM.*\$0/);
});

// Test 3: zero pricing
test('market-size: zero pricing → $0 TAM', () => {
  const r = engine!.generate({
    targetMarket: 'test market',
    totalAddressableCustomers: '10000',
    annualRevenuePerCustomer: '0',
    marketGrowthRate: '0',
    samPercent: '25',
    marketStage: 'Growing',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /TAM.*\$0/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('market-size: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    targetMarket: 'test',
    totalAddressableCustomers: '-30000',
    annualRevenuePerCustomer: '-5000',
    marketGrowthRate: '-12',
    samPercent: '-25',
    marketStage: 'Growing',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
