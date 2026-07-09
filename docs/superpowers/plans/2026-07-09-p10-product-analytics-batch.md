# P10 Product Analytics Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (controller direct execution, no subagent dispatch for mechanical P-series work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new calculators in a NEW 'P' Product Analytics category at ForgeFlowKit (solopreneur SaaS calculators). Mid-market B2B SaaS PM persona, $10M-$50M ARR anchor. Brings total to 74 engines / 11 categories.

**Architecture:** Self-registered engine (`src/engines/product-analytics/<slug>-calculator.ts`), per-calc 4-band hardcoded thresholds from PM-community consensus. Fully static — no PRICING.json entry, no API fetch. Per-calc push cadence (8 commits total).

**Tech Stack:** Astro 4.16.19 static site generation, TypeScript 5.6 strict. Node `appendFileSync` for engine files >5000 chars (P9-2/P9-5 lesson). pnpm check (typecheck + test:run) as pre-commit gate. No new external dependencies.

---

## Global Constraints

| # | Constraint | Source |
|---|------------|--------|
| 1 | Each calculator file lives in `src/engines/product-analytics/` | spec §1 |
| 2 | Engine filename: `<slug>-calculator.ts` (kebab-case, no abbreviations) | spec §6 |
| 3 | Engine self-registers via `registerEngine(engine)` at module import | P-series established |
| 4 | Barrel pattern: `src/engines/product-analytics/index.ts` uses explicit line-per-engine imports (NOT `import.meta.glob` at subdir level — that's only for `src/engines/index.ts`) | P9-1 lesson |
| 5 | ToolMeta entry in `src/data/tools/product-analytics.ts` uses `categoryId: 'P'` exactly | spec §6 |
| 6 | OG entry: `headline`, `headlineUnit`, `headlineLabel` — both `en` and `zh` keys | P9 pattern |
| 7 | `scripts/codegen-examples.mjs` ENGINES array: `{ file, slug, subdir: 'product-analytics', defaultInputs }` | P9-0 lesson |
| 8 | `tests/ab-split.test.ts`: subdir array append `'product-analytics'` (11→12), file list append `'product-analytics.ts'` (13→14) | spec §6 |
| 9 | `tests/internal-links.test.ts`: bump `68` → `74` once total reaches (after P10-6) | spec §6, P8-0 over-bump lesson |
| 10 | Each per-calc test file: 8-15 tests covering math + 4 health bands | spec §8 |
| 11 | 6-section v3 Business standard: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip | spec §5 |
| 12 | HEALTH_BANDS exported as top-level `const` per engine file | P6+ pattern |
| 13 | Float precision dual-layer: math returns unrounded, display rounds | P-series standard |
| 14 | Mid-market $10M-$50M ARR anchor copy in every ToolMeta description | P9 pattern |
| 15 | INVERSE band direction for TTV (lower = better); all others higher = better | P9-4 lesson |
| 16 | Pre-commit gate: `pnpm check` (zero errors) before each commit | P-series standard |
| 17 | Dual push: `git push origin HEAD` (gitee) + `git push github HEAD` with `SKIP_PUSH_FETCH=1` | P-series standard |
| 18 | Use Node `appendFileSync` (NOT Bash printf) for engine files >5000 chars | P9-2 lesson |
| 19 | Run `node scripts/codegen-examples.mjs` after engine edits; `--check` mode for drift detection | P-series standard |
| 20 | Codegen `--check` validates `new Function('inputs','pick','fill', customFn)` parses + literal escape regex | P9 pattern |
| 21 | Memory file per-calc saved to `~/.claude/projects/.../memory/` AFTER successful ship | P-series standard |
| 22 | `MEMORY.md` index in same location gets `- [Title](file.md)` line per ship | P-series standard |

---

## File Structure

| Layer | File | Per-task |
|-------|------|----------|
| Engine | `src/engines/product-analytics/<slug>-calculator.ts` | NEW per calc (Task 1-6) |
| Engine | `src/engines/product-analytics/index.ts` | NEW (Task 0), append imports (Task 1-6) |
| Data | `src/data/tools/product-analytics.ts` | NEW empty (Task 0), append entries (Task 1-6) |
| Data | `src/data/categories.ts` | append 1 entry (Task 0) |
| Data | `src/data/og-samples.json` | append 1 entry per calc (Task 1-6) |
| Page | `src/pages/[lang]/product-analytics.astro` | NEW (Task 0) |
| Test | `tests/<slug>-calculator.test.ts` | NEW per calc (Task 1-6) |
| Test | `tests/ab-split.test.ts` | modify (Task 0), bump per calc (Task 1-6) |
| Test | `tests/internal-links.test.ts` | bump post-Task 6 (single 68→74) |
| Script | `scripts/codegen-examples.mjs` | append ENGINES entry per calc (Task 1-6) |
| Memory | `~/.claude/projects/.../memory/p10-N-<slug>-shipped.md` | NEW per calc (Task 1-6) |
| Memory | `~/.claude/projects/.../memory/p10-series-shipped.md` | NEW (Task 7) |
| Memory | `~/.claude/projects/.../memory/MEMORY.md` | append line per ship |

**Total file actions per calc (Task 1-6):** 8 (7 + 1 supporting test file)
**Total file actions Task 0:** 7 (1 dir + 6 files)
**Total file actions Task 7 (holistic review):** 4 (2 review agent tasks recorded as memory + 1 series memory + 1 MEMORY.md update)

**Commits:** 8 (Task 0 = scaffold; Task 1-6 = one per calc; Task 7 = holistic review + memory + MEMORY.md index)

---

### Task 0: P10 Scaffold — Empty category shell

**Files:**
- Create: `src/engines/product-analytics/` (directory)
- Create: `src/engines/product-analytics/index.ts`
- Create: `src/data/tools/product-analytics.ts`
- Modify: `src/data/categories.ts` (append 1 entry)
- Create: `src/pages/[lang]/product-analytics.astro`
- Modify: `tests/ab-split.test.ts` (add 'product-analytics' to subdir array, add 'product-analytics.ts' to data/tools/ file list)

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `src/data/categories.ts` exports `categories: Category[]` with length 11 (was 10)
  - `src/data/tools/product-analytics.ts` exports `tools: ToolMeta[]` (empty, length 0)
  - `src/pages/[lang]/product-analytics.astro` renders dist/en/product-analytics/index.html and dist/zh/product-analytics/index.html
  - `tests/ab-split.test.ts` test "engines/ has 11 subdirectories" → updated to "12 subdirectories" + 'product-analytics' appended; test "data/tools/ has 13 files" → updated to "14 files" + 'product-analytics.ts' appended

- [ ] **Step 1: Create directory `src/engines/product-analytics/`**

Run: `mkdir -p src/engines/product-analytics`
Expected: directory created (Windows equivalent: `mkdir src/engines/product-analytics` — bash already maps)

- [ ] **Step 2: Create `src/engines/product-analytics/index.ts` (empty barrel)**

```ts
// Product Analytics Calculator Engines (P10 batch, 6 calcs)
//
// P10-1: funnel-step           — Funnel Step Conversion Analyzer
// P10-2: feature-adoption      — Feature Adoption Rate
// P10-3: activation-rate       — Activation Rate
// P10-4: stickiness            — Stickiness (DAU/MAU)
// P10-5: time-to-value         — Time-to-Value (TTV)
// P10-6: power-user-curve      — Power User Pareto Curve
//
// Engines are added one per task via Task 1..Task 6.
export {};
```

Save to: `src/engines/product-analytics/index.ts`

- [ ] **Step 3: Create `src/data/tools/product-analytics.ts` (empty)**

```ts
// Product Analytics ToolMeta entries (P10 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [];
```

Save to: `src/data/tools/product-analytics.ts`

- [ ] **Step 4: Modify `src/data/categories.ts` — append entry**

Read the file first to find the last closing brace (`];`). Then append BEFORE the closing `]` (NOT after — keep array valid):

```ts
  { id: 'P', name: 'Product Analytics', slug: 'product-analytics', description: 'Calculate funnel conversion, feature adoption, activation rate, stickiness (DAU/MAU), time-to-value, and power user curves for product managers at mid-market B2B SaaS companies ($10M-$50M ARR).' },
```

Verify with: `grep -c "id: 'P'" src/data/categories.ts` → expect `1`
Verify array length: temporarily add `console.log(categories.length)` to a node script, or grep `id: '[A-Z]'` and count → expect 11

- [ ] **Step 5: Create `src/pages/[lang]/product-analytics.astro` (template copy from retention.astro)**

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
const CATEGORY_ID = 'P';
const CATEGORY_SLUG = 'product-analytics';
// Category P i18n keys will populate incrementally across P10-1..P10-6.
// Until then, fall back to direct category data.
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'Product Analytics';
const categoryDesc = categoryMeta?.description ?? 'Product analytics calculators for mid-market B2B SaaS product managers.';

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

Save to: `src/pages/[lang]/product-analytics.astro`

- [ ] **Step 6: Modify `tests/ab-split.test.ts` — extend subdir array and tools file list**

Read the current file. In the test `engines/ has 11 subdirectories`, change the title to `12 subdirectories` and append `'product-analytics'` to the array (as the 12th element).

In the test `data/tools/ has 13 files (types, 11 categories, index)`, change the title to `14 files (types, 12 categories, index)` and append `'product-analytics.ts'` to the for-of array (between `'retention.ts'` and `'index.ts'`).

Result arrays:

```ts
// First test:
['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations', 'sales', 'retention', 'product-analytics']

// Second test:
['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'real-estate.ts', 'marketing.ts', 'operations.ts', 'sales.ts', 'retention.ts', 'product-analytics.ts', 'index.ts']
```

DO NOT change the engine-count tests (`getAllEngines()` length 68, `tools.length` 68) — they remain at 68 because P10-0 is scaffold-only, no engines yet.

- [ ] **Step 7: Run the ab-split tests to verify scaffold**

Run: `cd "D:/E/独立站/youtube-tools" && npx tsx tests/ab-split.test.ts 2>&1 | tail -15`
Expected:
```
ok 1 - engines/ has 12 subdirectories
ok 2 - engines/index.ts uses import.meta.glob
ok 3 - engines/ has no engine .ts files at root (only index.ts)
ok 4 - data/tools/ has 14 files (types, 12 categories, index)
...
# tests 9
# pass 9
# fail 0
```

If `fail 1` on the subdir/file tests: re-check arrays in Step 6. If `fail 1` on engine-count (68), DO NOT fix yet — that one needs P10-1 to be true.

If there are 3 expected reds for `getAllEngines().length === 68` failing after we add empty product-analytics barrel — that's a problem. The empty barrel with `export {}` does NOT register engines (no `registerEngine` call), so the count stays at 68. Tests should pass.

- [ ] **Step 8: Build dist to verify listing page renders**

Run: `pnpm build 2>&1 | tail -5`
Expected: build succeeds, file `dist/en/product-analytics/index.html` and `dist/zh/product-analytics/index.html` exist.

Verify: `ls dist/en/product-analytics/ dist/zh/product-analytics/` → both contain `index.html`.

- [ ] **Step 9: Pre-commit: run pnpm check**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: all tests pass (574 baseline preserved). Scaffold adds no new failures.

- [ ] **Step 10: Commit + dual push**

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add src/engines/product-analytics/ src/data/tools/product-analytics.ts src/data/categories.ts src/pages/\[lang\]/product-analytics.astro tests/ab-split.test.ts
SKIP_PRECOMMIT_CHECK=1 git commit -m "feat(p10-0): product analytics category scaffold + new 'P' category + listing page"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

Expected: 1 commit pushed, both mirrors updated. Range: previous `875ef09..<new>`.

---

### Task 1: P10-1 Funnel Step Conversion Analyzer

**Files:**
- Create: `tests/funnel-step-calculator.test.ts`
- Create: `src/engines/product-analytics/funnel-step-calculator.ts`
- Modify: `src/engines/product-analytics/index.ts` (append import)
- Modify: `src/data/tools/product-analytics.ts` (append ToolMeta entry)
- Modify: `src/data/og-samples.json` (append OG entry)
- Modify: `scripts/codegen-examples.mjs` (append ENGINES entry)
- Modify: `tests/ab-split.test.ts` (bump `getAllEngines` 68→69, `tools.length` 68→69)

**Interfaces:**
- Consumes:
  - `tests/<slug>-calculator.test.ts` imports `funnelEndToEnd`, `biggestDrop`, `calcHealthBand` from engine module
  - Engine exports: `funnelEndToEnd(steps: number[]): number`, `biggestDrop(steps: number[]): number`, `calcHealthBand(rate: number): 'excellent' | 'good' | 'warning' | 'critical'`, `HEALTH_BANDS` const
  - Engine default inputs: `{ step1: '1000', step2: '800', step3: '500', step4: '320' }`
  - ToolMeta slug: `solopreneur-funnel-step-calculator`
- Produces:
  - `src/engines/product-analytics/funnel-step-calculator.ts` registers engine `solopreneur-funnel-step-calculator`
  - `getAllEngines().length === 69` (was 68) after commit
  - P10-2..6 will follow same pattern (just different formula + inputs)

- [ ] **Step 1: Write failing test `tests/funnel-step-calculator.test.ts`**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { funnelEndToEnd, biggestDrop, calcHealthBand, HEALTH_BANDS } from '../src/engines/product-analytics/funnel-step-calculator.ts';

test('funnelEndToEnd: 1000→800→500→320 = 0.32', () => {
  assert.equal(funnelEndToEnd([1000, 800, 500, 320]), 0.32);
});

test('funnelEndToEnd: 2-step [500, 100] = 0.20', () => {
  assert.equal(funnelEndToEnd([500, 100]), 0.2);
});

test('biggestDrop: 1000→800→500→320 returns index 1 (step 2→3)', () => {
  assert.equal(biggestDrop([1000, 800, 500, 320]), 1);
});

test('biggestDrop: monotonically decreasing returns index 0', () => {
  assert.equal(biggestDrop([1000, 500]), 0);
});

test('biggestDrop: zero drops (all equal) returns index 0', () => {
  assert.equal(biggestDrop([1000, 1000, 1000]), 0);
});

test('calcHealthBand: 0.50 → excellent (≥0.40)', () => {
  assert.equal(calcHealthBand(0.5), 'excellent');
});

test('calcHealthBand: 0.32 → good (≥0.25, <0.40)', () => {
  assert.equal(calcHealthBand(0.32), 'good');
});

test('calcHealthBand: 0.20 → warning (≥0.15, <0.25)', () => {
  assert.equal(calcHealthBand(0.2), 'warning');
});

test('calcHealthBand: 0.10 → critical (<0.15)', () => {
  assert.equal(calcHealthBand(0.1), 'critical');
});

test('calcHealthBand: 0.40 exact boundary → excellent', () => {
  assert.equal(calcHealthBand(0.4), 'excellent');
});

test('calcHealthBand: 0.0 → critical', () => {
  assert.equal(calcHealthBand(0), 'critical');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 0.40);
  assert.equal(HEALTH_BANDS.good.threshold, 0.25);
  assert.equal(HEALTH_BANDS.warning.threshold, 0.15);
  assert.equal(HEALTH_BANDS.critical.threshold, 0);
});
```

Save to: `tests/funnel-step-calculator.test.ts` (12 tests: 5 math + 6 band + 1 metadata)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "D:/E/独立站/youtube-tools" && node --import tsx --test tests/funnel-step-calculator.test.ts 2>&1 | head -15`
Expected: FAIL with `Cannot find module '...funnel-step-calculator.ts'` or similar MODULE_NOT_FOUND.

