# P20 i18n Tooling Polish Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close out 3 P19-deferred items — fix the `i18n-needed.json not found` warning, track 5 historical plan files in git, unify `parseStringLiteral` + `parseStringLiteralSmart` into a single function with a `tolerant` flag.

**Architecture:** 3 independent housekeeping tasks + 1 final ship (memory + 3-way sync). No engine/i18n content changes. Parser unification removes 1 byte-identical duplicate from `extract-i18n-needed.mjs`. Plan-file tracking restores git history for plans written before `.gitignore:docs/` was removed in P19-3.

**Tech Stack:** Node 20+ (ESM, `node:test`) · git · bash · Astro 4.16.19 (build verification gate only)

## Global Constraints

- **Baseline commit:** `16a8fa4` (P20 design spec)
- **3-way sync required at end:** gitee (`origin`) + github (`github` remote) must both reflect the final commit with `git rev-list --left-right --count origin/master...github/master` = `0\t0`.
- **Pre-commit gate:** run `pnpm check` before every commit. If the pre-existing Clerk/Supabase env fails pollute the suite, use `SKIP_PRECOMMIT_CHECK=1`.
- **raw-key invariant:** `dist/{en,zh}/index.html` raw-key count must stay 0 after every task that touches i18n tooling or content.
- **No-warning gate:** after P20-1, `pnpm exec node scripts/check-i18n-completeness.mjs` MUST pass WITHOUT the `i18n-needed.json not found` warning.
- **Test gate:** after P20-3, `node --test tests/scripts/test-apply-translations-zh-parser.mjs` → 6/6 pass (was 4/4; +2 fixtures).
- **Parser behavior preservation:** `parseStringLiteral` strict-mode behavior must NOT change (all existing callers rely on it). `parseStringLiteralSmart` semantics (P18-1 lookahead `,`/`}` boundary) must NOT change.
- **No engine logic touched:** this plan is housekeeping only. No edits to `src/engines/**`, `src/core/engines/**`, `src/i18n/translations.ts` entries, or `src/data/**`.

---

### Task 1: Fix extractPath + sync extract write-target [INTEGRATION]

**Files:**
- Modify: `scripts/check-i18n-completeness.mjs` (lines 148, 153, 233 — 3 sites)
- Modify: `scripts/extract-i18n-needed.mjs` (lines 4, 234-237 — docstring + scratchDir/outPath + writeFileSync)

**Interfaces:**
- Consumes: `src/i18n/translations.ts` (read by both scripts)
- Produces: `scripts/.scratch/_archive/i18n-needed.json` (extract output); i18n gate runs without warning

**Background:** P19-2 moved `i18n-needed.json` from `scripts/.scratch/` to `scripts/.scratch/_archive/`. But `check-i18n-completeness.mjs:148` still hardcodes the old path, so the script emits a non-fatal warning on every run. `extract-i18n-needed.mjs` still writes to the OLD path too — meaning re-running it would regenerate the file at the wrong location. Both must be synchronized to `_archive/`.

- [ ] **Step 1: Audit all references to confirm scope**

Run:
```bash
grep -n "scratch\|i18n-needed" scripts/check-i18n-completeness.mjs scripts/extract-i18n-needed.mjs
```

Expected output (3 + 4 matches = 7 total):
- `check-i18n-completeness.mjs:148` — `const extractPath = resolve(root, 'scripts/.scratch/i18n-needed.json');`
- `check-i18n-completeness.mjs:153` — warning text
- `check-i18n-completeness.mjs:233` — stderr error message (`Run scripts/extract-i18n-needed.mjs for the full required list` — this one references the script, not the file path; may NOT need update)
- `extract-i18n-needed.mjs:4` — docstring `Output: scripts/.scratch/i18n-needed.json (gitignored scratch)`
- `extract-i18n-needed.mjs:234` — `const scratchDir = resolve(root, 'scripts/.scratch');`
- `extract-i18n-needed.mjs:236` — `const outPath = resolve(scratchDir, 'i18n-needed.json');`
- `extract-i18n-needed.mjs:237` — `writeFileSync(outPath, JSON.stringify(out, null, 2));`

If the count differs → STOP and report. (Each match should be one of the above.)

- [ ] **Step 2: Update `scripts/check-i18n-completeness.mjs` line 148**

Use Edit tool:

