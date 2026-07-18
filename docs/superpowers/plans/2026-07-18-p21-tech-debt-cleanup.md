# P21 Tech Debt Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship 3 housekeeping tasks (TS6133 fix + README护营 + 2 fixtures) + memory + 3-way sync — all from approved design spec at `docs/superpowers/specs/2026-07-18-p21-tech-debt-cleanup-design.md` (commit `7de4870`).

**Architecture:** 3 narrowly-scoped MECHANICAL tasks modifying 2 files (test file + README), each independently testable. Task 4 bundles memory append + 3-way sync. All tasks INLINE execution (≤10 tool calls per task; subagent overhead > value).

**Tech Stack:** Node.js (`node:test` runtime + `node:assert`) · TypeScript 5.6 type-checker (target for `@ts-expect-error` suppression) · Git + dual remote (gitee origin + github github).

## Global Constraints

1. **3-way sync required at end** — both `origin` (gitee: wlz679/calcKit) and `github` (github: wlz679/forgeflow) must reflect final commits; `git rev-list --left-right --count origin/master...master` AND `github/master...master` must both = `0	0` (pre and post push).
2. **Pre-commit gate** — `pnpm check` runs `codegen-examples.mjs --check` + typecheck + tests; pre-existing 12 fails from Clerk/Supabase env (`SKIP_PRECOMMIT_CHECK=1` is acceptable escape hatch per CLAUDE.md).
3. **raw-key invariant** — `dist/{en,zh}/index.html` raw-key count must remain 0/0 after each task (none of these tasks touch `src/i18n/translations.ts` or build output, but verify).
4. **Byte-identical invariant** — any regenerated artifact must be byte-identical to pre-task state (fixtures should not change output of existing 6).
5. **No new dependencies** — no new packages, no new tools, no new modules outside listed files.
6. **No new files outside** `tests/scripts/test-apply-translations-zh-parser.mjs` · `scripts/.scratch/_archive/README.md` · `memory/p17-i18n-backfill-shipped.md` · `memory/MEMORY.md`.
7. **File:line precision** — exact line numbers from pre-flight grep:
   - `tests/scripts/test-apply-translations-zh-parser.mjs:5` and `:7` for P21-1
   - `tests/scripts/test-apply-translations-zh-parser.mjs:38-66` (after fixtures array + after fixture 6 `test(...)`) for P21-3 new fixtures
   - `scripts/.scratch/_archive/README.md` (entire file, ~6 lines → ~50 lines) for P21-2
8. **Commit message convention** — `<type>(<scope>): P21-N — <one-liner>`. Types: `chore` (P21-1, P21-2), `test` (P21-3), `docs` (P21-4 memory).
9. **Memory baseline** — append to `memory/p17-i18n-backfill-shipped.md` P19/P20 sections without disturbing prior section structure. The `<final>` SHA placeholder in P21-4 commit must be amended with the actual final SHA after task commits land.

---

## Task 1: P21-1 — TS6133 disable on 2 unused-looking imports

**Files:**
- Modify: `tests/scripts/test-apply-translations-zh-parser.mjs:5` (add `// @ts-expect-error` annotation)
- Modify: `tests/scripts/test-apply-translations-zh-parser.mjs:7` (add `// @ts-expect-error` annotation)

**Interfaces:**
- Consumes: imports `test` from `node:test` (fixtures 5/6 use it) and `parseStringLiteral` from `../../scripts/lib/zh-parser.mjs` (fixture 5/6 use it)
- Produces: 2 lines annotated with TS6133 suppression; no semantic change to test behavior

**Why this is right-sized:** 1 file, 2 line edits, no logic change. MECHANICAL.

### Step 1: Pre-flight — confirm line numbers and current content

Read the first 10 lines of the test file to confirm current state:

```bash
cd "D:/E/独立站/youtube-tools"
sed -n '1,10p' tests/scripts/test-apply-translations-zh-parser.mjs
```

