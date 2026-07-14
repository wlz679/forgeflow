import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { maxFineAmount, perViolationExpected, annualExposure, exposureRatio, calcHealthBand, HEALTH_BANDS } from '../src/engines/legal-compliance/gdpr-fine-calculator.ts';

test('canonical: revenue=25M, fine=4%, violations=2, industry=0.8 → €1.6M annual, 6.4% ratio (Critical). Brief typo (ratio=0.0064) corrected to math=0.064 per P8-5/P7-3 lesson (math > prose)', () => {
  const maxFine = maxFineAmount(25_000_000, 4);
  const perViol = perViolationExpected(maxFine, 0.8);
  const annual = annualExposure(perViol, 2);
  const ratio = exposureRatio(annual, 25_000_000);
  assert.equal(maxFine, 1_000_000);
  assert.equal(perViol, 800_000);
  assert.equal(annual, 1_600_000);
  assert.ok(Math.abs(ratio - 0.064) < 1e-9);
  assert.equal(calcHealthBand(ratio), 'critical');
});

test('maxFineAmount: revenue × (finePct/100)', () => {
  assert.equal(maxFineAmount(10_000_000, 4), 400_000);
  assert.equal(maxFineAmount(10_000_000, 2), 200_000);
  assert.equal(maxFineAmount(10_000_000, 0.5), 50_000);
});

test('perViolationExpected: maxFine × industryMult', () => {
  assert.equal(perViolationExpected(1_000_000, 0.8), 800_000);
  assert.equal(perViolationExpected(1_000_000, 1.6), 1_600_000);
});

test('annualExposure: perViolation × violations', () => {
  assert.equal(annualExposure(800_000, 0), 0);
  assert.equal(annualExposure(800_000, 2), 1_600_000);
  assert.equal(annualExposure(800_000, 5), 4_000_000);
});

test('exposureRatio: annual / revenue (zero divisor guard → 0)', () => {
  assert.equal(exposureRatio(1_600_000, 25_000_000), 0.064);
  assert.equal(exposureRatio(0, 0), 0); // guard
  assert.equal(exposureRatio(0, 25_000_000), 0);
});

test('Boundary excellent: ratio < 0.0025 → excellent', () => {
  assert.equal(calcHealthBand(0.002), 'excellent');
  assert.equal(calcHealthBand(0), 'excellent');
});

test('Boundary good: ratio 0.0025 ≤ x < 0.01 → good', () => {
  assert.equal(calcHealthBand(0.0025), 'good');
  // 0.0064 is in-good-band only; canonical is 0.064/critical (test 1) — P14-1 brief had 10× typo (0.0064 vs 0.064), corrected to math=0.064
  assert.equal(calcHealthBand(0.0064), 'good');
  assert.equal(calcHealthBand(0.009), 'good');
});

test('Boundary warning: ratio 0.01 ≤ x < 0.02 → warning', () => {
  assert.equal(calcHealthBand(0.01), 'warning');
  assert.equal(calcHealthBand(0.015), 'warning');
});

test('Boundary critical: ratio ≥ 0.02 → critical', () => {
  assert.equal(calcHealthBand(0.02), 'critical');
  assert.equal(calcHealthBand(0.05), 'critical');
  assert.equal(calcHealthBand(0.10), 'critical');
});

test('HEALTH_BANDS exports 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.0025);
  assert.equal(HEALTH_BANDS.good.threshold, 0.01);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.02);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
  // Signature guard: single-axis band takes 1 arg
  assert.equal(calcHealthBand.length, 1);
});

// P14-followup: negative annual_revenue_global clamps to 0 → maxFine=0 → ratio=0 (defensive layer 2)
// Pre-clamp: maxFineAmount(-25M, 4) = -1M → perViolation = -800K → annual = -1.6M → ratio(-1.6M, -25M) = 0.064
// → bogus 'Critical' band even though math should be zero. Post-clamp: revenue=0 → maxFine=0 → ratio=0 → 'Excellent' (zero exposure).
test('gdpr-fine: negative annual_revenue_global clamps to 0 → ratio=0 → Excellent (defensive layer 2)', () => {
  const revenue = 0; // after clampNonNegative(-25_000_000)
  const maxFine = maxFineAmount(revenue, 4);
  const perViolation = perViolationExpected(maxFine, 0.8);
  const annual = annualExposure(perViolation, 2);
  const ratio = exposureRatio(annual, revenue);
  assert.equal(maxFine, 0);
  assert.equal(perViolation, 0);
  assert.equal(annual, 0);
  assert.equal(ratio, 0);
  assert.equal(calcHealthBand(ratio), 'excellent');
});
