# Engines Category Field Drift Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dead `category` field from `ToolEngine` type and all 32 engine files so `src/data/tools.ts` `categoryId` becomes the sole source of truth for tool category.

**Architecture:** Mechanical deletion in 34 places (1 type field + 32 engine literals + 1 CLAUDE.md example). No new files (one throwaway script for the batch delete, deleted after run). No public API change. No runtime consumers of `category` exist (verified via grep during brainstorming), so deletion is risk-free.

**Tech Stack:** Astro 4 + TypeScript, Node.js (one-shot script), no new dependencies.

**Tag:** [MECHANICAL] — all tasks are mechanical. Subagent-driven-development with 1 spec-compliance reviewer per task (no quality reviewer needed for pure deletion).

---

## File Structure

| File | Status | Responsibility |
|---|---|---|
| `src/core/engines/types.ts` | Modify | Remove `category: string;` from `ToolEngine` interface (line 21) |
| `src/engines/*.ts` × 32 | Modify | Remove `category: 'X',` (or `"X"`) literal from each engine |
| `CLAUDE.md` | Modify | Remove `category: 'B',` from the engine creation example (line 77) |
| `scripts/_delete-engines-category.mjs` | Create (one-shot, then delete) | One-time Node.js script to delete the 32 engine literals in one pass |
| `docs/superpowers/specs/2026-06-26-drift-fix-engines-category-design.md` | (already committed) | Source-of-truth design spec |

**Net diff:** −34 lines across 34 files. Zero new persistent files.

---

## Task 1: Pre-flight baseline check [MECHANICAL]

**Files:**
- Read: `src/core/engines/types.ts` (verify line 21 has `category: string;`)
- Read: `CLAUDE.md` (verify line 77 has `category: 'B',`)
- Read: `src/engines/*.ts` × 32 (verify each has a `category:` literal)

- [ ] **Step 1: Verify git status is clean**

Run: `git status --short`
Expected: empty output (no modified files). If non-empty, commit or stash current work before proceeding.

- [ ] **Step 2: Verify baseline build passes**

Run: `pnpm check`
Expected: exit 0, no errors. If failing, the existing repo is broken — STOP and report to user; do not proceed with deletion on a broken baseline.

- [ ] **Step 3: Verify type field exists at expected location**

Run: `grep -n "category: string;" src/core/engines/types.ts`
Expected: `21:  category: string;`

If line number differs, read the file to find the actual line, then update the line reference in Task 2.

- [ ] **Step 4: Verify CLAUDE.md example has category line**

Run: `grep -n "category: 'B'," CLAUDE.md`
Expected: `77:  category: 'B',`

If line number differs, read the file to find the actual line, then update the line reference in Task 3.

- [ ] **Step 5: Verify all 32 engines have a category literal**

Run: `grep -l "^  category: " src/engines/*.ts | wc -l`
Expected: `32`

If count is not 32, list the files (`grep -L "^  category: " src/engines/*.ts`) and STOP — the spec assumes exactly 32 matches; discrepancy means something has changed.

- [ ] **Step 6: Document single vs double quote distribution**

Run: `grep -c "^  category: '" src/engines/*.ts | awk -F: '{s+=$2} END {print "single-quote total:", s}'`
Expected output: a number (count of engines using single quotes).

Run: `grep -c '^  category: "' src/engines/*.ts | awk -F: '{s+=$2} END {print "double-quote total:", s}'`
Expected output: a number (count of engines using double quotes).

The two numbers must sum to 32. Note the counts for sanity-check in Task 4.

- [ ] **Step 7: No commit (baseline check only)**

This task establishes baseline state. No code changes — nothing to commit.

---

## Task 2: Remove `category` field from `ToolEngine` interface [MECHANICAL]

**Files:**
- Modify: `src/core/engines/types.ts:21`

- [ ] **Step 1: Read `src/core/engines/types.ts` to confirm exact content**

Run: `Read src/core/engines/types.ts`
Expected: The interface `ToolEngine` is visible. Line 21 reads `  category: string;` (or whatever line number Task 1 confirmed).

- [ ] **Step 2: Delete the `category` field**

Use the Edit tool:
- `file_path`: `src/core/engines/types.ts`
- `old_string`:
```
  slug: string;
  title: string;
  description: string;
  category: string;
  inputs: ToolInput[];
```
- `new_string`:
```
  slug: string;
  title: string;
  description: string;
  inputs: ToolInput[];
```
- `replace_all`: `false`

If the surrounding context does not match exactly (e.g., different field order), read the file again and match the actual content.

- [ ] **Step 3: Verify the line was removed**

Run: `grep -n "category" src/core/engines/types.ts`
Expected: no output (the field is gone from the interface).

- [ ] **Step 4: Run typecheck to verify nothing else references `ToolEngine.category`**

