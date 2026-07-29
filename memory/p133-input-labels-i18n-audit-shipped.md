---
name: p133-input-labels-i18n-audit-shipped
description: P133 adds a 39th build-dep suite (input-labels-i18n-audit) that walks all 100 engines × inputs[] and asserts each `tools.<slug>.input.<name>.label` key exists in BOTH en + zh in translations.ts. Audit result: 500/500 OK — 0 actual content gaps (P129 walker bug was a probe-regex false positive, not real gaps). P132 invariant guard auto-caught the resulting 38→39 + 815→817 drift in the same commit. Closes P129 walker scope question definitively.
metadata:
  type: project
---

# P133 Input Labels i18n Audit Ship Log

## Summary

P133 closes the question raised by P129 walker bug ("how many engines actually have missing input.label translations?") with a **definitive 500/500 OK audit**. The audit script was promoted to a permanent build-dep test that protects against future drift in this dimension.

**Date:** 2026-07-29
**Batch ID:** P133
**Files touched:** 4 (1 new test + CHANGELOG.md + CLAUDE.md + tests/run.mjs)
**Commits:** 1 (`33678a0`, +149/-5)
**Build-dep suite count:** 38 → 39 (1 new)
**pnpm check:** 1205/0/0 ✓ (was 1204, now +1 for new test)
**3-way sync:** `0	0` ✓

## Why this batch exists (audit-only closure path)

P129 walker bug surfaced the class that 3 cohort-retention input.labels were "silently skipped" by the probe regex — but did NOT prove the keys were actually missing. Two-phase plan:

- **Phase 1 audit** (~30 min): walk 100 engines × inputs[], probe each label key en/zh
- **Phase 2 conditional**: if gap > 0 → backfill; if gap = 0 → audit-only closure

**Phase 1 result: 500/500 OK. Phase 2 = audit-only closure.** No backfill needed.

## Audit findings (definitive)

| Metric | Count |
|---|---|
| Engines scanned | 100 |
| Input.label probes attempted | 500 |
| **OK** (en + zh both present, non-empty) | **500 (100%)** |
| Missing en only | 0 |
| Missing zh only | 0 |
| Missing both | 0 |

**Distribution of input counts across engines:**
- 2 inputs: 5 engines
- 3 inputs: 14 engines
- 4 inputs: 31 engines
- 5 inputs: 17 engines
- 6 inputs: 15 engines
- 7 inputs: 9 engines
- 8 inputs: 4 engines
- 9 inputs: 2 engines
- 10 inputs: 1 engine
- 11 inputs: 1 engine
- 15 inputs: 1 engine

## False-positive investigation (P129 walker bug)

Initial naive audit (using filename as slug) reported 5 "missing" keys, all in `ai-image-generation-cost-calculator`. Root cause:

| Layer | File path / Field | Value |
|---|---|---|
| Engine file path | `src/engines/ai-cost/ai-image-generation-cost-calculator.ts` | (filename) |
| Engine `slug:` field | `solopreneur-ai-image-cost-calculator` | (shorter!) |
| Translation key | `tools.solopreneur-ai-image-cost-calculator.input.provider.label` | matches slug, not filename |

Filename ≠ slug in this one engine. Naive audit built expected key from filename → 5 false positives. Fixed audit to extract actual `slug:` field → 0 gaps.

This means the P129 walker bug was a **probe-regex issue** (regex too narrow to match `**Total commits:**` markup), not actual content gaps. The "3 cohort-retention input.labels" P129 surfaced were similarly false positives — those keys exist in translations.ts.

## Permanent test design

`tests/input-labels-i18n-audit.test.ts` is a 39th build-dep suite. Structure follows P131 sibling pattern:
- P23b skip-guard (`process.exit(0)` if `RUN_BUILD_TESTS` unset)
- node:test framework + node:assert
- Recursive walk of `src/engines/**/*.ts` (skip `index.ts` barrels)
- Tolerant regex parsers (handles bold markup `**field:**` and escaped quotes)
- Aggregate violations, fail with clear per-key error message
- Assert engine count = 100 (cross-checks `tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT`)

**Key design choice**: extract slug from `slug:` field, NOT from filename. Same defensive lesson from the initial false-positive run.

## P132 invariant guard self-test (meta-earning its keep)

Adding the new test file triggered the **P132 invariant guard** to surface 2 drifts in the same commit:

```
CLAUDE.md / CHANGELOG.md invariant matrix drift (2 violation(s)):
  - Build-dep suite count drift: CLAUDE.md says 38, reality (tests/run.mjs skip-mode) says 39
  - CHANGELOG total commit count drift: says 815, git rev-list --count HEAD returns 817
```

Both closed inline:
- `CLAUDE.md` build-dep count: 38 → 39 (line 77 + 90)
- `CLAUDE.md` Defense-in-Depth total: 46 → 47 (line 90)
- `CHANGELOG.md` commit count: 815 → 817 (line 7)

**P132 invariant guard is now self-defending**: any future build-dep test addition auto-caught + drift auto-closed in the same commit.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` | 1205/0/0 ✓ |
| Isolated P133 test | 1/1 pass (35ms) ✓ |
| Isolated invariant guard | 1/1 pass (236ms) ✓ |
| Both together | 2/2 pass (508ms) ✓ |
| 3-way sync (origin + github) | `0	0` ✓ |

## P134+ candidates (carried from P132 ship + P133)

- **P123/P124 defensive audit** — 3rd-party review of `tests/_composite-i18n-walkers.ts` walker + regex; P133's tolerant regex could inform P123's `extractAllEngineSlugs()` simplification
- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based) — needs brainstorming for architectural decision
- **CHANGELOG catch-up v9** — when next gap exceeds ~5 commits
- **Fix `03-commit-precheck` hook exit-code parsing** — `exit=null` false-positive continues to waste commit cycles (P131 catch-up + P132 + P133 all hit it)
- **Input label BACKFILL deferral note** — P133 confirms no current gap; new `input-labels-i18n-audit` test catches future regressions

## Lessons

1. **Filename ≠ slug is a real drift class** — at least 1 engine has them diverged. The audit script's initial filename-based approach caught this immediately, but only because I noticed the false-positive cluster was concentrated in 1 engine. Future audits should always extract `slug:` field.
2. **P129 walker bug was a probe-regex false positive** — the 3 cohort-retention input.labels it flagged were not actually missing; the probe regex was too narrow. P133's tolerant regex + slug-from-field audit confirms 0 real gaps. Lesson: when a probe reports "silent skip", first verify whether the keys actually exist before assuming content gaps.
3. **Audit-only closure is a valid ship pattern** — P133 didn't need backfill because Phase 1 found 0 gaps. Ship the audit + guard, defer backfill indefinitely. Same pattern as P121/P122 (engine titles + descriptions i18n guard: audit result was 100/100 already-translated).
4. **Meta-guards earn keep on first run** — P132 invariant guard caught its own drift in P133's first run (the new test bumped suite count 38→39 + commit count 815→817). This is the design goal: future drift is auto-caught without manual audit.
5. **Promote audits to permanent tests** — P133's audit script lived 30 minutes in `scripts/.scratch/` before becoming a permanent test. Pattern: when an audit reveals a drift class with future-risk (new engine additions, new input fields), promote it to CI guard rather than throwing the script away.