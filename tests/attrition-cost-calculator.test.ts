import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { attritionCost, calcHealthBand, HEALTH_BANDS } from '../src/engines/hiring-team/attrition-cost-calculator.ts';

test('attritionCost: $120K, $8K, 12w, 6mo, IC = $81,846 total / 68.2%', () => {
  const r = attritionCost(120000, 8000, 12, 6, 'IC');
  assert.equal(Math.round(r.total), 81846);
  assert.ok(Math.abs(r.pctOfSalary - 68.2) < 0.1);
});

test('attritionCost: Manager role multiplier 1.5x → $90K lost productivity', () => {
  const ic = attritionCost(120000, 8000, 12, 6, 'IC');
  const mgr = attritionCost(120000, 8000, 12, 6, 'Manager');
  // Manager lost_productivity_cost = 90000 vs IC 60000
  assert.ok(mgr.total > ic.total);
  assert.equal(Math.round(mgr.lostProductivityCost), 90000);
});

test('attritionCost: 0 salary = 0% (safe division, recruiting still counted)', () => {
  const r = attritionCost(0, 8000, 12, 6, 'IC');
  assert.equal(r.pctOfSalary, 0);
  // ramp + lost productivity are 0 (no salary), recruiting still $8000
  assert.equal(r.rampCost, 0);
  assert.equal(r.lostProductivityCost, 0);
});

test('attritionCost: ramp_cost = (salary/52) * weeks * 0.5', () => {
  const r = attritionCost(120000, 0, 12, 0, 'IC');
  // 120000/52 * 12 * 0.5 = 2307.69 * 6 = 13846.15
  assert.equal(Math.round(r.rampCost), 13846);
});

test('attritionCost: recruiting_cost passed through', () => {
  const r = attritionCost(120000, 8000, 0, 0, 'IC');
  assert.equal(r.recruitingCost, 8000);
});

test('attritionCost: lost_productivity_cost = (salary/12) * months * multiplier', () => {
  const r = attritionCost(120000, 0, 0, 6, 'IC');
  assert.equal(r.lostProductivityCost, 60000);
});

test('calcHealthBand: 40 → excellent (≤50)', () => {
  assert.equal(calcHealthBand(40), 'excellent');
});

test('calcHealthBand: 68 → good (50-100)', () => {
  assert.equal(calcHealthBand(68), 'good');
});

test('calcHealthBand: 150 → warning (100-200)', () => {
  assert.equal(calcHealthBand(150), 'warning');
});

test('calcHealthBand: 250 → critical (>200)', () => {
  assert.equal(calcHealthBand(250), 'critical');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 50);
  assert.equal(HEALTH_BANDS.good.threshold, 100);
  assert.equal(HEALTH_BANDS.warning.threshold, 200);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});
