#!/usr/bin/env node
// P125 — CLAUDE.md invariant matrix guard (meta-guard). Single test asserts
// the documentation's numeric invariants match reality. Catches the drift
// class we've seen 4 times this thread alone:
//   - P121 added 30th build-dep suite (CLAUDE.md still said 29)
//   - P122 added 31st build-dep suite (CLAUDE.md still said 29)
//   - P123 added 32nd build-dep suite (CLAUDE.md still said 29)
//   - P124 added 33rd build-dep suite (CLAUDE.md still said 29)
//
// Without this guard, future sessions adding a 34th/35th/... suite would
// silently leave CLAUDE.md drifted until a manual audit (P27/P28/P30/P31
// cascade audit pattern catches it). This guard catches it on every PR.
//
// Four invariants asserted:
//   1. Build-dep suite count: CLAUDE.md "N build-dep suites" matches
//      tests/run.mjs skip-mode listing length
//   2. Defense-in-Depth arithmetic: "N build-dep + N source-only = total"
//      self-check (catches typos in the totals line)
//   3. Engine count: CLAUDE.md "100 engines" matches
//      tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT
//   4. Category count: CLAUDE.md "15 categories" matches
//      count of category letter exports in src/data/categories.ts
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 34th build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function readText(relPath: string): string {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) {
    throw new Error(`Required file missing: ${relPath}`);
  }
  return readFileSync(abs, 'utf-8');
}

/** Extract first integer N that appears in a `... N build-dep suites ...` context. */
function extractBuildDepSuiteCount(claudeMd: string): number {
  // Match e.g. "33 build-dep suites" / "29 build-dep CI guards"
  const re = /\b(\d+)\s+build-dep\s+(?:CI\s+guards|suites|suite\s+count)\b/g;
  const matches = [...claudeMd.matchAll(re)].map(m => parseInt(m[1], 10));
  if (matches.length === 0) {
    throw new Error(`No "N build-dep suites/CI guards" phrase found in CLAUDE.md`);
  }
  // Use the FIRST match (intro paragraph typically has the count)
  return matches[0];
}

/** Extract first integer N that appears in a `... N source-only ...` context. */
function extractSourceOnlyCount(claudeMd: string): number {
  // Match e.g. "8 source-only"
  const re = /\b(\d+)\s+source-only\b/g;
  const matches = [...claudeMd.matchAll(re)].map(m => parseInt(m[1], 10));
  if (matches.length === 0) {
    throw new Error(`No "N source-only" phrase found in CLAUDE.md`);
  }
  return matches[0];
}

/** Count build-dep suite names listed in tests/run.mjs skip-mode summary. */
function countRealBuildDepSuites(): number {
  const runMjs = readText('tests/run.mjs');
  // The skip-mode summary uses `console.log('[skip-mode]   <name1>, <name2>, ...');`
  // Some lines have a single suite name; others have multiple comma-separated.
  // Extract all `[skip-mode]` log content and split by comma.
  const re = /console\.log\('\[skip-mode\]\s+([^']+)'\);/g;
  const names = new Set<string>();
  for (const m of runMjs.matchAll(re)) {
    const line = m[1];
    // Split by comma, trim each, skip empty/non-suite entries (like
    // "Set RUN_BUILD_TESTS=1 ..." or "RUN_BUILD_TESTS not set — N ...").
    for (const part of line.split(',')) {
      const trimmed = part.trim();
      // Only consider lowercase-hyphen identifiers (suite-name pattern).
      if (/^[a-z][a-z0-9-]*$/.test(trimmed)) {
        names.add(trimmed);
      }
    }
  }
  return names.size;
}

/** Read EXPECTED_ENGINE_COUNT constant from tests/engine-count.ts. */
function readEngineCount(): number {
  const text = readText('tests/engine-count.ts');
  // Match `EXPECTED_ENGINE_COUNT: number = 100` (with optional type annotation)
  const m = text.match(/EXPECTED_ENGINE_COUNT\s*(?::\s*\w+\s*)?=\s*(\d+)/);
  if (!m) throw new Error(`EXPECTED_ENGINE_COUNT not found in tests/engine-count.ts`);
  return parseInt(m[1], 10);
}

