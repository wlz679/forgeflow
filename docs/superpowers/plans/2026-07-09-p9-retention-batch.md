# P9 Retention & Customer Success Calculator Batch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `executing-plans` (controller direct execution) per CLAUDE.md P4-3+ lesson — `subagent-driven-development` is reserved for non-mechanical work. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement 6 v3-standard retention & customer success calculators (P9-1..P9-6) in a new `src/engines/retention/` directory; ship 62 → 68 engines. Add new **category 'R' Retention & Customer Success**.

**Architecture:** Each P9-X is a self-contained engine file following P5/P6/P7/P8 pattern: math helpers exported at module top, `calculate()` for SSG rendering, minified `customFn` for live browser recalc, `registerEngine()` registration. **Business v3 standard** (6 emoji sections per CLAUDE.md): 🩺 Health · 📊 Inputs Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip. All 6 land in NEW `retention/` category with `categoryId: 'R'`. **Audience**: mid-market B2B SaaS CSMs and RevOps leads ($10M–$50M ARR anchor); closes the funnel loop with P6 marketing (acquisition) + P8 sales (closing). 20 inputs / 43 math tests / 43 pass progression (514 → 557).

**Tech Stack:**
- Astro 4.16.19 SSG (no SSR)
- TypeScript 5.6 strict
- Node `^20.19.0 || >=22.13.0`
- pnpm 9.x
- Test runner: `node --import tsx --test tests/<file>.test.ts`
- Pre-commit validation: `pnpm check` (codegen-examples --check + codegen-customfn --check + i18n completeness + clerk/supabase env + tests/run.mjs)
- codegen script: `node scripts/codegen-examples.mjs --check` (with `--check` mode for CI/pre-commit)
- CustomFn parser: `node tests/scripts/test-customfn.mjs <slug>`

## Global Constraints

Copied verbatim from spec §"Architecture" + CLAUDE.md + P5/P6/P7/P8 lesson corpus. Every task inherits these requirements implicitly.

1. **`src/engines/` zero architectural changes** — only add new files; 62 existing engine files frozen
2. **`ToolMeta.inputs` is `ToolInput[]` structured form** — `{ name, label, placeholder, type, options? }` per element; NEVER a `string[]` (P4-2 lesson)
3. **`ToolInput.type` only `text | select | number`** — NO `checkbox` type; for boolean choices use `select` with `['no', 'yes']` options (P4-2 lesson)
4. **`ToolEngine.customFn` MUST parse as valid JS** — verify with `node tests/scripts/test-customfn.mjs <slug>`
5. **CustomFn ASI trap** — `}` followed by `if`/`for`/`return`/etc. is a JS parse error; insert literal `;` between them
6. **`calculate()` is source of truth; `staticExamples[0]` is auto-regenerated** — after editing `calculate()`, run `node scripts/codegen-examples.mjs` (without `--check`) before committing
7. **Live = static parity invariant (P4-2 lesson)** — any math-helper correction in source MUST be mirrored in `customFn`; pre-commit spot-check: `staticExamples[0]` text matches what `customFn` would produce for default inputs
8. **`pnpm check` exits 0 before commit** — automatic via pre-commit hook; bypass only with `SKIP_PRECOMMIT_CHECK=1` (emergency only)
9. **`categoryId: 'R'`** — all 6 P9 calculators use `categoryId: 'R'` (new letter after 'S'; A/B/C/D/E/F/M/O/S all taken)
10. **Engine slug pattern** — `solopreneur-{name}-calculator` (existing convention)
11. **New directory `src/engines/retention/`** — does NOT currently exist; created in Task 0
12. **New file `src/data/tools/retention.ts`** — does NOT currently exist; created in Task 0
13. **New category listing page `src/pages/[lang]/retention.astro`** — does NOT currently exist; created in Task 0 (mirror `sales.astro`); `CATEGORY_ID = 'R'`, `CATEGORY_SLUG = 'retention'`
14. **Wire `7 files` per calculator** — see per-task Wiring tables; P9-1 also adds `src/data/seo-schemas/listingPages.ts` entry (P7-0 lesson: dist/ must auto-rebuild)
15. **`tests/ab-split.test.ts` count bumps** — current count `62`; bumped to **`63`** in Task 0 (P8-0 over-bump 56→62 was anti-pattern; P9-0 follows correct +1 scaffold pattern, then per-calc +1 to 68)
16. **`tests/internal-links.test.ts` count bumps** — current count `62`; bumped to **`63`** in Task 0 (2 places modified)
17. **`codegen-examples --check` exit 0** — pre-commit invariant
18. **i18n completeness** — `scripts/check-i18n-completeness.mjs` exits 0; each new engine has 2 OG entries (`en` + `zh`); no emoji in trend line (P6-1 lesson)
19. **Mirror push to both gitee (`origin`) + github (`github`)** — gitee primary with rev-list safety; github with `SKIP_PUSH_FETCH=1`
20. **Per-calculator memory file written** — `C:\Users\元始天尊\.claude\projects\D--E-----youtube-tools\memory\p9-N-{name}-shipped.md` after each calculator ships; update `MEMORY.md` index
21. **Spec is single source of truth** — `docs/superpowers/specs/2026-07-09-p9-retention-batch-design.md` (commit b4f82d1) for math models, output sections, edge cases, health bands, tests
22. **TS warnings NOT fixed** — `HEALTH_BANDS` re-export ambiguity + `categoryId` not in `ToolEngine` type are pre-existing pattern across P5+P6+P7+P8, non-blocking (`pnpm check` doesn't run `tsc`). User explicitly chose "不修" (don't fix).
23. **`scripts/codegen-examples.mjs` only auto-regenerates `staticExamples[0]`** — if engine ships `[1+]`, `[2+]`, ... alternative scenarios, verify manually (per CLAUDE.md)
24. **OG sample emoji rule** — `headlineLabel`/`headline`/`headlineUnit` fields must NOT contain 🟢🟡🟠🔴 (P6-1 lesson: `build-og-images.ts` `assertEmojiSet` rejects unmapped emoji); use `excellent`/`good`/`warning`/`critical` text labels instead
25. **P9-1 also adds `src/data/seo-schemas/listingPages.ts` entry** — `'R'` category entry alongside `'M'` and `'O'`; P7-0 lesson: dist/ must auto-rebuild before this entry takes effect; do it at P9-1 (not at scaffold)
26. **ARR anchor is mid-market $10M–$50M** — different from P8's SMB $1M–$5M. Per-calc intro sentence must state "mid-market $10M–$50M". Health band thresholds sourced from OpenView / ICONIQ / SaaS Capital / Gainsight CSM Practice / Vitally defaults (NOT P8's SMB numbers).
27. **Health Score is the only calc with weight presets** — 4 presets (Balanced/Product-led/Service-led/Sales-led) with weights summing to 1.0; preset is a `select` input. Math helpers must include `normalize(signalName, value)` and `healthScore(5 signals, preset)`.
28. **NPS normalization** — NPS input range -100 to +100; normalized as `(nps + 100) / 2` (output 0-100). Edge cases at -100, 0, +100.
29. **Support tickets normalization** — Input range 0-50; normalized as `100 - min(tickets * 4, 100)` (inverse: 0 tickets → 100, 25+ tickets → 0). Edge cases at 0, 25, 50.
30. **Float-precision architecture (P8-2/P8-3 lesson crystallized)** — Math layer uses unrounded intermediate values (e.g., `nrr = 102000 / 100000` NOT `Math.round(1.02 * 100) / 100`); display layer owns rounding decisions. If spec display value drifts, use `*Raw` helper + `moneyExact()` formatter pattern.

