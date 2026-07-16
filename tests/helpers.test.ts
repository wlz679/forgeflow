import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { clampNonNegative } from '../src/core/engines/helpers';

test('clampNonNegative: positive value passes through', () => {
  assert.equal(clampNonNegative(100), 100);
  assert.equal(clampNonNegative(0.5), 0.5);
  assert.equal(clampNonNegative(1_000_000), 1_000_000);
});

test('clampNonNegative: zero passes through', () => {
  assert.equal(clampNonNegative(0), 0);
});

test('clampNonNegative: negative value clamps to 0', () => {
  assert.equal(clampNonNegative(-1), 0);
  assert.equal(clampNonNegative(-50), 0);
  assert.equal(clampNonNegative(-1_000_000), 0);
});

test('clampNonNegative: NaN → 0 (defensive)', () => {
  assert.equal(clampNonNegative(NaN), 0);
});

test('clampNonNegative: undefined → NaN (caller-must-pre-validate)', () => {
  // typeof undefined !== 'number', so JS Math.max(0, undefined) = NaN, but
  // spec says "Math.max(0, x)" — the `|| 0` in parseFloat guards upstream
  // make this case unreachable in practice. Test asserts the documented behavior:
  // Math.max(0, undefined as any) returns NaN, NOT 0. This test guards the
  // helper signature's contract that callers must pre-validate.
  assert.ok(Number.isNaN(clampNonNegative(undefined as any)));
});

test('clampNonNegative: Infinity stays Infinity', () => {
  assert.equal(clampNonNegative(Infinity), Infinity);
});
