/**
 * P4-2 Stripe Fee Calculator — math layer tests.
 * Covers: calculateFee (5 providers × key scenarios), projectVolume,
 *         compareProviders ordering, feeHealth thresholds.
 * Run via: node --import tsx --test tests/stripe-fee.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  calculateFee,
  projectVolume,
  compareProviders,
  feeHealth,
  type Provider,
} from '../src/engines/valuation/stripe-fee-calculator.ts';

test('calculateFee: Stripe US standard fee on $100 charge', () => {
  // Stripe US = 2.9% + 30¢ → $2.90 + $0.30 = $3.20 fee, $96.80 net
  const result = calculateFee(100, 'stripe');
  assert.equal(Math.round(result.percentageFee * 100) / 100, 2.9);
  assert.equal(result.fixedFee, 0.3);
  assert.equal(Math.round(result.totalFee * 100) / 100, 3.2);
  assert.equal(Math.round(result.netReceived * 100) / 100, 96.8);
  assert.equal(Math.round(result.effectiveRate * 10000) / 10000, 0.032);
});

test('calculateFee: PayPal has no fixed fee on $100 charge', () => {
  // PayPal = 3.5% flat → $3.50 fee, $96.50 net
  const result = calculateFee(100, 'paypal');
  assert.equal(result.fixedFee, 0);
  assert.equal(Math.round(result.totalFee * 100) / 100, 3.5);
  assert.equal(Math.round(result.netReceived * 100) / 100, 96.5);
});

test('calculateFee: Wise lowest rate on $1000 charge', () => {
  // Wise = 1.5% flat → $15.00 fee, $985.00 net
  const result = calculateFee(1000, 'wise');
  assert.equal(result.fixedFee, 0);
  assert.equal(Math.round(result.totalFee * 100) / 100, 15);
  assert.equal(Math.round(result.netReceived * 100) / 100, 985);
});

test('calculateFee: Stripe International surcharge on $100 charge', () => {
  // Stripe Intl = 2.9% + 1.5% + 30¢ = 4.4% + 30¢ → $4.40 + $0.30 = $4.70 fee
  const result = calculateFee(100, 'stripe-international');
  assert.equal(Math.round(result.percentageFee * 100) / 100, 4.4);
  assert.equal(result.fixedFee, 0.3);
  assert.equal(Math.round(result.totalFee * 100) / 100, 4.7);
  assert.equal(Math.round(result.netReceived * 100) / 100, 95.3);
});

test('calculateFee + feeHealth: small charge ($1) hits 🔴 fixed-fee-dominance warning', () => {
  // Stripe on $1: 2.9% = $0.029 + $0.30 = $0.329, effective rate 32.9% (way above 4% threshold)
  const result = calculateFee(1, 'stripe');
  const health = feeHealth(result.effectiveRate, 1);
  assert.equal(Math.round(result.totalFee * 1000) / 1000, 0.329);
  assert.equal(health.emoji, '🔴');
  assert.ok(health.label.toLowerCase().includes('fixed fee'));
});

test('projectVolume: 100 transactions × $100 = $10K gross, $320 fees', () => {
  // Stripe on $100 × 100/mo → $10K gross, $320 monthly fees, $9,680 net
  const result = projectVolume(100, 'stripe', 100);
  assert.equal(result.monthly.gross, 10000);
  assert.equal(Math.round(result.monthly.fees * 100) / 100, 320);
  assert.equal(Math.round(result.monthly.net * 100) / 100, 9680);
  assert.equal(result.yearly.gross, 120000);
});

test('projectVolume: zero transactions returns zero projection', () => {
  // Edge case: monthlyTransactions = 0 skips batch projection
  const result = projectVolume(100, 'stripe', 0);
  assert.equal(result.monthly.gross, 0);
  assert.equal(result.monthly.fees, 0);
  assert.equal(result.monthly.net, 0);
});

test('compareProviders: returns 5 providers sorted by total fee ascending', () => {
  // For $100: wise ($1.50) < square ($2.70) < stripe ($3.20) < paypal ($3.50) < stripe-international ($4.70)
  const rows = compareProviders(100);
  assert.equal(rows.length, 5);
  // Ascending fee (property must hold for the function to be correct)
  for (let i = 0; i < rows.length - 1; i++) {
    assert.ok(rows[i].fee.totalFee <= rows[i + 1].fee.totalFee);
  }
  // Wise is always cheapest (1.5% lowest base rate)
  assert.equal(rows[0].provider, 'wise');
  // Stripe-international is always most expensive (4.4% + 30¢)
  assert.equal(rows[4].provider, 'stripe-international');
});

// Defensive test (P16-5 Layer 2): negative inputs clamp to 0
test('stripe-fee: negative inputs clamp to 0 (defensive layer 2)', () => {
  const { getEngine } = require('../src/core/engines/registry.ts');
  const engine = getEngine('solopreneur-stripe-fee-calculator');
  assert.ok(engine);
  const r = engine!.generate({
    chargeAmount: '-100',
    monthlyTransactions: '-50',
    provider: 'stripe',
    internationalCards: 'no',
  });
  assert.ok(Array.isArray(r));
  assert.ok(r.length > 0);
  // No negative money values (chargeAmount should be 0 → early return message)
  const hasNegativeMoney = /-\$\d|\$-[1-9]/.test(r.join('\n'));
  assert.ok(!hasNegativeMoney, 'output contains negative money: ' + (r.join('\n').match(/-\$\d|\$-[1-9]/) || []).join(','));
});
