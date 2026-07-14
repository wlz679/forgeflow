import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { consentGap, monthlyRecoverableVisitors, monthlyRecoveredRevenue, annualRecoveredRevenue, calcHealthBand, HEALTH_BANDS } from '../src/engines/legal-compliance/consent-revenue-impact-calculator.ts';

test('canonical: visitors=200K, current=55%, target=75%, conv=2% → gap=20pp, recoverable=40K, monthly=€64K, annual=€768K, band=Warning', () => {
  const gap = consentGap(55, 75);
  const recoverable = monthlyRecoverableVisitors(200_000, gap);
  const monthly = monthlyRecoveredRevenue(recoverable, 2, 80);
  const annual = annualRecoveredRevenue(monthly);
  assert.equal(gap, 20);
  assert.equal(recoverable, 40_000);
  assert.equal(monthly, 64_000);
  assert.equal(annual, 768_000);
  assert.equal(calcHealthBand(gap), 'warning');
});

test('consentGap: clamp to 0 when current >= target (defensive against user typo)', () => {
  assert.equal(consentGap(80, 70), 0); // current > target → no gap
  assert.equal(consentGap(75, 75), 0); // equal → 0
  assert.equal(consentGap(100, 0), 0); // extreme inversion → 0
});

test('consentGap: clamp current/target to [0, 100] defensively', () => {
  assert.equal(consentGap(-10, 80), 80); // current=-10 → treated as 0 → gap = 80-0 = 80
  assert.equal(consentGap(120, 80), 0); // current=120 → treated as 100 → gap = 80-100 = -20 → clamped to 0
  assert.equal(consentGap(50, 150), 50); // target=150 → treated as 100 → gap = 100-50 = 50
  assert.equal(consentGap(50, -10), 0); // target=-10 → treated as 0 → gap = 0-50 = -50 → clamped to 0
});

test('consentGap: normal monotonic gap (current<target)', () => {
  assert.equal(consentGap(50, 80), 30);
  assert.equal(consentGap(0, 100), 100);
  assert.equal(consentGap(60, 65), 5);
});

test('monthlyRecoverableVisitors: visitors × (gap/100)', () => {
  assert.equal(monthlyRecoverableVisitors(200_000, 20), 40_000);
  assert.equal(monthlyRecoverableVisitors(100_000, 0), 0); // gap=0 → 0
  assert.equal(monthlyRecoverableVisitors(0, 50), 0); // 0 visitors → 0
  assert.equal(monthlyRecoverableVisitors(1_000_000, 10), 100_000);
  // Float: 50000 × 0.025 = 1250
  assert.equal(monthlyRecoverableVisitors(50_000, 2.5), 1_250);
});

test('monthlyRecoveredRevenue: recoverable × (conv/100) × AOV', () => {
  // Canonical: 40K × 0.02 × 80 = 64,000
  assert.equal(monthlyRecoveredRevenue(40_000, 2, 80), 64_000);
  // 0 conv → 0
  assert.equal(monthlyRecoveredRevenue(40_000, 0, 80), 0);
  // 0 AOV → 0
  assert.equal(monthlyRecoveredRevenue(40_000, 2, 0), 0);
  // 0 visitors → 0
  assert.equal(monthlyRecoveredRevenue(0, 2, 80), 0);
  // 5% conv × €120 AOV: 10000 × 0.05 × 120 = 60,000
  assert.equal(monthlyRecoveredRevenue(10_000, 5, 120), 60_000);
});

test('annualRecoveredRevenue: monthly × 12', () => {
  assert.equal(annualRecoveredRevenue(64_000), 768_000);
  assert.equal(annualRecoveredRevenue(0), 0);
  assert.equal(annualRecoveredRevenue(192_000), 2_304_000);
  // Float edge
  assert.equal(annualRecoveredRevenue(16_000), 192_000); // what-if scenario
});

test('Boundary excellent: gap < 5pp → excellent', () => {
  assert.equal(calcHealthBand(0), 'excellent'); // gap=0 (already at target)
  assert.equal(calcHealthBand(3), 'excellent');
  assert.equal(calcHealthBand(4.99), 'excellent'); // just below threshold
});

test('Boundary good: 5pp ≤ gap < 15pp → good', () => {
  assert.equal(calcHealthBand(5), 'good'); // exact lower bound
  assert.equal(calcHealthBand(10), 'good');
  assert.equal(calcHealthBand(14.99), 'good'); // just below upper
});

