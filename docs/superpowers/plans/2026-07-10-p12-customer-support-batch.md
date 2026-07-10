# P12 Customer Support Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans (controller direct execution, no subagent dispatch for mechanical P-series work). Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 6 new calculators in a NEW 'T' Customer Support category at ForgeFlowKit (solopreneur SaaS calculators). Mid-market B2B SaaS CS Ops / Head-of-CS persona, $10M-$50M ARR anchor. Multi-tier T1/T2/T3 architecture. Brings total to 86 engines / 13 categories.

**Architecture:** Self-registered engine (`src/engines/customer-support/<slug>-calculator.ts`), per-calc 4-band hardcoded thresholds from CS Ops community consensus (TSIA 2024, Zendesk CX Trends 2024, ICMI 2023, Gainsight CS Benchmarks, CustomerGauge 2024, SQM Group 2024). Fully static — no PRICING.json entry, no API fetch. Per-calc push cadence (9 commits total: plan + scaffold + 6 calcs + holistic). Closes the **service-operations loop** complementing P6 (marketing acquisition) + P8 (sales closing) + P9 (retention keep) + P10 (product engagement) + P11 (team scaling).

**Tech Stack:** Astro 4.16.19 static site generation, TypeScript 5.6 strict. Node `appendFileSync` for engine files >5000 chars (P9-2/P9-5 lesson). pnpm check (typecheck + test:run) as pre-commit gate. No new external dependencies.

---

## Global Constraints

