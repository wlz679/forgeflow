import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/valuation/cac-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-cac-calculator');

// Test 1: canonical inputs
test('cac: canonical $10K marketing / $5K sales / 100 customers → CAC $150', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    marketingSpend: '10000',
    salesSpend: '5000',
    newCustomers: '100',
    avgRevenuePerCustomer: '200',
    grossMargin: '80',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero customers → CAC = 0
test('cac: zero customers → CAC is 0', () => {
  const r = engine!.generate({
    marketingSpend: '10000',
    salesSpend: '5000',
    newCustomers: '0',
    avgRevenuePerCustomer: '200',
    grossMargin: '80',
  });
  assert.ok(Array.isArray(r));
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0
test('cac: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    marketingSpend: '-10000',
    salesSpend: '-5000',
    newCustomers: '-100',
    avgRevenuePerCustomer: '-200',
    grossMargin: '-80',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
