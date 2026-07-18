# P22 Stale Count Cleanup Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Update 3 stale test assertions from `98` to `100` to match the engine count locked by P16 milestone, closing 3 of 13 pre-existing pnpm check test failures.

**Architecture:** Single batch commit touches 2 test files (3 literal updates). No source code changes, no new files. Verified by `node tests/run.mjs` showing pass 1064→1067 + fail 13→10. The remaining 10 env-dependent fails (Clerk/Supabase auth setup) stay as pre-existing baseline.

**Tech Stack:** TypeScript 5.6 (test runner via tsx) · Node.js `node:test` + `node:assert` · Git + dual remote (gitee origin + github github).

## Global Constraints

1. **3-way sync required at end** — both `origin` (gitee: wlz679/calcKit) and `github` (github: wlz679/forgeflow) must reflect final commits; `git rev-list --left-right --count origin/master...master` AND `github/master...master` must both = `0	0` (pre and post push).
2. **Pre-commit gate** — `pnpm check` will fail locally on the 10 env-dependent tests (Clerk/Supabase auth not configured in this session). Use `SKIP_PRECOMMIT_CHECK=1` for P22-3 commit. CI with real auth secrets should pass.
3. **raw-key invariant** — unchanged (P22 doesn't touch `src/i18n/translations.ts`).
4. **byte-identical invariant** — N/A (no generated artifacts).
5. **No new dependencies** — no new packages, no new files outside `tests/*.test.ts` + `memory/*.md`.
6. **File:line precision** — exact line numbers from pre-flight grep:
   - `tests/ab-split.test.ts:51` test name + `:54` assertion body
   - `tests/ab-split.test.ts:57` test name + `:59` assertion body
   - `tests/internal-links.test.ts:6` test name + `:7` assertion body
7. **Test count expectation** — after P22-3: `pass 1067` + `fail 10`. The 10 env-dependent fails (103, 104, 580-585, 766, 767) remain unchanged.
8. **Commit message convention** — `<type>(<scope>): P22-N — <one-liner>`. Type for fix: `test`. Memory commit type: `docs`.

---

## Task 1: P22-1 — Spec author commit (already done by brainstorm step)

**Files:**
- Created at: `docs/superpowers/specs/2026-07-18-p22-stale-count-cleanup-design.md`

**Status:** ✅ ALREADY SHIPPED at commit `6288871` (during brainstorming step).

**No action required in execution phase.** Plan references this spec for context.

---

## Task 2: P22-2 — Plan author commit (this document)

**Files:**
- Created at: `docs/superpowers/plans/2026-07-18-p22-stale-count-cleanup.md`

**Status:** THIS task is itself; the commit happens at the end of the writing-plans skill invocation.

**No additional action** — the commit happens as part of the writing-plans skill output flow.

---

## Task 3: P22-3 — Fix 3 stale count assertions (98 → 100)

**Files:**
- Modify: `tests/ab-split.test.ts:51` (test name string)
- Modify: `tests/ab-split.test.ts:54` (assertion body literal)
- Modify: `tests/ab-split.test.ts:57` (test name string)
- Modify: `tests/ab-split.test.ts:59` (assertion body literal)
- Modify: `tests/internal-links.test.ts:6` (test name string)
- Modify: `tests/internal-links.test.ts:7` (assertion body literal)

**Interfaces:**
- Consumes: `getAllEngines()` from `src/core/engines/registry.ts` (returns 100 engines per `find src/engines -name "*.ts" ! -name "index.ts" | wc -l`)
- Consumes: `tools` from `src/data/tools/index.ts` (100-entry array)
- Consumes: `relatedTools` from `src/data/internal-links.ts` (100-entry map)
- Produces: 6 literal updates across 2 test files; no semantic change to test logic

**Why this is right-sized:** 1 commit, 6 character edits, 2 files. MECHANICAL per `memory/subagent-driven-overhead.md`. Per P21-3 precedent: fixture-extension pattern, single commit covers multiple files when all changes have one logical goal.

### Step 1: Pre-flight — confirm exact line numbers and current content

Read the relevant sections of both files to confirm current state:

```bash
cd "D:/E/独立站/youtube-tools"
sed -n '51,60p' tests/ab-split.test.ts
echo "---"
sed -n '6,11p' tests/internal-links.test.ts
```

Expected output (verified at plan-write time 2026-07-18):

```
test('getAllEngines() returns 98 engines after import', async () => {
  await import('../src/engines/index.ts');
  const { getAllEngines } = await import('../src/core/engines/registry.ts');
  assert.equal(getAllEngines().length, 98);
});

test('aggregated tools array has 98 entries', async () => {
  const { tools } = await import('../src/data/tools/index.ts');
  assert.equal(tools.length, 98);
});
---
test('all 98 tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 98);
  for (const t of tools) {
    assert.ok(relatedTools[t.slug], `missing entry for ${t.slug}`);
  }
});
```

If output differs (e.g., file was modified since plan write): STOP, surface diff to user, do not proceed.

### Step 2: Edit `tests/ab-split.test.ts:51` test name

Use Edit tool with:

`old_string`:
```
test('getAllEngines() returns 98 engines after import', async () => {
```

`new_string`:
```
test('getAllEngines() returns 100 engines after import', async () => {
```

### Step 3: Edit `tests/ab-split.test.ts:54` assertion body

Use Edit tool with:

`old_string`:
```
  assert.equal(getAllEngines().length, 98);
```

`new_string`:
```
  assert.equal(getAllEngines().length, 100);
```

### Step 4: Edit `tests/ab-split.test.ts:57` test name

Use Edit tool with:

`old_string`:
```
test('aggregated tools array has 98 entries', async () => {
```

`new_string`:
```
test('aggregated tools array has 100 entries', async () => {
```

### Step 5: Edit `tests/ab-split.test.ts:59` assertion body

Use Edit tool with:

`old_string`:
```
  assert.equal(tools.length, 98);
```

`new_string`:
```
  assert.equal(tools.length, 100);
```

### Step 6: Edit `tests/internal-links.test.ts:6` test name

Use Edit tool with:

`old_string`:
```
test('all 98 tools have relatedTools entry', () => {
```

`new_string`:
```
test('all 100 tools have relatedTools entry', () => {
```

### Step 7: Edit `tests/internal-links.test.ts:7` assertion body

Use Edit tool with:

`old_string`:
```
  assert.equal(Object.keys(relatedTools).length, 98);
```

`new_string`:
```
  assert.equal(Object.keys(relatedTools).length, 100);
```

### Step 8: Verify tests now show pass 1067 + fail 10

Run:
```bash
cd "D:/E/独立站/youtube-tools"
node tests/run.mjs 2>&1 | grep -E "^# (tests|pass|fail|skipped|todo|cancelled)|^not ok" | tail -20
```

Expected output:
- `# tests 1096` (unchanged total)
- `# pass 1067` (was 1064, +3 from P22)
- `# fail 10` (was 13, −3 from P22)
- `# skipped 19` (unchanged)
- `not ok` lines should NOT include: `getAllEngines() returns 98`, `aggregated tools array has 98 entries`, `all 98 tools have relatedTools entry`
- `not ok` lines SHOULD still include the 10 env-dependent (103, 104, 580-585, 766, 767)

**Stop conditions** (any of these means the fix is broken):
- `# pass` increased by LESS than 3 → at least one assertion body wasn't updated correctly
- `# pass` increased by MORE than 3 → some test added or test name pattern changed unexpectedly
- `# fail` does not include any new stale-count lines → ALL assert body lines updated correctly
- The remaining 10 `not ok` lines are NOT the same 10 as before P22 → env-dependent tests unexpectedly affected (shouldn't happen for literal updates)

If any stop condition triggers: STOP. Revert with `git checkout HEAD -- tests/ab-split.test.ts tests/internal-links.test.ts`. Diagnose by reading failure messages. Report root cause to user.

### Step 9: Commit

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add tests/ab-split.test.ts tests/internal-links.test.ts
git commit -m "test: P22-3 — update 3 stale count assertions (98→100) to match P16 milestone engine count"
```

Expected: 2 files changed, 6 insertions, 6 deletions (or 3 insertions + 3 deletions if each test name + assertion = 3 lines replaced total — depends on whether Edit counts as single-line replacement or full block replacement; actual stat varies but the count of changes will be ~6 line pairs).

Record the commit SHA as `<P22-3-SHA>` for P22-4 memory append.

---

## Task 4: P22-4 — Memory append + 3-way sync

**Files:**
- Modify (append): `memory/p17-i18n-backfill-shipped.md` (add `## P22` section)
- Modify (append): `memory/MEMORY.md` (add 1-line index entry)
- Initial commit uses `<FINAL>` SHA placeholder; amend after this commit lands to backfill with actual final SHA.

**Interfaces:**
- Consumes: P21 section already in `p17-i18n-backfill-shipped.md` (ends with "P22+ candidates" list)
- Produces: P22 section with commit chain + lessons + remaining 10 env-dependent baseline

**Why this is right-sized:** 3 ops (commit + amend + dual-push). INLINE per P21-4 + P20-4 + P19-3 precedent.

### Step 1: Read end of p17 memory to find append position

```bash
cd "D:/E/独立站/youtube-tools"
wc -l memory/p17-i18n-backfill-shipped.md && tail -25 memory/p17-i18n-backfill-shipped.md
```

Expected: file ends with P21 section's "P22+ candidates" list (final deferred item: `docs/superpowers/plans/` content audits).

### Step 2: Capture SHAs

```bash
cd "D:/E/独立站/youtube-tools"
git log --oneline -2
```

Expected output (after P22-3 lands):
```
<P22-3-SHA>  test: P22-3 — update 3 stale count assertions (98→100) to match P16 milestone engine count
6288871      docs(spec): P22 Stale Count Cleanup design — 3-line 98→100 test assertion fix
```

(Plan commit is task 2 itself; will land before P22-3 executes.)

Record `<P22-3-SHA>`.

### Step 3: Pre-push sync verification

```bash
cd "D:/E/独立站/youtube-tools"
git fetch --all
git rev-list --left-right --count origin/master...master
git rev-list --left-right --count github/master...master
```

Expected: both print `0	0`. If either prints non-zero: STOP. Pull/fetch missing commits from the lagging remote before proceeding.

### Step 4: Append P22 section to memory file

Use Edit tool on `memory/p17-i18n-backfill-shipped.md`. 

The `old_string` should be the LAST existing line of the P21 section (which is the final P22+ candidate: "`docs/superpowers/plans/` content audits — P8/P14 plans were written before `.gitignore:docs/` was removed (P19-3); their concrete claims (line counts, byte sizes) may have drifted. Future batches may revisit content accuracy as a low-priority housekeeping item.").

`new_string`:
```

---

## P22 Stale Count Cleanup (shipped 2026-07-18)

### Outcome

| Metric | Value |
|---|---|
| **Commits** | spec `6288871` + plan `<PLAN-SHA>` + fix `<P22-3-SHA>` + memory `<FINAL>` |
| **Tasks** | 1 fix task (MECHANICAL, 3-line 98→100 fix in 2 files) |
| **Pre-flight investigation** | Identified 13 fails total: 3 stale 98→100 count + 10 env-dependent (Clerk/Supabase auth setup required). P22 scope limited to 3 shippable fixes. |
| **Test count transition** | pass 1064 → **1067** (+3) / fail 13 → **10** (−3) / skip 19 unchanged |
| **Files modified** | 2: `tests/ab-split.test.ts` (lines 51, 54, 57, 59) + `tests/internal-links.test.ts` (lines 6, 7) — pure literal updates 98→100, no logic change |
| **3-way sync** | gitee + github both at `<FINAL>`; rev-list `0	0` pre/post ✓ |

### Task chain

```
<FINAL>      docs(p22): P22 Stale Count Cleanup shipped — 3 stale count assertions fixed; 10 env-dependent fails deferred to P23+
<P22-3-SHA>  test: P22-3 — update 3 stale count assertions (98→100) to match P16 milestone engine count
<PLAN-SHA>   docs(plan): P22 Stale Count Cleanup implementation plan
6288871      docs(spec): P22 Stale Count Cleanup design
0164edb      docs(p21): P21 Tech Debt Cleanup shipped — 3 housekeeping tasks
```

### 4 lessons

1. **Pre-flight scope assessment prevented scope creep.** User chose "fix all 13 fails" without realizing 10 need external Clerk/Supabase auth setup. Pre-flight at brainstorm step split the 13 fails into 2 categories: 3 trivial literal updates (P22 scope) + 10 env-dependent (P23+ scope). Saved an entire session's worth of work trying to mock Clerk/Supabase. Lesson: any "fix all tests" request should be pre-flighted for env-dep subset first.

2. **Single batch commit > 3 atomic commits for trivial fixes.** The 3 stale-count changes are all logically one operation ("update engine count assertion to match locked milestone count"). 1 commit with 2 files + 6 character pairs is more bisectable than 3 separate commits — bisect works via the test names anyway. P21-3 precedent: also a single commit across 2-test-related-fixes.

3. **Pre-commit gate noise during housekeeping.** `pnpm check` will fail on P22-3 locally because the 10 env-dependent tests fail (Clerk/Supabase not configured in this session). `SKIP_PRECOMMIT_CHECK=1` is the documented escape hatch per memory `p14-followup-cross-cutting-audit-shipped.md`. CI with real auth secrets is the authoritative gate; local-only test fail count (10) doesn't indicate real regression.

4. **Engine count assertion = the test of time for shipped milestones.** P16 memory (`p16-100-milestone-shipped.md`) declared "engine count locked at 100, trigger events documented in spec §10". 5 months later (2026-07-15/16 → 2026-07-18), the 3 stale 98→100 asserts in test files are the ONLY residual drift from that milestone. A future P-series expansion (P17+) should follow P16's pattern: update registry + update count asserts in same commit.

### P23+ candidates (deferred from P22)

1. **10 env-dependent Clerk/Supabase test fail hardening** — requires real `PUBLIC_CLERK_PUBLISHABLE_KEY` + `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env` or CI secrets. Affected tests: `tests/baselayout-{clerk,sync}-script.test.ts` (2), `tests/header-clerk-render.test.ts` (3), `tests/header-sync-ui.test.ts` (3), `tests/privacy-policy-sync.test.ts` (2). Not shippable in single session without external auth setup.
2. **Extract `EXPECTED_ENGINE_COUNT` shared constant** — single source of truth referenced from all count assertions. YAGNI for now; revisit if P23+ adds engines.
3. **`tests/run.mjs` skip-in-missing-env mode** — graceful degradation when `.env` lacks Clerk/Supabase keys. Different concern from P22 (test correctness vs runner ergonomics).
4. **`tests/internal-links.test.ts:19` "4 entries for all 82 tools"** — also stale (should be 100), but it's testing a RELATED-COUNTS invariant, not the engine count itself. Lower priority than the 3 count asserts P22 fixes; revisit if P23 surfaces.
```

### Step 5: Append single-line index entry to memory/MEMORY.md

Read current MEMORY.md to find the P21 line (anchor for appending):

```bash
cd "D:/E/独立站/youtube-tools"
grep -n "P21 Tech Debt Cleanup" memory/MEMORY.md
```

This prints the line number of the existing P21 entry. Use that EXACT line as `old_string` anchor:

`old_string`: (replace with the EXACT P21 line as printed by the grep)

`new_string`:
```
<existing P21 line>
- [P22 Stale Count Cleanup shipped](p17-i18n-backfill-shipped.md#p22-stale-count-cleanup-shipped-2026-07-18) — 2026-07-18 (single chore commit); closed 3 of 13 pre-existing pnpm check fails by updating stale `98` engine count to `100` (matches P16 milestone lock); affected: `tests/ab-split.test.ts` (lines 51/54/57/59) + `tests/internal-links.test.ts` (lines 6/7); pass 1064→1067 / fail 13→10; 10 env-dependent Clerk/Supabase test fails deferred to P23+ (require real auth credentials)
```

### Step 6: Initial commit with `<FINAL>` SHA placeholder

```bash
cd "D:/E/独立站/youtube-tools"
git add memory/p17-i18n-backfill-shipped.md memory/MEMORY.md
git commit -m "docs(p22): P22 Stale Count Cleanup shipped — 3 stale count assertions fixed (memory+index with <FINAL> SHA placeholder)"
```

Expected: 1 commit. This commit IS the `<FINAL>` commit — its SHA (pre-amend) is what will replace the placeholder in §4 + P22 task chain.

### Step 7: Amend placeholder with actual SHA (backfill)

```bash
cd "D:/E/独立站/youtube-tools"
FINAL_SHA=$(git rev-parse HEAD)
echo "FINAL_SHA=$FINAL_SHA"
```

Edit `memory/p17-i18n-backfill-shipped.md` to replace each occurrence of `<FINAL>` with `$FINAL_SHA` (3 occurrences: table header + 3-way sync line + task chain first line).

Also replace `<PLAN-SHA>` with the actual plan commit SHA (visible via `git log --oneline 6288871..<FINAL_PRE_AMEND>`); plan commit is the most recent before P22-3 in the chain (likely 1 commit before P22-3 = HEAD~2 from pre-amend state).

After both replacements, amend:

```bash
cd "D:/E/独立站/youtube-tools"
git add memory/p17-i18n-backfill-shipped.md
git commit --amend --no-edit
```

Expected: amend succeeds. New HEAD = `<FINAL-AMENDED>` (different SHA from pre-amend).

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

Expected: both print `0	0`.

### Step 10: Final invariant verification

```bash
cd "D:/E/独立站/youtube-tools"
# Confirm test transition
node tests/run.mjs 2>&1 | grep -E "^# (tests|pass|fail|skipped)"
# Verify git log shows the 4 P22 commits
git log --oneline 0164edb..HEAD
```

Expected:
- `# pass 1067`
- `# fail 10`
- 4+ commits visible: spec `6288871` + plan `<PLAN-SHA>` + fix `<P22-3-SHA>` + memory `<FINAL>`-related (pre or post-amend)

---

## Self-Review

**1. Spec coverage (§2 of spec):**
- 3 stale count updates (98 → 100) in 2 test files → Task 3 Steps 2-7 (6 edits rolled into single commit) ✓
- Memory append + 3-way sync → Task 4 Steps 4-9 ✓
- Out-of-scope (10 env-dependent fails, EXPECTED_ENGINE_COUNT extraction) → explicitly NOT in plan, listed in Task 4 lessons §4 as P23+ candidates ✓
- No new dependencies → no new packages/files added outside `tests/*.test.ts` + `memory/*.md` (constraint 5) ✓

**2. Placeholder scan:** No `TBD`/`TODO`/"implement later"/"similar to Task N"/unspecified verifications. The 2 placeholders in memory append (`<FINAL>` and `<PLAN-SHA>`) are explicitly named and backfilled in Task 4 Steps 5+7 with concrete commands. The 3 unknowns in spec §2 (assertion body lines) are resolved by Task 3 Step 1 pre-flight reading actual file contents.

**3. Type consistency:** All edit `old_string`/`new_string` pairs are exact (verified at plan-write time against actual file content via Read tool). Test names and assertion patterns consistent between Task 3 Steps 2-7 and the pre-flight output captured in Step 1.

**Verdict:** No changes needed. Ready for execution.

---

## Execution Choice

Plan complete and saved to `docs/superpowers/plans/2026-07-18-p22-stale-count-cleanup.md`. Two execution options:

**1. Subagent-Driven** — per CLAUDE.md + spec §5 recommendation table; but spec explicitly says "All INLINE per P21 precedent".

**2. Inline Execution (recommended for THIS plan)** — per spec §5 + Plan self-review verdict; precedents P19-3/4/5 + P20-4 + P21-1/2/3/4 all INLINE because each task was ≤10 tool calls.

**Recommendation:** **Option 2 (Inline)** — matches spec §5, lower overhead, faster wall-clock. The spec itself was already committed during brainstorming (Task 1 = `6288871`); Task 2 (this plan) commits during writing-plans output flow; Tasks 3-4 are ≤5 tool calls each.

Which approach?
