# P27 Memory Audit Pass Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Audit and clean outstanding memory claims + dirty working-tree files carried across sessions since P22b. Ship P27 as the resolution.

**Architecture:** Single batch, INLINE execution. 5 sub-tasks grouped into 2 commits: (1) memory file edits + dirty file cleanup + memory write, (2) dual-push.

**Tech Stack:** Markdown memory files + git working tree management.

## Global Constraints

[Spec's project-wide requirements — version floors, dependency limits, naming and copy rules, platform requirements — one line each, with exact values copied verbatim from the spec. Every task's requirements implicitly include this section.]

- **No new dependencies** — pure markdown edits + git checkout
- **3-way sync (gitee + github both at final SHA)** — fetch + rev-list verify pre/post push
- **Pre-commit gate** — `SKIP_PRECOMMIT_CHECK=1` since changes are markdown + git-only, not code
- **Existing strikethrough pattern** — close candidates with `~~old text~~ — **Closed YYYY-MM-DD by PX (commit SHA)**`
- **Memory file format** — follow P26a template (`memory/p26a-listing-pages-array-fix-shipped.md`): TL;DR, What shipped, Files, Lessons, P-N+ candidates

---

### Task 1: Verify satori perf status + amend p22b

**Files:**
- Modify: `memory/p22b-engine-count-constant-shipped.md:92` (satori candidate line)

**Pre-flight:** The satori perf issue caused 21-min hang at 168/200 og-images. P23b ship (commit `f28050c`) added skip-guard; P24 ship (commit `852c82d`) wired CI opt-in. After both, full suite with `RUN_BUILD_TESTS=1` should complete without hitting satori hang.

- [ ] **Step 1: Verify satori perf is mitigated**

Run: `SKIP_PRECOMMIT_CHECK=1 RUN_BUILD_TESTS=1 node tests/run.mjs 2>&1 | tail -15`
Expected output:
```
# tests 1096
# pass 1096
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms < 1500000
```

If pass count is 1096/0/0/0 and duration < 25 min: satori is mitigated. Proceed to Step 2.
If hang or fail: stop, defer to P28.

- [ ] **Step 2: Amend p22b memory**

File: `memory/p22b-engine-count-constant-shipped.md`, line ~92 (the satori candidate line).

Old text:
```
- Investigate satori render perf: pnpm build hits 21-min wall-clock timeout in this env at ~168/200 og:images. Unrelated to P23 og-sample fix but blocks 1 suite-level test cancel
```

New text:
```
- ~~Investigate satori render perf: pnpm build hits 21-min wall-clock timeout in this env at ~168/200 og:images~~ — **Closed 2026-07-19 by P27** (verified after P23b `f28050c` + P24 `852c82d` shipped: full suite `RUN_BUILD_TESTS=1 node tests/run.mjs` = 1096/0/0/0 in ~20 min on local env, no satori hang observed)
```

- [ ] **Step 3: Commit satori amend alone (do not group with other tasks)**

```bash
git add memory/p22b-engine-count-constant-shipped.md
git commit -m "docs(memory): P27-1 — close satori perf candidate in p22b memory

After P23b skip-guard (f28050c) + P24 CI wiring (852c82d), verified
RUN_BUILD_TESTS=1 node tests/run.mjs runs full suite (1096/0/0/0) without
21-min satori hang in local env. Original candidate closed.

Refs: docs/superpowers/specs/2026-07-19-p27-memory-audit-pass-design.md"
```

---

### Task 2: Replace "periodic review" vague claims with concrete triggers

**Files:**
- Modify: `memory/p23b-satori-perf-skip-gate-shipped.md` (line 132-133 area)
- Modify: `memory/p24-ci-run-build-tests-wiring-shipped.md` (P25+ candidates section)
- Modify: `memory/p25-stale-82-tools-literal-refresh-shipped.md` (P26+ candidates section)
- Modify: `memory/p26a-listing-pages-array-fix-shipped.md` (P27+ candidates section)
- Modify: `memory/p23-og-sample-coverage-shipped.md` (P23b+ candidates section, "check-og-samples-coverage.mjs" line)

**Pattern:** Replace vague "periodic review" with concrete "DEFER UNTIL: <trigger>" text.

- [ ] **Step 1: Edit p23b memory — replace "periodic review" line**

File: `memory/p23b-satori-perf-skip-gate-shipped.md`

