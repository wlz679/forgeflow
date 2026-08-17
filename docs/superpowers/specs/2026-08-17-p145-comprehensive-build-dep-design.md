# P145 — Comprehensive Build-Dep Failures Closure (Design)

> **Status:** READY for `superpowers:writing-plans`. P145 closes the 3 remaining P143-deferred build-dep failures (#249/#525/#707) + adds 2 defensive guards to prevent P140b-era text-mismatch drift.
>
> **Origin**: P144 ship memory §"Critical Pattern Discovery (261 remaining violations)" + §"Pre-existing 项目 gaps (P144+ follow-up 候选)". 2026-08-17.

---

## 1. Goal

Close all 3 remaining `RUN_BUILD_TESTS=1 pnpm test:build` failures (#249, #525, #707) + add 2 defensive guards (`engine-faq-coverage-guard` + `engine-faq-text-match-guard`) to prevent future engine↔translation en text drift.

**Single outcome**: `RUN_BUILD_TESTS=1 pnpm test:build` reports `# tests 1263 / # pass 1263 / # fail 0` (currently 1260/3); `pnpm check` exit 0 (1240/0/0).

| # | Test | Root cause (pre-flight verified 2026-08-17) |
|---|---|---|
| 249 | CLAUDE.md invariant matrix | CHANGELOG total commit count drift: says 997, actual 1004 (forward drift 7; 1-drift tolerated, 7-drift real issue) |
| 525 | en FAQ render | 261 violations: `engine.faq[N].{q\|a}` ≠ `translations.faq.N.{q\|a}.en` AND HTML doesn't contain translations text (HTML has engine text per P140b T5 design) |
| 707 | Header sync menu | Flaky test (passes in isolation, fails in full test:build run); monitor only — P145 doesn't close this, note for P145-followup |

---

## 2. Approach — 1 PR, 3 atomic commits (MECH class)

User chose **Option B — Defensive + content sync** (recommended).

```
Branch: feature/p145-comprehensive-build-dep (off master 662f68b)
  │
  ├── Commit 1: fix(i18n): P145-B1 bulk align 261 en-faq translations en ← engine en
  │              (closes #525; ~261 line edits in src/i18n/translations.ts)
  │
  ├── Commit 2: feat(guard): P145-B2 add engine-faq-coverage-guard + engine-faq-text-match-guard
  │              (prevents future drift; 2 new test files in tests/)
  │
  └── Commit 3: docs(meta): P145-B3 CHANGELOG total commit count 997 → 1004 + last-update
                 (closes #249)
```

Plus ship record + INDEX + MEMORY bump (Task 4, inline).

**#707 NOT in scope**: Verified flaky via `node_modules/.bin/tsx --test tests/header-sync-ui.test.ts` (passes individually). Note as P145-followup candidate.

**Subagent calls** (estimated): 6 calls (3 implementer + 3 reviewer; MECH, single review depth).

---

## 3. Architecture

### Branch & ship strategy
- Single feature branch `feature/p145-comprehensive-build-dep` carries 3 commits (P141/P142/P143/P144 pattern).
- After all 3 commits:
  ```
  git push origin feature/p145-comprehensive-build-dep
  git checkout master && git merge --ff-only feature/p145-comprehensive-build-dep
  git push origin master
  git push github master --force-with-lease  (only if cron drift)
  ```
- Pre-push always: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master` (P43/P44 lesson).

### Why single branch (not per-fix branches)
- All 3 commits ship together as one P145 batch (single fix set).
- Branch retained for audit history (P141-P144 pattern).
- Less ceremony: 1 branch, 1 final cleanup.

---

## 4. Components (per-fix detail)

### B-1 — Bulk align 261 en-faq translations en ← engine en

**File**: `src/i18n/translations.ts` (261 line edits)

**Mechanism**:
1. Run `RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/engine-en-faq-i18n-guard.test.ts` to get the full 261 violations list (test reports first 20 + count, but internal walker gets all).
2. For each violation `(slug, idx, field)`:
   - Extract engine text from `src/engines/{cat}/{slug}.ts`
   - Replace `translations.ts` translations en value (preserve zh, preserve key)
3. Verify: `RUN_BUILD_TESTS=1 ...` reports 0 violations
4. Verify: `pnpm check` 1240/0/0
5. Commit

**Pattern for replacements**:
- Old: `'tools.solopreneur-X.faq.4.a': { en: 'OLD EN TEXT', zh: '...' },`
- New: `'tools.solopreneur-X.faq.4.a': { en: 'ENGINE EN TEXT (verbatim)', zh: '...' },`

**Quote-style preservation**: Match existing quote style of each entry (single vs double). Engine uses double quotes; some translations use single, some double. Replace in-place preserving style.

**Verification**:
- `RUN_BUILD_TESTS=1 ... | grep "^# (tests|pass|fail)"` → `tests 1 / pass 1 / fail 0`
- `pnpm check | tail -3` → `tests 1240 / pass 1240 / fail 0`
- `grep -oE "tools\.(solopreneur-[a-z0-9-]+)\." src/i18n/translations.ts | sort -u | wc -l` → 100

**Subagent class**: MECH (mechanical text replacement with comprehensive brief)
**Risk**: Low — engine is canonical source of truth; translations en was authored incorrectly during P140b expansion.

### B-2 — Defensive guards: engine-faq-coverage-guard + engine-faq-text-match-guard

**Files**: 2 new test files in `tests/`

#### File 1: `tests/engine-faq-coverage-guard.test.ts`

**Purpose**: Catch P143-style orphan slugs (engine added without translations).

```typescript
#!/usr/bin/env node
// P145-B2a — Defensive guard: every engine's FAQ count must be reflected in translations.ts
// Walks src/engines/**/*.ts, counts engine.faq entries per slug, then walks translations.ts
// and asserts each engine has ≥ same number of unique faq indices.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'path';
// ... walker similar to tests/_composite-i18n-walkers.ts

test('every engine has translations coverage for all FAQ entries', () => {
  // ... assert each engine has ≥ same faq count
});
```

#### File 2: `tests/engine-faq-text-match-guard.test.ts`

**Purpose**: Catch P145-style text drift (engine en ≠ translations en).

```typescript
#!/usr/bin/env node
// P145-B2b — Defensive guard: translations.en MUST match engine.en for all FAQ entries
// Walks src/engines/**/*.ts, extracts engine.faq[N].{q,a}, then walks translations.ts
// and asserts translations.en text equals engine text (after escapeForHtml normalization).

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
// ... walker + assertion
```

**Build-dep gate**: Both must be non-build-dep (no `RUN_BUILD_TESTS` check, no `ensureBuilt()` call) — they read source files only, not dist. So they run in default `pnpm check` mode.

**Verification**:
- After P145-B2: `pnpm check | tail -3` → `tests 1242 / pass 1242 / fail 0` (was 1240; +2 new tests)
- After future engine edit: any text mismatch → fail with clear error message

**Subagent class**: MECH (test scaffolding, well-defined walker pattern from existing tests/_composite-i18n-walkers.ts)
**Risk**: 0 — pure test additions

### B-3 — CHANGELOG doc drift fix

**File**: `CHANGELOG.md` line 5 + line 7

**Change**:
- Line 5 last-update date: `2026-08-17 (P144 P143-followup — ...)` → `2026-08-17 (P145 comprehensive build-dep — 261 en-faq violations closed + 2 defensive guards + CHANGELOG drift fixed)`
- Line 7 total commits: `997 across 59 active days` → `1004 across 59 active days`

**Verification**:
- `pnpm check | grep "claude-md-invariant-guard"` → 1/1 pass
- `git rev-list --count HEAD` → 1004

**Subagent class**: MECH
**Risk**: 0 — pure docs

---

## 5. Data Flow

P145 has minimal data flow changes (all edits are static: string replacements + new tests).

### B-1 — translations.ts en field update
```
src/engines/{cat}/{slug}.ts (engine.faq[N].{q|a} = canonical en)
  ↓ walker extracts 261 (slug, idx, field) tuples where HTML doesn't contain translations.en
  ↓ for each tuple: replace translations.ts en field with engine text
  ↓ test re-run: 261 violations → 0 violations
  ↓ pnpm check: 1240/0/0 (preserved)
```

### B-2 — Defensive guards
```
src/engines/**/*.ts (engine source)
  ↓ new test walks engine source → extracts (slug, idx, field, engineText) map
src/i18n/translations.ts (translations source)
  ↓ same test walks translations → extracts (slug, idx, field, transText) map
  ↓ assert engineText === transText (after escapeForHtml normalization)
  ↓ if mismatch: throw AssertionError with file:line
```

---

## 6. Error Handling

### B-1 — bulk replacement edge cases
- **Engine entry uses double quotes, translations uses single**: replace preserves translation style; just swap the en string value
- **Engine en has special chars (e.g., `\\`, `'`)**: replace verbatim; no escaping needed (engine's string is the source of truth)
- **zh unchanged**: only en field replaced; zh stays
- **Quote-style mismatch (engine en has `"`, translations en has `'` with no escape)**: matched walker handles both quote styles per `engine-titles-i18n-guard.test.ts:68` pattern

### B-2 — defensive guard edge cases
- **New engine added with faq.0 only**: coverage guard requires ≥ same count → fail with clear error
- **Engine en has apostrophes**: escapeForHtml handles them; text-match guard uses exact match after normalization
- **Engine en has em dash `—` vs hyphen `-`**: not escaped; test asserts exact match → fail catches

### B-3 — doc drift edge cases
- **Commit count wrong**: `git rev-list --count HEAD` provides ground truth; update CHANGELOG line 7
- **Last-update date wrong**: `date +%Y-%m-%d` provides ground truth; update CHANGELOG line 5

---

## 7. Testing

### Per-commit verification

| Commit | Verification | Pass criterion |
|---|---|---|
| **1 (B-1)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep "^# (tests\|pass\|fail)"` | `tests 1263 / pass 1263 / fail 0` (or `tests 1261 / pass 1260 / fail 1` if #707 still flaky) |
| **1 (B-1)** | `pnpm check 2>&1 \| tail -3` | `tests 1240 / pass 1240 / fail 0` (preserved) |
| **2 (B-2)** | `pnpm check 2>&1 \| tail -3` | `tests 1242 / pass 1242 / fail 0` (was 1240; +2 new) |
| **3 (B-3)** | `pnpm check 2>&1 \| grep "claude-md-invariant-guard"` | `1 pass` |

### Per-PR cross-cutting (before ff-merge)
```bash
RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"
# Expected: tests 1263 / pass 1263 / fail 0 (or 1261+ if #707 remains flaky)

pnpm check 2>&1 | tail -3
# Expected: tests 1242 / pass 1242 / fail 0

git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
# Expected: local = origin = github (or 3-4 commits ahead for feature branch)
```

### New / modified test files
| File | Change |
|---|---|
| `tests/engine-faq-coverage-guard.test.ts` | NEW (B-2 guard #1) |
| `tests/engine-faq-text-match-guard.test.ts` | NEW (B-2 guard #2) |
| `src/i18n/translations.ts` | 261 en field updates (B-1) |
| `CHANGELOG.md` | Line 5 + line 7 (B-3) |

---

## 8. Out of scope (deferred)

| Item | Why deferred | Suggested next batch |
|---|---|---|
| **#707 Header sync menu flaky test** | Passes in isolation; appears to be timing/port conflict in full test:build run. Not consistently reproducible. | P145-followup (re-investigate after P145 ships) |
| **5 zh strings flagged by Task 2.6 implementer** (bilingual QA) | Quality concerns, not failures | P145-followup (low priority — ships OK as-is) |
| **3 ai-image-cost orphan keys (faq.12/13/14)** | Not user-visible (engine has 12 entries; orphans never rendered) | Note in P145-followup; covered by new text-match guard |
| **Test for html-contains-translations-text (separate from text-match)** | Related but different invariant | P145-followup |
| **Bilingual review of 5 zh strings** | Quality concerns flagged but not failing | P145-followup |

---

## 9. Ship Path

### Day 0 (today, 2026-08-17)
1. ✅ `git checkout -b feature/p145-comprehensive-build-dep` (already created)
2. (Next) `superpowers:writing-plans` creates plan from this spec
3. (Next) `superpowers:executing-plans` executes Commit 1 → Commit 3 with subagent-driven development

### Per-commit (Commit 1 + 2 + 3)
1. `git checkout feature/p145-comprehensive-build-dep`
2. Dispatch implementer subagent (MECH class, single review depth)
3. Dispatch spec-verifier subagent
4. Apply fix if any
5. `pnpm check` (always) + `RUN_BUILD_TESTS=1 pnpm test:build` (Commit 1)
6. Commit with conventional message
7. `git push origin feature/p145-comprehensive-build-dep`
8. After all 3 commits: ff-merge to master, 3-way push

### Day N (after Commit 3 ship)
- Update `memory/p145-comprehensive-build-dep-shipped.md` (P144 ship memory pattern)
- Update `MEMORY.md` index line
- Update `docs/superpowers/plans/INDEX.md` last-update line
- Mark P145 branch as `keep` (audit history, P141-P144 pattern)

---

## 10. Acceptance criteria

1. **B-1**: `RUN_BUILD_TESTS=1 node_modules/.bin/tsx --test tests/engine-en-faq-i18n-guard.test.ts` reports 0 violations (was 261)
2. **B-2**: `pnpm check` reports 1242 tests / 0 fail (was 1240; +2 new defensive guards)
3. **B-3**: `pnpm check` reports 0 claude-md-invariant-guard violations (was 1)
4. `RUN_BUILD_TESTS=1 pnpm test:build` reports `# tests 1263 / # pass 1263 / # fail 0` (or 1261+ if #707 still flaky)
5. `pnpm check` exit 0 (1242/0/0)
6. 3 atomic commits on `feature/p145-comprehensive-build-dep` branch
7. 3-way push: local = origin = github at single SHA, 0 divergence

---

## 11. References

- P144 ship memory: `memory/p144-p143-followup-shipped.md` §"Critical Pattern Discovery" (261 violations + text-mismatch class)
- P144 final review: 261 violations + Task 2.6 sonnet implementer's report
- P132 invariant guard: `tests/claude-md-invariant-guard.test.ts` — P145-B3's root cause (count drift)
- P131 single-test split: split P123/P124 composite guards — pattern reference for new guards
- P124 walker: `tests/_composite-i18n-walkers.ts` — pattern reference for B-2 guards
- P140b commit `a69e9f6`: root cause of engine↔translation text mismatch (FAQ 5→12+ expansion skipped zh translations + updated en text without syncing translations)
- CLAUDE.md 红线 7: `pnpm check` (commit 前过质量门禁)
