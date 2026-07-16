/**
 * P4-6 ARR Multiple / Valuation Multiplier Calculator — math layer tests.
 * Covers: arrMultiple, expectedMultiple, multipleHealth,
 *         multipleTier, forwardValuation.
 * Run via: node --import tsx --test tests/arr-multiple.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  arrMultiple,
  expectedMultiple,
  multipleHealth,
  multipleTier,
  forwardValuation,
} from '../src/engines/valuation/arr-multiple-valuation-calculator.ts';

test('arrMultiple: $15M valuation / $1M ARR = 15x', () => {
  const m = arrMultiple(15000000, 1000000);
  assert.equal(m, 15);
});

test('arrMultiple: returns Infinity when ARR = 0', () => {
  const m = arrMultiple(1000000, 0);
  assert.equal(m, Infinity);
});

test('expectedMultiple heuristic: 50% growth + 0% margin = 10x', () => {
  const e = expectedMultiple(50, 0);
  assert.equal(e, 10);
});

test('expectedMultiple heuristic: 100% growth + 20% margin = 19x', () => {
  // 5 + 100/10 + 20/5 = 5 + 10 + 4 = 19
  const e = expectedMultiple(100, 20);
  assert.equal(e, 19);
});

test('multipleHealth: actual 10x, expected 10x → 🟢 reasonable', () => {
  const h = multipleHealth(10, 10);
  assert.equal(h.emoji, '🟢');
  assert.ok(h.label.includes('reasonable'));
});

test('multipleHealth: actual 30x, expected 10x → 🟠 outlier (3x expected)', () => {
  const h = multipleHealth(30, 10);
  assert.equal(h.emoji, '🟠');
  assert.ok(h.label.includes('outlier'));
});

test('multipleHealth: actual 5x, expected 10x → 🟡 below market (50%)', () => {
  const h = multipleHealth(5, 10);
  assert.equal(h.emoji, '🟡');
  assert.ok(h.label.includes('above/below market'));
});

test('multipleTier: 50% growth → Fast (15-25x)', () => {
  const t = multipleTier(50);
  assert.equal(t.label, 'Fast growth');
  assert.equal(t.range, '15-25x');
});

test('multipleTier: 150% growth → Hyper (25-40x)', () => {
  const t = multipleTier(150);
  assert.equal(t.label, 'Hyper growth');
  assert.equal(t.range, '25-40x');
});

test('multipleTier: 10% growth → Slow (3-8x)', () => {
  const t = multipleTier(10);
  assert.equal(t.label, 'Slow growth');
  assert.equal(t.range, '3-8x');
});

test('forwardValuation: $1M ARR + 50% growth + 10x forward = $15M', () => {
  // $1M × 1.5 × 10 = $15M
  const fv = forwardValuation(1000000, 50, 10);
  assert.equal(fv, 15000000);
});

test('forwardValuation: $5M ARR + 100% growth + 20x forward = $200M', () => {
  // $5M × 2.0 × 20 = $200M
  const fv = forwardValuation(5000000, 100, 20);
  assert.equal(fv, 200000000);
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0 (growth/margin exempt — can be negative)
test('arr-multiple: negative ARR/valuation clamp to 0; growth/margin preserved (defensive layer 2)', () => {
  const { getEngine } = require('../src/core/engines/registry.ts');
  const engine = getEngine('solopreneur-arr-multiple-valuation-calculator');
  assert.ok(engine);
  const r = engine!.generate({
    arr: '-1000000',
    valuation: '-15000000',
    growthRate: '-50',
    profitMargin: '-20',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // No NaN/Infinity in output
  for (const line of r) {
    assert.ok(!/NaN|Infinity/.test(line), `output contains NaN/Infinity: ${line}`);
  }
  // No negative money values (ARR and valuation should be clamped to 0)
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
