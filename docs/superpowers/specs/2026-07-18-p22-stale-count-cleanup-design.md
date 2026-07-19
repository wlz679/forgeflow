# P22 Stale Count Cleanup — Design

> **Status:** Approved (brainstorming 2026-07-18)
> **Baseline:** `0164edb` (P21 ship commit)
> **Scope:** Single batch commit touching 2 test files (3 assertion updates: 98 → 100) + memory append + 3-way sync. All INLINE.
> **Deferred (P23+ candidates):** ~~10 env-dependent Clerk/Supabase test fails (require real auth credentials or mock infra); extracting `EXPECTED_ENGINE_COUNT` shared constant.~~ — **Closed 2026-07-19 by P22b + P26a + P28 audit**:
> - ~~10 env-dep~~ — cascade misattribution, same as P22b/P23/P23b spec. Closed by P26a (P2a ToolCard `listingPages` array fix).
> - ~~constant extraction~~ — shipped in P22b (`tests/lib/engine-count.ts` static const + drift guard).
> - Per P28 audit: spec description predates P22b ship; this Deferred line was carried over without re-verification.

## 1. Goal

Close 3 of 13 pre-existing `pnpm check` test failures by updating stale count assertions (98 → 100) to match the actual engine count locked at 100 by P16 milestone. The other 10 failures are out of scope (require auth infrastructure).

## 2. Scope

### Single commit (`P22-3`): 3 line edits across 2 files

| File | Line | Current | New |
|---|---|---|---|
| `tests/ab-split.test.ts` | 51 | `'getAllEngines() returns 98 engines after import'` | `'getAllEngines() returns 100 engines after import'` |
| `tests/ab-split.test.ts` | 53 (assertion body) | `expect(engines.length).toBe(98);` | `expect(engines.length).toBe(100);` |
| `tests/ab-split.test.ts` | 57 | `'aggregated tools array has 98 entries'` | `'aggregated tools array has 100 entries'` |
| `tests/ab-split.test.ts` | (related assertion body) | `.toHaveLength(98)` | `.toHaveLength(100)` |
| `tests/internal-links.test.ts` | 6 | `'all 98 tools have relatedTools entry'` | `'all 100 tools have relatedTools entry'` |
| `tests/internal-links.test.ts` | (related assertion body) | `.length === 98` or `.toBe(98)` or similar | `.length === 100` / `.toBe(100)` |

**Note on test lines**: Verified `tests/ab-split.test.ts:51` and `:57` are the `test(name, ...)` descriptions; the corresponding assertion bodies will need parallel updates discovered during plan execution (Step 1 read-full-file pre-flight will reveal their exact form).

### Memory append (`P22-4`)

- Append `## P22` section to `memory/p17-i18n-backfill-shipped.md` (continues the P-series housekeeping memory thread; this file holds P19/P20/P21 already)
- Append 1-line index entry to `memory/MEMORY.md`

### Out of scope (P23+ candidates)

1. **10 env-dependent test fails** — Clerk mount renders (580-585), Supabase privacy-policy sections (766-767), BaseLayout sync-init bundle (103-104). All require real `PUBLIC_CLERK_PUBLISHABLE_KEY` + `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` in `.env` or CI secrets. Not shippable in single session without external auth setup.
2. **Extract `EXPECTED_ENGINE_COUNT` constant** — single source of truth for engine count assertions. Only worth adding if a 4th stale-count fail appears or another batch like P22b adds engines. YAGNI for now.
3. **Wire `tests/run.mjs` to skip env-dependent tests when env missing** — graceful degradation for local dev without Clerk/Supabase keys. Different concern from P22 (test correctness vs test runner ergonomics).

## 3. Architecture + Implementation Strategy

**Approach chosen: Single batch commit (B from brainstorm alternatives).** Why: 3 trivial one-line fixes, no new files needed, test names already encode what they assert (bisect works without granular commits). Matches P21 YAGNI bar.

**Implementation**:
1. Read full file for each of the 2 test files (pre-flight at execution time, not in spec — see Plan Step 1).
2. Edit each stale assertion literal from 98 to 100 (3 occurrences total).
3. Run `node tests/run.mjs` to verify the 3 asserts now pass and total fails drops from 13 → 10.
4. Commit.

