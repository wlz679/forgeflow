#!/usr/bin/env node
// P49 drift guard — 7 assertions enforcing engine-count-by-category invariant.
//
// Mirrors tests/codegen-drift-guard.test.ts (P47 pattern).
//
// What this test asserts:
//   T1 — EXPECTED_ENGINE_COUNT === sum(EXPECTED_ENGINES_BY_CATEGORY.values) — cross-const consistency
//   T2 — Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length === categories.length — all 15 categories covered
//   T3 — Each category in src/data/categories.ts has a key in EXPECTED_ENGINES_BY_CATEGORY — reverse mapping
//   T4 — Each ToolMeta entry's categoryId exists in categories.ts — no orphan categories
//   T5 — tools.length === EXPECTED_ENGINE_COUNT (100) — runtime match total
//   T6 — sum(groupBy(tools, 'categoryId').values) === EXPECTED_ENGINE_COUNT — runtime match per-cat sum
//   T7 — scripts/check-engine-count-by-category.mjs --check exits 0 — integration smoke
//
// Why tests/ root: P22b ESM trap — tests/run.mjs reads tests/*.test.ts (root only).
// Subdir placement silently skipped by pnpm test:unit.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Load constants + categories + tools via tsx subprocess (matches script pattern).
// Direct import would require tsconfig setup; subprocess is consistent with P47.
//
// Windows note: `import` inside the spawned `-e` snippet must use a
// file:// URL — absolute Windows paths like D:\... are misinterpreted
// as URL protocol schemes (ERR_UNSUPPORTED_ESM_URL_SCHEME). This
// mirrors scripts/check-engine-count-by-category.mjs's ROOT_URL
// workaround (script L31-34).

function loadTsModule<T>(modulePath: string): T {
  const fileUrl = pathToFileURL(path.resolve(ROOT, modulePath)).href;
  const result = spawnSync(
    process.execPath,
    ['--import', 'tsx', '-e', `import m from '${fileUrl}'; process.stdout.write(JSON.stringify(m))`],
    { encoding: 'utf8', cwd: ROOT }
  );
  if (result.status !== 0) {
    throw new Error(`Failed to load ${modulePath}: ${result.stderr}`);
  }
  return JSON.parse(result.stdout);
}

// Load engine-count.ts module via tsx subprocess (single load, then destructure).
// Windows note: uses file:// URL to avoid ERR_UNSUPPORTED_ESM_URL_SCHEME on D:\ paths.
const engineCountFileUrl = pathToFileURL(path.join(ROOT, 'tests/lib/engine-count.ts')).href;
const engineCountResult = spawnSync(
  process.execPath,
  ['--import', 'tsx', '-e', `import m from '${engineCountFileUrl}'; process.stdout.write(JSON.stringify(m))`],
  { encoding: 'utf8', cwd: ROOT }
);
if (engineCountResult.status !== 0) throw new Error(engineCountResult.stderr);
const engineCountModule = JSON.parse(engineCountResult.stdout);
const EXPECTED_ENGINE_COUNT = engineCountModule.EXPECTED_ENGINE_COUNT as number;
const EXPECTED_ENGINES_BY_CATEGORY = engineCountModule.EXPECTED_ENGINES_BY_CATEGORY as Record<string, number>;

const categories = loadTsModule<{ categories: Array<{ id: string; name: string }> }>('./src/data/categories.ts').categories;
// tools module shape: { tools: ToolMeta[] } (default export from barrel).
const toolsModule = loadTsModule<{ tools: Array<{ categoryId: string }> }>('./src/data/tools/index.ts');
const tools = toolsModule.tools;

// === T1: EXPECTED_ENGINE_COUNT === sum(EXPECTED_ENGINES_BY_CATEGORY.values) ===

test('T1: EXPECTED_ENGINE_COUNT === sum(EXPECTED_ENGINES_BY_CATEGORY.values)', () => {
  const sum = Object.values(EXPECTED_ENGINES_BY_CATEGORY).reduce((s, n) => s + n, 0);
  assert.equal(
    EXPECTED_ENGINE_COUNT,
    sum,
    `EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT} but sum(EXPECTED_ENGINES_BY_CATEGORY)=${sum}. The two constants must agree (double-layer invariant).`
  );
});

// === T2: Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length === categories.length (15) ===

test('T2: EXPECTED_ENGINES_BY_CATEGORY has 15 entries (matches categories.ts)', () => {
  assert.equal(
    Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length,
    categories.length,
    `EXPECTED_ENGINES_BY_CATEGORY has ${Object.keys(EXPECTED_ENGINES_BY_CATEGORY).length} entries but categories.ts has ${categories.length}.`
  );
});

// === T3: Each category in categories.ts has a key in EXPECTED_ENGINES_BY_CATEGORY ===

test('T3: each category in categories.ts is covered by EXPECTED_ENGINES_BY_CATEGORY', () => {
  const constKeys = new Set(Object.keys(EXPECTED_ENGINES_BY_CATEGORY));
  const missing = categories.filter(c => !constKeys.has(c.id)).map(c => c.id);
  assert.equal(
    missing.length,
    0,
    `Categories missing from EXPECTED_ENGINES_BY_CATEGORY: ${missing.join(', ')}`
  );
});

// === T4: Each ToolMeta entry's categoryId exists in categories.ts ===

test('T4: each ToolMeta categoryId exists in categories.ts (no orphans)', () => {
  const validIds = new Set(categories.map(c => c.id));
  const orphans = Array.from(new Set(tools.filter(t => !validIds.has(t.categoryId)).map(t => t.categoryId)));
  assert.equal(
    orphans.length,
    0,
    `ToolMeta entries reference unknown categoryIds: ${orphans.join(', ')}`
  );
});

// === T5: tools.length === EXPECTED_ENGINE_COUNT (100) ===

test('T5: tools.length === EXPECTED_ENGINE_COUNT', () => {
  assert.equal(
    tools.length,
    EXPECTED_ENGINE_COUNT,
    `tools.length=${tools.length} but EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT}.`
  );
});

// === T6: sum(groupBy(tools, categoryId).values) === EXPECTED_ENGINE_COUNT ===

test('T6: sum of per-category ToolMeta counts === EXPECTED_ENGINE_COUNT', () => {
  const counts: Record<string, number> = {};
  for (const t of tools) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
  const sum = Object.values(counts).reduce((s, n) => s + n, 0);
  assert.equal(
    sum,
    EXPECTED_ENGINE_COUNT,
    `Sum of per-category counts=${sum} but EXPECTED_ENGINE_COUNT=${EXPECTED_ENGINE_COUNT}.`
  );
});

// === T7: scripts/check-engine-count-by-category.mjs --check exits 0 ===

test('T7: scripts/check-engine-count-by-category.mjs --check exits 0 (integration smoke)', () => {
  const result = spawnSync(
    'node',
    ['scripts/check-engine-count-by-category.mjs', '--check'],
    { cwd: ROOT, encoding: 'utf8' }
  );
  assert.equal(
    result.status,
    0,
    `script exited ${result.status}. stdout: ${result.stdout || '(empty)'}, stderr: ${result.stderr || '(empty)'}`
  );
  assert.match(
    result.stdout,
    /PASSED/,
    `script did not report PASSED. stdout: ${result.stdout}`
  );
});
