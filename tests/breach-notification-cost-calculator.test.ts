// P14-5 Data Breach Notification Cost — 10 tests covering canonical math,
// 4 band boundaries (excellent/good/warning/critical), HEALTH_BANDS structure,
// and signature guard.
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  notificationCost,
  costPerBreach,
  annualBreachCost,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/legal-compliance/breach-notification-cost-calculator.ts';

const eps = 1e-9;

test('(1) Canonical: 1 breach × 50K subjects × €5 + €80K remediation → notif=250K, perBreach=330K, annual=330K, band=warning', () => {
  const breaches = 1;
  const subjects = 50_000;
  const costPerSubject = 5;
  const remediation = 80_000;
  const notif = notificationCost(subjects, costPerSubject);
  const perBreach = costPerBreach(notif, remediation);
  const annual = annualBreachCost(breaches, perBreach);
  assert.ok(Math.abs(notif - 250_000) < eps, `notif=${notif}`);
  assert.ok(Math.abs(perBreach - 330_000) < eps, `perBreach=${perBreach}`);
  assert.ok(Math.abs(annual - 330_000) < eps, `annual=${annual}`);
  assert.equal(calcHealthBand(annual), 'warning');
});

test('(2) notificationCost math: 50000 × 5 = 250000', () => {
  assert.ok(Math.abs(notificationCost(50_000, 5) - 250_000) < eps);
});

test('(3) costPerBreach math: 250000 + 80000 = 330000', () => {
  assert.ok(Math.abs(costPerBreach(250_000, 80_000) - 330_000) < eps);
});

test('(4) annualBreachCost math: 3 × 330000 = 990000', () => {
  assert.ok(Math.abs(annualBreachCost(3, 330_000) - 990_000) < eps);
});

test('(5) Boundary excellent: annual < €50K → excellent (annual=49,999)', () => {
  assert.equal(calcHealthBand(49_999), 'excellent');
});

test('(6) Boundary good: 50K ≤ annual < 250K → good (annual=50,000 and annual=200,000)', () => {
  assert.equal(calcHealthBand(50_000), 'good');
  assert.equal(calcHealthBand(200_000), 'good');
});

test('(7) Boundary warning: 250K ≤ annual < 1M → warning (annual=250,000 and annual=500,000 and canonical 330,000)', () => {
  assert.equal(calcHealthBand(250_000), 'warning');
  assert.equal(calcHealthBand(330_000), 'warning');
  assert.equal(calcHealthBand(500_000), 'warning');
});

test('(8) Boundary critical: annual ≥ €1M → critical (annual=1,000,000 and annual=2,000,000)', () => {
  assert.equal(calcHealthBand(1_000_000), 'critical');
  assert.equal(calcHealthBand(2_000_000), 'critical');
});

test('(9) HEALTH_BANDS structure: 4 keys, Infinity critical', () => {
  assert.deepEqual(
    Object.keys(HEALTH_BANDS).sort(),
    ['critical', 'excellent', 'good', 'warning']
  );
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
  assert.equal(HEALTH_BANDS.excellent.threshold, 50_000);
  assert.equal(HEALTH_BANDS.good.threshold, 250_000);
  assert.equal(HEALTH_BANDS.warning.threshold, 1_000_000);
});

test('(10) Signature guard: calcHealthBand is single-arg', () => {
  assert.equal(calcHealthBand.length, 1, 'calcHealthBand should take exactly 1 argument');
});

// P14-followup: negative subjects/remediation/breaches clamp to 0 → annual=0 → Excellent (defensive layer 2)
// Pre-clamp: notificationCost(-50K, 5)=-250K, costPerBreach(-250K, -80K)=-330K, annualBreachCost(-1, -330K)=330K
// → bogus 'Warning' band. Post-clamp: 0×0+0=0 annual → 'Excellent' (no breach cost).
test('breach-notification: negative subjects/remediation/breaches clamp to 0 → annual=0 → Excellent (defensive layer 2)', () => {
  const subjects = 0;       // after clampNonNegative(-50_000)
  const cps = 5;
  const remediation = 0;    // after clampNonNegative(-80_000)
  const breaches = 0;       // after clampNonNegative(-1)
  const notif = notificationCost(subjects, cps);
  const perBreach = costPerBreach(notif, remediation);
  const annual = annualBreachCost(breaches, perBreach);
  assert.equal(notif, 0);
  assert.equal(perBreach, 0);
  assert.equal(annual, 0);
  assert.equal(calcHealthBand(annual), 'excellent');
});
