# P143 — Pre-existing Build-Dep Failures Fix (Design)

> **Status:** READY for `superpowers:writing-plans`. P143 closes the 9 pre-existing build-dep failures flagged in P142 ship memory §"Pre-existing 项目 gaps" (candidate E). Pre-flight investigation revealed the 9 failures trace to 2 root causes; fix scope is small (2 atomic commits, 4 surgical edits).
>
> **Origin:** P142 ship memory `memory/p142-p141-followup-shipped.md` §"Pre-existing 项目 gaps (P142+ follow-up 候选)" candidate E. 2026-08-14.

---

## 1. Goal

Close all 9 pre-existing `RUN_BUILD_TESTS=1` build-dep failures that have been blocking full CI green for an extended period:

| # | Test | File | Root cause |
|---|---|---|---|
| 249 | CLAUDE.md invariant matrix | `tests/claude-md-invariant-guard.test.ts:3:4192` | CLAUDE.md build-dep count drift + CHANGELOG drift (3 sub-violations) |
| 525 | en engine page renders FAQ q+a | `tests/engine-en-faq-i18n-guard.test.ts:3:1336` | Orphan slug (engine count 101 vs 100) |
| 526 | en engine page renders how_to_use | `tests/engine-en-howto-i18n-guard.test.ts:3:1342` | Orphan slug |
| 527 | en engine page renders first input label | `tests/engine-en-input-i18n-guard.test.ts:3:1342` | Orphan slug |
| 528 | engine titles in translations.ts | `tests/engine-titles-i18n-guard.test.ts:3:2572` | Orphan slug |
| 529 | engine titles in dist | `tests/engine-titles-i18n-guard.test.ts:7:156` | Orphan slug |
| 530 | zh engine page renders FAQ q+a | `tests/engine-zh-faq-i18n-guard.test.ts:3:1336` | Orphan slug |
| 531 | zh engine page renders how_to_use | `tests/engine-zh-howto-i18n-guard.test.ts:3:1342` | Orphan slug |
| 532 | zh engine page renders first input label | `tests/engine-zh-input-i18n-guard.test.ts:3:1342` | Orphan slug |

**Single outcome**: `RUN_BUILD_TESTS=1 pnpm test:build` reports `# tests 1263 / # pass 1263 / # fail 0` (currently 1254/9).

---

## 2. Approach — 2 atomic commits (1 PR)

P143 is small (2 root causes → 4 surgical fixes). All 4 candidates are MECH class. Single batch with 2 commits:

```
Branch: feature/p143-build-dep-fixes (off master 6093597)
  │
  ├── Commit 1: fix(i18n): P143 delete 20-key stale duplicate in translations.ts
  │              (closes #525, #526, #527, #528, #529, #530, #531, #532)
  │
  └── Commit 2: docs(meta): P143 sync CLAUDE.md + CHANGELOG.md to current state
                 (closes #249 [3 sub-violations])
```

**Subagent calls** (estimated): 4 calls total (2 implementer + 2 reviewer, all MECH, all small mechanical edits).

---

## 3. Architecture

### Branch & ship strategy
- Single feature branch `feature/p143-build-dep-fixes` carries 2 commits (P141/P142/P140f-p3 pattern).
- After both commits:
  ```
  git push origin feature/p143-build-dep-fixes
  git checkout master && git merge --ff-only feature/p143-build-dep-fixes
  git push origin master
  git push github master --force-with-lease  (only if cron drift)
  ```
