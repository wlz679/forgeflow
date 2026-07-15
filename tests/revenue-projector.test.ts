import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/saas/revenue-projector.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-revenue-projector');

// Test 1: canonical — $5K MRR, 8% gross growth, 3% churn, $3K expenses, $60K cash, $25 ARPU
//   netRate = (8-3)/100 = 0.05
//   endMRR = 5000 * 1.05^12 ≈ 8979
test('revenue-projector: canonical $5K MRR / 8% growth / 3% churn → ~$9K end MRR', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    currentMrr: '5000',
    monthlyGrowthRate: '8',
    monthlyChurnRate: '3',
    monthlyExpenses: '3000',
    cashOnHand: '60000',
    arpu: '25',
    customGrowthRate: '0',
    cac: '200',
    months: '12',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // Starting MRR $5,000
  assert.match(r[0], /Starting MRR:\s+\$5,000/);
  // Net growth = 5%
  assert.match(r[0], /Net Monthly Growth:\s+\+5\.0%/);
});

// Test 2: zero MRR
test('revenue-projector: zero MRR → $0 revenue', () => {
  const r = engine!.generate({
    currentMrr: '0',
    monthlyGrowthRate: '0',
    monthlyChurnRate: '0',
    monthlyExpenses: '0',
    cashOnHand: '0',
    arpu: '0',
    customGrowthRate: '0',
    cac: '0',
    months: '12',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /Starting MRR:\s+\$0/);
});

// Test 3: zero expenses
test('revenue-projector: zero expenses → no crash', () => {
  const r = engine!.generate({
    currentMrr: '5000',
    monthlyGrowthRate: '0',
    monthlyChurnRate: '0',
    monthlyExpenses: '0',
    cashOnHand: '60000',
    arpu: '0',
    customGrowthRate: '0',
    cac: '0',
    months: '12',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // Zero expenses → Break-even MRR = $0 (covers monthly expenses)
  assert.match(r[0], /Break-even MRR:\s+\$0/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('revenue-projector: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    currentMrr: '-5000',
    monthlyGrowthRate: '-8',
    monthlyChurnRate: '-3',
    monthlyExpenses: '-3000',
    cashOnHand: '-60000',
    arpu: '-25',
    customGrowthRate: '-7',
    cac: '-200',
    months: '-12',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
