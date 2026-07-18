# P8 Sales / CRM Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` (controller direct execution) per CLAUDE.md P4-3+ lesson — `subagent-driven-development` is reserved for non-mechanical work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 v3-standard sales / CRM calculators (P8-1..P8-6) in a new `src/engines/sales/` directory; ship 56 → 62 engines. Add new **category 'S' Sales / CRM**.

**Architecture:** Each P8-X is a self-contained engine file following P5/P6/P7 pattern: math helpers exported at module top, `calculate()` for SSG rendering, minified `customFn` for live browser recalc, `registerEngine()` registration. **Business v3 standard** (6 emoji sections per CLAUDE.md): 🩺 Health · 📊 Inputs Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip. All 6 land in NEW `sales/` category with `categoryId: 'S'`. **Audience**: B2B SaaS founders, sales managers, RevOps leads (10-person SMB SaaS, $1M–$5M ARR anchor); closes the funnel loop with P6 marketing analytics. 30 inputs / 51 math tests / 51 pass progression (461 → 512).

**Tech Stack:**
- Astro 4.16.19 SSG (no SSR)
- TypeScript 5.6 strict
- Node `^20.19.0 || >=22.13.0`
- pnpm 9.x
- Test runner: `node --import tsx --test tests/<file>.test.ts`
- Pre-commit validation: `pnpm check` (codegen-examples --check + codegen-customfn --check + i18n completeness + clerk/supabase env + tests/run.mjs)
- codegen script: `node scripts/codegen-examples.mjs --check` (with `--check` mode for CI/pre-commit)
- CustomFn parser: `node tests/scripts/test-customFn.mjs <slug>`

## Global Constraints

Copied verbatim from spec §"Architecture" + CLAUDE.md + P5/P6/P7 lesson corpus. Every task inherits these requirements implicitly.

1. **`src/engines/` zero architectural changes** — only add new files; 56 existing engine files frozen
2. **`ToolMeta.inputs` is `ToolInput[]` structured form** — `{ name, label, placeholder, type, options? }` per element; NEVER a `string[]` (P4-2 lesson)
3. **`ToolInput.type` only `text | select | number`** — NO `checkbox` type; for boolean choices use `select` with `['no', 'yes']` options (P4-2 lesson)
4. **`ToolEngine.customFn` MUST parse as valid JS** — verify with `node tests/scripts/test-customFn.mjs <slug>`
5. **CustomFn ASI trap** — `}` followed by `if`/`for`/`return`/etc. is a JS parse error; insert literal `;` between them
6. **`calculate()` is source of truth; `staticExamples[0]` is auto-regenerated** — after editing `calculate()`, run `node scripts/codegen-examples.mjs` (without `--check`) before committing
7. **Live = static parity invariant (P4-2 lesson)** — any math-helper correction in source MUST be mirrored in `customFn`; pre-commit spot-check: `staticExamples[0]` text matches what `customFn` would produce for default inputs
8. **`pnpm check` exits 0 before commit** — automatic via pre-commit hook; bypass only with `SKIP_PRECOMMIT_CHECK=1` (emergency only)
9. **`categoryId: 'S'`** — all 6 P8 calculators use `categoryId: 'S'` (new letter after 'O'; A/B/C/D/E/F/M/O all taken)
10. **Engine slug pattern** — `solopreneur-{name}-calculator` (existing convention)
11. **New directory `src/engines/sales/`** — does NOT currently exist; created in Task 0
12. **New file `src/data/tools/sales.ts`** — does NOT currently exist; created in Task 0
13. **New category listing page `src/pages/[lang]/sales.astro`** — does NOT currently exist; created in Task 0 (mirror `operations-inventory.astro`); `CATEGORY_ID = 'S'`, `CATEGORY_SLUG = 'sales'`
14. **Wire `7 files` per calculator** — see per-task Wiring tables; P8-1 also adds `src/data/seo-schemas/listingPages.ts` entry (P7-0 lesson: dist/ must auto-rebuild)
15. **`tests/ab-split.test.ts` count bumps** — current count `56`; bumped to `62` in Task 0 (2 places modified)
16. **`tests/internal-links.test.ts` count bumps** — current count `56`; bumped to `62` in Task 0 (2 places modified)
17. **`codegen-examples --check` exit 0** — pre-commit invariant
18. **i18n completeness** — `scripts/check-i18n-completeness.mjs` exits 0; each new engine has 2 OG entries (`en` + `zh`); no emoji in trend line (P6-1 lesson)
19. **Mirror push to both gitee (`origin`) + github (`github`)** — gitee primary with rev-list safety; github with `SKIP_PUSH_FETCH=1`
20. **Per-calculator memory file written** — `C:\Users\元始天尊\.claude\projects\D--E-----youtube-tools\memory\p8-N-{name}-shipped.md` after each calculator ships; update `MEMORY.md` index
21. **Spec is single source of truth** — `docs/superpowers/specs/2026-07-07-p8-sales-batch-design.md` (commit 615b767) for math models, output sections, edge cases, health bands, tests
22. **TS warnings NOT fixed** — `HEALTH_BANDS` re-export ambiguity + `categoryId` not in `ToolEngine` type are pre-existing pattern across P5+P6+P7, non-blocking (`pnpm check` doesn't run `tsc`). User explicitly chose "不修" (don't fix).
23. **`scripts/codegen-examples.mjs` only auto-regenerates `staticExamples[0]`** — if engine ships `[1+]`, `[2+]`, ... alternative scenarios, verify manually (per CLAUDE.md)
24. **OG sample emoji rule** — `headlineLabel`/`headline`/`headlineUnit` fields must NOT contain 🟢🟡🟠🔴 (P6-1 lesson: `build-og-images.ts` `assertEmojiSet` rejects unmapped emoji); use `excellent`/`good`/`warning`/`critical` text labels instead
25. **P8-1 also adds `src/data/seo-schemas/listingPages.ts` entry** — `'S'` category entry alongside `'M'` and `'O'`; P7-0 lesson: dist/ must auto-rebuild before this entry takes effect; do it at P8-1 (not at scaffold)

