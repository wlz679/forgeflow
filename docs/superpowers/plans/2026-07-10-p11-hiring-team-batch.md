# P11 Hiring/Team Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (controller direct execution, no subagent dispatch for mechanical P-series work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new calculators in a NEW 'H' Hiring & Team category at ForgeFlowKit (solopreneur SaaS calculators). Mid-market B2B SaaS People-ops / Head-of-HR persona, $10M-$50M ARR anchor. Brings total to 80 engines / 13 categories.

**Architecture:** Self-registered engine (`src/engines/hiring-team/<slug>-calculator.ts`), per-calc 4-band hardcoded thresholds from People-ops community consensus (BLS ECEC, SHRM, Pave, Levels.fyi, Carta, LinkedIn). Fully static — no PRICING.json entry, no API fetch. Per-calc push cadence (9 commits total: spec + plan + scaffold + 6 calcs + holistic). Closes the **team-scaling loop** complementing P6 (marketing acquisition) + P8 (sales closing) + P9 (retention) + P10 (product engagement).

**Tech Stack:** Astro 4.16.19 static site generation, TypeScript 5.6 strict. Node `appendFileSync` for engine files >5000 chars (P9-2/P9-5 lesson). pnpm check (typecheck + test:run) as pre-commit gate. No new external dependencies.

---

## Global Constraints

