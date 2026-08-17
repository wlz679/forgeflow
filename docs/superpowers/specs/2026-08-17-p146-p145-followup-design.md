# P146 — P145-followup (Comprehensive Build-Dep Closure) (Design)

> **Status:** READY for `superpowers:writing-plans`. P146 closes 2 flaky tests + adds 1 build-dep guard + 5 zh strings QA review. All 3 sub-tasks user-approved (Option C: 1A + 2A + 3A).
>
> **Origin:** P145 ship memory §"P145-followup candidates" + carry-forward from P144 §"audit observations". 2026-08-17.

---

## 1. Goal

Close 2 flaky build-dep failures (#707 + #249) + add 1 build-dep FAQ guard (HTML rendering check) + 5 zh strings QA review.

**Single outcome**: `RUN_BUILD_TESTS=1 pnpm test:build` reports 0 failures consistently (both individual + full run); 5 zh strings reviewed + fixed.

| # | Item | Current state |
|---|---|---|
| #707 | Header sync menu test | Passes individually; fails in full test:build (race condition) |
| #249 | CLAUDE.md invariant matrix | Passes individually; fails in full test:build (race condition) |
| Text-match guard v2 | New build-dep test | Verify engine text appears in HTML (definitive, build-dep) |
| 5 zh strings QA | Content review | 4 flagged by P144 Task 2.6 + 1 supplier-scorecard |

---

## 2. Approach — 1 PR, 3 atomic commits (MECH class)

User chose **Option C** (1A + 2A + 3A).

```
Branch: feature/p146-p145-followup (off master 6e24187)
  │
  ├── Commit 1: fix(test): P146-S1 add --test-concurrency=1 to test runner
  │              (closes #707 + #249 if race condition; 1 line in tests/run.mjs)
  │
  ├── Commit 2: feat(guard): P146-S2 add build-dep engine-faq-html-render-guard
  │              (text-match guard v2 with HTML rendering check; 1 new test file)
  │
  └── Commit 3: docs(i18n): P146-S3 fix 5 zh strings from P144 Task 2.6 QA review
                 (manual review + author corrections; src/i18n/translations.ts)
```

Plus ship record + INDEX + MEMORY bump (Task 4, inline).

**Subagent calls**: 6 calls (3 implementer + 3 reviewer) + 1 fabble final review = 7 total.

---

## 3. Architecture

### Branch & ship strategy
- Single feature branch `feature/p146-p145-followup` carries 3 commits (P141-P145 pattern).
- After all 3 commits:
  ```
  git push origin feature/p146-p145-followup
  git checkout master && git merge --ff-only feature/p146-p145-followup
  git push origin master
  git push github master --force-with-lease  (only if cron drift)
  ```
- Pre-push always: `git fetch origin && git fetch github && git rev-list --left-right --count origin/master...master github/master...master` (P43/P44 lesson).

### Sub-task 1 (S1) — Concurrency=1 fix
- **Target**: `tests/run.mjs` (or package.json test script)
- **Approach**: Add `--test-concurrency=1` to test runner invocation
- **Rationale**: Node.js test runner parallel mode can cause port conflicts + shared state. Sequential execution eliminates both.
- **Risk**: Tests take longer (~2x), but reliable. Acceptable for build-dep tests which are slow anyway (full run: 5min).

### Sub-task 2 (S2) — Build-dep HTML render guard
- **Target**: New file `tests/engine-faq-html-render-guard.test.ts`
- **Approach**: Build-dep test that:
  1. Reads engine source for all 100 engines
  2. Reads translations.ts for all FAQ entries
  3. Asserts engine.en text appears in dist HTML (after build)
  4. Catches: P140b-style engine updates that don't sync to translations (real user-visible bugs)
- **Why build-dep**: Must check actual HTML rendering, not raw source (which misses HTML injection paths)
- **Differentiator from text-match v1**: v1 compared raw source (false positives); v2 checks HTML (definitive)
- **Risk**: Adds ~5min to full test:build (build step); non-build-dep runners skip via `RUN_BUILD_TESTS` gate

### Sub-task 3 (S3) — 5 zh strings QA review
- **Target**: `src/i18n/translations.ts` (5 specific entries)
- **Strings to fix**:
  1. `cart-abandonment-cost-calculator.faq.8.a` — en source has escaped quote, zh interpretation may be off
  2. `email-campaign-roi-calculator.faq.9.a` — similar issue
  3. `ltv-by-channel-calculator.faq.11.a` — complex multi-touch attribution paragraph
  4. `supplier-scorecard-calculator.faq.11.a` — TCO formula notation (commas vs periods in math)
- **Approach**: Manual review per string, replace with proper zh translations
- **Risk**: Low — content quality improvement, not behavior change

---

## 4. Components (sub-task detail)

### S1 — Concurrency=1 fix

**File**: `tests/run.mjs` (or package.json)

**Change**: Add `--test-concurrency=1` to test runner invocation. Possible approaches:
- Option A: Modify `tests/run.mjs` to pass `--test-concurrency=1` to node
- Option B: Rename `tests/run.mjs` to remove orchestration, use `node --test --test-concurrency=1` directly

Recommended: **Option A** (minimal change, preserves existing orchestration)

**Verification**:
- Pass criterion: `RUN_BUILD_TESTS=1 pnpm test:build` reports 0 failures (consistent)
- Run 3 times to verify flakiness eliminated
- Cost: ~2x test time (acceptable)

### S2 — HTML render guard (build-dep)

**File**: Create `tests/engine-faq-html-render-guard.test.ts`

**Implementation outline**:
```typescript
test('every engine FAQ en text appears in dist HTML', () => {
  // 1. Walk src/engines/**/*.ts → extract (slug, idx, field, engineText)
  // 2. Walk src/i18n/translations.ts → extract (slug, idx, field, transText)
  // 3. ensureBuilt() — pnpm build if dist/ missing
  // 4. For each (slug, idx, field) where engine has entry:
  //    - Read dist/en/{slug}/index.html
  //    - Compute escapeForHtml(unescape(engineText))
  //    - Assert HTML contains it
  // 5. Catches: engine updates that don't sync to translations (real user-visible bug)
});
```

**Why build-dep**: This is the definitive test. The v1 text-match guard (source-level) had false positives; build-dep HTML render is the ground truth.

**Trade-off**: ~5min added to `RUN_BUILD_TESTS=1` workflow. Acceptable.

**Walker pattern**: Use `buildTranslationKeyRegex` from `tests/_composite-i18n-walkers.ts` (lazy alternation handles `\\\"` properly).

**Verification**:
- Pass criterion: 1/1 pass after P146-S2
- For new engine additions without translation: fails with clear error

### S3 — 5 zh strings QA review

**File**: `src/i18n/translations.ts` (5 specific entries)

**Strings to fix** (per P144 Task 2.6 implementer's QA concerns):

1. **`cart-abandonment-cost-calculator.faq.8.a`** — Source en has `\\"Did you forget something?\\"` (escaped quote in double-quoted engine source). The zh author interpreted as "subject line + body copy" advice. May need refinement.

2. **`email-campaign-roi-calculator.faq.9.a`** — Source en has `\\"FREE\\"` pattern. zh generic anti-spam tactics. May need refinement.

3. **`ltv-by-channel-calculator.faq.11.a`** — Complex multi-touch attribution paragraph. positioning-based weighting (40% first-touch, 40% last-touch, 20% spread). May need wording refinement.

4. **`supplier-scorecard-calculator.faq.11.a`** — TCO formula notation. en uses `unit_price × order_volume + (defect_cost × defect_rate) + ...` with periods; zh may use commas. Numerically equivalent but visually divergent.

**Approach**: Manual review by fluent Chinese speaker. Each string:
- Read en source from engine
- Read current zh translation
- Decide if zh accuracy/completeness is acceptable
- If not, author replacement

**Constraints**: Time-bounded to ~30 min per string. If a string is too complex to fully revise, leave a note in ship record for future QA pass.

**Verification**:
- Pass criterion: 5 strings reviewed (with fixes or shipping rationale per string)
- `pnpm check` exit 0 (no syntax breakage from changes)

---

## 5. Data Flow

P146 has minimal data flow changes (mostly test + content tweaks).

### S1 — test runner change
```
tests/run.mjs: spawn 'node', ['--test', '--test-concurrency=1', ...testFiles]
  ↓ node:test runner serial execution
  ↓ no port conflicts / shared state between tests
  ↓ deterministic test results
```

### S2 — HTML render guard
```
src/engines/**/*.ts (engine source)
  ↓ walker extracts (slug, idx, field, engineText)
src/i18n/translations.ts (translations source)
  ↓ walker extracts (slug, idx, field, transText)
dist/en/{slug}/index.html (build-dep output)
  ↓ for each engine entry, assert HTML contains escapeForHtml(unescape(engineText))
  ↓ if not: violation (engine update not synced to translations)
```

### S3 — zh string fixes
```
src/i18n/translations.ts (5 specific entries)
  ↓ manual review per concern
  ↓ author replacement zh
  ↓ commit + pnpm check
```

---

## 6. Error Handling

### S1 — concurrency fix
- **Test fails for non-flaky reason**: After applying fix, investigate root cause. If concurrency=1 doesn't fix, escalate to P146-followup.
- **Test duration increases significantly**: Acceptable for build-dep; non-build-dep unaffected.

### S2 — HTML render guard
- **HTML out of sync with source**: Re-run build. If issue persists, escalate.
- **Walker regex breaks on entries with `\\\"`**: Use lazy alternation `((?:[^"\\]|\\.)*?)` per P145 lesson.

### S3 — zh string fixes
- **Translator unavailable**: Defer flagged strings to P146-followup with note in ship record.
- **Time overflow per string**: Apply minimum-viable fix (keep current zh if reasonable, document concern).

---

## 7. Testing

### Per-commit verification

| Commit | Verification | Pass criterion |
|---|---|---|
| **1 (S1)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep -E "^# (tests\|pass\|fail)"` (run 3×) | `tests 1263 / pass 1263 / fail 0` consistently |
| **2 (S2)** | `RUN_BUILD_TESTS=1 pnpm test:build 2>&1 \| grep "engine-faq-html-render"` | 1/1 pass |
| **2 (S2)** | `pnpm check 2>&1 \| tail -3` | `tests 1241 / pass 1241 / fail 0` |
| **3 (S3)** | `pnpm check 2>&1 \| tail -3` | `tests 1241 / pass 1241 / fail 0` (no breakage) |

### Per-PR cross-cutting (before ff-merge)
```bash
RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | grep -E "^# (tests|pass|fail)"
# Expected: tests 1263 / pass 1263 / fail 0

git fetch origin && git fetch github
git rev-list --left-right --count origin/master...master github/master...master
# Expected: 0	0
```

---

## 8. Out of scope (deferred)

- **3 ai-image-cost orphan keys**: P144 Task 2 already aligned them (verified pre-flight: 15 entries synced)
- **#707 + #249 root cause investigation (if not race condition)**: Escalate to P146-followup if S1 doesn't fix
- **Text-match guard v1 cleanup**: The deleted v1 file remains in git history; no action needed
- **P146-followup candidates**: 5 zh strings deeper QA; full engine↔translation audit across all 100 engines

---

## 9. Ship Path

### Day 0 (today, 2026-08-17)
1. ✅ `git checkout -b feature/p146-p145-followup` (already created)
2. (Next) `superpowers:writing-plans` creates plan from this spec
3. (Next) `superpowers:executing-plans` executes Commit 1 → Commit 3 with subagent-driven development

### Per-commit
1. Dispatch implementer subagent (MECH class, single review depth)
2. Dispatch spec-verifier subagent
3. Apply fix if any
4. `pnpm check` (always) + `RUN_BUILD_TESTS=1 pnpm test:build` (S1 + S2)
5. Commit with conventional message
6. `git push origin feature/p146-p145-followup`
7. After all 3 commits: ff-merge to master, 3-way push

### Day N (after Commit 3 ship)
- Update `memory/p146-p145-followup-shipped.md` (P145 ship memory pattern)
- Update `MEMORY.md` index line
- Update `docs/superpowers/plans/INDEX.md` last-update line
- Mark P146 branch as `keep` (audit history)

---

## 10. Acceptance criteria

1. **S1**: `RUN_BUILD_TESTS=1 pnpm test:build` reports 0 failures consistently (run 3×)
2. **S2**: HTML render guard 1/1 pass; `pnpm check` 1241/0/0
3. **S3**: 5 zh strings reviewed — fixes shipped OR rationale documented per string
4. 3 atomic commits on `feature/p146-p145-followup` branch
5. 3-way push: local = origin = github at single SHA, 0 divergence
6. `pnpm check` exit 0 after all 3 commits

---

## 11. References

- P145 ship memory: `memory/p145-comprehensive-build-dep-shipped.md` §"P145-followup candidates"
- P144 ship memory: `memory/p144-p143-followup-shipped.md` §"audit observations" O4 (run.mjs defer'd)
- P145 Task 2.6 subagent report: 5 zh strings flagged with quality concerns
- P145 §"Lessons Learned" #2: text-match guard overcounts ~1478 false positives
- `tests/_composite-i18n-walkers.ts`: walker pattern reference (lazy alternation)
- CLAUDE.md 红线 7: `pnpm check` (commit 前过质量门禁)