**Test verification gate**: `node tests/run.mjs` output should show `# pass` increase by 3 and `# fail` decrease by 3. The remaining 10 fails remain unchanged (env-dependent baseline).

**Risk analysis**:
- **Zero behavioral risk**: assertions are read-only checks against `Object.values(engines).length` from `src/core/engines/registry.ts`. Increasing the literal 98 to 100 aligns the test expectation with the actual engine count (verified `find src/engines -name "*.ts" ! -name "index.ts" | wc -l` = 100).
- **Zero blast radius**: only 2 test files modified, no source code changes.
- **Single source of drift surface**: the literal 100 in test files can drift again if P-series adds more engines — but spec §2 deferred the constant extraction to P23+ (acceptable risk; the alternative is broader scope).

## 4. Global Constraints

1. **3-way sync required at end** — both `origin` (gitee: wlz679/calcKit) and `github` (github: wlz679/forgeflow) must reflect final commits.
2. **Pre-commit gate** — `pnpm check` runs end-to-end; P22-3 will fail the env-dependent 10 tests in local dev. Use `SKIP_PRECOMMIT_CHECK=1` if gating locally, OR run only `node tests/run.mjs -- --test-name-pattern="98|100"` to focus on the 3 affected asserts. CI gate (with real Clerk/Supabase secrets) should be green.
3. **raw-key invariant** — unchanged (P22 doesn't touch `src/i18n/translations.ts`).
4. **byte-identical invariant** — N/A (no generated artifacts).
5. **No new dependencies** — no new packages, no new files outside `tests/*.test.ts` + `memory/*.md`.

## 5. Task Class Rationale (per `memory/subagent-driven-overhead.md`)

| Task | Class | Why |
|---|---|---|
| P22-1 (this spec) | INLINE | design doc |
| P22-2 (plan) | INLINE | implementation plan |
| P22-3 (3 fixes) | MECHANICAL | 3 line edits, 1 commit, verification = `node tests/run.mjs` shows 13→10 fails |
| P22-4 (memory + sync) | INTEGRATION | memory writes + 3-way push + SHA backfill amend |

All INLINE per P21-1/2/3/4 + P19-3/4/5 + P20-4 precedent (≤10 tool calls per task).

## 6. Success Criteria

| Criterion | Verification |
|---|---|
| Spec committed | `git log --oneline -1` shows new spec commit |
| Plan committed | `git log --oneline` shows plan commit after spec |
| Task commits land | `git log --oneline 0164edb..HEAD` shows ≥2 commits (1 spec + 1 plan + 1 fix + 1 memory = 4 expected, final HEAD is post-amend) |
| Test count drop | `node tests/run.mjs` shows `# pass` increases by exactly 3 (from 1064 to 1067) and `# fail` decreases by exactly 3 (from 13 to 10) |
| remaining 10 fails unchanged | Same 10 test numbers (103, 104, 580-585, 766, 767) — confirms only stale-count asserts were fixed |
| 3-way sync verified | `git rev-list --left-right --count origin/master...master` AND `github/master...master` both = `0	0` pre and post push |
| Memory updated | `memory/p17-i18n-backfill-shipped.md` has new `## P22` section; `memory/MEMORY.md` has new index line |

## 7. Self-Review (per brainstorming checklist step 7)

1. **Placeholder scan**: No `TBD`/`TODO`/vague qualifiers. Line numbers in §2 verified via `grep -rn "98 engines\|98 entries\|98 tools" tests/`. Plan Step 1 will reveal exact assertion body lines (spec leaves them to executor pre-flight for accuracy).

2. **Internal consistency**: Scope (§2) matches success criteria (§6); task classes (§5) match global constraints (§4); out-of-scope (§2 end + §3 risk) is explicitly bounded to P23+.

3. **Scope check**: Single-subject (3 trivial assertion updates), one implementation plan. No decomposition needed.

4. **Ambiguity check**: "98 → 100" is explicit; "60 coverage at HEAD" verification is exact; the 10 env-dependent baseline is explicit so future readers know what remains. The "P22-3 assertion body lines" question is resolved by "Plan Step 1 reads full file pre-flight".

**Self-review verdict**: No changes needed. Ready for user review → writing-plans.