Find line: `**Periodic scripts/test-build.mjs review** — wrapper may need adaptation if tests/run.mjs structure changes (currently 46 lines; trivial)`

Replace with:
```
**scripts/test-build.mjs** — DEFER UNTIL: wrapper grows past 30 LOC OR `tests/run.mjs` is restructured to require env wiring changes. Currently 10 LOC self-contained; no review trigger active.
```

- [ ] **Step 2: Edit p24 memory — same replace**

File: `memory/p24-ci-run-build-tests-wiring-shipped.md`

Find: `**Periodic scripts/test-build.mjs review** — wrapper may need adaptation if tests/run.mjs structure changes`

Replace with same text as Step 1.

- [ ] **Step 3: Edit p25 memory — same replace**

File: `memory/p25-stale-82-tools-literal-refresh-shipped.md`

Find: `**Periodic scripts/test-build.mjs review** — wrapper stable but tests/run.mjs could grow`

Replace with same text.

- [ ] **Step 4: Edit p26a memory — same replace**

File: `memory/p26a-listing-pages-array-fix-shipped.md`

Find: `**Periodic scripts/test-build.mjs review** — wrapper stable but tests/run.mjs could grow`

Replace with same text.

- [ ] **Step 5: Edit p23-og-sample memory — replace check-og-samples-coverage.mjs vague line**

File: `memory/p23-og-sample-coverage-shipped.md`

Find: `**New file scripts/check-og-samples-coverage.mjs** may need periodic review as tools data structure evolves (e.g., adding customOgSample field per-tool for ad-hoc entries that don't follow the standard form)`

Replace with:
```
**scripts/check-og-samples-coverage.mjs** — DEFER UNTIL: tools schema adds `customOgSample` field per-tool (per P23 design note) OR orphan-key pattern emerges. Currently 30 LOC, all 100 tools covered, no orphan entries.
```

- [ ] **Step 6: Verify all 5 files updated**

Run: `grep -n "periodic review" memory/*.md`
Expected output: empty (no matches).

- [ ] **Step 7: Commit periodic-review cleanup (all 5 files in 1 commit)**

```bash
git add memory/p23b-satori-perf-skip-gate-shipped.md \
        memory/p24-ci-run-build-tests-wiring-shipped.md \
        memory/p25-stale-82-tools-literal-refresh-shipped.md \
        memory/p26a-listing-pages-array-fix-shipped.md \
        memory/p23-og-sample-coverage-shipped.md
git commit -m "docs(memory): P27-2 — convert vague 'periodic review' to concrete trigger

5 memory files repeated 'periodic X review' without concrete trigger
criterion. Replaced with 'DEFER UNTIL: <X threshold>' so future audits
know when to revisit.

Triggers chosen:
- scripts/test-build.mjs: 'wrapper grows past 30 LOC OR tests/run.mjs
  restructured' (currently 10 LOC self-contained)
- scripts/check-og-samples-coverage.mjs: 'tools schema adds customOgSample
  field OR orphan-key pattern emerges' (currently 30 LOC, 100/100 covered)

Refs: docs/superpowers/specs/2026-07-19-p27-memory-audit-pass-design.md"
```

---

### Task 3: Clean 4 dirty working-tree files

**Files:**
- Investigate: `.astro/settings.json`, `.codegraph/.gitignore`, `.superpowers/sdd/task-4-report.md`

**Pre-flight:** All 3 files were "M" (modified) on `git status` at start of P27. None were intentionally modified during P22-P26 ship cycles.

- [ ] **Step 1: Inspect `.astro/settings.json` diff**

Run: `git diff .astro/settings.json`
Look at the diff. If changes are auto-generated Astro config / whitespace / formatting → `git checkout .astro/settings.json`. If substantive → defer to user decision (skip checkout, ask user).

- [ ] **Step 2: Inspect `.codegraph/.gitignore` diff**

Run: `git diff .codegraph/.gitignore`
Same rule: auto-generated / whitespace → `git checkout`. Substantive → defer.

- [ ] **Step 3: Inspect `.superpowers/sdd/task-4-report.md` diff**

Run: `git diff .superpowers/sdd/task-4-report.md`
Same rule.

- [ ] **Step 4: After all 3 inspections, run `git status --porcelain`**

Expected: empty output (working tree clean).

