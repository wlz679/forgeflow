import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  totalHandleMin,
  productiveMinPerAgent,
  requiredAgentsRaw,
  requiredAgents,
  utilizationActual,
  calcHealthBand,
  HEALTH_BANDS,
} from '../src/engines/customer-support/support-capacity-planning-calculator.ts';

test('totalHandleMin: 5000 × 18 = 90000', () => {
  assert.equal(totalHandleMin(5000, 18), 90000);
});

test('productiveMinPerAgent: 160 × 60 × 0.7 × 0.7 = 4704', () => {
  assert.equal(productiveMinPerAgent(160, 30, 70), 4704);
});

test('productiveMinPerAgent: 100% occupancy + 0% shrink = 9600', () => {
  assert.equal(productiveMinPerAgent(160, 0, 100), 9600);
});

test('requiredAgentsRaw: 90000 / 4704 = 19.13', () => {
  const r = requiredAgentsRaw(90000, 4704);
  assert.ok(Math.abs(r - 19.13) < 0.01, `expected ~19.13, got ${r}`);
});

test('requiredAgents: ceil(19.13) = 20', () => {
  assert.equal(requiredAgents(90000, 4704), 20);
});

test('utilizationActual: 90000 / (20 × 4704) × 100 = 95.66%', () => {
  const u = utilizationActual(90000, 4704, 20);
  assert.ok(Math.abs(u - 95.66) < 0.1, `expected ~95.66, got ${u}`);
});

test('utilizationActual: exact headcount match → 100%', () => {
  assert.equal(utilizationActual(9408, 4704, 2), 100);
});

test('utilizationActual: 0 agents → Infinity', () => {
  assert.equal(utilizationActual(90000, 4704, 0), Infinity);
});

test('calcHealthBand: 70 → excellent (≤85)', () => {
  assert.equal(calcHealthBand(70), 'excellent');
});

test('calcHealthBand: 95.7 → good', () => {
  assert.equal(calcHealthBand(95.7), 'good');
});

test('calcHealthBand: 110 → warning', () => {
  assert.equal(calcHealthBand(110), 'warning');
});

test('calcHealthBand: 130 → critical', () => {
  assert.equal(calcHealthBand(130), 'critical');
});

test('HEALTH_BANDS has 4 INVERSE thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 85);
  assert.equal(HEALTH_BANDS.good.threshold, 100);
  assert.equal(HEALTH_BANDS.warning.threshold, 120);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});