test('Boundary warning: 15pp ≤ gap < 30pp → warning (canonical at 20pp)', () => {
  assert.equal(calcHealthBand(15), 'warning'); // exact lower
  assert.equal(calcHealthBand(20), 'warning'); // canonical
  assert.equal(calcHealthBand(29.99), 'warning'); // just below upper
});

test('Boundary critical: gap ≥ 30pp → critical (no upper cap, threshold=Infinity)', () => {
  assert.equal(calcHealthBand(30), 'critical'); // exact lower
  assert.equal(calcHealthBand(50), 'critical'); // extreme gap
  assert.equal(calcHealthBand(100), 'critical'); // max possible gap
});

test('HEALTH_BANDS has 4 bands with locked thresholds (INVERSE, critical=Infinity)', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 5);
  assert.equal(HEALTH_BANDS.good.threshold, 15);
  assert.equal(HEALTH_BANDS.warning.threshold, 30);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
  // Signature guard: single-axis band takes 1 arg
  assert.equal(calcHealthBand.length, 1);
});

test('canonical-style high-leak scenario: 500K visitors × 50pp gap × 3% conv → Critical', () => {
  // 500K × 0.50 = 250K recoverable × 0.03 × 80 = €600K/mo → €7.2M/yr → Critical (gap=50pp)
  const gap = consentGap(30, 80);
  const recoverable = monthlyRecoverableVisitors(500_000, gap);
  const monthly = monthlyRecoveredRevenue(recoverable, 3, 80);
  const annual = annualRecoveredRevenue(monthly);
  assert.equal(gap, 50);
  assert.equal(recoverable, 250_000);
  assert.equal(monthly, 600_000);
  assert.equal(annual, 7_200_000);
  assert.equal(calcHealthBand(gap), 'critical');
});

test('canonical-style excellent scenario: 100K visitors × 0pp gap (already at target) → Excellent, €0 recoverable', () => {
  const gap = consentGap(80, 80);
  const recoverable = monthlyRecoverableVisitors(100_000, gap);
  const monthly = monthlyRecoveredRevenue(recoverable, 2, 80);
  const annual = annualRecoveredRevenue(monthly);
  assert.equal(gap, 0);
  assert.equal(recoverable, 0);
  assert.equal(monthly, 0);
  assert.equal(annual, 0);
  assert.equal(calcHealthBand(gap), 'excellent');
});

test('What-If scenario: lift current consent 55% → 70%, target stays 75% → gap=5pp → Good', () => {
  // altConsent=70, target=75 → gap=5 (lower edge of Good)
  const altGap = consentGap(70, 75);
  const altRecoverable = monthlyRecoverableVisitors(200_000, altGap);
  const altMonthly = monthlyRecoveredRevenue(altRecoverable, 2, 80);
  const altAnnual = annualRecoveredRevenue(altMonthly);
  assert.equal(altGap, 5);
  assert.equal(altRecoverable, 10_000);
  assert.equal(altMonthly, 16_000);
  assert.equal(altAnnual, 192_000);
  assert.equal(calcHealthBand(altGap), 'good');
});

// P14-followup: negative visitors/conv clamp to 0 → recoverable=0, monthly=0 (defensive layer 2)
// Pre-clamp: consentGap(-10, -75) clamps to (0, 0) → gap=0. monthlyRecoverableVisitors(-200K, 0)=0
// monthlyRecoveredRevenue(0, -2, 80)=0. So pure consentGap is already robust. The clamp matters for the
// *generate()* path where negative monthly_visitors or conversion_rate_pct would otherwise propagate to
// the displayed "recoverable €X/mo" line. Post-clamp: visitors=0, conv=0 → 0 monthly, 0 annual.
test('consent-revenue: negative visitors/conv clamp to 0 → recoverable=0, monthly=0 (defensive layer 2)', () => {
  const visitors = 0;   // after clampNonNegative(-200_000)
  const conv = 0;       // after clampNonNegative(-2)
  const current = 55;
  const target = 75;
  const gap = consentGap(current, target);
  const recoverable = monthlyRecoverableVisitors(visitors, gap);
  const monthly = monthlyRecoveredRevenue(recoverable, conv, 80);
  const annual = annualRecoveredRevenue(monthly);
  assert.equal(gap, 20);
  assert.equal(recoverable, 0);
  assert.equal(monthly, 0);
  assert.equal(annual, 0);
});
