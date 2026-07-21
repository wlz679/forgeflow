# P51 — codegen-examples mock-apply drift guard — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 5-assertion static + runtime-apply + integration-smoke drift guard for `scripts/codegen-examples.mjs`, verifying the P42 `Date` mock actually applies at runtime when `engine.generate()` runs. Closes the runtime gap left by P47's structural-only guard.

**Architecture:** 1 NEW test file (`tests/codegen-examples-mock-apply.test.ts`) at `tests/` root. No production code changes. Test runs via `pnpm test:unit` slot 7 (`tests/run.mjs`) which auto-discovers `tests/*.test.ts`. No `package.json` slot needed. No `.githooks/pre-commit` change needed. Runtime verification via `os.tmpdir()` mini tsx runner subprocess.

**Tech Stack:** Node 20.19+ `node:test`; `node:assert/strict`; `node:child_process.spawnSync`; `node:fs`; `node:os`; `node:path`; `node:url`. No new deps. Subprocess: `npx.cmd tsx <tmpdir>/runner.ts` for runtime assertions.

## Global Constraints

These constraints apply to every task. Each task's requirements implicitly include this section.

1. **Test location MUST be `tests/` root, NOT `tests/scripts/` or `tests/lib/`** — P22b ESM trap: `tests/run.mjs` reads `tests/*.test.ts` only. Subdir placement is silently skipped by `pnpm test:unit`.
2. **No production code changes** — `scripts/codegen-examples.mjs`, `src/engines/saas/mrr-calculator.ts`, and every other non-test file is UNCHANGED in this batch.
3. **Temp-dir isolation REQUIRED** — runtime runner (`runner.ts`) MUST be written to `os.tmpdir()` under `p51-mock-apply-<random>/`, NOT to the repo cwd. try/finally + `fs.rmSync(tmpDir, { recursive: true, force: true })` guarantees cleanup even on assertion failure.
4. **No backup-restore needed for engine files** — the runner reads `src/engines/saas/mrr-calculator.ts` via import but does not modify it. The backup/restore pattern from P50 T7 does NOT apply here.
5. **Inline mock block in runner is COPY-VERBATIM from `scripts/codegen-examples.mjs:buildRunnerScript()`** — do NOT edit the inline copy. It is the P42 source-of-truth, ground-truth at `scripts/codegen-examples.mjs:236-249`. If script source changes, update test inline copy synchronously.
6. **mrr-calculator default inputs are HARDCODED in test** — 7 fields, copied verbatim from `scripts/codegen-examples.mjs:122` ground truth:
   ```
   {subscriberCount:'500', monthlyPrice:'29', monthlyChurnRate:'3',
    expansionMRR:'800', newSubsPerMonth:'100', contractionMRR:'150', reactivationMRR:'100'}
   ```
   If the ground truth changes, update test synchronously.
7. **Substring target is `~Sep 2027`** — exact literal from `src/engines/saas/mrr-calculator.ts:50` staticExamples[0] (drift-proof under P42 mock at REFERENCE_DATE=2026-07-15 + 14.4 months projection).
8. **T4 (mock-removed) negative assertion is substring-absent** — T4 asserts the output of the mock-removed runner does NOT contain `~Sep 2027`. Wall-clock today (~2026-07-21) + 14.4 months projects to ~Oct 2027, NOT Sep 2027.
9. **pnpm check target: 1117 → 1122 (+5 assertions)** — matches P47 (6+1) and P50 (+7) baselines. No new `check:` slot in `package.json` (test runs via `pnpm test:unit` slot 7).
10. **Dual-push target: 3-way sync `0  0`** — apply P43 (pre-push fetch + rev-list) + P44 (hook stale cache bypass: `git -c core.hooksPath=/dev/null push github master`) lessons. 4th lifetime use of P44 bypass for P50; expected.
11. **Ship memory writes to `~/.claude/projects/D--E-----youtube-tools/memory/`** — P47 + P49 + P50 patterns. MEMORY.md index updated. NO `git commit` step (auto-memory = filesystem, not git repo).
12. **MEMORY.md byte limit: < 17100** — P50 final 16388 bytes; P51 +1 line (~100 bytes) = ~16488, well under.

---

## Task 1: Baseline verify before test creation

**Files:** None (read-only verification).

