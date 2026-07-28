---
name: p129-missing-translation-assertion-shipped
description: P129 promoted P123/P124 probe loop's `if (qMatch) push(...)` silent skip to `assert(qMatch, ...)` AND fixed the probe regex to accept double-quoted translation values (16 keys silently skipped by P128). Closes 2 architectural concerns P128 surfaced.
metadata:
  type: project
---

# P129 Missing-Translation Assertion + Probe-Regex Fix Ship Log

## Summary

P129 is a two-part hardening of P123/P124 composite i18n guards: (1) **fix the probe regex** to accept both single-quoted (`'...'`) and double-quoted (`"..."`) translation values — P128's single-quote-only regex silently skipped 16 keys across 8 engines; (2) **promote `if (qMatch) push(...)` silent-skip path to `assert(qMatch, ...)`** so missing FAQ/how_to_use translation keys now fail loudly. Discovered mid-execution on 2026-07-28: the original P129 scope only included the assert promotion, but applying it surfaced the probe regex bug as 16 false-positive "missing translation" failures. User chose Option A (extend regex + complete P129) over Option B (convert content to single-quote) — minimum-effort root cause fix.

**Date:** 2026-07-28
**Batch ID:** P129
**Files touched:** 4 (P123 test + P124 test + new memory + MEMORY.md)
**Test delta:** NO new build-dep suite (P129 modifies P123+P124 in-place, same pattern as P128/P127)
**Commits:** 3 (24883ed feat + 55cf1a7 fix-header + 5cc9039 mirror)
**3-way sync:** `0\t0` at HEAD

## What shipped

### P123 (`tests/engine-composite-i18n-guard.test.ts`) and P124 (`tests/engine-en-composite-i18n-guard.test.ts`)

Changes (both files):
1. **Probe regex extension** at 6 sites per file — title, description, input.${name}.label, faq.${i}.q, faq.${i}.a, how_to_use.${i}. Old pattern: `'(?:[^'\\\\]|\\\\.)*?'`. New pattern alternation: `(?:\'(?:[^'\\\\]|\\\\.)*?\'|"(?:[^"\\\\]|\\\\.)*?")` — produces 4 capture groups (1=enSingle, 2=enDouble, 3=zhSingle, 4=zhDouble). Post-match extraction uses `match[1] ?? match[2]` for en and `match[3] ?? match[4]` for zh.
2. **Assert promotion** at 3 inner sites per file — faq.q, faq.a, how_to_use. Old: `if (qMatch) faqZh.push(...)` silent skip. New: `assert(qMatch, '<slug>: missing FAQ[${i}].q translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.q)'); faqZh.push(...)`.
3. **File header comment update** to note the 2-part expansion + corrected count (16 = 13 FAQ/howTo across 7 engines + 3 input.labels on `solopreneur-cohort-retention-calculator`).
4. **Incidental fix** to a latent P128 bug: P128's `inputLabelZh` used `inputMatch[3]` against a 2-capture-group regex — `[3]` was always undefined, so P128's inputLabelZh probe was always null. P129's 4-group regex + `??` correctly extracts the zh value.

### P124 retention of P128 deviation (preserved exactly)
- En-side probes retain the `match[1].replace(/\\(.)/g, '$1')` escape-strip (P128 documented this for en apostrophes → `&#39;`).
- Post-P129, escape-strip is applied to whichever group matched — `(m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1')`. The same logic applies to title/desc/input probes as well.

## Why this batch exists

P128 extended probe coverage to ALL FAQ + how_to_use entries (541 + 638 = 1179 per language per `tests/scratch-p129-fullscope.mjs`). But P128 also had two latent bugs that this batch closes:

