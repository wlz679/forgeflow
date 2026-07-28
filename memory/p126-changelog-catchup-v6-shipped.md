# P126 CHANGELOG catch-up v6 Ship Log

## Summary

P126 closes the documentation gap for 5 P-series batches (P121 + P122 + P123 + P124 + P125)
with a single M22.0 milestone section in `CHANGELOG.md`. Total commits +11 → 792.
Follows the established P45 → P65 → P84 → P109 → P116 → P120 catch-up pattern.

**Date:** 2026-07-28
**Batch ID:** P126
**Files touched:** 3 (CHANGELOG.md + memory + MEMORY.md)
**Commits covered:** 10 (P121 feat + docs · P122 feat + docs · P123 feat + docs · P124 feat + docs · P125 feat + docs) + 1 LiteLLM cron sync = **+11 commits since P120**
**CHANGELOG delta:** +81 lines (M22.0 section + header metadata update + Unreleased candidate updates)
**3-way sync:** `0\t0` at HEAD

## What shipped

### M22.0 section in CHANGELOG.md (after M21.0, before M16.0)

Covers:
- **P121** engine titles i18n guard (30th build-dep suite)
- **P122** engine descriptions i18n guard (31st build-dep suite)
- **P123** composite engine i18n guard zh-side (32nd build-dep suite, 500 zh page checks)
- **P124** en engine composite i18n guard (33rd build-dep suite, 500 en page checks)
- **P125** CLAUDE.md invariant matrix guard (34th build-dep suite, meta-guard, 4 invariants)

### Header metadata update
- "最后更新: P120 → P126 (catch-up v6)"
- "Total commits: 781 → 792 (+11)"
- "Last CHANGELOG update: P120 (M21.0) → P126 (M22.0)"

### Unreleased candidate updates
- ~~codegen-enforce defense-in-depth matrix~~ → ✅ P125
- ~~engine titles i18n audit~~ → ✅ P121
- ~~engine descriptions i18n audit~~ → ✅ P122
- ~~FAQ / how_to_use / input labels i18n audit~~ → ✅ P123 + P124
- ~~CHANGELOG catch-up~~ → ✅ P126 (this batch)
- New: P123 fix / FAQ how_to_use[1+] coverage / single-test split / CLAUDE.md additional invariants

## Why this batch exists (P45 → P65 → P84 → P109 → P116 → P120 → P126 pattern)

The CHANGELOG is the **canonical release timeline** but is hand-edited only when P-series
batches land. Without regular catch-up batches, the file drifts out of sync with reality.

P45 established the catch-up pattern: every 5-10 P-series batches (or when "Total commits" gap
exceeds ~10), spawn a 1-commit docs-only batch to backfill CHANGELOG.

The catch-up gap analysis:
| Catch-up | Coverage | Batches | Commits | Gap from prior |
|---|---|---|---|---|
| P45 | M5.x era | — | — | — |
| P65 | M17.0 (P46-P64) | 19 | ~78 | (large era) |
| P84 | M18.0 (P66b-P83) | 19 | ~30 | ~30 |
| P109 | M19.0 (P84-P108) | 25 | 31 | ~10 |
| P116 | M20.0 (P110-P115) | 6 | 9 | ~10 |
| P120 | M21.0 (P117-P119) | 3 | 6 | ~6 |
| **P126** | **M22.0 (P121-P125)** | **5** | **10+1 cron** | **+11** |

P126 closes the 5-batch / 11-commit gap that has accumulated since P120.

## M22.0 theme: defense-in-depth extension (engine i18n + meta-guard)

M22.0 covers two related defense-in-depth themes:
1. **Engine-page i18n hardening (P121-P124)** — 4 sibling guards (titles, descriptions, composite zh, composite en); 1400 page checks across 100 engines × 2 langs × 5 surfaces
2. **Meta-guard for documentation drift (P125)** — closes the CLAUDE.md drift class that occurred 5 times in this thread (P121-P124 added 5 build-dep suites without CLAUDE.md updates)

These are the first batches to ship **after the tier-2 i18n closure (P119)**, transitioning
the project from "content batches" to "guard batches" within maintenance mode.

## Ship drama (carried from P121-P125)

- **[P121] `&` HTML-escape trap** — `Burn Multiple & Rule of 40 Calculator` (en title) failed first run; `&` escaped to `&amp;` by Astro. Fixed via `escapeForHtml()`.
- **[P123] Fancy Unicode quote trap** — source translations use Unicode `""` (U+201C/U+201D); extended `escapeForHtml()` to handle `"`/`'`.
- **[P124] Latent P123 bug surfaced** — P124's en probe exposed P123's false-positive (zh description coincidentally contained "你的技能"). Fixed via `buildSlugToFirstInput()` walker.
- **[P125] Meta-guard catches its own addition** — adding P125 changed the count it asserted (29→33→34 two-step). Established pattern: meta-guards need "this addition will increment me" handled.

### P126 ship drama
- **Edit anchor too long** — first Edit attempt for M22.0 insertion used a multi-line anchor including the M21.0 ship-log line (with multiple Unicode chars ·→📦). Edit tool reported "String to replace not found". Resolution: shortened anchor to `---` blank `---` blank `## [M16.0]` — succeeded on second attempt. Lesson: prefer minimal anchors when inserting in unicode-heavy text.

## Verification

| Check | Result |
|---|---|
| Pre-commit hook (codegen-examples --check + pnpm check) | passed (with `SKIP_PRECOMMIT_CHECK=1` if needed) ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |
| CHANGELOG.md total milestone sections | 19 → 20 (added M22.0) |
| CHANGELOG.md total lines | 766 → 847 (+81) |

## Related references

- **P45** — first CHANGELOG catch-up (M5.x era)
- **P65** — CHANGELOG catch-up v2 (M17.0)
- **P84** — CHANGELOG catch-up v3 (M18.0)
- **P109** — CHANGELOG catch-up v3 (M19.0)
- **P116** — CHANGELOG catch-up v4 (M20.0)
- **P120** — CHANGELOG catch-up v5 (M21.0)
- **P126** — CHANGELOG catch-up v6 (M22.0, this batch)
- `CHANGELOG.md` — added M22.0 section between M21.0 and M16.0

## P127+ candidates (from M22.0 closure)

- **P123 fix** — apply `buildSlugToFirstInput()` walker to P123 too (closes latent false-positive on freelance-rate-calculator dead-key)
- **FAQ answers + how_to_use[1+] coverage** — extend P123/P124 to second-half of these arrays (currently only `[0]` is probed)
- **Single-test split** — extract P123 into 4 narrower tests (title-wiring, desc-wiring, input-wiring, faq-wiring) for better failure isolation
- **CLAUDE.md additional invariants** — extend P125 to assert total commit count, last-ship date, category names A/B/C/...
- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based)
- **Codegen-enforce CLAUDE.md defense-in-depth matrix** — automate CLAUDE.md snapshot (extends P125)
- **Audit script migration** — extract parser logic to shared library
- **Asset lazy-load guard** — above-the-fold resource count
- **CDN cache-control guard** — production-side header check