- [ ] **Step 3: Write engine `src/engines/product-analytics/funnel-step-calculator.ts`**

```ts
// P10-1 Funnel Step Conversion Analyzer
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS PM persona ($10M-$50M ARR).
// Community-wisdom thresholds (Lenny's Newsletter / Reforge / Mixpanel benchmarks).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 0.40, label: '🟢 Excellent', message: 'End-to-end conversion is strong — every step is pulling weight.' },
  good:      { threshold: 0.25, label: '🟡 Good',      message: 'Healthy funnel with room to optimize the weakest step.' },
  warning:   { threshold: 0.15, label: '🟠 Warning',   message: 'Material drop-offs detected — focus on the biggest delta step.' },
  critical:  { threshold: 0,    label: '🔴 Critical',  message: 'Severe leakage — most users never reach the final event.' },
};

export function funnelEndToEnd(steps: number[]): number {
  if (steps.length < 2) return 0;
  return steps[steps.length - 1] / steps[0];
}

export function biggestDrop(steps: number[]): number {
  if (steps.length < 2) return 0;
  let maxDelta = 0;
  let maxIdx = 0;
  for (let i = 1; i < steps.length; i++) {
    const delta = steps[i - 1] - steps[i];
    if (delta > maxDelta) { maxDelta = delta; maxIdx = i - 1; }
  }
  return maxIdx;
}

export function calcHealthBand(rate: number): keyof typeof HEALTH_BANDS {
  if (rate >= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (rate >= HEALTH_BANDS.good.threshold) return 'good';
  if (rate >= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtPct(x: number): string { return (x * 100).toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-funnel-step-calculator',
  title: 'Funnel Step Conversion Analyzer',
  description:
    'Compute end-to-end conversion across an in-product event funnel (2-5 steps) — the standard PM metric for measuring progression through product moments. Health bands: 🟢 ≥40% · 🟡 25-40% · 🟠 15-25% · 🔴 <15%. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
  inputs: [
    { name: 'step1', label: 'Step 1 — Entry event count', placeholder: 'e.g. 1000', type: 'number' },
    { name: 'step2', label: 'Step 2 — Next event count',  placeholder: 'e.g. 800',  type: 'number' },
    { name: 'step3', label: 'Step 3 (optional)',          placeholder: 'e.g. 500',  type: 'number' },
    { name: 'step4', label: 'Step 4 (optional)',          placeholder: 'e.g. 320',  type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var steps = [];
  for (var i = 1; i <= 4; i++) { var v = Number(inputs['step' + i]); if (v > 0) steps.push(v); }
  if (steps.length < 2) return ['At least 2 step counts required.'];
  var e2e = steps[steps.length - 1] / steps[0];
  var band = e2e >= 0.40 ? 'Excellent' : e2e >= 0.25 ? 'Good' : e2e >= 0.15 ? 'Warning' : 'Critical';
  var emoji = e2e >= 0.40 ? '🟢' : e2e >= 0.25 ? '🟡' : e2e >= 0.15 ? '🟠' : '🔴';
  var dropIdx = 0, maxDelta = 0;
  for (var j = 1; j < steps.length; j++) { var d = steps[j-1] - steps[j]; if (d > maxDelta) { maxDelta = d; dropIdx = j-1; } }
  var stepRate = []; for (var k = 1; k < steps.length; k++) stepRate.push((steps[k]/steps[k-1]*100).toFixed(1) + '%');
  return [
    '🩺 Funnel Health: ' + emoji + ' ' + band + ' (' + (e2e*100).toFixed(1) + '% end-to-end)',
    '📊 Snapshot: ' + steps.length + ' steps · ' + steps.join(' → ') + '. Biggest drop: Step ' + (dropIdx+1) + ' → Step ' + (dropIdx+2) + ' (lost ' + maxDelta + ' users)',
    '🔄 What-If: if biggest drop step improves by +10%, e2e lifts to ' + ((steps[steps.length-1] + maxDelta*0.5) / steps[0] * 100).toFixed(1) + '%',
    '⚖️ Break-Even: to hit 🟡 Good (40% e2e), need final step ≥ ' + Math.ceil(steps[0] * 0.4).toLocaleString() + ' (currently ' + steps[steps.length-1].toLocaleString() + ')',
    '🎯 Milestone: optimize Step ' + (dropIdx+1) + ' → Step ' + (dropIdx+2) + ' first; a 20% retention gain there lifts funnel to ' + ((steps[steps.length-1] + maxDelta*0.2) / steps[0] * 100).toFixed(1) + '%',
    '💡 Tip: PM rule of thumb — in-product funnels lose the most users at the value-discovery step (when users don\\'t grasp the feature). Pair with our [Activation Rate Calculator] to measure post-funnel commitment.'
  ];
}`,
  },
  generate(inputs) {
    const steps: number[] = [];
    for (let i = 1; i <= 4; i++) {
      const v = Number(inputs['step' + i]);
      if (v > 0) steps.push(v);
    }
    if (steps.length < 2) return ['At least 2 step counts required.'];
    const e2e = funnelEndToEnd(steps);
    const dropIdx = biggestDrop(steps);
    const maxDelta = steps[dropIdx] - steps[dropIdx + 1];
    const band = calcHealthBand(e2e);
    const bandInfo = HEALTH_BANDS[band];
    const stepRates: string[] = [];
    for (let i = 1; i < steps.length; i++) stepRates.push(fmtPct(steps[i] / steps[i - 1]));
    const targetFinal = Math.ceil(steps[0] * HEALTH_BANDS.good.threshold);
    const liftedFinal = steps[steps.length - 1] + maxDelta * 0.5;
    return [
      '🩺 Funnel Health: ' + bandInfo.label + ' (' + fmtPct(e2e) + ' end-to-end)',
      '📊 Snapshot: ' + steps.length + ' steps · ' + steps.join(' → ') + '. Step rates: ' + stepRates.join(' · ') + '. Biggest drop: Step ' + (dropIdx + 1) + ' → Step ' + (dropIdx + 2) + ' (lost ' + maxDelta.toLocaleString() + ' users)',
      '🔄 What-If: if biggest drop step improves by +10% retention, e2e lifts to ' + fmtPct(liftedFinal / steps[0]),
      '⚖️ Break-Even: to hit 🟡 Good (' + fmtPct(HEALTH_BANDS.good.threshold) + ' e2e), need final step ≥ ' + targetFinal.toLocaleString() + ' (currently ' + steps[steps.length - 1].toLocaleString() + ')',
      '🎯 Milestone: optimize Step ' + (dropIdx + 1) + ' → Step ' + (dropIdx + 2) + ' first; a 20% retention gain there lifts funnel to ' + fmtPct((steps[steps.length - 1] + maxDelta * 0.2) / steps[0]),
      '💡 Tip: PM rule of thumb — in-product funnels lose the most users at the value-discovery step (when users do not grasp the feature). Pair with our [Activation Rate Calculator] to measure post-funnel commitment.',
    ];
  },
  staticExamples: [
    '🩺 Funnel Health: 🟡 Good (32.0% end-to-end)\n📊 Snapshot: 4 steps · 1000 → 800 → 500 → 320. Step rates: 80.0% · 62.5% · 64.0%. Biggest drop: Step 2 → Step 3 (lost 300 users)\n🔄 What-If: if biggest drop step improves by +10% retention, e2e lifts to 47.0%\n⚖️ Break-Even: to hit 🟡 Good (25.0% e2e), need final step ≥ 400 (currently 320)\n🎯 Milestone: optimize Step 2 → Step 3 first; a 20% retention gain there lifts funnel to 38.0%\n💡 Tip: PM rule of thumb — in-product funnels lose the most users at the value-discovery step (when users do not grasp the feature). Pair with our [Activation Rate Calculator] to measure post-funnel commitment.',
  ],
  faq: [
    { q: 'What is an in-product funnel vs a marketing funnel?', a: 'Marketing funnels track impressions → leads → customers (P6). In-product funnels track event-to-event within the product — e.g. signup → first_action → second_action → conversion. PMs use in-product funnels to find where users get stuck.' },
    { q: 'How is "biggest drop" calculated?', a: 'It identifies the absolute drop (not percentage) between consecutive steps. For 1000→800→500→320, biggest drop is Step 2→3 (300 lost). Percentage drops and absolute drops can disagree — we use absolute to match where the most users leak.' },
    { q: 'Are 2 steps enough?', a: 'Yes — a 2-step funnel is the simplest conversion analysis (input event → outcome event). With 2 steps the e2e conversion equals the step-2 conversion.' },
    { q: 'How often should I recompute this?', a: 'Weekly or bi-weekly for fast-moving products; monthly for stable products. Pair with our [Cohort Retention Calculator] (P6) to spot retention issues that affect funnel top-of-funnel counts.' },
    { q: 'What if one step has 0 users?', a: 'A 0 step either indicates an unreached event (pre-launch) or a complete hard wall (no users can progress past Step N). The engine handles 0 gracefully by skipping it — but review your funnel definition if a step shows 0 in steady-state.' },
    { q: 'Why is 25% the bar for 🟡 Good?', a: 'Reforge + Mixpanel benchmarks: a healthy in-product funnel converts 25-40% end-to-end for B2B SaaS with 3-5 steps. Below 25% means one or more steps has leakage; above 40% is world-class (often a sign of excellent onboarding).' },
  ],
  howToUse: [
    'Map your product moment as a numbered event chain (e.g. 1=signup, 2=first_action, 3=second_action, 4=conversion).',
    'Pull the user count for each step from your analytics tool (Mixpanel, Amplitude, Heap).',
    'Fill steps 1-4 in order. Skip a step by leaving it blank (the engine counts only non-zero steps).',
    'Read the band (🟢/🟡/🟠/🔴), then focus on the "Biggest drop" step from the Snapshot.',
    'Pair with the Break-Even section to set the next-quarter optimization target for that step.',
  ],
  sources: [
    'https://www.reforge.com/blog/growth-loops',
    'https://amplitude.com/blog/mobile-funnels',
    'https://mixpanel.com/blog/funnel-analysis/',
    'https://www.lennysnewsletter.com/p/funnels',
  ],
};

