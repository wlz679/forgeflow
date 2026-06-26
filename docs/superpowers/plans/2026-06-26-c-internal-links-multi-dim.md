# C Spec: Internal-Links Multi-Dimensional Recommendation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade the related-tools recommendation algorithm from single-dimension (same `categoryId`) to multi-dimensional (same category + shared keywords), so small categories (cost=4, investment=3) can fill 4 related-tool slots with high-quality picks.

**Architecture:** Add `keywords: string[]` + `tags: string[]` fields to `ToolMeta`, manually annotate all 32 tools across 6 category files, then rewrite `src/data/internal-links.ts` to rank same-category tools by shared keywords (descending) and fall back to cross-category tools with score > 0. UI / consumer contract unchanged.

**Tech Stack:** Astro 4.16.19, TypeScript 5.6 (strict), node:test (via tsx), 32 self-registering engines + 6 split category files (from A+B spec).

**Predecessor:** `docs/superpowers/specs/2026-06-26-c-internal-links-multi-dim-design.md` (commit 8ebbc17)

**Conventions:**
- `categoryId` values are `A` (saas) / `B` (ai-cost) / `C` (valuation) / `D` (freelance) / `E` (cost) / `F` (investment). NOTE: the spec doc wrote `saas/ai-cost/...` in its example, but the actual codebase uses letter codes — use the letter codes throughout this plan.
- Small categories: `E` (cost, 4 tools) and `F` (investment, 3 tools).
- Run unit tests via `pnpm test:unit` (which calls `node tests/run.mjs` → spawns `tsx --test` over all `tests/*.test.ts`).
- Quality gate: `pnpm check` (runs codegen `--check` only; typecheck via `astro check` is not in `check`). If `astro check` is desired, run it manually.

---

## File Structure

| File | Status | Purpose |
| --- | --- | --- |
| `src/data/tools/types.ts` | Modify | Add `keywords` + `tags` to `ToolMeta` |
| `src/data/tools/saas.ts` | Modify | Annotate 5 tools |
| `src/data/tools/ai-cost.ts` | Modify | Annotate 8 tools |
| `src/data/tools/valuation.ts` | Modify | Annotate 6 tools |
| `src/data/tools/freelance.ts` | Modify | Annotate 6 tools |
| `src/data/tools/cost.ts` | Modify | Annotate 4 tools |
| `src/data/tools/investment.ts` | Modify | Annotate 3 tools |
| `src/data/internal-links.ts` | Rewrite | Multi-dim algorithm |
| `tests/internal-links.test.ts` | Create | 6 unit tests |
| `docs/superpowers/specs/2026-06-26-c-internal-links-multi-dim-design.md` | Reference only | Spec, no edits |

---

## Task 1: Annotate all 32 tools with keywords + tags [INTEGRATION]

**Files:**
- Modify: `src/data/tools/types.ts`
- Modify: `src/data/tools/saas.ts` (5 tools)
- Modify: `src/data/tools/ai-cost.ts` (8 tools)
- Modify: `src/data/tools/valuation.ts` (6 tools)
- Modify: `src/data/tools/freelance.ts` (6 tools)
- Modify: `src/data/tools/cost.ts` (4 tools)
- Modify: `src/data/tools/investment.ts` (3 tools)

**Note on integration:** This task modifies 7 files and introduces new required fields. The TS compiler will fail on every `ToolMeta[]` literal in the 6 category files until all annotations are present. The implementer must update `types.ts` first, then update ALL 6 category files in one atomic commit — `pnpm check` and `pnpm build` (run at the end of Task 3) verify the atomicity. Reviewer should specifically cross-check that no tool was missed (grep `keywords:` across all 6 files; total count must be 32).

**Annotation policy (from spec):**
- `keywords`: 5-10 per tool. Same-category tools should share 2-3 keywords. Small categories (E, F) MUST share at least 1 keyword with tools in other categories (so the fallback in Task 2 has cross-category picks).
- `tags`: 3-5 per tool. Case-sensitive, original spelling.
- Lowercase comparison happens in the algorithm; storage preserves case.