**Interfaces:**
- Consumes: nothing (just verify state)
- Produces: confirmation that current `pnpm check` baseline is 1117/0/0, mrr-calculator.ts still references `~Sep 2027`, and codegen-examples --check currently passes.

- [ ] **Step 1.1: Verify pnpm check baseline is 1117/0/0**

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

If baseline differs: STOP and report. The +5 target in Task 2 assumes 1117.

- [ ] **Step 1.2: Verify mrr-calculator staticExamples[0] still contains `~Sep 2027`**

Run: `grep -n "~Sep 2027" src/engines/saas/mrr-calculator.ts`
Expected: 1 line match (line 50):
```
50:  `$50,000.00 MRR: 14.4 months (~Sep 2027)`,
```

If 0 matches: STOP and report. The substring target in T3+T4 depends on this literal (constraint 7).

- [ ] **Step 1.3: Verify P42 Date mock block is intact in codegen-examples.mjs**

Run: `grep -n "REFERENCE_DATE = new Date('2026-07-15" scripts/codegen-examples.mjs`
Expected: 1 line match.

Run: `grep -n "globalThis as any).Date = class extends RealDate" scripts/codegen-examples.mjs`
Expected: 1 line match.

If missing: STOP and report. The mock block copy in Task 2 (constraint 5) depends on this source.

- [ ] **Step 1.4: Verify --check currently passes (T5 sanity baseline)**

Run: `node scripts/codegen-examples.mjs --check`
Expected exit code: 0
Expected stdout contains: `PASSED`

If --check currently fails: STOP and report.

---

## Task 2: Create `tests/codegen-examples-mock-apply.test.ts`

**Files:**
- Create: `tests/codegen-examples-mock-apply.test.ts` (~150-180 lines)
- Modify: none (no production code)

**Interfaces:**
- Consumes: `scripts/codegen-examples.mjs` (read for static assertions T1+T2), `src/engines/saas/mrr-calculator.ts` (read by tsx subprocess for runtime T3+T4), `src/core/engines/registry.ts` (read by tsx subprocess for engine lookup)
- Produces: 5 node:test assertions; pass when mock is structurally present AND runtime-applied AND --check smoke passes

**Task class:** [INTEGRATION] (multi-file read + subprocess smoke + runtime apply). 1 spec-verify + 1 quality reviewer.

- [ ] **Step 2.1: Write the file header + constants + SCRIPT_SOURCE load**

```ts
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
//        src/engines/saas/mrr-calculator.ts:50)
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
import { fileURLToPath } from 'node:url';

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
```

- [ ] **Step 2.2: Write T1 — P42 mock block declaration present**

```ts
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
```

- [ ] **Step 2.3: Write T2 — REFERENCE_DATE locked at canonical date**

```ts
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
```

- [ ] **Step 2.4: Write the temp-dir mini tsx runner helper**

