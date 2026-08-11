import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { BAND_META, type BandKey, getBandEmoji } from '../src/core/engines/band-meta.ts';

test('BAND_META: 4 standard bands present', () => {
  const expected: BandKey[] = ['excellent', 'good', 'warning', 'critical'];
  for (const k of expected) {
    assert.ok(BAND_META[k], `BAND_META.${k} should exist`);
  }
});

test('BAND_META: canonical emoji mapping (4-tier scheme)', () => {
  // The canonical 4-tier scheme used by most engines:
  //   excellent → 🟢 · good → 🟡 · warning → 🟠 · critical → 🔴
  assert.equal(BAND_META.excellent, '🟢');
  assert.equal(BAND_META.good, '🟡');
  assert.equal(BAND_META.warning, '🟠');
  assert.equal(BAND_META.critical, '🔴');
});

test('getBandEmoji: lookup returns same string as direct BAND_META access', () => {
  // Type-safe lookup helper — same result as the constant, but with a function
  // signature that engines can use to document intent.
  for (const k of ['excellent', 'good', 'warning', 'critical'] as const) {
    assert.equal(getBandEmoji(k), BAND_META[k]);
  }
});

test('BAND_META: BandKey type is exhaustive — all 4 keys present', () => {
  // Runtime check that the type-level invariant (exhaustive union) holds in the actual value.
  const keys = Object.keys(BAND_META).sort();
  assert.deepEqual(keys, ['critical', 'excellent', 'good', 'warning']);
});
