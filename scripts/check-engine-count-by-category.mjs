#!/usr/bin/env node
// P49 — Engine count per category table.
//
// Reads src/data/categories.ts + src/data/tools/index.ts via tsx,
// groups ToolMeta by categoryId, emits a markdown table.
//
// Default mode: emit table to stdout (operator copy-pastes into CLAUDE.md).
// --check mode: assert const map + ToolMeta total + CLAUDE.md snapshot
//   all agree. Exit 0 on pass, 1 on fail.
//
// Mirrors scripts/codegen-examples.mjs shell (CHECK_MODE flag,
// ROOT resolution, tsx runner via temp .ts file).
//
// Note: inline `--import tsx -e <script>` does NOT strip TS types from
// the `-e` payload (tsx only transforms .ts files loaded via import).
// To run TS that imports .ts modules, we write a temp runner script
// to disk and invoke `tsx <runnerPath>` directly. This mirrors
// codegen-examples.mjs's runner-file pattern.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const CHECK_MODE = process.argv.includes('--check');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// Windows path adaptation: ESM imports require file:// URLs on Windows
// (absolute paths starting with drive letter like D:\ are misinterpreted
// as URL protocol schemes). Convert ROOT to file:// URL for inline TS imports.
const ROOT_URL = pathToFileURL(ROOT).href.replace(/\/$/, '');

// Helper: write TS source to a temp .ts file, run via tsx CLI, return stdout.
function runTsx(name, tsSource) {
  const runnerPath = path.join(os.tmpdir(), `engine-count-by-category-${name}-${process.pid}-${Date.now()}.ts`);
  fs.writeFileSync(runnerPath, tsSource, 'utf8');
  try {
    // Use tsx via npx — mirrors codegen-examples.mjs pattern.
    // `npx tsx` resolves the local tsx binary; on Windows we need .cmd shim.
    const tsxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(tsxBin, ['tsx', runnerPath], {
      cwd: ROOT,
      encoding: 'utf8',
      shell: true,
    });
    if (result.status !== 0) {
      return { ok: false, stderr: result.stderr, stdout: result.stdout, error: result.error };
    }
    return { ok: true, stdout: result.stdout };
  } finally {
    try { fs.unlinkSync(runnerPath); } catch {}
  }
}

// Step 1: derive live counts from ToolMeta barrel via tsx subprocess.
const deriveScript = `
import { tools } from '${ROOT_URL}/src/data/tools/index.ts';
import { categories } from '${ROOT_URL}/src/data/categories.ts';
const counts: Record<string, number> = {};
for (const t of tools) counts[t.categoryId] = (counts[t.categoryId] || 0) + 1;
process.stdout.write(JSON.stringify({ byCategory: counts, total: tools.length, categoryCount: categories.length }));
`;
const deriveResult = runTsx('derive', deriveScript);
if (!deriveResult.ok) {
  console.error('[engine-count-by-category] derivation failed:', deriveResult.stderr);
  if (deriveResult.error) console.error('[engine-count-by-category] error:', deriveResult.error.message);
  process.exit(1);
}
const derived = JSON.parse(deriveResult.stdout);

// Step 2: load EXPECTED_ENGINES_BY_CATEGORY const via tsx subprocess.
const constScript = `
import { EXPECTED_ENGINES_BY_CATEGORY } from '${ROOT_URL}/tests/lib/engine-count.ts';
process.stdout.write(JSON.stringify(EXPECTED_ENGINES_BY_CATEGORY));
`;
const constResult = runTsx('const', constScript);
if (!constResult.ok) {
  console.error('[engine-count-by-category] const load failed:', constResult.stderr);
  if (constResult.error) console.error('[engine-count-by-category] error:', constResult.error.message);
  process.exit(1);
}
const constMap = JSON.parse(constResult.stdout);

// Step 3: build markdown table sorted by category letter (categories.ts order).
const sortedCategories = [
  'A', 'B', 'C', 'D', 'E', 'F', 'H', 'K', 'L', 'M', 'O', 'P', 'R', 'S', 'T',
];

