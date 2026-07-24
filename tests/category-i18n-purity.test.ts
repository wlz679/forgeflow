#!/usr/bin/env node
// P62 Task 1 — i18n purity drift-guard for category names.
//
// Why this test exists:
//   English category pages were leaking Chinese into the header because
//   categories.ts and translations.ts had hardcoded bilingual strings
//   in O/S/K `name` fields ("Operations / 库存运营" / "Sales / 销售管理" /
//   "Knowledge / 知识库"). P62 splits this across 4 tasks; Task 1 fixes
//   the source-side data, Task 2 fixes the i18n entries, Task 3 migrates
//   pages, Task 4 verifies build.
//
// What this test asserts:
//   T1 — categories.ts every .name has no CJK characters (source purity)
//   T2 — translations.ts category.{O,S,K}.name en field has no CJK
//        (expected to FAIL until Task 2 lands)
//
// Run via: node tests/run.mjs tests/category-i18n-purity.test.ts
//
// Mirrors tests/codegen-drift-guard.test.ts (P47 pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { categories } from '../src/data/categories';
// `translations` is exported from src/i18n/translations.ts; we import via
// src/i18n/index.ts (the existing barrel) to validate both possible shapes
// (named export + t() fallback) stay available.
import * as i18n from '../src/i18n';

const CJK = /[一-鿿㐀-䶿＀-￯]/;

test('categories.ts: every .name has no CJK characters (English source purity)', () => {
  for (const c of categories) {
    assert.doesNotMatch(
      c.name,
      CJK,
      `${c.id} category name has CJK: ${c.name}`,
    );
  }
});

test('translations.ts: category.{O,S,K}.name en field has no CJK', () => {
  // Prefer the direct `translations` export; fall back to t() if absent.
  const tr = (i18n as any).translations ?? null;
  if (tr) {
    assert.doesNotMatch(tr['category.O.name'].en, CJK);
    assert.doesNotMatch(tr['category.S.name'].en, CJK);
    assert.doesNotMatch(tr['category.K.name'].en, CJK);
  } else {
    assert.doesNotMatch(i18n.t('category.O.name', 'en'), CJK);
    assert.doesNotMatch(i18n.t('category.S.name', 'en'), CJK);
    assert.doesNotMatch(i18n.t('category.K.name', 'en'), CJK);
  }
});