| # | Constraint | Source |
|---|------------|--------|
| 1 | Each calculator file lives in `src/engines/hiring-team/` | spec §1.1 |
| 2 | Engine filename: `<slug>-calculator.ts` (kebab-case, no abbreviations) | spec §6.1 |
| 3 | Engine self-registers via `registerEngine(engine)` at module import | P-series established |
| 4 | Barrel pattern: `src/engines/hiring-team/index.ts` uses explicit line-per-engine imports (NOT `import.meta.glob` at subdir level — that's only for `src/engines/index.ts`) | P9-1 lesson |
| 5 | ToolMeta entry in `src/data/tools/hiring-team.ts` uses `categoryId: 'H'` exactly | spec §6.4 |
| 6 | OG entry: `headline`, `headlineUnit`, `headlineLabel` — both `en` and `zh` keys | P9 pattern |
| 7 | `scripts/codegen-examples.mjs` ENGINES array: `{ file, slug, subdir: 'hiring-team', defaultInputs }` | P9-0 lesson |
| 8 | `tests/ab-split.test.ts`: subdir array append `'hiring-team'` (12→13), file list append `'hiring-team.ts'` (14→15) | spec §4.3 |
| 9 | `tests/internal-links.test.ts`: bump `74` → `80` once total reaches (after P11-6) | spec §4.3, P8-0 over-bump lesson |
| 10 | Each per-calc test file: 8-11 tests covering math + 4 health bands | spec §5.4 |
| 11 | 6-section v3 Business standard: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip | spec §5.1 |
| 12 | HEALTH_BANDS exported as top-level `const` per engine file | P6+ pattern |
| 13 | Float precision dual-layer: math returns unrounded, display rounds | P-series standard |
| 14 | Mid-market $10M-$50M ARR anchor copy in every ToolMeta description | P9 pattern |
| 15 | INVERSE band direction for Fully-Loaded (P11-1), Ramp (P11-2), Productivity (P11-3), Attrition (P11-6); HIGHER for Comp Banding (P11-4) and Equity Refresh (P11-5) | spec §4.1 |
| 16 | Pre-commit gate: `pnpm check` (zero errors) before each commit | P-series standard |
| 17 | Dual push: `git push origin HEAD` (gitee) + `git push github HEAD` with `SKIP_PUSH_FETCH=1` | P-series standard |
| 18 | Use Node `appendFileSync` (NOT Bash printf) for engine files >5000 chars | P9-2 lesson |
| 19 | Run `node scripts/codegen-examples.mjs` after engine edits; `--check` mode for drift detection | P-series standard |
| 20 | Codegen `--check` validates `new Function('inputs','pick','fill', customFn)` parses + literal escape regex | P9 pattern |
| 21 | Memory file per-calc saved to `~/.claude/projects/.../memory/` AND `memory/` in-repo AFTER successful ship | P-series standard |
| 22 | `MEMORY.md` index in same location gets `- [Title](file.md)` line per ship | P-series standard |
| 23 | **CRITICAL P11-0 scaffold pre-emptive**: `src/engines/index.ts` adds `import './hiring-team';` AND `src/data/tools/index.ts` adds `import { tools as hiringTeam } from './hiring-team';` + spreads into tools array | P9-1 + P10-1 lesson (caught by ab-split) |
| 24 | People-ops persona string: "mid-market B2B SaaS ($10M-$50M ARR)" in every description | spec §1.3 |
| 25 | Ramp dual-band (IC vs Manager) handled via select `role_level` | spec §3.2 |
| 26 | Productivity Ramp 3 curve shapes (SlowStart/Linear/S-Curve) handled via select `curve_shape` | spec §3.3 |
| 27 | All 26 inputs verified per spec §5.2 (no missing input mid-flight fixes) | spec §5.2 + P10-1 lesson |

---

## File Structure

| Layer | File | Per-task |
|-------|------|----------|
| Engine | `src/engines/hiring-team/<slug>-calculator.ts` | NEW per calc (Task 1-6) |
| Engine | `src/engines/hiring-team/index.ts` | NEW (Task 0), append imports (Task 1-6) |
| Engine | `src/engines/index.ts` | **append `import './hiring-team';`** (Task 0) — ROOT barrel pre-emptive fix |
| Data | `src/data/tools/hiring-team.ts` | NEW empty (Task 0), append entries (Task 1-6) |
| Data | `src/data/tools/index.ts` | **append `import { tools as hiringTeam } from './hiring-team';` + spread** (Task 0) — ROOT barrel pre-emptive fix |
| Data | `src/data/categories.ts` | append 1 entry (Task 0) |
| Data | `src/data/og-samples.json` | append 1 entry per calc (Task 1-6) |
| Page | `src/pages/[lang]/hiring-team.astro` | NEW (Task 0) |
| Test | `tests/<slug>-calculator.test.ts` | NEW per calc (Task 1-6) |
| Test | `tests/ab-split.test.ts` | modify (Task 0), bump per calc (Task 1-6) |
| Test | `tests/internal-links.test.ts` | bump post-Task 6 (single 74→80) |
| Script | `scripts/codegen-examples.mjs` | append ENGINES entry per calc (Task 1-6) |
| Memory | `~/.claude/projects/.../memory/p11-N-<slug>-shipped.md` | NEW per calc (Task 1-6) |
| Memory | `~/.claude/projects/.../memory/p11-series-shipped.md` | NEW (Task 7) |
| Memory | `~/.claude/projects/.../memory/MEMORY.md` | append line per ship |

**Total file actions per calc (Task 1-6):** 8 (engine + test + 6 supporting: barrel, ToolMeta, og-samples, codegen, ab-split, memory)
**Total file actions Task 0:** 8 (1 dir + 7 files: empty barrel, empty ToolMeta, categories entry, listing page, ab-split array updates, AND both root barrel imports)
**Total file actions Task 7 (holistic review):** 3 (2 review agents + 1 series memory + 1 MEMORY.md update + 1 holistic commit)

**Commits:** 9 (plan + scaffold + 6 calcs + holistic review + memory)

---

### Task 0: P11 Scaffold — Empty category shell + ROOT barrel pre-emptive fixes

**Files:**
- Create: `src/engines/hiring-team/` (directory)
- Create: `src/engines/hiring-team/index.ts` (empty barrel)
- Modify: `src/engines/index.ts` (append `import './hiring-team';`)
- Create: `src/data/tools/hiring-team.ts` (empty)
- Modify: `src/data/tools/index.ts` (append `import { tools as hiringTeam } from './hiring-team';` + spread)
- Modify: `src/data/categories.ts` (append 1 entry)
- Create: `src/pages/[lang]/hiring-team.astro`
- Modify: `tests/ab-split.test.ts` (add 'hiring-team' to subdir array, add 'hiring-team.ts' to data/tools/ file list)

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `src/data/categories.ts` exports `categories: Category[]` with length 12 (was 11) — appending 'H' as 13th category
  - `src/data/tools/hiring-team.ts` exports `tools: ToolMeta[]` (empty, length 0)
  - `src/pages/[lang]/hiring-team.astro` renders `dist/en/hiring-team/index.html` and `dist/zh/hiring-team/index.html`
  - `tests/ab-split.test.ts` test "engines/ has 12 subdirectories" → updated to "13 subdirectories" + 'hiring-team' appended; test "data/tools/ has 14 files" → updated to "15 files" + 'hiring-team.ts' appended
  - `src/engines/index.ts` and `src/data/tools/index.ts` both reference hiring-team from Task 0 (avoids P10-1 mid-flight fix)

- [ ] **Step 1: Create directory `src/engines/hiring-team/`**

Run: `mkdir -p src/engines/hiring-team`
Expected: directory created.

- [ ] **Step 2: Create `src/engines/hiring-team/index.ts` (empty barrel)**

```ts
// Hiring & Team Calculator Engines (P11 batch, 6 calcs)
//
// P11-1: fully-loaded-employee-cost   — Fully-Loaded Employee Cost
// P11-2: time-to-productivity         — Time to Productivity (Ramp Time)
// P11-3: productivity-ramp-curve      — Productivity Ramp Curve
// P11-4: comp-banding                 — Compensation Banding
// P11-5: equity-refresh               — Equity Refresh Grant
// P11-6: attrition-cost               — Attrition Cost
//
// Engines are added one per task via Task 1..Task 6.
export {};
```

Save to: `src/engines/hiring-team/index.ts`

- [ ] **Step 3: Modify `src/engines/index.ts` — append hiring-team import (PRE-EMPTIVE ROOT BARREL FIX)**

Append as the 13th line:

```ts
import './hiring-team';
```

Final file should have 13 lines of imports (saas, ai-cost, valuation, freelance, cost, investment, real-estate, marketing, operations, sales, retention, product-analytics, hiring-team).

- [ ] **Step 4: Create `src/data/tools/hiring-team.ts` (empty)**

```ts
// Hiring & Team ToolMeta entries (P11 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [];
```

Save to: `src/data/tools/hiring-team.ts`

- [ ] **Step 5: Modify `src/data/tools/index.ts` — append hiring-team import + spread (PRE-EMPTIVE ROOT BARREL FIX)**

Add `import { tools as hiringTeam } from './hiring-team';` to the import block, and `...hiringTeam,` to the spread block.

Final `tools` array should have 13 spread entries.

- [ ] **Step 6: Modify `src/data/categories.ts` — append 'H' category entry**

Read the file first to find the last closing brace (`];`). Then append BEFORE the closing `]` (NOT after — keep array valid):

```ts
  { id: 'H', name: 'Hiring & Team', slug: 'hiring-team', description: 'Calculate fully-loaded employee cost, ramp time, productivity ramp curves, compensation banding, equity refresh grants, and attrition cost for People-ops managers and Head-of-HR at mid-market B2B SaaS companies ($10M-$50M ARR).' },
```

Verify with: `grep -c "id: 'H'" src/data/categories.ts` → expect `1`
Verify array length: `grep -c "id: '[A-Z]'" src/data/categories.ts` → expect `13`

- [ ] **Step 7: Create `src/pages/[lang]/hiring-team.astro` (template copy from product-analytics.astro)**

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
const CATEGORY_ID = 'H';
const CATEGORY_SLUG = 'hiring-team';
// Category H i18n keys will populate incrementally across P11-1..P11-6.
// Until then, fall back to direct category data.
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'Hiring & Team';
const categoryDesc = categoryMeta?.description ?? 'Hiring and team calculators for mid-market B2B SaaS People-ops managers and Head-of-HR.';

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

Save to: `src/pages/[lang]/hiring-team.astro`

- [ ] **Step 8: Modify `tests/ab-split.test.ts` — extend subdir array and tools file list**

Read the current file. In the test `engines/ has 12 subdirectories`, change the title to `13 subdirectories` and append `'hiring-team'` to the array (as the 13th element).

In the test `data/tools/ has 14 files (types, 12 categories, index)`, change the title to `15 files (types, 13 categories, index)` and append `'hiring-team.ts'` to the for-of array (between `'product-analytics.ts'` and `'index.ts'`).

Result arrays:

```ts
// First test:
['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations', 'sales', 'retention', 'product-analytics', 'hiring-team']

// Second test:
['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'real-estate.ts', 'marketing.ts', 'operations.ts', 'sales.ts', 'retention.ts', 'product-analytics.ts', 'hiring-team.ts', 'index.ts']
```

DO NOT change the engine-count tests (`getAllEngines().length === 74`, `tools.length === 74`) — they remain at 74 because P11-0 is scaffold-only, no engines yet.

- [ ] **Step 9: Run the ab-split tests to verify scaffold**

Run: `cd "D:/E/独立站/youtube-tools" && npx tsx tests/ab-split.test.ts 2>&1 | tail -15`
Expected:
```
ok 1 - engines/ has 13 subdirectories
ok 2 - engines/index.ts uses import.meta.glob
ok 3 - engines/ has no engine .ts files at root (only index.ts)
ok 4 - data/tools/ has 15 files (types, 13 categories, index)
...
# tests 9
# pass 9
# fail 0
```

If `fail 1` on the subdir/file tests: re-check arrays in Step 8. If `fail 1` on engine-count (74), DO NOT fix yet — that one needs P11-1 to be true.

The ROOT barrel pre-emptive fix (Steps 3 + 5) means the empty hiring-team barrel imports cleanly, and the empty tools array spreads cleanly — getAllEngines().length stays at 74 (no engines register yet from the empty barrel) and tools.length stays at 74 (empty array spreads as []).

- [ ] **Step 10: Build dist to verify listing page renders**

Run: `pnpm build 2>&1 | tail -5`
Expected: build succeeds, file `dist/en/hiring-team/index.html` and `dist/zh/hiring-team/index.html` exist.

Verify: `ls dist/en/hiring-team/ dist/zh/hiring-team/` → both contain `index.html`.

- [ ] **Step 11: Pre-commit: run pnpm check**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: all tests pass (574 baseline preserved). Scaffold adds no new failures.

- [ ] **Step 12: Commit + dual push**

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add src/engines/hiring-team/ src/engines/index.ts src/data/tools/hiring-team.ts src/data/tools/index.ts src/data/categories.ts src/pages/\[lang\]/hiring-team.astro tests/ab-split.test.ts
SKIP_PRECOMMIT_CHECK=1 git commit -m "feat(p11-0): hiring/team category scaffold + new 'H' category + listing page + ROOT barrel pre-emptive"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

Expected: 1 commit pushed, both mirrors updated. Range: previous `f7cff70..<new>`.

---

### Task 1: P11-1 Fully-Loaded Employee Cost

**Files:**
- Create: `tests/fully-loaded-employee-cost-calculator.test.ts`
- Create: `src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts`
- Modify: `src/engines/hiring-team/index.ts` (append import)
- Modify: `src/data/tools/hiring-team.ts` (append ToolMeta entry)
- Modify: `src/data/og-samples.json` (append OG entry)
- Modify: `scripts/codegen-examples.mjs` (append ENGINES entry)
- Modify: `tests/ab-split.test.ts` (bump `getAllEngines` 74→75, `tools.length` 74→75)

**Interfaces:**
- Consumes:
  - `tests/<slug>-calculator.test.ts` imports `fullyLoadedCost`, `costMultiplier`, `calcHealthBand`, `HEALTH_BANDS` from engine module
  - Engine exports: `fullyLoadedCost(base, benefits, tax, overhead): number`, `costMultiplier(total, base): number`, `calcHealthBand(mult: number): 'excellent' | 'good' | 'warning' | 'critical'`, `HEALTH_BANDS` const
  - Engine default inputs: `{ base_salary: '120000', benefits_pct: '25', payroll_tax_pct: '8', overhead_pct: '15' }`
  - ToolMeta slug: `solopreneur-fully-loaded-employee-cost-calculator`
- Produces:
  - `src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts` registers engine `solopreneur-fully-loaded-employee-cost-calculator`
  - `getAllEngines().length === 75` (was 74) after commit
  - P11-2..6 will follow same pattern (just different formula + inputs)

- [ ] **Step 1: Write failing test `tests/fully-loaded-employee-cost-calculator.test.ts`**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { fullyLoadedCost, costMultiplier, calcHealthBand, HEALTH_BANDS } from '../src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts';

test('fullyLoadedCost: $120K + 25% + 8% + 15% = $178K', () => {
  assert.equal(fullyLoadedCost(120000, 25, 8, 15), 178000);
});

test('fullyLoadedCost: $100K + 30% + 10% + 20% = $160K', () => {
  assert.equal(fullyLoadedCost(100000, 30, 10, 20), 160000);
});

test('fullyLoadedCost: $0 base = $0', () => {
  assert.equal(fullyLoadedCost(0, 25, 8, 15), 0);
});

test('costMultiplier: $178K / $120K = 1.4833...', () => {
  assert.ok(Math.abs(costMultiplier(178000, 120000) - 1.4833) < 0.01);
});

test('costMultiplier: $100K / $100K = 1.0', () => {
  assert.equal(costMultiplier(100000, 100000), 1);
});

test('calcHealthBand: 1.20 → excellent (≤1.25)', () => {
  assert.equal(calcHealthBand(1.20), 'excellent');
});

test('calcHealthBand: 1.30 → good (>1.25, ≤1.4)', () => {
  assert.equal(calcHealthBand(1.30), 'good');
});

test('calcHealthBand: 1.483 → warning (>1.4, ≤1.6)', () => {
  assert.equal(calcHealthBand(1.483), 'warning');
});

test('calcHealthBand: 1.80 → critical (>1.6)', () => {
  assert.equal(calcHealthBand(1.80), 'critical');
});

test('calcHealthBand: 1.25 exact boundary → excellent', () => {
  assert.equal(calcHealthBand(1.25), 'excellent');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 1.25);
  assert.equal(HEALTH_BANDS.good.threshold, 1.4);
  assert.equal(HEALTH_BANDS.warning.threshold, 1.6);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});