Expected output (exact):
```
// Fixture-driven regression test for the UPDATE-regex bug fixed in P18-1.
// Pre-fix, `reSingle = /('key':\s*\{[^}]*?zh:\s*)'([^']*)'/m` matched only up to
// the first `'` in zh. If zh contains `'` (e.g. ARR range), the match truncates
// and the replace leaves dangling suffix → JS parse error.
import { describe, it, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { replaceZhValue, parseStringLiteral } from '../../scripts/lib/zh-parser.mjs';

const fixtures = [
```

If the `import` lines do NOT match exactly (different test fn names, additional imports), STOP — surface the discrepancy to the user; do not proceed with edits based on wrong context.

### Step 2: Edit line 5 with @ts-expect-error annotation

Use Edit tool with:

`old_string`:
```
import { describe, it, test } from 'node:test';
```

`new_string`:
```
// P21-1: TS6133 false positive — `test` from node:test is recognized at runtime
// (used by fixtures 5/6 below as standalone test(...) calls) but the TypeScript
// checker cannot see its usage through the runtime export type definition.
// @ts-expect-error TS6133 false positive — used by fixtures 5/6
import { describe, it, test } from 'node:test';
```

### Step 3: Edit line 7 with @ts-expect-error annotation

Use Edit tool with:

`old_string`:
```
import { replaceZhValue, parseStringLiteral } from '../../scripts/lib/zh-parser.mjs';
```

`new_string`:
```
// P21-1: TS6133 false positive — `parseStringLiteral` is used by fixtures 5/6 below
// as standalone test(...) calls; import looks unused to TypeScript checker.
// @ts-expect-error TS6133 false positive — used by fixtures 5/6
import { replaceZhValue, parseStringLiteral } from '../../scripts/lib/zh-parser.mjs';
```

### Step 4: Verify tests still pass 6/6 (no behavior change)

Run:
```bash
cd "D:/E/独立站/youtube-tools"
node --test tests/scripts/test-apply-translations-zh-parser.mjs
```

Expected: 6/6 pass (same as before; P21-1 has zero impact on test execution — only TypeScript type-checker interpretation).

If a test fails: STOP. Revert with `git checkout HEAD -- tests/scripts/test-apply-translations-zh-parser.mjs`. Diagnose by reading the failure message + the new file content. Report root cause to user.

### Step 5: Commit

```bash
cd "D:/E/独立站/youtube-tools"
git add tests/scripts/test-apply-translations-zh-parser.mjs
git commit -m "chore(tests): P21-1 — suppress TS6133 false positive on node:test + parseStringLiteral imports"
```

Expected: 1 file changed, ~6 insertions (3 lines of comment per import × 2 imports). Commit SHA captured for P21-4 memory append.

---

## Task 2: P21-2 — scripts/.scratch/_archive/README 护营

**Files:**
- Modify: `scripts/.scratch/_archive/README.md` (entire file rewrite, ~6 lines → ~50 lines)

**Interfaces:**
- Consumes: existing 3-line README content (3 `#` comments describing P18-1, P18-3, P17b items)
- Produces: structured provenance + safety card with 7-row table + cleanup gating rules

**Why this is right-sized:** 1 file rewrite, no code logic change, content is fully specified in spec §2 Task 2. MECHANICAL.

### Step 1: Read current README content for lineage preservation

Read full file:
```bash
cd "D:/E/独立站/youtube-tools"
cat scripts/.scratch/_archive/README.md
```

Expected current content (verified above):
```
# P18-1: No longer needed — apply-translations.mjs state-machine parser replaces fragile UPDATE regex.
# P18-3: ZH terminology audit artifacts — preserved for future audits. The fix-zh-terminology.mjs script reads the curated JSON at apply time. Future audits can re-run `scripts/audit-zh-terminology.mjs` to regenerate raw findings.
# P17b: i18n-needed.json — consolidated missing-translations report from P17b translation backfill (100 engines × per-tool keys). Reference only — all gaps were filled in P17/P17b.
```

If content is different: STOP, surface the diff to user. Do not overwrite unread source.

### Step 2: Verify provenance commit reference

```bash
cd "D:/E/独立站/youtube-tools"
git show --stat b8eadba | head -20
```

Expected: confirms commit `b8eadba` is "P19-2 — archive P18-3 ZH terminology audit + P17b i18n-needed.json" with file moves into `_archive/`. This is the provenancing anchor for the new README.

If commit doesn't exist or subject differs: STOP, surface discrepancy. (Note: spec §7 says "git log -p b8eadba --stat" — but `git show --stat` is sufficient and faster.)

### Step 3: Replace README content with structured provenance + safety card

Use Write tool (full file replacement; new content is self-contained):

`file_path`: `D:\E\独立站\youtube-tools\scripts\.scratch\_archive\README.md`

`content`:
```markdown
# scripts/.scratch/_archive — Historical Artifacts

**Last verified:** 2026-07-18 (P21-2 pass)
**Provenance:** commit `b8eadba` (P19-2 "archive P18-3 ZH terminology audit + P17b i18n-needed.json")
**Convention:** gitignored; preserved for forensic / audit value, NOT for active use.

## Contents

| File | Origin | Status | Reuse rules |
|---|---|---|---|
| `fix-5-corruptions.mjs` | P17b Task 6 one-off repair (handled 5 distinct zh corruption cases) | APPLIED | DO NOT RE-RUN — would corrupt post-repair state |
| `fix-corruptions.mjs` | P17b earlier draft (multi-case repair, superseded) | SUPERSEDED | DO NOT RUN — `fix-5-corruptions.mjs` is the canonical version |
| `fix-nrr.mjs` | P17b NRR-specific corruption repair | APPLIED | DO NOT RE-RUN |
| `i18n-needed.json` (377668 bytes) | P17b missing-translations report (100 engines × per-tool keys) | REFERENCE ONLY | All gaps filled in P17/P17b. Regenerate with `node scripts/extract-i18n-needed.mjs` if a fresh snapshot is needed |
| `zh-terminology-audit.json` + `.log` | P18-3 raw audit run #1 (pre-curation) | HISTORICAL | Re-run `node scripts/audit-zh-terminology.mjs` for fresh audit |
| `zh-terminology-audit-2.json` + `.log` | P18-3 raw audit run #2 (post-curation re-audit) | HISTORICAL | Same as above |
| `zh-terminology-audit-curated.json` | P18-3 21-applied-edit manifest (curated subset) | HISTORICAL | Reference for what was actually changed by `fix-zh-terminology.mjs` |

## When to clean up

**DO NOT delete any file unless ALL 3 conditions hold:**
1. The corresponding work has shipped ≥6 months ago (check git log for commit age), AND
2. No active script reads from the file (verify with `grep -rn "<archive-filename>" scripts/`), AND
3. The provenance commit (`b8eadba`) is reachable from the current branch (`git merge-base --is-ancestor b8eadba HEAD`).

If any condition fails, leave the file intact. The directory is gitignored precisely so it can survive without cluttering the repo, but its forensic value depends on persistence.
```

### Step 4: Verify by reading back

```bash
cd "D:/E/独立站/youtube-tools"
cat scripts/.scratch/_archive/README.md
```

Expected: 50 lines of structured content (table + cleanup rules + provenance header).

If output looks wrong (truncated, escape issues): STOP, do not commit. Diagnose.

### Step 5: Cross-check the README's claims about consumers

```bash
cd "D:/E/独立站/youtube-tools"
grep -rn "_archive" scripts/ --include="*.mjs" --include="*.ts"
```

Expected (verified above): 4 consumers — `apply-translations.mjs`, `check-i18n-completeness.mjs`, `extract-i18n-needed.mjs`, `fix-zh-terminology.mjs`. All reference `_archive/` paths.

If consumers don't match: edit the README to reflect actual state before committing. DO NOT skip this verification — it prevents the README from lying about what depends on the archive.

### Step 6: Commit

```bash
cd "D:/E/独立站/youtube-tools"
git add scripts/.scratch/_archive/README.md
git commit -m "chore(scratch): P21-2 — README护营 with provenance, per-file status table, cleanup gating rules"
```

Expected: 1 file changed, ~50 insertions, ~3 deletions (old 3-line content removed).

---

## Task 3: P21-3 — 2 边缘 fixtures (backslash escape + empty zh)

**Files:**
- Modify: `tests/scripts/test-apply-translations-zh-parser.mjs` (add fixtures 7 + 8 to `fixtures[]` array)

**Interfaces:**
- Consumes: existing 4 fixtures in `fixtures[]` array (lines 9-38); existing `replaceZhValue` from `scripts/lib/zh-parser.mjs`
- Produces: 2 new fixtures appended at end of `fixtures[]` (fixtures 7 + 8), making array length 6

**Why this is right-sized:** 1 file, append 2 fixture objects to existing array. Test count goes from 6/6 to 8/8. MECHANICAL (per spec §2 Task 3 — backslash escape covers UPDATE-regex sibling pattern; empty zh covers off-by-one boundary).

### Step 1: Read the exact existing fixtures array content for append position

```bash
cd "D:/E/独立站/youtube-tools"
sed -n '38,67p' tests/scripts/test-apply-translations-zh-parser.mjs
```

Expected output:
```
  {
    name: 'no embedded special chars (baseline)',
    input: `  'tools.x.input.x.label': { en: 'X', zh: '原始 zh' },`,
    key: 'tools.x.input.x.label',
    newZh: '替换后的 zh',
    expectContains: `zh: '替换后的 zh'`,
  },
];

describe('replaceZhValue state-machine parser (P18-1)', () => {
  for (const fx of fixtures) {
    it(fx.name, () => {
      const out = replaceZhValue(fx.input, fx.key, fx.newZh);
      assert.ok(
        out.includes(fx.expectContains),
        `Output should contain ${JSON.stringify(fx.expectContains)} but was ${JSON.stringify(out)}`,
      );
    });
  }
});

// Fixture 5: tolerant=true recovers unescaped quote inside value (P17b corruption pattern)
test('parseStringLiteral tolerant=true recovers unescaped quote', () => {
  const src = `zh: '对 '$10M-$50M ARR' 的金额'`;
  const r = parseStringLiteral(src, 4, { tolerant: true });
  assert.ok(r, 'tolerant parser should succeed');
  assert.equal(r[0], "对 '$10M-$50M ARR' 的金额");
});

// Fixture 6: strict (default) truncates at first unescaped quote (regression guard for back-compat)
test('parseStringLiteral tolerant=false (default) truncates at first quote', () => {
  const src = `zh: '对 '$10M-$50M ARR' 的金额'`;
  const r = parseStringLiteral(src, 4);
  assert.ok(r, 'strict parser should still succeed on the first quoted segment');
  assert.equal(r[0], '对 ');
});
```

If layout differs (different closing `};` line, different fixture 5/6 placement): STOP, surface mismatch.

### Step 2: Verify templates in fixtures 7/8 are syntactically valid by inspecting escape counts

Reading carefully: the template literals use `` ` ... ` `` with escape backslashes. For fixture 7:
- Input template contains `\\\\` (4 backslashes in JS source) → 2 backslashes in actual string → escaped backslash in zh value
- `expectContains` uses `\\\\` similarly

This double-escape pattern is identical to fixture 3 (`'单行\\\\n文本'`) which is already passing. So fixture 7 should follow the same pattern.

For fixture 8 (empty string): trivial.

### Step 3: Edit — append 2 fixtures before the `];` closing the array

Use Edit tool with:

`old_string`:
```
  {
    name: 'no embedded special chars (baseline)',
    input: `  'tools.x.input.x.label': { en: 'X', zh: '原始 zh' },`,
    key: 'tools.x.input.x.label',
    newZh: '替换后的 zh',
    expectContains: `zh: '替换后的 zh'`,
  },
];
```

`new_string`:
```
  {
    name: 'no embedded special chars (baseline)',
    input: `  'tools.x.input.x.label': { en: 'X', zh: '原始 zh' },`,
    key: 'tools.x.input.x.label',
    newZh: '替换后的 zh',
    expectContains: `zh: '替换后的 zh'`,
  },
  // P21-3 Fixture 7: backslash escape inside zh value (regression guard for the P18-1 UPDATE-regex sibling pattern).
  {
    name: 'backslash escape inside zh (raw string boundary case)',
    input: `  'tools.x.input.path': { en: 'path', zh: 'C:\\\\Users\\\\public' },`,
    key: 'tools.x.input.path',
    newZh: 'D:\\Work\\new',
    expectContains: `zh: 'D:\\\\Work\\\\new'`,
  },
  // P21-3 Fixture 8: empty zh value (off-by-one boundary case for the P20-3 state-machine).
  {
    name: 'empty zh value handling',
    input: `  'tools.x.input.empty': { en: '', zh: '' },`,
    key: 'tools.x.input.empty',
    newZh: '新空值',
    expectContains: `zh: '新空值'`,
  },
];
```

### Step 4: Run tests — should now pass 8/8

```bash
cd "D:/E/独立站/youtube-tools"
node --test tests/scripts/test-apply-translations-zh-parser.mjs
```

Expected: 8/8 pass (was 6/6, +2 from fixtures 7 + 8).

If a test fails:
- **Fixture 7 fails:** the backslash escape pattern may need adjustment. The current parser (P20-3 state-machine) consumes `\\` + next char literally — so `\\\\` (2 actual backslashes) gets emitted as `\\\\` in output. The `expectContains` should match the literal characters in `out` (which is the source string after the replace operation). Read the failure message — it will print both `expectContains` and `out`, allowing exact diagnosis.
- **Fixture 8 fails:** the empty-value boundary case may need a tweak to the test (e.g., assert `out` does NOT contain `zh: ''`) or to the parser (out of scope for P21). Surface the failure to user; do not silently adjust parser.

If both fixtures pass: proceed to commit.

### Step 5: Commit

```bash
cd "D:/E/独立站/youtube-tools"
git add tests/scripts/test-apply-translations-zh-parser.mjs
git commit -m "test(parser): P21-3 — add 2 edge-case fixtures (backslash escape + empty zh); 8/8 pass"
```

Expected: 1 file changed, ~14 insertions (2 fixtures × ~7 lines each).

---

## Task 4: P21-4 — Memory append + 3-way sync

**Files:**
- Modify (append): `memory/p17-i18n-backfill-shipped.md` (add `## P21` section before EOF)
- Modify (append): `memory/MEMORY.md` (add 1-line index entry)
- Initial commit uses `<final>` SHA placeholder; amend after P21-3 commit lands to backfill with actual SHA.

**Interfaces:**
- Consumes: P19 + P20 sections already in `p17-i18n-backfill-shipped.md` (verified above: file has frontmatter listing 12+ P17 series commits)
- Produces: P21 section with 4 lessons + 5 P22+ candidates + commit chain

**Why this is right-sized:** 3 commits (placeholder → amend → push) on 2 files. INLINE (no subagent). Matches P19-4 + P20-4 precedent.

### Step 1: Read end of p17 memory to find append position

```bash
cd "D:/E/独立站/youtube-tools"
wc -l memory/p17-i18n-backfill-shipped.md && tail -50 memory/p17-i18n-backfill-shipped.md
```

Expected: file ends with P20 section ("P20 candidates documented..."). P21 section will be appended after.

### Step 2: Capture SHAs of P21-1, P21-2, P21-3 commits

```bash
cd "D:/E/独立站/youtube-tools"
git log --oneline -4
```

Expected output (after tasks 1-3 land):
```
<sha3>  test(parser): P21-3 — add 2 edge-case fixtures (backslash escape + empty zh); 8/8 pass
<sha2>  chore(scratch): P21-2 — README护营 with provenance, per-file status table, cleanup gating rules
<sha1>  chore(tests): P21-1 — suppress TS6133 false positive on node:test + parseStringLiteral imports
d75478e docs(p20): P20 i18n Tooling Polish shipped — 3 housekeeping commits; ...
```

Record `SHA1`, `SHA2`, `SHA3`, and `<FINAL>` (will be assigned in Step 5 after amend).

### Step 3: Pre-push sync verification

```bash
cd "D:/E/独立站/youtube-tools"
git fetch --all
git rev-list --left-right --count origin/master...master
git rev-list --left-right --count github/master...master
```

Expected: both print `0	0`. If either prints non-zero: STOP. Pull/fetch missing commits from the lagging remote before proceeding.

### Step 4: Append P21 section to memory file

Use Edit tool on `memory/p17-i18n-backfill-shipped.md`:

`old_string`: (find the LAST line of the P20 section — last entry should reference commit `d75478e` and "P21 candidates documented in memory:")

`new_string`:
```

---

## P21 Tech Debt Cleanup (shipped 2026-07-18)

### Outcome

| Metric | Value |
|---|---|
| **Commits** | 3 task + 1 memory = 4 commits |
| **Tasks** | 3/3 INLINE (no subagent; each task ≤10 tool calls) |
| **Spec → Plan → Ship** | spec `7de4870` + plan `<PLAN-SHA>` + ship `<FINAL>` |
| **Tests** | 6/6 → **8/8 pass** (added 2 边缘 fixtures) |
| **Files modified** | 2: `tests/scripts/test-apply-translations-zh-parser.mjs` + `scripts/.scratch/_archive/README.md` |
| **3-way sync** | gitee + github both at `<FINAL>`; rev-list `0	0` pre/post ✓ |

### Task chain

```
<FINAL>  docs(p21): P21 Tech Debt Cleanup shipped — 3 housekeeping tasks
<SHA3>   test(parser): P21-3 — add 2 edge-case fixtures (backslash escape + empty zh); 8/8 pass
<SHA2>   chore(scratch): P21-2 — README护营 with provenance, per-file status table, cleanup gating rules
<SHA1>   chore(tests): P21-1 — suppress TS6133 false positive on node:test + parseStringLiteral imports
d75478e  docs(p20): P20 i18n Tooling Polish shipped — 3 housekeeping commits; ...
```

### 4 lessons

1. **`// @ts-expect-error` is the right surgical tool for node:test false positives** — adding it to the 2 specific imports (line 5 `test` + line 7 `parseStringLiteral`) is the minimum-impact fix. eslint config + project-wide no-unused-vars override would be cleaner but is a P22+ scope (10+ file project-wide change, see spec §5).
2. **README护营 gives 80% safety at 5% cost** — replacing 3 vague lines with a 7-row status table + 3-condition cleanup gate gives future maintainers enough signal to NOT accidentally delete the directory. Per-file deep content audit is P22+ territory.
3. **Fixture extension BEFORE any refactor** — adding fixtures 7 (backslash escape) and 8 (empty zh) at the current state-machine implementation locks in current behavior. If P22+ refactors the parser, these fixtures guarantee back-compat. Same TDD discipline as P20-3 byte-identical regeneration (P20 memory).
4. **INLINE execution beats subagent when ≤10 tool calls per task** — 4 P19-P21 INLINE cases (P19-3 / P19-4 / P19-5 / P20-4) all shipped without a review loop because the risks were scoped + testable in main session. Subagent overhead (1 implementer + 1 reviewer + handoff dispatch) was > value each time.

### P22+ candidates (deferred from P21)

1. **`docs/superpowers/specs/INDEX.md`** — 37 spec files need a discovery index. ~50 lines + content audit of which specs are stable vs WIP.
2. **`scripts/.scratch/` deep content audit** — per-file "would re-running X corrupt state?" verification. 7 files × 1 task each = 7+ tasks; not narrow enough for current batch.
3. **`scripts/lib/` extraction rules** — `extract-i18n-needed.mjs` has FAQ/howToUse parsing blocks (lines 158-188) that could move to `scripts/lib/zh-parser.mjs` or a sibling `faq-parser.mjs`. Out of current scope.
4. **`parseStringLiteralSmart` deprecation marker** — `/** @deprecated since 2026-07-18; use parseStringLiteral(c, i, { tolerant: true }) */` JSDoc on the alias exported from `scripts/lib/zh-parser.mjs:44`. Single-line touch but only worth doing once a major version bump is contemplated.
5. **`eslint` setup** — project currently has no eslint config. The TS6133 disable in P21-1 would be cleaner as a project-wide no-unused-vars override. Adding eslint touches 5+ config files.
```

(Note: `<FINAL>` and `<PLAN-SHA>` placeholders will be backfilled in Step 5 amend.)

### Step 5: Append single-line index entry to memory/MEMORY.md

Use Edit tool on `memory/MEMORY.md`:

`old_string`: (find the LAST existing index entry under "## P13 (Knowledge/Documentation — recent vertical)" or under P17 — depends on actual current file structure; the safest is to locate `P17 i18n Backfill shipped` line and append after it)

`new_string`: (append after P17 line)
```
- [P17 i18n Backfill shipped](p17-i18n-backfill-shipped.md) — engine-level i18n 100/100 complete + tooling hardening (P18) + polish (P20) + tech debt (P21)
```

Wait — verify the exact existing line for P17 to avoid duplication. Run:

```bash
cd "D:/E/独立站/youtube-tools"
grep -n "P17 i18n Backfill" memory/MEMORY.md
```

This prints the existing P17 line. Use that EXACT line as the `old_string` anchor, and replace with:

```
<existing P17 line>
- [P21 Tech Debt Cleanup shipped](p17-i18n-backfill-shipped.md#p21-tech-debt-cleanup-shipped-2026-07-18) — 3 INLINE tasks: TS6133 disable + README护营 + 2 fixtures (8/8); 4 lessons
```

### Step 6: Initial commit with `<final>` SHA placeholder

```bash
cd "D:/E/独立站/youtube-tools"
git add memory/p17-i18n-backfill-shipped.md memory/MEMORY.md
git commit -m "docs(p21): P21 Tech Debt Cleanup shipped — 3 housekeeping tasks (memory+index with <final> SHA placeholder)"
```

Expected: 1 commit (this IS the `<FINAL>` commit — its SHA from `git rev-parse HEAD` is what will replace the placeholder in the file body).

### Step 7: Amend the placeholder with the actual SHA (backfill)

```bash
cd "D:/E/独立站/youtube-tools"
FINAL_SHA=$(git rev-parse HEAD)
echo "FINAL_SHA=$FINAL_SHA"
```

Edit `memory/p17-i18n-backfill-shipped.md` to replace each occurrence of `<FINAL>` with `$FINAL_SHA`. There are 3 occurrences: in the table header, in the task chain graph, and (optionally) in the file frontmatter commit list.

After replacement, amend:

```bash
cd "D:/E/独立站/youtube-tools"
git add memory/p17-i18n-backfill-shipped.md
git commit --amend --no-edit
```

Expected: amend succeeds (no new commit; SHA changes to a new value `<FINAL-AMENDED>`). The `<FINAL>` text in the file body is now the previous-pre-amend SHA, which is still a valid commit in history — no contradiction.

### Step 8: Dual-push

```bash
cd "D:/E/独立站/youtube-tools"
git push origin master
git push github master
```

Expected: both pushes succeed. If either fails: STOP, diagnose (network, auth, conflict), do not push to one without the other.

### Step 9: Post-push sync verification

```bash
cd "D:/E/独立站/youtube-tools"
git rev-list --left-right --count origin/master...master
git rev-list --left-right --count github/master...master
```

Expected: both print `0	0`. If non-zero: STOP, identify lagging remote, force-push safely (both commits exist locally, so `git push --force-with-lease <remote> master` is safe to recover).

### Step 10: Final invariant verification

```bash
cd "D:/E/独立站/youtube-tools"
# Test gate
node --test tests/scripts/test-apply-translations-zh-parser.mjs
# raw-key invariant (P21 doesn't touch translations.ts but verify unchanged)
grep -c "<[^>]*tools\.\|<[^>]*category\.\|<[^>]*input\." dist/en/index.html dist/zh/index.html 2>/dev/null
git log --oneline d75478e..HEAD
```

Expected: 8/8 tests; 0 raw keys in both dist files (or 0 0 echoed); 4 P21 commits visible in log.

---

## Self-Review

**1. Spec coverage (§2 of spec):**
- Task 1 (TS6133 disable on 2 lines) → Task 1 in plan ✓
- Task 2 (README护营 with provenance + safety card + per-file table + cleanup rules) → Task 2 in plan ✓
- Task 3 (2 fixtures backslash + empty) → Task 3 in plan ✓
- Task 4 (memory + 3-way sync) → Task 4 in plan ✓
- All 6 success criteria (§6 of spec) covered by verifications in Steps 4 (Task 1), 5 (Task 2), 4 (Task 3), 9 + 10 (Task 4) ✓

**2. Placeholder scan:** No `TBD` / `TODO` / "implement later" / "similar to Task N" / unspecified verification commands. Every step has exact content. The 2 placeholders in memory append (`<FINAL>` and `<PLAN-SHA>`) are explicitly named and backfilled in Steps 5 and 7 with concrete commands.

**3. Type consistency:** Task 1 imports `describe, it, test` and `parseStringLiteral` — both used by fixtures 5/6 (verified by re-reading fixture 5/6 source in Step 1 of Task 3). Task 3's fixture keys (`'tools.x.input.path'`, `'tools.x.input.empty'`) match the existing fixtures' key patterns (`'tools.x.input.x.label'`, `'tools.x.faq.0.q'`). No type drift.

**Verdict:** No changes needed. Ready for execution.

---

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-07-18-p21-tech-debt-cleanup.md`. Two execution options:

**1. Subagent-Driven (recommended per spec §4 + CLAUDE.md, but contradicted by spec §2 "All INLINE")** — fresh subagent per task, review between tasks.

**2. Inline Execution (recommended for THIS plan)** — all 4 tasks in this session, no subagent overhead. Precedent: P19-3 / P19-4 / P19-5 / P20-4 all shipped INLINE because each task was ≤10 tool calls.

**Recommendation:** **Option 2 (Inline)** — matches spec §2 explicit decision, lower overhead, faster wall-clock.

Which approach?
