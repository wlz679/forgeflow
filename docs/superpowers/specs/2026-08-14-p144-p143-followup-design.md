# P144 — P143-followup (Doc Drift + Build-Dep Closure) (Design)

> **Status:** READY for `superpowers:writing-plans`. P144 closes all 4 P143-deferred build-dep failures + 8 P143 final-review doc drift items + `tests/run.mjs` off-by-one. Single PR, ~4-5 atomic commits.
>
> **Origin:** P143 ship memory `memory/p143-build-dep-fixes-shipped.md` §"Pre-existing 项目 gaps (P143+ follow-up 候选)" + P143 final review (fable). 2026-08-14.

---

## 1. Goal

Close all 4 build-dep failures deferred from P143 (user Q1) + 8 doc drift items flagged in P143 final review + `tests/run.mjs` skip-mode off-by-one. Single outcome: full CI green on `RUN_BUILD_TESTS=1 pnpm test:build` + docs in sync with reality.

| # | Failure | Test | Root cause (pre-flight verified 2026-08-14) |
|---|---|---|---|
| 525 | en FAQ render | `tests/engine-en-faq-i18n-guard.test.ts` | `solopreneur-ai-image-cost-calculator` engine has 15 FAQ, translations.ts has 7 (faq.0-6); P143 deleted the only source for faq.5-14 (stale duplicate of long-slug block) |
| 528 | en title in translations | `tests/engine-titles-i18n-guard.test.ts:119` | 65 entries have **double-quoted** en/zh values; test regex requires **single-quoted**. Content EXISTS — only quote style mismatch. P140a commit `1d8943c` (2026-08-05) added "(2026)" suffixes using double quotes |
| 529 | en+zh title in dist | `tests/engine-titles-i18n-guard.test.ts:167` | Same as #528 (dist page can't render title because regex doesn't match) |
| 530 | zh FAQ render | `tests/engine-zh-faq-i18n-guard.test.ts` | Same as #525 (one translation set, both tests fail) |
| (run.mjs) | skip-mode message | `tests/run.mjs:73` | "46 build-dependent suites" — actual is 47 (per P143-B fix to CLAUDE.md); off-by-one drift |
| (doc M1-M6) | count/date drift | various | P143 ship record / MEMORY.md / spec §10.3 / spec §10.5 / plan File Structure / CHANGELOG — count `6 → 7` + dates `2026-08-13 → 2026-08-14` |

**Single outcome**: `RUN_BUILD_TESTS=1 pnpm test:build` reports `# tests 1263 / # pass 1263 / # fail 0` (currently 1259/4); `pnpm check` exit 0 (1240/0/0).

---

## 2. Approach — 1 PR, 4 atomic commits (MECH class)

User chose Option A (FULL): close all 4 build-dep failures + 8 doc items. Single batch with 4 commits:

```
Branch: feature/p144-p143-followup (off master 1497615)
  │
  ├── Commit 1: fix(guard): P144-B1 title regex accepts both quote styles
  │              (closes #528, #529; 1 line in tests/engine-titles-i18n-guard.test.ts)
  │
  ├── Commit 2: fix(i18n): P144-B2 add 16 FAQ keys for ai-image-cost-calculator faq.7-14
  │              (closes #525, #530; +16 keys in src/i18n/translations.ts)
  │
  ├── Commit 3: fix(tests): P144-A3 + run.mjs skip-mode "46" → "47"
  │              (closes run.mjs off-by-one; 1 line in tests/run.mjs)
  │
  └── Commit 4: docs(meta): P144-A1 sync ship record + MEMORY + spec §10 + plan + CHANGELOG
                 (closes M1, M2, M3, M4, M5, M6; ~6 doc edits across 5 files)
```

**Commit ordering rationale**: Code fixes before docs (commits 1-3 are testable; commit 4 is pure docs). Docs land last to capture final commit count + last-ship date.

**Subagent calls** (estimated): ~8 calls total (4 implementer + 4 reviewer, all MECH, all small mechanical edits).

---

## 3. Architecture