```

Save to: `tests/fully-loaded-employee-cost-calculator.test.ts` (11 tests: 5 math + 5 band + 1 metadata)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "D:/E/独立站/youtube-tools" && node --import tsx --test tests/fully-loaded-employee-cost-calculator.test.ts 2>&1 | head -15`
Expected: FAIL with `Cannot find module '...fully-loaded-employee-cost-calculator.ts'` or similar MODULE_NOT_FOUND.

- [ ] **Step 3: Write engine `src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts`**

```ts
// P11-1 Fully-Loaded Employee Cost
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS People-ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (BLS ECEC 2024 + SHRM 2024 Benefits Survey).
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 1.25, label: '🟢 Excellent', message: 'Lean cost structure — benefits + tax + overhead all in line with BLS averages.' },
  good:      { threshold: 1.40, label: '🟡 Good',      message: 'Typical mid-market SaaS overhead — small optimization room in benefits or equipment.' },
  warning:   { threshold: 1.60, label: '🟠 Warning',   message: 'Above-market overhead — investigate benefits vendor, equipment refresh, or management bloat.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Severely bloated overhead — every hire costs >60% above base salary.' },
};

export function fullyLoadedCost(base: number, benefits: number, tax: number, overhead: number): number {
  return base + base * (benefits + tax + overhead) / 100;
}

export function costMultiplier(total: number, base: number): number {
  if (base === 0) return 0;
  return total / base;
}

export function calcHealthBand(mult: number): keyof typeof HEALTH_BANDS {
  if (mult <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (mult <= HEALTH_BANDS.good.threshold) return 'good';
  if (mult <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtMult(x: number): string { return x.toFixed(2) + 'x'; }
function fmtPct(x: number): string { return x.toFixed(1) + '%'; }

const engine: ToolEngine = {
  slug: 'solopreneur-fully-loaded-employee-cost-calculator',
  title: 'Fully-Loaded Employee Cost',
  description:
    'Compute total annual employee cost (base + benefits + payroll tax + overhead). INVERSE health bands — lower multiplier is better: 🟢 ≤1.25x · 🟡 1.25-1.40x · 🟠 1.40-1.60x · 🔴 >1.60x. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
  inputs: [
    { name: 'base_salary',     label: 'Annual base salary',                  placeholder: 'e.g. 120000', type: 'number' },
    { name: 'benefits_pct',    label: 'Benefits % of base (health + 401k)',  placeholder: 'e.g. 25',     type: 'number' },
    { name: 'payroll_tax_pct', label: 'Payroll tax % of base (FICA + SUTA)',placeholder: 'e.g. 8',      type: 'number' },
    { name: 'overhead_pct',    label: 'Overhead % of base (equipment + SW + mgmt)', placeholder: 'e.g. 15', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var base = Number(inputs.base_salary) || 0;
  var ben = Number(inputs.benefits_pct) || 0;
  var tax = Number(inputs.payroll_tax_pct) || 0;
  var ovh = Number(inputs.overhead_pct) || 0;
  var total = base + base * (ben + tax + ovh) / 100;
  var mult = base === 0 ? 0 : total / base;
  var band = mult <= 1.25 ? 'Excellent' : mult <= 1.40 ? 'Good' : mult <= 1.60 ? 'Warning' : 'Critical';
  var emoji = mult <= 1.25 ? '🟢' : mult <= 1.40 ? '🟡' : mult <= 1.60 ? '🟠' : '🔴';
  var benAmt = base * ben / 100, taxAmt = base * tax / 100, ovhAmt = base * ovh / 100;
  var cutToEx = total - base * 1.25;
  return [
    '🩺 Fully-Loaded Health: ' + emoji + ' ' + band + ' (' + mult.toFixed(2) + 'x base)',
    '📊 Snapshot: Total ' + total.toLocaleString() + ' = Base ' + base.toLocaleString() + ' + Benefits ' + benAmt.toLocaleString() + ' + Tax ' + taxAmt.toLocaleString() + ' + Overhead ' + ovhAmt.toLocaleString(),
    '🔄 What-If: if benefits drop to 20%, total drops to ' + Math.round(base + base * (20 + tax + ovh) / 100).toLocaleString() + ' (' + ((base + base * (20 + tax + ovh) / 100) / base).toFixed(2) + 'x)',
    '⚖️ Break-Even: to hit 🟢 Excellent (≤1.25x), must cut ' + Math.round(cutToEx).toLocaleString() + ' from benefits/tax/overhead combined',
    '🎯 Milestone: re-benchmark benefits + tax components every Q2 — they drift with healthcare inflation',
    '💡 Tip: BLS ECEC tracks national avg ~1.30x — companies consistently >1.5x have bloated overhead (often equipment or management).'
  ];
}`,
  },
  generate(inputs) {
    const base = Number(inputs.base_salary) || 0;
    const benefits = Number(inputs.benefits_pct) || 0;
    const tax = Number(inputs.payroll_tax_pct) || 0;
    const overhead = Number(inputs.overhead_pct) || 0;
    const total = fullyLoadedCost(base, benefits, tax, overhead);
    const mult = costMultiplier(total, base);
    const band = calcHealthBand(mult);
    const bandInfo = HEALTH_BANDS[band];
    const benAmt = base * benefits / 100;
    const taxAmt = base * tax / 100;
    const ovhAmt = base * overhead / 100;
    const targetTotal = base * HEALTH_BANDS.excellent.threshold;
    const cutAmount = total - targetTotal;
    const altTotal = base + base * (20 + tax + overhead) / 100;
    const altMult = costMultiplier(altTotal, base);
    return [
      '🩺 Fully-Loaded Health: ' + bandInfo.label + ' (' + fmtMult(mult) + ' base · ' + fmtMoney(total) + ' total)',
      '📊 Snapshot: Total ' + fmtMoney(total) + ' = Base ' + fmtMoney(base) + ' + Benefits ' + fmtPct(benefits) + ' (' + fmtMoney(benAmt) + ') + Payroll Tax ' + fmtPct(tax) + ' (' + fmtMoney(taxAmt) + ') + Overhead ' + fmtPct(overhead) + ' (' + fmtMoney(ovhAmt) + ')',
      '🔄 What-If: if benefits drop to 20%, total drops to ' + fmtMoney(altTotal) + ' (' + fmtMult(altMult) + ', ' + (altMult < mult ? 'improvement' : 'worsening') + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (' + fmtMult(HEALTH_BANDS.excellent.threshold) + ' ceiling), must cut ' + fmtMoney(cutAmount) + ' from benefits + tax + overhead combined',
      '🎯 Milestone: re-benchmark benefits + tax components every Q2 — healthcare inflation averages 5-7%/yr',
      '💡 Tip: BLS Employer Costs for Employee Compensation (ECEC) 2024 tracks national avg ~1.30x multiplier. Companies consistently >1.5x have bloated overhead — typically equipment refresh cycles or management layer.',
    ];
  },
  staticExamples: [
    '🩺 Fully-Loaded Health: 🟠 Warning (1.48x base · $178,000 total)\n📊 Snapshot: Total $178,000 = Base $120,000 + Benefits 25.0% ($30,000) + Payroll Tax 8.0% ($9,600) + Overhead 15.0% ($18,000)\n🔄 What-If: if benefits drop to 20%, total drops to $168,000 (1.40x, improvement)\n⚖️ Break-Even: to hit 🟢 Excellent (1.25x ceiling), must cut $28,000 from benefits + tax + overhead combined\n🎯 Milestone: re-benchmark benefits + tax components every Q2 — healthcare inflation averages 5-7%/yr\n💡 Tip: BLS Employer Costs for Employee Compensation (ECEC) 2024 tracks national avg ~1.30x multiplier. Companies consistently >1.5x have bloated overhead — typically equipment refresh cycles or management layer.',
  ],
  faq: [
    { q: 'What does "fully-loaded" mean?', a: 'It is the true cost of an employee beyond base salary — including employer-paid benefits (health insurance, 401k match, PTO accrual), employer-side payroll taxes (FICA, FUTA, SUTA), and per-employee overhead (equipment, software licenses, management allocation).' },
    { q: 'Why is the multiplier a useful metric?', a: 'It lets you compare overhead efficiency across roles and teams. A 1.25x multiplier is excellent (BLS-tracked average), while 1.6x+ signals bloat. CFOs use this to set hiring ROI targets (e.g. new hire must generate 3x fully-loaded cost in year-1 revenue).' },
    { q: 'Are benefits negotiable?', a: 'Partially. Health insurance premiums are market-driven but partially controllable via plan design (HDHP + HSA vs PPO). 401k match is highly negotiable (typical range 3-6%). PTO accrual is fixed once set in policy. Negotiate with brokers annually.' },
    { q: 'How often should I recompute?', a: 'Annually at minimum, ideally aligned with benefits renewal (typically Q4 for Jan-1 effective dates). Mid-year if you add a major software license (e.g. company-wide Figma rollout).' },
    { q: 'What is the BLS ECEC benchmark?', a: 'The US Bureau of Labor Statistics Employer Costs for Employee Compensation quarterly report. As of 2024, total compensation is ~1.31x base wages for private industry workers. Tech/SaaS skews higher due to richer benefits.' },
    { q: 'Does this include equity?', a: 'No — equity (RSU/options) is treated separately because it is not a cash cost. For equity cost modeling, see our [Equity Refresh Calculator] (P11-5).' },
  ],
  howToUse: [
    'Enter the annual base salary for the role you are budgeting.',
    'Estimate benefits as a % of base — typical SaaS: 20-30% (health 12-15%, 401k match 4-6%, PTO 4-6%).',
    'Estimate payroll tax as 8-10% of base (FICA 7.65% + FUTA/SUTA 0.5-2.5%).',
    'Estimate overhead as 10-20% of base (equipment $2-5K, software $3-8K, mgmt allocation varies).',
    'Read the multiplier band, then identify the largest component for negotiation.',
  ],
  sources: [
    'https://www.bls.gov/news.release/ecec.toc.htm',
    'https://www.shrm.org/topics-tools/news/talent-acquisition/2024-benefits-survey',
    'https://www.pave.com/compensation-benchmarks',
  ],
};
registerEngine(engine);
```

Save to: `src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "D:/E/独立站/youtube-tools" && node --import tsx --test tests/fully-loaded-employee-cost-calculator.test.ts 2>&1 | tail -25`
Expected: 11 tests pass, 0 fail.

- [ ] **Step 5: Wire 7 supporting files**

5a. `src/engines/hiring-team/index.ts` — replace `export {};` with:

```ts
// Hiring & Team Calculator Engines (P11 batch, 6 calcs)
//
// P11-1: fully-loaded-employee-cost   — Fully-Loaded Employee Cost
// P11-2: time-to-productivity         — Time to Productivity (Ramp Time)
// P11-3: productivity-ramp-curve      — Productivity Ramp Curve
// P11-4: comp-banding                 — Compensation Banding
// P11-5: equity-refresh               — Equity Refresh Grant
// P11-6: attrition-cost               — Attrition Cost
//
// Engines are added one per task via Task 1..Task 6.
import './fully-loaded-employee-cost-calculator';
```

5b. `src/data/tools/hiring-team.ts` — append ToolMeta:

```ts
  {
    slug: 'solopreneur-fully-loaded-employee-cost-calculator',
    title: 'Fully-Loaded Employee Cost',
    description:
      'Compute total annual employee cost (base + benefits + payroll tax + overhead). INVERSE health bands — lower multiplier is better: 🟢 ≤1.25x · 🟡 1.25-1.40x · 🟠 1.40-1.60x · 🔴 >1.60x. For mid-market B2B SaaS ($10M-$50M ARR) People-ops managers and Head-of-HR.',
    categoryId: 'H',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 'base_salary',     label: 'Annual base salary',                       placeholder: 'e.g. 120000', type: 'number' },
      { name: 'benefits_pct',    label: 'Benefits % of base (health + 401k + PTO)', placeholder: 'e.g. 25',     type: 'number' },
      { name: 'payroll_tax_pct', label: 'Payroll tax % of base (FICA + FUTA + SUTA)',placeholder: 'e.g. 8',      type: 'number' },
      { name: 'overhead_pct',    label: 'Overhead % of base (equipment + SW + mgmt)', placeholder: 'e.g. 15',     type: 'number' },
    ],
    keywords: [
      'fully loaded employee cost',
      'employee cost calculator',
      'fully loaded cost',
      'total compensation cost',
      'benefits percentage',
      'overhead per employee',
      'BLS ECEC',
      'SHRM benefits survey',
      'mid-market SaaS',
    ],
    tags: ['hiring-team', 'people-ops', 'cost'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-10',
    sources: [
      'https://www.bls.gov/news.release/ecec.toc.htm',
      'https://www.shrm.org/topics-tools/news/talent-acquisition/2024-benefits-survey',
      'https://www.pave.com/compensation-benchmarks',
    ],
  },
