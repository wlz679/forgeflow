import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import '../src/engines/investment/freelance-tax-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';

const engine = getEngine('solopreneur-freelance-tax-calculator');

// Test 1: canonical — $100K income, $15K expenses, $10K retirement, single, US
test('freelance-tax: canonical $100K income single US', () => {
  assert.ok(engine, 'engine should be registered');
  const r = engine!.generate({
    annualIncome: '100000',
    businessExpenses: '15000',
    retirementContribution: '10000',
    filingStatus: 'single',
    stateTaxRate: '5',
    country: 'us',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // Should mention ~$63K net (100K - ~37K tax)
  assert.ok(/63,153|63,?1\d\d/.test(r[0]), `expected ~$63K net, got: ${r[0].slice(0, 200)}`);
});

// Test 2: zero income
test('freelance-tax: zero income → zero tax', () => {
  const r = engine!.generate({
    annualIncome: '0',
    businessExpenses: '0',
    retirementContribution: '0',
    filingStatus: 'single',
    stateTaxRate: '0',
    country: 'us',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /Effective Tax Rate:\s+0\.0%/);
});

// Test 3: non-US country (UK)
test('freelance-tax: UK country uses different currency', () => {
  const r = engine!.generate({
    annualIncome: '100000',
    businessExpenses: '0',
    retirementContribution: '0',
    filingStatus: 'single',
    stateTaxRate: '0',
    country: 'uk',
  });
  assert.ok(Array.isArray(r));
  assert.match(r[0], /£/);
});

// Defensive test (P16-4 Layer 2): negative inputs clamp to 0
test('freelance-tax: negative inputs clamp to 0 (defensive layer 2)', () => {
  const r = engine!.generate({
    annualIncome: '-100000',
    businessExpenses: '-15000',
    retirementContribution: '-10000',
    filingStatus: 'single',
    stateTaxRate: '-5',
    country: 'us',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  for (const line of r) {
    assert.ok(!/NaN|Infinity/.test(line), `output contains NaN/Infinity: ${line}`);
  }
});