registerEngine(engine);
```

Save to: `src/engines/product-analytics/funnel-step-calculator.ts`

⚠️ **CustomFn escape note:** the `\\'` in `users don\\'t grasp` is intentional — it's the JS source representation of `users don't` after the customFn string is parsed. The codegen `--check` second-stage sanity test will fail the build if literal `\\'` escapes leak through.

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "D:/E/独立站/youtube-tools" && node --import tsx --test tests/funnel-step-calculator.test.ts 2>&1 | tail -25`
Expected: 12 tests pass, 0 fail.

- [ ] **Step 5: Wire 7 supporting files**

5a. `src/engines/product-analytics/index.ts` — replace `export {};` with:

```ts
// Retention & Customer Success Calculator Engines (P9 batch, 6 calcs)
//
// P9-1: nrr                        — Net Revenue Retention
// P9-2: grr                        — Gross Revenue Retention
// P9-3: expansion-revenue          — Expansion Revenue
// P9-4: logo-churn-rate            — Logo Churn Rate
// P9-5: customer-health-score      — Customer Health Score
// P9-6: renewal-rate               — Renewal Rate
//
// Engines are added one per task via Task 1..Task 6.
import './nrr-calculator';
import './grr-calculator';
import './expansion-revenue-calculator';
import './logo-churn-rate-calculator';
import './customer-health-score-calculator';
import './renewal-rate-calculator';

// Product Analytics Calculator Engines (P10 batch, 6 calcs)
//
// P10-1: funnel-step           — Funnel Step Conversion Analyzer
// P10-2: feature-adoption      — Feature Adoption Rate
// P10-3: activation-rate       — Activation Rate
// P10-4: stickiness            — Stickiness (DAU/MAU)
// P10-5: time-to-value         — Time-to-Value (TTV)
// P10-6: power-user-curve      — Power User Pareto Curve
import './funnel-step-calculator';
```

