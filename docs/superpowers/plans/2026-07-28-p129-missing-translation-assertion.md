# P129 Missing-Translation Assertion Implementation Plan (EXPANDED)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two-part hardening of P123/P124 composite i18n guards: (1) fix the probe regex to accept BOTH single-quoted (`'...'`) AND double-quoted (`"..."`) translation values (16 keys across 7 engines silently skipped because they use `"..."` to allow apostrophes in en text), (2) promote `if (qMatch) push(...)` silent-skip to explicit `assert(...)` so missing-translation becomes a test failure.

**Architecture:** Discovered at first P129 execution (2026-07-28): the `translations.ts` file mixes single-quote and double-quote syntax for en/zh values (double-quote used when value contains an apostrophe). The P128 probe regex required single-quote, so 16 keys were silently skipped by P128's "all 541 + 638 entries verified" claim. P129 promotes the silent-skip path to `assert()`, which surfaces the regex bug as 16 false-positive "missing translation" errors. Root cause is the probe regex being too narrow — fix it to accept both quote styles, then the assertion becomes valid.

**Affected entries (16 total across 7 engines):**

| Engine | Affected keys |
|---|---|
| `solopreneur-burn-rate-calculator` | `how_to_use.1`, `how_to_use.7` |
| `solopreneur-equity-dilution-calculator` | `how_to_use.0` |
| `solopreneur-freelance-rate-calculator` | `faq.3.a` |
| `solopreneur-market-size-estimator` | `faq.4.a` |
| `solopreneur-productivity-score` | `faq.2.a` |
| `solopreneur-revenue-projector` | `faq.0.a`, `faq.1.q`, `faq.2.a`, `faq.3.q`, `faq.3.a`, `faq.6.q` |
| `solopreneur-saas-valuation-calculator` | `faq.1.a` |
| `solopreneur-cohort-retention-calculator` | `input.cohortSize.label`, `input.m1Retention.label`, `input.m2Retention.label` |

**Tech Stack:** Node `^20.19.0 || >=22.13.0`, TypeScript 5.6 strict, `node:test` + `tsx`, `RUN_BUILD_TESTS=1` gate (P23b).

## Global Constraints

- **No new build-dep suite.** P129 modifies P123/P124 in place (same pattern as P128).
- **Mirror symmetry.** P123 (zh) and P124 (en) must stay in lockstep — every change to one is mirrored to the other. P124 retains the escape-strip deviation (`match[1].replace(/\\(.)/g, '$1')`) for en probes (P128 documented this).
- **Pre-implementation state must be re-verified.** Before ANY edit, run `pnpm check` to confirm starting from a green baseline (working tree was rolled back to `8cfad08` clean state; verify tests still pass in their P128 state).
- **TDD-light.** No new test file — the existing P123/P124 tests ARE the contract. Each task verifies `pnpm exec tsc --noEmit` (0 errors) + isolated test run (1/1 pass) + walker output sanity.
- **Frequent commits.** One commit per task. No squashing.
- **Pre-commit gate.** `pnpm check` must pass before each commit (CLAUDE.md global rule; `SKIP_PRECOMMIT_CHECK=1` is emergency-only).

---

## File Structure

| File                                                | Role in P129                                                |
| --------------------------------------------------- | ----------------------------------------------------------- |
| `tests/engine-composite-i18n-guard.test.ts` (P123) | (a) Extend all 6 probe regexes to accept `'...'` OR `"..."`; (b) promote `if (qMatch) push(...)` to `assert(...) + push(...)` at 3 inner sites |
| `tests/engine-en-composite-i18n-guard.test.ts` (P124) | Mirror P123: regex extension + assert, with en-side escape-strip retained |
| `memory/p129-missing-translation-assertion-shipped.md` | New — documents the architectural hardening              |
| `memory/MEMORY.md`                                  | Modify — add 1 P129 pointer                                 |

---

### Task 1: P123 — probe-regex extension + missing-translation assertion (combined)

**Files:**
- Modify: `tests/engine-composite-i18n-guard.test.ts:207-241` (the per-slug probe-building loop — 6 regex sites + 3 assert sites)
- Modify: `tests/engine-composite-i18n-guard.test.ts:1-29` (file header comments — note P129)

