# P52 — Test Infrastructure Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Three-piece hardening pass over the existing test infrastructure: (1) move `tests/lib/engine-count.{ts,test.ts}` to `tests/` root to close the P22b ESM silent-skip trap, (2) extract the Windows/CJS inline-tsx runner pattern (first surfaced in P51) into a shared `tests/helpers/spawn-tsx.ts` helper, (3) add a new `tests/codegen-marker-presence.test.ts` cross-script guard against the silent-skip drift class in the 3 codegen scripts.

**Architecture:**
- **Sub-task #1 (subdir move):** `git mv` 2 files; update 1 inline doc-comment block; update 2 references in `.githooks/pre-commit` slot 4; remove now-empty `tests/lib/` directory. ~5 lines changed in production code.
- **Sub-task #2 (helper extraction):** NEW `tests/helpers/spawn-tsx.ts` (~80 LOC); migrate `tests/codegen-examples-mock-apply.test.ts:runGenerate()` from inline tsx runner to helper (~190 LOC → ~120 LOC).
- **Sub-task #3 (marker-presence guard):** NEW `tests/codegen-marker-presence.test.ts` (~150 LOC, 7 assertions: T1-T7; T8 from spec is dropped — see Pre-flight §A.4).

**Tech Stack:** Node.js 20 `node:test` + `node:assert` + `node:child_process.spawnSync` + `node:fs` + `node:os` + `node:path` + `node:url` + direct `node_modules/.bin/tsx` (NOT `npx tsx` — see Pre-flight §A.1). No new packages; helper sits on Node 20 built-ins.

## Pre-flight Plan Review (inline fixes vs spec)

Pre-flight validation (2026-07-21) surfaced 5 deviations from the spec text. All fixed inline:

### A.1 — Helper uses `node_modules/.bin/tsx.cmd` directly, NOT `npx tsx`

**Spec said:** `npx.cmd` ternary in helper.
**Reality:** `tests/run.mjs:13` already encodes the project convention:
```js
const tsxBin = resolve(root, 'node_modules', '.bin', process.platform === 'win32' ? 'tsx.cmd' : 'tsx');
```
with comment *"Node refuses direct spawn of .cmd shims (EINVAL), so cmd.exe must resolve the batch file"* (use `shell: true`).

**Fix applied to plan:** Helper uses the same `tsxBin` resolution pattern + `shell: true` flag, removing the `npx` indirection (faster + more reliable). Helper signature gains an optional `tsxBin` override for test injection.

### A.2 — `tests/lib/engine-count.test.ts` is 18 LOC (spec estimated 14)

**Spec said:** "14 lines".
**Reality:** `wc -l` reports 18.

**Fix applied to plan:** Step commands use real line numbers (e.g., "edit line 16 of test file to reference new path").

### A.3 — Pre-commit hook slot numbering is 1-4, not 1-7

**Spec said:** "Update `.githooks/pre-commit` slot 6 path".
**Reality:** Hook has exactly 4 numbered slots. The engine-count-by-category check is **slot 4** (`tests/lib/engine-count\.ts` reference appears at line 58 grep regex + line 63 fix-message).

**Fix applied to plan:** All hook references use "slot 4 (engine-count-by-category)" terminology.

### A.4 — `codegen-customfn.mjs` has no `--check` mode → T8 from spec is dropped

**Spec said:** "T8: integration smoke via `codegen-customfn.mjs --check`".
**Reality:** `node scripts/codegen-customfn.mjs --help` runs the regenerator silently (no flag handling). The script always regenerates.

**Fix applied to plan:** Drop T8. Final spec is **7 assertions (T1-T7)**, not 7-8. T7 already covers codegen-examples; the codegen-customfn silent-skip drift is already guarded structurally by P50 `tests/codegen-customfn-drift-guard.test.ts:T5` (regex match on tableEndMarker); adding a T8 dry-run adds ~6s without unique signal.

### A.5 — Marker list has 8 unique values (spec was correct), not 9

**Spec said:** 8 markers.
**Reality:** Grep shows 9 occurrences of `tableEndMarker:` but two of them (line 53 + line 75) share the same string `'Family icons'` — likely an intentional dual-engine reuse, not a typo. Unique set is 8.