5b. `src/data/tools/product-analytics.ts` — append ToolMeta:

```ts
  {
    slug: 'solopreneur-funnel-step-calculator',
    title: 'Funnel Step Conversion Analyzer',
    description:
      'Compute end-to-end conversion across an in-product event funnel (2-5 steps) — the standard PM metric for measuring progression through product moments. Health bands: 🟢 ≥40% · 🟡 25-40% · 🟠 15-25% · 🔴 <15%. For mid-market B2B SaaS ($10M-$50M ARR) product managers.',
    categoryId: 'P',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'step1', label: 'Step 1 — Entry event count', placeholder: 'e.g. 1000', type: 'number' },
      { name: 'step2', label: 'Step 2 — Next event count',  placeholder: 'e.g. 800',  type: 'number' },
      { name: 'step3', label: 'Step 3 (optional)',          placeholder: 'e.g. 500',  type: 'number' },
      { name: 'step4', label: 'Step 4 (optional)',          placeholder: 'e.g. 320',  type: 'number' },
    ],
    keywords: [
      'funnel step calculator',
      'in-product funnel',
      'conversion funnel',
      'event funnel',
      'funnel analysis',
      'product analytics',
      'PM',
      'B2B SaaS',
      'mid-market SaaS',
    ],
    tags: ['product-analytics', 'pm', 'funnel'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-09',
    sources: [
      'https://www.reforge.com/blog/growth-loops',
      'https://amplitude.com/blog/mobile-funnels',
      'https://mixpanel.com/blog/funnel-analysis/',
    ],
  },
```

