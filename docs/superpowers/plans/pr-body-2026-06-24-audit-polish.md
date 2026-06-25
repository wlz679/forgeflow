## Summary

Second-pass audit polish on top of the 2026-06-24 audit-fix batch. Closes 11 logical fixes across 13 commits, including 2 pre-existing bugs discovered during review.

### Bug fixes (user-visible)

- **5c40724** — gpu-cloud cheapestProv: referential equality (was always-falsy `.key !== .key`)
- **15b2a55** — churn-rate generate(): `you\\\'re` → `you\'re` literal-escape fix
- **36d54ff** — saas-valuation customFn: remove pre-existing extra `}` causing ASI parse error (page was silently broken on master)
- **d86809d** — saas-valuation customFn: `valuationBase` → `vb` (variable defined in customFn scope, not calculate())

### Hardening

- **44ceba3** — codegen-examples: literal-escape sanity check (catches the bug class the audit found, at PR time)
- **faf8081** — codegen-examples: cross-platform `tsx` invocation + always-cleanup runner script
- **5c723f9** — sync-pricing: round float artifacts to 8 decimals (no IEEE-754 cruft in PRICING.json)

### Safety + docs

- **4018fab** — registry: warn on duplicate registerEngine slug
- **d39174f** — CI: paths-ignore for docs-only pushes
- **9b02365** — gpu-cloud: tighten PROVIDERS type cast (no more `as any`)
- **b59cf8d** — CLAUDE.md: clarify staticExamples[1+] manual maintenance + customFn parse safety
- **ea007ba** — plan: record actual outcome of this batch

### Regen

- **2f0ed7c** — engines staticExamples regen after PRICING.json sync (drift caused by 5c723f9)

## Tasks NOT executed (and why)

- **Tasks 3, 5** (revenue-projector + saas-valuation customFn escape fixes) — REGRESSIONS, reverted. Original `\\'` in `"..."` outer TS strings is correct.
- **Tasks 6-11** (other engines' customFn escape fixes) — SKIPPED. Same wrong-pattern fix would have introduced 9 more regressions.
- **Task 18** (preset block extraction) — SCOPED DOWN, then SKIPPED. Investigation revealed preset data is heterogeneous across 24 engines; not safely DRY-able.
- **Task 19** (i18n preset keys) — SKIPPED. Requires per-engine verification.
- **Task 20** (empty translation placeholders) — SKIPPED. Low value.

See `docs/superpowers/plans/2026-06-24-audit-polish.md` for full task list, deferred improvements, and lessons learned.

## Pre-existing bugs discovered (not in this PR)

Eight data-driven engines have customFn source that fails `new Function()` parse at page-load (`'key':{...}` label syntax — JS labels must be identifiers, not strings). Pages still render via `staticExamples[0]` server-side, but custom-mode interaction (fill inputs → Generate) is broken. Track as a follow-up batch. Test: `node tests/scripts/test-customFn.mjs`.

## Verification

- PASSED: `node scripts/codegen-examples.mjs --check` — all 32 engines in sync and clean
- PASSED: `pnpm build` — 141 pages in 4.51s, no warnings
- 24/32 customFn parse OK (8 pre-existing bugs documented above)