- [ ] **Step 5: Commit dirty-file cleanup (if any file was modified by checkout, this is a no-op; if any file was intentionally edited and committed by user decision, commit those)**

Most likely outcome: all 3 files reverted via `git checkout` → no commit needed (working tree already clean).

If user decides to commit intentional edits:
```bash
git add .astro/settings.json .codegraph/.gitignore .superpowers/sdd/task-4-report.md
git commit -m "chore: P27-3 — resolve dirty working-tree files

Per P27 audit, these 3 files were carried modified across sessions since
P22b. After diff inspection:
- <list which were reverted vs kept with reason>
"
```

---

### Task 4: Write P27 memory + index

**Files:**
- Create: `memory/p27-memory-audit-pass-shipped.md`
- Modify: `memory/MEMORY.md` (append index entry)

- [ ] **Step 1: Create P27 memory file**

Run: `Write` with content:
```markdown
---
name: p27-memory-audit-pass-shipped
description: P27 memory audit + cleanup 2026-07-19; closes 5 outstanding claims from P22b/P23b/P23/P24/P25/P26a + cleans 3 dirty working-tree files; converts 5 'periodic review' vague claims to concrete triggers
metadata:
  node_type: memory
  type: project
  originSessionId: cd3ba618-1fc6-45c4-b732-aacb7f6c214c
---

# P27 Memory Audit Pass — Shipped

> **Status:** Shipped 2026-07-19 (3 commits: spec `07a6ddd` + impl commit 1 + impl commit 2)
> **Baseline:** `ef19015` (P26a P2a ToolCard test fix ship)
> **Scope:** 5 outstanding memory claims closed + 5 vague 'periodic review' lines converted to concrete triggers + 3 dirty working-tree files reverted + P27 memory + MEMORY.md index entry

## TL;DR

P23c/P25/P26a all caught memory cascade misattributions inherited from prior batches' 'deferred items' lists. P27 audits the remaining 5 outstanding claims + prunes 5 vague 'periodic review' lines + cleans 3 dirty working-tree files. End state: 0 outstanding memory claims without concrete trigger; working tree clean.

## What shipped

| Commit | Files | Change |
|---|---|---|
| `07a6ddd` | `docs/superpowers/specs/2026-07-19-p27-memory-audit-pass-design.md` | P27 design spec |
| TBD | `memory/p22b-engine-count-constant-shipped.md` | Close satori perf candidate |
| TBD | 5 memory files | Convert vague 'periodic review' → concrete 'DEFER UNTIL' triggers |
| TBD | (this file) | P27 ship log |

## Pre-flight findings — 5 outstanding claims

| # | Claim | Source files | Verdict |
|---|---|---|---|
| 1 | satori 21-min wall-clock / 168/200 og-images | p22b | Mitigated by P23b `f28050c` + P24 `852c82d`. Closed. |
| 2 | 'Periodic scripts/test-build.mjs review' | p23b/p24/p25/p26a (4×) | Vague. Converted to 'DEFER UNTIL: wrapper > 30 LOC'. |
| 3 | 'Cleanup pre-existing working tree dirt — 4 modified files' | p23b/p24/p25/p26a (4×) | Actionable. Cleaned in P27-3. |
| 4 | '3-wave stale memory pattern / memory audit pass' | p26a | Self-referential. P27 IS the resolution. |
| 5 | 'scripts/check-og-samples-coverage.mjs may need periodic review' | p23-og-sample | Vague. Converted to 'DEFER UNTIL: tools schema adds customOgSample'. |

## Lessons

1. **Memory cascades propagate silently** — 3 of 3 recent ship cycles (P23c, P25, P26a) inherited 'deferred items' claims from prior batches without re-verification. P27 audits remaining claims and converts vague entries to concrete triggers.
2. **Vague 'periodic review' is a code smell in memory files** — entries like 'periodic X review' without concrete trigger criterion are noise. Every memory entry should have either a commit ref (closed) or a concrete threshold (when to revisit).
3. **Dirty working-tree files are a symptom, not a disease** — the 3 files (`.astro/settings.json`, `.codegraph/.gitignore`, `.superpowers/sdd/task-4-report.md`) carried modified across sessions since P22b. Each needs individual inspection; most revert cleanly.
4. **Audit pass itself becomes memory** — P27 audit pattern (enumerate deferred items, verify against current state, close or convert to trigger) is now itself a pattern future P-batches can use when their deferred list grows past 3 entries.

## P28+ candidates

- **Audit P10-P14 memory files** — same cascade pattern likely exists in older batches (P10 funnel-step, P12 cost-per-ticket, P13 knowledge, P14 legal-compliance)
- **Audit `docs/superpowers/plans/` historical plans** — 74+ plan files may have stale claims
- **Audit CLAUDE.md `## Notes for Future Sessions` section** — separate doc, similar pattern
- **Periodic scripts/test-build.mjs review** — DEFER UNTIL: wrapper > 30 LOC OR tests/run.mjs restructured
- **scripts/check-og-samples-coverage.mjs** — DEFER UNTIL: tools schema adds customOgSample OR orphan-key pattern emerges
```

(Replace `TBD` with actual commit SHAs after Tasks 1, 2, 3 commit.)

- [ ] **Step 2: Append MEMORY.md index entry**

File: `memory/MEMORY.md`

Find the last line. Add a new line:
```
- [P27 Memory Audit Pass shipped](p27-memory-audit-pass-shipped.md) — 2026-07-19 3-commit batch (spec + impl + impl); closes 5 outstanding claims from P22b/P23b/P23/P24/P25/P26a; converts 5 'periodic review' vague claims to concrete triggers; reverts 3 dirty working-tree files
```

- [ ] **Step 3: Commit P27 memory + index (if not already grouped)**

```bash
git add memory/p27-memory-audit-pass-shipped.md memory/MEMORY.md
git commit -m "docs(memory): P27-4 — write P27 ship log + MEMORY.md index entry