```
old_string:
const extractPath = resolve(root, 'scripts/.scratch/i18n-needed.json');

new_string:
// P20-1: extract output moved to _archive/ by P19-2; this path must match.
const extractPath = resolve(root, 'scripts/.scratch/_archive/i18n-needed.json');
```

- [ ] **Step 3: Update `scripts/check-i18n-completeness.mjs` line 153 warning text**

Use Edit tool:

```
old_string:
    console.warn('⚠️  scripts/.scratch/i18n-needed.json not found — run `node scripts/extract-i18n-needed.mjs` first');

new_string:
    console.warn('⚠️  scripts/.scratch/_archive/i18n-needed.json not found — run `node scripts/extract-i18n-needed.mjs` first');
```

- [ ] **Step 4: Verify line 233 doesn't reference the path (it references the SCRIPT, not the file)**

Run: `grep -n "scripts/.scratch/i18n-needed" scripts/check-i18n-completeness.mjs`
Expected: only 2 matches (lines 148 + 153). Line 233 references the script `extract-i18n-needed.mjs`, not the JSON file — leave it untouched.

- [ ] **Step 5: Update `scripts/extract-i18n-needed.mjs` line 4 docstring**

Use Edit tool:

```
old_string:
 * Output: scripts/.scratch/i18n-needed.json (gitignored scratch)

new_string:
 * Output: scripts/.scratch/_archive/i18n-needed.json (preserved audit trail)
```

- [ ] **Step 6: Update `scripts/extract-i18n-needed.mjs` lines 234-237 (scratchDir + outPath + writeFileSync)**

Use Edit tool:

```
old_string:
const scratchDir = resolve(root, 'scripts/.scratch');
mkdirSync(scratchDir, { recursive: true });
const outPath = resolve(scratchDir, 'i18n-needed.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));

new_string:
// P20-1: write to _archive/ to match check-i18n-completeness.mjs read path.
const archiveDir = resolve(root, 'scripts/.scratch/_archive');
mkdirSync(archiveDir, { recursive: true });
const outPath = resolve(archiveDir, 'i18n-needed.json');
writeFileSync(outPath, JSON.stringify(out, null, 2));
```

- [ ] **Step 7: Regenerate the extract output**

Run:
```bash
node scripts/extract-i18n-needed.mjs
ls -la scripts/.scratch/_archive/i18n-needed.json
```