**Cross-category keyword seeding (for fallback)** — these are keywords that exist in MULTIPLE category files, so cross-category fallback has signal:

- `unit economics` — appears in valuation (CAC, LTV, unit-economics) AND in saas (revenue-projector, churn-rate, burn-rate)
- `saas metrics` — saas + valuation
- `pricing` — saas (saas-pricing-planner) + freelance (course-pricing) + investment (sponsorship-rate)
- `freelance` — freelance + investment (freelance-tax) + cost (time-value, employee-cost)
- `tax` — investment (freelance-tax) + freelance (project-profitability, hourly-vs-fixed)
- `startup finance` — saas + valuation + cost
- `productivity` — freelance (time-value) + cost (productivity-score, meeting-cost)

Use these as bridge keywords when annotating.

### Step 1: Update types.ts

Edit `src/data/tools/types.ts`:

```ts
export interface ToolMeta {
  slug: string;
  title: string;
  description: string;
  categoryId: string;
  applicationCategory: string;
  inputs: { name: string; label: string; placeholder: string; type: 'text' | 'select' | 'number'; options?: string[] }[];
  keywords: string[];   // 5-10 per tool; drives recommendation algorithm (shared keyword count = similarity score)
  tags: string[];       // 3-5 per tool; reserved for future UI / Schema.org reuse
}
```

### Step 2: Annotate saas.ts (5 tools — A category)

Edit `src/data/tools/saas.ts`. For each tool entry, add a `keywords: [...]` and `tags: [...]` line BEFORE the closing `},`. Use the following annotations:

```ts
// burn-rate-calculator
keywords: ['cash flow', 'runway', 'burn rate', 'saas metrics', 'startup finance', 'operating cost'],
tags: ['saas', 'finance', 'runway'],

// churn-rate-calculator
keywords: ['churn', 'retention', 'saas metrics', 'revenue churn', 'logo churn', 'startup finance'],
tags: ['saas', 'churn', 'retention'],

// market-size-estimator
keywords: ['market size', 'tam', 'sam', 'som', 'market research', 'startup finance'],
tags: ['market', 'research', 'tam'],

// mrr-calculator
keywords: ['mrr', 'recurring revenue', 'saas metrics', 'subscription', 'startup finance', 'revenue growth'],
tags: ['saas', 'mrr', 'subscription'],

// revenue-projector (SaaS Financial Forecaster)
keywords: ['revenue forecast', 'saas metrics', 'unit economics', 'runway', 'startup finance', 'breakeven'],
tags: ['saas', 'forecast', 'finance'],
```

### Step 3: Annotate ai-cost.ts (8 tools — B category)

```ts
// openai-token-calculator
keywords: ['openai', 'gpt', 'token pricing', 'api cost', 'llm cost', 'prompt caching'],
tags: ['openai', 'llm', 'tokens'],

// claude-api-cost-calculator
keywords: ['claude', 'anthropic', 'token pricing', 'api cost', 'llm cost', 'prompt caching'],
tags: ['claude', 'llm', 'tokens'],

// deepseek-api-cost-calculator
keywords: ['deepseek', 'token pricing', 'api cost', 'llm cost', 'auto cache'],
tags: ['deepseek', 'llm', 'tokens'],

// gemini-api-cost-calculator
keywords: ['gemini', 'google', 'token pricing', 'api cost', 'llm cost', 'context caching'],
tags: ['gemini', 'llm', 'tokens'],

// ai-image-cost-calculator
keywords: ['image generation', 'dall-e', 'midjourney', 'stable diffusion', 'ai art cost', 'api cost'],
tags: ['image', 'ai art', 'cost'],

// ai-training-cost-estimator
keywords: ['ai training', 'model training', 'gpu cost', 'lora', 'fine-tuning', 'training compute'],
tags: ['training', 'gpu', 'ai'],

// gpu-cloud-cost-calculator
keywords: ['gpu rental', 'cloud gpu', 'h100', 'a100', 'training compute', 'gpu cost'],
tags: ['gpu', 'cloud', 'compute'],

// ai-api-cost-comparison
keywords: ['api cost', 'llm cost', 'token pricing', 'cross-provider', 'model comparison', 'openai', 'claude'],
tags: ['comparison', 'llm', 'cost'],
```