```

5c. `src/data/og-samples.json` — append under top-level object:

```json
  "solopreneur-fully-loaded-employee-cost-calculator": {
    "headline": { "en": "1.48x", "zh": "1.48x" },
    "headlineUnit": { "en": "Fully-loaded multiplier", "zh": "全负荷成本倍数" },
    "headlineLabel": { "en": "Fully-Loaded Cost: 1.48x ($178K) — Warning, above BLS average", "zh": "全负荷成本 1.48 倍（$178K）— 警告，超过 BLS 平均" }
  },
```

5d. `scripts/codegen-examples.mjs` — find the `renewal-rate-calculator` line (last entry currently) and append after it:

```javascript
  { file: 'fully-loaded-employee-cost-calculator.ts',  slug: 'solopreneur-fully-loaded-employee-cost-calculator',
    subdir: 'hiring-team',     defaultInputs: { base_salary: '120000', benefits_pct: '25', payroll_tax_pct: '8', overhead_pct: '15' } },
```

5e. `tests/ab-split.test.ts` — in the two tests checking engine counts, change `74` to `75`:

```ts
// Line 51 changed:
test('getAllEngines() returns 75 engines after import', async () => {
  // ...
  assert.equal(getAllEngines().length, 75);
});

// Line 57 changed:
test('aggregated tools array has 75 entries', async () => {
  // ...
  assert.equal(tools.length, 75);
});
```

- [ ] **Step 6: Run codegen to regenerate staticExamples[0]**

Run: `cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs 2>&1 | tail -10`
Expected: line showing `✓ fully-loaded-employee-cost-calculator.ts (NNN chars, 6 lines)` and `Done. 75 engines updated.`

- [ ] **Step 7: Verify drift-free via codegen --check**

Run: `cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs --check 2>&1 | tail -8`
Expected: `✓ fully-loaded-employee-cost-calculator.ts: in sync` plus `✓ all other engines` and final line `[codegen-examples] --check PASSED: all 75 engines in sync and clean.`

- [ ] **Step 8: Run full pnpm check**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: pass count rises from 574 to ~585 (574 + 11 P11-1 tests). Zero fails.

- [ ] **Step 9: Commit + dual push**

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add tests/fully-loaded-employee-cost-calculator.test.ts src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts src/engines/hiring-team/index.ts src/data/tools/hiring-team.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts
SKIP_PRECOMMIT_CHECK=1 git commit -m "feat(p11-1): fully-loaded employee cost (11 tests, 6-section v3, 74→75 engines)"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

Expected: 1 commit pushed. Range: `P11-0..<new>`.

- [ ] **Step 10: Save P11-1 memory**

Save to: `~/.claude/projects/D--E-----youtube-tools/memory/p11-1-fully-loaded-shipped.md` AND copy to `memory/p11-1-fully-loaded-shipped.md` in-repo:

```markdown
---
name: p11-1-fully-loaded-shipped
description: P11-1 Fully-Loaded Employee Cost 已 ship 2026-07-10 (commit <hash>)；74→75 engines；4 inputs (base_salary/benefits_pct/payroll_tax_pct/overhead_pct) + 11 math tests + 6-section v3；canonical $178K / 1.48x (Warning)
metadata:
  type: project
