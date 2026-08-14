# P143 — Pre-existing Build-Dep Failures Fix Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close all 9 pre-existing build-dep failures (8 i18n engine-render tests from orphan translation keys + 1 meta-guard with 3 docs drift sub-violations) via 2 atomic commits.

**Architecture:** Single feature branch `feature/p143-build-dep-fixes` carries 2 commits (Commit 1 = code fix, Commit 2 = docs sync). All 4 fixes are MECH class (mechanical, single review depth per CLAUDE.md `subagent-driven-overhead.md`).

**Tech Stack:** Node.js 22+, Bash, npm scripts (`pnpm check`, `pnpm test:build`), TypeScript 5.6 (strict), Astro 4.16.19, Astro static site generation.

## Global Constraints

- **Pre-push always** `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master` (P43/P44 lesson, hook reminder).
- **Pre-commit always** `pnpm check` (CLAUDE.md 红线 7, hook auto). Skip with `SKIP_PRECOMMIT_CHECK=1` only for docs-only commits.
- **Branch strategy** P141/P142 pattern continuation: single feature branch `feature/p143-build-dep-fixes`, ff-merge to master.
- **Ship sequence per commit**:
  1. Implement commit on feature branch
  2. `git push origin feature/p143-build-dep-fixes`
  3. After both commits: `git checkout master && git merge --ff-only feature/p143-build-dep-fixes`
  4. `git push origin master`
  5. `git push github master --force-with-lease` (only if cron drift detected)
- **Subagent dispatch**: One implementer + one spec-verifier per code task. MECH class — no quality reviewer (per `subagent-driven-overhead.md`).
- **Commit message convention**: `fix(i18n):` /` (`docs(meta):`) — both P143 commits use these prefixes.
- **No placeholders**: All code blocks must be complete and runnable.
- **P22b invariant**: `tests/lib/engine-count.ts` const = 100; `extractAllEngineSlugs(translations.ts).length === 100` after Commit 1.

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `src/i18n/translations.ts` | Modify lines 4764-4783 | Rename slug `ai-image-generation-cost-calculator` → `ai-image-cost-calculator` (20 keys, faq.5-14 × q+a) |
| `CLAUDE.md` | Modify (search for stale count) | Update build-dep suite count 42 → 47 (Defense-in-Depth section) |
| `CHANGELOG.md` | Modify (search for stale values) | Update commit count 870 → 984 + last-ship date 2026-07-31 → 2026-08-13 |
| `memory/p143-build-dep-fixes-shipped.md` | Create | Ship record (P142 ship memory pattern) |
| `MEMORY.md` (project) | Modify (P142 line area) | Add `✅ P143 Build-Dep Fixes Shipped` index line |
| `docs/superpowers/plans/INDEX.md` | Modify (line 6 + Section 0) | Update last-update date + append P143 row |

---

## Task 1: B3-A — Rename 20 orphan translation keys

**Files:**
- Modify: `src/i18n/translations.ts:4764-4783` (rename slug across 20 keys)

**Interfaces:**
- Consumes: `extractAllEngineSlugs(translationsText)`)` in `tests/_composite-i18n-walkers.ts:156` (regex: `/^\s*'tools\.(solopreneur-[a-z0-9-]+)\./gm`) — expects exactly 100 unique slugs
- Produces: `translations.ts` with 100 unique `tools.solopreneur-*.` keys (was 101); orphan slug `ai-image-generation-cost-calculator` fully replaced with `ai-image-cost-calculator`

- [ ] **Step 1: Verify pre-flight: 101 vs 100 slugs**

Run: `grep -oE "tools\.(solopreneur-[a-z0-9-]+)\." src/i18n/translations.ts | grep -oE "solopreneur-[a-z0-9-]+" | sort -u | wc -l`
Expected: 101. If 100, STOP — orphan may already be fixed by other work.

- [ ] **Step 2: Verify orphan slug match**

Run: `grep -c "ai-image-generation-cost-calculator" src/i18n/translations.ts`
Expected: 20 (faq.5.q through faq.14.a, 10 q + 10 a). If different, STOP — investigate.