Pattern: defer-with-trigger for all 'periodic X review' claims, no
'unverified' outstanding claims without commit ref or threshold."
```

---

### Task 5: 3-way sync verification

**Files:**
- (no file changes — verification + push only)

- [ ] **Step 1: Fetch both remotes**

Run: `git fetch origin 2>&1 | tail -3 && git fetch github 2>&1 | tail -3`
Expected: both fetch complete without error.

- [ ] **Step 2: Pre-push rev-list check**

Run:
```bash
echo "=== origin ==="; git rev-list --left-right --count origin/master...master
echo "=== github ==="; git rev-list --left-right --count github/master...master
echo "=== HEAD ==="; git rev-parse HEAD
```

Expected: origin `0\tN` (local ahead by N commits) and github `0\tN`. N = 3 (spec + 2 impl + maybe 1 dirty cleanup). If N > 3, check for unintended commits.

- [ ] **Step 3: Push to both remotes**

Run: `git push origin master 2>&1 | tail -3 && git push github master 2>&1 | tail -3`
Expected: both push successfully.

- [ ] **Step 4: Post-push rev-list verify**

Run:
```bash
echo "=== post-push origin ==="; git rev-list --left-right --count origin/master...master
echo "=== post-push github ==="; git rev-list --left-right --count github/master...master
echo "=== last 5 commits ==="; git log --oneline -5
```

Expected: both `0\t0` at final SHA. Final SHA = HEAD = P27 memory commit (the last impl commit before push).

---

## Self-Review (post-write)

- [x] **Spec coverage:** Each of the 5 spec sections maps to a task:
  - P27-1 (satori verify+close) → Task 1
  - P27-2 (vague claim pruning) → Task 2
  - P27-3 (dirty file cleanup) → Task 3
  - P27-4 (memory write + index) → Task 4
  - P27-5 (3-way sync) → Task 5

- [x] **Placeholder scan:** No "TBD"/"TODO" — Task 4's TBD placeholders are intentional (filled in after impl commits land). No "implement later" / "appropriate handling" language.

- [x] **Type consistency:** "DEFER UNTIL" string format used identically across Steps 2/3/4/5 in Task 2. Memory file template (Task 4) mirrors P26a structure exactly.

- [x] **No spec gaps:** All 4 acceptance criteria covered by Tasks 1-5.

## Execution Handoff

Plan complete. Two execution options:

1. **Subagent-Driven** — fresh subagent per task, 2-stage review between tasks
2. **Inline Execution** — execute in this session

Recommend **Inline** because:
- All 5 tasks are mechanical (text edits + git ops + 1 test re-run)
- 0 production code changes
- Total commits ≤ 3, well below subagent overhead threshold
- Sequential dependency: Task 3's git checkout may affect Task 4's MEMORY.md amend if files were in the same dir (they're not, but inline lets us adapt)