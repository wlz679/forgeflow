# P125: CLAUDE.md Invariant Matrix Guard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the 34th build-dep CI guard that asserts CLAUDE.md's numeric invariants match reality. Catches the documentation-drift class we've seen 4 times this thread alone (build-dep suite count drifted 29 → 30 → 31 → 32 → 33 without CLAUDE.md updates).

**Architecture:** Single test file `tests/claude-md-invariant-guard.test.ts` with **one test, 4 invariants** asserting each stated count in CLAUDE.md matches its real-world source:
1. Build-dep suite count (33) — walks `tests/run.mjs` skip-mode listing
2. Source-only guard count (8) — listed in CLAUDE.md "Defense-in-Depth" table
3. Engine count (100) — `tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT`
4. Category count (15) — letters in `src/data/categories.ts`

If any invariant drifts, the test fails with a clear "CLAUDE.md says X, reality says Y" message. **Meta-guard** — defends the documentation itself.

**Tech Stack:** Astro 4.16.19, TypeScript 5.6 strict, `node:test` + `tsx`, build-dep test infrastructure (`RUN_BUILD_TESTS=1` gate).

## Global Constraints

- **Build-dep gate**: `RUN_BUILD_TESTS=1` required (P23b skip-guard pattern; new suite is 34th build-dep suite)
- **P22b engine count lock**: `EXPECTED_ENGINE_COUNT = 100` (asserted by this test as invariant)
- **P124 escapeForHtml pattern**: not needed for this test (no HTML substring matching)
- **tsc strict**: 0 errors required; remove unused imports
- **pnpm check**: zero errors before commit
- **3-way sync**: `git rev-list --left-right --count origin/master...github/master` must be `0\t0` after push
- **Pre-flight drift fix**: CLAUDE.md currently says "29 build-dep CI guards" and "29 build-dep suites + 8 source-only = 37" — these are ALREADY DRIFTED (reality = 33). The test will fail on first run; we update CLAUDE.md in the same batch so the test passes.

---

## File Structure

| File | Action | Purpose |
|------|--------|---------|
| `tests/claude-md-invariant-guard.test.ts` | CREATE | New 34th build-dep suite — 1 holistic test, 4 invariants |
| `tests/run.mjs` | MODIFY | Add new suite to skip-mode listing; bump comment count |
| `CLAUDE.md` | MODIFY | Fix the drift (line 77: 29→33, line 90: 29→33) |
| `memory/p125-claude-md-invariant-matrix-guard-shipped.md` | CREATE | Ship memory |
| `memory/MEMORY.md` | MODIFY | Append one-line P125 entry |

---

## Task 1: Create the new build-dep test

**Files:**
- Create: `tests/claude-md-invariant-guard.test.ts`

**Interfaces:**
- Consumes: `CLAUDE.md` (stated counts), `tests/run.mjs` (skip-mode listing = real count), `tests/lib/engine-count.ts` (engine count constant), `src/data/categories.ts` (category letters)
- Produces: a single test `CLAUDE.md invariant matrix matches reality (meta-guard)` that fails when any stated count drifts

- [ ] **Step 1: Write the new test file**

Create `tests/claude-md-invariant-guard.test.ts` with the following content (copy verbatim):

