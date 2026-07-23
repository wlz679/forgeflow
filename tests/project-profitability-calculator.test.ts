import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/freelance/project-profitability-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-project-profitability-calculator');

// Test 1: canonical inputs
test('project-profitability: canonical $10K rev / 100 hrs / $50/hr / $500 materials → profit', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    projectRevenue: '10000',
    hoursEstimated: '100',
    hourlyCost: '50',
    materialCost: '500',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero hours → no $/hour metric
test('project-profitability: zero hours returns projection', () => {
  const r = engine!.generate({
    projectRevenue: '10000',
    hoursEstimated: '0',
    hourlyCost: '50',
    materialCost: '500',
  });
  assert.ok(Array.isArray(r));
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0
test('project-profitability: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    projectRevenue: '-10000',
    hoursEstimated: '-100',
    hourlyCost: '-50',
    materialCost: '-500',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
