---
name: p60-engines-cost-subdir-fix-shipped
description: "P60 ship log — saas-pricing-planner moved from valuation/ to cost/ subdir + P60-fix closed 4 stale doc refs; closes E-category subset of P59-style drift class"
metadata:
  node_type: memory
  type: project
  originSessionId: 1340a8e8-69ff-44b3-8675-315ee93df7ea
  modified: 2026-07-23T05:48:00.000Z
---

# P60 — Engine subdir fix (Cost E-category, saas-pricing-planner) — shipped 2026-07-23

> 3 SHAs on `master`: `2952614` (P60 atomic refile, 8 files / +449 / −10) + `586eccf` (P60-fix, 2 files / +4 / −4, closes 4 stale doc refs caught by final review) + `d6d8c25` (P60+ M1 close, 1 file / +3 / −3, closes 3 P59-era stale refs in src/data/INDEX.md).
> Pnpm check `1163/0/0` (unchanged across all 3 commits); `pnpm build` exit 0 (not re-run after doc-only commits); rev-list 3-way sync `0\t0` on (origin, github).
> Closes E-category subset of the same drift class P59 closed for D-category. Self-contained, no followup candidates within P60 (P60+ candidate surfaced: equity-dilution drift — see Section 8).

## What shipped

### 1. 1 E-category engine relocated (T1)

`git mv src/engines/valuation/saas-pricing-planner.ts → src/engines/cost/saas-pricing-planner.ts` (similarity 100%).

Pre-state: `src/data/tools/cost.ts` registered `solopreneur-saas-pricing-planner` with `categoryId: 'E'` but the engine file lived in `valuation/` from P-series batch-time filing. After T1: `cost/` has 5 engines, `valuation/` has 9 (was 10 pre-P60, 11 pre-P59).

### 2. Sub-barrel imports synced (T1)

- `src/engines/valuation/index.ts`: removed 1 import (10 → 9 engines).
- `src/engines/cost/index.ts`: added 1 import (4 → 5 engines).

### 3. Test file import path updated (T1)

`tests/saas-pricing-planner.test.ts` L3: `valuation/saas-pricing-planner.ts` → `cost/saas-pricing-planner.ts`.

### 4. INDEX.md docs synced (T2)

**`src/engines/INDEX.md`** — 8 logical edits across 4 spots + 2 fix spots:
1. Top-level subdir diagram (L31): `cost/ (4)` → `(5)`; `valuation/ (10)` → `(9)`.
2. §cost/ section: header `(4 engines)` → `(5 engines)` + new row for `saas-pricing-planner`.
3. §valuation/ section: header `(10 engines)` → `(9 engines)` + saas-pricing-planner row removed.
4. Count summary table (L302): `cost/ | 4` → `5`; `valuation/ | 10` → `9`. Final sum = 100 ✓.
5. Footer note (L279): updated to also mention saas-pricing-planner's move (in addition to P59 freelance move).

**`src/data/INDEX.md`** — 3 spots (1 in T2, 2 in P60-fix):
- L143 narrative: `engines/ 中归 valuation/` → `engines/ 中归 cost/`.
- L123 table: `cost/ (4) + valuation/ (1, saas-pricing-planner)` → `cost/ (5) + valuation/ (0)`.
- L207 table: same delta.

### 5. codegen-examples.mjs drift surfaced + fixed (T3)

`scripts/codegen-examples.mjs` L85 had `subdir: 'valuation'` for the saas-pricing-planner entry. P60 T1 implementer flagged this as P59-step-6 risk (scripts-with-hardcoded-paths); T3 fixed in 1 atomic line change.

Pre-edit: `subdir: 'valuation'` count = 10; `subdir: 'cost'` count = 4.
Post-edit: `subdir: 'valuation'` count = 9; `subdir: 'cost'` count = 5.

### 6. P49 guard unaffected by design

`scripts/check-engine-count-by-category.mjs` reads ToolMeta by `categoryId` from `src/data/tools/index.ts` barrel, not by physical subdir. Subdir move is structurally invisible to P49. T4 verified PASS.

### 7. Atomic commits + 3-way push

