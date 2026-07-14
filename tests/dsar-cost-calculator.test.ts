import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { manualHoursPerDSAR, annualDSARCost, costPerDSAR, calcHealthBand, HEALTH_BANDS } from '../src/engines/legal-compliance/dsar-cost-calculator.ts';

test('canonical: dsars=50, hours=2.5, rate=95, automation=30% → manual=1.75hr, annual=€99,750, perDSAR=€166.25, band=Good', () => {
  const manual = manualHoursPerDSAR(2.5, 30);
  const perDSAR = costPerDSAR(2.5, 95, 30);
  const annual = annualDSARCost(50, 2.5, 95, 30);
  assert.equal(manual, 1.75);
  assert.ok(Math.abs(perDSAR - 166.25) < 1e-9, `perDSAR=${perDSAR}, want 166.25`);
  assert.equal(annual, 99_750);
  assert.equal(calcHealthBand(annual), 'good');
});

test('manualHoursPerDSAR: hours × (1 - automation/100) clamping 0-100', () => {
  // 0% automation → full hours
  assert.equal(manualHoursPerDSAR(2.5, 0), 2.5);
  // 50% automation → half
  assert.equal(manualHoursPerDSAR(2.0, 50), 1.0);
  // 100% automation → 0
  assert.equal(manualHoursPerDSAR(2.5, 100), 0);
  // negative clamps to 0 → full hours (no negative work)
  assert.equal(manualHoursPerDSAR(2.5, -50), 2.5);
  // >100 clamps to 100 → 0
  assert.equal(manualHoursPerDSAR(2.5, 150), 0);
  // typical mid-range
  assert.equal(manualHoursPerDSAR(4.0, 60), 1.6);
});

test('annualDSARCost: dsars × 12 × manualHours × rate, zero divisor guards', () => {
  // Canonical
  assert.equal(annualDSARCost(50, 2.5, 95, 30), 99_750);
  // Edge: 0 DSARs → 0
  assert.equal(annualDSARCost(0, 2.5, 95, 30), 0);
  // Edge: 100% automation → 0
  assert.equal(annualDSARCost(50, 2.5, 95, 100), 0);
  // Edge: 0 hours/DSAR → 0
  assert.equal(annualDSARCost(50, 0, 95, 30), 0);
  // Edge: 0 rate → 0
  assert.equal(annualDSARCost(50, 2.5, 0, 30), 0);
  // 100 DSARs/mo, 100% automation would be 0 cost
  assert.equal(annualDSARCost(100, 1.5, 80, 100), 0);
});

test('costPerDSAR: manualHours × rate', () => {
  // Canonical
  assert.equal(costPerDSAR(2.5, 95, 30), 166.25);
  // 0% automation
  assert.equal(costPerDSAR(3.0, 100, 0), 300);
  // 100% automation
  assert.equal(costPerDSAR(3.0, 100, 100), 0);
  // clamping: -50% treated as 0% (full hours)
  assert.equal(costPerDSAR(2.0, 50, -50), 100);
  // clamping: 200% treated as 100% (zero)
  assert.equal(costPerDSAR(2.0, 50, 200), 0);
});

test('Boundary excellent: cost < €25K → excellent', () => {
  assert.equal(calcHealthBand(0), 'excellent');
  assert.equal(calcHealthBand(10_000), 'excellent');
  assert.equal(calcHealthBand(24_999), 'excellent');
});

test('Boundary good: €25K ≤ cost < €100K → good', () => {
  assert.equal(calcHealthBand(25_000), 'good'); // exact lower
  assert.equal(calcHealthBand(50_000), 'good');
  assert.equal(calcHealthBand(99_750), 'good'); // canonical
  assert.equal(calcHealthBand(99_999), 'good'); // just below
});

