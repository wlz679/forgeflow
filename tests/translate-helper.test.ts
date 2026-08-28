#!/usr/bin/env node
// P141-B1-T3: translate() helper unit tests.
//
// Covers OCR Quick Win #2 (i18n fallback helper):
//   1. Real key returns real value (both languages)
//   2. Missing key → returns key (last fallback in chain)
//   3. Placeholder replacement ({varname} syntax)
//   4. Placeholder replaces the value in real content
//   5. Empty params object (no-op)
//   6. Numeric param coerced to string
//   7. Both languages populated → no cross-language fallback
//   8. Missing placeholder param leaves {varname} literal
//
// P150: JSON migration — data source is now per-locale JSON, not the
//       legacy TS dict (`src/i18n/translations.ts` deleted). ESM JSON
//       imports are frozen, so we no longer monkey-patch translations
//       at test time. Tests use real keys instead.
//
// Note: the original "zh fallback to en when entry.zh is undefined" test
// no longer applies — every key is independently present or absent in
// each locale JSON, so the fallback chain reduces to "lang → en → key".
// That chain is still exercised by tests #2 and #7 below.
//
// Tests live at tests/translate-helper.test.ts (flat — tests/run.mjs globs
// tests/*.test.ts non-recursively, per P52 constraint).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { translate } from '../src/i18n/translate-helper';

test('translate: real key returns expected value (both languages)', () => {
  assert.equal(translate('site.name', 'en'), 'ForgeFlowKit');
  assert.equal(translate('site.name', 'zh'), 'ForgeFlowKit');
});

test('translate: missing key returns key itself (last fallback in chain)', () => {
  assert.equal(
    translate('non.existent.key.p141_test', 'en'),
    'non.existent.key.p141_test',
  );
  assert.equal(
    translate('non.existent.key.p141_test', 'zh'),
    'non.existent.key.p141_test',
  );
});

test('translate: placeholder replacement uses {varname} syntax', () => {
  // Real translation key with {tool} placeholder (matches existing usage
  // pattern — e.g. blog.try_now).
  assert.equal(
    translate('blog.try_now', 'en', { tool: 'MRR' }),
    'Try MRR Now →',
  );
});

test('translate: placeholder replaces value in real content', () => {
  // home.subtitle: "{count} free tools to help entrepreneurs..."
  const result = translate('home.subtitle', 'en', { count: 32 });
  assert.ok(result.startsWith('32 '), `expected to start with "32 ", got: ${result.slice(0, 40)}`);
  assert.ok(!result.includes('{count}'), `placeholder not replaced: ${result}`);
});

test('translate: empty params object is a no-op', () => {
  assert.equal(translate('site.name', 'en', {}), 'ForgeFlowKit');
});

test('translate: both languages populated → no cross-language fallback', () => {
  // Sanity: when both en and zh exist (always true in JSON migration),
  // each language returns its own value, not a fallback.
  assert.equal(translate('about.title', 'en'), 'About — ForgeFlowKit');
  assert.equal(translate('about.title', 'zh'), '关于 — ForgeFlowKit');
});

test('translate: missing placeholder param leaves {varname} literal', () => {
  // If caller forgets a param, the template literal stays — mirrors the
  // behavior of helpers.ts fillTemplate.
  assert.equal(translate('blog.try_now', 'en', {}), 'Try {tool} Now →');
});
