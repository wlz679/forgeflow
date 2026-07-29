# P131 Single-Test Split Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace P123 (zh composite i18n guard, 329 lines) and P124 (en composite i18n guard, 328 lines) with 6 narrower single-dimension tests (input/FAQ/how_to_use × zh/en), extracting 3 walker functions to a shared helper.

**Architecture:** Delete 2 large monolithic tests; create 6 focused tests (~70-100 lines each) + 1 shared walker helper (~120 lines). Each new test imports the walker + does ONE dimension's probe loop. Title and description coverage already provided by P121/P122 (which cover both en + zh in single files); P131 focuses on the 3 dimensions NOT yet independently covered: input label (1 per slug, single string), FAQ (2×N per slug, all entries), how_to_use (M per slug, all entries). Failure isolation improves dramatically: a single engine's failure in any of 3 dimensions now points to the specific surface.

**Tech Stack:** TypeScript 5.6 strict, node:test + node:assert, tsx (test runner)

## Global Constraints

- Node `^20.19.0 || >=22.13.0`
- Each new test file MUST follow the P23b skip-mode pattern: `if (!process.env.RUN_BUILD_TESTS) process.exit(0);` near top (after imports)
- Each new test file MUST include an `ensureBuilt()` helper that auto-runs `pnpm build` if `dist/` missing (mirror P123/P124 pattern)
- File naming: `engine-{zh|en}-{dimension}-i18n-guard.test.ts` (drop "composite" since single-dimension, matches P121/P122 naming convention)
- Walker extraction target: `tests/_composite-i18n-walkers.ts` (underscore prefix matches existing `_clerk-build-helper.ts` convention)
- `tests/run.mjs` auto-discovers all `.test.ts` files (no registration code change needed); only the skip-mode summary at lines 60-79 must be updated
- Total build-dep suite count: 34 → 38 (delta +4: -2 P123/P124, +6 new)
- Total test (subtest) count: 1200 → 1204 (each old P123/P124 had 1 subtest; each new dimension test has 1 subtest; net +4 subtests)
- `pnpm check` baseline: 1200/0/0 (must stay green after each task; mechanical per-task delta only — no test count change in non-build-dep suites)
- Existing 5 double-quoted translation keys (3 cohort-retention input labels + 13 FAQ/howTo across 7 engines per P129) MUST still be probed correctly by the new tests
- en-side probes retain P128's escape-strip deviation: `(m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1')` before HTML escaping

---

## File Structure

| File | Action | Responsibility |
|---|---|---|
| `tests/_composite-i18n-walkers.ts` | Create | 3 walker functions (firstInput / faqCount / howToCount) + escapeForHtml + regex helpers |
| `tests/engine-zh-input-i18n-guard.test.ts` | Create | Single test: zh input label rendered |
| `tests/engine-zh-faq-i18n-guard.test.ts` | Create | Single test: zh FAQ q + a rendered |
| `tests/engine-zh-howto-i18n-guard.test.ts` | Create | Single test: zh how_to_use steps rendered |
| `tests/engine-en-input-i18n-guard.test.ts` | Create | Single test: en input label rendered (with escape-strip) |
| `tests/engine-en-faq-i18n-guard.test.ts` | Create | Single test: en FAQ q + a rendered (with escape-strip) |
| `tests/engine-en-howto-i18n-guard.test.ts` | Create | Single test: en how_to_use steps rendered (with escape-strip) |
| `tests/engine-composite-i18n-guard.test.ts` | Delete | Replaced by 3 zh dimension tests |
| `tests/engine-en-composite-i18n-guard.test.ts` | Delete | Replaced by 3 en dimension tests |
| `tests/run.mjs` | Modify | Skip-mode summary lines 60-79: -2 names, +6 names |
| `memory/p131-single-test-split-shipped.md` | Create | Ship log |
| `MEMORY.md` | Modify | Add P131 entry |

---

### Task 1: Pre-flight verification

**Files:** none modified

**Step 1.1: Verify current state matches baseline**

```bash
cd /d/E/独立站/youtube-tools
git rev-parse HEAD
git status --short
git rev-list --left-right --count origin/master...github/master
```

Expected:
- HEAD on `19554ad` (P130 commit)
- Working tree shows only `docs/superpowers/plans/2026-07-28-p128/129/130-*.md` as untracked (intended)
- `0	0` (clean 3-way sync)

**Step 1.2: Verify P123 + P124 still pass under build-dep suite**

```bash
cd /d/E/独立站/youtube-tools
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-composite-i18n-guard.test.ts tests/engine-en-composite-i18n-guard.test.ts
```

Expected: `2/2 pass`. If failing, stop — do NOT proceed without resolving.

**Step 1.3: Verify walker output counts are stable**

```bash
cd /d/E/独立站/youtube-tools
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-composite-i18n-guard.test.ts 2>&1 | grep -E "missing FAQ|missing how_to_use"
```

Expected: empty output (no violations). The 541 FAQ + 638 howTo counts are stable from P128; record them in plan-step report for cross-check in Task 6.

**Step 1.4: Document current baseline**

Save the output of `wc -l tests/engine-composite-i18n-guard.test.ts tests/engine-en-composite-i18n-guard.test.ts` (expecting `329 tests/engine-composite-i18n-guard.test.ts` and `328 tests/engine-en-composite-i18n-guard.test.ts`).

- [ ] Task 1 complete when: (a) HEAD = 19554ad, (b) P123+P124 both pass under build-dep suite, (c) 0 violations, (d) baseline line counts recorded

**No commit for this task** — verification only.

---

### Task 2: Create shared walker helper

**Files:**
- Create: `tests/_composite-i18n-walkers.ts`

**Interfaces:**
- Produces:
  - `buildSlugToFirstInput(): Map<string, string>` — slug → first input name (P127)
  - `buildSlugToFaqCount(): Map<string, number>` — slug → FAQ entry count (P128)
  - `buildSlugToHowToCount(): Map<string, number>` — slug → howToUse entry count (P128)
  - `escapeForHtml(s: string): string` — HTML-escape helper
  - `buildTranslationKeyRegex(key: string): RegExp` — returns regex with 4 capture groups (1=enSingle, 2=enDouble, 3=zhSingle, 4=zhDouble)
  - `extractAllEngineSlugs(translationsText: string): string[]` — sorted list of all 100 engine slugs from translations.ts

- [ ] **Step 2.1: Write the helper file**

Write `tests/_composite-i18n-walkers.ts` with EXACTLY the following content (preserve comments + structure verbatim):

```typescript
#!/usr/bin/env node
// P131 — Shared walker helpers for the 6 single-dimension composite i18n
// guards that replace P123/P124. Lineage:
//
//   buildSlugToFirstInput()  — P127 (slug → first input name; fixes which-key)
//   buildSlugToFaqCount()    — P128 (slug → FAQ entry count; extends coverage)
//   buildSlugToHowToCount()  — P128 (slug → howToUse entry count; extends coverage)
//   escapeForHtml()          — P123/P124 inline helper (HTML-escape for probe comparison)
//   buildTranslationKeyRegex() — P129 (regex with 4 capture groups for '...' / "..." en/zh)
//   extractAllEngineSlugs()  — P123/P124 inline helper (slug list from translations.ts)
//
// Consumed by:
//   - engine-zh-input-i18n-guard.test.ts  (firstInput)
//   - engine-zh-faq-i18n-guard.test.ts    (faqCount)
//   - engine-zh-howto-i18n-guard.test.ts  (howToCount)
//   - engine-en-input-i18n-guard.test.ts  (firstInput + escape-strip)
//   - engine-en-faq-i18n-guard.test.ts    (faqCount + escape-strip)
//   - engine-en-howto-i18n-guard.test.ts  (howToCount + escape-strip)
//
// Build dependency: NONE (helpers only read src/engines/**/*.ts + translations.ts).
// The 6 consuming test files still need RUN_BUILD_TESTS=1 + ensureBuilt().

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const root = resolve(import.meta.dirname, '..');