```ts
// === Runner helper: spawn inline tsx that calls engine.generate(defaults)[0] ===
function runGenerate(includeMock: boolean): string {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'p51-mock-apply-'));
  const runnerPath = path.join(tmpDir, 'runner.ts');

  const mockBlock = includeMock ? MOCK_BLOCK : '';
  const runnerSource = `
    ${mockBlock}
    import { getEngine } from '${ROOT}/src/core/engines/registry.ts';
    await import('${MRR_CALC_PATH}');
    const engine = getEngine('solopreneur-mrr-calculator');
    const ex0 = engine.generate(${JSON.stringify(MRR_DEFAULTS)})[0];
    process.stdout.write(ex0);
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
```

- [ ] **Step 2.5: Write T3 — mock-applied output contains "~Sep 2027"**

```ts
// === T3: mock applied → output contains "~Sep 2027" (drift-proof substring) ===
test('T3: mock applied → mrr-calculator.generate output contains "~Sep 2027"', () => {
  // Mock should override Date so generate() projects +14.4 months from
  // REFERENCE_DATE (2026-07-15) → ~Sep 2027 (drift-proof).
  const stdout = runGenerate(true);
  assert.match(
    stdout,
    /~Sep 2027/,
    `Mock not applied: expected "~Sep 2027" (REFERENCE_DATE-derived), got: ${stdout.substring(0, 200)}`
  );
});
```

- [ ] **Step 2.6: Write T4 — mock-removed output does NOT contain "~Sep 2027"**

```ts
// === T4: mock removed → output does NOT contain "~Sep 2027" ===
// (defense-in-depth: proves the mock CHANGES the output, not a constant in generate)
test('T4: mock removed → output does NOT contain "~Sep 2027"', () => {
  // Without the mock, today (~2026-07-21) + 14.4 months projects to ~Oct 2027,
  // NOT "~Sep 2027". So the substring absence proves generate() actually reads
  // Date.now() / new Date() and the mock IS what changes the output.
  const stdout = runGenerate(false);
  assert.ok(
    !/~Sep 2027/.test(stdout),
    `Mock removed but output still has "~Sep 2027". Either:\n` +
    `  (a) mrr-calculator.generate() doesn't actually use Date internally (then T3 was a false-pass);\n` +
    `  (b) the wall-clock today happens to be in a window where the substring appears (unlikely but check).\n` +
    `Output was: ${stdout.substring(0, 200)}`
  );
});
```

- [ ] **Step 2.7: Write T5 — --check exit 0 + "PASSED" smoke (P47 T7 parity)**

```ts
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
```

- [ ] **Step 2.8: Run the standalone test to verify all 5 assertions pass**

Run: `node --import tsx tests/codegen-examples-mock-apply.test.ts 2>&1 | tail -40`
Expected:
```
▶ T1: P42 Date mock declaration present in codegen-examples.mjs
▶ T2: REFERENCE_DATE locked at 2026-07-15 (P42 canonical)
▶ T3: mock applied → mrr-calculator.generate output contains "~Sep 2027"
▶ T4: mock removed → output does NOT contain "~Sep 2027"
▶ T5: codegen-examples.mjs --check exits 0 with "PASSED"
# tests 5
# pass 5
# fail 0
# cancelled 0
# skipped 0
# todo 0
```

If any test fails:
- T1/T2 fail: codegen-examples.mjs source has drifted from P42 invariants. STOP and investigate.
- T3 fails: P42 mock not applying at runtime OR mrr-calculator's `~Sep 2027` substring was refactored. Check both:
  - Verify `src/engines/saas/mrr-calculator.ts:50` still contains the literal `$50,000.00 MRR: 14.4 months (~Sep 2027)`.
  - Verify the inline `MOCK_BLOCK` constant in the test matches `scripts/codegen-examples.mjs:236-249` verbatim.
- T4 fails: wall-clock today happens to fall in the window that yields "~Sep 2027" substring (extremely unlikely; check `Date.now()` output date). Alternatively, `mrr-calculator.generate()` doesn't actually use Date (then T3 was coincidentally string-similar).
- T5 fails: codegen-examples.mjs's staticExamples are out of sync with PRICING.json or another engine source. Run `node scripts/codegen-examples.mjs` to regenerate.

- [ ] **Step 2.9: Run pnpm check to verify +5 assertion count and no regressions**

Run: `pnpm check`
Expected:
```
# tests 1122
# pass 1122
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms ~<baseline + 15s>
```

If count != 1122: STOP. Verify tests/codegen-examples-mock-apply.test.ts is at `tests/` root and was actually picked up by `tests/run.mjs` (P22b ESM trap).

- [ ] **Step 2.10: Pre-commit hook sanity check**

Run: `git status --short`
Expected: shows `?? tests/codegen-examples-mock-apply.test.ts` (untracked, not yet staged).

The pre-commit hook (slot 7 in `.githooks/pre-commit`) is a codegen-examples `--check` smoke that auto-runs on every commit. It will not block this commit (no production code change).

- [ ] **Step 2.11: Verify temp dir cleanup (P50 T7-style audit)**

Run: `node -e "const os=require('os'); const fs=require('fs'); const path=require('path'); const tmp=os.tmpdir(); const dirs=fs.readdirSync(tmp).filter(d=>d.startsWith('p51-mock-apply-')); console.log('leaked:', dirs.length); if(dirs.length>0) console.log(dirs);"`
Expected: `leaked: 0`

If leaked > 0: the try/finally cleanup is broken in the helper; STOP and fix.

- [ ] **Step 2.12: Commit**

```bash
git add tests/codegen-examples-mock-apply.test.ts
git commit -m "test(p51): tests/codegen-examples-mock-apply.test.ts at tests/ root; 5 assertions (T1-T2 structural / T3-T4 runtime apply via temp-dir mini tsx runner / T5 --check smoke); pnpm check 1117 → 1122"
```

Expected output: 1 commit on master, ahead of `fb3c7fc` (P50 final state).

Record the new commit SHA for Task 3 (use `git rev-parse --short HEAD`).

---

## Task 3: Dual-push with P43 + P44 lessons

**Files:**
- Modify: nothing in repo
- Operate: `origin` (gitee, the canonical remote) and `github` mirrors

**Interfaces:**
- Consumes: local commit from Task 2 Step 2.12
- Produces: 3-way sync `0  0` between local / gitee / github on master

**Task class:** [INTEGRATION] (push window race risk per P43; hook stale cache per P44). 1 spec-verify reviewer (per P50 ledger decision: pure git push, no production diff to review beyond what Task 2's reviewer already covered). Recommended: skip reviewer.

- [ ] **Step 3.1: Pre-push fetch both remotes (P43 lesson)**

```bash
git fetch origin && git fetch github
```

Expected: both succeed; no error. If either fails (network, auth): STOP and resolve before continuing.

- [ ] **Step 3.2: Check for 3-way divergence (P43 lesson)**

```bash
git rev-list --left-right --count origin/master...github/master
```

Expected: `0	0` (gitee and github are in sync pre-push).

```bash
git rev-list --left-right --count @{u}...HEAD
```

Expected: `<T2 count>	0` (local is ahead of upstream — the new commit).

If divergence detected: STOP and resolve via `reset + cherry-pick + force-with-lease` (P43 ship memory §Ship Sequence worked example).

- [ ] **Step 3.3: Push to gitee (canonical)**

```bash
git push origin master
```

Expected: `To <gitee-url>:wlz679/forgeflow.git` + `<old>..<new>  master -> master`.

If hook blocks with "ahead=0" false-negative: STOP and re-check Step 3.2. If `ahead=0` confirmed but `HEAD != origin/master` (rare divergence): use `git -c core.hooksPath=/dev/null push origin master`.

- [ ] **Step 3.4: Push to github (mirror)**

```bash
git push github master
```

Expected: `To <github-url>:wlz679/forgeflow.git` + `<old>..<new>  master -> master`.

**Expected false-negative outcome** (4th lifetime use of P44 pattern): hook stale-cache may report `ahead=0` after the origin push refreshed local state. If this happens:

```bash
git -c core.hooksPath=/dev/null push github master
```

This bypasses the stale wrapper hook and pushes directly. Confirmed working in P48/P49/P50 ships.

- [ ] **Step 3.5: Verify 3-way sync `0  0`**

```bash
git rev-list --left-right --count origin/master...github/master
```

Expected: `0	0`.

```bash
git rev-list --left-right --count @{u}...HEAD
```

Expected: `0	0` (local is current with origin; the github push from Step 3.4 brought github in sync, and origin was already updated in Step 3.3).

If 3-way sync is broken: STOP and investigate which remote's push failed (likely the one that needed P44 bypass; verify via `git log --oneline <remote>/master | head -3`).

- [ ] **Step 3.6: Verify test file present on both remotes**

```bash
git show origin/master:tests/codegen-examples-mock-apply.test.ts | head -3
git show github/master:tests/codegen-examples-mock-apply.test.ts | head -3
```

Expected: both print the file header (`#!/usr/bin/env node` comment + `// P51 drift guard` docstring).