function buildTable(byCategory) {
  const lines = [
    '| Letter | Category Name | Engine Count |',
    '|--------|---------------|--------------|',
  ];
  let total = 0;
  for (const letter of sortedCategories) {
    const n = byCategory[letter] || 0;
    total += n;
    const name = CATEGORY_NAMES[letter] || letter;
    lines.push(`| ${letter} | ${name} | ${n} |`);
  }
  lines.push(`| **Total** | | **${total}** |`);
  return lines.join('\n');
}

// Category display names (matched from src/data/categories.ts 2026-07-20).
// Kept inline (not loaded from categories.ts) because:
//   - Avoids tsx subprocess for a static lookup table
//   - Script output is human-facing (CLAUDE.md); ASCII-safe names
//   - If categories.ts rename happens, this map must update too
//     (caught by drift guard test T6 + manual --check)
const CATEGORY_NAMES = {
  A: 'SaaS Metrics',
  B: 'AI Cost Tools',
  C: 'Valuation & Exit',
  D: 'Freelance Pricing',
  E: 'Cost & Efficiency',
  F: 'Investment & Real Estate',
  H: 'Hiring & Team',
  K: 'Knowledge / 知识库',
  L: 'Legal & Compliance',
  M: 'Marketing Analytics',
  O: 'Operations / 库存运营',
  P: 'Product Analytics',
  R: 'Retention & Customer Success',
  S: 'Sales / 销售管理',
  T: 'Customer Support',
};

const table = buildTable(derived.byCategory);

if (!CHECK_MODE) {
  console.log(table);
  process.exit(0);
}

// --check mode: assert const matches derived, total matches EXPECTED_ENGINE_COUNT.
let failures = 0;
function fail(msg) { console.error('[engine-count-by-category] FAIL:', msg); failures++; }

// Layer 1: const map matches derived counts (per-category).
for (const letter of sortedCategories) {
  const expected = constMap[letter];
  const actual = derived.byCategory[letter] || 0;
  if (expected !== actual) {
    fail(`const[${letter}]=${expected} but ToolMeta says ${actual}`);
  }
}

// Layer 2: total matches EXPECTED_ENGINE_COUNT.
if (derived.total !== Object.values(constMap).reduce((s, n) => s + n, 0)) {
  fail(`ToolMeta total=${derived.total} but sum(EXPECTED_ENGINES_BY_CATEGORY)=${Object.values(constMap).reduce((s, n) => s + n, 0)}`);
}
if (derived.total !== 100) {
  fail(`ToolMeta total=${derived.total} but EXPECTED_ENGINE_COUNT=100`);
}

// Layer 3: CLAUDE.md snapshot table matches script output.
const claudePath = path.join(ROOT, 'CLAUDE.md');
if (!fs.existsSync(claudePath)) {
  fail(`CLAUDE.md missing at ${claudePath}`);
} else {
  const claudeContent = fs.readFileSync(claudePath, 'utf8');
  const markerStart = '<!-- codegen:start engine-count -->';
  const markerEnd = '<!-- codegen:end -->';
  const startIdx = claudeContent.indexOf(markerStart);
  const endIdx = claudeContent.indexOf(markerEnd);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) {
    fail(`CLAUDE.md missing codegen markers (start=${startIdx}, end=${endIdx})`);
  } else {
    const snapshot = claudeContent.slice(startIdx + markerStart.length, endIdx).trim();
    const expected = table.trim();
    if (snapshot !== expected) {
      fail('CLAUDE.md snapshot table does not match script output. Run `node scripts/check-engine-count-by-category.mjs` and copy-paste the output into CLAUDE.md between the codegen markers.');
      console.error('--- script output ---');
      console.error(expected);
      console.error('--- CLAUDE.md snapshot ---');
      console.error(snapshot);
      console.error('--- end ---');
    }
  }
}

if (failures === 0) {
  console.log('[engine-count-by-category] PASSED');
  process.exit(0);
} else {
  console.error(`[engine-count-by-category] ${failures} failure(s)`);
  process.exit(1);
}
