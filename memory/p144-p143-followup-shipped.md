---
name: p144-p143-followup-shipped
description: P144 P143-followup — 4 build-dep failures closed partially (#528/#529 fully; #525/#530 for 16 of 100 engines) + 6 doc drift items (M1-M6) + run.mjs off-by-one — 8 atomic commits + 2 plan amends on `feature/p144-p143-followup` (off master 1497615) — 261 remaining en-faq violations deferred to P145
metadata:
  node_type: memory
  type: project
  originSessionId: 418d3310-cf99-41bb-8891-0a43084673c7
  modified: 2026-08-17T10:00:00.000Z
---

# P144 P143-followup — Ship Record (2026-08-17)

## 来源

- **Spec**: `docs/superpowers/specs/2026-08-14-p144-p143-followup-design.md` (commit `9766ed9`)
- **Plan**: `docs/superpowers/plans/2026-08-14-p144-p143-followup.md` (commit `85913aa`, amended `dd307b2` + `60c79b6`)
- **Trigger**: P143 ship memory §"Pre-existing 项目 gaps (P143+ follow-up 候选)" + P143 final review (fable) doc drift items M1-M8

## 拍板路径

User chose **Option A — FULL** (recommended) at scope decision time; then **Option A — expand** twice mid-execution (Task 2.5 for carrying-cost, Task 2.6 for 13 engines); then **Option A — ship P144 + defer remaining 261 to P145** after Task 2.6 surfaced a 4th layer of pre-existing failures.

- **B-1** title regex accepts both quote styles: ✅ (closes #528, #529 — 100/100 engines)
- **B-2** add 16 FAQ keys for `ai-image-cost-calculator.faq.7-14`: ✅ (closes ai-image-cost scope of #525, #530)
- **B-3** add 2 + fix 7 FAQ keys for `carrying-cost-calculator.faq.4-11` (mid-exec add): ✅ (closes carrying-cost scope of #525, #530)
- **B-4** add faq.4 + author zh for faq.5-11 across 13 engines (mid-exec add): ✅ (closes 13 more engines' scope of #525, #530)
- **A-3** `tests/run.mjs:73` "46" → "47": ✅ (off-by-one)
- **A-1** doc drift sync (M1-M6): ✅ (6 doc edits across 5 files)
- **2 plan amendments** mid-execution: ✅ (one per Task 2.5 + Task 2.6)

## Ship Stats

| 指标 | 值 |
| --- | --- |
| Implementation tasks | 6 (Task 1 + Task 2 + Task 2.5 + Task 2.6 + Task 3 + Task 4) + 2 docs (plan amend × 2) + 1 ship record = 9 |
| Subagent calls | 6 implementer (3 haiku + 2 haiku + 1 sonnet) + 1 reviewer (haiku) + 1 final whole-branch review (fable, pending) = 8 calls (estimated) |
| Commits on `feature/p144-p143-followup` | 8 (Task 1-4 + Task 2.5 + Task 2.6 + 2 plan amends) |
| Master HEAD (pre-merge) | `1497615` |
| Origin (Gitee) | `1497615` (pre-merge) |
| Github (ForgeFlowKit) | `1497615` (pre-merge) |
| 3-way divergence | 0/0 (target post-merge) |
| Tests | pnpm check 1240/0/0; RUN_BUILD_TESTS=1 1263/some-fails/zh-faq-passes/261-en-faq-violations-remaining |

## Commit Sequence (feature/p144-p143-followup vs master 1497615)

```
8da4517 fix(guard): P144-B1 title regex accepts both single- and double-quoted values
9cf2471 fix(i18n): P144-B2 add 16 FAQ keys for ai-image-cost-calculator faq.7-14
dd307b2 fix(plan): P144 amend add Task 2.5 carrying-cost FAQ gap (mid-exec)
561e154 fix(i18n): P144-B3 add 2 + fix 7 FAQ keys for carrying-cost-calculator faq.4-11
60c79b6 fix(plan): P144 amend add Task 2.6 13-engine FAQ gap closure (mid-exec)
ea187d4 fix(i18n): P144-B4 close pre-existing FAQ gaps across 13 engines
8b35dfc fix(tests): P144-A3 run.mjs skip-mode off-by-one '46' → '47'
3d4b29c docs(meta): P144-A1 sync 6 doc drift items from P143 final review + CHANGELOG last-update
```

(Plus final ship record commit + INDEX/MEMORY updates at merge time.)

## Pre-flight Findings (key insight)

| Failure | Surface cause | Real root cause |
|---|---|---|
| #528 + #529 (titles) | "65 title entries missing" | **Quote-style mismatch**: P140a commit `1d8943c` (2026-08-05) used double quotes for 65 B/C-class titles. Test regex required single quotes only. Content EXISTS — only quote style differs. 0 apostrophe risk verified. |
| #525 + #530 (FAQ) ai-image-cost | "FAQ migration deferred" | **Incomplete content propagation**: P140b commit `a69e9f6` (FAQ 5→12+ expansion, 2026-07-31) added 8 new FAQs to engine but never propagated zh translations for faq.7-14. 16 keys authored. |
| #525 + #530 (FAQ) carrying-cost | Task 2 raised this concern | **Same P140b pattern for `carrying-cost-calculator`**: 2 missing keys (faq.4) + 12 zh fields empty. 16 keys fixed. |
| #525 + #530 (FAQ) 13 more engines | Task 2.5 raised this concern | **Same P140b pattern for 13 more engines** (cart-abandonment, cohort-retention, content-marketing-roi, coupon-attribution, email-campaign-roi, fulfillment-cost, funnel-value, ltv-by-channel, reorder-point, revenue-projector, roas, stockout-cost, supplier-scorecard). 28 new keys + 174 zh fields authored. |
| run.mjs:73 | "off-by-one" | **CLAUDE.md drift**: P143-B commit `364cb11` updated CLAUDE.md to 47 build-dep suites, but skip-mode message hardcoded "46". 1 line fix. |
| 6 doc drift items M1-M6 | per P143 final review | Various count/date drift in P143 batch's docs. Fixed. |

## Critical Pattern Discovery (261 remaining violations)

After Task 2.6 closed 13 engines + ai-image-cost + carrying-cost, the `engine-en-faq-i18n-guard.test.ts` STILL failed with **261 violations across ~87 other engines**.

Root cause is NOT missing translation keys. Root cause is **engine↔translation en text mismatch** — the page template uses `engine.faq` directly for EN rendering (P140b T5 simplified design), so the HTML reflects engine source en text, but translations.ts may have slightly different en text (e.g., `×` vs `x`, formatting differences). The test asserts `translations.en === html.en` which fails when they diverge.

These 261 violations are **pre-existing** across ~87 engines and were NOT part of P143/P144 deferred list. They are a separate P140b-era class of failure.

**User decision (Option A — ship+defer)**: Ship P144 with current state (closes 16 of 100 engines' FAQ issues + 2 build-dep failures fully) and defer 261 remaining violations to P145 with comprehensive plan + defensive guard.

## Lessons Learned (P144 专属)

1. **Pre-flight investigation scope was FUNDAMENTALLY INCOMPLETE** — Each Task implementer discovered 1 more layer of the same P140b FAQ gap pattern:
   - Pre-flight: 4 build-dep failures (#525/#528/#529/#530)
   - Task 2: ai-image-cost FAQ gap (1 engine)
   - Task 2.5: carrying-cost FAQ gap (1 engine)
   - Task 2.6: 13 more engines FAQ gap
   - Post-Task 2.6: 261 more engines en-faq violations (different class — text mismatch not key missing)
   
   **Root cause lesson**: P140b FAQ 5→12+ expansion (commit `a69e9f6`) was applied inconsistently across engines. P140b's T5 design (use `engine.faq` directly for EN) created text-mismatch vulnerability that the en-faq test now catches.

2. **Defensive guard candidates for P145**:
   - Walk all engines, assert `translations.faq.N.q` and `translations.faq.N.a` exist for all N in 0..engine.faq.length-1
   - Walk all engines, assert `translations.faq.N.{q,a}.en === engine.faq[N].{q,a}` (exact match)
   - Both guards would have caught P140b's inconsistency earlier

3. **First-attempt BLOCKED handling worked** (P143 lesson repeated): Both Task 2.5 and Task 2.6 implementers correctly surfaced mid-execution discoveries + reverted/blocked when needed. Plan amendment cycles worked smoothly.

4. **Mid-execution scope expansion pattern** (recurring from P141/P142/P143): Each implementer's diligence surfaced new pre-existing failures. User chose Option A (expand) twice but then Option A (ship+defer) for the 4th layer. **Lesson**: pre-flight should run `RUN_BUILD_TESTS=1 pnpm test:build` + scan ALL test failures + assert ALL engines' completeness before scope commitment.

5. **Quote-style drift (new pattern)**: P121 (2026-07-27) designed the title test with single-quoted values (canonical at that time). P140a (2026-08-05) introduced double-quoting for 65 engines. Test fix (Task 1) preserves P140a's intent and tolerates future engines with apostrophes.

## Pre-existing 项目 gaps (P144+ follow-up 候选)

- **#525 + #530 (FAQ) — 261 remaining en-faq violations across ~87 engines**: Engine↔translation en text mismatch. Defensive guard + bulk-fix in P145.
- **Defensive orphan slug guard** (P143/E deferred): Tests for any future engine without translation keys. Add to P145.
- **Defensive quote-style guard**: Tests for any future engine using inconsistent quote style in title entries. Add to P145.

## Branch Hygiene

- Branch `feature/p144-p143-followup` retained for audit history (P141/P142/P143/P140f-p3 pattern)

## Why

P144 partially closes the P143-deferred build-dep failures: 2 of 4 (#528/#529) fully closed + 1 of 4 (#525/#530) partially closed (16 of 100 engines). 261 en-faq violations remain — different failure class (engine↔translation text mismatch) deferred to P145.

## How to apply

- **P145 candidate**: comprehensive en-faq fix + defensive guards. Walk all 100 engines, fix all engine↔translation text mismatches, add `engine-faq-coverage-guard` and `engine-faq-text-match-guard`.
- **Mid-execution scope expansion pattern**: pre-flight MUST run `RUN_BUILD_TESTS=1 pnpm test:build` + parse ALL test failures + assert completeness BEFORE scope commitment, not just the originally-flagged subset.
- **Quote-style drift**: tolerate both quote styles in i18n tests going forward.
- **Plan amendment cycle**: Task 2.5 + Task 2.6 amendments via plan-amend + spec-amend worked cleanly. Pattern reusable.