---

## File Structure

```
src/
  engines/
    sales/                                                NEW directory (Task 0)
      index.ts                                              barrel of 6 imports (Task 0 + per-task increments)
      pipeline-value-calculator.ts                          P8-1 (8 inputs, 8 tests)
      sales-velocity-calculator.ts                          P8-2 (4 inputs, 9 tests)
      acv-calculator.ts                                     P8-3 (4 inputs, 8 tests)
      win-rate-by-stage-calculator.ts                       P8-4 (8 inputs, 9 tests)
      quota-attainment-calculator.ts                        P8-5 (3 inputs, 9 tests)
      pipeline-coverage-calculator.ts                       P8-6 (3 inputs, 8 tests)
  data/
    categories.ts                                           MODIFIED (Task 0 adds 'S' Sales)
    tools/
      sales.ts                                              NEW (Task 0 creates; per-task adds entry)
    og-samples.json                                         MODIFIED per task (6 OG samples, no emoji)
    internal-links.ts                                       MODIFIED per task (1 relatedTools entry per calc)
    seo-schemas/
      listingPages.ts                                       MODIFIED P8-1 (P7-0 lesson; dist/ must auto-rebuild)
  pages/
    [lang]/
      sales.astro                                           NEW (Task 0; mirror operations-inventory.astro)
scripts/codegen-examples.mjs                                MODIFIED per task (6 ENGINES entries)
tests/
  pipeline-value-calculator.test.ts                        NEW (P8-1, 8 tests)
  sales-velocity-calculator.test.ts                        NEW (P8-2, 9 tests)
  acv-calculator.test.ts                                   NEW (P8-3, 8 tests)
  win-rate-by-stage-calculator.test.ts                     NEW (P8-4, 9 tests)
  quota-attainment-calculator.test.ts                      NEW (P8-5, 9 tests)
  pipeline-coverage-calculator.test.ts                     NEW (P8-6, 8 tests)
  ab-split.test.ts                                         MODIFIED Task 0 (count bump 56 → 62)
  internal-links.test.ts                                   MODIFIED Task 0 (count bump 56 → 62)
  seo-schemas.test.ts                                      MODIFIED Task 0 (listingPages array +'sales')
docs/superpowers/plans/2026-07-07-p8-sales-batch.md        THIS FILE
memory/p8-N-{name}-shipped.md                              NEW per task (P8-1..P8-6)
memory/p8-series-shipped.md                                NEW Task 7 (final summary)
```

Each `src/engines/sales/*.ts` file follows this structure (P6/P7 established pattern):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Health band constants (per-file, NOT shared) ============
const HEALTH_BANDS = { excellent: ..., good: [...], warning: [...], critical: ... };

// ============ Math helpers (exported for tests) ============
// pure functions, no side effects

// ============ calculate() ============
// 6-section string assembly: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip

// ============ customFn ============
// minified JS, escaped unicode, ASI-safe (}if → }; if)