- Commit `2952614` (P60 atomic refile, 8 files / +449 / −10, 1 rename at 100% similarity). The 449-insertion bulk is the 439-line plan doc committed alongside per P59 convention.
- Commit `586eccf` (P60-fix, 2 files / +4 / −4) — closes the 4 stale doc refs caught by P60 final reviewer.
- Pre-push: `0\t0` on (origin, github).
- Both remotes fast-forwarded cleanly, no cron race fired, no P44 hook bypass needed.
- Final rev-list: `0\t0` ✓.
- `--follow` history preserved: `git log --follow src/engines/cost/saas-pricing-planner.ts` shows `2952614 → c58f4e4 (P17b) → a23c0a4 (P16-5) → 3f92558 (subdir consolidation) → db616a8 ... → 4802507 (v3 rewrite origin)`.

## Key design decisions

- **T1 BLOCKED → fix subagent pattern (P53a-style)** — T2 originally BLOCKED correctly when implementer caught my brief's arithmetic error ("valuation/=10 unchanged" claim — actually post-P60 valuation/=9). T2-fix subagent applied 2 additional edits (section header + count summary row). This is the **2nd time in P-series** that an implementer caught a brief-vs-reality drift and BLOCKED rather than auto-fix. The protocol worked.
- **Final reviewer caught 4 doc-only stale refs** that per-task reviewers missed. Per skill protocol, ONE fix subagent dispatched with all 4 findings (not 4 separate fixers). P60-fix commit closed them in 2 files / 4 lines.
- **M1 (P59-era `valuation/ (13)` at L137/L146/L221) intentionally deferred** — pre-existing P59 drift, not introduced by P60. P60+ candidate for next audit batch. Documented in P60-fix commit message.
- **Use `git mv`** — preserves `--follow` history to v3 origin `4802507`. If we'd done delete+create, that history would have been broken.
- **Plan + T2 brief arithmetic error** — my T2 brief said "(was 11 with it, now 10 without)" but actual pre-P60 state was "(was 10 with it, now 9 without)". Implementer caught and BLOCKED. Lesson reinforces P52's plan spec validation: **verify pre-state counts before writing briefs, don't assume**.

## pnpm check

`# tests 1163 / # pass 1163 / # fail 0` (P58+P59 baseline, unchanged count). P60 adds no new tests.

Pre-commit hook bypassed via `SKIP_PRECOMMIT_CHECK=1` per P48 standing rule (P53b-era pre-commit hook rerun races).

## 3-way sync

Final state at HEAD `586eccf`:

```
586eccf docs(p60-fix): close 4 stale references found by P60 final review
2952614 feat(p60): merge saas-pricing-planner from valuation/ to cost/ subdir
157e661 merge: GH Action LiteLLM cron (049a825) racing with P59 push
049a825 chore(pricing): sync from LiteLLM + regen customFn + staticExamples (2026-07-23)
40cc225 feat(p59): merge 3 D-category engines from valuation/ to freelance/ subdir
c997193 feat(p58): backfill 64 missing blogs + flip T2 strict + close stale '30' copy
```

`git rev-list --left-right --count origin/master...github/master` → `0\t0`. No cron race fired, no P44 bypass needed (clean push window for both 2952614 and 586eccf).

## Final reviewer verdict

`Production Readiness: GREEN. Critical: 0. Important: 2 (closed by P60-fix). Minor: 3 (M1 deferred to P60+, M2 process compliance, M3 plan-spec validation issue). P60 verdict: SHIPPED.`

## How to apply

Pattern: **1-file version of P59** — refile that respects P49 layer + T6-style late consumer discovery + final-review catches doc-only stale refs. Apply when:

- An audit reveals an engine registered with `categoryId: 'X'` in `src/data/tools/<cat>.ts` but physically placed in `src/engines/<other-cat>/`.
- The drift-guard script (`scripts/check-engine-count-by-category.mjs`) locks categoryId counts and does NOT need changes for the refile.
- Pre-flight grep finds a small consumer set (1 R + 4-6 M).

Specifically for subdir moves: **always grep the entire repo for filename + slug references** before starting — search consumers include:
1. `src/engines/<old-cat>/` — git mv
2. `src/engines/<old-cat>/index.ts` — remove 1 import
3. `src/engines/<new-cat>/index.ts` — add 1 import
4. `tests/*.test.ts` for the moved slug — update import path
5. `src/engines/INDEX.md` — sync per-eng listing sections + count summary
6. `src/data/INDEX.md` — sync narrative + tables describing data-barrel→engines-subdir mapping
7. **`scripts/*.mjs` / `scripts/*.ts` that hardcode engine paths** — codegen-examples, codegen-customfn, build-og-images, smoke-html5
8. Doc comments inside moved .ts files (verified clean for P60)

