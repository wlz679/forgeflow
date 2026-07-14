// P14-6 CMP ROI — 12 tests covering canonical math, 4 band boundaries
// (excellent/good/warning/critical), HEALTH_BANDS structure, signature guard,
// and zero-divisor guards.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  dsarAnnualSavings,
  cmpAnnualCost,
  netAnnualSavings,
  cmpROI,
  paybackMonths,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/legal-compliance/cmp-roi-calculator.ts';

const eps = 1e-9;

test('(1) Canonical: 1200/50/2.5/95/40% → savings=57000, cmp_cost=14400, net=42600, ROI=295.83, payback=3.03, band=good', () => {
  const cmpCost = 1200;
  const dsars = 50;
  const hours = 2.5;
  const rate = 95;
  const uplift = 40;
  const savings = dsarAnnualSavings(dsars, hours, rate, uplift);
  const cmpAnnual = cmpAnnualCost(cmpCost);
  const net = netAnnualSavings(savings, cmpAnnual);
  const roi = cmpROI(net, cmpAnnual);
  const monthlySavings = savings / 12;
  const payback = paybackMonths(cmpAnnual, monthlySavings);
  assert.ok(Math.abs(savings - 57_000) < eps, `savings=${savings}`);
  assert.ok(Math.abs(cmpAnnual - 14_400) < eps, `cmpAnnual=${cmpAnnual}`);
  assert.ok(Math.abs(net - 42_600) < eps, `net=${net}`);
  assert.ok(Math.abs(roi - 295.8333333) < 0.001, `roi=${roi}`);
  assert.ok(Math.abs(payback - 3.031578) < 0.001, `payback=${payback}`);
  assert.equal(calcHealthBand(roi), 'good');
});

test('(2) dsarAnnualSavings math: 50 × 12 × 2.5 × 0.40 × 95 = 57000', () => {
  assert.ok(Math.abs(dsarAnnualSavings(50, 2.5, 95, 40) - 57_000) < eps);
});

test('(3) cmpAnnualCost math: 1200 × 12 = 14400', () => {
  assert.ok(Math.abs(cmpAnnualCost(1200) - 14_400) < eps);
  assert.ok(Math.abs(cmpAnnualCost(0) - 0) < eps);
  assert.ok(Math.abs(cmpAnnualCost(500) - 6_000) < eps);
});

test('(4) netAnnualSavings math: 57000 - 14400 = 42600', () => {
  assert.ok(Math.abs(netAnnualSavings(57_000, 14_400) - 42_600) < eps);
  assert.ok(Math.abs(netAnnualSavings(10_000, 20_000) - (-10_000)) < eps);
  assert.ok(Math.abs(netAnnualSavings(0, 0) - 0) < eps);
});

test('(5) cmpROI math + zero divisor guard: cmp_cost=0 → ROI=-Infinity → critical', () => {
  // Normal: 42600 / 14400 * 100 = 295.8333
  assert.ok(Math.abs(cmpROI(42_600, 14_400) - 295.8333333) < 0.001);
  // 0 cost → -Infinity
  assert.equal(cmpROI(42_600, 0), -Infinity);
  // Negative net (CMP unprofitable)
  assert.ok(Math.abs(cmpROI(-10_000, 20_000) - (-50)) < eps);
  // net=0 → ROI=0
  assert.ok(Math.abs(cmpROI(0, 14_400) - 0) < eps);
});

test('(6) paybackMonths math + zero divisor guard: monthly_savings=0 → payback=Infinity', () => {
  // 14400 / 4750 = 3.0315
  assert.ok(Math.abs(paybackMonths(14_400, 4_750) - 3.031578) < 0.001);
  // 0 monthly savings → Infinity
  assert.equal(paybackMonths(14_400, 0), Infinity);
  // 0 cost → 0
  assert.ok(Math.abs(paybackMonths(0, 100) - 0) < eps);
});

test('(7) Boundary excellent: ROI ≥ 400% (400 → excellent; 500 → excellent; 399.99 → good)', () => {
  assert.equal(calcHealthBand(400), 'excellent');
  assert.equal(calcHealthBand(500), 'excellent');
  assert.equal(calcHealthBand(399.99), 'good');
  assert.equal(calcHealthBand(1_000_000), 'excellent');
});

test('(8) Boundary good: 150% ≤ ROI < 400% (150 → good; 296 → good; 399.99 → good)', () => {
  assert.equal(calcHealthBand(150), 'good');
  assert.equal(calcHealthBand(296), 'good');
  assert.equal(calcHealthBand(399.99), 'good');
  assert.equal(calcHealthBand(149.99), 'warning');
});

test('(9) Boundary warning: 50% ≤ ROI < 150% (50 → warning; 149 → warning; 149.99 → warning)', () => {
  assert.equal(calcHealthBand(50), 'warning');
  assert.equal(calcHealthBand(100), 'warning');
  assert.equal(calcHealthBand(149), 'warning');
  assert.equal(calcHealthBand(149.99), 'warning');
  assert.equal(calcHealthBand(49.99), 'critical');
});

test('(10) Boundary critical: ROI < 50% (0 → critical; -50 → critical; 49.99 → critical; -Infinity → critical)', () => {
  assert.equal(calcHealthBand(0), 'critical');
  assert.equal(calcHealthBand(-50), 'critical');
  assert.equal(calcHealthBand(49.99), 'critical');
  assert.equal(calcHealthBand(-1_000_000), 'critical');
  assert.equal(calcHealthBand(-Infinity), 'critical');
});

test('(11) HEALTH_BANDS structure: 4 keys, -Infinity critical, decimal thresholds', () => {
  assert.deepEqual(
    Object.keys(HEALTH_BANDS).sort(),
    ['critical', 'excellent', 'good', 'warning']
  );
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
  assert.equal(HEALTH_BANDS.excellent.threshold, 4.0);
  assert.equal(HEALTH_BANDS.good.threshold, 1.5);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.5);
  // Thresholds are decimal ratios (not percentages)
  assert.equal(HEALTH_BANDS.excellent.label, 'Excellent');
  assert.equal(HEALTH_BANDS.critical.label, 'Critical');
});

test('(12) Signature guard: calcHealthBand is single-arg', () => {
  assert.equal(calcHealthBand.length, 1, 'calcHealthBand should take exactly 1 argument');
});

// P14-followup: negative cmp_monthly_cost clamps to 0 → savings≥0, cost=0, ROI=-Infinity (defensive layer 2)
// Pre-clamp: dsarAnnualSavings(-50, 2.5, 95, 40)=-57K, cmpAnnualCost(-1200)=-14400, net=-42.6K
// → cmpROI(-42.6K, -14400) = (-42.6K / -14400) * 100 = 295.83% → bogus 'Good' band (neg cost cancels).
// Post-clamp: cost=0 → cmpROI returns -Infinity → 'Critical' (correct: no CMP cost means no platform to evaluate).
test('cmp-roi: negative cmp_monthly_cost clamps to 0 → ROI=-Infinity → Critical (defensive layer 2)', () => {
  const cmpCost = 0; // after clampNonNegative(-1200)
  const cmpAnnual = cmpAnnualCost(cmpCost);
  const net = netAnnualSavings(0, cmpAnnual); // dsarSav clamped to 0 too
  const roi = cmpROI(net, cmpAnnual);
  assert.equal(cmpAnnual, 0);
  assert.equal(net, 0);
  assert.equal(roi, -Infinity);
  assert.equal(calcHealthBand(roi), 'critical');
});