function walkEnginesDir(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...walkEnginesDir(full));
      continue;
    }
    if (!entry.endsWith('.ts')) continue;
    if (entry === 'index.ts') continue;
    files.push(full);
  }
  return files;
}

// Walk src/engines/**/*.ts and build slug → firstInputName map.
// Why this is needed: a naive "first input.X.label match in translations.ts"
// probes the wrong key for slugs where translations.ts has dead input keys
// (e.g. solopreneur-freelance-rate-calculator has `input.skill.label` in
// translations.ts but no `skill` input in the engine — page renders
// `annualIncome` first). Using the engine's actual first input name gives
// the correct probe.
export function buildSlugToFirstInput(): Map<string, string> {
  const map = new Map<string, string>();
  const enginesDir = resolve(root, 'src', 'engines');
  for (const full of walkEnginesDir(enginesDir)) {
    const text = readFileSync(full, 'utf-8');
    const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    // Match the inputs: [...] array — first `name:` inside is the first input.
    const inputsArr = text.match(/inputs:\s*\[([\s\S]*?)\]/);
    if (!inputsArr) continue;
    const nameMatch = inputsArr[1].match(/name:\s*['"]([a-zA-Z][a-zA-Z0-9_-]*)['"]/);
    if (nameMatch) {
      map.set(slug, nameMatch[1]);
    }
  }
  return map;
}

// Walk src/engines/**/*.ts and build slug → faqCount map.
// Counts `q: '...'` lines inside `faq: [...]` array. Each FAQ entry has exactly
// one `q:`, so the count gives the number of entries.
// Match `q:` preceded by `{` or `,` (with optional whitespace) so both
// single-line `{ q: "...", a: "..." },` and multi-line formats are counted.
export function buildSlugToFaqCount(): Map<string, number> {
  const map = new Map<string, number>();
  const enginesDir = resolve(root, 'src', 'engines');
  for (const full of walkEnginesDir(enginesDir)) {
    const text = readFileSync(full, 'utf-8');
    const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    const faqArr = text.match(/faq:\s*\[([\s\S]*?)\n\s*\],/);
    if (faqArr) {
      const qCount = (faqArr[1].match(/[{,]\s*q:\s*['"]/g) || []).length;
      map.set(slug, qCount);
    }
  }
  return map;
}

// Walk src/engines/**/*.ts and build slug → howToUseCount map.
// Counts top-level quoted strings inside `howToUse: [...]` array.
// Each entry is a quoted string on its own line.
export function buildSlugToHowToCount(): Map<string, number> {
  const map = new Map<string, number>();
  const enginesDir = resolve(root, 'src', 'engines');
  for (const full of walkEnginesDir(enginesDir)) {
    const text = readFileSync(full, 'utf-8');
    const slugMatch = text.match(/slug:\s*['"]([^'"]+)['"]/);
    if (!slugMatch) continue;
    const slug = slugMatch[1];
    const howArr = text.match(/howToUse:\s*\[([\s\S]*?)\n\s*\],/);
    if (howArr) {
      const sCount = (howArr[1].match(/^\s*['"]/gm) || []).length;
      map.set(slug, sCount);
    }
  }
  return map;
}

// HTML-escape a string for probe comparison. The dist/ pages HTML-escape
// user-visible text, so we must do the same to compare probes correctly.
export function escapeForHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// Build regex to extract en + zh values from a translations.ts key entry.
// Returns 4 capture groups: 1=enSingle-quoted, 2=enDouble-quoted,
// 3=zhSingle-quoted, 4=zhDouble-quoted. Use `m[3] ?? m[4]` for zh and
// `m[1] ?? m[2]` for en (P129 alternation pattern — closes the double-quote
// silent-skip bug that P128's single-quote-only regex had).
export function buildTranslationKeyRegex(key: string): RegExp {
  return new RegExp(
    `'${key.replace(/\./g, '\\.')}':\\s*\\{\\s*en:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)"),\\s*zh:\\s*(?:'((?:[^'\\\\]|\\\\.)*?)'|"((?:[^"\\\\]|\\\\.)*?)")`
  );
}

// Extract all 100 engine slugs from translations.ts. Anchored on 'tools.'
// prefix and sorted alphabetically for stable iteration.
export function extractAllEngineSlugs(translationsText: string): string[] {
  const slugRe = /^\s*'tools\.(solopreneur-[a-z0-9-]+)\./gm;
  const slugs = new Set<string>();
  for (const m of translationsText.matchAll(slugRe)) slugs.add(m[1]);
  return [...slugs].sort();
}
```

- [ ] **Step 2.2: Smoke-test the helper in isolation**

```bash
cd /d/E/独立站/youtube-tools
node --import tsx --eval "import('./tests/_composite-i18n-walkers').then(m => { const firstInput = m.buildSlugToFirstInput(); const faq = m.buildSlugToFaqCount(); const howto = m.buildSlugToHowToCount(); console.log('slugs-with-firstInput:', firstInput.size); console.log('slugs-with-faq:', faq.size); console.log('slugs-with-howto:', howto.size); console.log('mrr-calculator:', JSON.stringify({input: firstInput.get('solopreneur-mrr-calculator'), faq: faq.get('solopreneur-mrr-calculator'), howto: howto.get('solopreneur-mrr-calculator')}, null, 2)); })"
```

Expected:
- `slugs-with-firstInput: 100`
- `slugs-with-faq: 100`
- `slugs-with-howto: 100` (some engines may have 0 — those without howToUse arrays still get mapped; check actual count)
- `mrr-calculator: {input: "subscriberCount", faq: 5, howto: 10}` (verified from src/engines/saas/mrr-calculator.ts at plan-write time)

If any walker returns wrong count for the sample, STOP and fix before proceeding.

- [ ] **Step 2.3: Verify regex helper matches a known double-quoted key**

```bash
cd /d/E/独立站/youtube-tools
node --import tsx --eval "import('./tests/_composite-i18n-walkers').then(m => { const fs = require('fs'); const text = fs.readFileSync('src/i18n/translations.ts', 'utf-8'); const re = m.buildTranslationKeyRegex('tools.solopreneur-cohort-retention-calculator.input.cohortSize.label'); const match = text.match(re); console.log('groups:', match && [match[1], match[2], match[3], match[4]]); })"
```

Expected: `groups: [null, '"初始规模"', null, null]` (or similar — the cohort-retention input uses double quotes for zh because the en value has an apostrophe or special char). The exact values aren't important — what matters is that at least one group is non-null. If all null, the regex is broken.

- [ ] **Step 2.4: Commit**

```bash
cd /d/E/独立站/youtube-tools
git add tests/_composite-i18n-walkers.ts
git commit -m "feat(p131): extract composite i18n walker helpers to shared module"
```

- [ ] Task 2 complete when: (a) file exists at `tests/_composite-i18n-walkers.ts`, (b) smoke test shows 100 slugs in each walker, (c) regex matches a known double-quoted key, (d) committed

---

### Task 3: Create 3 zh single-dimension tests

**Files:**
- Create: `tests/engine-zh-input-i18n-guard.test.ts`
- Create: `tests/engine-zh-faq-i18n-guard.test.ts`
- Create: `tests/engine-zh-howto-i18n-guard.test.ts`

**Interfaces (from Task 2):**
- `buildSlugToFirstInput(): Map<string, string>` (input test only)
- `buildSlugToFaqCount(): Map<string, number>` (FAQ test only)
- `buildSlugToHowToCount(): Map<string, number>` (howto test only)
- `escapeForHtml(s: string): string`
- `buildTranslationKeyRegex(key: string): RegExp`
- `extractAllEngineSlugs(translationsText: string): string[]`

- [ ] **Step 3.1: Write `tests/engine-zh-input-i18n-guard.test.ts`**

```typescript
#!/usr/bin/env node
// P131 — Single-dimension test: zh input label. Replaces dimension 3 of 5
// from P123 (composite i18n guard). Title (dim 1) is covered by P121 and
// description (dim 2) by P122 — both cover en + zh in single files.
// This file covers ONLY input label rendering for zh pages.
//
// Why split: P123's 5-in-1 failure mode pointed at the test file but not at
// the specific dimension. After P131, an input-label regression fails only
// this test, not the FAQ or how_to_use tests.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToFirstInput,
  escapeForHtml,
  buildTranslationKeyRegex,
  extractAllEngineSlugs,
} from './_composite-i18n-walkers';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'zh', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-zh-input] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every zh engine page renders the first input label (P131 split from P123 dim 3)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToFirstInput = buildSlugToFirstInput();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const firstInputName = slugToFirstInput.get(slug);
    if (!firstInputName) continue; // engine has no inputs (rare)
    const m = translationsText.match(
      buildTranslationKeyRegex(`tools.${slug}.input.${firstInputName}.label`)
    );
    if (!m) {
      // Missing input label key — out of scope for this test (covered by dead-keys-guard).
      continue;
    }
    // zh value: group 3 (single-quoted) ?? group 4 (double-quoted).
    const inputLabelZh = m[3] ?? m[4];
    const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
    if (!existsSync(zhPath)) {
      violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const rawHtml = readFileSync(zhPath, 'utf-8');
    if (!rawHtml.includes(escapeForHtml(inputLabelZh))) {
      violations.push(`${slug}: missing first input label "${inputLabelZh}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Input label i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
```

- [ ] **Step 3.2: Write `tests/engine-zh-faq-i18n-guard.test.ts`**

```typescript
#!/usr/bin/env node
// P131 — Single-dimension test: zh FAQ q + a. Replaces dimension 4 of 5
// from P123. Title (P121) and description (P122) covered separately; input
// label in engine-zh-input-i18n-guard.test.ts; how_to_use in
// engine-zh-howto-i18n-guard.test.ts.
//
// Probes every FAQ q AND every FAQ a entry (not just [0]) — extends P128
// walker pattern. P129 promoted the probe loop's missing-key check to
// assert() so missing FAQ translations fail loudly.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToFaqCount,
  escapeForHtml,
  buildTranslationKeyRegex,
  extractAllEngineSlugs,
} from './_composite-i18n-walkers';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'zh', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-zh-faq] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every zh engine page renders all FAQ q + a entries (P131 split from P123 dim 4)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToFaqCount = buildSlugToFaqCount();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const faqCount = slugToFaqCount.get(slug) ?? 0;
    if (faqCount === 0) continue; // engine has no FAQ entries
    for (let i = 0; i < faqCount; i++) {
      const qMatch = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.faq.${i}.q`)
      );
      const aMatch = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.faq.${i}.a`)
      );
      assert(
        qMatch,
        `${slug}: missing FAQ[${i}].q translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.q)`
      );
      assert(
        aMatch,
        `${slug}: missing FAQ[${i}].a translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.a)`
      );
      const qZh = escapeForHtml(qMatch[3] ?? qMatch[4]);
      const aZh = escapeForHtml(aMatch[3] ?? aMatch[4]);
      const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
      if (!existsSync(zhPath)) {
        violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(zhPath, 'utf-8');
      if (!rawHtml.includes(qZh)) {
        violations.push(`${slug}: missing FAQ[${i}].q (zh length ${qZh.length})`);
      }
      if (!rawHtml.includes(aZh)) {
        violations.push(`${slug}: missing FAQ[${i}].a (zh length ${aZh.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `FAQ i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
```

- [ ] **Step 3.3: Write `tests/engine-zh-howto-i18n-guard.test.ts`**

```typescript
#!/usr/bin/env node
// P131 — Single-dimension test: zh how_to_use steps. Replaces dimension 5 of 5
// from P123. Title (P121), description (P122), input label (engine-zh-input-i18n-guard),
// FAQ (engine-zh-faq-i18n-guard) covered separately.
//
// Probes every how_to_use step (not just [0]) — extends P128 walker pattern.
// P129 promoted the probe loop's missing-key check to assert() so missing
// how_to_use translations fail loudly.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToHowToCount,
  escapeForHtml,
  buildTranslationKeyRegex,
  extractAllEngineSlugs,
} from './_composite-i18n-walkers';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'zh', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-zh-howto] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every zh engine page renders all how_to_use steps (P131 split from P123 dim 5)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToHowToCount = buildSlugToHowToCount();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const howToCount = slugToHowToCount.get(slug) ?? 0;
    if (howToCount === 0) continue; // engine has no how_to_use
    for (let i = 0; i < howToCount; i++) {
      const m = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.how_to_use.${i}`)
      );
      assert(
        m,
        `${slug}: missing how_to_use[${i}] translation key (engine defines ${howToCount} steps, but translations.ts has no tools.${slug}.how_to_use.${i})`
      );
      const howToZh = escapeForHtml(m[3] ?? m[4]);
      const zhPath = resolve(root, 'dist', 'zh', slug, 'index.html');
      if (!existsSync(zhPath)) {
        violations.push(`${slug}: dist/zh/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(zhPath, 'utf-8');
      if (!rawHtml.includes(howToZh)) {
        violations.push(`${slug}: missing how_to_use[${i}] (zh length ${howToZh.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `how_to_use i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
```

- [ ] **Step 3.4: Verify all 3 zh tests pass**

```bash
cd /d/E/独立站/youtube-tools
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-zh-input-i18n-guard.test.ts tests/engine-zh-faq-i18n-guard.test.ts tests/engine-zh-howto-i18n-guard.test.ts
```

Expected: `3/3 pass`. If any fails, STOP and fix.

- [ ] **Step 3.5: Commit**

```bash
cd /d/E/独立站/youtube-tools
git add tests/engine-zh-input-i18n-guard.test.ts tests/engine-zh-faq-i18n-guard.test.ts tests/engine-zh-howto-i18n-guard.test.ts
git commit -m "feat(p131): 3 zh single-dimension composite i18n guards (input/faq/howto)"
```

- [ ] Task 3 complete when: (a) 3 new zh test files exist, (b) all 3 pass under build-dep suite, (c) committed

---

### Task 4: Create 3 en single-dimension tests

**Files:**
- Create: `tests/engine-en-input-i18n-guard.test.ts`
- Create: `tests/engine-en-faq-i18n-guard.test.ts`
- Create: `tests/engine-en-howto-i18n-guard.test.ts`

**Interfaces (from Task 2):** same as Task 3

**Note:** en-side probes retain P128's escape-strip deviation: `(m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1')` before `escapeForHtml`. This is needed because en FAQ questions often contain `\'` in source (which becomes `&#39;` in HTML). Without escape-strip, the probe `\'` won't match the rendered `&#39;`.

- [ ] **Step 4.1: Write `tests/engine-en-input-i18n-guard.test.ts`**

```typescript
#!/usr/bin/env node
// P131 — Single-dimension test: en input label. En-side mirror of
// engine-zh-input-i18n-guard.test.ts. Replaces dimension 3 of 5 from P124.
//
// en-side deviation: probes strip JS source escape sequences before
// escapeForHtml (P128 escape-strip). Reason: en FAQ questions often
// contain `\'` in source which becomes `&#39;` in rendered HTML.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToFirstInput,
  escapeForHtml,
  buildTranslationKeyRegex,
  extractAllEngineSlugs,
} from './_composite-i18n-walkers';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-en-input] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every en engine page renders the first input label (P131 split from P124 dim 3)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToFirstInput = buildSlugToFirstInput();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const firstInputName = slugToFirstInput.get(slug);
    if (!firstInputName) continue;
    const m = translationsText.match(
      buildTranslationKeyRegex(`tools.${slug}.input.${firstInputName}.label`)
    );
    if (!m) continue;
    // en value: group 1 (single-quoted) ?? group 2 (double-quoted), then strip JS escapes.
    const inputLabelEn = (m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1');
    const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
    if (!existsSync(enPath)) {
      violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
      continue;
    }
    const rawHtml = readFileSync(enPath, 'utf-8');
    if (!rawHtml.includes(escapeForHtml(inputLabelEn))) {
      violations.push(`${slug}: missing first input label "${inputLabelEn}"`);
    }
  }

  assert.equal(
    violations.length,
    0,
    `Input label (en) i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
```

- [ ] **Step 4.2: Write `tests/engine-en-faq-i18n-guard.test.ts`**

```typescript
#!/usr/bin/env node
// P131 — Single-dimension test: en FAQ q + a. En-side mirror of
// engine-zh-faq-i18n-guard.test.ts. Replaces dimension 4 of 5 from P124.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToFaqCount,
  escapeForHtml,
  buildTranslationKeyRegex,
  extractAllEngineSlugs,
} from './_composite-i18n-walkers';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-en-faq] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every en engine page renders all FAQ q + a entries (P131 split from P124 dim 4)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToFaqCount = buildSlugToFaqCount();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const faqCount = slugToFaqCount.get(slug) ?? 0;
    if (faqCount === 0) continue;
    for (let i = 0; i < faqCount; i++) {
      const qMatch = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.faq.${i}.q`)
      );
      const aMatch = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.faq.${i}.a`)
      );
      assert(
        qMatch,
        `${slug}: missing FAQ[${i}].q translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.q)`
      );
      assert(
        aMatch,
        `${slug}: missing FAQ[${i}].a translation key (engine defines ${faqCount} FAQ entries, but translations.ts has no tools.${slug}.faq.${i}.a)`
      );
      const qEn = escapeForHtml((qMatch[1] ?? qMatch[2] ?? '').replace(/\\(.)/g, '$1'));
      const aEn = escapeForHtml((aMatch[1] ?? aMatch[2] ?? '').replace(/\\(.)/g, '$1'));
      const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
      if (!existsSync(enPath)) {
        violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(enPath, 'utf-8');
      if (!rawHtml.includes(qEn)) {
        violations.push(`${slug}: missing FAQ[${i}].q (en length ${qEn.length})`);
      }
      if (!rawHtml.includes(aEn)) {
        violations.push(`${slug}: missing FAQ[${i}].a (en length ${aEn.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `FAQ (en) i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
```

- [ ] **Step 4.3: Write `tests/engine-en-howto-i18n-guard.test.ts`**

```typescript
#!/usr/bin/env node
// P131 — Single-dimension test: en how_to_use steps. En-side mirror of
// engine-zh-howto-i18n-guard.test.ts. Replaces dimension 5 of 5 from P124.

import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import {
  buildSlugToHowToCount,
  escapeForHtml,
  buildTranslationKeyRegex,
  extractAllEngineSlugs,
} from './_composite-i18n-walkers';

const root = resolve(import.meta.dirname, '..');

// P23b: skip cleanly when build-dep gate not set.
if (!process.env.RUN_BUILD_TESTS) {
  process.exit(0);
}

function ensureBuilt(): void {
  const probe = resolve(root, 'dist', 'en', 'about', 'index.html');
  if (existsSync(probe)) return;
  console.log('[p131-en-howto] dist/ missing — running pnpm build...');
  const r = spawnSync('pnpm', ['build'], {
    cwd: root,
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
  assert.equal(r.status, 0, `pnpm build failed with status ${r.status}`);
}

test('every en engine page renders all how_to_use steps (P131 split from P124 dim 5)', () => {
  ensureBuilt();

  const translationsText = readFileSync(resolve(root, 'src', 'i18n', 'translations.ts'), 'utf-8');
  const allSlugs = extractAllEngineSlugs(translationsText);
  assert.equal(
    allSlugs.length,
    100,
    `Expected 100 engine slugs, found ${allSlugs.length} — P22b lock broken?`
  );

  const slugToHowToCount = buildSlugToHowToCount();
  const violations: string[] = [];

  for (const slug of allSlugs) {
    const howToCount = slugToHowToCount.get(slug) ?? 0;
    if (howToCount === 0) continue;
    for (let i = 0; i < howToCount; i++) {
      const m = translationsText.match(
        buildTranslationKeyRegex(`tools.${slug}.how_to_use.${i}`)
      );
      assert(
        m,
        `${slug}: missing how_to_use[${i}] translation key (engine defines ${howToCount} steps, but translations.ts has no tools.${slug}.how_to_use.${i})`
      );
      const howToEn = escapeForHtml((m[1] ?? m[2] ?? '').replace(/\\(.)/g, '$1'));
      const enPath = resolve(root, 'dist', 'en', slug, 'index.html');
      if (!existsSync(enPath)) {
        violations.push(`${slug}: dist/en/${slug}/index.html missing (build incomplete?)`);
        break;
      }
      const rawHtml = readFileSync(enPath, 'utf-8');
      if (!rawHtml.includes(howToEn)) {
        violations.push(`${slug}: missing how_to_use[${i}] (en length ${howToEn.length})`);
      }
    }
  }

  assert.equal(
    violations.length,
    0,
    `how_to_use (en) i18n violations (${violations.length}):\n` +
      violations.slice(0, 20).map(v => `  - ${v}`).join('\n') +
      (violations.length > 20 ? `\n  ... and ${violations.length - 20} more` : '')
  );
});
```

- [ ] **Step 4.4: Verify all 3 en tests pass**

```bash
cd /d/E/独立站/youtube-tools
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-en-input-i18n-guard.test.ts tests/engine-en-faq-i18n-guard.test.ts tests/engine-en-howto-i18n-guard.test.ts
```

Expected: `3/3 pass`. If any fails, STOP and fix.

- [ ] **Step 4.5: Commit**

```bash
cd /d/E/独立站/youtube-tools
git add tests/engine-en-input-i18n-guard.test.ts tests/engine-en-faq-i18n-guard.test.ts tests/engine-en-howto-i18n-guard.test.ts
git commit -m "feat(p131): 3 en single-dimension composite i18n guards (input/faq/howto)"
```

- [ ] Task 4 complete when: (a) 3 new en test files exist, (b) all 3 pass under build-dep suite, (c) committed

---

### Task 5: Delete old P123/P124 + update run.mjs skip-mode summary

**Files:**
- Delete: `tests/engine-composite-i18n-guard.test.ts`
- Delete: `tests/engine-en-composite-i18n-guard.test.ts`
- Modify: `tests/run.mjs` lines 60-79

- [ ] **Step 5.1: Delete old test files**

```bash
cd /d/E/独立站/youtube-tools
git rm tests/engine-composite-i18n-guard.test.ts tests/engine-en-composite-i18n-guard.test.ts
```

Expected: Both files staged as deleted.

- [ ] **Step 5.2: Verify old files are gone + new files still pass**

```bash
cd /d/E/独立站/youtube-tools
ls tests/engine-*-i18n-guard.test.ts tests/engine-*-composite-i18n-guard.test.ts 2>&1
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-zh-input-i18n-guard.test.ts tests/engine-zh-faq-i18n-guard.test.ts tests/engine-zh-howto-i18n-guard.test.ts tests/engine-en-input-i18n-guard.test.ts tests/engine-en-faq-i18n-guard.test.ts tests/engine-en-howto-i18n-guard.test.ts
```

Expected:
- Output shows 6 files: `engine-zh-input-i18n-guard.test.ts`, `engine-zh-faq-i18n-guard.test.ts`, `engine-zh-howto-i18n-guard.test.ts`, `engine-en-input-i18n-guard.test.ts`, `engine-en-faq-i18n-guard.test.ts`, `engine-en-howto-i18n-guard.test.ts`
- No `engine-composite-i18n-guard.test.ts` or `engine-en-composite-i18n-guard.test.ts`
- `6/6 pass` under build-dep suite

- [ ] **Step 5.3: Update `tests/run.mjs` skip-mode summary**

In `tests/run.mjs`, the current skip-mode summary (lines 60-79) lists 34 build-dep suites including:
- `engine-composite-i18n-guard,`
- `engine-en-composite-i18n-guard,`

These two must be REMOVED, and the following 6 must be ADDED in their place (alphabetically ordered within the language-specific block):

- `engine-en-faq-i18n-guard,`
- `engine-en-howto-i18n-guard,`
- `engine-en-input-i18n-guard,`
- `engine-zh-faq-i18n-guard,`
- `engine-zh-howto-i18n-guard,`
- `engine-zh-input-i18n-guard,`

**Replace the entire skip-mode summary block** (currently lines 60-79 in `tests/run.mjs`):

```javascript
  console.log('[skip-mode] RUN_BUILD_TESTS not set — 34 build-dependent suites skipped.');
  console.log('[skip-mode] Set RUN_BUILD_TESTS=1 (or run `pnpm test:build`) to enable:');
  console.log('[skip-mode]   baselayout-clerk-script, baselayout-sync-script,');
  console.log('[skip-mode]   header-clerk-render, header-sync-ui, privacy-policy-sync,');
  console.log('[skip-mode]   category-en-cjk-guard, category-zh-cjk-preservation,');
  console.log('[skip-mode]   tool-zh-cjk-preservation, tool-en-cjk-guard,');
  console.log('[skip-mode]   blog-en-cjk-guard, blog-zh-cjk-preservation,');
  console.log('[skip-mode]   tool-cross-link-cjk-guard, blog-cross-link-cjk-guard,');
  console.log('[skip-mode]   zh-hardcoded-english-guard, sitemap-hreflang-guard,');
  console.log('[skip-mode]   html-hreflang-guard, sitemap-url-coverage-guard,');
  console.log('[skip-mode]   canonical-url-guard, og-meta-guard, json-ld-guard,');
  console.log('[skip-mode]   json-ld-field-guard, json-ld-faqpage-guard, a11y-guard,');
  console.log('[skip-mode]   page-size-guard, breadcrumb-list-guard,');
  console.log('[skip-mode]   dead-i18n-keys-guard, js-bundle-size-guard,');
  console.log('[skip-mode]   css-bundle-size-guard, image-size-guard,');
  console.log('[skip-mode]   engine-titles-i18n-guard,');
  console.log('[skip-mode]   engine-descriptions-i18n-guard,');
  console.log('[skip-mode]   engine-composite-i18n-guard,');
  console.log('[skip-mode]   engine-en-composite-i18n-guard,');
  console.log('[skip-mode]   claude-md-invariant-guard');
```

**Replace with:**

```javascript
  console.log('[skip-mode] RUN_BUILD_TESTS not set — 38 build-dependent suites skipped.');
  console.log('[skip-mode] Set RUN_BUILD_TESTS=1 (or run `pnpm test:build`) to enable:');
  console.log('[skip-mode]   baselayout-clerk-script, baselayout-sync-script,');
  console.log('[skip-mode]   header-clerk-render, header-sync-ui, privacy-policy-sync,');
  console.log('[skip-mode]   category-en-cjk-guard, category-zh-cjk-preservation,');
  console.log('[skip-mode]   tool-zh-cjk-preservation, tool-en-cjk-guard,');
  console.log('[skip-mode]   blog-en-cjk-guard, blog-zh-cjk-preservation,');
  console.log('[skip-mode]   tool-cross-link-cjk-guard, blog-cross-link-cjk-guard,');
  console.log('[skip-mode]   zh-hardcoded-english-guard, sitemap-hreflang-guard,');
  console.log('[skip-mode]   html-hreflang-guard, sitemap-url-coverage-guard,');
  console.log('[skip-mode]   canonical-url-guard, og-meta-guard, json-ld-guard,');
  console.log('[skip-mode]   json-ld-field-guard, json-ld-faqpage-guard, a11y-guard,');
  console.log('[skip-mode]   page-size-guard, breadcrumb-list-guard,');
  console.log('[skip-mode]   dead-i18n-keys-guard, js-bundle-size-guard,');
  console.log('[skip-mode]   css-bundle-size-guard, image-size-guard,');
  console.log('[skip-mode]   engine-titles-i18n-guard,');
  console.log('[skip-mode]   engine-descriptions-i18n-guard,');
  console.log('[skip-mode]   engine-en-faq-i18n-guard, engine-en-howto-i18n-guard,');
  console.log('[skip-mode]   engine-en-input-i18n-guard, engine-zh-faq-i18n-guard,');
  console.log('[skip-mode]   engine-zh-howto-i18n-guard, engine-zh-input-i18n-guard,');
  console.log('[skip-mode]   claude-md-invariant-guard');
```

Use the Edit tool with `old_string` = the full block above (lines 60-79 inclusive) and `new_string` = the full block below. The string changes are:
- Line 60: `34 build-dependent` → `38 build-dependent` (count delta)
- Lines 77-78: 2 lines with `engine-composite-i18n-guard` and `engine-en-composite-i18n-guard` → 2 lines with the 6 new names

- [ ] **Step 5.4: Verify run.mjs skip-mode summary matches expected output**

```bash
cd /d/E/独立站/youtube-tools
node -e "const t = require('fs').readFileSync('tests/run.mjs', 'utf-8'); const m = t.match(/(\d+) build-dependent/); console.log('count header:', m[1]); const block = t.match(/\[skip-mode\] Set RUN_BUILD_TESTS=1[\s\S]*?claude-md-invariant-guard/); console.log('block tail:', block && block[0].slice(-200));"
```

Expected:
- `count header: 38`
- Block tail ends with `engine-zh-input-i18n-guard,\n  console.log('[skip-mode]   claude-md-invariant-guard')`

- [ ] **Step 5.5: Run full skip-mode test suite**

```bash
cd /d/E/独立站/youtube-tools
pnpm test:unit 2>&1 | tail -25
```

Expected: skip-mode summary lists 38 build-dependent suites with the 6 new names. Test count should be 1200 (unchanged from baseline; new build-dep suites are skipped under default `pnpm test:unit`).

- [ ] **Step 5.6: Commit**

```bash
cd /d/E/独立站/youtube-tools
git add tests/run.mjs tests/engine-composite-i18n-guard.test.ts tests/engine-en-composite-i18n-guard.test.ts
git commit -m "feat(p131): delete P123/P124 + update skip-mode summary (34→38 build-dep suites)"
```

- [ ] Task 5 complete when: (a) 2 old files deleted, (b) run.mjs skip-mode summary updated to 38 suites, (c) `pnpm test:unit` shows correct skip-mode output, (d) committed

---

### Task 6: Final verification

**Files:** none modified

- [ ] **Step 6.1: TypeScript compile**

```bash
cd /d/E/独立站/youtube-tools
pnpm exec tsc --noEmit
```

Expected: 0 errors.

- [ ] **Step 6.2: Full build-dep test suite**

```bash
cd /d/E/独立站/youtube-tools
RUN_BUILD_TESTS=1 pnpm test:build 2>&1 | tail -50
```

Expected:
- All 6 new dimension tests pass
- No regressions in P121/P122
- Total passing tests: 1200 baseline + 6 new - 2 deleted (P123 + P124 had 2 tests combined) = 1204 (assuming P123 and P124 each had 1 test that counted toward 1200)
- If P123/P124 each contributed 1 test to the 1200 baseline, new total is 1200 - 2 + 6 = 1204
- Actual count depends on whether the old tests were counted as separate subtests or part of a parent test

- [ ] **Step 6.3: Verify suite count delta**

```bash
cd /d/E/独立站/youtube-tools
ls tests/engine-*-i18n-guard.test.ts | wc -l
ls tests/_composite-i18n-walkers.ts
```

Expected:
- `8` (engine-titles-i18n-guard + engine-descriptions-i18n-guard + 6 new = 8)
- Helper file exists

- [ ] **Step 6.4: Verify walker counts match P128 baseline**

```bash
cd /d/E/独立站/youtube-tools
node --import tsx --eval "import('./tests/_composite-i18n-walkers').then(m => { const faq = m.buildSlugToFaqCount(); const howto = m.buildSlugToHowToCount(); let totalFaq = 0, totalHowto = 0; for (const v of faq.values()) totalFaq += v; for (const v of howto.values()) totalHowto += v; console.log('total FAQ entries across 100 engines:', totalFaq); console.log('total how_to_use entries across 100 engines:', totalHowto); })"
```

Expected:
- `total FAQ entries across 100 engines: 541` (matches P128 baseline)
- `total how_to_use entries across 100 engines: 638` (matches P128 baseline)

- [ ] **Step 6.5: Verify P128's 16 silently-skipped keys are now probed (P129 ground truth)**

```bash
cd /d/E/独立站/youtube-tools
RUN_BUILD_TESTS=1 pnpm exec tsx --test tests/engine-zh-faq-i18n-guard.test.ts 2>&1 | grep -E "missing FAQ|missing how_to_use"
```

Expected: empty output. The 16 keys P129 listed (13 FAQ/howTo + 3 input.labels on cohort-retention) must be probed by the new tests without failing.

- [ ] Task 6 complete when: (a) `tsc --noEmit` passes, (b) all 6 new tests pass under build-dep, (c) walker counts match P128 baseline (541 + 638), (d) 16 P129 keys probed without failure

**No commit for this task** — verification only.

---

### Task 7: Write memory + update MEMORY.md

**Files:**
- Create: `memory/p131-single-test-split-shipped.md`
- Modify: `MEMORY.md` (insert one line after P130 entry)

- [ ] **Step 7.1: Write the ship log**

Create `memory/p131-single-test-split-shipped.md` with the following content (preserve structure verbatim):

```markdown
---
name: p131-single-test-split-shipped
description: P131 split P123 (zh) and P124 (en) composite i18n guards from 2 monolithic files (329 + 328 lines) into 6 single-dimension tests (input/faq/howto × zh/en). 3 walker functions extracted to tests/_composite-i18n-walkers.ts. Failure isolation improved dramatically. Title + description coverage already provided by P121/P122.
metadata:
  type: project
---

# P131 Single-Test Split Ship Log

## Summary

P131 replaces P123/P124 (composite 5-dimension i18n guards, 329 + 328 lines) with 6 single-dimension tests (~70-100 lines each) plus 1 shared walker helper (~120 lines). After P131, an input-label regression fails only `engine-zh-input-i18n-guard.test.ts` / `engine-en-input-i18n-guard.test.ts` instead of failing P123/P124 with a confusing "composite i18n violation" message. Walker patterns (firstInput / faqCount / howToCount) extracted to `tests/_composite-i18n-walkers.ts` for reuse + future audits.

**Date:** 2026-07-28
**Batch ID:** P131
**Files touched:** 11 (1 helper + 6 tests + 2 deletes + 1 run.mjs + memory + MEMORY.md)
**Test delta:** +6 build-dep suites (-2 P123/P124 + 6 new) → 34 → 38 build-dep suites (delta +4 files, +4 subtests)
**Commits:** 5 (feat-helper + feat-3-zh + feat-3-en + feat-cleanup + docs-memory)
**3-way sync:** `0\t0` at HEAD

## What shipped

### Walker extraction

`tests/_composite-i18n-walkers.ts` (NEW, ~120 lines):
- `buildSlugToFirstInput()` (P127 lineage) — slug → first input name
- `buildSlugToFaqCount()` (P128 lineage) — slug → FAQ entry count
- `buildSlugToHowToCount()` (P128 lineage) — slug → howToUse entry count
- `escapeForHtml(s)` — HTML-escape for probe comparison
- `buildTranslationKeyRegex(key)` — returns regex with 4 capture groups (P129 alternation pattern)
- `extractAllEngineSlugs(text)` — sorted slug list from translations.ts

### 3 zh single-dimension tests (NEW)

- `tests/engine-zh-input-i18n-guard.test.ts` — zh input label rendered
- `tests/engine-zh-faq-i18n-guard.test.ts` — zh FAQ q + a rendered (all entries, P128+P129 pattern)
- `tests/engine-zh-howto-i18n-guard.test.ts` — zh how_to_use steps rendered (all entries, P128+P129 pattern)

### 3 en single-dimension tests (NEW)

- `tests/engine-en-input-i18n-guard.test.ts` — en input label rendered (with escape-strip)
- `tests/engine-en-faq-i18n-guard.test.ts` — en FAQ q + a rendered (with escape-strip)
- `tests/engine-en-howto-i18n-guard.test.ts` — en how_to_use steps rendered (with escape-strip)

### Files deleted

- `tests/engine-composite-i18n-guard.test.ts` (P123, 329 lines) — replaced by 3 zh tests
- `tests/engine-en-composite-i18n-guard.test.ts` (P124, 328 lines) — replaced by 3 en tests

### run.mjs skip-mode summary updated

- Count: 34 → 38 build-dep suites
- Removed: `engine-composite-i18n-guard`, `engine-en-composite-i18n-guard`
- Added: 6 new dimension names (alphabetically ordered within language-specific block)

## Why this batch exists

After P127/P128/P129, P123/P124 had grown to 657 lines across 2 files with 3 walkers × 2 files + 6 regex alternation sites × 2 files + 3 assert sites × 2 files. A failure in any of 5 dimensions (title/desc/input/faq/how_to_use) surfaced as "composite i18n violation (N)" with up to 20 sample violations but no dimension grouping. After P131, the test name itself identifies the dimension: `engine-zh-faq-i18n-guard.test.ts` failing tells you "FAQ probe broke for zh pages" without reading any violation text.

Title and description coverage were already provided by P121/P122 (which cover both en + zh in single files). P131 focuses on the 3 dimensions NOT yet independently covered (input/FAQ/how_to_use) — total 6 new files instead of 10.

## P131 lessons

1. **Test files can grow unwieldy even when each test is small.** P123/P124 each had 1 test but 329/328 lines of setup + walkers + probe loops. Splitting by dimension reduces per-file complexity more than per-test complexity.
2. **Pre-existing single-dimension guards (P121/P122) reduce P131's scope.** Original P128 memory listed 5 dimensions × 2 langs = 10 new files. After checking P121/P122 cover title/description for both langs, P131 dropped to 3 dimensions × 2 langs = 6 new files. **Always grep before splitting** to avoid duplicating existing coverage.
3. **Walker extraction pays off at 3+ users.** P131's 3 walkers (`buildSlugToFirstInput`, `buildSlugToFaqCount`, `buildSlugToHowToCount`) now have 2 users each (zh + en side of each dimension test). Extracting to `tests/_composite-i18n-walkers.ts` removes ~240 lines of duplication across the 6 new test files.
4. **Naming "composite" should reflect actual composition.** P123/P124 were called "composite" because they covered 5 dimensions. The 6 new tests each cover 1 dimension, so they drop "composite" from the name (matches P121/P122 convention).

## Verification

| Check | Result |
|---|---|
| `pnpm exec tsc --noEmit` | 0 errors ✓ |
| 6 new build-dep tests | 6/6 pass ✓ |
| Walker counts vs P128 baseline | 541 FAQ + 638 howTo (unchanged) ✓ |
| P129's 16 silently-skipped keys | all probed correctly ✓ |
| Skip-mode suite count | 34 → 38 (delta +4 files, +4 subtests) ✓ |
| `pnpm test:unit` baseline | 1200 (unchanged — new tests are build-dep) ✓ |
| Working tree | clean (excluding plan file) ✓ |

## Related references

- **P121** — engine titles i18n guard (zh+en combined)
- **P122** — engine descriptions i18n guard (zh+en combined)
- **P123** — zh composite i18n guard (P131 deletes; replaced by 3 zh tests)
- **P124** — en composite i18n guard (P131 deletes; replaced by 3 en tests)
- **P127** — firstInput walker pattern (P131 extracts)
- **P128** — faqCount + howToCount walker patterns (P131 extracts)
- **P129** — regex alternation + missing-key assert promotion (P131's helper preserves)
- **P130** — CHANGELOG catch-up v7 (P131's predecessor; covers P126-P129)

## P132+ candidates

- **CLAUDE.md additional invariants** — extend P125 to assert commit count, last-ship date, category names
- **Tier-2 round 7** — composite data-driven lines (NEW approach)
- **P123/P124 defensive audit** — 3rd-party review for latent silent-skip paths now that walker + regex are extracted (easier to audit single function)
- **Input labels i18n backfill** — backfill 29 engines × 3-6 inputs = ~100-150 `tools.${slug}.input.${name}.label` keys (P131's walker enables)
- **CHANGELOG catch-up v8** — covers P131 (1 batch)
```

- [ ] **Step 7.2: Add P131 entry to `MEMORY.md`**

Read `MEMORY.md` to find the line directly after the P130 entry (line 48 per P130 ship). Insert the following line after it:

```markdown
- [P131 Single-test split](p131-single-test-split-shipped.md) — 2026-07-28; split P123/P124 composite i18n guards into 6 single-dimension tests (input/faq/howto × zh/en); walker helpers extracted to tests/_composite-i18n-walkers.ts; 34→38 build-dep suites; failure isolation dramatically improved; P132+ candidates (CLAUDE.md invariants, tier-2 round 7, defensive audit, input labels backfill)
```

Use the Edit tool to insert this line after the P130 entry.

- [ ] **Step 7.3: Commit**

```bash
cd /d/E/独立站/youtube-tools
git add memory/p131-single-test-split-shipped.md MEMORY.md
git commit -m "docs(p131): ship memory + MEMORY.md index entry"
```

- [ ] Task 7 complete when: (a) memory file exists, (b) MEMORY.md has P131 entry, (c) committed

---

### Task 8: Commit + 3-way sync

**Files:** none modified

- [ ] **Step 8.1: Verify all commits present**

```bash
cd /d/E/独立站/youtube-tools
git log --oneline -10
```

Expected: HEAD shows the 4 P131 commits (helper + 3-zh + 3-en + cleanup + memory = 5 commits; P131 task design has 5 commits per the plan, but verify).

- [ ] **Step 8.2: Fetch both remotes**

```bash
cd /d/E/独立站/youtube-tools
git fetch origin && git fetch github
```

- [ ] **Step 8.3: Pre-push divergence check**

```bash
cd /d/E/独立站/youtube-tools
git rev-list --left-right --count origin/master...github/master
git log --oneline origin/master..HEAD | head -10
```

Expected:
- `0	0` (clean sync from P130)
- HEAD has 4-5 new commits not on origin/master

If divergence detected (e.g., LiteLLM sync raced in), STOP and resolve via `reset + cherry-pick + force-with-lease` per P43 ship memory §Ship Sequence.

- [ ] **Step 8.4: Push to origin (Gitee)**

```bash
cd /d/E/独立站/youtube-tools
git push origin master
```

Expected: `6612c18..<new_head>  master -> master` (or `19554ad..<new_head>` if P130's push to origin wasn't recent — verify the prior tip).

- [ ] **Step 8.5: Push to github**

```bash
cd /d/E/独立站/youtube-tools
git push github master
```

Expected: `<same_old_tip>..<new_head>  master -> master`.

- [ ] **Step 8.6: Post-push verification**

```bash
cd /d/E/独立站/youtube-tools
git rev-list --left-right --count origin/master...github/master
git rev-parse HEAD
git log --oneline -3
```

Expected:
- `0	0` (3-way sync clean)
- HEAD shows new P131 commit
- 3 most recent commits are all P131 commits

- [ ] Task 8 complete when: (a) HEAD on P131 final commit, (b) 3-way sync `0\t0`

---

## Self-Review Checklist

Before finalizing, the plan author should verify:

1. **Spec coverage:** Each item in the original scope (P128 candidate) is covered:
   - [x] Walker extraction → Task 2
   - [x] 3 zh single-dimension tests → Task 3
   - [x] 3 en single-dimension tests → Task 4
   - [x] Delete old files → Task 5
   - [x] Update run.mjs skip-mode summary → Task 5
   - [x] Final verification → Task 6
   - [x] Memory + MEMORY.md → Task 7
   - [x] 3-way sync → Task 8

2. **Placeholder scan:** No TBD/TODO/"implement later"/"add appropriate"/"similar to Task N" in the plan. Each step shows complete code.

3. **Type consistency:** All walker function signatures match across Task 2 definition and Task 3/4 usage:
   - `buildSlugToFirstInput(): Map<string, string>` ✓
   - `buildSlugToFaqCount(): Map<string, number>` ✓
   - `buildSlugToHowToCount(): Map<string, number>` ✓
   - `escapeForHtml(s: string): string` ✓
   - `buildTranslationKeyRegex(key: string): RegExp` ✓
   - `extractAllEngineSlugs(text: string): string[]` ✓