**Bug 1: Probe regex too narrow (16 silently-skipped keys).** P128's regex `'(?:[^'\\\\]|\\\\.)*?'` only matched single-quoted JS string literals. translations.ts mixes both quote styles — double quotes are used when the en value contains an apostrophe (e.g. `"you're"` would break a single-quoted string). 13 FAQ/how_to_use keys across 7 engines + 3 input.label keys on 1 engine = 16 total silently skipped by P128's "all 541 + 638 entries verified" claim. The audit script `tests/scratch-p129-fullscope.mjs` lists all 16: see "Affected entries" below.

**Bug 2: Silent-skip path on missing translation keys.** P128's probe loop used `if (qMatch) push(...)` — if a future engine edit added `faq.5` to its array but forgot to register `tools.${slug}.faq.5.q` in translations.ts, the test would silently pass. P129 promotes the defensive check to `assert(...)`.

## Affected entries (16 total across 8 engines)

| Engine | Affected keys |
|---|---|
| `solopreneur-burn-rate-calculator` | `how_to_use.1`, `how_to_use.7` |
| `solopreneur-cohort-retention-calculator` | `input.cohortSize.label`, `input.m1Retention.label`, `input.m2Retention.label` |
| `solopreneur-equity-dilution-calculator` | `how_to_use.0` |
| `solopreneur-freelance-rate-calculator` | `faq.3.a` |
| `solopreneur-market-size-estimator` | `faq.4.a` |
| `solopreneur-productivity-score` | `faq.2.a` |
| `solopreneur-revenue-projector` | `faq.0.a`, `faq.1.q`, `faq.2.a`, `faq.3.q`, `faq.3.a`, `faq.6.q` |
| `solopreneur-saas-valuation-calculator` | `faq.1.a` |

Investigation artifact (gitignored, not committed): `tests/scratch-p129-fullscope.mjs` enumerates these and produces the 16-key audit.

## Architectural scope change

| Dimension | Before P129 (P128 state) | After P129 |
|---|---|---|
| Renders on page | ✓ verified | ✓ verified (unchanged) |
| Translation key exists | ✗ silent skip | ✓ asserted |
| Walker path walked | ✓ yes | ✓ yes (unchanged) |
| Double-quoted values probe-able | ✗ silently skipped (16 keys) | ✓ probed (regex accepts both quote styles) |

P129 is **3 architectural fixes in one**: probe-regex completeness + missing-key assertion + latent inputLabelZh extraction bug.

## P129 lessons

1. **P128's "all 541 + 638 entries verified" claim was wrong about 16 entries.** The walker counts entries correctly, but the probe regex only captures entries using the single-quote syntax. A test that "passes by not testing what it claims" is the worst kind of false positive — this is the **second time** (after P127's "first input.label match in translations.ts") a probe-loop assertion has been too narrow. The pattern: any test that claims "all N entries verified" should be re-checked against the actual data shape, not the assumed one.
2. **Pre-flight check discovered the bug, not architectural review.** The P128 ship memory acknowledged the missing-translation assertion as a P129+ candidate (out of scope then). When applied at P129, it surfaced the regex bug as 16 false-positive failures. This is exactly the value defensive asserts provide: they force honesty about what the code actually does.
3. **In-line recovery pattern works for subagent interruption.** T1 implementer stopped before committing (P52 pattern); recovery inline (verify walker output + tsc + test, then commit) closed the gap. The P128 T2 fix subagent also used this pattern. Worth standardizing.
4. **Header comment accuracy matters.** Reviewer caught the brief's "16 keys across 7 engines" vs reality "13 FAQ/howTo across 7 + 3 input.labels on 1 = 16 total across 8 engines". A 6-line fix commit (`55cf1a7`) closed the doc drift before T2. Future plans should write accurate counts upfront — measure don't estimate.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` (non-build-dep subset) | 1200/0/0 ✓ (34 build-dep suites skipped incl. P123/P124) |
| P123 isolated test | 1/1 pass ✓ |
| P124 isolated test | 1/1 pass ✓ |
| Combined P123+P124 | 2/2 pass ✓ |
| Walker sanity (FAQ + how_to_use counts) | unchanged from P128 ✓ |
| Affected keys verified | 16/16 now probed (was 0/16 before P129) ✓ |
| skip-mode summary | unchanged (34 suites, P129 modifies in place) |
| Working tree | clean (excluding plan files) ✓ |

## Architectural concerns noted (out of scope)

1. The T1 reviewer flagged that P128's pre-existing `inputMatch[3]` extraction was always undefined (only 2 capture groups existed). P129's 4-group regex + `??` incidentally fixes this. **Noted, not a separate batch** — the fix is already in P129.
2. The 16 double-quoted keys could be re-formatted as single-quote (with `\'` escape). **Rejected as P129 scope** — Option A (regex extension) was the chosen path. Future batch could convert if project style mandate emerges.

## Related references

- **P123** — zh-composite i18n guard (P129 modifies)
- **P124** — en-composite i18n guard (P129 modifies, retains en-side escape-strip deviation)
- **P128** — FAQ + how_to_use walker counts (P129 builds on; also surfaced the bug P129 fixes)
- **P127** — input-label walker pattern (walker architecture lineage)
- **P103** — dead-i18n-keys-guard (defends against orphan-key re-additions; complementary to P129's missing-key detection)
- **P125** — CLAUDE.md invariant matrix guard (similar defense-in-depth posture)

## P130+ candidates

- **CLAUDE.md additional invariants** — extend P125 to assert commit count, last-ship date, category names
- **Input labels i18n backfill** — backfill 29 engines × 3-6 inputs = ~100-150 `tools.${slug}.input.${name}.label` keys (P129's regex now correctly probes all of them)
- **Tier-2 round 7** — composite data-driven lines (NEW approach)
- **CHANGELOG catch-up v7** — covers P121-P129 (9 batches)
