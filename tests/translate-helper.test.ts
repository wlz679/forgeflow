#!/usr/bin/env node
// P141-B1-T3: translate() helper unit tests.
//
// Covers OCR Quick Win #2 (i18n fallback helper):
//   1. zh fallback to en when entry[zh] is undefined
//   2. Missing-key fallback (returns the key itself)
//   3. Placeholder replacement ({varname} syntax, replaceAll semantics)
//   4. Multi-occurrence placeholder substitution (replaceAll)
//   5. Empty params object (no-op)
//   6. Numeric param coerced to string
//   7. Non-string param coerced to string
//   8. Both languages populated → no fallback triggered
//
// Tests live at tests/translate-helper.test.ts (flat — tests/run.mjs globs
// tests/*.test.ts non-recursively, per P52 constraint).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { translate } from '../src/i18n/translate-helper';
import { translations } from '../src/i18n/translations';

test('translate: zh fallback to en when entry.zh is undefined', () => {
  // Fixture key: only English, zh is undefined. Verifies `entry?.[lang] ??
  // entry?.en ?? key` chain falls through to .en. Type cast required
  // because the strict translation record type requires both en+zh keys.
  const KEY = '__test.p141_only_english';
  (translations as Record<string, { en: string; zh?: string }>)[KEY] = { en: 'English Only' };
  try {
    assert.equal(translate(KEY, 'zh'), 'English Only');
    assert.equal(translate(KEY, 'en'), 'English Only');
  } finally {
    delete translations[KEY];
  }
});

test('translate: key fallback when entry missing entirely', () => {
  // No entry at all — returns the key itself (last fallback in chain).
  assert.equal(translate('non.existent.key.p141', 'en'), 'non.existent.key.p141');
  assert.equal(translate('non.existent.key.p141', 'zh'), 'non.existent.key.p141');
});

test('translate: placeholder replacement uses {varname} syntax', () => {
  // Real translation key with {tool} placeholder (matches existing usage
  // pattern across translations.ts — e.g. blog.try_now).
  assert.equal(
    translate('blog.try_now', 'en', { tool: 'MRR' }),
    'Try MRR Now →',
  );
});

test('translate: placeholder replaces all occurrences (replaceAll semantics)', () => {
  // {count} appears twice in home.subtitle — first occurrence only would
  // leave a dangling {count} in the output. The new helper must replaceAll.
  const KEY = '__test.p141_repeat';
  (translations as Record<string, { en: string; zh: string }>)[KEY] = { en: '{n} tools ({n} free)', zh: '' };
  try {
    assert.equal(translate(KEY, 'en', { n: 5 }), '5 tools (5 free)');
  } finally {
    delete translations[KEY];
  }
});

test('translate: empty params object is a no-op', () => {
  assert.equal(translate('site.name', 'en', {}), 'ForgeFlowKit');
});

test('translate: numeric param is coerced to string', () => {
  // Record<string, string | number> — numeric values must stringify cleanly.
  const KEY = '__test.p141_number';
  (translations as Record<string, { en: string; zh: string }>)[KEY] = { en: 'Count is {n}', zh: '' };
  try {
    assert.equal(translate(KEY, 'en', { n: 42 }), 'Count is 42');
  } finally {
    delete translations[KEY];
  }
});

test('translate: both languages populated → no fallback triggered', () => {
  // If both en and zh exist, each request returns the requested lang —
  // NOT a cross-language fallback. Sanity check for the `??` chain.
  const KEY = '__test.p141_both';
  translations[KEY] = { en: 'Hello', zh: '你好' };
  try {
    assert.equal(translate(KEY, 'en'), 'Hello');
    assert.equal(translate(KEY, 'zh'), '你好');
  } finally {
    delete translations[KEY];
  }
});

test('translate: missing placeholder param leaves {varname} literal', () => {
  // If caller forgets a param, the template literal stays — mirrors the
  // behavior of helpers.ts fillTemplate (which uses `{${key}}` as fallback).
  const KEY = '__test.p141_missing_param';
  (translations as Record<string, { en: string; zh: string }>)[KEY] = { en: 'Hello {name}', zh: '' };
  try {
    assert.equal(translate(KEY, 'en', {}), 'Hello {name}');
  } finally {
    delete translations[KEY];
  }
});
