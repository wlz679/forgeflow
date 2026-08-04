#!/usr/bin/env node
// P140b-T8: Source-only CI guard that emits console.warn for each en prose
// file that lacks a zh counterpart. P140b/c phase tolerates missing zh (we're
// shipping en-first); P140d-T8 will tighten this to console.error → build fail.
//
// Why this exists:
//   The 100 en prose files shipped in P140b-T2. zh counterparts are added
//   incrementally. We want CI to surface the zh-gap so reviewers see it in
//   the test output, without blocking P140b/c ship.
//
// Why source-only (no RUN_BUILD_TESTS gate):
//   This walks `src/content/tools/` directly — no `pnpm build` required.
//   It must run under default `pnpm test:unit` so the warn shows up in
//   every local + CI run, surfacing the zh gap continuously.
//
// References:
//   - spec §3 zh fallback strategy (P140a/b tolerated, P140d strict)
//   - spec §9 P140b T8 ("warn only — zh 缺位 fail 留给 P140d-T8")

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const PROSE_DIR = resolve(root, 'src/content/tools');

test('zh counterparts are encouraged but not required yet (P140b phase)', () => {
  if (!existsSync(PROSE_DIR)) {
    console.warn(`[p140b-T8] ${PROSE_DIR} does not exist — skipping zh counterpart check`);
    assert.ok(true);
    return;
  }
  const files = readdirSync(PROSE_DIR).filter(n => n.endsWith('.md') && n !== '_README.md');
  const missing: string[] = [];
  for (const filename of files) {
    if (filename.endsWith('.zh.md')) continue;
    const slug = filename.replace(/\.md$/, '');
    const zhName = `${slug}.zh.md`;
    if (!files.includes(zhName)) missing.push(zhName);
  }
  if (missing.length > 0) {
    console.warn(`[p140b-T8] ${missing.length} en files lack zh counterparts (P140b tolerated):`);
    for (const m of missing.slice(0, 20)) console.warn(`  - ${m}`);
    if (missing.length > 20) console.warn(`  ... and ${missing.length - 20} more`);
  }
  // Always pass (P140b: warn only)
  assert.ok(true, 'zh counterpart check is warn-only at P140b ship');
});