- Pre-push always: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master`.

### Why single branch (not per-fix branches)
- 2 commits within one PR-set keeps audit history clean (`git log feature/p143-build-dep-fixes --not master` shows full P143 atomic-commits).
- Less ceremony: 1 branch creation, 1 final cleanup.
- Both commits ship together (single fix set for one batch goal).

---

## 4. Components (per-fix detail)

### A — delete 20-key stale duplicate in translations.ts
- **File**: `src/i18n/translations.ts` lines 4764-4783
- **Change**: DELETE the duplicate block (NOT rename — see plan amendment 2026-08-14)
- **Why DELETE not RENAME**: Lines 4764-4783 are a **stale duplicate** of the canonical short-form block at lines 2356-2385. Block 1 has `tools.solopreneur-ai-image-cost-calculator.faq.5.q` through `.faq.14.a` WITH rich `zh` translations. Block 2 has the LONG slug `ai-image-generation-cost-calculator` with EMPTY `zh: ''` strings. RENAME would collide with block 1 as TS1117 duplicate keys. Block 1 is canonical; block 2 is leftover from a partial rename. Delete block 2.
- **Scope**: 20 keys (faq.5.q / .5.a / .6.q / .6.a / .7.q / .7.a / .8.q / .8.a / .9.q / .9.a / .10.q / .10.a / .11.q / .11.a / .12.q / .12.a / .13.q / .13.a / .14.q / .14.a = 10 q + 10 a)
- **Pattern**: `sed -i '4764,4783d' src/i18n/translations.ts`
- **Verification**: `grep -c "ai-image-generation-cost-calculator" src/i18n/translations.ts` returns 0 (long-form fully removed); `grep -c "ai-image-cost-calculator"` returns >= 20 (block 1 canonical entries intact); `extractAllEngineSlugs(translations.ts).length === 100`
- **Subagent class**: MECH
- **Risk**: 0 — deletes stale duplicates only; canonical content (with rich zh translations) untouched

### B — CLAUDE.md build-dep suite count 42 → 47
- **File**: `CLAUDE.md` Defense-in-Depth section
- **Change**: update suite count `42` → `47` (P141-B3-T8 added `p141-b3-engineering-cleanup` + others; count drifted from CLAUDE.md static claim)
- **Verify**: `grep -n "build-dep suite\|Total.*build-dep" CLAUDE.md` then update the matching line(s)
- **Subagent class**: MECH
- **Risk**: 0 — pure docs update

### C — CHANGELOG.md commit count 870 → 984
- **File**: `CHANGELOG.md` (header line or commit summary)
- **Change**: total commits `870` → `984` (P141 + P142 + others landed since last update)
- **Verify**: `git rev-list --count HEAD` = 984
- **Subagent class**: MECH
- **Risk**: 0 — pure docs update

### D — CHANGELOG.md last-ship date 2026-07-31 → 2026-08-13
- **File**: `CHANGELOG.md` (latest version section)
- **Change**: last-ship date `2026-07-31` → `2026-08-13` (P141 + P142 ships)
- **Verify**: `git log -1 --format=%as` returns `2026-08-13`
- **Subagent class**: MECH
- **Risk**: 0 — pure docs update

---

## 5. Data Flow

P143 has **no runtime data flow changes**. All edits are static (translations metadata + docs).

### A — translations rename data flow
```
src/i18n/translations.ts (101 unique slugs → 100 after rename)
  ↓ tests/_composite-i18n-walkers.ts extractAllEngineSlugs()
  ↓ returns sorted 100-element array
 ↓ engine-en-faq-i18n-guard + 7 sibling tests assert === 100 ✓
```

### B-D — docs drift data flow
```
CLAUDE.md / CHANGELOG.md (static text)
  ↓ tests/claude-md-invariant-guard.test.ts reads + asserts against git rev-list + git log
  ↓ 3 sub-assertions all pass ✓
```

---

## 6. Error Handling

### A — rename edge cases
- **Orphan slug persists after rename** (implementer forgot 1-2 keys): `grep -c "ai-image-generation-cost-calculator" src/i18n/translations.ts` returns 0 expected; if >0, STOP and re-examine.
- **Wrong slug renamed**: implementer may rename the wrong occurrence. Page URL check: `grep "slug === " src/pages/[lang]/[slug].astro | grep image` confirms page uses `solopreneur-ai-image-cost-calculator` (short form).
- **Content lost**: replace_all is content-preserving; risk 0.

### B-D — docs drift edge cases
- **Wrong number/date used**: implementer self-verifies via `git rev-list --count HEAD` + `git log -1 --format=%as` before commit.
- **Multi-location update**: CLAUDE.md may have 2 places (Defense-in-Depth section + Total summary line). Implementer searches `grep -n "42.*build-dep\|build-dep.*42" CLAUDE.md` to find all occurrences.

---

## 7. Testing

### Per-commit verification

| Commit | Verification | Pass criterion |
|---|---|---|
| **1 (A)** | `pnpm check 2>&1 \| tail -3` | `# tests 1240 / # pass 1240 / # fail 0` |
| **1 (A)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep -E "^# (tests\|pass\|fail)"` | `# tests 1254 / # pass 1254 / # fail 0` (8 i18n tests fixed) |
| **2 (BCD)** | `pnpm check 2>&1 \| tail -3` | `# tests 1240 / # pass 1240 / # fail 0` |
| **2 (BCD)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep -E "^# (tests\|pass\|fail)"` | `# tests 1263 / # pass 1263 / # fail 0` (all 9 fixed) |