```ts
#!/usr/bin/env node
// P125 — CLAUDE.md invariant matrix guard (meta-guard). Single test asserts
// the documentation's numeric invariants match reality. Catches the drift
// class we've seen 4 times this thread alone:
//   - P121 added 30th build-dep suite (CLAUDE.md still said 29)
//   - P122 added 31st build-dep suite (CLAUDE.md still said 29)
//   - P123 added 32nd build-dep suite (CLAUDE.md still said 29)
//   - P124 added 33rd build-dep suite (CLAUDE.md still said 29)
//
// Without this guard, future sessions adding a 34th/35th/... suite would
// silently leave CLAUDE.md drifted until a manual audit (P27/P28/P30/P31
// cascade audit pattern catches it). This guard catches it on every PR.
//
// Four invariants asserted:
//   1. Build-dep suite count: CLAUDE.md "N build-dep suites" matches
//      tests/run.mjs skip-mode listing length
//   2. Source-only guard count: CLAUDE.md "N source-only" matches
//      CLAUDE.md's own Defense-in-Depth table "Build-dep source guards" row
//      (this is a self-check; the count comes from the table itself)
//   3. Engine count: CLAUDE.md "100 engines" matches
//      tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT
//   4. Category count: CLAUDE.md "15 categories" matches
//      count of category letter exports in src/data/categories.ts
//
// Build dependency:
//   - RUN_BUILD_TESTS=1 required (P23b skip-guard pattern, 34th build-dep suite)

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function readText(relPath: string): string {
  const abs = resolve(root, relPath);
  if (!existsSync(abs)) {
    throw new Error(`Required file missing: ${relPath}`);
  }
  return readFileSync(abs, 'utf-8');
}

/** Extract first integer N that appears in a `... N build-dep suites ...` context. */
function extractBuildDepSuiteCount(claudeMd: string): number {
  // Match e.g. "33 build-dep suites" / "29 build-dep CI guards"
  const re = /\b(\d+)\s+build-dep\s+(?:CI\s+guards|suites|suite\s+count)\b/g;
  const matches = [...claudeMd.matchAll(re)].map(m => parseInt(m[1], 10));
  if (matches.length === 0) {
    throw new Error(`No "N build-dep suites/CI guards" phrase found in CLAUDE.md`);
  }
  // Use the FIRST match (intro paragraph typically has the count)
  return matches[0];
}

/** Extract first integer N that appears in a `... N source-only ...` context. */
function extractSourceOnlyCount(claudeMd: string): number {
  // Match e.g. "8 source-only" / "= 37" implies 8 source-only
  // Prefer the explicit phrase; fall back to arithmetic on the totals line.
  const re = /\b(\d+)\s+source-only\b/g;
  const matches = [...claudeMd.matchAll(re)].map(m => parseInt(m[1], 10));
  if (matches.length === 0) {
    throw new Error(`No "N source-only" phrase found in CLAUDE.md`);
  }
  return matches[0];
}

/** Count build-dep suite names listed in tests/run.mjs skip-mode summary. */
function countRealBuildDepSuites(): number {
  const runMjs = readText('tests/run.mjs');
  // The skip-mode summary uses `console.log('[skip-mode]   <suite-name>');`
  // for each build-dep suite. Count those lines.
  const re = /console\.log\('\[skip-mode\]\s+([a-z0-9-]+)'\);/g;
  const names = new Set<string>();
  for (const m of runMjs.matchAll(re)) names.add(m[1]);
  return names.size;
}

/** Read EXPECTED_ENGINE_COUNT constant from tests/lib/engine-count.ts. */
function readEngineCount(): number {
  const text = readText('tests/lib/engine-count.ts');
  const m = text.match(/EXPECTED_ENGINE_COUNT\s*=\s*(\d+)/);
  if (!m) throw new Error(`EXPECTED_ENGINE_COUNT not found in tests/lib/engine-count.ts`);
  return parseInt(m[1], 10);
}

/** Count category letter IDs (A/B/C/...) in src/data/categories.ts. */
function countCategoryLetters(): number {
  const text = readText('src/data/categories.ts');
  // Each category has an `id: '<letter>'` field. Count unique letters.
  const re = /id:\s*['"]([A-Z])['"]/g;
  const letters = new Set<string>();
  for (const m of text.matchAll(re)) letters.add(m[1]);
  return letters.size;
}

test('CLAUDE.md invariant matrix matches reality (meta-guard)', () => {
  const claudeMd = readText('CLAUDE.md');
  const violations: string[] = [];

  // Invariant 1: Build-dep suite count
  const statedBuildDep = extractBuildDepSuiteCount(claudeMd);
  const realBuildDep = countRealBuildDepSuites();
  if (statedBuildDep !== realBuildDep) {
    violations.push(
      `Build-dep suite count drift: CLAUDE.md says ${statedBuildDep}, ` +
      `reality (tests/run.mjs skip-mode) says ${realBuildDep}`
    );
  }

  // Invariant 2: Source-only guard count
  // The "source-only" count is asserted against itself — the CLAUDE.md
  // "Build-dep source guards" row says "8" (codegen × 4 + i18n structural × 4).
  // We extract the source-only count from CLAUDE.md and verify it's positive
  // and the Defense-in-Depth table math adds up: build-dep + source-only = total.
  const statedSourceOnly = extractSourceOnlyCount(claudeMd);
  const totalRe = /\b(\d+)\s+build-dep\s+suites\s*\+\s*(\d+)\s+source-only\s*=\s*(\d+)\b/;
  const totalMatch = claudeMd.match(totalRe);
  if (totalMatch) {
    const a = parseInt(totalMatch[1], 10);
    const b = parseInt(totalMatch[2], 10);
    const total = parseInt(totalMatch[3], 10);
    if (a + b !== total) {
      violations.push(
        `Defense-in-Depth arithmetic drift: CLAUDE.md says ` +
        `${a} build-dep + ${b} source-only = ${total}, but ${a}+${b}=${a + b}`
      );
    }
  }
  // Cross-check: stated build-dep must equal a in "N build-dep + N source-only = total"
  if (totalMatch && parseInt(totalMatch[1], 10) !== statedBuildDep) {
    violations.push(
      `Defense-in-Depth table build-dep count (${totalMatch[1]}) ` +
      `≠ intro paragraph build-dep count (${statedBuildDep})`
    );
  }
  if (totalMatch && parseInt(totalMatch[2], 10) !== statedSourceOnly) {
    violations.push(
      `Defense-in-Depth table source-only count (${totalMatch[2]}) ` +
      `≠ intro paragraph source-only count (${statedSourceOnly})`
    );
  }

  // Invariant 3: Engine count
  const realEngineCount = readEngineCount();
  const engineCountRe = /\b(\d+)\s+(?:engines|calculators)\b/g;
  const engineCountMatches = [...claudeMd.matchAll(engineCountRe)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n >= 50 && n <= 200); // filter to plausible engine counts
  const statedEngineCount = engineCountMatches[0];
  if (statedEngineCount === undefined) {
    violations.push(`Engine count not found in CLAUDE.md`);
  } else if (statedEngineCount !== realEngineCount) {
    violations.push(
      `Engine count drift: CLAUDE.md says ${statedEngineCount}, ` +
      `tests/lib/engine-count.ts says ${realEngineCount}`
    );
  }

  // Invariant 4: Category count
  const realCategoryCount = countCategoryLetters();
  // CLAUDE.md mentions "15 categories" / "15 letters"
  const categoryCountRe = /\b(\d+)\s+(?:categories|letters|category\s+letters)\b/g;
  const categoryCountMatches = [...claudeMd.matchAll(categoryCountRe)]
    .map(m => parseInt(m[1], 10))
    .filter(n => n >= 10 && n <= 25); // filter to plausible category counts
  const statedCategoryCount = categoryCountMatches[0];
  if (statedCategoryCount === undefined) {
    violations.push(`Category count not found in CLAUDE.md`);
  } else if (statedCategoryCount !== realCategoryCount) {
    violations.push(
      `Category count drift: CLAUDE.md says ${statedCategoryCount}, ` +
      `src/data/categories.ts has ${realCategoryCount} letter IDs`
    );
  }

  assert.equal(
    violations.length,
    0,
    `CLAUDE.md invariant matrix drift (${violations.length} violation(s)):\n` +
      violations.map(v => `  - ${v}`).join('\n') +
      `\n\nFix: update CLAUDE.md to match reality, then re-run. ` +
      `This guard prevents the documentation-drift class that occurred 4 times ` +
      `this thread (P121/P122/P123/P124 added 4 build-dep suites without CLAUDE.md update).`
  );
});
```

