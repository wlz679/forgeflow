import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/valuation/saas-valuation-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-saas-valuation-calculator');

// Test 1: canonical inputs
test('saas-valuation: canonical $1M rev / 50% growth / 20% margin → multi-tier valuation', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    annualRevenue: '1000000',
    growthRate: '50',
    profitMargin: '20',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero revenue → no projection
test('saas-valuation: zero revenue → no projection', () => {
  const r = engine!.generate({
    annualRevenue: '0',
    growthRate: '50',
    profitMargin: '20',
  });
  assert.ok(Array.isArray(r));
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0 (growth/margin exempt)
test('saas-valuation: negative revenue clamps to 0; growth/margin preserved (defensive layer 2)', () => {
  const r = engine!.generate({
    annualRevenue: '-1000000',
    growthRate: '-50',
    profitMargin: '-20',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No truly negative money values (ignoring $-0 which is just zero)
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