/** Count category letter IDs (A/B/C/...) in src/data/categories.ts. */
function countCategoryLetters(): number {
  const text = readText('src/data/categories.ts');
  // Each category has an `id: '<letter>'` field. Count unique letters.
  const re = /id:\s*['"]([A-Z])['"]/g;
  const letters = new Set<string>();
  for (const m of text.matchAll(re)) letters.add(m[1]);
  return letters.size;
}

test('CLAUDE.md invariant matrix matches reality (meta-guard)', () => {
  const claudeMd = readText('CLAUDE.md');
  const violations: string[] = [];

  // Invariant 1: Build-dep suite count
  const statedBuildDep = extractBuildDepSuiteCount(claudeMd);
  const realBuildDep = countRealBuildDepSuites();
  if (statedBuildDep !== realBuildDep) {
    violations.push(
      `Build-dep suite count drift: CLAUDE.md says ${statedBuildDep}, ` +
      `reality (tests/run.mjs skip-mode) says ${realBuildDep}`
    );
  }

  // Invariant 2: Defense-in-Depth arithmetic self-check
  const statedSourceOnly = extractSourceOnlyCount(claudeMd);
  const totalRe = /\b(\d+)\s+build-dep\s+suites\s*\+\s*(\d+)\s+source-only\s*=\s*(\d+)\b/;
  const totalMatch = claudeMd.match(totalRe);
  if (totalMatch) {
    const a = parseInt(totalMatch[1], 10);
    const b = parseInt(totalMatch[2], 10);
    const total = parseInt(totalMatch[3], 10);
    if (a + b !== total) {
      violations.push(
        `Defense-in-Depth arithmetic drift: CLAUDE.md says ` +
        `${a} build-dep + ${b} source-only = ${total}, but ${a}+${b}=${a + b}`
      );
    }
    // Cross-check: stated build-dep must equal a in "N build-dep + N source-only = total"
    if (a !== statedBuildDep) {
      violations.push(
        `Defense-in-Depth table build-dep count (${a}) ` +
        `≠ intro paragraph build-dep count (${statedBuildDep})`
      );
    }
    if (b !== statedSourceOnly) {
      violations.push(
        `Defense-in-Depth table source-only count (${b}) ` +
        `≠ intro paragraph source-only count (${statedSourceOnly})`
      );
    }
  }

  // Invariant 3: Engine count
  const realEngineCount = readEngineCount();
  const engineCountRe = /\b(\d+)\s+(?:engines|calculators)\b/g;
  const engineCountMatches = [...claudeMd.matchAll(engineCountRe)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n >= 50 && n <= 200); // filter to plausible engine counts
  const statedEngineCount = engineCountMatches[0];
  if (statedEngineCount === undefined) {
    violations.push(`Engine count not found in CLAUDE.md`);
  } else if (statedEngineCount !== realEngineCount) {
    violations.push(
      `Engine count drift: CLAUDE.md says ${statedEngineCount}, ` +
      `tests/engine-count.ts says ${realEngineCount}`
    );
  }

  // Invariant 4: Category count
  const realCategoryCount = countCategoryLetters();
  const categoryCountRe = /\b(\d+)\s+(?:categories|letters|category\s+letters)\b/g;
  const categoryCountMatches = [...claudeMd.matchAll(categoryCountRe)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n >= 10 && n <= 25); // filter to plausible category counts
  const statedCategoryCount = categoryCountMatches[0];
  if (statedCategoryCount === undefined) {
    violations.push(`Category count not found in CLAUDE.md`);
  } else if (statedCategoryCount !== realCategoryCount) {
    violations.push(
      `Category count drift: CLAUDE.md says ${statedCategoryCount}, ` +
      `src/data/categories.ts has ${realCategoryCount} letter IDs`
    );
  }

  assert.equal(
    violations.length,
    0,
    `CLAUDE.md invariant matrix drift (${violations.length} violation(s)):\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\n\nFix: update CLAUDE.md to match reality, then re-run. ` +
      `This guard prevents the documentation-drift class that occurred 4 times ` +
      `this thread (P121/P122/P123/P124 added 4 build-dep suites without CLAUDE.md update).`
  );
});