#!/usr/bin/env node
// P51 drift guard — 5 assertions enforcing scripts/codegen-examples.mjs
// P42 Date mock structural presence + runtime apply + integration smoke.
//
// Mirrors tests/codegen-drift-guard.test.ts (P47 structural pattern) +
// tests/codegen-customfn-drift-guard.test.ts (P50 reverse-mapping/smoke pattern).
//
// Why this test exists:
//   scripts/codegen-examples.mjs:buildRunnerScript() injects a Date mock into
//   the runner subprocess so that engine.generate() calls see REFERENCE_DATE
//   instead of the wall-clock Date.now(). P47 guards structural presence
//   (mock exists in source, REFERENCE_DATE locked at 2026-07-15, etc.), but
//   does NOT verify the mock actually applies at runtime — a refactor can
//   silently break date drift-proofing while passing P47. This test closes
//   that runtime gap using a temp-dir mini tsx runner that imports mrr-calculator
//   and calls engine.generate() under both mock-applied and mock-removed conditions.
//
// What this test asserts:
//   T1 — P42 mock block declaration present in scripts/codegen-examples.mjs
//   T2 — REFERENCE_DATE locked at 2026-07-15 (P42 canonical)
//   T3 — With mock applied, mrr-calculator.generate(defaultInputs)[0] contains
//        "~Sep 2027" (REFERENCE_DATE-derived date label, ground truth at
//        src/engines/saas/mrr-calculator.ts:425)
//   T4 — With mock REMOVED, the same call's output does NOT contain "~Sep 2027"
//        (wall-clock today=2026-07-21 + 14.4 months projects to ~Oct 2027)
//   T5 — `node scripts/codegen-examples.mjs --check` exits 0 with "PASSED"
//
// Why tests/ root: P22b ESM trap — tests/run.mjs reads tests/*.test.ts only.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');

const SCRIPT_PATH = path.join(ROOT, 'scripts/codegen-examples.mjs');
const MRR_CALC_PATH = path.join(ROOT, 'src/engines/saas/mrr-calculator.ts');

// === Load SCRIPT_SOURCE once (P47 + P50 pattern) ===
const SCRIPT_SOURCE = fs.readFileSync(SCRIPT_PATH, 'utf8');

// === Inline mock block (P42 source-of-truth, copy verbatim from
// scripts/codegen-examples.mjs:236-249 buildRunnerScript()) ===
const MOCK_BLOCK = `
const REFERENCE_DATE = new Date('2026-07-15T00:00:00Z');
const RealDate = Date;
(globalThis as any).Date = class extends RealDate {
  constructor(...args: any[]) {
    if (args.length === 0) {
      super(REFERENCE_DATE.getTime());
      return;
    }
    super(...(args as []));
  }
  static now() {
    return REFERENCE_DATE.getTime();
  }
} as any;
`;

// === Default inputs (ground truth: scripts/codegen-examples.mjs:122) ===
const MRR_DEFAULTS = {
  subscriberCount: '500',
  monthlyPrice: '29',
  monthlyChurnRate: '3',
  expansionMRR: '800',
  newSubsPerMonth: '100',
  contractionMRR: '150',
  reactivationMRR: '100',
};

// === T1: P42 mock block present in source ===
test('T1: P42 Date mock declaration present in codegen-examples.mjs', () => {
  assert.match(
    SCRIPT_SOURCE,
    /\(globalThis as any\)\.Date = class extends RealDate/,
    'P42 Date mock declaration missing. P51 audit: the structural pattern that P47 ' +
    'guards is the (globalThis as any).Date = class extends RealDate block. If this ' +
    'is absent (e.g. moved to a helper module that buildRunnerScript no longer imports), ' +
    'the runtime mock-apply silently breaks even though P47 passes.'
  );
});

// === T2: REFERENCE_DATE locked at 2026-07-15 (P42 canonical) ===
test('T2: REFERENCE_DATE locked at 2026-07-15 (P42 canonical)', () => {
  assert.match(
    SCRIPT_SOURCE,
    /REFERENCE_DATE = new Date\('2026-07-15T00:00:00Z'\)/,
    'REFERENCE_DATE not locked at 2026-07-15. P42 ground-truth: REFERENCE_DATE = ' +
    "new Date('2026-07-15T00:00:00Z'). Changing this date invalidates all 100 engines' " +
    'staticExamples[0] date labels (codegen would need to regenerate, and adjacent tests ' +
    'asserting date strings would break).'
  );
});