test('Boundary warning: €100K ≤ cost < €300K → warning', () => {
  assert.equal(calcHealthBand(100_000), 'warning'); // exact lower
  assert.equal(calcHealthBand(150_000), 'warning');
  assert.equal(calcHealthBand(299_999), 'warning');
});

test('Boundary critical: cost ≥ €300K → critical', () => {
  assert.equal(calcHealthBand(300_000), 'critical'); // exact lower
  assert.equal(calcHealthBand(500_000), 'critical');
  assert.equal(calcHealthBand(1_000_000), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked thresholds (HIGHER, critical=Infinity)', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 25_000);
  assert.equal(HEALTH_BANDS.good.threshold, 100_000);
  assert.equal(HEALTH_BANDS.warning.threshold, 300_000);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
  // Signature guard: single-axis band takes 1 arg
  assert.equal(calcHealthBand.length, 1);
});

test('automation_pct clamping in cost functions (defensive for customFn)', () => {
  // automation_pct below 0 → treated as 0 (no negative hours)
  const manualNeg = manualHoursPerDSAR(2.5, -25);
  assert.equal(manualNeg, 2.5);
  // automation_pct above 100 → treated as 100 (zero hours)
  const manualOver = manualHoursPerDSAR(2.5, 200);
  assert.equal(manualOver, 0);
  // annual cost must never be negative
  const annualNeg = annualDSARCost(50, 2.5, 95, -25);
  assert.equal(annualNeg, 142_500); // 50 × 12 × 2.5 × 95 (treated as 0% auto)
  const annualOver = annualDSARCost(50, 2.5, 95, 200);
  assert.equal(annualOver, 0); // treated as 100% auto
});

test('canonical-style L-2 high-volume scenario: 200 DSARs/mo × 0% automation → Critical', () => {
  // 200 DSARs/mo × 12 × 2.5hr × €95 = €570K → Critical (≥€300K)
  const annual = annualDSARCost(200, 2.5, 95, 0);
  assert.equal(annual, 570_000);
  assert.equal(calcHealthBand(annual), 'critical');
});

test('canonical-style L-2 low-volume scenario: 5 DSARs/mo × 70% automation → Excellent', () => {
  // 5 × 12 × (2.5 × 0.3) × 80 = 5 × 12 × 0.75 × 80 = €3,600 → Excellent (<€25K)
  const manual = manualHoursPerDSAR(2.5, 70);
  const annual = annualDSARCost(5, 2.5, 80, 70);
  // Float precision: 0.7500000000000001 / 3600.0000000000005 in IEEE 754 — use approximate comparison
  assert.ok(Math.abs(manual - 0.75) < 1e-9, `manual=${manual}, want ~0.75`);
  assert.ok(Math.abs(annual - 3_600) < 1e-9, `annual=${annual}, want ~3600`);
  assert.equal(calcHealthBand(annual), 'excellent');
});

// P14-followup: negative dsars/hours/rate clamp to 0 → annual=0 → Excellent (defensive layer 2)
// Pre-clamp: annualDSARCost(-50, -2.5, -95, -30) = -50*12*manualHoursPerDSAR(-2.5, -30)*(-95)
//           = -50*12*(-2.5)*(-95) [automation clamped to 0, manualHours = -2.5*1=-2.5]
//           = -50*12*(-2.5)*(-95) = -142500 → bogus 'Excellent' (negative annual).
// Post-clamp: 0 DSARs OR 0 hours OR 0 rate → annual=0 → 'Excellent' (no cost).
test('dsar-cost: negative dsars/hours/rate clamp to 0 → annual=0 → Excellent (defensive layer 2)', () => {
  const dsars = 0;   // after clampNonNegative(-50)
  const hours = 0;   // after clampNonNegative(-2.5)
  const rate = 0;    // after clampNonNegative(-95)
  const autoPct = 30;
  const annual = annualDSARCost(dsars, hours, rate, autoPct);
  assert.equal(annual, 0);
  assert.equal(calcHealthBand(annual), 'excellent');
});
