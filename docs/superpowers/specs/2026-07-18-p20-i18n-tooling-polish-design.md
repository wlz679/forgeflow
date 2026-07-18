# P20 i18n Tooling Polish — Design Spec

> **Status:** Approved 2026-07-18 (user-validated design)
> **Owner:** orchestrator
> **Supersedes:** P19-deferred items #1, #2, #3 from `memory/p17-i18n-backfill-shipped.md` P19 section

## Background

P19 Tech Debt Cleanup shipped 2026-07-18 (`1957948`, gitee+github `0\t0`). P19 left 3 deferred items in its memory "P20 Candidates" section:

1. `scripts/check-i18n-completeness.mjs:148` hardcoded `scripts/.scratch/i18n-needed.json` path → emits non-fatal warning every run after P19-2 archived the file to `_archive/`.
2. 5 plan files (`p8-sales-batch` / `p14-legal-compliance-batch` / `p17b-i18n-completion` / `p18-i18n-tooling-hardening` / `p19-tech-debt-cleanup`) untracked after P19-3 removed the blanket `docs/` .gitignore rule. P19-3 surfaced these as `?? Untracked` in `git status` — currently visible but not in git history.
3. `scripts/lib/zh-parser.mjs` exports 2 parsers (`parseStringLiteral` strict + `parseStringLiteralSmart` tolerant). `scripts/extract-i18n-needed.mjs:46-65` has a local copy of `parseStringLiteral` that is **byte-identical** to the lib version (only missing `export`). Real code duplication.

This spec closes all 3 items in one P20 batch.

## Goals

1. **Zero noise** — `pnpm exec node scripts/check-i18n-completeness.mjs` runs without the `i18n-needed.json not found` warning. Granular missing-keys report works again.
2. **Plan history in git** — all `docs/superpowers/plans/` files are tracked (no more silent untracked plans).
3. **One parser** — `scripts/lib/zh-parser.mjs` exports a single function with a `tolerant` flag. Local duplicate in `extract-i18n-needed.mjs` removed (import from lib).

## Non-goals

- No new i18n tooling features (P17b-era tooling is feature-complete).
- No changes to `parseStringLiteralSmart` semantics (the P18-1 lookahead `,`/`}` boundary detection is the production-tested behavior).
- No changes to `replaceZhValue` (it already calls smart parser internally).
- No new test framework or test runners (Node's built-in `node:test` is sufficient).
- No spec/plan file format changes (P19-1 already established the pattern).

## Scope (3 tasks)

### P20-1: Fix `extractPath` + synchronize extract output location

**File**: `scripts/check-i18n-completeness.mjs`

**Change**: Replace line 148 hardcoded path with a constant pointing to `_archive/`:

```js
// Before (line 148):
const extractPath = resolve(root, 'scripts/.scratch/i18n-needed.json');

// After:
const EXTRACT_PATH = resolve(root, 'scripts/.scratch/_archive/i18n-needed.json');
```

Also update the warning text on line 153 to reference the new location:

```js
console.warn('⚠️  scripts/.scratch/_archive/i18n-needed.json not found — run `node scripts/extract-i18n-needed.mjs` first');
```

**Companion change** in `scripts/extract-i18n-needed.mjs`: the script writes its output JSON. Audit current write-target and update if it also writes to the old `scripts/.scratch/i18n-needed.json` path (find via `grep -n "scratch/i18n-needed" scripts/extract-i18n-needed.mjs`). If both read+write sites need updating, do them together.

**Verification**: Run `pnpm exec node scripts/check-i18n-completeness.mjs` — warning must NOT appear. If `extract-i18n-needed.mjs` also writes the JSON, run it first to (re)generate the file in `_archive/`, then verify the warning is gone.

### P20-2: Track 5 historical plan files

**Files** (5):
- `docs/superpowers/plans/2026-07-07-p8-sales-batch.md`
- `docs/superpowers/plans/2026-07-13-p14-legal-compliance-batch.md`
- `docs/superpowers/plans/2026-07-16-p17b-i18n-completion.md`
- `docs/superpowers/plans/2026-07-18-p18-i18n-tooling-hardening.md`
- `docs/superpowers/plans/2026-07-18-p19-tech-debt-cleanup.md`

**Change**: Single `git add docs/superpowers/plans/*.md` + commit. Note: `2026-07-18-p20-i18n-tooling-polish-design.md` and the resulting plan file are NOT included in this batch — they're produced by P20 itself and will be in their own commits.

**Commit message**: `docs(plans): P20-2 — track 5 historical plan files (.gitignore docs/ block removed in P19-3)`

**Verification**: `git status --short docs/` shows no `??` files. `git log --oneline -- 'docs/superpowers/plans/2026-07-07-p8-sales-batch.md'` shows the new tracking commit.

### P20-3: Two-parser unification

**Files**:
- `scripts/lib/zh-parser.mjs` — refactor 2 functions → 1 with `tolerant` flag
- `scripts/apply-translations.mjs` — verify import + 3 caller sites
- `scripts/extract-i18n-needed.mjs` — delete local `parseStringLiteral` (lines 44-65), import from lib
- `tests/scripts/test-apply-translations-zh-parser.mjs` — add 1-2 tolerant=true fixtures

**API change**:

```js
// scripts/lib/zh-parser.mjs

// Unified parser. Strict by default (well-formed JS source).
// Set `tolerant: true` to tolerate unescaped quote chars inside the value
// (P17b corruption pattern). The closing quote is identified by being followed
// (after optional whitespace) by `,` or `}` — i.e. the boundary that ends
// the JS object literal.
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

// Backward-compat alias (preserves existing call sites that import the smart
// parser by its old name).
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export const parseStringLiteralSmart = (content, i) => parseStringLiteral(content, i, { tolerant: true });

export function replaceZhValue(src, key, newZh) { /* unchanged */ }
```

