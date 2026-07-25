# P68 Tool-page en CJK Guard Ship Log

## Summary

P68 closes the page-level CJK guard matrix at the h1 layer. en tool pages now defended against CJK leak (symmetric to P67b's zh tool pages preservation).

**Date:** 2026-07-25
**Batch ID:** P68
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1172 → 1173 pass (+1 from new en tool leak guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/tool-en-cjk-guard.test.ts`** — build-dep test, walks `dist/en/solopreneur-*/index.html` (100 en tool pages), asserts each `<h1>` **contains NO CJK**. Mirrors P67b structure (same RUN_BUILD_TESTS skip-guard, same `ensureBuilt()` via `spawnSync`, same CJK regex), but for en pages with inverted assertion.

### Changed
- **[scripts] `tests/run.mjs` count 8 → 9 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated. The 9th suite is `tool-en-cjk-guard`.

## Page-level CJK matrix — now complete at h1 layer

| Page type | lang | Assertion | Test | Suite # |
|---|---|---|---|---|
| Category page | en | NO CJK in h1 + cross-link | `category-en-cjk-guard` (P63) | 6 |
| Category page | zh | HAS CJK in h1 + cross-link | `category-zh-cjk-preservation` (P66b) | 7 |
| Tool page | en | **NO CJK in h1** | **`tool-en-cjk-guard` (P68)** | **9** |
| Tool page | zh | HAS CJK in h1 | `tool-zh-cjk-preservation` (P67b) | 8 |

**Coverage at h1 layer:** 100% of landing-page user-facing titles defended bidirectionally.

## Why this exists

P67b closed the zh tool page over-cleansing gap. But the symmetric en tool page CJK leak was unaddressed — a future refactor could inject CJK into an en tool title (e.g. wrong fallback chain, hardcoded bilingual string like "Operations / 库存运营" that the P62 fix didn't catch because the bug was only in category pages).

P68 mirrors P67b's structure exactly to provide symmetric defense for en tool pages. The two tests together form a complete invariant:
- For every (lang, page-type) combo: en→NO CJK, zh→HAS CJK

## TDD verification (defense-in-depth sanity check)

1. **Baseline PASS:** Run against current state → 1 pass / 0 fail (all 100 en tool h1s are pure English)
2. **Simulate regression:** Python byte-level replace `MRR Calculator` → `MRR 计算器` in `dist/en/solopreneur-mrr-calculator/index.html` → run → 1 fail / 0 pass (catches it)
3. **Restore:** `cp /tmp/en-mrr-before.html` → re-run → 1 pass / 0 fail

Note: Python used instead of `sed` because Git Bash's sed had encoding issues with multi-byte UTF-8 in this environment; Python's byte-level `replace()` worked cleanly.

## CI integration

- Test runs under `pnpm test:unit` with `RUN_BUILD_TESTS=1`
- Adds ~50ms to CI wall-clock (no pnpm build needed if dist/ already populated)
- Total build-dep suite wall-clock with 9 suites: ~5min in CI
- Current 30min CI timeout accommodates

## P68+ candidate

- **Blog page CJK guards** — blog posts at `/blog/<slug>/` and `/zh/blog/<slug>/` (~200 pages) also have h1 from `t(\`blogs.${slug}.title\`, lang)`. Should be defended symmetrically (en NO CJK + zh HAS CJK). Would parallel the tool-page guard pattern.
- **Cross-page cross-link CJK guard** — extend P63/P66b cross-link checks to all page types (currently only category pages scan cross-link, not tool or blog pages).
- **`.superpowers/` gitignore root-cause fix** — clean tracked scratch files from history (task-4-report.md etc.) so future subagents don't accidentally commit scratch mutations.