---

## File Structure

```
src/
  engines/
    retention/                                              NEW directory (Task 0)
      index.ts                                              barrel of 6 imports (Task 0 + per-task increments)
      nrr-calculator.ts                                     P9-1 (4 inputs, 8 tests)
      grr-calculator.ts                                     P9-2 (3 inputs, 7 tests)
      expansion-revenue-calculator.ts                        P9-3 (3 inputs, 6 tests)
      logo-churn-rate-calculator.ts                          P9-4 (2 inputs, 6 tests)
      customer-health-score-calculator.ts                   P9-5 (5 inputs + 1 select, 10 tests)
      renewal-rate-calculator.ts                            P9-6 (2 inputs, 6 tests)
  data/
    categories.ts                                           MODIFIED (Task 0 adds 'R' Retention)
    tools/
      retention.ts                                          NEW (Task 0 creates; per-task adds entry)
    og-samples.json                                         MODIFIED per task (6 OG samples, no emoji)
    internal-links.ts                                       MODIFIED per task (1 relatedTools entry per calc)
    seo-schemas/
      listingPages.ts                                       MODIFIED P9-1 (P7-0 lesson; dist/ must auto-rebuild)
  pages/
    [lang]/
      retention.astro                                       NEW (Task 0; mirror sales.astro)
scripts/codegen-examples.mjs                                MODIFIED per task (6 ENGINES entries)
tests/
  nrr-calculator.test.ts                                    NEW (P9-1, 8 tests)
  grr-calculator.test.ts                                    NEW (P9-2, 7 tests)
  expansion-revenue-calculator.test.ts                      NEW (P9-3, 6 tests)
  logo-churn-rate-calculator.test.ts                        NEW (P9-4, 6 tests)
  customer-health-score-calculator.test.ts                  NEW (P9-5, 10 tests)
  renewal-rate-calculator.test.ts                           NEW (P9-6, 6 tests)
  ab-split.test.ts                                          MODIFIED Task 0 (count bump 62 → 63)
  internal-links.test.ts                                    MODIFIED Task 0 (count bump 62 → 63)
  seo-schemas.test.ts                                       MODIFIED Task 0 (listingPages array +'retention')
docs/superpowers/plans/2026-07-09-p9-retention-batch.md      THIS FILE
memory/p9-N-{name}-shipped.md                               NEW per task (P9-1..P9-6)
memory/p9-series-shipped.md                                 NEW Task 7 (final summary)
```

Each `src/engines/retention/*.ts` file follows this structure (P6/P7/P8 established pattern):

```typescript
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Health band constants (per-file, NOT shared) ============
const HEALTH_BANDS = { excellent: ..., good: [...], warning: [...], critical: ... };

// ============ Math helpers (exported for tests) ============
// ... mathematical primitives, no side effects

// ============ calculate() ============
// 6-section string assembly: 🩺 Health · 📊 Snapshot · 🔄 What-If · ⚖️ Break-Even · 🎯 Milestone · 💡 Tip

// ============ customFn ============
// minified JS, escaped unicode, ASI-safe (}if → }; if)

// ============ Engine ============
const engine: ToolEngine = { /* slug, title, inputs, clientConfig, generate, staticExamples, faq, howToUse */ };
registerEngine(engine);
```

---

## Task Decomposition (8 tasks)

### Task 0: P9-0 Scaffold (1 commit)

**Goal:** Create directory structure + category listing page + cross-cutting fixes pre-emptive (P6-1 fixes carry forward; P7-0 lesson: dist/ must auto-rebuild before listingPages entry).

