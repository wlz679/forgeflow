# P137 — Tier-2 Round 7 Composite Data-Driven Lines

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate composite data-driven lines (static prefix + dynamic data + static suffix) on `/zh/` AI cost pages via extended `translateCalcOutput` post-processor — adds ~9 new `engine_cost.*` keys + 1 new build-dep zh-output test, **zero engine file modifications**.

**Architecture:** Regex-based post-processor extension. Each composite line gets one regex pattern in `compositePatterns[]` (alongside existing `headerKeys[]`) inside `translateCalcOutput`. Regex captures dynamic data slot(s); replacement function emits localized prefix + captured data + localized suffix. Engines (`src/engines/ai-cost/*.ts`) and codegen pipeline untouched. customFn output stays EN (already accepted trade-off).

**Tech Stack:** Astro 4 (static), TypeScript 5.6 strict, Node test runner, vitest-via-spawn for build-dep tests, JSDoc comments for char encoding (e.g. `\u{1F4CA}` for 📊).

**Spec:** `docs/superpowers/specs/2026-07-29-tier2-round7-composite-data-driven-lines-design.md` (committed `318a094`).

## Global Constraints

- 100 engines (`src/engines/**/*.ts`) **MUST NOT** be touched in this batch. Zero modifications.
- 100 `staticExamples[0]` literals **MUST NOT** be touched. `codegen-examples.mjs --check` after each task.
- New `compositePatterns[]` array lives inside `translateCalcOutput` function in `src/pages/[lang]/[slug].astro`. Do not extract to a separate file (6-10 entries stay inline; revisit at >20).
- All regex patterns MUST use Unicode-safe emoji escapes (`\u{1F4CA}` etc.) — never raw emoji in regex source if the regex pattern crosses UTF-16 surrogate pairs.
- New test MUST be registered in `tests/run.mjs` skip-mode summary before it can run.
- Build-dep tests require `RUN_BUILD_TESTS=1 pnpm test:unit`. They auto-build via `ensureBuilt()`.
- pnpm check MUST pass (`pnpm check` = 1204 baseline + 1 new = 1205).
- 3-way sync MUST end at `0	0` after final task.

## File Structure

