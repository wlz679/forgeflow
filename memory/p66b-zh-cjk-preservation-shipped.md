# P66b zh CJK Preservation Ship Log

## Summary

P66b adds the **symmetric CI guard** for Chinese category landing pages — closes the "over-cleansing" risk that P63 didn't catch. After P63, English pages are defended against CJK leak; P66b defends zh pages against accidental English fallback.

**Date:** 2026-07-25
**Batch ID:** P66b
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1170 → 1171 pass (+1 from new zh preservation test)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/category-zh-cjk-preservation.test.ts`** — build-dep test, walks 15 zh category landing pages in `dist/zh/<slug>/index.html`, asserts h1 + cross-link category text **contain CJK**. Mirrors P63 structure exactly (same RUN_BUILD_TESTS skip-guard, same `ensureBuilt()` via `spawnSync`, same `getCategorySlugs()` from `categories.ts`), but inverts the assertion direction (HAS-CJK instead of NO-CJK).

### Changed
- **[scripts] `tests/run.mjs` count 6 → 7 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated. The 7th suite is `category-zh-cjk-preservation`.

## Why this exists

P63 closed a user-reported bug where en pages for O/S/K showed bilingual strings (`Operations / 库存运营`). P63's guard asserts **en pages have no CJK**, defending against the original bug class.

But P63 doesn't defend against the **opposite regression**: a future refactor over-cleanses and accidentally removes CJK from zh pages too. Examples of how this could happen:
- Wrong `t()` lookup key → returns en fallback
- Hardcoded English in a page template bypasses i18n
- A `replace(/[一-鿿]/g, '')` sweep that affects zh by mistake
- New page template that defaults to en string

P66b provides symmetric defense-in-depth: if any zh category page loses its CJK h1 or cross-link text, the test fails in CI before the regression reaches users.

## TDD verification (defense-in-depth sanity check)

Per CLAUDE.md "Test must verify real behavior" — verified test actually catches the regression:

1. **Baseline PASS:** Run against current state → 1 pass / 0 fail (zh h1 already has CJK)
2. **Simulate regression:** `sed -i 's/运营 \/ 库存运营/Operations \/ Inventory/' dist/zh/operations-inventory/index.html` → run → 1 fail / 0 pass (catches it)
3. **Restore:** `cp /tmp/zh-ops-before.html` → re-run → 1 pass / 0 fail

Confirmed the test is not a silent-pass.

## CI integration

- Test runs under `pnpm test:unit` with `RUN_BUILD_TESTS=1` (already wired by P24)
- Adds ~30s to CI wall-clock (no pnpm build needed if dist/ already populated from earlier test)
- Current 30min timeout accommodates
- `tests/run.mjs` `--test-concurrency=1` already serializes 7 build-dep tests

## Coverage

- 15 zh category landing pages (`/zh/<slug>/index.html`)
- Both `<h1>` text and cross-page `<a href="/zh/<slug>/">` category-link text
- Defends against DOM structure changes via `h1-missing` / `cross-link-missing` checks (same defense pattern as P63 — no silent pass on broken structure)

## P66+ candidate

- **Multi-script leak guard (P66c+)** — Cyrillic/Arabic/Hebrew etc. on en pages (P63 currently only scans CJK). Would parallel P63+P66b structure but with broader unicode regex.
- **zh cross-page h2 preservation** — current test only checks category landing pages. Tool pages like `/zh/solopreneur-mrr-calculator/` also have zh h1/h2 that should be defended.
- **Carryover cleanup (P66a+)** — `.superpowers/sdd/task-4-report.md` SDD scratch + `docs/superpowers/plans/2026-07-23-p61-m-category-fixes.md` plan archive + `memory/p60-engines-cost-subdir-fix-shipped.md` ship memory commit.