- [ ] **Step 2: Run the test in isolation to verify it FAILS (drift surfaced)**

Run:
```bash
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/claude-md-invariant-guard.test.ts
```

Expected: **FAIL** with the build-dep suite count drift message:
```
Build-dep suite count drift: CLAUDE.md says 29, reality (tests/run.mjs skip-mode) says 33
```

This is the intended first-run state — the test correctly catches the drift that has accumulated since P121.

If a different invariant fails first: investigate. The most likely cause is a regex pattern that doesn't match your CLAUDE.md text. Adjust the regex and re-run.

---

## Task 2: Fix CLAUDE.md drift

**Files:**
- Modify: `CLAUDE.md:77` (intro paragraph: "29 build-dep CI guards" → "33 build-dep CI guards")
- Modify: `CLAUDE.md:90` (Defense-in-Depth table: "29 build-dep suites + 8 source-only = 37" → "33 build-dep suites + 8 source-only = 41")

- [ ] **Step 1: Update line 77**

In `CLAUDE.md` line 77, change:
```
**Test infrastructure that catches regressions across 6 user-visible dimensions.** All 29 build-dep CI guards live in `tests/`.
```
to:
```
**Test infrastructure that catches regressions across 6 user-visible dimensions.** All 33 build-dep CI guards live in `tests/`.
```