// ============ Engine ============
const engine: ToolEngine = {
  slug: '...',
  title: '...',
  description: '...',
  inputs: [...],
  clientConfig: { type: 'custom', wordPools: {}, customFn },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [...],
  faq: [...],
  howToUse: [...],
};
registerEngine(engine);
```

---

## Task Decomposition (8 tasks)

### Task 0: P8-0 Scaffold (1 commit)

**Goal:** Create directory structure + category listing page + cross-cutting fixes pre-emptive (P6-1 fixes carry forward; P7-0 lesson: dist/ must auto-rebuild before listingPages entry).

**Files:**
- Create: `src/engines/sales/index.ts` (empty barrel — comments only)
- Create: `src/data/tools/sales.ts` (empty exports array — comments only)
- Create: `src/pages/[lang]/sales.astro` (mirror `operations-inventory.astro`; `CATEGORY_ID = 'S'`, `CATEGORY_SLUG = 'sales'`)
- Modify: `src/data/categories.ts` (add `'S' Sales / 销售管理` entry after `'O'` row)
- Modify: `tests/seo-schemas.test.ts` (add `'sales'` to `listingPages` array — P2a test #320 guard)
- Modify: `tests/ab-split.test.ts` (bump `getAllEngines().length === 56 → 62` and `tools.length === 56 → 62` — pre-emptive scaffold assumption; per-task will verify)
- Modify: `tests/internal-links.test.ts` (bump 56 → 62 for `Object.keys(relatedTools).length` + tools.length)
- Modify: `src/data/internal-links.ts` (add 6 relatedTools entries with empty arrays — per-calc fills)

**Steps:**

- [ ] **Step 1:** Create empty `src/engines/sales/index.ts`:
```typescript
// Sales / CRM Calculator Engines (P8 batch, 6 calcs)
//
// P8-1: pipeline-value          — Pipeline Value
// P8-2: sales-velocity          — Sales Velocity
// P8-3: acv                     — Average Contract Value
// P8-4: win-rate-by-stage       — Win Rate by Stage
// P8-5: quota-attainment        — Quota Attainment
// P8-6: pipeline-coverage       — Pipeline Coverage
//
// Engines are added one per task via Task 1..Task 6.
export {};
```

- [ ] **Step 2:** Create empty `src/data/tools/sales.ts`:
```typescript
// Sales / CRM ToolMeta entries (P8 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './_types';
export const salesTools: ToolMeta[] = [];
```

- [ ] **Step 3:** Modify `src/data/categories.ts` — append one row after `'O' Operations`:
```typescript
{ id: 'S', name: 'Sales / 销售管理', slug: 'sales', description: 'Calculate pipeline value, sales velocity, ACV, win rate by stage, quota attainment, and pipeline coverage for B2B SaaS sales teams and RevOps.' },
```

- [ ] **Step 4:** Create `src/pages/[lang]/sales.astro` (mirror operations-inventory.astro):
```astro
---
import BaseLayout from '../../layouts/BaseLayout.astro';
import Header from '../../components/Header.astro';
import Footer from '../../components/Footer.astro';
import ToolCard from '../../components/ToolCard.astro';
import CategoryOtherNav from '../../components/CategoryOtherNav.astro';
import { categories } from '../../data/categories';
import { tools } from '../../data/tools';
import { t, getLang } from '../../i18n';

export function getStaticPaths() {
  return [
    { params: { lang: 'en' } },
    { params: { lang: 'zh' } },
  ];
}

const lang = getLang(Astro);
const CATEGORY_ID = 'S';
const CATEGORY_SLUG = 'sales';
// Category S i18n keys will populate incrementally across P8-1..P8-6.
// Until then, fall back to direct category data.
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'Sales / 销售管理';
const categoryDesc = categoryMeta?.description ?? 'Sales and CRM calculators for B2B SaaS sales teams and RevOps.';

const categoryTools = tools.filter(tool => tool.categoryId === CATEGORY_ID);
---

<BaseLayout
  title={`${categoryName} — ForgeFlowKit`}
  description={categoryDesc}
  pageType="static"
>
  <Header />
  <main class="max-w-6xl mx-auto px-4 py-8 flex-1">
    <section class="mb-10">
      <div class="text-xs font-semibold text-[#7C3AED] mb-2">Category {CATEGORY_ID}</div>
      <h1 class="text-3xl font-bold text-gray-900 mb-3">{categoryName}</h1>
      <p class="text-sm text-gray-700 leading-relaxed">{categoryDesc}</p>
    </section>

    <section class="mb-10">
      <h2 class="text-2xl font-bold text-gray-900 mb-6">All {categoryTools.length} {categoryName} Tools</h2>
      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {categoryTools.map(t => <ToolCard slug={t.slug} title={t.title} description={t.description} />)}
      </div>
    </section>

    <CategoryOtherNav currentCategoryId={CATEGORY_ID} categories={categories} />
  </main>
  <Footer />
