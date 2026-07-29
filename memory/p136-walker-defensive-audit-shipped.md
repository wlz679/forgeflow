---
name: p136-walker-defensive-audit-shipped
description: P136 closes P134's "P123/P124 defensive audit" candidate by auditing tests/_composite-i18n-walkers.ts (consumed by 7 P121/P122/P131 i18n guard tests). Found 7 latent risks; fixed 1 medium-risk (inputs: regex anchor) + documented 2 doc/code inconsistencies (FAQ + howToUse multi-line limitation). Skipped 4 low-risk / by-design items. No behavior change for current 100 engines; future engine additions safer against doc-comment + multi-format false-matches.
metadata:
  type: project
---

# P136 Walker Defensive Audit Ship Log

## Summary

P136 closes P132/P133/P134 ship memory's recurring candidate: "P123/P124 defensive audit — 3rd-party review of `tests/_composite-i18n-walkers.ts` walker + regex". Audit found 7 latent risks; fixed 1 medium-risk regex anchor + documented 2 doc/code inconsistencies. 4 other risks skipped (no current data triggers them).

**Date:** 2026-07-29
**Batch ID:** P136
**Files touched:** 2 (`tests/_composite-i18n-walkers.ts` + `CHANGELOG.md`)
**Commits:** 1 (`77c411f`, +17/-3)
**pnpm check:** 6/6 P131 consumer tests pass (1401ms); P133 input-labels-audit 1/1 pass; P132 invariant guard 1/1 pass; tsc 0 errors
**3-way sync:** pending (this ship)

## Audit scope

`tests/_composite-i18n-walkers.ts` exports 6 helpers, consumed by 7 tests:

| Helper | Consumers |
|---|---|
| `buildSlugToFirstInput()` | engine-zh-input-i18n-guard, engine-en-input-i18n-guard |
| `buildSlugToFaqCount()` | engine-zh-faq-i18n-guard, engine-en-faq-i18n-guard |
| `buildSlugToHowToCount()` | engine-zh-howto-i18n-guard, engine-en-howto-i18n-guard |
| `escapeForHtml()` | engine-en-input-i18n-guard, engine-en-faq-i18n-guard, engine-en-howto-i18n-guard |
| `buildTranslationKeyRegex()` | engine-{zh,en}-{input,faq,howto}-i18n-guard × 6 |
| `extractAllEngineSlugs()` | all 7 (titles, descriptions, input, faq, howto × zh/en) |

`escapeForHtml()` and `buildTranslationKeyRegex()` also used by P121 (titles) + P122 (descriptions) per earlier ship memory.

## Issues found

| # | Issue | Severity | Action |
|---|---|---|---|
| A | `buildSlugToFirstInput()` regex `inputs:\s*\[` not anchored to start-of-line. Could false-match `function calculate(inputs: Record<...>)` (preceded by `(`) or comment `// inputs: [{ ... }]`. | Medium future drift | **FIX** — anchor with `(?:^|\n)\s*` |
| B | `buildSlugToFaqCount()` outer regex requires `\n\s*\],` (multi-line only), but inner comment claims "both single-line and multi-line formats are counted" | Doc/code inconsistency | **FIX comment** — clarify multi-line only |
| C | `buildSlugToHowToCount()` same as B | Doc/code inconsistency | **FIX comment** — clarify multi-line only |
| D | `q:` count pattern `[{,]\s*q:\s*['"]` could match string literals containing `q:` patterns | Very low | SKIP — no current engines trip |
| E | `^\s*['"]` line count for howToUse could match commented-out lines inside the array | Very low | SKIP — no current engines trip |
| F | `extractAllEngineSlugs()` requires `solopreneur-` prefix — implicit assumption all engine slugs follow this | By design | SKIP — 100/100 engines match; documented |
| G | `escapeForHtml()` standard 5-char HTML escape, `&` replaced first (correct order) | Correct | SKIP |

## What changed

### 1. `inputs:` regex anchor (Issue A)