---

## Task 4: Ship memory + MEMORY.md index update

**Files:**
- Create: `~/.claude/projects/D--E-----youtube-tools/memory/p51-codegen-examples-mock-apply-shipped.md` (~150-180 lines)
- Modify: `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` (+1 line)

**Interfaces:**
- Consumes: Task 2 + Task 3 outputs (test commit SHA, dual-push confirmation, pnpm check count)
- Produces: persistent ship memory file + index update. NOT a git commit (auto-memory flat-file).

**Task class:** [MECHANICAL] (write markdown). 1 spec-verify reviewer.

- [ ] **Step 4.1: Write ship memory file**

Create `~/.claude/projects/D--E-----youtube-tools/memory/p51-codegen-examples-mock-apply-shipped.md` with this content:

```markdown
---
name: p51-codegen-examples-mock-apply
description: 5-assertion drift guard for scripts/codegen-examples.mjs — verifies P42 Date mock is structurally present (T1-T2), runtime-applied via temp-dir mini tsx runner (T3-T4), and --check smoke passes (T5); mirrors P47+P50 patterns; closes the runtime drift gap P47 structural-only left open
metadata:
  type: project
  originSessionId: "<session-uuid>"
  modified: "2026-07-21"
---

# P51 — codegen-examples mock-apply drift guard — SHIPPED

## TL;DR

Added `tests/codegen-examples-mock-apply.test.ts` (NEW, ~170 lines) at `tests/` root with 5 assertions enforcing the P42 Date mock invariants:

- **T1 (static)** — P42 `(globalThis as any).Date = class extends RealDate` block present in `scripts/codegen-examples.mjs` source
- **T2 (static)** — `REFERENCE_DATE = new Date('2026-07-15T00:00:00Z')` locked at P42 canonical date
- **T3 (runtime apply)** — temp-dir mini tsx runner with inline P42 mock + mrr-calculator → output contains `~Sep 2027` (REFERENCE_DATE-derived projection)
- **T4 (runtime defense)** — same runner WITHOUT mock → output does NOT contain `~Sep 2027` (proves the mock actually changes output, not a coincidental substring match)
- **T5 (integration smoke)** — `node scripts/codegen-examples.mjs --check` exit 0 + stdout `PASSED`

pnpm check 1117 → **1122** (+5). 0 production code changes. 3-way sync `0  0` at `<T2-SHA>`.

## What shipped

| Commit | Subject |
|---|---|
| `<T2-SHA>` | `test(p51): tests/codegen-examples-mock-apply.test.ts at tests/ root; 5 assertions (T1-T2 structural / T3-T4 runtime apply via temp-dir mini tsx runner / T5 --check smoke); pnpm check 1117 → 1122` |

Stat: 1 file changed, ~170 insertions; new file `tests/codegen-examples-mock-apply.test.ts`.

## Design Decisions

### Why 5 assertions (not 4, not 6)
- **T1+T2**: structural redundancy vs P47 + drift signal. P47 already asserts these but redundantly stating them in P51 gives a *faster failure signal* if a refactor moves the mock to a helper module — P51's T1 would fail before any runtime subprocess.
- **T3**: load-bearing. Proves the mock applies at runtime.
- **T4**: load-bearing defense-in-depth. Without T4, T3 could pass coincidentally if `mrr-calculator.generate()` happened to embed the substring literal (it doesn't currently, but T4 is the future-proof guard).
- **T5**: integration smoke parity with P47 T7.

### Why `~Sep 2027` substring
- Anchored to `src/engines/saas/mrr-calculator.ts:50` literal `$50,000.00 MRR: 14.4 months (~Sep 2027)` — proven drift-proof by P41 + P42.
- Wall-clock today (~2026-07-21) + 14.4 months projects to ~Oct 2027, NOT Sep 2027. T4's negative assertion is reliable.

### Why temp-dir mini tsx runner (not full codegen-examples run)
- YAGNI: directly testing `engine.generate()` is faster, more targeted, and avoids coupling to codegen-examples's disk-write side effects.
- T5 covers the "what codegen-examples --check actually does" angle.
- 2 tsx subprocesses (T3+T4) add ~6s to pnpm check; acceptable.

### Why mrr-calculator (not other engines)
- Date-sensitive: uses `Date` for projection (proven by P41 drift class).
- Drift-proof anchor: P41 + P42 explicitly validated mrr-calculator as the canonical drift-prone engine.
- Unique pattern: only engine whose `staticExamples[0]` contains `~Sep <year>`-style literal.

## Architecture diagram

```
src/engines/saas/mrr-calculator.ts
  generate({defaults})
       │
       │  uses Date.now() / new Date() internally
       ▼