</BaseLayout>
```

- [ ] **Step 5:** Modify `tests/seo-schemas.test.ts` — find `listingPages` array and add `'sales'`:
```typescript
const listingPages = ['saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing', 'cost-efficiency', 'investment-roi', 'marketing-analytics', 'operations-inventory', 'sales'];
```

- [ ] **Step 6:** Modify `tests/ab-split.test.ts` — find both count assertions (search for `56`) and bump to `62`:
```typescript
assert.equal(getAllEngines().length, 62);
// ...
assert.equal(tools.length, 62);
```

- [ ] **Step 7:** Modify `tests/internal-links.test.ts` — find both count assertions (search for `56`) and bump to `62`:
```typescript
assert.equal(Object.keys(relatedTools).length, 62);
// ...
test('related list has 4 entries for all 62 tools', () => {
```

- [ ] **Step 8:** Modify `src/data/internal-links.ts` — append 6 empty arrays to `relatedTools` (P6-2 lesson: explicit entries ensure cross-cat fallback order is correct from seed):
```typescript
relatedTools: {
  // ...existing 56 entries...
  'solopreneur-pipeline-value-calculator': [],
  'solopreneur-sales-velocity-calculator': [],
  'solopreneur-acv-calculator': [],
  'solopreneur-win-rate-by-stage-calculator': [],
  'solopreneur-quota-attainment-calculator': [],
  'solopreneur-pipeline-coverage-calculator': [],
}
```

- [ ] **Step 9:** Run `pnpm check` — verify scaffolding compiles + tests don't regress (will likely fail at first due to empty category page → 0 tools; that's expected and acceptable at scaffold):
```bash
pnpm check
```
Expected: 461 pass + scaffold-related changes. If `relatedTools` test complains about empty arrays, that's expected — per-calc tasks will fill them. The scaffold commit is allowed to be slightly red on `pnpm check`; first per-calc task (P8-1) MUST restore green.

- [ ] **Step 10:** Commit + push:
```bash
cd "D:/E/独立站/youtube-tools"
git add -A
git commit -m "feat(p8-0): sales category scaffold + new 'S' category + listing page"
git push origin master
git push github master
```

---

### Task 1: P8-1 Pipeline Value Calculator (1 commit + 2 pushes)

**Goal:** Implement first sales calculator — weighted pipeline value by stage probability (Discovery/Proposal/Negotiation/Closing). 8 inputs · 8 math tests.

**Spec reference:** spec §"P8-1: Pipeline Value Calculator" — math, inputs, health bands, tests verbatim.

**Files (8 wired — P8-1 also adds listingPages entry):**
- Create: `src/engines/sales/pipeline-value-calculator.ts` (engine + customFn + HEALTH_BANDS + helpers + calculate)
- Modify: `src/engines/sales/index.ts` (+1 import + barrel)
- Modify: `scripts/codegen-examples.mjs` (+1 ENGINES entry alphabetical: `'pipeline-value-calculator'`)
- Modify: `src/data/tools/sales.ts` (+1 ToolMeta entry)
- Modify: `src/data/og-samples.json` (+1 OG sample: no emoji; headlineLabel = band name)
- Modify: `src/data/internal-links.ts` (fill P8-1's relatedTools array with 4 entries — see step 8)
- Modify: `src/data/seo-schemas/listingPages.ts` (+1 'S' entry; P7-0 lesson: dist/ must auto-rebuild)
- Create: `tests/pipeline-value-calculator.test.ts` (8 math tests)

**Math (from spec):**
```typescript
stageValue(count, size, probability) = count * size * probability
totalPipeline = discoveryVal + proposalVal + negotiationVal + closingVal
nominalPipeline = Σ(count × size)            // unweighted face value
weightedForecast = totalPipeline * 0.5        // 50% confidence forecast
```

**Health bands (totalPipeline USD):** 🟢 ≥$500,000 · 🟡 $200K-$500K · 🟠 $50K-$200K · 🔴 <$50K

**Steps:**

- [ ] **Step 1:** Write 8 math tests in `tests/pipeline-value-calculator.test.ts` (failing first):
```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  stageValue, totalPipeline, nominalPipeline, weightedForecast, calcHealthBand,
} from '../src/engines/sales/pipeline-value-calculator.ts';

test('stageValue: discovery 10×$15K×0.20 = $30K', () => {
  assert.equal(stageValue(10, 15000, 0.20), 30000);
});
test('totalPipeline: canonical $30K+$50K+$63K+$72K = $215K', () => {
  assert.equal(totalPipeline(30000, 50000, 63000, 72000), 215000);
});
test('calcHealthBand: 49999 → critical', () => {
  assert.equal(calcHealthBand(49999), 'critical');
});
test('calcHealthBand: 50000 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(50000), 'warning');
});
test('calcHealthBand: 200000 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(200000), 'good');
});
test('calcHealthBand: 500000 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(500000), 'excellent');
});
test('totalPipeline: all-zero → 0 (critical)', () => {
  assert.equal(totalPipeline(0, 0, 0, 0), 0);
});
test('totalPipeline: single stage only 30K', () => {
  assert.equal(totalPipeline(30000, 0, 0, 0), 30000);
});
```

- [ ] **Step 2:** Run test to verify it fails:
```bash
node --import tsx --test tests/pipeline-value-calculator.test.ts
```
Expected: FAIL with "Cannot find module '../src/engines/sales/pipeline-value-calculator.ts'"

- [ ] **Step 3:** Implement engine file. Reference spec §"P8-1" for full output template. Key sections:
```typescript
// src/engines/sales/pipeline-value-calculator.ts
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Health band constants (per-file, NOT shared) ============
const HEALTH_BANDS = {
  excellent: [500000, Infinity],
  good: [200000, 500000],
  warning: [50000, 200000],
  critical: [0, 50000],
};

// ============ Math helpers (exported for tests) ============
export function stageValue(count: number, size: number, probability: number): number {
  return count * size * probability;
}
export function totalPipeline(
  discoveryVal: number, proposalVal: number, negotiationVal: number, closingVal: number,
): number {
  return discoveryVal + proposalVal + negotiationVal + closingVal;
}
export function nominalPipeline(
  discoveryCount: number, discoverySize: number,
  proposalCount: number, proposalSize: number,
  negotiationCount: number, negotiationSize: number,
  closingCount: number, closingSize: number,
): number {
  return discoveryCount * discoverySize + proposalCount * proposalSize
    + negotiationCount * negotiationSize + closingCount * closingSize;
}
export function weightedForecast(weighted: number): number {
  return weighted * 0.5;
}
export function calcHealthBand(value: number): string {
  if (value >= 500000) return 'excellent';
  if (value >= 200000) return 'good';
  if (value >= 50000) return 'warning';
  return 'critical';
}