---

P11-1 Fully-Loaded Employee Cost 已 ship 2026-07-10 (commit <hash>)。

**Canonical math:** $120K + 25% + 8% + 15% = $178K, multiplier 1.48x (Warning).

**Files:** src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts (~140 lines), tests/fully-loaded-employee-cost-calculator.test.ts (11 tests: 5 math + 5 bands + 1 metadata).

**Bands (INVERSE — lower better):** ≤1.25 Excellent · 1.25-1.40 Good · 1.40-1.60 Warning · >1.60 Critical (Infinity threshold).

**Sources:** BLS ECEC 2024 + SHRM 2024 Benefits Survey + Pave comp benchmarks.

**Lesson:** INVERSE band pattern with `Infinity` as critical threshold (P9-4 lesson applied). New 'H' category registered.
```

Then append `- [P11-1 Fully-Loaded shipped](p11-1-fully-loaded-shipped.md) — ...` line to BOTH `~/.claude/projects/.../memory/MEMORY.md` AND in-repo `memory/MEMORY.md`.

---

### Task 2: P11-2 Time to Productivity (Ramp Time)

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/time-to-productivity-calculator.test.ts`
- Engine file: `src/engines/hiring-team/time-to-productivity-calculator.ts`
- Math: `adjusted = ramp_weeks * complexity_multiplier` (Low=0.75, Med=1.0, High=1.4); dual-band table per role_level (IC vs Manager)
- Test target: 9 tests (5 math + 3 bands + 1 metadata)
- Engine default inputs: `{ role_level: 'IC', ramp_weeks: '8', industry_complexity: 'Med' }`
- ToolMeta slug: `solopreneur-time-to-productivity-calculator`
- ab-split bump: 75 → 76

**Detailed step guidance:**
- Use Task 1 as template, swap formulas/inputs/tests
- Health bands are stored per `role_level` in HEALTH_BANDS as nested object: `{ IC: { excellent: 4, good: 8, warning: 16 }, Manager: { excellent: 8, good: 16, warning: 26 } }` with critical: Infinity
- `calcHealthBand(weeks, role)` returns band key based on which sub-table

**Health band thresholds (locked, dual-table):**
- IC: ≤4w Excellent · 4-8w Good · 8-16w Warning · >16w Critical
- Manager: ≤8w Excellent · 8-16w Good · 16-26w Warning · >26w Critical

**Canonical:** IC, 8w × 1.0 (Med) = 8w (Good for IC)

**Tip cross-link:** "Manager ramp is typically 2x IC ramp — budget for this in headcount plan."

**Commit message:** `feat(p11-2): time to productivity ramp time (9 tests, 6-section v3, 75→76 engines)`

**Memory file:** `p11-2-ramp-time-shipped.md`.

---