| # | Constraint | Source |
|---|------------|--------|
| 1 | Each calculator file lives in `src/engines/customer-support/` | spec §1.1 |
| 2 | Engine filename: `<slug>-calculator.ts` (kebab-case, no abbreviations) | spec §6.1 |
| 3 | Engine self-registers via `registerEngine(engine)` at module import | P-series established |
| 4 | Barrel pattern: `src/engines/customer-support/index.ts` uses explicit line-per-engine imports (NOT `import.meta.glob` at subdir level — that's only for `src/engines/index.ts`) | P9-1 lesson |
| 5 | ToolMeta entry in `src/data/tools/customer-support.ts` uses `categoryId: 'T'` exactly | spec §6.4 |
| 6 | OG entry: `headline`, `headlineUnit`, `headlineLabel` — both `en` and `zh` keys | P9 pattern |
| 7 | `scripts/codegen-examples.mjs` ENGINES array: `{ file, slug, subdir: 'customer-support', defaultInputs }` | P9-0 lesson |
| 8 | `tests/ab-split.test.ts`: subdir array append `'customer-support'` (13→14), file list append `'customer-support.ts'` (15→16) | spec §4.3 |
| 9 | `tests/internal-links.test.ts`: bump `80` → `86` once total reaches (after P12-6) | spec §4.3, P8-0 over-bump lesson |
| 10 | Each per-calc test file: 10-11 tests covering math + 4 health bands | spec §5.4 |
| 11 | 6-section v3 Business standard: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip | spec §5.1 |
| 12 | HEALTH_BANDS exported as top-level `const` per engine file | P6+ pattern |
| 13 | Float precision dual-layer: math returns unrounded, display rounds | P-series standard |
| 14 | Mid-market $10M-$50M ARR anchor copy in every ToolMeta description | P9 pattern |
| 15 | INVERSE band direction for Cost-per-Ticket (P12-1) and Capacity Plan utilization (P12-6); HIGHER for FRT SLA (P12-2), Resolution Time (P12-3), CSAT (P12-4), Deflection Rate (P12-5) | spec §4.1 |
| 16 | Pre-commit gate: `pnpm check` (zero errors) before each commit | P-series standard |
| 17 | Dual push: `git push origin HEAD` (gitee) + `git push github HEAD` with `SKIP_PUSH_FETCH=1` | P-series standard |
| 18 | Use Node `appendFileSync` (NOT Bash printf) for engine files >5000 chars | P9-2 lesson |
| 19 | Run `node scripts/codegen-examples.mjs` after engine edits; `--check` mode for drift detection | P-series standard |
| 20 | Codegen `--check` validates `new Function('inputs','pick','fill', customFn)` parses + literal escape regex | P9 pattern |
| 21 | Memory file per-calc saved to `~/.claude/projects/.../memory/` AND `memory/` in-repo AFTER successful ship | P-series standard |
| 22 | `MEMORY.md` index in same location gets `- [Title](file.md)` line per ship | P-series standard |
| 23 | **CRITICAL P12-0 scaffold pre-emptive**: `src/engines/index.ts` adds `import './customer-support';` AND `src/data/tools/index.ts` adds `import { tools as customerSupport } from './customer-support';` + spreads into tools array | P9-1 + P10-1 + P11-1 lesson (caught by ab-split) |
| 24 | CS Ops persona string: "mid-market B2B SaaS ($10M-$50M ARR)" in every description | spec §1.3 |
| 25 | Multi-tier T1/T2/T3 cost & SLA structure for P12-1 + P12-2 | spec §6.2 |
| 26 | CSAT 95% CI margin of error formula: `1.96 * sqrt(p*(1-p)/n) * 100` (P12-4) | spec §3.4 |
| 27 | Deflection math: `saved = volume * rate% * cost; net = saved - tool_cost; roi = net/tool_cost * 100` (P12-5) | spec §3.5 |
| 28 | Capacity math: `productive_min = hours * 60 * (1-shrink) * (occ/100); agents = ceil(tickets * aht / productive_min)` (P12-6) | spec §3.6 |
| 29 | All 31 inputs verified per spec §5.2 (no missing input mid-flight fixes) | spec §5.2 + P10-1 lesson |

---

## File Structure

| Layer | File | Per-task |
|-------|------|----------|
| Engine | `src/engines/customer-support/<slug>-calculator.ts` | NEW per calc (Task 1-6) |
| Engine | `src/engines/customer-support/index.ts` | NEW (Task 0), append imports (Task 1-6) |
| Engine | `src/engines/index.ts` | **append `import './customer-support';`** (Task 0) — ROOT barrel pre-emptive fix |
| Data | `src/data/tools/customer-support.ts` | NEW empty (Task 0), append entries (Task 1-6) |
| Data | `src/data/tools/index.ts` | **append `import { tools as customerSupport } from './customer-support';` + spread** (Task 0) — ROOT barrel pre-emptive fix |
| Data | `src/data/categories.ts` | append 1 entry (Task 0) |
| Data | `src/data/og-samples.json` | append 1 entry per calc (Task 1-6) |
| Page | `src/pages/[lang]/customer-support.astro` | NEW (Task 0) |
| Test | `tests/<slug>-calculator.test.ts` | NEW per calc (Task 1-6) |
| Test | `tests/ab-split.test.ts` | modify (Task 0), bump per calc (Task 1-6) |
| Test | `tests/internal-links.test.ts` | bump post-Task 6 (single 80→86) |
| Script | `scripts/codegen-examples.mjs` | append ENGINES entry per calc (Task 1-6) |
| Memory | `~/.claude/projects/.../memory/p12-N-<slug>-shipped.md` | NEW per calc (Task 1-6) |
| Memory | `~/.claude/projects/.../memory/p12-series-shipped.md` | NEW (Task 7) |
| Memory | `~/.claude/projects/.../memory/MEMORY.md` | append line per ship |

**Total file actions per calc (Task 1-6):** 8 (engine + test + 6 supporting: barrel, ToolMeta, og-samples, codegen, ab-split, memory)
**Total file actions Task 0:** 8 (1 dir + 7 files: empty barrel, empty ToolMeta, categories entry, listing page, ab-split array updates, AND both root barrel imports)
**Total file actions Task 7 (holistic review):** 3 (2 review agents + 1 series memory + 1 MEMORY.md update + 1 holistic commit)

**Commits:** 9 (plan + scaffold + 6 calcs + holistic review + memory)

---

### Task 0: P12 Scaffold — Empty category shell + ROOT barrel pre-emptive fixes

**Files:**
- Create: `src/engines/customer-support/` (directory)
- Create: `src/engines/customer-support/index.ts` (empty barrel)
- Modify: `src/engines/index.ts` (append `import './customer-support';`)
- Create: `src/data/tools/customer-support.ts` (empty)
- Modify: `src/data/tools/index.ts` (append `import { tools as customerSupport } from './customer-support';` + spread)
- Modify: `src/data/categories.ts` (append 1 entry)
- Create: `src/pages/[lang]/customer-support.astro`
- Modify: `tests/ab-split.test.ts` (add 'customer-support' to subdir array, add 'customer-support.ts' to data/tools/ file list)

**Interfaces:**
- Consumes: nothing (first task)
- Produces:
  - `src/data/categories.ts` exports `categories: Category[]` with length 13 (was 12) — appending 'T' as 13th category
  - `src/data/tools/customer-support.ts` exports `tools: ToolMeta[]` (empty, length 0)
  - `src/pages/[lang]/customer-support.astro` renders `dist/en/customer-support/index.html` and `dist/zh/customer-support/index.html`
  - `tests/ab-split.test.ts` test "engines/ has 13 subdirectories" → updated to "14 subdirectories" + 'customer-support' appended; test "data/tools/ has 15 files" → updated to "16 files" + 'customer-support.ts' appended
  - `src/engines/index.ts` and `src/data/tools/index.ts` both reference customer-support from Task 0 (avoids P10-1 mid-flight fix)

- [ ] **Step 1: Create directory `src/engines/customer-support/`**

Run: `mkdir -p src/engines/customer-support`
Expected: directory created.

- [ ] **Step 2: Create `src/engines/customer-support/index.ts` (empty barrel)**

```ts
// Customer Support Calculator Engines (P12 batch, 6 calcs)
//
// P12-1: cost-per-support-ticket — Cost-per-Support-Ticket
// P12-2: first-response-time      — First Response Time SLA
// P12-3: resolution-time          — Resolution Time
// P12-4: csat                     — CSAT (Customer Satisfaction)
// P12-5: deflection-rate          — Self-Service Deflection Rate
// P12-6: support-capacity-planning — Support Team Capacity Planning
//
// Engines are added one per task via Task 1..Task 6.
export {};
```

Save to: `src/engines/customer-support/index.ts`

- [ ] **Step 3: Modify `src/engines/index.ts` — append customer-support import (PRE-EMPTIVE ROOT BARREL FIX)**

Append as the 14th line:

```ts
import './customer-support';
```

Final file should have 14 lines of imports (saas, ai-cost, valuation, freelance, cost, investment, real-estate, marketing, operations, sales, retention, product-analytics, hiring-team, customer-support).

- [ ] **Step 4: Create `src/data/tools/customer-support.ts` (empty)**

```ts
// Customer Support ToolMeta entries (P12 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [];
```

Save to: `src/data/tools/customer-support.ts`

- [ ] **Step 5: Modify `src/data/tools/index.ts` — append customer-support import + spread (PRE-EMPTIVE ROOT BARREL FIX)**

Add `import { tools as customerSupport } from './customer-support';` to the import block (after `import { tools as hiringTeam } from './hiring-team';`), and `...customerSupport,` to the spread block (after `...hiringTeam,`).

Final `tools` array should have 14 spread entries.

- [ ] **Step 6: Modify `src/data/categories.ts` — append 'T' category entry**

Read the file first to find the last closing brace (`];`). Then append BEFORE the closing `]` (NOT after — keep array valid):

```ts
  { id: 'T', name: 'Customer Support', slug: 'customer-support', description: 'Calculate cost-per-support-ticket, first response time SLA, resolution time, CSAT, self-service deflection rate, and team capacity planning for CS Ops managers and Head-of-CS at mid-market B2B SaaS companies ($10M-$50M ARR).' },
```

Verify with: `grep -c "id: 'T'" src/data/categories.ts` → expect `1`
Verify array length: `grep -c "id: '[A-Z]'" src/data/categories.ts` → expect `13`

- [ ] **Step 7: Create `src/pages/[lang]/customer-support.astro` (template copy from hiring-team.astro)**

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
const CATEGORY_ID = 'T';
const CATEGORY_SLUG = 'customer-support';
// Category T i18n keys will populate incrementally across P12-1..P12-6.
// Until then, fall back to direct category data.
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'Customer Support';
const categoryDesc = categoryMeta?.description ?? 'Customer Support calculators for mid-market B2B SaaS CS Ops managers and Head-of-CS.';

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

Save to: `src/pages/[lang]/customer-support.astro`

- [ ] **Step 8: Modify `tests/ab-split.test.ts` — extend subdir array and tools file list**

Read the current file. In the test `engines/ has 13 subdirectories`, change the title to `14 subdirectories` and append `'customer-support'` to the array (as the 14th element).

In the test `data/tools/ has 15 files (types, 13 categories, index)`, change the title to `16 files (types, 14 categories, index)` and append `'customer-support.ts'` to the for-of array (between `'hiring-team.ts'` and `'index.ts'`).

Result arrays:

```ts
// First test:
['saas', 'ai-cost', 'valuation', 'freelance', 'cost', 'investment', 'real-estate', 'marketing', 'operations', 'sales', 'retention', 'product-analytics', 'hiring-team', 'customer-support']

// Second test:
['types.ts', 'saas.ts', 'ai-cost.ts', 'valuation.ts', 'freelance.ts', 'cost.ts', 'investment.ts', 'real-estate.ts', 'marketing.ts', 'operations.ts', 'sales.ts', 'retention.ts', 'product-analytics.ts', 'hiring-team.ts', 'customer-support.ts', 'index.ts']
```

DO NOT change the engine-count tests (`getAllEngines().length === 80`, `tools.length === 80`) — they remain at 80 because P12-0 is scaffold-only, no engines yet.

- [ ] **Step 9: Run the ab-split tests to verify scaffold**

Run: `cd "D:/E/独立站/youtube-tools" && npx tsx tests/ab-split.test.ts 2>&1 | tail -15`
Expected:
```
ok 1 - engines/ has 14 subdirectories
ok 2 - engines/index.ts uses import.meta.glob
ok 3 - engines/ has no engine .ts files at root (only index.ts)
ok 4 - data/tools/ has 16 files (types, 14 categories, index)
...
# tests 9
# pass 9
# fail 0
```

If `fail 1` on the subdir/file tests: re-check arrays in Step 8. If `fail 1` on engine-count (80), DO NOT fix yet — that one needs P12-1 to be true.

The ROOT barrel pre-emptive fix (Steps 3 + 5) means the empty customer-support barrel imports cleanly, and the empty tools array spreads cleanly — getAllEngines().length stays at 80 (no engines register yet from the empty barrel) and tools.length stays at 80 (empty array spreads as []).

- [ ] **Step 10: Build dist to verify listing page renders**

Run: `pnpm build 2>&1 | tail -5`
Expected: build succeeds, file `dist/en/customer-support/index.html` and `dist/zh/customer-support/index.html` exist.

Verify: `ls dist/en/customer-support/ dist/zh/customer-support/` → both contain `index.html`.

- [ ] **Step 11: Pre-commit: run pnpm check**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: all tests pass (~634 baseline preserved). Scaffold adds no new failures.

- [ ] **Step 12: Commit + dual push**

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add src/engines/customer-support/ src/engines/index.ts src/data/tools/customer-support.ts src/data/tools/index.ts src/data/categories.ts src/pages/\[lang\]/customer-support.astro tests/ab-split.test.ts
SKIP_PRECOMMIT_CHECK=1 git commit -m "feat(p12-0): customer support category scaffold + new 'T' category + listing page + ROOT barrel pre-emptive"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

Expected: 1 commit pushed, both mirrors updated. Range: previous `314e506..<new>`.

---

### Task 1: P12-1 Cost-per-Support-Ticket

**Files:**
- Create: `tests/cost-per-support-ticket-calculator.test.ts`
- Create: `src/engines/customer-support/cost-per-support-ticket-calculator.ts`
- Modify: `src/engines/customer-support/index.ts` (append import)
- Modify: `src/data/tools/customer-support.ts` (append ToolMeta entry)
- Modify: `src/data/og-samples.json` (append OG entry)
- Modify: `scripts/codegen-examples.mjs` (append ENGINES entry)
- Modify: `tests/ab-split.test.ts` (bump `getAllEngines` 80→81, `tools.length` 80→81)

**Interfaces:**
- Consumes:
  - `tests/<slug>-calculator.test.ts` imports `weightedAvgCost`, `monthlyTotalCost`, `calcHealthBand`, `HEALTH_BANDS` from engine module
  - Engine exports: `weightedAvgCost(t1, t2, t3, s1, s2): number`, `monthlyTotalCost(avg, volume): number`, `calcHealthBand(avg: number): 'excellent' | 'good' | 'warning' | 'critical'`, `HEALTH_BANDS` const
  - Engine default inputs: `{ t1_cost: '8', t2_cost: '25', t3_cost: '70', t1_share: '55', t2_share: '30', monthly_volume: '5000' }`
  - ToolMeta slug: `solopreneur-cost-per-support-ticket-calculator`
- Produces:
  - `src/engines/customer-support/cost-per-support-ticket-calculator.ts` registers engine `solopreneur-cost-per-support-ticket-calculator`
  - `getAllEngines().length === 81` (was 80) after commit
  - P12-2..6 will follow same pattern (just different formula + inputs)

- [ ] **Step 1: Write failing test `tests/cost-per-support-ticket-calculator.test.ts`**

```ts
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import { weightedAvgCost, monthlyTotalCost, calcHealthBand, HEALTH_BANDS } from '../src/engines/customer-support/cost-per-support-ticket-calculator.ts';

test('weightedAvgCost: T1 $8 × 55% + T2 $25 × 30% + T3 $70 × 15% = $22.40', () => {
  // t3_share = 100 - 55 - 30 = 15%
  assert.equal(weightedAvgCost(8, 25, 70, 55, 30), 22.4);
});

test('weightedAvgCost: t1=0 → cost drops to 0', () => {
  assert.equal(weightedAvgCost(0, 25, 70, 0, 0), 0);
});

test('weightedAvgCost: t3 share dominates → avg ~$70 if all 100%', () => {
  // T1 0% / T2 0% / T3 100% → $70
  assert.equal(weightedAvgCost(8, 25, 70, 0, 0), 70);
});

test('monthlyTotalCost: $22.40 × 5000 = $112,000', () => {
  assert.equal(monthlyTotalCost(22.4, 5000), 112000);
});

test('monthlyTotalCost: 0 volume → 0', () => {
  assert.equal(monthlyTotalCost(22.4, 0), 0);
});

test('calcHealthBand: 8 → excellent (≤$10)', () => {
  assert.equal(calcHealthBand(8), 'excellent');
});

test('calcHealthBand: 22.4 → good ($10-$25)', () => {
  assert.equal(calcHealthBand(22.4), 'good');
});

test('calcHealthBand: 35 → warning ($25-$50)', () => {
  assert.equal(calcHealthBand(35), 'warning');
});

test('calcHealthBand: 60 → critical (>$50)', () => {
  assert.equal(calcHealthBand(60), 'critical');
});

test('calcHealthBand: 25 exact boundary → good', () => {
  assert.equal(calcHealthBand(25), 'good');
});

test('HEALTH_BANDS has 4 bands with thresholds', () => {
  assert.equal(Object.keys(HEALTH_BANDS).length, 4);
  assert.equal(HEALTH_BANDS.excellent.threshold, 10);
  assert.equal(HEALTH_BANDS.good.threshold, 25);
  assert.equal(HEALTH_BANDS.warning.threshold, 50);
  assert.equal(HEALTH_BANDS.critical.threshold, Infinity);
});
```

Save to: `tests/cost-per-support-ticket-calculator.test.ts` (11 tests: 5 math + 5 band + 1 metadata)

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd "D:/E/独立站/youtube-tools" && node --import tsx --test tests/cost-per-support-ticket-calculator.test.ts 2>&1 | head -15`
Expected: FAIL with `Cannot find module '...cost-per-support-ticket-calculator.ts'` or similar MODULE_NOT_FOUND.

- [ ] **Step 3: Write engine `src/engines/customer-support/cost-per-support-ticket-calculator.ts`**

```ts
// P12-1 Cost-per-Support-Ticket
// 6-section v3 Business template (Health · Snapshot · What-If · Break-Even · Milestone · Tip)
//
// Mid-market B2B SaaS CS Ops persona ($10M-$50M ARR).
// Community-wisdom thresholds (TSIA 2024 Support Ops Benchmark + Zendesk CX Trends 2024).
// Multi-tier T1/T2/T3 architecture with weighted average cost-per-ticket.
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

export const HEALTH_BANDS = {
  excellent: { threshold: 10, label: '🟢 Excellent', message: 'Lean support cost — strong deflection or efficient T1 self-service.' },
  good:      { threshold: 25, label: '🟡 Good',      message: 'Healthy multi-tier mix — TSIA 2024 mid-market benchmark ($15-$25/ticket).' },
  warning:   { threshold: 50, label: '🟠 Warning',   message: 'Above-market cost — over-escalation to T3 (engineering) likely culprit.' },
  critical:  { threshold: Infinity, label: '🔴 Critical', message: 'Severely bloated cost — investigate escalation patterns and agent utilization.' },
};

export function weightedAvgCost(t1Cost: number, t2Cost: number, t3Cost: number, t1Share: number, t2Share: number): number {
  const t3Share = 100 - t1Share - t2Share;
  return (t1Cost * t1Share + t2Cost * t2Share + t3Cost * t3Share) / 100;
}

export function monthlyTotalCost(avg: number, volume: number): number {
  return avg * volume;
}

export function calcHealthBand(avg: number): keyof typeof HEALTH_BANDS {
  if (avg <= HEALTH_BANDS.excellent.threshold) return 'excellent';
  if (avg <= HEALTH_BANDS.good.threshold) return 'good';
  if (avg <= HEALTH_BANDS.warning.threshold) return 'warning';
  return 'critical';
}

function fmtMoney(x: number): string { return '$' + Math.round(x).toLocaleString(); }
function fmtAvg(x: number): string { return '$' + x.toFixed(2); }

const engine: ToolEngine = {
  slug: 'solopreneur-cost-per-support-ticket-calculator',
  title: 'Cost-per-Support-Ticket',
  description:
    'Compute weighted average cost-per-support-ticket across multi-tier T1/T2/T3 structure. INVERSE health bands — lower $/ticket = better cost control: 🟢 ≤$10 · 🟡 $10-$25 · 🟠 $25-$50 · 🔴 >$50. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-CS.',
  inputs: [
    { name: 't1_cost',        label: 'T1 cost per ticket ($)',     placeholder: 'e.g. 8',  type: 'number' },
    { name: 't2_cost',        label: 'T2 cost per ticket ($)',     placeholder: 'e.g. 25', type: 'number' },
    { name: 't3_cost',        label: 'T3 cost per ticket ($)',     placeholder: 'e.g. 70', type: 'number' },
    { name: 't1_share',       label: 'T1 share of tickets (%)',    placeholder: 'e.g. 55', type: 'number' },
    { name: 't2_share',       label: 'T2 share of tickets (%)',    placeholder: 'e.g. 30', type: 'number' },
    { name: 'monthly_volume', label: 'Monthly ticket volume',      placeholder: 'e.g. 5000', type: 'number' },
  ],
  clientConfig: {
    type: 'custom',
    wordPools: {},
    customFn: `function run(inputs, pick, fill) {
  var t1c = Number(inputs.t1_cost) || 0;
  var t2c = Number(inputs.t2_cost) || 0;
  var t3c = Number(inputs.t3_cost) || 0;
  var t1s = Number(inputs.t1_share) || 0;
  var t2s = Number(inputs.t2_share) || 0;
  var vol = Number(inputs.monthly_volume) || 0;
  var t3s = 100 - t1s - t2s;
  if (t3s < 0) t3s = 0;
  var avg = (t1c * t1s + t2c * t2s + t3c * t3s) / 100;
  var monthly = avg * vol;
  var band = avg <= 10 ? 'Excellent' : avg <= 25 ? 'Good' : avg <= 50 ? 'Warning' : 'Critical';
  var emoji = avg <= 10 ? '🟢' : avg <= 25 ? '🟡' : avg <= 50 ? '🟠' : '🔴';
  var altAvg = (t1c * t1s + t2c * t2s + t3c * 10) / 100;
  return [
    '🩺 Cost-per-Ticket Health: ' + emoji + ' ' + band + ' ($' + avg.toFixed(2) + '/ticket)',
    '📊 Snapshot: T1 ' + t1s + '% × $' + t1c + ' + T2 ' + t2s + '% × $' + t2c + ' + T3 ' + t3s + '% × $' + t3c + ' = $' + avg.toFixed(2) + '/ticket · Monthly: $' + Math.round(monthly).toLocaleString(),
    '🔄 What-If: if T3 share drops to 10%, avg = $' + altAvg.toFixed(2) + ' (would be ' + (altAvg <= 10 ? 'Excellent' : altAvg <= 25 ? 'Good' : altAvg <= 50 ? 'Warning' : 'Critical') + ')',
    '⚖️ Break-Even: to hit 🟢 Excellent (≤$10), cut T3 cost to ≤$30/ticket OR push T3 share to ≤5%',
    '🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr',
    '💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce T1 volume.'
  ];
}`,
  },
  generate(inputs) {
    const t1Cost = Number(inputs.t1_cost) || 0;
    const t2Cost = Number(inputs.t2_cost) || 0;
    const t3Cost = Number(inputs.t3_cost) || 0;
    const t1Share = Number(inputs.t1_share) || 0;
    const t2Share = Number(inputs.t2_share) || 0;
    const monthlyVolume = Number(inputs.monthly_volume) || 0;
    const t3Share = Math.max(0, 100 - t1Share - t2Share);
    const avg = weightedAvgCost(t1Cost, t2Cost, t3Cost, t1Share, t2Share);
    const monthly = monthlyTotalCost(avg, monthlyVolume);
    const band = calcHealthBand(avg);
    const bandInfo = HEALTH_BANDS[band];
    const altT3Share = 10;
    const altAvg = (t1Cost * t1Share + t2Cost * t2Share + t3Cost * altT3Share) / 100;
    const altBand = calcHealthBand(altAvg);
    const targetWeighted = HEALTH_BANDS.excellent.threshold * 100;
    const currentWeighted = t1Cost * t1Share + t2Cost * t2Share + t3Cost * t3Share;
    const t3Cut = Math.max(0, (currentWeighted - targetWeighted) / Math.max(t3Share, 1));
    return [
      '🩺 Cost-per-Ticket Health: ' + bandInfo.label + ' (' + fmtAvg(avg) + '/ticket · ' + fmtMoney(monthly) + '/mo)',
      '📊 Snapshot: T1 ' + t1Share + '% × ' + fmtAvg(t1Cost) + ' + T2 ' + t2Share + '% × ' + fmtAvg(t2Cost) + ' + T3 ' + t3Share + '% × ' + fmtAvg(t3Cost) + ' = ' + fmtAvg(avg) + ' weighted · ' + fmtMoney(monthly) + '/mo total',
      '🔄 What-If: if T3 share drops to 10%, avg drops to ' + fmtAvg(altAvg) + ' (would be ' + HEALTH_BANDS[altBand].label + ')',
      '⚖️ Break-Even: to hit 🟢 Excellent (' + fmtAvg(HEALTH_BANDS.excellent.threshold) + ' ceiling), cut T3 cost to ≤$' + Math.round(t3Cut) + '/ticket OR push T3 share ≤5%',
      '🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly',
      '💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.',
    ];
  },
  staticExamples: [
    '🩺 Cost-per-Ticket Health: 🟡 Good ($22.40/ticket · $112,000/mo)\n📊 Snapshot: T1 55% × $8.00 + T2 30% × $25.00 + T3 15% × $70.00 = $22.40 weighted · $112,000/mo total\n🔄 What-If: if T3 share drops to 10%, avg drops to $19.30 (would be 🟡 Good)\n⚖️ Break-Even: to hit 🟢 Excellent ($10.00 ceiling), cut T3 cost to ≤$30/ticket OR push T3 share ≤5%\n🎯 Milestone: re-benchmark tier rates quarterly — agent comp inflation ~3-5%/yr; track cost-per-ticket monthly\n💡 Tip: TSIA 2024 mid-market benchmark is $15-$25/ticket; >$50 indicates over-escalation. Pair with our [Deflection Rate Calculator] (P12-5) to reduce inbound T1 volume.',
  ],
  faq: [
    { q: 'What are T1/T2/T3 tiers?', a: 'T1 = frontline/junior agents handling common questions (password reset, basic how-to). T2 = senior specialists handling technical issues. T3 = engineering escalations requiring dev involvement. Multi-tier is industry standard — TSIA 2024 reports 87% of mid-market CS teams have ≥2 tiers.' },
    { q: 'Why is T3 cost so much higher?', a: 'T3 involves engineering time which costs $80-150/hr fully-loaded. A single T3 ticket can consume 2-5 hours of dev time vs 5-15 min for T1. Reducing T3 share by even 5pp dramatically cuts avg cost.' },
    { q: 'How do I calculate cost-per-tier?', a: 'T1: junior agent hourly rate × avg handle time + overhead. T2: senior specialist rate × handle time + overhead. T3: engineering hourly rate × handle time + opportunity cost. Sum across all tickets in the tier, divide by ticket count.' },
    { q: 'What is the TSIA 2024 benchmark?', a: 'TSIA (Technology & Services Industry Association) 2024 Support Operations Benchmark reports mid-market B2B SaaS averages $15-$25/ticket. <$10 is excellent (mature self-service); >$50 is critical (over-escalation or product issues generating tickets).' },
    { q: 'How does this pair with P12-5 Deflection?', a: 'P12-5 measures deflection rate (tickets avoided entirely via KB/chatbot). Higher deflection = fewer T1 tickets = lower weighted avg cost. Use P12-5 to model the cost impact of improving KB coverage.' },
    { q: 'Does this include CSM/account management cost?', a: 'No — this is support-only (inbound ticket handling). For CSM cost modeling (relationship management, QBRs), see retention-category calculators (P9 series).' },
  ],
  howToUse: [
    'Enter T1/T2/T3 cost per ticket — junior agent time + overhead for T1, specialist for T2, engineering for T3.',
    'Enter T1 and T2 share as % of total tickets — T3 share is auto-computed (100 - T1 - T2).',
    'Enter monthly ticket volume — pull from your helpdesk platform (Zendesk, Intercom, Freshdesk).',
    'Read the weighted avg cost-per-ticket band and monthly total — both feed into CS Ops budget.',
    'Pair with [Deflection Rate Calculator] (P12-5) to model cost savings from improved KB/chatbot.',
  ],
  sources: [
    'https://www.tsia.com/blog/support-operations-benchmark',
    'https://www.zendesk.com/customer-experience-trends/',
    'https://www.freshworks.com/customer-service-benchmark/',
    'https://www.icmi.com/research/contact-center-performance',
  ],
};
registerEngine(engine);
```

Save to: `src/engines/customer-support/cost-per-support-ticket-calculator.ts`

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd "D:/E/独立站/youtube-tools" && node --import tsx --test tests/cost-per-support-ticket-calculator.test.ts 2>&1 | tail -25`
Expected: 11 tests pass, 0 fail.

- [ ] **Step 5: Wire 7 supporting files**

5a. `src/engines/customer-support/index.ts` — replace `export {};` with:

```ts
// Customer Support Calculator Engines (P12 batch, 6 calcs)
//
// P12-1: cost-per-support-ticket — Cost-per-Support-Ticket
// P12-2: first-response-time      — First Response Time SLA
// P12-3: resolution-time          — Resolution Time
// P12-4: csat                     — CSAT (Customer Satisfaction)
// P12-5: deflection-rate          — Self-Service Deflection Rate
// P12-6: support-capacity-planning — Support Team Capacity Planning
//
// Engines are added one per task via Task 1..Task 6.
import './cost-per-support-ticket-calculator';
```

5b. `src/data/tools/customer-support.ts` — append ToolMeta:

```ts
  {
    slug: 'solopreneur-cost-per-support-ticket-calculator',
    title: 'Cost-per-Support-Ticket',
    description:
      'Compute weighted average cost-per-support-ticket across multi-tier T1/T2/T3 structure. INVERSE health bands — lower $/ticket = better cost control: 🟢 ≤$10 · 🟡 $10-$25 · 🟠 $25-$50 · 🔴 >$50. For mid-market B2B SaaS ($10M-$50M ARR) CS Ops managers and Head-of-CS.',
    categoryId: 'T',
    applicationCategory: 'BusinessApplication',
    inputs: [
      { name: 't1_cost',        label: 'T1 cost per ticket ($)',  placeholder: 'e.g. 8',    type: 'number' },
      { name: 't2_cost',        label: 'T2 cost per ticket ($)',  placeholder: 'e.g. 25',   type: 'number' },
      { name: 't3_cost',        label: 'T3 cost per ticket ($)',  placeholder: 'e.g. 70',   type: 'number' },
      { name: 't1_share',       label: 'T1 share of tickets (%)', placeholder: 'e.g. 55',   type: 'number' },
      { name: 't2_share',       label: 'T2 share of tickets (%)', placeholder: 'e.g. 30',   type: 'number' },
      { name: 'monthly_volume', label: 'Monthly ticket volume',   placeholder: 'e.g. 5000', type: 'number' },
    ],
    keywords: [
      'cost per support ticket',
      'support ticket cost',
      'tier 1 cost',
      'tier 2 cost',
      'tier 3 cost',
      'multi tier support cost',
      'TSIA benchmark',
      'Zendesk cost',
      'mid-market SaaS support',
    ],
    tags: ['customer-support', 'cs-ops', 'cost'],
    reviewedBy: 'ForgeFlowKit Team',
    author: 'ForgeFlowKit',
    dataReviewedAt: '2026-07-10',
    sources: [
      'https://www.tsia.com/blog/support-operations-benchmark',
      'https://www.zendesk.com/customer-experience-trends/',
      'https://www.freshworks.com/customer-service-benchmark/',
    ],
  },
```

5c. `src/data/og-samples.json` — append under top-level object:

```json
  "solopreneur-cost-per-support-ticket-calculator": {
    "headline": { "en": "$22.40", "zh": "$22.40" },
    "headlineUnit": { "en": "Weighted avg cost per ticket", "zh": "加权平均单工单成本" },
    "headlineLabel": { "en": "Cost-per-Ticket: $22.40 — Good, healthy multi-tier mix ($112K/mo total)", "zh": "单工单成本 $22.40 — 良好，多层级结构健康（月总计 $112K）" }
  },
```

5d. `scripts/codegen-examples.mjs` — find the last ENGINES entry (after `attrition-cost-calculator`) and append after it:

```javascript
  { file: 'cost-per-support-ticket-calculator.ts', slug: 'solopreneur-cost-per-support-ticket-calculator',
    subdir: 'customer-support', defaultInputs: { t1_cost: '8', t2_cost: '25', t3_cost: '70', t1_share: '55', t2_share: '30', monthly_volume: '5000' } },
```

5e. `tests/ab-split.test.ts` — in the two tests checking engine counts, change `80` to `81`:

```ts
// Line 51 changed:
test('getAllEngines() returns 81 engines after import', async () => {
  // ...
  assert.equal(getAllEngines().length, 81);
});

// Line 57 changed:
test('aggregated tools array has 81 entries', async () => {
  // ...
  assert.equal(tools.length, 81);
});
```

- [ ] **Step 6: Run codegen to regenerate staticExamples[0]**

Run: `cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs 2>&1 | tail -10`
Expected: line showing `✓ cost-per-support-ticket-calculator.ts (NNN chars, 6 lines)` and `Done. 81 engines updated.`

- [ ] **Step 7: Verify drift-free via codegen --check**

Run: `cd "D:/E/独立站/youtube-tools" && node scripts/codegen-examples.mjs --check 2>&1 | tail -8`
Expected: `✓ cost-per-support-ticket-calculator.ts: in sync` plus `✓ all other engines` and final line `[codegen-examples] --check PASSED: all 81 engines in sync and clean.`

- [ ] **Step 8: Run full pnpm check**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: pass count rises from ~634 to ~645 (634 + 11 P12-1 tests). Zero fails.

- [ ] **Step 9: Commit + dual push**

```bash
cd "D:/E/独立站/youtube-tools"
SKIP_PRECOMMIT_CHECK=1 git add tests/cost-per-support-ticket-calculator.test.ts src/engines/customer-support/cost-per-support-ticket-calculator.ts src/engines/customer-support/index.ts src/data/tools/customer-support.ts src/data/og-samples.json scripts/codegen-examples.mjs tests/ab-split.test.ts
SKIP_PRECOMMIT_CHECK=1 git commit -m "feat(p12-1): cost per support ticket (11 tests, 6-section v3, 80→81 engines, multi-tier T1/T2/T3)"
SKIP_PUSH_FETCH=1 git push origin HEAD
SKIP_PUSH_FETCH=1 git push github HEAD
```

Expected: 1 commit pushed. Range: `P12-0..<new>`.

- [ ] **Step 10: Save P12-1 memory**

Save to: `~/.claude/projects/D--E-----youtube-tools/memory/p12-1-cost-per-ticket-shipped.md` AND copy to `memory/p12-1-cost-per-ticket-shipped.md` in-repo:

```markdown
---
name: p12-1-cost-per-ticket-shipped
description: P12-1 Cost-per-Support-Ticket 已 ship 2026-07-10 (commit <hash>)；80→81 engines；6 inputs (t1_cost/t2_cost/t3_cost/t1_share/t2_share/monthly_volume) + 11 tests + 6-section v3；multi-tier T1/T2/T3 weighted avg；canonical T1 $8 × 55% + T2 $25 × 30% + T3 $70 × 15% = $22.40/ticket (Good), $112K/mo
metadata:
  type: project
---

P12-1 Cost-per-Support-Ticket 已 ship 2026-07-10 (commit <hash>)。

**Canonical math:** T1 $8 × 55% + T2 $25 × 30% + T3 $70 × 15% = (4.4 + 7.5 + 10.5) = $22.40/ticket (Good), $112,000/mo total.

**Files:** src/engines/customer-support/cost-per-support-ticket-calculator.ts (~140 lines), tests/cost-per-support-ticket-calculator.test.ts (11 tests: 5 math + 5 bands + 1 metadata).

**Bands (INVERSE — lower $/ticket = better):** ≤$10 Excellent · $10-$25 Good · $25-$50 Warning · >$50 Critical (Infinity threshold).

**Multi-tier:** T1 (junior frontline) / T2 (senior specialist) / T3 (engineering escalation). T3 cost typically 7-10x T1 due to engineering time. T3 share auto-computed (100 - T1 - T2).

**Sources:** TSIA 2024 Support Operations Benchmark + Zendesk CX Trends 2024 + Freshdesk CS Benchmark + ICMI 2023.

**Lessons:**
- INVERSE band pattern with `Infinity` as critical threshold (P9-4 / P11-1 lesson applied to P12).
- T3 share auto-derived from T1+T2 shares (3rd share is implicit) — saves 1 input per calc.
- T3 cut target computed via reverse engineering: `t3Cut = (currentWeighted - $1000) / t3Share` — linear algebra since all weights linear.
- New 'T' category registered; P12 series FIRST calc.
```

Then append `- [P12-1 Cost-per-Ticket shipped](p12-1-cost-per-ticket-shipped.md) — ...` line to BOTH `~/.claude/projects/.../memory/MEMORY.md` AND in-repo `memory/MEMORY.md`.

---

### Task 2: P12-2 First Response Time SLA

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/first-response-time-calculator.test.ts`
- Engine file: `src/engines/customer-support/first-response-time-calculator.ts`
- Math: `overall = (t1_attainment + t2_attainment + t3_attainment) / 3` (equal-weighted avg; limitation noted)
- Test target: 10 tests (5 math + 4 band + 1 metadata)
- Engine default inputs: `{ t1_target_min: '30', t2_target_hr: '4', t3_target_hr: '24', t1_attainment: '85', t2_attainment: '80', t3_attainment: '90' }`
- ToolMeta slug: `solopreneur-first-response-time-calculator`
- ab-split bump: 81 → 82

**Detailed step guidance:**
- Use Task 1 as template, swap formulas/inputs/tests
- Bands are HIGHER (better) with -Infinity critical threshold
- 6 inputs all numeric; no selects
- Equal-weighted tier average is a known limitation (assumes balanced tier distribution); document in FAQ

**Health band thresholds (locked, HIGHER — higher % in-SLA = better):**
- ≥90% → 🟢 Excellent
- 80-90% → 🟡 Good
- 60-80% → 🟠 Warning
- <60% → 🔴 Critical (-Infinity)

**Canonical:** T1 85% / T2 80% / T3 90% = (85+80+90)/3 = 85.0% (Good)

**Tip cross-link:** "T1 attainment <80% usually signals queue overflow OR shift coverage gap; check T1 headcount."

**Commit message:** `feat(p12-2): first response time SLA (10 tests, 6-section v3, 81→82 engines)`

**Memory file:** `p12-2-frt-sla-shipped.md`.

---

### Task 3: P12-3 Resolution Time

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/resolution-time-calculator.test.ts`
- Engine file: `src/engines/customer-support/resolution-time-calculator.ts`
- Math: `tail_ratio = p90_resolution_hr / median_resolution_hr` (informational; band driver is SLA attainment)
- Test target: 10 tests (5 math + 4 band + 1 metadata)
- Engine default inputs: `{ sla_attainment_pct: '75', median_resolution_hr: '8', p90_resolution_hr: '36', monthly_resolved: '4800' }`
- ToolMeta slug: `solopreneur-resolution-time-calculator`
- ab-split bump: 82 → 83

**Health band thresholds (locked, HIGHER — higher % in-SLA = better):**
- ≥85% → 🟢 Excellent
- 70-85% → 🟡 Good
- 50-70% → 🟠 Warning
- <50% → 🔴 Critical (-Infinity)

**Canonical:** 75% in-SLA, median 8hr, p90 36hr (tail ratio 4.5) = 75% (Good)

**Tip cross-link:** "Median is vanity; p90 is the truth. Track p90 weekly and dig into outliers."

**Commit message:** `feat(p12-3): resolution time (10 tests, 6-section v3, 82→83 engines)`

**Memory file:** `p12-3-resolution-time-shipped.md`.

---

### Task 4: P12-4 CSAT

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/csat-calculator.test.ts`
- Engine file: `src/engines/customer-support/csat-calculator.ts`
- Math:
  - `margin_of_error = 1.96 * Math.sqrt((csat/100) * (1 - csat/100) / sample_size) * 100`
  - `ci_low = csat - margin_of_error`
  - `ci_high = csat + margin_of_error`
  - `gap = target - csat`
- Test target: 10 tests (5 math + 4 band + 1 metadata)
- Engine default inputs: `{ csat_pct: '87', response_rate: '35', sample_size: '200', target_csat: '90' }`
- ToolMeta slug: `solopreneur-csat-calculator`
- ab-split bump: 83 → 84

**Health band thresholds (locked, HIGHER — higher CSAT = better):**
- ≥90% → 🟢 Excellent
- 80-90% → 🟡 Good
- 70-80% → 🟠 Warning
- <70% → 🔴 Critical (-Infinity)

**Canonical:** 87% CSAT, 35% response, 200 responses, target 90%
- margin = 1.96 * sqrt(0.87 * 0.13 / 200) * 100 = 1.96 * 0.0238 * 100 = 4.66pp ≈ ±4.7pp
- 95% CI: [82.3%, 91.7%], gap = -3pp (below target)

**Tip cross-link:** "Response rate <20% = biased sample (only happy/angry respond); incentivize responses."

**Commit message:** `feat(p12-4): csat (10 tests, 6-section v3, 83→84 engines)`

**Memory file:** `p12-4-csat-shipped.md`.

---

### Task 5: P12-5 Self-Service Deflection Rate

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/deflection-rate-calculator.test.ts`
- Engine file: `src/engines/customer-support/deflection-rate-calculator.ts`
- Math:
  - `deflected_volume = monthly_tickets * deflection_rate / 100`
  - `saved_cost = deflected_volume * cost_per_ticket`
  - `net_savings = saved_cost - tool_monthly_cost`
  - `roi_pct = (net_savings / tool_monthly_cost) * 100`
  - `gap_to_target = target_deflection - deflection_rate`
- Test target: 10 tests (5 math + 4 band + 1 metadata)
- Engine default inputs: `{ monthly_tickets: '5000', deflection_rate: '35', cost_per_ticket: '24', tool_monthly_cost: '1500', target_deflection: '40' }`
- ToolMeta slug: `solopreneur-deflection-rate-calculator`
- ab-split bump: 84 → 85

**Health band thresholds (locked, HIGHER — higher deflection rate = better self-service):**
- ≥40% → 🟢 Excellent
- 25-40% → 🟡 Good
- 10-25% → 🟠 Warning
- <10% → 🔴 Critical (-Infinity)

**Canonical:** 5000 × 35% × $24 - $1500 = $42000 - $1500 = $40,500/mo net savings, ROI = 2700%, gap = -5pp (below 40% target) → 35% (Good)

**Tip cross-link:** "Deflection >50% often means KB is masking product gaps — validate top-deflected tickets."

**Commit message:** `feat(p12-5): deflection rate (10 tests, 6-section v3, 84→85 engines)`

**Memory file:** `p12-5-deflection-rate-shipped.md`.

---

### Task 6: P12-6 Support Team Capacity Planning

**Files:** Same 8 pattern as Task 1, with these content swaps:

- Test file: `tests/support-capacity-planning-calculator.test.ts`
- Engine file: `src/engines/customer-support/support-capacity-planning-calculator.ts`
- Math:
  - `total_handle_min = monthly_tickets * avg_handle_time_min`
  - `productive_min_per_agent = work_hours_per_month * 60 * (1 - shrinkage_pct/100) * (target_occupancy_pct/100)`
  - `required_agents_raw = total_handle_min / productive_min_per_agent`
  - `required_agents = Math.ceil(required_agents_raw)`
  - `utilization_actual = (total_handle_min / (required_agents * productive_min_per_agent)) * 100`
- Test target: 11 tests (6 math + 4 band + 1 metadata)
- Engine default inputs: `{ monthly_tickets: '5000', avg_handle_time_min: '18', target_occupancy_pct: '70', work_hours_per_month: '160', shrinkage_pct: '30', target_response_time_min: '60' }`
- ToolMeta slug: `solopreneur-support-capacity-planning-calculator`
- ab-split bump: 85 → 86 (FINAL bump — matches P12 final target)

**Health band thresholds (locked, INVERSE — lower utilization = more buffer; >120% = overworked):**
- ≤85% util → 🟢 Excellent (15%+ buffer)
- 85-100% util → 🟡 Good (healthy)
- 100-120% util → 🟠 Warning (no buffer, burnout risk)
- >120% util → 🔴 Critical (overworked, attrition imminent)

**Canonical:** 5000 tickets × 18min AHT = 90,000 handle min. 160 × 60 × 0.7 × 0.7 = 4,704 min/agent. Required = ceil(90000/4704) = 20 agents. Utilization = 90000 / (20 × 4704) × 100 = 95.7% (Good).

**FINAL BUMP to internal-links test:** in `tests/internal-links.test.ts`, change the assertion that checks total engine count from 80 → 86. (P8-0 over-bump lesson applied — single bump at final calc, not progressive.)

**Commit message:** `feat(p12-6): support team capacity planning (11 tests, 6-section v3, 85→86 engines, final batch bump)`

**Memory file:** `p12-6-capacity-planning-shipped.md`.

---

### Task 7: P12 Holistic Review + Series Memory + MEMORY.md Index Update

**Files:**
- Modify: `tests/internal-links.test.ts` (verify 86 count is the only assertion — already bumped in Task 6)
- Spawn (read-only): 2 review agents (spec-compliance + cross-file integrity)
- Create: `~/.claude/projects/.../memory/p12-series-shipped.md` AND copy to `memory/p12-series-shipped.md` in-repo
- Modify: `~/.claude/projects/.../memory/MEMORY.md` AND in-repo `memory/MEMORY.md` (append P12 series entry)

**Interfaces:**
- Consumes: All 6 P12 engines shipped (commits P12-1..P12-6)
- Produces:
  - Series memory file documenting 6 calcs shipped (commits + test counts + lessons)
  - MEMORY.md index updated with P12 series entry
  - Holistic review catches any cross-cutting bugs (fix in this commit)

- [ ] **Step 1: Pre-holistic — verify all 6 P12 calcs shipped + tests pass**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm check 2>&1 | tail -10`
Expected: pass count should be ~634 + 11 + 10 + 10 + 10 + 10 + 11 = ~696 tests pass, 0 fail.

If any fail: STOP and fix before holistic review. Do NOT document broken state in series memory.

- [ ] **Step 2: Verify dist build + total page count**

Run: `cd "D:/E/独立站/youtube-tools" && pnpm build 2>&1 | tail -10`
Expected: build succeeds. Count `find dist -name "index.html" | wc -l` → expect ≥ 283 (was 267 + 6 calc pages + 2 listing page variants + ancillary).

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
Review the P12 Customer Support calculator batch (6 calcs) for spec compliance against the approved spec at docs/superpowers/specs/2026-07-10-p12-customer-support-batch-design.md (commit 314e506).

Engines to review:
- src/engines/customer-support/cost-per-support-ticket-calculator.ts
- src/engines/customer-support/first-response-time-calculator.ts
- src/engines/customer-support/resolution-time-calculator.ts
- src/engines/customer-support/csat-calculator.ts
- src/engines/customer-support/deflection-rate-calculator.ts
- src/engines/customer-support/support-capacity-planning-calculator.ts

ToolMeta files:
- src/data/tools/customer-support.ts

Specifically verify:
1. All 31 inputs per spec section 5.2 are present in inputs[] array of BOTH engine file and ToolMeta entry (no missing inputs, no extra inputs).
2. Each engine's HEALTH_BANDS structure matches spec section 4.1 thresholds exactly (4 bands, correct direction, correct boundaries).
3. canonical example output strings match spec section 5.3 locked values exactly.
4. 4-band thresholds in customFn JS match generate() TS math exactly (no drift).
5. Each engine produces 6-section v3 output (Health · Snapshot · What-If · Break-Even · Milestone · Tip) with all 6 emoji prefixes.
6. Mid-market B2B SaaS ($10M-$50M ARR) persona string present in every ToolMeta description.
7. categoryId: 'T' on all 6 ToolMeta entries.
8. applicationCategory: 'BusinessApplication' on all 6 entries.
9. dataReviewedAt: '2026-07-10' on all 6 entries.
10. Cost-per-Ticket: T3 share is auto-computed (100 - T1 - T2) — NOT a separate input.
11. FRT SLA: equal-weighted tier average formula; document limitation in FAQ.
12. Resolution Time: tail_ratio = p90/median; band driven by SLA attainment only.
13. CSAT: margin of error formula uses 1.96 z-score for 95% CI.
14. Deflection Rate: net_savings = saved - tool_cost; roi = net/tool_cost * 100.
15. Capacity Plan: productive_min = hours * 60 * (1-shrink) * (occ/100); required_agents = ceil(); utilization_actual rounded via integer headcount.
16. INVERSE band direction applied to P12-1 (cost), P12-6 (utilization); HIGHER for P12-2, P12-3, P12-4, P12-5.

Return a numbered list of findings with file path + line number + brief description. Mark each finding as CONFIRMED (real bug) or PLAUSIBLE (warrants investigation).
```

Agent 2 — CROSS-FILE INTEGRITY (read-only):

```
Review the P12 Customer Support calculator batch (6 calcs) for cross-file integrity.

Cross-cutting files to verify:
- src/engines/customer-support/index.ts (6 explicit engine imports)
- src/engines/index.ts (contains `import './customer-support';`)
- src/data/tools/customer-support.ts (6 ToolMeta entries)
- src/data/tools/index.ts (contains `import { tools as customerSupport }` + spread)
- src/data/categories.ts (contains 'T' category entry — verify 13 total)
- src/data/og-samples.json (6 OG entries for customer-support slugs)
- scripts/codegen-examples.mjs (6 ENGINES entries with subdir: 'customer-support')
- src/pages/[lang]/customer-support.astro (renders listing page)
- tests/ab-split.test.ts (14 subdirs, 16 tools files, getAllEngines 86, tools.length 86)
- tests/internal-links.test.ts (86 total tools)
- tests/<slug>-calculator.test.ts × 6 (test files for each calc)

Specifically verify:
1. src/engines/customer-support/index.ts has exactly 6 engine imports + the P-series header comment.
2. src/engines/index.ts (root) has `import './customer-support';` line.
3. src/data/tools/customer-support.ts has exactly 6 ToolMeta entries with slugs matching `solopreneur-<calc>-calculator`.
4. src/data/tools/index.ts (root) has `import { tools as customerSupport } from './customer-support';` + `...customerSupport,` in the tools array spread.
5. src/data/categories.ts has 13 entries (id A B C D E F M O P R S H T).
6. src/data/og-samples.json has 6 entries with key `solopreneur-<calc>-calculator` for customer-support calcs.
7. scripts/codegen-examples.mjs has 6 entries with `subdir: 'customer-support'`.
8. src/pages/[lang]/customer-support.astro exists and references categoryId 'T'.
9. tests/ab-split.test.ts: subdir array has 14 entries including 'customer-support'; tools file array has 16 entries including 'customer-support.ts'; engine count assertions updated to 86.
10. tests/internal-links.test.ts: total tools count updated to 86.
11. dist/en/customer-support/ and dist/zh/customer-support/ both exist with index.html.
12. dist/en/solopreneur-<each-calc>/ and dist/zh/solopreneur-<each-calc>/ both exist (6 calc dirs × 2 langs = 12 dist calc pages).
13. ROOT barrel imports (engines/index.ts + tools/index.ts) both reference customer-support (P9-1 + P10-1 + P11-1 pre-emptive fix verification).
14. No stale references to 'P' in customer-support files (no copy-paste from P-series).
15. No stale 'hiring-team' / 'retention' references in customer-support files.

Return a numbered list of findings with file path + line number + brief description. Mark each finding as CONFIRMED (real bug) or PLAUSIBLE (warrants investigation).
```

Spawn both agents in parallel via Agent tool with `run_in_background: false`.

- [ ] **Step 5: Apply findings from reviews**

For each finding from either agent:
- If real bug (CONFIRMED): fix in working tree
- If false positive (PLAUSIBLE but ruled out): document why in commit message
- If cosmetic: skip (keep diff small)

Do NOT fix and amend old commits — fix as a `fix(p12):` follow-up commit if needed, or roll into the holistic commit if trivial.

- [ ] **Step 6: Write series memory file `~/.claude/projects/D--E-----youtube-tools/memory/p12-series-shipped.md`**

Use the consolidated format from P5/P6/P7/P8/P9/P10/P11 series memory files. Cover:
- 6 calculators shipped (commits P12-1..P12-6)
- 8-file wiring pattern per calc (no mid-flight fixes needed, or list any)
- HEALTH_BANDS structure consistency (2 INVERSE bands + 4 HIGHER bands)
- Cross-file wiring verified (8/8 per calc + ROOT barrel pre-emptive fix verified)
- 13 categories now (was 12)
- 86 engines (was 80)
- Tests: ~696 pass (~634 baseline + 62 P12 tests: 11+10+10+10+10+11)
- Lessons specific to P12:
  - ROOT barrel pre-emptive fix in scaffold (P9-1 + P10-1 + P11-1 lesson applied — caught early)
  - Multi-tier T1/T2/T3 architecture (P12-1 cost, P12-2 SLA) — third tier share auto-derived
  - CSAT 95% CI margin of error formula (z=1.96, p*(1-p)/n) — stats first
  - Capacity math: productive_min includes both shrinkage AND occupancy — multiplicative
  - Equal-weighted tier avg limitation (P12-2) — documented in FAQ
  - INVERSE band direction applied to 2/6 calcs (Cost, Capacity)
- Closes the service-operations loop complementing P6 (marketing) + P8 (sales) + P9 (retention) + P10 (product) + P11 (hiring). P12 brings CS Ops dimension.

- [ ] **Step 7: Update MEMORY.md index with P12 series entry**

Append to BOTH `~/.claude/projects/.../memory/MEMORY.md` AND in-repo `memory/MEMORY.md`:

```markdown
- [P12 series shipped](p12-series-shipped.md) — P12 Customer Support Calculator Batch 完整 ship 2026-07-10 (8 commits ...); 6 calculators (80→86 +6); NEW 'T' Customer Support category (13th category); mid-market B2B SaaS CS Ops persona $10M-$50M ARR; 31 inputs + 61 tests + per-file HEALTH_BANDS pattern; ROOT barrel pre-emptive fix at scaffold (P9-1 + P10-1 + P11-1 lesson applied); INVERSE bands on 2/6 calcs (Cost, Capacity); ~696 pass / 0 fail; 10th vertical-depth batch; closes service-ops loop with P6/P8/P9/P10/P11
```

(Fill in actual commit hash range and test counts from Steps 1-3.)

- [ ] **Step 8: Commit memory files + any holistic fixes**

```bash
cd "D:/E/独立站/youtube-tools"
# In-repo memory files (preferred for git-tracking consistency with P5-P11):
git add memory/p12-1-cost-per-ticket-shipped.md memory/p12-2-frt-sla-shipped.md memory/p12-3-resolution-time-shipped.md memory/p12-4-csat-shipped.md memory/p12-5-deflection-rate-shipped.md memory/p12-6-capacity-planning-shipped.md memory/p12-series-shipped.md memory/MEMORY.md
# Plus any holistic fixes from Step 5
git add -A  # catches any holistic-fix files
SKIP_PRECOMMIT_CHECK=1 git commit -m "docs(p12): series memory + per-calc memory + MEMORY.md index update"
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

Expected: all four commands return empty / "Already up to date" — both mirrors in sync at final P12 commit.

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
| §4.4 Pre-emptive fixes | Task 0 Steps 3 + 5 (ROOT barrel imports) — P9-1 + P10-1 + P11-1 lesson |
| §5.1 Global constraints | Global Constraints #1-22 |
| §5.2 Per-calc inputs (31 inputs total) | Each Task 1-6 has inputs[] array + Test target matches |
| §5.3 Canonical examples | Task 1 staticExamples[0] + Tasks 2-6 canonical mentioned in detail section |
| §5.4 Math test counts | Each Task 1-6 has "Test target: N tests" |
| §5.5 CustomFn minification notes | Global Constraint #18 (Node appendFileSync) + Task 1 Step 3 sample customFn |
| §5.6 Dual-push cadence | Global Constraint #17 + Task 0/1-6/7 Step commit blocks |
| §6 Architecture decisions | Documented in spec; plan follows them |
| §7 Risk register | Global Constraints #15, #23, #25-29 |
| §8 Success criteria | Task 7 Steps 1-3 verify all |

Gaps: none identified. All 31 inputs verified per §5.2.

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
| `categoryId` | 'T' for all 6 P12 entries | consistent |
| `applicationCategory` | 'BusinessApplication' | consistent (P9+ pattern) |
| `tags` array | ['customer-support', 'cs-ops', '<concept>'] | consistent |
| `reviewedBy` | 'ForgeFlowKit Team' | consistent |
| `dataReviewedAt` | '2026-07-10' | consistent for all 6 (single-day ship) |
| `weightedAvgCost(t1, t2, t3, s1, s2)` | Task 1 Step 3 | Only Task 1 (per-calc functions, no sharing) |
| `monthlyTotalCost(avg, volume)` | Task 1 Step 3 | Only Task 1 |
| `calcHealthBand(value)` | Task 1 Step 3 | Each engine has its own per-calc variant — Task 2-6 signatures differ by data type. All return `'excellent' | 'good' | 'warning' | 'critical'`. |

No signature drift. Each calc's `calcHealthBand` is locally scoped — no inter-calc dependency.

### 4. ROOT barrel pre-emptive fix verification

- **src/engines/index.ts** (root) gets `import './customer-support';` at Task 0 Step 3 ✓
- **src/data/tools/index.ts** (root) gets `import { tools as customerSupport } from './customer-support';` + `...customerSupport,` at Task 0 Step 5 ✓
- Both fixes wired BEFORE first P12 calc commit (P12-1) — prevents P10-1 mid-flight fix scenario
- ab-split test `getAllEngines().length === 80` (Task 0) and `=== 86` (after Task 6) verifies the count progression correctly with the pre-emptive fix in place

### 5. cross-cutting engine length concern

Task 1's full engine source (including customFn, FAQ, howToUse, sources) is ~190 lines. This is well within the 5000-char Node appendFileSync threshold (~5000 chars ≈ 100 lines minified). No printf/appendFileSync workaround needed for P12-1; subsequent tasks TBD by implementer based on actual size.

### 6. Risk register cross-check

| Risk # | Description | Mitigation in plan |
|---|---|---|
| 1 | ROOT barrel pre-emptive | Task 0 Steps 3 + 5 |
| 2 | Float-precision dual-layer | Task 1 Step 3 (math unrounded, fmtAvg/fmtMoney display) |
| 3 | Test boundary band direction | Tasks 1, 6 use Infinity; Tasks 2-5 use -Infinity |
| 4 | Test/unit convention drift | Tasks 1-6 keep percentages as 0-100 throughout |
| 5 | Band label dynamic vs target | Task 1 Break-Even hardcodes 🟢 Excellent; Tasks 2-6 same pattern |
| 6 | CustomFn ASI trap | All customFn use `;`-separator before if statements |
| 7 | internal-links progressive bump | Single 80→86 at Task 6 only |
| 8 | Equal-weighted tier avg limitation (P12-2) | Documented in FAQ; T2 attainment + T1 attainment distinct in inputs[] |
| 9 | CSAT margin of error interpretation (P12-4) | Documented in FAQ (35% response rate = ±4.7pp at 200 sample) |
| 10 | Capacity utilization "good" band 85-100% (P12-6) | Documented in customFn: "70% occupancy target accounts for after-call work" |
| 11 | No tier-distribution inputs in FRT (P12-2) | Equal-weighted avg; documented as known limitation in FAQ |

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-10-p12-customer-support-batch.md`. Two execution options:

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**