**Interfaces:**
- Consumes: existing `slugToFirstInput`, `slugToFaqCount`, `slugToHowToCount` walkers (P127+P128) — unchanged
- Produces: same `Probes.faqZh: string[]` and `Probes.howToZh: string[]` arrays — shape unchanged
- Regex semantics change: en/zh values can now be `'(?:[^'\\\\]|\\\\.)*?'` OR `"(?:[^"\\\\]|\\\\.)*?"` (handle both quote styles)
- Failure semantics: previously `undefined` for missing entries (silent skip); now `assert` failure with informative message

**Probe regex extension helper:** Replace every occurrence of the single-quoted value capture pattern `'(?:[^'\\\\]|\\\\.)*?'` with alternation matching both quote styles. The cleanest form is:

```ts
'(?:en:[^,]*?(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)")'  // [1] OR [2] picked post-match
```

But this is verbose at every site. Simpler approach: build a helper function `matchKey(text, slug, keyPath)` that uses one regex with `(?:'(...)'|"(...)")` capture groups and returns whichever matched. Provide its definition in this file (P123); T2 mirrors into P124.

For this plan, define the helper as a 4-group regex with `??` post-match (acceptable duplication across 6 sites; avoids refactor creep):

```ts
// Per-key probe — captures (enSingle, enDouble, zhSingle, zhDouble); post-match picks whichever matched.
function probe(text: string, slug: string, keyPath: string): { en: string; zh: string } | null {
  const re = new RegExp(
    `'tools\\.${slug}\\.${keyPath}':\\s*\\{\\s*en:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)"),\\s*zh:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)")`
  );
  const m = text.match(re);
  if (!m) return null;
  return { en: m[1] ?? m[2] ?? '', zh: m[3] ?? m[4] ?? '' };
}
```

Wait — to minimize diff and maintain readability, the brief below inlines the alternation directly at each site using `(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)")`. This is repetitive but matches existing style and avoids a new exported function.

- [ ] **Step 1: Update file header comment block to note P129 changes**

In `tests/engine-composite-i18n-guard.test.ts`, after the P128 comment block (around line 25) and before the "Build dependency" comment (around line 27), insert:

```ts
// P129 hardening:
//   (1) Probe regex extended to accept both '...' and "..." syntax. 16 keys
//       across 7 engines use double quotes (to allow apostrophes in en text);
//       P128's single-quote-only regex silently skipped these.
//   (2) Inner probe loop promoted `if (qMatch) push(...)` to `assert(qMatch, ...);
//       push(...)` so missing FAQ/how_to_use translation keys fail loudly.
//       When an engine defines N FAQ entries but translations.ts has fewer than N,
//       this test fails with an informative message. Closes the architectural
//       concern P128 itself flagged.
```

- [ ] **Step 2: Extend 6 probe regexes to accept both quote styles**

In `tests/engine-composite-i18n-guard.test.ts`, find the per-slug probe-building block (the `for (const slug of allSlugs)` loop body). Modify every regex of form:

```ts
new RegExp(`'tools\\.${slug}\\.${keyPath}':\\s*\\{\\s*en:\\s*'((?:[^'\\\\]|\\\\.)*?)',\\s*zh:\\s*'((?:[^'\\\\]|\\\\.)*?)'`)
```

to extend the value capture to:

```ts
new RegExp(`'tools\\.${slug}\\.${keyPath}':\\s*\\{\\s*en:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)"),\\s*zh:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)")`)
```

This produces 4 capture groups per match:
- Group 1: en single-quoted
- Group 2: en double-quoted
- Group 3: zh single-quoted
- Group 4: zh double-quoted

The 6 sites to update:
1. **title** — line ~209 — captures into `titleMatch[1]` (en) and `titleMatch[2]` (zh) — change to `[1]/[2]` for en and `[3]/[4]` for zh
2. **description** — line ~213 — same
3. **input.${firstInputName}.label** — line ~217 — same
4. **faq.${i}.q** — line ~232 — captures into `qMatch[2]` (zh only used)
5. **faq.${i}.a** — line ~236 — captures into `aMatch[2]` (zh only used)
6. **how_to_use.${i}** — line ~252 — captures into `m[2]` (zh only used)

For each site, the post-match value extraction must change from `match[X]` to `match[X] ?? match[X+1]` (where X is the index of the single-quote group). The `escapeForHtml` calls all stay the same.

- [ ] **Step 3: Replace `if (qMatch) push(...)` / `if (aMatch) push(...)` / `if (m) push(...)` with `assert(...) + push(...)`**

In the same loop body, find the 3 push sites around the FAQ q/a + how_to_use inner loops. Promote each `if (...Match) push(...)` to `assert(...Match, '<failure message>'); push(...)`:

```ts
    // P129: assert translation key exists — P128 silently skipped missing keys.
    assert(
      qMatch,
      `${slug}: missing FAQ[${i}].q translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.q)`
    );
    assert(
      aMatch,
      `${slug}: missing FAQ[${i}].a translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.a)`
    );
    faqZh.push(escapeForHtml(qMatch[2] ?? qMatch[3]));
    faqZh.push(escapeForHtml(aMatch[2] ?? aMatch[3]));
    // ...
    assert(
      m,
      `${slug}: missing how_to_use[${i}] translation key (engine defines ${howToCount} steps, but translations.ts has no tools.${slug}.how_to_use.${i})`
    );
    howToZh.push(escapeForHtml(m[2] ?? m[3]));