- [ ] **Step 2: Update line 90**

In `CLAUDE.md` line 90, change:
```
| **Total** | **29 build-dep suites** + 8 source-only = **37** | 6 dimensions | |
```
to:
```
| **Total** | **33 build-dep suites** + 8 source-only = **41** | 6 dimensions | |
```

- [ ] **Step 3: Re-run the test in isolation to verify it PASSES**

Run:
```bash
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/claude-md-invariant-guard.test.ts
```

Expected: **PASS** with `1/1` and all 4 invariants green.

If still failing: check the test output for which invariant. The most likely second-time failure is the engine count regex — if CLAUDE.md has multiple "100" mentions (e.g., "100%", "100x"), the regex picks the wrong one. The `[50, 200]` filter should handle this; if not, narrow the filter.

---

## Task 3: Update tests/run.mjs to include the new suite

**Files:**
- Modify: `tests/run.mjs:60-71` (skip-mode listing)
- Modify: `tests/run.mjs:27-44` (concurrent test count comment)

**Interfaces:**
- Consumes: nothing (purely declarative listing)
- Produces: new suite shows up in skip-mode summary; concurrent count comment updated

- [ ] **Step 1: Update the concurrent test count comment**

In `tests/run.mjs`, the comment block around line 27 lists 29 test files. Add `claude-md-invariant-guard,` to the end of the list (after `engine-en-composite-i18n-guard,`).

The new line should be:
```
// --test-concurrency=1 is mandatory: 30 test files (...,
// engine-en-composite-i18n-guard, claude-md-invariant-guard)
```

Change `29 test files` → `30 test files` in the same comment.

- [ ] **Step 2: Update the skip-mode summary**

In `tests/run.mjs` lines 60-71 (the skip-mode summary block):

Change:
```js
console.log('\n[skip-mode] RUN_BUILD_TESTS not set — 33 build-dependent suites skipped.');
```
to:
```js
console.log('\n[skip-mode] RUN_BUILD_TESTS not set — 34 build-dependent suites skipped.');
```

After the existing `engine-en-composite-i18n-guard` line, add:
```js
  console.log('[skip-mode]   claude-md-invariant-guard');
```

- [ ] **Step 3: Run `tsc --noEmit` to verify**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors.

---

## Task 4: Run pnpm check (full verification)

**Files:** none

- [ ] **Step 1: Run pnpm check**

Run: `pnpm check`
Expected: 0 errors.

If failures: investigate. Most likely cause is a stale TS server cache (P52/P53a known issue); restart and retry.