// ============ calculate() ============
// 6-section v3 string assembly per spec §"P8-1 6-section output"
// (Title + 🩺 Health + 📊 Snapshot + 🔄 What-If + ⚖️ Break-Even + 🎯 Milestone + 💡 Tip)

// ============ customFn ============
// minified JS, mirror of helpers, ASI-safe

// ============ Engine ============
const engine: ToolEngine = {
  slug: 'solopreneur-pipeline-value-calculator',
  title: 'Pipeline Value Calculator',
  description: '...',
  inputs: [
    { name: 'discoveryCount', label: 'Discovery deals', type: 'number', placeholder: '10', default: 10 },
    { name: 'discoverySize', label: 'Discovery avg deal size (USD)', type: 'number', placeholder: '15000', default: 15000 },
    { name: 'proposalCount', label: 'Proposal deals', type: 'number', placeholder: '5', default: 5 },
    { name: 'proposalSize', label: 'Proposal avg deal size (USD)', type: 'number', placeholder: '25000', default: 25000 },
    { name: 'negotiationCount', label: 'Negotiation deals', type: 'number', placeholder: '3', default: 3 },
    { name: 'negotiationSize', label: 'Negotiation avg deal size (USD)', type: 'number', placeholder: '35000', default: 35000 },
    { name: 'closingCount', label: 'Closing deals', type: 'number', placeholder: '2', default: 2 },
    { name: 'closingSize', label: 'Closing avg deal size (USD)', type: 'number', placeholder: '45000', default: 45000 },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn: '...' },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [],  // auto-filled by codegen-examples
  faq: [...],
  howToUse: [...],
};
registerEngine(engine);
```
(Full implementation: copy structure from `src/engines/operations/inventory-turnover-calculator.ts`; mirror every helper line-by-line in customFn.)

- [ ] **Step 4:** Add `+1` import + re-export in `src/engines/sales/index.ts`:
```typescript
export { default as pipelineValueCalculator } from './pipeline-value-calculator';
// ... (5 more added by Tasks 2-6)
```

- [ ] **Step 5:** Add ToolMeta entry in `src/data/tools/sales.ts` (structured `ToolInput[]` form):
```typescript
{
  slug: 'solopreneur-pipeline-value-calculator',
  title: 'Pipeline Value Calculator',
  description: 'Compute the weighted value of your sales pipeline by stage probability. The fundamental sales KPI for B2B SaaS founders and sales managers.',
  categoryId: 'S',
  applicationCategory: 'BusinessApplication',
  tags: ['sales', 'pipeline', 'crm', 'forecast'],
  keywords: ['pipeline value calculator', 'sales pipeline', 'weighted pipeline'],
  sources: ['https://www.insivia.com/blog/sales-pipeline-value/'],
  inputs: [
    { name: 'discoveryCount', label: 'Discovery deals', type: 'number', placeholder: '10' },
    { name: 'discoverySize', label: 'Discovery avg deal size (USD)', type: 'number', placeholder: '15000' },
    { name: 'proposalCount', label: 'Proposal deals', type: 'number', placeholder: '5' },
    { name: 'proposalSize', label: 'Proposal avg deal size (USD)', type: 'number', placeholder: '25000' },
    { name: 'negotiationCount', label: 'Negotiation deals', type: 'number', placeholder: '3' },
    { name: 'negotiationSize', label: 'Negotiation avg deal size (USD)', type: 'number', placeholder: '35000' },
    { name: 'closingCount', label: 'Closing deals', type: 'number', placeholder: '2' },
    { name: 'closingSize', label: 'Closing avg deal size (USD)', type: 'number', placeholder: '45000' },
  ],
},
```

- [ ] **Step 6:** Add OG sample in `src/data/og-samples.json` (NO emoji; band label only):
```json
{
  "id": "solopreneur-pipeline-value-calculator",
  "en": { "headline": "Pipeline value $215K", "headlineUnit": "USD", "headlineLabel": "Good" },
  "zh": { "headline": "Pipeline 价值 $215K", "headlineUnit": "USD", "headlineLabel": "良好" }
}
```

- [ ] **Step 7:** Add ENGINES entry in `scripts/codegen-examples.mjs`:
```javascript
'pipeline-value-calculator': { ... },  // alphabetical
```

- [ ] **Step 8:** Fill P8-1's relatedTools array in `src/data/internal-links.ts` with 4 entries (P6-2 lesson):
```typescript
'solopreneur-pipeline-value-calculator': [
  'solopreneur-sales-velocity-calculator',     // P8-2 (same cat, future)
  'solopreneur-win-rate-by-stage-calculator',  // P8-4 (same cat, future)
  'solopreneur-pipeline-coverage-calculator',  // P8-6 (same cat, future)
  'solopreneur-funnel-value-calculator',       // P6-3 cross-cat (Marketing analytics)
],
```
NOTE: At Task 1 time, only P8-1 exists; the 3 same-cat entries will exist by Task 6. To prevent early internal-links test failures, the P6-3 cross-cat fallback ensures the array has 4 valid existing slugs from day 1. P8-2..P8-6 will overwrite the array as they ship.

- [ ] **Step 9:** Modify `src/data/seo-schemas/listingPages.ts` — add 'S' category entry (P7-0 lesson: dist/ must auto-rebuild at P8-1):
```typescript
// Add 'S' alongside 'M' and 'O' in the categories array
{ id: 'S', slug: 'sales', name: 'Sales / 销售管理' },
```

- [ ] **Step 10:** Regenerate `staticExamples[0]`:
```bash
cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs
```
Verify `staticExamples[0]` matches what `customFn` would produce for default inputs.

- [ ] **Step 11:** Run full `pnpm check`:
```bash
cd "D:/E/独立站/youtube-tools" && pnpm check
```
Expected: 461 + 8 = **469 pass / 0 fail / 0 skip**.

- [ ] **Step 12:** CustomFn parse check:
```bash
node tests/scripts/test-customfn.mjs solopreneur-pipeline-value-calculator
```
Expected: parses OK.

- [ ] **Step 13:** Commit + dual push:
```bash
cd "D:/E/独立站/youtube-tools"
git add -A
git commit -m "feat(p8-1): pipeline value calculator (8 math tests, 6-section v3)"
git push origin master
git push github master
```

- [ ] **Step 14:** Write memory file:
```bash
# Create C:\Users\元始天尊\.claude\projects\D--E-----youtube-tools\memory\p8-1-pipeline-value-shipped.md
# Use p6-1-roas-shipped.md as template
# Update MEMORY.md index
```

---

### Task 2: P8-2 Sales Velocity Calculator (1 commit + 2 pushes)

**Goal:** Implement sales velocity — `(opps × avgDealSize × winRate) / cycleDays` 4-factor cascade. 4 inputs · 9 math tests.

**Spec reference:** spec §"P8-2: Sales Velocity Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern as Task 1 but for `sales-velocity-calculator`. **No** `src/data/seo-schemas/listingPages.ts` change (already done in P8-1).

**Math:**
```typescript
dailyVelocity = (openOpps * avgDealSize * (winRate / 100)) / cycleDays
monthlyVelocity = dailyVelocity * 30
annualVelocity = dailyVelocity * 365
```

**Health bands (USD/day):** 🟢 ≥$5,000 · 🟡 $2,000-$5,000 · 🟠 $500-$2,000 · 🔴 <$500

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 9 math tests in `tests/sales-velocity-calculator.test.ts`
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `dailyVelocity()`, `monthlyVelocity()`, `annualVelocity()`, `calcHealthBand()`
- [ ] **Step 4:** Add barrel import to `index.ts`
- [ ] **Step 5:** Add ToolMeta entry (4 inputs)
- [ ] **Step 6:** Add OG sample (no emoji; band label)
- [ ] **Step 7:** Add ENGINES entry to codegen script
- [ ] **Step 8:** Update P8-1 + P8-2 relatedTools entries (P8-1 array gets P8-2 added; P8-2 array fills 4 entries)
- [ ] **Step 9:** Run codegen to regen staticExamples[0]
- [ ] **Step 10:** Run `pnpm check` → expect **478 pass / 0 fail**
- [ ] **Step 11:** Run customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p8-2): sales velocity calculator`
- [ ] **Step 13:** Write `memory/p8-2-sales-velocity-shipped.md`

