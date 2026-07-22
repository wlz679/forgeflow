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

// P53 Task 11: calculate() emits 🩺 LTV Health section
test('ltv: calculate() emits 🩺 LTV Health section (P53)', () => {
  const r = engine!.generate({
    monthlyRevenuePerUser: '100',
    grossMargin: '70',
    monthlyChurn: '5',
    cac: '300',
  });
  assert.ok(r.length > 0, 'output non-empty');
  assert.ok(
    r.some((line) => line.includes('🩺 LTV Health')),
    'calculate() output contains 🩺 LTV Health section',
  );
});

// P53 Task 11: customFn emits 🩺 + 🔄 (v3) sections + Sae→SaaS typo fixed
test('ltv: customFn emits 🩺 and 🔄 sections; Sae typo fixed (P53)', () => {
  const fnSrc = engine!.clientConfig.customFn!;
  // customFn is JS source string executed in browser via new Function()
  const fn = new Function('inputs', 'pick', 'fill', fnSrc);
  const out = fn(
    {
      monthlyRevenuePerUser: '100',
      grossMargin: '70',
      monthlyChurn: '5',
      cac: '300',
    },
    () => '',
    () => '',
  );
  const str = JSON.stringify(out);
  assert.ok(str.includes('🩺 LTV Health'), 'customFn has 🩺 LTV Health');
  assert.ok(str.includes('🔄 What-If'), 'customFn has 🔄 What-If');
  assert.ok(!str.includes('Sae'), 'no Sae typo leftover in customFn output');
  // Sae→SaaS fix in calculate() — verify the source no longer contains the literal "Sae" string
  // (the typo lived in the [1, 3) lcr branch of the LTV Health section)
  const src = require('node:fs').readFileSync(
    require('node:path').resolve('src/engines/valuation/ltv-calculator.ts'),
    'utf8',
  );
  assert.ok(!/Sae\b/.test(src), 'calculate() source no longer contains "Sae" literal');
  assert.ok(/SaaS healthy/.test(src), 'calculate() source contains "SaaS healthy" benchmark');
});

// P53 review Important finding: zero-LTV inputs previously caused customFn
// to skip the 🩺 and 🔄 v3 sections (the wrappers were guarded by `if(ltv>0)`).
// This regression test pins the contract: both sections MUST always emit.
test('ltv: customFn emits 🩺 and 🔄 even with zero LTV (regression for zero-revenue drift)', () => {
  const fnSrc = engine!.clientConfig.customFn!;
  const fn = new Function('inputs', 'pick', 'fill', fnSrc);
  const out = fn({ monthlyRevenuePerUser: '0', monthlyChurn: '5', grossMargin: '80', cac: '300' }, () => '', () => '');
  const str = JSON.stringify(out);
  assert.ok(str.includes('🩺 LTV Health'), '🩺 section still emitted at zero LTV');
  assert.ok(str.includes('🔄 What-If'), '🔄 section still emitted at zero LTV');
  // Zero-LTV should hit the red branch in 🩺 or the "Cannot model" branch in 🔄
  assert.ok(
    str.includes('zero or negative') || str.includes('Cannot model'),
    'zero-LTV triggers red branch in 🩺 or Cannot-model warning in 🔄',
  );
});