### Step 4: Annotate valuation.ts (6 tools — C category)

```ts
// unit-economics-calculator
keywords: ['unit economics', 'ltv', 'cac', 'saas metrics', 'customer profitability', 'startup finance'],
tags: ['unit economics', 'ltv', 'cac'],

// cac-calculator
keywords: ['cac', 'customer acquisition cost', 'marketing', 'unit economics', 'saas metrics', 'payback period'],
tags: ['cac', 'marketing', 'saas'],

// ltv-calculator
keywords: ['ltv', 'lifetime value', 'unit economics', 'saas metrics', 'retention', 'churn'],
tags: ['ltv', 'retention', 'saas'],

// saas-valuation-calculator
keywords: ['saas valuation', 'arr multiple', 'startup valuation', 'exit value', 'startup finance'],
tags: ['valuation', 'saas', 'exit'],

// break-even-calculator
keywords: ['break-even', 'breakeven', 'startup finance', 'monthly costs', 'revenue target', 'runway'],
tags: ['break-even', 'finance', 'costs'],

// equity-dilution-calculator
keywords: ['equity dilution', 'funding round', 'pre-money', 'post-money', 'founder equity', 'startup finance'],
tags: ['equity', 'funding', 'startup'],
```

### Step 5: Annotate freelance.ts (6 tools — D category)

```ts
// affiliate-income-calculator
keywords: ['affiliate', 'passive income', 'commission', 'conversion rate', 'traffic', 'online business'],
tags: ['affiliate', 'passive income', 'online'],

// course-pricing-calculator
keywords: ['course pricing', 'pricing', 'online course', 'platform fee', 'digital product', 'passive income'],
tags: ['course', 'pricing', 'creator'],

// email-list-revenue-calculator
keywords: ['email marketing', 'newsletter revenue', 'list monetization', 'conversion rate', 'passive income', 'creator'],
tags: ['email', 'newsletter', 'creator'],

// freelance-rate-calculator
keywords: ['freelance rate', 'hourly rate', 'pricing', 'freelance', 'consulting', 'remote work'],
tags: ['freelance', 'pricing', 'rate'],

// hourly-vs-fixed-calculator
keywords: ['hourly rate', 'fixed rate', 'retainer', 'freelance', 'annual income', 'pricing'],
tags: ['freelance', 'pricing', 'rate'],

// project-profitability-calculator
keywords: ['project profit', 'freelance', 'hourly cost', 'profit margin', 'effective rate', 'pricing'],
tags: ['freelance', 'profit', 'pricing'],
```

### Step 6: Annotate cost.ts (4 tools — E category)

```ts
// saas-pricing-planner
keywords: ['pricing', 'saas pricing', 'pricing strategy', 'tier pricing', 'freemium', 'monetization'],
tags: ['pricing', 'saas', 'monetization'],

// employee-cost-calculator
keywords: ['employee cost', 'hiring cost', 'salary', 'benefits', 'overhead', 'freelance'],
tags: ['hr', 'hiring', 'cost'],

// meeting-cost-calculator
keywords: ['meeting cost', 'productivity', 'time waste', 'hourly rate', 'team cost'],
tags: ['meeting', 'productivity', 'cost'],

// productivity-score
keywords: ['productivity', 'deep work', 'solopreneur', 'time management', 'tools stack'],
tags: ['productivity', 'focus', 'solopreneur'],
```

### Step 7: Annotate investment.ts (3 tools — F category)

```ts
// freelance-tax-calculator
keywords: ['freelance tax', 'tax', 'self-employment', 'quarterly tax', 'taxable income', 'freelance'],
tags: ['tax', 'freelance', 'finance'],

// sponsorship-rate-calculator
keywords: ['sponsorship', 'cpm', 'creator', 'podcast', 'newsletter', 'pricing'],
tags: ['sponsorship', 'creator', 'pricing'],

// time-value-calculator
keywords: ['time value', 'hourly rate', 'productivity', 'freelance', 'time waste', 'annual income'],
tags: ['time', 'productivity', 'rate'],
```

