import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  stageValue, totalPipeline, nominalPipeline, weightedForecast, calcHealthBand,
} from '../src/engines/sales/pipeline-value-calculator.ts';

test('stageValue: discovery 10×$15K×0.20 = $30K', () => {
  assert.equal(stageValue(10, 15000, 0.20), 30000);
});

test('totalPipeline: canonical $30K+$50K+$63K+$72K = $215K', () => {
  assert.equal(totalPipeline(30000, 50000, 63000, 72000), 215000);
});

test('calcHealthBand: 49999 → critical', () => {
  assert.equal(calcHealthBand(49999), 'critical');
});

test('calcHealthBand: 50000 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(50000), 'warning');
});

test('calcHealthBand: 200000 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(200000), 'good');
});

test('calcHealthBand: 500000 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(500000), 'excellent');
});

test('totalPipeline: all-zero → 0 (critical)', () => {
  assert.equal(totalPipeline(0, 0, 0, 0), 0);
});

test('totalPipeline: single stage only 30K', () => {
  assert.equal(totalPipeline(30000, 0, 0, 0), 30000);
});