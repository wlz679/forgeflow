# P19 Tech Debt Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clean up accumulated P17b/P18 scratch artifacts, fix the legacy `.gitignore:docs/` block that forced `git add -f`, and update the stale "F: Investment & ROI" backfill comment in `translations.ts` to reflect the P18-4 rename.

**Architecture:** Four independent cleanup tasks. Each task touches 1 file (or 1 directory) and has its own commit. No runtime behavior changes — purely housekeeping so future batches don't inherit drift.

**Tech Stack:** git 2.x · bash · Astro 4.16.19 (only for the build verification gate in Task 1)

## Global Constraints

- **Baseline commit:** `78ce51b` (P18 ship)
- **3-way sync required at end:** gitee (`origin`) + github (`github` remote) must both reflect the final commit with `git rev-list --left-right --count origin/master...github/master` = `0\t0`.
- **Pre-commit gate:** run `pnpm check` before every commit. If the pre-existing Clerk/Supabase env fails pollute the suite, use `SKIP_PRECOMMIT_CHECK=1`.
- **raw-key invariant:** `dist/{en,zh}/index.html` raw-key count must stay 0 after every task.
- **No engine logic touched:** this plan is housekeeping only. No edits to `src/engines/**`, `src/core/engines/**`, or `src/i18n/translations.ts` entries (comments OK, content not).
- **`scripts/.scratch/` is NOT gitignored** (verified: `git check-ignore scripts/.scratch/` returns exit 1). All deletions require `git rm` + commit.
- **`_archive/` subdirectory pattern:** P18 already established `scripts/.scratch/_archive/` as the home for one-off P17b fix scripts (see `scripts/.scratch/_archive/README.md`). New archival moves follow the same shape: move file → add README line documenting provenance.

---

### Task 1: Delete 22 obsolete P17b one-shot scripts from `scripts/.scratch/`

**Files:**
- Delete: `scripts/.scratch/add-engineKey.mjs`
- Delete: `scripts/.scratch/add-engineKey-t5.mjs`
- Delete: `scripts/.scratch/apply-translations.mjs` (P18-1 promoted canonical copy at `scripts/apply-translations.mjs` already exists)
- Delete: `scripts/.scratch/build-t5-json.mjs`
- Delete: `scripts/.scratch/check-keys.mjs`
- Delete: `scripts/.scratch/debug.mjs`
- Delete: `scripts/.scratch/debug2.mjs`
- Delete: `scripts/.scratch/extract-en.mjs`
- Delete: `scripts/.scratch/extract-faqs.mjs`
- Delete: `scripts/.scratch/find-missing.mjs`
- Delete: `scripts/.scratch/generate-task6.mjs`
- Delete: `scripts/.scratch/inspect-engines.mjs`
- Delete: `scripts/.scratch/p17b-ai-cost-translations.json`
- Delete: `scripts/.scratch/p17b-legacy-add-engineKey.mjs`
- Delete: `scripts/.scratch/p17b-legacy-translations.json`
- Delete: `scripts/.scratch/p17b-mid-translations.json`
- Delete: `scripts/.scratch/p17b-task6-remaining.json`
- Delete: `scripts/.scratch/p17b-task6-translations.json`
- Delete: `scripts/.scratch/p17b-task7-translations.json`
- Delete: `scripts/.scratch/p17b-valuation-faqs.json`
- Delete: `scripts/.scratch/p17b-valuation-fixes.json`
- Delete: `scripts/.scratch/p17b-valuation-translations.json`
- Delete: `scripts/.scratch/p17b-valuation-translations-2.json`
- Delete: `scripts/.scratch/t5-en-content.md`
- Delete: `scripts/.scratch/t5-keys.json`
- Delete: `scripts/.scratch/test-empty.json`
- Delete: `scripts/.scratch/p17b-legacy-translations.json`

**Background:** P17b used `scripts/.scratch/` as a scratchpad for one-shot translation-generation scripts. After P18-1 promoted `apply-translations.mjs` to canonical, most of these are obsolete. P18-3 ZH terminology audit produced 5 files (`zh-terminology-audit.json` + `.log` + `-2.json` + `-2.log` + `zh-terminology-audit-curated.json`) which Task 2 will archive separately. `i18n-needed.json` is a large 377KB file — Task 2 will handle it.

