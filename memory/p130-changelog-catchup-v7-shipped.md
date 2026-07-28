---
name: p130-changelog-catchup-v7-shipped
description: P130 closes the documentation gap for 4 P-series batches (P126 + P127 + P128 + P129) with a single M23.0 milestone section in `CHANGELOG.md`. Total commits +11 → 803. Follows P45 → P65 → P84 → P109 → P116 → P120 → P126 catch-up pattern.
metadata:
  type: project
---

# P130 CHANGELOG catch-up v7 Ship Log

## Summary

P130 closes the documentation gap for 4 P-series batches (P126 catch-up v6 itself + P127 walker fix + P128 coverage extension + P129 missing-translation assertion) with a single M23.0 milestone section in `CHANGELOG.md`. Follows the established P45 → P65 → P84 → P109 → P116 → P120 → P126 catch-up pattern. **3 of 4 batches are in-place modifications to P123/P124 (32nd/33rd build-dep suites from M22.0)**, hardening the composite i18n guards via walker triplet + assert promotion.

**Date:** 2026-07-28
**Batch ID:** P130
**Files touched:** 3 (CHANGELOG.md + memory + MEMORY.md)
**Commits covered:** P126 + P127 + P128 + P129 = 10 commits + 1 P130 itself = **+11 commits since P126 (792 → 803)**
**CHANGELOG delta:** ~80 lines (M23.0 section + header metadata update + Unreleased candidate updates)
**3-way sync:** `0	0` at HEAD

## What shipped

### M23.0 section in CHANGELOG.md (after M22.0, before M16.0)

Covers:
- **P126** CHANGELOG catch-up v6 itself (the prior catch-up that wrote M22.0) — retroactively documented in P130 since it shipped after P120's M21.0
- **P127** P123 latent false-positive fix — applied `buildSlugToFirstInput()` walker from P124 to P123, closes dead-key false-positive on `solopreneur-freelance-rate-calculator`
- **P128** FAQ + how_to_use coverage extension — P123/P124 modified in-place; `buildSlugToFaqCount()` + `buildSlugToHowToCount()` walkers extend probe coverage from `[0]` to ALL entries (~1179 per-language probes, ~2358 total)
- **P129** Missing-translation assertion + probe-regex fix — P123/P124 modified in-place; promotes `if (qMatch) push(...)` silent-skip path to `assert(qMatch, ...)`; extends probe regex from single-quote-only to alternation `'...' | "..."` (4 capture groups); fixes 16 silently-skipped keys across 8 engines

### Header metadata update
- "最后更新: P126 → P130 (catch-up v7)"
- "Total commits: 792 → 803 (+11 since P126 ship)"

### [Unreleased] candidate updates
- ~~P123 fix — apply `buildSlugToFirstInput()` walker~~ → ✅ P127 shipped
- ~~FAQ how_to_use[1+] coverage~~ → ✅ P128 shipped
- ~~CHANGELOG catch-up~~ → ✅ P130 shipped (this batch)
- New: tier-2 round 7 / input labels backfill / P123/P124 defensive audit

## Why this batch exists (P45 → P65 → P84 → P109 → P116 → P120 → P126 → P130 pattern)

The CHANGELOG is the **canonical release timeline** but is hand-edited only when P-series batches land. Without regular catch-up batches, the file drifts out of sync with reality.

P45 established the catch-up pattern: every 5-10 P-series batches (or when "Total commits" gap exceeds ~10), spawn a 1-commit docs-only batch to backfill CHANGELOG.

The catch-up gap analysis (updated):
| Catch-up | Coverage | Batches | Commits (notable) | Gap from prior |
|---|---|---|---|---|
| P45 | initial | — | 337 lines | — |
| P65 | M17.0 (P46-P64) | 19 | ~78 | (large era) |
| P84 | M18.0 (P66b-P83) | 19 | ~30 | ~30 |
| P109 | M19.0 (P84-P108) | 25 | 31 | ~10 |
| P116 | M20.0 (P110-P115) | 6 | 9 | ~10 |
| P120 | M21.0 (P117-P119) | 3 | 6 | ~6 |
| P126 | M22.0 (P121-P125) | 5 | 11 | +11 |
| **P130** | **M23.0 (P126-P129)** | **4** | **11** | **+11** |

