#!/usr/bin/env node
// P47 drift-guard regression test for the P42 Date mock.
//
// Why this test exists:
//   P41 was a cosmetic fix (regen mrr-calculator's Sep→Oct 2027 date label).
//   P42 closed the root cause by injecting `globalThis.Date` mock in
//   `scripts/codegen-examples.mjs`'s `buildRunnerScript()` so `new Date()`
//   returns a fixed REFERENCE_DATE = 2026-07-15 during codegen.
//
//   Without this drift-guard, a future refactor could silently break the
//   mock (e.g., move it AFTER engine imports, change the date constant,
//   remove the static now() override) and reintroduce the time-passive
//   drift that P41-P42 closed.
//
// What this test asserts:
//   T1 — Mock block is present in codegen script
//   T2 — REFERENCE_DATE is locked at 2026-07-15 (the P42 canonical date)
//   T3 — Mock block is positioned BEFORE `async function main()` so it
//        applies to engine imports (ordering matters; see P22b ESM race)
//   T4 — Mock overrides `Date.now()` (covers `Date.now()` callsites)
//   T5 — mrr-calculator still has date logic in staticExamples[0] (the
//        regression target that P41 fixed and P42 made drift-proof)
//   T6 — burn-rate-calculator exists and references its date logic
//   T7 — `codegen-examples.mjs --check` exit 0 (smoke integration)
//
// Out of scope:
//   - T7 was originally planned as "REFERENCE_DATE shift produces
//     proportional date-only output shift" (P42 sanity test pattern) —
//     skipped per YAGNI; P42 ship memory documents manual validation.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SCRIPT_PATH = path.join(ROOT, 'scripts', 'codegen-examples.mjs');
const MRR_PATH = path.join(ROOT, 'src/engines/saas/mrr-calculator.ts');
const BURN_RATE_PATH = path.join(ROOT, 'src/engines/saas/burn-rate-calculator.ts');

// Load the codegen script source ONCE for all static assertions.
// We do this synchronously at test-file load time (matches the engine-count.ts
// pattern; see that file's P22b ESM evaluation-order lesson).
const SCRIPT_SOURCE = fs.readFileSync(SCRIPT_PATH, 'utf8');

// === T1: Mock block is present ===

test('T1: Date mock block is present in scripts/codegen-examples.mjs', () => {
  assert.match(
    SCRIPT_SOURCE,
    /\(globalThis as any\)\.Date = class extends RealDate/,
    'P42 Date mock missing from scripts/codegen-examples.mjs. P42 closed mrr-calculator drift via this mock — removing it reintroduces time-passive drift across month boundaries.'
  );
});

// === T2: REFERENCE_DATE locked at canonical P42 date ===

test('T2: REFERENCE_DATE locked at 2026-07-15 (P42 canonical date)', () => {
  assert.match(
    SCRIPT_SOURCE,
    /const REFERENCE_DATE = new Date\(['"]2026-07-15T00:00:00Z['"]\)/,
    'REFERENCE_DATE drift. P42 lock date is 2026-07-15 (the day P42 was designed). Changing it shifts all staticExamples[0] date labels — that shift must be intentional, not accidental.'
  );
});

// === T3: Mock block positioned BEFORE main() ===

test('T3: Date mock appears BEFORE `async function main()` (ordering matters)', () => {
  const mockIdx = SCRIPT_SOURCE.indexOf('(globalThis as any).Date = class extends RealDate');
  const mainIdx = SCRIPT_SOURCE.indexOf('async function main()');
  assert.ok(mockIdx > 0, 'mock block not found in script');
  assert.ok(mainIdx > 0, 'main() not found in script');
  assert.ok(
    mockIdx < mainIdx,
    `Mock block at offset ${mockIdx} appears AFTER main() at offset ${mainIdx}. Mock must be set BEFORE engine imports (the engine 'await import(...)' lines run inside main, but module-level Date references would NOT be mocked).`
  );
});

// === T4: Mock overrides Date.now() ===

test('T4: Date mock overrides Date.now() static method', () => {
  // Sanity: if any engine uses `Date.now()` (not just `new Date()`), the
  // mock must intercept it. P42 audit confirmed only mrr-calculator +
  // burn-rate-calculator use `new Date()`, but Date.now() defense is
  // cheap insurance.
  assert.match(
    SCRIPT_SOURCE,
    /static now\(\) \{[\s\S]*?return REFERENCE_DATE\.getTime\(\);?[\s\S]*?\}/,
    'Date.now() override missing from mock. P42 spec §Risks required this for `Date.now()` callsites; engines currently do not call Date.now() but the override is defensive.'
  );
});

// === T5: mrr-calculator has date logic in staticExamples[0] ===

test('T5: mrr-calculator has dateLabel() helper + monthNames array', () => {
  // P41 fixed this exact label ($50K MRR: 14.4 months (~Sep 2027)) drifting
  // to (~Oct 2027). P42 mock makes it stable. If future refactor strips
  // the dateLabel() helper or monthNames array, this assertion fails.
  const mrrSource = fs.readFileSync(MRR_PATH, 'utf8');
  assert.match(
    mrrSource,
    /const dateLabel\s*=\s*\(/,
    'mrr-calculator dateLabel() helper missing. P41+P42 chain documented this as the drift-prone call site. If removed, the drift guard against month-boundary drift is meaningless.'
  );
  assert.match(
    mrrSource,
    /const monthNames\s*=\s*\[/,
    'mrr-calculator monthNames array missing. Required by dateLabel() helper; P42 mock only protects existing date logic, not added date logic.'
  );
});

// === T6: burn-rate-calculator still exists ===

test('T6: burn-rate-calculator exists with date-aware logic', () => {
  // P42 audit listed burn-rate-calculator as latent risk (cash-positive
  // branch hides it but input tweak could expose). Test that the file
  // exists + references a dateLabel/runOutLabel helper.
  assert.ok(fs.existsSync(BURN_RATE_PATH), 'burn-rate-calculator.ts missing');
  const burnSource = fs.readFileSync(BURN_RATE_PATH, 'utf8');
  assert.match(
    burnSource,
    /runOutLabel|dateLabel|monthNames/,
    'burn-rate-calculator date helper missing. P42 audit flagged this as latent risk; the mock protects it but the date logic must exist for the protection to matter.'
  );
});

// === T7: codegen-examples.mjs --check exit 0 (smoke integration) ===

test('T7: codegen-examples.mjs --check exits 0 with PASSED message', () => {
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
    `codegen-examples --check did not report PASSED. stdout: ${result.stdout}`
  );
});