# P124 Engine EN-Page Composite i18n Guard Ship Log

## Summary

P124 adds the EN-side sibling of P123. The new guard asserts 5 user-visible
i18n surfaces all render on every **en** engine page. **One test = one source
of truth for "all i18n wiring works on this en page"**. 5 invariants × 100
en pages = **500 page checks in a single test**. P123 + P124 together = 1000
page checks (500 en + 500 zh) on the same 5 surfaces.

**Date:** 2026-07-28
**Batch ID:** P124
**Files touched:** 4 (test + run.mjs + plan + memory)
**Test delta:** 32 → 33 build-dep suites; new 1 holistic test (500 page checks)
**Build pages:** 449 (unchanged)
**3-way sync:** `0\t0` at HEAD `8e053ce`

## What shipped

### `tests/engine-en-composite-i18n-guard.test.ts` (new, 33rd build-dep suite)

One test, 5 invariants per page, 100 en pages. Mirrors P123 except:

| Aspect | P123 (zh) | P124 (en) |
|---|---|---|
| Walks | `dist/zh/${slug}/index.html` | `dist/en/${slug}/index.html` |
| Probe value | zh value (group[2] or [3]) | en value (group[1] or [2]) |

Same 5 surfaces, same escapeForHtml(), same regex patterns — only the dist
path and the probe source differ.

### `tests/run.mjs` (updated)

- Build-dep suite count: 32 → **33**
- skip-mode summary: added `engine-en-composite-i18n-guard` to listing
- Comment about concurrent test count: 28 → 29 files

## Audit finding (holistic)

P124 is **a guard, not an audit** — but running it against the current 100
engines gives the holistic audit result:

| Surface | Engines with translation | Engines where translation reaches en page |
|---|---|---|
| Title | 100/100 | 100/100 |
| Description | 100/100 | 100/100 |
| First input label | 100/100 | 100/100 |
| First FAQ question | 100/100 | 100/100 |
| First how_to_use step | 100/100 | 100/100 |

**0 broken pages.**

## Ship drama

### Drama 1 — Latent P123 bug surfaced via first-run failure

P124's first run failed with 1 violation:
```
- solopreneur-freelance-rate-calculator: missing first input label "Your Skill"
```

**Root cause:** the engine `src/engines/freelance/freelance-rate-calculator.ts`
has inputs `[annualIncome, expenses, billableHrs, profit]` — no `skill` input.
But `src/i18n/translations.ts` line 1475 has a **dead key**:
```
'tools.solopreneur-freelance-rate-calculator.input.skill.label':
  { en: 'Your Skill', zh: '你的技能' }
```

P123's naive approach ("first match for `input.${name}.label` in
translations.ts") probed this dead key. P123's zh probe "你的技能" passed
**by coincidence** — the same Chinese substring happens to appear in the
engine's `<meta name="description">` ("根据你的技能、经验水平和目标市场...").
P124's en probe "Your Skill" doesn't appear anywhere on the en page (the en
description says "Calculate the hourly rate...skilled, premium, expert..."
— no "Your Skill" verbatim).

**Fix:** added `buildSlugToFirstInput()` walker in `tests/engine-en-composite-i18n-guard.test.ts`:
- Recursively walks `src/engines/**/*.ts` (skipping `index.ts`)
- Extracts `slug:` and first `name:` inside `inputs: [...]` from each file
- Builds a `Map<slug, firstInputName>` used to look up the correct
  `tools.${slug}.input.${firstInputName}.label` translation key

This makes P124's probe reflect what the page **actually renders** (engine's
first input), not what happens to appear first in translations.ts (which can
be a dead key).

### Drama 2 — TypeScript stale-IDE warnings on initial Edit

After the first Edit added `readdirSync`/`statSync`/`join` imports,
TypeScript flagged them as unused (function not yet called). Wired up the
`buildSlugToFirstInput()` call in the test body; subsequent `tsc --noEmit`
returns 0 errors. Stale TS server cache pattern (P52/P53a-known).

## P123 latent bug discovered

The same naive "first match in translations.ts" probe pattern exists in
**P123** (`tests/engine-composite-i18n-guard.test.ts:91-93`). P123 passed
in the zh run by coincidence (the zh description contains "你的技能"). A
P123-fix is deferred to a future batch — for now, P124 is the corrected
sibling and P123's audit conclusion remains "0 broken pages" (false
negative on the input-label dimension only).

## P121/P122/P123/P124 invariant stack

| Batch | Pattern | Suites | Page checks |
|---|---|---|---|
| P121 | Single: title (en+zh) | 30th | 200 |
| P122 | Single: description (en+zh) | 31st | 200 |
| **P123** | **Holistic: 5 surfaces × 100 zh** | **32nd** | **500** |
| **P124** | **Holistic: 5 surfaces × 100 en** | **33rd** | **500** |
| **Total** | | **4 suites, 1400 checks** | |

P121/P122 are single-invariant; P123/P124 are holistic integrators. Together
they cover both languages × all 5 user-visible surfaces. P124 closes the
latent P123 bug on the en side via the engine-walker pattern.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `RUN_BUILD_TESTS=1 ... --test engine-en-composite-i18n-guard` | **1/1 pass, 500 page checks** ✓ |
| skip-mode summary shows P124 in build-dep suite list | ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P22b** — `EXPECTED_ENGINE_COUNT = 100` lock (P124 uses 100 as ground truth)
- **P23b** — RUN_BUILD_TESTS skip-guard pattern (P124 follows)
- **P103** — dead-i18n-keys-guard (P124 is parallel/orthogonal)
- **P121** — engine titles i18n guard
- **P122** — engine descriptions i18n guard
- **P123** — engine zh-composite i18n guard (P124's direct sibling — P124 fixed the latent P123 bug)
- `tests/engine-en-composite-i18n-guard.test.ts` — new 33rd build-dep suite
- `tests/run.mjs:60-71` — updated skip-mode listing

## P125+ candidates

- **P123 fix** — apply the `buildSlugToFirstInput()` walker to P123 too
  (currently relies on coincidence that zh description contains "你的技能")
- **Codegen-enforce defense-in-depth matrix** — automate CLAUDE.md snapshot
  (33 build-dep suites count, which has drifted 4 times in this thread)
- **Tier-2 round 7** — composite data-driven lines (NEW approach)
- **FAQ answers + how_to_use[1+] coverage** — extend P123/P124 to second-half
  of these arrays (currently only `[0]` is probed)
- **Single-test split** — extract P123 into 4 narrower tests for better
  failure isolation
- **CHANGELOG catch-up v6** — P124 (next time the gap exceeds ~10 commits)