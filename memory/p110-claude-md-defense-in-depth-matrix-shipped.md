# P110 CLAUDE.md Defense-in-Depth Matrix Ship Log

## Summary

P110 adds a new `## Defense-in-Depth` section to `CLAUDE.md` that codifies the 6 dimensions covered by 29 build-dep CI guards + 8 source-only guards. Closes the gap between CHANGELOG.md (which has the matrix in M19.0) and CLAUDE.md (which is the project source of truth but lacked the matrix).

**Date:** 2026-07-27
**Batch ID:** P110
**Files touched:** 1 (CLAUDE.md — 23 lines added)
**Test delta:** 0 (CLAUDE.md-only change)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### CLAUDE.md — new `## Defense-in-Depth` section

Inserted between v3 status (line 73) and `## Commands` (line 75). Structure:

1. **Intro paragraph** — Test infrastructure across 6 user-visible dimensions
2. **Matrix table** — 9 rows × 4 columns:
   - Dimension (a11y / i18n × 2 / SEO / performance × 4)
   - Suite count
   - Coverage (specific suite names + suite number)
   - Memory (cross-link to ship log)
3. **Performance size triad note** — confirms P96+P106+P107+P108 complete
4. **Defense-in-depth invariant** — guidance for future batches
5. **History paragraph** — sequence of dimension openings

### Why CLAUDE.md and not just CHANGELOG

Per project rules: **CLAUDE.md is THE source of truth for future AI sessions.** The CHANGELOG documents what shipped; CLAUDE.md documents what's currently true. Without this matrix, future sessions would need to discover the 29 build-dep suites by reading `tests/run.mjs` or by trial-and-error.

### Codegen vs hand-curated

The matrix is **hand-curated**, not codegen-enforced. Reason: the suite count is a moving target (29 today, possibly 30+ after P111+). The existing engine-count table IS codegen-enforced because it has a hard truth (15 categories × N = 100). The defense-in-depth matrix is a snapshot.

If a future session wants to make it codegen-enforced, the natural pattern would be:
- Walk `tests/run.mjs` skip-mode list
- Group by `// P<N>` comments + first test name
- Generate the matrix at codegen time

## Defense-in-depth dimensions — final state

| Dimension | Suite count | Memory |
|---|---|---|
| a11y | 1 | P95 |
| i18n (page-level) | 6 | P62-P83 |
| i18n (dead-keys) | 1 | P103 |
| SEO | 9 | P86-P94 |
| Performance (HTML) | 1 | P96 |
| Performance (JS) | 1 | P106 |
| Performance (CSS) | 1 | P107 |
| Performance (Images) | 1 | P108 |
| Build-dep source guards | 8 | P47-P52 |
| **Total** | **29 build-dep suites** | + 8 source-only = **37** |

## Why this matters

The matrix turns **"where do I find the test that catches this?"** from a discovery load into a lookup. Future batches that touch:
- A page-level CJK matrix → see **i18n (page-level)** row → find `p66b-p83` memory
- A new `<img>` tag → see **Performance (Images)** row → find `p108` memory
- A new section header → see **i18n (dead-keys)** row → find `p103` memory

This is the "tutorial" value of CLAUDE.md — future sessions learn the project structure by reading it.

## What is NOT done

- ❌ Did NOT make matrix codegen-enforced (snapshot, not hard truth)
- ❌ Did NOT add per-suite `[PASS]` / `[FAIL]` state (would require CI integration)
- ❌ Did NOT cross-link to specific test files (memory links suffice)

## Related references

- **P32** — first CLAUDE.md invariant refresh (engine count table)
- **P49** — codegen-enforced engine count table
- **P109** — M19.0 CHANGELOG section that motivated the matrix
- **P110** — this batch (matrix in CLAUDE.md)

## P111+ candidates

- **Per-engine i18n keys for cost/ops/valuation headers** (~20+ keys, last i18n gap)
- **CDN cache-control guard** — production-side header check
- **Asset lazy-load guard** — above-the-fold resource count
- **Audit script migration** — extract parser logic to shared library
- **Codegen-enforce defense-in-depth matrix** — automate the snapshot