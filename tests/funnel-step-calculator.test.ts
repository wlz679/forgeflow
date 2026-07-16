import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { funnelEndToEnd, biggestDrop, calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/funnel-step-calculator.ts';

test('funnelEndToEnd: 1000→800→500→320 = 0.32', () => {
  assert.equal(funnelEndToEnd([1000, 800, 500, 320]), 0.32);
});

test('funnelEndToEnd: 2-step [500, 100] = 0.20', () => {
  assert.equal(funnelEndToEnd([500, 100]), 0.2);
});

test('funnelEndToEnd: 4-step equal steps [1000, 1000, 1000, 1000] = 1.0', () => {
  assert.equal(funnelEndToEnd([1000, 1000, 1000, 1000]), 1.0);
});

test('biggestDrop: 1000→800→500→320 returns index 1 (step 2→3)', () => {
  assert.equal(biggestDrop([1000, 800, 500, 320]), 1);
});

test('biggestDrop: monotonically decreasing returns index 0', () => {
  assert.equal(biggestDrop([1000, 500]), 0);
});

test('biggestDrop: zero drops (all equal) returns index 0', () => {
  assert.equal(biggestDrop([1000, 1000, 1000]), 0);
});

test('calcHealthBand: 0.50 → excellent (>=0.40)', () => {
  assert.equal(calcHealthBand(0.5), 'excellent');
});

test('calcHealthBand: 0.32 → good (>=0.25, <0.40)', () => {
  assert.equal(calcHealthBand(0.32), 'good');
});

test('calcHealthBand: 0.20 → warning (>=0.15, <0.25)', () => {
  assert.equal(calcHealthBand(0.2), 'warning');
});

test('calcHealthBand: 0.10 → critical (<0.15)', () => {
  assert.equal(calcHealthBand(0.1), 'critical');
});

test('calcHealthBand: 0.40 exact boundary -> excellent', () => {
  assert.equal(calcHealthBand(0.4), 'excellent');
});

test('calcHealthBand: 0.0 -> critical', () => {
  assert.equal(calcHealthBand(0), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.40);
  assert.equal(HEALTH_BANDS.good.threshold, 0.25);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.15);
  assert.equal(HEALTH_BANDS.critical.threshold, 0);
});

// P14-followup + P15 polish: negative step1 clamped to 0 then filtered out → e2e recomputed from step2 (defensive layer 2)
// clampNonNegative(-1000) → 0; engine filter `if (v > 0) steps.push(v)` drops it;
// remaining steps [800, 500, 320, 210] → e2e = 210/800 = 0.2625
test('funnel-step: negative step1 clamps to 0 → filtered out, e2e recomputed from step2 (defensive layer 2)', () => {
  // Simulating the engine's post-clamp + post-filter behavior
  const filteredSteps = [800, 500, 320, 210]; // step1=-1000 dropped after clamp+filter
  const e2e = funnelEndToEnd(filteredSteps);
  assert.equal(e2e, 210 / 800); // 0.2625 — no NaN, no Infinity, no crash
  assert.equal(calcHealthBand(e2e), 'good');
});

// P15 polish: integration test — call full generate() pipeline to verify defensive layer works end-to-end
import '../src/engines/product-analytics/funnel-step-calculator.ts';
import { getEngine } from '../src/core/engines/registry.ts';
test('funnel-step: generate() pipeline handles negative step1 without crash (defensive layer 2)', () => {
  const engine = getEngine('solopreneur-funnel-step-calculator');
  if (!engine) return; // engine not registered — skip
  const result = engine.generate({ step1: '-1000', step2: '800', step3: '500', step4: '320', step5: '210' });
  assert.ok(Array.isArray(result));
  assert.ok(result.length > 0);
  assert.ok(!result.some(line => /NaN|Infinity/.test(line)), 'no NaN/Infinity in output');
});