### Step 8: Run quality gate

Run: `pnpm check`
Expected: exit 0 (codegen --check passes; this task does not touch engines or staticExamples).

Run: `npx tsc --noEmit` (if available) OR `node_modules/.bin/astro check` (slower, but catches TS errors in `src/`).
Expected: 0 TS errors. If any TS2741 (missing `keywords` or `tags`) errors appear, a tool was missed in steps 2-7 — go back and annotate it.

### Step 9: Verify all 32 tools have keywords + tags

Run:
```bash
grep -c "keywords:" src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts | awk -F: '{s+=$2} END {print s}'
```
Expected: `32`

Run:
```bash
grep -c "tags:" src/data/tools/{saas,ai-cost,valuation,freelance,cost,investment}.ts | awk -F: '{s+=$2} END {print s}'
```
Expected: `32`

### Step 10: Commit

```bash
git add src/data/tools/types.ts src/data/tools/saas.ts src/data/tools/ai-cost.ts src/data/tools/valuation.ts src/data/tools/freelance.ts src/data/tools/cost.ts src/data/tools/investment.ts
git commit -m "feat(tools): annotate 32 tools with keywords + tags for recommendation

ToolMeta adds 2 required fields:
- keywords (5-10): drives shared-keyword similarity ranking in internal-links
- tags (3-5): reserved for future UI / Schema.org reuse

Annotation strategy:
- Same-category tools share 2-3 keywords (guarantees recommendation picks them)
- Cross-category bridge keywords seeded: unit economics, saas metrics, pricing,
  freelance, tax, productivity, startup finance
- Small categories (E=4, F=3) deliberately share >=1 cross-category keyword
  so the fallback in next task has signal"
```

---

## Task 2: Rewrite internal-links.ts with multi-dimensional algorithm [MECHANICAL]

**Files:**
- Modify: `src/data/internal-links.ts` (full rewrite)

**Note on mechanical:** The algorithm logic is fully specified in the design doc. There is no integration risk — `RelatedTools.astro` and `[slug].astro` consume `relatedTools[slug]: string[]`, contract preserved.

### Step 1: Write the failing test (smoke)

Create `tests/internal-links.test.ts` with ONLY a smoke test for now (full tests land in Task 3):

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';

test('SMOKE: relatedTools has 32 entries', () => {
  assert.equal(Object.keys(relatedTools).length, 32);
});
```

Run: `pnpm test:unit`
Expected: smoke test PASSES (the legacy single-dim algorithm already produces 32 entries).

This step exists to verify the test runner can import `src/data/internal-links.ts` cleanly under tsx — a pre-flight check before rewriting.

### Step 2: Rewrite src/data/internal-links.ts

Replace the entire file contents:

```ts
import { tools, type ToolMeta } from './tools';

// Count how many keywords (case-insensitive) two tools share.
function sharedKeywords(a: ToolMeta, b: ToolMeta): number {
  const aSet = new Set(a.keywords.map(k => k.toLowerCase()));
  const bSet = new Set(b.keywords.map(k => k.toLowerCase()));
  let n = 0;
  for (const k of aSet) if (bSet.has(k)) n++;
  return n;
}

// Rank candidates by (shared keywords desc, slug asc for tie-break).
function rankByKeywords(source: ToolMeta, candidates: ToolMeta[]) {
  return candidates
    .map(c => ({ c, score: sharedKeywords(source, c) }))
    .sort((a, b) => b.score - a.score || a.c.slug.localeCompare(b.c.slug));
}

// Auto-generate: each tool gets up to 4 related tools.
// Algorithm:
//   1. Same-category first, ranked by shared keywords (desc).
//   2. If < 4 picks, fill from cross-category tools ranked by shared keywords.
//      Skip cross-category picks with score 0 (no keyword overlap = irrelevant).
export const relatedTools: Record<string, string[]> = {};

