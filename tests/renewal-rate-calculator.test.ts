import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  renewalRate,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/retention/renewal-rate-calculator.ts';

// ─── Math tests ──────────────────────────────────────────────────────────────

test('renewalRate: basic ratio', () => {
  assert.equal(renewalRate(85, 100), 0.85);
});

test('renewalRate: zero renewed (full loss)', () => {
  assert.equal(renewalRate(0, 100), 0);
});

test('renewalRate: full renewal', () => {
  assert.equal(renewalRate(100, 100), 1);
});

test('renewalRate: zero up-for-renewal (degenerate)', () => {
  assert.equal(renewalRate(0, 0), 0);
});

test('renewalRate: large enterprise book ($5M renewed / $6M up)', () => {
  // 0.8333... ≈ 🟠 (warning band, between 80% and 90%)
  const r = renewalRate(5_000_000, 6_000_000);
  assert.ok(Math.abs(r - 5 / 6) < 1e-9);
});

test('renewalRate: canonical mid-market ($850K / $1M = 85%)', () => {
  // Mid-market anchor; should land in 🟡 (80-90% good band)
  assert.equal(renewalRate(850_000, 1_000_000), 0.85);
});

// ─── Health band tests ───────────────────────────────────────────────────────

test('calcHealthBand: 🟢 excellent (>= 90%)', () => {
  assert.equal(calcHealthBand(0.90), 'excellent');
  assert.equal(calcHealthBand(0.95), 'excellent');
  assert.equal(calcHealthBand(1.00), 'excellent');
});

test('calcHealthBand: 🟡 good (>= 80% but < 90%)', () => {
  assert.equal(calcHealthBand(0.80), 'good');
  assert.equal(calcHealthBand(0.85), 'good');
  assert.equal(calcHealthBand(0.899), 'good');
});

test('calcHealthBand: 🟠 warning (>= 70% but < 80%)', () => {
  assert.equal(calcHealthBand(0.70), 'warning');
  assert.equal(calcHealthBand(0.75), 'warning');
  assert.equal(calcHealthBand(0.799), 'warning');
});

test('calcHealthBand: 🔴 critical (< 70%)', () => {
  assert.equal(calcHealthBand(0.69), 'critical');
  assert.equal(calcHealthBand(0.50), 'critical');
  assert.equal(calcHealthBand(0), 'critical');
});

test('HEALTH_BANDS table structure', () => {
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.90);
  assert.equal(HEALTH_BANDS.good.threshold, 0.80);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.70);
});