```diff
-    const inputsArr = text.match(/inputs:\s*\[([\s\S]*?)\]/);
+    // Anchor with `(?:^|\n)\s*` so we don't false-match `function calculate(
+    // inputs: Record<...>)` signatures (preceded by `(`) or comment examples
+    // like `// inputs: [{ ... }]` embedded mid-line. P136 audit hardening.
+    const inputsArr = text.match(/(?:^|\n)\s*inputs:\s*\[([\s\S]*?)\]/);
```

**Why this matters**: In current 100 engines, `function calculate(inputs: Record<...>)` does NOT match `inputs: \[` because it's `inputs: Record`. But a future engine that:
- Adds a doc comment with `inputs: [...]` example before the engine declaration, OR
- Restructures the calculate signature to have `inputs: [` (unlikely but possible)

...would cause the walker to extract input names from the wrong location, causing P131 input guard false-positives or false-negatives. Anchor `(?:^|\n)\s*` requires `inputs:` to be at start-of-line (preceded by `^` or `\n`), correctly excluding both false-match cases.

### 2. Comment clarifications (Issues B + C)

```diff
 // Match `q:` preceded by `{` or `,` (with optional whitespace) so both
 // single-line `{ q: "...", a: "..." },` and multi-line formats are counted.
+//
+// Outer regex requires `\n\s*\],` at the end — only matches multi-line FAQ
+// arrays. Single-line FAQ (e.g. `faq: [{ q: '...', a: '...' }]`) is NOT
+// captured; engines with single-line FAQ would be silently skipped (the
+// consumer test does `if (faqCount === 0) continue`). All 100 current engines
+// use multi-line format. P136 audit documented this limitation explicitly.
```

Same clarification added to `buildSlugToHowToCount()`. The INNER pattern supports both formats (single-line `{ q: ... }` and multi-line), but the OUTER pattern requires `\n\s*\],` so single-line FAQ arrays don't get captured at all. This is a real limitation but acceptable: all 100 engines use multi-line, and the consumer test skips engines with `faqCount === 0` (silent skip, not false-positive).

## Skipped issues — why

**D (q: in string literals)**: Would require every consumer to validate that `q:` is actually inside a `faq:` block. Current engines have 470 `q:` matches, all inside FAQ blocks. False-positive risk ≈ 0.

**E (howToUse line count matching comments)**: Same shape — current engines have quoted strings only as actual howToUse entries. Comments inside howToUse are rare.

**F (solopreneur- prefix)**: All 100 engine slugs follow this pattern. If a future batch adds a non-solopreneur engine, the walker would skip it (silent miss). Documented in code as a known assumption.

**G (escapeForHtml)**: Standard HTML escape; `&` first replacement is correct (avoids double-escaping).

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| 6/6 P131 consumer tests | pass (1401ms) ✓ |
| P133 input-labels-i18n-audit | 1/1 pass ✓ |
| P132 invariant guard | 1/1 pass ✓ |
| Behavior change for current 100 engines | None — same input/FAQ/howToUse extraction ✓ |

## Why this batch exists

P132 ship memory §P135+ candidates first listed "P123/P124 defensive audit". P133, P134, P135 ships all referenced it. P136 finally closes it.

The audit was straightforward because:
- Walker is small (~150 lines)
- 7 consumer tests give empirical coverage
- All 100 engines are checked by these tests, so any false-positive/negative would already surface
- The "audit" was really "review regex anchoring + doc accuracy"

## Lessons

1. **Audit-only closure is valid when audit finds no real bugs** — P136's audit found 7 issues, but only 1 needed code change. 6 were either doc-only (clarification) or acceptable risk (no current data triggers). The fix surface is proportional to actual risk, not theoretical risk.
2. **Anchor regexes that match field-like patterns** — `inputs:`, `slug:`, `faq:` are field declarations that should appear at start-of-line. Adding `(?:^|\n)\s*` is a 1-line defense against false-matches from function signatures, comments, or template strings.
3. **Comments that lie are bugs too** — the FAQ/howToUse comments claimed broader support than the regex delivered. Comment-only fixes are valid changes when they prevent future developers from trusting incorrect docs.
4. **P123/P124 audit was queued since P132 (3 batches ago)** — pattern: candidates listed in ship memory tend to ship 2-4 batches later. P134's "P135 candidates" → P135 closes them. P135's "P136 candidates" → P136 closes. The cadence is healthy.

## P137+ candidates (carried from P132/P133/P134/P135/P136)

- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level translation or customFn-based) — needs brainstorming for architectural decision
- **CHANGELOG catch-up v9** — when next gap exceeds ~5 commits
- **Fix `03-commit-precheck` hook** — exit-code parsing false-positive continues to waste commit cycles (P131+P132+P133+P134+P135 all hit it)
- **Defer `scripts/.scratch/` gitignore** — only if scratch usage grows again (P135 closed one, pattern not yet recurring)