for (const tool of tools) {
  const sameCat = tools.filter(t => t.categoryId === tool.categoryId && t.slug !== tool.slug);
  const picked: ToolMeta[] = rankByKeywords(tool, sameCat).slice(0, 4).map(s => s.c);

  if (picked.length < 4) {
    const pickedSlugs = new Set(picked.map(p => p.slug));
    const crossCat = tools.filter(t =>
      t.categoryId !== tool.categoryId && t.slug !== tool.slug && !pickedSlugs.has(t.slug)
    );
    for (const s of rankByKeywords(tool, crossCat)) {
      if (picked.length >= 4) break;
      if (s.score > 0) picked.push(s.c);
    }
  }

  relatedTools[tool.slug] = picked.map(t => t.slug);
}
```

### Step 3: Run quality gate

Run: `pnpm check`
Expected: exit 0.

Run: `pnpm test:unit`
Expected: smoke test PASSES.

Run: `node -e "import('./src/data/internal-links.ts').then(m => { for (const [slug, related] of Object.entries(m.relatedTools)) { if (related.length !== 4) console.log('SHORT:', slug, 'has', related.length); } })"`
Expected: no `SHORT:` lines printed. (If any category's tools don't get 4 picks, the cross-category keyword seeding in Task 1 was insufficient — go back and add 1 more bridge keyword.)

### Step 4: Spot-check the algorithm output

Run:
```bash
node -e "import('./src/data/internal-links.ts').then(m => { for (const slug of ['solopreneur-burn-rate-calculator', 'solopreneur-employee-cost-calculator', 'solopreneur-time-value-calculator']) { console.log(slug, '->', m.relatedTools[slug]); } })"
```
Expected: each line shows 4 related slugs. `solopreneur-employee-cost-calculator` (E category, cost) and `solopreneur-time-value-calculator` (F category, investment) should each contain at least 1 cross-category slug.

### Step 5: Commit

```bash
git add src/data/internal-links.ts tests/internal-links.test.ts
git commit -m "feat(internal-links): multi-dimensional recommendation algorithm

Replaces single-dim (same-category only) with:
1. Same-category first, ranked by shared keywords (desc, slug tie-break)
2. Cross-category fallback when < 4 picks, score > 0 only

UI consumer contract preserved: relatedTools[slug]: string[] (up to 4 slugs).
RelatedTools.astro and [slug].astro unchanged.

Small categories (E=4, F=3) now reach 4 picks via cross-category keyword overlap
instead of truncating at 2-3."
```

---

## Task 3: Add full unit tests + verify build [INTEGRATION]

**Files:**
- Modify: `tests/internal-links.test.ts` (replace smoke with full test suite)

**Note on integration:** Touches test infrastructure + verifies end-to-end via `pnpm build`. Reviewer should run all tests and `pnpm build` themselves.

### Step 1: Replace tests/internal-links.test.ts with full suite

Replace the entire file contents:

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { relatedTools } from '../src/data/internal-links.ts';
import { tools } from '../src/data/tools/index.ts';

test('all 32 tools have relatedTools entry', () => {
  assert.equal(Object.keys(relatedTools).length, 32);
  for (const t of tools) {
    assert.ok(relatedTools[t.slug], `missing entry for ${t.slug}`);
  }
});

test('related list never includes the tool itself', () => {
  for (const t of tools) {
    assert.ok(!relatedTools[t.slug].includes(t.slug), `${t.slug} self-references`);
  }
});

test('related list has 4 entries for all 32 tools', () => {
  for (const t of tools) {
    assert.equal(
      relatedTools[t.slug].length,
      4,
      `${t.slug} (${t.categoryId}) has ${relatedTools[t.slug].length} related, want 4`
    );
  }
});

test('small categories (E=cost, F=investment) use cross-category fallback', () => {
  for (const t of tools.filter(x => x.categoryId === 'E' || x.categoryId === 'F')) {
    const sameCat = tools.filter(x => x.categoryId === t.categoryId && x.slug !== t.slug);
    assert.ok(
      relatedTools[t.slug].length > sameCat.length,
      `${t.slug} (${t.categoryId}) fallback inactive: ${sameCat.length} same-cat available, got ${relatedTools[t.slug].length} related`
    );
  }
});

test('related list is sorted: same-category before cross-category', () => {
  for (const t of tools) {
    const related = relatedTools[t.slug].map(s => tools.find(x => x.slug === s)!);
    let seenCross = false;
    for (const r of related) {
      if (r.categoryId !== t.categoryId) seenCross = true;
      else if (seenCross) {
        assert.fail(`${t.slug}: same-category ${r.slug} appears after cross-category`);
      }
    }
  }
});

test('no duplicate slugs in any related list', () => {
  for (const t of tools) {
    const set = new Set(relatedTools[t.slug]);
    assert.equal(
      set.size,
      relatedTools[t.slug].length,
      `${t.slug} has duplicates: ${relatedTools[t.slug].join(',')}`
    );
  }
});
```

