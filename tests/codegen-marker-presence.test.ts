#!/usr/bin/env node
// P52 marker-presence drift guard — 7 assertions enforcing the integrity
// of the 3 codegen scripts' literal marker strings.
//
// Why this test exists:
//   Each codegen script locates specific sections via literal marker
//   substrings (HTML comments for check-engine-count-by-category,
//   tableEndMarker for codegen-customfn, 'staticExamples: [' for
//   codegen-examples). When a marker is missing, the script has a silent-
//   skip fallback that still returns PASS for --check. P52 closes this
//   drift class by cross-checking all 3 scripts.
//
// Class taxonomy:
//   Class A (T1-T2): HTML comment markers in check-engine-count-by-category.mjs
//   Class B (T3-T5): tableEndMarker values in codegen-customfn.mjs
//   Class C (T6-T7): 'staticExamples: [' marker + --check integration smoke
//
// Why tests/ root: P22b ESM trap — tests/run.mjs reads tests/*.test.ts only.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

// === Source files under test ===
const ENGINE_COUNT_CHECK_SCRIPT = path.join(ROOT, 'scripts/check-engine-count-by-category.mjs');
const CUSTOMFN_SCRIPT = path.join(ROOT, 'scripts/codegen-customfn.mjs');
const EXAMPLES_SCRIPT = path.join(ROOT, 'scripts/codegen-examples.mjs');

// === Load all 3 sources once ===
const ENGINE_COUNT_CHECK_SOURCE = fs.readFileSync(ENGINE_COUNT_CHECK_SCRIPT, 'utf8');
const CUSTOMFN_SOURCE = fs.readFileSync(CUSTOMFN_SCRIPT, 'utf8');
const EXAMPLES_SOURCE = fs.readFileSync(EXAMPLES_SCRIPT, 'utf8');

// === Class B: tableEndMarker list (P50 ground truth, byte-for-byte) ===
// Source line refs (verify against scripts/codegen-customfn.mjs if drifted):
//   'var FL='                       — line 97  (openai-token-calculator)
//   'Family icons'                  — line 53 / 75 (2 engines share; unique count = 1)
//   'var FI='                       — line 121 (gemini-api-cost-calculator)
//   'var ST='                       — line 157 (deepseek-api-cost-calculator)
//   'var SCPG2='                    — line 176 (ai-api-cost-comparison)
//   '"var MS={" +'                  — line 193 (ai-image-generation-cost-calculator)
//   'var SCG='                      — line 207 (gpu-cloud-cost-calculator)
//   'Provider initials + colors'    — line 138 (ai-training-cost-estimator)
const TABLE_END_MARKERS = [
  'var FL=',
  'Family icons',
  'var FI=',
  'var ST=',
  'var SCPG2=',
  '"var MS={" +',
  'var SCG=',
  'Provider initials + colors',
];

// === Class A: HTML comment markers ===
const HTML_MARKER_START = '<!-- codegen:start engine-count -->';
const HTML_MARKER_END = '<!-- codegen:end -->';

// === Class C: codegen-examples marker ===
const EXAMPLES_MARKER = 'staticExamples: [';

// ===== Class A: HTML comment markers (T1 + T2) =====

// T1: both markers present in check-engine-count-by-category.mjs source
test('T1: scripts/check-engine-count-by-category.mjs has both HTML codegen markers', () => {
  assert.match(
    ENGINE_COUNT_CHECK_SOURCE,
    new RegExp(HTML_MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Missing start marker: ${HTML_MARKER_START}`
  );
  assert.match(
    ENGINE_COUNT_CHECK_SOURCE,
    new RegExp(HTML_MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
    `Missing end marker: ${HTML_MARKER_END}`
  );
});

// T2: the 2 HTML markers are unique strings (defense against accidental duplication)
test('T2: HTML markers are unique (no accidental duplication)', () => {
  assert.notEqual(
    HTML_MARKER_START,
    HTML_MARKER_END,
    'Start and end markers must be distinct strings'
  );
  // Also verify no duplicate occurrence within the script source
  const startCount = (ENGINE_COUNT_CHECK_SOURCE.match(new RegExp(HTML_MARKER_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  const endCount = (ENGINE_COUNT_CHECK_SOURCE.match(new RegExp(HTML_MARKER_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  assert.equal(startCount, 1, `Expected 1 occurrence of start marker, found ${startCount}`);
  assert.equal(endCount, 1, `Expected 1 occurrence of end marker, found ${endCount}`);
});

// ===== Class B: tableEndMarker (T3 + T4 + T5) =====

// T3: codegen-customfn.mjs source contains all 8 expected tableEndMarker strings
test('T3: scripts/codegen-customfn.mjs contains all 8 tableEndMarker values', () => {
  for (const marker of TABLE_END_MARKERS) {
    assert.ok(
      CUSTOMFN_SOURCE.includes(marker),
      `Missing tableEndMarker in source: "${marker}". If a marker was renamed, ` +
        `update TABLE_END_MARKERS in this test file (scripts/codegen-customfn.mjs is source of truth).`
    );
  }
});

// T4: 8 unique marker values (not 7, not 9 — accounts for 'Family icons' dual-engine reuse)
test('T4: codegen-customfn.mjs has exactly 8 unique tableEndMarker values', () => {
  const matches = CUSTOMFN_SOURCE.match(/tableEndMarker:\s*'([^']+)'/g) || [];
  const unique = new Set(matches.map((m) => m.match(/'([^']+)'/)![1]));
  assert.equal(
    unique.size,
    TABLE_END_MARKERS.length,
    `Expected ${TABLE_END_MARKERS.length} unique tableEndMarker values, found ${unique.size}: ` +
      `${[...unique].join(', ')}`
  );
});

// T5: marker array presence matches TABLE_END_MARKERS (defense against drift)
test('T5: TABLE_END_MARKERS matches codegen-customfn.mjs source exactly', () => {
  const sourceMarkers = [
    ...new Set(
      (CUSTOMFN_SOURCE.match(/tableEndMarker:\s*'([^']+)'/g) || []).map(
        (m) => m.match(/'([^']+)'/)![1]
      )
    ),
  ].sort();
  const testMarkers = [...TABLE_END_MARKERS].sort();
  assert.deepEqual(
    sourceMarkers,
    testMarkers,
    `TABLE_END_MARKERS drift detected.\nSource has: ${sourceMarkers.join(' | ')}\n` +
      `Test has:  ${testMarkers.join(' | ')}`
  );
});

// ===== Class C: codegen-examples (T6 + T7) =====

// T6: scripts/codegen-examples.mjs has 'staticExamples: [' marker (line 314)
test('T6: scripts/codegen-examples.mjs has "staticExamples: [" marker', () => {
  assert.match(
    EXAMPLES_SOURCE,
    new RegExp(`const marker = '${EXAMPLES_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}'`),
    `Missing marker declaration. Source should contain: const marker = '${EXAMPLES_MARKER}'`
  );
});

// T7: integration smoke — codegen-examples --check exits 0 + "PASSED"
test('T7: codegen-examples.mjs --check exits 0 with "PASSED"', () => {
  const result = spawnSync('node', ['scripts/codegen-examples.mjs', '--check'], {
    cwd: ROOT,
    encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `codegen-examples --check exited ${result.status}. stderr: ${result.stderr || '(empty)'}`
  );
  assert.match(
    result.stdout,
    /PASSED/,
    `Expected "PASSED" in stdout. Got: ${result.stdout}`
  );
});
