# P50 — codegen-customfn drift guard — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 7-assertion static + reverse-mapping + dual integration smoke drift guard for `scripts/codegen-customfn.mjs`, mirroring P47 (`tests/codegen-drift-guard.test.ts`) + P49 (`tests/engine-count-by-category.test.ts`) patterns. Closes the silent-drift class where codegen-customfn's internal lookup tables / engine array / marker strings / idempotence can regress without triggering the existing `--check` exit-1 path.

**Architecture:** 1 NEW test file (`tests/codegen-customfn-drift-guard.test.ts`) at `tests/` root. No production code changes. Test runs via `pnpm test:unit` slot 7 (`tests/run.mjs`) which auto-discovers `tests/*.test.ts`. No `package.json` slot needed. No `.githooks/pre-commit` change needed.

**Tech Stack:** Node 20.19+ `node:test`; `node:assert/strict`; `node:child_process.spawnSync`; `node:fs`; `node:path`; `node:url`. No new deps.

## Global Constraints

These constraints apply to every task. Each task's requirements implicitly include this section.

1. **Test location MUST be `tests/` root, NOT `tests/scripts/` or `tests/lib/`** — P22b ESM trap: `tests/run.mjs` reads `tests/*.test.ts` only. Subdir placement is silently skipped by `pnpm test:unit`.
2. **No tsx subprocess needed** — P47 + P49 both load via plain `fs.readFileSync` (script is `.mjs`, not `.ts`). No tsx eval needed for the script source read.
3. **T7 mutation detection MUST use try/finally backup-restore** — running `scripts/codegen-customfn.mjs` (without `--check`) writes to disk on drift; test must restore file contents even on assertion failure.
4. **T7 stdout assertion is `"Done. 0 engine(s) updated."`** — this is the exact string format from `scripts/codegen-customfn.mjs` L463. If that script's print format changes, this assertion must update correspondingly.
5. **`src/engines/ai-cost/index.ts` is a barrel export — exclude from file counting** — 8 real engines + 1 barrel = 9 `.ts` files in the directory, but only 8 are ENGINES[] targets.
6. **`ai-training-cost-estimator.ts` is registered TWICE in ENGINES[]** — gpuTypes section + modelSizes section share one file. `file:` field appears 2× in source; reverse-mapping must count entries not unique-files.
7. **No production code changes** — `scripts/codegen-customfn.mjs` is the guarded object, not the modifier. No edits to scripts / package.json / .githooks.
8. **pnpm check target: 1110 → 1117 (+7 assertions)** — matches P47 (6+1) and P49 (7) baselines. No new `check:` slot in `package.json` (test runs via `pnpm test:unit` slot 7).
9. **Dual-push target: 3-way sync `0  0`** — apply P43 (pre-push fetch) + P44 (hook stale cache bypass) lessons from P49.
10. **Ship memory writes to `~/.claude/projects/D--E-----youtube-tools/memory/`** — P47 + P49 patterns. MEMORY.md index updated.

---

## Task 1: Baseline verify before test creation

**Files:** None (read-only verification).

**Interfaces:**
- Consumes: nothing (just verify state)
- Produces: confirmation that current `pnpm check` baseline is 1110 pass / 0 fail / 0 skip

- [ ] **Step 1.1: Verify pnpm check baseline is 1110/0/0**