P60 lessons learned (extending P59's 4-step model):
- **Add step 6 (scripts-with-hardcoded-paths) explicitly** to the plan brief upfront.
- **Verify pre-state counts** before writing plan briefs (P52 lesson reinforced — caught at T2 BLOCKED).
- **Final reviewer is the net for cross-file doc drift** that per-task reviewers miss. Always run it.

## Cross-refs

- **P59 D-category audit + refile** — `memory/p59-engines-freelance-subdir-merge-shipped.md`. P60 is the 1-file version of P59; same drift class, different category letter.
- **P49 engine-count-by-category drift guard** — unaffected by design (locks categoryId, not subdir).
- **P52 test-infra hardening** — P22b ESM silent-skip trap; T1 implementer caught a plan-vs-reality drift (analogous to P52 T1 blocker).
- **P53a-ts-sweep + p1-fixes** — TS gate became landable mid-batch; P60 has no TS errors by construction (only edits are git mv + import paths + doc text).
- **P48 standing rule** — pre-push fetch + rev-list + SKIP_PRECOMMIT_CHECK + cron-race protocol. Applied cleanly for P60 (no cron race fired); bypass hook NOT needed.
- **P44 standing rule** — pre-push hook stale-cache bypass (`git -c core.hooksPath=/dev/null push`). Not needed for P60.
- **P57 + P58 blog coverage completion** — different drift class (blog post existence vs. subdir organization). P60 refile is structural, P57/P58 was content.
- **Pre-existing Vite warnings** in `pnpm build` output (CSS `file` unsupported + chunk-size): NOT introduced by P60; carry as known noise.
- **M1 candidate** — **CLOSED in P60+ commit `d6d8c25`**. 3 P59-era stale refs in `src/data/INDEX.md` (L137/L146/L221) updated.

## 8. P60+ M1 close + equity-dilution drift discovery (commit `d6d8c25`)

User approved closing the M1 candidate in same batch. Plus discovered a 4th drift while closing M1.

### M1 close (3 edits to `src/data/INDEX.md`)

| Line | Before (P59-era) | After (post-P60) |
|---|---|---|
| L137 | `valuation/ (13 — equity-dilution + 12 others)` | `valuation/ (9)` |
| L146 | `10 entries vs engines/valuation/ 13 engines — 差 3: course-pricing, email-list-revenue, project-profitability (在 tools/freelance.ts)` | `10 entries vs engines/valuation/ 9 engines — 差 1: saas-pricing-planner (在 tools/cost.ts, P60 移到 engines/cost/)` |
| L221 | `valuation/ (10 of 13)` | `valuation/ (9 of 10)` |

All 3 edits are doc-only, zero functional change. pnpm check unchanged.

### Equity-dilution drift discovery (P61 candidate, NOT auto-fixed)

While updating L221, discovered `equity-dilution-calculator.ts` lives at `src/engines/investment/` but is registered in `src/data/tools/valuation.ts` with `categoryId: 'C'`. This means:
- tools/valuation.ts has 10 entries; engines/valuation/ has only 9 files (the 10th, equity-dilution, is in engines/investment/).
- L221 notation `(9 of 10)` honestly reflects this drift.

This is a **4th drift in the same drift class** P59/P60 closed for D/E categories. Specifically: an engine file is physically in `engines/investment/` but its ToolMeta `categoryId` says `'C'` (Valuation & Exit). The fix requires deciding:
1. Is equity-dilution's categoryId correct? (Should it be 'C' or 'F' — Investment & Real Estate?)
2. Should the file move to `engines/valuation/` to match categoryId, OR should the ToolMeta registration move to categoryId 'F' to match file location?

**Status**: Not auto-fixed in this batch (out of P60 scope; user did not authorize extending P60). Marked P61 candidate.

### P60 batch totals (all 3 commits)

| Commit | Files | +/− | Purpose |
|---|---|---|---|
| `2952614` | 8 | +449 / −10 | P60 atomic refile (1 R + 6 M + 1 plan) |
| `586eccf` | 2 | +4 / −4 | P60-fix: 4 stale doc refs from final review |
| `d6d8c25` | 1 | +3 / −3 | P60+: 3 P59-era stale refs in src/data/INDEX.md |
| **Total** | **11** | **+456 / −17** | (3 commits, 3-way `0\t0`, no cron race, no P44 bypass) |