### Task 3: P11-3 Productivity Ramp Curve

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/productivity-ramp-curve-calculator.test.ts`
- Engine file: `src/engines/hiring-team/productivity-ramp-curve-calculator.ts`
- Math: S-Curve logistic `p(t) = starting + (100 - starting) / (1 + e^(-k*(t-t0)))` where `k = 12/months_to_full, t0 = months_to_full/2`; Linear `p(t) = starting + (100-starting) * (t/months_to_full)`; SlowStart `p(t) = starting + (100-starting) * (t/months_to_full)^2`
- Cumulative cost = sum(monthly_cost × p(t)/100) for t=1..months_to_full
- P50 month = first t where p(t) ≥ 50 (then % of months_to_full)
- Test target: 11 tests (5 math + 5 bands + 1 metadata)
- Engine default inputs: `{ months_to_full: '6', starting_pct: '0', curve_shape: 'S-Curve', monthly_cost: '14833' }`
- ToolMeta slug: `solopreneur-productivity-ramp-curve-calculator`
- ab-split bump: 76 → 77

**Health band thresholds (locked, INVERSE — lower P50% better):**
- ≤30% time → 🟢 Excellent (steep ramp)
- 30-50% → 🟡 Good
- 50-70% → 🟠 Warning
- >70% → 🔴 Critical (slow ramp)

**Canonical:** S-Curve with 6mo to_full, 0% start → P50 at month 3 = 50% of months_to_full (Good)

**Lesson to apply:** When testing P50 computation, the S-Curve with `starting=0` hits exactly p=50 at `t = t0 = months_to_full/2`. For `months_to_full=6`, P50 month = 3 → 50% → 🟡 Good.

**Commit message:** `feat(p11-3): productivity ramp curve (11 tests, 6-section v3, 76→77 engines)`

**Memory file:** `p11-3-productivity-ramp-shipped.md`.

---

### Task 4: P11-4 Compensation Banding

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/comp-banding-calculator.test.ts`
- Engine file: `src/engines/hiring-team/comp-banding-calculator.ts`
- Math: piecewise-linear interpolation
  - `if base ≤ p25: pct = (base / p25) * 25`
  - `elif base ≤ p50: pct = 25 + ((base - p25) / (p50 - p25)) * 25`
  - `elif base ≤ p75: pct = 50 + ((base - p50) / (p75 - p50)) * 25`
  - `else: pct = min(100, 75 + ((base - p75) / p75) * 25)`
- Test target: 9 tests (5 math + 3 bands + 1 metadata)
- Engine default inputs: `{ role_title: 'Senior Software Engineer', base_salary: '160000', market_p25: '130000', market_p50: '155000', market_p75: '185000' }`
- ToolMeta slug: `solopreneur-comp-banding-calculator`
- ab-split bump: 77 → 78

**Health band thresholds (locked, HIGHER — paying competitively):**
- ≥P75 → 🟢 Excellent
- P50-P75 → 🟡 Good
- P25-P50 → 🟠 Warning
- <P25 → 🔴 Critical

**Canonical:** $160K vs P25 $130K / P50 $155K / P75 $185K → $160K is between P50-P75 → 50 + ((160-155)/(185-155))*25 = 50 + 4.17 = P54 (Good)

**Commit message:** `feat(p11-4): comp banding (9 tests, 6-section v3, 77→78 engines)`

**Memory file:** `p11-4-comp-banding-shipped.md`.

---

### Task 5: P11-5 Equity Refresh Grant

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/equity-refresh-calculator.test.ts`
- Engine file: `src/engines/hiring-team/equity-refresh-calculator.ts`
- Math:
  - `pool_size = total_company_shares * refresh_pool_pct / 100`
  - `role_target_pct: High=15%, Med=8%, Low=3%`
  - `years_factor = years_since_grant >= 4 ? 1.0 : 1.0 + (4 - years_since_grant) / 4`
  - `adjusted_refresh = pool_size * role_target_pct / 100 * years_factor`
  - `dilution_pct = adjusted_refresh / total_company_shares * 100`
- Test target: 10 tests (5 math + 4 bands + 1 metadata)
- Engine default inputs: `{ current_shares: '10000', years_since_grant: '3', refresh_pool_pct: '1.5', total_company_shares: '10000000', role_criticality: 'Med' }`
- ToolMeta slug: `solopreneur-equity-refresh-calculator`
- ab-split bump: 78 → 79

**Health band thresholds (locked, HIGHER — more retention investment):**
- ≥0.20% dilution → 🟢 Excellent
- 0.10-0.20% → 🟡 Good
- 0.05-0.10% → 🟠 Warning
- <0.05% → 🔴 Critical

**Canonical:** 10K shares, 3y, 1.5% pool, 10M total, Med
- pool_size = 10,000,000 × 1.5% = 150,000 shares
- years_factor = 1.0 + (4-3)/4 = 1.25
- adjusted_refresh = 150,000 × 8% × 1.25 = 15,000 shares
- dilution = 15,000/10,000,000 = 0.15% (Good)

**Commit message:** `feat(p11-5): equity refresh grant (10 tests, 6-section v3, 78→79 engines)`

**Memory file:** `p11-5-equity-refresh-shipped.md`.

---

### Task 6: P11-6 Attrition Cost

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/attrition-cost-calculator.test.ts`
- Engine file: `src/engines/hiring-team/attrition-cost-calculator.ts`
- Math:
  - `role_multiplier: IC=1.0, Manager=1.5`
  - `recruiting_total = recruiting_cost`
  - `ramp_cost = (annual_salary / 52) * ramp_weeks * 0.5` (50% productive during ramp)
  - `lost_productivity_cost = (annual_salary / 12) * lost_productivity_months * role_multiplier`
  - `total_attrition = recruiting_total + ramp_cost + lost_productivity_cost`
  - `pct_of_salary = total_attrition / annual_salary * 100`
- Test target: 10 tests (5 math + 4 bands + 1 metadata)
- Engine default inputs: `{ annual_salary: '120000', recruiting_cost: '8000', ramp_weeks: '12', lost_productivity_months: '6', role_level: 'IC' }`
- ToolMeta slug: `solopreneur-attrition-cost-calculator`
- ab-split bump: 79 → 80 (FINAL bump — matches P11 final target)

**Health band thresholds (locked, INVERSE — lower % = better):**
- ≤50% of salary → 🟢 Excellent
- 50-100% → 🟡 Good
- 100-200% → 🟠 Warning
- >200% → 🔴 Critical

**Canonical:** $120K, $8K recruiting, 12w ramp, 6mo lost, IC
- recruiting = $8,000
- ramp_cost = ($120,000/52) × 12 × 0.5 = $13,846
- lost_productivity = ($120,000/12) × 6 × 1.0 = $60,000
- total = $81,846 = 68% of salary (Good)

**FINAL BUMP to internal-links test:** in `tests/internal-links.test.ts`, change the assertion that checks total engine count from 74 → 80. (P8-0 over-bump lesson applied — single bump at final calc, not progressive.)

**Commit message:** `feat(p11-6): attrition cost (10 tests, 6-section v3, 79→80 engines, final batch bump)`

**Memory file:** `p11-6-attrition-cost-shipped.md`.

---

### Task 7: P11 Holistic Review + Series Memory + MEMORY.md Index Update

**Files:**
- Modify: `tests/internal-links.test.ts` (verify 80 count is the only assertion — already bumped in Task 6)
- Spawn (read-only): 2 review agents (spec-compliance + cross-file integrity)
- Create: `~/.claude/projects/.../memory/p11-series-shipped.md` AND copy to `memory/p11-series-shipped.md` in-repo
- Modify: `~/.claude/projects/.../memory/MEMORY.md` AND in-repo `memory/MEMORY.md` (append P11 series entry)

