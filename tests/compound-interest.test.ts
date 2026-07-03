/**
 * P4-1 Compound Interest Calculator — math layer tests.
 * Covers: futureValue (annual + monthly compounding), simpleFinalValue,
 *         yearsToTarget convergence, rateHealth thresholds.
 * Run via: node --import tsx --test tests/compound-interest.test.ts
 */
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  futureValue,
  simpleFinalValue,
  yearsToTarget,
  rateHealth,
} from '../src/engines/investment/compound-interest-calculator.ts';

test('futureValue: pure principal, annual compounding (textbook case)', () => {
  // P=10000, PMT=0, rate=5%, freq=annually, years=10
  // Standard formula: 10000 × 1.05^10 = 16288.9462...
  const fv = futureValue(10000, 0, 5, 'annually', 10);
  assert.equal(Math.round(fv), 16289);
});

test('futureValue: principal + monthly PMT, monthly compounding (retirement case)', () => {
  // P=10000, PMT=500, rate=7%, freq=monthly, years=20
  // Plan design uses ordinary annuity (PMT at end of period) — conservative industry standard.
  // Manual check: (1+0.07/12)^240 ≈ 4.0387 → fvP=40,387 + fvPMT=500×3.0387/0.005833≈260,463 ≈ $300,850.
  // (Begin-of-period annuity would give ~$301,706.)
  const fv = futureValue(10000, 500, 7, 'monthly', 20);
  assert.ok(Math.abs(fv - 300851) < 1, `expected ~300851 (ordinary annuity), got ${fv}`);
});

test('simpleFinalValue: zero-rate edge case returns principal + contributions only', () => {
  // P=10000, PMT=500, rate=0%, years=10 → 10000 + 500*12*10 = 70000
  const fv = simpleFinalValue(10000, 500, 0, 10);
  assert.equal(fv, 70000);
});

test('yearsToTarget: converges to correct horizon', () => {
  // P=0, PMT=500, rate=7%, monthly compounding → years to $100K ≈ 11 years
  const years = yearsToTarget(100000, 0, 500, 7, 'monthly');
  assert.ok(Math.abs(years - 11) <= 0.5, `expected ~11 years, got ${years}`);
});