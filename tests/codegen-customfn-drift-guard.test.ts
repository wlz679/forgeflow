#!/usr/bin/env node
// P50 drift guard — 7 assertions enforcing scripts/codegen-customfn.mjs
// structural + reverse-mapping + dual integration smoke invariants.
//
// Mirrors tests/codegen-drift-guard.test.ts (P47 pattern) +
// tests/engine-count-by-category.test.ts (P49 reverse-mapping pattern).
//
// Why this test exists:
//   scripts/codegen-customfn.mjs owns the PRICING.json → customFn data table
//   codegen for 9 AI cost engines. P47 guarded codegen-examples.mjs;
//   codegen-customfn.mjs has the same drift surface (lookup tables, engine array,
//   marker strings, --check exit 0) but no test coverage. Without this guard, a
//   refactor can silently break: drop a family key from FAMILY_SHORT, lose an
//   engine from ENGINES, lose a marker in source (→ script silently skips → CI
//   green), or break idempotence (rerun writes files).
//
// What this test asserts:
//   T1 — FAMILY_SHORT lookup table present in scripts/codegen-customfn.mjs
//   T2 — FAMILY_SHORT contains 10 canonical family keys; ICON contains 4
//   T3 — fmt() function uses Number(n.toFixed(4)) (precision regression guard)
//   T4 — src/engines/ai-cost/*.ts (8 files) ↔ ENGINES[] reverse-mapping
//   T5 — Each ai-cost engine source file contains its registered end-marker
//   T6 — `node scripts/codegen-customfn.mjs --check` exits 0 with "No drift"
//   T7 — `node scripts/codegen-customfn.mjs` (rerun) is no-op: 0 updated +
//        ai-cost/*.ts content unchanged
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

const SCRIPT_PATH = path.join(ROOT, 'scripts/codegen-customfn.mjs');
const AI_COST_DIR = path.join(ROOT, 'src/engines/ai-cost');

// === Load SCRIPT_SOURCE once (matches P47 + P49 pattern) ===
const SCRIPT_SOURCE = fs.readFileSync(SCRIPT_PATH, 'utf8');

// === T1: FAMILY_SHORT lookup table present ===
test('T1: FAMILY_SHORT lookup table present in codegen-customfn.mjs', () => {
  assert.match(
    SCRIPT_SOURCE,
    /const FAMILY_SHORT = \{[\s\S]*?\};/,
    'FAMILY_SHORT lookup table missing. P50 audit: lookup-table breakage is the #1 silent-fail mode for codegen-customfn (a missing key silently renders unknown families as "lg").'
  );
});

// === T2: FAMILY_SHORT + ICON contain canonical entries ===
test('T2: FAMILY_SHORT has 10 family keys; ICON has 4 icon entries', () => {
  // FAMILY_SHORT canonical keys (from current codegen-customfn.mjs L28-37):
  //   openai: gpt5 / gpt41 / o-series / legacy (4)
  //   claude: mythos / claude4x (2)
  //   gemini: flash35 / pro / flash3 (3)
  //   deepseek: v4 (1)
  // Total: 10.
  for (const key of ['gpt5','gpt41','o-series','legacy','mythos','claude4x','flash35','pro','flash3','v4']) {
    assert.match(
      SCRIPT_SOURCE,
      new RegExp(`['"]${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"]:`),
      `FAMILY_SHORT missing canonical key "${key}". Family-icon rendering will silently fall through to default if a future PR drops it.`
    );
  }
  // ICON canonical keys: flash35 / pro / flash3 / legacy (4). ICON does not
  // cover mythos/claude4x/gpt5 etc. — those are LLM-only (no icons).
  for (const key of ['flash35','pro','flash3','legacy']) {
    assert.match(
      SCRIPT_SOURCE,
      new RegExp(`['"]${key.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')}['"]:`),
      `ICON missing canonical key "${key}". Image-gen engine family icons will silently fall through to default "◇".`
    );
  }
});

// === T3: fmt() uses Number(n.toFixed(4)) (precision regression guard) ===
test('T3: fmt() uses Number(n.toFixed(4)) (precision regression guard)', () => {
  // P40 audit: codegen-customfn originally used raw toFixed() which produced
  // "0.09999999". The Number() wrapper + 4-digit precision was the fix. If
  // future refactor drops the Number() wrapper, all customFn prices drift.
  assert.match(
    SCRIPT_SOURCE,
    /function fmt\([^)]*\)\s*\{[\s\S]*?Number\(n\.toFixed\(4\)\)[\s\S]*?\}/,
    'fmt() precision guard missing. Expected Number(n.toFixed(4)).toString() pattern (closes 0.09999999 drift class).'
  );
});

// === T4: src/engines/ai-cost/*.ts ↔ ENGINES[] reverse-mapping ===
test('T4: src/engines/ai-cost/*.ts has 1:1 mapping with ENGINES[] array', () => {
  // Read ai-cost/*.ts filenames from disk (P49 T4 pattern; exclude index.ts barrel).
  const aiCostFiles = fs.readdirSync(AI_COST_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');

  // Extract ENGINES[].file values via regex (avoids tsx eval cost).
  const engineFiles = new Set<string>();
  for (const m of SCRIPT_SOURCE.matchAll(/file:\s*'([^']+\.ts)'/g)) {
    engineFiles.add(m[1]);
  }

  // Reverse mapping A: every disk file appears in ENGINES[]
  const missingFromArray = aiCostFiles.filter(f => !engineFiles.has(f));
  assert.equal(
    missingFromArray.length,
    0,
    `ai-cost/*.ts files NOT in ENGINES[] array: ${missingFromArray.join(', ')}. These engines will NOT be processed by codegen-customfn → customFn data tables drift.`
  );

  // Reverse mapping B: every ENGINES[].file exists on disk
  const missingFromDisk = Array.from(engineFiles)
    .filter(f => !fs.existsSync(path.join(AI_COST_DIR, f)));
  assert.equal(
    missingFromDisk.length,
    0,
    `ENGINES[] references files not on disk: ${missingFromDisk.join(', ')}. These entries will throw at codegen time.`
  );
});

