# P67b Tool-page zh CJK Preservation Ship Log

## Summary

P67b extends P66b's category-page zh CJK guard to TOOL pages. 100 tool pages now defended against over-cleansing regressions.

**Date:** 2026-07-25
**Batch ID:** P67b
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1171 → 1172 pass (+1 from new tool-page preservation test)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/tool-zh-cjk-preservation.test.ts`** — build-dep test, walks `dist/zh/solopreneur-*/index.html` (100 tool pages), asserts each `<h1>` **contains CJK**. Mirrors P66b structure (same RUN_BUILD_TESTS skip-guard, same `ensureBuilt()` via `spawnSync`, same CJK regex), but targets tool pages instead of category pages.

### Changed
- **[scripts] `tests/run.mjs` count 7 → 8 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated. The 8th suite is `tool-zh-cjk-preservation`.

## Why this exists

P66b closed the category-page gap (15 zh category landing pages). But there are also **100 zh tool pages** (e.g. `/zh/solopreneur-mrr-calculator/`) whose h1 content comes from a separate i18n lookup (`tools.${slug}.title`). A future refactor could break tool page titles without affecting category titles (and vice versa) — the two i18n namespaces are independent.

P67b provides symmetric defense-in-depth for tool pages: walks the 100 zh tool pages and asserts each h1 has CJK.

## Coverage expansion

| Layer | Pages defended | Test |
|---|---|---|
| en category pages | 15 | `category-en-cjk-guard` (P63) |
| zh category pages | 15 | `category-zh-cjk-preservation` (P66b) |
| **zh tool pages** | **100** | **`tool-zh-cjk-preservation` (P67b)** |
| en tool pages | (defended by category test's cross-link coverage) | — |

## TDD verification (defense-in-depth sanity check)

1. **Baseline PASS:** Run against current state → 1 pass / 0 fail (all 100 zh tool h1s already have CJK)
2. **Simulate regression:** `sed -i` `MRR 计算器` → `MRR Calculator` in `dist/zh/solopreneur-mrr-calculator/index.html` → run → 1 fail / 0 pass (catches it)
3. **Restore:** `cp /tmp/mrr-before.html` → re-run → 1 pass / 0 fail

Confirmed the test is not a silent-pass.

## CI integration

- Test runs under `pnpm test:unit` with `RUN_BUILD_TESTS=1`
- Adds ~50ms to CI wall-clock (no pnpm build needed if dist/ already populated)
- Total build-dep suite wall-clock with 8 suites: ~5min in CI
- Current 30min CI timeout accommodates

## P67+ candidate

- **en tool pages CJK leak guard** — mirror P67b for en tool pages (100 pages). Complements P63 (en category pages) + P67b (zh tool pages). Currently en tool pages have no equivalent guard.
- **en tool pages cross-link CJK leak** — like P66b's category page cross-link check, but for tool pages linking to categories.
- **zh blog pages preservation** — blog posts at `/zh/blog/<slug>/` also have h1 from `t(\`blogs.${slug}.title\`, lang)`; should be defended.
- **`.superpowers/` gitignore root-cause fix** — clean tracked scratch files from history (task-4-report.md etc.) so future subagents don't accidentally commit scratch mutations.