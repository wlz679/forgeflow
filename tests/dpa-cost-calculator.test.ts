import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  dpaBaseHours,
  redlineMultiplier,
  annualDPACost,
  costPerDPA,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/legal-compliance/dpa-cost-calculator.ts';

const approxEqual = (actual: number, expected: number) => {
  assert.ok(Math.abs(actual - expected) < 1e-9, `actual=${actual}, expected=${expected}`);
};

test('canonical: 40/q, 4 rounds, 1.5 hr/round, €250/hr, 8 redlines → €336K/yr, €2.1K/DPA, Warning', () => {
  const baseHours = dpaBaseHours(4, 1.5);
  const annual = annualDPACost(40, baseHours, 250, 8);
  const perDPA = costPerDPA(baseHours, 250, 8);
  assert.equal(baseHours, 6);
  approxEqual(annual, 336_000);
  approxEqual(perDPA, 2_100);
  assert.equal(calcHealthBand(annual), 'warning');
});

test('dpaBaseHours: rounds × hours per round', () => {
  assert.equal(dpaBaseHours(4, 1.5), 6);
  assert.equal(dpaBaseHours(2, 1.5), 3);
  assert.equal(dpaBaseHours(0, 2), 0);
});

test('redlineMultiplier: each redline adds 5% multiplicatively', () => {
  approxEqual(redlineMultiplier(0), 1);
  approxEqual(redlineMultiplier(8), 1.4);
  approxEqual(redlineMultiplier(20), 2);
});

test('annualDPACost: quarterly volume × 4 × base hours × rate × redline multiplier, with zero-factor guards', () => {
  approxEqual(annualDPACost(40, 6, 250, 8), 336_000);
  assert.equal(annualDPACost(0, 6, 250, 8), 0);
  assert.equal(annualDPACost(40, 0, 250, 8), 0);
  assert.equal(annualDPACost(40, 6, 0, 8), 0);
});

test('costPerDPA: base hours × rate × redline multiplier', () => {
  approxEqual(costPerDPA(6, 250, 8), 2_100);
  approxEqual(costPerDPA(3, 250, 8), 1_050);
  assert.equal(costPerDPA(0, 250, 8), 0);
});

test('Boundary excellent: annual cost < €100K → excellent', () => {
  assert.equal(calcHealthBand(0), 'excellent');
  assert.equal(calcHealthBand(99_999), 'excellent');
});

test('Boundary good: €100K ≤ annual cost < €300K → good', () => {
  assert.equal(calcHealthBand(100_000), 'good');
  assert.equal(calcHealthBand(200_000), 'good');
});

test('Boundary warning: €300K ≤ annual cost < €600K → warning', () => {
  assert.equal(calcHealthBand(300_000), 'warning');
  assert.equal(calcHealthBand(336_000), 'warning');
  assert.equal(calcHealthBand(500_000), 'warning');
});

test('Boundary critical: annual cost ≥ €600K → critical', () => {
  assert.equal(calcHealthBand(600_000), 'critical');
  assert.equal(calcHealthBand(1_000_000), 'critical');
});

test('HEALTH_BANDS has 4 locked HIGHER bands with critical Infinity', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 100_000);
  assert.equal(HEALTH_BANDS.good.threshold, 300_000);
  assert.equal(HEALTH_BANDS.warning.threshold, 600_000);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});

test('calcHealthBand remains a single-axis function', () => {
  assert.equal(calcHealthBand.length, 1);
});

// P14-followup: negative dpas_per_quarter clamps to 0 → annual=0 → Excellent (defensive layer 2)
// Pre-clamp: redlineMultiplier(-100) = 1 + (-100)*0.05 = -4 → annualDPACost(-40, 6, 250, -8) = -40*4*6*250*(-4) = +960K
// (sign flip on negative inputs produces bogus 'Critical'). Post-clamp: 0 redlines → 1× multiplier, 0 dpas → 0 annual.
test('dpa-cost: negative dpas_per_quarter clamps to 0 → annual=0 → Excellent (defensive layer 2)', () => {
  const dpas = 0;        // after clampNonNegative(-40)
  const baseHours = dpaBaseHours(4, 1.5);
  const redlines = 0;    // after clampNonNegative(-8)
  const multiplier = redlineMultiplier(redlines);
  const annual = annualDPACost(dpas, baseHours, 250, redlines);
  assert.equal(multiplier, 1);
  assert.equal(annual, 0);
  assert.equal(calcHealthBand(annual), 'excellent');
});
