import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcROAS,
  calcNetROAS,
  calcNetProfit,
  effectiveCPMPer1000,
} from '../src/engines/marketing/roas-calculator';

// Test 1: calcROAS canonical case ($20K revenue / $5K spend = 4.0x)
test('roas: 5000 ad spend / 20000 revenue → 4.0x gross ROAS', () => {
  assert.equal(calcROAS(5000, 20000), 4.0);
});

// Test 2: calcNetROAS canonical (5000 / 20000 / 60% margin → 140% net margin)
test('roas: net ROAS = ((rev*margin - spend) / spend) * 100', () => {
  const net = calcNetROAS(5000, 20000, 60);
  // (20000*0.6 - 5000)/5000 * 100 = (12000 - 5000)/5000 * 100 = 140
  assert.ok(Math.abs(net - 140) < 0.01, `expected ~140, got ${net.toFixed(2)}`);
});

// Test 3: losing-money case (ROAS < 1.0 → 🔴)
test('roas: spend > revenue (10000 spend, 5000 revenue) → 0.5x ROAS (losing money)', () => {
  assert.equal(calcROAS(10000, 5000), 0.5);
});

// Test 4: zero spend edge → Infinity (engine handles gracefully via tip)
test('roas: adSpend=0 → calcROAS returns Infinity (must be guarded by calculate())', () => {
  assert.equal(calcROAS(0, 1000), Infinity);
});

// Test 5: effectiveCPMPer1000 sanity
test('roas: effectiveCPM (per $1K revenue) = 5000 spend / 20000 revenue * 1000 = 250', () => {
  const cpm = effectiveCPMPer1000(5000, 20000);
  assert.ok(Math.abs(cpm - 250) < 0.01, `expected 250, got ${cpm.toFixed(2)}`);
});

// Test 6: calcNetProfit canonical
test('roas: netProfit(rev*margin - spend) = 20000*0.6 - 5000 = 7000', () => {
  const np = calcNetProfit(5000, 20000, 60);
  assert.ok(Math.abs(np - 7000) < 0.01, `expected 7000, got ${np.toFixed(2)}`);
});

// Test 7 (P14-followup): negative adSpend clamps to 0 (defensive layer 2)
// clampNonNegative(-5000) → 0; calcROAS(0, 1000) → Infinity (not negative ratio)
test('roas: negative adSpend clamps to 0 (defensive layer 2)', () => {
  const ratio = calcROAS(0, 1000); // -5000 clamped to 0 by clampNonNegative
  assert.equal(ratio, Infinity); // 0 adSpend triggers Infinity guard, not negative ratio
});
