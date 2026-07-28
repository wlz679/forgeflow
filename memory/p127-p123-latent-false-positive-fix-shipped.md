# P127 P123 Latent False-Positive Fix Ship Log

## Summary

P127 applies the `buildSlugToFirstInput()` engine-walker from P124 to
`tests/engine-composite-i18n-guard.test.ts`. Closes the latent false-positive
on `solopreneur-freelance-rate-calculator` where P123's naive "first
input.X.label match in translations.ts" probe hit a dead key (`input.skill.label`
exists in translations.ts but the engine has no `skill` input — it renders
`annualIncome` first).

**Date:** 2026-07-28
**Batch ID:** P127
**Files touched:** 3 (test + memory + MEMORY.md)
**Test delta:** NO new build-dep suite (P127 modifies P123 in-place)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD

## What shipped

### `tests/engine-composite-i18n-guard.test.ts` (P123 — modified in place)

Changes:
1. Added `readdirSync`, `statSync` imports from `node:fs`
2. Added `join` import from `node:path`
3. Added `buildSlugToFirstInput()` walker function (verbatim copy of P124
   lines 53-82)
4. Wired walker into the input probe loop: `firstInputName = slugToFirstInput.get(slug)`
5. Changed input regex from "first input.X.label match" to
   "input.${firstInputName}.label match" — uses walker's value
6. Updated file header comment with P127 note

The probe value (`group[3]` = zh) remains unchanged. The walker fixes WHICH
key to probe; the page still must contain the zh value of that key.

### No changes to:
- `tests/run.mjs` — no new suite, no skip-mode listing change
- `CLAUDE.md` — no invariant changes (P123's existing 500 zh page checks
  are still 500; the fix just makes them correct instead of coincidentally-passing)

## Why this batch exists

P123 was the 32nd build-dep suite, shipped with the assumption that
"first input.X.label match in translations.ts" gives a correct probe.
That assumption was wrong: if translations.ts has dead input keys
(e.g. for removed inputs that didn't get cleaned up), the probe reads
the dead key's value, which may or may not appear on the page by coincidence.

P124 surfaced this bug on the en side (probe "Your Skill" → 0 matches on page
because dead key). P127 closes the symmetric issue on the zh side (probe
"你的技能" → coincidentally appears in `<meta name="description">`, false negative).

After P127: P123's audit conclusion "0 broken pages" is **verified** rather
than "0 broken pages (false negative on input-label dimension)".

## Latent bug analysis

### Affected engines (P124 surfaced)

| Engine | translations.ts has | Engine actually has | First render |
|---|---|---|---|
| `solopreneur-freelance-rate-calculator` | `input.skill.label` (dead) | `[annualIncome, expenses, billableHrs, profit]` | `annualIncome` |

### Was there a real bug?

**No.** The page renders the correct input label (`annualIncome`) on both
zh and en. The bug was in P123's TEST logic, not in the engine or page.

But P123's test was passing via coincidence (zh description contains
"你的技能"), not via correct probe. A future test refactor (e.g. if someone
shortened the zh description) could turn this into a false-positive failure
that's hard to debug.

## Ship drama

None — the walker is a verbatim copy of P124's working implementation. Pattern
proved on P124, applied cleanly to P123.

### TS stale-IDE warnings (P52/P53a/P124 known)
- After Edit 1 (imports) and Edit 2 (walker function), TypeScript flagged
  `readdirSync`/`statSync`/`join` as declared-but-unused (the walker function
  calls them but TS server hadn't picked up the change yet).
- After Edit 4 (walker call + input regex), TS flagged `buildSlugToFirstInput`
  and `slugToFirstInput` as declared-but-unused.
- All cleared after running `pnpm exec tsc --noEmit` (exit 0). Same P52/P53a
  /P124 stale-IDE-cache pattern.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` | (timeout — P106/P126 pattern; test passed in isolation) |
| `RUN_BUILD_TESTS=1 ... --test engine-composite-i18n-guard` | **1/1 pass, 500 page checks** ✓ |
| skip-mode summary | unchanged (34 suites, P127 modifies in place) |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P22b** — `EXPECTED_ENGINE_COUNT = 100` lock
- **P23b** — RUN_BUILD_TESTS skip-guard pattern
- **P103** — dead-i18n-keys-guard (P127 complements P103 by fixing the test
  side; P103 fixes the source side)
- **P121** — engine titles i18n guard
- **P122** — engine descriptions i18n guard
- **P123** — engine zh-composite i18n guard (this batch modifies P123)
- **P124** — engine en-composite i18n guard (P124's `buildSlugToFirstInput()`
  walker pattern is the source of truth for P127)
- **P125** — CLAUDE.md invariant matrix guard
- **P126** — CHANGELOG catch-up v6 (M22.0)

## P128+ candidates

- **FAQ answers + how_to_use[1+] coverage** — extend P123/P124 to second-half
  of these arrays (currently only `[0]` is probed)
- **Single-test split** — extract P123 into 4 narrower tests for better
  failure isolation
- **CLAUDE.md additional invariants** — extend P125 to assert commit count,
  last-ship date, category names
- **Input labels i18n backfill** — backfill 29 engines × 3-6 inputs = ~100-150
  `tools.${slug}.input.${name}.label` keys
- **Tier-2 round 7** — composite data-driven lines (NEW approach)