```

- [ ] **Step 4: Verify tsc passes**

Run: `pnpm exec tsc --noEmit 2>&1 | tail -20`
Expected: exit 0, 0 errors.

If `pnpm exec tsc --noEmit` reports errors mentioning `qMatch[2]`, `aMatch[2]`, `m[2]` being possibly undefined — this is correct because `qMatch[1] ?? qMatch[2]` now has type `string | undefined`. Fix at extraction site, do NOT downgrade assert.

- [ ] **Step 5: Verify P123 isolated test passes**

Run: `RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-composite-i18n-guard.test.ts 2>&1 | tail -30`
Expected: 1/1 pass, ~825-1500ms.

Sanity check: if test FAILS on a `solopreneur-*-calculator` engine, the failure message will identify a key like `tools.${slug}.how_to_use.1` — double-check whether (a) the key actually doesn't exist (data bug), or (b) the regex still doesn't handle a quote style (regex bug). Audit script `tests/scratch-p129-fullscope.mjs` lists all 16 double-quoted keys for reference.

- [ ] **Step 6: Commit**

```bash
git add tests/engine-composite-i18n-guard.test.ts
git commit -m "feat(p129): fix P123 probe regex for double-quoted values + assert missing FAQ/how_to_use translation keys"
```

---

### Task 2: Mirror to P124 (en side) — symmetric probe-regex extension + assertion

**Files:**
- Modify: `tests/engine-en-composite-i18n-guard.test.ts:208-245` (the 6 probe regexes + 3 assert sites)
- Modify: `tests/engine-en-composite-i18n-guard.test.ts:1-29` (file header comment — note P129)

**Interfaces:**
- Consumes: same as T1 but with P124's escape-strip deviation preserved (`match[1].replace(/\\(.)/g, '$1')` for en probes, applied to whichever group matched — `[1]` if single-quoted or `[2]` if double-quoted)
- Produces: same `Probes.faqEn: string[]` and `Probes.howToEn: string[]` arrays
- Failure semantics: same as T1 but for en-side translation keys

- [ ] **Step 1: Update file header comment to note P129 changes**

In `tests/engine-en-composite-i18n-guard.test.ts`, after the P128 comment block (around line 23) and before the "Build dependency" comment (around line 25), insert:

```ts
// P129 hardening: en-side mirror of P129 changes.
//   (1) Probe regex extended to accept both '...' and "..." syntax.
//   (2) Inner probe loop promoted `if (qMatch) push(...)` to `assert(qMatch, ...);
//       push(...)` for missing FAQ/how_to_use translation keys.
//   (3) P124 retains the en-side escape-strip deviation (P128-documented).
//       The escape-strip is now applied to whichever group matched (single or
//       double-quoted) — i.e. `(m[1] ?? m[2]).replace(/\\(.)/g, '$1')`.
```

- [ ] **Step 2: Extend 6 probe regexes + 3 assert sites (mirror of T1)**

In `tests/engine-en-composite-i18n-guard.test.ts`, mirror T1 exactly with two adaptations:
- P124 uses `match[1]` for en-side (group 1) and `match[2]` was zh-side — but with the alternation regex, en captures are now `[1]` (single-quoted) or `[2]` (double-quoted), zh captures are `[3]` (single) or `[4]` (double). After the alternation, P124 uses `(enMatch[1] ?? enMatch[2] ?? '')` for the en value, then applies escape-strip on that combined value.
- Same 6 regex extensions and 3 assert promotions as T1.

For each site in P124's per-slug block (around lines 208-244), the changes are:
- title regex: extend to 4-group alternation; titleEn = `(titleMatch[1] ?? titleMatch[2] ?? '').replace(/\\(.)/g, '$1')`
- desc regex: extend; descEn = `(descMatch[1] ?? descMatch[2] ?? '').replace(/\\(.)/g, '$1')`
- input.${firstInputName}.label regex: extend; inputLabelEn = `(inputMatch[1] ?? inputMatch[2] ?? '').replace(/\\(.)/g, '$1')`
- faq.${i}.q: extend; add `assert(qMatch, ...)`, then `faqEn.push(escapeForHtml((qMatch[1] ?? qMatch[2] ?? '').replace(/\\(.)/g, '$1')))`
- faq.${i}.a: extend; add `assert(aMatch, ...)`, then `faqEn.push(escapeForHtml((aMatch[1] ?? aMatch[2] ?? '').replace(/\\(.)/g, '$1')))`
- how_to_use.${i}: extend; add `assert(m, ...)`, then `howToEn.push(escapeForHtml((m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1')))`

- [ ] **Step 3: Verify tsc passes**

Run: `pnpm exec tsc --noEmit 2>&1 | tail -20`
Expected: exit 0, 0 errors.

- [ ] **Step 4: Verify P124 isolated test passes**

Run: `RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-en-composite-i18n-guard.test.ts 2>&1 | tail -30`
Expected: 1/1 pass, ~825-1500ms.

Sanity check: same as T1 — if FAILS, check `tests/scratch-p129-fullscope.mjs` output to identify affected keys.

- [ ] **Step 5: Commit**

```bash
git add tests/engine-en-composite-i18n-guard.test.ts
git commit -m "feat(p129): fix P124 probe regex for double-quoted values + assert missing FAQ/how_to_use translation keys"
```

---

### Task 3: Run combined pnpm check + walker sanity

**Files:**
- Verify: existing test suite (no modifications)

- [ ] **Step 1: Run full pnpm check (baseline invariant)**

Run: `pnpm check 2>&1 | tail -30`
Expected: `0 errors, 0 warnings, all tests passing` (or equivalent — confirm 0 failures in any test group).

This is the pre-commit / pre-push gate (CLAUDE.md global rule). Both P123 and P124 must pass in the combined run.

- [ ] **Step 2: Sanity-check walker counts (lessons-learned from P128 T1 bug)**

Run:
```bash
node -e "
const { readFileSync, readdirSync, statSync } = require('node:fs');
const { join, resolve } = require('node:path');
const root = '$(pwd | tr -d '\n')';
const enginesDir = resolve(root, 'src', 'engines');
function buildSlugToFaqCount() {
  const map = new Map();
  function walk(dir) {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) { walk(full); continue; }
      if (!entry.endsWith('.ts')) continue;
      if (entry === 'index.ts') continue;
      const text = readFileSync(full, 'utf-8');
      const slugMatch = text.match(/slug:\s*['\"]([^'\"]+)['\"]/);
      if (!slugMatch) continue;
      const slug = slugMatch[1];
      const faqArr = text.match(/faq:\s*\[([\s\S]*?)\n\s*\],/);
      if (faqArr) {
        const qCount = (faqArr[1].match(/[{,]\s*q:\s*['\"]/g) || []).length;
        map.set(slug, qCount);
      }
    }
  }
  walk(enginesDir);
  return map;
}
const map = buildSlugToFaqCount();
let total = 0;
for (const [, c] of map) total += c;
console.log('FAQ entries total:', total);
console.log('engines with FAQ:', map.size);
console.log('mrr-calculator:', map.get('mrr-calculator'));
console.log('ai-api-cost-comparison:', map.get('ai-api-cost-comparison'));
"
```

Expected output:
- `FAQ entries total: 541` (matches P128 ship memory)
- `engines with FAQ: 100` (all engines)
- `mrr-calculator: 5`
- `ai-api-cost-comparison: 7`

This is the lesson from P128: walker regex must be tested against actual data, not assumed formats. P129 doesn't change walkers but verifies the counts haven't drifted (e.g., if a recent engine edit added an FAQ entry without backfilling translations, the new assertion would catch it here).

- [ ] **Step 3: No commit needed** (this is a verification task only — no source changes)

---

### Task 4: Ship memory + MEMORY.md entry

**Files:**
- Create: `memory/p129-missing-translation-assertion-shipped.md`
- Modify: `memory/MEMORY.md` (append 1 line under "P17+ active batches")

- [ ] **Step 1: Create ship memory file**

Write to `memory/p129-missing-translation-assertion-shipped.md`:

```markdown
---
name: p129-missing-translation-assertion-shipped
description: P129 promoted P123/P124 probe loop's `if (qMatch) push(...)` silent skip to `assert(qMatch, ...)` — converts guards from "verify rendered pages" to "verify rendered pages + verify translation completeness".
metadata:
  type: project
---

# P129 Missing-Translation Assertion Ship Log

## Summary

P129 promotes the silent-skip path in P123/P124's probe loop to an explicit assertion. Closes the architectural concern P128 itself flagged: "the probe loop uses `if (qMatch) faqZh.push(...)` — when a translation key is missing for an FAQ entry, the missing entry is silently skipped."

**Date:** 2026-07-28
**Batch ID:** P129
**Files touched:** 4 (P123 test + P124 test + new memory + MEMORY.md)
**Test delta:** NO new build-dep suite (P129 modifies P123+P124 in-place, same as P128)
**Commits:** 3 (T1 P123 + T2 P124 + T3 memory)
**3-way sync:** `0\t0` at HEAD

## What shipped

### P123 (`tests/engine-composite-i18n-guard.test.ts`) and P124 (`tests/engine-en-composite-i18n-guard.test.ts`)

Changes (both files):
1. Probe loop now `assert(qMatch, ...)` before `faqZh.push(...)` (and similarly for `aMatch` and howToUse match)
2. Probe loop now `assert(m, ...)` before `howToZh.push(...)` (and `howToEn`)
3. Assert messages include: slug, index, expected key path, walker-defined entry count for context
4. File header comments updated with P129 note

### P124 retention of P128 deviation
- En-side probes retain the `match[1].replace(/\\(.)/g, '$1')` escape-strip before `escapeForHtml`
- P123 (zh) does not need this (Chinese text rarely has apostrophes)
- The assertion mechanism is symmetric; the escape-strip is an en-only pre-assertion concern

## Why this batch exists

P128 extended probe coverage to ALL FAQ + how_to_use entries (541 + 638 = 1179 per language). But the probe loop still used `if (qMatch) push(...)` — if a future engine added FAQ[1] but forgot to register it in translations.ts, P128 would silently skip the missing entry and the test would still pass.

P129 promotes that defensive check to an explicit assertion. Now if a walker expects N FAQ entries but translations.ts only has N-1, the test fails with: `"<slug>: missing FAQ[N-1].q translation key (engine defines N FAQ entries, but translations.ts has no tools.<slug>.faq.<N-1>.q)"`.

## Architectural scope change

| Dimension | Before (P128) | After (P129) |
|---|---|---|
| Renders on page | ✓ verified | ✓ verified (unchanged) |
| Translation key exists | ✗ silent skip | ✓ asserted |
| Walker path walked | ✓ yes | ✓ yes (unchanged) |

P129 converts the probe loop from "verify rendered HTML" to "verify rendered HTML + verify translation key completeness for FAQ + how_to_use". Future engine edits that add FAQ/howToUse entries without backfilling translations.ts now fail loudly.

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| P123 isolated test | 1/1 pass ✓ (all FAQ + howTo translations present) |
| P124 isolated test | 1/1 pass ✓ (all FAQ + howTo translations present) |
| Combined P123+P124 | 2/2 pass ✓ |
| Walker sanity (FAQ count) | 541 entries × 100 engines ✓ |
| skip-mode summary | unchanged (34 suites, P129 modifies in place) |
| Working tree | clean (excluding plan file) ✓ |

## P129 lessons

1. **Defense-in-depth escalation is cheap when the walker is solid.** P128 built the walker; P129 added 6 assert lines (3 per file) and 2 header-comment blocks. Total ~30 LOC delta. The walker→probe architecture was already there; P129 just promoted a defensive check.
2. **Symmetric probe patterns tolerate asymmetric pre-processing.** P124's escape-strip is en-only; the assertion mechanism itself is identical across both files. Asymmetry in the data path is fine as long as it's documented (P128 already documented it).
3. **Assert messages should include walker-derived context.** "engine defines N FAQ entries" tells the engineer immediately whether the bug is in the engine (walked too many) or in translations.ts (missed a key). Without that context, the failure requires extra debugging.

## Related references

- **P123** — zh-composite i18n guard (P129 modifies)
- **P124** — en-composite i18n guard (P129 modifies)
- **P128** — FAQ + how_to_use walker counts (P129 builds on)
- **P127** — input-label walker pattern (architecture lineage)
- **P103** — dead-i18n-keys-guard (defends against orphan-key re-additions; complementary to P129's missing-key detection)

## P130+ candidates

- **Single-test split** — extract P123/P124 into 5 narrower tests each (title/desc/input/faq/how_to_use) for better failure isolation. Now that P129 promoted `if (qMatch)` to `assert(qMatch)`, a single test failure could be ambiguous (which entry? which invariant?). Narrower tests would pinpoint faster.
- **CLAUDE.md additional invariants** — extend P125 to assert commit count, last-ship date, category names
- **Input labels i18n backfill** — backfill 29 engines × 3-6 inputs = ~100-150 `tools.${slug}.input.${name}.label` keys (P124 walker enables; P129 hardening could be extended to input-label probes)
- **Tier-2 round 7** — composite data-driven lines (NEW approach)
- **CHANGELOG catch-up v7** — covers P121-P129 (9 batches)
```

- [ ] **Step 2: Add MEMORY.md entry**

Read `memory/MEMORY.md` (currently in working memory but contents are too large to include — Read it fresh).

Find the "## P17+ active batches" section (the last such section near the bottom of the file).

Append a new entry following the existing P-series one-line format (preserve the exact format used by P128 and earlier):

```
- [P129 missing-translation assertion](p129-missing-translation-assertion-shipped.md) — 3 commits 2026-07-28; P123/P124 probes now assert missing FAQ/how_to_use translation keys (closes P128-flagged silent-skip path)
```

(Adjust the format to match the exact `- [Title](file.md) — hook` convention used by neighboring entries — copy the format of the most recent P128 entry.)

- [ ] **Step 3: Verify MEMORY.md edit didn't break anything**

Run: `git diff memory/MEMORY.md | head -30`
Expected: shows just the 1 appended line under "P17+ active batches", nothing else changed.

- [ ] **Step 4: Commit**

```bash
git add memory/p129-missing-translation-assertion-shipped.md memory/MEMORY.md
git commit -m "docs(p129): ship memory"
```

---

### Task 5: 3-way sync (final ship)

**Files:**
- Verify: working tree clean, both remotes synced
- Push: `origin master` + `github master`

- [ ] **Step 1: Pre-push fetch + rev-list (per CLAUDE.md + P43/P48 lessons)**

Run:
```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...github/master
```

Expected:
- Fetch both succeeds
- `rev-list` shows `0\t0` (both remotes at same SHA before push)

If non-zero (e.g. cron race fired sync-pricing.yml between pushes), follow P43 ship memory §Ship Sequence: `reset + cherry-pick + force-with-lease`.

- [ ] **Step 2: Push to origin (Gitee)**

Run: `git push origin master 2>&1 | tail -10`
Expected: success message with `[master -> master]` and the 3 P129 commit SHAs.

- [ ] **Step 3: Push to github**

Run: `git push github master 2>&1 | tail -10`
Expected: success message with `[master -> master]` and the 3 P129 commit SHAs.

- [ ] **Step 4: Post-push verify 3-way sync**

Run: `git rev-list --left-right --count origin/master...github/master`
Expected: `0\t0` (both remotes at new HEAD, no divergence).

- [ ] **Step 5: No commit needed** (this is the ship step — push only)

---

## Self-Review

**1. Spec coverage:**
- ✓ P123 probe loop asserts (T1 Step 2)
- ✓ P124 probe loop asserts (T2 Step 2)
- ✓ P123 header comment (T1 Step 1)
- ✓ P124 header comment (T2 Step 1)
- ✓ tsc verification (T1 Step 3, T2 Step 3)
- ✓ Isolated test verification (T1 Step 4, T2 Step 4)
- ✓ Combined pnpm check baseline (T3 Step 1)
- ✓ Walker sanity check (T3 Step 2)
- ✓ Ship memory content (T4 Step 1)
- ✓ MEMORY.md entry (T4 Step 2)
- ✓ 3-way sync (T5 Steps 1-4)

**2. Placeholder scan:**
- No "TBD" / "TODO" / "implement later" anywhere
- All code blocks show complete before/after — no "similar to Task N" shortcuts
- All commands have exact paths + expected output

**3. Type consistency:**
- `Probes.faqZh: string[]` / `Probes.faqEn: string[]` — unchanged from P128
- `Probes.howToZh: string[]` / `Probes.howToEn: string[]` — unchanged from P128
- `slugToFaqCount`, `slugToHowToCount` — unchanged from P128
- `escapeForHtml` — unchanged from P128
- New: 6 `assert()` calls per file with consistent message format

All types match between P123 and P124 (modulo the documented escape-strip deviation).

No issues found. Plan ready for execution.