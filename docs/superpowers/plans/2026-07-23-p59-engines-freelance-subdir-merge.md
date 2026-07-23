# P59 — Engine Subdir Merge (Freelance D-category) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Move 3 D-category engine files from `src/engines/valuation/` to `src/engines/freelance/`, sync 2 sub-bars + 3 tests + INDEX.md to match. Functional behavior unchanged — engines register through slug, not directory.

**Architecture:** Pure physical-organization refactor. No engine code, no calculate()/customFn changes. Only file moves + import path sync. Affects 8 files total (3 .ts move, 2 index.ts updates, 3 test imports, 1 INDEX.md).

**Tech Stack:** TypeScript, Astro, Node test runner. No new deps.

**Background:** Audit (D-batch 2026-07-23) found 3 D-category engines living in `engines/valuation/` (per categoryId `D` in `src/data/tools/freelance.ts:5-114`): `course-pricing-calculator`, `email-list-revenue-calculator`, `project-profitability-calculator`. They were registered via `valuation/index.ts` at lines 6/7/8 (P-series batch-time filing) instead of in the natural `freelance/` subdir. Engines are slug-addressed so functional impact is zero — this is a "browse-friendly" refactor.

---

## Global Constraints

- **Engine count invariant:** `EXPECTED_ENGINE_COUNT = 100` (per `tests/engine-count.ts`); never changes in this batch.
- **Category counts invariant:** T7 of `tests/engine-count-by-category.test.ts` passes (script reads by `categoryId` from `tools/index.ts` barrel — subdir moves do not affect this).
- **Engine registration invariant:** `src/core/engines/registry.ts` is populated at module import by `registerEngine()` calls in each `.ts` file. Each engine file MUST be imported by exactly one sub-barrel (`freelance/index.ts` or `valuation/index.ts`).
- **File history:** Use `git mv` for moves (not delete+create) so git log --follow keeps history.
- **No functional code changes:** No edits to `calculate()`, `customFn`, `staticExamples`, `inputs`, or any engine internal logic.
- **No commit without passing gates:** Pre-commit hook runs `codegen-examples.mjs --check`. After moves, all `staticExamples[0]` content is unchanged → guard passes automatically.

---

## File Inventory (locks decisions before tasks)

### Files moved (3)

| From | To | Reason |
|---|---|---|
| `src/engines/valuation/course-pricing-calculator.ts` | `src/engines/freelance/course-pricing-calculator.ts` | categoryId `D` |
| `src/engines/valuation/email-list-revenue-calculator.ts` | `src/engines/freelance/email-list-revenue-calculator.ts` | categoryId `D` |
| `src/engines/valuation/project-profitability-calculator.ts` | `src/engines/freelance/project-profitability-calculator.ts` | categoryId `D` |

### Files edited (5)

| File | Change |
|---|---|
| `src/engines/valuation/index.ts` | Remove 3 imports (lines 6/7/8) |
| `src/engines/freelance/index.ts` | Add 3 imports |
| `tests/course-pricing-calculator.test.ts` | Line 3: `valuation/` → `freelance/` |
| `tests/email-list-revenue-calculator.test.ts` | Line 3: `valuation/` → `freelance/` |
| `tests/project-profitability-calculator.test.ts` | Line 3: `valuation/` → `freelance/` |
| `src/engines/INDEX.md` | 4 spots: top-dir diagram (line 19, 31) + section 4 (line 102-108) + section 16 (line 261-278) + count summary (line 290, 302) |

### Files NOT touched (P49 invariant protects)

- `src/data/tools/freelance.ts` — already canonical (6 engines, `categoryId: 'D'`).
- `src/data/categories.ts` — D = Freelance Pricing already.
- `tests/engine-count.ts` — const map unchanged.
- `scripts/check-engine-count-by-category.mjs` — reads ToolMeta by categoryId, not by subdir.
- `src/engines/index.ts` — aggregates subdirs but does not touch them directly; will work after sub-barrel updates.

---

## Task 1: Move 3 .ts files via `git mv`

**Files:**
- Move: 3 `src/engines/valuation/<name>.ts` → `src/engines/freelance/<name>.ts`