Run: `pnpm typecheck`
Expected: exit 0, no errors. If `error TS2339: Property 'category' does not exist` appears, STOP — this means hidden code referenced `engine.category` somewhere. Grep all source and report findings to user before proceeding.

- [ ] **Step 5: Commit**

Run:
```bash
git add src/core/engines/types.ts
git -c user.email=dev@local -c user.name=Developer commit -m "refactor(types): remove dead ToolEngine.category field

No consumers exist (verified via grep over src/, docs/, scripts/).
tools.ts categoryId remains the sole source of truth for tool category.

Prerequisite for A+B spec subdirectory split (drift would misroute 13/32 tools)."
```

Expected: 1 file changed, 1 insertion(+), 2 deletions(-) (or similar small delta).

---

## Task 3: Update CLAUDE.md engine creation example [MECHANICAL]

**Files:**
- Modify: `CLAUDE.md:77`

- [ ] **Step 1: Read CLAUDE.md around line 73-85 to confirm exact content**

Run: `Read CLAUDE.md offset=70 limit=20`
Expected: the engine creation example visible, with `category: 'B',` on line 77 (or whatever Task 1 confirmed).

- [ ] **Step 2: Delete the `category: 'B',` line**

Use the Edit tool:
- `file_path`: `CLAUDE.md`
- `old_string`:
```
  slug: 'solopreneur-my-calc',
  title: 'My Calculator',
  description: '...',
  category: 'B',
  inputs: [{ name: 'foo', label: 'Foo', type: 'number' }],
```
- `new_string`:
```
  slug: 'solopreneur-my-calc',
  title: 'My Calculator',
  description: '...',
  inputs: [{ name: 'foo', label: 'Foo', type: 'number' }],
```
- `replace_all`: `false`

- [ ] **Step 3: Verify the line was removed**

Run: `grep -n "category: 'B'" CLAUDE.md`
Expected: no output.

- [ ] **Step 4: Visually re-read the example block**

Run: `Read CLAUDE.md offset=68 limit=20`
Expected: the example reads cleanly from `import type` through `registerEngine(engine);` with no `category:` line.

- [ ] **Step 5: Commit**

Run:
```bash
git add CLAUDE.md
git -c user.email=dev@local -c user.name=Developer commit -m "docs(claude): drop category from engine creation example

Aligns the documented pattern with the ToolEngine interface (category
removed in prior commit). Prevents future engines from re-adding a
field the type no longer accepts."
```

Expected: 1 file changed, small insertion/deletion delta.

---

## Task 4: Remove `category` literal from 32 engine files [MECHANICAL]

**Files:**
- Modify: `src/engines/*.ts` × 32
- Create (one-shot, then delete): `scripts/_delete-engines-category.mjs`

- [ ] **Step 1: Write the one-shot deletion script**

Write file `scripts/_delete-engines-category.mjs`:

```javascript
// One-shot script: delete the `category: 'X',` literal from every engine file.
// Safe to delete after this run completes.
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const dir = 'src/engines';
const re = /^  category: ['"][A-F]['"],?\s*$/;

const files = readdirSync(dir).filter(f => f.endsWith('.ts')).sort();
let modified = 0;

for (const f of files) {
  const fp = join(dir, f);
  const orig = readFileSync(fp, 'utf8');
  const lines = orig.split('\n');
  const out = lines.filter(l => !re.test(l));
  if (out.length !== lines.length) {
    writeFileSync(fp, out.join('\n'));
    modified++;
    console.log(`  modified: ${f}`);
  }
}

console.log(`\nTotal modified: ${modified} / ${files.length}`);
if (modified !== files.length) {
  console.error(`!! Expected ${files.length} files modified, got ${modified}. Some files may not have a category literal — investigate.`);
  process.exit(1);
}
```

- [ ] **Step 2: Run the script**

Run: `node scripts/_delete-engines-category.mjs`
Expected output:
```
  modified: affiliate-income-calculator.ts
  modified: ai-api-cost-comparison.ts
  ... (29 more lines) ...
  modified: unit-economics-calculator.ts

Total modified: 32 / 32
```

If the count is not 32, the script exits 1 with an error — investigate which files were skipped before continuing.

- [ ] **Step 3: Verify zero category literals remain in engines**