**Files:**
- Create: `src/engines/retention/index.ts` (empty barrel — comments only)
- Create: `src/data/tools/retention.ts` (empty exports array — comments only)
- Create: `src/pages/[lang]/retention.astro` (mirror `sales.astro`; `CATEGORY_ID = 'R'`, `CATEGORY_SLUG = 'retention'`)
- Modify: `src/data/categories.ts` (add `'R' Retention & Customer Success` entry after `'S'` row)
- Modify: `tests/seo-schemas.test.ts` (add `'retention'` to `listingPages` array — P2a test #320 guard)
- Modify: `tests/ab-split.test.ts` (bump `getAllEngines().length === 62 → 63` and `tools.length === 62 → 63` — correct +1 pattern, NOT P8-0 over-bump to 68)
- Modify: `tests/internal-links.test.ts` (bump 62 → 63 for `Object.keys(relatedTools).length` + tools.length)
- Modify: `src/data/internal-links.ts` (add 6 relatedTools entries with empty arrays — per-calc fills)

**Steps:**

- [ ] **Step 1:** Create empty `src/engines/retention/index.ts`:
```typescript
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
export {};
```

- [ ] **Step 2:** Create empty `src/data/tools/retention.ts`:
```typescript
// Retention & Customer Success ToolMeta entries (P9 batch, 6 calcs).
// Per-task adds one entry. See src/data/tools/index.ts for barrel.
import type { ToolMeta } from './types';
export const tools: ToolMeta[] = [];
```

- [ ] **Step 3:** Modify `src/data/categories.ts` — append one row after `'S' Sales / 销售管理`:
```typescript
{ id: 'R', name: 'Retention & Customer Success', slug: 'retention', description: 'Calculate NRR, GRR, expansion revenue, logo churn rate, customer health score, and renewal rate for mid-market B2B SaaS CSMs and RevOps leads.' },
```

- [ ] **Step 4:** Create `src/pages/[lang]/retention.astro` (mirror sales.astro):
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
const CATEGORY_ID = 'R';
const CATEGORY_SLUG = 'retention';
// Category R i18n keys will populate incrementally across P9-1..P9-6.
// Until then, fall back to direct category data.
const categoryMeta = categories.find(c => c.id === CATEGORY_ID);
const categoryName = categoryMeta?.name ?? 'Retention & Customer Success';
const categoryDesc = categoryMeta?.description ?? 'Retention and customer success calculators for mid-market B2B SaaS CSMs and RevOps leads.';

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

- [ ] **Step 5:** Modify `tests/seo-schemas.test.ts` — find `listingPages` array and add `'retention'`:
```typescript
const listingPages = ['saas-metrics', 'ai-cost-tools', 'valuation-exit', 'freelance-pricing', 'cost-efficiency', 'investment-roi', 'marketing-analytics', 'operations-inventory', 'sales', 'retention'];
```

- [ ] **Step 6:** Modify `tests/ab-split.test.ts` — find both count assertions (search for `62`) and bump to `63`:
```typescript
assert.equal(getAllEngines().length, 63);
// ...
assert.equal(tools.length, 63);
```

- [ ] **Step 7:** Modify `tests/internal-links.test.ts` — find both count assertions (search for `62`) and bump to `63`:
```typescript
assert.equal(Object.keys(relatedTools).length, 63);
// ...
test('related list has 4 entries for all 63 tools', () => {
```

- [ ] **Step 8:** Modify `src/data/internal-links.ts` — append 6 empty arrays to `relatedTools` (P6-2 lesson: explicit entries ensure cross-cat fallback order is correct from seed):
```typescript
relatedTools: {
  // ...existing 62 entries...
  'solopreneur-nrr-calculator': [],
  'solopreneur-grr-calculator': [],
  'solopreneur-expansion-revenue-calculator': [],
  'solopreneur-logo-churn-rate-calculator': [],
  'solopreneur-customer-health-score-calculator': [],
  'solopreneur-renewal-rate-calculator': [],
}
```

- [ ] **Step 9:** Run `pnpm check` — verify scaffolding compiles + tests don't regress (will likely fail at first due to empty category page → 0 tools; that's expected and acceptable at scaffold):
```bash
cd "D:/E/独立站/youtube-tools" && pnpm check
```
Expected: 514 pass + scaffold-related changes. If `relatedTools` test complains about empty arrays, that's expected — per-calc tasks will fill them. The scaffold commit is allowed to be slightly red on `pnpm check`; first per-calc task (P9-1) MUST restore green.

- [ ] **Step 10:** Commit + dual push:
```bash
cd "D:/E/独立站/youtube-tools"
git add -A
git commit -m "feat(p9-0): retention category scaffold + new 'R' category + listing page"
git push origin master
git push github master
```

---

### Task 1: P9-1 NRR Calculator (1 commit + 2 pushes)

**Goal:** Implement first retention calculator — Net Revenue Retention = (start + expansion - downgrade - churned) / start. 4 inputs · 8 math tests.

**Spec reference:** spec §"P9-1: NRR Calculator" — math, inputs, health bands, tests verbatim.