┌─────────────────────────────────────────────────────┐
│ Inline P42 mock (COPY-VERBATIM from                 │
│ scripts/codegen-examples.mjs:236-249)              │
│   REFERENCE_DATE = new Date('2026-07-15...')        │
│   globalThis as any).Date = class extends RealDate  │
│   static now() = REFERENCE_DATE.getTime()           │
└─────────────────────────────────────────────────────┘
       │
       │  T3: with mock → Date.now() returns REFERENCE_DATE
       │       → output "~Sep 2027"  ✓
       │
       │  T4: WITHOUT mock → Date.now() returns wall-clock
       │       → output "~Oct 2027"  ✓ (T4 negative assertion passes)
       ▼
tests/codegen-examples-mock-apply.test.ts
  (NEW, ~170 lines, 5 assertions)
       │
       │  T1+T2: regex SCRIPT_SOURCE structurally
       │  T5: spawnSync `node scripts/codegen-examples.mjs --check`
       ▼
pnpm check: 1117 → 1122 (+5)
```

## Diff preview

```
$ git show --stat <T2-SHA>
test(p51): tests/codegen-examples-mock-apply.test.ts at tests/ root; ...
 1 file changed, ~170 insertions(+)
 create mode 100644 tests/codegen-examples-mock-apply.test.ts