**Fix applied to plan:** Plan asserts `uniqueMarkers.size === 8` (not occurrences === 8). Inline marker array in test file uses Set semantics. (Subtle — test T5 in spec said "count occurrences === 8"; if we kept that, it would be a false-fail against real source. Adjusted.)

## Global Constraints

Hard requirements for every task (each task implicitly inherits these):

1. **Test file location**: All NEW test files at `tests/` root, NOT in subdirectories. Reason: P22b ESM trap — `tests/run.mjs:6-8` globs only `tests/*.test.ts` (non-recursive). Helper files at `tests/helpers/` are exempt because they don't end in `.test.ts`.
2. **No production code changes outside listed files**: `scripts/codegen-*.mjs`, `scripts/check-engine-count-by-category.mjs`, `src/data/ai-pricing.json`, `src/engines/**/*.ts`, `tests/run.mjs` are UNCHANGED in this batch.
3. **TypeScript syntax in all `.ts` files**: Even test files use TS — confirmed by P47/P50/P51 patterns (uses `: number` annotations, `as` casts). Helper must compile under the project's existing TS config.
4. **Windows/CJS compatibility baseline**: All spawn-Sync invocations use `shell: process.platform === 'win32'` (matching `tests/run.mjs:34`). All absolute paths to `.ts` files used in dynamic `import()` inside helper-generated runner go through `pathToFileURL().href`.
5. **Pre-commit hook**: Update `.githooks/pre-commit` slot 4 references from `tests/lib/engine-count.ts` → `tests/engine-count.ts` (both line 58 grep regex AND line 63 fix-message). P52 #1 Step 5 mandates this.
6. **pnpm check target**: 1122/0/0 (P51 final) → 1129/0/0 (+7 new assertions: 1 from moved test + 0 from helper + 6 from new marker-presence test). P52 #1 adds +1 (the moved test now actually runs).
7. **No new package.json slot**: Reuse existing `tests/run.mjs` + `node:test` infrastructure.
8. **Helper location**: `tests/helpers/spawn-tsx.ts` (not at `tests/` root, since it would be picked up by run.mjs glob — and helper is not a test file). Helper exports typed functions; consumers import via `import { spawnTsxInline } from './helpers/spawn-tsx.ts';`.
9. **Temp-dir isolation**: All `mkdtempSync` paths use `os.tmpdir()` + unique prefix (`p52-mock-apply-<random>` or `spawn-tsx-<random>`). Cleanup is `try/finally` + `fs.rmSync(tmpDir, { recursive: true, force: true })`.
10. **Dynamic import ordering in helper-generated runner**: When caller needs runtime side-effect ordering (e.g., import mrr-calculator AFTER `getEngine` is available because mrr-calculator's module-level `registerEngine()` call needs registry to exist), caller MUST use dynamic `await import(...)` inside the runnerSource body, NOT in the helper's `imports[]` array. Documented as comment in P51 migration task.
11. **Dual-push 3-way sync target**: `0  0` between local / gitee (origin) / github on master. Apply P43 pre-push fetch + rev-list; apply P44 hook stale-cache bypass if github push blocked (`git -c core.hooksPath=/dev/null push github master`).
12. **Ship memory location**: `~/.claude/projects/D--E-----youtube-tools/memory/p52-test-infra-hardening-shipped.md` (auto-memory flat-file, NOT a git repo; NO `git commit` step — see P50 lesson #2 from `progress.md`).
13. **MEMORY.md byte limit**: < 17100 bytes (hook limit). Current 17070 bytes (per system context, P51 ship). P52 entry must be ≤ 30 bytes net if adding 1 line — achieved by trimming to ~80-byte one-liner. Or trim an existing line if needed.

---

## Task 1: Subdir move — `tests/lib/engine-count.{ts,test.ts}` → `tests/engine-count.{ts,test.ts}`

**Files:**
- Move: `tests/lib/engine-count.ts` → `tests/engine-count.ts` (51 LOC, doc-comments lines 1-20 updated)
- Move: `tests/lib/engine-count.test.ts` → `tests/engine-count.test.ts` (18 LOC, doc-comment updated)
- Delete: `tests/lib/` (empty directory after move)
- Modify: `.githooks/pre-commit` lines 58 + 63 (slot 4 references)

**Interfaces:**
- Consumes: nothing from prior tasks
- Produces: `tests/engine-count.ts` exports `EXPECTED_ENGINE_COUNT: number` (=100) and `EXPECTED_ENGINES_BY_CATEGORY: Record<string, number>` (15-letter map, unchanged). `tests/engine-count.test.ts` exports nothing (test runner picks it up via `tests/run.mjs:6-8` glob).

**Test classes:**
- [MECHANICAL] — single-file move + 2-line doc-comment edit + 2-line hook edit. Review count: 1 spec-verify reviewer (no quality reviewer needed).

### Step 1: Pre-flight validations

```bash
# Verify P22b trap assumption still holds (non-recursive glob)
sed -n '1,12p' tests/run.mjs | head -12
```
Expected output confirms line 7: `.filter(f => f.endsWith('.test.ts'))` (no recursion).

```bash
# Verify tests/lib/ contains ONLY the 2 files we're moving
ls -la tests/lib/
```
Expected: only `engine-count.ts` + `engine-count.test.ts`.

```bash
# Verify no other consumer imports from tests/lib/engine-count
grep -rn "tests/lib/engine-count\|lib/engine-count" --include="*.ts" --include="*.mjs" --include="*.js" .
```
Expected: hits in `.githooks/pre-commit` only (lines 58, 63). No source/test files import it by relative path because the test file uses `'./engine-count.ts'` (same-dir) and the source file is consumed via `import { ... } from './engine-count.ts'` from within the same `tests/lib/` dir.

If the grep shows additional hits, STOP and report — P52 #1 plan pre-flight did not expect this.

### Step 2: `git mv` the two source files

```bash
git mv tests/lib/engine-count.ts tests/engine-count.ts
git mv tests/lib/engine-count.test.ts tests/engine-count.test.ts
```

Both `git mv` commands preserve git history (renames are detected as renames, not delete+add).

### Step 3: Update doc-comment paths inside `tests/engine-count.ts`

Read the moved file's first 20 lines and replace 2 string references:

In `tests/engine-count.ts`:
- Line 8: `tests/lib/engine-count.ts` → `tests/engine-count.ts`
- Line 13: `tests/lib/engine-count.test.ts` → `tests/engine-count.test.ts`

Use Edit tool, not Write (preserve the rest of the file verbatim).

### Step 4: Update doc-comment in `tests/engine-count.test.ts`

In `tests/engine-count.test.ts`:
- Line 16: `tests/lib/engine-count.ts` → `tests/engine-count.ts` (inside the assertion message)

### Step 5: Update `.githooks/pre-commit` slot 4 (2 references)

Edit `.githooks/pre-commit`:
- Line 58: regex `tests/lib/engine-count\.ts` → `tests/engine-count\.ts`
- Line 63: echo message text `tests/lib/engine-count.ts` → `tests/engine-count.ts`

### Step 6: Remove empty `tests/lib/` directory

```bash
git rm tests/lib/ 2>/dev/null || rmdir tests/lib/ 2>/dev/null || ls -la tests/lib/  # should be gone
```

If `git rm tests/lib/` fails (directory not tracked because it's empty), use `rmdir tests/lib/` or just `ls tests/lib/` to confirm it's empty and ignore.

### Step 7: Verify the moved test actually runs

```bash
node tests/engine-count.test.ts
```
Expected: 1 test passes. If test is "found 0 tests" → STOP and re-check the glob.

### Step 8: Run pre-commit hook smoke

```bash
# Touch a file that triggers slot 4 (engine-count-by-category check)
touch tests/engine-count.ts
git add tests/engine-count.ts
git commit --allow-empty -m "hook smoke (will reset)" 2>&1 | head -20
git reset HEAD~1  # un-commit
```

Expected: hook runs slot 4 against new path `tests/engine-count.ts`. If hook BLOCKS on "tests/lib/engine-count.ts" path missing → recheck Step 5.

### Step 9: Run full pnpm check

```bash
pnpm check
```
Expected: 1123 / 0 / 0 (P51 baseline 1122 + 1 newly-active test).

### Step 10: Commit

```bash
git add tests/engine-count.ts tests/engine-count.test.ts .githooks/pre-commit
# tests/lib/ removal if needed
git status  # confirm only intended files staged
git commit -m "test(p52-1): move tests/lib/engine-count.{ts,test.ts} → tests/ root to close P22b ESM silent-skip trap"
```

Capture full 40-char commit SHA for the report.

### Step 11: Write task report

Write to `.superpowers/sdd/task-1-report.md` (auto-memory location, not git):
- Status (DONE / DONE_WITH_CONCERNS / BLOCKED)
- Commit SHA (40 chars)
- Standalone test output (TAP summary)
- pnpm check summary
- `git show --stat HEAD` output
- Pre-flight grep result (Step 1)
- Hook smoke result (Step 8)
- Concerns (if any)

---

## Task 2: Create `tests/helpers/spawn-tsx.ts` and migrate P51 `runGenerate()`

**Files:**
- Create: `tests/helpers/spawn-tsx.ts` (~80 LOC)
- Modify: `tests/codegen-examples-mock-apply.test.ts` lines 102-141 (`runGenerate()` function, ~40 LOC → ~12 LOC)

**Interfaces:**
- `tests/helpers/spawn-tsx.ts` exports:
  ```ts
  export interface SpawnTsxInlineOptions {
    root: string;
    runnerSource: string;
    imports?: Array<{ path: string; as?: string }>;
    tsxBin?: string;  // override for testing; default: node_modules/.bin/tsx[.cmd]
  }
  export interface SpawnTsxInlineResult {
    stdout: string;
    stderr: string;
    status: number | null;
  }
  export function spawnTsxInline(opts: SpawnTsxInlineOptions): string;  // throws on non-zero
  export function spawnTsxInlineStdout(opts: SpawnTsxInlineOptions): SpawnTsxInlineResult;  // never throws
  ```

**Test classes:**
- [INTEGRATION] — touches 2 files (helper + P51 migration); involves Windows/CJS edge cases. Review count: 1 spec-verify reviewer + 1 quality reviewer.

### Step 1: Pre-flight — read P51 implementation to confirm migration shape

```bash
sed -n '100,142p' tests/codegen-examples-mock-apply.test.ts
```

Expected: lines 102-141 = `function runGenerate(includeMock: boolean): string { ... }`. Note the `mockBlock` (string literal at top), the `pathToFileURL` usage, the async IIFE wrapper, the `tsxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx'` ternary.

Also read P51 test file imports (top 40 lines) to understand what `getEngine`, `MRR_DEFAULTS`, etc. are imported.

### Step 2: Write `tests/helpers/spawn-tsx.ts`

Full file content (~80 LOC):

```ts
// P52 helper — extract Windows/CJS inline-tsx runner pattern first surfaced
// in P51 (`tests/codegen-examples-mock-apply.test.ts`). Encapsulates:
//   - fs.mkdtempSync + try/finally cleanup
//   - async IIFE wrapper (CJS top-level await compatibility)
//   - pathToFileURL for Windows ESM absolute-path resolution
//   - direct node_modules/.bin/tsx[.cmd] invocation (no npx indirection)
//   - shell: true on win32 (Node refuses direct .cmd shim spawn)
//
// Why not at tests/ root: tests/run.mjs globs *.test.ts non-recursively;
// helpers/ avoids the glob (no .test.ts suffix).
//
// Caller's responsibility for dynamic-import ordering:
//   If the imported module has module-level side effects (e.g.
//   `registerEngine()` at import time) that depend on another module being
//   imported FIRST, the caller must use dynamic `await import(...)` inside
//   `runnerSource`, NOT in `imports[]` (which is module-level).
//   See P51 migration in tests/codegen-examples-mock-apply.test.ts for
//   the worked example.

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export interface SpawnTsxInlineOptions {
  /** Repo root for cwd + relative path resolution */
  root: string;
  /** TypeScript source code to execute inside the async main() */
  runnerSource: string;
  /** Optional module-level imports to prepend (each as {path, as?}) */
  imports?: Array<{ path: string; as?: string }>;
  /** Override tsx binary path (for testing). Default: node_modules/.bin/tsx[.cmd] */
  tsxBin?: string;
}

export interface SpawnTsxInlineResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

const defaultTsxBin = (root: string): string => {
  const name = process.platform === 'win32' ? 'tsx.cmd' : 'tsx';
  return path.join(root, 'node_modules', '.bin', name);
};

export function spawnTsxInlineStdout(opts: SpawnTsxInlineOptions): SpawnTsxInlineResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-tsx-'));
  const runnerPath = path.join(tmpDir, 'runner.ts');
  const tsxBin = opts.tsxBin ?? defaultTsxBin(opts.root);

  // Build import preamble — pathToFileURL for Windows ESM (raw absolute
  // paths throw ERR_UNSUPPORTED_ESM_URL_SCHEME on win32).
  const importLines = (opts.imports ?? [])
    .map(({ path: p, as }) =>
      as
        ? `import * as ${as} from '${pathToFileURL(p).href}';`
        : `import '${pathToFileURL(p).href}';`
    )
    .join('\n');

  // Async IIFE — tsx on Windows emits CJS by default, which doesn't support
  // top-level await. Mirror scripts/codegen-examples.mjs:251,267 pattern.
  const runnerSource = `
    ${importLines}
    async function main() {
      ${opts.runnerSource}
    }
    main().catch(e => { console.error(e); process.exit(1); });
  `;

  try {
    fs.writeFileSync(runnerPath, runnerSource, 'utf8');
    const result = spawnSync(tsxBin, [runnerPath], {
      cwd: opts.root,
      encoding: 'utf8',
      shell: process.platform === 'win32',
    });
    return {
      stdout: result.stdout ?? '',
      stderr: result.stderr ?? '',
      status: result.status,
    };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

export function spawnTsxInline(opts: SpawnTsxInlineOptions): string {
  const result = spawnTsxInlineStdout(opts);
  if (result.status !== 0) {
    throw new Error(
      `tsx runner exited ${result.status}.\n` +
        `stdout: ${result.stdout}\nstderr: ${result.stderr}`
    );
  }
  return result.stdout;
}
```

### Step 3: Verify helper compiles and basic dry-run works

```bash
# Type-check the helper (project's TS config)
npx tsc --noEmit tests/helpers/spawn-tsx.ts 2>&1 | head -20
```
Expected: 0 errors. (The project uses `tsx` for execution; `tsc` may emit "cannot find module 'node:test'" type noise — if so, the test runner script `tests/run.mjs` is the authoritative check.)

```bash
# Functional smoke — write a temporary test that imports and calls helper
# then delete it after verifying
cat > /tmp/spawn-tsx-smoke.ts << 'EOF'
import { spawnTsxInline } from './tests/helpers/spawn-tsx.ts';
const result = spawnTsxInline({
  root: process.cwd(),
  runnerSource: "process.stdout.write('hello from tsx');",
});
console.log('STDOUT:', JSON.stringify(result));
EOF
node --import tsx /tmp/spawn-tsx-smoke.ts
```
Expected: `STDOUT: "hello from tsx"`. Delete `/tmp/spawn-tsx-smoke.ts` after.

(If the smoke test path doesn't work due to the `--import tsx` flag, alternative: `pnpm exec tsx /tmp/spawn-tsx-smoke.ts`.)

### Step 4: Migrate P51 `runGenerate()` to use helper

In `tests/codegen-examples-mock-apply.test.ts`:

**Add to imports (top of file):**
```ts
import { spawnTsxInline } from './helpers/spawn-tsx.ts';
```

**Replace lines 102-141 (`function runGenerate(includeMock: boolean): string { ... }`) with:**

```ts
// === Runner helper: spawn inline tsx that calls engine.generate(defaults)[0]
// Migrated to tests/helpers/spawn-tsx.ts (P52). The mock block is conditional
// via template literal; dynamic `await import(...)` for mrr-calculator keeps
// registerEngine() side-effect ordering correct (mrr-calculator imports AFTER
// getEngine is available).
function runGenerate(includeMock: boolean): string {
  const mockBlock = includeMock ? MOCK_BLOCK : '';
  return spawnTsxInline({
    root: ROOT,
    runnerSource: `
      ${mockBlock}
      await import('${pathToFileURL(MRR_CALC_PATH).href}');
      const engine = getEngine('solopreneur-mrr-calculator');
      const ex0 = engine.generate(${JSON.stringify(MRR_DEFAULTS)})[0];
      process.stdout.write(ex0);
    `,
    imports: [
      { path: path.join(ROOT, 'src/core/engines/registry.ts') },
    ],
  });
}
```

The registry is imported via the helper's `imports[]` (module-level, just for the `getEngine` symbol). mrr-calculator is dynamically imported inside `main()` via `await import(...)` to preserve the P51 side-effect ordering invariant (mrr-calculator's `registerEngine()` runs at import time and must run AFTER `getEngine` is reachable).

### Step 5: Remove now-unused imports from P51 test file

If `runGenerate` no longer references `fs.mkdtempSync`, `os.tmpdir()`, `spawnSync`, or `pathToFileURL` (it's still needed for the dynamic import line), audit and remove unused imports.

Specifically:
- `spawnSync` from `'node:child_process'` — keep (T5 still uses it for `--check` invocation).
- `fs` from `'node:fs'` — remove if not used elsewhere.
- `os` from `'node:os'` — remove if not used elsewhere.
- `pathToFileURL` from `'node:url'` — keep (used in the dynamic import line above).

Verify by reading the file post-edit; the import block at the top should be:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnTsxInline } from './helpers/spawn-tsx.ts';
```

### Step 6: Verify P51 still passes standalone

```bash
node tests/codegen-examples-mock-apply.test.ts
```
Expected: 5/5 pass. If a test fails, compare runner output to baseline from P51 task-2-report.md.

### Step 7: Run full pnpm check

```bash
pnpm check
```
Expected: 1123 / 0 / 0 (no change from Task 1 — helper is not a test file, P51 tests still pass).

### Step 8: Commit

```bash
git add tests/helpers/spawn-tsx.ts tests/codegen-examples-mock-apply.test.ts
git commit -m "test(p52-2): extract spawn-tsx helper to tests/helpers/spawn-tsx.ts; migrate P51 runGenerate() (~190 → ~120 LOC)"
```

Capture full 40-char commit SHA.

### Step 9: Write task report

Write to `.superpowers/sdd/task-2-report.md`:
- Status
- Commit SHA (40 chars)
- P51 standalone test output (5/5 pass + duration_ms)
- pnpm check summary
- Helper dry-run smoke output (Step 3)
- LOC delta for P51 test file (line count before vs after)
- Concerns (esp. any deviation from spec, like the dynamic-import-in-runnerSource ordering trick)

---

## Task 3: Create `tests/codegen-marker-presence.test.ts` (7 assertions)

**Files:**
- Create: `tests/codegen-marker-presence.test.ts` (~150 LOC, 7 assertions)
- UNCHANGED: `scripts/check-engine-count-by-category.mjs`, `scripts/codegen-customfn.mjs`, `scripts/codegen-examples.mjs`

**Test classes:**
- [INTEGRATION] — multi-script grep + multi-engine marker validation. Review count: 1 spec-verify reviewer + 1 quality reviewer.

### Step 1: Pre-flight — confirm marker lists byte-for-byte

```bash
# Class A HTML markers
grep -n "codegen:start engine-count\|codegen:end" scripts/check-engine-count-by-category.mjs
```
Expected: line 166 has `<!-- codegen:start engine-count -->`; line 167 has `<!-- codegen:end -->`.

```bash
# Class B tableEndMarker (unique values)
grep "tableEndMarker:" scripts/codegen-customfn.mjs | sort -u
```
Expected: 8 unique lines (per Pre-flight §A.5):
```
    tableEndMarker: '"var MS={" +',
    tableEndMarker: 'Family icons',
    tableEndMarker: 'Provider initials + colors',
    tableEndMarker: 'var FI=',
    tableEndMarker: 'var FL=',
    tableEndMarker: 'var SCG=',
    tableEndMarker: 'var SCPG2=',
    tableEndMarker: 'var ST=',
```

```bash
# Class C codegen-examples marker
grep -n "staticExamples: \[" scripts/codegen-examples.mjs | head -3
```
Expected: line 314 has `const marker = 'staticExamples: [';`.

If any of these grep outputs differ, STOP and report — marker list will not match the real source.

### Step 2: Write `tests/codegen-marker-presence.test.ts`

Full file content (~150 LOC):

```ts
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
    /const marker = 'staticExamples: \['/,
    `Missing marker declaration. Source should contain: const marker = 'staticExamples: ['`
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
```

### Step 3: Verify standalone

```bash
node tests/codegen-marker-presence.test.ts
```
Expected: 7/7 pass, exit 0. If any test fails, cross-check marker list against Pre-flight §A.5 and Step 1 grep outputs.

### Step 4: Run full pnpm check

```bash
pnpm check
```
Expected: 1129 / 0 / 0 (1123 from Task 1 + 6 new from this task — Task 1's moved test was already counted in the 1122 baseline).

Wait — Task 1 baseline was 1122 (P51 final). After Task 1: +1 = 1123 (moved test now runs). After Task 3: +7 = 1130. Recompute:

- P51 final: 1122
- Task 1: +1 (moved test now active) → 1123
- Task 2: 0 (helper not in suite) → 1123
- Task 3: +7 → **1130 / 0 / 0**

### Step 5: Commit

```bash
git add tests/codegen-marker-presence.test.ts
git commit -m "test(p52-3): tests/codegen-marker-presence.test.ts at tests/ root; 7 assertions across 3 marker classes (HTML / tableEndMarker / staticExamples) + integration smoke; pnpm check 1123 → 1130"
```

Capture full 40-char commit SHA.

### Step 6: Write task report

Write to `.superpowers/sdd/task-3-report.md`:
- Status
- Commit SHA (40 chars)
- Standalone test output (7/7 pass + duration_ms)
- pnpm check summary (1130 / 0 / 0)
- `git show --stat HEAD` output
- Pre-flight grep results (Step 1 — all 3 marker lists confirmed)
- Concerns (esp. T4's `Family icons` dual-engine reuse handling)

---

## Task 4: Dual-push with P43 + P44 lessons

**Files:** None (git operations only)

**Test classes:**
- [MECHANICAL] — pure git push + verify commands, no production diff to review. Per progress.md P50: T3 had no reviewer per ledger decision. Same here.

### Step 1: Confirm local master is clean

```bash
git status
```
Expected: clean working tree (all 3 task commits applied, nothing staged or modified).

### Step 2: Pre-push fetch + rev-list (P43 lesson)

```bash
git fetch origin
git fetch github
git rev-list --left-right --count master...origin/master master...github/master
```
Expected: `0  0` (or just the commits we're about to push). If non-zero before push, STOP and investigate divergence (per CLAUDE.md Notes: GH Action cron can fire during push window).

### Step 3: Push to gitee (origin)

```bash
git push origin master
```
Expected: 3 new commits pushed (Task 1 + Task 2 + Task 3). Capture gitee's master SHA:
```bash
git rev-parse origin/master
```

### Step 4: Push to github (with P44 bypass if needed)

```bash
git push github master 2>&1
# If hook reports "ahead=0" false-negative:
git -c core.hooksPath=/dev/null push github master
```

Expected: 3 new commits pushed. Capture github's master SHA:
```bash
git rev-parse github/master
```

If the bypass is used, log it in the report (this is the 5th time the P44 bypass has been used in P48-P51 sequence).

### Step 5: Verify 3-way sync

```bash
git fetch origin && git fetch github
git rev-list --left-right --count master...origin/master master...github/master
```
Expected: `0  0` on both rows.

### Step 6: Verify file presence on both remotes

```bash
git ls-tree origin/master tests/ | grep -E "engine-count|helpers/spawn-tsx|codegen-marker-presence"
git ls-tree github/master tests/ | grep -E "engine-count|helpers/spawn-tsx|codegen-marker-presence"
```
Expected: same 3 file paths present on both remotes.

### Step 7: Write task report

Write to `.superpowers/sdd/task-4-report.md`:
- Status (DONE / DONE_WITH_CONCERNS)
- Local / origin / github SHAs (all 3 should match)
- P44 bypass usage (yes/no, which command line)
- 3-way sync rev-list output
- File-presence grep output

---

## Task 5: Ship memory + MEMORY.md index update

**Files:** Auto-memory flat files (NOT git-tracked)

**Test classes:**
- [MECHANICAL] — single-file write + MEMORY.md index update. Review count: 1 spec-verify reviewer.

### Step 1: Write ship memory file

Create `~/.claude/projects/D--E-----youtube-tools/memory/p52-test-infra-hardening-shipped.md`. Frontmatter + body must follow the convention of `p51-codegen-examples-mock-apply-shipped.md`.

Sections (Keep a Changelog style adapted from P47/P50/P51):
1. **Frontmatter** (name + description + type=project metadata).
2. **TL;DR** (one paragraph: 3 sub-tasks, commit count, pnpm check delta).
3. **Architecture diagram** (reuse from spec — 3 sub-task boxes).
4. **Test taxonomy** (7 assertions with brief descriptions).
5. **Sequencing dependencies** (#1 → #2 → #3).
6. **Pre-flight plan corrections** (5 items from `## Pre-flight Plan Review` above: A.1 helper tsxBin path; A.2 LOC numbers; A.3 hook slot numbering; A.4 T8 dropped; A.5 unique marker count).
7. **Risks realized** (R1-R9 — note which actually fired).
8. **Ship sequence** (commit SHAs in order, dual-push with P44 bypass details).
9. **Verification results** (all 7 checks from spec §Verification — most should be PASS).
10. **P53+ candidates** (any carry-forward items surfaced during this batch).

### Step 2: Append MEMORY.md index entry

In `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md`, add ONE line at the end of the "P17+" section (after the P51 entry):

```markdown
- [P52 test-infra hardening](p52-test-infra-hardening-shipped.md) — 3 sub-tasks: subdir move + spawn-tsx helper + marker-presence guard; 7 assertions; pnpm check 1122→1130; P44 bypass 5th use
```

**Byte budget**: ≤ 200 bytes for the new line. Current MEMORY.md is 17070 bytes; adding ~200 = 17270 bytes — **exceeds 17100 hook limit by 170 bytes**.

**Mitigation**: Trim the new line to ≤ 30 bytes net (compress to bare essentials):
```markdown
- [P52 test-infra hardening](p52-test-infra-hardening-shipped.md) — 3 sub-tasks; pnpm check 1122→1130; P44 bypass 5th
```
That's ~145 bytes — still over. Compress further:
```markdown
- [P52 test-infra hardening](p52-test-infra-hardening-shipped.md) — pnpm check 1122→1130; P44 bypass 5th
```
That's ~120 bytes. Still over.

**If MEMORY.md exceeds 17100 after the new line**, trim 1 existing line by ~150 bytes. Suggested target: P49 entry (longest one). Do this ONLY if hook reports overflow — i.e., measure first, trim second.

### Step 3: Measure and (if needed) trim

```bash
wc -c ~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md
```
If ≤ 17100 bytes → done. If > 17100 → trim the longest existing P-series line by ~10-15% until under limit.

### Step 4: Write task report

Write to `.superpowers/sdd/task-5-report.md`:
- Status (DONE / DONE_WITH_CONCERNS)
- Ship memory file path + line count + byte count
- MEMORY.md index entry added (full text + byte count)
- MEMORY.md final byte count (must be ≤ 17100)
- Whether trim was needed (yes/no + which line trimmed)
- Concerns

---

## Self-Review (post-draft)

Performed against spec sections, per writing-plans skill checklist:

1. **Spec coverage**:
   - Spec §Architecture (3 sub-tasks) → Task 1 + Task 2 + Task 3 ✓
   - Spec §Sequencing dependencies (#1 → #2 → #3) → Task order ✓
   - Spec §Verification (7 checks) → Task 4 (3-way sync) + Task 5 (final) ✓
   - Spec §Risks R1-R9 → All addressed in either pre-flight §A or relevant Task steps ✓
   - Spec §Out of scope → Tasks do not violate (no P47/P50 refactor, no tests/run.mjs glob change, no new codegen lib, etc.) ✓
2. **Placeholder scan**: All step commands include exact `bash` blocks + expected outputs. No "TBD" / "implement later".
3. **Type consistency**: `SpawnTsxInlineOptions` interface used identically in Task 2 Step 2 helper code and Step 4 migration code. `TABLE_END_MARKERS` array referenced consistently across T3-T5. `EXPECTED_ENGINE_COUNT = 100` unchanged.
4. **Pre-flight validation results reflected in plan**: A.1 (tsxBin path), A.2 (LOC), A.3 (slot 4), A.4 (T8 dropped), A.5 (unique markers) — all captured in `## Pre-flight Plan Review` section.

No issues found. Plan is ready for execution.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-21-p52-test-infra-hardening.md`.

**5 tasks total:**
- Task 1: Subdir move (mechanical)
- Task 2: Helper extraction + P51 migration (integration)
- Task 3: Marker-presence test (integration)
- Task 4: Dual-push (mechanical, no reviewer)
- Task 5: Ship memory (mechanical)

**Recommended execution mode:** Subagent-Driven (per CLAUDE.md superpowers workflow + spec §Execution). Dispatch fresh implementer subagent per task, with task review after each (1 spec-verify for mechanical, +1 quality reviewer for integration tasks 2 and 3). Holistic review at the end before Task 5.