5c. `src/data/og-samples.json` — append under top-level object:

```json
  "solopreneur-funnel-step-calculator": {
    "headline": { "en": "32%", "zh": "32%" },
    "headlineUnit": { "en": "End-to-end conversion", "zh": "端到端转化率" },
    "headlineLabel": { "en": "Funnel Conversion: 32% (Good — healthy funnel, optimize biggest drop)", "zh": "漏斗转化 32%（良好 — 漏斗健康，优化最大流失点）" }
  },
```

Verify with: `grep -c "funnel-step-calculator" src/data/og-samples.json` → expect `2` (one for the key in key line, one in the value if you search `solopreneur-funnel-step-calculator`).

5d. `scripts/codegen-examples.mjs` — find the `engines/renewal-rate-calculator` line (last entry currently) and append after it:

```javascript
  { file: 'funnel-step-calculator.ts',             slug: 'solopreneur-funnel-step-calculator',
    subdir: 'product-analytics',     defaultInputs: { step1: '1000', step2: '800', step3: '500', step4: '320' } },
```

5e. `tests/ab-split.test.ts` — in the two tests checking engine counts, change `68` to `69`:

```ts
// Line 51 changed:
test('getAllEngines() returns 69 engines after import', async () => {
  // ...
  assert.equal(getAllEngines().length, 69);
});

// Line 57 changed:
test('aggregated tools array has 69 entries', async () => {
  // ...
  assert.equal(tools.length, 69);
});
```

- [ ] **Step 6: Run codegen to regenerate staticExamples[0]**

Run: `cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs 2>&1 | tail -10`
Expected: line showing `✓ funnel-step-calculator.ts (NNN chars, 6 lines)` and `Done. 69 engines updated.`

If codegen fails with "no output from generate()": the engine module didn't register — re-check `registerEngine(engine)` is at the bottom of the file.

If codegen reports drift on an OLD engine: a previous commit left drift — run with `--check` to identify, then commit a fix.

- [ ] **Step 7: Verify drift-free via codegen --check**

Run: `cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs --check 2>&1 | tail -8`
Expected: `✓ funnel-step-calculator.ts: in sync` plus `✓ all other engines` and final line `[codegen-examples] --check PASSED: all 69 engines in sync and clean.`

If `[ERROR] ... has literal escape sequences`, re-check the `\\'` in `users don\\'t grasp` — it's encoded wrong. The correct sequence in the source file (after the engine file is read) is the two characters `\\` followed by `'`, which decodes to `\'` after one pass of unescape, and the JS source string parser then takes the `\'` as a valid backslash escape for the apostrophe. If codegen rejects the literal `\\'`, simplify to `users don't grasp` (no apostrophe issue) and rebuild — but update the test fixtures that may also use `don't`.

- [ ] **Step 8: Run full pnpm check**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: pass count rises from 574 to ~586 (574 + 12 funnel-step tests). Zero fails.

- [ ] **Step 9: Commit + dual push**

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add tests/funnel-step-calculator.test.ts src/engines/product-analytics/funnel-step-calculator.ts src/engines/product-analytics/index.ts src/data/tools/product-analytics.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts
SKIP_PRECOMMIT_CHECK=1 git commit -m "feat(p10-1): funnel step conversion analyzer (12 tests, 6-section v3, 68→69 engines)"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

Expected: 1 commit pushed. Range: `P10-0..<new>`.

- [ ] **Step 10: Save P10-1 memory**

Save to: `~/.claude/projects/D--E-----youtube-tools/memory/p10-1-funnel-step-shipped.md`

```markdown
---
name: p10-1-funnel-step-shipped
description: P10-1 Funnel Step Conversion Analyzer 已 ship 2026-07-09 (commit <hash>)；68→69 engines；4 inputs (step1..step4) + 12 math tests + 6-section v3；canonical 32% end-to-end (🟡 Good)
metadata:
  type: project
---

P10-1 Funnel Step Conversion Analyzer 已 ship 2026-07-09 (commit <hash>)。

