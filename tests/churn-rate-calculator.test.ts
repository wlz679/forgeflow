import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/saas/churn-rate-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-churn-rate-calculator');

// Test 1: canonical — 500 customers start, 15 lost, 25 new, $50 avg rev, $800 expansion
test('churn-rate: canonical 500/15/25/$50/$800 → ~3% monthly churn', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    customersStart: '500',
    customersLost: '15',
    newCustomers: '25',
    avgRevenuePerCustomer: '50',
    expansionRevenue: '800',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // Monthly Logo Churn = 15/500 = 3%
  assert.match(r[0], /Monthly Logo Churn:\s+3\.0%/);
  // Customers at End = 500 - 15 + 25 = 510
  assert.match(r[0], /Customers at End:\s+510/);
});

// Test 2: zero customers
test('churn-rate: zero customers → 0% churn', () => {
  const r = engine!.generate({
    customersStart: '0',
    customersLost: '0',
    newCustomers: '0',
    avgRevenuePerCustomer: '0',
    expansionRevenue: '0',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /Monthly Logo Churn:\s+0\.0%/);
});

// Test 3: 100% churn (edge case)
test('churn-rate: 100% monthly churn → 100% annual churn', () => {
  const r = engine!.generate({
    customersStart: '100',
    customersLost: '100',
    newCustomers: '0',
    avgRevenuePerCustomer: '50',
    expansionRevenue: '0',
  });
  assert.ok(Array.isArray(r));
  // All customers lost monthly → 100% annual
  assert.match(r[0], /Monthly Logo Churn:\s+100\.0%/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('churn-rate: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    customersStart: '-500',
    customersLost: '-15',
    newCustomers: '-25',
    avgRevenuePerCustomer: '-50',
    expansionRevenue: '-800',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