### Step 2: Run tests

Run: `pnpm test:unit`
Expected: 6/6 pass. If any test fails, see the failure message — most likely cause is a tool whose `keywords` annotation is too sparse for the algorithm to find 4 picks.

### Step 3: Run codegen check (existing quality gate)

Run: `pnpm check`
Expected: exit 0. This task does not modify `calculate()` or `customFn`, so codegen --check passes trivially.

### Step 4: Run production build

Run: `pnpm build`
Expected: exit 0, builds 141 static pages. If a TS error surfaces (e.g., a consumer file references ToolMeta in a way that misses the new fields), the failure message will name the file.

### Step 5: Manual spot check via build artifacts

Run:
```bash
ls dist/en/solopreneur-time-value-calculator/ 2>/dev/null || ls dist/zh/solopreneur-time-value-calculator/
grep -l "RelatedTools\|related-tool" dist/en/solopreneur-time-value-calculator/index.html 2>/dev/null
```
Expected: directory exists. The HTML should contain 4 links to other calculator slugs in the RelatedTools section.

If `RelatedTools.astro` is rendered via a different selector, use `grep -oE 'href="/[a-z]{2}/solopreneur-[a-z-]+/"' dist/en/solopreneur-time-value-calculator/index.html | sort -u` to count unique related-tool links.

### Step 6: Commit

```bash
git add tests/internal-links.test.ts
git commit -m "test(internal-links): 6 unit tests covering coverage, fallback, ordering, dedup

- all 32 tools have relatedTools entry
- no self-reference
- 4 entries each (cross-category fallback fills small categories)
- small categories (E, F) verified to use fallback
- same-category tools always appear before cross-category picks
- no duplicate slugs

Also verified: pnpm check exits 0, pnpm build produces 141 pages."
```

---

## Self-Review

**Spec coverage:**
- types.ts field additions → Task 1 ✓
- 32-tool annotation → Task 1 ✓
- Multi-dim algorithm (same-cat first, cross-cat fallback) → Task 2 ✓
- 6 unit tests (5 from spec + 1 self-check) → Task 3 ✓
- Acceptance checklist (pnpm check, pnpm build, manual spot check) → Task 3 ✓

**Placeholder scan:** No "TBD", no "TODO", no "implement later", no "similar to Task N".

**Type consistency:** `ToolMeta.keywords` and `ToolMeta.tags` referenced consistently. `sharedKeywords`, `rankByKeywords` defined in Task 2 and used in Task 2. Test imports `relatedTools` and `tools` consistently.

**One spec deviation flagged:** The spec doc's "Implementation" section says `import { tools, type ToolMeta } from './tools'` — but `tools/index.ts` only re-exports the array and the type. Verified by reading `src/data/tools/index.ts` line 17 (`export type { ToolMeta };`). The import in this plan matches what's actually exported.

**Risk callout:** Task 1 is [INTEGRATION] because the TS compiler will reject any `ToolMeta[]` literal missing the new required fields. If a subagent implements steps 2-7 out of order or skips one tool, `npx tsc --noEmit` (or `astro check`) at step 8 will pinpoint the missing tool. The grep verification at step 9 catches missed tools even if typecheck passes (e.g., empty arrays).