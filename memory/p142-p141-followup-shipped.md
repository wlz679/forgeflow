---
name: p142-p141-followup-shipped
description: P142 P141-followup Integration Batch — 4 candidates (A tsc gate + B dead code + C env-via + D a11y SVG) ship via 3 batches — 4 atomic commits + 1 plan amendment — 0/0 divergence 双端对齐
metadata:
  node_type: memory
  type: project
  originSessionId: 418d3310-cf99-41bb-8891-0a43084673c7
  modified: 2026-08-13T15:45:00.000Z
---

# P142 P141-followup Integration Batch — Ship Record (2026-08-13)

## 来源

- **Spec**: `docs/superpowers/specs/2026-08-13-p142-p141-followup-design.md` (commit `61efa04`)
- **Plan**: `docs/superpowers/plans/2026-08-13-p142-p141-followup.md` (commit `fdfcca1` + plan amend `2ecdeb9`)
- **Trigger**: P141 ship memory `memory/p141-ocr-batch-fix-shipped.md` §"Pre-existing 项目 gaps" — 4 candidates (A/B/C/D) flagged for follow-up
- **Skip**: candidate E (9 pre-existing build-dep failures) deferred to P143

## 拍板路径

- **A** tsc --noEmit gate: ✅ — pre-existing gap confirmed, baseline `tsc --noEmit` = 0 errors, ship as 1-line `package.json` change
- **B** codegen-customfn dead code: ✅ — `generateComparisonTable` (13 lines) + `key` param (1 line) surgical delete
- **C** sync-supabase-schema env-via: ✅ — URL parse + env-via `PGPASSWORD/PGHOST/PGUSER/PGDATABASE` (security tightening)
- **D** 6 components SVG aria-hidden: ✅ — 14 decorative SVG aria-hidden additions + parity test extension × 3 → × 9
- **E** (excluded): 9 pre-existing build-dep failures → P143

## Ship Stats

| 指标 | 值 |
| --- | --- |
| Implementation tasks | 4 (Task 1-4) + 1 plan amendment + 1 ship record = 6 |
| Subagent calls | 4 implementer (haiku) + 4 reviewer (haiku) + 1 ship record (inline) = 9 calls |
| Commits on `feature/p142-p141-followup` | 4 atomic + 1 plan amend (docs) = 5 commits beyond master `fdfcca1` |
| Master HEAD (pre-merge) | `fdfcca1` |
| Origin (Gitee) | `fdfcca1` (pre-merge) |
| Github (ForgeFlowKit) | `fdfcca1` (pre-merge) |
| 3-way divergence | 0/0 (target post-merge) |

## Commit Sequence (feature/p142-p141-followup vs master fdfcca1)

```
cca43bb fix(a11y): P142-B3-D 6 components decorative SVG aria-hidden + extend test guard
de6dd7e fix(security): P142-B2-C sync-supabase-schema env-via PGPASSWORD
e7abc11 refactor(codegen): P142-B1-B delete dead generateComparisonTable + drop unused key param
c414eeb feat(check): P142-B1-A tsc --noEmit gate (fail-first)
2ecdeb9 docs(plan): P142 Task 4 Step 4 amend — extend existing parity test (× 3 → × 9)
```

(Plan amendment `2ecdeb9` committed pre-Task 1 after pre-flight verification showed existing a11y-scattered parity test pattern.)

## 3 批产出总览

### Batch 1 — Cleanup (B1-A + B1-B, 2 commits)
- **B1-A** tsc --noEmit gate (`c414eeb`): 1-line `package.json` change; pre-existing 0-error baseline confirmed; gate fires on TS2322 (verified with temp test file); temp file removed before commit
- **B1-B** dead code removal (`e7abc11`): 1-file 15-line net deletion; `codegen-customfn.mjs --check` 0 drift across 8 engines

