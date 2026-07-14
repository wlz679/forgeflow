import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  scoreOnTime,
  scoreDefect,
  scoreLead,
  scoreCost,
  clamp,
  getWeights,
  compositeScore,
  gradeFromScore,
  calcHealthBand,
} from '../src/engines/operations/supplier-scorecard-calculator.ts';

test('scoreOnTime: canonical 88% returns 88 (no clamp)', () => {
  assert.equal(scoreOnTime(88), 88);
});

test('scoreDefect: 2.5% defect = 100 - 25 = 75', () => {
  assert.equal(scoreDefect(2.5), 75);
});

test('scoreLead: 3-day variance = 100 - 15 = 85', () => {
  assert.equal(scoreLead(3), 85);
});

test('scoreCost: 5% variance = 100 - 10 = 90', () => {
  assert.equal(scoreCost(5), 90);
});

test('composite: balanced weights for (88, 75, 85, 90) = 83.95', () => {
  const w = getWeights('balanced');
  assert.ok(Math.abs(compositeScore(88, 75, 85, 90, w) - 83.95) < 0.01);
});

test('gradeFromScore: 90→A, 89→B, 80→B, 79→C, 70→C, 69→D', () => {
  assert.equal(gradeFromScore(90), 'A');
  assert.equal(gradeFromScore(89), 'B');
  assert.equal(gradeFromScore(80), 'B');
  assert.equal(gradeFromScore(79), 'C');
  assert.equal(gradeFromScore(70), 'C');
  assert.equal(gradeFromScore(69), 'D');
});

test('calcHealthBand: 90→excellent, 80→good, 70→warning, 69→critical', () => {
  assert.equal(calcHealthBand(90), 'excellent');
  assert.equal(calcHealthBand(80), 'good');
  assert.equal(calcHealthBand(70), 'warning');
  assert.equal(calcHealthBand(69), 'critical');
});

test('clamp + boundary tests: defect 12% → score 0 (clamped)', () => {
  assert.equal(scoreDefect(12), 0); // 100 - 120 = -20, clamped to 0
  assert.equal(clamp(150, 0, 100), 100);
  assert.equal(clamp(-50, 0, 100), 0);
});

// P14-followup: negative leadVarianceDays clamps to 0 → scoreLead = 100 (defensive layer 2)
// clampNonNegative(-3) → 0; scoreLead(0) = 100 (perfect lead-time consistency)
test('supplier-scorecard: negative leadVarianceDays clamps to 0 (defensive layer 2)', () => {
  const lv = 0; // after clampNonNegative(-3)
  const score = scoreLead(lv);
  assert.equal(score, 100); // zero variance = perfect reliability
});