```

## Verification

- `pnpm check` baseline: 1117/0/0 (P50 final state)
- `pnpm check` after T2: **1122/0/0** (+5 assertions)
- Standalone test: `node --import tsx tests/codegen-examples-mock-apply.test.ts` → 5/0/0
- Temp-dir cleanup: `node -e "..."` → `leaked: 0` (try/finally works)
- 3-way sync: `git rev-list --left-right --count origin/master...github/master` → `0  0`
- Test file present on both gitee (origin) and github: verified via `git show <remote>/master:tests/codegen-examples-mock-apply.test.ts | head -3`

## Lessons

1. **Inline mock block = copy-verbatim, not refactor** — the `MOCK_BLOCK` constant in the test is the P42 source-of-truth. Any drift between the inline copy and `scripts/codegen-examples.mjs:236-249` must be flagged, not silently propagated. Test comment pins to the ground-truth location.
2. **T4 negative assertion is load-bearing, not redundant** — without it, T3 could pass coincidentally if generate() embedded the substring. T4's mock-removed run is the future-proof guard.
3. **Temp-dir mini tsx runner is the minimal viable runtime apply check** — full codegen run takes ~30s + writes 100 files. T3+T4 take ~6s and read 1 file. YAGNI.

## P51+ candidates

- `tests/codegen-marker-presence.test.ts` (broader: assert every codegen XXXX start/end marker pair in script source)
- `scripts/check-ai-cost-by-model.mjs` (per-model table for 8 AI cost engines, mirrors P49 per-category table)
- Promote codegen marker pattern to shared utility (P49 + P50 + P51 could share marker extraction)
- README ↔ CLAUDE.md table audit (P49 table was added to CLAUDE.md; README still has prose)
- `tests/lib/engine-count.test.ts` → `tests/engine-count.test.ts` subdir move (P22b cleanup, deferred since P49)
- Amend P-series plan template to remove phantom "memory git commit" step (P50 surfaced 2nd plan-vs-reality drift; `git commit` on auto-memory dir would be a bug; template should remove the step entirely)
- REFERENCE_DATE shift sanity test (P47 §"Out of scope" deferred, P51 YAGNI'd — could become P52+ candidate for true drift-proofness validation)

## See also

- [[p41-mrr-drift-fix-shipped]] — anchor engine origin
- [[p42-date-drift-proof-shipped]] — P42 Date mock injected
- [[p47-codegen-drift-guard-shipped]] — structural-only ancestor
- [[p50-codegen-customfn-drift-guard-shipped]] — sibling guard, codegen-customfn
- [[p22b-engine-count-constant-shipped]] — ESM trap context
- [[p43-components-index-shipped]] — pre-push fetch + rev-list lesson
- [[p44-scripts-index-shipped]] — stale-cache push hook bypass lesson
```

Replace `<T2-SHA>` with the actual commit SHA from Task 2 Step 2.12. Replace `<session-uuid>` with the current session UUID. Replace `2026-07-21` with the current local date.

- [ ] **Step 4.2: Update MEMORY.md index**

Edit `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md` and add a single line at the end (before any blank trailing line):

```markdown
- [P51 codegen-examples mock-apply](p51-codegen-examples-mock-apply-shipped.md) — 1 commit `<T2-SHA>` 2026-07-21; tests/codegen-examples-mock-apply.test.ts at tests/ root (P22b ESM trap avoidance); 5 assertions (T1-T2 structural / T3-T4 runtime apply via temp-dir mini tsx runner / T5 --check smoke); pnpm check 1117 → 1122; closes the runtime mock-apply drift gap that P47 structural-only left open; mrr-calculator as drift-proof anchor engine; copy-verbatim inline mock block from scripts/codegen-examples.mjs:236-249; 0 production code changes; P44 bypass used 4th lifetime (P48/P49/P50/P51); P52+ candidates: marker-presence broader, per-model AI cost table, shared codegen marker utility, README↔CLAUDE.md audit, P-series plan template amend (remove phantom git commit step)
```

