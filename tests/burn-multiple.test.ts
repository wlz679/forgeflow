/**
 * P4-4 Burn Multiple / Rule of 40 Calculator — math layer tests.
 * Covers: ruleOf40Score, ruleOf40Health (boundaries),
 *         burnMultiple, burnMultipleHealth, saasQuadrant, stageBenchmark.
 * Run via: node --import tsx --test tests/burn-multiple.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  ruleOf40Score,
  ruleOf40Health,
  burnMultiple,
  burnMultipleHealth,
  saasQuadrant,
  stageBenchmark,
} from '../src/engines/valuation/burn-multiple-rule-of-40-calculator.ts';

test('Rule of 40 PASS: 100% growth + -50% margin = 50% → 🟢', () => {
  const score = ruleOf40Score(100, -50);
  assert.equal(score, 50);
  const h = ruleOf40Health(score);
  assert.equal(h.emoji, '🟢');
  assert.ok(h.label.includes('PASS'));
});

test('Rule of 40 borderline: 50% growth + -10% margin = 40% (exact boundary) → 🟢', () => {
  const score = ruleOf40Score(50, -10);
  assert.equal(score, 40);
  const h = ruleOf40Health(score);
  assert.equal(h.emoji, '🟢'); // 40 ≥ 40 → PASS
});

test('Rule of 40 fail: 20% growth + -50% margin = -30% → 🔴', () => {
  const score = ruleOf40Score(20, -50);
  assert.equal(score, -30);
  const h = ruleOf40Health(score);
  assert.equal(h.emoji, '🔴');
});

test('Burn Multiple great: $1M burn / $2M ARR = 0.5 → 🟢', () => {
  const ratio = burnMultiple(1000000, 2000000);
  assert.equal(ratio, 0.5);
  const h = burnMultipleHealth(ratio);
  assert.equal(h.emoji, '🟢');
  assert.ok(h.label.includes('great'));
});

test('Burn Multiple infinite when ARR = 0', () => {
  const ratio = burnMultiple(2000000, 0);
  assert.equal(ratio, Infinity);
  const h = burnMultipleHealth(ratio);
  // Health function doesn't handle Infinity gracefully — it falls through to 🔴
  assert.equal(h.emoji, '🔴');
});

test('SaaS Quadrant Stars: 60% growth + 5% margin → 🟢 Stars', () => {
  const q = saasQuadrant(60, 5);
  assert.equal(q.emoji, '🟢');
  assert.ok(q.label.includes('Stars'));
});

test('SaaS Quadrant Growers: 100% growth + -20% margin → 🟡 Growers', () => {
  const q = saasQuadrant(100, -20);
  assert.equal(q.emoji, '🟡');
  assert.ok(q.label.includes('Growers'));
});

test('SaaS Quadrant Zombies: 20% growth + -30% margin → 🔴 Zombies', () => {
  const q = saasQuadrant(20, -30);
  assert.equal(q.emoji, '🔴');
  assert.ok(q.label.includes('Zombies'));
});

test('Stage benchmark seed: 1.5 ratio is 🟢 top-quartile for seed', () => {
  const s = stageBenchmark(1.5, 'seed');
  assert.match(s, /top-quartile for seed/);
});

test('Stage benchmark series-a: 2.1 ratio is 🟠 above median for series A', () => {
  const s = stageBenchmark(2.1, 'a');
  assert.match(s, /above median for a/);
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0 (growth/margin exempt — can be negative)
test('burn-multiple: negative netBurn/netNewARR clamp to 0; growth/margin preserved (defensive layer 2)', () => {
  const { getEngine } = require('../src/core/engines/registry.ts');
  const engine = getEngine('solopreneur-burn-multiple-rule-of-40-calculator');
  assert.ok(engine);
  const r = engine!.generate({
    revenueGrowth: '-50',
    profitMargin: '-20',
    netBurn: '-1000000',
    netNewARR: '-500000',
    stage: 'a',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // No NaN/Infinity in output (besides expected Infinity for division)
  for (const line of r) {
    assert.ok(!/NaN/.test(line), `output contains NaN: ${line}`);
  }
  // No negative money values
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