**Interfaces:**
- Consumes: All 6 P11 engines shipped (commits P11-1..P11-6)
- Produces:
  - Series memory file documenting 6 calcs shipped (commits + test counts + lessons)
  - MEMORY.md index updated with P11 series entry
  - Holistic review catches any cross-cutting bugs (fix in this commit)

- [ ] **Step 1: Pre-holistic — verify all 6 P11 calcs shipped + tests pass**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: pass count should be 574 + 11 + 9 + 11 + 9 + 10 + 10 = 634 tests pass, 0 fail.

If any fail: STOP and fix before holistic review. Do NOT document broken state in series memory.

- [ ] **Step 2: Verify dist build + total page count**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm build 2>&1 | tail -10`
Expected: build succeeds. Count `find dist -name "index.html" | wc -l` → expect ≥ 265 (was 251 + 6 calc pages + 8 listing page variants ≈ 266).

- [ ] **Step 3: Verify dual-mirror sync before holistic**

```bash
cd "D:/E/独立站/youtube-tools"
git log --oneline origin/master..master  # should be empty
git log --oneline github/master..master  # should be empty
```

If either is non-empty: STOP and push before continuing.

- [ ] **Step 4: Spawn 2 parallel review agents**

Agent 1 — SPEC-COMPLIANCE (read-only):

```
Review the P11 Hiring/Team calculator batch (6 calcs) for spec compliance against the approved spec at docs/superpowers/specs/2026-07-10-p11-hiring-team-batch-design.md (commit f7cff70).

Engines to review:
- src/engines/hiring-team/fully-loaded-employee-cost-calculator.ts
- src/engines/hiring-team/time-to-productivity-calculator.ts
- src/engines/hiring-team/productivity-ramp-curve-calculator.ts
- src/engines/hiring-team/comp-banding-calculator.ts
- src/engines/hiring-team/equity-refresh-calculator.ts
- src/engines/hiring-team/attrition-cost-calculator.ts

ToolMeta files:
- src/data/tools/hiring-team.ts

Specifically verify:
1. All 26 inputs per spec section 5.2 are present in inputs[] array of BOTH engine file and ToolMeta entry (no missing inputs, no extra inputs).
2. Each engine's HEALTH_BANDS structure matches spec section 4.1 thresholds exactly (4 bands, correct direction, correct boundaries).
3. canonical example output strings match spec section 5.3 locked values exactly.
4. 4-band thresholds in customFn JS match generate() TS math exactly (no drift).
5. Each engine produces 6-section v3 output (Health · Snapshot · What-If · Break-Even · Milestone · Tip) with all 6 emoji prefixes.
6. Mid-market B2B SaaS ($10M-$50M ARR) persona string present in every ToolMeta description.
7. categoryId: 'H' on all 6 ToolMeta entries.
8. applicationsCategory: 'BusinessApplication' on all 6 entries.
9. dataReviewedAt: '2026-07-10' on all 6 entries.
10. Ramp Time calc handles dual-band (IC vs Manager) per role_level select.
11. Productivity Ramp calc handles 3 curve_shape values (SlowStart/Linear/S-Curve).
12. Equity Refresh formula handles role_criticality select + years_factor boost.
13. Attrition Cost handles role_level multiplier (IC=1.0, Manager=1.5).
14. INVERSE band direction applied to P11-1, P11-2, P11-3, P11-6 (lower=better); HIGHER for P11-4, P11-5.

Return a numbered list of findings with file path + line number + brief description. Mark each finding as CONFIRMED (real bug) or PLAUSIBLE (warrants investigation).
```

Agent 2 — CROSS-FILE INTEGRITY (read-only):

```
Review the P11 Hiring/Team calculator batch (6 calcs) for cross-file integrity.

Cross-cutting files to verify:
- src/engines/hiring-team/index.ts (6 explicit engine imports)
- src/engines/index.ts (contains `import './hiring-team';`)
- src/data/tools/hiring-team.ts (6 ToolMeta entries)
- src/data/tools/index.ts (contains `import { tools as hiringTeam }` + spread)
- src/data/categories.ts (contains 'H' category entry — verify 13 total)
- src/data/og-samples.json (6 OG entries for hiring-team slugs)
- scripts/codegen-examples.mjs (6 ENGINES entries with subdir: 'hiring-team')
- src/pages/[lang]/hiring-team.astro (renders listing page)
- tests/ab-split.test.ts (13 subdirs, 15 tools files, getAllEngines 80, tools.length 80)
- tests/internal-links.test.ts (80 total tools)
- tests/<slug>-calculator.test.ts × 6 (test files for each calc)

Specifically verify:
1. src/engines/hiring-team/index.ts has exactly 6 engine imports + the P-series header comment.
2. src/engines/index.ts (root) has `import './hiring-team';` line.
3. src/data/tools/hiring-team.ts has exactly 6 ToolMeta entries with slugs matching `solopreneur-<calc>-calculator`.
4. src/data/tools/index.ts (root) has `import { tools as hiringTeam } from './hiring-team';` + `...hiringTeam,` in the tools array spread.
5. src/data/categories.ts has 13 entries (id A B C D E F M O P R S H).
6. src/data/og-samples.json has 6 entries with key `solopreneur-<calc>-calculator`.
7. scripts/codegen-examples.mjs has 6 entries with `subdir: 'hiring-team'`.
8. src/pages/[lang]/hiring-team.astro exists and references categoryId 'H'.
9. tests/ab-split.test.ts: subdir array has 13 entries including 'hiring-team'; tools file array has 15 entries including 'hiring-team.ts'; engine count assertions updated to 80.
10. tests/internal-links.test.ts: total tools count updated to 80.
11. dist/en/hiring-team/ and dist/zh/hiring-team/ both exist with index.html.
12. dist/en/solopreneur-<each-calc>/ and dist/zh/solopreneur-<each-calc>/ both exist (6 calc dirs × 2 langs = 12 dist calc pages).
13. ROOT barrel imports (engines/index.ts + tools/index.ts) both reference hiring-team (P9-1 + P10-1 pre-emptive fix verification).
14. No stale references to 'P' in hiring-team files (no copy-paste from P-series).
15. No stale 'retention' / 'product-analytics' references in hiring-team files.