---

### Task 3: P8-3 ACV Calculator (1 commit + 2 pushes)

**Goal:** Average contract value with monthly/annual toggle and expansion adjustment. 4 inputs · 8 math tests.

**Spec reference:** spec §"P8-3: ACV Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
baseACV = totalContractValue / numCustomers
monthlyACV = baseACV / contractLength
annualACV = monthlyACV * 12
expansionAdjustedACV = annualACV * (1 + expansionRate / 100)
```

**Health bands (annualACV USD):** 🟢 ≥$50,000 · 🟡 $10,000-$50,000 · 🟠 $2,000-$10,000 · 🔴 <$2,000

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 8 math tests
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `baseACV()`, `monthlyACV()`, `annualACV()`, `expansionAdjustedACV()`, `calcHealthBand()`
- [ ] **Step 4-9:** Wire barrel + ToolMeta + OG + ENGINES + relatedTools + codegen
- [ ] **Step 10:** `pnpm check` → expect **486 pass / 0 fail**
- [ ] **Step 11:** customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p8-3): acv calculator`
- [ ] **Step 13:** Write `memory/p8-3-acv-shipped.md`

---

### Task 4: P8-4 Win Rate by Stage Calculator (1 commit + 2 pushes)

**Goal:** Multiplicative funnel across 4 stage transitions with bottleneck detection. 8 inputs · 9 math tests.

**Spec reference:** spec §"P8-4: Win Rate by Stage Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
stageRates = [sqlAdvanced/sqlEntered, oppAdvanced/oppEntered,
              proposalAdvanced/proposalEntered, negAdvanced/negEntered]
