/**
 * P4-3 SAFE / Convertible Note Calculator — math layer tests.
 * Covers: capPrice + safeSharesAtCap (post-money SAFE convention),
 *         discountPrice, conversionPrice (min of cap/discount),
 *         safeOwnership, dealHealth, discountHealth.
 * Run via: node --import tsx --test tests/safe-convertible.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  safeSharesAtCap,
  capPrice,
  discountPrice,
  conversionPrice,
  safeOwnership,
  dealHealth,
  discountHealth,
  safeType,
} from '../src/engines/valuation/safe-convertible-note-calculator.ts';

test('post-money SAFE basic: $500K on $5M cap with 1M shares → 10% SAFE ownership', () => {
  // Standard YC post-money SAFE: $5M cap, $500K investment, 1M existing shares
  // Math: capPrice = ($5M - $500K) / 1M = $4.50, SAFE shares = $500K / $4.50 = 111,111
  // SAFE ownership = 111,111 / 1,111,111 = 10%
  const shares = safeSharesAtCap(500000, 5000000, 1000000);
  assert.equal(Math.round(shares), 111111);
  const price = capPrice(5000000, 5000000 - 500000, 1000000);
  assert.equal(price, 4.5);
  const own = safeOwnership(shares, 1000000);
  assert.equal(Math.round(own * 1000) / 1000, 0.1); // 10% with floating-point tolerance
});

test('discount governs: $500K on $5M cap with 20% discount, next round at $5M', () => {
  // discountPrice = $5M / 1M × 0.8 = $4.00 (per share)
  // capPrice = $4.50 (from test 1)
  // conversionPrice = min($4.00, $4.50) = $4.00 (DISCOUNT GOVERNS)
  // shares = $500K / $4.00 = 125,000
  // SAFE ownership = 125,000 / 1,125,000 = 11.1%
  const dp = discountPrice(5000000, 1000000, 20);
  assert.equal(dp, 4.0);
  const cp = capPrice(5000000, 5000000 - 500000, 1000000);
  assert.equal(cp, 4.5);
  const cvp = conversionPrice(cp, dp);
  assert.equal(cvp, 4.0); // discount governs
  const shares = 500000 / cvp;
  const own = safeOwnership(shares, 1000000);
  assert.equal(Math.round(own * 10000) / 10000, 0.1111);
});

test('cap dominates: $500K on $5M cap with 20% discount, next round at $10M', () => {
  // discountPrice = $10M / 1M × 0.8 = $8.00
  // capPrice = $4.50
  // conversionPrice = min($4.50, $8.00) = $4.50 (CAP GOVERNS)
  const dp = discountPrice(10000000, 1000000, 20);
  assert.equal(dp, 8.0);
  const cp = capPrice(5000000, 5000000 - 500000, 1000000);
  assert.equal(cp, 4.5);
  const cvp = conversionPrice(cp, dp);
  assert.equal(cvp, 4.5); // cap governs
});

test('discount dominates with very high cap: $500K on $50M cap with 20% discount, next round at $5M', () => {
  // capPrice = ($50M - $500K) / 1M = $49.50 (very high)
  // discountPrice = $5.00
  // conversionPrice = min($49.50, $5.00) = $5.00 (DISCOUNT GOVERNS via next round, not cap)
  const cp = capPrice(50000000, 50000000 - 500000, 1000000);
  assert.equal(Math.round(cp * 100) / 100, 49.5);
  const dp = discountPrice(5000000, 1000000, 20);
  assert.equal(dp, 4.0);
  const cvp = conversionPrice(cp, dp);
  assert.equal(cvp, 4.0);
});

test('edge case: cap equals investment returns 0 capPrice', () => {
  // $5M investment, $5M cap → capPrice is undefined (divide by zero in formula)
  // Behavior: return 0 for capPrice, so calculate() can show error
  const price = capPrice(5000000, 5000000 - 5000000, 1000000); // effectivePreMoney = 0
  assert.equal(price, 0); // sentinel; calculate() handles this case explicitly
});

test('dealHealth: 10:1 cap-to-investment ratio is 🟡 standard', () => {
  const h = dealHealth(10); // $5M / $500K = 10
  assert.equal(h.emoji, '🟡');
  assert.ok(h.label.toLowerCase().includes('standard'));
});

test('discountHealth: 0% discount is 🟢 no discount (post-money standard)', () => {
  const h = discountHealth(0);
  assert.equal(h.emoji, '🟢');
  assert.ok(h.label.toLowerCase().includes('no discount'));
});

test('safeType: 0% discount with cap → "Post-Money SAFE (YC Standard)"', () => {
  const t = safeType(5000000, 0);
  assert.equal(t, 'Post-Money SAFE (YC Standard)');
});

test('safeType: 20% discount with cap → "Post-Money SAFE with Discount"', () => {
  const t = safeType(5000000, 20);
  assert.equal(t, 'Post-Money SAFE with Discount');
});
