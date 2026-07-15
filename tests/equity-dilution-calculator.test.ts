import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/investment/equity-dilution-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-equity-dilution-calculator');

// Test 1: canonical — $5M pre-money, $1M investment, 10M founder shares
test('equity-dilution: canonical 5M pre / 1M inv / 10M shares', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    companyValuation: '5000000',
    investmentAmount: '1000000',
    founderShares: '10000000',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  assert.match(r[0], /83\.33%/);
  assert.match(r[0], /16\.67%/);
});

// Test 2: zero valuation
test('equity-dilution: zero pre-money → 100% founder ownership preserved', () => {
  const r = engine!.generate({
    companyValuation: '0',
    investmentAmount: '1000000',
    founderShares: '10000000',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r[0].includes('100.00') || r[0].includes('100%'));
});

// Test 3: zero investment
test('equity-dilution: zero investment → no dilution', () => {
  const r = engine!.generate({
    companyValuation: '5000000',
    investmentAmount: '0',
    founderShares: '10000000',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /0\.00%/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
// Note: pre-existing engine bug — 0/0 division produces "NaN" in some What-If lines
// (e.g. "Founder keeps NaN%") when pre-money and investment are both 0. OUT OF SCOPE
// for P16-4 (same precedent as employee-cost-calculator NaN-on-zeros in P16-3).
test('equity-dilution: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    companyValuation: '-5000000',
    investmentAmount: '-1000000',
    founderShares: '-10000000',
  });
  assert.ok(Array.isArray(r), 'engine returns an array');
  assert.ok(r.length > 0, 'engine returns at least one result line');
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-/) || []).join(','));
});