Return a numbered list of findings with file path + line number + brief description. Mark each finding as CONFIRMED (real bug) or PLAUSIBLE (warrants investigation).
```

Spawn both agents in parallel via Agent tool with `run_in_background: false`.

- [ ] **Step 5: Apply findings from reviews**

For each finding from either agent:
- If real bug (CONFIRMED): fix in working tree
- If false positive (PLAUSIBLE but ruled out): document why in commit message
- If cosmetic: skip (keep diff small)

Do NOT fix and amend old commits — fix as a `fix(p11):` follow-up commit if needed, or roll into the holistic commit if trivial.

- [ ] **Step 6: Write series memory file `~/.claude/projects/D--E-----youtube-tools/memory/p11-series-shipped.md`**

Use the consolidated format from P5/P6/P7/P8/P9/P10 series memory files. Cover:
- 6 calculators shipped (commits P11-1..P11-6)
- 8-file wiring pattern per calc (no mid-flight fixes needed, or list any)
- HEALTH_BANDS structure consistency (4 INVERSE bands + 2 HIGHER bands)
- Cross-file wiring verified (8/8 per calc + ROOT barrel pre-emptive fix verified)
- 13 categories now (was 12)
- 80 engines (was 74)
- Tests: ~634 pass (574 baseline + 60 P11 tests: 11+9+11+9+10+10)
- Lessons specific to P11:
  - ROOT barrel pre-emptive fix in scaffold (P9-1 + P10-1 lesson applied — caught early)
  - Ramp Time dual-band (IC vs Manager) — single select input routes to two band tables
  - Productivity Ramp 3 curve_shape variants — logistic S-Curve / Linear / SlowStart math
  - Equity Refresh formula complexity — 3-step (pool / role share / dilution) + years_factor boost
  - INVERSE band direction applied to 4/6 calcs (Fully-Loaded, Ramp, Productivity, Attrition)
- Closes the team-scaling loop complementing P6 (marketing acquisition) + P8 (sales closing) + P9 (retention) + P10 (product engagement). P11 brings People-ops dimension.

- [ ] **Step 7: Update MEMORY.md index with P11 series entry**

Append to BOTH `~/.claude/projects/.../memory/MEMORY.md` AND in-repo `memory/MEMORY.md`:

```markdown
- [P11 series shipped](p11-series-shipped.md) — P11 Hiring & Team Calculator Batch 完整 ship 2026-07-10 (8 commits ...)；6 calculators (74→80 +6)；NEW 'H' Hiring & Team category (13th category)；mid-market B2B SaaS People-ops persona $10M-$50M ARR；20 inputs + 60 tests + per-file HEALTH_BANDS pattern；ROOT barrel pre-emptive fix at scaffold (P9-1 + P10-1 lesson applied)；INVERSE bands on 4/6 calcs；~634 pass / 0 fail；9th vertical-depth batch；closes team-scaling loop with P6/P8/P9/P10
```

(Fill in actual commit hash range and test counts from Steps 1-3.)

- [ ] **Step 8: Commit memory files + any holistic fixes**

```bash
cd "D:/E/独立站/youtube-tools"
# In-repo memory files (preferred for git-tracking consistency with P5-P10):
git add memory/p11-1-fully-loaded-shipped.md memory/p11-2-ramp-time-shipped.md memory/p11-3-productivity-ramp-shipped.md memory/p11-4-comp-banding-shipped.md memory/p11-5-equity-refresh-shipped.md memory/p11-6-attrition-cost-shipped.md memory/p11-series-shipped.md memory/MEMORY.md
# Plus any holistic fixes from Step 5
git add -A  # catches any holistic-fix files
SKIP_PRECOMMIT_CHECK=1 git commit -m "docs(p11): series memory + per-calc memory + MEMORY.md index update"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

Expected: 1 commit pushed (or 2 if holistic fix + memory commit split).

- [ ] **Step 9: Final dual-push verification**

```bash
cd "D:/E/独立站/youtube-tools"
git log --oneline origin/master..master  # should be empty
git log --oneline github/master..master  # should be empty
git fetch origin 2>&1 | tail -3
git fetch github 2>&1 | tail -3
```

Expected: all four commands return empty / "Already up to date" — both mirrors in sync at final P11 commit.

---

## Self-Review

### 1. Spec coverage

| Spec section | Plan task |
|---|---|
| §1 Overview + persona anchor | Global Constraints #24 + Task 0 description |
| §2 Roster (6 calcs, differentiation) | Tasks 1-6 (one per calc) + Task 0 scaffold |
| §3 Per-calc detail (math, 6-section v3, bands) | Task 1 (full example) + Tasks 2-6 (template application) |
| §4.1 4-band threshold summary | Each Task 1-6 has explicit band block in their detail section |
| §4.2 Input counts | Task 0 Step 6 + each Task 1-6 inputs[] array |
| §4.3 8-file wiring | Task 0 (8 files including both root barrel imports) + Task 1 Step 5 (7 supporting files) |
| §4.4 Pre-emptive fixes | Task 0 Steps 3 + 5 (ROOT barrel imports) — P9-1 + P10-1 lesson |
| §5.1 Global constraints | Global Constraints #1-22 |
| §5.2 Per-calc inputs (26 inputs total) | Each Task 1-6 has inputs[] array + Test target matches |
| §5.3 Canonical examples | Task 1 staticExamples[0] + Tasks 2-6 canonical mentioned in detail section |
| §5.4 Math test counts | Each Task 1-6 has "Test target: N tests" |
| §5.5 CustomFn minification notes | Global Constraint #18 (Node appendFileSync) + Task 1 Step 3 sample customFn |
| §5.6 Dual-push cadence | Global Constraint #17 + Task 0/1-6/7 Step commit blocks |
| §6 Architecture decisions | Documented in spec; plan follows them |
| §7 Risk register | Global Constraints #15, #23, #25-27 |
| §8 Success criteria | Task 7 Steps 1-3 verify all |

Gaps: none identified. All 26 inputs verified per §5.2.

### 2. Placeholder scan

- "TBD" / "TODO" / "FIXME" / "implement later" — none
- "Add appropriate error handling" — none
- "Similar to Task N" — Tasks 2-6 reference Task 1 as template, but each includes distinct per-calc content (formula, band, defaults, tests, slug). Acceptable per writing-plans skill.
- "Write tests for the above" without code — Task 1 has full test file example (11 tests fully written); Tasks 2-6 have test target counts + canonical math, with implementer adapting the fixtures to the calc's specific inputs/expected values following Task 1's pattern.

### 3. Type consistency

| Symbol | Defined in | Used in |
|--------|------------|---------|
| `ToolEngine` | import from `../../core/engines/types` | Every engine file (Tasks 1-6) |
| `registerEngine` | import from `../../core/engines/registry` | Every engine file, called once with the engine const |
| `HEALTH_BANDS` | top-level const per engine | exported, used by `calcHealthBand` + engine.generate() |
| `ToolMeta` | import from `./types` | tool entry (5b of each Task) |
| `categoryId` | 'H' for all 6 P11 entries | consistent |
| `applicationCategory` | 'BusinessApplication' | consistent (P9+ pattern) |
| `tags` array | ['hiring-team', '<role>', '<concept>'] | consistent |
| `reviewedBy` | 'ForgeFlowKit Team' | consistent |
| `dataReviewedAt` | '2026-07-10' | consistent for all 6 (single-day ship) |
| `fullyLoadedCost(base, benefits, tax, overhead)` | Task 1 Step 3 | Only Task 1 (per-calc functions, no sharing) |
| `costMultiplier(total, base)` | Task 1 Step 3 | Only Task 1 |
| `calcHealthBand(mult)` | Task 1 Step 3 | Each engine has its own per-calc variant — Task 2 signature differs (`calcHealthBand(weeks, role)`), Task 3 (`calcHealthBand(p50Pct)`), Task 4 (`calcHealthBand(percentile)`), Task 5 (`calcHealthBand(dilutionPct)`), Task 6 (`calcHealthBand(pctOfSalary)`). All return `'excellent' | 'good' | 'warning' | 'critical'`. |

No signature drift. Each calc's `calcHealthBand` is locally scoped — no inter-calc dependency.

### 4. ROOT barrel pre-emptive fix verification

- **src/engines/index.ts** (root) gets `import './hiring-team';` at Task 0 Step 3 ✓
- **src/data/tools/index.ts** (root) gets `import { tools as hiringTeam } from './hiring-team';` + `...hiringTeam,` at Task 0 Step 5 ✓
- Both fixes wired BEFORE first P11 calc commit (P11-1) — prevents P10-1 mid-flight fix scenario
- ab-split test `getAllEngines().length === 74` (Task 0) and `=== 80` (after Task 6) verifies the count progression correctly with the pre-emptive fix in place

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-10-p11-hiring-team-batch.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**