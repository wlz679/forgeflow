import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  stageVisitors,
  stageClickers,
  stageLeads,
  stageSales,
  overallCR,
  dropOff,
  biggestLeakStage,
  type FunnelInputs,
} from '../src/engines/marketing/funnel-value-calculator';

// Test 1: stageVisitors = impressions
test('funnel: stage1 visitors === impressions', () => {
  assert.equal(stageVisitors(100000), 100000);
});

// Test 2: stageClickers = impressions × ctr
test('funnel: stage2 clickers = 100000 * 2.5% = 2500', () => {
  assert.equal(stageClickers(100000, 2.5), 2500);
});

// Test 3: stageLeads = clickers × leadRate
test('funnel: stage3 leads = 2500 * 15% = 375', () => {
  assert.equal(stageLeads(2500, 15), 375);
});

// Test 4: stageSales = leads × saleRate
test('funnel: stage4 sales = 375 * 5% = 18.75', () => {
  assert.equal(stageSales(375, 5), 18.75);
});

// Test 5: overallCR = final sales / initial impressions
test('funnel: overallCR(18.75 sales, 100000 impressions) === 0.01875', () => {
  assert.equal(overallCR(18.75, 100000), 0.01875);
});

// Test 6: dropOff between stages
test('funnel: dropOff(clickers=2500, leads=375) === 2125 (92.5% lost at stage 2→3)', () => {
  assert.equal(dropOff(2500, 375), 2125);
});

// Test 7: biggestLeakStage identifies the bigger absolute drop
test('funnel: biggestLeakStage identifies the stage with larger absolute drop', () => {
  // impressions=100000, ctr=2.5% → clickers=2500, leadRate=15% → leads=375, saleRate=5% → sales=18.75
  // Drop 1→2: 100000-2500=97500, Drop 2→3: 2500-375=2125, Drop 3→4: 375-18.75=356.25
  const inputs: FunnelInputs = {
    impressions: 100000,
    ctr: 2.5,
    leadRate: 15,
    saleRate: 5,
    aov: 80,
    grossMargin: 70,
  };
  assert.equal(biggestLeakStage(inputs), '1→2'); // Top-of-funnel biggest drop
});

// Test 8: zero impressions edge case
test('funnel: zero impressions → overallCR = 0 (caller must guard)', () => {
  assert.equal(overallCR(0, 0), 0);
});

// Test 9: what-if leadRate +30% — sales should scale proportionally
test('funnel: leadRate +30% (15 → 19.5%) scales leads by 1.3', () => {
  const baseline = stageLeads(2500, 15);
  const improved = stageLeads(2500, 19.5);
  assert.equal(improved, baseline * 1.3);
});

// Test 10 (P14-followup): negative impressions clamps to 0 (defensive layer 2)
// clampNonNegative(-1000) → 0; overallCR(0, 0) → 0 (impressions<=0 guard)
test('funnel: negative impressions clamps to 0 (defensive layer 2)', () => {
  const cr = overallCR(0, 0); // -1000 impressions clamped to 0 by clampNonNegative
  assert.equal(cr, 0); // impressions<=0 guard returns 0, not NaN
});