- [ ] **Step 1: Verify pre-state — 3 target files exist in valuation/, none in freelance/**

Run:
```bash
ls src/engines/valuation/ | grep -E 'course-pricing|email-list-revenue|project-profitability'
ls src/engines/freelance/ | grep -E 'course-pricing|email-list-revenue|project-profitability' || echo "OK: none in freelance/"
```
Expected: 3 lines from valuation; "OK: none in freelance/" from freelance.

- [ ] **Step 2: git mv the 3 files**

Run:
```bash
git mv src/engines/valuation/course-pricing-calculator.ts src/engines/freelance/course-pricing-calculator.ts
git mv src/engines/valuation/email-list-revenue-calculator.ts src/engines/freelance/email-list-revenue-calculator.ts
git mv src/engines/valuation/project-profitability-calculator.ts src/engines/freelance/project-profitability-calculator.ts
```
Expected: each `git mv` exits 0; git status shows 3 renames, 0 modifications.

- [ ] **Step 3: Verify post-state**

Run:
```bash
ls src/engines/valuation/ | grep -E 'course-pricing|email-list-revenue|project-profitability' || echo "OK: gone from valuation/"
ls src/engines/freelance/ | grep -E 'course-pricing|email-list-revenue|project-profitability'
git status --short
```
Expected: "OK: gone from valuation/"; 3 engine names in freelance/; `git status --short` shows 3 `R` (rename) entries.

- [ ] **Step 4: No commit yet** — wait until T2-T5 sync edits land, then single commit covering everything. The 3 renames + 5 edits form one logical atomic change.

---

## Task 2: Remove 3 imports from `src/engines/valuation/index.ts`

**Files:**
- Modify: `src/engines/valuation/index.ts` — delete lines 6/7/8

- [ ] **Step 1: Read current file**

The file currently lists 13 engine imports in slug order. The 3 to remove are:
```ts
import './course-pricing-calculator';
import './email-list-revenue-calculator';
import './project-profitability-calculator';
```
(from lines 6, 7, 8 of the original file).

- [ ] **Step 2: Edit — remove exactly those 3 lines**

After edit, the file should be exactly 10 lines of `import './...'` (the 10 truly-valuation engines) in this order:
```ts
import './unit-economics-calculator';
import './cac-calculator';
import './ltv-calculator';
import './saas-valuation-calculator';
import './break-even-calculator';
import './saas-pricing-planner';
import './stripe-fee-calculator';
import './safe-convertible-note-calculator';
import './burn-multiple-rule-of-40-calculator';
import './arr-multiple-valuation-calculator';
```

- [ ] **Step 3: Verify line count**

Run:
```bash
wc -l src/engines/valuation/index.ts
grep -c "import './" src/engines/valuation/index.ts
```
Expected: 10 lines total (the 10 imports above), grep count = 10.

---

## Task 3: Add 3 imports to `src/engines/freelance/index.ts`

**Files:**
- Modify: `src/engines/freelance/index.ts` — append 3 lines

- [ ] **Step 1: Read current file (3 imports already)**

Current state (from earlier read):
```ts
import './affiliate-income-calculator';
import './freelance-rate-calculator';
import './hourly-vs-fixed-calculator';
```

- [ ] **Step 2: Append 3 imports in slug-sorted order at the bottom**

Final file should be:
```ts
import './affiliate-income-calculator';
import './freelance-rate-calculator';
import './hourly-vs-fixed-calculator';
import './course-pricing-calculator';
import './email-list-revenue-calculator';
import './project-profitability-calculator';
```

- [ ] **Step 3: Verify line count**

Run:
```bash
wc -l src/engines/freelance/index.ts
grep -c "import './" src/engines/freelance/index.ts
```
Expected: 6 lines total, grep count = 6.

---

## Task 4: Update 3 test file import paths

**Files:**
- Modify: `tests/course-pricing-calculator.test.ts:3`
- Modify: `tests/email-list-revenue-calculator.test.ts:3`
- Modify: `tests/project-profitability-calculator.test.ts:3`

- [ ] **Step 1: For each test file, change the path on line 3**

In **each** test file:
- Find: `import '../src/engines/valuation/<name>.ts';`
- Replace: `import '../src/engines/freelance/<name>.ts';`

Where `<name>` matches the file name (course-pricing-calculator / email-list-revenue-calculator / project-profitability-calculator).

- [ ] **Step 2: Verify all 3 path updates**

Run:
```bash
grep -n "src/engines/valuation/(course-pricing|email-list-revenue|project-profitability)" tests/*.test.ts || echo "OK: no stale valuation paths"
grep -n "src/engines/freelance/(course-pricing|email-list-revenue|project-profitability)" tests/*.test.ts
```
Expected: `OK: no stale valuation paths`; 3 lines in freelance/.

- [ ] **Step 3: Run only the 3 affected tests as smoke check**

Run:
```bash
pnpm exec node --import tsx --test tests/course-pricing-calculator.test.ts tests/email-list-revenue-calculator.test.ts tests/project-profitability-calculator.test.ts 2>&1 | tail -25
```
Expected: All 3 test files report `pass` counts; `fail` = 0. (Validates engine registration via sub-barrel + path resolution works.)

---

## Task 5: Update `src/engines/INDEX.md` (4 spots)

**Files:**
- Modify: `src/engines/INDEX.md` — 6 edits across 4 sections

- [ ] **Step 1: Spot 1 — top-level subdir diagram (line 19 & 31)**

Find:
```
    ├── freelance/       (3)
```
Replace:
```
    ├── freelance/       (6)
```
Find:
```
    └── valuation/       (13)
```
Replace:
```
    └── valuation/       (10)
```

- [ ] **Step 2: Spot 2 — section 4 list (line 102-108)**

Replace the entire section 4 block:
```markdown
## 4 · `freelance/` — Freelance / Pricing (3 engines)

| Slug | Title |
|---|---|
| `affiliate-income-calculator` | Affiliate Income Calculator |
| `freelance-rate-calculator` | Freelance Rate Calculator |
| `hourly-vs-fixed-calculator` | Hourly vs Fixed Rate Calculator |
```
With:
```markdown
## 4 · `freelance/` — Freelance / Pricing (6 engines)

| Slug | Title |
|---|---|
| `affiliate-income-calculator` | Affiliate Income Calculator |
| `course-pricing-calculator` | Course Pricing Calculator |
| `email-list-revenue-calculator` | Email List Revenue Calculator |
| `freelance-rate-calculator` | Freelance Rate Calculator |
| `hourly-vs-fixed-calculator` | Hourly vs Fixed Rate Calculator |
| `project-profitability-calculator` | Project Profitability Calculator |
```

- [ ] **Step 3: Spot 3 — section 16 list (line 261-278)**

In the section 16 table (currently lists 13 engines), find and remove these 3 rows in slug order:
```
| `course-pricing-calculator` | Course Pricing Calculator |
| `email-list-revenue-calculator` | Email List Revenue Calculator |
| `project-profitability-calculator` | Project Profitability Calculator |
```
Also update the section heading from `16 · \`valuation/\` — Valuation / Pricing (13 engines)` to `(10 engines)`.

**Decision: rewrite to the new note.** Replace the existing:
```
> **注意:** `valuation/` 是最大 category (13 engines)，体现项目"valuation heavy"重心。其他 categories 平均 5-6 engines。
```
With:
```
> **注意:** `valuation/` 收窄到 10 engines（Freelance/Pricing 类 engines 已在 P59 搬到 `freelance/`）。Course pricing / Email list revenue / Project profitability 不再在此处。
```

- [ ] **Step 4: Spot 4 — count summary (line 290 & 302)**

Find:
```
| 4 | freelance/ | 3 |
```
Replace:
```
| 4 | freelance/ | 6 |
```
Find:
```
| 16 | valuation/ | 13 |
```
Replace:
```
| 16 | valuation/ | 10 |
```

- [ ] **Step 5: Verify count summary sums to 100**

Run:
```bash
grep -E '^\| [0-9]+ \| [a-z-]+/ \| [0-9]+ \|$' src/engines/INDEX.md
```
Expected: 16 rows, counts sum to 100 (run mentally: 8+4+6+6+6+5+6+6+8+6+6+6+6+5+6+10 = 100).

---

## Task 6: Run `pnpm check` — typecheck + test gate

- [ ] **Step 1: Run pnpm check (matches pre-commit hook invocation)**

Run:
```bash
pnpm check
```
Expected: exit 0; report `pass ≥ 1163` (or current count), `fail 0`. This validates:
- TS compiles (registry re-export chain through sub-barrels is intact).
- All 1170+ node:test cases still pass (especially T1-T7 from `engine-count-by-category.test.ts` and the 3 moved-test imports).

- [ ] **Step 2: If fails, diagnose per `systematic-debugging` skill**

If fail appears, do NOT skip — call the systematic-debugging skill before fixing. Common suspects after moves:
- "Cannot find module …freelance/course-pricing-calculator" → means T3 import is wrong.
- "Cannot find module …valuation/course-pricing-calculator" → means T4 test path not updated.
- ENG count drift → means T2 removed too many imports.

---

## Task 7: Run `pnpm build` — full static-build smoke

- [ ] **Step 1: Run pnpm build**

Run:
```bash
pnpm build
```
Expected: exit 0; ~314 pages generated (`100 calcs × 2 langs + 15 cat listings × 2 langs + 2 landing × 2 langs = 314`). Search the build output for the 3 moved engines:

```bash
pnpm build 2>&1 | grep -E 'course-pricing|email-list-revenue|project-profitability'
```
Expected: each of the 3 slugs appears in exactly 2 output paths (one per lang).

- [ ] **Step 2: If pages missing, check registerEngine flow**

If any of the 3 slugs does NOT appear in the dist output, the cause is likely the 3 engines are no longer being registered (means a `registerEngine()` call was missed in the move). But since `git mv` doesn't touch content, this is unlikely. If it happens, confirm `pnpm exec node -e "import('./src/engines/freelance/course-pricing-calculator.ts').then(()=>console.log('ok'))"` returns `ok`.

---

## Task 8: Commit + push

- [ ] **Step 1: Stage all changes**

Run:
```bash
git add -A
git status --short
```
Expected: 8 paths listed:
- 3 rename pairs (R) for the engine .ts moves
- 2 modifications (M) for valuation/index.ts and freelance/index.ts
- 3 modifications (M) for the 3 test files
- 1 modification (M) for src/engines/INDEX.md

NOTE: git may show 3 `R` entries (collapsed rename) for the moves — total path count may be `< 8+3 = 11`, that's normal.

- [ ] **Step 2: Single commit covering the whole refactor**

Run:
```bash
git commit -m "feat(p59): merge 3 D-category engines from valuation/ to freelance/ subdir

Drift close (D-category audit 2026-07-23): 3 engines (course-pricing,
email-list-revenue, project-profitability) live in src/data/tools/freelance.ts
with categoryId 'D' but were physically placed in src/engines/valuation/
from P-series batch-time filing. They now sit alongside affiliate-income,
freelance-rate, hourly-vs-fixed in the natural freelance/ subdir.

Zero functional change — engines register by slug, subdir is pure
browse organization. Touched:
- 3 git mv: valuation/ → freelance/ (.ts history preserved)
- src/engines/valuation/index.ts: removed 3 imports
- src/engines/freelance/index.ts: added 3 imports
- 3 tests/*.test.ts: updated import paths
- src/engines/INDEX.md: 4 spots synced (top diagram + section 4 + section 16 + count table)

P49 engine-count-by-category drift guard unaffected (script locks categoryId
counts, not physical subdir → category mapping).

pnpm check: pass/fail unchanged"
```

- [ ] **Step 3: 3-way push per P48 lessons + P43/P44 habits**

Run:
```bash
git fetch origin && git fetch github
SKIP_PRECOMMIT_CHECK=1 git push origin master
git push github master
# If github push blocked by ahead=0 false-negative (P44 lesson):
#   git -c core.hooksPath=/dev/null push github master
git fetch origin && git fetch github && git rev-list --left-right --count origin/master...github/master
```
Expected: final rev-list shows `0\t0` (origin and github both at the new commit).

---

## Self-Review

**1. Spec coverage:**
- File moves ✓ T1
- Index sync ✓ T2, T3
- Test paths ✓ T4
- Doc sync ✓ T5
- Validation ✓ T6, T7
- Commit + push ✓ T8

**2. Placeholder scan:** No "TBD" / "implement later" — every step has concrete commands and exact code.

**3. Type consistency:** No new types introduced. All filenames + slugs match between move sources and import destinations (verified by hand in T1 audit).

---

## Definition of Done

- [ ] `pnpm check` exits 0 with all tests passing (no count regression)
- [ ] `pnpm build` produces ~314 pages with all 3 moved slugs in 2 langs each
- [ ] `ls src/engines/valuation/` shows 10 engine files (was 13)
- [ ] `ls src/engines/freelance/` shows 6 engine files (was 3)
- [ ] `git log --follow src/engines/freelance/course-pricing-calculator.ts` shows original commit history intact
- [ ] 3-way push `0\t0` on (origin, github)
- [ ] Memory file P59 ship log + MEMORY.md index updated (separate doc task outside this plan)