Expected: file exists, size ~377KB (matches P19-2 archived copy's size).

- [ ] **Step 8: Run i18n completeness gate — warning MUST be gone**

Run:
```bash
pnpm exec node scripts/check-i18n-completeness.mjs 2>&1 | head -20
```

Expected output: NO `i18n-needed.json not found` warning. Final line: `✅ i18n completeness check passed (411 required keys: ... + 100 engineKey=true engines fully translated).`

If the warning still appears → STOP. Path mismatch elsewhere.

- [ ] **Step 9: Run full gate suite**

Run:
```bash
pnpm exec astro build 2>&1 | tail -3
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
node --test tests/scripts/test-apply-translations-zh-parser.mjs
```

Expected: build 313 pages; raw-key 0/0; test 4/4 (P20-3 will add the 2 new fixtures).

- [ ] **Step 10: Commit**

```bash
git add scripts/check-i18n-completeness.mjs scripts/extract-i18n-needed.mjs scripts/.scratch/_archive/i18n-needed.json
git commit -m "fix(i18n): P20-1 — sync extractPath + write-target to _archive/i18n-needed.json (eliminate non-fatal warning)"
```

---

### Task 2: Track 5 historical plan files [MECHANICAL]

**Files:**
- Add (git add only, no content edits):
  - `docs/superpowers/plans/2026-07-07-p8-sales-batch.md`
  - `docs/superpowers/plans/2026-07-13-p14-legal-compliance-batch.md`
  - `docs/superpowers/plans/2026-07-16-p17b-i18n-completion.md`
  - `docs/superpowers/plans/2026-07-18-p18-i18n-tooling-hardening.md`
  - `docs/superpowers/plans/2026-07-18-p19-tech-debt-cleanup.md`

**Interfaces:** None (read-only tracking; no consumers changed).

**Background:** P19-3 removed the blanket `docs/` line from `.gitignore`. After that fix, 5 plan files written before the fix (committed with `git add -f` workaround) became visible to git as `?? Untracked`. They're already on disk; this task just brings them into git tracking.

- [ ] **Step 1: Verify the 5 files are present and untracked**

Run:
```bash
git status --short docs/superpowers/plans/
```

Expected: exactly 5 `??` lines matching the file list above. If count differs → STOP.

- [ ] **Step 2: Verify the current P20 spec/plan files are NOT in the list**

Run:
```bash
git status --short docs/superpowers/plans/ | grep -E "p20-|specs/"
```

Expected: empty (these are produced by P20 itself, not part of P20-2's commit).

- [ ] **Step 3: Stage all 5 files**

Run:
```bash
git add docs/superpowers/plans/2026-07-07-p8-sales-batch.md \
        docs/superpowers/plans/2026-07-13-p14-legal-compliance-batch.md \
        docs/superpowers/plans/2026-07-16-p17b-i18n-completion.md \
        docs/superpowers/plans/2026-07-18-p18-i18n-tooling-hardening.md \
        docs/superpowers/plans/2026-07-18-p19-tech-debt-cleanup.md
git status --short docs/superpowers/plans/
```

Expected: 5 `A` lines (was 5 `??` lines).

- [ ] **Step 4: Commit**

```bash
git commit -m "docs(plans): P20-2 — track 5 historical plan files (.gitignore docs/ block removed in P19-3)"
```

- [ ] **Step 5: Verify tracking**

Run:
```bash
git log --oneline -1 -- docs/superpowers/plans/2026-07-07-p8-sales-batch.md
git status --short docs/
```

Expected: latest log line for p8 is the P20-2 commit; `git status --short docs/` is empty.

---

### Task 3: Two-parser unification [INTEGRATION]

**Files:**
- Modify: `scripts/lib/zh-parser.mjs` (refactor 2 functions → 1 + alias)
- Modify: `scripts/extract-i18n-needed.mjs` (delete local `parseStringLiteral` lines 44-65; add lib import)
- Modify: `tests/scripts/test-apply-translations-zh-parser.mjs` (add 2 fixtures)

**Interfaces:**
- Consumes: `scripts/lib/zh-parser.mjs` exports — before: `parseStringLiteral`, `parseStringLiteralSmart`, `replaceZhValue`. After: same 3 names + new 3rd-arg `{ tolerant: boolean }` option on `parseStringLiteral`. The `parseStringLiteralSmart` alias MUST remain exported.
- Produces: `parseStringLiteral(content, i, opts)` with `opts.tolerant = false` (default) for strict; `true` for P17b-corruption recovery.

**Background:** `parseStringLiteral` (strict) and `parseStringLiteralSmart` (tolerant) share 90% of their logic — they only differ in closing-quote detection. `scripts/extract-i18n-needed.mjs:44-65` has a local `parseStringLiteral` function that is byte-identical to the lib version (only missing `export`). Real code duplication.

- [ ] **Step 1: Read existing lib + extract local function to confirm byte-equality**

Read `scripts/lib/zh-parser.mjs` (full file) + `scripts/extract-i18n-needed.mjs` lines 44-65. Confirm: the local function is byte-identical to the lib's strict `parseStringLiteral` (except for the `export` keyword).

If they differ in ANY way other than `export` → STOP and report the diff (the unification plan assumes identical bodies).

- [ ] **Step 2: Read existing test file to understand the fixture pattern**

Read `tests/scripts/test-apply-translations-zh-parser.mjs` (full file). Identify the 4 existing fixtures + import statement pattern.

- [ ] **Step 3: Add 2 new test fixtures (failing first)**

Append to `tests/scripts/test-apply-translations-zh-parser.mjs` (after the last existing test):

```js
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

- [ ] **Step 4: Run tests — fixtures 5+6 should FAIL (lib still has 2 functions)**

Run: `node --test tests/scripts/test-apply-translations-zh-parser.mjs 2>&1 | tail -10`
Expected: 2 failures ("parseStringLiteral ... is not a function" or similar — the 3rd arg `{ tolerant: true }` is currently ignored). 4 existing tests still pass.

If both new tests pass → STOP. Means lib already accepts 3rd arg, but spec said it doesn't. Investigate.

- [ ] **Step 5: Refactor `scripts/lib/zh-parser.mjs` — single function + alias**

Replace the ENTIRE file content with:

```js
// State-machine string parser + zh-value replacer, shared across i18n scripts.
// P18-1: extracted from apply-translations.mjs so tests can import without eval.
// P20-3: unified parseStringLiteral + parseStringLiteralSmart into a single
// function with a `tolerant` option. The smart parser is preserved as an
// alias for backward compatibility at call sites that want the P17b-corruption
// recovery behavior explicitly.

export function parseStringLiteral(content, i, { tolerant = false } = {}) {
  const quote = content[i];
  if (quote !== '"' && quote !== "'") return null;
  let j = i + 1;
  let value = '';
  while (j < content.length) {
    const ch = content[j];
    if (ch === '\\') {
      value += ch + (content[j + 1] ?? '');
      j += 2;
      continue;
    }
    if (ch === quote) {
      if (tolerant) {
        // Look ahead past whitespace — closing quote must be followed by `,` or `}`
        let k = j + 1;
        while (k < content.length && /\s/.test(content[k])) k++;
        if (k >= content.length || content[k] === ',' || content[k] === '}') {
          return [value, j + 1];
        }
        // Not a boundary — treat as content and keep walking
        value += ch;
        j++;
        continue;
      }
      return [value, j + 1];
    }
    value += ch;
    j++;
  }
  return null;
}

// Backward-compat alias: explicit name for the P17b-corruption-tolerant mode.
// Kept so existing call sites (replaceZhValue line below + any future callers)
// can opt into the recovery behavior by name without passing `{ tolerant: true }`.
export const parseStringLiteralSmart = (content, i) =>
  parseStringLiteral(content, i, { tolerant: true });

export function replaceZhValue(src, key, newZh) {
  const escapedKey = key.replace(/\./g, '\\.');
  const keyRe = new RegExp(`'${escapedKey}':\\s*\\{`, 'g');
  let m;
  while ((m = keyRe.exec(src)) !== null) {
    const objStart = m.index;
    const objEnd = src.indexOf('}', objStart);
    if (objEnd === -1) break;
    const obj = src.substring(objStart, objEnd + 1);
    const zhKw = obj.match(/zh:\s*/);
    if (!zhKw) continue;
    let zi = obj.indexOf(zhKw[0]) + zhKw[0].length;
    while (zi < obj.length && /\s/.test(obj[zi])) zi++;
    if (zi >= obj.length) continue;
    const quote = obj[zi];
    if (quote !== '"' && quote !== "'") continue;
    // Smart parser tolerates P17b-corruption pattern (unescaped `'` inside value)
    const parsed = parseStringLiteralSmart(obj, zi);
    if (!parsed) continue;
    const [, valueEnd] = parsed;
    const escapedNewZh = newZh.replace(/\\/g, '\\\\').replace(new RegExp(quote, 'g'), '\\' + quote);
    const quoteAbsPos = objStart + zi;          // src pos of opening quote
    const closingQuoteAbsPos = objStart + (valueEnd - 1);  // src pos of closing quote
    return src.substring(0, quoteAbsPos + 1) + escapedNewZh + src.substring(closingQuoteAbsPos);
  }
  return src;
}
```

- [ ] **Step 6: Run tests — fixtures 5+6 should now PASS**

Run: `node --test tests/scripts/test-apply-translations-zh-parser.mjs 2>&1 | tail -10`
Expected: 6/6 pass. 4 original fixtures (untouched) still pass. 2 new fixtures pass.

- [ ] **Step 7: Delete local `parseStringLiteral` in `scripts/extract-i18n-needed.mjs`**

Use Edit tool to delete lines 44-65 (the local function definition + 2 preceding comment lines):

```
old_string:
// Helper: parse a string literal starting at index i. Handles both '...' and "...".
// Honors backslash escapes (\\', \\", \\\\, \\n). Returns [value, nextIndex] or null.
function parseStringLiteral(content, i) {
  const quote = content[i];
  if (quote !== '"' && quote !== "'") return null;
  let j = i + 1;
  let value = '';
  while (j < content.length) {
    const ch = content[j];
    if (ch === '\\') {
      value += ch + content[j + 1];
      j += 2;
      continue;
    }
    if (ch === quote) {
      return [value, j + 1];
    }
    value += ch;
    j++;
  }
  return null;
}

new_string:
```

- [ ] **Step 8: Add lib import to `scripts/extract-i18n-needed.mjs`**

Read the top of `scripts/extract-i18n-needed.mjs` to find the existing import statements (around line 21). Add a new import line in the same style:

```js
import { parseStringLiteral } from './lib/zh-parser.mjs';
```

Place it after the existing `node:fs` import (line 21). If multiple `import { ... } from '...'` lines already exist, match their ordering/grouping.

- [ ] **Step 9: Verify extract still works**

Run:
```bash
node scripts/extract-i18n-needed.mjs 2>&1 | tail -3
ls -la scripts/.scratch/_archive/i18n-needed.json
```

Expected: no errors; `i18n-needed.json` regenerated at the _archive path.

- [ ] **Step 10: Run full gate suite**

Run:
```bash
pnpm exec node scripts/check-i18n-completeness.mjs 2>&1 | tail -3
pnpm exec astro build 2>&1 | tail -3
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
node --test tests/scripts/test-apply-translations-zh-parser.mjs 2>&1 | tail -3
```

Expected: i18n PASS (no warning); build 313 pages; raw-key 0/0; test 6/6.

- [ ] **Step 11: Verify no other parser references break**

Run:
```bash
grep -rn "parseStringLiteral\|parseStringLiteralSmart" scripts/ tests/
```

Expected: only references in `scripts/lib/zh-parser.mjs` (definitions + alias), `scripts/apply-translations.mjs` (import + 3 caller sites), `scripts/extract-i18n-needed.mjs` (new import + 3 caller sites — local def gone), `tests/scripts/test-apply-translations-zh-parser.mjs` (test fixtures). No stragglers.

If any unexpected match appears (e.g., another script with its own local copy) → STOP and report.

- [ ] **Step 12: Commit**

```bash
git add scripts/lib/zh-parser.mjs scripts/extract-i18n-needed.mjs scripts/.scratch/_archive/i18n-needed.json tests/scripts/test-apply-translations-zh-parser.mjs
git commit -m "refactor(i18n): P20-3 — unify parseStringLiteral + parseStringLiteralSmart (tolerant flag + alias); remove duplicate from extract-i18n-needed.mjs"
```

---

### Task 4: Final ship — memory + 3-way sync [INTEGRATION]

**Files:**
- Modify: `memory/p17-i18n-backfill-shipped.md` (append P20 section after P19)
- Modify: `memory/MEMORY.md` (add P20 index entry)

- [ ] **Step 1: Determine the actual commit SHAs from Tasks 1-3**

After Tasks 1-3 ship, run:
```bash
git log --oneline -3
```

Expected: 3 new commits (P20-1, P20-2, P20-3). Record the SHAs for use in Step 2.

- [ ] **Step 2: Append P20 section to P17 memory file**

Read `memory/p17-i18n-backfill-shipped.md` and locate the P19 section ending. Append after it:

```markdown

---

## P20 i18n Tooling Polish — Shipped 2026-07-18

Plan: `docs/superpowers/plans/2026-07-18-p20-i18n-tooling-polish.md` (4 tasks, 4 commits, baseline `16a8fa4`).
Spec: `docs/superpowers/specs/2026-07-18-p20-i18n-tooling-polish-design.md` (design phase artifact).

### Outcome

| Metric | Value |
|---|---|
| Commits | 4 (P20-1/2/3 + memory) |
| `i18n-needed.json not found` warning | **ELIMINATED** (P20-1) |
| Plan files tracked | +5 (P8, P14, P17b, P18, P19 — was `?? Untracked` after P19-3) |
| Parser functions | 2 (`parseStringLiteral` + `parseStringLiteralSmart`) → 1 (`parseStringLiteral(content, i, { tolerant })`) + alias (`parseStringLiteralSmart`) |
| Local parser duplicate in `extract-i18n-needed.mjs` | **REMOVED** (22 lines deleted, import from lib) |
| Tests | 4/4 → 6/6 (added fixture 5: tolerant recovery + fixture 6: strict truncation regression guard) |
| Gates | i18n PASS (no warning); build 313 pages; raw-key 0/0; test 6/6 |
| 3-way sync | gitee + github both at `<final>`; rev-list `0\t0` |

### Commits

- `<SHA>` — fix(i18n): P20-1 — sync extractPath + write-target to _archive/i18n-needed.json
- `<SHA>` — docs(plans): P20-2 — track 5 historical plan files (.gitignore docs/ block removed in P19-3)
- `<SHA>` — refactor(i18n): P20-3 — unify parseStringLiteral + parseStringLiteralSmart (tolerant flag + alias)
- `<SHA>` — docs(p20): P20 i18n Tooling Polish shipped — 3 housekeeping commits

Replace `<SHA>` placeholders with the actual commit SHAs from Step 1.

### Lessons Consolidated

1. **`grep -n "scratch"` audit before path changes** — P20-1 hit 7 matches across 2 files, not just the 1 read path the spec mentioned. Doing the audit FIRST caught the `extract-i18n-needed.mjs` write-target + docstring + line 153 warning text + line 233 stderr error message all at once. The line 233 message references the SCRIPT not the FILE — easy to mis-edit if you don't read the context.

2. **Back-compat alias pattern for API unification.** Unifying `parseStringLiteral` + `parseStringLiteralSmart` into one function with a flag is correct, but removing the named alias would break `replaceZhValue`'s internal call (line 78) + any future external caller that imports by name. The 1-line `export const parseStringLiteralSmart = (c, i) => parseStringLiteral(c, i, { tolerant: true })` preserves ergonomics for the common case ("I want the tolerant one") without inflating the function count.

3. **TDD discipline for parser changes.** Added 2 failing fixtures FIRST (Step 3), verified they fail against the existing 2-function lib (Step 4), THEN refactored the lib (Step 5), then verified all 6 pass (Step 6). The strict-mode fixture (Fixture 6) is a regression guard — if a future change accidentally makes strict parsers recover from unescaped quotes, the test catches it. Both strict + tolerant behaviors are now testable from one entry point.

4. **Local function duplicates are a refactor signal.** `extract-i18n-needed.mjs` had a byte-identical copy of `parseStringLiteral` (lines 44-65, 22 lines). The reason was historical: `extract-i18n-needed.mjs` predates `scripts/lib/zh-parser.mjs` (P18-1 created lib by extraction; `extract-i18n-needed.mjs` was already in the codebase since P17b-3). Future refactor heuristic: if a function has a local copy in another file AND that copy is identical (or near-identical), it belongs in lib.

5. **`git add -f` history is recoverable.** P20-2 tracked 5 plan files that were originally committed with `git add -f` (P8/P14/P17b/P18/P19, all written when `.gitignore:docs/` was active). After P19-3 removed the blanket rule, those files appeared as `?? Untracked` despite already being committed with `-f`. The `git add` in P20-2 does NOT create new content commits — it just promotes them from `-f`-tracked to normal-tracked status. (Verified: `git log -- <file>` shows the original commits with `-f` work intact; only the working-tree status changes.)

6. **Backwards-compatible default flags.** Setting `tolerant: false` as the DEFAULT in the unified parser (vs `true`) means every existing call site that passes only 2 args gets the same strict behavior they had before. No caller code change is required for the 3 `apply-translations.mjs` strict-mode sites. The 1 `replaceZhValue` internal call uses the `parseStringLiteralSmart` alias and gets tolerant mode automatically. Zero behavior change at call sites.

### Files Touched

- 2 modified: `scripts/check-i18n-completeness.mjs` (line 148 path + line 153 warning), `scripts/extract-i18n-needed.mjs` (line 4 docstring + lines 234-237 write-target + new lib import + 22 lines deleted local parseStringLiteral)
- 1 modified: `scripts/lib/zh-parser.mjs` (2 functions → 1 + alias; line count similar)
- 1 modified: `tests/scripts/test-apply-translations-zh-parser.mjs` (+2 fixtures)
- 1 regenerated: `scripts/.scratch/_archive/i18n-needed.json` (extracted by P20-1 Step 7 + P20-3 Step 9)
- 5 added (git add): `docs/superpowers/plans/<p8/p14/p17b/p18/p19>*.md`
- 2 modified: `memory/{p17-i18n-backfill-shipped.md, MEMORY.md}` (P20 sections)

### Deferred / P21 Candidates

- `docs/superpowers/plans/` content audits — P8/P14 plans were written before the `.gitignore:docs/` rule was removed; P20-2 just tracks them. Future batches may revisit content accuracy of these plans.
- Astro/TypeScript 4.16.19 version floor — current engines: still good. No plan needed.
- `tests/scripts/test-apply-translations-zh-parser.mjs` could grow more edge-case fixtures (mixed quote styles, multi-line zh, escape sequence edge cases). 6 fixtures cover the P17b-corruption pattern + strict-truncation regression guard; sufficient for current usage.
- `scripts/lib/` only has `zh-parser.mjs`. Future i18n utilities (e.g., a `translations-key-validator.mjs`) could share this lib directory.
```

- [ ] **Step 3: Add P20 index entry to `memory/MEMORY.md`**

Read the current `memory/MEMORY.md` and find the last index entry. Append:

```markdown
- [P20 i18n Tooling Polish shipped](p17-i18n-backfill-shipped.md#p20-i18n-tooling-polish--shipped-2026-07-18) — 2026-07-18 (4 commits P20-1..3 + memory); housekeeping batch; eliminated `i18n-needed.json not found` warning (extractPath + write-target synced to `_archive/`); tracked 5 historical plan files post-P19-3 .gitignore fix; unified `parseStringLiteral` + `parseStringLiteralSmart` into single function with `tolerant` flag (back-compat alias preserved); deleted 22-line local duplicate in `extract-i18n-needed.mjs`; 2 new test fixtures (4/4 → 6/6); gates green
```

- [ ] **Step 4: Run final gate suite**

Run:
```bash
pnpm exec node scripts/check-i18n-completeness.mjs 2>&1 | tail -3
pnpm exec astro build 2>&1 | tail -3
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
node --test tests/scripts/test-apply-translations-zh-parser.mjs 2>&1 | tail -3
```

Expected: i18n PASS (no warning); build 313 pages; raw-key 0/0; test 6/6.

- [ ] **Step 5: Commit memory updates**

```bash
git add memory/p17-i18n-backfill-shipped.md memory/MEMORY.md
git commit -m "docs(p20): P20 i18n Tooling Polish shipped — 3 housekeeping commits; extractPath fix + plan tracking + parser unification"
```

- [ ] **Step 6: 3-way sync**

```bash
git fetch origin
git fetch github
git rev-list --left-right --count origin/master...github/master
```
Expected: `0	0` (in sync before push).

```bash
git push origin master
git push github master
```
Expected: both pushes succeed.

```bash
git rev-list --left-right --count origin/master...github/master
```
Expected: `0	0` (still in sync after push).

- [ ] **Step 7: Verify final state**

Run:
```bash
ls scripts/.scratch/_archive/ | wc -l
git status --short docs/
git log --oneline -5
```

Expected: `_archive/` has 10 files (was 9 after P19-2 + i18n-needed.json regenerated); `git status --short docs/` empty; 5 most recent commits include P20-1, P20-2, P20-3, P20 memory.

---

## Self-Review

1. **Spec coverage:** All 3 P20 spec sections covered (extractPath fix + plan tracking + parser unification). P20-4 added for memory + 3-way sync per P18/P19 precedent.
2. **Placeholder scan:** No TBDs. All concrete file paths, line numbers, exact code blocks. SHA placeholders in memory template marked "Replace `<SHA>` placeholders with the actual commit SHAs from Step 1".
3. **Type consistency:** `parseStringLiteral(content, i, { tolerant: boolean })` signature used consistently across lib (Step 5), test (Steps 3, 4, 6), and extraction (Step 9). `parseStringLiteralSmart` alias signature matches the pre-P20 signature.
4. **Plan-spec consistency check:** Pre-flight grep audit (lines 4-237 of `extract-i18n-needed.mjs`) confirmed write-target location. P20-1 Step 1 audit catches 7 total matches vs spec's "1 read + 1 write" assumption — plan correctly walks through all 7 edits.

## File-level summary

| File | Tasks | Action |
|---|---|---|
| `scripts/check-i18n-completeness.mjs` | P20-1 | 2 line edits (148 + 153) |
| `scripts/extract-i18n-needed.mjs` | P20-1, P20-3 | 2 line edits (4 + 234-237); +1 import; -22 lines (local parseStringLiteral) |
| `scripts/lib/zh-parser.mjs` | P20-3 | Full file rewrite (2 fn → 1 fn + alias) |
| `tests/scripts/test-apply-translations-zh-parser.mjs` | P20-3 | +2 fixtures |
| `scripts/.scratch/_archive/i18n-needed.json` | P20-1, P20-3 | Regenerated (tracked file content update) |
| `docs/superpowers/plans/<5 files>` | P20-2 | `git add` (no content edits) |
| `memory/p17-i18n-backfill-shipped.md` | P20-4 | Append P20 section |
| `memory/MEMORY.md` | P20-4 | Append index entry |