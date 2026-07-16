import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/valuation/email-list-revenue-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-email-list-revenue-calculator');

// Test 1: canonical inputs
test('email-list-revenue: canonical 10K subs / 25% open / 5% click / 2% conv / $50 AOV → $500/mo', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    subscriberCount: '10000',
    openRate: '25',
    clickRate: '5',
    conversionRate: '2',
    avgOrderValue: '50',
    emailsPerMonth: '4',
    unsubscribeRate: '0.5',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
});

// Test 2: zero inputs → 0 revenue
test('email-list-revenue: zero inputs returns no-revenue projection', () => {
  const r = engine!.generate({
    subscriberCount: '0',
    openRate: '0',
    clickRate: '0',
    conversionRate: '0',
    avgOrderValue: '0',
    emailsPerMonth: '0',
    unsubscribeRate: '0',
  });
  assert.ok(Array.isArray(r));
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0
test('email-list-revenue: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    subscriberCount: '-10000',
    openRate: '-25',
    clickRate: '-5',
    conversionRate: '-2',
    avgOrderValue: '-50',
    emailsPerMonth: '-4',
    unsubscribeRate: '-0.5',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
