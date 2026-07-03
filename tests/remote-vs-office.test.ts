/**
 * P4-5 Remote vs In-Office Cost Calculator — math layer tests.
 * Covers: officeAnnualCost, remoteAnnualCost, hybridAnnualCost,
 *         productivityAdjustedRemote, decisionHealth, perPersonSavings.
 * Run via: node --import tsx --test tests/remote-vs-office.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  officeAnnualCost,
  remoteAnnualCost,
  hybridAnnualCost,
  productivityAdjustedRemote,
  decisionHealth,
  perPersonSavings,
} from '../src/engines/cost/remote-vs-office-calculator.ts';

test('officeAnnualCost: 10 people at $80K + $1500/mo office + $3K setup = $1,010,000', () => {
  // 10 × (80000 + 12 × 1500) + 10 × 3000 = 10 × 98000 + 30000 = 1010000
  const total = officeAnnualCost(10, 80000, 1500, 3000);
  assert.equal(total, 1010000);
});

test('remoteAnnualCost: 10 people at $80K + $500/mo stipend + $3K setup = $890,000', () => {
  // 10 × (80000 + 12 × 500) + 10 × 3000 = 10 × 86000 + 30000 = 890000
  const total = remoteAnnualCost(10, 80000, 500, 3000);
  assert.equal(total, 890000);
});

test('hybridAnnualCost: 10 people 50/50 = $950,000', () => {
  // Mixed overhead = 0.5 × 1500 + 0.5 × 500 = 1000
  // 10 × (80000 + 12 × 1000) + 10 × 3000 = 10 × 92000 + 30000 = 950000
  const total = hybridAnnualCost(10, 80000, 1500, 500, 3000);
  assert.equal(total, 950000);
});

test('productivityAdjustedRemote: 10% boost → cost / 1.10', () => {
  // 890000 / 1.10 = 809090.909... → ~809,091
  const adjusted = productivityAdjustedRemote(890000, 10);
  assert.equal(Math.round(adjusted), 809091);
});

test('decisionHealth STRONG: remote saves + productivity up', () => {
  // Office 1.01M, Remote 890K → savings 120K positive; productivityDelta = 5
  const h = decisionHealth(120000, 5);
  assert.equal(h.emoji, '🟢');
  assert.ok(h.label.includes('STRONG'));
});

test('decisionHealth WEAK: office cheaper + remote less productive', () => {
  // Negative savings + negative productivity
  const h = decisionHealth(-50000, -15);
  assert.equal(h.emoji, '🟠');
  assert.ok(h.label.includes('WEAK'));
});

test('perPersonSavings: $1500 office - $500 remote = $12,000/yr per person', () => {
  // 12 × (1500 - 500) = 12000
  const pps = perPersonSavings(1500, 500);
  assert.equal(pps, 12000);
});

test('perPersonSavings scales linearly: 5 people savings = 50% of 10 people', () => {
  const pps = perPersonSavings(1500, 500);
  assert.equal(pps * 5, 60000); // 5 people × $12K = $60K
  assert.equal(pps * 10, 120000); // 10 people × $12K = $120K
});
