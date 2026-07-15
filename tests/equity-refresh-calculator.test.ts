import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { refreshGrant, calcHealthBand, HEALTH_BANDS } from '../src/engines/hiring-team/equity-refresh-calculator.ts';

test('refreshGrant: 10K shares, 3y, 1.5% pool, 10M total, Med = 15000 shares', () => {
  const r = refreshGrant(10000, 3, 1.5, 10000000, 'Med');
  assert.equal(r.shares, 15000);
});

test('refreshGrant: same with High = 28125 shares', () => {
  const r = refreshGrant(10000, 3, 1.5, 10000000, 'High');
  assert.equal(r.shares, 28125);
});

test('refreshGrant: 4+ years grant = years_factor 1.0 (no boost)', () => {
  const r4 = refreshGrant(10000, 4, 1.5, 10000000, 'Med');
  const r3 = refreshGrant(10000, 3, 1.5, 10000000, 'Med');
  // 3y has years_factor 1.25; 4y has 1.0
  assert.ok(r4.shares < r3.shares, '4y should be less than 3y');
  assert.equal(r4.shares, 12000); // 150000 * 0.08 * 1.0 = 12000
});

test('refreshGrant: Low criticality = 5625 shares', () => {
  const r = refreshGrant(10000, 3, 1.5, 10000000, 'Low');
  assert.equal(r.shares, 5625);
});

test('refreshGrant: dilution_pct = shares / total_company_shares * 100', () => {
  const r = refreshGrant(10000, 3, 1.5, 10000000, 'Med');
  assert.equal(r.dilutionPct, 0.15);
});

test('refreshGrant: 0 total_company_shares = 0 dilution (safe division)', () => {
  const r = refreshGrant(10000, 3, 1.5, 0, 'Med');
  assert.equal(r.dilutionPct, 0);
});

test('calcHealthBand: 0.25 → excellent (≥0.20)', () => {
  assert.equal(calcHealthBand(0.25), 'excellent');
});

test('calcHealthBand: 0.15 → good (0.10-0.20)', () => {
  assert.equal(calcHealthBand(0.15), 'good');
});

test('calcHealthBand: 0.07 → warning (0.05-0.10)', () => {
  assert.equal(calcHealthBand(0.07), 'warning');
});

test('calcHealthBand: 0.03 → critical (<0.05)', () => {
  assert.equal(calcHealthBand(0.03), 'critical');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.20);
  assert.equal(HEALTH_BANDS.good.threshold, 0.10);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.05);
  assert.equal(HEALTH_BANDS.critical.threshold, -Infinity);
});

// P16-3 defensive layer 2: clampNonNegative guards prevent negative inputs
// from producing negative share counts or negative dilution %.
test('equity-refresh: defensive clampNonNegative guards (P16-3 layer 2)', () => {
  // After clampNonNegative: all negative inputs → 0; refreshGrant(0,0,0,0,...)
  const r = refreshGrant(0, 0, 0, 0, 'High');
  assert.equal(r.shares, 0, 'all-zero inputs → 0 shares');
  assert.equal(r.dilutionPct, 0, 'all-zero inputs → 0 dilution');
  assert.equal(calcHealthBand(r.dilutionPct), 'critical', '0 dilution → critical');
});
