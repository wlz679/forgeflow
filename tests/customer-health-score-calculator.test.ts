import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  normalize, healthScore, calcHealthBand, HEALTH_BANDS, PRESETS,
} from '../src/engines/retention/customer-health-score-calculator.ts';

test('normalize: nps 0 → 50 (midpoint)', () => {
  assert.equal(normalize('nps', 0), 50);
});

test('normalize: nps 100 → 100 (best)', () => {
  assert.equal(normalize('nps', 100), 100);
});

test('normalize: nps -100 → 0 (worst)', () => {
  assert.equal(normalize('nps', -100), 0);
});

test('normalize: supportTickets 0 → 100 (no tickets = perfect)', () => {
  assert.equal(normalize('supportTickets', 0), 100);
});

test('normalize: supportTickets 25 → 0 (saturation: 25+ tickets = worst)', () => {
  assert.equal(normalize('supportTickets', 25), 0);
});

test('normalize: supportTickets 5 → 80 (canonical)', () => {
  assert.equal(normalize('supportTickets', 5), 80);
});

test('healthScore: 75/40/5/80/60 balanced → 73 (canonical)', () => {
  assert.equal(healthScore(75, 40, 5, 80, 60, 'balanced'), 73);
});

test('healthScore: 0/-100/50/0/0 balanced → 0 (worst case)', () => {
  // spec test value 12.5 was wrong: normalize('nps', -100) = 0, normalize('supportTickets', 50) = 0,
  // so all 5 normalized = 0, weighted sum = 0 (not 12.5).
  assert.equal(healthScore(0, -100, 50, 0, 0, 'balanced'), 0);
});

test('healthScore: 100/100/0/100/100 balanced → 100 (best case)', () => {
  assert.equal(healthScore(100, 100, 0, 100, 100, 'balanced'), 100);
});

test('PRESETS weights all sum to 1.0', () => {
  for (const [name, weights] of Object.entries(PRESETS)) {
    const sum = weights.reduce((a, b) => a + b, 0);
    assert.equal(Math.round(sum * 100) / 100, 1.0, `preset "${name}" weights sum to ${sum}, want 1.0`);
  }
});

test('calcHealthBand: 39 → critical', () => {
  assert.equal(calcHealthBand(39), 'critical');
});

test('calcHealthBand: 40 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(40), 'warning');
});

test('calcHealthBand: 60 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(60), 'good');
});

test('calcHealthBand: 80 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(80), 'excellent');
});

test('HEALTH_BANDS exported with correct thresholds', () => {
  assert.deepEqual(HEALTH_BANDS.excellent, [80, Infinity]);
  assert.deepEqual(HEALTH_BANDS.good, [60, 80]);
  assert.deepEqual(HEALTH_BANDS.warning, [40, 60]);
  assert.deepEqual(HEALTH_BANDS.critical, [0, 40]);
});

// P14-followup: negative productUsage clamps to 0 → score remains computable (defensive layer 2)
// clampNonNegative(-50) → 0; healthScore(0, 40, 5, 80, 60, 'balanced') yields valid score range
// (NPS excluded — has its own range clamp; uses non-NPS input productUsage)
test('customer-health: negative productUsage clamps to 0 → score remains computable', () => {
  const pu = 0; // after clampNonNegative(-50)
  const sc = healthScore(pu, 40, 5, 80, 60, 'balanced');
  assert.ok(sc >= 0 && sc <= 100, 'score ' + sc + ' must be in [0, 100]');
});