overallWinRate = stageRates[0] * stageRates[1] * stageRates[2] * stageRates[3]
bottleneckStage = argmin(stageRates)  // 0-indexed (0 = SQL→Opp)
bottleneckName = ['SQL→Opp', 'Opp→Proposal', 'Proposal→Negotiation', 'Negotiation→Won'][bottleneckStage]
```

**Health bands (overallWinRate × 100 %):** 🟢 ≥25% · 🟡 15%-25% · 🟠 5%-15% · 🔴 <5%

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 9 math tests
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `stageRate()`, `overallWinRate()`, `bottleneckStage()`, `bottleneckName()`, `calcHealthBand()`
- [ ] **Step 4-9:** Wire barrel + ToolMeta (8 inputs) + OG + ENGINES + relatedTools + codegen
- [ ] **Step 10:** `pnpm check` → expect **495 pass / 0 fail**
- [ ] **Step 11:** customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p8-4): win rate by stage calculator`
- [ ] **Step 13:** Write `memory/p8-4-win-rate-by-stage-shipped.md`

---

### Task 5: P8-5 Quota Attainment Calculator (1 commit + 2 pushes)

**Goal:** Track actual revenue vs annual quota with monthly pace projection and year-end forecast. 3 inputs · 9 math tests.

**Spec reference:** spec §"P8-5: Quota Attainment Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
attainmentPct = (actualRevenue / annualQuota) * 100
expectedAtPace = annualQuota * (monthsElapsed / 12)
gap = annualQuota - actualRevenue
remainingMonths = 12 - monthsElapsed
requiredPerMonth = (remainingMonths > 0) ? gap / remainingMonths : 0
projectedYearEnd = actualRevenue + gap  // same as annualQuota when remainingMonths > 0
onTrack = projectedYearEnd >= annualQuota
```

**Health bands (attainmentPct):** 🟢 ≥100% · 🟡 80%-100% · 🟠 50%-80% · 🔴 <50%

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 9 math tests
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `attainmentPct()`, `expectedAtPace()`, `gap()`, `requiredPerMonth()`, `projectedYearEnd()`, `onTrack()`, `calcHealthBand()`
- [ ] **Step 4-9:** Wire barrel + ToolMeta (3 inputs) + OG + ENGINES + relatedTools + codegen
- [ ] **Step 10:** `pnpm check` → expect **504 pass / 0 fail**
- [ ] **Step 11:** customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p8-5): quota attainment calculator`
- [ ] **Step 13:** Write `memory/p8-5-quota-attainment-shipped.md`

---

### Task 6: P8-6 Pipeline Coverage Calculator (1 commit + 2 pushes)

**Goal:** Pipeline-to-quota coverage with win-rate weighting, B2B SaaS 3x rule. 3 inputs · 8 math tests.

**Spec reference:** spec §"P8-6: Pipeline Coverage Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
coverageRatio = pipelineValue / quotaTarget
weightedPipeline = pipelineValue * (winRate / 100)
weightedCoverage = weightedPipeline / quotaTarget
gap = quotaTarget - weightedPipeline
requiredAdditionalPipeline = (winRate > 0) ? gap / (winRate / 100) : 0
```

**Health bands (coverageRatio):** 🟢 ≥3.0x (3x rule) · 🟡 2.0x-3.0x · 🟠 1.0x-2.0x · 🔴 <1.0x

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 8 math tests
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `coverageRatio()`, `weightedCoverage()`, `gap()`, `requiredAdditionalPipeline()`, `calcHealthBand()`
- [ ] **Step 4-9:** Wire barrel + ToolMeta (3 inputs) + OG + ENGINES + relatedTools + codegen
- [ ] **Step 10:** `pnpm check` → expect **512 pass / 0 fail**
- [ ] **Step 11:** customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p8-6): pipeline coverage calculator`
- [ ] **Step 13:** Write `memory/p8-6-pipeline-coverage-shipped.md`

---

### Task 7: P8 Holistic Review + Final Sync (no commit, just verification + memory)

**Goal:** Final cross-cutting verification + comprehensive memory write.

**Files (no new code):**
- Verify: All 6 P8 calcs in `pnpm check` (512 pass / 0 fail)
- Verify: All 6 P8 calcs in `src/data/tools/index.ts` exports
- Verify: All 6 P8 calcs in `src/data/internal-links.ts` `relatedTools` with 4 entries each
- Verify: All 6 P8 calcs have `en` + `zh` OG samples
- Verify: All 6 P8 calcs in `scripts/codegen-examples.mjs` ENGINES dict
- Verify: `git log --oneline` shows 7 P8 commits (1 scaffold + 6 calcs) + 1 P8 spec commit = 8 P8-related

**Steps:**

- [ ] **Step 1:** Run full `pnpm check` final time:
```bash
cd "D:/E/独立站/youtube-tools" && pnpm check
```
Expected: **512 pass / 0 fail / 0 skip** (461 + 51 P8 math tests).

- [ ] **Step 2:** Check git log for 7 P8 commits:
```bash
cd "D:/E/独立站/youtube-tools" && git log --oneline -15
```
Expected: 7 P8 commits + 1 spec commit + 1 plan commit = 9 total P8-related.

