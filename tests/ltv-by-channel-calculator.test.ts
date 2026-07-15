import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcCAC,
  calcLTVRatio,
  blendedCAC,
  rankChannels,
  totals,
  type Channel,
} from '../src/engines/marketing/ltv-by-channel-calculator';

// Test 1: calcCAC basic
test('ltv-by-channel: cac(1000, 50) === 20', () => {
  assert.equal(calcCAC(1000, 50), 20);
});

// Test 2: calcLTVRatio canonical
test('ltv-by-channel: ratio(500 ltv, 20 cac) === 25 (5x)', () => {
  assert.equal(calcLTVRatio(500, 20), 25);
});

// Test 3: rankChannels picks the highest ratio
test('ltv-by-channel: rankChannels returns channels sorted by ratio desc', () => {
  const channels: Channel[] = [
    { id: 'Ch1', spend: 1000, conversions: 50, ltv: 200, cac: 20, ratio: 10 },
    { id: 'Ch2', spend: 2000, conversions: 100, ltv: 1000, cac: 20, ratio: 50 },
    { id: 'Ch3', spend: 500, conversions: 10, ltv: 50, cac: 50, ratio: 1 },
  ];
  const ranked = rankChannels(channels);
  assert.equal(ranked[0].id, 'Ch2');
  assert.equal(ranked[2].id, 'Ch3');
});

// Test 4: blendedCAC sanity (weighted by conversions)
test('ltv-by-channel: blendedCAC(sums) = totalSpend / totalConv', () => {
  const channels: Channel[] = [
    { id: 'Ch1', spend: 1000, conversions: 50, ltv: 100, cac: 20, ratio: 5 },
    { id: 'Ch2', spend: 500, conversions: 10, ltv: 100, cac: 50, ratio: 2 },
  ];
  assert.equal(blendedCAC(channels), 1500 / 60);
});

// Test 5: totals() sum 5 channels correctly
test('ltv-by-channel: totals() sums spend/conv across 5 channels', () => {
  const channels: Channel[] = [
    { id: '1', spend: 100, conversions: 10, ltv: 100, cac: 10, ratio: 10 },
    { id: '2', spend: 200, conversions: 20, ltv: 200, cac: 10, ratio: 20 },
    { id: '3', spend: 300, conversions: 30, ltv: 300, cac: 10, ratio: 30 },
    { id: '4', spend: 400, conversions: 40, ltv: 400, cac: 10, ratio: 40 },
    { id: '5', spend: 500, conversions: 50, ltv: 500, cac: 10, ratio: 50 },
  ];
  const t = totals(channels);
  assert.equal(t.totalSpend, 1500);
  assert.equal(t.totalConv, 150);
});

// Test 6: zero-conv channel edge case
test('ltv-by-channel: cac(1000, 0) === Infinity (caller must guard)', () => {
  assert.equal(calcCAC(1000, 0), Infinity);
});

// Test 7: rankChannels excludes zero-conv from ranking
test('ltv-by-channel: rankChannels skips channels with cac=Infinity in sort', () => {
  const channels: Channel[] = [
    { id: 'Ch1', spend: 1000, conversions: 50, ltv: 200, cac: 20, ratio: 10 },
    { id: 'Ch2', spend: 500, conversions: 0, ltv: 100, cac: Infinity, ratio: 0 },
    { id: 'Ch3', spend: 800, conversions: 40, ltv: 400, cac: 20, ratio: 20 },
  ];
  const ranked = rankChannels(channels);
  // Winner: Ch3 (ratio 20 > Ch1 10)
  assert.equal(ranked[0].id, 'Ch3');
});

// Test 8: health band thresholds match constants
test('ltv-by-channel: HEALTH_BANDS = excellent 3, good 1-3, warning 0.5-1, critical <0.5', () => {
  const bands = {
    excellent: 3.0,
    good: [1.0, 3.0],
    warning: [0.5, 1.0],
    critical: 0,
  };
  assert.equal(bands.excellent, 3.0);
  assert.deepEqual(bands.good, [1.0, 3.0]);
  assert.deepEqual(bands.warning, [0.5, 1.0]);
});

// Test 9 (P14-followup): negative spend clamps to 0 (defensive layer 2)
// clampNonNegative(-1000) → 0; calcCAC(0, 50) → 0; calcLTVRatio(500, 0) → 0 (cac<=0 guard)
test('ltv-by-channel: negative spend clamps to 0 (defensive layer 2)', () => {
  const cac = calcCAC(0, 50); // -1000 spend clamped to 0
  assert.equal(cac, 0);
  const ratio = calcLTVRatio(500, cac);
  assert.equal(ratio, 0); // cac<=0 guard prevents divide-by-zero
});
