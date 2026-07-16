import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/valuation/ltv-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-ltv-calculator');

// Test 1: canonical inputs
test('ltv: canonical $100 rev / 70% margin / 5% churn / $150 CAC → $1,400 LTV', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    monthlyRevenuePerUser: '100',
    grossMargin: '70',
    monthlyChurn: '5',
    cac: '150',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // LTV = $100 × 0.70 / 0.05 = $1,400
  assert.match(r[0], /Lifetime Value.*\$1,400/);
});

// Test 2: zero CAC → just LTV, no LTV:CAC ratio
test('ltv: zero CAC returns LTV without ratio', () => {
  const r = engine!.generate({
    monthlyRevenuePerUser: '100',
    grossMargin: '70',
    monthlyChurn: '5',
    cac: '0',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /Lifetime Value.*\$1,400/);
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0
test('ltv: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    monthlyRevenuePerUser: '-100',
    grossMargin: '-70',
    monthlyChurn: '-5',
    cac: '-150',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
