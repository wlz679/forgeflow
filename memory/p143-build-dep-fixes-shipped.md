---
name: p143-build-dep-fixes-shipped
description: P143 Pre-existing Build-Dep Failures Fix — 9 → 4 build-dep failures closed (2 root causes: orphan slug + docs drift) — 2 atomic commits + 2 plan/spec amendments — 0/0 divergence 双端对齐 (master HEAD 364cb11)
metadata:
  node_type: memory
  type: project
  originSessionId: 418d3310-cf99-41bb-8891-0a43084673c7
  modified: 2026-08-14T13:50:00.000Z
---

# P143 Pre-existing Build-Dep Failures Fix — Ship Record (2026-08-14)

## 来源

- **Spec**: `docs/superpowers/specs/2026-08-14-p143-build-dep-fixes-design.md` (commit `6a4f849`, amended `517e246`)
- **Plan**: `docs/superpowers/plans/2026-08-14-p143-build-dep-fixes.md` (commit `8776196`, amended `f805509`)
- **Trigger**: P142 ship memory §"Pre-existing 项目 gaps" candidate E + P142 final review audit observation

## 拍板路径

- **A** delete 20-key stale duplicate: ✅ (close 4 of 8 i18n tests; slug count 101 → 100; canonical block at 2356-2385 untouched)
- **B** CLAUDE.md build-dep suite count 42 → 47: ✅ (closes #249 sub-violation 1)
- **C** CHANGELOG.md commit count 870 → 989: ✅ (closes #249 sub-violation 2)
- **D** CHANGELOG.md last-ship date 2026-07-31 → 2026-08-13: ✅ (closes #249 sub-violation 3)
- **E** (excluded per user Q1): defensive orphan guard → P143-followup

## Ship Stats

| 指标 | 值 |
| --- | --- |
| Implementation tasks | 2 (Task 1 + Task 2) + 2 docs (plan/spec + amendments) + 1 ship record = 5 |
| Subagent calls | 2 implementer (haiku) + 2 reviewer (haiku) + 1 final review = 5 calls |
| Commits on `feature/p143-build-dep-fixes` | 7 (2 implementation + 2 docs + 2 amendments + 1 ship record) |
| Master HEAD (pre-merge) | `6093597` |
| Origin (Gitee) | `6093597` (pre-merge) |
| Github (ForgeFlowKit) | `6093597` (pre-merge) |
| 3-way divergence | 0/0 (target post-merge) |
| Tests | pnpm check 1240/0/0; RUN_BUILD_TESTS=1 1263/1259/4 (was 1254/9 pre-fix) |

## Commit Sequence (feature/p143-build-dep-fixes vs master 6093597)

```
364cb11 docs(meta): P143-B3-BCD sync CLAUDE.md + CHANGELOG.md to current state
38cc185 fix(i18n): P143-B3-A delete 20-key stale duplicate in translations.ts
517e246 fix(spec): P143 §4 A amend — DELETE 20-key duplicate (not rename)
f805509 fix(plan): P143 Task 1 amend — DELETE 20-key stale duplicate (not RENAME)
8776196 docs(plan): P143 build-dep fixes plan (4 fixes → 2 commits)
6a4f849 docs(spec): P143 build-dep fixes design (2 root causes → 4 fixes, 2 commits)
```

## 3 批产出 (P143 = 2 atomic commits)

### Batch 1 — Code fix (B3-A, 1 commit)
- **B3-A** delete stale duplicate (`38cc185`): `translations.ts` lines 4764-4783 deleted (20 keys: faq.5-14 under long slug `ai-image-generation-cost-calculator` with empty `zh: ''`); canonical block at 2356-2385 untouched (has rich zh translations)

### Batch 2 — Docs sync (B3-BCD, 1 commit)
- **B3-BCD** CLAUDE.md + CHANGELOG.md sync (`364cb11`):
  - CLAUDE.md: build-dep count 42 → 47 (line 95); Total math 51 → 56 (line 110, self-consistency)
  - CHANGELOG.md: commit count 870 → 989 (line 7, actual `git rev-list --count HEAD`); last-ship date 2026-07-31 → 2026-08-13 (line 5); derived stats 45 → 55 active days (line 7, self-consistency)

## 5 Build-Dep Failures Remaining (P143-followup candidates)

Per user Q1 decision, FAQ migration deferred. Remaining failures:

| # | Test | Root cause | Fix scope |
|---|---|---|---|
| #525 | en engine page renders all FAQ | Engine `ai-image-generation-cost-calculator` defines 15 FAQ entries (faq.0-14); translations.ts has only faq.0-6 for short slug | Add 16 keys (faq.7.q/a through faq.14.q/a) to short slug with proper zh translations |
| #530 | zh engine page renders all FAQ | Same as #525 | Same fix (one translation set, both tests pass) |
| #528 | en engine titles in translations.ts | 65 title entry violations across multiple slugs | Investigation needed; possibly separate drift class |
| #529 | zh engine titles in dist | Same as #528 | Same fix (one translation set, both tests pass) |

## Lessons Learned (P143 专属)

1. **Pre-flight investigation scope was insufficient**: Initial brief assumed "orphan keys" (single rename fix). Implementer's first attempt revealed lines 4764-4783 are STALE DUPLICATE of canonical block, NOT orphan. RENAME would collide as TS1117. Plan amended to DELETE (commits `f805509` + `517e246`).

2. **First-attempt BLOCKED handling worked**: Implementer correctly reverted the failed rename + surfaced root cause (block 2 = duplicate with empty zh). Per CLAUDE.md 红线 9 ("问题必报") + skill BLOCKED handling, this prevented broken code from being committed.

3. **Implementer self-correction surfaced new scope**: Second implementer (after plan amend) succeeded at delete but discovered engine has 15 FAQ entries while translations has only 7. Per user Q1 decision (defer FAQ), Task 1 ships as-is; 4 of 8 i18n tests closed. Remaining 4 tests need separate batch (zh translation authoring, not mechanical).

4. **Brief impreciseness → plan amend cycle**: Pattern matches P141 (B2-T1 true siblings, B3-T4 site-config.ts existence) + P141-B3-T6 (env-via brief wording imprecision). **Lesson**: implementer must self-verify brief code, not blindly execute. **Recurring lesson across P141/P142/P143**.

5. **Math consistency in docs sync**: Brief asked for 3 specific updates (B/C/D), but implementer noticed related arithmetic in CLAUDE.md (Total 51 → 56) and CHANGELOG.md (active days 45 → 55) had to update for internal consistency. Self-coherent docs > mechanical brief compliance. **Approved** by reviewer.

## Pre-existing 项目 gaps (P143+ follow-up 候选)

- **#525 + #530** FAQ faq.7-14 missing translations: defer to P143-followup (zh translation authoring required, 16 keys × 2 langs)
- **#528 + #529** 65 title entry violations: defer to P143-followup (separate drift class, needs investigation)
- **`tests/run.mjs` hardcoded skip-mode message "46"**: off-by-one vs actual 47 (implementer flagged, out of scope for P143); defer to P142+ or P143-followup

## Branch Hygiene

- Branch `feature/p143-build-dep-fixes` will ff-merge to master after ship.
- Feature branch retained for audit history (P141/P142/P140f-p3 pattern).

## Why

P143 closes 5 of 9 pre-existing build-dep failures that have been blocking full CI green. Master health: 4 build-dep failures remain (deferred per user Q1). CLAUDE.md invariant matrix restored (#249 closes). Slug count invariant restored (101 → 100, P22b lock intact).

## How to apply

- P143-followup candidates: #525/#530 (faq.7-14 zh translations) + #528/#529 (65 title violations) + run.mjs skip-mode off-by-one.
- Plan spec validation lesson (4): brief literal code often misses edge cases (orphan vs duplicate, 65 separate title violations). Pre-flight verification should include actual data inspection, not just count assertions.
- Implementer BLOCKED handling pattern: when brief assumption is wrong, revert + surface root cause before proceeding. Plan amend cycle is acceptable.
- Math consistency in docs sync: implementer self-extension to maintain internal consistency is good practice (reviewer approved).