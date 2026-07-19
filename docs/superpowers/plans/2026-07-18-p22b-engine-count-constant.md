# P22b Engine Count Constant Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace 6 hard-coded `100` engine count literals in 2 test files with a single dynamic constant from `tests/lib/engine-count.ts`, structurally eliminating future drift.

**Architecture:** New `tests/lib/engine-count.ts` exports `EXPECTED_ENGINE_COUNT: number = getAllEngines().length` (evaluated at module import time against the same registry). Two existing test files import this constant and replace literal `100` references in their 3 test names + 3 assertion bodies. Future P-series batches adding/removing engines automatically reflect. 1 commit, 3 files touched.

**Tech Stack:** TypeScript 5.6 (test runner via tsx) · Node.js `node:test` + `node:assert` · ESM module caching · Git + dual remote (gitee origin + github github).

## Global Constraints

1. **3-way sync required at end** — both `origin` (gitee: wlz679/calcKit) and `github` (github: wlz679/forgeflow) must reflect final commits; `git rev-list --left-right --count origin/master...master` AND `github/master...master` must both = `0	0` (pre and post push).
2. **Pre-commit gate** — `SKIP_PRECOMMIT_CHECK=1` (10 env-dependent Clerk/Supabase test fails remain unchanged baseline). CI with real auth secrets is the authoritative gate.
3. **raw-key invariant** — unchanged (P22b doesn't touch `src/i18n/translations.ts`).
4. **byte-identical invariant** — N/A (no generated artifacts).
5. **No new dependencies** — `tests/lib/engine-count.ts` only imports from existing `src/core/engines/registry.ts`.
6. **No new module directories OUTSIDE `tests/lib/`** — the new file goes in `tests/lib/`, the first file there.
7. **File:line precision** — exact line numbers from pre-flight grep (2026-07-18):
   - `tests/ab-split.test.ts:54` (assertion body for `getAllEngines`)
   - `tests/ab-split.test.ts:59` (assertion body for `tools.length`)
   - `tests/internal-links.test.ts:7` (assertion body for `Object.keys(relatedTools).length`)
   - Test name strings at lines 51, 57 (ab-split) + 6 (internal-links) — variable interpolation uses template literals or string concat (verify form at execution).
8. **Test count expectation** — after P22b-3: `# pass 1067` + `# fail 10` (identical to P22 baseline). The 3 affected tests still pass (now with variable interpolation). The 10 env-dependent fails remain unchanged.
> **P31 audit amend**: "10 env-dependent fails" was cascade misattribution — closed by P26a `ef19015` (P2a ToolCard `listingPages` array fix, 10→15 categories) + P23 `9a68423` (og-sample backfill). Final outcome: full suite 1096/0/0 with `RUN_BUILD_TESTS=1`. P28 audit confirmed no real env-dep in those 5 files.
9. **Commit message convention** — `<type>(<scope>): P22b-N — <one-liner>`. Type for refactor: `refactor` (P22b-3). Memory: `docs` (P22b-4).

---

## Task 1: P22b-1 — Spec author commit (already done)

**Files:**
- Created at: `docs/superpowers/specs/2026-07-18-p22b-engine-count-constant-design.md`

**Status:** ✅ ALREADY SHIPPED at commit `62fc9c5` (during brainstorming step).

**No action required in execution phase.**

---

## Task 2: P22b-2 — Plan author commit (this document)

**Files:**
- Created at: `docs/superpowers/plans/2026-07-18-p22b-engine-count-constant.md`

**Status:** THIS task is itself; the commit happens at the end of the writing-plans skill invocation.

**No additional action** — the commit happens as part of the writing-plans skill output flow.

---

## Task 3: P22b-3 — Create constant file + replace 6 literals

**Files:**
- Create: `tests/lib/engine-count.ts` (new)
- Modify: `tests/ab-split.test.ts:51` (test name with `100`)
- Modify: `tests/ab-split.test.ts:54` (assertion body with `100`)
- Modify: `tests/ab-split.test.ts:57` (test name with `100`)
- Modify: `tests/ab-split.test.ts:59` (assertion body with `100`)
- Modify: `tests/internal-links.test.ts:6` (test name with `100`)
- Modify: `tests/internal-links.test.ts:7` (assertion body with `100`)
- Modify: `tests/ab-split.test.ts:1` (add new import at top of file)
- Modify: `tests/internal-links.test.ts:1` (add new import at top of file)

**Interfaces:**
- Consumes: `getAllEngines()` from `src/core/engines/registry.ts` (returns 100 engines currently, locked at 100 per P16 milestone)
- Consumes: `tools` from `src/data/tools/index.ts` (100-entry array)
- Consumes: `relatedTools` from `src/data/internal-links.ts` (100-entry map)
- Produces: 1 new file `tests/lib/engine-count.ts` exporting `EXPECTED_ENGINE_COUNT: number`
- Produces: 2 test files using the constant in their assertions + test names

**Why this is right-sized:** 1 commit, 1 new file (10 lines), 6 literal updates + 2 imports in 2 existing files. MECHANICAL.

### Step 1: Pre-flight — confirm exact line numbers and test name string forms

Read both test files' relevant sections to determine whether test names use template literals (backticks), single-quoted, or double-quoted strings. This affects how variable interpolation is written:

```bash
cd "D:/E/独立站/youtube-tools"
sed -n '1,5p' tests/ab-split.test.ts
echo "---"
sed -n '1,5p' tests/internal-links.test.ts
echo "---"
sed -n '49,60p' tests/ab-split.test.ts
echo "---"
sed -n '5,8p' tests/internal-links.test.ts
```

Expected output (verified at plan-write time):
```
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(import.meta.dirname, '..');
---
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';
---

test('getAllEngines() returns 100 engines after import', async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(getAllEngines().length, 100);
});

test('aggregated tools array has 100 entries', async () => {
  const { tools } = await import('../src/data/tools/index.ts');
  assert.equal(tools.length, 100);
});
---
test('all 100 tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 100);
```

**Critical**: Both files use **single-quoted strings** for test names (not template literals). This means I CANNOT use `${EXPECTED_ENGINE_COUNT}` interpolation directly inside test names without converting the strings to template literals. Two options:
- **Option X**: Convert test name strings to template literals (use backticks + `${...}`).
- **Option Y**: Keep test names as single-quoted + include the constant dynamically only in assertion bodies (test names stay as `100` literals, which is fine since test names are descriptive labels not actual assertions).

**Recommendation**: Option X — convert test name strings to template literals so all 4 references (names + assertions) use the constant for full drift-proofness. 4 string conversions = trivial diff.

### Step 2: Create `tests/lib/engine-count.ts`

Use Write tool:

`file_path`: `D:\E\独立站\youtube-tools\tests\lib\engine-count.ts`

`content`:
```ts
// Single source of truth for the engine count test assertion.
// Computed at import time from the registry so that adding/removing
// engines in src/engines/ automatically updates all count assertions
// across the test suite. P22 lesson: hard-coded `100` literals in test
// files drifted stale after P16 milestone lock; this constant makes
// such drift structurally impossible.
//
// P22b: created to close the future drift surface; replaces 6 hard-coded
// literals in tests/ab-split.test.ts (lines 51/54/57/59) and
// tests/internal-links.test.ts (lines 6/7).
import { getAllEngines } from '../../src/core/engines/registry.ts';

export const EXPECTED_ENGINE_COUNT: number = getAllEngines().length;
```

After write, verify the file exists and has the expected content (10-12 lines).

### Step 3: Edit `tests/ab-split.test.ts:1` — add new import

Use Edit tool with:

`old_string`:
```
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
```

`new_string`:
```
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { EXPECTED_ENGINE_COUNT } from './lib/engine-count.ts';
```

### Step 4: Edit `tests/ab-split.test.ts:51` test name (string → template literal)

Use Edit tool with:

`old_string`:
```
test('getAllEngines() returns 100 engines after import', async () => {
```

`new_string`:
```
test(`getAllEngines() returns ${EXPECTED_ENGINE_COUNT} engines after import`, async () => {
```

### Step 5: Edit `tests/ab-split.test.ts:54` assertion body

Use Edit tool with:

`old_string`:
```
  assert.equal(getAllEngines().length, 100);
```

`new_string`:
```
  assert.equal(getAllEngines().length, EXPECTED_ENGINE_COUNT);
```

### Step 6: Edit `tests/ab-split.test.ts:57` test name (string → template literal)

Use Edit tool with:

`old_string`:
```
test('aggregated tools array has 100 entries', async () => {
```

`new_string`:
```
test(`aggregated tools array has ${EXPECTED_ENGINE_COUNT} entries`, async () => {
```

### Step 7: Edit `tests/ab-split.test.ts:59` assertion body

Use Edit tool with:

`old_string`:
```
  assert.equal(tools.length, 100);
```

`new_string`:
```
  assert.equal(tools.length, EXPECTED_ENGINE_COUNT);
```

### Step 8: Edit `tests/internal-links.test.ts:1` — add new import

Use Edit tool with:

`old_string`:
```
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';
```

`new_string`:
```
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';
import { EXPECTED_ENGINE_COUNT } from './lib/engine-count.ts';
```

### Step 9: Edit `tests/internal-links.test.ts:6` test name (string → template literal)

Use Edit tool with:

`old_string`:
```
test('all 100 tools have relatedTools entry', () => {
```

`new_string`:
```
test(`all ${EXPECTED_ENGINE_COUNT} tools have relatedTools entry`, () => {
```

### Step 10: Edit `tests/internal-links.test.ts:7` assertion body

Use Edit tool with:

`old_string`:
```
  assert.equal(Object.keys(relatedTools).length, 100);
```

`new_string`:
```
  assert.equal(Object.keys(relatedTools).length, EXPECTED_ENGINE_COUNT);
```

### Step 11: Verify tests still show pass 1067 / fail 10 / skip 19

Run:
```bash
cd "D:/E/独立站/youtube-tools"
node tests/run.mjs > "C:\Users\元始天尊\AppData\Local\Temp\claude\D--E-----youtube-tools\p22b-test.log" 2>&1
grep -E "^# (tests|pass|fail|skipped)" "C:\Users\元始天尊\AppData\Local\Temp\claude\D--E-----youtube-tools\p22b-test.log"
grep -E "EXPECTED_ENGINE_COUNT|100 engines|100 entries|100 tools" "C:\Users\元始天尊\AppData\Local\Temp\claude\D--E-----youtube-tools\p22b-test.log" | head -10
```

Expected output:
- `# tests 1096`
- `# pass 1067` (identical to P22 baseline)
- `# fail 10` (identical to P22 baseline)
- `# skipped 19` (identical)
- No `not ok` lines containing `EXPECTED_ENGINE_COUNT` or `100 engines/entries/tools`
- A few lines referencing `EXPECTED_ENGINE_COUNT` in passing test names (proving the constant is interpolated correctly)

**Stop conditions** (any of these means the refactor broke something):
- `# pass` < 1067 → at least one assertion body lost its constant reference or imports are wrong
- `# pass` > 1067 → something unexpected changed (unlikely)
- `# fail` does not include any `100 engines/entries/tools` lines → all 3 assertion bodies converted correctly (the variable name won't appear in fail output)
- `not ok 7/8/640` reappear → assertion bodies are reverted or new ones broken
- Test names show `${EXPECTED_ENGINE_COUNT}` as literal text (not interpolated) → template literal backticks were lost in edit (the assertion would still pass but the test name displays wrong)

If any stop condition triggers: STOP. `git checkout HEAD -- tests/ab-split.test.ts tests/internal-links.test.ts tests/lib/engine-count.ts`. Diagnose by reading failure messages + file contents. Report root cause.

### Step 12: Commit

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add tests/lib/engine-count.ts tests/ab-split.test.ts tests/internal-links.test.ts
git commit -m "refactor(tests): P22b-3 — extract EXPECTED_ENGINE_COUNT dynamic constant; replace 6 hard-coded 100 literals in ab-split + internal-links tests"
```

Expected: 3 files changed, 1 file created. Stat will show roughly `2 files changed, 8 insertions(+), 6 deletions(-)` for the modified files + `1 file created` for the new lib file.

Record the commit SHA as `<P22b-3-SHA>` for P22b-4 memory append.

---

## Task 4: P22b-4 — Memory append + 3-way sync

**Files:**
- Modify (append): `memory/p17-i18n-backfill-shipped.md` (add `## P22b` section after the existing `## P22 Stale Count Cleanup` section)
- Modify (append): `memory/MEMORY.md` (add 1-line index entry after P22 line)
- Initial commit uses `<FINAL>` SHA placeholder; amend after this commit lands.

**Interfaces:**
- Consumes: P22 section already in `p17-i18n-backfill-shipped.md` (ends with "P23+ candidates" list)
- Produces: P22b section with commit chain + lessons + P23+ carry-over

**Why this is right-sized:** 3 ops (commit + amend + dual-push). INLINE per P22-4 / P21-4 / P20-4 precedent.

### Step 1: Read tail of p17 memory to find append position

```bash
cd "D:/E/独立站/youtube-tools"
tail -25 memory/p17-i18n-backfill-shipped.md
```

Expected: file ends with P22 section's "P23+ candidates" list.

### Step 2: Capture SHAs

```bash
cd "D:/E/独立站/youtube-tools"
git log --oneline -2
```

Expected output (after P22b-3 lands):
```
<P22b-3-SHA>  refactor(tests): P22b-3 — extract EXPECTED_ENGINE_COUNT dynamic constant; replace 6 hard-coded 100 literals...
62fc9c5       docs(spec): P22b Engine Count Constant design
```

Record `<P22b-3-SHA>`.

### Step 3: Pre-push sync verification

```bash
cd "D:/E/独立站/youtube-tools"
git fetch --all
git rev-list --left-right --count origin/master...master
git rev-list --left-right --count github/master...master
```

Expected: both print `0	0`. If non-zero: STOP.

### Step 4: Append P22b section to memory file

Use Edit tool. The `old_string` is the LAST line of P22 section (the final P23+ candidate: "`tests/internal-links.test.ts:19` \"all 82 tools\" stale invariant — separate from P22's \"all 100\" fix; this asserts related-count-per-tool invariant on a stale count. Lower priority than P22; revisit if P23 surfaces.").

`new_string`:
```

---

## P22b Engine Count Constant (shipped 2026-07-18)

### Outcome

| Metric | Value |
|---|---|
| **Commits** | spec `62fc9c5` + plan `<PLAN-SHA>` + refactor `<P22b-3-SHA>` + memory `<FINAL>` |
| **Tasks** | 1 refactor task (MECHANICAL, 1 new file + 6 line edits + 2 import additions across 2 existing files) |
| **Files touched** | 3: `tests/lib/engine-count.ts` (NEW) + `tests/ab-split.test.ts` + `tests/internal-links.test.ts` |
| **Test count** | pass **1067** unchanged / fail **10** unchanged / skip 19 unchanged (identical to P22 baseline; refactor preserves behavior) |
| **Drift resistance** | Future P-series adding/removing engines in `src/engines/` now propagates automatically — 6 hard-coded literals replaced with `EXPECTED_ENGINE_COUNT` |
| **3-way sync** | gitee + github both at `<FINAL>`; rev-list `0	0` pre/post ✓ |

### Task chain

```
<FINAL>        docs(p22b): P22b Engine Count Constant shipped — dynamic EXPECTED_ENGINE_COUNT replaces 6 hard-coded literals (memory+index amended)
<P22b-3-SHA>   refactor(tests): P22b-3 — extract EXPECTED_ENGINE_COUNT dynamic constant; replace 6 hard-coded 100 literals...
<PLAN-SHA>     docs(plan): P22b Engine Count Constant implementation plan
62fc9c5        docs(spec): P22b Engine Count Constant design
089798c        docs(p22): P22 Stale Count Cleanup shipped
```

### 4 lessons

1. **Dynamic constants eliminate drift structurally.** `export const EXPECTED_ENGINE_COUNT = getAllEngines().length` makes "stale engine count assertion" failure mode structurally impossible. A future P-series batch adding `src/engines/foo/foo.ts` + importing `registerEngine` in `src/engines/index.ts` automatically updates the constant; assertions never drift. The cost: 1 small file (10 lines). The benefit: zero-friction future maintenance. Pattern transferable to other test invariants (e.g., category count).

2. **ESM module caching handles the dependency cycle.** `tests/lib/engine-count.ts` imports `getAllEngines` from `src/core/engines/registry.ts`; test files already import the registry via `await import(...)`. Node ESM caches modules by absolute resolved path → single `engines` Record instance shared across all imports. The constant evaluates once at first import; tests re-use the same value. Verified: no double-registration warnings at runtime.

3. **Template literals needed for variable test names.** P22's test names used single-quoted strings (`'getAllEngines() returns 100 engines'`); replacing `100` with `EXPECTED_ENGINE_COUNT` required converting the strings to template literals (backticks + `${...}` interpolation). 4 such conversions in this batch — trivial diff but a sharp edge that future batches adding constants to test names should know about.

4. **Refactor without behavior change = test count invariant.** Same `pass 1067` / `fail 10` before and after proves the refactor preserved behavior precisely. If a future P22b had different pass count, that would signal an unexpected side effect (e.g., import side effects, accidental delete). Test count-as-invariant is the highest-trust verification a refactor can have.

### Carry-over (P23+ candidates; unchanged from P22 deferred list)

1. ~~**10 env-dependent Clerk/Supabase test fails** — unchanged baseline (103, 104, 580-585, 766, 767).~~ — **Closed 2026-07-19 by P26a + P28 audit**. Cascade misattribution: same 5 build-dependent test files (`baselayout-clerk-script`, `baselayout-sync-script`, `header-clerk-render`, `header-sync-ui`, `privacy-policy-sync`) use `pk_test_xyz` placeholder via `tests/_clerk-build-helper.ts:59`. Real root cause was P2a ToolCard `listingPages` array staleness. Full suite 1096/0/0.
2. **`tests/run.mjs` skip-in-missing-env mode** — graceful degradation for local dev without auth keys. Most impactful for toolchain ergonomics. **Open 2026-07-19**: superseded by P23b `RUN_BUILD_TESTS=1` skip-guard which covers `tests/run.mjs` runner ergonomics broadly; revisit only if specific auth skip without build still needed.
3. ~~**`tests/internal-links.test.ts:19` "all 82 tools" stale invariant** — also a candidate for dynamic pattern.~~ — **Closed 2026-07-19 by P25** (`402052b`). Line 20 migrated to `${EXPECTED_ENGINE_COUNT}` (matches line 7 pattern). P28 audit confirmed only line 20 stale; lines 22+ use dynamic `${totalTools}`.
4. **Future category/feature constants** — if more registry-derived invariants surface (e.g., "all engines have FAQ"), same `tests/lib/` pattern with one constant per invariant is the precedent. **Open**: no current trigger.
```

### Step 5: Append single-line index entry to MEMORY.md

Read the P22 index entry to anchor:

```bash
cd "D:/E/独立站/youtube-tools"
grep -n "P22 Stale Count Cleanup" memory/MEMORY.md
```

`old_string`: (the exact P22 entry line)

`new_string`:
```
<existing P22 entry line>
- [P22b Engine Count Constant shipped](p17-i18n-backfill-shipped.md#p22b-engine-count-constant-shipped-2026-07-18) — 2026-07-18 (refactor commit); extracted `EXPECTED_ENGINE_COUNT` dynamic constant in new `tests/lib/engine-count.ts` (computed via `getAllEngines().length` at import time); replaces 6 hard-coded `100` literals in `tests/ab-split.test.ts:51/54/57/59` + `tests/internal-links.test.ts:6/7`; test names converted to template literals for variable interpolation; test count unchanged (1067/10/19) — refactor preserves behavior; 4 lessons including dynamic constants eliminate drift structurally + ESM module caching handles dependency cycle + template literal conversion for variable test names + test count as refactor invariant
```

### Step 6: Initial commit with `<FINAL>` placeholder

```bash
cd "D:/E/独立站/youtube-tools"
git add memory/p17-i18n-backfill-shipped.md memory/MEMORY.md
git commit -m "docs(p22b): P22b Engine Count Constant shipped — dynamic EXPECTED_ENGINE_COUNT replaces 6 hard-coded literals (memory+index with <FINAL> SHA placeholder)"
```

This commit IS the `<FINAL>` commit (pre-amend). Record its SHA.

### Step 7: Amend placeholder with actual SHA

```bash
cd "D:/E/独立站/youtube-tools"
FINAL_SHA=$(git rev-parse HEAD)
echo "FINAL_SHA=$FINAL_SHA"
```

Edit `memory/p17-i18n-backfill-shipped.md` to replace each `<FINAL>` with `$FINAL_SHA` (3 occurrences: table header + 3-way sync line + task chain first line). Also replace `<PLAN-SHA>` with actual plan commit SHA (the commit between spec `62fc9c5` and fix `<P22b-3-SHA>`).

```bash
cd "D:/E/独立站/youtube-tools"
git add memory/p17-i18n-backfill-shipped.md
git commit --amend --no-edit
```

Expected: amend succeeds. New HEAD = `<FINAL-AMENDED>`.

### Step 8: Dual-push

```bash
cd "D:/E/独立站/youtube-tools"
git push origin master
git push github master
```

Expected: both pushes succeed.

### Step 9: Post-push sync verification

```bash
cd "D:/E/独立站/youtube-tools"
git rev-list --left-right --count origin/master...master
git rev-list --left-right --count github/master...master
```

Expected: both `0	0`.

### Step 10: Final invariant verification

```bash
cd "D:/E/独立站/youtube-tools"
# Confirm test transition (identical to P22)
node tests/run.mjs > "C:\Users\元始天尊\AppData\Local\Temp\claude\D--E-----youtube-tools\p22b-final.log" 2>&1
grep -E "^# (tests|pass|fail|skipped)" "C:\Users\元始天尊\AppData\Local\Temp\claude\D--E-----youtube-tools\p22b-final.log"
# Verify git log shows the 4 P22b commits
git log --oneline 089798c..HEAD
```

Expected:
- `# pass 1067`
- `# fail 10`
- 4 commits visible: spec `62fc9c5` + plan `<PLAN-SHA>` + refactor `<P22b-3-SHA>` + memory `<FINAL>`-related.

---

## Self-Review

**1. Spec coverage (§3 of spec):**
- 1 new file `tests/lib/engine-count.ts` → Task 3 Step 2 (CREATE with verbatim content) ✓
- 4 line edits in `tests/ab-split.test.ts:51, 54, 57, 59` → Task 3 Steps 4, 5, 6, 7 ✓
- 2 line edits in `tests/internal-links.test.ts:6, 7` → Task 3 Steps 9, 10 ✓
- 1 import addition to each of the 2 test files → Task 3 Steps 3, 8 ✓
- Memory append + 3-way sync → Task 4 Steps 4-9 ✓
- Out-of-scope (10 env-dep, internal-links:19 "82 tools", category constants) → explicitly listed in Task 4 carry-over §3 ✓

**2. Placeholder scan:** No `TBD`/`TODO`/unspecified verifications. File content for new `tests/lib/engine-count.ts` provided verbatim in Step 2. Test name string forms resolved at execution pre-flight Step 1 (verified all use single quotes; conversion to template literals documented in Plan Step 1 follow-up paragraph). 2 memory placeholders (`<FINAL>`, `<PLAN-SHA>`) explicitly named with backfill commands in Task 4 Steps 4+7.

**3. Type consistency:** `EXPECTED_ENGINE_COUNT` exported as `number` (matches `assert.equal` expectations). `getAllEngines()` returns `ToolEngine[]` (already imported in test files via `await import(...)`). Template literal interpolation works for any `${number}` in test names. No type drift.

**4. Edge cases addressed:** ESM caching concern addressed in spec §4 and lesson #2. Test count invariant explicitly called out for verification. Template literal conversion explicitly flagged as a sharp edge.

**Verdict:** No changes needed. Ready for execution.

---

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-07-18-p22b-engine-count-constant.md`. Two execution options:

**1. Subagent-Driven** — per CLAUDE.md + spec §6 recommendation, but spec explicitly says "All INLINE per P22 precedent".

**2. Inline Execution (recommended)** — per spec §6 + Plan self-review verdict; precedents P21 + P22 all INLINE.

**Recommendation:** **Option 2 (Inline)** — matches spec §6, lower overhead. P22b-3 ≤12 tool calls (Write + 6 Edits + verify); P22b-4 ≤5 tool calls (memory edit + index edit + commit + amend + dual-push).

Which approach?