### Batch 2 — Security (B2-C, 1 commit)
- **B2-C** env-via security fix (`de6dd7e`): URL parse + env-via `PGPASSWORD/PGHOST/PGUSER/PGDATABASE`; manual `ps auxf` dry-run confirmed no plaintext password; invalid URL exits 1 via TypeError (security outcome identical to brief's "falls through to r.status check" wording)

### Batch 3 — a11y (B3-D, 1 commit)
- **B3-D** 6 components SVG aria-hidden (`cca43bb`): 14 decorative SVG additions across 6 files + test extension × 3 → × 9 in single for loop; `Header.astro` emoji spans (lines 42, 55) preserved untouched

## Lessons Learned (P142 专属)

1. **Plan amendment value**: Pre-flight reading of `tests/a11y-scattered.test.ts` revealed existing parity test pattern. Plan Task 4 Step 4 amended from "add new test" to "extend existing × 3 → × 9" — saved ~10 lines duplicate imports + structure. Pre-flight verification is worth the time.

2. **LSP stale diagnostic persistence (Lesson 4 from P141 again)**: After Task 2 implementer deleted `generateComparisonTable`, LSP reported TS6133 "declared but never read" at line 238:10 — false positive. `grep -n "generateComparisonTable" scripts/codegen-customfn.mjs` returned 0 matches (function genuinely deleted). `pnpm check` 1240/0/0 confirms. **Resolution**: trust `pnpm check` + `grep` over LSP stale diagnostics.

3. **Manual dry-run is non-negotiable for security changes**: Task 3 (env-via) primary verification was manual `ps auxf | grep secretpw` after spawning psql against unreachable localhost:5432. Automated tests (`node --check`, `pnpm check`) only verify syntax/behavior, not the security invariant (password not in process listing).

4. **Subagent reviewer scope discipline**: Task 1 reviewer flagged an Important "review-package scope contamination" — my BASE `fdfcca1` was too wide and included the plan amendment `2ecdeb9`. Reviewer correctly identified that this should have been a tighter `c414eeb^..c414eeb` scope. Lesson: for review packages, always use parent-of-implementer-commit as BASE, not the feature-branch-base.

5. **DONE_WITH_CONCERNS for observations, not defects**: Task 4 implementer reported DONE_WITH_CONCERNS with 3 observations (9 baseline failures unrelated to edits, ResultCard indent variant, Header chevron duplicates). All 3 were scope/file-shape observations, not implementation defects. Per skill, proceed to review when concerns are observations.

6. **Brief impreciseness ≠ defect**: Task 3 brief said invalid URL "falls through to existing r.status check" — actual behavior is `new URL()` throws TypeError before reaching that check. Implementer noted this as a Minor concern. Reviewer (and I) correctly classified as "accepted brief impreciseness, not a security hole" — same outcome (no psql spawn, no leaked creds).

## Pre-existing 项目 gaps (P142+ follow-up 候选)

- **C** env-via lacks automated regression test — manual dry-run only. **Future batch**: add `tests/secret-leak-guard.test.ts` (static scanner for `spawnSync` dbUrl patterns).
- **D** B3-D scoped to 6 target components. **Out of scope (3 additional)**: `Footer.astro` / `RelatedBlog.astro` / `RelatedTools.astro` already covered by P141-B2-T2 parity test (existing 3 files in × 9 loop) — but Footer/RelatedBlog/RelatedTools SVG content not re-audited. **Review separately if pattern proves valuable**.
- **D** parity test is weak check: `svgCount <= ariaCount` allows some SVGs without aria-hidden if at least one aria-hidden exists elsewhere (e.g., Header has 5 SVGs + 2 emoji spans = 7 aria-hiddens, satisfies `5 <= 7`). **Future hardening**: stricter per-SVG check (each `<svg>` line must contain `aria-hidden`).
- **A** `tsc --noEmit` baseline 0 errors confirmed at ship. Future pre-existing TS errors will fail gate (CLAUDE.md 红线 7 enforcement).
- **E** 9 pre-existing build-dep failures (CLAUDE.md invariant matrix + 8 P131/P124/P123 engine-render checks: #249, #525-532) — **deferred to P143** per scope decision.

## Branch Hygiene

- Branch `feature/p142-p141-followup` will ff-merge to master after ship.
- Feature branch will be retained for audit history (P141 / P140f-p3 pattern).
- P141 `feature/p141-ocr-batch-fix` branch also retained.

## Why

P142 closes 4 of 5 P141 follow-up gaps. Master health: 0 OCR-flagged P141 gaps remain. CLAUDE.md 红线 7 (commit 前过 pnpm check) now includes type-level gate. C3 residual exposure (P141-B3-T6) closed. a11y SVG coverage expanded from 3 to 9 components.

## How to apply

- P142-followup candidates in "Pre-existing 项目 gaps" section above; prioritize when opening P143 / P142+ batch.
- 9 pre-existing build-dep failures → P143 (separate audit batch, different problem class).
- LSP stale diagnostics pattern (Lesson 2) — verify with `pnpm check` + `grep` before treating as defect.
- Brief impreciseness pattern (Lesson 6) — reviewer's job is to identify, my job is to classify "accepted brief imprecision" vs "introduced defect".