// === T5: every ai-cost engine source contains its registered end-marker ===
test('T5: every ai-cost engine source contains its registered end-marker (no silent skip)', () => {
  // codegen-customfn uses buildTableContent() which finds an end-marker
  // (e.g. "var FL=", "var ST=", "Family icons") in the source file to bound
  // the data table. If the marker is missing, buildTableContent() returns
  // null → script prints "⚠ markers not found (skipped)" and proceeds silently.
  // This assertion catches that drift class by requiring every ai-cost engine
  // source to contain AT LEAST one of the registered end-markers.
  //
  // The 7 markers currently in use (one per registered end-marker string):
  //   - "var FL="           (claude-api-cost-calculator)
  //   - "var FI="           (deepseek-api-cost-calculator)
  //   - "Family icons"      (openai-token-calculator, claude-api-cost-calculator)
  //   - "var ST="           (ai-image-generation-cost-calculator)
  //   - "var SCPG2="        (gpu-cloud-cost-calculator)
  //   - "var SCG="          (ai-training-cost-estimator, modelSizes section)
  //   - "Provider initials + colors" (ai-api-cost-comparison)
  const aiCostFiles = fs.readdirSync(AI_COST_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');
  const missing: string[] = [];
  for (const f of aiCostFiles) {
    const content = fs.readFileSync(path.join(AI_COST_DIR, f), 'utf8');
    const hasTableOpen = /"var (M|P|PS|PS2|GT|MS)=\{/.test(content);
    if (!hasTableOpen) {
      missing.push(`${f}: no table opening line ("var M={..." or similar)`);
      continue;
    }
    const hasEndMarker = /var (FL|FI|ST|SCPG2|SCG)=|Provider initials \+ colors|Family icons/.test(content);
    if (!hasEndMarker) {
      missing.push(`${f}: no end-marker found (codegen would return null → silent skip)`);
    }
  }
  assert.equal(
    missing.length,
    0,
    `Engines with broken markers (codegen would silently skip):\n  ${missing.join('\n  ')}`
  );
});

// === T6: codegen-customfn --check exit 0 + No drift ===
test('T6: codegen-customfn.mjs --check exits 0 with "No drift detected"', () => {
  const result = spawnSync('node', ['scripts/codegen-customfn.mjs', '--check'], {
    cwd: ROOT, encoding: 'utf8',
  });
  assert.equal(
    result.status,
    0,
    `codegen-customfn --check exited ${result.status}. stderr: ${result.stderr || '(empty)'}`
  );
  assert.match(
    result.stdout,
    /No drift detected/,
    `Expected "No drift detected" in stdout. Got: ${result.stdout}`
  );
});

// === T7: codegen-customfn rerun is no-op (mutation detection) ===
test('T7: codegen-customfn.mjs rerun writes 0 files (idempotent)', () => {
  // Backup ai-cost/*.ts (try/finally guarantees restore even on assertion failure).
  // codegen-customfn rewrites files in-place; no new files are created, so the
  // initial readdir snapshot is sufficient.
  const aiCostFiles = fs.readdirSync(AI_COST_DIR)
    .filter(f => f.endsWith('.ts') && f !== 'index.ts');
  const backup = new Map<string, string>();
  for (const f of aiCostFiles) {
    backup.set(f, fs.readFileSync(path.join(AI_COST_DIR, f), 'utf8'));
  }

  try {
    // Run codegen without --check → should write 0 files (state already in sync).
    const result = spawnSync('node', ['scripts/codegen-customfn.mjs'], {
      cwd: ROOT, encoding: 'utf8',
    });
    assert.equal(
      result.status,
      0,
      `codegen-customfn exited ${result.status}. stderr: ${result.stderr || '(empty)'}`
    );

    // Stdout must report 0 updates.
    assert.match(
      result.stdout,
      /Done\. 0 engine\(s\) updated\./,
      `Expected "Done. 0 engine(s) updated." (state should already be in sync). Got: ${result.stdout}\n` +
      `This means codegen would have written files. Investigate drift before committing.`
    );

    // Defense-in-depth: file contents unchanged.
    for (const f of aiCostFiles) {
      const after = fs.readFileSync(path.join(AI_COST_DIR, f), 'utf8');
      assert.equal(
        after,
        backup.get(f),
        `${f} content drifted during rerun. Backup != disk after spawn.`
      );
    }
  } finally {
    // Restore any files that did change (safety net for assertion failures mid-flight).
    for (const [f, content] of backup) {
      const current = fs.readFileSync(path.join(AI_COST_DIR, f), 'utf8');
      if (current !== content) {
        fs.writeFileSync(path.join(AI_COST_DIR, f), content);
      }
    }
  }
});
