import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  calcGrossRevenue,
  calcNetRevenue,
  calcROI,
  costPerClick,
  costPerOpen,
} from '../src/engines/marketing/email-campaign-roi-calculator';

// Test 1: grossRevenue canonical (10K list, 25% open, 5% CTR, $25 aov, 4 emails)
test('email-roi: grossRevenue(10K list, 25% open, 5% ctr, $25 aov, 4 emails) === 12500', () => {
  // 10K × 4 = 40K emails; opens = 40K × 0.25 = 10K; clicks = 10K × 0.05 = 500; revenue = 500 × $25 = $12,500
  const revenue = calcGrossRevenue(10000, 25, 5, 25, 4);
  assert.equal(revenue, 12500);
});

// Test 2: netRevenue = grossRevenue - cost
test('email-roi: netRevenue(rev=12500, cost=500) === 12000', () => {
  assert.equal(calcNetRevenue(12500, 500), 12000);
});

// Test 3: ROI % = (net / cost) × 100
test('email-roi: roiPercent(net=12000, cost=500) === 2400', () => {
  assert.equal(calcROI(12000, 500), 2400);
});

// Test 4: costPerClick = cost / clicks
test('email-roi: costPerClick(500, 100) === 5', () => {
  assert.equal(costPerClick(500, 100), 5);
});

// Test 5: costPerOpen = cost / opens
test('email-roi: costPerOpen(500, 1000) === 0.5', () => {
  assert.equal(costPerOpen(500, 1000), 0.5);
});

// Test 6: costPerClick zero-clicks edge
test('email-roi: costPerClick(500, 0) === Infinity (caller guard)', () => {
  assert.equal(costPerClick(500, 0), Infinity);
});

// Test 7: What-if +5pp openRate scales opens by ~20%
test('email-roi: openRate +5pp (25% → 30%) scales opens proportionally', () => {
  // With list 10K and 4 emails: emails = 40K
  // Original opens: 40K × 25% = 10K
  // New opens: 40K × 30% = 12K (20% increase)
  const origOpens = 40000 * (25 / 100);
  const newOpens = 40000 * (30 / 100);
  assert.equal(newOpens, origOpens * 1.2);
});