- [ ] **Step 3: Verify page slug matches rename target**

Run: `grep "slug === " src/pages/[lang]/[slug].astro | grep image`
Expected: `const isImage = slug === 'solopreneur-ai-image-cost-calculator';` (short form). This confirms the rename target matches the actual page URL slug.

- [ ] **Step 4: DELETE the duplicate block (NOT rename)**

**CRITICAL**: Lines 4764-4783 are NOT orphans — they are a **stale duplicate** of the canonical short-form block at lines 2356-2385. Both blocks contain overlapping FAQ keys (faq.5.q through faq.14.a), but block 2 uses the LONG slug `solopreneur-ai-image-generation-cost-calculator` with EMPTY `zh: ''` strings, while block 1 uses the canonical SHORT slug `solopreneur-ai-image-cost-calculator` with FULL zh translations.

**Why DELETE not RENAME**:
- After rename, the renamed lines would collide with the canonical block at lines 2368-2369 as duplicate object-literal keys → TS1117 error.
- Block 1 already has all the same content (with rich zh translations). Deleting block 2 loses only the stale empty-zh duplicates.

Run:
```bash
sed -i '4764,4783d' src/i18n/translations.ts
```

Expected: 20 lines deleted (block 2 removed). Verify with: `grep -c "ai-image-generation-cost-calculator" src/i18n/translations.ts` — must still return >= 1 (block 1's canonical entries survive).

- [ ] **Step 5: Verify long-form slug fully removed**

Run:
```bash
grep -c "ai-image-generation-cost-calculator" src/i18n/translations.ts
grep -c "ai-image-cost-calculator" src/i18n/translations.ts
```

Expected: first command 0 (long-form fully removed), second command >= 20 (short-form canonical block intact).

- [ ] **Step 6: Verify slug count = 100**

Run: `grep -oE "tools\.(solopreneur-[a-z0-9-]+)\." src/i18n/translations.ts | grep -oE "solopreneur-[a-z0-9-]+" | sort -u | wc -l`
Expected: 100. If 99 or 101, STOP — investigate.

- [ ] **Step 7: Verify pnpm check passes (TS1117 collision would surface here)**

Run: `pnpm check 2>&1 | tail -3`
Expected: `# tests 1240 / # pass 1240 / # fail 0`. If TS1117 errors appear, STOP — the canonical block has duplicate keys that need investigation.

- [ ] **Step 8: Verify RUN_BUILD_TESTS=1 (8 i18n tests now pass)**

Run: `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: `# tests 1254 / # pass 1254 / # fail 0` (8 i18n tests fixed: #525-#532 — note #528 and #529 also pass since they share the slug count check). If failures persist, STOP — investigate.

- [ ] **Step 9: Commit**

```bash
git add src/i18n/translations.ts
git commit -m "fix(i18n): P143-B3-A delete 20-key stale duplicate in translations.ts"
```

Expected: 1 file changed, 20 deletions (canonical block untouched, empty-zh duplicates removed).

---

## Task 2: B3-BCD — Sync CLAUDE.md + CHANGELOG.md to current state

**Files:**
- Modify: `CLAUDE.md` (Defense-in-Depth section)
- Modify: `CHANGELOG.md` (header line + latest version section)

**Interfaces:**
- Consumes: `tests/claude-md-invariant-guard.test.ts:313` — asserts (a) build-dep suite count, (b) CHANGELOG total commit count, (c) CHANGELOG last-ship date
- Produces: CLAUDE.md + CHANGELOG.md matching git reality (47 suites, 984 commits, 2026-08-13 last-ship)

- [ ] **Step 1: Verify current values**

Run:
```bash
grep -n "42" CLAUDE.md | grep -iE "build-dep|suite" | head -5
grep -n "870" CHANGELOG.md | head -5
grep -n "2026-07-31" CHANGELOG.md | head -5
```

Expected: at least 1 match each (the lines to update).

- [ ] **Step 2: Verify target values**

Run:
```bash
git rev-list --count HEAD  # expect 985 or close (after Task 1 commit)
git log -1 --format=%as    # expect 2026-08-13
grep -c "build-dep.*suite\|build-dep.*test" tests/run.mjs  # expect 47 (per spec §B verify method: per tests/run.mjs skip-mode count)
```

Expected: ~985 commits (Task 1 added 1 commit; spec said 984 at pre-flight, but since we've added 1 commit since pre-flight, count will be 985). Last-ship 2026-08-13. Build-dep count from `tests/run.mjs` skip-mode is 47.

**Note on commit count**: pre-flight showed 984 before spec/plan/spec/plan-amend commits. After spec + plan commits + Task 1 commit = 985-986. Implementer should use the actual `git rev-list --count HEAD` value, NOT hardcode 984.

- [ ] **Step 3: Update CLAUDE.md (B)**

Find the line in CLAUDE.md Defense-in-Depth section that says "42" build-dep suites. Replace with "47".

Run:
```bash
grep -n "42 build-dep\|42 build dep\|Total.*42" CLAUDE.md
```

If found, edit that line(s) replacing `42` with `47` (in build-dep context only — don't blindly replace all `42` in CLAUDE.md).

If not found at the expected pattern, search more broadly:
```bash
grep -nE "build.dep.*[0-9]+|[0-9]+.*build.dep" CLAUDE.md
```

**Important**: Only update the line that refers to "build-dep suites" count, NOT other numbers like "engines = 100" or "commits = 870".

- [ ] **Step 4: Update CHANGELOG.md (C)**

Find the line in CHANGELOG.md that says "870" total commits. Replace with the value from Step 2.

```bash
grep -n "870" CHANGELOG.md
```

Edit the line to use the actual commit count (likely 985 or 986).

- [ ] **Step 5: Update CHANGELOG.md (D)**

Find the line in CHANGELOG.md that says "2026-07-31" last-ship date. Replace with "2026-08-13".

```bash
grep -n "2026-07-31" CHANGELOG.md
```

Edit to "2026-08-13".

- [ ] **Step 6: Verify both files updated**

```bash
grep -n "47 build-dep\|47 build dep" CLAUDE.md
grep -nE "[0-9]+\s*commits\|total\s*commits" CHANGELOG.md  # match the new count
grep -n "2026-08-13" CHANGELOG.md
```

Expected: at least 1 match each. (Allow some flexibility — exact format may differ from regex.)

- [ ] **Step 7: Verify pnpm check still passes**

Run: `pnpm check 2>&1 | tail -3`
Expected: `# tests 1240 / # pass 1240 / # fail 0`.

- [ ] **Step 8: Verify RUN_BUILD_TESTS=1 (all 9 tests now pass)**

Run: `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: `# tests 1263 / # pass 1263 / # fail 0` (all 9 fixed). If any failure persists, STOP — investigate which test failed and which docs update missed.

- [ ] **Step 9: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -m "docs(meta): P143-B3-BCD sync CLAUDE.md + CHANGELOG.md to current state"
```

Expected: 2 files changed, 3 insertions / 3 deletions (1 in CLAUDE.md, 2 in CHANGELOG.md).

---

## Task 3: P143 ship record + INDEX update (inline, docs only)

**Files:**
- Create: `memory/p143-build-dep-fixes-shipped.md`
- Modify: `memory/MEMORY.md` (add P143 line after P142 line)
- Modify: `docs/superpowers/plans/INDEX.md` (last-update line + new row in Section 0)

**Note**: This task is docs-only. Per CLAUDE.md 红线 7, pre-commit `pnpm check` runs but won't be affected by docs edits. May use `SKIP_PRECOMMIT_CHECK=1` if commit is docs-only (allowed by hook reminder). Per P141/P142 ship memory pattern, this is the closing task.

- [ ] **Step 1: Capture commit SHAs**

```bash
git log --oneline master --not 6093597  # capture P143 commit range
git rev-parse master                    # final HEAD
```

Note: `6093597` is the pre-p2 master HEAD (P142 ship). P143 commits should be 2 atomic commits beyond this (Task 1 + Task 2).

- [ ] **Step 2: Create `memory/p143-build-dep-fixes-shipped.md`**

Use P142 ship memory as template (`memory/p142-p141-followup-shipped.md`). Include:
- **Origin**: spec `docs/superpowers/specs/2026-08-14-p143-build-dep-fixes-design.md`
- **拍板路径**: 4 candidates (A/B/C/D) → 2 atomic commits → 1 batch
- **Ship Stats**: 2 atomic commits + 1 plan/spec, master HEAD, 3-way 0/0 divergence
- **Commit Sequence**: list both P143 commits
- **Pre-flight finding**: 9 failures → 2 root causes (orphan slug + docs drift); defensive orphan guard deferred per Q1 decision
- **Lessons Learned**: e.g., "Pre-flight investigation revealed 1 orphan slug instead of 9 distinct bugs — failing assertions cascading from one root cause"
- **P143-followup candidates**: items deferred from P143 (defensive orphan guard)

- [ ] **Step 3: Update `memory/MEMORY.md` (project)**

Find the P142 line (added in P142 ship), add P143 line after it:

```
- [✅ P143 Build-Dep Fixes Shipped](p143-build-dep-fixes-shipped.md) — 9 pre-existing build-dep failures closed (8 i18n engine-render from orphan slug + 1 meta-guard docs drift) — 2 atomic commits on `feature/p143-build-dep-fixes` — 0/0 divergence — pre-flight found 1 orphan slug instead of 9 distinct bugs
```

- [ ] **Step 4: Update `docs/superpowers/plans/INDEX.md`**

Line 6 (last-update date):
```
> **最后更新:** 2026-08-13（P142 P141-followup — 3 batches ship）
```
Change to:
```
> **最后更新:** 2026-08-14（P143 Build-Dep Fixes — 2 atomic commits ship）
```

Section 0 (pre-P plans table), append new row after P142 row:
```
| `2026-08-14-p143-build-dep-fixes.md` | P143 Build-Dep Fixes — 9 pre-existing failures (8 i18n engine-render + 1 meta-guard docs drift) — 2 atomic commits | 2026-08-14 |
```

- [ ] **Step 5: Commit ship record + INDEX updates**

```bash
git add memory/p143-build-dep-fixes-shipped.md memory/MEMORY.md docs/superpowers/plans/INDEX.md
git commit -m "docs(meta): P143 ship record + INDEX last-update"
```

Expected: 3 files changed, ~80 lines (memory file mostly).

---

## Task 4: 3-way push + divergence check (inline, git ops only)

**Files:** (none, git operations only)

- [ ] **Step 1: Pre-push fetch + rev-list**

```bash
cd /d/E/独立站/youtube-tools
git fetch origin 2>&1 | tail -3
git fetch github 2>&1 | tail -3
echo "origin/master: $(git log --oneline -1 origin/master)"
echo "github/master: $(git log --oneline -1 github/master)"
echo "local/master:  $(git log --oneline -1 master)"
echo "---"
echo "local vs origin: $(git rev-list --left-right --count origin/master...master)"
echo "local vs github: $(git rev-list --left-right --count github/master...master)"
```

Expected: `local = origin = github` aligned at master commit, `0 0` divergence (post-feature-merge), or local `0 N` ahead of origin/github (pre-merge).

If github ahead (sync-pricing cron drift since last push):
```bash
GITHUB_AHEAD=$(git rev-list --left-right --count github/master...master | awk '{print $1}')
if [ "$GITHUB_AHEAD" -gt 0 ]; then
  echo "github ahead — cherry-picking cron commit..."
  CRON_SHA=$(git log --oneline github/master --not master | head -1 | awk '{print $1}')
  git cherry-pick "$CRON_SHA"
fi
```

- [ ] **Step 2: ff-merge feature to master**

```bash
git checkout master
git merge --ff-only feature/p143-build-dep-fixes
git log --oneline -3
echo "---"
echo "origin vs master: $(git rev-list --left-right --count origin/master...master)"
echo "github vs master: $(git rev-list --left-right --count github/master...master)"
```

Expected: fast-forward merge successful, master now has 2 new commits.

- [ ] **Step 3: Push origin**

```bash
git push origin master 2>&1 | tail -5
```

Expected: `master -> master` fast-forward (or `+ sha...sha` if cron cherry-pick happened).

- [ ] **Step 4: Push github (force-with-lease if cron drift)**

```bash
git push github master --force-with-lease 2>&1 | tail -5
```

Expected: `master -> master` (or `+ sha...sha master -> master (forced update)`).

- [ ] **Step 5: Verify final 3-way alignment**

```bash
echo "origin/master: $(git log --oneline -1 origin/master)"
echo "github/master: $(git log --oneline -1 github/master)"
echo "local/master:  $(git log --oneline -1 master)"
echo "---"
git status --short  # should be empty
```

Expected: 3-way alignment, working tree clean.

- [ ] **Step 6: Final pnpm check (sanity)**

Run: `pnpm check 2>&1 | tail -3`
Expected: `# pass 1240`, exit 0.

- [ ] **Step 7: Final RUN_BUILD_TESTS=1 (sanity)**

Run: `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"`
Expected: `# tests 1263 / # pass 1263 / # fail 0` (final sanity that all 9 build-dep failures are closed).

---

## Self-Review

### 1. Spec coverage

| Spec section / requirement | Implemented in |
|---|---|
| §1 Goal: 9 failures | Tasks 1 (8 failures) + Task 2 (1 failure with 3 sub-violations) |
| §2 Approach: 2 atomic commits | Tasks 1 + 2 |
| §3 Branch: feature/p143-build-dep-fixes | Already created; Task 4 merges to master |
| §4 A: rename 20 orphan keys | Task 1 Steps 4-6 |
| §4 B: CLAUDE.md build-dep count | Task 2 Step 3 |
| §4 C: CHANGELOG commit count | Task 2 Step 4 |
| §4 D: CHANGELOG last-ship date | Task 2 Step 5 |
| §7 Testing: per-commit verification | Task 1 Steps 7-8, Task 2 Steps 7-8 |
| §9 Ship path | Task 3 + Task 4 |
| §10 Acceptance criteria 1-8 | All addressed in respective tasks |

**Gaps**: None identified. All 8 acceptance criteria have corresponding steps.

### 2. Placeholder scan

- ❌ No "TBD" / "TODO" / "fill in later"
- ❌ No "implement later" / "handle edge cases" without code
- ❌ No "similar to Task N" without restating
- ❌ All code blocks complete and runnable
- ❌ All commands have expected output

### 3. Type / signature consistency

- The orphan slug `ai-image-generation-cost-calculator` is referenced only in `src/i18n/translations.ts` (lines 4764-4783). After rename, all references should be `ai-image-cost-calculator` (matching `src/pages/[lang]/[slug].astro:420` line).
- The `42` build-dep count appears in `CLAUDE.md` Defense-in-Depth section. Task 2 Step 3 uses targeted grep to find this specific occurrence and avoid replacing unrelated numbers.
- The `870` commit count and `2026-07-31` date appear in `CHANGELOG.md`. Task 2 Steps 4-5 use targeted grep to find these specific occurrences.

### 4. Cross-task dependency check

- Task 1 modifies `src/i18n/translations.ts` — no other task touches this file
- Task 2 modifies `CLAUDE.md` + `CHANGELOG.md` — no other task touches these files
- Task 3 creates `memory/p143-build-dep-fixes-shipped.md` + modifies `memory/MEMORY.md` + `docs/superpowers/plans/INDEX.md` — independent of Task 1/2
- Task 4 is pure git ops — no file modifications

No cross-task conflicts. Each task is independently shippable.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-08-14-p143-build-dep-fixes.md` (commit pending).

**Two execution options:**

1. **Subagent-Driven (recommended)** — I dispatch a fresh subagent per task (Task 1 + Task 2 are code/docs MECH tasks), review between tasks, fast iteration. Task 3 + 4 are inline (docs + git ops).

2. **Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints for review.

**Recommended: Option 1** — matches P141/P142 pattern. ~4 subagent calls total (2 implementer + 2 reviewer for Task 1 + Task 2). All MECH class, single review depth per `subagent-driven-overhead.md`.

Which approach?