**Canonical math:** 1000→800→500→320 = 32% end-to-end (🟡 Good).

**Files:** src/engines/product-analytics/funnel-step-calculator.ts (~120 lines), tests/funnel-step-calculator.test.ts (12 tests), 7 supporting files.

**Tests:** 12/12 pass (5 math + 6 health bands + 1 metadata).

**Lesson:** CustomFn \\' escape for "don't" — must use \\' (backslash escape) inside JS string literal; codegen --check second-stage LITERAL_ESCAPE_RE catches leaks.
```

Then append `- [P10-1 Funnel Step shipped](p10-1-funnel-step-shipped.md) — ...` line to `~/.claude/projects/D--E-----youtube-tools/memory/MEMORY.md`.

---

### Task 2: P10-2 Feature Adoption Rate

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/feature-adoption-calculator.test.ts`
- Engine file: `src/engines/product-analytics/feature-adoption-calculator.ts`
- Math: `adoption = feature_users / active_users`; band thresholds 0.40/0.20/0.10/0; select `WAU_vs_MAU` (values: 'WAU' | 'MAU')
- Test target: 10 tests (5 math + 4 bands + 1 metadata)
- Engine default inputs: `{ feature_users: '750', active_users: '3000', WAU_vs_MAU: 'WAU' }`
- ToolMeta slug: `solopreneur-feature-adoption-calculator`
- ab-split bump: 69 → 70

**Detailed step guidance:**
- Use Task 1 as template, swap formulas/inputs/tests
- For the `WAU_vs_MAU` select input in ToolMeta, copy structure from `customer-health-score-calculator.ts` (which has `weightPreset` select — same pattern)

**Health band thresholds (locked):**
- ≥0.40 → 🟢 Excellent (broad feature appeal)
- 0.20-0.40 → 🟡 Good (healthy adoption)
- 0.10-0.20 → 🟠 Warning (niche feature)
- <0.10 → 🔴 Critical (consider deprecation)

**What-If math:** if adoption improves by +10 percentage points (e.g. 0.75 → 0.85 if currently below), what is the projected active_user cost? Compute: `required_active = feature_users / new_adoption`.

**Tip cross-link:** "Pair with our [Activation Rate Calculator] — adopted-but-inactive users are different from non-adopted."

**Commit message:** `feat(p10-2): feature adoption rate (10 tests, 6-section v3, 69→70 engines)`

**Memory file:** `p10-2-feature-adoption-shipped.md`.

---

### Task 3: P10-3 Activation Rate

**Files:** Same 8 pattern.

- Test: `tests/activation-rate-calculator.test.ts`
- Engine: `src/engines/product-analytics/activation-rate-calculator.ts`
- Math: `activation = activated / signups`, period bounds interpretation; bands 0.40/0.25/0.15/0
- Inputs: `signups`, `activated`, `period_days` (select 7/14/30)
- Tests: 10 (5 math + 4 bands + 1 metadata)
- Defaults: `{ signups: '500', activated: '150', period_days: '7' }` → activation = 30% (🟡 Good)
- ToolMeta slug: `solopreneur-activation-rate-calculator`
- ab-split bump: 70 → 71

**Health band thresholds:**
- ≥0.40 → 🟢 Excellent
- 0.25-0.40 → 🟡 Good
- 0.15-0.25 → 🟠 Warning
- <0.15 → 🔴 Critical

**Tip cross-link:** "Activation rate is downstream of TTV — pair with our [Time-to-Value Calculator]."

**Commit message:** `feat(p10-3): activation rate (10 tests, 6-section v3, 70→71 engines)`

**Memory file:** `p10-3-activation-rate-shipped.md`.

---

### Task 4: P10-4 Stickiness (DAU/MAU)

**Files:** Same 8 pattern.

- Test: `tests/stickiness-calculator.test.ts`
- Engine: `src/engines/product-analytics/stickiness-calculator.ts`
- Math: `stickiness = DAU / MAU`; bands 0.20/0.13/0.05/0 (HIGHER)
- Inputs: `DAU`, `MAU` (DAU ≤ MAU enforced — silent skip if DAU>MAU)
- Tests: 8 (4 math + 4 bands)
- Defaults: `{ DAU: '650', MAU: '5000' }` → 13% (🟡 Good)
- ToolMeta slug: `solopreneur-stickiness-calculator`
- ab-split bump: 71 → 72

**Health band thresholds (locked):**
- ≥0.20 → 🟢 Excellent (social-app tier)
- 0.13-0.20 → 🟡 Good (high-engagement SaaS)
- 0.05-0.13 → 🟠 Warning (SaaS median)
- <0.05 → 🔴 Critical (low engagement)

**Tip cross-link:** "Stickiness is the leading indicator of churn — pair with our [GRR Calculator (P9)] to confirm."

**Commit message:** `feat(p10-4): stickiness DAU/MAU (8 tests, 6-section v3, 71→72 engines)`

**Memory file:** `p10-4-stickiness-shipped.md`.

---

### Task 5: P10-5 Time-to-Value (TTV)

**Files:** Same 8 pattern.

- Test: `tests/time-to-value-calculator.test.ts`
- Engine: `src/engines/product-analytics/time-to-value-calculator.ts`
- Math: `TTV_p50`, `TTV_p90` (days); bands: 1/3/7 — **INVERSE DIRECTION**
- Inputs: `median_days`, `p90_days` (number; p90 ≥ p50 required)
- Tests: 10 (5 math + 4 bands + 1 metadata; includes a test verifying p90 < p50 returns warning)
- Defaults: `{ median_days: '2', p90_days: '5' }` → 2 days p50, 5 days p90 (🟡 Good)
- ToolMeta slug: `solopreneur-time-to-value-calculator`
- ab-split bump: 72 → 73

**Health band thresholds (INVERSE — lower is better):**
- ≤1 day → 🟢 Excellent
- 1-3 days → 🟡 Good
- 3-7 days → 🟠 Warning
- >7 days → 🔴 Critical

⚠️ **INVERSE band direction** (P9-4 lesson): the band-lookup logic must check the OPPOSITE condition (return 'excellent' if value ≤ excellent_threshold, NOT ≥). The Health band symbol still uses standard 🟢/🟡/🟠/🔴 — only the comparison direction is reversed. Test must explicitly cover this.

```ts
export function calcHealthBand(days: number): 'excellent' | 'good' | 'warning' | 'critical' {
  if (days <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (days <= HEALTH_BANDS.good.threshold) return 'good';
  if (days <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}
```

**Tip cross-link:** "Faster TTV → higher activation → higher retention. Pair with our [Activation Rate Calculator] + [Customer Health Score (P9)]."

**Commit message:** `feat(p10-5): time-to-value (10 tests, 6-section v3, 72→73 engines)`