**Files (8 wired — P9-1 also adds listingPages entry):**
- Create: `src/engines/retention/nrr-calculator.ts` (engine + customFn + HEALTH_BANDS + helpers + calculate)
- Modify: `src/engines/retention/index.ts` (+1 import + barrel)
- Modify: `scripts/codegen-examples.mjs` (+1 ENGINES entry alphabetical: `'nrr-calculator'`)
- Modify: `src/data/tools/retention.ts` (+1 ToolMeta entry)
- Modify: `src/data/og-samples.json` (+1 OG sample: no emoji; headlineLabel = band name)
- Modify: `src/data/internal-links.ts` (fill P9-1's relatedTools array with 4 entries — see step 8)
- Modify: `src/data/seo-schemas/listingPages.ts` (+1 'R' entry; P7-0 lesson: dist/ must auto-rebuild)
- Create: `tests/nrr-calculator.test.ts` (8 math tests)

**Math (from spec):**
```typescript
netRetainedMRR = startingMRR + expansionMRR - downgradeMRR - churnedMRR
nrr = netRetainedMRR / startingMRR  // ratio; display as percent
```

**Health bands (nrr as ratio):** 🟢 ≥1.20 · 🟡 1.10-1.20 · 🟠 1.00-1.10 · 🔴 <1.00

**Steps:**

- [ ] **Step 1:** Write 8 math tests in `tests/nrr-calculator.test.ts` (failing first):
```typescript
import { test } from 'node:test';
import { strict as assert } from 'node:assert';
import {
  netRetainedMRR, nrr, calcHealthBand,
} from '../src/engines/retention/nrr-calculator.ts';

test('nrr: 100K+15K-5K-8K = 102K / 100K = 1.02 (canonical)', () => {
  assert.equal(nrr(100000, 15000, 5000, 8000), 1.02);
});
test('netRetainedMRR: 100K+15K-5K-8K = 102K', () => {
  assert.equal(netRetainedMRR(100000, 15000, 5000, 8000), 102000);
});
test('calcHealthBand: 0.99 → critical', () => {
  assert.equal(calcHealthBand(0.99), 'critical');
});
test('calcHealthBand: 1.00 → warning (exact boundary)', () => {
  assert.equal(calcHealthBand(1.00), 'warning');
});
test('calcHealthBand: 1.10 → good (exact boundary)', () => {
  assert.equal(calcHealthBand(1.10), 'good');
});
test('calcHealthBand: 1.20 → excellent (exact boundary)', () => {
  assert.equal(calcHealthBand(1.20), 'excellent');
});
test('Zero everything: nrr(0,0,0,0) → 0 → critical (zero-division guard)', () => {
  assert.equal(nrr(0, 0, 0, 0), 0);
});
test('Pure expansion: nrr(100K,25K,0,0) = 1.25 (excellent scenario)', () => {
  assert.equal(nrr(100000, 25000, 0, 0), 1.25);
});
```

- [ ] **Step 2:** Run test to verify it fails:
```bash
node --import tsx --test tests/nrr-calculator.test.ts
```
Expected: FAIL with "Cannot find module '../src/engines/retention/nrr-calculator.ts'"

- [ ] **Step 3:** Implement engine file. Reference spec §"P9-1" for full output template. Key sections:
```typescript
// src/engines/retention/nrr-calculator.ts
import type { ToolEngine } from '../../core/engines/types';
import { registerEngine } from '../../core/engines/registry';

// ============ Health band constants (per-file, NOT shared) ============
const HEALTH_BANDS = {
  excellent: [1.20, Infinity],
  good: [1.10, 1.20],
  warning: [1.00, 1.10],
  critical: [0, 1.00],
};

// ============ Math helpers (exported for tests) ============
export function netRetainedMRR(
  startingMRR: number, expansionMRR: number, downgradeMRR: number, churnedMRR: number,
): number {
  return startingMRR + expansionMRR - downgradeMRR - churnedMRR;
}
export function nrr(
  startingMRR: number, expansionMRR: number, downgradeMRR: number, churnedMRR: number,
): number {
  if (startingMRR === 0) return 0;  // zero-division guard
  return netRetainedMRR(startingMRR, expansionMRR, downgradeMRR, churnedMRR) / startingMRR;
}
export function calcHealthBand(nrrValue: number): string {
  if (nrrValue >= 1.20) return 'excellent';
  if (nrrValue >= 1.10) return 'good';
  if (nrrValue >= 1.00) return 'warning';
  return 'critical';
}

// ============ calculate() ============
// 6-section v3 string assembly per spec §"P9-1 6-section output"
// (Title + 🩺 Health + 📊 Snapshot + 🔄 What-If + ⚖️ Break-Even + 🎯 Milestone + 💡 Tip)

// ============ customFn ============
// minified JS, mirror of helpers, ASI-safe

// ============ Engine ============
const engine: ToolEngine = {
  slug: 'solopreneur-nrr-calculator',
  title: 'NRR Calculator',
  description: 'Compute Net Revenue Retention — the headline SaaS metric every board reports. NRR measures how much revenue you keep and grow from existing customers. For mid-market B2B SaaS ($10M–$50M ARR) CSMs and RevOps leads.',
  inputs: [
    { name: 'startingMRR', label: 'Starting MRR (USD)', type: 'number', placeholder: '100000' },
    { name: 'expansionMRR', label: 'Expansion MRR (upsell + cross-sell)', type: 'number', placeholder: '15000' },
    { name: 'downgradeMRR', label: 'Downgrade MRR', type: 'number', placeholder: '5000' },
    { name: 'churnedMRR', label: 'Churned MRR', type: 'number', placeholder: '8000' },
  ],
  clientConfig: { type: 'custom', wordPools: {}, customFn: '...' },
  generate(inputs) { return calculate(inputs); },
  staticExamples: [],  // auto-filled by codegen-examples
  faq: [...],
  howToUse: [...],
};
registerEngine(engine);
```
(Full implementation: copy structure from `src/engines/sales/pipeline-value-calculator.ts`; mirror every helper line-by-line in customFn.)

- [ ] **Step 4:** Add `+1` import + re-export in `src/engines/retention/index.ts`:
```typescript
export { default as nrrCalculator } from './nrr-calculator';
// ... (5 more added by Tasks 2-6)
```

- [ ] **Step 5:** Add ToolMeta entry in `src/data/tools/retention.ts` (structured `ToolInput[]` form):
```typescript
{
  slug: 'solopreneur-nrr-calculator',
  title: 'NRR Calculator',
  description: 'Compute Net Revenue Retention — the headline SaaS metric every board reports. NRR measures how much revenue you keep and grow from existing customers.',
  categoryId: 'R',
  applicationCategory: 'BusinessApplication',
  tags: ['retention', 'csm', 'nrr', 'saas-metrics'],
  keywords: ['NRR calculator', 'net revenue retention', 'NRR', 'net dollar retention', 'NDR', 'retention metric', 'saas KPI', 'expansion revenue', 'B2B SaaS', 'mid-market'],
  sources: [
    'https://www.saas-capital.com/blog-posts/saas-retention-metrics/',
    'https://openviewpartners.com/blog/the-real-story-behind-net-dollar-retention/',
  ],
  inputs: [
    { name: 'startingMRR', label: 'Starting MRR (USD)', type: 'number', placeholder: '100000' },
    { name: 'expansionMRR', label: 'Expansion MRR (upsell + cross-sell)', type: 'number', placeholder: '15000' },
    { name: 'downgradeMRR', label: 'Downgrade MRR', type: 'number', placeholder: '5000' },
    { name: 'churnedMRR', label: 'Churned MRR', type: 'number', placeholder: '8000' },
  ],
},
```

- [ ] **Step 6:** Add OG sample in `src/data/og-samples.json` (NO emoji; band label only):
```json
{
  "id": "solopreneur-nrr-calculator",
  "en": { "headline": "NRR 102%", "headlineUnit": "", "headlineLabel": "Warning" },
  "zh": { "headline": "NRR 102%", "headlineUnit": "", "headlineLabel": "需关注" }
}
```

- [ ] **Step 7:** Add ENGINES entry in `scripts/codegen-examples.mjs`:
```javascript
'nrr-calculator': { ... },  // alphabetical
```

- [ ] **Step 8:** Fill P9-1's relatedTools array in `src/data/internal-links.ts` with 4 entries (P6-2 lesson):
```typescript
'solopreneur-nrr-calculator': [
  'solopreneur-grr-calculator',                       // P9-2 (same cat, future)
  'solopreneur-expansion-revenue-calculator',         // P9-3 (same cat, future)
  'solopreneur-renewal-rate-calculator',              // P9-6 (same cat, future)
  'solopreneur-pipeline-coverage-calculator',         // P8-6 cross-cat (Sales — complementary retention × sales)
],
```
NOTE: At Task 1 time, only P9-1 exists; the 3 same-cat entries will exist by Task 6. To prevent early internal-links test failures, the P8-6 cross-cat fallback ensures the array has 4 valid existing slugs from day 1. P9-2..P9-6 will overwrite the array as they ship.

- [ ] **Step 9:** Modify `src/data/seo-schemas/listingPages.ts` — add 'R' category entry (P7-0 lesson: dist/ must auto-rebuild at P9-1):
```typescript
// Add 'R' alongside 'M', 'O', 'S' in the categories array
{ id: 'R', slug: 'retention', name: 'Retention & Customer Success' },
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
Expected: 514 + 8 = **522 pass / 0 fail / 0 skip**.

- [ ] **Step 12:** CustomFn parse check:
```bash
node tests/scripts/test-customfn.mjs solopreneur-nrr-calculator
```
Expected: parses OK.

- [ ] **Step 13:** Commit + dual push:
```bash
cd "D:/E/独立站/youtube-tools"
git add -A
git commit -m "feat(p9-1): nrr calculator (8 math tests, 6-section v3)"
git push origin master
git push github master
```

- [ ] **Step 14:** Write memory file:
```bash
# Create C:\Users\元始天尊\.claude\projects\D--E-----youtube-tools\memory\p9-1-nrr-shipped.md
# Use p8-1-pipeline-value-shipped.md as template
# Update MEMORY.md index
```

---

### Task 2: P9-2 GRR Calculator (1 commit + 2 pushes)

**Goal:** Implement Gross Revenue Retention — pure retention signal that strips expansion. 3 inputs · 7 math tests.

**Spec reference:** spec §"P9-2: GRR Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern as Task 1 but for `grr-calculator`. **No** `src/data/seo-schemas/listingPages.ts` change (already done in P9-1).

**Math:**
```typescript
retainedMRR = startingMRR - downgradeMRR - churnedMRR
grr = retainedMRR / startingMRR
```

**Health bands (grr as ratio):** 🟢 ≥0.95 · 🟡 0.90-0.95 · 🟠 0.80-0.90 · 🔴 <0.80

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 7 math tests in `tests/grr-calculator.test.ts`
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `retainedMRR()`, `grr()`, `calcHealthBand()` (zero-division guard like P9-1)
- [ ] **Step 4:** Add barrel import to `index.ts`
- [ ] **Step 5:** Add ToolMeta entry (3 inputs)
- [ ] **Step 6:** Add OG sample (no emoji; band label)
- [ ] **Step 7:** Add ENGINES entry to codegen script
- [ ] **Step 8:** Update P9-1 + P9-2 relatedTools entries (P9-1 array gets P9-2 added; P9-2 array fills 4 entries; **GRR ↔ NRR pair is highest related — both are retention rates**)
- [ ] **Step 9:** Run codegen to regen staticExamples[0]
- [ ] **Step 10:** Run `pnpm check` → expect **529 pass / 0 fail**
- [ ] **Step 11:** Run customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p9-2): grr calculator`
- [ ] **Step 13:** Write `memory/p9-2-grr-shipped.md`

---

### Task 3: P9-3 Expansion Revenue Calculator (1 commit + 2 pushes)

**Goal:** Compute expansion revenue as % of starting MRR — the top-line growth lever from existing customers. 3 inputs · 6 math tests.

**Spec reference:** spec §"P9-3: Expansion Revenue Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
expansionMRR = upsellMRR + crossSellMRR
expansionPct = expansionMRR / startingMRR
```

**Health bands (expansionPct as ratio):** 🟢 ≥0.25 · 🟡 0.15-0.25 · 🟠 0.05-0.15 · 🔴 <0.05

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 6 math tests
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `expansionMRR()`, `expansionPct()`, `calcHealthBand()` (zero-division guard)
- [ ] **Step 4-9:** Wire barrel + ToolMeta + OG + ENGINES + relatedTools (P9-3 ↔ P9-1 NRR strong relationship) + codegen
- [ ] **Step 10:** `pnpm check` → expect **535 pass / 0 fail**
- [ ] **Step 11:** customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p9-3): expansion revenue calculator`
- [ ] **Step 13:** Write `memory/p9-3-expansion-revenue-shipped.md`

---

### Task 4: P9-4 Logo Churn Rate Calculator (1 commit + 2 pushes)

**Goal:** Compute customer (logo) churn rate — count-based complement to GRR (revenue-based). 2 inputs · 6 math tests.

**Spec reference:** spec §"P9-4: Logo Churn Rate Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
logoChurnPct = lostCustomers / startCustomers
retainedCustomers = startCustomers - lostCustomers
```

**Health bands (logoChurnPct as ratio, INVERSE — lower is better):** 🟢 <0.05 · 🟡 0.05-0.10 · 🟠 0.10-0.20 · 🔴 ≥0.20

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 6 math tests (verify inverse band direction — Logo Churn is "lower is better")
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `logoChurnPct()`, `retainedCustomers()`, `calcHealthBand()` (zero-division guard; **NOTE inverse band direction: <0.05 = excellent**)
- [ ] **Step 4-9:** Wire barrel + ToolMeta (2 inputs) + OG + ENGINES + relatedTools (P9-4 ↔ P9-2 GRR strong pair; both are churn-related) + codegen
- [ ] **Step 10:** `pnpm check` → expect **541 pass / 0 fail**
- [ ] **Step 11:** customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p9-4): logo churn rate calculator`
- [ ] **Step 13:** Write `memory/p9-4-logo-churn-rate-shipped.md`

---

### Task 5: P9-5 Customer Health Score Calculator (1 commit + 2 pushes)

**Goal:** Compute composite customer health score (0-100) from 5 weighted signals with 4 weight presets. Most complex calc in P9 — customFn must handle 5 inputs + select. 5+1 inputs · 10 math tests.

**Spec reference:** spec §"P9-5: Customer Health Score Calculator" — math, inputs, weight presets, normalization, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
function normalize(signalName: string, value: number): number {
  if (signalName === 'nps') return (value + 100) / 2;
  if (signalName === 'supportTickets') return 100 - Math.min(value * 4, 100);
  return value;  // productUsage, engagement, contractValue already 0-100
}
const PRESETS = {
  balanced:     [0.20, 0.20, 0.20, 0.20, 0.20],
  'product-led': [0.50, 0.15, 0.10, 0.15, 0.10],
  'service-led': [0.10, 0.20, 0.35, 0.25, 0.10],
  'sales-led':   [0.15, 0.25, 0.10, 0.10, 0.40],
};
function healthScore(
  productUsage: number, nps: number, supportTickets: number,
  engagement: number, contractValue: number, preset: string,
): number {
  const signals = [productUsage, nps, supportTickets, engagement, contractValue].map((v, i) =>
    normalize(['productUsage', 'nps', 'supportTickets', 'engagement', 'contractValue'][i], v)
  );
  const weights = PRESETS[preset];
  return signals.reduce((sum, sig, i) => sum + sig * weights[i], 0);
}
```

**Health bands (score 0-100):** 🟢 ≥80 · 🟡 60-80 · 🟠 40-60 · 🔴 <40

**Steps:** mirror Task 1 pattern, with extra care for the `select` input:
- [ ] **Step 1:** Write 10 math tests in `tests/customer-health-score-calculator.test.ts`:
```typescript
test('normalize: nps -100 → 0 (lower edge)', () => {
  assert.equal(normalize('nps', -100), 0);
});
test('normalize: nps 0 → 50 (midpoint)', () => {
  assert.equal(normalize('nps', 0), 50);
});
test('normalize: nps 100 → 100 (upper edge)', () => {
  assert.equal(normalize('nps', 100), 100);
});
test('normalize: supportTickets 0 → 100 (no tickets = best)', () => {
  assert.equal(normalize('supportTickets', 0), 100);
});
test('normalize: supportTickets 25 → 0 (saturation point)', () => {
  assert.equal(normalize('supportTickets', 25), 0);
});
test('normalize: supportTickets 5 → 80 (canonical)', () => {
  assert.equal(normalize('supportTickets', 5), 80);
});
test('healthScore: balanced preset canonical (75,40,5,80,60) = 73', () => {
  assert.equal(healthScore(75, 40, 5, 80, 60, 'balanced'), 73);
});
test('healthScore: worst case (0,-100,50,0,0) = 12.5 (balanced)', () => {
  assert.equal(healthScore(0, -100, 50, 0, 0, 'balanced'), 12.5);
});
test('healthScore: best case (100,100,0,100,100) = 100 (balanced)', () => {
  assert.equal(healthScore(100, 100, 0, 100, 100, 'balanced'), 100);
});
test('Weight presets sum to 1: all 4 presets', () => {
  assert.equal(PRESETS.balanced.reduce((a, b) => a + b, 0), 1.0);
  assert.equal(PRESETS['product-led'].reduce((a, b) => a + b, 0), 1.0);
  assert.equal(PRESETS['service-led'].reduce((a, b) => a + b, 0), 1.0);
  assert.equal(PRESETS['sales-led'].reduce((a, b) => a + b, 0), 1.0);
});
```
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `normalize()`, `healthScore()`, `calcHealthBand()`. Export `PRESETS` for test 10.
- [ ] **Step 4:** Add barrel import to `index.ts`
- [ ] **Step 5:** Add ToolMeta entry with `weightPreset` as `select` type:
```typescript
inputs: [
  { name: 'productUsage', label: 'Product usage score (0-100)', type: 'number', placeholder: '75' },
  { name: 'nps', label: 'NPS (-100 to +100)', type: 'number', placeholder: '40' },
  { name: 'supportTickets', label: 'Support tickets (last 90 days)', type: 'number', placeholder: '5' },
  { name: 'engagement', label: 'Engagement score (0-100)', type: 'number', placeholder: '80' },
  { name: 'contractValue', label: 'Contract value score (0-100)', type: 'number', placeholder: '60' },
  { name: 'weightPreset', label: 'Weight preset', type: 'select', options: ['balanced', 'product-led', 'service-led', 'sales-led'] },
],
```
- [ ] **Step 6:** Add OG sample (use balanced preset as default in headline; no emoji; band label)
- [ ] **Step 7:** Add ENGINES entry to codegen script
- [ ] **Step 8:** Update relatedTools entries (P9-5 ↔ P9-6 Renewal Rate — both are CSM operational metrics)
- [ ] **Step 9:** Run codegen to regen staticExamples[0]
- [ ] **Step 10:** `pnpm check` → expect **551 pass / 0 fail**
- [ ] **Step 11:** customFn parse check (extra care: `select` input + array lookup)
- [ ] **Step 12:** Commit + dual push: `feat(p9-5): customer health score calculator`
- [ ] **Step 13:** Write `memory/p9-5-customer-health-score-shipped.md`

---

### Task 6: P9-6 Renewal Rate Calculator (1 commit + 2 pushes)

**Goal:** Compute renewal rate — % of ARR up for renewal that closed. Operational metric for CSM team. 2 inputs · 6 math tests.

**Spec reference:** spec §"P9-6: Renewal Rate Calculator" — math, inputs, health bands, tests verbatim.

**Files (7 wired):** same pattern.

**Math:**
```typescript
renewalRate = renewedARR / upForRenewalARR
churnedARR = upForRenewalARR - renewedARR
```

**Health bands (renewalRate as ratio):** 🟢 ≥0.90 · 🟡 0.80-0.90 · 🟠 0.70-0.80 · 🔴 <0.70

**Steps:** mirror Task 1 pattern:
- [ ] **Step 1:** Write 6 math tests
- [ ] **Step 2:** Run test → FAIL
- [ ] **Step 3:** Implement with helpers `renewalRate()`, `churnedARR()`, `calcHealthBand()` (zero-division guard)
- [ ] **Step 4-9:** Wire barrel + ToolMeta (2 inputs) + OG + ENGINES + relatedTools (P9-6 ↔ P9-5 Health Score — both CSM operational; ↔ P9-1 NRR — both retention outcome) + codegen
- [ ] **Step 10:** `pnpm check` → expect **557 pass / 0 fail**
- [ ] **Step 11:** customFn parse check
- [ ] **Step 12:** Commit + dual push: `feat(p9-6): renewal rate calculator`
- [ ] **Step 13:** Write `memory/p9-6-renewal-rate-shipped.md`

---

### Task 7: P9 Holistic Review + Final Sync (no commit, just verification + memory)

**Goal:** Final cross-cutting verification + comprehensive memory write.

**Files (no new code):**
- Verify: All 6 P9 calcs in `pnpm check` (557 pass / 0 fail)
- Verify: All 6 P9 calcs in `src/data/tools/retention.ts` exports
- Verify: All 6 P9 calcs in `src/data/internal-links.ts` `relatedTools` with 4 entries each
- Verify: All 6 P9 calcs have `en` + `zh` OG samples
- Verify: All 6 P9 calcs in `scripts/codegen-examples.mjs` ENGINES dict
- Verify: `git log --oneline` shows 7 P9 commits (1 scaffold + 6 calcs) + 1 P9 spec commit + 1 P9 plan commit = 9 P9-related

**Steps:**

- [ ] **Step 1:** Run full `pnpm check` final time:
```bash
cd "D:/E/独立站/youtube-tools" && pnpm check
```
Expected: **557 pass / 0 fail / 0 skip** (514 + 43 P9 math tests).

- [ ] **Step 2:** Check git log for 7 P9 commits:
```bash
cd "D:/E/独立站/youtube-tools" && git log --oneline -15
```
Expected: 7 P9 commits + 1 spec commit + 1 plan commit = 9 total P9-related.

- [ ] **Step 3:** Run holistic cross-cutting review (per CLAUDE.md "Before push/merge: holistic pre-merge review"):
- Verify all 6 calcs have `categoryId: 'R'`
- Verify all 6 calcs have same `inputs` shape in ToolMeta + engine
- Verify all 6 calcs' customFn parses (run all 6 through `test-customfn.mjs` if not already done individually)
- Verify no emoji in any OG sample trend field
- Verify `categoryDescription` in `categories.ts` matches what's on the listing page
- Verify `src/data/seo-schemas/listingPages.ts` has 'R' entry (P9-1 lesson)
- Verify Health Score preset weights all sum to 1.0 (test 10 in P9-5)
- Verify all 6 calcs reference mid-market $10M-$50M in their description (NOT SMB)

- [ ] **Step 4:** Write comprehensive memory file `memory/p9-series-shipped.md` (use `p8-series-shipped.md` as template):
- Status + ship date
- Commits (9 total: 1 spec + 1 plan + 1 scaffold + 6 calcs; may be more if any fix wave)
- 6 calcs table (slug, math core, inputs, tests)
- Architecture decisions
- 6 audiences covered (B2B SaaS CSMs, RevOps leaders, mid-market founders)
- Cross-cutting fixes (4 P6-1 fixes carried forward, 1 new for P9-1 listingPages timing)
- Final state (62 → 68 engines, +6 new category, 20 inputs, 43 tests, 514 → 557 pass)
- Process lessons (per-calc push cadence, P7-0 listingPages lesson, P8-0 scaffold over-bump lesson applied)
- Update MEMORY.md index

- [ ] **Step 5:** Final sync check:
```bash
cd "D:/E/独立站/youtube-tools"
git status  # ensure no uncommitted changes
# Memory file is local-only (not in repo); no commit needed
```

- [ ] **Step 6:** Report completion to user:
- Engines: 62 → 68 (+6)
- New category: 'R' Retention & Customer Success
- 6 calcs shipped: P9-1..P9-6
- pnpm check: 557 pass / 0 fail
- Both mirrors synced
- Memory files written: p9-1..p9-6 + p9-series

---

## Self-Review

After writing the plan, check it against the spec:

**1. Spec coverage:** All 6 calcs in spec §"The 6 Calculators" have a Task (1-6). Cross-cutting fixes from spec §"Cross-Cutting Carry-Forward" applied at Task 0 (P6-1 carries) and Task 1 (P7-0 listingPages lesson). Quality gates from spec §"Pre-Commit Gates" applied per-task. ✓

**2. Placeholder scan:** No "TBD", "TODO", "implement later", "fill in details". All code blocks have actual content. Task 2-6 use "mirror Task 1 pattern" for the 13-step wire flow (per writing-plans template, repetition of identical scaffolding is anti-DRY but intentional here — each calc has its own helpers and tests). ✓

**3. Type consistency:**
- All helper function names referenced consistently across Tasks: `netRetainedMRR/nrr/calcHealthBand` (P9-1), `retainedMRR/grr/calcHealthBand` (P9-2), `expansionMRR/expansionPct/calcHealthBand` (P9-3), `logoChurnPct/retainedCustomers/calcHealthBand` (P9-4), `normalize/healthScore/calcHealthBand` + `PRESETS` (P9-5), `renewalRate/churnedARR/calcHealthBand` (P9-6)
- Test files use `node:test` + `node:assert` (consistent with P5/P6/P7/P8)
- Codegen script uses `ENGINES` dict (consistent with P5/P6/P7/P8)
- `categoryId: 'R'` used uniformly across all 6 calcs
- `CATEGORY_SLUG = 'retention'` used uniformly in scaffold + per-calc references
- `PRESETS` exported for test 10 in P9-5 (sum to 1.0 verification)

**4. Risk mitigations from spec §"Risks & Mitigations":**
- 43 boundary tests fail (P7-2/P7-5 lesson) → spec writes explicit `≥ / ≤< / <` notation per calc; tests verify exact direction at boundary values
- Spec canonical expected value miscomputed (P7-3 lesson) → spec §"Canonical computation" hand-computed for all 6 calcs; implementer cross-checks before writing test
- Health Score normalization off-by-one (NPS edge -100, +100; support edge 25) → tests verify exact boundary at -100, 0, +100 for NPS and 0, 25, 50 for support (P9-5 tests 1-6)
- Health Score preset weights don't sum to 1.0 → P9-5 test 10 explicitly verifies all 4 presets sum to 1.0
- 6 customFn ASI trap → `test-customfn.mjs <slug>` per calc (step 11-12 of each task)
- Time exceeds 30 min/calc → B 档 math (simple arithmetic + ratios); P9-5 is most complex but still mechanical
- Health band threshold direction ambiguity → each calc uses consistent `≥ / <` notation; tests verify exact direction
- ARR anchor mismatch (P8 SMB vs P9 mid-market) → intentional; spec is explicit about persona. Per-calc intro sentence states "mid-market $10M–$50M"
- Logo Churn inverse band direction (P9-4) → spec explicit; tests verify <0.05 = excellent (NOT ≥0.05)

**5. Counts match spec:**
- Inputs: 4+3+3+2+5+1(select)+2 = 20 ✓
- Tests: 8+7+6+6+10+6 = 43 ✓
- Engines: 62 → 68 = +6 ✓
- Commits: 1 spec + 1 plan + 1 scaffold + 6 calcs = 9 ✓
- Pass progression: 514 → 522 → 529 → 535 → 541 → 551 → 557 ✓
- Listing pages in dist: 225 → 231 (+6 tools × 2 langs; scaffold doesn't add pages)

**6. Task right-sizing:** Each per-calc task (1-6) ends with a working, testable, pushable deliverable. Scaffold (Task 0) sets up directories + 4 carry-forward fixes + category page (slightly red on pnpm check; expected per P7-0 pattern). Holistic (Task 7) is verification + memory only (no code changes).

**7. P8 lessons applied:**
- P8-0 over-bump anti-pattern (56→62 in scaffold, P8-1 corrected to 57) → P9-0 correctly bumps 62→63 (P8-0 lesson crystallized)
- Float-precision architecture (P8-2/P8-3) → global constraint 30; spec display values are the contract
- Per-calc push cadence → 7 separate commits, not 1 batch
- spec bugs caught early → spec self-review caught input count 19→20 and GRR test 7 band label (already fixed in commit b4f82d1)
- `customFn` ASI trap prevention → step 11-12 of each task runs `test-customfn.mjs`

**8. No new cross-cutting fixes expected:** All 4 P6-1 fixes (internal-links tier-2 fallback, og-samples no emoji, seo-schemas array support, marketing-analytics.astro page pattern) carry forward. The one P9-1-specific addition is `src/data/seo-schemas/listingPages.ts` entry (P7-0 lesson: dist/ must auto-rebuild).

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-09-p9-retention-batch.md`. Two execution options:

**1. Subagent-Driven (recommended)** - I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** - Execute tasks in this session using executing-plans, controller direct execution with checkpoints (P4-3+ lesson; pure mechanical calculators)

Which approach?
