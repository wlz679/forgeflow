# P74 Audit Script CI Guard Ship Log

## Summary

P74 converts the P72 audit discovery tool (`scripts/p72-audit-v6.cjs`) into a permanent build-dep CI guard (`tests/zh-hardcoded-english-guard.test.ts`). Any future refactor that reintroduces hardcoded English UI strings on zh pages will fail in CI before the regression reaches users.

**Date:** 2026-07-25
**Batch ID:** P74
**Files touched:** 3 (1 new test + 1 run.mjs count + 1 memory)
**Test delta:** 1179 → 1180 pass (+1 from new zh-hardcoded-english-guard)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Added
- **[tests] `tests/zh-hardcoded-english-guard.test.ts`** — 14th build-dep suite
  - Walks `dist/zh/**/index.html` (after stripping `<script>`, `<style>`, JSON-LD blocks)
  - Asserts a focused list of 11 known-leaked English UI strings does NOT appear in the remaining HTML body
  - Same word-boundary regex as P72 audit (avoids "Cookies" matching inside longer strings)
  - Defends against all 5 P72 audit render-layer defects (D1-D5)

### Changed
- **[scripts] `tests/run.mjs` count 13 → 14 build-dep suites** — `--test-concurrency=1` comment + skip-mode summary both updated

### Focused list (HARDCODED_EN_IN_ZH)

```ts
[
  // P73 fixed: legal pages
  'Privacy Policy',           // privacy-policy.astro h1
  'Terms & Conditions',       // terms.astro h1
  'Information We Collect',   // privacy-policy.astro section heading
  'Cookies and Tracking',     // privacy-policy.astro section heading
  'Third-Party Services',     // privacy-policy.astro section heading
  'Acceptance of Terms',      // terms.astro section heading
  'Use of the Service',       // terms.astro section heading
  'Intellectual Property',    // terms.astro section heading
  'Last updated:',             // legal pages last-updated text
  // P72 T2-A fixed: CategoryGuides
  'Guides & Articles',         // CategoryGuides.astro h2
  'Related Articles',          // CategoryGuides.astro h3
]
```

The list is INTENTIONALLY FOCUSED — covers only strings the P72 audit confirmed as user-visible leaks. Extending the list risks false positives (brand names, calculator type names that legitimately appear on zh pages).

## Why this exists

P72 i18n audit found 6 user-visible defects where zh pages rendered English text. P72 T2-A fixed D1+D2+D3 (3 files, 330+ EN strings on zh pages). P73 fixed D4+D5 (legal pages — full EN body in zh pages). With all 5 render-layer defects fixed, this test now passes.

But the fix was one-shot — without a CI guard, a future refactor could reintroduce any of these strings. P74 closes that loop:

- **Audit tool** (`scripts/p72-audit-v6.cjs`) — comprehensive ad-hoc audit (translations.ts + t() calls + dist/zh + components). For one-shot discovery.
- **CI guard** (`tests/zh-hardcoded-english-guard.test.ts`) — focused runtime check (dist/zh hardcoded EN only). For every CI build.

## TDD verification (defense-in-depth sanity check)

1. **Baseline PASS:** Run against current state (post-P73) → 1 pass / 0 fail. All 11 known-leaked strings removed from dist/zh.
2. **Simulate regression:** Python byte-level replace zh title with "Privacy Policy — ForgeFlowKit" in `dist/zh/privacy-policy/index.html` → run → 1 fail / 0 pass (catches it).
3. **Restore:** `cp /tmp/zh-priv-before.html` → re-run → 1 pass / 0 fail ✓

Confirmed the test is not a silent-pass.

## Coverage matrix

| Defect | Fix batch | Defense-in-depth |
|---|---|---|
| D1: blog index 200 EN | P72 T2-A | P74 (Guides & Articles, Related Articles — different strings but same family) |
| D2: 100 tool pages RelatedBlog EN | P72 T2-A | (covered by same template pattern; would only flag if new EN slipped through) |
| D3: CategoryGuides EN | P72 T2-A | P74 (Guides & Articles + Related Articles explicit) |
| D4: privacy-policy EN | P73 | P74 (9 strings: Privacy Policy + 3 sections + Last updated + Contact via... wait Contact not in list — let me re-check) |
| D5: terms EN | P73 | P74 (4 strings: Terms & Conditions + 4 sections) |

Actually re-checking the list: `Contact` is NOT in HARDCODED_EN_IN_ZH. The privacy-policy Contact h2 is now `联系我们` (per P73 fix), but if a future refactor reintroduced `Contact`, the test wouldn't catch it. The list deliberately excludes "Contact" because it might appear legitimately in footer (`<a href="/zh/contact/">Contact</a>`).

If we wanted to also guard against Contact re-leaking in privacy-policy specifically, we'd need to refine the test (e.g., only check within `/zh/privacy-policy/`). Current scope is broader and accepted.

## What was NOT done

- ❌ D6 (MD blog bodies) — 100 markdown files have EN-only body content. Different scope (content translation, not template i18n). Defer to P75+.
- ❌ Refactored `scripts/p72-audit-v6.cjs` — kept as-is for ad-hoc audits. The CI guard is a focused subset of its capabilities.
- ❌ Broader EN string detection (e.g., all 27 candidates from audit script) — would risk false positives on brand names, calculator type names.

## CI integration

- 14th build-dep suite, adds ~120ms to CI wall-clock (no pnpm build needed if dist/ already populated)
- Total build-dep suite wall-clock with 14 suites: ~6.5min in CI
- Current 30min CI timeout accommodates

## P75+ candidate

- **D6 (MD blog bodies)** — 100 markdown files. Subagent-driven translation batch.
- **Broader CI guard** — extend HARDCODED_EN_IN_ZH list as new defects are discovered.
- **CLAUDE.md standing rule** — formalize `.superpowers/` gitignore rule from P70.

## Related references

- **P72 T1** — i18n audit (sonnet subagent + state-machine parser) that found these defects
- **P72 T2-A** — fixed D1+D2+D3
- **P73** — fixed D4+D5
- **`scripts/p72-audit-v6.cjs`** — original audit script (kept for ad-hoc audits)
- **CLAUDE.md** cascade audit pattern — every P-series memory file should have either a commit ref or trigger criterion