Run: `grep -l "^  category: " src/engines/*.ts`
Expected: no output (every file's category literal was removed).

If any output, that file's literal did not match the regex (likely a formatting quirk). Read the offending file, identify the difference, and either fix the regex in the script or edit the file manually.

- [ ] **Step 4: Verify the type still compiles (catches any missed `category` reference)**

Run: `pnpm typecheck`
Expected: exit 0, no errors.

- [ ] **Step 5: Delete the one-shot script (no leftover artifacts)**

Run: `rm scripts/_delete-engines-category.mjs`

- [ ] **Step 6: Commit the 32 file deletions**

Run:
```bash
git add src/engines/
git -c user.email=dev@local -c user.name=Developer commit -m "refactor(engines): remove dead category literal from 32 engines

Eliminated 13/32 drift vs tools.ts categoryId:
- cac/ltv/saas-valuation: was B, now driven by tools.ts C
- affiliate-income/freelance-rate/hourly-vs-fixed: was C, now D
- break-even: was A, now C
- employee-cost/meeting-cost: was D, now E
- equity-dilution/freelance-tax/sponsorship-rate/time-value: was E, now F

tools.ts categoryId is now the sole source of truth for tool category.
A+B subdirectory split can proceed without misrouting tools."
```

Expected: 32 files changed, 32 deletions (no insertions).

---

## Task 5: Final verification [MECHANICAL]

**Files:**
- Read: `dist/en/solopreneur-cac-calculator/index.html` (or equivalent built output)
- Read: `dist/en/solopreneur-openai-token-calculator/index.html`

- [ ] **Step 1: Run full quality gate**

Run: `pnpm check`
Expected: exit 0, no errors. This runs typecheck + test:run per CLAUDE.md mandate.

- [ ] **Step 2: Run production build**

Run: `pnpm build`
Expected: build completes successfully. The output should report 141 static pages generated (or whatever the current count is — confirm by reading the build summary line).

- [ ] **Step 3: Verify zero `category` references remain on engine objects in src/**

Run: `grep -rn "engine\.category\|engines\[[^]]*\]\.category\|engines\.\w*\.category" src/`
Expected: no output (no runtime code reads `.category` on engine objects).

- [ ] **Step 4: Spot check 1 — CAC calculator (was drift case)**

Visit `/en/solopreneur-cac-calculator` in browser (or read `dist/en/solopreneur-cac-calculator/index.html` if dev server unavailable).

Verify:
- Page renders without errors
- RelatedTools section shows tools in the **C (Valuation & Exit)** category (not AI Cost)
- `applicationCategory` in JSON-LD is `FinanceApplication` (per application-categories.ts mapping)

If RelatedTools shows wrong category or JSON-LD is wrong, the deletion broke something — STOP and investigate.

- [ ] **Step 5: Spot check 2 — OpenAI token calculator (was correct case)**

Visit `/en/solopreneur-openai-token-calculator` in browser (or read the built HTML).

Verify:
- Page renders without errors
- RelatedTools shows AI Cost Tools (B category)
- `applicationCategory` is `DeveloperApplication`

If anything is wrong, the deletion broke something — STOP and investigate.

- [ ] **Step 6: Review total diff size**

Run: `git diff --stat HEAD~3 HEAD`
Expected: ~34 lines deleted across 34 files (32 engines + types.ts + CLAUDE.md). No unexpected file changes.

If diff shows other files modified, STOP — investigate which files were unintentionally touched.

- [ ] **Step 7: No commit (final verification only)**

All changes were already committed in Tasks 2, 3, and 4. This task is verification-only.

- [ ] **Step 8: Report completion**

Report to user:
- Tasks 2/3/4 commit hashes
- `pnpm check` + `pnpm build` results
- Both spot-check pages status
- Total diff stat (should be ~−34 lines across 34 files)
- A+B spec (Task #3 in TaskList) is now unblocked and can proceed

---

## Self-Review Checklist

- [x] **Spec coverage**: Every spec requirement maps to a task:
  - Goal 1 (single source of truth): Tasks 2 + 4
  - Goal 2 (drift impossible): Task 2 (type field removed)
  - Goal 3 (zero public API change): No task touches consumers; verified by Tasks 4.4 + 5.3
  - Goal 4 (zero new files): Task 4.5 deletes the one-shot script
  - Goal 5 (≤35 lines): Task 5.6 verifies diff size
- [x] **Placeholder scan**: No TBD/TODO/"implement later"/"handle edge cases" anywhere
- [x] **Type consistency**: `ToolEngine` (no `category`) referenced consistently in Tasks 2-5
- [x] **Bite-sized**: Each step is one concrete action (read, edit, grep, run, commit)
- [x] **No assumptions**: Plan works from a fresh clone given the spec file
- [x] **Frequent commits**: 3 commits (one per Task 2/3/4), Task 1 + 5 are verification only

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| Hidden consumer of `engine.category` not caught by grep | Task 4.4 runs `pnpm typecheck` immediately after the 32-file deletion; will fail loudly if any type error appears |
| Sed-style regex misses a non-standard formatted `category` line | Task 4.3 verifies zero `category:` literals remain via grep; if any file is missed, regex is updated or file is edited manually |
| Wrong related-tools category in built HTML (silent breakage) | Task 5.4 + 5.5 explicitly spot-check 2 pages including a drift case (cac) and a correct case (openai-token) |
| Other files accidentally modified | Task 5.6 reviews `git diff --stat` — should be exactly 34 files |