### Branch & ship strategy
- Single feature branch `feature/p144-p143-followup` carries 4 commits (P141/P142/P143/P140f-p3 pattern).
- After all 4 commits:
  ```
  git push origin feature/p144-p143-followup
  git checkout master && git merge --ff-only feature/p144-p143-followup
  git push origin master
  git push github master --force-with-lease  (only if cron drift)
  ```
- Pre-push always: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master`.

### Why single branch (not per-fix branches)
- 4 commits within one PR-set keeps audit history clean.
- Less ceremony: 1 branch creation, 1 final cleanup.
- All 4 commits ship together (single fix set for one batch goal).

---

## 4. Components (per-fix detail)

### B-1 — Title regex accepts both quote styles
- **File**: `tests/engine-titles-i18n-guard.test.ts:68`
- **Change**: Extend regex `/'tools\.(solopreneur-[a-z0-9-]+)\.title':\s*\{\s*en:\s*'([^']*)',\s*zh:\s*'([^']*)'\s*\}/g` to accept both single AND double-quoted en/zh values.
- **Proposed regex**: `/'tools\.(solopreneur-[a-z0-9-]+)\.title':\s*\{\s*en:\s*(?:'([^']*)'|"([^"]*)"),\s*zh:\s*(?:'([^']*)'|"([^"]*)")\s*\}/g`
- **Capture group update**: `map[m[1]] = { en: m[2], zh: m[3] };` → `map[m[1]] = { en: m[2] ?? m[3], zh: m[4] ?? m[5] };`
- **Rationale**: P140a commit `1d8943c` used double quotes for 65 B/C-class engines (likely unintentional — em dash `—` doesn't require double quotes, no apostrophes verified). Test fix is less invasive than normalizing 65 content lines.
- **Scope**: 1 regex line + 1 capture assignment line = 2 line edits in 1 test file
- **Verification**:
  - `node -e "..."` count check: `getTitleMap()` size == 100 (was 35)
  - `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep "engine-titles-i18n-guard"` returns `pass 2`
- **Subagent class**: MECH
- **Risk**: 0 — test-only change; runtime title rendering unaffected (still uses `t()` from translations.ts directly)

### B-2 — Add 16 FAQ keys for ai-image-cost-calculator faq.7-14
- **File**: `src/i18n/translations.ts` (insert after canonical block line ~2385)
- **Change**: Add 16 keys (faq.7.q / .7.a / .8.q / .8.a / .9.q / .9.a / .10.q / .10.a / .11.q / .11.a / .12.q / .12.a / .13.q / .13.a / .14.q / .14.a = 8 q + 8 a)
- **Source of en text**: Engine `src/engines/ai-cost/ai-image-generation-cost-calculator.ts` lines 500-507 (8 `{ q: '...', a: '...' }` entries for faq.7-14)
- **zh translation authoring**: Hand-author 8 zh strings matching en content (zh language style consistent with existing faq.0-6 zh in same block)
- **Scope**: 16 keys × ~2 lines each = ~32 line insertions in 1 file
- **Verification**:
  - `grep -c "tools.solopreneur-ai-image-cost-calculator.faq.14.a" src/i18n/translations.ts` returns 1
  - `node -e "const re = /'tools\.solopreneur-ai-image-cost-calculator\.faq\.\d+\.[qa]':/g; ... match count == 32"` (16 keys × 2 langs... wait actually 16 keys = 16 faq.N.q + 16 faq.N.a = 32 match entries... no, 16 keys = 16 lines)
  - `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep "engine-en-faq\|engine-zh-faq"` returns `pass 2`
- **Subagent class**: MECH (content authoring required for zh, but content is mechanical translation of en)
- **Risk**: 0 — adds missing translations; existing canonical block untouched

### A-3 — run.mjs skip-mode "46" → "47"
- **File**: `tests/run.mjs:73`
- **Change**: Hardcoded "46 build-dependent suites" → "47 build-dependent suites"
- **Verification**: `grep -n "build-dependent suites" tests/run.mjs` returns "47"
- **Subagent class**: MECH
- **Risk**: 0 — message-only change

### A-1 — Doc drift sync (M1-M6)
- **Files**: 5 files, ~6 edits total

| Item | File | Change |
|---|---|---|
| M1 | `memory/p143-build-dep-fixes-shipped.md` line 33 | "6 (2 implementation + 2 docs + 2 amendments)" → "7" (incl. ship record) |
| M2 | `memory/MEMORY.md` line 61 | "2 atomic commits + 2 plan/spec amendments" → "3 atomic commits + 2 plan/spec amendments" (P144 will add doc + ship record commits) |
| M3 | `docs/superpowers/specs/2026-08-14-p143-build-dep-fixes-design.md` §10.3 | Commit count target 2 → 3 (or whatever final commit count is) |
| M4 | `docs/superpowers/specs/2026-08-14-p143-build-dep-fixes-design.md` §10.5 | Note "5 remaining build-dep failures deferred to P144" (currently §10.5 has acceptance criterion that's unreachable per Q1) |
| M5 | `docs/superpowers/plans/2026-08-14-p143-build-dep-fixes.md` File Structure table | Add the 2 amendment commit rows |
| M6 | `CHANGELOG.md` line 5 | last-ship date `2026-08-13` → `2026-08-14` |

- **Verification**: per-file grep confirms each line updated; `pnpm check` exit 0 (claude-md-invariant-guard validates #249 in same pass)
- **Subagent class**: MECH
- **Risk**: 0 — pure docs update

---

## 5. Data Flow

P144 has **no runtime data flow changes** (B-2 adds missing translations, B-1 is test-only, A-1 + A-3 are docs).

### B-1 — Test regex data flow
```
src/i18n/translations.ts (65 double-quoted + 35 single-quoted title entries)
  ↓ tests/engine-titles-i18n-guard.test.ts getTitleMap() (extended regex)
  ↓ returns sorted 100-element map
  ↓ test #1 asserts === 100 ✓ (was 35, now 100)
```

### B-2 — FAQ translation data flow
```
src/i18n/translations.ts (7 FAQ entries for ai-image-cost-calculator → 15 entries)
  ↓ tests/_composite-i18n-walkers.ts buildSlugToFaqCount()
  ↓ returns Map<slug, 15>
  ↓ tests/engine-en-faq-i18n-guard.test.ts asserts FAQ[7-14].q+a all in translations ✓
  ↓ tests/engine-zh-faq-i18n-guard.test.ts asserts same for zh ✓
```

---

## 6. Error Handling

### B-1 — regex edge cases
- **Mixed quotes (en single, zh double)**: regex `(?:'([^']*)'|"([^"]*)")` for each field handles this case correctly (en gets m[2] or m[3], zh gets m[4] or m[5])
- **Empty values**: still captured as empty string (regex `[^']*` matches empty); existing test already filters via `if (!titles[slug].zh)`
- **Future engines with apostrophes**: double-quoted style now passes test (was the implicit P140a intent)

### B-2 — FAQ edge cases
- **Engine source changed since faq.7-14**: zh translation must match en source as of write time; implementer reads engine file directly
- **Existing faq.0-6 zh quality bar**: new faq.7-14 zh should match the technical accuracy + natural Chinese phrasing of existing entries
- **Insertion order**: keys must be inserted AFTER canonical block (before any unrelated entry) to keep alphabetical/structural integrity

---

## 7. Testing

### Per-commit verification

| Commit | Verification | Pass criterion |
|---|---|---|
| **1 (B-1)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep -E "engine-titles-i18n-guard.*pass\|fail"` | `pass 2` for both subtests |
| **2 (B-2)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep -E "engine-(en\|zh)-faq-i18n-guard.*pass\|fail"` | `pass 1` for both |
| **3 (A-3)** | `grep "build-dependent suites" tests/run.mjs` | returns "47" |
| **4 (A-1)** | `pnpm check 2>&1 \| tail -3` | `# tests 1240 / # pass 1240 / # fail 0` |

### Per-PR cross-cutting (before ff-merge)
```bash
RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"
# Expected: tests 1263 / pass 1263 / fail 0

pnpm check 2>&1 | tail -3
# Expected: tests 1240 / pass 1240 / fail 0

git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
# Expected: local = origin = github (or 1-4 commits ahead for feature branch)
```

### New / modified test files
| File | Change |
|---|---|
| `tests/engine-titles-i18n-guard.test.ts` | 1 regex line + 1 capture assignment line (B-1) |

P144 is fix-only; no new test files.

---

## 8. Out of scope (deferred)

| Item | Why deferred | Suggested next batch |
|---|---|---|
| **Defensive orphan slug guard** | P143/Q1 deferred this; not surfaced in P144 pre-flight | P145 (separately or in P144-followup2) |
| **Defensive quote-style guard** | New pattern: ensure future engines use single OR double quote (not random). Could be added as 1-line invariant test | P145 candidate |
| **Other build-dep failures** | Pre-flight confirmed only 4 build-dep failures remain (525, 528, 529, 530). All closed by P144 | — |
| **M7 doc drift** | Pre-flight didn't surface M7 (M1-M6 + M8 covered); may have been a meta-finding about review process. If real, will close inline during review | — |
| **P143 leftover wiki/scratch cleanup** | Pre-flight working tree clean (no untracked files) | — |

---

## 9. Ship Path

### Day 0 (today, 2026-08-14)
1. ✅ `git checkout -b feature/p144-p143-followup` (already created)
2. (Next) `superpowers:writing-plans` creates plan from this spec
3. (Next) `superpowers:executing-plans` executes Commit 1 → Commit 4 with subagent-driven development

### Per-commit (Commit 1 + 2 + 3 + 4)
1. `git checkout feature/p144-p143-followup`
2. Dispatch implementer subagent (MECH class, single review depth)
3. Dispatch spec-verifier subagent
4. Apply fix if any
5. `pnpm check` (always) + `RUN_BUILD_TESTS=1 pnpm test:build` (Commit 1 + 2 + 3)
6. Commit with conventional message (`fix(guard):` / `fix(i18n):` / `fix(tests):` / `docs(meta):`)
7. `git push origin feature/p144-p143-followup`
8. After all 4 commits: ff-merge to master, 3-way push

### Day N (after Commit 4 ship)
- Update `memory/p144-p143-followup-shipped.md` (P143 ship memory pattern)
- Update `MEMORY.md` index line
- Update `docs/superpowers/plans/INDEX.md` last-update line
- Mark P144 branch as `keep` (audit history, P141/P142/P143 pattern)

---

## 10. Acceptance criteria

1. **B-1**: `tests/engine-titles-i18n-guard.test.ts` regex accepts both quote styles; `getTitleMap()` returns 100 entries (was 35)
2. **B-2**: `grep -c "tools.solopreneur-ai-image-cost-calculator.faq.14.a" src/i18n/translations.ts` returns 1; 15 FAQ entries for short slug (was 7)
3. **A-3**: `tests/run.mjs:73` shows "47 build-dependent suites" (was "46")
4. **A-1**: All 6 doc drift items fixed (per-file grep verification)
5. `RUN_BUILD_TESTS=1 pnpm test:build` reports `# tests 1263 / # pass 1263 / # fail 0`
6. `pnpm check` exit 0 (1240/0/0)
7. 4 atomic commits on `feature/p144-p143-followup` branch
8. 3-way push: local = origin = github at single SHA, 0 divergence

---

## 11. References

- P143 ship memory: `memory/p143-build-dep-fixes-shipped.md` §"Pre-existing 项目 gaps (P143+ follow-up 候选)" + §"5 Build-Dep Failures Remaining (P143-followup candidates)"
- P143 spec: `docs/superpowers/specs/2026-08-14-p143-build-dep-fixes-design.md` (lines 4764-4783 deletion root cause analysis)
- P143 plan: `docs/superpowers/plans/2026-08-14-p143-build-dep-fixes.md` (line 73 f805509 amendment)
- P121 ship memory: `memory/p121-engine-titles-i18n-guard-shipped.md` (test design — 100/100 single-quoted, now extended to accept double-quoted)
- P140a commit: `1d8943cfe1938d46e9d9716d33f36d358e304bc2` (introduced double-quoting for 65 engines)
- P140b commit: `a69e9f6bc1c244589b6405aaff9671acd05ea032` (FAQ 5→12+ expansion — engine side only, no translation propagation)
- P131 single-test split: split P123/P124 composite guards; relevant for FAQ test runners
- CLAUDE.md 红线 7: `pnpm check` (commit 前过质量门禁)
- CLAUDE.md 红线 11: comments on non-obvious logic + known limits