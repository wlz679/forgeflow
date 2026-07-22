# P52 — Test Infrastructure Hardening — Design

> **Status:** Design (brainstorming approved)
> **Date:** 2026-07-21
> **Author:** Claude (per user "继续" → P52 = three-piece test-infra hardening: subdir move + spawn-tsx helper + marker-presence guard)

## Goal

Three-piece hardening pass over the existing test infrastructure, each piece closing a specific drift or maintenance gap left open by prior P-series batches:

1. **Subdir move**: `tests/lib/engine-count.{ts,test.ts}` → `tests/engine-count.{ts,test.ts}`. Closes the P22b silent-skip trap (5× carry-forward).
2. **Helper extraction**: codify the Windows/CJS inline-tsx runner pattern (first surfaced in P51) into `tests/helpers/spawn-tsx.ts`. Future-proofs P53+ tests that need to spawn tsx subprocesses.
3. **Marker consistency guard**: NEW `tests/codegen-marker-presence.test.ts` that cross-checks marker integrity across the 3 codegen scripts. Closes the silent-skip class that 8 tableEndMarker strings + 2 HTML comment markers could have if any refactor silently drifts them.

## Scope

| In scope | Out of scope |
|---|---|
| Subdir move for engine-count files | Refactor P47/P50 inline-tsx pattern (P47/P50 don't actually inline tsx — they spawn `node` subprocess; see §5 over-claim correction) |
| Create `tests/helpers/spawn-tsx.ts` | New tsx-based tests (P53+ candidates) |
| Migrate P51 `runGenerate()` to use the new helper | Refactor `tests/run.mjs` glob to recurse subdirs (anti-P22b; see §5 #5) |
| New `tests/codegen-marker-presence.test.ts` (6-8 assertions) | Promote marker pattern to `scripts/lib/codegen-marker.mjs` shared utility (YAGNI per §5 #2) |
| Update `.githooks/pre-commit` slot 6 path after subdir move | New `.githooks/pre-commit` slots |
| Update inline doc-comments in moved files (paths) | Re-design pre-commit hook |
| Update `tests/lib/` → `tests/` references in any consumer (grep audit) | Move other `tests/lib/*` files (none exist; directory was created specifically for engine-count) |

## Architecture

```
                  ┌────────────────────────────────────┐
                  │   Sub-task #1: subdir move         │
                  │   tests/lib/engine-count.ts        │
                  │          ↓ git mv                  │
                  │   tests/engine-count.ts            │
                  │                                    │
                  │   tests/lib/engine-count.test.ts   │
                  │          ↓ git mv                  │
                  │   tests/engine-count.test.ts       │
                  │                                    │
                  │   Effects:                         │
                  │   • P22b ESM trap closed           │
                  │   • tests/run.mjs:6-8 glob now     │
                  │     picks up the test              │
                  │   • .githooks/pre-commit slot 6    │
                  │     path filter updated            │
                  │   • inline doc-comments updated    │
                  └────────────────────────────────────┘

                  ┌────────────────────────────────────┐
                  │   Sub-task #2: spawn-tsx helper    │
                  │                                    │
                  │   NEW tests/helpers/spawn-tsx.ts   │
                  │   • spawnTsxInline({               │
                  │       root, runnerSource,          │
                  │       imports?: Array<{path,as}>,  │
                  │       body: '(engine)=>void',      │
                  │     }): string                     │
                  │   • spawnTsxInlineStdout({         │
                  │       ...same...,                  │
                  │     }): { stdout, stderr, status } │
                  │                                    │
                  │   Encapsulates:                    │
                  │   • fs.mkdtempSync + try/finally   │
                  │   • async IIFE wrapper (CJS compat)│
                  │   • pathToFileURL for Windows ESM  │
                  │   • npx.cmd ternary (win32)        │
                  │   • shell: true                    │
                  │                                    │
                  │   Effect:                          │
                  │   • tests/codegen-examples-       │
                  │     mock-apply.test.ts:102-141     │
                  │     runGenerate() → ~10 LOC        │
                  └────────────────────────────────────┘

                  ┌────────────────────────────────────┐
                  │   Sub-task #3: marker-presence     │
                  │                                    │
                  │   NEW tests/codegen-marker-        │
                  │        presence.test.ts            │
                  │                                    │
                  │   Class A (HTML comment markers):  │
                  │   T1: scripts/check-engine-count-  │
                  │       by-category.mjs:166-167 has  │
                  │       both start + end markers     │
                  │   T2: markers are unique strings   │
                  │                                    │
                  │   Class B (tableEndMarker):        │
                  │   T3: scripts/codegen-customfn.mjs │
                  │       has all 8 markers            │
                  │   T4: per-marker presence +        │
                  │       script-internal correspondence│
                  │   T5: marker count == 8            │
                  │                                    │
                  │   Class C (codegen-examples):      │
                  │   T6: scripts/codegen-examples.mjs │
                  │       :314 has 'staticExamples: [' │
                  │   T7: integration smoke via        │
                  │       codegen-examples --check     │
                  │   T8: [optional] integration smoke │
                  │       via codegen-customfn         │
                  │       dry-run (if --check exists)  │
                  │                                    │
                  │   Effect: silent-skip drift class  │
                  │   closed for 3 codegen scripts.   │
                  └────────────────────────────────────┘
```

**Tech Stack:** Node.js `node:test` + `node:assert` + `node:child_process.spawnSync` + `node:fs` + `node:os` + `node:path` + `node:url` + `tsx` subprocess (via `npx.cmd` / `npx`). No new packages; helper sits on Node 20 built-ins.

## Background

### Sub-task #1 background (subdir move)

P22b (`tests/lib/engine-count.ts` ships `EXPECTED_ENGINE_COUNT = 100`) added a test file at `tests/lib/engine-count.test.ts`. Since 2026-07-18, this test has been silently skipped because `tests/run.mjs:6-8` globs only `tests/*.test.ts` (not recursive). The constant is still imported correctly (no drift), but the assertion never executes. P50 ship memory §P52+ candidates listed this as the top carry-forward. P52 closes it by moving both files to `tests/` root.

### Sub-task #2 background (spawn-tsx helper)

P51 (`tests/codegen-examples-mock-apply.test.ts`) was the first test to inline a tsx subprocess. The implementer surfaced 2 Windows/CJS fixes beyond the brief:

1. **Async IIFE wrapper** (top-level await + CJS output = `ERROR: Top-level await is currently not supported with the "cjs" output format` on Windows).
2. **`pathToFileURL` for raw absolute paths** (Windows ESM loader rejects `d:` protocol with `ERR_UNSUPPORTED_ESM_URL_SCHEME`).

P51 task report §C1 explicitly recommended: *"P52+ test files that spawn tsx subprocesses on Windows should default to the same pattern ... Consider codifying this in the spec template."* P52 picks up this recommendation and extracts the pattern to `tests/helpers/spawn-tsx.ts`.

**Over-claim correction (this session pre-flight)**: P51 ship memory said "3 ad-hoc patches" for spawn-tsx pattern (P47/P50/P51). Pre-flight grep showed only P51 actually uses inline-tsx (P47/P50 spawn `node` against mjs/json files, not tsx). Decision: helper extraction still worthwhile as future-proofing for P53+ (M2 from P51 quality review), but scope is "encapsulate the P51 pattern + migrate P51", NOT "refactor P47/P50".

### Sub-task #3 background (marker-presence guard)

The codebase has 3 codegen scripts that use literal marker strings to locate specific sections of generated or source code:

| Script | Marker type | Marker strings | Source line |
|---|---|---|---|
| `scripts/check-engine-count-by-category.mjs` | HTML comment | `'<!-- codegen:start engine-count -->'` / `'<!-- codegen:end -->'` | 166-167 (in-place doc rewrite) |
| `scripts/codegen-customfn.mjs` | tableEndMarker (string literal) | 8 markers: `'var FL='`, `'Family icons'`, `'var FI='`, `'var ST='`, `'var SCPG2='`, `'"var MS={" +'`, `'var SCG='`, `'Provider initials + colors'` | 53-209 (per-engine end-of-data-table locator) |
| `scripts/codegen-examples.mjs` | source marker (string literal) | `'staticExamples: ['` | 314 (locates staticExamples array in engine source) |

Each script has a **silent-skip fallback** when the marker isn't found:
- `check-engine-count-by-category.mjs`: silently writes nothing if markers absent.
- `codegen-customfn.mjs`: `console.log(\`  ⚠ ${engine.file}: markers not found (skipped)\`)` (line 413) — runs `--check` with skipped engines treated as pass.
- `codegen-examples.mjs`: `console.log(\`  ⚠ ${file}: staticExamples marker not found\`)` (line 317) — same pattern.

A refactor that silently breaks any of these markers would make the corresponding script silently skip its work, but `--check` would still report PASS. P52 adds a cross-script guard that catches this drift class.

## Design

### File layout

| Path | Status | Purpose |
|---|---|---|
| `tests/lib/engine-count.ts` | **DELETE** | Source file moves to `tests/engine-count.ts`. (Same content, paths in doc-comments updated.) |
| `tests/lib/engine-count.test.ts` | **DELETE** | Test file moves to `tests/engine-count.test.ts`. |
| `tests/engine-count.ts` | **NEW (from move)** | 51 lines, unchanged logic; doc-comments on lines 1-20 updated to reference new test path. |
| `tests/engine-count.test.ts` | **NEW (from move)** | 14 lines, unchanged logic. |
| `tests/helpers/spawn-tsx.ts` | **NEW** | ~80 LOC. Encapsulates P51 pattern. |
| `tests/codegen-marker-presence.test.ts` | **NEW** | ~150 LOC. 6-8 assertions across 3 marker classes. |
| `tests/codegen-examples-mock-apply.test.ts` | **MODIFY** | Lines 102-141 `runGenerate()` migrates to use `tests/helpers/spawn-tsx.ts`. Net LOC: ~190 → ~120. |
| `.githooks/pre-commit` | **MODIFY** | Slot 6 path filter: `tests/lib/engine-count.ts` → `tests/engine-count.ts`. |
| `scripts/check-engine-count-by-category.mjs` | UNCHANGED | Source under test. |
| `scripts/codegen-customfn.mjs` | UNCHANGED | Source under test. |
| `scripts/codegen-examples.mjs` | UNCHANGED | Source under test. |
| `tests/run.mjs` | UNCHANGED | Glob stays non-recursive (anti-P22b; see §5 #5). |

### Sub-task #1 detailed design (subdir move)

**Operations (in order)**:

1. `git mv tests/lib/engine-count.ts tests/engine-count.ts` (preserves history).
2. `git mv tests/lib/engine-count.test.ts tests/engine-count.test.ts` (preserves history).
3. `git rm tests/lib/` (removes now-empty dir; or `rmdir` if git doesn't auto-clean).
4. Update inline doc-comments inside `tests/engine-count.ts:1-20` that reference `tests/lib/engine-count.test.ts` → `tests/engine-count.test.ts`.
5. Grep all consumers of `EXPECTED_ENGINE_COUNT` and `EXPECTED_ENGINES_BY_CATEGORY`:
   - Expected consumers: `tests/engine-count-by-category.test.ts` (the drift guard P49 added), `tests/codegen-marker-presence.test.ts` (NEW, imports the map).
   - All import paths already use `../lib/engine-count.ts` form or relative root form → check.
6. Update `.githooks/pre-commit` slot 6 (currently `tests/lib/engine-count.ts`) → `tests/engine-count.ts`.

**Critical path validation (plan pre-flight)**:

- Read `tests/run.mjs:1-46` in full to confirm glob is non-recursive (verify P22b trap assumption still holds).
- Read `.githooks/pre-commit` to confirm slot 6 current path string and exact replacement string.
- Confirm `tests/lib/` contains only the 2 files (no other dependents).

### Sub-task #2 detailed design (spawn-tsx helper)

**Public API** (2 functions, ergonomic for both stdout-only and full-result use cases):

```ts
// tests/helpers/spawn-tsx.ts
export interface SpawnTsxInlineOptions {
  /** Repo root for cwd + relative path resolution */
  root: string;
  /** TypeScript source code to execute in the tsx subprocess */
  runnerSource: string;
  /** Optional import statements to prepend (each as {path, as?}) */
  imports?: Array<{ path: string; as?: string }>;
  /** Throw on non-zero exit (default: true) */
  throwOnError?: boolean;
}

export interface SpawnTsxInlineResult {
  stdout: string;
  stderr: string;
  status: number | null;
}

/** Spawn tsx subprocess, return stdout string. Throws on non-zero exit. */
export function spawnTsxInline(opts: SpawnTsxInlineOptions): string;

/** Spawn tsx subprocess, return full result. Does not throw. */
export function spawnTsxInlineStdout(opts: SpawnTsxInlineOptions): SpawnTsxInlineResult;
```

**Internal implementation** (encapsulates P51 pattern):

```ts
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

export function spawnTsxInlineStdout(opts: SpawnTsxInlineOptions): SpawnTsxInlineResult {
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'spawn-tsx-'));
  const runnerPath = path.join(tmpDir, 'runner.ts');
  
  // Build import preamble
  const importLines = (opts.imports ?? [])
    .map(({ path: p, as }) => as ? `import * as ${as} from '${pathToFileURL(p).href}';` 
                                 : `import '${pathToFileURL(p).href}';`)
    .join('\n');
  
  const runnerSource = `
    ${importLines}
    async function main() {
      ${opts.runnerSource}
    }
    main().catch(e => { console.error(e); process.exit(1); });
  `;
  
  try {
    fs.writeFileSync(runnerPath, runnerSource, 'utf8');
    const tsxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const result = spawnSync(tsxBin, ['tsx', runnerPath], {
      cwd: opts.root, encoding: 'utf8', shell: true,
    });
    return { stdout: result.stdout ?? '', stderr: result.stderr ?? '', status: result.status };
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}
```

**P51 migration example** (lines 102-141 → ~30 lines):

```ts
// Before: 40 LOC, Windows/CJS patches inline
function runGenerate(includeMock: boolean): string {
  // ... 40 lines of mkdtempSync + pathToFileURL + async IIFE + spawnSync ...
}

// After: 11 LOC, no inline patches
function runGenerate(includeMock: boolean): string {
  return spawnTsxInline({
    root: ROOT,
    runnerSource: `
      const engine = getEngine('solopreneur-mrr-calculator');
      const ex0 = engine.generate(${JSON.stringify(MRR_DEFAULTS)})[0];
      process.stdout.write(ex0);
    `,
    imports: [
      { path: path.join(ROOT, 'src/core/engines/registry.ts') },
      { path: MRR_CALC_PATH, as: 'mrrCalc' },
    ],
  });
}
```

**Note on imports**: P51 had a subtle ordering trick — it imported `registry.ts` first, then imported `mrr-calculator.ts` *inside* `main()` (because `mrr-calculator.ts:1` calls `registerEngine()` at module-import time, and importing it before `getEngine` is available fails). The helper's `imports[]` runs at module level. P52 plan must explicitly handle this: either (a) make P51 caller wrap its mrr-calculator import in an async dynamic `await import(...)` inside runnerSource, OR (b) extend helper API to support `deferImports: true`. Recommendation: (a) — caller's responsibility to use dynamic imports for runtime side-effect ordering.

### Sub-task #3 detailed design (marker-presence test)

**Test taxonomy** (7-8 assertions, 3 classes — final count depends on T8 pre-flight):

#### Class A: HTML comment markers (T1 + T2)

| T# | Assertion | Implementation |
|---|---|---|
| **T1** | `scripts/check-engine-count-by-category.mjs` contains both `<!-- codegen:start engine-count -->` and `<!-- codegen:end -->` markers in source. | Read file as text, assert `markers.length === 2` (one each), assert both literal substrings present. |
| **T2** | The 2 markers are unique strings (no duplicates). | Assert Set(markers).size === markers.length. |

Failure mode for T1/T2: silent — `check-engine-count-by-category.mjs` would skip the in-place rewrite, leaving CLAUDE.md table stale. This guard catches the bug before the doc drifts visibly.

#### Class B: tableEndMarker (T3 + T4 + T5)

| T# | Assertion | Implementation |
|---|---|---|
| **T3** | `scripts/codegen-customfn.mjs` source contains all 8 expected tableEndMarker strings. | Inline 8 marker array at top of test file; assert every marker is a substring of `SCRIPT_SOURCE` (read once at top). |
| **T4** | Per-marker file correspondence: each marker is registered to exactly one engine slug in the ENGINES array. | Regex `/marker\s*:\s*['"]([^'"]+)['"]/` on script source → assert count == 8 unique values. |
| **T5** | Marker count in script ENGINES array is exactly 8 (not 7, not 9). | Count occurrences of `marker:` in source → assert === 8. |

Failure mode: `codegen-customfn.mjs --check` would silently skip engines with broken markers, returning PASS while PRICING.json diverges from customFn.

#### Class C: codegen-examples (T6 + T7 + T8)

| T# | Assertion | Implementation |
|---|---|---|
| **T6** | `scripts/codegen-examples.mjs:314` contains `staticExamples: [` marker. | Read source, regex `/const marker = 'staticExamples: \[/'/`, assert match. |
| **T7** | Integration smoke: `node scripts/codegen-examples.mjs --check` exits 0 with "PASSED". | spawnSync + assert status === 0 + assert.stdout.match(/PASSED/). |
| **T8** | (Optional) Integration smoke: `codegen-customfn.mjs` has a `--check` mode and exits 0. | **Pre-flight required**: `node scripts/codegen-customfn.mjs --help` to confirm `--check` flag exists. If not, drop T8 (7-assertion final spec). |

**Marker list source-of-truth** (must be byte-for-byte verbatim):

```ts
// At top of tests/codegen-marker-presence.test.ts
const TABLE_END_MARKERS = [
  'var FL=',                    // ground truth: scripts/codegen-customfn.mjs:<line>
  'Family icons',
  'var FI=',
  'var ST=',
  'var SCPG2=',
  '"var MS={" +',
  'var SCG=',
  'Provider initials + colors',
];
```

Each marker has a comment pointing at the exact line in `scripts/codegen-customfn.mjs` so a future maintainer can verify by reading the script. Plan pre-flight must grep these markers out of the script to confirm.

### Risks & mitigations

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| **R1**: pre-commit hook slot 6 path漏改 → commit 失败 | Medium | Low | P52 #1 plan Step 1 显式 grep `.githooks/pre-commit` 当前 slot 6 content；Step N 显式 update。 |
| **R2**: spawn-tsx helper API 设计不当 → P51 迁移写起来别扭 | Low | Medium | P52 #2 plan 强制 implementer 在 commit 前跑"P51 迁移 dry-run"，可临时改 P51 test file 验证 API 形状（再 revert）。 |
| **R3**: MEMORY.md 超 17100 bytes | High | Low (trim work) | P52 ship memory entry trim ≤ 80 bytes per line，砍 ship summary 到一行。 |
| **R4**: T8 (codegen-customfn --check) 不可行 → 临时降级 | Medium | Low | Plan pre-flight `--help` 探针；不可行则 spec 改为 7 assertions（删 T8）。 |
| **R5**: 8 个 tableEndMarker 字面量复制 typo | Low | Medium (test drift) | Plan 强制 byte-for-byte grep `scripts/codegen-customfn.mjs:53-209`，每个 marker inline 引用 "ground truth line" 注释。 |
| **R6**: `tests/run.mjs` 已经改了 glob 包含子目录 | Low | High (影响 P22b 假设) | P52 #1 plan Step 1 显式 read `tests/run.mjs:1-46` 全文确认。 |
| **R7**: P44 hook stale-cache 在 P52 push 阶段再触发 | High (已知模式) | Low | 沿用 P48-P51 4 次成功 bypass 模式：`git -c core.hooksPath=/dev/null push <remote> master`。 |
| **R8**: 3 个 sub-task 之间产生意外的相互影响 (test 文件互相 import) | Low | Medium | P52 强制 sub-task 间无 file overlap：`tests/engine-count.*` ∩ `tests/helpers/spawn-tsx.ts` ∩ `tests/codegen-marker-presence.test.ts` = ∅。 |
| **R9**: `tests/lib/` 删除后其他文件 broken import | Low | High (test crash) | Plan pre-flight grep `from .*lib/engine-count` 全仓库；只应该有 1-2 个 consumer (P49 测试 + new P52 test)，全部 import 路径已为相对路径，move 后改为 `./engine-count.ts`。 |

### Sequencing dependencies

- **Task #1 必须先于 #2 和 #3**：pre-commit hook slot 6 路径改了之后，再改其他测试 → 每次 commit hook 都跑新路径验证。
- **Task #2 和 #3 互相独立**：0 file overlap，可任意顺序。
- **建议顺序**：#1 → #2 → #3（按风险递增、影响面递增）。

### Verification (post-implementation)

| 验证项 | 命令 | 期望 |
|---|---|---|
| 静态类型 | `pnpm check` | 1129 / 0 / 0 (or 1131 if T8 ships) |
| Sub-task #1 standalone | `node tests/engine-count.test.ts` | 1/1 pass |
| Sub-task #2 unit smoke | (helper 不在 test suite；implementer 临时 import 跑 dry-run 即可) | 不抛错 |
| Sub-task #3 standalone | `node tests/codegen-marker-presence.test.ts` | 7/7 (or 8/8) pass |
| Pre-commit hook | `git commit --allow-empty -m 'hook smoke' && git reset HEAD~1` (回退) | slot 6 用 `tests/engine-count.ts` 新路径触发成功 |
| 3-way sync | `git fetch origin && git fetch github && git rev-list --left-right --count master...origin/master master...github/master` | `0  0` |
| `tests/lib/` empty | `ls tests/lib/ 2>&1` | `No such file or directory` |
| Marker list sanity | grep each of 8 markers against `scripts/codegen-customfn.mjs` | 8/8 substring present |

### See also

- [[p22b-engine-count-constant-shipped]] — P22b ESM trap root discovery; sub-task #1 closes the trap.
- [[p47-codegen-drift-guard-shipped]] — sibling structural drift guard; sub-task #3 extends the pattern.
- [[p50-codegen-customfn-drift-guard-shipped]] — T5 tableEndMarker 守门逻辑；sub-task #3 T3-T5 cross-check covers it.
- [[p51-codegen-examples-mock-apply-shipped]] — spawn-tsx patch 唯一真实用户；sub-task #2 helper 来源 + migration target.
- [[p44-scripts-index-shipped]] — P44 hook stale-cache bypass pattern; apply during P52 push.

## Spec Self-Review

Performed inline after writing this spec, per brainstorming skill checklist:

1. **Placeholder scan**: No TBD / TODO / vague requirements. All 7-8 assertions have explicit implementation strategies + expected outputs. ✓
2. **Internal consistency**: Architecture diagram matches file layout table; risks table cross-references architecture nodes; sequencing dependencies match file overlap analysis. ✓
3. **Scope check**: Single focused batch (test infrastructure only), ≤ 6 files touched, ~350 LOC net. Within single-plan scope; no decomposition needed. ✓
4. **Ambiguity check**:
   - Sub-task #2 helper API: chose `spawnTsxInline` + `spawnTsxInlineStdout` (b in brainstorming Q3). Explicit.
   - P51 dynamic import ordering: explicit `await import(...)` in runnerSource is caller's responsibility (decision documented).
   - T8 feasibility: deferred to plan pre-flight (`--help` probe); spec explicitly says "drop T8 if not feasible".

No inline fixes needed.