### Per-PR cross-cutting (before ff-merge)
```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
# Expected: local = origin = github (or 1-2 commits ahead for feature branch)
```

### New / modified test files
| File | Change |
|---|---|
| (none) | — |

P143 is fix-only; no new test files. Defensive orphan guard deferred (per scope decision Q1).

---

## 8. Out of scope (deferred)

| Item | Why deferred | Suggested next batch |
|---|---|---|
| **E** — defensive orphan slug guard (`tests/orphan-slug-guard.test.ts` or extension to existing engine-titles-i18n-guard) | P143 scope is fix-only per user decision Q1 | P142+ / P144 |
| A's other potential orphans | Pre-flight grep confirmed no other orphans (trans has 101, src has 100, only 1 orphan = `ai-image-cost-calculator`) | — |
| C — secret-leak-guard.test.ts (P142-followup candidate) | Already deferred in P142 ship memory | P142+ |
| Stricter per-SVG aria-hidden check | Already deferred in P142 ship memory | P142+ |

---

## 9. Ship Path

### Day 0 (today, 2026-08-14)
1. ✅ `git checkout -b feature/p143-build-dep-fixes` (already created)
2. (Future) `superpowers:writing-plans` creates plan from this spec
3. (Future) `superpowers:executing-plans` executes Commit 1 → Commit 2 with subagent-driven development

### Per-commit (Commit 1 + Commit 2)
1. `git checkout feature/p143-build-dep-fixes`
2. Dispatch implementer subagent (MECH class, single review depth)
3. Dispatch spec-verifier subagent
4. Apply fix if any
5. `pnpm check` (always) + `RUN_BUILD_TESTS=1 pnpm test:build` (Commit 1 + 2)
6. Commit with conventional message (`fix(i18n):` / `docs(meta):`)
7. `git push origin feature/p143-build-dep-fixes`
8. After both commits: ff-merge to master, 3-way push

### Day N (after Commit 2 ship)
- Update `memory/p143-build-dep-fixes-shipped.md` (P142 ship memory pattern)
- Update `MEMORY.md` index line
- Update `docs/superpowers/plans/INDEX.md` last-update line
- Mark P143 branch as `keep` (audit history, P141/P142 pattern)

---

## 10. Acceptance criteria

1. **A**: `grep -c "ai-image-generation-cost-calculator" src/i18n/translations.ts` returns 0; `extractAllEngineSlugs(translations.ts).length === 100`
2. **B**: `CLAUDE.md` Defense-in-Depth section reports `47 build-dep suites` (was 42); grep for stale `42` returns no remaining build-dep claims
3. **C**: `CHANGELOG.md` total commit count = `984` (was 870); `git rev-list --count HEAD` = 984
4. **D**: `CHANGELOG.md` last-ship date = `2026-08-13` (was 2026-07-31); `git log -1 --format=%as` = 2026-08-13
5. `RUN_BUILD_TESTS=1 pnpm test:build` reports `# tests 1263 / # pass 1263 / # fail 0` — *Note: per user Q1 decision during P143 ship, only 5 of 9 failures closed in P143; remaining 4 (#525/#528/#529/#530) deferred to P144 (p144-p143-followup).*
6. `pnpm check` exit 0 (1240/0/0)
7. 6 atomic commits on `feature/p143-build-dep-fixes` branch (Commit 1-2 = implementation `fix(i18n):` + `docs(meta):`; Commit 3-4 = plan/spec amendments; Commit 5 = ship record)
8. 3-way push: local = origin = github at single SHA, 0 divergence

---

## 11. References

- P142 ship memory: `memory/p142-p141-followup-shipped.md` §"Pre-existing 项目 gaps (P142+ follow-up 候选)" — candidate E list
- P142 final review: 9 pre-existing build-dep failures flagged as deferred to P143
- P22b ship memory: `memory/p22b-engine-count-constant-shipped.md` — `tests/lib/engine-count.ts` const=100 + drift guard (P143-A's root cause)
- P132 invariant guard: `tests/claude-md-invariant-guard.test.ts` — P143-B/C/D's root cause
- P43/P44 lesson: sync-pricing cron 3-way divergence handling
- CLAUDE.md 红线 7: `pnpm check` (commit 前过质量门禁)
- CLAUDE.md 红线 11: comments on non-obvious logic + known limits