**Rationale for keeping `parseStringLiteralSmart` alias**: existing call sites (specifically `replaceZhValue` line 78 + any future external callers) can use either name. The alias costs 1 line, removes the "which parser do I use?" decision from call sites that explicitly want the P17b-corruption-tolerant behavior. `replaceZhValue` continues calling `parseStringLiteralSmart` for clarity ("we know we need tolerant here").

**Caller site changes**:
- `apply-translations.mjs:22` import: `parseStringLiteral, replaceZhValue` (already only imports strict — no change).
- `apply-translations.mjs:95/185/202` caller sites: already use strict `parseStringLiteral` (no change needed).
- `extract-i18n-needed.mjs:46-65`: delete local function, add `import { parseStringLiteral } from './lib/zh-parser.mjs'` at top.
- `extract-i18n-needed.mjs:180/185/210`: caller sites already use local `parseStringLiteral` (no change needed — local function is identical).

**Test additions** in `tests/scripts/test-apply-translations-zh-parser.mjs`:

```js
// New fixture 5: tolerant parser recovers from unescaped quote inside value
test('parseStringLiteral tolerant=true recovers unescaped quote', () => {
  const src = `zh: '对 '$10M-$50M ARR' 的金额'`;
  const r = parseStringLiteral(src, 4, { tolerant: true });
  assert.ok(r);
  assert.equal(r[0], "对 '$10M-$50M ARR' 的金额");
});

// New fixture 6: strict parser truncates at first unescaped quote (regression guard)
test('parseStringLiteral tolerant=false (default) truncates at first quote', () => {
  const src = `zh: '对 '$10M-$50M ARR' 的金额'`;
  const r = parseStringLiteral(src, 4);
  assert.ok(r);
  assert.equal(r[0], '对 ');
});
```

**Verification**: `node --test tests/scripts/test-apply-translations-zh-parser.mjs` → 6/6 pass.

## File-level summary

| File | Tasks | Action |
|---|---|---|
| `scripts/check-i18n-completeness.mjs` | P20-1 | Update `extractPath` constant + warning text |
| `scripts/extract-i18n-needed.mjs` | P20-1, P20-3 | Update write-target if applicable; delete local `parseStringLiteral`; add lib import |
| `scripts/lib/zh-parser.mjs` | P20-3 | Refactor 2 functions → 1 function + alias |
| `scripts/apply-translations.mjs` | P20-3 | No code changes (already imports strict only) |
| `tests/scripts/test-apply-translations-zh-parser.mjs` | P20-3 | Add 2 fixtures (tolerant=true + default) |
| `docs/superpowers/plans/<5 files>` | P20-2 | `git add` + commit |

## Quality gates (per P18/P19 precedent)

- `pnpm exec node scripts/check-i18n-completeness.mjs` PASS, **no warning**
- `pnpm exec astro build` 313 pages
- `grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html` → 0/0
- `node --test tests/scripts/test-apply-translations-zh-parser.mjs` → 6/6 pass (was 4/4)
- `git status --short docs/` → empty (after P20-2)
- `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master` → `0\t0` (final)

## Risk analysis

| Risk | Mitigation |
|---|---|
| `tolerant: false` default changes behavior of any existing caller | Audit: only `apply-translations.mjs` calls strict (3 sites, all read EN fields which are well-formed). `extract-i18n-needed.mjs` will be migrated to import — caller sites already use local identical function. No behavior change. |
| `parseStringLiteralSmart` alias breaks ESM imports | Alias is `export const` — ESM consumers can import by either name. Smoke test: `import { parseStringLiteralSmart } from './lib/zh-parser.mjs'` should still work. |
| `extract-i18n-needed.mjs` write-target unknown | Step 1 of P20-1 implementation includes `grep -n "scratch/i18n-needed" scripts/extract-i18n-needed.mjs` to find both read and write sites before editing. |
| Test fixtures don't match P17b corruption pattern | Fixture 5 is the exact pattern P18-1 was designed to fix (verified in `memory/p17-i18n-backfill-shipped.md` P18 lessons §1). |

## Spec self-review

1. **Placeholder scan:** No TBDs. All concrete file paths, line numbers, exact code blocks.
2. **Internal consistency:** P20-1 (extractPath) + P20-2 (plan files) + P20-3 (parser) are independent — no shared state. P20-3 caller sites all audited.
3. **Scope check:** 3 tasks, each ≤ 2 files, single batch. Fits one implementation plan.
4. **Ambiguity check:** "tolerant flag" is explicit (third arg `{ tolerant: boolean }`). "Add to _archive" specifies exact path. No ambiguity.

## Implementation plan

After spec approval, write `docs/superpowers/plans/2026-07-18-p20-i18n-tooling-polish.md` via writing-plans skill, then execute via subagent-driven-development.