# P60 — Engine subdir fix (Cost E-category, saas-pricing-planner) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move `src/engines/valuation/saas-pricing-planner.ts` to `src/engines/cost/saas-pricing-planner.ts` and sync all 6 consumers, closing one pure-organization drift (E-category audit 2026-07-23).

**Architecture:** Single atomic commit; `git mv` preserves `--follow` history to v3 rewrite origin; P59 6-step consumer grep audit (rename + barrels + tests + index + scripts/* + comments) applied to 1 file. Zero functional change — engines register by slug, subdir is pure browse organization.

**Tech Stack:** Astro 4.16.19 (static SPA) + TypeScript 5.6 (strict) + pnpm check gate + 3-way push (origin + github).

## Global Constraints

- **Engine count invariant:** `EXPECTED_ENGINE_COUNT = 100` — must remain unchanged after fix (P22b)
- **P49 layer is intact by design:** `scripts/check-engine-count-by-category.mjs` reads ToolMeta by `categoryId` from `src/data/tools/index.ts` barrel. Subdir move is structurally invisible to P49.
- **No functional changes:** zero edits to `calculate()` / `customFn` / `staticExamples` / `faq` / `howToUse` / `inputs` of the moved engine.
- **History preservation:** use `git mv`, not delete+create, so `git log --follow <new-path>` returns the original v3 rewrite origin commit.
- **6-step consumer audit (P59 lesson):** even for 1-file moves, must grep all consumers before/during/after: barrel index.ts (sub-batch files), `tests/*.test.ts` imports, `src/engines/INDEX.md`, `scripts/*.mjs` / `scripts/*.ts` that hardcode engine paths, doc comments inside moved files.
- **Pre-commit hook:** use `SKIP_PRECOMMIT_CHECK=1` per P48 standing rule (P53b-era pre-commit hook rerun races).
- **Pre-push fetch + rev-list:** both remotes must be at `0\t0` before push, both remotes must be at `0\t0` after push.
- **If GH Action `sync-pricing.yml` cron fires during push window** (P48 standing rule 1): use `git merge --no-ff github/master` to merge the cron commit, then re-push both remotes; no force-push.
- **If pre-push hook reports `ahead=0` false-negative** (P44 standing rule): bypass via `git -c core.hooksPath=/dev/null push <remote> <branch>`.
- **Definition of Done:** all checkboxes below ticked + pnpm check exit 0 + pnpm build exit 0 + 3-way sync `0\t0`.

---

## File Structure

| File | Action | Reason |
|---|---|---|
| `src/engines/valuation/saas-pricing-planner.ts` | delete (via `git mv`) | file physically moves to cost/ |
| `src/engines/cost/saas-pricing-planner.ts` | create (via `git mv`) | new home matches `categoryId: 'E'` in data barrel |
| `src/engines/valuation/index.ts` | modify (-1 import) | remove now-stale entry |
| `src/engines/cost/index.ts` | modify (+1 import) | add the entry |
| `tests/saas-pricing-planner.test.ts` | modify (L3 import path) | test follows the file |
| `src/engines/INDEX.md` | modify (4 spots) | sync top diagram + §cost/ list + §valuation/ list + summary table |
| `scripts/codegen-examples.mjs` | modify (L85 subdir) | P59 lesson step 6: scripts-with-hardcoded-paths |

Total: 1 file move (via `git mv` = 2 entries in git), 5 file modifications.

---

## Task 1: git mv + sub-barrel imports + test path

**Files:**
- Move: `src/engines/valuation/saas-pricing-planner.ts` → `src/engines/cost/saas-pricing-planner.ts` (via `git mv`)
- Modify: `src/engines/valuation/index.ts` (remove 1 import)
- Modify: `src/engines/cost/index.ts` (add 1 import)
- Modify: `tests/saas-pricing-planner.test.ts` (update L3 import path)

**Interfaces:**
- Consumes: nothing from prior tasks (first task)
- Produces:
  - `src/engines/cost/index.ts` barrel exports `solopreneur-saas-pricing-planner` (slug unchanged)
  - `src/engines/valuation/index.ts` barrel no longer references `saas-pricing-planner`
  - Test file `tests/saas-pricing-planner.test.ts` resolves the engine file from the new path

- [ ] **Step 1: Pre-flight grep audit (P59 step 6 — scripts-with-hardcoded-paths)**

Run:
```bash
cd "D:/E/独立站/youtube-tools"
grep -rln "src/engines/valuation/saas-pricing-planner\|solopreneur-saas-pricing-planner" \
  --include="*.ts" --include="*.mjs" --include="*.astro" --include="*.json" --include="*.md" . \
  2>/dev/null
```

Expected: ~6 hits across the 6 known consumers (file move + 2 barrel index.ts + test + INDEX.md + codegen-examples.mjs). Any unexpected consumer → flag and add to T3/T4/T5.

- [ ] **Step 2: `git mv` the engine file**

Run:
```bash
cd "D:/E/独立站/youtube-tools"
git mv src/engines/valuation/saas-pricing-planner.ts src/engines/cost/saas-pricing-planner.ts
git status --short | grep -E "^R.*saas-pricing-planner"
```

Expected: one `R` line showing rename at 100% similarity.

- [ ] **Step 3: Remove import from `src/engines/valuation/index.ts`**

The file currently has 10 import lines. Find and remove the line importing `saas-pricing-planner`:

```bash
grep -n "saas-pricing-planner" src/engines/valuation/index.ts
```

Then `Edit` to remove that line (single import line, no trailing comma concerns). Verify with:

```bash
grep -c "^import" src/engines/valuation/index.ts
```

Expected: 10 (was 11). Use Edit tool, not Write, to avoid disturbing other lines.

- [ ] **Step 4: Add import to `src/engines/cost/index.ts`**

The file currently has 4 import lines. Insert a new line in slug-sorted order:

```bash
grep -n "affiliate-income-calculator\|employee-cost-calculator\|freelance-rate-calculator\|hourly-vs-fixed-calculator" src/engines/cost/index.ts
```

Determine correct insertion point (slug-sorted: saas-pricing-planner goes between `hourly-vs-fixed-calculator` and nothing else, or at end — pick the position that keeps the file's existing sort order). Use `Edit` to insert the new import line.

Verify:
```bash
grep -c "^import" src/engines/cost/index.ts
```

Expected: 5 (was 4).

- [ ] **Step 5: Update `tests/saas-pricing-planner.test.ts` L3**

Current L3:
```ts
import '../src/engines/valuation/saas-pricing-planner.ts';
```

Change to:
```ts
import '../src/engines/cost/saas-pricing-planner.ts';
```

Use `Edit` tool with `replace_all: false`. No other lines in the test file reference the path.

- [ ] **Step 6: Verify by listing and reading the moved file's head**

```bash
cd "D:/E/独立站/youtube-tools"
ls -la src/engines/cost/saas-pricing-planner.ts
ls src/engines/valuation/saas-pricing-planner.ts 2>&1  # should error: No such file
head -5 src/engines/cost/saas-pricing-planner.ts
```

Expected: file exists at new path, doesn't exist at old path, head shows `import type { ToolEngine }` (engine file structure unchanged).

- [ ] **Step 7: Self-review + commit hold**

Do NOT commit yet. T2-T5 need to land first to keep this atomic. Self-review the changes:

```bash
git status --short
git diff --stat
```

Expected in `git status`:
- 1 `R` line (the move)
- 2 `M` lines (valuation/index.ts, cost/index.ts)
- 1 `M` line (tests/saas-pricing-planner.test.ts)

T1 deliverable: working tree shows 4 changed paths (R + 3 M). No commit yet.

---

## Task 2: Sync INDEX.md docs (5 spots across 2 files)

**Files:**
- Modify: `src/engines/INDEX.md` (4 spots: top diagram + §cost/ list + §valuation/ list + summary table)
- Modify: `src/data/INDEX.md` (1 spot: L143 narrative)

**Interfaces:**
- Consumes: T1 moved engine at new path
- Produces: INDEX.md count summary sums to 100, lists consistent with filesystem, narrative doc reflects new home

- [ ] **Step 1: Locate the 5 spots to update**

Read both INDEX.md files and identify the spots:

```bash
cd "D:/E/独立站/youtube-tools"
grep -nE "valuation|cost|saas-pricing-planner" src/engines/INDEX.md | head -30
grep -nE "valuation|cost|saas-pricing-planner" src/data/INDEX.md | head -10
```

The 5 spots are:
1. **`src/engines/INDEX.md` top-level subdir diagram** (around L31): change `└── cost/ (4)` → `└── cost/ (5)`. (`valuation/` count stays 10.)
2. **`src/engines/INDEX.md` §cost/ section** (around L76): change `(4 engines)` → `(5 engines)` and add a new row for saas-pricing-planner.
3. **`src/engines/INDEX.md` §valuation/ section** (around L264): remove the saas-pricing-planner row.
4. **`src/engines/INDEX.md` count summary table** (around L302): `cost/` row `2 | cost/ | 4` → `2 | cost/ | 5`.
5. **`src/data/INDEX.md` L143 narrative** (added by T1 implementer flag): "tools/cost.ts 含 solopreneur-saas-pricing-planner — engines/ 中归 valuation/" → "...engines/ 中归 cost/".

- [ ] **Step 2: Update spot 1 — top-level subdir diagram (src/engines/INDEX.md)**

Use `Edit` (NOT Write — keep other lines untouched) to change `cost/` count from 4 to 5.

- [ ] **Step 3: Update spot 2 — §cost/ section (src/engines/INDEX.md)**

Use `Edit` to:
- Change section header `(4 engines)` → `(5 engines)`
- Add a new table row after the existing 4 rows:
  ```
  | `saas-pricing-planner` | SaaS Pricing Planner |
  ```

Slug-sorted placement: match the convention used in D-category equivalent (§freelance/) section.

- [ ] **Step 4: Update spot 3 — §valuation/ section (src/engines/INDEX.md)**

Use `Edit` to remove the saas-pricing-planner row from the table. Do NOT change the section header `(10 engines)` — count is still 10 after removing the misplaced engine (was 11 with it, now 10 without).

- [ ] **Step 5: Update spot 4 — count summary table (src/engines/INDEX.md)**

Use `Edit` to change `cost/` row count `4` → `5`. Confirm sum still equals 100.

- [ ] **Step 6: Update spot 5 — narrative line L143 (src/data/INDEX.md)**

Read `src/data/INDEX.md` around L140-146 to see the "特别 cases" list. Use `Edit` to change:
- `engines/ 中归 valuation/` → `engines/ 中归 cost/`

Scope rule: ONLY update the L143 line (saas-pricing-planner narrative). Do NOT update L144/L146 (D-category pre-P59 narrative) — those are P59 retrospective scope, not P60. Leave them for a separate audit batch (P60+ candidate).

- [ ] **Step 7: Verify counts sum to 100**

```bash
cd "D:/E/独立站/youtube-tools"
grep -A 20 "^| Letter | Subdir | Count |" src/engines/INDEX.md | head -22
```

Expected: 16 rows (one per subdir), sum = 100. The two rows that changed:
- `| 2 | cost/ | 5 |` (was 4)
- `| 16 | valuation/ | 10 |` (unchanged)

- [ ] **Step 8: Verify narrative L143 update**

```bash
cd "D:/E/独立站/youtube-tools"
sed -n '140,146p' src/data/INDEX.md
```

Expected: `tools/cost.ts 含 solopreneur-saas-pricing-planner — engines/ 中归 cost/` (with `cost/`, not `valuation/`).

- [ ] **Step 9: Self-review, no commit yet**

```bash
cd "D:/E/独立站/youtube-tools"
git diff --stat src/engines/INDEX.md src/data/INDEX.md
```

Expected: ~5-10 lines changed across both files (5 spots × small deltas).

---

## Task 3: Sync `scripts/codegen-examples.mjs` L85

**Files:**
- Modify: `scripts/codegen-examples.mjs` (L85: `subdir: 'valuation'` → `subdir: 'cost'` for the saas-pricing-planner entry)

**Interfaces:**
- Consumes: T1 moved engine
- Produces: codegen-examples.mjs runs against the new physical path

- [ ] **Step 1: Verify L85 context**

```bash
cd "D:/E/独立站/youtube-tools"
sed -n '83,87p' scripts/codegen-examples.mjs
```

Expected:
```
84:  { file: 'saas-pricing-planner.ts',           slug: 'solopreneur-saas-pricing-planner',
85:    subdir: 'valuation',            defaultInputs: { productType: 'SaaS', targetCustomer: 'b2b', competitorPrice: '29' } },
86:  { file: 'employee-cost-calculator.ts',       slug: 'solopreneur-employee-cost-calculator',
87:    subdir: 'cost',        defaultInputs: { annualSalary: '80000', benefitsPercentage: '30', location: 'us' } },
```

- [ ] **Step 2: Edit L85**

Use `Edit` to change `subdir: 'valuation'` → `subdir: 'cost'`. The replacement is on a single line.

- [ ] **Step 3: Self-review, no commit yet**

```bash
cd "D:/E/独立站/youtube-tools"
grep -nE "subdir.*'valuation'|subdir.*'cost'" scripts/codegen-examples.mjs | head -20
```

Expected: all `subdir: 'valuation'` lines now reference only the 10 truly-valuation engines (none for saas-pricing-planner). saas-pricing-planner's subdir is now `'cost'`.

---

## Task 4: `pnpm check` quality gate

**Files:** none (read-only validation)

**Interfaces:**
- Consumes: T1+T2+T3 changes
- Produces: quality gate verdict (PASS or BLOCKED)

- [ ] **Step 1: Run `pnpm check`**

```bash
cd "D:/E/独立站/youtube-tools"
pnpm check 2>&1 | tee .superpowers/sdd/p60-check-output.txt
echo "---EXIT: $?---"
```

Expected: `---EXIT: 0---`. Output should show 1163 pass / 0 fail (P58+P59 baseline).

- [ ] **Step 2: Read verdict**

If exit 0 + pass count >= 1163: T4 PASS, proceed to T5.

If exit 1: T4 BLOCKED. Likely root causes:
- ❌ scripts/codegen-examples.mjs hardcodes old subdir somewhere missed → grep audit
- ❌ Test file references old path → check L3 again
- ❌ Barrel index.ts missing the new entry → check both index.ts files
- ❌ codegen-examples.mjs --check can't find engine file → re-run pre-flight grep

DO NOT auto-fix. Report BLOCKED + verbatim error + initial diagnosis to the controller; controller invokes systematic-debugging skill.

- [ ] **Step 3: Write T4 report**

Write `D:\E\独立站\youtube-tools\.superpowers\sdd\report-p60-t4.md` with: status (DONE / BLOCKED), exit code, pass/fail/skip counts, full output path, concerns.

---

## Task 5: Atomic commit + 3-way push

**Files:**
- Create: `.superpowers/sdd/report-p60-t4.md` (committed)
- Create: `.superpowers/sdd/report-p60-t5.md` (committed)

**Interfaces:**
- Consumes: T1-T4 changes + report-p60-t4.md
- Produces: P60 commit on master + 3-way sync `0\t0`

- [ ] **Step 1: Stage all changes**

```bash
cd "D:/E/独立站/youtube-tools"
git add -A
git status --short
```

Expected: 7 paths:
- 1 `R` (saas-pricing-planner.ts move)
- 2 `M` (valuation/index.ts, cost/index.ts)
- 1 `M` (tests/saas-pricing-planner.test.ts)
- 1 `M` (src/engines/INDEX.md)
- 1 `M` (scripts/codegen-examples.mjs)
- 1 `A` (.superpowers/sdd/report-p60-t4.md — committed alongside as a SDD artifact; non-production)

- [ ] **Step 2: Atomic commit**

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git commit -m "feat(p60): merge saas-pricing-planner from valuation/ to cost/ subdir

Drift close (E-category audit 2026-07-23): saas-pricing-planner lives in
src/data/tools/cost.ts with categoryId 'E' but was physically placed in
src/engines/valuation/ from P-series batch-time filing. It now sits
alongside employee-cost-calculator, meeting-cost-calculator,
productivity-score, remote-vs-office-calculator in the natural cost/ subdir.

Zero functional change — engine registers by slug, subdir is pure
browse organization. Touched:
- git mv: valuation/ → cost/ (.ts history preserved to v3 origin)
- src/engines/valuation/index.ts: removed 1 import (10 engines still in list)
- src/engines/cost/index.ts: added 1 import (4 → 5 engines)
- tests/saas-pricing-planner.test.ts: updated import path
- src/engines/INDEX.md: 4 spots synced (top diagram + §cost + §valuation + count table)
- scripts/codegen-examples.mjs L85: subdir 'valuation' → 'cost' (P59 lesson step 6)

P49 engine-count-by-category drift guard unaffected (script locks
categoryId counts, not physical subdir → category mapping). Completes
the E-category subset of the same drift class P59 closed for D-category."
```

Expected: 1 atomic commit, ~7 files changed, ~15-25 lines net diff.

- [ ] **Step 3: 3-way push per P48 + P43 + P44 lessons**

```bash
cd "D:/E/独立站/youtube-tools"
git fetch origin && git fetch github
SKIP_PRECOMMIT_CHECK=1 git push origin master
git push github master
# If github push blocked by ahead=0 false-negative (P44 lesson):
#   git -c core.hooksPath=/dev/null push github master
git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master
```

Expected final rev-list: `0\t0` (origin and github both at the new P60 commit).

- [ ] **Step 4: Cron-race protocol if needed**

If post-push fetch shows divergence (e.g. github acquired a LiteLLM cron commit while push was in flight), apply P48 protocol:

```bash
git merge --no-ff github/master
git push origin master
git push github master
git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master
```

Expected final rev-list: `0\t0` after the merge.

- [ ] **Step 5: Write T5 report**

Write `D:\E\独立站\youtube-tools\.superpowers\sdd\report-p60-t5.md` with: status (DONE / DONE_WITH_CONCERNS), commit SHA, pre-push + post-push rev-list, push outputs, --follow history confirmation for the moved file, concerns.

---

## Self-Review

**1. Spec coverage:**
- File move ✓ T1 step 2
- Sub-barrel imports ✓ T1 step 3-4
- Test path ✓ T1 step 5
- INDEX.md sync ✓ T2 (4 spots)
- codegen drift fix ✓ T3 (P59 step 6 lesson)
- Quality gate ✓ T4
- Commit + push ✓ T5

**2. Placeholder scan:** No "TBD" / "implement later" — every step has concrete commands and exact edit specifications. The "grep" steps are run-and-verify, not design decisions.

**3. Type consistency:** Engine slug unchanged (`solopreneur-saas-pricing-planner`); only the physical subdir path changes. `categoryId: 'E'` in data barrel unchanged. P49 drift guard unaffected by design.

**4. Consumer audit completeness:** Pre-flight grep in T1 Step 1 catches any unexpected consumer. T3 explicitly handles `scripts/codegen-examples.mjs` per P59 lesson. Doc comments inside the moved file are unchanged (engine source is content-only, no subdir references).

---

## Definition of Done

- [ ] `pnpm check` exits 0 with all tests passing (no count regression, expected 1163 pass)
- [ ] `ls src/engines/valuation/` shows 10 engine files + index.ts (was 11 + index.ts)
- [ ] `ls src/engines/cost/` shows 5 engine files + index.ts (was 4 + index.ts)
- [ ] `git log --follow src/engines/cost/saas-pricing-planner.ts` shows original v3 rewrite commit history intact
- [ ] `src/engines/INDEX.md` count summary sums to 100 (16 rows × per-letter counts)
- [ ] 3-way push `0\t0` on (origin, github)
- [ ] Memory file P60 ship log + MEMORY.md index updated (separate doc task outside this plan)

---

## Notes

This plan is the **1-file version of P59**. P59 closed the D-category subset (3 freelance engines) of the same drift class. P60 closes the E-category subset (1 cost engine). After P60: only the data-layer categoryId is the source of truth for engine categorization; physical subdirs are pure browse organization.