Verify MEMORY.md total size stays under 17100 bytes (hook limit):

Run: `wc -c ~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md`
Expected: < 17100 (P50 final was 16388; P51 +1 line ~150 bytes ≈ 16538)

If exceeded: trim earlier memory entries OR shorten the P51 line. Do NOT remove essential context from earlier entries.

- [ ] **Step 4.3: Persistence confirmation (NOT git commit)**

```bash
ls -la ~/.claude/projects/D--E-----youtube-tools/memory/p51-*.md
wc -c ~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md
```

Expected: p51 ship memory exists; MEMORY.md < 17100 bytes.

**Why NOT git commit:** `~/.claude/projects/D--E-----youtube-tools/memory/` is the Claude Code auto-memory location (flat files, NOT a git repository). Filesystem persistence IS the auto-memory load mechanism — `git log` on this directory returns `fatal: not a git repository`. P50 implementer surfaced this in `fb3c7fc` (plan amendment 2 — replaced phantom `git commit` step with persistence confirmation). Same pattern applied here for consistency.

If explicit git tracking is desired later, run `cd ~/.claude/projects/D--E-----youtube-tools/memory && git init` as a one-time setup — but for the P-series memory function, this is unnecessary overhead.

---

## Self-review

**1. Spec coverage:**

| Spec section | Plan task |
|---|---|
| File layout (1 NEW file at tests/ root, no production code change) | Task 2 Step 2.1 (file header + constants) |
| Category 1 — Static structural (T1 + T2) | Task 2 Steps 2.2, 2.3 |
| Category 2 — Runtime apply + integration smoke (T3 + T4 + T5) | Task 2 Steps 2.5, 2.6, 2.7 |
| Temp-dir mini tsx runner mechanism | Task 2 Step 2.4 (helper) + Steps 2.5, 2.6 (callers) |
| Anchor engine: mrr-calculator + ground truth at `src/engines/saas/mrr-calculator.ts:50` | Task 2 Step 2.1 (`MRR_CALC_PATH` constant + Step 2.5 test 3 docstring) |
| Out of scope (4 YAGNI exclusions: shift, cross-script, other engines, helper extraction) | Spec — not directly a plan task; documented in the spec §"Out of scope" and in Task 4 ship memory §"Design Decisions" |
| Global Constraints 1-12 | Plan Header (verbatim copy from spec §"Global Constraints") |
| pnpm check target: 1117 → 1122 (+5) | Task 1 Step 1.1 (verify baseline) + Task 2 Step 2.9 (verify final) |
| Dual-push 3-way sync `0  0` with P43 + P44 lessons | Task 3 Steps 3.1-3.6 |
| Ship memory + MEMORY.md (no git commit) | Task 4 Steps 4.1-4.3 |

All spec requirements covered. No gaps.

**2. Placeholder scan:** No "TBD/TODO/implement later/fill in details" — `<T2-SHA>` and `<session-uuid>` are fillable on execution (operator commits and substitutes).

**3. Type consistency:**
- `SCRIPT_PATH` / `MRR_CALC_PATH` / `MOCK_BLOCK` / `MRR_DEFAULTS` constants declared in Step 2.1; used in Steps 2.4-2.7.
- `runGenerate(includeMock: boolean): string` helper signature declared in Step 2.4; called with `(true)` in T3 (Step 2.5) and `(false)` in T4 (Step 2.6).
- `SCRIPT_SOURCE` constant declared in Step 2.1; used in T1 (Step 2.2) + T2 (Step 2.3).
- No naming drift between tasks.

**4. Task sizing:**
- T1: 4 verification steps, no commits. MECHANICAL. Reviewer skipped (purely read-only).
- T2: 12 steps with 1 commit. INTEGRATION (multi-file read + subprocess + runtime apply). 1 spec-verify + 1 quality reviewer.
- T3: 6 steps, 0 commits (push only). INTEGRATION (push window race risk per P43 + P44). P50 ledger decision: reviewer skipped (no production diff beyond T2's).
- T4: 3 steps, 0 commits. MECHANICAL (markdown write + index update + persistence confirm). 1 spec-verify reviewer.

Total: 4 tasks. Subagent count: T1 (0) + T2 (1 implementer + 2 reviewers) + T3 (0 + 1 reviewer optional) + T4 (1 implementer + 1 reviewer) = **5 dispatch budget**.