- [ ] **Step 1: Verify the canonical replacement is present**

Run: `git log --oneline -- scripts/apply-translations.mjs`
Expected: at least one commit (P18-1 `0cd3aff` should appear). If missing → STOP and escalate (means P18-1 didn't actually promote, deletion would lose the canonical code).

- [ ] **Step 2: Delete the 26 obsolete files**

```bash
cd scripts/.scratch
git rm add-engineKey.mjs add-engineKey-t5.mjs apply-translations.mjs build-t5-json.mjs check-keys.mjs \
       debug.mjs debug2.mjs extract-en.mjs extract-faqs.mjs find-missing.mjs generate-task6.mjs \
       inspect-engines.mjs p17b-ai-cost-translations.json p17b-legacy-add-engineKey.mjs \
       p17b-legacy-translations.json p17b-mid-translations.json p17b-task6-remaining.json \
       p17b-task6-translations.json p17b-task7-translations.json p17b-valuation-faqs.json \
       p17b-valuation-fixes.json p17b-valuation-translations.json p17b-valuation-translations-2.json \
       t5-en-content.md t5-keys.json test-empty.json
```

Expected: each file removed (or "did not match any files" — acceptable if some were never committed; just verify remaining list matches what's in `git status`).

- [ ] **Step 3: Verify scratch directory state**

Run: `ls scripts/.scratch/`
Expected: `_archive/`, `i18n-needed.json`, `zh-terminology-audit.json`, `zh-terminology-audit.log`, `zh-terminology-audit-2.json`, `zh-terminology-audit-2.log`, `zh-terminology-audit-curated.json`

If any file OTHER than those 7 remains → STOP and escalate (unexpected file).

- [ ] **Step 4: Verify nothing broke**

```bash
pnpm exec node scripts/check-i18n-completeness.mjs
```
Expected: PASS — same 100/100 engineKey + 0 raw keys as before this task.

- [ ] **Step 5: Verify scratch scripts still parse (none should be referenced anymore)**

Run: `grep -rn "scripts/.scratch/" src/ tests/ scripts/apply-translations.mjs scripts/lib/ 2>/dev/null`
Expected: NO matches. If any match found (e.g. a test imports a scratch script) → STOP and escalate — Task 1 deletion would break that consumer.

- [ ] **Step 6: Commit**

```bash
git add scripts/.scratch/
git commit -m "chore(scratch): P19-1 — delete 26 obsolete P17b one-shot scripts (P18-1 promoted apply-translations.mjs canonical)"
```

---

### Task 2: Move ZH terminology audit artifacts + i18n-needed.json to `_archive/`

**Files:**
- Move: `scripts/.scratch/zh-terminology-audit.json` → `scripts/.scratch/_archive/zh-terminology-audit.json`
- Move: `scripts/.scratch/zh-terminology-audit.log` → `scripts/.scratch/_archive/zh-terminology-audit.log`
- Move: `scripts/.scratch/zh-terminology-audit-2.json` → `scripts/.scratch/_archive/zh-terminology-audit-2.json`
- Move: `scripts/.scratch/zh-terminology-audit-2.log` → `scripts/.scratch/_archive/zh-terminology-audit-2.log`
- Move: `scripts/.scratch/zh-terminology-audit-curated.json` → `scripts/.scratch/_archive/zh-terminology-audit-curated.json`
- Move: `scripts/.scratch/i18n-needed.json` → `scripts/.scratch/_archive/i18n-needed.json`
- Modify: `scripts/.scratch/_archive/README.md` (append 2 new provenance lines)

**Background:** The ZH terminology audit (P18-3) produced 5 artifacts that document the audit-then-fix workflow. They are NOT actively referenced by any script (the fixer used curated JSON inline as input, not as runtime dep). Archiving preserves the audit trail for future terminology audits without cluttering `.scratch/`. `i18n-needed.json` (377KB) is the consolidated "missing translations" report from P17b — kept for reference.

- [ ] **Step 1: Verify no script imports the audit files at runtime**

Run: `grep -rn "zh-terminology-audit\|i18n-needed" scripts/apply-translations.mjs scripts/lib/ tests/scripts/ 2>/dev/null`
Expected: NO matches. The audit files are static reference material, not runtime deps. If a match appears → STOP.

- [ ] **Step 2: Move the 6 files**

```bash
cd scripts/.scratch
git mv zh-terminology-audit.json _archive/
git mv zh-terminology-audit.log _archive/
git mv zh-terminology-audit-2.json _archive/
git mv zh-terminology-audit-2.log _archive/
git mv zh-terminology-audit-curated.json _archive/
git mv i18n-needed.json _archive/
```

Expected: 6 renames reported by git. `git status` should show 6 `R` (rename) entries.

- [ ] **Step 3: Append 2 new provenance lines to `_archive/README.md`**

Read `scripts/.scratch/_archive/README.md` (current contents — see step result). Append two lines following the existing format:

```markdown
# P18-3: ZH terminology audit artifacts — preserved for future audits. The fix-zh-terminology.mjs script reads the curated JSON at apply time. Future audits can re-run `scripts/audit-zh-terminology.mjs` to regenerate raw findings.
# P17b: i18n-needed.json — consolidated missing-translations report from P17b translation backfill (100 engines × per-tool keys). Reference only — all gaps were filled in P17/P17b.
```

- [ ] **Step 4: Verify directory state**

Run: `ls scripts/.scratch/` and `ls scripts/.scratch/_archive/`
Expected: `scripts/.scratch/` is now empty (only `_archive/` subdirectory). `scripts/.scratch/_archive/` contains 6 new files + 3 old (`fix-5-corruptions.mjs`, `fix-corruptions.mjs`, `fix-nrr.mjs`) = 9 total.

- [ ] **Step 5: Verify nothing broke**

```bash
pnpm exec node scripts/check-i18n-completeness.mjs
```
Expected: PASS (i18n completeness is independent of scratch files).

- [ ] **Step 6: Commit**

```bash
git add scripts/.scratch/_archive/
git commit -m "chore(scratch): P19-2 — archive P18-3 ZH terminology audit + P17b i18n-needed.json (preserve audit trail)"
```

---

### Task 3: Remove the `docs/` line from `.gitignore`

**Files:**
- Modify: `.gitignore` (remove line 22: `docs/`)

**Background:** `.gitignore:22` has `docs/` which blocked `docs/i18n/zh-terminology.md` (P18-3 commit) from being staged without `git add -f`. The intent was likely to ignore `node_modules`-style auto-generated doc folders, but it blocks ALL docs/ — including hand-written ones. P18-3 README in `_archive/` already documents this as Info-only. After removal, future hand-written docs work normally; auto-generated doc folders (if any) can be re-ignored with explicit `docs/something/` patterns.

- [ ] **Step 1: Confirm only `docs/i18n/zh-terminology.md` is hand-written in docs/**

Run: `git ls-files docs/`
Expected: `docs/i18n/zh-terminology.md` only. (P18-3 added this one file.) Other `docs/` entries should be plan files in `docs/superpowers/plans/` which were committed with `-f` historically — verify they exist:

Run: `ls docs/superpowers/plans/ | wc -l`
Expected: ≥ 20 (all prior plan files committed with `-f` workaround). These commits will keep tracking them even after `.gitignore` change.

- [ ] **Step 2: Read full `.gitignore`**

```bash
cat .gitignore
```
Verify line 22 is exactly `docs/` (no trailing whitespace).

- [ ] **Step 3: Remove the `docs/` line**

Use Edit tool: delete line 22 (the `docs/` entry). File goes from 24 lines → 23 lines.

- [ ] **Step 4: Verify no current files become ignored**

Run: `git status`
Expected: same modified files as before (`.astro/settings.json`, `.codegraph/.gitignore`, `.superpowers/sdd/task-4-report.md`) — NOT newly-ignored. If `docs/i18n/zh-terminology.md` suddenly becomes "ignored" in git status → STOP, that means git is reporting intent-to-add differently; verify with `git ls-files --error-unmatch docs/i18n/zh-terminology.md`.

- [ ] **Step 5: Add a tracking entry test (sanity check the rule no longer blocks)**

```bash
touch docs/.gitignore-removed-test.txt
git add docs/.gitignore-removed-test.txt
```
Expected: file is staged (no "ignored" warning). If ignored → STOP.

```bash
git restore --staged docs/.gitignore-removed-test.txt
rm docs/.gitignore-removed-test.txt
```

- [ ] **Step 6: Verify nothing broke**

```bash
pnpm exec node scripts/check-i18n-completeness.mjs
pnpm exec astro build
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
```
Expected: i18n PASS, build 313 pages, raw-key 0/0.

- [ ] **Step 7: Commit**

```bash
git add .gitignore
git commit -m "chore(gitignore): P19-3 — remove blanket 'docs/' block (P18-3 needed git add -f workaround; this fixes root cause)"
```

---

### Task 4: Update stale "F: Investment & ROI backfill" comment in `translations.ts`

**Files:**
- Modify: `src/i18n/translations.ts:2573`

**Background:** P18-4 renamed category F from "Investment & ROI" to "Investment & Real Estate" (commit `e101f00`) but the section comment in `translations.ts:2573` was preserved per reviewer Info (out-of-scope at the time). It's now stale.

- [ ] **Step 1: Read line 2573 with 3 lines context**

Read `src/i18n/translations.ts` around line 2573. Confirm current text is exactly:

```ts
  // ===== F: Investment & ROI backfill =====
```

- [ ] **Step 2: Replace**

Use Edit tool:

```
old_string:
  // ===== F: Investment & ROI backfill =====

new_string:
  // ===== F: Investment & Real Estate backfill =====
```

- [ ] **Step 3: Verify no other stale "Investment & ROI" comments exist in repo**

Run: `grep -rn "Investment.*ROI\|投资.*回报" src/i18n/ src/data/ src/pages/ 2>/dev/null | grep -v node_modules`
Expected: NO matches (P18-4 already cleaned the user-visible About page). If any matches → STOP and surface them for case-by-case decision (some may be unrelated "ROI calculator" product names which should stay).

- [ ] **Step 4: Verify nothing broke**

```bash
pnpm exec node scripts/check-i18n-completeness.mjs
pnpm exec astro build
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
```
Expected: i18n PASS, build 313 pages, raw-key 0/0.

- [ ] **Step 5: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "chore(i18n): P19-4 — update 'F: Investment & ROI backfill' comment to reflect P18-4 rename"
```

---

### Task 5: Final ship — memory + 3-way sync

**Files:**
- Modify: `memory/p17-i18n-backfill-shipped.md` (append P19 section)
- Modify: `memory/MEMORY.md` (add P19 index entry)

- [ ] **Step 1: Append P19 section to P17 memory file**

Read `memory/p17-i18n-backfill-shipped.md` to confirm its current P18 section structure (last section). Append a new `## P19 Tech Debt Cleanup` section after the P18 section with this exact content:

```markdown

## P19 Tech Debt Cleanup (2026-07-18, 4 commits)

Four-housekeeping batch — no engine logic, no i18n content, no i18n tooling changes. Closes out the P17b/P18 era's accumulated scratch and stale references.

| Task | What | Commit |
|---|---|---|
| **P19-1** | Delete 26 obsolete P17b one-shot scripts from `scripts/.scratch/` (P18-1 promoted `apply-translations.mjs` canonical already) | `<SHA>` |
| **P19-2** | Move 6 audit/reference JSON to `scripts/.scratch/_archive/` (P18-3 zh-terminology + P17b i18n-needed) | `<SHA>` |
| **P19-3** | Remove blanket `docs/` from `.gitignore` (P18-3 workaround no longer needed) | `<SHA>` |
| **P19-4** | Update stale `F: Investment & ROI backfill` comment in `translations.ts:2573` | `<SHA>` |

**Quality gates:** `pnpm check` PASS (no test regressions); `check-i18n-completeness` PASS (100/100 engineKey); `astro build` 313 pages / 0 raw keys.

**Lessons:**
1. `_archive/` pattern works — P18 established it for one-off P17b fix scripts; P19 reuses for audit artifacts. README.md is the documentation spine (one line per provenance group).
2. `.scratch/` directory is NOT gitignored (verified via `git check-ignore`). All scratch mutations are git-tracked → use `git rm` / `git mv`, not `rm`. This is a project convention worth preserving — keeps scratch history recoverable.
3. Blanket `.gitignore` rules are bug factories — `docs/` blocked ALL hand-written docs (P18-3 had to `git add -f`). Future blanket rules should be `docs/<auto-generated-subdir>/` only.
4. Stale comments drift — when a rename ships, comments referencing the old name become wrong but aren't caught by review unless the reviewer greps for the old name explicitly. Consider adding `grep -n "old-name" src/` to future rename-task review checklists.

**P20 candidates** (deferred from this batch, low priority):
- Two-parser design unification (`parseStringLiteral` + `parseStringLiteralSmart` could merge into one with tolerant flag)
- Slug ↔ name asymmetry (`Investment & Real Estate` name vs `/en/investment-roi/` URL — user-accepted for now)
- `src/i18n/translations.ts:24` engine barrel export alignment (audit P17 mentioned but never actioned)
```

Replace `<SHA>` placeholders with the actual commit SHAs from Steps 6 of Tasks 1-4 (after they're committed).

- [ ] **Step 2: Add P19 index entry to `memory/MEMORY.md`**

Read current `memory/MEMORY.md`. Find the last index entry (line 19 in current state). Append:

```markdown
- [P19 Tech Debt Cleanup shipped](p17-i18n-backfill-shipped.md#p19-tech-debt-cleanup-2026-07-18-4-commits) — 2026-07-18 (4 commits, P19-1..4); housekeeping-only; delete 26 obsolete P17b scratch scripts + archive 6 audit/reference JSON + remove blanket `docs/` from .gitignore + update stale "Investment & ROI" comment in translations.ts:2573; no engine/i18n content changes; gates green
```

- [ ] **Step 3: Verify final state**

```bash
pnpm exec node scripts/check-i18n-completeness.mjs
pnpm exec astro build
grep -c "tools\.solopreneur\|category\.[A-Z]\.(name|desc)" dist/{en,zh}/index.html
```
Expected: i18n PASS, build 313 pages, raw-key 0/0.

- [ ] **Step 4: Commit memory updates**

```bash
git add memory/p17-i18n-backfill-shipped.md memory/MEMORY.md
git commit -m "docs(p19): P19 Tech Debt Cleanup shipped — 4 commits; P17b/P18 housekeeping complete"
```

- [ ] **Step 5: 3-way sync**

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

- [ ] **Step 6: Verify `.scratch/` state**

Run: `ls scripts/.scratch/`
Expected: only `_archive/` subdirectory. `scripts/.scratch/` itself is empty.

---

## Self-Review

1. **Spec coverage:** All 4 user-requested items covered (scratch cleanup × 2 tasks split by retention, .gitignore, translations.ts comment).
2. **Placeholder scan:** No TBDs. Each step has concrete commands or specific text to replace.
3. **Type consistency:** Task 1 lists 26 files explicitly (no ambiguity). Task 2's `git mv` syntax verified against git docs.
4. **Convention preservation:** `_archive/` README format matches existing entries (1 line per provenance, `# P{N}-{X}:` prefix).

## File-level summary

| File | Tasks | Action |
|---|---|---|
| `scripts/.scratch/<26 obsolete scripts>` | Task 1 | Delete (git rm) |
| `scripts/.scratch/<6 audit/reference files>` | Task 2 | Move to `_archive/` (git mv) |
| `scripts/.scratch/_archive/README.md` | Task 2 | Append 2 lines |
| `.gitignore` | Task 3 | Remove line 22 (`docs/`) |
| `src/i18n/translations.ts:2573` | Task 4 | Comment update |
| `memory/p17-i18n-backfill-shipped.md` | Task 5 | Append P19 section |
| `memory/MEMORY.md` | Task 5 | Append index entry |