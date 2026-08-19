#!/usr/bin/env node
// P140g-T4 — Build-dep guard: author bio pages render correctly.
//   Catches P140g-style route registration regressions + JSON-LD Person drift.
//
// Mirrors tests/engine-faq-html-render-guard.test.ts (P146-S2) pattern:
// build with buildWithEnv({}), then walk dist/ and assert content.
//
// Requires RUN_BUILD_TESTS=1 (P23b skip-guard pattern).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { REVIEWERS } from '../src/data/editorial.ts';
import { buildWithEnv } from './_supabase-build-helper.ts';

const root = resolve(import.meta.dirname, '..');

// P23b skip-guard: only run when explicitly opted-in.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

const LANGS = ['en', 'zh'] as const;

test('author bio pages render for every (lang, reviewer.id) combination', () => {
  // Build dist (build-dep) — result not needed; we read individual page HTMLs.
  buildWithEnv({});

  const missing: string[] = [];
  for (const lang of LANGS) {
    for (const r of REVIEWERS) {
      const htmlPath = resolve(root, 'dist', lang, 'about', 'authors', r.id, 'index.html');
      if (!existsSync(htmlPath)) {
        missing.push(`dist/${lang}/about/authors/${r.id}/index.html (file missing)`);
        continue;
      }
      const html = readFileSync(htmlPath, 'utf-8');

      // Reviewer core fields (name + role + bio + credentials) appear in HTML.
      if (!html.includes(r.name)) {
        missing.push(`${lang}/${r.id}: missing reviewer.name "${r.name}"`);
      }
      if (!html.includes(r.role)) {
        missing.push(`${lang}/${r.id}: missing reviewer.role "${r.role}"`);
      }
      if (!html.includes(r.bio[lang])) {
        missing.push(`${lang}/${r.id}: missing reviewer.bio.${lang}`);
      }
      for (const cred of r.credentials) {
        if (!html.includes(cred)) {
          missing.push(`${lang}/${r.id}: missing credential "${cred}"`);
        }
      }

      // JSON-LD Person schema (page-specific; not from BaseLayout).
      if (!html.includes('"@type":"Person"')) {
        missing.push(`${lang}/${r.id}: missing JSON-LD Person schema`);
      }

      // hreflang × 2 + canonical (emitted by BaseLayout line 137-139).
      for (const tag of ['hreflang="en"', 'hreflang="zh"', 'rel="canonical"']) {
        if (!html.includes(tag)) {
          missing.push(`${lang}/${r.id}: missing ${tag}`);
        }
      }
    }
  }

  assert.equal(
    missing.length,
    0,
    `Author bio page issues (${missing.length}):\n` +
      missing.map((m) => `  - ${m}`).join('\n'),
  );
});