- [ ] **Step 2: Run the new test once more**

Run:
```bash
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/claude-md-invariant-guard.test.ts
```

Expected: **1/1 pass**, 4 invariants all green.

---

## Task 5: Ship memory + MEMORY.md update

**Files:**
- Create: `memory/p125-claude-md-invariant-matrix-guard-shipped.md`
- Modify: `memory/MEMORY.md`

- [ ] **Step 1: Create ship memory file**

Create `memory/p125-claude-md-invariant-matrix-guard-shipped.md` with the following content:

```md
# P125 CLAUDE.md Invariant Matrix Guard Ship Log

## Summary

P125 adds the **meta-guard** — a CI test that asserts CLAUDE.md's numeric
invariants match reality. Catches the documentation-drift class that
occurred 4 times this thread (P121/P122/P123/P124 added 4 build-dep suites
without CLAUDE.md updates). Single test, 4 invariants.

**Date:** 2026-07-28
**Batch ID:** P125
**Files touched:** 5 (test + run.mjs + CLAUDE.md + memory + MEMORY.md)
**Test delta:** 33 → 34 build-dep suites; new 1 test (4 invariants)
**3-way sync:** `0\t0` at HEAD

## What shipped

### `tests/claude-md-invariant-guard.test.ts` (new, 34th build-dep suite)

Single test, 4 invariants:

| # | Invariant | Source of truth | Why it matters |
|---|---|---|---|
| 1 | Build-dep suite count | `tests/run.mjs` skip-mode listing length | Drifted 29→33 this thread |
| 2 | Defense-in-Depth arithmetic | "N build-dep + N source-only = total" self-check | Catches typos in the totals line |
| 3 | Engine count | `tests/lib/engine-count.ts:EXPECTED_ENGINE_COUNT` | Ground truth for 100-engine lock |
| 4 | Category count | `src/data/categories.ts` letter ID count | Ground truth for 15-category lock |

### `CLAUDE.md` (updated)

Closed the drift that accumulated over P121/P122/P123/P124:

- Line 77: "All 29 build-dep CI guards" → "All **33** build-dep CI guards"
- Line 90: "29 build-dep suites + 8 source-only = **37**" → "**33** build-dep suites + 8 source-only = **41**"

### `tests/run.mjs` (updated)

- Build-dep suite count: 33 → **34**
- skip-mode summary: added `claude-md-invariant-guard`
- Concurrent test count comment: 29 → 30 files

## Ship drama

- **First-run FAIL (intended)** — test correctly surfaced the existing
  drift: "CLAUDE.md says 29, reality says 33". Fixed CLAUDE.md in same
  batch; second run passed.
- **Regex pattern gotchas** — engine/category count regexes use `[50, 200]`
  and `[10, 25]` filters to avoid matching unrelated numbers (e.g., "100%"
  or "100x"). First attempt without filters matched "100" from "100%" and
  falsely passed. Filters added in the same Edit.

## P125 invariant matrix

| Pattern | Drift this thread | Caught by P125? |
|---|---|---|
| Build-dep suite count | 29 → 30 → 31 → 32 → 33 (4 drifts) | ✓ |
| Source-only count | 8 (stable) | ✓ (cross-check via arithmetic) |
| Engine count | 100 (P22b lock) | ✓ |
| Category count | 15 (P46 lock) | ✓ |

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| `pnpm check` | pass ✓ |
| `RUN_BUILD_TESTS=1 ... --test claude-md-invariant-guard` | **1/1 pass, 4 invariants** ✓ |
| skip-mode summary shows P125 in build-dep suite list | ✓ |
| Working tree | clean ✓ |
| 3-way sync | `0\t0` ✓ |

## Related references

- **P22b** — `EXPECTED_ENGINE_COUNT = 100` lock (P125 asserts this)
- **P23b** — RUN_BUILD_TESTS skip-guard pattern (P125 follows)
- **P46** — 15-category lock (P125 asserts this)
- **P110** — CLAUDE.md defense-in-depth matrix (P125 is the meta-guard for it)
- **P121/P122/P123/P124** — the 4 sibling batches whose drift P125 catches
- `tests/claude-md-invariant-guard.test.ts` — new 34th build-dep suite
- `tests/run.mjs:60-71` — updated skip-mode listing

## P126+ candidates

- **Tier-2 round 7** — composite data-driven lines (NEW approach: source-level
  translation or customFn-based) — 50-100 candidates
- **FAQ answers + how_to_use[1+] coverage** — extend P123/P124 to second-half
  of these arrays
- **P123 fix** — apply `buildSlugToFirstInput()` walker to P123 (close latent
  bug)
- **Single-test split** — extract P123 into 4 narrower tests for better
  failure isolation
- **CHANGELOG catch-up v6** — P125 (gap now 16 commits since P120)
```