**Memory file:** `p10-5-time-to-value-shipped.md`.

---

### Task 6: P10-6 Power User Pareto Curve

**Files:** Same 8 pattern.

- Test: `tests/power-user-curve-calculator.test.ts`
- Engine: `src/engines/product-analytics/power-user-curve-calculator.ts`
- Math: `pareto = top_pct_usage_share / top_pct`; compare to 70/20 benchmark
- Inputs: `top_pct` (number, e.g. 20), `top_pct_usage_share` (number, e.g. 70)
- Tests: 12 (6 math + 5 bands + 1 metadata; includes canonical 70/20 = excellent, plus 50/20 = healthy)
- Defaults: `{ top_pct: '20', top_pct_usage_share: '70' }` → 3.5x ratio (🟢 Excellent)
- ToolMeta slug: `solopreneur-power-user-curve-calculator`
- ab-split bump: 73 → 74
- **Last commit** before Task 7 — also bump `tests/internal-links.test.ts` from 68 → 74 in 3 places (single bump, only at Task 6 completion)

**Health band thresholds (ratio = top_share / top_pct):**
- ≥3.5x → 🟢 Excellent (e.g. 70/20 = 3.5)
- 3.0x-3.5x → 🟡 Good
- 2.5x-3.0x → 🟠 Warning
- <2.5x → 🔴 Critical (diffuse usage, low power-user concentration)

**Math details:**
- `pareto_ratio = top_pct_usage_share / top_pct` (e.g. 70/20 = 3.5)
- Inverse interpretation: how much "above equal distribution" (1.0 = everyone uses equally)
- Show both formats in Snapshot: "70/20" notation + "3.5x ratio"
- Break-even: to reach 🟢 Excellent (3.5x), if top_pct=20, need usage_share ≥ 70%

**Tip cross-link:** "Power users are the seed for referrals — pair with our [NRR Calculator (P9)]."

**Commit message:** `feat(p10-6): power user pareto curve (12 tests, 6-section v3, 73→74 engines)`

**Memory file:** `p10-6-power-user-curve-shipped.md`.

---

### Task 7: P10 Holistic Review + Series Memory

**Files:**
- Create: `~/.claude/projects/.../memory/p10-series-shipped.md`
- Modify: `~/.claude/projects/.../memory/MEMORY.md` (append series line)

**Interfaces:**
- Consumes: 6 commits `P10-1..P10-6` + P10-0 scaffold
- Produces:
  - `pnpm check` shows 74 engines, ~620-644 tests pass
  - `node scripts/codegen-examples.mjs --check` shows 74 engines in sync
  - `tests/internal-links.test.ts` 74/74 has 4 related entries
  - MEMORY.md index has 8 P10 entries (P10-0..P10-6 + p10-series-shipped)
  - Holistic review: spawn 2 parallel review agents (spec-compliance + cross-file integrity)

- [ ] **Step 1: Verify all engines registered and tests pass**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: 622-644 pass, 0 fail. Engine count = 74.

If pass count is BELOW 622 or any fails: identify failing test, fix root cause, re-run.

- [ ] **Step 2: Verify all 6 P10 engines have working customFn**

Run: `cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs --check 2>&1 | tail -8`
Expected: `[codegen-examples] --check PASSED: all 74 engines in sync and clean.`

If any P10 engine reports customFn parse error, fix the engine's customFn string.

- [ ] **Step 3: Verify dist build produces 158 HTML pages**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm build 2>&1 | tail -5`
Expected: build succeeds. `find dist -name "*.html" | wc -l` returns ~158 (was 144 pre-P10, +6 calculator pages × 2 langs = 12 + 1 listing × 2 langs = 2, total +14).

- [ ] **Step 4: Spawn 2 parallel review agents (holistic cross-cutting review)**

Dispatch via Agent tool with `general-purpose` subagent type, both in parallel, with isolation `worktree: false`. Each agent returns a list of findings.

**Agent 1: Spec-compliance reviewer** prompt:

```text
Review the 6 P10 Product Analytics calculators at src/engines/product-analytics/ against the design spec at docs/superpowers/specs/2026-07-09-p10-product-analytics-batch-design.md.

For each of the 6 engines (funnel-step, feature-adoption, activation-rate, stickiness, time-to-value, power-user-curve), check:
- Health band thresholds match spec Section 4 exactly
- 6-section v3 output (Health, Snapshot, What-If, Break-Even, Milestone, Tip) is present and in order
- Inputs match spec Section 3.2
- ToolMeta in src/data/tools/product-analytics.ts has 8 fields (slug, title, description, categoryId='P', applicationCategory, inputs, keywords, tags, sources)
- categoryId is exactly 'P' (not 'p' or 'Product' or 'PA')
- mid-market $10M-$50M ARR appears in description
- TTV has INVERSE band direction (≤ excellent_threshold returns 'excellent')
- FAQ + howToUse + sources present and non-empty

Return a numbered list of findings with file path + line number + brief description. Use absolute paths (Windows: D:\E\独立站\youtube-tools\src\...).
```

**Agent 2: Cross-file integrity reviewer** prompt:

```text
Review the 6 P10 Product Analytics calculators' cross-file wiring.

Verify each of the 6 engines has ALL 8 wiring touch points:
1. Engine file exists at src/engines/product-analytics/<slug>-calculator.ts
2. Imported in src/engines/product-analytics/index.ts barrel (NOT just src/engines/index.ts)
3. ToolMeta entry in src/data/tools/product-analytics.ts
4. OG entry in src/data/og-samples.json (en + zh keys)
5. Entry in scripts/codegen-examples.mjs ENGINES array
6. Test file tests/<slug>-calculator.test.ts
7. tests/ab-split.test.ts bumped to 74 (both occurrences)
8. tests/internal-links.test.ts bumped to 74 (3 occurrences)

Additionally check:
- All 6 engines have HEALTH_BANDS exported as top-level const
- All 6 engines have calculate() / generate() returning 6-section string array
- dist/en/product-analytics/ and dist/zh/product-analytics/ directories both have index.html
- 6 calc page directories exist under dist/en/ and dist/zh/ (dist/en/solopreneur-funnel-step-calculator/ etc.)
- internal-links 'product-analytics' category has 6 tools, each with 4 related entries (no cross-cat fallback needed)