// === Runner helper: spawn inline tsx that calls engine.generate(defaults)[0] ===
function runGenerate(includeMock: boolean): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p51-mock-apply-'));
  const runnerPath = path.join(tmpDir, 'runner.ts');

  const mockBlock = includeMock ? MOCK_BLOCK : '';
  // Wrap in async IIFE — tsx on Windows emits CJS by default, which doesn't
  // support top-level await. Mirrors scripts/codegen-examples.mjs:251,267
  // (async function main() { ... } main().catch(...)).
  // Use file:// URLs — Windows ESM loader rejects raw absolute paths
  // (ERR_UNSUPPORTED_ESM_URL_SCHEME: only file, data, node protocols allowed).
  const registryImport = pathToFileURL(path.join(ROOT, 'src/core/engines/registry.ts')).href;
  const mrrImport = pathToFileURL(MRR_CALC_PATH).href;
  const runnerSource = `
    ${mockBlock}
    import { getEngine } from '${registryImport}';
    async function main() {
      await import('${mrrImport}');
      const engine = getEngine('solopreneur-mrr-calculator');
      const ex0 = engine.generate(${JSON.stringify(MRR_DEFAULTS)})[0];
      process.stdout.write(ex0);
    }
    main().catch(e => { console.error(e); process.exit(1); });
  `;
  fs.writeFileSync(runnerPath, runnerSource, 'utf8');

  try {
    const result = spawnSync('npx.cmd', ['tsx', runnerPath], {
      cwd: ROOT, encoding: 'utf8', shell: true,
    });
    if (result.status !== 0) {
      throw new Error(
        `runner.ts (mock=${includeMock}) exited ${result.status}.\n` +
        `stdout: ${result.stdout}\nstderr: ${result.stderr}`
      );
    }
    return result.stdout;
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

// === T3: mock applied → output contains "~Sep 2027" (drift-proof substring) ===
test('T3: mock applied → mrr-calculator.generate output contains "~Sep 2027"', () => {
  // Mock should override Date so generate() projects +14.4 months from
  // REFERENCE_DATE (2026-07-15) → ~Sep 2027 (drift-proof).
  // Substring ground truth: src/engines/saas/mrr-calculator.ts:425
  const stdout = runGenerate(true);
  assert.match(
    stdout,
    /~Sep 2027/,
    `Mock not applied: expected "~Sep 2027" (REFERENCE_DATE-derived), got: ${stdout.substring(0, 200)}`
  );
});

// === T4: mock removed → output does NOT contain "~Sep 2027" ===
// (defense-in-depth: proves the mock CHANGES the output, not a constant in generate)
test('T4: mock removed → output does NOT contain "~Sep 2027"', () => {
  // Without the mock, today (~2026-07-21) + 14.4 months projects to ~Oct 2027,
  // NOT "~Sep 2027". So the substring absence proves generate() actually reads
  // Date.now() / new Date() and the mock IS what changes the output.
  // Substring ground truth: src/engines/saas/mrr-calculator.ts:425
  const stdout = runGenerate(false);
  assert.ok(
    !/~Sep 2027/.test(stdout),
    `Mock removed but output still has "~Sep 2027". Either:\n` +
    `  (a) mrr-calculator.generate() doesn't actually use Date internally (then T3 was a false-pass);\n` +
    `  (b) the wall-clock today happens to be in a window where the substring appears (unlikely but check).\n` +
    `Output was: ${stdout.substring(0, 200)}`
  );
});

// === T5: codegen-examples --check exit 0 + "PASSED" (integration smoke) ===
test('T5: codegen-examples.mjs --check exits 0 with "PASSED"', () => {
  const result = spawnSync('node', ['scripts/codegen-examples.mjs', '--check'], {
    cwd: ROOT, encoding: 'utf8',
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