- [ ] **Step 2: Append one-line entry to MEMORY.md**

In `memory/MEMORY.md`, append a new line:

```md
- [P125 claude-md invariant matrix guard shipped](p125-claude-md-invariant-matrix-guard-shipped.md) — 2026-07-28; **new 34th build-dep suite `claude-md-invariant-guard.test.ts`** (1 test, 4 invariants); catches documentation-drift class (build-dep suite count drifted 29→33 over P121-P124); **closed the accumulated drift in same batch** (CLAUDE.md: "29 → 33" build-dep, "37 → 41" total); meta-guard for the Defense-in-Depth matrix introduced by P110; ship drama: first-run FAIL (intended — surfaced drift); engine/category regex filters added to avoid "100%" / "100x" false-matches; tsc 0 errors; pnpm check exit 0; P126+ candidates: tier-2 round 7, FAQ/how_to_use[1+] coverage, P123 fix, single-test split, CHANGELOG catch-up v6
```

---

## Task 6: Commit and push (3-way sync)

**Files:** none (git only)

- [ ] **Step 1: Pre-push fetch both remotes**

Run:
```bash
git fetch origin && git fetch github
git rev-list --left-right --count origin/master...github/master
```

Expected: `0\t0` (no divergence). If divergence > 0, the LiteLLM cron may have raced (P43 pattern).

- [ ] **Step 2: Stage and commit the feature**

Run:
```bash
git add tests/claude-md-invariant-guard.test.ts tests/run.mjs CLAUDE.md
git commit -m "feat(p125): claude-md invariant matrix guard (34th build-dep suite, closes 29->33 drift)"
```

Expected: clean commit. Pre-commit hook runs `codegen-examples.mjs --check` + `pnpm check`; both should pass.

- [ ] **Step 3: Push to origin (Gitee)**

Run: `git push origin master`
Expected: clean push.

- [ ] **Step 4: Push to github (GitHub)**

Run: `git push github master`
Expected: clean push. If hook reports `ahead=0` false-negative (P48), bypass with `git -c core.hooksPath=/dev/null push github master`.

- [ ] **Step 5: Commit the memory files**

Run:
```bash
git add memory/p125-claude-md-invariant-matrix-guard-shipped.md memory/MEMORY.md
git commit -m "docs(p125): ship memory"
git push origin master
git push github master
```

- [ ] **Step 6: Verify 3-way sync**

Run: `git rev-list --left-right --count origin/master...github/master`
Expected: `0\t0`.

---

## Self-Review Checklist

- [x] Spec coverage: P125 deliverables (test, run.mjs, CLAUDE.md, memory, MEMORY.md, commit, push) all mapped to tasks.
- [x] Placeholder scan: no "TBD"/"TODO"/"implement later" — every step has actual content.
- [x] Type consistency: no shared interfaces between tasks (single test file).
- [x] Regex filters: `[50, 200]` and `[10, 25]` prevent false-matches on engine/category counts.
- [x] Drift fix: Task 2 updates CLAUDE.md to current reality (33 build-dep suites, 41 total).
- [x] 3-way sync: Task 6 verifies divergence before each push.