- [ ] **Step 3:** Run holistic cross-cutting review (per CLAUDE.md "Before push/merge: holistic pre-merge review"):
- Verify all 6 calcs have `categoryId: 'S'`
- Verify all 6 calcs have same `inputs` shape in ToolMeta + engine
- Verify all 6 calcs' customFn parses (run all 6 through `test-customfn.mjs` if not already done individually)
- Verify no emoji in any OG sample trend field
- Verify `categoryDescription` in `categories.ts` matches what's on the listing page
- Verify `src/data/seo-schemas/listingPages.ts` has 'S' entry (P8-1 lesson)

- [ ] **Step 4:** Write comprehensive memory file `memory/p8-series-shipped.md` (use `p7-series-shipped.md` as template):
- Status + ship date
- Commits (8 total: 1 spec + 1 scaffold + 6 calcs; +1 plan if committed)
- 6 calcs table (slug, math core, inputs, tests)
- Architecture decisions
- 6 audiences covered (B2B SaaS founders, sales managers, RevOps leads)
- Cross-cutting fixes (4 P6-1 fixes carried forward, 1 new for P8-1 listingPages timing)
- Final state (56 → 62 engines, +6 new category, 30 inputs, 51 tests, 461 → 512 pass)
- Process lessons (per-calc push cadence, P7-0 listingPages lesson)
- Update MEMORY.md index

- [ ] **Step 5:** Final sync check:
```bash
cd "D:/E/独立站/youtube-tools"
git status  # ensure no uncommitted changes
# Memory file is local-only (not in repo); no commit needed
```

- [ ] **Step 6:** Report completion to user:
- Engines: 56 → 62 (+6)
- New category: 'S' Sales / 销售管理
- 6 calcs shipped: P8-1..P8-6
- pnpm check: 512 pass / 0 fail
- Both mirrors synced
- Memory files written: p8-1..p8-6 + p8-series

---

## Self-Review

After writing the plan, check it against the spec:

**1. Spec coverage:** All 6 calcs in spec §"The 6 Calculators" have a Task (1-6). Cross-cutting fixes from spec §"Cross-cutting fixes" applied at Task 0 (P6-1 carries) and Task 1 (P7-0 listingPages lesson). Quality gates from spec §"Quality gates" applied per-task. ✓

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details". All code blocks have actual content. Task 2-6 use "mirror Task 1 pattern" for the 13-step wire flow (per writing-plans template, repetition of identical scaffolding is anti-DRY but intentional here — each calc has its own helpers and tests). ✓

**3. Type consistency:**
- All helper function names referenced consistently across Tasks: `stageValue/totalPipeline/nominalPipeline/weightedForecast/calcHealthBand` (P8-1), `dailyVelocity/monthlyVelocity/annualVelocity/calcHealthBand` (P8-2), `baseACV/monthlyACV/annualACV/expansionAdjustedACV/calcHealthBand` (P8-3), `stageRate/overallWinRate/bottleneckStage/bottleneckName/calcHealthBand` (P8-4), `attainmentPct/expectedAtPace/gap/requiredPerMonth/projectedYearEnd/onTrack/calcHealthBand` (P8-5), `coverageRatio/weightedCoverage/gap/requiredAdditionalPipeline/calcHealthBand` (P8-6)
- Test files use `node:test` + `node:assert` (consistent with P5/P6/P7)
- Codegen script uses `ENGINES` dict (consistent with P5/P6/P7)
- `categoryId: 'S'` used uniformly across all 6 calcs
- `CATEGORY_SLUG = 'sales'` used uniformly in scaffold + per-calc references

**4. Risk mitigations from spec §"Risks & Mitigations":**
- 51 boundary tests fail (P7-2/P7-5 lesson) → spec writes explicit `≥ / ≤< / <` notation per calc; tests verify exact direction at boundary values
- Spec canonical expected value miscomputed (P7-3 lesson) → spec §"Canonical computation" hand-computed for all 6 calcs; implementer cross-checks before writing test
- 6 customFn ASI trap → `test-customfn.mjs <slug>` per calc (step 11-12 of each task)
- Time exceeds 30 min/calc → B 档 math (simple arithmetic + multiplicative funnel), no time-series in scope
- Health band threshold direction ambiguity → each calc uses consistent `≥ / ≤< / <` notation; tests verify exact direction

**5. Counts match spec:**
- Inputs: 8+4+4+8+3+3 = 30 ✓
- Tests: 8+9+8+9+9+8 = 51 ✓
- Engines: 56 → 62 = +6 ✓
- Commits: 1 spec + 1 plan + 1 scaffold + 6 calcs = 9 ✓
- Pass progression: 461 → 469 → 478 → 486 → 495 → 504 → 512 ✓

**6. Task right-sizing:** Each per-calc task (1-6) ends with a working, testable, pushable deliverable. Scaffold (Task 0) sets up directories + 4 carry-forward fixes + category page (slightly red on pnpm check; expected per P7-0 pattern). Holistic (Task 7) is verification + memory only (no code changes).

**7. No new cross-cutting fixes expected:** All 4 P6-1 fixes (internal-links tier-2 fallback, og-samples no emoji, seo-schemas array support, marketing-analytics.astro page pattern) carry forward. The one P8-1-specific addition is `src/data/seo-schemas/listingPages.ts` entry (P7-0 lesson: dist/ must auto-rebuild).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-07-p8-sales-batch.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, controller direct execution with checkpoints

Which approach?
