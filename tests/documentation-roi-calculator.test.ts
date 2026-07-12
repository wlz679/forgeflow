import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { grossSavings, netROI, costPerArticle, calcHealthBand, HEALTH_BANDS } from '../src/engines/knowledge/documentation-roi-calculator.ts';

// Canonical: kbCost=15000, deflected=1750, costPer=24, articles=500, target=500
// → gross=42000, net=27000, roi=180%, band='good', cost/article=$30
test('canonical: gross=42000, net=27000, roi=180%, band=good, cost/article=30', () => {
  const gross = grossSavings(1750, 24);
  assert.equal(gross, 42000);
  const net = gross - 15000;
  assert.equal(net, 27000);
  const roiDec = netROI(gross, 15000);
  assert.equal(roiDec * 100, 180);
  const costPerArt = costPerArticle(15000, 500);
  assert.equal(costPerArt, 30);
  assert.equal(calcHealthBand(roiDec * 100, costPerArt), 'good');
});

test('grossSavings: deflected × costPer', () => {
  assert.equal(grossSavings(1750, 24), 42000);
  assert.equal(grossSavings(0, 24), 0);
  assert.equal(grossSavings(2500, 24), 60000);
});

test('netROI: (gross - kbCost) / kbCost decimal', () => {
  assert.equal(netROI(42000, 15000), 1.8); // 180%
  assert.equal(netROI(75000, 15000), 4.0); // 400%
  assert.equal(netROI(30000, 15000), 1.0); // 100%
});

test('netROI: zero kb_cost guard → -Infinity', () => {
  assert.equal(netROI(42000, 0), -Infinity);
});

test('costPerArticle: zero articles guard → Infinity', () => {
  assert.equal(costPerArticle(15000, 0), Infinity);
  assert.equal(costPerArticle(15000, 500), 30);
});

test('calcHealthBand: ROI 400% AND cost/article $30 → excellent (dual-condition met)', () => {
  // gross=75000, kbCost=15000, net=60000, roi=400%, cost/article=30
  assert.equal(calcHealthBand(400, 30), 'excellent');
});

test('calcHealthBand: ROI 400% but cost/article $60 → good (dual-condition fails)', () => {
  // e.g. kbCost=6000, articles=100 → cost/article=60; ROI still 400%
  assert.equal(calcHealthBand(400, 60), 'good');
});

test('calcHealthBand: ROI 150% boundary → good', () => {
  assert.equal(calcHealthBand(150, 30), 'good');
});

test('calcHealthBand: ROI 50% boundary → warning', () => {
  assert.equal(calcHealthBand(50, 30), 'warning');
});

test('calcHealthBand: ROI <50% (negative savings) → critical', () => {
  assert.equal(calcHealthBand(-40, 30), 'critical');
  assert.equal(calcHealthBand(-Infinity, Infinity), 'critical');
});

test('HEALTH_BANDS has 4 bands with locked threshold decimals', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 4.0);
  assert.equal(HEALTH_BANDS.good.threshold, 1.5);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.5);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});