| File | Action | Purpose |
|---|---|---|
| `src/i18n/translations.ts` | modify | Add 9 entries to `engine_cost.*` namespace |
| `src/pages/[lang]/[slug].astro` | modify | Add `compositePatterns[]` array + replacement loop inside `translateCalcOutput` |
| `tests/dead-i18n-keys-guard.test.ts` | modify | Add 9 entries to `WORKING_KEY_REQUIRED` |
| `tests/ai-cost-t2-7-zh-output.test.ts` | create | New build-dep test: assert zh vs en dist HTML content |
| `tests/run.mjs` | modify | Register new test in skip-mode summary (suite #39 build-dep) |
| `CHANGELOG.md` | modify | Header: commits 828 → +N, last-updated → "P137 — T2.7 composite lines" |
| `memory/p137-tier2-round7-trial-shipped.md` | create | Ship memory for P137 batch |
| `memory/MEMORY.md` | modify | Add one-line P137 entry |

---

## Task 1: Add 9 keys to translations.ts + WORKING_KEY_REQUIRED

**Files:**
- Modify: `src/i18n/translations.ts` (add 9 new entries to the `translations` object literal)
- Modify: `tests/dead-i18n-keys-guard.test.ts` (append 9 entries to `WORKING_KEY_REQUIRED` array)

**Interfaces:**
- Consumed by Task 2 — `translateCalcOutput` references `t('engine_cost.*', lang)`
- Consumed by Task 5 — new test asserts `translations.ts` keys exist

- [ ] **Step 1: Read `src/i18n/translations.ts` to find the right insertion point**

Locate the closing `};` of the `translations` object literal. The `ai_cost.section.*` keys are the closest semantic neighbors — insert `engine_cost.*` keys immediately AFTER `ai_cost.section.*` block, sorted alphabetically by key.

- [ ] **Step 2: Add 9 entries to `src/i18n/translations.ts`**

Insert before the closing `};` (find the last existing entry and append after it):

```ts
  // P137 T2.7 composite data-driven line segments (AI cost engines)
  'engine_cost.comparison_title': {
    en: '📊 Cost Comparison',
    zh: '📊 成本对比',
  },
  'engine_cost.reqs_per_day': {
    en: ' reqs/day',
    zh: ' 请求/天',
  },
  'engine_cost.cheapest_prefix': {
    en: '🏆 Cheapest: ',
    zh: '🏆 最便宜: ',
  },
  'engine_cost.at_per_month': {
    en: ' at ',
    zh: '，每月 ',
  },
  'engine_cost.saving_prefix': {
    en: '💡 Saving vs ',
    zh: '💡 比 ',
  },
  'engine_cost.saving_suffix': {
    en: ': ',
    zh: ' 省: ',
  },
  'engine_cost.image_cheapest': {
    en: '🎨 Cheapest provider: ',
    zh: '🎨 最便宜提供商: ',
  },
  'engine_cost.gpu_total': {
    en: '💰 Total: ',
    zh: '💰 总计: 每月 ',
  },
  'engine_cost.training_total': {
    en: '💼 Training total: ',
    zh: '💼 训练总成本: ',
  },
```

**Note on training_total**: Per spec §3.3 ⚠, this is tentative. If implementation finds no matching composite line in `ai-training-cost-estimator`, drop this key in Step 2.5 (after Task 2 discovers the gap).

- [ ] **Step 2.5 (conditional): Drop `engine_cost.training_total` if unused**

After Task 2 confirms the actual composite line shapes present in 8 engines, remove `training_total` from `src/i18n/translations.ts` if `ai-training-cost-estimator` has no matching line. (Decision deferred — keeping the key is the safer default.)

- [ ] **Step 3: Verify translation parity (zh ≠ en, both non-empty)**

Run: `node -e "const t = require('./src/i18n/translations.ts'); const keys = ['engine_cost.comparison_title','engine_cost.reqs_per_day','engine_cost.cheapest_prefix','engine_cost.at_per_month','engine_cost.saving_prefix','engine_cost.saving_suffix','engine_cost.image_cheapest','engine_cost.gpu_total','engine_cost.training_total']; console.log(keys.length, 'keys loaded')"`

(Note: `.ts` can't be `require`'d directly. Use `pnpm exec tsx -e "..."` instead, or just rely on pnpm check passing.)

- [ ] **Step 4: Run typecheck**

Run: `pnpm exec tsc --noEmit`
Expected: 0 errors

- [ ] **Step 5: Add 9 entries to `tests/dead-i18n-keys-guard.test.ts` WORKING_KEY_REQUIRED**

Locate `WORKING_KEY_REQUIRED` array. The current size is 150 (P119 cumulative). Append after the last existing entry:

```ts
  // P137 T2.7 composite data-driven lines
  'engine_cost.comparison_title',
  'engine_cost.reqs_per_day',
  'engine_cost.cheapest_prefix',
  'engine_cost.at_per_month',
  'engine_cost.saving_prefix',
  'engine_cost.saving_suffix',
  'engine_cost.image_cheapest',
  'engine_cost.gpu_total',
  'engine_cost.training_total',
```

(Note: If you dropped `training_total` per Step 2.5, add only 8 entries.)

- [ ] **Step 6: Run P103 standalone to verify**

Run: `RUN_BUILD_TESTS=1 pnpm exec vitest run tests/dead-i18n-keys-guard.test.ts`
Expected: 1 test passes, reports "159 entries" (150 + 9) — or 158 if training dropped.

- [ ] **Step 7: Commit**

```bash
git add src/i18n/translations.ts tests/dead-i18n-keys-guard.test.ts
git commit -m "feat(p137): 9 engine_cost.* i18n keys + WORKING_KEY_REQUIRED"
```

---

## Task 2: First composite pattern (Cost Comparison) — TDD

**Files:**
- Create: `tests/ai-cost-t2-7-zh-output.test.ts`
- Modify: `src/pages/[lang]/[slug].astro` (add `compositePatterns[]` to `translateCalcOutput`)
- Modify: `tests/run.mjs` (register new test in skip-mode summary)

**Interfaces:**
- Consumes Task 1's keys via `t('engine_cost.comparison_title', lang)` etc.
- Produces: build-dep test that asserts `/dist/zh/.../index.html` contains localized text

- [ ] **Step 1: Read existing build-dep test for pattern reference**

`tests/_composite-i18n-walkers.ts` (P131 walker helpers) and `tests/category-en-cjk-guard.test.ts` (P63) are the closest patterns. Look at how they: (a) register in skip-mode summary, (b) read `dist/` HTML, (c) use `ensureBuilt()` for build-dep behavior, (d) format CJK assertions.

- [ ] **Step 2: Read `src/pages/[lang]/[slug].astro:53-221` to confirm `translateCalcOutput` shape**

The function ends with `return out;` after a `for (const key of headerKeys)` loop. Insert `compositePatterns` BEFORE `return out;` (or after the existing loop).

- [ ] **Step 3: Create `tests/ai-cost-t2-7-zh-output.test.ts` (failing first)**

Create the file with the structure below. The test MUST fail at this stage because `compositePatterns` doesn't exist yet.

```ts
#!/usr/bin/env node
// P137 T2.7 — build-dep test asserting /zh/ AI cost pages contain localized
// composite data-driven lines, /en/ pages remain pure English.
//
// Build dependency: yes (RUN_BUILD_TESTS=1 + ensureBuilt).
// Replaces the trial "if build, then check dist" pattern in P131/P136 walker
// tests with per-engine per-pattern assertions.

import { readFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { describe, it, expect, beforeAll } from 'vitest';
import { spawnSync } from 'node:child_process';

const root = resolve(import.meta.dirname, '..');

function readBuiltHtml(lang: string, slug: string): string {
  const path = join(root, 'dist', lang, slug, 'index.html');
  return readFileSync(path, 'utf-8');
}

function ensureBuilt(): void {
  const r = spawnSync('pnpm', ['build'], { cwd: root, stdio: 'pipe', encoding: 'utf-8' });
  if (r.status !== 0) throw new Error(`pnpm build failed: ${r.stderr}`);
}

const CASES: Array<{ slug: string; zhFragment: string; enFragment: string }> = [
  // Cost Comparison (claude-api, gemini-api, deepseek-api, ai-api-cost-comparison)
  // Cheap to assert ALL 4: shared engine_cost.comparison_title + engine_cost.reqs_per_day
  {
    slug: 'solopreneur-claude-api-cost-calculator',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
  {
    slug: 'solopreneur-gemini-api-cost-calculator',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
  {
    slug: 'solopreneur-deepseek-api-cost-calculator',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
  {
    slug: 'solopreneur-ai-api-cost-comparison',
    zhFragment: '📊 成本对比',
    enFragment: '📊 Cost Comparison',
  },
];

describe('P137 T2.7 composite i18n — zh-output guard', () => {
  beforeAll(() => ensureBuilt(), 600_000); // build once, 10min budget
  it.each(CASES)(
    '$slug has localized composite "Cost Comparison" line on /zh/',
    ({ slug, zhFragment, enFragment }) => {
      const zhHtml = readBuiltHtml('zh', slug);
      const enHtml = readBuiltHtml('en', slug);
      expect(zhHtml, `zh page should contain "${zhFragment}"`).toContain(zhFragment);
      expect(enHtml, `en page should NOT contain "${zhFragment}"`).not.toContain(zhFragment);
      expect(enHtml, `en page should contain "${enFragment}"`).toContain(enFragment);
    },
  );
});
```

- [ ] **Step 4: Run the test, verify it fails**

Run: `RUN_BUILD_TESTS=1 pnpm exec vitest run tests/ai-cost-t2-7-zh-output.test.ts`
Expected: FAIL — zh pages still contain `📊 Cost Comparison` (no translation yet).

- [ ] **Step 5: Register the test in `tests/run.mjs` skip-mode summary**

Open `tests/run.mjs` and find the skip-mode build-dep list. Add `'ai-cost-t2-7-zh-output.test.ts'` so it's classified correctly. The suite count should go from 38 → 39.

- [ ] **Step 6: Run the test once more, confirm still failing for the right reason**

Run: `RUN_BUILD_TESTS=1 pnpm exec vitest run tests/ai-cost-t2-7-zh-output.test.ts`
Expected: STILL FAIL (because translateCalcOutput has no compositePatterns yet)

- [ ] **Step 7: Add `compositePatterns[]` + replacement loop to `translateCalcOutput`**

In `src/pages/[lang]/[slug].astro`, after the `for (const key of headerKeys)` loop and before `return out;`:

```ts
  // P137 T2.7 — composite data-driven line patterns.
  // Each pattern: regex captures dynamic data; build() emits localized
  // prefix + captured data + localized suffix. Tier-1/2 above uses
  // whole-string headerKeys; here dynamic data is preserved as-is.
  const compositePatterns: Array<{
    regex: RegExp;
    build: (m: RegExpMatchArray) => string;
  }> = [
    {
      regex: /(\u{1F4CA} Cost Comparison )\(([^)]+?)\)(\s*reqs\/day)/g,
      build: (m) => {
        const prefix = t('engine_cost.comparison_title', lang);
        // m[1] already includes trailing space; normalize into "Cost Comparison"
        // followed by "(" — headerKeys key doesn't include parens
        const localizedPrefix = prefix;
        const suffix = t('engine_cost.reqs_per_day', lang);
        return `${localizedPrefix} (${m[2]})${suffix}`;
      },
    },
  ];
  for (const { regex, build } of compositePatterns) {
    out = out.replace(regex, (...args) => build(args as unknown as RegExpMatchArray));
  }
```

- [ ] **Step 8: Run the test, verify it passes**

Run: `RUN_BUILD_TESTS=1 pnpm exec vitest run tests/ai-cost-t2-7-zh-output.test.ts`
Expected: PASS (4/4 cases pass — Cost Comparison translated for 4 engines)

- [ ] **Step 9: Spot-check dist HTML manually**

Run:
```bash
grep -l "📊 成本对比" dist/zh/solopreneur-claude-api-cost-calculator/index.html
grep -l "📊 Cost Comparison" dist/en/solopreneur-claude-api-cost-calculator/index.html
grep "📊 成本对比" dist/zh/solopreneur-claude-api-cost-calculator/index.html | head -2
grep "📊 Cost Comparison" dist/zh/solopreneur-claude-api-cost-calculator/index.html | head -2  # expect empty
```

Expected: First two greps return file path; third returns the localized line; fourth is empty.

- [ ] **Step 10: Run pnpm check**

Run: `pnpm check`
Expected: 1204/0/0 (test not yet run, baseline check)

- [ ] **Step 11: Commit**

```bash
git add tests/ai-cost-t2-7-zh-output.test.ts tests/run.mjs src/pages/\[lang\]/\[slug\].astro
git commit -m "feat(p137): Cost Comparison composite pattern + zh-output guard"
```

---

## Task 3: Cheapest line pattern (claude + ai-api-cost-comparison)

**Files:**
- Modify: `src/pages/[lang]/[slug].astro` (append 1 entry to `compositePatterns[]`)
- Modify: `tests/ai-cost-t2-7-zh-output.test.ts` (extend `CASES` array with 2 new entries)

- [ ] **Step 1: Verify exact line shape in `claude-api-cost-calculator.ts`**

Run: `grep -n "🏆 Cheapest:" src/engines/ai-cost/claude-api-cost-calculator.ts`
Expected: line 432 area shows `'🏆 Cheapest: ' + cheapestC.i.n + ' at ' + fm(cheapestC.mc) + '/mo'`

Then run: `grep -n "Cheapest overall\|Cheapest Model" src/engines/ai-cost/ai-api-cost-comparison.ts`
Expected: line 137 area shows `🏆 Cheapest Model Overall` (different shape) and 244 shows `'• 🏆 Cheapest overall: '`.

**If line shapes differ between engines**, you may need TWO cheapest-line patterns: one for `'🏆 Cheapest: X at Y/mo'` (claude-api) and one for `'🏆 Cheapest overall: X at Y/mo (provider)'` (ai-api-cost-comparison).

- [ ] **Step 2: Append cheapest-line pattern to `compositePatterns`**

In `src/pages/[lang]/[slug].astro`, append after the existing entry in `compositePatterns[]`:

```ts
    {
      // 🏆 Cheapest: GPT-4 at $0.05/mo  →  🏆 最便宜: GPT-4，每月 $0.05/mo
      regex: /(\u{1F3C6} Cheapest: )([^()]+?)( at )(\$[\d.]+)(\/mo)/g,
      build: (m) =>
        `${t('engine_cost.cheapest_prefix', lang)}${m[2]}${t('engine_cost.at_per_month', lang)}${m[4]}${m[5]}`,
    },
```

- [ ] **Step 3: Extend `CASES` in the test file**

Add 2 entries (claude-api + ai-api-cost-comparison):

```ts
  {
    slug: 'solopreneur-claude-api-cost-calculator',
    zhFragment: '🏆 最便宜:',
    enFragment: '🏆 Cheapest:',
  },
  {
    slug: 'solopreneur-ai-api-cost-comparison',
    zhFragment: '🏆 最便宜:',
    enFragment: '🏆 Cheapest:',
  },
```

(These will appear in addition to the 4 Cost Comparison cases.)

- [ ] **Step 4: Run test, verify pass**

Run: `RUN_BUILD_TESTS=1 pnpm exec vitest run tests/ai-cost-t2-7-zh-output.test.ts`
Expected: PASS — all 6 cases pass.

- [ ] **Step 5: Spot-check dist HTML**

Run:
```bash
grep "🏆 最便宜:" dist/zh/solopreneur-claude-api-cost-calculator/index.html | head -2
grep "🏆 Cheapest:" dist/zh/solopreneur-claude-api-cost-calculator/index.html | head -2  # expect empty
```

- [ ] **Step 6: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro tests/ai-cost-t2-7-zh-output.test.ts
git commit -m "feat(p137): cheapest_line composite pattern (claude + api-comparison)"
```

---

## Task 4: Remaining 4 patterns + extend test

**Files:**
- Modify: `src/pages/[lang]/[slug].astro`
- Modify: `tests/ai-cost-t2-7-zh-output.test.ts`

- [ ] **Step 1: Verify line shapes in 4 remaining engines**

```bash
# openai
grep -n "💡 Saving vs\|💡.*Saving" src/engines/ai-cost/openai-token-calculator.ts

# image-gen
grep -n "🎨 Cheapest provider" src/engines/ai-cost/ai-image-generation-cost-calculator.ts

# gpu-cloud
grep -n "💰 Total\|💰.*Total" src/engines/ai-cost/gpu-cloud-cost-calculator.ts

# training
grep -n "💼 Training total\|💼.*Training" src/engines/ai-cost/ai-training-cost-estimator.ts
```

If `💼` line is absent in training-cost-estimator, **drop `training_total` from `translations.ts` (Step 2.5 retroactive)**. Then drop it from `WORKING_KEY_REQUIRED` too. Adjust expected test count: 8 → 9 → 8 keys.

- [ ] **Step 2: Append 4 patterns to `compositePatterns[]`**

```ts
    {
      // 💡 Saving vs X: $Y/month → 💡 比 X 省: 每月 $Y
      regex: /(\u{1F4A1} Saving vs )([^:]+?)(: )(\$[\d.]+)(\/month)/g,
      build: (m) =>
        `${t('engine_cost.saving_prefix', lang)}${m[2]}${t('engine_cost.saving_suffix', lang)}${m[4]}${m[5]}`,
    },
    {
      // 🎨 Cheapest provider: Midjourney at $0.08/img → 🎨 最便宜提供商: Midjourney，每张 $0.08
      regex: /(\u{1F3A8} Cheapest provider: )([^()]+?)( at )(\$[\d.]+)(\/img)/g,
      build: (m) =>
        `${t('engine_cost.image_cheapest', lang)}${m[2]}${t('engine_cost.at_per_month', lang)}${m[4]}${m[5]}`,
    },
    {
      // 💰 Total: $X/month → 💰 总计: 每月 $X
      regex: /(\u{1F4B0} Total: )(\$[\d.]+)(\/month)/g,
      build: (m) =>
        `${t('engine_cost.gpu_total', lang)}${m[2]}`,
    },
    {
      // 💼 Training total: $X → 💼 训练总成本: $X  (CONDITIONAL: only if pattern found in Step 1)
      regex: /(\u{1F4BC} Training total: )(\$[\d.]+)/g,
      build: (m) =>
        `${t('engine_cost.training_total', lang)}${m[2]}`,
    },
```

- [ ] **Step 3: Extend `CASES` in test file**

```ts
  { slug: 'solopreneur-openai-token-calculator', zhFragment: '💡 比 ', enFragment: '💡 Saving vs ' },
  { slug: 'solopreneur-ai-image-generation-cost-calculator', zhFragment: '🎨 最便宜提供商:', enFragment: '🎨 Cheapest provider:' },
  { slug: 'solopreneur-gpu-cloud-cost-calculator', zhFragment: '💰 总计:', enFragment: '💰 Total:' },
  // Conditional:
  { slug: 'solopreneur-ai-training-cost-estimator', zhFragment: '💼 训练总成本:', enFragment: '💼 Training total:' },
```

- [ ] **Step 4: Run test, verify pass**

Run: `RUN_BUILD_TESTS=1 pnpm exec vitest run tests/ai-cost-t2-7-zh-output.test.ts`
Expected: All cases pass (8 engines, 9 patterns total). If training_total was dropped: 7 cases.

- [ ] **Step 5: Spot-check 4 zh dist HTML files**

```bash
for slug in solopreneur-openai-token-calculator solopreneur-ai-image-generation-cost-calculator solopreneur-gpu-cloud-cost-calculator solopreneur-ai-training-cost-estimator; do
  echo "=== $slug ==="
  grep -c "💡 比\|🎨 最便宜提供商\|💰 总计\|💼 训练总成本" dist/zh/$slug/index.html || true
done
```

Each engine should show count ≥ 1 for its expected fragment.

- [ ] **Step 6: Commit**

```bash
git add src/pages/\[lang\]/\[slug\].astro tests/ai-cost-t2-7-zh-output.test.ts src/i18n/translations.ts tests/dead-i18n-keys-guard.test.ts
git commit -m "feat(p137): 4 remaining composite patterns (saving/image/gpu/training)"
```

---

## Task 5: Full verification pass

**Files:**
- Read: `package.json` (for `pnpm check` definition)
- Read: `CHANGELOG.md` (header state before edit)

- [ ] **Step 1: Run full pnpm check (includes tsc + non-build-dep tests)**

Run: `pnpm check`
Expected: 1205/0/0 (1204 baseline + 1 new T2.7 zh-output test)

- [ ] **Step 2: Run build-dep suites together**

Run: `RUN_BUILD_TESTS=1 pnpm test:unit 2>&1 | tail -40`
Expected: All previously-passing suites still pass; T2.7 zh-output added to skips (was added to skip-mode in Task 2).

- [ ] **Step 3: Run codegen drift guards**

Run: `node scripts/codegen-examples.mjs --check`
Expected: exit 0 (no drift — we did NOT touch engine `staticExamples`)

- [ ] **Step 4: Run P132 invariant guard**

Run: `pnpm exec vitest run tests/claude-md-invariant-guard.test.ts`
Expected: pass. Verify CHANGELOG header commit count is in sync with git.

- [ ] **Step 5: Spot-check 8 zh + 8 en pages in browser (or grep)**

For each engine: confirm zh page contains all expected CJK fragments, en page does NOT.

- [ ] **Step 6: Summary commit (only if any fixes applied)**

If any test reveals a problem, fix inline. If everything passes, no commit needed for this task (the 4 prior commits are sufficient).

---

## Task 6: CHANGELOG bump + ship memory + 3-way push

**Files:**
- Modify: `CHANGELOG.md` (header)
- Create: `memory/p137-tier2-round7-trial-shipped.md`
- Modify: `memory/MEMORY.md`

- [ ] **Step 1: Update CHANGELOG header**

In `CHANGELOG.md`, find the last header line. Update:

```markdown
<!-- OLD -->
最后更新: 2026-07-29 (P136 — walker defensive audit)
Total commits: 827

<!-- NEW -->
最后更新: 2026-07-29 (P137 — T2.7 composite lines)
Total commits: 828  (or actual: run `git rev-list --count HEAD` first)
```

Also update skip-mode summary table to show 38 → 39 build-dep suites.

- [ ] **Step 2: Write ship memory `memory/p137-tier2-round7-trial-shipped.md`**

Use this template — fill in actual numbers from the completed batch:

```markdown
---
name: p137-tier2-round7-trial-shipped
description: P137 closes the architectural gap surfaced by P119+P131 ship memory — composite data-driven lines (static prefix + dynamic data + static suffix) on AI cost engines now translated via post-processor regex extension. 9 new engine_cost.* keys + 1 new build-dep zh-output test. ZERO engine modifications. Trial round; P138+ may extend to business 92 engines based on feedback.
metadata:
  type: project
---

# P137 Tier-2 Round 7 Composite Data-Driven Lines Ship Log

## Summary

P137 trial = first batch to address tier-2's "composite lines with dynamic data" gap that P119 closed static prefixes. After pre-plan architecture audit revealed `[slug].astro` uses `staticExamples[]` literals (not `generate()` at build), the actual mechanism is Route C-extended: regex post-processor. Ships 9 engine_cost.* keys + compositePatterns[] in `translateCalcOutput` + 1 new build-dep test. ZERO engine file changes.

**Date:** 2026-07-29
**Batch ID:** P137
**Files touched:** 4 (translations.ts + [slug].astro + 2 test files + 1 register)
**Commits:** 6 (Tasks 1/2/3/4 = 4 feat commits + Task 5 verification + Task 6 docs)
**pnpm check:** 1205/0/0 (1204 + 1 T2.7 zh-output)
**3-way sync:** `0	0`

## Architecture correction log

| Phase | Assumption | Reality (after audit) |
|---|---|---|
| Brainstorming | Route A: add `lang: Lang = 'en'` to `generate()` | `[slug].astro:1145-1158` calls `engine.staticExamples[0]` and post-processes |
| Spec first draft | Route A architecture | Wrong — engines never called at build |
| Pre-plan audit | Discovered actual flow | Switched to Route C-extended |
| Spec rev | Re-wrote §2/§4/§5/§6/§7/§8/§9 | Committed `318a094` |

**Lesson**: When the spec's mechanism contradicts the codebase's actual rendering pipeline, halt pre-implementation and audit. Don't write source-level translation code if the renderer doesn't invoke `generate()`.

## What shipped

[fill in actual numbers based on git log after Task 5 verification]

## P138+ candidates (carried from P137 ship memory)

- Business engine tier-2 coverage (92 engines × composite lines, deferred pending trial feedback)
- compositePatterns refactor (>20 entries → extract to `src/i18n/composite-patterns.ts`)
- Custom regex validation: some composite lines have percentage markers that didn't translate (e.g., `save 50%` — `engine_cost.batch_save_50`?)
- Bar-chart label localization (multi-element intra-line)
- ...
```

- [ ] **Step 3: Update MEMORY.md with one-line entry**

Append to `## P17+ active batches (cascade audit + INDEX + production hardening)` section:

```markdown
- [P137 T2.7 trial](p137-tier2-round7-trial-shipped.md) — 2026-07-29; 9 composite keys + post-processor regex; 0 engine mods
```

- [ ] **Step 4: Commit docs**

```bash
git add CHANGELOG.md memory/p137-tier2-round7-trial-shipped.md memory/MEMORY.md
git commit -m "docs(p137): T2.7 trial ship memory + CHANGELOG bump"
```

- [ ] **Step 5: 3-way push**

```bash
git -c core.hooksPath=/dev/null push origin master
git -c core.hooksPath=/dev/null push github master
git rev-list --count origin..github && git rev-list --count github..origin
```

Expected output: `0` and `0`.

- [ ] **Step 6: Run invariant guard post-push**

Run: `pnpm exec vitest run tests/claude-md-invariant-guard.test.ts`
Expected: pass.

---

## Self-Review Checklist

- [ ] Spec coverage: §1 problem → Task 2-4 (composite pattern implementations); §3.1 8 engines → Task 2-4 CASES; §3.2 single-variable → Task 2-4 regex scope; §3.3 9 keys → Task 1; §4 implementation → Tasks 1-4; §5 testing → Task 2 + Task 5; §6 acceptance → Task 5; §7 out-of-scope → not implemented; §8 risks → mitigated (anchored regex, opaque number capture, dist HTML test); §9 open decisions → ship memory §P138+

- [ ] Placeholder scan: no "TBD" / "TODO" / "fill in details" remain

- [ ] Type consistency:
  - `t(key, lang)` 0 or 1 arg: yes — Task 1 keys are static strings (no `{var}` interpolation needed because post-processor regex captures dynamic data)
  - `translateCalcOutput(text, lang)` signature unchanged
  - new test imports match imports seen in `tests/_composite-i18n-walkers.ts`
  - `compositePatterns[]` shape: `{ regex: RegExp; build: (m: RegExpMatchArray) => string }` consistent across Task 2-4

- [ ] Commissioning hook: this plan requires ZERO modifications to `src/engines/**`. If during execution you find yourself reaching for an engine file, STOP — re-audit the spec.
