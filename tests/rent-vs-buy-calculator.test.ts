import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  monthlyPI,
  totalRentPaidSeries,
  opportunityGain,
  futureValue,
  netCostBuy,
  totalRentCost,
  verdict,
} from '../src/engines/real-estate/rent-vs-buy-calculator';

// Test 1: monthlyPI basic substep ($500K home, $100K down, 30y, 6.5%)
test('rent-vs-buy: monthlyPI basic', () => {
  const p = 400000;
  const r = 6.5 / 100 / 12;
  const m = monthlyPI(p, r, 360);
  assert.ok(Math.abs(m - 2528.27) < 1.0, `expected ~2528, got ${m.toFixed(2)}`);
});

// Test 2: totalRentPaidSeries geometric growth (5y at $2K/mo, 3% annual increase)
test('rent-vs-buy: totalRentPaidSeries 5y at $2K/mo 3%', () => {
  // geometric sum: monthlyRent * 12 * (1 - (1+g)^N) / (1 - (1+g)) = monthlyRent * 12 * ((1+g)^N - 1) / g
  // N = 5 years, g = 0.03, monthlyRent = 2000
  // = 24000 * (1.03^5 - 1) / 0.03 = 24000 * 0.15927 / 0.03 = $127,418
  const total = totalRentPaidSeries(2000, 3, 5);
  assert.ok(total > 125000 && total < 130000, `expected ~$127K, got $${total.toFixed(0)}`);
});

// Test 3: futureValue appreciation
test('rent-vs-buy: futureValue 3% over 7 years on $500K', () => {
  const fv = futureValue(500000, 3, 7);
  // 500000 * 1.03^7 = 500000 * 1.2299 = $614,946
  assert.ok(fv > 610000 && fv < 620000, `expected ~$614K, got $${fv.toFixed(0)}`);
});

// Test 4: netCostBuy basic (full pipeline, 30y horizon)
test('rent-vs-buy: netCostBuy basic 30y stay', () => {
  // $500K home, $100K down, 6.5%, 3% appreciation, 30y stay
  const result = netCostBuy({
    homePrice: 500000,
    downPayment: 100000,
    mortgageRate: 6.5,
    yearsToStay: 30,
    annualAppreciation: 3,
  });
  // Just confirm it's a positive finite number with reasonable magnitude
  assert.ok(result.netCostBuy > 0 && isFinite(result.netCostBuy),
    `netCostBuy should be positive finite, got ${result.netCostBuy}`);
});

// Test 5: totalRentCost basic (5y horizon at $2K/mo, 3% rent increase, $100K invested at 7%)
test('rent-vs-buy: totalRentCost 5y', () => {
  const result = totalRentCost({
    monthlyRent: 2000,
    annualRentIncrease: 3,
    downPayment: 100000,
    yearsToStay: 5,
  });
  // totalRentPaid ≈ $127K (from test 2)
  // opportunityGain ≈ 100000 * (1.07^5 - 1) ≈ $40,255
  // totalRentCost = 127418 - 40255 ≈ $87,163
  assert.ok(result.totalRentPaid > 125000 && result.totalRentPaid < 130000,
    `expected totalRentPaid ~$127K, got $${result.totalRentPaid.toFixed(0)}`);
  assert.ok(result.opportunityGain > 38000 && result.opportunityGain < 42000,
    `expected opportunityGain ~$40K, got $${result.opportunityGain.toFixed(0)}`);
  assert.ok(result.total > 80000 && result.total < 95000,
    `expected totalRentCost ~$87K, got $${result.total.toFixed(0)}`);
});

// Test 6: verdict BUY strongly favored (savings > 30000 = buying cheaper by >$30K)
test('rent-vs-buy: verdict BUY strongly favored (savings = +$50K)', () => {
  const v = verdict(50000);
  assert.match(v.label, /BUY/i);
  assert.equal(v.emoji, '🟢');
});

// Test 7: verdict RENT favored (savings < -30000 = renting cheaper by >$30K)
test('rent-vs-buy: verdict RENT favored (savings = -$50K)', () => {
  const v = verdict(-50000);
  assert.match(v.label, /RENT/i);
  assert.equal(v.emoji, '🟠');
});

// Test 8: verdict CLOSE (within ±$30K)
test('rent-vs-buy: verdict CLOSE within ±$30K', () => {
  const v = verdict(15000);
  assert.match(v.label, /CLOSE/i);
  assert.equal(v.emoji, '🟡');
});

// Test 9: sensitivity — appreciation +2pp shifts verdict
test('rent-vs-buy: appreciation +2pp reduces rentTotal vs buyNetCost gap', () => {
  const lowAppr = netCostBuy({
    homePrice: 500000,
    downPayment: 100000,
    mortgageRate: 6.5,
    yearsToStay: 10,
    annualAppreciation: 1,
  });
  const highAppr = netCostBuy({
    homePrice: 500000,
    downPayment: 100000,
    mortgageRate: 6.5,
    yearsToStay: 10,
    annualAppreciation: 3,
  });
  // Higher appreciation makes buying cheaper (smaller netCostBuy)
  assert.ok(highAppr.netCostBuy < lowAppr.netCostBuy,
    `high appreciation should reduce netCostBuy: ${highAppr.netCostBuy} vs ${lowAppr.netCostBuy}`);
});
