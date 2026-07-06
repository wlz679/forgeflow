import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  zScore,
  leadTimeDemand,
  safetyStock,
  reorderPoint,
  calcHealthBand,
} from '../src/engines/operations/reorder-point-calculator.ts';

test('zScore: 95% → 1.65, 90% → 1.28, 99% → 2.33, unknown → 1.65', () => {
  assert.equal(zScore(95), 1.65);
  assert.equal(zScore(90), 1.28);
  assert.equal(zScore(99), 2.33);
  assert.equal(zScore(85), 1.65); // unknown defaults to 1.65
});

test('leadTimeDemand: 50 units/day × 14 days = 700', () => {
  assert.equal(leadTimeDemand(50, 14), 700);
});

test('safetyStock: Z=1.65, sd=10, lt=14, rp=7 → 1.65 × 10 × √(14/7) ≈ 23.34', () => {
  assert.ok(Math.abs(safetyStock(1.65, 10, 14, 7) - 23.34) < 0.01);
});

test('reorderPoint: lead-time 700 + safety 23.34 = 723.34', () => {
  assert.ok(Math.abs(reorderPoint(700, 23.34) - 723.34) < 0.01);
});

test('zero std dev: safetyStock = 0, reorderPoint = leadTimeDemand', () => {
  assert.equal(safetyStock(1.65, 0, 14, 7), 0);
  assert.equal(reorderPoint(700, 0), 700);
});

test('zero lead time: reorderPoint = 0 (via leadTimeDemand = 0)', () => {
  assert.equal(leadTimeDemand(50, 0), 0);
  assert.equal(reorderPoint(0, 0), 0);
});

test('calcHealthBand: boundaries 95→excellent, 90→good, 85→warning, 80→critical', () => {
  assert.equal(calcHealthBand(95), 'excellent');
  assert.equal(calcHealthBand(90), 'good');
  assert.equal(calcHealthBand(85), 'warning');
  assert.equal(calcHealthBand(80), 'critical');
});

test('calcHealthBand: typical 99→excellent, 92→good, 87→warning, 50→critical', () => {
  assert.equal(calcHealthBand(99), 'excellent');
  assert.equal(calcHealthBand(92), 'good');
  assert.equal(calcHealthBand(87), 'warning');
  assert.equal(calcHealthBand(50), 'critical');
});