P130 closes the 4-batch / 11-commit gap since P126.

## M23.0 theme: P123/P124 hardening trilogy (defense-in-depth extension)

All 3 non-catch-up batches (P127 + P128 + P129) modify P123/P124 in-place:
1. **P127** — `buildSlugToFirstInput()` walker applied to P123 (closes latent false-positive)
2. **P128** — `buildSlugToFaqCount()` + `buildSlugToHowToCount()` walkers added (coverage extended)
3. **P129** — `assert(qMatch, ...)` promotion + probe regex extension to 4-group alternation (closes silent-skip class)

The 3-walker pattern (P127 + P128) + assert promotion (P129) closes the **"silent skip on missing translation"** class of false positives that had been latent since P123 first shipped.

### Walker pattern cumulative (P127 + P128)

| Batch | Walker added | Probes before | Probes after |
|---|---|---|---|
| P127 | `buildSlugToFirstInput()` (zh-side) | 1 (probe dead key) | 1 (probe correct key) |
| P128 | `buildSlugToFaqCount()` + `buildSlugToHowToCount()` | FAQ q[0] + how_to_use[0] | FAQ q[0..N-1] + FAQ a[0..N-1] + how_to_use[0..M-1] |

P123/P124 now have 3 walkers each (P124 also has them via P128 mirroring).

### Audit findings (P127 + P128 + P129)

| Batch | Audit result | Defects caught |
|---|---|---|
| P127 | 100/100 zh engines: first input label correctly probed | 1 latent false-positive on `solopreneur-freelance-rate-calculator` (dead-key coincidence) |
| P128 | 100/100 engines: all FAQ + how_to_use entries probed | 0 broken pages (verified across 541 FAQ + 638 how_to_use entries) |
| P129 | 100/100 engines: assert promotes silent skip → loud fail | 16 silently-skipped keys across 8 engines (probe regex too narrow for double-quoted translation values) |

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` | 1200/0/0 ✓ (unchanged; docs-only batch) |
| P123 isolated test | 1/1 pass ✓ |
| P124 isolated test | 1/1 pass ✓ |
| CHANGELOG `grep '^## \['` | M23.0 present between M22.0 and M16.0 ✓ |
| CHANGELOG header metadata | "最后更新: P130", "Total commits: 803" ✓ |
| 3-way sync | `0	0` ✓ |
| Working tree | clean (only plan files untracked) ✓ |

## Ship drama

- **[P127] First-run FAIL (intended)** — walker pattern surfaced `solopreneur-freelance-rate-calculator` had a dead `input.skill.label` key whose zh value coincidentally appeared in `<meta name="description">`, giving P123 false-negative. Fixed via walker.
- **[P128] Single-line FAQ regex miss** — initial walker regex assumed multi-line `q: '...'` format; `solopreneur-revenue-projector` uses single-line. Fixed via `[\s\S]` or equivalent.
- **[P129] Architectural discovery mid-execution** — original P129 scope was just `assert(qMatch, ...)` promotion. Applying it surfaced 16 false-positive "missing translation" failures. Root cause: P128's probe regex was too narrow (single-quote only, didn't match double-quoted values containing apostrophes). User chose Option A (extend regex + complete P129) over Option B (re-format translations to single-quote). Root-cause fix.
- **[P130] Plan-spec discovery** — initial candidate pool listed P130 = "P121-P129 = 9 batches" based on P120 memory assumption. Pre-flight verification (git log + CHANGELOG header) revealed last catch-up was P126 (not P120), making actual coverage 4 batches (P126-P129). Scope corrected before plan write.

## P131+ candidates

- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based)
- **Single-test split** — extract P123/P124 into 5 narrower tests (last P128 leftover; better failure isolation)
- **CLAUDE.md additional invariants** — extend P125 to assert commit count, last-ship date, category names
- **P123/P124 defensive audit** — verify no remaining silent-skip paths post-P129 (3rd-party review)
- **Input labels i18n backfill** — verify scope; only 3 keys on cohort-retention flagged by P129; not yet a full-batch candidate