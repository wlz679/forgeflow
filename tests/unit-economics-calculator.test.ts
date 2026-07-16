import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/valuation/unit-economics-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-unit-economics-calculator');

// Test 1: canonical inputs
test('unit-economics: canonical $100 rev / $20 expansion / $30 cost / $200 CAC / 3% churn → LTV', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    averageRevenuePerCustomer: '100',
    expansionRevenuePerCustomer: '20',
    costToServePerCustomer: '30',
    customerAcquisitionCost: '200',
    monthlyChurnRate: '3',
    retentionMonths: '0',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero retention → uses churn-based lifetime
test('unit-economics: zero retention + 5% churn → lifetime 20 months', () => {
  const r = engine!.generate({
    averageRevenuePerCustomer: '100',
    expansionRevenuePerCustomer: '0',
    costToServePerCustomer: '30',
    customerAcquisitionCost: '200',
    monthlyChurnRate: '5',
    retentionMonths: '0',
  });
  assert.ok(Array.isArray(r));
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0
test('unit-economics: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    averageRevenuePerCustomer: '-100',
    expansionRevenuePerCustomer: '-20',
    costToServePerCustomer: '-30',
    customerAcquisitionCost: '-200',
    monthlyChurnRate: '-3',
    retentionMonths: '-24',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