Return a numbered list of findings with file path + line number + brief description.
```

Spawn both agents in parallel via Agent tool with `run_in_background: false` (sync mode needed for next steps).

- [ ] **Step 5: Apply findings from reviews**

For each finding from either agent:
- If real bug: fix in working tree
- If false positive: document why in commit message
- If cosmetic: skip (keep diff small)

Do NOT fix and amend old commits — fix as a `fix(p10):` follow-up commit if needed, or roll into the holistic commit if trivial.

- [ ] **Step 6: Write series memory file `~/.claude/projects/D--E-----youtube-tools/memory/p10-series-shipped.md`**

Use the consolidated format from P5/P6/P7/P8/P9 series memory files. Cover:
- 6 calculators shipped (commits P10-1..P10-6)
- 8-file wiring pattern per calc (no mid-flight fixes needed, or list any)
- HEALTH_BANDS structure consistency
- Cross-file wiring verified (8/8 per calc)
- 11 categories now (was 10)
- 74 engines (was 68)
- Tests: ~620-644 pass
- Lessons specific to P10:
  - INVERSE band direction on TTV (P9-4 lesson applied)
  - Pareto ratio format (70/20 notation as canonical)
  - Funnel Step dynamic-input handling (skip-blank-step pattern)
  - Mid-flight findings from holistic review (if any)
- Funnel loop closure with P6 (marketing acquisition), P8 (sales closing), P9 (retention). P10 (product analytics) complements by measuring in-product engagement.

- [ ] **Step 7: Update MEMORY.md index with P10 series entry**

Append to `~/.claude/projects/.../memory/MEMORY.md`:

```markdown
- [P10 series shipped](p10-series-shipped.md) — P10 Product Analytics Calculator Batch 完整 ship 2026-07-09 (8 commits ...)；6 calculators (68→74 +6)；NEW 'P' Product Analytics category (11th letter + 12th 总);... pass / 0 fail；8th vertical-depth batch
```

(Fill in actual commit hash range and test counts from Steps 1-3.)

- [ ] **Step 8: Commit memory files (no pnpm check needed for non-source files)**

```bash
cd "D:/E/独立站/youtube-tools"
# If the memory files are in-repo: copy them to memory/ then add
# If they're already in ~/.claude/projects/.../memory/ (Claude auto-memory), no git commit needed — they're auto-tracked via the system
ls memory/p10-* 2>/dev/null  # verify in-repo copies exist
```

For in-repo memory files (preferred for git-tracking consistency with P5-P9):
- Per-calc memory files (p10-1 through p10-6) should already exist via Write tool calls during Tasks 1-6
- p10-series-shipped.md was created in Step 6 above; copy to `memory/` and commit
- Commit message: `docs(p10): series memory + index update`

```bash
cd "D:/E/独立站/youtube-tools"
git add memory/p10-series-shipped.md memory/p10-1-*.md memory/p10-2-*.md memory/p10-3-*.md memory/p10-4-*.md memory/p10-5-*.md memory/p10-6-*.md 2>/dev/null
SKIP_PRECOMMIT_CHECK=1 git commit -m "docs(p10): series memory + per-calc memory for 6 product analytics calculators"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

- [ ] **Step 9: Final dual-push verification**

```bash
cd "D:/E/独立站/youtube-tools"
git log --oneline origin/master..master  # should be empty
git log --oneline github/master..master  # should be empty
git fetch origin 2>&1 | tail -3  # confirm both mirrors reachable
git fetch github 2>&1 | tail -3
```

Expected: all four commands return empty / "Already up to date" — both mirrors in sync.

---

## Self-Review

### 1. Spec coverage

| Spec section | Plan task |
|---|---|
| §1 Scope (vertical, ID, persona, stats-depth, no PRICING) | Global Constraints #1-15 |
| §2 Roster (6 calcs, differentiation) | Tasks 1-6 (one per calc) + Task 0 scaffold |
| §3 Math architecture (formulas, code pattern) | Task 1 (full example) + Tasks 2-6 (template application) |
| §4 Health bands (locked thresholds + sources) | Each Task 1-6 has explicit band block |
| §5 6-section v3 output | Task 1 has full 6-section example; Tasks 2-6 inherit pattern |
| §6 File touch list (8-file per calc) | Task 1 Step 5 shows all 8; Tasks 2-6 mirror |
| §7 Commit cadence | Task 0 scaffold + Tasks 1-6 + Task 7 |
| §8 Tests (per-calc math + bands + cross-cutting) | Task 1 has 12-test spec example; Tasks 2-6 test counts in plan |
| §9 Dist impact (+14 pages) | Task 7 Step 3 verifies |
| §10 Risks | Global Constraints #16-22 + Task 1 Step 7 customFn escape note + Task 5 INVERSE callout |
| §11 Out-of-scope (no A/B stats, no Bayesian) | Global Constraints (stats-depth = basic, descriptive only) |
| §12 Success criteria | Task 7 verifies all |

Gaps: none identified.

### 2. Placeholder scan

- "TBD" / "TODO" / "FIXME" / "implement later" — none
- "Add appropriate error handling" — none
- "Similar to Task N" — Tasks 2-6 reference Task 1 as template, but include distinct per-calc content (formula, band, defaults, tests, slug). Acceptable per writing-plans skill: "Similar to Task N" is a failure mode ONLY if "the engineer may be reading tasks out of order" — here, Tasks 2-6 explicitly say "swap these blocks from Task 1".
- "Write tests for the above" without code — Task 1 has full test file example; Tasks 2-6 have specific test counts + formula references, but the per-calc test code will be written inline in those tasks following Task 1's pattern (acceptable for short-form per-calc tests; the implementer adapts the fixtures to the calc's inputs).

### 3. Type consistency

| Symbol | Defined in | Used in |
|--------|------------|---------|
| `ToolEngine` | import from `../../core/engines/types` | Every engine file (Tasks 1-6) |
| `registerEngine` | import from `../../core/engines/registry` | Every engine file, called once with the engine const |
| `HEALTH_BANDS` | top-level const per engine | exported, used by `calcHealthBand` + engine.generate() |
| `ToolMeta` | import from `./types` | tool entry (5b of each Task) |
| `categoryId` | 'P' for all 6 P10 entries | consistent |
| `applicationCategory` | 'BusinessApplication' | consistent (P9 pattern) |
| `tags` array | ['product-analytics', '<role>', '<concept>'] | consistent |
| `reviewedBy` | 'ForgeFlowKit Team' | consistent |
| `dataReviewedAt` | '2026-07-09' | consistent for all 6 (single-day ship) |

No signature drift.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-p10-product-analytics-batch.md`. Two execution options:

**1. Subagent-Driven (not recommended for this batch)** - Per P9 decision: P-series mechanical work uses controller direct execution (no subagent dispatch overhead). Subagent route was used only for the initial spec/plan brainstorm, not for per-calc execution.

**2. Inline Execution (recommended — P-series standard)** - Execute tasks in this session using executing-plans, batch execution with checkpoints between Tasks.

**Default: Option 2 — Inline Execution with checkpoint between every 2 calcs.**