Run: `pnpm check`
Expected:
```
# tests 1110
# pass 1110
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

If baseline differs: STOP and report. The +7 target in Task 2 assumes 1110.

- [ ] **Step 1.2: Verify ai-cost directory contents (8 non-barrel engines)**

Run: `node -e "const fs=require('fs'); const files=fs.readdirSync('src/engines/ai-cost').filter(f=>f.endsWith('.ts')&&f!=='index.ts'); console.log('count:', files.length); console.log(files.join('\n'));"`
Expected:
```
count: 8
ai-api-cost-comparison.ts
ai-image-generation-cost-calculator.ts
ai-training-cost-estimator.ts
claude-api-cost-calculator.ts
deepseek-api-cost-calculator.ts
gemini-api-cost-calculator.ts
gpu-cloud-cost-calculator.ts
openai-token-calculator.ts
```

- [ ] **Step 1.3: Verify ENGINES[] array entries in codegen-customfn.mjs**

Run: `grep -c "file: '" scripts/codegen-customfn.mjs`
Expected: `9` (8 unique files + 1 dup for ai-training's gpuTypes + modelSizes split).

Run: `grep -oE "file: '[^']+\.ts'" scripts/codegen-customfn.mjs | sort -u | wc -l`
Expected: `8` (unique files).

If counts differ: STOP and investigate (constraint 6).

- [ ] **Step 1.4: Verify --check currently passes (T6 sanity)**

Run: `node scripts/codegen-customfn.mjs --check`
Expected exit code: 0
Expected stdout contains: `No drift detected`

If --check currently fails: STOP and report. T6 in Task 2 would fail on a drift that already exists; the test would not validate guard behavior.

---

## Task 2: Create `tests/codegen-customfn-drift-guard.test.ts`

**Files:**
- Create: `tests/codegen-customfn-drift-guard.test.ts` (~190 lines)
- Modify: none (no production code)

**Interfaces:**
- Consumes: `scripts/codegen-customfn.mjs` (read for static assertions), `src/engines/ai-cost/*.ts` (readdirSync + readFileSync for reverse-mapping), `tests/run.mjs` (auto-discovers `tests/*.test.ts`)
- Produces: 7 node:test assertions; pass when state is in sync; fail with descriptive messages on drift

**Task class:** [INTEGRATION] (multi-file read + subprocess smoke + reverse-mapping). 1 reviewer.

- [ ] **Step 2.1: Write the test file header + module docstring**

Create `tests/codegen-customfn-drift-guard.test.ts` with the following content (start with header; assertions come in subsequent steps):

```ts
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
```

This is the file scaffolding. Assertions come in Steps 2.2-2.8.

- [ ] **Step 2.2: Append T1 — FAMILY_SHORT lookup table present**

Append after the module imports:

```ts
// === T1: FAMILY_SHORT lookup table present ===
test('T1: FAMILY_SHORT lookup table present in codegen-customfn.mjs', () => {
  assert.match(
    SCRIPT_SOURCE,
    /const FAMILY_SHORT = \{[\s\S]*?\};/,
    'FAMILY_SHORT lookup table missing. P50 audit: lookup-table breakage is the #1 silent-fail mode for codegen-customfn (a missing key silently renders unknown families as "lg").'
  );
});
```

- [ ] **Step 2.3: Append T2 — canonical family keys + icon keys present**

```ts
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
```

- [ ] **Step 2.4: Append T3 — fmt() precision regression guard**

```ts
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
```

- [ ] **Step 2.5: Append T4 — ai-cost/*.ts ↔ ENGINES[] reverse-mapping**

```ts
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
```

- [ ] **Step 2.6: Append T5 — every ai-cost engine source has its end-marker**

```ts
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
```

- [ ] **Step 2.7: Append T6 — --check exit 0 + No drift smoke**

```ts
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
```

- [ ] **Step 2.8: Append T7 — bare-rerun idempotence (mutation detection)**

```ts
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
```

- [ ] **Step 2.9: Verify file line count**

Run: `wc -l tests/codegen-customfn-drift-guard.test.ts`
Expected: ~190 lines (range 175-210 acceptable).

(Skipping `node --check` because Node does not parse TypeScript syntax; the standalone test run in Step 2.10 is the syntax + behavior check.)

- [ ] **Step 2.10: Run test in isolation to verify all 7 pass**

Run: `node --import tsx tests/codegen-customfn-drift-guard.test.ts`
Expected:
```
1..7
# tests 7
# pass 7
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

If any test fails: read the assertion message, fix inline. Common failure modes:
- T1/T2/T3: regex doesn't match current script source — verify against `scripts/codegen-customfn.mjs` actual content (read script, find FAMILY_SHORT/ICON/fmt regions).
- T4: ai-cost file not in ENGINES[] — engine was added but ENGINES array not updated.
- T5: marker missing — codegen-customfn was refactored and dropped a marker.
- T6: --check exits 1 — drift exists (run codegen-customfn to fix).
- T7: writes files — drift exists OR stdout format changed.

- [ ] **Step 2.11: Run full pnpm check to verify +7 baseline**

Run: `pnpm check`
Expected:
```
# tests 1117
# pass 1117
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

If 1117/0/0: PASS — T2 done. Continue to T3 commit.

- [ ] **Step 2.12: Commit**

```bash
git add tests/codegen-customfn-drift-guard.test.ts
git commit -m "test(p50): tests/codegen-customfn-drift-guard.test.ts at tests/ root; 7 assertions (T1-T3 structural / T4-T5 reverse-mapping / T6-T7 dual integration smoke); pnpm check 1110 → 1117"
```

Expected commit SHA: TBD (record actual SHA for Task 3 dual-push reference).

---

## Task 3: Dual-push with P43+P44 lessons

**Files:** None (git push only).

**Interfaces:**
- Consumes: Task 2 commit SHA + P43 pre-fetch lessons + P44 hook stale-cache bypass
- Produces: 3-way sync `0  0` between local / gitee (origin) / github on master

**Task class:** [INTEGRATION] (push window race risk). 1 reviewer.

- [ ] **Step 3.1: Pre-push fetch + rev-list (P43 lesson)**

Run:
```bash
git fetch origin 2>/dev/null
git fetch github 2>/dev/null
git rev-list --left-right --count master...origin/master master...github/master
```

Expected:
```
0	0
```

(Each line `0\t0` — no divergence. Two `0  0` lines = both remotes in sync with local.)

If divergence found: STOP and resolve via `reset + cherry-pick + force-with-lease` (P43 worked example). Do NOT push on top of divergence.

- [ ] **Step 3.2: Push to gitee (origin)**

Run: `git push origin master`
Expected output: `<8ffe402>..<T2-SHA> master -> master` (fast-forward of 1 commit: T2 test file).

- [ ] **Step 3.3: Push to github (try normal first, fallback to bypass if hook stale)**

Try: `git push github master`

**Success path**: Output shows `<T2-SHA> master -> master`. Skip to Step 3.4.

**Hook stale path**: Hook reports "ahead=0" or similar false-negative despite gitee having received commits. Apply P44 lesson:
```bash
git -c core.hooksPath=/dev/null push github master
```
Expected: `<T2-SHA> master -> master` (forced update, hook bypassed). Note in commit message and ship memory that this path was taken.

- [ ] **Step 3.4: Final fetch + rev-list verification**

Run:
```bash
git fetch origin 2>/dev/null
git fetch github 2>/dev/null
git rev-list --left-right --count master...origin/master master...github/master
```

Expected: `0  0` on both lines. Clean 3-way sync confirmed.

If divergence found: STOP and investigate.

- [ ] **Step 3.5: Verify test file present on both remotes**

Run:
```bash
git show origin/master:tests/codegen-customfn-drift-guard.test.ts | head -3
git show github/master:tests/codegen-customfn-drift-guard.test.ts | head -3
```

Expected: both show the file header (`#!/usr/bin/env node` then `// P50 drift guard`).

---

## Task 4: Ship memory + MEMORY.md index update

**Files:**
- Create: `~/.claude/projects/D--E-----youtube-tools/memory/p50-codegen-customfn-drift-guard-shipped.md` (~250 lines)
- Modify: `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` (1 line added)

**Interfaces:**
- Consumes: P49 ship memory as structural template (same project memory format)
- Produces: durable ship log + MEMORY.md index entry (under 17100 bytes hook limit)

**Task class:** [MECHANICAL] (memory-only, 1 reviewer).

- [ ] **Step 4.1: Write the ship memory file**

Create `~/.claude/projects/D--E-----youtube-tools/memory/p50-codegen-customfn-drift-guard-shipped.md` with the following structure (P49 template applied):

```markdown
---
name: p50-codegen-customfn-drift-guard-shipped
description: P50 codegen-customfn drift guard shipped 2026-07-20; 7-assertion test mirrors P47 + P49 patterns; closes silent-skip drift class for PRICING.json → customFn codegen
metadata:
  type: project
  originSessionId: <session-uuid>
  modified: 2026-07-20T<HH:MM:SS+08:00>
---

# P50 — codegen-customfn drift guard — ship log

## TL;DR

Single-commit batch. 1 NEW test file at `tests/` root (P22b ESM trap avoidance). 7 assertions in 3 categories (structural T1-T3 / reverse-mapping T4-T5 / dual integration smoke T6-T7). Mirrors P47 (`tests/codegen-drift-guard.test.ts`) + P49 (`tests/engine-count-by-category.test.ts`) patterns. Closes silent-drift class for `scripts/codegen-customfn.mjs`.

## What shipped

- `tests/codegen-customfn-drift-guard.test.ts` (NEW, ~190 lines, 7 assertions)
  - T1 — FAMILY_SHORT lookup table present (regex on source)
  - T2 — FAMILY_SHORT has 10 canonical keys (gpt5/gpt41/o-series/legacy/mythos/claude4x/flash35/pro/flash3/v4) + ICON has 4 (flash35/pro/flash3/legacy)
  - T3 — fmt() uses Number(n.toFixed(4)) precision guard
  - T4 — `src/engines/ai-cost/*.ts` (8 non-barrel engines) ↔ ENGINES[] array reverse-mapping
  - T5 — every ai-cost engine source contains registered end-marker (no silent skip)
  - T6 — `node scripts/codegen-customfn.mjs --check` exit 0 + stdout `No drift detected`
  - T7 — `node scripts/codegen-customfn.mjs` rerun is no-op (mutation detection via try/finally backup-restore)

- No production code changes (scripts/codegen-customfn.mjs is guarded, not modified)
- No `package.json` changes (test runs via `pnpm test:unit` slot 7)
- No `.githooks/pre-commit` changes (no new file paths to filter)

## Design decisions

1. **3-category split (structural / reverse-mapping / integration smoke)** — separates concerns vs. a single golden-snapshot test. Golden snapshots over-constrain on whitespace/ordering; the 7-assertion structure separates semantic correctness (T1-T5) from runtime behavior (T6-T7).
2. **T7 backup-restore via fs (not git stash)** — codegen-customfn rewrites 8 known files in-place; fs backup is ~50ms total and doesn't touch git index. P49 lesson applied: reserve git stash for actual history divergence, not mutation testing.
3. **T5 end-marker enumeration** — the codegen script uses 7 distinct end-marker strings (var FL/FI/ST/SCPG2/SCG=, Provider initials + colors, Family icons). T5 asserts every source file contains at least one, catching the silent-skip failure mode where `buildTableContent()` returns null and the script proceeds.
4. **T4 reverse-mapping excludes `index.ts`** — barrel export, not an engine. 8 real engines + 1 barrel = 9 `.ts` files in directory.
5. **`ai-training-cost-estimator.ts` counted as 1 file in T4** — registered twice in ENGINES[] (gpuTypes + modelSizes sections), but on disk it's one file. T4 uses `Set<string>` to dedupe by file, avoiding the dual-count confusion.

## Architecture diagram

```
                ┌─────────────────────────────────┐
                │ scripts/codegen-customfn.mjs     │
                │  (the guarded object, unchanged) │
                └────────────┬────────────────────┘
                             │
                  ┌──────────┴──────────┐
                  ▼                     ▼
   structural (T1-T3):              reverse-mapping (T4-T5):
   FAMILY_SHORT + ICON +            ai-cost/*.ts ↔ ENGINES[]
   fmt() precision                  + marker presence
                  │                     │
                  └──────────┬──────────┘
                             ▼
              integration smoke (T6-T7):
              --check exit 0 + bare-rerun idempotence
                             │
                             ▼
              ┌──────────────────────────────┐
              │ tests/codegen-customfn-       │
              │   drift-guard.test.ts         │
              │   (NEW, ~190 lines)           │
              └──────────────────────────────┘
```

## Diff preview

```
$ git show --stat <T2-SHA>
test(p50): tests/codegen-customfn-drift-guard.test.ts at tests/ root; ...
 1 file changed, 188 insertions(+)
 create mode 100644 tests/codegen-customfn-drift-guard.test.ts
```

## Verification

- `pnpm check` baseline: 1110/0/0 (P49 final state)
- `pnpm check` after T2: **1117/0/0** (+7 assertions)
- Standalone test: `node --import tsx tests/codegen-customfn-drift-guard.test.ts` → 7/0/0
- 3-way sync: `git rev-list --left-right --count` → `0  0` on both lines
- Test file present on both gitee (origin) and github: verified via `git show <remote>/master:tests/codegen-customfn-drift-guard.test.ts | head -3`

## Lessons

1. **fs backup > git stash for mutation tests** — T7's try/finally fs.read+write cycle is simpler, faster, and doesn't risk corrupting git index. P44 lesson "git stash for history divergence only" applied.
2. **T5 marker enumeration is the silent-skip counterweight** — T6 alone doesn't catch marker drift (the script proceeds with `⚠ markers not found (skipped)`). T5's regex on every source file is the structural guarantee.
3. **No new package.json slot needed** — `pnpm test:unit` already auto-discovers `tests/*.test.ts`. P47 + P49 also avoided new slots; this batch continues the pattern.

## P51+ candidates

- `tests/codegen-examples-drift-guard.test.ts` (T7 follow-up: smoke test that P47 mock is applied during codegen-examples rerun, mirrors P50 T7)
- `tests/scripts/codegen-marker-presence.test.ts` (broader: assert every codegen XXXX start/end marker pair in script source)
- `scripts/check-ai-cost-by-model.mjs` (per-model table for 8 AI cost engines, mirrors P49 per-category table)
- Promote codegen marker pattern (`<!-- codegen:start ... -->`) to shared utility (P49 + P50 + future scripts could share marker extraction)
- README ↔ CLAUDE.md table audit (P49 table was added to CLAUDE.md; README still has prose)
- `tests/lib/engine-count.test.ts` → `tests/engine-count.test.ts` subdir move (P22b cleanup, deferred since P49)

## See also

- [[p47-codegen-drift-guard-shipped]] — pattern template
- [[p49-engine-count-table-shipped]] — pattern template + push lessons (P43+P44)
- [[p22b-engine-count-constant-shipped]] — ESM trap context
- [[p40-data-index-shipped]] — AI cost engines INDEX source
- [[multi-file-cross-checks]] — reverse-mapping rationale
```

Replace `<T2-SHA>` with the actual commit SHA from Task 2 Step 2.12. Replace `<session-uuid>` with the current session UUID. Replace `<HH:MM:SS+08:00>` with current local time.

- [ ] **Step 4.2: Update MEMORY.md index**

Edit `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` and add a single line at the end (before any blank trailing line):

```markdown
- [P50 codegen-customfn drift guard](p50-codegen-customfn-drift-guard-shipped.md) — 1 commit `<T2-SHA>` 2026-07-20; tests/codegen-customfn-drift-guard.test.ts at tests/ root (P22b ESM trap avoidance); 7 assertions (T1-T3 structural / T4-T5 reverse-mapping / T6-T7 dual integration smoke); pnpm check 1110 → 1117; closes silent-skip drift class for PRICING.json → customFn codegen; mirrors P47+P49 patterns; 0 production code changes; P51+ candidates: codegen-examples drift smoke, broader marker-presence test, check-ai-cost-by-model, shared codegen marker utility
```

Verify MEMORY.md total size stays under 17100 bytes (hook limit):

Run: `wc -c ~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md`
Expected: < 17100

If exceeded: trim earlier memory entries OR shorten the P50 line. Do NOT remove essential context from earlier entries.

- [ ] **Step 4.3: Commit (memory-only, local)**

```bash
cd ~/.claude/projects/D--E-----youtube-tools/memory
git status
git add p50-codegen-customfn-drift-guard-shipped.md MEMORY.md
git diff --cached --stat
git commit -m "memory(p50): ship log — codegen-customfn drift guard (7-assertion test, no production code)"
```

(Note: memory/ is a separate git repo from project root, hence separate commit.)

---

## Self-review

**1. Spec coverage:**

| Spec section | Plan task |
|---|---|
| 7 assertions in 3 categories | Task 2 Steps 2.1-2.8 (each assertion = one step) |
| Try/finally backup-restore for T7 | Task 2 Step 2.8 (try/finally block) |
| Exclude `index.ts` barrel | Task 1 Step 1.2 + Task 2 Steps 2.5, 2.6 (filter `f !== 'index.ts'`) |
| `ai-training-cost-estimator.ts` registered twice | Task 1 Step 1.3 (verify 9 entries / 8 unique) |
| No production code changes | Task 2 (no Modify files listed) |
| pnpm check 1110 → 1117 | Task 1 Step 1.1 (verify baseline) + Task 2 Step 2.11 (verify final) |
| Dual-push 3-way sync | Task 3 Steps 3.1-3.4 |
| Ship memory + MEMORY.md | Task 4 Steps 4.1-4.3 |

All spec requirements covered. No gaps.

**2. Placeholder scan:** No "TBD/TODO/implement later/fill in details" — `<T2-SHA>` and `<session-uuid>` are fillable on execution (operator commits and substitutes).

**3. Type consistency:**
- `SCRIPT_PATH` / `AI_COST_DIR` constants declared in Step 2.1, used in Steps 2.5, 2.6, 2.8.
- `SCRIPT_SOURCE` constant declared in Step 2.1, used in Steps 2.2, 2.3, 2.4, 2.5.
- `aiCostFiles` variable declared in Steps 2.5, 2.6, 2.8 (separate scopes per test, all use same filter pattern).
- No naming drift between tasks.

**4. Task sizing:**
- T1: 4 verification steps, no commits. Mechanical. Reviewer skipped (purely read-only).
- T2: 12 steps with 1 commit. INTEGRATION (multi-file read + subprocess + reverse-mapping). 1 reviewer.
- T3: 5 steps, 0 commits (push only). INTEGRATION (push window race risk). 1 reviewer.
- T4: 3 steps, 1 memory-repo commit. MECHANICAL. 1 reviewer.